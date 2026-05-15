import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { sha256 } from '../../common/hash';

/**
 * Sovereign identity: per-tenant pseudonymous citizen records. No global ID.
 * The `subjectHash` is derived from a tenant-salted subject so the same human
 * is recognisable WITHIN a tenant but NOT linkable ACROSS tenants from the
 * stored value (cross-tenant identity is via verifiable credentials only).
 */
@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.citizen.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async upsertCitizen(
    tenantId: string,
    subject: string,
    displayName: string,
    preferredLocale = 'en',
  ) {
    const subjectHash = sha256(`${tenantId}:${subject}`);
    return this.prisma.citizen.upsert({
      where: { tenantId_subjectHash: { tenantId, subjectHash } },
      update: { displayName, preferredLocale },
      create: { tenantId, subjectHash, displayName, preferredLocale },
    });
  }
}
