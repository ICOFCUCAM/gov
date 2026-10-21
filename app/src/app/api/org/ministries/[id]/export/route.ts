// /api/org/ministries/{id}/export — one institution's portable export (Health
// I4 standalone-and-pilot; lib/portability/export.ts): its own registers,
// cases, sealed decisions, documents and its audit and access-log entries,
// sealed through key custody like a backup and verifiable offline
// (app/scripts/verify-institution-export.mjs).
// GET: its export proposals and exports, newest first.
// POST (officials whose scope reaches the institution; MINISTRY rule in lib/auth/roles.ts, checked again here):
//   { op: 'propose' (default), reason }           an administrator of the institution (the whole government's
//                                                 only when it is not independent: exportProposeRefusal());
//   { op: 'confirm', proposal }                   a different official who can sign there (exportConfirmRefusal(),
//                                                 dualControlRefusal()): the export is made, written to the backup
//                                                 target, logged in the access log and the audit chain;
//   { op: 'withdraw', proposal, reason? }.
import { NextRequest, NextResponse } from 'next/server';
import { routeActor } from '@/lib/casework/actor';
import { getMinistry } from '@/lib/data/store';
import { readRefusal } from '@/lib/auth/official';
import { ministryPermission } from '@/lib/auth/roles';
import { listExports, proposeExport, confirmExport, withdrawExport, portabilityActorOf } from '@/lib/portability/export';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!getMinistry(id)) return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
  const refused = await readRefusal(s => ministryPermission(s, id));
  if (refused) return refused;
  return NextResponse.json({ institution: id, exports: listExports(id) });
}

/** @example request {"op":"propose","reason":"Moving to the regulator's own host"} */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!getMinistry(id)) return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { op?: string; reason?: unknown; proposal?: unknown; by?: unknown };
  const actor = portabilityActorOf(await routeActor(b.by));
  const op = b.op ?? 'propose';
  const proposal = typeof b.proposal === 'string' ? b.proposal : '';
  const out = (r: object) => ('error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ result: r, exports: listExports(id) }));
  if (op === 'propose') return out(proposeExport({ institution: id, reason: b.reason }, actor));
  if (op === 'confirm' || op === 'withdraw') {
    const mine = listExports(id).find(p => p.id === proposal);
    if (!mine) return NextResponse.json({ error: 'No such export proposal for this institution' }, { status: 404 });
    if (op === 'confirm') return out(await confirmExport(proposal, actor));
    return out(withdrawExport(proposal, actor, typeof b.reason === 'string' ? b.reason : undefined));
  }
  return NextResponse.json({ error: 'op must be propose, confirm or withdraw' }, { status: 422 });
}
