// GET /api/registers/professionals?q= — anyone's check: is this person on a
// public register of a regulated profession, and in what standing? Full name
// (five letters or more) or registration number; at most 20 answers with
// name, profession, number, standing, validity and conditions only, never
// the person reference, qualifications or history (lib/professions/register.ts).
import { NextRequest, NextResponse } from 'next/server';
import { checkProfessional, professions } from '@/lib/professions/register';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  return NextResponse.json({ professions: professions().filter(p => p.publicCheck).map(p => ({ key: p.key, title: p.title })), results: checkProfessional(q) });
}
