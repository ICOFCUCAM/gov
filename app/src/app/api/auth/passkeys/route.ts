// The signed-in official's passkeys and security keys (WebAuthn;
// lib/auth/officials.ts, verification in lib/auth/webauthn.ts). GET lists
// them (name, when added and last used; never a key). POST { action }:
//   'options'  → creation options for the browser (an account that already
//                has a second step needs a session that passed it);
//   'register' { challengeId, response, name } → verifies the authenticator's
//                answer and keeps its public key;
//   'remove'   { id } → removes one (not the last second step the
//                installation requires).
// Platform accounts only. Every change is audited.

import { NextRequest, NextResponse } from 'next/server';
import { passkeyRegistrationOptions, passkeysOf, registerPasskey, removePasskey } from '@/lib/auth/officials';
import { relyingParty } from '@/lib/auth/passkeys';
import { currentOfficial, actorLabel } from '@/lib/auth/official';
import type { RegistrationJSON } from '@/lib/auth/webauthn';

export const dynamic = 'force-dynamic';

async function me() {
  const o = await currentOfficial();
  if (!o) return { error: NextResponse.json({ error: 'Sign in as an official' }, { status: 401 }) } as const;
  if (o.method !== 'local') return { error: NextResponse.json({ error: 'Substrate officers manage their sign-in in the substrate' }, { status: 422 }) } as const;
  return { o, id: o.sub.slice('local:'.length) } as const;
}

export async function GET(req: NextRequest) {
  const m = await me();
  if ('error' in m) return m.error;
  const rp = relyingParty(req.nextUrl.origin);
  return NextResponse.json({ passkeys: passkeysOf(m.id), available: !('error' in rp), ...('error' in rp ? { why: rp.error } : {}) });
}

export async function POST(req: NextRequest) {
  const m = await me();
  if ('error' in m) return m.error;
  const rp = relyingParty(req.nextUrl.origin);
  if ('error' in rp) return NextResponse.json(rp, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { action?: string; challengeId?: string; response?: RegistrationJSON; name?: string; id?: string };
  const fail = (r: { error: string }) => NextResponse.json(r, { status: 422 });
  if (b.action === 'options') {
    const r = passkeyRegistrationOptions(m.id, rp, !!m.o.twoStep);
    return 'error' in r ? fail(r) : NextResponse.json(r);
  }
  if (b.action === 'register') {
    const r = registerPasskey(m.id, { challengeId: b.challengeId, response: b.response, name: b.name }, rp);
    return 'error' in r ? fail(r) : NextResponse.json(r, { status: 201 });
  }
  if (b.action === 'remove') {
    const r = removePasskey(m.id, b.id ?? '', actorLabel(m.o), !!m.o.twoStep);
    return 'error' in r ? fail(r) : NextResponse.json(r);
  }
  return fail({ error: 'action must be options, register or remove' });
}
