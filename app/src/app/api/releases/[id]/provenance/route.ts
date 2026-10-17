// /api/releases/[id]/provenance — SLSA provenance for every artifact of a
// release this nation can see: builder, source commit, build time,
// materials and digest, with verification commands.
import { NextRequest, NextResponse } from 'next/server';
import { nationFor } from '@/lib/updates/access';
import { PUBLISHER_KEY } from '@/lib/data/updates';
import { releaseProvenance } from '@/lib/data/supply-chain';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  const provenance = releaseProvenance(n.id, params.id);
  if (!provenance) return NextResponse.json({ error: 'Release not found' }, { status: 404 });
  return NextResponse.json({ provenance, publisherKey: PUBLISHER_KEY, channelKey: n.channelKey });
}
