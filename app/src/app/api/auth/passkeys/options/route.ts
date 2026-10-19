// Signing in with a passkey alone: POST gives the browser a fresh challenge
// (five minutes, used once) to sign with any passkey it holds for this
// platform; the answer goes to POST /api/auth/official { method: 'passkey' }.
// Open without a session (it is how officials get one), rate limited like
// every change.

import { NextRequest, NextResponse } from 'next/server';
import { passkeySignInOptions } from '@/lib/auth/officials';
import { relyingParty } from '@/lib/auth/passkeys';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rp = relyingParty(req.nextUrl.origin);
  if ('error' in rp) return NextResponse.json(rp, { status: 503 });
  return NextResponse.json(passkeySignInOptions(rp));
}
