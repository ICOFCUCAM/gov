// An institution's sites in the national facility register. GET: its sites,
// proposed and published, and the files it loaded (?sites=none: the files
// only; the Sites tab reads the sites a page at a time from
// /api/facilities?ministry=&limit=). POST: an official of the institution records a site
// (name, category, longitude/latitude with how it was captured); the position
// is checked first and the site is published by a second official.
import { NextRequest, NextResponse } from 'next/server';
import { listFacilities, listImports, proposeFacility, type ProposeInput } from '@/lib/data/facilities';
import { getMinistry } from '@/lib/data/store';
import { currentOfficial, refusal, withOfficial } from '@/lib/auth/official';
import { ministryPermission } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';

export async function GET(r: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!getMinistry(params.id)) return NextResponse.json({ error: 'Ministry not found' }, { status: 404 });
  if (r.nextUrl.searchParams.get('sites') === 'none') return NextResponse.json({ sites: [], imports: listImports(params.id) });
  const o = await currentOfficial();
  return NextResponse.json({
    sites: listFacilities({ ministryId: params.id, state: 'all' }, o ? { institution: o.institution, signedIn: true } : { signedIn: false }),
    imports: listImports(params.id),
  });
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const refused = await refusal(s => ministryPermission(s, params.id));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as ProposeInput & { by?: string; field?: boolean };
  const r = await proposeFacility(params.id, b, b.by ?? '', { kind: b.field ? 'field' : 'form' });
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'No such institution' ? 404 : 422 });
  return NextResponse.json(r, { status: 201 });
}
