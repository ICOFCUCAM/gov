// POST /api/auth/account-changes/{id} { op: 'confirm' | 'withdraw', reason? }
// (lib/auth/account-changes.ts; plan phase 2, audit D). Confirm: an official
// who can sign at the independent institution the change waits for (or its
// administrator), a different person from the administrator who proposed it
// (canConfirmAccountChange()); when every institution has confirmed, the
// change is made and a reset code for a new account (or one asked for) is
// returned once, to this official, to hand over in person. Withdraw: the
// proposer or an administrator. Who acted comes from the sign-in; audited.
import { NextRequest, NextResponse } from 'next/server';
import { currentOfficial, actorLabel } from '@/lib/auth/official';
import { canConfirmAccountChange, roleOf } from '@/lib/auth/roles';
import { confirmAccountChange, listAccountChanges, withdrawAccountChange } from '@/lib/auth/account-changes';

export const dynamic = 'force-dynamic';

/** @example request {"op":"confirm"} */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const o = await currentOfficial();
  if (!o) return NextResponse.json({ error: 'Sign in as an official' }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { op?: string; reason?: string };
  const c = listAccountChanges().find(x => x.id === id);
  if (!c) return NextResponse.json({ error: 'No such account change' }, { status: 404 });
  if (b.op === 'confirm') {
    const why = o.institution && c.confirmFrom.includes(o.institution) ? canConfirmAccountChange(o, o.institution) : 'An official who can sign at the institution concerned (or its administrator) confirms this account change';
    if (why) return NextResponse.json({ error: why }, { status: 403 });
    const r = await confirmAccountChange(id, { by: actorLabel(o), byId: o.sub, ...(o.institution ? { institution: o.institution } : {}) });
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json(r);
  }
  if (b.op === 'withdraw') {
    const r = withdrawAccountChange(id, { by: actorLabel(o), byId: o.sub, administrator: roleOf(o) === 'administrator' }, b.reason);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ change: r });
  }
  return NextResponse.json({ error: 'op must be confirm or withdraw' }, { status: 422 });
}
