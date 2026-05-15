import { NextRequest, NextResponse } from 'next/server';
import { listBills, listReceipts, payBill } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ bills: listBills(), receipts: listReceipts() });
}

export async function POST(req: NextRequest) {
  let body: { billId?: string; rail?: string };
  try {
    body = (await req.json()) as { billId?: string; rail?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.billId) {
    return NextResponse.json({ error: 'billId is required' }, { status: 422 });
  }
  const result = payBill(body.billId, body.rail ?? 'M-Pesa');
  if ('error' in result) {
    return NextResponse.json(result, { status: 409 });
  }
  return NextResponse.json({ receipt: result }, { status: 201 });
}
