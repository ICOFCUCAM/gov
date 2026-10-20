// /api/professions/types — the regulated professions (lib/professions/register.ts):
// GET lists them (the shipped references and the nation's own); POST { key,
// title, authority, permitType?, publicCheck? } configures one, naming the
// regulator that keeps its register (administrators, audited).
import { NextRequest, NextResponse } from 'next/server';
import { withOfficial } from '@/lib/auth/official';
import { defineProfession, professions } from '@/lib/professions/register';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ professions: professions() });
}

export async function POST(req: NextRequest) {
  const b = await withOfficial((await req.json().catch(() => ({}))) as Record<string, unknown>);
  const r = defineProfession(b as never, String(b.by ?? 'Administrator'));
  return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ profession: r }, { status: 201 });
}
