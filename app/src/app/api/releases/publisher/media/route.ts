// /api/releases/publisher/media — physical media for self-hosted and
// air-gapped nations: every shipment's chain of custody (GET); seal new
// media or hand it over to a named courier or official (POST).
import { NextRequest, NextResponse } from 'next/server';
import { publisherAuthorized, unauthorized } from '@/lib/updates/access';
import { publisherOverview } from '@/lib/data/updates';
import { custodyStep, listMedia, sealMedia, getMirror } from '@/lib/data/mirror';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  const nations = publisherOverview().nations.filter(n => n.deliveryMode !== 'saas').map(n => ({ id: n.id, name: n.name, deliveryMode: n.deliveryMode, mirror: getMirror(n.id) ?? null }));
  return NextResponse.json({ media: listMedia(null), nations });
}

export async function POST(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  let b: { action?: string; nationId?: string; releaseIds?: string[]; sealId?: string; by?: string; mediaId?: string; to?: string; note?: string };
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const out = b.action === 'seal' ? sealMedia(String(b.nationId ?? ''), b)
    : b.action === 'hand-over' ? custodyStep('publisher', null, String(b.mediaId ?? ''), { ...b, step: 'handed-over' })
    : { error: 'action must be seal or hand-over', status: 422 };
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ media: out });
}
