// Platform accounts for officials (lib/auth/officials.ts). GET lists them
// (never password hashes): in full for an administrator, as a directory
// (name, office, institution) for any other signed-in official. POST creates one: the
// first account at installation, with the one-time setup code (`setupToken`,
// lib/auth/setup-token.ts: CIVICOS_SETUP_TOKEN or the code the server wrote
// to its output at start), every later one by an administrator. While the
// substrate is the sign-in method no platform account is created (409).

import { NextRequest, NextResponse } from 'next/server';
import { listAccounts, createAccount, hasAccounts } from '@/lib/auth/officials';
import { currentOfficial, actorLabel } from '@/lib/auth/official';
import { roleOf } from '@/lib/auth/roles';
import { LOCAL_ACCOUNTS_REFUSED } from '@/lib/auth/setup-token';
import { stateWritable, persistenceStatus } from '@/lib/data/persist';

export const dynamic = 'force-dynamic';

export async function GET() {
  const o = await currentOfficial();
  if (!o) return NextResponse.json({ error: 'Sign in as an official' }, { status: 401 });
  // Administrators see every account in full. Everyone else sees who is who (name, office,
  // institution), never email, last sign-in or whose second step is off (go-live review L-3).
  if (roleOf(o) === 'administrator') return NextResponse.json({ accounts: listAccounts(), full: true });
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
  const r = await createAccount(b, o ? actorLabel(o) : null);
  if ('error' in r) return NextResponse.json(r, { status: r.error === LOCAL_ACCOUNTS_REFUSED ? 409 : 422 });
  return NextResponse.json({ account: r }, { status: 201 });
}
