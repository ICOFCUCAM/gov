// /api/pilot/exit-gate — the pilot's exit gate (spec Part 6 I, roadmap 05,
// S6-I-11; Health I4 standalone-and-pilot; lib/pilot/exit-gate.ts): whether
// authorised users completed the service with real records and verifiable
// audit evidence, computed from the records each time (never a stored status),
// with exactly what is missing. Read only; administrators, auditors, the
// pilot institutions' officials and the whole government (canSeePilotGate()).
import { NextResponse } from 'next/server';
import { readRefusal } from '@/lib/auth/official';
import { canSeePilotGate } from '@/lib/auth/roles';
import { pilotExitGate, pilotScope } from '@/lib/pilot/exit-gate';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ids = pilotScope().institutions.map(i => i.id);
  const refused = await readRefusal(s => canSeePilotGate(s, ids));
  if (refused) return refused;
  return NextResponse.json(pilotExitGate());
}
