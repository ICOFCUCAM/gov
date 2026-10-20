// What is waiting on officials across the government, from the records that
// hold it: every institution's queue (open or escalated items), its active
// incidents, permits awaiting a decision and open operational incidents.
// Read-only; the actions stay on their own endpoints (queue act, incident
// escalate/resolve, permit decide, ops incident ack/resolve), each audited.
// Cases and permits carry personal data: a signed-in official sees only those
// they may read (lib/auth/roles.ts canReadInstitution(), canReadPermits();
// review M-3); the whole government and auditors see all of them. Open cases
// under approved procedures (lib/casework/) are listed without personal
// fields, only those the case rules let the official read (caseReadRefusal()),
// with the next deadline and whether a second official's approval is waiting.

import { NextResponse } from 'next/server';
import { listMinistries, queueFor, incidentsFor, listPermits, listIncidents, permitHolders } from '@/lib/data/store';
import { currentOfficial } from '@/lib/auth/official';
import { canReadInstitution, canReadPermits, caseReadRefusal } from '@/lib/auth/roles';
import { caseScope } from '@/lib/auth/official';
import { listCases, caseFacts } from '@/lib/casework/engine';
import { getPackage } from '@/lib/casework/packages';

export const dynamic = 'force-dynamic';

const OPEN_PERMIT = new Set(['submitted', 'in-review', 'needs-info']);

export async function GET() {
  const o = await currentOfficial();
  const readsCases = (ministryId: string) => !o || canReadInstitution(o, ministryId) === null;
  const queue: unknown[] = [];
  const ministryIncidents: unknown[] = [];
  for (const m of listMinistries().filter(x => x.status === 'active')) {
    const q = queueFor(m.id);
    if (!('error' in q) && readsCases(m.id)) {
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
  const permits = !o || canReadPermits(o, permitHolders()) === null ? listPermits().filter(p => OPEN_PERMIT.has(p.status)) : [];
  const incidents = listIncidents().filter(i => i.status !== 'resolved');
  const scope = await caseScope();
  const names = new Map(listMinistries().map(m => [m.id, m.name]));
  const now = new Date().toISOString();
  const cases = listCases({ open: true })
    .filter(c => !scope || !caseReadRefusal(scope, { ...caseFacts(c), sensitivity: 'normal' }))
    .map(c => {
      const next = c.deadlines.filter(d => !d.met && !d.lapsed).sort((a, b) => a.due.localeCompare(b.due))[0];
      return {
        id: c.id, ref: c.ref, procedure: getPackage(c.package.key, c.package.version)?.title ?? c.package.key,
        ministryId: c.owner, ministry: names.get(c.owner) ?? c.owner, stage: c.stage, priority: c.priority,
        ...(c.assignee ? { assignee: c.assignee.name } : {}), pendingApproval: Boolean(c.pending),
        ...(next ? { nextDeadline: { label: next.label, due: next.due } } : {}),
        overdue: Boolean(next && next.due < now), source: c.source, openedAt: c.openedAt,
      };
    });
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    counts: {
      decisions: queue.length + permits.length + cases.length,
      overdue: (queue as { overdue: boolean }[]).filter(x => x.overdue).length + cases.filter(c => c.overdue).length,
      incidents: ministryIncidents.length + incidents.length,
    },
    queue, ministryIncidents, permits, incidents, cases,
  });
}
