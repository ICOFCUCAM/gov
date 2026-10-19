// What officials who sign in through the substrate may do on the platform
// (go-live review H-3; lib/auth/substrate-officials.ts). GET lists the
// administrators' assignments; POST records one ({ officerId, role,
// institution, name? }; institution null or "" for the whole government)
// or removes it ({ officerId, role: null }), after which the officer
// register's least applies again. Administrators only; audited. Takes
// effect at the officer's next request.

import { NextRequest, NextResponse } from 'next/server';
import { listSubstrateAssignments, setSubstrateAssignment } from '@/lib/auth/officials';
import { currentOfficial, actorLabel } from '@/lib/auth/official';
import { roleOf } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

export async function GET() {
  const o = await currentOfficial();
  if (!o) return NextResponse.json({ error: 'Sign in as an official' }, { status: 401 });
  if (roleOf(o) !== 'administrator') return NextResponse.json({ error: 'Only an administrator can see substrate officers\' assignments' }, { status: 403 });
  return NextResponse.json({ assignments: listSubstrateAssignments() });
}

export async function POST(req: NextRequest) {
  const o = await currentOfficial();
  if (!o) return NextResponse.json({ error: 'Sign in as an official' }, { status: 401 });
  if (roleOf(o) !== 'administrator') return NextResponse.json({ error: 'Only an administrator can change what officials may do' }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { officerId?: string; role?: string | null; institution?: string | null; name?: string };
  if (`officer:${(b.officerId ?? '').trim()}` === o.sub) return NextResponse.json({ error: 'Another administrator must change your own role' }, { status: 422 });
  const r = setSubstrateAssignment(b.officerId ?? '', { role: b.role, institution: b.institution, name: b.name }, actorLabel(o));
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json('removed' in r ? r : { assignment: r });
}
