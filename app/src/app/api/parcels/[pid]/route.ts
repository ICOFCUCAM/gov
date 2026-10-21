// One land parcel (by its record number PCL-nnnnnn or its national parcel id).
// GET: the parcel with who acted, its versions and any change waiting; its
// rights and their holders only for the cadastre authority and officials with
// need (canSeeParcelRights() in lib/auth/roles.ts; otherwise only how many),
// each such read written to the access log (record reference only).
// POST { action, … }: publish (a different official from the one who recorded
// it), amend (new outline, land use, survey or rights, with a reason; waits
// for a second official once published), confirm-amend, discard-amend
// (reason), withdraw (reason). Each under the verified name, by those the
// rules allow, audited without holders' names.
import { NextRequest, NextResponse } from 'next/server';
import { actOnParcel, getParcel, parcelPolicy, viewParcel, type ParcelAction } from '@/lib/data/parcels';
import { currentOfficial, refusal, withOfficial, actorLabel } from '@/lib/auth/official';
import { canCertifyParcel, canRecordParcel, canSeeParcelRights } from '@/lib/auth/roles';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';
export const dynamic = 'force-dynamic';

const seesRights = async () => { const o = await currentOfficial(); return !!o && !canSeeParcelRights(o, parcelPolicy().authorityId); };

export async function GET(_r: NextRequest, props: { params: Promise<{ pid: string }> }) {
  const params = await props.params;
  const p = getParcel(decodeURIComponent(params.pid));
  if (!p) return NextResponse.json({ error: 'No such parcel' }, { status: 404 });
  const o = await currentOfficial();
  const rights = !!o && !canSeeParcelRights(o, parcelPolicy().authorityId);
  // Rights and holders are personal data: a read that returns them is written to the access log (baseline audit §3.3).
  if (o && rights) recordAccess({ ...accessBy({ id: o.sub, label: actorLabel(o), institution: o.institution }), record: { register: 'parcels', id: p.id }, action: 'view', result: 'allowed', rule: 'rights and holders (canSeeParcelRights)' });
  return NextResponse.json({ parcel: viewParcel(p, { rights }) });
}

export async function POST(req: NextRequest, props: { params: Promise<{ pid: string }> }) {
  const params = await props.params;
  const id = decodeURIComponent(params.pid);
  if (!getParcel(id)) return NextResponse.json({ error: 'No such parcel' }, { status: 404 });
  const b = (await withOfficial(await req.json().catch(() => ({})))) as ParcelAction & { by?: string };
  const authority = parcelPolicy().authorityId;
  const refused = await refusal(s => (b.action === 'amend' ? canRecordParcel(s, authority) : canCertifyParcel(s, authority)));
  if (refused) return refused;
  const r = await actOnParcel(id, b, b.by ?? '');
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: 422 });
  return NextResponse.json({ parcel: viewParcel(r, { rights: await seesRights() }) });
}
