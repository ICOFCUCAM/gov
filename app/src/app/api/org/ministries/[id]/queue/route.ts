// An institution's queue. GET reads it (cases age from when they were
// received; examples are marked source "sample"). POST adds one case typed in
// by an official (lib/data/case-import.ts: reference, subject, received,
// region?, priority?, assignee?, note?), checked like a loaded row; audited.
import { NextRequest, NextResponse } from 'next/server';
import { queueFor } from '@/lib/data/store';
import { addCase } from '@/lib/data/case-import';
import { withOfficial, refusal, readRefusal, caseScope } from '@/lib/auth/official';
import { canReadInstitution, ministryPermission, isIndependent, readRelationship, relationshipRule, INSTITUTION_RECORDS } from '@/lib/auth/roles';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';
export const dynamic = 'force-dynamic';
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // ?purpose= : a read under an approved audit or request-information relationship states one of its purposes (plan phase 3).
  const purpose = new URL(req.url).searchParams.get('purpose') ?? undefined;
  // Cases carry personal data: the institution's own officials, the whole government and auditors (review M-3);
  // never into an independent institution from outside it (lib/auth/roles.ts canReadInstitution()), except
  // under an approved relationship, read only, for one of its purposes.
  const refused = await readRefusal(s => canReadInstitution(s, params.id, purpose));
  if (refused) {
    // A refused attempt from outside an independent institution (the legislature, a court, an independent
    // body) is written to the access log (plan phase 2): reaching across a branch is itself an exercise of power.
    const s = await caseScope();
    if (s && isIndependent(s, params.id)) recordAccess({ ...accessBy(s), record: { register: 'institution-queue', id: params.id }, action: 'refused', result: 'refused', rule: 'Independent institution: read only by its own officials' });
    return refused;
  }
  const r = queueFor(params.id);
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  // A read from another institution under a relationship is written to the access log, naming the relationship and its version.
  const s = await caseScope();
  const grant = s && canReadInstitution(s, params.id) !== null ? readRelationship(s, params.id, INSTITUTION_RECORDS, purpose) : null;
  if (s && grant) recordAccess({ ...accessBy(s), record: { register: 'institution-queue', id: params.id }, action: 'view', ...(purpose ? { purpose } : {}), result: 'allowed', rule: relationshipRule(grant) });
  return NextResponse.json(r);
}
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const refused = await refusal(s => ministryPermission(s, params.id));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as Record<string, string | undefined>;
  const r = addCase(params.id, b);
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'Ministry not found' ? 404 : 422 });
  return NextResponse.json({ item: r }, { status: 201 });
}
