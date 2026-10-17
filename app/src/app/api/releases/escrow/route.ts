// /api/releases/escrow — this nation's escrow agreement, the deposit status
// of every release it can see, and its source-code audit requests (GET);
// request or withdraw a source-code audit (POST).
import { NextRequest, NextResponse } from 'next/server';
import { nationFor, chamberBody } from '@/lib/updates/access';
import { ENVIRONMENTS, advanceReview, escrowAgreement, escrowStatus, listReviews, requestReview } from '@/lib/data/supply-chain';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  return NextResponse.json({ agreement: escrowAgreement(n.id), status: escrowStatus(n.id), reviews: listReviews(n.id), environments: ENVIRONMENTS });
}

export async function POST(req: NextRequest) {
  const body = await chamberBody<{ action?: string; id?: string; by?: string; note?: string; releaseId?: string; auditor?: string; auditorKind?: string; scope?: string; purpose?: string; environment?: string; ndaAccepted?: boolean }>(req);
  if (body instanceof NextResponse) return body;
  const { nation: n, b } = body;
  const out = b.action === 'request-review' ? requestReview(n.id, b)
    : b.action === 'withdraw-review' ? advanceReview('nation', n.id, String(b.id ?? ''), { action: 'withdraw', by: b.by, note: b.note })
    : { error: 'action must be request-review or withdraw-review', status: 422 };
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ review: out }, { status: b.action === 'request-review' ? 201 : 200 });
}
