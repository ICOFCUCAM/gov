// The national facility register as CityJSON 2.0 (lib/data/cityjson.ts):
// sites with a footprint and height as LoD1 building solids, with a footprint
// only as LoD0 surfaces, others as LoD0 points (?category= to narrow). As the
// viewer may see them: restricted sites generalised, without their footprint,
// for viewers without need. Download as application/city+json.
import { NextRequest, NextResponse } from 'next/server';
import { facilitiesCityJson } from '@/lib/data/cityjson';
import { categoryOf } from '@/lib/data/facilities';
import { getSovereign } from '@/lib/data/store';
import { currentOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') ?? undefined;
  if (category && !categoryOf(category)) return NextResponse.json({ error: 'Unknown category' }, { status: 400 });
  const o = await currentOfficial();
  const nation = getSovereign().stateName;
  const { doc, counts } = facilitiesCityJson(o ? { institution: o.institution, signedIn: true } : { signedIn: false }, { title: `${nation ? `${nation}: ` : ''}national facility register`, category });
  return NextResponse.json(doc, {
    headers: {
      'content-type': 'application/city+json',
      'content-disposition': `attachment; filename="facilities${category ? `-${category}` : ''}.city.json"`,
      'cache-control': 'private, no-store',
      'x-lod1': String(counts.lod1), 'x-lod0-footprints': String(counts.lod0Footprints), 'x-lod0-points': String(counts.lod0Points),
    },
  });
}
