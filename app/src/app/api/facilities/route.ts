// The national facility register (lib/data/facilities.ts). GET: published
// sites (?ministry=, ?category=, ?region=, ?state=proposed|published|all),
// each as the viewer may see it — restricted sites are generalised for anyone
// outside the owning institution and the whole government — with counts, the
// nation's policy and the vocabulary (categories, capture methods, the bodies
// that may decide sensitivity). ?sites=none answers the counts, policy and
// vocabulary without the sites (a national-scale map then reads them as
// vector tiles, /api/twin/tiles/facilities). Sites are added through the owning
// institution: /api/org/ministries/{id}/facilities.
//
// Paging: with ?limit= (1–1000) the answer is one page of the register
// (?offset=, default 0) and `page: { total, offset, limit, next }`; the page
// also takes ?state=current (every stage but withdrawn), ?status= (the site's
// own status), ?q= (name, FAC id, national id, region; a sector code or
// district only where the viewer sees the site exactly) and ?waiting=1 (what
// waits on an official). Without ?limit the answer is the whole list, as
// before. Each page is viewed through viewFacility() like the full list.
// With ?ministry= the answer also carries `ministryCounts`, that institution's
// own counts (an institution's Sites tab pages its own sites this way).
import { NextRequest, NextResponse } from 'next/server';
import {
  CAPTURE_METHODS, FACILITY_CATEGORIES, SENSITIVITY_AUTHORITIES, STATUSES, facilityCounts, facilityPolicy, facilityRegions, listFacilities, mappingAgency,
  pageFacilities, sensitivityRule, type FacilityPage, type FacilityStatus,
} from '@/lib/data/facilities';
import { currentOfficial } from '@/lib/auth/official';
import { standardsOf } from '@/lib/data/facility-standards';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const o = await currentOfficial();
  const viewer = o ? { institution: o.institution, signedIn: true } : { signedIn: false };
  const state = q.get('state');
  const filter = { ministryId: q.get('ministry') || undefined, category: q.get('category') || undefined, region: q.get('region') || undefined };
  let page: Omit<FacilityPage, 'sites'> | undefined;
  let sites: ReturnType<typeof listFacilities> = [];
  const limitParam = q.get('limit');
  if (limitParam !== null && q.get('sites') !== 'none') {
    const limit = Number(limitParam), offset = Number(q.get('offset') ?? 0);
    if (!Number.isFinite(limit) || limit < 1) return NextResponse.json({ error: 'limit must be a number from 1' }, { status: 400 });
    if (!Number.isFinite(offset) || offset < 0) return NextResponse.json({ error: 'offset must be 0 or more' }, { status: 400 });
    const status = q.get('status');
    if (status && !STATUSES.includes(status as FacilityStatus)) return NextResponse.json({ error: `status must be one of: ${STATUSES.join(', ')}` }, { status: 400 });
    const r = pageFacilities({
      ...filter,
      state: state === 'proposed' || state === 'published' || state === 'withdrawn' || state === 'all' || state === 'current' ? state : 'published',
      status: (status || undefined) as FacilityStatus | undefined, q: q.get('q') ?? undefined, waiting: q.get('waiting') === '1' || q.get('waiting') === 'true',
    }, viewer, { offset, limit });
    sites = r.sites;
    page = { total: r.total, offset: r.offset, limit: r.limit, next: r.next };
  } else if (q.get('sites') !== 'none') {
    sites = listFacilities({ ...filter, state: state === 'proposed' || state === 'published' || state === 'all' ? state : 'published' }, viewer);
  }
  return NextResponse.json({
    sites, ...(page ? { page } : {}), counts: facilityCounts(), ...(filter.ministryId ? { ministryCounts: facilityCounts(filter.ministryId) } : {}), regions: facilityRegions(), policy: facilityPolicy(), mappingAgency: mappingAgency(),
    categories: FACILITY_CATEGORIES.map(c => ({ ...c, rule: sensitivityRule(c.key), standards: standardsOf(c.key) })), methods: CAPTURE_METHODS, authorities: SENSITIVITY_AUTHORITIES, statuses: STATUSES,
  });
}
