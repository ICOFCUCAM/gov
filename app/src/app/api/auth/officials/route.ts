// Platform accounts for officials (lib/auth/officials.ts). GET lists them
// (never password hashes) for a signed-in official. POST creates one: the
// first account at installation, every later one by an administrator.

import { NextRequest, NextResponse } from 'next/server';
import { listAccounts, createAccount, hasAccounts } from '@/lib/auth/officials';
import { currentOfficial, actorLabel } from '@/lib/auth/official';
import { roleOf } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await currentOfficial())) return NextResponse.json({ error: 'Sign in as an official' }, { status: 401 });
  return NextResponse.json({ accounts: listAccounts() });
}

export async function POST(req: NextRequest) {
  const o = await currentOfficial();
  if (hasAccounts() && !o) return NextResponse.json({ error: 'Only a signed-in official can create accounts' }, { status: 401 });
  if (o && roleOf(o) !== 'administrator') return NextResponse.json({ error: 'Only an administrator can create accounts' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const r = createAccount(b, o ? actorLabel(o) : null);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ account: r }, { status: 201 });
}
