import { NextRequest, NextResponse } from 'next/server';
import { setGrantStatus } from '@/lib/data/store';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string };
  const r = setGrantStatus(params.id, 'approved', b.by ?? 'STO');
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json({ grant: r });
}
