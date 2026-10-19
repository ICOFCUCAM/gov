// The public key a connected case system signs its requests with (RFC 9421,
// Ed25519). GET shows it (or none). POST { publicKey, keyId? } registers or
// replaces it: from then on, unsigned or badly signed requests from that
// system are refused. DELETE removes it (the bearer key alone works again).
// Officials who manage the institution's feeds only; audited.
import { NextRequest, NextResponse } from 'next/server';
import { listFeeds } from '@/lib/data/case-import';
import { feedSigningKey, registerFeedKey, removeFeedKey } from '@/lib/exchange/feed-keys';
import { withOfficial, refusal } from '@/lib/auth/official';
import { canManageFeeds } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';

type P = { params: { id: string; feedId: string } };
const known = (p: P['params']) => listFeeds(p.id).some(f => f.id === p.feedId);
const notFound = () => NextResponse.json({ error: 'No such connected system' }, { status: 404 });

export function GET(_r: NextRequest, { params }: P) {
  if (!known(params)) return notFound();
  const key = feedSigningKey('case', params.feedId);
  return NextResponse.json({ key: key ? { keyId: key.keyId, publicKey: key.publicKeyPem, registeredAt: key.registeredAt, registeredBy: key.registeredBy } : null });
}

export async function POST(req: NextRequest, { params }: P) {
  const refused = await refusal(s => canManageFeeds(s, params.id));
  if (refused) return refused;
  if (!known(params)) return notFound();
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { publicKey?: string; keyId?: string; by?: string };
  const r = registerFeedKey('case', params.id, params.feedId, b);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ key: { keyId: r.keyId, registeredAt: r.registeredAt, registeredBy: r.registeredBy } }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: P) {
  const refused = await refusal(s => canManageFeeds(s, params.id));
  if (refused) return refused;
  if (!known(params)) return notFound();
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string };
  const r = removeFeedKey('case', params.feedId, b.by);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json(r);
}
