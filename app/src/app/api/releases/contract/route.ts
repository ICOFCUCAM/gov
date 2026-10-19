// /api/releases/contract — this nation's contract: kind (from its hosting
// path), modules, seats, term, renewal, support tier and one billing view
// (platform and security-store invoices). POST: accept a proposed renewal
// or ask for a change, by a named official. Never automatic; audited.
import { NextRequest, NextResponse } from 'next/server';
import { nationFor, chamberBody } from '@/lib/updates/access';
import { getChamber } from '@/lib/data/updates';
import { contractFor, nationContractAction } from '@/lib/data/contracts';
import { tierPolicy, PRIORITY_MEANING } from '@/lib/data/support';
import { PATCH_COMMITMENTS } from '@/lib/data/advisories';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  const c = getChamber(n.id);
  const name = 'error' in c ? n.name : c.nation.name;
  return NextResponse.json({ contract: contractFor(n, name), tier: tierPolicy(n.id), priorities: PRIORITY_MEANING, patchCommitments: PATCH_COMMITMENTS });
}

export async function POST(req: NextRequest) {
  const body = await chamberBody<{ action?: string; by?: string; note?: string }>(req);
  if (body instanceof NextResponse) return body;
  const out = nationContractAction(body.nation, body.b);
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ ok: true });
}
