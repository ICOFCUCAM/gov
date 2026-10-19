// /api/releases/support — this nation's support tickets and contract tier
// (GET), and opening a ticket (POST). The nation is resolved on the server;
// a linked release or fallback incident must be this nation's own.
import { NextRequest, NextResponse } from 'next/server';
import { nationFor, chamberBody } from '@/lib/updates/access';
import { getChamber } from '@/lib/data/updates';
import { listTickets, openTicket, tierPolicy, PRIORITY_MEANING, SUPPORT_TIERS, type TicketInput } from '@/lib/data/support';

export const dynamic = 'force-dynamic';

function linkables(nationId: string) {
  const c = getChamber(nationId);
  if ('error' in c) return { releases: [], incidents: [] };
  return {
    releases: c.releases.map(r => ({ id: r.id, version: r.version, title: r.title })),
    incidents: c.incidents.map(i => ({ id: i.id, title: `Fallback ${i.fromVersion} → ${i.toVersion}` })),
  };
}

export function GET(req: NextRequest) {
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  return NextResponse.json({ tickets: listTickets(n.id), policy: tierPolicy(n.id), tiers: SUPPORT_TIERS, priorities: PRIORITY_MEANING, linkable: linkables(n.id) });
}

export async function POST(req: NextRequest) {
  const body = await chamberBody<Omit<TicketInput, 'link'> & { about?: { kind?: string; id?: string } }>(req);
  if (body instanceof NextResponse) return body;
  const { nation: n, b } = body;
  // `about` is the release or incident the ticket concerns (body `link` is the distribution link).
  if (b.about?.id) {
    const l = linkables(n.id);
    const ok = b.about.kind === 'release' ? l.releases.some(r => r.id === b.about!.id) : b.about.kind === 'incident' ? l.incidents.some(i => i.id === b.about!.id) : false;
    if (!ok) return NextResponse.json({ error: 'Link the ticket to one of your own releases or incidents' }, { status: 422 });
  }
  const out = openTicket(n.id, { ...b, link: b.about });
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ ticket: out }, { status: 201 });
}
