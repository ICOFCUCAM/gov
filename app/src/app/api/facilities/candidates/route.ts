// Open-data candidates for the national facility register (map plan 4c).
// GET: the datasets loaded and the candidates (?state=open|confirmed|linked|
// rejected|all, ?source=, ?category=). POST { name, publisher, licence,
// url? | text?, format?, category? }: load a dataset as candidates (fetched by
// the server from that address only, or uploaded); nothing is published from
// it — each candidate waits for an official (/api/facilities/candidates/{id}).
import { NextRequest, NextResponse } from 'next/server';
import { listCandidates, listOpenSources, loadOpenSource, type Candidate } from '@/lib/data/facilities';
import { withOfficial } from '@/lib/auth/official';
export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const state = q.get('state');
  return NextResponse.json({
    sources: listOpenSources(),
    candidates: listCandidates({ state: (['open', 'confirmed', 'linked', 'rejected', 'all'].includes(state ?? '') ? state : 'open') as Candidate['state'] | 'all', sourceId: q.get('source') ?? undefined, category: q.get('category') ?? undefined }),
  });
}

export async function POST(req: NextRequest) {
  const b = (await withOfficial(await req.json().catch(() => ({})))) as Parameters<typeof loadOpenSource>[0] & { by?: string };
  if (typeof b.text === 'string' && b.text.length > 10_000_000) return NextResponse.json({ error: 'The file is larger than 10 MB' }, { status: 413 });
  const r = await loadOpenSource(b, b.by ?? '');
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ source: r }, { status: 201 });
}
