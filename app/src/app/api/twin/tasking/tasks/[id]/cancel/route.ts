// Cancel a task that is not finished (lib/twin/tasking.ts cancelTask): POST
// { reason }. A signed-in official whom canTaskSensor (lib/auth/roles.ts)
// allows; audited. The executing integration sees the task cancelled on its
// next pull.

import { NextRequest, NextResponse } from 'next/server';
import { currentOfficial, actorLabel } from '@/lib/auth/official';
import { canTaskSensor, secondStepMissing } from '@/lib/auth/roles';
import { cancelTask } from '@/lib/twin/tasking';

export const dynamic = 'force-dynamic';

/**
 * @example { "reason": "Warning lifted" }
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const o = await currentOfficial();
  if (!o) return NextResponse.json({ error: 'Sign in as an official to cancel a task' }, { status: 401 });
  const why = secondStepMissing(o) ?? canTaskSensor(o);
  if (why) return NextResponse.json({ error: why }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { reason?: unknown };
  const t = cancelTask(decodeURIComponent(id), actorLabel(o), typeof b.reason === 'string' ? b.reason : '');
  if ('error' in t) return NextResponse.json(t, { status: 422 });
  return NextResponse.json({ task: t });
}
