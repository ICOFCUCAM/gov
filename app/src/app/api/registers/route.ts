// GET /api/registers — the public registers anyone can check (/registers):
// the register types of the organisations register marked for public checking.
import { NextResponse } from 'next/server';
import { registerTypes } from '@/lib/organisations/register';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ registers: registerTypes().filter(t => t.publicCheck).map(t => ({ key: t.key, title: t.title, kind: t.kind })) });
}
