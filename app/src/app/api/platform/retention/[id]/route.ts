// Decide a proposed retention rule (lib/data/retention.ts): POST { decision:
// confirm | withdraw }. Confirming takes a different administrator from the
// one who proposed it (four-eyes). Administrators only (/api/platform). Audited.
import { NextRequest, NextResponse } from 'next/server';
import { withOfficial, officialId } from '@/lib/auth/official';
import { decideRetention } from '@/lib/data/retention';

export const dynamic = 'force-dynamic';

/** @example request {"decision":"confirm"} */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { decision?: unknown; by?: string };
  const r = decideRetention(id, b.decision, typeof b.by === 'string' ? b.by : '', Date.now(), await officialId());
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'No such proposal' ? 404 : 422 });
  return NextResponse.json({ change: r });
}
