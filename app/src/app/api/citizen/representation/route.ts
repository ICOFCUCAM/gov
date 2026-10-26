// /api/citizen/representation — representations a person grants and revokes
// themselves (plan step I13; forms catalogue Part 13 §5.3, GOV-SVC-014). The
// route checks the citizen itself (SELF_AUTHENTICATED): signed in through the
// nation's identity service, or the demo citizen in training and
// demonstration installations (lib/auth/citizen.ts currentCitizen()).
// GET: what they granted and what they were granted, and the catalogue
// services that allow a representative. POST { op: 'grant', agent: { sub,
// name }, services, actions, validFrom?, validUntil?, basis?, restrictions? }
// or { op: 'revoke', id, reason }: only the person who granted it revokes it.
// Kept in the delegations register; every change audited without names.
import { NextRequest, NextResponse } from 'next/server';
import { currentCitizen } from '@/lib/auth/citizen';
import { grantRepresentation, revokeRepresentation, representationsOf, REPRESENTATION_ACTIONS, ACTION_LABEL } from '@/lib/frontdoor/representation';
import { publicCatalogue } from '@/lib/frontdoor/catalogue';

export const dynamic = 'force-dynamic';

export async function GET() {
  const c = await currentCitizen();
  if (!c) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const me = { sub: c.sub, name: c.name, demo: c.demo === true };
  return NextResponse.json({
    ...representationsOf(me),
    actions: REPRESENTATION_ACTIONS.map(k => ({ key: k, label: ACTION_LABEL[k] })),
    services: publicCatalogue().filter(s => s.representatives && (s.status === 'active' || s.status === 'pilot')).map(s => ({ id: s.id, name: s.name, owner: s.owner })),
  });
}

export async function POST(req: NextRequest) {
  const c = await currentCitizen();
  if (!c) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const me = { sub: c.sub, name: c.name, demo: c.demo === true };
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (b.op === 'grant') {
    const r = grantRepresentation(me, { agent: b.agent as { sub?: unknown; name?: unknown }, services: b.services, actions: b.actions, validFrom: b.validFrom, validUntil: b.validUntil, basis: b.basis, restrictions: b.restrictions });
    return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ representation: r }, { status: 201 });
  }
  if (b.op === 'revoke') {
    const r = revokeRepresentation(me, b.id, b.reason);
    return 'error' in r ? NextResponse.json(r, { status: 403 }) : NextResponse.json({ representation: r });
  }
  return NextResponse.json({ error: 'op is grant or revoke' }, { status: 400 });
}
