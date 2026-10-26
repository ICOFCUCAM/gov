// /api/releases/mirror — this nation's local mirror, its sync manifest (what
// to fetch, with deltas) and physical media in transit (GET; download=1
// returns the manifest as a file). POST: register the mirror, record a sync,
// or take a custody step on received media (received, seal-verified,
// contents-verified).
//
// Plan I9 (acceptance P5-15), signed releases and verified media:
//   GET ?statement=<releaseId>   the publisher's signed statement of a release (DSSE, in-toto), as a file
//   GET ?media=<mediaId>         the signed statement written to a shipment of media (media-manifest.intoto.json)
//   POST { action: 'trust-key', publicKeyPem, checkedWith }   one official proposes trusting a publisher key
//   POST { action: 'confirm-key', id }                         a different official confirms it
//   POST { action: 'revoke-key', id, reason }                  one official withdraws or revokes it at once
//   POST { action: 'verify-release', releaseId, envelope, files: [{ filename, sha256 }] }
//   POST { action: 'custody', mediaId, step: 'contents-verified', envelope, files: [{ filename, sha256 }] }
import { NextRequest, NextResponse } from 'next/server';
import { nationFor, chamberBody } from '@/lib/updates/access';
import { custodyStep, getMirror, listMedia, recordSync, registerMirror, syncManifest, signedRelease, verifyRelease, mediaManifestFile } from '@/lib/data/mirror';
import { publisherKeys, proposePublisherKey, confirmPublisherKey, revokePublisherKey } from '@/lib/data/release-trust';
import { routeActor } from '@/lib/casework/actor';

export const dynamic = 'force-dynamic';

const file = (name: string, v: unknown) => new NextResponse(JSON.stringify(v, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="${name}"`, 'cache-control': 'no-store' } });

export function GET(req: NextRequest) {
  const u = new URL(req.url);
  const n = nationFor(u.searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  const statement = u.searchParams.get('statement');
  if (statement) {
    const s = signedRelease(n.id, statement);
    return s ? file(`${statement}.release.intoto.json`, s.envelope) : NextResponse.json({ error: 'Release not found' }, { status: 404 });
  }
  const media = u.searchParams.get('media');
  if (media) {
    const m = mediaManifestFile(n.id, media);
    return m ? file(m.filename, m.envelope) : NextResponse.json({ error: 'No signed statement for that media' }, { status: 404 });
  }
  const manifest = n.deliveryMode === 'saas' ? null : syncManifest(n.id);
  if (u.searchParams.get('download')) {
    if (!manifest || 'error' in manifest) return NextResponse.json({ error: 'No mirror for a hosted nation' }, { status: 409 });
    return file('sync-manifest.json', manifest);
  }
  return NextResponse.json({ deliveryMode: n.deliveryMode, mirror: getMirror(n.id) ?? null, manifest: manifest && !('error' in manifest) ? manifest : null, media: listMedia(n.id), publisherKeys: publisherKeys(n.id) });
}

export async function POST(req: NextRequest) {
  const body = await chamberBody<{ action?: string; registryUrl?: string; kind?: string; by?: string; releaseIds?: string[]; releaseId?: string; mediaId?: string; step?: string; sealId?: string; note?: string; id?: string; reason?: string; publicKeyPem?: string; checkedWith?: string; envelope?: unknown; files?: unknown }>(req);
  if (body instanceof NextResponse) return body;
  const { nation: n, b } = body;
  const who = await routeActor(b.by);
  const actor = { by: who.name, ...(who.id ? { byId: who.id } : {}) };
  const out = b.action === 'register' ? registerMirror(n.id, b)
    : b.action === 'sync' ? recordSync(n.id, b)
    : b.action === 'custody' ? custodyStep('nation', n.id, String(b.mediaId ?? ''), b)
    : b.action === 'trust-key' ? proposePublisherKey(n.id, b, actor)
    : b.action === 'confirm-key' ? confirmPublisherKey(n.id, String(b.id ?? ''), actor)
    : b.action === 'revoke-key' ? revokePublisherKey(n.id, String(b.id ?? ''), b.reason, actor)
    : b.action === 'verify-release' ? verifyRelease(n.id, String(b.releaseId ?? ''), b)
    : { error: 'action must be register, sync, custody, trust-key, confirm-key, revoke-key or verify-release', status: 422 };
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ ok: true, result: out });
}
