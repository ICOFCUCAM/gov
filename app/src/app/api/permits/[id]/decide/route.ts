import { NextRequest, NextResponse } from 'next/server';
import { decidePermit } from '@/lib/data/store';
import type { DecidePermitInput } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

const VALID = ['approve', 'decline', 'request-info', 'escalate'];

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  let body: Partial<DecidePermitInput>;
  try {
    body = (await req.json()) as Partial<DecidePermitInput>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.decision || !VALID.includes(body.decision)) {
    return NextResponse.json(
      { error: 'decision must be one of: ' + VALID.join(', ') },
      { status: 422 },
    );
  }
  if (!body.officerName) {
    return NextResponse.json(
      { error: 'officerName is required (named accountability)' },
      { status: 422 },
    );
  }
  const result = decidePermit(params.id, {
    decision: body.decision,
    officerName: body.officerName,
    note: body.note,
    aiClass: body.aiClass,
  });
  if ('error' in result) {
    const status = result.error === 'Permit not found' ? 404 : 409;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json({ permit: result });
}
