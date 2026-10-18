// Passwords of platform accounts (lib/auth/officials.ts).
// POST { action: 'change', current, next }: the signed-in official changes
//   their own; every other session of theirs ends and this one is renewed.
// POST { action: 'reset', email, code, next }: no session; sets a new
//   password with the one-time code an administrator issued (wrong codes
//   count toward the sign-in lockout). The official then signs in as usual.
// Both audited; passwords and codes never appear in the audit chain.
import { NextRequest, NextResponse } from 'next/server';
import { changePassword, resetPassword } from '@/lib/auth/officials';
import { currentOfficial, issueSession } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { action?: string; current?: string; next?: string; email?: string; code?: string };
  if (b.action === 'reset') {
    const r = resetPassword(b.email ?? '', b.code ?? '', b.next ?? '');
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ ok: true });
  }
  if (b.action !== 'change') return NextResponse.json({ error: 'action must be change or reset' }, { status: 422 });
  const o = await currentOfficial();
  if (!o) return NextResponse.json({ error: 'Sign in as an official' }, { status: 401 });
  if (o.method !== 'local') return NextResponse.json({ error: 'Substrate officers change their password in the substrate' }, { status: 422 });
  const r = changePassword(o.sub.slice('local:'.length), b.current ?? '', b.next ?? '');
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  // Renew this session after the change; sessions issued before it no longer count.
  const now = Math.floor(Date.now() / 1000) + 1;
  return issueSession(NextResponse.json({ ok: true }), { ...o, iat: now }, req.nextUrl.protocol === 'https:');
}
