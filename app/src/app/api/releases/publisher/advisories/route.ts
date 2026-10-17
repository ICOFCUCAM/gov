// /api/releases/publisher/advisories — every advisory with its patch-time
// commitment (met / open / breached) and each nation's status.
import { NextRequest, NextResponse } from 'next/server';
import { publisherAuthorized, unauthorized } from '@/lib/updates/access';
import { nationRecord, publisherOverview } from '@/lib/data/updates';
import { commitments, listAdvisories, PATCH_COMMITMENTS, statusFor } from '@/lib/data/advisories';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!await publisherAuthorized(req)) return unauthorized();
  const o = publisherOverview();
  const statuses = Object.fromEntries(listAdvisories().map(a => [a.id, Object.fromEntries(o.nations.map(n => [n.id, statusFor(nationRecord(n.id)!, a).status]))]));
  return NextResponse.json({ advisories: listAdvisories(), commitments: commitments(o.releases), policy: PATCH_COMMITMENTS, statuses, nations: o.nations.map(n => ({ id: n.id, name: n.name })) });
}
