// The national facility register as one PMTiles v3 archive (vector layer
// "facilities", zoom 0–12 by default), read with HTTP range requests
// (Range: bytes=a-b → 206 Partial Content; HEAD for the size and ETag). Open
// without sign-in: it holds only what the public may see — restricted sites
// at their generalised position, exactly as viewFacility() gives a viewer who
// is not signed in; confidential sites never. Rebuilt after publication
// changes (lib/twin/tiles-archive.ts); a new build has a new ETag, so a reader
// can tell its ranges came from one build (If-Range is honoured). Signed-in
// officials read the viewer-aware tiles at /api/twin/tiles/facilities/{z}/{x}/{y}.mvt.
import { NextRequest, NextResponse } from 'next/server';
import { ARCHIVE_TYPE, facilityArchive, parseRange } from '@/lib/twin/tiles-archive';

export const dynamic = 'force-dynamic';

async function answer(req: NextRequest, head: boolean): Promise<NextResponse> {
  const { bytes, info } = await facilityArchive();
  const size = bytes.length;
  const common: Record<string, string> = {
    'content-type': ARCHIVE_TYPE, 'accept-ranges': 'bytes', etag: info.etag, 'last-modified': new Date(info.builtAt).toUTCString(),
    'cache-control': 'public, max-age=60, must-revalidate', 'x-facility-sites': String(info.sites), 'access-control-expose-headers': 'etag, content-range, content-length',
  };
  // A conditional range for an older build gets the whole new archive.
  const ifRange = req.headers.get('if-range');
  const r = ifRange && ifRange !== info.etag ? null : parseRange(req.headers.get('range'), size);
  if (r === 'unsatisfiable') return new NextResponse(null, { status: 416, headers: { ...common, 'content-range': `bytes */${size}` } });
  if (req.headers.get('if-none-match') === info.etag && !r) return new NextResponse(null, { status: 304, headers: common });
  if (!r) return new NextResponse(head ? null : bytes, { status: 200, headers: { ...common, 'content-length': String(size) } });
  const part = bytes.subarray(r.start, r.end + 1);
  return new NextResponse(head ? null : part, { status: 206, headers: { ...common, 'content-range': `bytes ${r.start}-${r.end}/${size}`, 'content-length': String(part.length) } });
}

export async function GET(req: NextRequest) { return answer(req, false); }
export async function HEAD(req: NextRequest) { return answer(req, true); }
