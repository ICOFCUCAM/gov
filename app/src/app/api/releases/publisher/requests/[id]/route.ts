// /api/releases/publisher/requests/[id] — move a nation's feature request
// one stage along the pipeline, or decline it with a reason.
import { NextRequest, NextResponse } from 'next/server';
import { advanceRequest } from '@/lib/data/updates';
import { publisherAuthorized, unauthorized } from '@/lib/updates/access';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!(await publisherAuthorized(req))) return unauthorized();
  let b: { to?: string; by?: string; note?: string; targetVersion?: string };
  try { b = await withOfficial(await req.json()); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!b || typeof b.to !== 'string') return NextResponse.json({ error: 'to is required' }, { status: 422 });
  const r = advanceRequest(params.id, b);
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'Request not found' ? 404 : 422 });
  return NextResponse.json({ request: r });
}
