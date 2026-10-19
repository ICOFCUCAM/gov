// /api/releases/security/orders/[id] — move an order on: order (with a
// purchase order number; the invoice follows), pay (bank transfer with a
// payment reference; licence issued), pay-now (instant payment), cancel,
// renew, or install-software (a decision, never automatic).
import { NextRequest, NextResponse } from 'next/server';
import { orderAction } from '@/lib/data/security-store';
import { chamberBody } from '@/lib/updates/access';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const r = await chamberBody<{ action?: string; by?: string; poNumber?: string; paymentReference?: string }>(req);
  if (r instanceof NextResponse) return r;
  const { action, by, poNumber, paymentReference } = r.b;
  const out = orderAction(r.nation, params.id, { action, by, poNumber, paymentReference });
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ order: out });
}
