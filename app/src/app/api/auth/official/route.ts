// The signed-in official (register 15.4). GET: who is signed in, how
// officials sign in on this installation, and whether actions require it.
// POST signs in — with a platform account (email + password) or, when the
// substrate is connected, with the substrate's access token, checked by the
// server and matched to the officer register. DELETE signs out. Every sign-in
// and sign-out is written to the audit chain; addresses never are.

import { NextRequest, NextResponse } from 'next/server';
import { OFFICIAL_COOKIE, SESSION_HOURS, signClaims, type OfficialClaims } from '@/lib/auth/session-token';
import { checkPassword, hasAccounts, sessionSecret } from '@/lib/auth/officials';
import { currentOfficial, actorLabel } from '@/lib/auth/official';
import { serverClient } from '@/lib/db/client';
import { recordAudit } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

const enforced = () => process.env.CIVICOS_AUTH === 'enforce';

export async function GET() {
  const official = await currentOfficial();
  return NextResponse.json({
    official,
    methods: { local: true, substrate: !!serverClient() },
    accounts: hasAccounts(),
    enforced: enforced(),
  });
}

async function substrateOfficial(token: string): Promise<{ sub: string; name: string; office?: string } | { error: string }> {
  const sb = serverClient();
  if (!sb) return { error: 'The substrate is not connected on this installation' };
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return { error: 'The sign-in could not be verified' };
  const { data: row } = await sb.from('civicos_officers').select('id, name, title, role, active').eq('auth_user_id', data.user.id).limit(1).maybeSingle();
  const o = row as { id: string; name: string; title: string | null; role: string; active: boolean } | null;
  if (!o || !o.active) return { error: 'This account is not an active officer in the register' };
  return { sub: `officer:${o.id}`, name: o.name, office: o.title ?? o.role };
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { method?: string; email?: string; password?: string; accessToken?: string };
  let who: { sub: string; name: string; office?: string } | { error: string };
  if (b.method === 'substrate') {
    who = b.accessToken ? await substrateOfficial(b.accessToken) : { error: 'No access token' };
  } else {
    const a = checkPassword(b.email ?? '', b.password ?? '');
    who = 'error' in a ? a : { sub: `local:${a.id}`, name: a.name, office: a.office };
  }
  if ('error' in who) return NextResponse.json(who, { status: 401 });
  const now = Math.floor(Date.now() / 1000);
  const claims: OfficialClaims = { ...who, method: b.method === 'substrate' ? 'substrate' : 'local', iat: now, exp: now + SESSION_HOURS * 3600 };
  const res = NextResponse.json({ official: claims });
  res.cookies.set(OFFICIAL_COOKIE, await signClaims(claims, sessionSecret()), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: SESSION_HOURS * 3600, secure: req.nextUrl.protocol === 'https:',
  });
  // The console's page gate (middleware) also accepts the official's session.
  res.cookies.set('civicos_session', 'official', { sameSite: 'lax', path: '/', maxAge: SESSION_HOURS * 3600 });
  recordAudit(actorLabel(claims), 'auth.sign-in', `Official:${claims.sub}`, 'ok', claims.method);
  return res;
}

export async function DELETE() {
  const o = await currentOfficial();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OFFICIAL_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  if (o) recordAudit(actorLabel(o), 'auth.sign-out', `Official:${o.sub}`, 'ok');
  return res;
}
