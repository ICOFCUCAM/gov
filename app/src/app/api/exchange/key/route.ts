// The platform's exchange public key (Ed25519 SPKI PEM): what senders verify
// their receipts with (lib/exchange/log.ts). `production: false` means a
// development key signed them (CIVICOS_EXCHANGE_KEY not set).
import { NextResponse } from 'next/server';
import { exchangePublicKey } from '@/lib/exchange/log';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(exchangePublicKey());
}
