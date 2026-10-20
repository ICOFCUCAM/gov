// GET /api/courts/cause-list?from=YYYY-MM-DD&days=7 — the public cause list
// (lib/courts/hearings.ts): scheduled hearings by case number, court, kind,
// time and room; never parties or the subject of a case.
import { NextRequest, NextResponse } from 'next/server';
import { causeList } from '@/lib/courts/hearings';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(q.get('from') ?? '') ? q.get('from')! : new Date().toISOString().slice(0, 10);
  const days = Math.min(Math.max(Number(q.get('days')) || 7, 1), 31);
  return NextResponse.json({ from, days, hearings: causeList(from, days) });
}
