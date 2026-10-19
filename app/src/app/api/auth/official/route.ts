// The signed-in official (register 15.4). GET: who is signed in, how
// officials sign in on this installation, and whether actions require it.
// POST signs in — with a platform account (email + password) or, when the
// substrate is connected, with the substrate's access token, checked by the
// server and matched to the officer register. DELETE signs out (and ends the
// session on the server). Every sign-in and sign-out is written to the audit
// chain; addresses never are.

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { OFFICIAL_COOKIE, SESSION_HOURS, verifyToken, type OfficialClaims } from '@/lib/auth/session-token';
import { checkPassword, hasAccounts, sessionSecretProblem, sessionSecret, revokeSession } from '@/lib/auth/officials';
import { currentOfficial, actorLabel, issueSession, sessionToken, sessionKey } from '@/lib/auth/official';
import { serverClient } from '@/lib/db/client';
import { recordAudit, getMinistry } from '@/lib/data/store';
import type { OfficialRole } from '@/lib/auth/roles';
import { officerForUser, substrateScope, substrateAal2 } from '@/lib/auth/substrate-officials';
import { deviceOf } from '@/lib/auth/activity';
import { stateWritable, CHANGE_PATH_HEADER } from '@/lib/data/persist';
import { roleOf } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

const enforced = () => process.env.CIVICOS_AUTH === 'enforce';

export async function GET() {
  const o = await currentOfficial();
  // The path of the change the middleware is checking (lib/data/persist.ts RECORD_ROUTES).
  let forPath: string | undefined;
  try { forPath = (await headers()).get(CHANGE_PATH_HEADER) ?? undefined; } catch { forPath = undefined; }
  const official = o ? { ...o, institutionName: o.institution ? getMinistry(o.institution)?.name : undefined } : null;
  return NextResponse.json({
    official,
    methods: { local: true, substrate: !!serverClient() },
    accounts: hasAccounts(),
    enforced: enforced(),
    // Whether this server accepts changes: false on a standby that does not hold the
    // state writer's lease (lib/data/persist.ts), unless the change touches only the
    // per-record registers (CIVICOS_STATE=postgres). The middleware refuses changes then.
    state: { writable: stateWritable(forPath) },
    // Why no session can be issued or verified (CIVICOS_AUTH=enforce without CIVICOS_SESSION_SECRET), else null.
    sessionKeyProblem: sessionSecretProblem(),
  });
}

type Who = { sub: string; name: string; office?: string; role?: OfficialRole; institution?: string; twoStep?: boolean; twoStepRequired?: boolean };

// Substrate officers act on the platform with the role and institution the platform's records give them
// (an administrator's assignment, else the least the register supports), under the same second-step
// policy as platform accounts (review H-3, lib/auth/substrate-officials.ts).
async function substrateOfficial(token: string): Promise<Who | { error: string }> {
  const sb = serverClient();
  if (!sb) return { error: 'The substrate is not connected on this installation' };
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return { error: 'The sign-in could not be verified' };
  const o = await officerForUser(data.user.id);
  if (!o || !o.active) return { error: 'This account is not an active officer in the register' };
  const s = substrateScope(o);
  return { sub: `officer:${o.id}`, name: o.name, office: o.title ?? o.role, role: s.role, institution: s.institution, twoStep: substrateAal2(token), twoStepRequired: s.twoStepRequired };
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { method?: string; email?: string; password?: string; code?: string; accessToken?: string };
  // Refuse before checking anyone's password when no session could be issued (CIVICOS_AUTH=enforce without CIVICOS_SESSION_SECRET).
  const keyProblem = sessionSecretProblem();
  if (keyProblem) return NextResponse.json({ error: keyProblem }, { status: 503 });
  let who: Who | { error: string };
  if (b.method === 'substrate') {
    who = b.accessToken ? await substrateOfficial(b.accessToken) : { error: 'No access token' };
  } else {
    const a = await checkPassword(b.email ?? '', b.password ?? '', Date.now(), b.code);
    who = 'error' in a ? a : { sub: `local:${a.id}`, name: a.name, office: a.office, role: roleOf(a), institution: a.institution, twoStep: a.secondStep, twoStepRequired: a.twoStepRequired };
  }
  // { needsCode: true } tells the form to ask for the authenticator code.
  if ('error' in who) return NextResponse.json(who, { status: 401 });
  const now = Math.floor(Date.now() / 1000);
  const claims: OfficialClaims = { ...who, method: b.method === 'substrate' ? 'substrate' : 'local', iat: now, exp: now + SESSION_HOURS * 3600 };
  const res = await issueSession(NextResponse.json({ official: claims }), claims, req.nextUrl.protocol === 'https:');
  recordAudit(actorLabel(claims), 'auth.sign-in', `Official:${claims.sub}`, 'ok', `${claims.method} · ${deviceOf(req.headers.get('user-agent'))}`);
  return res;
}

// Signing out ends the session on the server too (review M-1): the token is refused from now on, even if copied.
export async function DELETE() {
  const o = await currentOfficial();
  const token = await sessionToken();
  // Any validly signed token is ended, even one that no longer counts for another reason.
  const signed = token && !sessionSecretProblem() ? await verifyToken(token, sessionSecret()) : null;
  if (token && signed) revokeSession(sessionKey(token), signed.exp);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OFFICIAL_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  if (o) recordAudit(actorLabel(o), 'auth.sign-out', `Official:${o.sub}`, 'ok', 'session ended on the server');
  return res;
}
