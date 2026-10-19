// /api/platform/backups/[id]/restore — restore the platform's data from a
// backup. Never automatic, four-eyes (lib/data/backups.ts requestRestore):
//   1. an administrator proposes it, acknowledging the loss warning (what was
//      recorded after the backup is lost) → 202 with the proposal
//   2. a second, different official confirms it within 30 minutes,
//      acknowledging the loss → the current state is backed up, the backup is
//      restored, and one audit entry names both officials, the backup and the
//      hash of the state it replaced
// DELETE cancels a proposal. Administrators only (lib/auth/roles.ts ADMIN_ONLY).
import { NextRequest, NextResponse } from 'next/server';
import { requestRestore, cancelRestore } from '@/lib/data/backups';
import { withOfficial, refusal } from '@/lib/auth/official';
import { adminOnly } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const denied = await refusal(adminOnly);
  if (denied) return denied;
  const b = await withOfficial((await req.json().catch(() => ({}))) as { by?: string; acknowledgeLoss?: boolean; reason?: string });
  const out = await requestRestore(id, { by: typeof b.by === 'string' ? b.by : undefined, acknowledgeLoss: b.acknowledgeLoss === true, reason: typeof b.reason === 'string' ? b.reason : undefined });
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json(out, { status: out.pending ? 202 : 200 });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const b = await withOfficial((await req.json().catch(() => ({}))) as { by?: string });
  const out = cancelRestore(id, { by: typeof b.by === 'string' ? b.by : undefined });
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json(out);
}
