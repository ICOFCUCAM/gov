// Tasks for the devices behind the twin's stream sources (SensorThings
// Tasking Core, lib/twin/tasking.ts): GET lists them, newest first
// (?capability= narrows to one capability); POST creates one: {
// capabilityId, parameters: { … }, reason }. Only a signed-in official (a
// typed-in name is never enough) whom canTaskSensor (lib/auth/roles.ts)
// allows: administrators and officials who can sign. The parameters are
// checked against the capability's declaration; audited. The platform never
// executes a task: the integration named by the capability pulls it from
// /api/twin/tasking/executor and reports its status.

import { NextRequest, NextResponse } from 'next/server';
import { currentOfficial, actorLabel } from '@/lib/auth/official';
import { canTaskSensor, secondStepMissing } from '@/lib/auth/roles';
import { createTask, listTasks } from '@/lib/twin/tasking';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const capability = req.nextUrl.searchParams.get('capability') ?? undefined;
  return NextResponse.json({ tasks: listTasks({ capabilityId: capability }) });
}

/**
 * @example { "capabilityId": "TC-1", "parameters": { "intervalSeconds": 60 }, "reason": "Flood watch on the Tana: readings every minute until the warning is lifted" }
 */
export async function POST(req: NextRequest) {
  const o = await currentOfficial();
  if (!o) return NextResponse.json({ error: 'Sign in as an official to create a task' }, { status: 401 });
  const why = secondStepMissing(o) ?? canTaskSensor(o);
  if (why) return NextResponse.json({ error: why }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { capabilityId?: unknown; parameters?: unknown; reason?: unknown };
  const t = createTask({ capabilityId: b.capabilityId, parameters: b.parameters, reason: b.reason }, { name: actorLabel(o), institution: o.institution });
  if ('error' in t) return NextResponse.json(t, { status: 422 });
  return NextResponse.json({ task: t }, { status: 201 });
}
