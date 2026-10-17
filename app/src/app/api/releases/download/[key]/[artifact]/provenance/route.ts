// /api/releases/download/[key]/[artifact]/provenance — the artifact's SLSA
// provenance attestation (DSSE envelope, `.intoto.jsonl`) behind the
// nation's own download link; only for releases that nation may see.
import { NextResponse } from 'next/server';
import { resolveNation } from '@/lib/data/updates';
import { attestationFor } from '@/lib/data/supply-chain';

export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: { key: string; artifact: string } }) {
  const n = resolveNation(params.key);
  if (!n) return NextResponse.json({ error: 'Unknown distribution link' }, { status: 404 });
  const att = attestationFor(n.id, params.artifact);
  if (!att) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
  return new NextResponse(JSON.stringify(att.envelope) + '\n', {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'content-disposition': `attachment; filename="${att.filename}"`,
      'cache-control': 'no-store',
    },
  });
}
