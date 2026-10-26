// /api/audit/key-reviews — independent review of key-management and
// privileged operations (plan I9; acceptance P5-12, P6-07; lib/keys/key-review.ts).
//
// GET: the key operations in the audit chain (each with the review that
// covered it), the reviews recorded and what waits for review. POST
// { outcome: 'no-concerns' | 'concerns', findings, through? }: record a review
// of every key operation not yet reviewed (up to `through`, the head by
// default). Both only for an auditor or an official of the data-protection
// authority (canReadAuditChain()), never one who took an operation reviewed;
// every read is written to the access log, the review to the audit chain.
// Listed in ANY_ROLE (lib/auth/roles.ts) because the reviewer is an auditor,
// whom the general rule keeps from changing records; this route decides.
import { NextRequest, NextResponse } from 'next/server';
import { readRefusal, caseScope } from '@/lib/auth/official';
import { canReadAuditChain } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { recordSearch } from '@/lib/records/access-search';
import { routeActor } from '@/lib/casework/actor';
import { keyOperations, keyReviews, keyReviewStatus, recordKeyReview, reviewerRefusal } from '@/lib/keys/key-review';
import { installationMode } from '@/lib/ops/mode';

export const dynamic = 'force-dynamic';

export async function GET() {
  const refused = await readRefusal(s => canReadAuditChain(s, authorityFor('dataProtection')), { register: 'audit', id: 'key-reviews' });
  if (refused) return refused;
  const s = await caseScope();
  if (!s && installationMode() === 'production') return NextResponse.json({ error: 'Sign in: key operations are read by an auditor or the data-protection authority' }, { status: 401 });
  const operations = keyOperations();
  if (s) recordSearch(s, 'audit', 'key operations', operations.length, 'oversight read (canReadAuditChain)');
  return NextResponse.json({ status: keyReviewStatus(), operations, reviews: keyReviews() });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = await caseScope();
  const who = await routeActor(b.by);
  const reviewer = { by: who.name, ...(who.id ? { byId: who.id } : {}), scope: s, dataProtection: authorityFor('dataProtection') };
  const why = reviewerRefusal(reviewer);
  if (why) return NextResponse.json({ error: why }, { status: 403 });
  const r = recordKeyReview(b, reviewer);
  return 'error' in r ? NextResponse.json({ error: r.error }, { status: r.status }) : NextResponse.json({ review: r });
}
