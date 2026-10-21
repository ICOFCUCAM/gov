import { NextRequest, NextResponse } from 'next/server';
import { mergeMinistry } from '@/lib/data/store';
import { refusal } from '@/lib/auth/official';
import { structuralRefusal } from '@/lib/data/store/institutions';
import { adminOnly } from '@/lib/auth/roles';
import { queueMirror } from '@/lib/db/mirror';
import { actingName } from '@/lib/casework/actor';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const refused = await refusal(adminOnly);
  if (refused) return refused;
  const b = (await req.json().catch(() => ({}))) as { targetId?: string; by?: string };
  if (!b.targetId) return NextResponse.json({ error: 'targetId required' }, { status: 422 });
  // An independent institution is merged only through the change process (lib/data/store/institutions.ts).
  const independent = structuralRefusal(params.id, b.targetId);
  if (independent) return NextResponse.json({ error: independent }, { status: 409 });
  const r = mergeMinistry(params.id, b.targetId, await actingName(b.by));
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  queueMirror('institutions'); // the substrate's charter rows mirror the registry (lib/db/mirror.ts)
  return NextResponse.json({ ministry: r });
}
