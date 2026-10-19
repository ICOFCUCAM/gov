// Loading an institution's real cases (lib/data/case-import.ts). GET: the
// columns a file may have, the earlier loads and how many example cases are
// still in the queue. POST { csv, fileName?, dryRun?, removeSamples? }: with
// dryRun, what would be loaded and every refused row with its reason;
// otherwise the load itself, under the named (verified, when signed in)
// official, with the file's SHA-256, in the audit chain.
import { NextRequest, NextResponse } from 'next/server';
import { CASE_COLUMNS, MAX_ROWS, MAX_BYTES, importCases, listImports, sampleCount } from '@/lib/data/case-import';
import { readJson, TOO_LARGE, tooLargeAnswer } from '@/lib/net/body-limit';
import { getMinistry } from '@/lib/data/store';
import { withOfficial, refusal, readRefusal } from '@/lib/auth/official';
import { canReadInstitution, ministryPermission } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';

export async function GET(_r: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const refused = await readRefusal(s => canReadInstitution(s, params.id));
  if (refused) return refused;
  if (!getMinistry(params.id)) return NextResponse.json({ error: 'Ministry not found' }, { status: 404 });
  return NextResponse.json({ columns: CASE_COLUMNS, maxRows: MAX_ROWS, samples: sampleCount(params.id), imports: listImports(params.id) });
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const refused = await refusal(s => ministryPermission(s, params.id));
  if (refused) return refused;
  // Read with a byte cap (lib/net/body-limit.ts, review L-4): the CSV (MAX_BYTES) as a JSON string, escaping included.
  const body = await readJson(req, 2 * MAX_BYTES + 100_000);
  if (body === TOO_LARGE) return tooLargeAnswer(MAX_BYTES, 'The file');
  const b = (await withOfficial(body && typeof body === 'object' ? body : {})) as { csv?: string; fileName?: string; dryRun?: boolean; removeSamples?: boolean; by?: string };
  const r = importCases(params.id, b);
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'Ministry not found' ? 404 : 422 });
  return NextResponse.json(r, { status: b.dryRun ? 200 : 201 });
}
