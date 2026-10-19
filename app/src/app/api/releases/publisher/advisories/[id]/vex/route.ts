// /api/releases/publisher/advisories/[id]/vex — the publisher's VEX
// statement for one nation (e.g. not affected, with a justification).
import { NextRequest, NextResponse } from 'next/server';
import { publisherAuthorized, unauthorized } from '@/lib/updates/access';
import { nationRecord } from '@/lib/data/updates';
import { setVex } from '@/lib/data/advisories';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await publisherAuthorized(req))) return unauthorized();
  let b: { nationId?: string; status?: string; justification?: string; by?: string };
  try { b = await withOfficial(await req.json()); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!b?.nationId || !nationRecord(b.nationId)) return NextResponse.json({ error: 'Choose an enrolled nation' }, { status: 422 });
  const out = setVex(params.id, b.nationId, b);
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json(out);
}
