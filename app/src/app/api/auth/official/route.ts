// The signed-in official (register 15.4). GET: who is signed in, how
// officials sign in on this installation, and whether actions require it.
// POST signs in — with a platform account (email + password) or, when the
// substrate is connected, with the substrate's access token, checked by the
// server and matched to the officer register — or with a passkey
// ({ method: 'passkey', challengeId, response }, options from
// /api/auth/passkeys/options). A password sign-in whose account has a passkey
// is answered with passkey options for the second step, then sent again with
// { passkey: { challengeId, response } }. Officials who sign in through the
// government's identity provider start at /api/auth/oidc/start. DELETE signs
// out, ends the session on the server (review M-1), and answers with the
// provider's sign-out address when the session came from it. Every sign-in
// and sign-out is written to the audit chain; addresses never are.

import { authEnforced, openInProduction } from '@/lib/auth/mode';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { OFFICIAL_COOKIE, SESSION_HOURS, verifyToken, type OfficialClaims } from '@/lib/auth/session-token';
import { checkPassword, hasAccounts, sessionSecretProblem, sessionSecret, revokeSession, signInWithPasskey } from '@/lib/auth/officials';
import { relyingParty } from '@/lib/auth/passkeys';
import { logoutUrl, providerPublic } from '@/lib/auth/oidc';
import type { AssertionJSON } from '@/lib/auth/webauthn';
import { currentOfficial, actorLabel, issueSession, sessionToken, sessionKey } from '@/lib/auth/official';
import { serverClient } from '@/lib/db/client';
import { recordAudit, getMinistry } from '@/lib/data/store';
import type { OfficialRole } from '@/lib/auth/roles';
import { officerForUser, substrateScope, substrateAal2 } from '@/lib/auth/substrate-officials';
import { deviceOf } from '@/lib/auth/activity';
import { stateWritable, CHANGE_PATH_HEADER } from '@/lib/data/persist';
import { roleOf } from '@/lib/auth/roles';
import { limit } from '@/lib/ops/rate-limit';

export const dynamic = 'force-dynamic';

const enforced = () => authEnforced();

export async function GET() {
  const o = await currentOfficial();
  // The path of the change the middleware is checking (lib/data/persist.ts RECORD_ROUTES).
  let forPath: string | undefined;
  try { forPath = (await headers()).get(CHANGE_PATH_HEADER) ?? undefined; } catch { forPath = undefined; }
  const official = o ? { ...o, institutionName: o.institution ? getMinistry(o.institution)?.name : undefined } : null;
  return NextResponse.json({
    official,
    // oidc: the name of the government's identity provider when one is set up (lib/auth/oidc.ts);
    // passkey: whether passkeys can be used here (the platform's address is known, CIVICOS_PUBLIC_URL).
    methods: { local: true, substrate: !!serverClient(), oidc: providerPublic(), passkey: !('error' in relyingParty()) },
    accounts: hasAccounts(),
    enforced: enforced(),
    // A production server left open on purpose (CIVICOS_AUTH=open; lib/auth/mode.ts, review L-2).
    openInProduction: openInProduction(),
    // Whether this server accepts changes: false on a standby that does not hold the
    // state writer's lease (lib/data/persist.ts), unless the change touches only the
    // per-record registers (CIVICOS_STATE=postgres). The middleware refuses changes then.
    state: { writable: stateWritable(forPath) },
    // Why no session can be issued or verified (sign-in enforced without CIVICOS_SESSION_SECRET), else null.
    sessionKeyProblem: sessionSecretProblem(),
  });
}

type Who = { sub: string; name: string; office?: string; role?: OfficialRole; institution?: string; twoStep?: boolean; twoStepRequired?: boolean; via?: OfficialClaims['via'] };

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
  const b = (await req.json().catch(() => ({}))) as { method?: string; email?: string; password?: string; code?: string; accessToken?: string;
    challengeId?: string; response?: AssertionJSON; passkey?: { challengeId?: string; response?: AssertionJSON } };
  // Refuse before checking anyone's password when no session could be issued (CIVICOS_AUTH=enforce without CIVICOS_SESSION_SECRET).
  const keyProblem = sessionSecretProblem();
  if (keyProblem) return NextResponse.json({ error: keyProblem }, { status: 503 });
  // Sign-in attempts per address, before any password is hashed (go-live review M-9).
  const limited = await limit(req, 'signin');
  if (limited) return limited;
  let who: Who | { error: string };
  const rp = relyingParty(req.nextUrl.origin);
  if (b.method === 'substrate') {
    who = b.accessToken ? await substrateOfficial(b.accessToken) : { error: 'No access token' };
  } else if (b.method === 'passkey') {
    const a = 'error' in rp ? rp : signInWithPasskey({ challengeId: b.challengeId, response: b.response }, rp);
    who = 'error' in a ? a : { sub: `local:${a.id}`, name: a.name, office: a.office, role: roleOf(a), institution: a.institution, twoStep: a.secondStep, twoStepRequired: a.twoStepRequired, via: 'passkey' };
  } else {
    const a = await checkPassword(b.email ?? '', b.password ?? '', Date.now(), b.code, { ...b.passkey, rp: 'error' in rp ? null : rp });
    who = 'error' in a ? a : { sub: `local:${a.id}`, name: a.name, office: a.office, role: roleOf(a), institution: a.institution, twoStep: a.secondStep, twoStepRequired: a.twoStepRequired, via: 'password' };
  }
  // { needsCode: true } tells the form to ask for the authenticator code; { passkey } carries the options for the passkey step.
  if ('error' in who) return NextResponse.json(who, { status: 401 });
  const now = Math.floor(Date.now() / 1000);
  const claims: OfficialClaims = { ...who, method: b.method === 'substrate' ? 'substrate' : 'local', iat: now, exp: now + SESSION_HOURS * 3600 };
  const how = claims.via === 'passkey' ? 'passkey' : claims.method;
  const res = await issueSession(NextResponse.json({ official: claims }), claims, req.nextUrl.protocol === 'https:');
  recordAudit(actorLabel(claims), 'auth.sign-in', `Official:${claims.sub}`, 'ok', `${how} · ${deviceOf(req.headers.get('user-agent'))}`);
  return res;
}

// Signing out ends the session on the server too (review M-1): the token is refused from now on, even if copied.
export async function DELETE(req: NextRequest) {
  const o = await currentOfficial();
  const token = await sessionToken();
  // Any validly signed token is ended, even one that no longer counts for another reason.
  const signed = token && !sessionSecretProblem() ? await verifyToken(token, sessionSecret()) : null;
  if (token && signed) revokeSession(sessionKey(token), signed.exp);
  // A session from the identity provider is ended there too (RP-initiated logout) when the provider supports it.
  const providerLogout = o?.via === 'oidc' ? logoutUrl(o.sid, req.nextUrl.origin) : null;
  const res = NextResponse.json({ ok: true, ...(providerLogout ? { logoutUrl: providerLogout } : {}) });
  res.cookies.set(OFFICIAL_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  if (o) recordAudit(actorLabel(o), 'auth.sign-out', `Official:${o.sub}`, 'ok', `session ended on the server${o.via === 'oidc' ? ` · identity provider${providerLogout ? ' · signed out there too' : ''}` : ''}`);
  return res;
}
