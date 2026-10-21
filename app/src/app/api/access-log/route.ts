// /api/access-log — who read which restricted or secret record, searched,
// exported or was refused (lib/records/access-log.ts). Read by auditors and
// the data-protection authority's officials (canReadAccessLog()); nobody
// changes it through the API. With the chain's check and, for the
// data-protection authority, the unusual patterns of the last day. Reading
// the log is itself written to it (directions 15.5: oversight access is
// logged), as a search of register access-log.
import { NextRequest, NextResponse } from 'next/server';
import { readRefusal, caseScope } from '@/lib/auth/official';
import { canReadAccessLog } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { listAccess, verifyAccessLog, unusualAccess, recordAccess, type AccessAction } from '@/lib/records/access-log';
import { retentionChanges } from '@/lib/data/retention';
import { raisedFindings } from '@/lib/records/access-watch';

export const dynamic = 'force-dynamic';

const ACTIONS: AccessAction[] = ['view', 'search', 'export', 'refused', 'permission'];

export async function GET(req: NextRequest) {
  const refused = await readRefusal(s => canReadAccessLog(s, authorityFor('dataProtection')));
  if (refused) return refused;
  const q = req.nextUrl.searchParams;
  const action = q.get('action');
  const entries = listAccess({
    register: q.get('register') ?? undefined,
    recordId: q.get('record') ?? undefined,
    by: q.get('by') ?? undefined,
    institution: q.get('institution') ?? undefined,
    action: action && (ACTIONS as string[]).includes(action) ? (action as AccessAction) : undefined,
    since: q.get('since') ?? undefined,
    limit: Number(q.get('limit')) || undefined,
  });
  const s = await caseScope();
  if (s) recordAccess({ by: { id: s.id, name: s.label, ...(s.institution ? { institution: s.institution } : {}) }, record: { register: 'access-log', query: q.toString() || '(latest)' }, action: 'search', result: 'allowed', rule: 'oversight read' });
  const day = new Date(Date.now() - 86_400_000).toISOString();
  // Rules to shorten this log, waiting for the oversight side (POST /api/access-log/retention).
  const awaiting = retentionChanges().filter(c => c.state === 'awaiting-oversight').map(c => ({ id: c.id, rule: c.rule, reason: c.reason, proposedBy: c.proposedBy, confirmedBy: c.decidedBy }));
  return NextResponse.json({ entries, chain: verifyAccessLog(), unusual: unusualAccess(day), raised: raisedFindings(), awaiting });
}
