// The nation's own boundaries (lib/data/boundaries.ts): GET lists every
// version (without shapes); POST checks a boundary file (?dryRun=1 records
// nothing) and records it as a proposal for a different official to publish.
// The file goes either as JSON (`text` with `format` geojson | topojson, or
// `base64` for any format) or as multipart/form-data: `file` (GeoJSON,
// TopoJSON, a zipped Shapefile .zip or a GeoPackage .gpkg) and `body`, a JSON
// string with the other fields (level, source, validFrom, codeField,
// nameField, confirmFewer, note). The format is detected from the file
// (geojson | topojson | shapefile-zip | geopackage) unless `format` names it.
import { NextRequest, NextResponse } from 'next/server';
import { listBoundaryVersions, proposeBoundaries, MAX_BOUNDARY_BYTES } from '@/lib/data/boundaries';
import { BOUNDARY_FORMATS, type BoundaryFormat } from '@/lib/geo/boundary-files';
import { SIMPLIFY_ABOVE_BYTES, SIMPLIFY_ABOVE_VERTICES } from '@/lib/geo/boundary-simplify';
import { mappingAgency } from '@/lib/data/facilities';
import { refusal, withOfficial } from '@/lib/auth/official';
import { canManageBoundaries } from '@/lib/auth/roles';
import { limit } from '@/lib/ops/rate-limit';
export const dynamic = 'force-dynamic';
// GeoPackages are read with sql.js (WebAssembly) and zips with fflate: Node only.
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const l = req.nextUrl.searchParams.get('level');
  return NextResponse.json({
    versions: listBoundaryVersions(l === '1' ? 1 : l === '2' ? 2 : undefined), mappingAgency: mappingAgency(), maxBytes: MAX_BOUNDARY_BYTES,
    formats: BOUNDARY_FORMATS, simplifyAbove: { vertices: SIMPLIFY_ABOVE_VERTICES, bytes: SIMPLIFY_ABOVE_BYTES },
  });
}

const bad = (error: string, status = 422) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  const limited = await limit(req, 'upload');
  if (limited) return limited;
  const refused = await refusal(s => canManageBoundaries(s, mappingAgency()?.id));
  if (refused) return refused;
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_BOUNDARY_BYTES + 1_000_000) return bad(`The file is larger than ${MAX_BOUNDARY_BYTES / 1_000_000} MB`, 413);

  let raw: Record<string, unknown> = {};
  let bytes: Uint8Array | undefined;
  let fileName: string | undefined;
  if ((req.headers.get('content-type') ?? '').toLowerCase().startsWith('multipart/form-data')) {
    const form = await req.formData().catch(() => null);
    if (!form) return bad('The upload could not be read');
    const file = form.get('file');
    if (!file || typeof file === 'string') return bad('Attach the boundary file as `file`');
    if (file.size > MAX_BOUNDARY_BYTES) return bad(`The file is larger than ${MAX_BOUNDARY_BYTES / 1_000_000} MB`, 413);
    bytes = new Uint8Array(await file.arrayBuffer());
    fileName = file.name;
    const meta = form.get('body');
    try { raw = typeof meta === 'string' && meta ? JSON.parse(meta) as Record<string, unknown> : {}; } catch { return bad('`body` is not valid JSON'); }
  } else {
    raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof raw.base64 === 'string' && raw.base64) {
      if (raw.base64.length > (MAX_BOUNDARY_BYTES * 4) / 3 + 4) return bad(`The file is larger than ${MAX_BOUNDARY_BYTES / 1_000_000} MB`, 413);
      bytes = new Uint8Array(Buffer.from(raw.base64, 'base64'));
    }
    if (typeof raw.fileName === 'string') fileName = raw.fileName;
  }
  const b = (await withOfficial(raw)) as Record<string, unknown> & { by?: string };
  const level = Number(b.level);
  const format = BOUNDARY_FORMATS.includes(b.format as BoundaryFormat) ? (b.format as BoundaryFormat) : undefined;
  const r = await proposeBoundaries({
    level: level === 2 ? 2 : level === 1 ? 1 : (level as 1),
    ...(bytes ? { bytes } : { text: typeof b.text === 'string' ? b.text : '' }),
    fileName,
    format,
    source: (b.source ?? {}) as Record<string, string>,
    validFrom: typeof b.validFrom === 'string' ? b.validFrom : undefined,
    codeField: typeof b.codeField === 'string' && b.codeField ? b.codeField : undefined,
    nameField: typeof b.nameField === 'string' && b.nameField ? b.nameField : undefined,
    confirmFewer: b.confirmFewer === true,
    note: typeof b.note === 'string' ? b.note : undefined,
  }, b.by ?? '', { dryRun: req.nextUrl.searchParams.get('dryRun') === '1' });
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json(r, { status: r.dryRun ? 200 : 201 });
}
