import { NextRequest, NextResponse } from 'next/server';
import { deactivateMinistry } from '@/lib/data/store';
import { refusal } from '@/lib/auth/official';
import { adminOnly } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';
export async function POST(_r: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const refused = await refusal(adminOnly);
  if (refused) return refused;
  const r = deactivateMinistry(params.id);
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json({ ministry: r });
}
