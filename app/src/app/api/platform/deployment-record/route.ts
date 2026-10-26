// /api/platform/deployment-record — the installation's deployment record
// (plan I9; specification Part 5 I; lib/ops/deployment-record.ts): recovery
// objectives, data residency, administrator access, network zones and exit
// terms, shipped empty.
//
// GET: the record in force (each part null until adopted), its version and
// the change waiting, with every earlier version. POST (administrators, under
// /api/platform):
//   { op: 'propose', recovery?, residency?, administratorAccess?, networkZones?, exit?, legalBasis: [{ instrument, eId }] }
//   { op: 'confirm' }   a different official confirms; in force from now
//   { op: 'withdraw', reason }
import { NextRequest, NextResponse } from 'next/server';
import { routeActor } from '@/lib/casework/actor';
import { dualControlPolicy } from '@/lib/casework/dual-control-policy';
import { deploymentRecord, deploymentRecordChanges, proposeDeploymentRecord, confirmDeploymentRecord, withdrawDeploymentRecord } from '@/lib/ops/deployment-record';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ record: deploymentRecord(), changes: deploymentRecordChanges() });
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const actor = await routeActor(b.by);
  const who = { name: actor.name, ...(actor.id ? { id: actor.id } : {}) };
  const dc = dualControlPolicy();
  const parts = Object.fromEntries(['recovery', 'residency', 'administratorAccess', 'networkZones', 'exit'].filter(k => k in b).map(k => [k, b[k]]));
  const r = b.op === 'propose' ? proposeDeploymentRecord(parts, b.legalBasis, who, new Date(), dc.pendingHours)
    : b.op === 'confirm' ? confirmDeploymentRecord(who, new Date(), dc.requireIdentityBinding)
    : b.op === 'withdraw' ? withdrawDeploymentRecord(actor.name, typeof b.reason === 'string' ? b.reason.slice(0, 500) : undefined)
    : { error: 'op is propose, confirm or withdraw' };
  if ('error' in r && r.error) return NextResponse.json({ error: r.error }, { status: /different official|second, different/.test(r.error) ? 403 : 422 });
  return NextResponse.json({ result: r, record: deploymentRecord(), changes: deploymentRecordChanges() });
}
