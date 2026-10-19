import { NextRequest, NextResponse } from 'next/server';
import { escalateMinistryIncident } from '@/lib/data/store';
import { withOfficial, refusal } from '@/lib/auth/official';
import { ministryPermission } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, props: { params: Promise<{ id: string; key: string }> }) {
  const params = await props.params;
  const refused = await refusal(s => ministryPermission(s, params.id));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string };
  const r = escalateMinistryIncident(params.id, params.key, b.by ?? 'operator');
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ incident: r });
}
