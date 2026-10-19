// /api/platform/backups — the installation's backups (register 3.7, 9.1;
// lib/data/backups.ts; review M-14: no simulated backups). GET: the catalogue
// at the backup target (newest first; each with the earlier fields kind,
// state, location, encrypted, sizeBytes, createdAt, and the backup's own
// description), and the status (target, key, policy, RPO, restore proposals
// and restores). POST: an administrator takes a backup now (encrypted, with
// its manifest and the audit chain head) and it is verified at once
// (administrators only, lib/auth/roles.ts ADMIN_ONLY). `kind` is accepted as
// before; every backup is a full, consistent copy.
import { NextRequest, NextResponse } from 'next/server';
import { listBackups, createBackup, verifyBackup, backupStatus, asRecord } from '@/lib/data/backups';
import { targetFromEnv } from '@/lib/backup/target';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await backupStatus();
  let backups: Awaited<ReturnType<typeof listBackups>> = [];
  let error: string | undefined;
  try { backups = await listBackups(); } catch (e) { error = (e as Error).message; }
  let shown: unknown[] = backups;
  try { const t = targetFromEnv(); shown = backups.map(e => ({ ...e, ...asRecord(e, t) })); } catch { /* target error reported in status */ }
  return NextResponse.json({ backups: shown, status, ...(error ? { error } : {}) });
}

export async function POST(req: NextRequest) {
  const b = await withOfficial((await req.json().catch(() => ({}))) as { by?: string; kind?: string });
  const by = typeof b.by === 'string' && b.by.trim() ? b.by : 'Administrator (unnamed)';
  const out = await createBackup({ by, reason: 'manual' });
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  const v = await verifyBackup(out.id, { by });
  const entry = 'error' in v ? out : v;
  return NextResponse.json({ backup: { ...entry, ...asRecord(entry) }, ...(b.kind === 'incremental' ? { note: 'Every backup is a full, consistent copy of the state' } : {}) }, { status: 201 });
}
