// The signed-in official (register 15.4). GET: who is signed in, how
// officials sign in on this installation, and whether actions require it.
// POST signs in — with a platform account (email + password) or, when the
// substrate is connected, with the substrate's access token, checked by the
// server and matched to the officer register. DELETE signs out. Every sign-in
// and sign-out is written to the audit chain; addresses never are.

import { NextRequest, NextResponse } from 'next/server';
import { OFFICIAL_COOKIE, SESSION_HOURS, type OfficialClaims } from '@/lib/auth/session-token';
import { checkPassword, hasAccounts } from '@/lib/auth/officials';
import { currentOfficial, actorLabel, issueSession } from '@/lib/auth/official';
import { serverClient } from '@/lib/db/client';
import { recordAudit, getMinistry } from '@/lib/data/store';
import { roleFromSubstrate, type OfficialRole } from '@/lib/auth/roles';
import { deviceOf } from '@/lib/auth/activity';
import { stateWritable } from '@/lib/data/persist';

export const dynamic = 'force-dynamic';

const enforced = () => process.env.CIVICOS_AUTH === 'enforce';

export async function GET() {
  const o = await currentOfficial();
  const official = o ? { ...o, institutionName: o.institution ? getMinistry(o.institution)?.name : undefined } : null;
  return NextResponse.json({
    official,
    methods: { local: true, substrate: !!serverClient() },
    accounts: hasAccounts(),
    enforced: enforced(),
    // Whether this server accepts changes: false on a standby that does not hold the
    // state writer's lease (lib/data/persist.ts). The middleware refuses changes then.
    state: { writable: stateWritable() },
  });
}

type Who = { sub: string; name: string; office?: string; role?: OfficialRole; institution?: string; twoStep?: boolean; twoStepRequired?: boolean };

// Substrate officers are scoped by the substrate's own row-level security; on the platform they act for the whole government with the role their register entry maps to.
async function substrateOfficial(token: string): Promise<Who | { error: string }> {
  const sb = serverClient();
  if (!sb) return { error: 'The substrate is not connected on this installation' };
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return { error: 'The sign-in could not be verified' };
  const { data: row } = await sb.from('civicos_officers').select('id, name, title, role, active').eq('auth_user_id', data.user.id).limit(1).maybeSingle();
  const o = row as { id: string; name: string; title: string | null; role: string; active: boolean } | null;
  if (!o || !o.active) return { error: 'This account is not an active officer in the register' };
  return { sub: `officer:${o.id}`, name: o.name, office: o.title ?? o.role, role: roleFromSubstrate(o.role) };
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { method?: string; email?: string; password?: string; code?: string; accessToken?: string };
  let who: Who | { error: string };
  if (b.method === 'substrate') {
    who = b.accessToken ? await substrateOfficial(b.accessToken) : { error: 'No access token' };
  } else {
    const a = checkPassword(b.email ?? '', b.password ?? '', Date.now(), b.code);
    who = 'error' in a ? a : { sub: `local:${a.id}`, name: a.name, office: a.office, role: a.role ?? 'administrator', institution: a.institution, twoStep: a.secondStep, twoStepRequired: a.twoStepRequired };
  }
  // { needsCode: true } tells the form to ask for the authenticator code.
  if ('error' in who) return NextResponse.json(who, { status: 401 });
  const now = Math.floor(Date.now() / 1000);
  const claims: OfficialClaims = { ...who, method: b.method === 'substrate' ? 'substrate' : 'local', iat: now, exp: now + SESSION_HOURS * 3600 };
  const res = await issueSession(NextResponse.json({ official: claims }), claims, req.nextUrl.protocol === 'https:');
  recordAudit(actorLabel(claims), 'auth.sign-in', `Official:${claims.sub}`, 'ok', `${claims.method} · ${deviceOf(req.headers.get('user-agent'))}`);
  return res;
}

export async function DELETE() {
  const o = await currentOfficial();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OFFICIAL_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  if (o) recordAudit(actorLabel(o), 'auth.sign-out', `Official:${o.sub}`, 'ok');
  return res;
}
