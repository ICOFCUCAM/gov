// POST /api/integrations/<id>/approve — approving an outside caller takes two
// officials (lib/data/store/federation.ts). { op: 'propose', scopes?,
// purposes?, note? } (the default op): one administrator proposes the
// integration's scopes and, per exchange service it may call
// (scope service:<id>), the purposes it may state, e.g.
// { "person.verify": ["identity-card-enrolment"] }; a change to an approved
// integration's scopes or purposes is proposed the same way.
// { op: 'confirm' }: a different official confirms the waiting proposal
// (dual control on verified sessions); it lapses after the country's
// dual-control waiting period. { op: 'withdraw' }: withdraws a waiting
// proposal. Who acted comes from the sign-in, never the request; audited.
// A proposal cites the law that permits the sharing (legalBasis:
// [{ instrument, eId }] from the laws register; required in production), and
// in production an official of every institution that owns a service the
// terms open confirms it (the owners are worked out here from the directory
// and the deployment profile, never taken from the request).
import { NextRequest, NextResponse } from 'next/server';
import { proposeIntegrationApproval, confirmIntegrationApproval, withdrawIntegrationApproval } from '@/lib/data/store';
import { routeActor } from '@/lib/casework/actor';
import { SERVICES } from '@/lib/exchange/services';
import { ownerInstitution } from '@/lib/casework/packages';
import { authorityFor } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const b = (await req.json().catch(() => ({}))) as { op?: string; scopes?: unknown; purposes?: unknown; note?: unknown; legalBasis?: unknown; by?: string };
  const actor = await routeActor(b.by);
  const out = (r: Awaited<ReturnType<typeof confirmIntegrationApproval>>) =>
    'error' in r ? NextResponse.json(r, { status: r.error === 'Integration not found' ? 404 : 422 }) : NextResponse.json({ integration: r });
  if (b.op === 'confirm') return out(confirmIntegrationApproval(id, actor.name, actor.id, new Date(), actor.scope?.institution));
  if (b.op === 'withdraw') return out(withdrawIntegrationApproval(id, actor.name));
  if (b.op !== undefined && b.op !== 'propose') return NextResponse.json({ error: "op is 'propose', 'confirm' or 'withdraw'" }, { status: 422 });
  // Purposes are named only for query services the directory offers.
  if (b.purposes && typeof b.purposes === 'object' && !Array.isArray(b.purposes)) {
    const unknown = Object.keys(b.purposes).filter(k => !SERVICES.some(s => s.id === k && s.kind === 'query'));
    if (unknown.length) return NextResponse.json({ error: `No such query service: ${unknown.join(', ')}` }, { status: 422 });
  }
  // The institutions that own the services these terms open: each must agree (production).
  const scopes = Array.isArray(b.scopes) ? b.scopes.map(String) : Object.keys((b.purposes && typeof b.purposes === 'object' ? b.purposes : {}) as object).map(k => `service:${k}`);
  const owners = [...new Set(scopes.filter(x => x.startsWith('service:')).map(x => SERVICES.find(s => s.id === x.slice('service:'.length))?.owner).filter((o): o is NonNullable<typeof o> => !!o).map(o => ownerInstitution(o, authorityFor)).filter((x): x is string => !!x))];
  const r = proposeIntegrationApproval(id, { scopes: b.scopes, purposes: b.purposes, note: b.note, legalBasis: b.legalBasis, owners }, actor.name, actor.id);
  if ('error' in r) return out(r);
  return NextResponse.json({ integration: r, note: 'Proposed: a different official confirms it before it takes effect.' }, { status: 202 });
}
