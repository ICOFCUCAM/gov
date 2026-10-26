// /api/exchange/events — federation events of this installation's
// institutions (plan I9, lib/federation/events.ts). GET: the envelopes they
// published and the envelopes they received (accepted, rejected, pending),
// an institution's officials seeing their own, the whole government's every
// institution's; the trusted keys and the event catalogue. POST
// { op: 'publish', type, aggregate, legal: { instrument_reference,
// version_reference }, payloadReference?, correlationId? }: an official
// publishes an envelope about their own institution's record, signed with its
// key (references only, no free text). { op: 'decide', id, outcome:
// 'accept' | 'reject', reason }: an official who can sign at the receiving
// institution decides a pending envelope. Who acted comes from the sign-in.
import { NextRequest, NextResponse } from 'next/server';
import { routeActor } from '@/lib/casework/actor';
import { listPublished, listInbound, listPeers, publishEvent, decidePending } from '@/lib/federation/events';
import { EVENT_CATALOGUE, type LegalContext } from '@/lib/federation/envelope';
import { listMinistries } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await routeActor();
  const own = actor.scope?.institution;
  const names = Object.fromEntries(listMinistries().map(m => [m.id, m.name]));
  return NextResponse.json({
    scope: own ? { institution: own, name: names[own] ?? own } : { institution: null, name: 'The whole government' },
    catalogue: EVENT_CATALOGUE,
    published: listPublished(own),
    inbound: listInbound(own).map(({ envelope: _e, ...r }) => { void _e; return r; }),
    peers: listPeers().map(({ publicKeyPem: _p, ...p }) => { void _p; return p; }),
    names,
  });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { op?: string; id?: unknown; outcome?: unknown; reason?: unknown; type?: unknown; source?: unknown; aggregate?: unknown; legal?: unknown; payloadReference?: unknown; correlationId?: unknown; by?: string };
  const actor = await routeActor(b.by);
  const who = { by: actor.name, ...(actor.id ? { byId: actor.id } : {}), ...(actor.institution ? { institution: actor.institution } : {}), ...(actor.scope?.role ? { role: actor.scope.role } : {}) };
  if (b.op === 'decide') {
    const r = decidePending(String(b.id ?? ''), { outcome: b.outcome, reason: b.reason }, who);
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ record: r });
  }
  if (b.op !== 'publish') return NextResponse.json({ error: "op is 'publish' or 'decide'" }, { status: 422 });
  // The source is the official's own institution; without a sign-in (a demonstration) the one named.
  const source = actor.institution ?? (actor.scope ? '' : String(b.source ?? ''));
  if (!source) return NextResponse.json({ error: 'An institution publishes events about its own records: sign in as one of its officials' }, { status: 403 });
  const l = (b.legal ?? {}) as Partial<LegalContext>;
  const r = await publishEvent({
    type: String(b.type ?? ''), source, aggregate: String(b.aggregate ?? ''),
    legal: { instrument_reference: String(l.instrument_reference ?? ''), version_reference: String(l.version_reference ?? '') },
    ...(typeof b.payloadReference === 'string' && b.payloadReference ? { payloadReference: b.payloadReference } : {}),
    ...(typeof b.correlationId === 'string' && b.correlationId ? { correlationId: b.correlationId } : {}),
  }, who);
  return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ published: r }, { status: 201 });
}
