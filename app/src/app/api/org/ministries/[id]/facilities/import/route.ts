// Load an institution's existing site data: a survey or registry export (CSV),
// GeoJSON points or GPX waypoints from a GNSS receiver or phone. POST { text,
// format, dryRun?, method? }: with dryRun, what would be loaded and every
// refused row with its reason; otherwise each accepted row is proposed (and
// published by a second official), the file's SHA-256 recorded and audited.
import { NextRequest, NextResponse } from 'next/server';
import { IMPORT_COLUMNS, MAX_SITE_ROWS, importSites, type CaptureMethod } from '@/lib/data/facilities';
import { refusal, withOfficial } from '@/lib/auth/official';
import { ministryPermission } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ columns: IMPORT_COLUMNS, maxRows: MAX_SITE_ROWS, formats: ['csv', 'geojson', 'gpx'] });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const refused = await refusal(s => ministryPermission(s, params.id));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { text?: string; format?: string; dryRun?: boolean; method?: CaptureMethod; by?: string };
  if (typeof b.text !== 'string' || !b.text.trim()) return NextResponse.json({ error: 'Send the file\'s contents' }, { status: 422 });
  const format = b.format === 'geojson' || b.format === 'gpx' ? b.format : 'csv';
  const r = await importSites(params.id, b.text, format, b.by ?? '', { dryRun: !!b.dryRun, method: b.method });
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'No such institution' ? 404 : 422 });
  return NextResponse.json(r, { status: b.dryRun ? 200 : 201 });
}
