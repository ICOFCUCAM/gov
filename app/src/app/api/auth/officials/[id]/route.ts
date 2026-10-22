// Change a platform account (administrators only; audited): disable or
// re-enable it ({ disabled }), or set its role and institution
// ({ role, institution }; institution null or "" for the whole government),
// or reset its second sign-in step when the official's phone is lost
// ({ resetTwoStep: true }; they set it up again at their next sign-in), or
// issue a one-time password reset code to hand over in person
// ({ issueReset: true }; shown once, expires in 24 hours), or set the
// attributes the account is scoped by within its institution (plan I2:
// { attributes: { facilities?, jurisdictions?, tasks? } }; each list narrows
// what the role allows, never widens it; checked against the facility
// register, the nation's regions and the task permissions; an independent
// institution's accounts only by its own administrators).
// An account of an independent institution (now, or after the change) is
// changed by that institution's own administrator; an administrator serving
// the whole government proposes the change and it waits (202) for an
// official who can sign there (lib/auth/account-changes.ts,
// accountChangeRule()); administrators of another institution may not.
import { NextRequest, NextResponse } from 'next/server';
import { setDisabled, setRole, removeTwoStep, issueReset, accountById, setAttributes } from '@/lib/auth/officials';
import { TASK_PERMISSIONS } from '@/lib/auth/roles';
import { regionList } from '@/lib/nation/registry';
import { getFacility } from '@/lib/data/facilities';
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
  const b = (await req.json().catch(() => ({}))) as { disabled?: boolean; role?: string; institution?: string | null; resetTwoStep?: boolean; issueReset?: boolean; attributes?: { facilities?: unknown; jurisdictions?: unknown; tasks?: unknown } };
  const self = `local:${params.id}` === o.sub;
  const target = accountById(params.id);
  if (!target) return NextResponse.json({ error: 'No such account' }, { status: 422 });
  // Independent institutions keep their own user administration (plan phase 2).
  const moving = 'institution' in b ? (b.institution || undefined) : undefined;
  const rule = accountChangeRule(o, [target.institution, moving]);
  if (typeof rule === 'string') return NextResponse.json({ error: rule }, { status: 403 });
  // Attribute scope (plan I2): narrows an account within its institution; checked against the records it names.
  if (b.attributes && typeof b.attributes === 'object') {
    if (rule) return NextResponse.json({ error: 'This account belongs to an independent institution: only its own administrators set its attribute scope' }, { status: 403 });
    const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map(x => x.trim()).filter(Boolean) : v === undefined ? undefined : []);
    const facilities = list(b.attributes.facilities), jurisdictions = list(b.attributes.jurisdictions), tasks = list(b.attributes.tasks);
    const regions = [...regionList([])];
    for (const f of facilities ?? []) { const site = getFacility(f); if (!site || site.ownerId !== target.institution) return NextResponse.json({ error: `Facility ${f} is not a site of this account's institution in the facility register` }, { status: 422 }); }
    for (const j of jurisdictions ?? []) if (regions.length && !regions.includes(j)) return NextResponse.json({ error: `${j} is not one of the nation's regions` }, { status: 422 });
    for (const t of tasks ?? []) if (!TASK_PERMISSIONS.some(x => x.id === t)) return NextResponse.json({ error: `${t} is not a task permission (lib/auth/roles.ts)` }, { status: 422 });
    const r = setAttributes(params.id, { ...(facilities ? { facilities } : {}), ...(jurisdictions ? { jurisdictions } : {}), ...(tasks ? { tasks } : {}) }, actorLabel(o));
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ account: r });
  }
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
