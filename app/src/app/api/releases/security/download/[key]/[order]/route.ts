// /api/releases/security/download/[key]/[order] — licensed security
// software, unlocked only while the nation's licence is active. Serves a
// labelled placeholder manifest (no vendor is connected).
import { NextResponse } from 'next/server';
import { resolveNation } from '@/lib/data/updates';
import { securityDownload } from '@/lib/data/security-store';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, props: { params: Promise<{ key: string; order: string }> }) {
  const params = await props.params;
  const n = resolveNation(params.key);
  if (!n) return NextResponse.json({ error: 'Unknown distribution link' }, { status: 404 });
  const m = securityDownload(n, params.order);
  if (typeof m.error === 'string' && typeof m.status === 'number') return NextResponse.json({ error: m.error }, { status: m.status });
  const file = String((m as { artifact: { filename: string } }).artifact.filename);
  return new NextResponse(JSON.stringify(m, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${file}.manifest.json"`,
      'cache-control': 'no-store',
    },
  });
}
