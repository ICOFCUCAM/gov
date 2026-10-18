// /api/releases/publisher/support/[ticketId] — the publisher works a ticket:
// reply, acknowledge, progress, wait on the nation, resolve, reprioritise.
import { NextRequest, NextResponse } from 'next/server';
import { publisherAuthorized, unauthorized } from '@/lib/updates/access';
import { ticketAction } from '@/lib/data/support';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { ticketId: string } }) {
  if (!await publisherAuthorized(req)) return unauthorized();
  let b: { action?: string; by?: string; text?: string; priority?: string };
  try { b = await withOfficial(await req.json()); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const out = ticketAction('publisher', null, params.ticketId, b);
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ ticket: out });
}
