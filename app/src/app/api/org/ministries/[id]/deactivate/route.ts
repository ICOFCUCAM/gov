import { NextRequest, NextResponse } from 'next/server';
import { deactivateMinistry } from '@/lib/data/store';
import { refusal } from '@/lib/auth/official';
import { structuralRefusal } from '@/lib/data/store/institutions';
import { adminOnly } from '@/lib/auth/roles';
import { queueMirror } from '@/lib/db/mirror';
export const dynamic = 'force-dynamic';
export async function POST(_r: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const refused = await refusal(adminOnly);
  if (refused) return refused;
  // An independent institution is deactivated only through the change process (lib/data/store/institutions.ts).
  const independent = structuralRefusal(params.id);
  if (independent) return NextResponse.json({ error: independent }, { status: 409 });
  const r = deactivateMinistry(params.id);
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  queueMirror('institutions'); // the substrate's charter rows mirror the registry (lib/db/mirror.ts)
  return NextResponse.json({ ministry: r });
}
