// /api/releases/settings/agent-credential — issue or rotate the nation's
// deployment-agent credential. The credential is returned once; only its
// hash is kept. Issuing again revokes the previous one. Audited.
import { NextRequest, NextResponse } from 'next/server';
import { issueAgentCredential } from '@/lib/data/updates';
import { chamberBody } from '@/lib/updates/access';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const r = await chamberBody<{ by?: string }>(req);
  if (r instanceof NextResponse) return r;
  const out = issueAgentCredential(r.nation.id, typeof r.b.by === 'string' ? r.b.by : '');
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json(out, { status: 201, headers: { 'cache-control': 'no-store' } });
}
