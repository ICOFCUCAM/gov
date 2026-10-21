// /api/permits/[id] — one permit with its applicant and form fields, for the
// institution that issues it, the whole government and auditors
// (canReadPermits()). Each read by a signed-in official, and each refusal, is
// written to the access log (record reference only; baseline audit §3.3).
import { NextResponse } from 'next/server';
import { getPermit, permitHolders } from '@/lib/data/store';
import { readRefusal, caseScope } from '@/lib/auth/official';
import { canReadPermits } from '@/lib/auth/roles';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const refused = await readRefusal(s => canReadPermits(s, permitHolders()), { register: 'permits', id: params.id });
  if (refused) return refused;
  const permit = getPermit(params.id);
  if (!permit) {
    return NextResponse.json({ error: 'Permit not found' }, { status: 404 });
  }
  const s = await caseScope();
  if (s) recordAccess({ ...accessBy(s), record: { register: 'permits', id: permit.id }, action: 'view', result: 'allowed', rule: 'permit issuer, whole government or auditor (canReadPermits)' });
  return NextResponse.json({ permit });
}
