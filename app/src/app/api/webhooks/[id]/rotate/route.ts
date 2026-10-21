// Issue a new HMAC signing secret for a webhook subscription: shown once,
// kept sealed (CIVICOS_DATA_KEK); the previous secret stops at once. Audited.
import { NextRequest, NextResponse } from 'next/server';
import { rotateWebhookSecret } from '@/lib/data/store';
import { withOfficial } from '@/lib/auth/official';
import { actingName } from '@/lib/casework/actor';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string };
  const r = rotateWebhookSecret(params.id, await actingName(b.by));
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json(r, { status: 201 });
}
