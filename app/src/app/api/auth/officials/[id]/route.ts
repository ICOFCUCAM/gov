// Change a platform account (administrators only; audited): disable or
// re-enable it ({ disabled }), or set its role and institution
// ({ role, institution }; institution null or "" for the whole government),
// or reset its second sign-in step when the official's phone is lost
// ({ resetTwoStep: true }; they set it up again at their next sign-in), or
// issue a one-time password reset code to hand over in person
// ({ issueReset: true }; shown once, expires in 24 hours).
// An account of an independent institution (now, or after the change) is
// changed by that institution's own administrator; an administrator serving
// the whole government proposes the change and it waits (202) for an
// official who can sign there (lib/auth/account-changes.ts,
// accountChangeRule()); administrators of another institution may not.
import { NextRequest, NextResponse } from 'next/server';
import { setDisabled, setRole, removeTwoStep, issueReset, accountById } from '@/lib/auth/officials';
import { accountChangeRule } from '@/lib/auth/roles';
import { proposeAccountChange, type AccountChangeKind } from '@/lib/auth/account-changes';
import { currentOfficial, actorLabel } from '@/lib/auth/official';
import { roleOf } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const o = await currentOfficial();
  if (!o) return NextResponse.json({ error: 'Sign in as an official' }, { status: 401 });
  if (roleOf(o) !== 'administrator') return NextResponse.json({ error: 'Only an administrator can change accounts' }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { disabled?: boolean; role?: string; institution?: string | null; resetTwoStep?: boolean; issueReset?: boolean };
  const self = `local:${params.id}` === o.sub;
  const target = accountById(params.id);
  if (!target) return NextResponse.json({ error: 'No such account' }, { status: 422 });
  // Independent institutions keep their own user administration (plan phase 2).
  const moving = 'institution' in b ? (b.institution || undefined) : undefined;
  const rule = accountChangeRule(o, [target.institution, moving]);
  if (typeof rule === 'string') return NextResponse.json({ error: rule }, { status: 403 });
  if (rule && !self) {
    const kind: AccountChangeKind = b.issueReset ? 'issue-reset' : b.resetTwoStep ? 'reset-two-step' : ('role' in b || 'institution' in b) ? 'role' : b.disabled ? 'disable' : 'enable';
    const p = proposeAccountChange({ kind, accountId: params.id, details: { ...('role' in b ? { role: b.role } : {}), ...('institution' in b ? { institution: b.institution ?? null } : {}) } }, rule.confirmBy, { by: actorLabel(o), byId: o.sub });
    return 'error' in p ? NextResponse.json(p, { status: 422 }) : NextResponse.json({ pending: p }, { status: 202 });
  }
  if (b.issueReset) {
    if (self) return NextResponse.json({ error: 'Change your own password under My account' }, { status: 422 });
    const r = issueReset(params.id, actorLabel(o));
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json(r);
  }
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
