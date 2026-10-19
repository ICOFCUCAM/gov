// Tasking capabilities of the twin's stream sources (SensorThings Tasking
// Core, lib/twin/tasking.ts): GET lists them (retired ones included, marked);
// POST declares one: { sourceId, name, description?, actuator?: { name,
// description }, integrationId, parameters: [{ name, label, kind: number |
// text | choice | boolean, unit?, min?, max?, choices?, required? }] }.
// Administrators only (ADMIN_ONLY in lib/auth/roles.ts); a signed-in
// official's verified name replaces any name in the request (withOfficial);
// the executing integration must be approved and hold the scope sta:task;
// audited.

import { NextRequest, NextResponse } from 'next/server';
import { withOfficial, refusal } from '@/lib/auth/official';
import { adminOnly } from '@/lib/auth/roles';
import { syncRegister } from '@/lib/twin/register';
import { declareCapability, listCapabilities, TASKING_SCOPE } from '@/lib/twin/tasking';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ capabilities: listCapabilities({ includeRetired: true }), scope: TASKING_SCOPE });
}

/**
 * @example { "by": "Platform Administrator", "sourceId": "SRC-3", "name": "Change the sampling interval", "integrationId": "IC-1A2B3C", "actuator": { "name": "Tana gauge logger" }, "parameters": [{ "name": "intervalSeconds", "label": "Sampling interval", "kind": "number", "unit": "s", "min": 10, "max": 3600 }] }
 */
export async function POST(req: NextRequest) {
  const refused = await refusal(adminOnly);
  if (refused) return refused;
  await syncRegister();
  const b = (await withOfficial(await req.json().catch(() => ({})))) as Record<string, unknown> & { by?: string };
  const r = declareCapability(b as Parameters<typeof declareCapability>[0], String(b.by ?? ''));
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ capability: r }, { status: 201 });
}
