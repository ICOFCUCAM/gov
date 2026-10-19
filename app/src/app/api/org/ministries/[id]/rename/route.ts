import { NextRequest, NextResponse } from 'next/server';
import { renameMinistry } from '@/lib/data/store';
import { refusal } from '@/lib/auth/official';
import { adminOnly } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const refused = await refusal(adminOnly);
  if (refused) return refused;
  const b = (await req.json().catch(() => ({}))) as { name?: string };
  if (!b.name) return NextResponse.json({ error: 'name required' }, { status: 422 });
  const r = renameMinistry(params.id, b.name);
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json({ ministry: r });
}
