// The signed-in official's second sign-in step (authenticator app, RFC 6238;
// lib/auth/officials.ts). GET: whether it is on, whether the installation
// requires it, and the policy. POST { action }:
//   'start'   → a new key (shown once) and its otpauth:// link;
//   'confirm' { code } → turns it on, returns ten recovery codes (shown once)
//              and renews the session as having passed the second step;
//   'off'     { code } → turns it off (not when the policy requires it);
//   'policy'  { policy: none | signers | all } → administrators only.
// Every change is audited. Platform accounts only: substrate officers use the
// substrate's own sign-in.
import { NextRequest, NextResponse } from 'next/server';
import { accountById, confirmTwoStep, removeTwoStep, setTwoStepPolicy, startTwoStep, twoStepPolicy } from '@/lib/auth/officials';
import { currentOfficial, actorLabel, issueSession } from '@/lib/auth/official';
import { roleOf } from '@/lib/auth/roles';
import { getSovereign } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

async function me() {
  const o = await currentOfficial();
  if (!o) return { error: NextResponse.json({ error: 'Sign in as an official' }, { status: 401 }) } as const;
  if (o.method !== 'local') return { error: NextResponse.json({ error: 'Substrate officers set their second step in the substrate' }, { status: 422 }) } as const;
  return { o, id: o.sub.slice('local:'.length) } as const;
}

export async function GET() {
  const m = await me();
  if ('error' in m) return m.error;
  const a = accountById(m.id);
  // passkeys: how many the official has (a passkey is a second step too, /api/auth/passkeys).
  return NextResponse.json({ on: !!a?.twoStepSince, since: a?.twoStepSince ?? null, required: !!a?.twoStepRequired, thisSession: !!m.o.twoStep, policy: twoStepPolicy(), passkeys: a?.passkeys.length ?? 0 });
}

export async function POST(req: NextRequest) {
  const m = await me();
  if ('error' in m) return m.error;
  const b = (await req.json().catch(() => ({}))) as { action?: string; code?: string; policy?: string };
  const fail = (r: { error: string }) => NextResponse.json(r, { status: 422 });
  if (b.action === 'start') {
    const r = startTwoStep(m.id, getSovereign().stateName || 'Government');
    return 'error' in r ? fail(r) : NextResponse.json(r);
  }
  if (b.action === 'confirm') {
    const r = confirmTwoStep(m.id, b.code ?? '');
    if ('error' in r) return fail(r);
    // The official has just proved the code: this session counts as having passed the second step.
    return issueSession(NextResponse.json(r), { ...m.o, twoStep: true, twoStepAt: Date.now(), twoStepRequired: !!accountById(m.id)?.twoStepRequired }, req.nextUrl.protocol === 'https:');
  }
  if (b.action === 'off') {
    const r = removeTwoStep(m.id, { code: b.code, by: actorLabel(m.o) });
    return 'error' in r ? fail(r) : NextResponse.json({ on: false });
  }
  if (b.action === 'policy') {
    if (roleOf(m.o) !== 'administrator') return NextResponse.json({ error: 'Only an administrator can set the policy' }, { status: 403 });
    const r = setTwoStepPolicy(b.policy ?? '', actorLabel(m.o));
    return 'error' in r ? fail(r) : NextResponse.json(r);
  }
  return fail({ error: 'action must be start, confirm, off or policy' });
}
