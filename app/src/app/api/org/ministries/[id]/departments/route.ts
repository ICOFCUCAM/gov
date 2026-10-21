import { NextRequest, NextResponse } from 'next/server';
import { addDepartment } from '@/lib/data/store';
import { refusal } from '@/lib/auth/official';
import { ministryPermission } from '@/lib/auth/roles';
import { actingName } from '@/lib/casework/actor';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const refused = await refusal(s => ministryPermission(s, params.id));
  if (refused) return refused;
  const b = (await req.json().catch(() => ({}))) as { name?: string; by?: string };
  if (!b.name) return NextResponse.json({ error: 'name required' }, { status: 422 });
  const r = addDepartment(params.id, b.name, await actingName(b.by));
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ ministry: r });
}
