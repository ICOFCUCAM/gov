import { NextRequest, NextResponse } from 'next/server';
import { activateMinistry } from '@/lib/data/store';
import { refusal } from '@/lib/auth/official';
import { adminOnly } from '@/lib/auth/roles';
import { queueMirror } from '@/lib/db/mirror';
import { actingName } from '@/lib/casework/actor';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const refused = await refusal(adminOnly);
  if (refused) return refused;
  const b = (await req.json().catch(() => ({}))) as { by?: string };
  const r = activateMinistry(params.id, await actingName(b.by));
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  queueMirror('institutions'); // the substrate's charter rows mirror the registry (lib/db/mirror.ts)
  return NextResponse.json({ ministry: r });
}
