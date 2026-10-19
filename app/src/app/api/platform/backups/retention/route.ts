// /api/platform/backups/retention — apply the retention policy now: remove
// the backups it no longer keeps (never one an installed release's restore
// point names, never the newest verified one). Audited with the ids removed.
import { NextRequest, NextResponse } from 'next/server';
import { applyRetention } from '@/lib/data/backups';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const b = await withOfficial((await req.json().catch(() => ({}))) as { by?: string });
  const out = await applyRetention({ by: typeof b.by === 'string' ? b.by : undefined });
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json(out);
}
