// /api/platform/institution-import — bring an institution's own export into
// this installation with every record identifier unchanged (Health I4
// standalone-and-pilot; lib/portability/import.ts). ADMIN_ONLY (/api/platform),
// and both steps by administrators serving the whole government.
// GET: import proposals, newest first.
// POST { op: 'propose' (default), archive: <base64 of the .cvx file> }: the export is verified (every part, the
//   audit and access-log segments, every seal) and must hold nothing already here; it waits for a second official.
// POST { op: 'confirm', proposal }: a different administrator; every record goes in with its own id, number and
//   history, the evidence it carried is kept, one audit entry names both.
// POST { op: 'withdraw', proposal, reason? }.
import { NextRequest, NextResponse } from 'next/server';
import { routeActor } from '@/lib/casework/actor';
import { refusal } from '@/lib/auth/official';
import { installationAdmin } from '@/lib/auth/roles';
import { portabilityActorOf } from '@/lib/portability/export';
import { listImports, proposeImport, confirmImport, withdrawImport } from '@/lib/portability/import';

export const dynamic = 'force-dynamic';

export async function GET() {
  const refused = await refusal(installationAdmin);
  if (refused) return refused;
  return NextResponse.json({ imports: listImports() });
}

/** @example request {"op":"confirm","proposal":"IMP-20261021120000-a1b2c3"} */
export async function POST(req: NextRequest) {
  const refused = await refusal(installationAdmin);
  if (refused) return refused;
  const b = (await req.json().catch(() => ({}))) as { op?: string; archive?: unknown; proposal?: unknown; reason?: unknown; by?: unknown };
  const actor = portabilityActorOf(await routeActor(b.by));
  const op = b.op ?? 'propose';
  const out = (r: object) => ('error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ result: r, imports: listImports() }));
  if (op === 'propose') {
    if (typeof b.archive !== 'string' || !b.archive) return NextResponse.json({ error: 'Send the sealed export as base64 in archive' }, { status: 422 });
    return out(await proposeImport(Buffer.from(b.archive, 'base64'), actor));
  }
  const proposal = typeof b.proposal === 'string' ? b.proposal : '';
  if (op === 'confirm') return out(await confirmImport(proposal, actor));
  if (op === 'withdraw') return out(withdrawImport(proposal, actor, typeof b.reason === 'string' ? b.reason : undefined));
  return NextResponse.json({ error: 'op must be propose, confirm or withdraw' }, { status: 422 });
}
