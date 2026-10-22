// /api/org/ministries/{id}/departments/{deptId} — one department of an institution (plan I2).
// GET: its record (office, functions, services, staff, every version).
// POST { op: 'end', reason } ends it; { op: 'amend', terms, reason } changes it: during first-run setup at once,
// afterwards proposed (202) for a different official to confirm (lib/institution/departments.ts).
// A department is ended with a reason and kept, never deleted (plan I0.2). DELETE, the earlier way to remove
// one, keeps working as an end: it needs a reason (body { reason } or ?reason=) and ends the department instead
// of deleting it; without a reason it is refused with the way to end it.
import { NextRequest, NextResponse } from 'next/server';
import { getMinistry } from '@/lib/data/store';
import { refusal, readRefusal, caseScope } from '@/lib/auth/official';
import { ministryPermission, canReadAdministration, roleOf } from '@/lib/auth/roles';
import { routeActor } from '@/lib/casework/actor';
import { departmentChange, departmentView, type DepartmentActor } from '@/lib/institution/departments';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string; deptId: string }> };

export async function GET(_req: NextRequest, props: Ctx) {
  const { id, deptId } = await props.params;
  const refused = await readRefusal(s => canReadAdministration(s, id), { register: 'institution', id });
  if (refused) return refused;
  const m = getMinistry(id);
  const d = m?.departments.find(x => x.id === deptId);
  if (!m || !d) return NextResponse.json({ error: 'No such department' }, { status: 404 });
  return NextResponse.json({ department: departmentView(m, d) });
}

async function change(id: string, deptId: string, kind: 'end' | 'amend', body: { reason?: unknown; terms?: unknown; legalBasis?: unknown; by?: unknown }) {
  const refused = await refusal(s => ministryPermission(s, id), { register: 'institution', id });
  if (refused) return refused;
  const m = getMinistry(id);
  if (!m) return NextResponse.json({ error: 'Ministry not found' }, { status: 404 });
  const d = m.departments.find(x => x.id === deptId);
  if (!d) return NextResponse.json({ error: 'Department not found' }, { status: 404 });
  if (d.status === 'ended') return NextResponse.json({ error: `${d.name} was already ended on ${d.endedAt?.slice(0, 10) ?? 'an earlier date'}` }, { status: 409 });
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason) return NextResponse.json({ error: kind === 'end' ? 'Give the reason the department is ended: a department is ended with a reason and kept, never deleted' : 'Give the reason for the change' }, { status: 422 });
  const s = await caseScope();
  const who = await routeActor(body.by);
  const actor: DepartmentActor = { by: who.name, ...(who.id ? { byId: who.id } : {}), ...(s ? { role: roleOf(s), ...(s.institution ? { institution: s.institution } : {}) } : {}) };
  const r = departmentChange(id, { kind, department: deptId, ...(kind === 'amend' ? { terms: body.terms } : {}), reason }, body.legalBasis, actor);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: /independent|only your own|An administrator/.test(r.error) ? 403 : 422 });
  if ('proposed' in r) return NextResponse.json({ ministry: getMinistry(id), pending: r.proposed }, { status: 202 });
  return NextResponse.json({ ministry: getMinistry(id), ended: kind === 'end' ? r.recorded : undefined, department: r.recorded });
}

/** @example request {"op":"end","reason":"Functions moved to the Planning department under the 2026 reorganisation"} */
export async function POST(req: NextRequest, props: Ctx) {
  const { id, deptId } = await props.params;
  const b = (await req.json().catch(() => ({}))) as { op?: string; reason?: string; terms?: unknown; legalBasis?: unknown; by?: string };
  const op = b.op ?? 'end';
  if (op !== 'end' && op !== 'amend') return NextResponse.json({ error: 'op must be end or amend' }, { status: 422 });
  return change(id, deptId, op, b);
}

/** Kept from before: ends the department (with a reason) instead of deleting it. */
export async function DELETE(req: NextRequest, props: Ctx) {
  const { id, deptId } = await props.params;
  const b = (await req.json().catch(() => ({}))) as { reason?: string; by?: string };
  const reason = b.reason ?? new URL(req.url).searchParams.get('reason') ?? '';
  return change(id, deptId, 'end', { reason, by: b.by });
}
