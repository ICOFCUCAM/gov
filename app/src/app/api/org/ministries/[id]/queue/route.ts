// An institution's queue. GET reads it (cases age from when they were
// received; examples are marked source "sample"). POST adds one case typed in
// by an official (lib/data/case-import.ts: reference, subject, received,
// region?, priority?, assignee?, note?), checked like a loaded row; audited.
import { NextRequest, NextResponse } from 'next/server';
import { queueFor } from '@/lib/data/store';
import { addCase } from '@/lib/data/case-import';
import { withOfficial, refusal, readRefusal, caseScope } from '@/lib/auth/official';
import { canReadInstitution, ministryPermission, isIndependent } from '@/lib/auth/roles';
import { recordAccess } from '@/lib/records/access-log';
export const dynamic = 'force-dynamic';
export async function GET(_r: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // Cases carry personal data: the institution's own officials, the whole government and auditors (review M-3);
  // never into an independent institution from outside it (lib/auth/roles.ts canReadInstitution()).
  const refused = await readRefusal(s => canReadInstitution(s, params.id));
  if (refused) {
    // A refused attempt from outside an independent institution (the legislature, a court, an independent
    // body) is written to the access log (plan phase 2): reaching across a branch is itself an exercise of power.
    const s = await caseScope();
    if (s && isIndependent(s, params.id)) recordAccess({ by: { id: s.id, name: s.label, ...(s.institution ? { institution: s.institution } : {}) }, record: { register: 'institution-queue', id: params.id }, action: 'refused', result: 'refused', rule: 'Independent institution: read only by its own officials' });
    return refused;
  }
  const r = queueFor(params.id);
  if ('error' in r) return NextResponse.json(r, { status: 404 });
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
