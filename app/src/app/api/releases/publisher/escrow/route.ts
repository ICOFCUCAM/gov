// /api/releases/publisher/escrow — escrow deposits for every release and
// source-code audit requests across nations (GET); record or verify a
// deposit, and move an audit request forward (POST).
import { NextRequest, NextResponse } from 'next/server';
import { publisherAuthorized, unauthorized } from '@/lib/updates/access';
import { publisherOverview } from '@/lib/data/updates';
import { advanceReview, allDeposits, allReviews, recordDeposit, verifyDeposit, ESCROW_AGENT, DEPOSIT_WITHIN_DAYS } from '@/lib/data/supply-chain';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  const nations = Object.fromEntries(publisherOverview().nations.map(n => [n.id, n.name]));
  return NextResponse.json({ deposits: allDeposits(), reviews: allReviews(), nations, agent: ESCROW_AGENT, depositWithinDays: DEPOSIT_WITHIN_DAYS });
}

export async function POST(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  let b: { action?: string; releaseId?: string; id?: string; by?: string; note?: string; start?: string; end?: string; review?: string; findings?: Record<string, unknown> };
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const by = String(b.by ?? '');
  const out = b.action === 'deposit' ? recordDeposit(String(b.releaseId ?? ''), by)
    : b.action === 'verify' ? verifyDeposit(String(b.releaseId ?? ''), by)
    : b.action === 'review' ? advanceReview('publisher', null, String(b.id ?? ''), { action: b.review, by, note: b.note, start: b.start, end: b.end, findings: b.findings as never })
    : { error: 'action must be deposit, verify or review', status: 422 };
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ ok: true, result: out });
}
