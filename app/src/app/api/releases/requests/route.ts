// /api/releases/requests — the nation's own feature requests.
import { NextRequest, NextResponse } from 'next/server';
import { listRequests, submitRequest, type RequestInput } from '@/lib/data/updates';
import { nationFor } from '@/lib/updates/access';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const n = nationFor(new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  return NextResponse.json({ requests: listRequests(n.id) });
}

export async function POST(req: NextRequest) {
  let b: RequestInput & { link?: string };
  try { b = await withOfficial(await req.json()); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!b || typeof b !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  const n = nationFor(typeof b.link === 'string' ? b.link : new URL(req.url).searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  const r = submitRequest(n.id, b);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ request: r }, { status: 201 });
}
