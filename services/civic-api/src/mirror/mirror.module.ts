import { Controller, Get, Global, Injectable, Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { PrismaService } from '../prisma/prisma.service';
import { FORWARD_LOOKUP } from '../common/read-only-mirror.guard';
import type { ForwardLookup } from '../common/forward';
import { mirrorMode } from '../common/read-only-mirror';
import { MirrorFollower } from './follower';
import { PrismaMirrorStore } from './prisma-store';

const MAX_DELIVERY_BYTES = 256 * 1024;

/**
 * Runs the mirror follower (follower.ts) in the service: the webhook receiver
 * for the platform's signed events (POST /api/mirror/events, registered in
 * main.ts ahead of the JSON parser so the signature is checked over the exact
 * bytes), a full re-sync at start and every CIVICOS_MIRROR_RESYNC_MS (default
 * 15 minutes), and GET /api/mirror/status. Without CIVICOS_PLATFORM_URL,
 * CIVICOS_MIRROR_KEY and CIVICOS_MIRROR_WEBHOOK_SECRET the follower is off and
 * the status says so: civic-api then holds what it last mirrored.
 */
@Injectable()
export class MirrorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Mirror');
  readonly follower: MirrorFollower | null;
  readonly store: PrismaMirrorStore;
  private timer: NodeJS.Timeout | null = null;
  readonly missing: string[];

  constructor(prisma: PrismaService) {
    this.store = new PrismaMirrorStore(prisma);
    const env = process.env;
    this.missing = ['CIVICOS_PLATFORM_URL', 'CIVICOS_MIRROR_KEY', 'CIVICOS_MIRROR_WEBHOOK_SECRET'].filter(k => !env[k]);
    this.follower = env.CIVICOS_PLATFORM_URL
      ? new MirrorFollower(this.store, {
          base: env.CIVICOS_PLATFORM_URL,
          key: env.CIVICOS_MIRROR_KEY,
          secret: env.CIVICOS_MIRROR_WEBHOOK_SECRET,
          timeoutMs: Number(env.CIVICOS_MIRROR_TIMEOUT_MS) || 15_000,
        })
      : null;
  }

  onModuleInit(): void {
    if (!this.follower || this.missing.includes('CIVICOS_MIRROR_KEY')) {
      this.logger.warn(`Mirror follower off (set ${this.missing.join(', ')}): civic-api's tables hold what was last mirrored`);
      return;
    }
    const every = Number(process.env.CIVICOS_MIRROR_RESYNC_MS) || 15 * 60_000;
    const run = () => this.resync();
    setTimeout(run, 1_000).unref();
    this.timer = setInterval(run, every);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async resync(): Promise<void> {
    if (!this.follower) return;
    try {
      const r = await this.follower.fullSync();
      this.logger.log(`Full re-sync from the platform, current to audit sequence ${r.auditSeq}`);
    } catch (e) {
      this.logger.warn(`Full re-sync failed: ${(e as Error).message}`);
    }
  }

  /** Express/Node handler for POST /api/mirror/events (the platform's webhook deliveries). */
  eventsHandler() {
    return (req: IncomingMessage & { body?: unknown }, res: ServerResponse): void => {
      const send = (status: number, body: unknown) => {
        res.statusCode = status;
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(body));
      };
      if (req.method !== 'POST') return send(405, { error: 'POST the platform\'s CloudEvents here' });
      if (!this.follower) return send(503, { error: `The mirror follower is off: set ${this.missing.join(', ')}` });
      const follower = this.follower;
      const done = (raw: string) => {
        follower.receive(req.headers, raw).then(r => send(r.status, r.body), e => send(500, { error: (e as Error).message }));
      };
      if (Buffer.isBuffer(req.body)) return done(req.body.toString('utf8'));
      if (typeof req.body === 'string') return done(req.body);
      const chunks: Buffer[] = [];
      let size = 0;
      let refused = false;
      req.on('data', (c: Buffer) => {
        size += c.length;
        if (size > MAX_DELIVERY_BYTES && !refused) { refused = true; send(413, { error: 'Delivery too large' }); req.destroy(); return; }
        chunks.push(c);
      });
      req.on('end', () => { if (!refused) done(Buffer.concat(chunks).toString('utf8')); });
    };
  }
}

@Controller('mirror')
export class MirrorController {
  constructor(private readonly mirror: MirrorService) {}

  /** Where the mirror stands: mode, whether the follower runs, the audit sequence it is current to, its last error. */
  @Get('status')
  async status() {
    const state = await this.mirror.store.state().catch(e => ({ error: (e as Error).message }));
    return {
      mode: mirrorMode(),
      owner: 'CivicOS platform (GET /api/platform/owners)',
      follower: this.mirror.follower && !this.mirror.missing.length ? 'on' : `off: set ${this.mirror.missing.join(', ')}`,
      state,
    };
  }
}

/** Read-only lookups in the mirrored tables for the forward mappers (forward.ts). */
@Injectable()
export class PrismaForwardLookup implements ForwardLookup {
  constructor(private readonly prisma: PrismaService) {}

  async citizen(citizenId: string) {
    const c = await this.prisma.citizen.findUnique({ where: { id: citizenId }, include: { tenant: { select: { name: true } } } });
    return c ? { displayName: c.displayName, municipality: c.tenant.name } : null;
  }

  async platformTenant() {
    const rows = await this.prisma.tenant.findMany({ where: { id: { startsWith: 'platform:' }, kind: 'NATIONAL' }, select: { settings: true } });
    for (const r of rows) {
      const s = r.settings as { home?: boolean; platformTenant?: string } | null;
      if (s?.home && s.platformTenant) return s.platformTenant;
    }
    return null;
  }
}

@Global()
@Module({
  controllers: [MirrorController],
  providers: [MirrorService, PrismaForwardLookup, { provide: FORWARD_LOOKUP, useExisting: PrismaForwardLookup }],
  exports: [MirrorService, FORWARD_LOOKUP],
})
export class MirrorModule {}
