import { Injectable, NotFoundException } from '@nestjs/common';
import { createHmac, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { sha256 } from '../../common/hash';

/**
 * Webhook subscription registry + signing. Delivery itself is performed by
 * the OutboxRelay seam (at-least-once, retry/backoff already implemented);
 * this service owns subscriptions and the signature contract.
 *
 * Signature: HMAC-SHA256 over `${timestamp}.${body}` using the per-sub
 * secret. Consumers MUST verify the signature AND reject timestamps outside
 * a ±300s window (replay protection). Topic '*' matches all.
 */
@Injectable()
export class WebhookService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.webhookSubscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        topic: true,
        url: true,
        status: true,
        failures: true,
        createdAt: true,
      },
    });
  }

  async subscribe(
    tenantId: string,
    input: { topic: string; url: string },
  ) {
    const secret = `whsec_${randomBytes(24).toString('base64url')}`;
    const sub = await this.prisma.webhookSubscription.create({
      data: {
        tenantId,
        topic: input.topic,
        url: input.url,
        secretHash: sha256(secret),
        status: 'ACTIVE',
      },
    });
    return {
      id: sub.id,
      topic: sub.topic,
      signingSecret: secret,
      note: 'Store this secret now — only its hash is kept. Verify HMAC-SHA256 of `${timestamp}.${body}` and reject timestamps older than 300s.',
    };
  }

  async setStatus(
    tenantId: string,
    id: string,
    status: 'ACTIVE' | 'PAUSED' | 'DISABLED',
  ) {
    const sub = await this.prisma.webhookSubscription.findFirst({
      where: { id, tenantId },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    return this.prisma.webhookSubscription.update({
      where: { id },
      data: { status },
      select: { id: true, topic: true, status: true },
    });
  }

  /** Signature contract used by the delivery seam and documented to
   *  integrators. Pure function — unit-testable, no I/O. */
  static sign(secret: string, timestamp: number, body: string): string {
    return createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
  }
}
