// /api/releases/[id]/decision — a nation's explicit decision on a release:
// approve, schedule, unschedule, install, skip, reconsider or rollback.
// Nothing is ever applied without one; each is written to the audit chain.
// prepare (take a restore point) for the installed nation backs the platform
// up and verifies the backup first (lib/data/backups.ts takeRestorePoint);
// the restore point records the backup, and only a verified one lets the
// install proceed.
import { NextRequest, NextResponse } from 'next/server';
import { decide, INSTALL_ACTIONS, simulatedRestorePoints, type DecisionInput } from '@/lib/data/updates';
import { takeRestorePoint } from '@/lib/data/backups';
import { nationFor } from '@/lib/updates/access';
import type { InstallAction } from '@/lib/api/types';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  let b: Partial<DecisionInput> & { link?: string };
  try { b = await withOfficial(await req.json()); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!b || typeof b !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  if (!INSTALL_ACTIONS.includes(b.action as InstallAction)) {
    return NextResponse.json({ error: `action must be one of: ${INSTALL_ACTIONS.join(', ')}` }, { status: 422 });
  }
  if (typeof b.by !== 'string') return NextResponse.json({ error: 'by is required' }, { status: 422 });
  const n = nationFor(typeof b.link === 'string' ? b.link : new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  let backup: DecisionInput['backup'];
  if (b.action === 'prepare' && !simulatedRestorePoints(n)) {
    const rp = await takeRestorePoint(b.by);
    if ('error' in rp) return NextResponse.json({ error: `No restore point was recorded: ${rp.error}` }, { status: rp.status });
    backup = rp;
  }
  const r = decide(n.id, params.id, {
    action: b.action as InstallAction,
    by: b.by,
    note: typeof b.note === 'string' ? b.note : undefined,
    window: b.window && typeof b.window === 'object' ? { start: String(b.window.start ?? ''), end: String(b.window.end ?? '') } : undefined,
    mode: b.mode,
    verified: b.verified === true,
    acknowledge: b.acknowledge === true,
    ...(backup ? { backup } : {}),
  });
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r);
}
