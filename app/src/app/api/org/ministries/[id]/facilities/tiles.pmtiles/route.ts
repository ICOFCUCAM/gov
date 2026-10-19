// An institution's own sites as one PMTiles v3 archive (vector layer
// "facilities", the same zoom range and fields as the public archive) for its
// officials: its published sites as the official may see them through
// viewFacility() — restricted sites at their exact position for the
// institution's own officials and the whole government; confidential
// categories are never in the register. Signed-in only (401 without a session;
// an integration key does not open it), checked with canDownloadSiteArchive()
// (lib/auth/roles.ts) through refusal(), so officials of another institution
// are refused (403). Read with HTTP range requests like the public archive
// (206, If-Range, ETag per build; lib/twin/tiles-archive.ts institutionArchive()),
// built again whenever the sites it shows change. Every download is audited
// (`tiles.archive.download`, the official, the institution, the build and
// how many sites): a whole-file GET, or a reader's first range (the one that
// starts at byte 0); the later ranges of the same reading are not.
import { NextRequest, NextResponse } from 'next/server';
import { getMinistry, recordAudit } from '@/lib/data/store';
import { actorLabel, currentOfficial, refusal } from '@/lib/auth/official';
import { canDownloadSiteArchive } from '@/lib/auth/roles';
import { archiveResponse, institutionArchive, parseRange } from '@/lib/twin/tiles-archive';

export const dynamic = 'force-dynamic';

async function answer(req: NextRequest, props: { params: Promise<{ id: string }> }, head: boolean): Promise<Response> {
  const { id } = await props.params;
  if (!getMinistry(id)) return NextResponse.json({ error: 'Ministry not found' }, { status: 404 });
  const o = await currentOfficial();
  if (!o) return NextResponse.json({ error: 'Sign in as an official of this institution to download its site archive' }, { status: 401 });
  const refused = await refusal(s => canDownloadSiteArchive(s, id));
  if (refused) return refused;
  const st = await institutionArchive(id, { institution: o.institution, signedIn: true });
  const res = await archiveResponse(req, st, head, {
    'cache-control': 'private, no-cache', 'x-facility-sites': String(st.info.sites), 'x-positions': st.info.positions ?? 'exact',
    'content-disposition': `attachment; filename="sites-${id.replace(/[^A-Za-z0-9_-]/g, '_')}.pmtiles"`,
  });
  const r = parseRange(req.headers.get('range'), st.info.bytes);
  if (!head && (res.status === 200 || (res.status === 206 && r && r !== 'unsatisfiable' && r.start === 0))) {
    recordAudit(actorLabel(o), 'tiles.archive.download', `Ministry:${id}`, 'ok',
      `${st.info.sites} sites, ${st.info.positions ?? 'exact'} positions, build ${st.info.etag}${res.status === 206 ? ', read by ranges' : ', whole file'}`);
  }
  return res;
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) { return answer(req, props, false); }
export async function HEAD(req: NextRequest, props: { params: Promise<{ id: string }> }) { return answer(req, props, true); }
