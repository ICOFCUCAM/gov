// /api/org/ministries/{id}/departments — an institution's departments as
// records (plan I2; lib/institution/departments.ts): each with its accountable
// office, functions, services, staff and every version.
// GET: the departments (ended ones kept, with their reason), a change waiting
// for its second official, every earlier change, and the choices.
// POST:
//   { name }                         kept from before: establishes a department (during setup at once;
//                                    afterwards proposed, 202, and a different official confirms)
//   { op: 'record', change }         during first-run setup only (an administrator)
//   { op: 'propose', change, legalBasis? }  one administrator (of the institution, or of the whole government
//                                    where its reach goes; an independent institution's own administrators)
//   { op: 'confirm' }                a different official (administrator or one who can sign; an independent
//                                    institution's own official)
//   { op: 'withdraw', reason? }      the proposer or an administrator
// change = { kind: 'establish' | 'amend' | 'end', department?, terms?: { name, office, functions, services, staff }, reason }.
// Who acted comes from the sign-in. Every step is audited and every version kept.
import { NextRequest, NextResponse } from 'next/server';
import { getMinistry } from '@/lib/data/store';
import { readRefusal, refusal, caseScope } from '@/lib/auth/official';
import { ministryPermission, canReadAdministration, roleOf } from '@/lib/auth/roles';
import { routeActor } from '@/lib/casework/actor';
import { setupRunning } from '@/lib/data/store/institutions';
import { listOffices } from '@/lib/nation/office-register';
import { listAccounts } from '@/lib/auth/officials';
import { listPackages, ownerInstitution } from '@/lib/casework/packages';
import { authorityFor } from '@/lib/data/store/sovereign';
import {
  ADMIN_FUNCTIONS, departmentsOf, departmentChange, recordDepartmentDuringSetup, proposeDepartmentChange, confirmDepartmentChange,
  withdrawDepartmentChange, lapseDepartmentChanges, departmentConfirmerRequired, type DepartmentActor,
} from '@/lib/institution/departments';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, props: Ctx) {
  const { id } = await props.params;
  const refused = await readRefusal(s => canReadAdministration(s, id), { register: 'institution', id });
  if (refused) return refused;
  lapseDepartmentChanges();
  const m = getMinistry(id);
  if (!m) return NextResponse.json({ error: 'No such institution' }, { status: 404 });
  return NextResponse.json({
    institution: { id: m.id, name: m.name, status: m.status },
    departments: departmentsOf(id, { ended: true }),
    pending: m.departmentChanges?.pending ?? null, history: m.departmentChanges?.history ?? [],
    setupRunning: setupRunning(), confirmByInstitution: departmentConfirmerRequired(id),
    choices: {
      functions: ADMIN_FUNCTIONS,
      offices: listOffices().filter(o => o.institution === id && o.inForce).map(o => ({ id: o.id, title: o.title })),
      staff: listAccounts().filter(a => a.institution === id && !a.disabled).map(a => ({ id: a.id, name: a.name, office: a.office })),
      procedures: [...new Set(listPackages().filter(p => ownerInstitution(p.owner, authorityFor) === id).map(p => p.key))],
    },
  });
}

/** @example request {"op":"propose","change":{"kind":"amend","department":"DEP-1","terms":{"office":"OFF-1","functions":["hr","finance"],"staff":["acc-1"]},"reason":"Payroll moves to Finance and HR"}} */
export async function POST(req: NextRequest, props: Ctx) {
  const { id } = await props.params;
  const refused = await refusal(s => ministryPermission(s, id), { register: 'institution', id });
  if (refused) return refused;
  if (!getMinistry(id)) return NextResponse.json({ error: 'No such institution' }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { op?: string; name?: string; change?: unknown; legalBasis?: unknown; reason?: string; by?: string };
  const s = await caseScope();
  const who = await routeActor(b.by);
  const actor: DepartmentActor = { by: who.name, ...(who.id ? { byId: who.id } : {}), ...(s ? { role: roleOf(s), ...(s.institution ? { institution: s.institution } : {}) } : {}) };
  const fail = (error: string, status = 422) => NextResponse.json({ error }, { status: /independent|only your own|An administrator|who can sign/.test(error) ? 403 : status });
  // Kept from before: { name } establishes a department.
  if (!b.op && b.name) {
    const r = departmentChange(id, { kind: 'establish', terms: { name: b.name }, reason: b.reason || 'Department added' }, b.legalBasis, actor);
    if ('error' in r) return fail(r.error, 409);
    return 'recorded' in r ? NextResponse.json({ ministry: getMinistry(id), department: r.recorded }) : NextResponse.json({ ministry: getMinistry(id), pending: r.proposed }, { status: 202 });
  }
  if (!b.op && !b.name) return fail('name required');
  if (b.op === 'record') { const r = recordDepartmentDuringSetup(id, b.change, actor); return 'error' in r ? fail(r.error) : NextResponse.json({ department: r, ministry: getMinistry(id) }); }
  if (b.op === 'propose') { const r = proposeDepartmentChange(id, b.change, b.legalBasis, actor); return 'error' in r ? fail(r.error) : NextResponse.json({ pending: r }, { status: 202 }); }
  if (b.op === 'confirm') { const r = confirmDepartmentChange(id, actor); return 'error' in r ? fail(r.error) : NextResponse.json({ adopted: r, departments: departmentsOf(id, { ended: true }) }); }
  if (b.op === 'withdraw') {
    const p = getMinistry(id)!.departmentChanges?.pending;
    if (s && p && roleOf(s) !== 'administrator' && p.byId !== who.id) return fail('The proposer or an administrator withdraws a waiting change', 403);
    const r = withdrawDepartmentChange(id, who.name, typeof b.reason === 'string' ? b.reason : undefined);
    return 'error' in r ? fail(r.error) : NextResponse.json(r);
  }
  return fail('op must be record, propose, confirm or withdraw');
}
