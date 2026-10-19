// The executing integration's task queue (SensorThings Tasking Core,
// lib/twin/tasking.ts pullTasks): GET with Authorization: Bearer civ_… (the
// integration's own key, approved, scope sta:task, within its rate limit;
// BEARER_READS in lib/auth/roles.ts) answers the tasks of the capabilities it
// executes that are not finished, oldest first, each with its capability's
// parameters. Tasks handed over for the first time become delivered (audited);
// a task cancelled by an official is listed once more as cancelled. The
// gateway then reports each task's status at /api/twin/tasking/executor/{id}.

import { NextRequest, NextResponse } from 'next/server';
import { verifyIntegrationKey } from '@/lib/data/store';
import { pullTasks, TASKING_SCOPE } from '@/lib/twin/tasking';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const key = verifyIntegrationKey(req.headers.get('authorization'), TASKING_SCOPE);
  if (!key.ok) {
    const res = NextResponse.json({ error: key.error }, { status: key.status });
    if (key.status === 401) res.headers.set('WWW-Authenticate', `Bearer realm="civicos-twin", scope="${TASKING_SCOPE}"`);
    if (key.retryAfterSeconds) res.headers.set('Retry-After', String(key.retryAfterSeconds));
    return res;
  }
  return NextResponse.json(pullTasks({ id: key.client.id, name: key.client.name }));
}
