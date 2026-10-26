// /api/records-management — records management (plan step I13,
// lib/recordkeeping). GET ?institution=<id>: the institution's record classes
// with every schedule version, legal holds (who, why, scope, release),
// registered incoming items, disposals (the listed items with their hashes,
// what was destroyed or skipped, the certificate), transfers and migrations;
// the transfers sent to it when it is the archive the nation names; which
// records procedures it adopted. Read by the institution's own officials and
// those within reach, and auditors (canReadAdministration()); every read is
// written to the access log. Schedules, holds, disposals, transfers and
// migrations move only through decided cases (/api/cases).
//
// POST (signed-in officials):
//   { op: 'adopt', institution }                          an administrator or one who can sign there drafts the
//                                                         institution's own rec.* procedures (a second official approves)
//   { op: 'acknowledge-transfer', transfer, manifest, receipt }  an official of the archive the nation names records
//                                                         its receipt of the exact manifest sent
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { canReadAdministration, roleOf } from '@/lib/auth/roles';
import { routeActor } from '@/lib/casework/actor';
import { authorityFor, getMinistry, listMinistries } from '@/lib/data/store';
import { listPackages } from '@/lib/casework/packages';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';
import { classesOf, holdsOf, incomingOf, disposalsOf, transfersOf, transfersTo, migrationsOf, getTransfer, acknowledgeTransfer, recordkeepingCounts, TRIGGER_LABEL, DISPOSITION_LABEL } from '@/lib/recordkeeping/register';
import { RECORDKEEPING_PROCEDURES, installRecordkeepingProcedures, recordkeepingKey } from '@/lib/recordkeeping/procedures';
import { retentionRules } from '@/lib/data/retention';
import '@/lib/casework/modules';

export const dynamic = 'force-dynamic';

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function GET(req: NextRequest) {
  const s = await caseScope();
  const archive = authorityFor('archives') ?? null;
  const institution = req.nextUrl.searchParams.get('institution') ?? s?.institution ?? '';
  const meta = {
    archive: archive ? { id: archive, name: getMinistry(archive)?.name ?? archive } : null,
    labels: { triggers: TRIGGER_LABEL, dispositions: DISPOSITION_LABEL },
    platformRules: retentionRules(),
    institutions: listMinistries().filter(m => !s || !canReadAdministration(s, m.id)).map(m => ({ id: m.id, name: m.name })),
    counts: recordkeepingCounts(),
  };
  if (!institution) return NextResponse.json({ ...meta, institution: null });
  if (!getMinistry(institution)) return NextResponse.json({ error: 'No such institution' }, { status: 404 });
  if (s) {
    const why = canReadAdministration(s, institution);
    recordAccess({ ...accessBy(s), record: { register: 'records-management', id: institution }, action: why ? 'refused' : 'view', result: why ? 'refused' : 'allowed', ...(why ? { rule: why } : {}) });
    if (why) return NextResponse.json({ error: why }, { status: 403 });
  }
  const packages = listPackages();
  return NextResponse.json({
    ...meta,
    institution: { id: institution, name: getMinistry(institution)!.name },
    classes: classesOf(institution), holds: holdsOf(institution), incoming: incomingOf(institution), disposals: disposalsOf(institution),
    transfers: transfersOf(institution), received: transfersTo(institution), migrations: migrationsOf(institution), mine: recordkeepingCounts(institution),
    procedures: RECORDKEEPING_PROCEDURES.map(t => { const key = recordkeepingKey(t.key, institution); const v = packages.filter(p => p.key === key && p.state !== 'superseded'); return { template: t.key, key, title: t.title, forms: t.forms, state: v.some(p => p.state === 'approved') ? 'approved' : v.length ? 'draft' : 'not adopted' }; }),
  });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = await caseScope();
  const who = await routeActor(b.by);
  const op = str(b.op, 40);
  if (op === 'adopt') {
    const inst = str(b.institution, 120);
    if (!getMinistry(inst)) return NextResponse.json({ error: 'No such institution' }, { status: 404 });
    if (s && (s.institution !== inst || !['administrator', 'signatory'].includes(roleOf(s)))) return NextResponse.json({ error: 'An administrator or an official who can sign at the institution drafts its own records procedures' }, { status: 403 });
    const r = installRecordkeepingProcedures(inst, who.name, who.id);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json(r);
  }
  if (op === 'acknowledge-transfer') {
    const t = getTransfer(str(b.transfer, 60));
    if (!t) return NextResponse.json({ error: 'No such transfer' }, { status: 404 });
    // The archive's own act: an official of the institution the nation names as its archive (never the sending institution).
    if (s && (s.institution !== t.archive || roleOf(s) === 'auditor')) return NextResponse.json({ error: 'A transfer is acknowledged by an official of the archive it was sent to' }, { status: 403 });
    const r = acknowledgeTransfer(t.id, { manifest: str(b.manifest, 64), receipt: str(b.receipt, 120), by: { ...(who.id ? { id: who.id } : {}), name: who.name }, at: new Date().toISOString() });
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ transfer: r });
  }
  return NextResponse.json({ error: 'op is adopt or acknowledge-transfer' }, { status: 400 });
}
