// Remove the platform's example cases from an institution's queue:
// POST { action: 'remove' } under the named official; audited. Real cases stay.
import { NextRequest, NextResponse } from 'next/server';
import { removeSampleCases } from '@/lib/data/case-import';
import { withOfficial, refusal } from '@/lib/auth/official';
import { ministryPermission } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const refused = await refusal(s => ministryPermission(s, params.id));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { action?: string; by?: string };
  if (b.action !== 'remove') return NextResponse.json({ error: 'action must be remove' }, { status: 422 });
  const r = removeSampleCases(params.id, b.by);
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'Ministry not found' ? 404 : 422 });
  return NextResponse.json(r);
}
