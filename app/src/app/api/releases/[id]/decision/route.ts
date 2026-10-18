// /api/releases/[id]/decision — a nation's explicit decision on a release:
// approve, schedule, unschedule, install, skip, reconsider or rollback.
// Nothing is ever applied without one; each is written to the audit chain.
import { NextRequest, NextResponse } from 'next/server';
import { decide, INSTALL_ACTIONS, type DecisionInput } from '@/lib/data/updates';
import { nationFor } from '@/lib/updates/access';
import type { InstallAction } from '@/lib/api/types';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let b: Partial<DecisionInput> & { link?: string };
  try { b = await withOfficial(await req.json()); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!b || typeof b !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  if (!INSTALL_ACTIONS.includes(b.action as InstallAction)) {
    return NextResponse.json({ error: `action must be one of: ${INSTALL_ACTIONS.join(', ')}` }, { status: 422 });
  }
  if (typeof b.by !== 'string') return NextResponse.json({ error: 'by is required' }, { status: 422 });
  const n = nationFor(typeof b.link === 'string' ? b.link : new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  const r = decide(n.id, params.id, {
    action: b.action as InstallAction,
    by: b.by,
    note: typeof b.note === 'string' ? b.note : undefined,
    window: b.window && typeof b.window === 'object' ? { start: String(b.window.start ?? ''), end: String(b.window.end ?? '') } : undefined,
    mode: b.mode,
    verified: b.verified === true,
    acknowledge: b.acknowledge === true,
  });
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r);
}
