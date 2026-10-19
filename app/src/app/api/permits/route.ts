import { NextRequest, NextResponse } from 'next/server';
import { createPermit, listPermits, permitHolders } from '@/lib/data/store';
import { readRefusal } from '@/lib/auth/official';
import { canReadPermits } from '@/lib/auth/roles';
import type { CreatePermitInput } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

/** Permits and their applicants: the issuing institution, the whole government and auditors (review M-3). */
export async function GET() {
  const refused = await readRefusal(s => canReadPermits(s, permitHolders()));
  if (refused) return refused;
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
