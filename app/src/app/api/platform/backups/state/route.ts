// /api/platform/backups/state — a fingerprint of this server's state: the
// SHA-256 of each store (or table) as a backup would hold it, the state
// digest and the audit chain head, with the chain verified. Hashes only,
// nothing of the state itself. The disaster recovery drill
// (scripts/dr-drill.mjs) compares a restored instance with the backup.
import { NextResponse } from 'next/server';
import { stateFingerprint } from '@/lib/data/backups';
import { verifyAuditChain } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const f = await stateFingerprint();
  const chain = verifyAuditChain();
  return NextResponse.json({ ...f, chain: { ok: chain.ok, checked: chain.checked, ...(chain.brokenAtSeq != null ? { brokenAtSeq: chain.brokenAtSeq } : {}) } });
}
