// /api/releases/mirror — this nation's local mirror, its sync manifest (what
// to fetch, with deltas) and physical media in transit (GET; download=1
// returns the manifest as a file). POST: register the mirror, record a sync,
// or take a custody step on received media (received, seal-verified).
import { NextRequest, NextResponse } from 'next/server';
import { nationFor, chamberBody } from '@/lib/updates/access';
import { custodyStep, getMirror, listMedia, recordSync, registerMirror, syncManifest } from '@/lib/data/mirror';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const u = new URL(req.url);
  const n = nationFor(u.searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  const manifest = n.deliveryMode === 'saas' ? null : syncManifest(n.id);
  if (u.searchParams.get('download')) {
    if (!manifest || 'error' in manifest) return NextResponse.json({ error: 'No mirror for a hosted nation' }, { status: 409 });
    return new NextResponse(JSON.stringify(manifest, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': 'attachment; filename="sync-manifest.json"', 'cache-control': 'no-store' } });
  }
  return NextResponse.json({ deliveryMode: n.deliveryMode, mirror: getMirror(n.id) ?? null, manifest: manifest && !('error' in manifest) ? manifest : null, media: listMedia(n.id) });
}

export async function POST(req: NextRequest) {
  const body = await chamberBody<{ action?: string; registryUrl?: string; kind?: string; by?: string; releaseIds?: string[]; mediaId?: string; step?: string; sealId?: string; note?: string }>(req);
  if (body instanceof NextResponse) return body;
  const { nation: n, b } = body;
  const out = b.action === 'register' ? registerMirror(n.id, b)
    : b.action === 'sync' ? recordSync(n.id, b)
    : b.action === 'custody' ? custodyStep('nation', n.id, String(b.mediaId ?? ''), b)
    : { error: 'action must be register, sync or custody', status: 422 };
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ ok: true, result: out });
}
