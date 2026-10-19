// /api/releases/download/[key]/[artifact] — a nation's own download link.
// Serves an honest placeholder manifest (no binaries are hosted here), and
// only for artifacts of releases that nation may see.
import { NextResponse } from 'next/server';
import { downloadManifest, resolveNation } from '@/lib/data/updates';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  props: { params: Promise<{ key: string; artifact: string }> }
) {
  const params = await props.params;
  const n = resolveNation(params.key);
  if (!n) return NextResponse.json({ error: 'Unknown distribution link' }, { status: 404 });
  const manifest = downloadManifest(n.id, params.artifact);
  if (!manifest) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
  const file = String((manifest.artifact as { filename: string }).filename);
  return new NextResponse(JSON.stringify(manifest, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${file}.manifest.json"`,
      'cache-control': 'no-store',
    },
  });
}
