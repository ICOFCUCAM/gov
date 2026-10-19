import { NextRequest, NextResponse } from 'next/server';
import { setIntegrationStatus } from '@/lib/data/store';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string };
  const r = setIntegrationStatus(params.id, 'approved', b.by ?? 'L. Petrov');
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json({ integration: r });
}
