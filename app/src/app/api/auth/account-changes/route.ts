// /api/auth/account-changes — account changes waiting for an independent
// institution to confirm (lib/auth/account-changes.ts; plan phase 2, audit D).
// GET: administrators see every change; any other signed-in official sees
// the changes waiting for their own institution and those they proposed.
// Confirming or withdrawing one: POST /api/auth/account-changes/{id}.
import { NextResponse } from 'next/server';
import { currentOfficial } from '@/lib/auth/official';
import { roleOf } from '@/lib/auth/roles';
import { listAccountChanges } from '@/lib/auth/account-changes';

export const dynamic = 'force-dynamic';

export async function GET() {
  const o = await currentOfficial();
  if (!o) return NextResponse.json({ error: 'Sign in as an official' }, { status: 401 });
  const all = listAccountChanges();
  if (roleOf(o) === 'administrator') return NextResponse.json({ changes: all });
  return NextResponse.json({ changes: all.filter(c => (o.institution && c.confirmFrom.includes(o.institution)) || c.byId === o.sub) });
}
