import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { chainHash } from '../../common/hash';

/**
 * Audit read + chain verification. Constitutional officers (Companion 28)
 * consume this. Verification replays the per-tenant hash chain and reports
 * the first broken link, if any — making tampering detectable, not just
 * "discouraged".
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, limit = 200) {
    return this.prisma.auditEvent.findMany({
      where: { tenantId },
      orderBy: { seq: 'desc' },
      take: Math.min(limit, 1000),
    });
  }

  async verifyChain(tenantId: string): Promise<{
    ok: boolean;
    checked: number;
    brokenAtSeq?: number;
  }> {
    const events = await this.prisma.auditEvent.findMany({
      where: { tenantId },
      orderBy: { seq: 'asc' },
    });
    let prevHash: string | null = null;
    for (const e of events) {
      const expected = chainHash(
        prevHash,
        {
          actorType: e.actorType,
          actorId: e.actorId,
          action: e.action,
          resource: e.resource,
          outcome: e.outcome,
          metadata: e.metadata,
          ip: e.ip ?? undefined,
        },
        e.seq,
      );
      if (expected !== e.hash || (prevHash ?? null) !== (e.prevHash ?? null)) {
        return { ok: false, checked: events.length, brokenAtSeq: e.seq };
      }
      prevHash = e.hash;
    }
    return { ok: true, checked: events.length };
  }
}
