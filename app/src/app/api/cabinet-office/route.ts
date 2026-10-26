// /api/cabinet-office — the Cabinet register (plan step I5, lib/cabinet). Cabinet
// papers and decisions run through /api/cases under the Cabinet procedure
// (cabinet.decision); petitions and correspondence under exec.correspondence.
//
// GET: what the signed-in official may read (cabinetReadScope(): the cabinet
// office everything; another institution its own submissions, the actions
// assigned to it and the decisions distributed or published to it; auditors
// with a purpose), the Cabinet rules in force and any waiting change, and the
// indicators of specification §3.6 computed from the records when read.
//
// POST (signed-in officials; checked here against the record):
//   { op: 'report', action, text }                         progress, by an official of the institution the action is assigned to
//   { op: 'propose-closure', action, evidence }            closure with evidence, by an official of that institution
//   { op: 'confirm-closure' | 'return-closure', action, reasons? }  a cabinet office official, a different person
//   { op: 'propose-rules', members, quorum: { numerator, denominator }, rule, qualified?, legalBasis: [{ instrument, eId }] }  an administrator
//   { op: 'confirm-rules' }                                 a different official
//   { op: 'withdraw-rules', reason }
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { cabinetReadScope, roleOf } from '@/lib/auth/roles';
import { routeActor } from '@/lib/casework/actor';
import { authorityFor, getMinistry, listMinistries } from '@/lib/data/store';
import { listPackages } from '@/lib/casework/packages';
import { dualControlPolicy } from '@/lib/casework/dual-control-policy';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';
import {
  cabinetRecords, cabinetRules, cabinetRuleChanges, cabinetIndicators, cabinetCounts, getAction, reportAction, proposeActionClosure, decideActionClosure,
  proposeCabinetRules, confirmCabinetRules, withdrawCabinetRules, CLASSIFICATIONS,
} from '@/lib/cabinet/register';
import { CABINET_PROCEDURES } from '@/lib/cabinet/procedures';
import '@/lib/casework/modules';

export const dynamic = 'force-dynamic';

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function GET(req: NextRequest) {
  const purpose = req.nextUrl.searchParams.get('purpose') ?? undefined;
  const s = await caseScope();
  const office = authorityFor('cabinetOffice');
  let view: 'all' | { institution?: string } = 'all';
  if (s) {
    const r = cabinetReadScope(s, office, purpose);
    if ('refused' in r) {
      recordAccess({ ...accessBy(s), record: { register: 'cabinet', query: '(records)' }, action: 'refused', result: 'refused', rule: r.refused, ...(purpose ? { purpose } : {}) });
      return NextResponse.json({ error: r.refused }, { status: 403 });
    }
    view = r.view === 'all' ? 'all' : { ...(s.institution ? { institution: s.institution } : {}) };
    recordAccess({ ...accessBy(s), record: { register: 'cabinet', query: r.view }, action: 'search', result: 'allowed', rule: 'cabinetReadScope()', ...(purpose ? { purpose } : {}) });
  }
  const packages = listPackages();
  return NextResponse.json({
    office: office ? { id: office, name: getMinistry(office)?.name ?? office } : null,
    procedures: CABINET_PROCEDURES.map(p => { const v = packages.filter(x => x.key === p.key && x.state !== 'superseded'); return { key: p.key, title: p.title, state: v.some(x => x.state === 'approved') ? 'approved' : v.length ? 'draft' : 'not-installed' }; }),
    rules: cabinetRules(), ruleChanges: cabinetRuleChanges(), classifications: CLASSIFICATIONS,
    names: Object.fromEntries(listMinistries().map(m => [m.id, m.name])),
    counts: cabinetCounts(),
    ...(view === 'all' ? { indicators: cabinetIndicators() } : {}),
    ...cabinetRecords(view),
  });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = await caseScope();
  const who = await routeActor(b.by);
  const me = { ...(who.id ? { id: who.id } : {}), name: who.name };
  const now = new Date();
  const op = str(b.op, 40);
  const office = authorityFor('cabinetOffice');
  if (op === 'report' || op === 'propose-closure') {
    const a = getAction(str(b.action, 60));
    if (!a) return NextResponse.json({ error: 'No such action' }, { status: 404 });
    // Without sign-in (demonstrations), the declared institution stands for the official's.
    const inst = s ? s.institution : str(b.institution, 120) || a.institution;
    const r = op === 'report' ? reportAction(a.ref, str(b.text, 2000), me, inst, now.toISOString()) : proposeActionClosure(a.ref, str(b.evidence, 4000), me, inst, now.toISOString());
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ action: r });
  }
  if (op === 'confirm-closure' || op === 'return-closure') {
    if (s && (!office || s.institution !== office)) return NextResponse.json({ error: 'A closure is confirmed or returned by an official of the cabinet office' }, { status: 403 });
    const r = decideActionClosure(str(b.action, 60), op === 'confirm-closure', str(b.reasons, 2000), me, now.toISOString());
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ action: r });
  }
  if (op === 'propose-rules' || op === 'confirm-rules' || op === 'withdraw-rules') {
    if (s && roleOf(s) !== 'administrator' && op === 'propose-rules') return NextResponse.json({ error: 'An administrator proposes the Cabinet rules, citing the law' }, { status: 403 });
    if (s && op === 'confirm-rules' && !['administrator', 'signatory'].includes(roleOf(s))) return NextResponse.json({ error: 'An administrator or an official who can sign confirms them' }, { status: 403 });
    const r = op === 'propose-rules'
      ? proposeCabinetRules({ members: b.members, quorum: b.quorum, rule: b.rule, qualified: b.qualified }, b.legalBasis, me.name, me.id, now, dualControlPolicy().pendingHours)
      : op === 'confirm-rules' ? confirmCabinetRules(me.name, me.id, now, dualControlPolicy().requireIdentityBinding) : withdrawCabinetRules(me.name, str(b.reason, 500));
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ rules: cabinetRules(), changes: cabinetRuleChanges() });
  }
  return NextResponse.json({ error: 'op must be report, propose-closure, confirm-closure, return-closure, propose-rules, confirm-rules or withdraw-rules' }, { status: 422 });
}
