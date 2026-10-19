// The platform audit chain's verification, open to everyone (a transparency
// feature; the cover page shows it). Answered from the cached, incremental
// check (lib/data/store/audit.ts auditVerification, go-live review M-8):
// only entries appended since the last answer are hashed here; the whole
// chain is checked again off the request path. Limited per address
// (`publicRead`). A signed-in official may ask for the full check now with
// ?full=1; it runs in chunks that yield to other requests.
import { NextRequest, NextResponse } from 'next/server';
import { auditVerification, reverifyAuditChain } from '@/lib/data/store';
import { limit } from '@/lib/ops/rate-limit';
import { currentOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

/** @example response 200 {"ok":true,"checked":1204,"total":1204,"complete":true,"verifiedAt":"2026-10-19T09:30:00.000Z","fullCheckAt":"2026-10-19T09:25:00.000Z","signed":{"ok":true,"signedHeads":24}} */
export async function GET(req: NextRequest) {
  const limited = await limit(req, 'publicRead');
  if (limited) return limited;
  if (req.nextUrl.searchParams.get('full') === '1' && await currentOfficial().catch(() => null)) await reverifyAuditChain();
  return NextResponse.json(auditVerification());
}
