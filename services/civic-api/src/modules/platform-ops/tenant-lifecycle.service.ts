import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type LState = 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'DECOMMISSIONED';

/**
 * Tenant lifecycle with guarded transitions and an append-only ledger so
 * audit continuity spans the tenant's whole life. Disallowed transitions
 * are rejected — no jumping straight from PROVISIONING to DECOMMISSIONED,
 * no silent state changes.
 */
@Injectable()
export class TenantLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly allowed: Record<LState, LState[]> = {
    PROVISIONING: ['ACTIVE'],
    ACTIVE: ['SUSPENDED', 'DECOMMISSIONED'],
    SUSPENDED: ['ACTIVE', 'DECOMMISSIONED'],
    DECOMMISSIONED: ['ACTIVE'], // recovery from archive is explicit + audited
  };

  history(tenantId: string) {
    return this.prisma.tenantLifecycleEvent.findMany({
      where: { tenantId },
      orderBy: { at: 'desc' },
    });
  }

  async transition(
    tenantId: string,
    to: LState,
    reason: string,
    actor: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const from = tenant.status as LState;
    if (from === to) {
      throw new BadRequestException(`Tenant already ${to}`);
    }
    if (!this.allowed[from].includes(to)) {
      throw new BadRequestException(
        `Illegal transition ${from} -> ${to}`,
      );
    }
    const [updated] = await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { status: to },
      }),
      this.prisma.tenantLifecycleEvent.create({
        data: { tenantId, fromState: from, toState: to, reason, actor },
      }),
    ]);
    return updated;
  }
}
