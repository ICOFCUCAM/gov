// /api/releases/[id]/restore-data — restore the data snapshot taken before
// this release was installed. The last resort, never automatic: a named
// person, the software already back on the snapshot's version, and an
// explicit acknowledgement that everything written since is lost.
//
// A restore point that is a real backup (lib/data/backups.ts) is restored
// four-eyes: an administrator proposes it (202, with the loss warning), a
// second, different official confirms it; the current state is backed up
// first and the restore is recorded in the audit chain and the chamber.
import { NextRequest, NextResponse } from 'next/server';
import { restoreData, restoreDataCheck } from '@/lib/data/updates';
import { requestRestore, pendingRestore } from '@/lib/data/backups';
import { chamberBody } from '@/lib/updates/access';
import { refusal } from '@/lib/auth/official';
import { adminOnly } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const r = await chamberBody<{ by?: string; acknowledgeLoss?: boolean }>(req);
  if (r instanceof NextResponse) return r;
  const by = typeof r.b.by === 'string' ? r.b.by : undefined;
  const check = restoreDataCheck(r.nation.id, params.id, { by, acknowledgeLoss: r.b.acknowledgeLoss === true });
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status });
  const rp = check.restorePoint;
  if (rp.backupId) {
    // The proposal needs an administrator; the confirmation a second, different official.
    if (!pendingRestore(rp.backupId)) { const denied = await refusal(adminOnly); if (denied) return denied; }
    const res = await requestRestore(rp.backupId, { by, acknowledgeLoss: true, origin: { kind: 'update-center', nationId: r.nation.id, releaseId: params.id } });
    if ('error' in res) return NextResponse.json({ error: res.error }, { status: res.status });
    if (res.pending) return NextResponse.json(res, { status: 202 });
    const done = restoreData(r.nation.id, params.id, { by, acknowledgeLoss: true, restoredFrom: { backupId: rp.backupId, proposedBy: res.restore.proposedBy, auditSeq: res.restore.auditSeq } });
    if ('error' in done) return NextResponse.json({ error: done.error, restore: res.restore }, { status: done.status });
    return NextResponse.json({ ...done, restore: res.restore });
  }
  const out = restoreData(r.nation.id, params.id, { by, acknowledgeLoss: r.b.acknowledgeLoss === true });
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json(out);
}
