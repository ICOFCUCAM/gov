// /api/organisations/types — the register types of the organisations register
// (lib/organisations/register.ts): GET lists them (the shipped references and
// the nation's own); POST { key, title, kind, authority, orgKinds,
// validityMonths?, publicCheck? } configures one (administrators, audited).
import { NextRequest, NextResponse } from 'next/server';
import { withOfficial } from '@/lib/auth/official';
import { defineRegisterType, registerTypes } from '@/lib/organisations/register';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ types: registerTypes() });
}

export async function POST(req: NextRequest) {
  const b = await withOfficial((await req.json().catch(() => ({}))) as Record<string, unknown>);
  const r = defineRegisterType(b as never, String(b.by ?? 'Administrator'));
  return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ type: r }, { status: 201 });
}
