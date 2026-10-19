// Loading parcels from a file (lib/data/parcels.ts importParcels): GeoJSON, a
// zipped Shapefile (.zip with .shp, .dbf, .prj, .cpg) or a GeoPackage
// (.gpkg). A Shapefile's .prj or a GeoPackage's spatial reference is
// reprojected; GeoJSON in a national grid declares it with `crs` (an EPSG
// code, lib/geo/crs.ts). Every row is checked like a form; refusals come with
// reasons; ?dryRun=1 records nothing. Sent as multipart/form-data (`file`,
// and `body`: JSON with crs, idField, landUseField, method) or as JSON
// (`text` for GeoJSON, or `base64` for any format, with the same fields).
// Audited with the file's SHA-256 and the counts. GET lists the loads.
import { NextRequest, NextResponse } from 'next/server';
import { importParcels, listParcelImports, parcelPolicy, MAX_PARCEL_FILE_BYTES } from '@/lib/data/parcels';
import { BOUNDARY_FORMATS, type BoundaryFormat } from '@/lib/geo/boundary-files';
import { refusal, withOfficial } from '@/lib/auth/official';
import { canRecordParcel } from '@/lib/auth/roles';
import { limit } from '@/lib/ops/rate-limit';
import { readForm, readJson, TOO_LARGE } from '@/lib/net/body-limit';
export const dynamic = 'force-dynamic';
// GeoPackages are read with sql.js (WebAssembly) and zips with fflate: Node only.
export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json({ imports: listParcelImports(), maxBytes: MAX_PARCEL_FILE_BYTES });
}

const bad = (error: string, status = 422) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  const limited = await limit(req, 'upload');
  if (limited) return limited;
  const refused = await refusal(s => canRecordParcel(s, parcelPolicy().authorityId));
  if (refused) return refused;
  // The body is read with a byte cap whether or not it declares its length (lib/net/body-limit.ts, review L-4).
  const tooBig = () => bad(`The file is larger than ${MAX_PARCEL_FILE_BYTES / 1_000_000} MB`, 413);
  let raw: Record<string, unknown> = {};
  let bytes: Uint8Array | undefined;
  let name: string | undefined;
  if ((req.headers.get('content-type') ?? '').toLowerCase().startsWith('multipart/form-data')) {
    const form = await readForm(req, MAX_PARCEL_FILE_BYTES + 1_000_000);
    if (form === TOO_LARGE) return tooBig();
    if (!form) return bad('The upload could not be read');
    const file = form.get('file');
    if (!file || typeof file === 'string') return bad('Attach the parcel file as `file`');
    if (file.size > MAX_PARCEL_FILE_BYTES) return bad(`The file is larger than ${MAX_PARCEL_FILE_BYTES / 1_000_000} MB`, 413);
    bytes = new Uint8Array(await file.arrayBuffer());
    name = file.name;
    const meta = form.get('body');
    try { raw = typeof meta === 'string' && meta ? JSON.parse(meta) as Record<string, unknown> : {}; } catch { return bad('`body` is not valid JSON'); }
  } else {
    const json = await readJson(req, Math.ceil((MAX_PARCEL_FILE_BYTES * 4) / 3) + 1_000_000);
    if (json === TOO_LARGE) return tooBig();
    raw = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
    if (typeof raw.base64 === 'string' && raw.base64) bytes = new Uint8Array(Buffer.from(raw.base64, 'base64'));
    else if (typeof raw.text === 'string') bytes = new TextEncoder().encode(raw.text);
    if (typeof raw.fileName === 'string') name = raw.fileName;
  }
  if (!bytes?.byteLength) return bad('Attach the parcel file');
  const b = (await withOfficial(raw)) as Record<string, unknown> & { by?: string };
  const str = (k: string) => (typeof b[k] === 'string' && b[k] ? String(b[k]) : undefined);
  const r = await importParcels({
    bytes, name, format: BOUNDARY_FORMATS.includes(b.format as BoundaryFormat) ? b.format as BoundaryFormat : undefined,
    crs: str('crs'), idField: str('idField'), landUseField: str('landUseField'), method: str('method'),
    dryRun: req.nextUrl.searchParams.get('dryRun') === '1',
  }, b.by ?? '');
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ import: r }, { status: r.dryRun ? 200 : 201 });
}
