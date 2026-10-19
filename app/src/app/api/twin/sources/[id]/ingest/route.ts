// How a twin stream source receives readings pushed to the platform
// (lib/twin/register.ts setStreamIngest): POST { ingest: { integrationId?,
// mqtt?: { url: "mqtts://host:port", topic, username?, password? } }, unit? }
// binds the integration whose key may post its Datastream's Observations
// through SensorThings (scope sta:write) and/or the nation's own MQTT broker
// (the password is sealed under the platform's key custody, never kept in the
// source); { ingest: null } stops receiving them. Administrators or officials
// who can sign (canConnectStream, lib/auth/roles.ts); a signed-in official's
// verified name replaces any name in the request (withOfficial); audited. The
// MQTT subscribers are brought in line at once (lib/twin/mqtt.ts).

import { NextRequest, NextResponse } from 'next/server';
import { setStreamIngest, syncRegister } from '@/lib/twin/register';
import { withOfficial, refusal } from '@/lib/auth/official';
import { canConnectStream } from '@/lib/auth/roles';
import { syncStreamSubscribers } from '@/lib/twin/mqtt';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const refused = await refusal(canConnectStream);
  if (refused) return refused;
  await syncRegister();
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string; ingest?: unknown; unit?: unknown };
  const r = setStreamIngest(decodeURIComponent(id), { ingest: b.ingest, unit: b.unit, by: String(b.by ?? '') });
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  const subscribers = await syncStreamSubscribers();
  return NextResponse.json({ source: r, subscribers });
}
