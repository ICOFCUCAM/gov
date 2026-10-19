// The platform's exchange public key (Ed25519 SPKI PEM): what senders verify
// their receipts with (lib/exchange/log.ts). `production: false` means a
// development key signed them (CIVICOS_EXCHANGE_KEY not set). With a remote
// key provider (lib/keys/custody.ts) the key is the provider's.
import { NextResponse } from 'next/server';
import { loadExchangePublicKey } from '@/lib/exchange/log';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await loadExchangePublicKey());
  } catch (e) {
    return NextResponse.json({ error: `The key provider did not answer: ${(e as Error).message}` }, { status: 503 });
  }
}
