// /api/releases/change-control — the nation's maintenance calendar,
// blackout periods and change freeze. Four-eyes itself is enforced on the
// decision route (approve and install need two different officials).
import { NextRequest, NextResponse } from 'next/server';
import { nationFor, chamberBody } from '@/lib/updates/access';
import { addBlackout, changeControl, removeBlackout, setFreeze, setWindows } from '@/lib/data/change-control';
import type { MaintenanceSlot } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  return NextResponse.json({ changeControl: changeControl(n.id) });
}

export async function POST(req: NextRequest) {
  const body = await chamberBody<{ action?: string; by?: string; reason?: string; label?: string; kind?: string; start?: string; end?: string; id?: string; windows?: MaintenanceSlot[] }>(req);
  if (body instanceof NextResponse) return body;
  const { nation: n, b } = body;
  const by = typeof b.by === 'string' ? b.by : '';
  const out = b.action === 'freeze' ? setFreeze(n.id, true, { by, reason: b.reason })
    : b.action === 'unfreeze' ? setFreeze(n.id, false, { by })
    : b.action === 'add-blackout' ? addBlackout(n.id, { by, label: b.label, kind: b.kind, start: b.start, end: b.end })
    : b.action === 'remove-blackout' ? removeBlackout(n.id, String(b.id ?? ''), by)
    : b.action === 'set-windows' ? setWindows(n.id, Array.isArray(b.windows) ? b.windows : [], by)
    : { error: 'action must be freeze, unfreeze, add-blackout, remove-blackout or set-windows', status: 422 };
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ changeControl: out });
}
