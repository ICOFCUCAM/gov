// /api/org/ministries/{id}/departments/{deptId} — one department of an institution.
// A department is ended with a reason and kept, never deleted (plan I0.2).
// POST { op: 'end', reason } ends it (who acted comes from the sign-in).
// DELETE, the earlier way to remove one, keeps working as an end: it needs a
// reason (body { reason } or ?reason=) and ends the department instead of
// deleting it; without a reason it is refused with the way to end it.
import { NextRequest, NextResponse } from 'next/server';
import { endDepartment } from '@/lib/data/store';
import { refusal } from '@/lib/auth/official';
import { ministryPermission } from '@/lib/auth/roles';
import { actingName } from '@/lib/casework/actor';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string; deptId: string }> };

async function end(id: string, deptId: string, reason: unknown, declared: unknown) {
  const refused = await refusal(s => ministryPermission(s, id));
  if (refused) return refused;
  const r = endDepartment(id, deptId, typeof reason === 'string' ? reason : '', await actingName(declared));
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ministry: r, ended: r.departments.find(d => d.id === deptId) });
}

/** @example request {"op":"end","reason":"Functions moved to the Planning department under the 2026 reorganisation"} */
export async function POST(req: NextRequest, props: Ctx) {
  const { id, deptId } = await props.params;
  const b = (await req.json().catch(() => ({}))) as { op?: string; reason?: string; by?: string };
  if ((b.op ?? 'end') !== 'end') return NextResponse.json({ error: 'op must be end' }, { status: 422 });
  return end(id, deptId, b.reason, b.by);
}

/** Kept from before: ends the department (with a reason) instead of deleting it. */
export async function DELETE(req: NextRequest, props: Ctx) {
  const { id, deptId } = await props.params;
  const b = (await req.json().catch(() => ({}))) as { reason?: string; by?: string };
  const reason = b.reason ?? new URL(req.url).searchParams.get('reason') ?? '';
  return end(id, deptId, reason, b.by);
}
