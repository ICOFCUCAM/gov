// POST /api/federation/inbound — another institution's installation sends a
// federation event envelope (plan I9, lib/federation/events.ts
// receiveEnvelope()): its integration key of scope events:inbound in
// Authorization (an integration two officials linked to the source
// institution), and { recipient, envelope } in the body. The envelope's
// signature is checked against a key two officials of this installation
// trust for the source, its schema version, the recipient's authority under
// the relationship register, and duplicates by event id; every envelope is
// recorded as accepted, rejected or pending and applied to nothing. The
// answer carries the record and a signed exchange receipt (header CivicOS-Receipt).
import { NextRequest, NextResponse } from 'next/server';
import { verifyIntegrationKey } from '@/lib/data/store';
import { receiveEnvelope } from '@/lib/federation/events';
import { logExchange, noteUnauthenticated, RECEIPT_HEADER, ExchangeKeyError } from '@/lib/exchange/log';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const access = verifyIntegrationKey(req.headers.get('authorization'), 'events:inbound');
  if (!access.ok) {
    noteUnauthenticated({ channel: 'federation', feedId: 'inbound', result: access.error });
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const text = await req.text();
  let b: { recipient?: unknown; envelope?: unknown };
  try { b = JSON.parse(text) as typeof b; } catch { return NextResponse.json({ error: 'The body is JSON: { recipient, envelope }' }, { status: 400 }); }
  const r = receiveEnvelope(b.envelope, typeof b.recipient === 'string' ? b.recipient : '', { via: access.client.id });
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  const status = r.record.state === 'accepted' ? 200 : r.record.state === 'pending' ? 202 : 422;
  try {
    const { receipt } = await logExchange({ channel: 'federation', feedId: `integration:${access.client.id}`, method: 'POST', path: '/api/federation/inbound', body: text, signature: 'verified', status, result: `${r.record.state}${r.duplicate ? ' (retry recognised)' : ''} · ${r.record.type} · event ${r.record.eventId}`.slice(0, 280) });
    const res = NextResponse.json({ record: { id: r.record.id, state: r.record.state, reasons: r.record.reasons, duplicate: r.duplicate }, receipt: receipt.id }, { status });
    res.headers.set(RECEIPT_HEADER, Buffer.from(JSON.stringify(receipt)).toString('base64'));
    return res;
  } catch (e) {
    if (e instanceof ExchangeKeyError) return NextResponse.json({ error: e.message, record: { id: r.record.id, state: r.record.state } }, { status: 503 });
    throw e;
  }
}
