import { NextResponse } from 'next/server';
import { getSession } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(getSession());
}
