// /api/releases/[id]/whats-new — the release's summary and changes in this
// nation's language (English with "translation pending" when there is no
// translation yet), with its training and administrator-guide material.
import { NextRequest, NextResponse } from 'next/server';
import { nationFor } from '@/lib/updates/access';
import { releaseFor } from '@/lib/data/updates';
import { whatsNew } from '@/lib/data/comms';
import { nationLanguage } from '@/lib/updates/language';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  const r = releaseFor(n.id, params.id);
  if (!r) return NextResponse.json({ error: 'Release not found' }, { status: 404 });
  return NextResponse.json({ whatsNew: whatsNew(r, nationLanguage(n)) });
}
