import { NextRequest, NextResponse } from 'next/server';
import { createPermit, listPermits } from '@/lib/data/store';
import type { CreatePermitInput } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ permits: listPermits() });
}

export async function POST(req: NextRequest) {
  let body: Partial<CreatePermitInput>;
  try {
    body = (await req.json()) as Partial<CreatePermitInput>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.type || !body.title || !body.applicantName || !body.municipality) {
    return NextResponse.json(
      { error: 'Missing required fields', detail: 'type, title, applicantName, municipality are required' },
      { status: 422 },
    );
  }
  const permit = createPermit({
    type: body.type,
    title: body.title,
    applicantName: body.applicantName,
    municipality: body.municipality,
    fields: body.fields ?? {},
  });
  return NextResponse.json({ permit }, { status: 201 });
}
