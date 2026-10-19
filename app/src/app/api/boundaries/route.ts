// The nation's own boundaries (lib/data/boundaries.ts): GET lists every
// version (without shapes); POST checks a boundary file (?dryRun=1 records
// nothing) and records it as a proposal for a different official to publish.
import { NextRequest, NextResponse } from 'next/server';
import { listBoundaryVersions, proposeBoundaries, MAX_BOUNDARY_BYTES } from '@/lib/data/boundaries';
import { mappingAgency } from '@/lib/data/facilities';
import { refusal, withOfficial } from '@/lib/auth/official';
import { canManageBoundaries } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const l = req.nextUrl.searchParams.get('level');
  return NextResponse.json({ versions: listBoundaryVersions(l === '1' ? 1 : l === '2' ? 2 : undefined), mappingAgency: mappingAgency(), maxBytes: MAX_BOUNDARY_BYTES });
}

export async function POST(req: NextRequest) {
  const refused = await refusal(s => canManageBoundaries(s, mappingAgency()?.id));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as Record<string, unknown> & { by?: string };
  const level = Number(b.level);
  const r = await proposeBoundaries({
    level: level === 2 ? 2 : level === 1 ? 1 : (level as 1),
    text: typeof b.text === 'string' ? b.text : '',
    format: b.format === 'topojson' ? 'topojson' : b.format === 'geojson' ? 'geojson' : undefined,
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
