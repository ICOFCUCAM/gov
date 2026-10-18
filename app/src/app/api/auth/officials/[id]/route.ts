// Change a platform account (administrators only; audited): disable or
// re-enable it ({ disabled }), or set its role and institution
// ({ role, institution }; institution null or "" for the whole government),
// or reset its second sign-in step when the official's phone is lost
// ({ resetTwoStep: true }; they set it up again at their next sign-in).
import { NextRequest, NextResponse } from 'next/server';
import { setDisabled, setRole, removeTwoStep } from '@/lib/auth/officials';
import { currentOfficial, actorLabel } from '@/lib/auth/official';
import { roleOf } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const o = await currentOfficial();
  if (!o) return NextResponse.json({ error: 'Sign in as an official' }, { status: 401 });
  if (roleOf(o) !== 'administrator') return NextResponse.json({ error: 'Only an administrator can change accounts' }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { disabled?: boolean; role?: string; institution?: string | null; resetTwoStep?: boolean };
  const self = `local:${params.id}` === o.sub;
  if (b.resetTwoStep) {
    if (self) return NextResponse.json({ error: 'Another administrator must reset your own second step' }, { status: 422 });
    const r = removeTwoStep(params.id, { by: actorLabel(o), reset: true });
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ account: r });
  }
  if ('role' in b || 'institution' in b) {
    if (self) return NextResponse.json({ error: 'Another administrator must change your own role' }, { status: 422 });
    const r = setRole(params.id, { role: b.role, institution: b.institution }, actorLabel(o));
    if ('error' in r) return NextResponse.json(r, { status: 422 });
    if (b.disabled === undefined) return NextResponse.json({ account: r });
  }
  if (self && b.disabled) return NextResponse.json({ error: 'You cannot disable your own account' }, { status: 422 });
  const r = setDisabled(params.id, !!b.disabled, actorLabel(o));
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ account: r });
}
