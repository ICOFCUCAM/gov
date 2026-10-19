// The national facility register (lib/data/facilities.ts). GET: published
// sites (?ministry=, ?category=, ?region=, ?state=proposed|published|all),
// each as the viewer may see it — restricted sites are generalised for anyone
// outside the owning institution and the whole government — with counts, the
// nation's policy and the vocabulary (categories, capture methods, the bodies
// that may decide sensitivity). Sites are added through the owning
// institution: /api/org/ministries/{id}/facilities.
import { NextRequest, NextResponse } from 'next/server';
import { CAPTURE_METHODS, FACILITY_CATEGORIES, SENSITIVITY_AUTHORITIES, STATUSES, facilityCounts, facilityPolicy, listFacilities, mappingAgency, sensitivityRule } from '@/lib/data/facilities';
import { currentOfficial } from '@/lib/auth/official';
import { standardsOf } from '@/lib/data/facility-standards';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const o = await currentOfficial();
  const state = q.get('state');
  const sites = listFacilities({
    ministryId: q.get('ministry') ?? undefined, category: q.get('category') ?? undefined, region: q.get('region') ?? undefined,
    state: state === 'proposed' || state === 'published' || state === 'all' ? state : 'published',
  }, o ? { institution: o.institution, signedIn: true } : { signedIn: false });
  return NextResponse.json({
    sites, counts: facilityCounts(), policy: facilityPolicy(), mappingAgency: mappingAgency(),
    categories: FACILITY_CATEGORIES.map(c => ({ ...c, rule: sensitivityRule(c.key), standards: standardsOf(c.key) })), methods: CAPTURE_METHODS, authorities: SENSITIVITY_AUTHORITIES, statuses: STATUSES,
  });
}
