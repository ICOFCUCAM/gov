// GET /api/registers/check?register=&q= — anyone's check: is this
// organisation in this public register, and in what standing? Name (three
// letters or more) or register number; at most 20 answers, without
// representatives or history (lib/organisations/register.ts checkStanding()).
import { NextRequest, NextResponse } from 'next/server';
import { checkStanding } from '@/lib/organisations/register';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const r = checkStanding(q.get('register') ?? '', q.get('q') ?? '');
  return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ results: r });
}
