import { NextResponse } from 'next/server';
import { listNotifications } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ notifications: listNotifications() });
}
