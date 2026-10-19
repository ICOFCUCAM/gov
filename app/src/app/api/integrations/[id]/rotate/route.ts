// Issue a new API key for an integration: shown once, kept only as a
// SHA-256 hash; the previous key stops working at once. Audited.
import { NextRequest, NextResponse } from 'next/server';
import { rotateIntegrationKey } from '@/lib/data/store';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string };
  const r = rotateIntegrationKey(params.id, b.by ?? 'operator');
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'Integration not found' ? 404 : 409 });
  return NextResponse.json(r, { status: 201 });
}
