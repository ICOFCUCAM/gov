import { NextRequest, NextResponse } from 'next/server';
import { listBackups, createBackup } from '@/lib/data/store';
import type { BackupKind } from '@/lib/api/types';
export const dynamic = 'force-dynamic';
export function GET() { return NextResponse.json({ backups: listBackups() }); }
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { kind?: string };
  return NextResponse.json({ backup: createBackup((b.kind === 'incremental' ? 'incremental' : 'full') as BackupKind) }, { status: 201 });
}
