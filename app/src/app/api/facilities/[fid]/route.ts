// One site of the national facility register. GET: the site as the viewer may
// see it (versions for officials). POST { action, … }: publish, certify
// (stage institution | mapping-agency), move / confirm-move, status, withdraw —
// each by the official the nation's rules allow (lib/auth/roles.ts), under the
// verified name, four-eyes where the register asks for it, audited.
import { NextRequest, NextResponse } from 'next/server';
import { actOnFacility, facilityPolicy, getFacility, viewFacility, type FacilityAction } from '@/lib/data/facilities';
import { currentOfficial, refusal, withOfficial } from '@/lib/auth/official';
import { canCertifyForAgency, canSignForSite, ministryPermission } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';

export async function GET(_r: NextRequest, { params }: { params: { fid: string } }) {
  const f = getFacility(params.fid);
  if (!f) return NextResponse.json({ error: 'No such site' }, { status: 404 });
  const o = await currentOfficial();
  return NextResponse.json({ site: viewFacility(f, o ? { institution: o.institution, signedIn: true } : { signedIn: false }) });
}

export async function POST(req: NextRequest, { params }: { params: { fid: string } }) {
  const f = getFacility(params.fid);
  if (!f) return NextResponse.json({ error: 'No such site' }, { status: 404 });
  const b = (await withOfficial(await req.json().catch(() => ({})))) as FacilityAction & { by?: string };
  const rule = b.action === 'certify' && b.stage === 'mapping-agency'
    ? (s: Parameters<typeof canCertifyForAgency>[0]) => canCertifyForAgency(s, facilityPolicy().mappingAgencyId)
    : b.action === 'publish' || b.action === 'certify' || b.action === 'confirm-move'
      ? (s: Parameters<typeof canSignForSite>[0]) => canSignForSite(s, f.ownerId)
      : (s: Parameters<typeof ministryPermission>[0]) => ministryPermission(s, f.ownerId);
  const refused = await refusal(rule);
  if (refused) return refused;
  const r = await actOnFacility(params.fid, b, b.by ?? '');
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ site: r });
}
