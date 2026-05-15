import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Controlled cross-tenant federation. The single rule that matters:
 *
 *   assertAccess(from, to, scope) succeeds ONLY IF an APPROVED, unexpired
 *   FederationGrant from->to exists whose scopes include `scope`.
 *
 * Default deny. Federation is never implicit, never wildcarded by accident,
 * and always revocable. Other modules call assertAccess before serving any
 * cross-tenant read/action.
 */
@Injectable()
export class FederationService {
  constructor(private readonly prisma: PrismaService) {}

  listForTenant(tenantId: string) {
    return this.prisma.federationGrant.findMany({
      where: {
        OR: [{ fromTenantId: tenantId }, { toTenantId: tenantId }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  propose(input: {
    fromTenantId: string;
    toTenantId: string;
    scopes: string[];
    reason: string;
    expiresAt?: string;
  }) {
    if (input.fromTenantId === input.toTenantId) {
      throw new ForbiddenException('A tenant cannot federate with itself');
    }
    return this.prisma.federationGrant.upsert({
      where: {
        fromTenantId_toTenantId: {
          fromTenantId: input.fromTenantId,
          toTenantId: input.toTenantId,
        },
      },
      update: {
        scopes: input.scopes,
        reason: input.reason,
        status: 'PROPOSED',
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
      create: {
        fromTenantId: input.fromTenantId,
        toTenantId: input.toTenantId,
        scopes: input.scopes,
        reason: input.reason,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });
  }

  /** Approval is by the GRANTING (to) tenant — you authorise who may reach
   *  into your data, not the requester. */
  async setStatus(
    id: string,
    status: 'APPROVED' | 'REVOKED',
    by: string,
  ) {
    const grant = await this.prisma.federationGrant.findUnique({
      where: { id },
    });
    if (!grant) throw new NotFoundException('Grant not found');
    return this.prisma.federationGrant.update({
      where: { id },
      data: {
        status,
        approvedBy: status === 'APPROVED' ? by : grant.approvedBy,
        approvedAt: status === 'APPROVED' ? new Date() : grant.approvedAt,
      },
    });
  }

  /** The enforcement primitive. Returns true only on an explicit allow. */
  async assertAccess(
    fromTenantId: string,
    toTenantId: string,
    scope: string,
  ): Promise<{ allowed: boolean; reason: string }> {
    if (fromTenantId === toTenantId) {
      return { allowed: true, reason: 'same-tenant' };
    }
    let grant;
    try {
      grant = await this.prisma.federationGrant.findUnique({
        where: {
          fromTenantId_toTenantId: { fromTenantId, toTenantId },
        },
      });
    } catch {
      // Security posture: if the policy store is unreachable we FAIL CLOSED.
      // A cross-tenant access decision must never default to allow.
      return {
        allowed: false,
        reason: 'policy store unavailable — fail closed (deny)',
      };
    }
    if (!grant) return { allowed: false, reason: 'no grant (default deny)' };
    if (grant.status !== 'APPROVED') {
      return { allowed: false, reason: `grant is ${grant.status}` };
    }
    if (grant.expiresAt && grant.expiresAt.getTime() < Date.now()) {
      return { allowed: false, reason: 'grant expired' };
    }
    if (!grant.scopes.includes(scope)) {
      return { allowed: false, reason: `scope '${scope}' not granted` };
    }
    return { allowed: true, reason: 'granted' };
  }
}
