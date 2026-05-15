import { NextResponse } from 'next/server';
import { opsOverview } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(opsOverview());
}
