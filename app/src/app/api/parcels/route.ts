// The land parcel register (lib/data/parcels.ts, docs/PARCEL_REGISTER.md).
// GET: one page of parcels in their public shape (never rights or holders)
// with the counts, the nation's parcel policy, its cadastre authority and the
// vocabulary (land uses, survey methods, rights, holder and document kinds).
// ?limit= (1–1000, default 100), ?offset=, ?state=proposed|published|withdrawn|current|all
// (default published), ?region=, ?district=, ?landUse=, ?q= (parcel id, record
// number, region or district), ?waiting=1 (a parcel to publish or a change to
// confirm), ?bbox=minLon,minLat,maxLon,maxLat.
// POST: an official of the cadastre authority records a parcel
// ({ parcelId, geometry (GeoJSON Polygon or MultiPolygon), landUse, method,
// accuracyM?, surveyedAt?, surveyor?, planRef?, rights?, note? }) under the
// verified name; a different official publishes it (/api/parcels/{id}). The
// area is computed, never typed. ?check=1 only checks the outline (nothing
// is recorded).
import { NextRequest, NextResponse } from 'next/server';
import {
  HOLDER_KINDS, LAND_USES, PARCEL_COLUMNS, RIGHT_TYPES, SOURCE_KINDS, SURVEY_METHODS, cadastreAuthority, checkParcel, pageParcels,
  parcelCounts, parcelPolicy, recordParcel, viewParcel, type ParcelPageFilter, type RecordInput,
} from '@/lib/data/parcels';
import { currentOfficial, refusal, withOfficial } from '@/lib/auth/official';
import { canRecordParcel, canSeeParcelRights } from '@/lib/auth/roles';
import { parseBbox } from '@/lib/twin/ogc';
export const dynamic = 'force-dynamic';

const STATES = ['proposed', 'published', 'withdrawn', 'current', 'all'] as const;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const limit = Number(q.get('limit') ?? 100), offset = Number(q.get('offset') ?? 0);
  if (!Number.isFinite(limit) || limit < 1) return NextResponse.json({ error: 'limit must be a number from 1' }, { status: 400 });
  if (!Number.isFinite(offset) || offset < 0) return NextResponse.json({ error: 'offset must be 0 or more' }, { status: 400 });
  const state = q.get('state');
  if (state && !(STATES as readonly string[]).includes(state)) return NextResponse.json({ error: `state must be one of: ${STATES.join(', ')}` }, { status: 400 });
  const bbox = parseBbox(q.get('bbox'));
  if (bbox && 'error' in bbox) return NextResponse.json(bbox, { status: 400 });
  const o = await currentOfficial();
  const policy = parcelPolicy();
  const filter: ParcelPageFilter = {
    state: (state ?? 'published') as ParcelPageFilter['state'], region: q.get('region') || undefined, district: q.get('district') || undefined,
    landUse: q.get('landUse') || undefined, q: q.get('q') ?? undefined, waiting: q.get('waiting') === '1' || q.get('waiting') === 'true', ...(bbox ? { bbox } : {}),
  };
  const page = pageParcels(filter, { offset, limit });
  return NextResponse.json({
    parcels: page.parcels, page: { total: page.total, offset: page.offset, limit: page.limit, next: page.next },
    counts: parcelCounts(), policy, authority: cadastreAuthority(),
    // Whether this viewer may see rights and holders on a parcel's own record (never in this list).
    seesRights: !!o && !canSeeParcelRights(o, policy.authorityId),
    landUses: LAND_USES, methods: SURVEY_METHODS, rightTypes: RIGHT_TYPES, holderKinds: HOLDER_KINDS, sourceKinds: SOURCE_KINDS, columns: PARCEL_COLUMNS,
  });
}

export async function POST(req: NextRequest) {
  const refused = await refusal(s => canRecordParcel(s, parcelPolicy().authorityId));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as RecordInput & { by?: string };
  if (req.nextUrl.searchParams.get('check') === '1') {
    const c = await checkParcel({ geometry: b.geometry });
    return NextResponse.json({ check: { ok: c.ok, errors: c.errors, warnings: c.warnings, areaM2: c.areaM2, place: c.place, overlaps: c.overlaps, overlapCellM: c.overlapCellM } });
  }
  const r = await recordParcel(b, b.by ?? '');
  if ('error' in r) return NextResponse.json({ error: r.error, ...(r.check ? { check: { errors: r.check.errors, warnings: r.check.warnings, overlaps: r.check.overlaps } } : {}) }, { status: 422 });
  const o = await currentOfficial();
  return NextResponse.json({
    parcel: viewParcel(r.parcel, { rights: !!o && !canSeeParcelRights(o, parcelPolicy().authorityId) }),
    check: { warnings: r.check.warnings, overlaps: r.check.overlaps },
  }, { status: 201 });
}
