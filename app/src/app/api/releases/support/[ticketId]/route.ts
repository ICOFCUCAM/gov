// /api/releases/support/[ticketId] — the nation works one of its own
// tickets: reply, close once resolved, or reopen.
import { NextRequest, NextResponse } from 'next/server';
import { nationFor, chamberBody } from '@/lib/updates/access';
import { getTicket, ticketAction } from '@/lib/data/support';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ ticketId: string }> }) {
  const params = await props.params;
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  const t = getTicket(n.id, params.ticketId);
  return t ? NextResponse.json({ ticket: t }) : NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
}

export async function POST(req: NextRequest, props: { params: Promise<{ ticketId: string }> }) {
  const params = await props.params;
  const body = await chamberBody<{ action?: string; by?: string; text?: string; filename?: string; sizeBytes?: number }>(req);
  if (body instanceof NextResponse) return body;
  const out = ticketAction('nation', body.nation.id, params.ticketId, body.b);
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ ticket: out });
}
