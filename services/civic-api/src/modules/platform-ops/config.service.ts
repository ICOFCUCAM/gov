import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { sha256, stableStringify } from '../../common/hash';

/**
 * Signed configuration / policy propagation with drift detection.
 *
 *   publish (DRAFT) -> sign (SIGNED, signer attests over contentHash)
 *                    -> apply (APPLIED, supersedes prior applied)
 *
 * Drift = the hash a tenant currently has APPLIED differs from the latest
 * SIGNED desired hash for its scope. Unsigned config never applies.
 */
@Injectable()
export class ConfigService {
  constructor(private readonly prisma: PrismaService) {}

  list(scope: 'GLOBAL' | 'TENANT', tenantId?: string) {
    return this.prisma.configBundle.findMany({
      where: { scope, tenantId: scope === 'GLOBAL' ? null : tenantId },
      orderBy: { version: 'desc' },
    });
  }

  async publish(
    scope: 'GLOBAL' | 'TENANT',
    tenantId: string | null,
    payload: unknown,
  ) {
    const last = await this.prisma.configBundle.findFirst({
      where: { scope, tenantId },
      orderBy: { version: 'desc' },
    });
    const version = (last?.version ?? 0) + 1;
    return this.prisma.configBundle.create({
      data: {
        scope,
        tenantId,
        version,
        payload: payload as object,
        contentHash: sha256(stableStringify(payload)),
        status: 'DRAFT',
      },
    });
  }

  async sign(id: string, signedBy: string) {
    const c = await this.prisma.configBundle.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Config bundle not found');
    if (c.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT bundles can be signed');
    }
    return this.prisma.configBundle.update({
      where: { id },
      data: {
        status: 'SIGNED',
        signedBy,
        signature: sha256(`${c.contentHash}:${signedBy}`),
      },
    });
  }

  async apply(id: string) {
    const c = await this.prisma.configBundle.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Config bundle not found');
    if (c.status !== 'SIGNED') {
      throw new BadRequestException('Only SIGNED bundles can be applied');
    }
    await this.prisma.configBundle.updateMany({
      where: {
        scope: c.scope,
        tenantId: c.tenantId,
        status: 'APPLIED',
      },
      data: { status: 'SUPERSEDED' },
    });
    return this.prisma.configBundle.update({
      where: { id },
      data: { status: 'APPLIED', appliedAt: new Date() },
    });
  }

  /** Drift = newest SIGNED desired hash != currently APPLIED hash. */
  async drift(scope: 'GLOBAL' | 'TENANT', tenantId: string | null) {
    const [applied, desired] = await Promise.all([
      this.prisma.configBundle.findFirst({
        where: { scope, tenantId, status: 'APPLIED' },
        orderBy: { version: 'desc' },
      }),
      this.prisma.configBundle.findFirst({
        where: { scope, tenantId, status: 'SIGNED' },
        orderBy: { version: 'desc' },
      }),
    ]);
    if (!desired) {
      return { drift: false, reason: 'no newer signed config' };
    }
    if (!applied) {
      return { drift: true, reason: 'signed config never applied' };
    }
    if (applied.contentHash !== desired.contentHash && desired.version > applied.version) {
      return {
        drift: true,
        reason: `applied v${applied.version} != signed v${desired.version}`,
      };
    }
    return { drift: false, reason: 'in sync' };
  }
}
