import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

type Health = 'ok' | 'degraded' | 'down';

interface ServiceHealth {
  name: string;
  status: Health;
  detail: string;
}

interface QueueHealth {
  name: string;
  depth: number;
  slaHours: number;
  breaching: boolean;
}

/**
 * Operational intelligence derived from real platform state. Resilient by
 * design: if the database is unreachable, the overview returns DEGRADED with
 * zeroed queues rather than failing — operators still get a picture.
 * Tenant-scoped; no citizen PII in any metric.
 */
@Injectable()
export class OpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async overview(tenantId: string) {
    let dbUp = true;
    let openPermits = 0;
    let needsInfo = 0;
    let unpaidBills = 0;
    let overdueBills = 0;
    try {
      [openPermits, needsInfo, unpaidBills, overdueBills] = await Promise.all([
        this.prisma.permit.count({
          where: { tenantId, status: { in: ['SUBMITTED', 'IN_REVIEW', 'NEEDS_INFO'] } },
        }),
        this.prisma.permit.count({ where: { tenantId, status: 'NEEDS_INFO' } }),
        this.prisma.bill.count({ where: { tenantId, status: { not: 'PAID' } } }),
        this.prisma.bill.count({ where: { tenantId, status: 'OVERDUE' } }),
      ]);
    } catch {
      dbUp = false;
    }

    let auditIntact = true;
    try {
      auditIntact = (await this.audit.verifyChain(tenantId)).ok;
    } catch {
      auditIntact = false;
    }

    const services: ServiceHealth[] = [
      {
        name: 'Database',
        status: dbUp ? 'ok' : 'down',
        detail: dbUp ? 'Reachable' : 'Unreachable — degraded mode',
      },
      {
        name: 'Audit ledger',
        status: auditIntact ? 'ok' : 'down',
        detail: auditIntact ? 'Chain intact' : 'Chain verification failed',
      },
      { name: 'API', status: 'ok', detail: 'Serving' },
    ];

    const queues: QueueHealth[] = [
      { name: 'Permit review', depth: openPermits, slaHours: 288, breaching: false },
      { name: 'Awaiting citizen info', depth: needsInfo, slaHours: 720, breaching: false },
      {
        name: 'Payments outstanding',
        depth: unpaidBills,
        slaHours: 0,
        breaching: overdueBills > 0,
      },
    ];

    return {
      generatedAt: new Date().toISOString(),
      degradedMode: !dbUp,
      summary: {
        servicesOk: services.filter(s => s.status === 'ok').length,
        servicesTotal: services.length,
        queuesBreaching: queues.filter(q => q.breaching).length,
        auditIntact,
      },
      services,
      queues,
    };
  }

  listIncidents(tenantId: string) {
    return this.prisma.incident.findMany({
      where: { tenantId },
      orderBy: { openedAt: 'desc' },
    });
  }

  createIncident(
    tenantId: string,
    by: string,
    input: { severity: 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4'; title: string; scope: string },
  ) {
    return this.prisma.incident.create({
      data: {
        tenantId,
        severity: input.severity,
        title: input.title,
        scope: input.scope,
        status: 'OPEN',
        events: [
          { at: new Date().toISOString(), by, action: 'opened' },
        ],
      },
    });
  }
}
