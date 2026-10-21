// The government's identity provider for officials (OpenID Connect,
// lib/auth/oidc.ts). Administrators only (ADMIN_ONLY in lib/auth/roles.ts),
// every change audited; the client secret is sealed and never returned.
// GET: the configuration, the redirect URI to register at the provider, and
// the identities waiting for an administrator.
// POST { action }:
//   'save'    { name, issuer, clientId, clientSecret?, tokenAuth?, scopes?, matchClaim?,
//               groups?: { claim, rules: [{ group, role, institution? }] } | null,
//               mfa?: { accept, amr?, acr? }, internalNetwork?, extraHosts?, enabled? }
//             → reads the provider's discovery document and saves;
//   'enable' / 'disable';
//   'decide'  { requestId, decision: link | create | refuse, accountId?, account?, reason? }
//             → link the identity to an account, make an account with a role, or refuse;
//   'unlink'  { accountId } → remove an account's identity link.
// Independent institutions keep their own user administration (plan phase 2):
// making or linking an account of one, mapping a provider group to one, or
// unlinking one of its accounts is for its own administrators; an
// administrator serving the whole government uses Official accounts instead,
// where the institution confirms (lib/auth/account-changes.ts).

import { NextRequest, NextResponse } from 'next/server';
import { callbackUrl, decideRequest, listRequests, providerView, saveProvider, setProviderEnabled, type ProviderInput } from '@/lib/auth/oidc';
import { unlinkIdentity } from '@/lib/auth/officials';
import { currentOfficial, actorLabel } from '@/lib/auth/official';
import { roleOf } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

async function admin() {
  const o = await currentOfficial();
  if (!o) return { error: NextResponse.json({ error: 'Sign in as an official' }, { status: 401 }) } as const;
  if (roleOf(o) !== 'administrator') return { error: NextResponse.json({ error: 'Only an administrator can manage the identity provider' }, { status: 403 }) } as const;
  return { o } as const;
}

export async function GET(req: NextRequest) {
  const m = await admin();
  if ('error' in m) return m.error;
  const cb = callbackUrl(req.nextUrl.origin);
  return NextResponse.json({ provider: providerView(), redirectUri: typeof cb === 'string' ? cb : null, ...(typeof cb === 'string' ? {} : { why: cb.error }), requests: listRequests() });
}

export async function POST(req: NextRequest) {
  const m = await admin();
  if ('error' in m) return m.error;
  const by = actorLabel(m.o);
  const b = (await req.json().catch(() => ({}))) as ProviderInput & { action?: string; requestId?: string; decision?: string; accountId?: string; account?: Record<string, string>; reason?: string };
  const fail = (r: { error: string }) => NextResponse.json(r, { status: 422 });
  if (b.action === 'save') {
    const r = await saveProvider(b, by);
    return 'error' in r ? fail(r) : NextResponse.json(r);
  }
  if (b.action === 'enable' || b.action === 'disable') {
    const r = setProviderEnabled(b.action === 'enable', by);
    return 'error' in r ? fail(r) : NextResponse.json(r);
  }
  if (b.action === 'decide') {
    const r = decideRequest(b.requestId ?? '', { action: b.decision, accountId: b.accountId, account: b.account, reason: b.reason }, by);
    return 'error' in r ? fail(r) : NextResponse.json(r);
  }
  if (b.action === 'unlink') {
    const r = unlinkIdentity(b.accountId ?? '', by);
    return 'error' in r ? fail(r) : NextResponse.json({ account: r });
  }
  return fail({ error: 'action must be save, enable, disable, decide or unlink' });
}
