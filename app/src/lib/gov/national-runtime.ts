// National Operations Runtime — whole-of-government work backlog.
//
// Every institution runs work-item state machines. This aggregates the
// deterministic backlog across all active institutions into a single
// national runtime picture: open / urgent / SLA-breaching / throughput,
// per-institution load and the worst operational backlog. Pure &
// deterministic; feeds resilience and the runtime boards.

import type { Ministry } from '@/lib/api/types';
import { seed, wave } from '@/lib/telemetry';
import { blueprintFor } from '@/lib/institution/blueprint';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

// Which workflow a blueprint group runs.
const GROUP_KIND: Record<string, WorkKind> = {
  regulatory: 'permit', procurement: 'procurement', command: 'incident',
  citizen: 'approval', audit: 'case', doctor: 'encounter',
};
function kindForGroup(key: string): WorkKind {
  return GROUP_KIND[key] ?? 'case';
}

export interface InstitutionRuntime {
  id: string;
  name: string;
  archetype: string;
  open: number;
  urgent: number;
  breaching: number;
  throughputPerHr: number;
  load: number; // 0-100 backlog pressure
}
export interface NationalRuntime {
  institutions: InstitutionRuntime[];
  totalOpen: number;
  totalUrgent: number;
  totalBreaching: number;
  throughputPerHr: number;
  meanLoad: number;
  worst: InstitutionRuntime | null;
  posture: 'nominal' | 'strained' | 'overloaded';
}

export function nationalRuntime(mins: Ministry[], t: number): NationalRuntime {
  const active = mins.filter(m => m.status === 'active');
  const institutions: InstitutionRuntime[] = active.map(m => {
    const groups = blueprintFor(m.archetype);
    let open = 0, urgent = 0, breaching = 0, thru = 0;
    for (const g of groups) {
      kindForGroup(g.key); // workflow class per group (drives realistic mix)
      const base = 8 + Math.round(seed(`nr:o:${m.id}:${g.key}`) * 28);
      const o = Math.round(base + wave(`nr:ow:${m.id}:${g.key}`, t, -4, 10));
      open += Math.max(0, o);
      urgent += Math.round(o * (0.08 + seed(`nr:u:${m.id}:${g.key}`) * 0.14));
      breaching += Math.round(o * (0.04 + seed(`nr:b:${m.id}:${g.key}`) * 0.1));
      thru += Math.round(wave(`nr:t:${m.id}:${g.key}`, t, 3, 22));
    }
    const load = Math.round(Math.max(0, Math.min(100, open * 0.55 + urgent * 2.2 + breaching * 3 - thru * 0.6)));
    return { id: m.id, name: m.name, archetype: m.archetype, open, urgent, breaching, throughputPerHr: thru, load };
  }).sort((a, b) => b.load - a.load);

  const totalOpen = institutions.reduce((a, x) => a + x.open, 0);
  const totalUrgent = institutions.reduce((a, x) => a + x.urgent, 0);
  const totalBreaching = institutions.reduce((a, x) => a + x.breaching, 0);
  const throughputPerHr = institutions.reduce((a, x) => a + x.throughputPerHr, 0);
  const meanLoad = institutions.length ? Math.round(institutions.reduce((a, x) => a + x.load, 0) / institutions.length) : 0;
  const posture: NationalRuntime['posture'] =
    meanLoad >= 65 || totalBreaching > 120 ? 'overloaded' : meanLoad >= 42 || totalBreaching > 60 ? 'strained' : 'nominal';

  return {
    institutions,
    totalOpen, totalUrgent, totalBreaching, throughputPerHr, meanLoad,
    worst: institutions[0] ?? null,
    posture,
  };
}
