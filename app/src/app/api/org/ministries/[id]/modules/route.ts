import { NextRequest, NextResponse } from 'next/server';
import { setModule } from '@/lib/data/store';
import { refusal } from '@/lib/auth/official';
import { ministryPermission } from '@/lib/auth/roles';
import { actingName } from '@/lib/casework/actor';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const refused = await refusal(s => ministryPermission(s, params.id));
  if (refused) return refused;
  const b = (await req.json().catch(() => ({}))) as { moduleKey?: string; enabled?: boolean; by?: string };
  if (!b.moduleKey || typeof b.enabled !== 'boolean') return NextResponse.json({ error: 'moduleKey and enabled required' }, { status: 422 });
  const r = setModule(params.id, b.moduleKey, b.enabled, await actingName(b.by));
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json({ ministry: r });
}
