// The national facility register as one PMTiles v3 archive (vector layer
// "facilities", zoom 0–12 by default), read with HTTP range requests
// (Range: bytes=a-b → 206 Partial Content; HEAD for the size and ETag). Open
// without sign-in: it holds only what the public may see — restricted sites
// at their generalised position, exactly as viewFacility() gives a viewer who
// is not signed in; confidential sites never. Rebuilt after publication
// changes (lib/twin/tiles-archive.ts) and kept as a file in the platform's
// data directory: a range request reads only the bytes it asks for from the
// file (in memory only where there is no writable directory). A new build has
// a new ETag, so a reader can tell its ranges came from one build (If-Range is
// honoured). Signed-in officials read the viewer-aware tiles at
// /api/twin/tiles/facilities/{z}/{x}/{y}.mvt, and an institution's own
// archive at /api/org/ministries/{id}/facilities/tiles.pmtiles.
import { NextRequest } from 'next/server';
import { archiveResponse, facilityArchive } from '@/lib/twin/tiles-archive';

export const dynamic = 'force-dynamic';

async function answer(req: NextRequest, head: boolean): Promise<Response> {
  const st = await facilityArchive();
  return archiveResponse(req, st, head, { 'cache-control': 'public, max-age=60, must-revalidate', 'x-facility-sites': String(st.info.sites) });
}

export async function GET(req: NextRequest) { return answer(req, false); }
export async function HEAD(req: NextRequest) { return answer(req, true); }
