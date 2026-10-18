// The signed-in official's own sign-in activity, newest first (lib/auth/activity.ts):
// sign-ins with a coarse device, failed attempts against the account,
// password and second-step changes, administrators' changes to the account.
import { NextResponse } from 'next/server';
import { currentOfficial } from '@/lib/auth/official';
import { accountActivity } from '@/lib/auth/activity';

export const dynamic = 'force-dynamic';

export async function GET() {
  const o = await currentOfficial();
  if (!o) return NextResponse.json({ error: 'Sign in as an official' }, { status: 401 });
  const id = o.sub.replace(/^(local|officer):/, '');
  return NextResponse.json(accountActivity(id, o.name));
}
