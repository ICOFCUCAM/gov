// /api/releases/[id] — one release, only if this nation may see it.
import { NextRequest, NextResponse } from 'next/server';
import { getChamber, getChamberRelease, superviseProbations } from '@/lib/data/updates';
import { nationFor } from '@/lib/updates/access';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  superviseProbations();
  const release = getChamberRelease(n.id, params.id);
  if (!release) return NextResponse.json({ error: 'Release not found' }, { status: 404 });
  const chamber = getChamber(n.id);
  if ('error' in chamber) return NextResponse.json(chamber, { status: 404 });
  return NextResponse.json({ release, chamber });
}
