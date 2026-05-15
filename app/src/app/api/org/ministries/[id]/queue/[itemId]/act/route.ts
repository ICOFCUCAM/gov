import { NextRequest, NextResponse } from 'next/server';
import { actOnQueueItem } from '@/lib/data/store';
import type { QueueAction } from '@/lib/api/types';
export const dynamic = 'force-dynamic';
const ACTIONS = ['assign', 'escalate', 'clear'];
export async function POST(req: NextRequest, { params }: { params: { id: string; itemId: string } }) {
  const b = (await req.json().catch(() => ({}))) as { action?: string; by?: string; note?: string };
  if (!b.action || !ACTIONS.includes(b.action)) {
    return NextResponse.json({ error: 'action must be assign|escalate|clear' }, { status: 422 });
  }
  const r = actOnQueueItem(params.id, params.itemId, b.action as QueueAction, b.by ?? 'operator', b.note);
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ item: r });
}
