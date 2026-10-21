import { NextRequest, NextResponse } from 'next/server';
import { createPermit, listPermits, permitHolders } from '@/lib/data/store';
import { readRefusal, caseScope } from '@/lib/auth/official';
import { canReadPermits } from '@/lib/auth/roles';
import { recordSearch } from '@/lib/records/access-search';
import type { CreatePermitInput } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

/**
 * Permits and their applicants: the issuing institution, the whole government and auditors (review M-3).
 * The list carries applicants' names, so each read is one search entry in the access log with the count.
 */
export async function GET() {
  const refused = await readRefusal(s => canReadPermits(s, permitHolders()), { register: 'permits' });
  if (refused) return refused;
  const permits = listPermits();
  const s = await caseScope();
  if (s) recordSearch(s, 'permits', '(all)', permits.length, 'permit issuer, whole government or auditor (canReadPermits)');
  return NextResponse.json({ permits });
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
