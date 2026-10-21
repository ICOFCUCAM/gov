// Platform accounts for officials (lib/auth/officials.ts). GET lists them
// (never password hashes): in full for an administrator (each such read
// written to the access log as one search with the count), as a directory
// (name, office, institution) for any other signed-in official. An
// administrator also gets the installation's two-step policy (`twoStep`: who
// must use the second sign-in step, who last set it), so the Official
// accounts screen shows it to substrate administrators too. POST creates one: the
// first account at installation, with the one-time setup code (`setupToken`,
// lib/auth/setup-token.ts: CIVICOS_SETUP_TOKEN or the code the server wrote
// to its output at start), every later one by an administrator. While the
// substrate is the sign-in method no platform account is created (409).
// An account of an independent institution (the legislature, a court, the
// head of state's office, an independent body) is created by that
// institution's own administrator; an administrator serving the whole
// government proposes it, and it waits (202) for an official who can sign
// there to confirm (lib/auth/account-changes.ts, accountChangeRule()).
// Administrators of another institution may not.

import { NextRequest, NextResponse } from 'next/server';
import { listAccounts, createAccount, hasAccounts, twoStepPolicy, twoStepPolicySet } from '@/lib/auth/officials';
import { currentOfficial, actorLabel } from '@/lib/auth/official';
import { roleOf, accountChangeRule } from '@/lib/auth/roles';
import { proposeAccountChange } from '@/lib/auth/account-changes';
import { LOCAL_ACCOUNTS_REFUSED } from '@/lib/auth/setup-token';
import { stateWritable, persistenceStatus } from '@/lib/data/persist';
import { recordSearch } from '@/lib/records/access-search';

export const dynamic = 'force-dynamic';

export async function GET() {
  const o = await currentOfficial();
  if (!o) return NextResponse.json({ error: 'Sign in as an official' }, { status: 401 });
  // Administrators see every account in full. Everyone else sees who is who (name, office,
  // institution), never email, last sign-in or whose second step is off (go-live review L-3).
  if (roleOf(o) === 'administrator') {
    // The full list carries emails, roles and sign-in history: one search entry in the access log with the count.
    // The directory below (name, office, institution) is what every official may see of a colleague and is not logged.
    const accounts = listAccounts();
    recordSearch({ id: o.sub, label: actorLabel(o), institution: o.institution }, 'officials', '(all accounts, full)', accounts.length, 'administrator (full account list)');
    return NextResponse.json({ accounts, full: true, twoStep: { policy: twoStepPolicy(), set: twoStepPolicySet() } });
  }
  return NextResponse.json({ accounts: listAccounts().map(directoryEntry), full: false });
}

/** What every official may see of another's account. */
const directoryEntry = (a: ReturnType<typeof listAccounts>[number]) => ({
  id: a.id, name: a.name, office: a.office, ...(a.institution ? { institution: a.institution } : {}),
});

export async function POST(req: NextRequest) {
  // A server that cannot keep the account (its database unreachable) creates none: it would be lost.
  if (!stateWritable(req.nextUrl.pathname)) return NextResponse.json({ error: `This server cannot save changes just now (${persistenceStatus()?.error ?? 'state not writable'}); nothing was created. Try again shortly.` }, { status: 503 });
  const o = await currentOfficial();
  if (hasAccounts() && !o) return NextResponse.json({ error: 'Only a signed-in official can create accounts' }, { status: 401 });
  if (o && roleOf(o) !== 'administrator') return NextResponse.json({ error: 'Only an administrator can create accounts' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (o) {
    const rule = accountChangeRule(o, [typeof b?.institution === 'string' ? b.institution : undefined]);
    if (typeof rule === 'string') return NextResponse.json({ error: rule }, { status: 403 });
    if (rule) {
      const p = proposeAccountChange({ kind: 'create', details: b ?? {} }, rule.confirmBy, { by: actorLabel(o), byId: o.sub });
      return 'error' in p ? NextResponse.json(p, { status: 422 }) : NextResponse.json({ pending: p }, { status: 202 });
    }
  }
  const r = await createAccount(b, o ? actorLabel(o) : null);
  if ('error' in r) return NextResponse.json(r, { status: r.error === LOCAL_ACCOUNTS_REFUSED ? 409 : 422 });
  return NextResponse.json({ account: r }, { status: 201 });
}
