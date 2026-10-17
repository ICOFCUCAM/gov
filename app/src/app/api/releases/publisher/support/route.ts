// /api/releases/publisher/support — the publisher's support queue across
// nations (most urgent first), service incidents, and each nation's tier.
import { NextRequest, NextResponse } from 'next/server';
import { publisherAuthorized, unauthorized } from '@/lib/updates/access';
import { publisherOverview } from '@/lib/data/updates';
import { allTickets, listServiceIncidents, supportTier, setSupportTier, SUPPORT_TIERS, SERVICE_COMPONENTS, declareServiceIncident, updateServiceIncident } from '@/lib/data/support';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  const nations = publisherOverview().nations.map(n => ({ id: n.id, name: n.name, tier: supportTier(n.id), deliveryMode: n.deliveryMode }));
  const name = Object.fromEntries(nations.map(n => [n.id, n.name]));
  return NextResponse.json({
    tickets: allTickets().map(t => ({ ...t, nationName: name[t.nationId] ?? t.nationId })),
    service: listServiceIncidents(), nations, tiers: SUPPORT_TIERS, components: SERVICE_COMPONENTS,
  });
}

/** action: set-tier | declare | update-service */
export async function POST(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  let b: { action?: string; nationId?: string; tier?: string; by?: string; id?: string; state?: string; text?: string; title?: string; impact?: string; components?: string[]; nations?: 'all' | string[]; start?: string; end?: string };
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const known = new Set(publisherOverview().nations.map(n => n.id));
  if (b.action === 'set-tier') {
    if (!b.nationId || !known.has(b.nationId)) return NextResponse.json({ error: 'Choose an enrolled nation' }, { status: 422 });
    const out = setSupportTier(b.nationId, String(b.tier ?? ''), String(b.by ?? ''));
    return 'error' in out ? NextResponse.json({ error: out.error }, { status: out.status }) : NextResponse.json({ policy: out });
  }
  if (b.action === 'declare') {
    if (Array.isArray(b.nations) && b.nations.some(id => !known.has(id))) return NextResponse.json({ error: 'Unknown nation in the list' }, { status: 422 });
    const out = declareServiceIncident(b);
    return 'error' in out ? NextResponse.json({ error: out.error }, { status: out.status }) : NextResponse.json({ incident: out }, { status: 201 });
  }
  if (b.action === 'update-service') {
    const out = updateServiceIncident(String(b.id ?? ''), b);
    return 'error' in out ? NextResponse.json({ error: out.error }, { status: out.status }) : NextResponse.json({ incident: out });
  }
  return NextResponse.json({ error: 'action must be set-tier, declare or update-service' }, { status: 422 });
}
