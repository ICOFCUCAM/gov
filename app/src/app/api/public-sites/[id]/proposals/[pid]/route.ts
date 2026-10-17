import { NextRequest, NextResponse } from 'next/server';
import { decideProposal } from '@/lib/data/site-editorial';

export const dynamic = 'force-dynamic';

/** Publish (a second, different official), reject (with a reason) or withdraw (the proposer) a proposal. */
export async function POST(req: NextRequest, { params }: { params: { id: string; pid: string } }) {
  const b = (await req.json().catch(() => ({}))) as { action?: string; by?: string; reason?: string };
  if (b.action !== 'publish' && b.action !== 'reject' && b.action !== 'withdraw') return NextResponse.json({ error: 'action must be publish, reject or withdraw' }, { status: 422 });
  const r = decideProposal(params.id, params.pid, b.action, b.by ?? '', b.reason);
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'Proposal not found' ? 404 : 422 });
  return NextResponse.json({ editorial: r });
}
