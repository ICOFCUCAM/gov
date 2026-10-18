// What is waiting on officials across the government, from the records that
// hold it: every institution's queue (open or escalated items), its active
// incidents, permits awaiting a decision and open operational incidents.
// Read-only; the actions stay on their own endpoints (queue act, incident
// escalate/resolve, permit decide, ops incident ack/resolve), each audited.

import { NextResponse } from 'next/server';
import { listMinistries, queueFor, incidentsFor, listPermits, listIncidents } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

const OPEN_PERMIT = new Set(['submitted', 'in-review', 'needs-info']);

export function GET() {
  const queue: unknown[] = [];
  const ministryIncidents: unknown[] = [];
  for (const m of listMinistries().filter(x => x.status === 'active')) {
    const q = queueFor(m.id);
    if (!('error' in q)) {
      for (const it of q.items) if (it.state !== 'cleared') {
        queue.push({ ...it, ministryId: m.id, ministry: m.name, queueTitle: q.title, slaHours: q.slaHours, overdue: it.ageHours > q.slaHours });
      }
    }
    const inc = incidentsFor(m.id);
    if (!('error' in inc)) {
      for (const i of inc.incidents) if (i.active) {
        ministryIncidents.push({ ...i, ministryId: m.id, ministry: m.name, authority: inc.escalation[i.tierIndex] ?? null, canEscalate: i.tierIndex < inc.escalation.length - 1 });
      }
    }
  }
  const permits = listPermits().filter(p => OPEN_PERMIT.has(p.status));
  const incidents = listIncidents().filter(i => i.status !== 'resolved');
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    counts: {
      decisions: queue.length + permits.length,
      overdue: (queue as { overdue: boolean }[]).filter(x => x.overdue).length,
      incidents: ministryIncidents.length + incidents.length,
    },
    queue, ministryIncidents, permits, incidents,
  });
}
