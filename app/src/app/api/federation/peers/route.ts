// /api/federation/peers — the keys this installation trusts for other
// installations' institutions (plan I9, lib/federation/events.ts). GET lists
// them. POST { op: 'propose', institution, publicKeyPem, endpoint?, note? }:
// one administrator proposes trusting an institution's public key (the
// institution named by its stable id in the register); { op: 'confirm', id }:
// a different official confirms it (dual control on verified sessions);
// { op: 'revoke', id, reason }: one official withdraws a proposal or revokes a
// trusted key at once. Who acted comes from the sign-in; audited.
import { NextRequest, NextResponse } from 'next/server';
import { routeActor } from '@/lib/casework/actor';
import { listPeers, proposePeerKey, confirmPeerKey, revokePeerKey } from '@/lib/federation/events';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ peers: listPeers() });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { op?: string; id?: unknown; institution?: unknown; publicKeyPem?: unknown; endpoint?: unknown; note?: unknown; reason?: unknown; by?: string };
  const actor = await routeActor(b.by);
  const who = { by: actor.name, ...(actor.id ? { byId: actor.id } : {}), ...(actor.institution ? { institution: actor.institution } : {}) };
  const out = (r: ReturnType<typeof confirmPeerKey>, status = 200) => ('error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ peer: r }, { status }));
  if (b.op === 'confirm') return out(confirmPeerKey(String(b.id ?? ''), who));
  if (b.op === 'revoke') return out(revokePeerKey(String(b.id ?? ''), typeof b.reason === 'string' ? b.reason : '', who));
  if (b.op !== undefined && b.op !== 'propose') return NextResponse.json({ error: "op is 'propose', 'confirm' or 'revoke'" }, { status: 422 });
  return out(proposePeerKey(b, who), 202);
}
