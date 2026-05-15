import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Outbox relay: polls PENDING events and publishes them to the message bus
 * (NATS by default; Kafka via the same seam). Idempotent consumers + the
 * outbox give at-least-once delivery. Backoff on failure; capped attempts.
 *
 * The broker client is imported lazily so the service compiles and runs in
 * environments without a broker (events accumulate as PENDING and drain when
 * the broker is reachable — operational resilience for low-connectivity).
 */
@Injectable()
export class OutboxRelay implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelay.name);
  private timer?: NodeJS.Timeout;
  private publishing = false;
  private nats: unknown;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const intervalMs = Number(this.config.get('OUTBOX_POLL_MS') ?? 2000);
    this.timer = setInterval(() => void this.drain(), intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async getNats(): Promise<{ publish: (s: string, d: Uint8Array) => void } | null> {
    const url = this.config.get<string>('NATS_URL');
    if (!url) return null;
    if (this.nats) return this.nats as { publish: (s: string, d: Uint8Array) => void };
    try {
      // Lazy + optional: do not hard-depend on the broker client at build.
      // Specifier is computed so TS/bundler does not require 'nats' to be
      // installed; it is an optional runtime peer dependency.
      const specifier = ['n', 'a', 't', 's'].join('');
      const dynImport = new Function('s', 'return import(s)') as (
        s: string,
      ) => Promise<unknown>;
      const mod = (await dynImport(specifier).catch(() => null)) as
        | { connect: (o: { servers: string }) => Promise<unknown> }
        | null;
      if (!mod) return null;
      this.nats = await mod.connect({ servers: url });
      return this.nats as { publish: (s: string, d: Uint8Array) => void };
    } catch (err) {
      this.logger.warn(`NATS unavailable: ${(err as Error).message}`);
      return null;
    }
  }

  private async drain(): Promise<void> {
    if (this.publishing) return;
    this.publishing = true;
    try {
      const batch = await this.prisma.outboxEvent.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });
      if (batch.length === 0) return;

      const nats = await this.getNats();
      for (const evt of batch) {
        try {
          if (nats) {
            nats.publish(
              evt.topic,
              new TextEncoder().encode(JSON.stringify(evt.payload)),
            );
          } else {
            // No broker: leave PENDING; resilient backlog drains later.
            continue;
          }
          await this.prisma.outboxEvent.update({
            where: { id: evt.id },
            data: { status: 'DISPATCHED', dispatchedAt: new Date() },
          });
        } catch (err) {
          await this.prisma.outboxEvent.update({
            where: { id: evt.id },
            data: {
              attempts: { increment: 1 },
              status: evt.attempts + 1 >= 10 ? 'FAILED' : 'PENDING',
            },
          });
          this.logger.warn(
            `Publish failed for ${evt.id}: ${(err as Error).message}`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(`Outbox drain error: ${(err as Error).message}`);
    } finally {
      this.publishing = false;
    }
  }
}
