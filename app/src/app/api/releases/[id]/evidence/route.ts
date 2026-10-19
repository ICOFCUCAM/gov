// /api/releases/[id]/evidence — this nation's compliance evidence pack for a
// release it can see (manifest JSON with a digest). `download=1` returns it
// as an attachment. Generating it is audited.
import { NextRequest, NextResponse } from 'next/server';
import { nationFor } from '@/lib/updates/access';
import { evidencePack } from '@/lib/data/evidence';
import { recordAudit } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const u = new URL(req.url);
  const n = nationFor(u.searchParams.get('link'));
  if (n instanceof NextResponse) return n;
  const pack = evidencePack(n.id, params.id);
  if (!pack) return NextResponse.json({ error: 'Release not found' }, { status: 404 });
  if (u.searchParams.get('download')) {
    const release = pack.release as { version: string };
    recordAudit('evidence download', 'update.evidence.export', `UpdateChamber:${n.id}/${release.version}`, 'ok', `digest ${pack.digest.slice(0, 16)}…`);
    return new NextResponse(JSON.stringify(pack, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="evidence-${release.version.replace(/\+/g, '_')}.json"`, 'cache-control': 'no-store' } });
  }
  return NextResponse.json({ pack });
}
