import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { specFor, seededInt } from './ops-catalog';

/**
 * Materialises archetype-driven operational dashboards for a ministry:
 * KPIs, SLA-aware queues, and alerts per enabled module. Deterministic so
 * a ministry's picture is stable across reads. Humans operate; the platform
 * surfaces — no autonomous action.
 */
@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async forMinistry(tenantId: string, id: string) {
    const m = await this.prisma.ministry.findFirst({
      where: { id, tenantId },
      include: { modules: true },
    });
    if (!m) throw new NotFoundException('Ministry not found');

    const modules = m.modules
      .filter(mod => mod.enabled)
      .map(mod => {
        const spec = specFor(mod.moduleKey);
        const kpis = spec.kpis.map(k => {
          const raw = seededInt(`${id}:${mod.moduleKey}:${k.key}`, k.range[0], k.range[1]);
          const good = k.direction === 'higher-better' ? raw >= k.target : raw <= k.target;
          const near = k.direction === 'higher-better' ? raw >= k.target * 0.9 : raw <= k.target * 1.15;
          return {
            label: k.label,
            value: `${raw}${k.unit ?? ''}`,
            tone: good ? 'ok' : near ? 'warn' : 'alert',
            target: `${k.target}${k.unit ?? ''}`,
          };
        });
        const queues = spec.queues.map(q => {
          const depth = seededInt(`${id}:${mod.moduleKey}:${q.key}:d`, q.range[0], q.range[1]);
          const oldest = seededInt(`${id}:${mod.moduleKey}:${q.key}:o`, 1, Math.round(q.slaHours * 1.2));
          return {
            label: q.label,
            depth,
            oldestAgeHours: oldest,
            slaHours: q.slaHours,
            breaching: oldest > q.slaHours,
          };
        });
        const alerts = spec.alerts.map(a => {
          const roll = seededInt(`${id}:${mod.moduleKey}:${a.key}`, 0, 100) / 100;
          return {
            label: a.label,
            severity: a.severity,
            active: roll < a.likelihood,
            detail: a.detail,
          };
        });
        return { module: mod.moduleKey, title: spec.title, kpis, queues, alerts };
      });

    return {
      ministry: { id: m.id, name: m.name, archetype: m.archetype, status: m.status },
      generatedAt: new Date().toISOString(),
      modules,
    };
  }
}
