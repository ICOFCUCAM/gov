import { NextResponse } from 'next/server';
import { listAudit } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ events: listAudit() });
}
