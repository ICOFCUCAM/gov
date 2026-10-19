import { NextRequest, NextResponse } from 'next/server';
import { advanceDeployment } from '@/lib/data/store';
import { withOfficial } from '@/lib/auth/official';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { gateResult?: 'pass' | 'fail'; note?: string; by?: string };
  const r = advanceDeployment(params.id, b.by ?? 'W. Tanaka', b.gateResult === 'fail' ? 'fail' : 'pass', b.note);
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ deployment: r });
}
