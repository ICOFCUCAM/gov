import { NextRequest, NextResponse } from 'next/server';
import { listReleases, createRelease } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export function GET() { return NextResponse.json({ releases: listReleases() }); }
export async function POST(req: NextRequest) {
  let b: { version?: string; notes?: string; schemaMigration?: string };
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!b.version || !b.notes) return NextResponse.json({ error: 'version and notes required' }, { status: 422 });
  const r = createRelease({ version: b.version, notes: b.notes, schemaMigration: b.schemaMigration });
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ release: r }, { status: 201 });
}
