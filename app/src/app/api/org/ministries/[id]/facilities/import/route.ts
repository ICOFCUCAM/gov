// Load an institution's existing site data: a survey or registry export (CSV),
// GeoJSON points or GPX waypoints from a GNSS receiver or phone. POST { text,
// format, dryRun?, method?, crs?, prj? }: crs is the EPSG code the positions
// are given in (a national grid, e.g. EPSG:21037), prj the WKT of a .prj file;
// they are converted to WGS 84 on the server (lib/geo/crs.ts). With dryRun, what would be loaded and every
// refused row with its reason; otherwise each accepted row is proposed (and
// published by a second official), the file's SHA-256 recorded and audited.
import { NextRequest, NextResponse } from 'next/server';
import { IMPORT_COLUMNS, MAX_SITE_ROWS, importSites, type CaptureMethod } from '@/lib/data/facilities';
import { crsChoices } from '@/lib/geo/crs';
import { refusal, withOfficial } from '@/lib/auth/official';
import { ministryPermission } from '@/lib/auth/roles';
import { limit } from '@/lib/ops/rate-limit';
import { readJson, TOO_LARGE, tooLargeAnswer } from '@/lib/net/body-limit';
export const dynamic = 'force-dynamic';
/** The request body's cap: the 10 MB file importSites takes, as a JSON string (escaping can double it), plus the fields. */
const MAX_SITE_FILE_BODY = 2 * 10_000_000 + 100_000;

export function GET() {
  return NextResponse.json({ columns: IMPORT_COLUMNS, maxRows: MAX_SITE_ROWS, formats: ['csv', 'geojson', 'gpx'], crs: crsChoices() });
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const limited = await limit(req, 'upload');
  if (limited) return limited;
  const refused = await refusal(s => ministryPermission(s, params.id));
  if (refused) return refused;
  // Read with a byte cap (lib/net/body-limit.ts, review L-4): the file (10 MB, importSites) as a JSON string, escaping included.
  const body = await readJson(req, MAX_SITE_FILE_BODY);
  if (body === TOO_LARGE) return tooLargeAnswer(10_000_000, 'The file');
  const b = (await withOfficial(body && typeof body === 'object' ? body : {})) as { text?: string; format?: string; dryRun?: boolean; method?: CaptureMethod; by?: string; crs?: string; prj?: string };
  if (typeof b.text !== 'string' || !b.text.trim()) return NextResponse.json({ error: 'Send the file\'s contents' }, { status: 422 });
  const format = b.format === 'geojson' || b.format === 'gpx' ? b.format : 'csv';
  const r = await importSites(params.id, b.text, format, b.by ?? '', { dryRun: !!b.dryRun, method: b.method, crs: typeof b.crs === 'string' ? b.crs : undefined, prj: typeof b.prj === 'string' ? b.prj.slice(0, 20_000) : undefined });
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'No such institution' ? 404 : 422 });
  return NextResponse.json(r, { status: b.dryRun ? 200 : 201 });
}
