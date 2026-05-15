import { NextResponse } from 'next/server';
import { nationalCoordination } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(nationalCoordination());
}
