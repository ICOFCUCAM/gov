// /api/org/ministries/{id}/administration — an institution's internal
// administration workspace (plan I2; spec Part 1 §10; supplement part 21).
// GET: for each function (HR, finance, procurement, assets, records, legal,
// internal audit, ICT, communications, planning, monitoring and evaluation):
// the departments that perform it, its catalogue forms and the state of their
// procedure link, the institution's own procedures (in force, draft or not
// adopted) with their open cases by stage, and its records (positions, payroll
// batch totals, privileged access grants, policies, delegations of authority).
// Only that institution's own records, read within reach (canReadAdministration()):
// the legislature, the judiciary and independent institutions keep their own.
// POST { op: 'draft-procedures' }: an administrator (or an official who can
// sign) of the institution drafts its internal administration procedures from
// the templates; a second official approves each (Laws → Procedures).
import { NextRequest, NextResponse } from 'next/server';
import { getMinistry } from '@/lib/data/store';
import { readRefusal, refusal, caseScope } from '@/lib/auth/official';
import { canReadAdministration, ministryPermission, roleOf } from '@/lib/auth/roles';
import { routeActor } from '@/lib/casework/actor';
import { listCases } from '@/lib/casework/engine';
import { activePackage, listPackages } from '@/lib/casework/packages';
import { ADMIN_FUNCTIONS, departmentsOf } from '@/lib/institution/departments';
import { ADMINISTRATION_PROCEDURES, administrationKey, installAdministrationProcedures } from '@/lib/administration/procedures';
import { administrationOf } from '@/lib/administration/register';
import { authorityDelegationsOf } from '@/lib/records/delegations';
import { CATALOGUE_CONTRACTS } from '@/lib/forms/library/catalogue-contracts';
import { procedureLink } from '@/lib/forms/procedure-link';
import { ruleInForce } from '@/lib/law/rules';
import '@/lib/casework/modules';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** Which internal administration function each catalogue form family serves (supplement part 21.1). */
const FORM_FUNCTION: [RegExp, string][] = [
  [/^ADM-(HR|PAY)-/, 'hr'], [/^ADM-FIN-/, 'finance'], [/^ADM-PRC-/, 'procurement'], [/^ADM-AST-/, 'assets'], [/^ADM-REC-/, 'records'],
  [/^ADM-LEG-/, 'legal'], [/^ADM-GOV-039$/, 'legal'], [/^ADM-ICT-/, 'ict'], [/^ADM-COM-/, 'communications'], [/^ADM-AUD-/, 'internal-audit'],
  [/^ADM-PLN-037$/, 'planning'], [/^ADM-GOV-040$/, 'planning'], [/^ADM-PLN-038$/, 'monitoring'],
];
const functionOfForm = (id: string) => FORM_FUNCTION.find(([re]) => re.test(id))?.[1];

export async function GET(_req: NextRequest, props: Ctx) {
  const { id } = await props.params;
  const refused = await readRefusal(s => canReadAdministration(s, id), { register: 'administration', id });
  if (refused) return refused;
  const m = getMinistry(id);
  if (!m) return NextResponse.json({ error: 'No such institution' }, { status: 404 });
  const on = new Date().toISOString().slice(0, 10);
  const depts = departmentsOf(id);
  const records = administrationOf(id, on);
  const packages = listPackages();
  const forms = CATALOGUE_CONTRACTS.filter(f => f.specId.startsWith('ADM-'));
  return NextResponse.json({
    institution: { id: m.id, name: m.name },
    functions: ADMIN_FUNCTIONS.map(f => ({
      ...f,
      departments: depts.filter(d => d.functions.includes(f.key)).map(d => ({ id: d.id, name: d.name, office: d.officeTitle ?? null, staff: d.staff.length })),
      forms: forms.filter(x => functionOfForm(x.specId) === f.key).map(x => ({ id: x.specId, title: x.json.library.title, identity: x.identity, link: procedureLink({ identity: x.identity, procedure: x.procedure ? { key: x.procedure.key } : null, ...(x.exchange ? { exchange: x.exchange } : {}), deviations: x.deviations }, { packages }).state })),
      procedures: ADMINISTRATION_PROCEDURES.filter(t => t.function === f.key).map(t => {
        const key = administrationKey(t.key, id);
        const cases = listCases({ owner: id, procedure: key, limit: 500 });
        const stages: Record<string, number> = {};
        for (const c of cases) stages[c.stage] = (stages[c.stage] ?? 0) + 1;
        return { template: t.key, key, title: t.title, forms: t.forms, sensitivity: t.sensitivity, state: activePackage(key, on) ? 'in force' : packages.some(p => p.key === key) ? 'draft' : 'not adopted', cases: { open: cases.filter(c => !c.closedAt).length, total: cases.length, stages } };
      }),
    })),
    records: {
      positions: records.positions.map(p => ({ id: p.id, title: p.title, count: p.count, grade: p.grade ?? null, status: p.status, case: p.case, at: p.at, sample: !!p.sample })),
      // Batch totals only: no person's pay line is held or shown.
      payroll: records.payroll.map(b => ({ ref: b.ref, period: b.period, employees: b.employees, status: b.status, preparedBy: b.preparedBy.name, reviewedBy: b.reviewedBy?.name ?? null, approvedBy: b.approvedBy ? `${b.approvedBy.name}${b.approvedBy.confirmedBy ? `, confirmed by ${b.approvedBy.confirmedBy}` : ''}` : null, deductions: b.deductions ? ('notCalculated' in b.deductions ? b.deductions.notCalculated : `By rule ${b.deductions.rule.key} version ${b.deductions.rule.version}`) : null, sample: !!b.sample })),
      access: records.access.map(a => ({ id: a.id, system: a.system, role: a.role, from: a.from, until: a.until, status: a.status, inForce: a.inForce, case: a.case })),
      policies: records.policies.map(p => ({ id: p.id, title: p.title, version: p.version, status: p.status, case: p.case })),
      delegations: authorityDelegationsOf(id).map(d => ({ id: d.id, delegator: d.delegator.name, delegate: d.delegate.name, actions: d.actions, procedures: d.procedures, from: d.validFrom, until: d.validUntil ?? null, basis: d.basis.map(b => `${b.title ?? b.instrument} ${b.eId}`), revoked: d.revoked ? { at: d.revoked.at, reason: d.revoked.reason } : null, case: d.approval.case })),
    },
    rules: { payrollDeductions: ruleInForce('adm.payroll.deductions', on) ? 'approved' : 'not approved (ships unset)' },
  });
}

/** @example request {"op":"draft-procedures"} */
export async function POST(req: NextRequest, props: Ctx) {
  const { id } = await props.params;
  const refused = await refusal(s => ministryPermission(s, id) ?? (roleOf(s) === 'administrator' || roleOf(s) === 'signatory' ? null : 'An administrator or an official who can sign drafts the institution\'s procedures'), { register: 'administration', id });
  if (refused) return refused;
  const b = (await req.json().catch(() => ({}))) as { op?: string; by?: string };
  if (b.op !== 'draft-procedures') return NextResponse.json({ error: 'op must be draft-procedures' }, { status: 422 });
  const s = await caseScope();
  const who = await routeActor(b.by);
  // Whole-government reach drafts only where it goes; an independent institution's own officials draft its procedures.
  if (s && s.institution && s.institution !== id) return NextResponse.json({ error: 'You can draft only your own institution\'s procedures' }, { status: 403 });
  const r = installAdministrationProcedures(id, who.name, who.id);
  return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json(r);
}
