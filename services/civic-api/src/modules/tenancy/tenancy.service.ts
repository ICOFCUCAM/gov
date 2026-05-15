import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OutboxService } from '../../events/outbox.service';
import { Topics } from '../../events/topics';

interface ProvisionInput {
  slug: string;
  name: string;
  kind: 'MUNICIPALITY' | 'MINISTRY' | 'AGENCY' | 'REGION' | 'NATIONAL';
  country: string;
  officialLangs: string[];
  parentSlug?: string;
  inclusionFloor: { ussd: boolean; ivr: boolean; agentNetwork: boolean; walkIn: boolean };
  constitutionalOfficerSignoff: boolean;
}

/**
 * Tenant provisioning with hard governance gates. A tenant cannot become
 * ACTIVE without the inclusion floor, at least one official language, and
 * constitutional officer signoff (Companions 28/67/148). Provisioning is
 * idempotent on slug.
 */
@Injectable()
export class TenancyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  list() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async provision(input: ProvisionInput) {
    const checks = [
      {
        label: 'Inclusion floor (USSD/IVR/agent/walk-in)',
        passed:
          input.inclusionFloor.ussd &&
          input.inclusionFloor.ivr &&
          input.inclusionFloor.agentNetwork &&
          input.inclusionFloor.walkIn,
      },
      {
        label: 'At least one official language',
        passed: input.officialLangs.length >= 1,
      },
      {
        label: 'Constitutional officer signoff',
        passed: input.constitutionalOfficerSignoff,
      },
    ];
    const gatesPassed = checks.every(c => c.passed);

    const parent = input.parentSlug
      ? await this.prisma.tenant.findUnique({ where: { slug: input.parentSlug } })
      : null;
    if (input.parentSlug && !parent) {
      throw new BadRequestException('Parent tenant not found');
    }

    return this.prisma.$transaction(async tx => {
      const tenant = await tx.tenant.upsert({
        where: { slug: input.slug },
        update: {
          name: input.name,
          officialLangs: input.officialLangs,
          status: gatesPassed ? 'ACTIVE' : 'PROVISIONING',
        },
        create: {
          slug: input.slug,
          name: input.name,
          kind: input.kind,
          country: input.country,
          officialLangs: input.officialLangs,
          parentId: parent?.id ?? null,
          status: gatesPassed ? 'ACTIVE' : 'PROVISIONING',
        },
      });

      if (gatesPassed) {
        await this.outbox.enqueue(tx, {
          tenantId: tenant.id,
          topic: Topics.TenantProvisioned,
          partitionKey: tenant.id,
          payload: { slug: tenant.slug, kind: tenant.kind },
        });
      }

      return { tenant, gatesPassed, checks };
    });
  }
}
