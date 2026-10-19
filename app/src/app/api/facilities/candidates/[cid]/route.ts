// Decide an open-data candidate. POST { decision: 'confirm', ministryId,
// name?, status? } records it as a new site of that institution (checked like
// a form; published by a second official); { decision: 'link', facilityId }
// adds its identifier to a site already recorded; { decision: 'reject',
// reason }. Confirming and linking are for officials of the institution
// concerned (lib/auth/roles.ts); every decision is audited.
import { NextRequest, NextResponse } from 'next/server';
import { decideCandidate, getFacility } from '@/lib/data/facilities';
import { refusal, withOfficial } from '@/lib/auth/official';
import { ministryPermission } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ cid: string }> }) {
  const params = await props.params;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { decision?: string; ministryId?: string; facilityId?: string; name?: string; status?: string; reason?: string; by?: string };
  let decision: Parameters<typeof decideCandidate>[1];
  if (b.decision === 'confirm') {
    if (!b.ministryId) return NextResponse.json({ error: 'Choose the institution the site belongs to' }, { status: 422 });
    const refused = await refusal(s => ministryPermission(s, b.ministryId!));
    if (refused) return refused;
    decision = { decision: 'confirm', ministryId: b.ministryId, name: b.name, status: b.status as never };
  } else if (b.decision === 'link') {
    const f = b.facilityId ? getFacility(b.facilityId) : undefined;
    if (!f) return NextResponse.json({ error: 'No such site' }, { status: 422 });
    const refused = await refusal(s => ministryPermission(s, f.ownerId));
    if (refused) return refused;
    decision = { decision: 'link', facilityId: f.id };
  } else if (b.decision === 'reject') decision = { decision: 'reject', reason: b.reason };
  else return NextResponse.json({ error: 'Confirm, link or reject' }, { status: 422 });
  const r = await decideCandidate(params.cid, decision, b.by ?? '');
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ candidate: r });
}
