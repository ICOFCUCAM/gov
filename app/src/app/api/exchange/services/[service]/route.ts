// POST /api/exchange/services/<id> — call a query service from another
// system (lib/exchange/services.ts): the integration key of scope
// service:<id> in Authorization, and { purpose, input } in the body. The
// answer carries only the service's fields and the signed receipt (header
// CivicOS-Receipt); refusals are logged too.
import { NextRequest, NextResponse } from 'next/server';
import { verifyIntegrationKey } from '@/lib/data/store';
import { callService, SERVICES } from '@/lib/exchange/services';
import { noteUnauthenticated, RECEIPT_HEADER, ExchangeKeyError } from '@/lib/exchange/log';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ service: string }> }) {
  const { service } = await props.params;
  const def = SERVICES.find(s => s.id === service);
  if (!def) return NextResponse.json({ error: 'No such service' }, { status: 404 });
  const access = verifyIntegrationKey(req.headers.get('authorization'), def.scope);
  if (!access.ok) {
    noteUnauthenticated({ channel: 'service', feedId: service, result: access.error });
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const b = (await req.json().catch(() => ({}))) as { purpose?: string; input?: Record<string, unknown> };
  let r: Awaited<ReturnType<typeof callService>>;
  try { r = await callService({ kind: 'integration', id: access.client.id, name: access.client.name }, service, b.input ?? {}, String(b.purpose ?? '')); } catch (e) {
    // A production installation without an exchange key answers no exchange (lib/keys/custody.ts developmentKeyRefusal).
    if (e instanceof ExchangeKeyError) return NextResponse.json({ error: e.message }, { status: 503 });
    throw e;
  }
  const res = NextResponse.json(r.error ? { error: r.error } : { data: r.data, receipt: r.receipt.id }, { status: r.status });
  res.headers.set(RECEIPT_HEADER, Buffer.from(JSON.stringify(r.receipt)).toString('base64'));
  return res;
}
