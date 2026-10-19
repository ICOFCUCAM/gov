// /api/platform/backups/[id]/verify — read the backup back from the target,
// decrypt it, check every part's SHA-256 against the manifest and dry-run the
// restore into a scratch store (postgres: a scratch schema, rolled back).
// The result is kept with the backup and audited.
import { NextRequest, NextResponse } from 'next/server';
import { verifyBackup } from '@/lib/data/backups';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const b = await withOfficial((await req.json().catch(() => ({}))) as { by?: string });
  const out = await verifyBackup(id, { by: typeof b.by === 'string' ? b.by : undefined });
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ backup: out }, { status: out.verification?.ok ? 200 : 409 });
}
