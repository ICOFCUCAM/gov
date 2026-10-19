// /api/platform/backups/policy — the backup schedule, retention (newest of
// the last N days, weeks and months; pre-restore copies for N days) and the
// RPO and RTO targets (docs/DISASTER_RECOVERY.md). PUT by an administrator,
// audited.
import { NextRequest, NextResponse } from 'next/server';
import { getPolicy, setPolicy, type BackupPolicy } from '@/lib/data/backups';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export function GET() { return NextResponse.json({ policy: getPolicy() }); }

export async function PUT(req: NextRequest) {
  let b: Partial<BackupPolicy> & { by?: string };
  try { b = await withOfficial(await req.json()); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!b || typeof b !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  const out = setPolicy(b);
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ policy: out });
}
