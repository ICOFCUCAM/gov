// /api/platform/backups/[id] — one backup as the target describes it; with
// ?preview=1 also what restoring it would lose (the backup is read back and
// opened; nothing changes).
import { NextRequest, NextResponse } from 'next/server';
import { getBackup, restorePreview, pendingRestore } from '@/lib/data/backups';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (new URL(req.url).searchParams.has('preview')) {
    const p = await restorePreview(id);
    if ('error' in p) return NextResponse.json({ error: p.error }, { status: p.status });
    return NextResponse.json({ ...p, proposal: pendingRestore(id) ?? null });
  }
  const b = await getBackup(id).catch(() => null);
  if (!b) return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
  return NextResponse.json({ backup: b, proposal: pendingRestore(id) ?? null });
}
