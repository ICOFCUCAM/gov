// Where the platform keeps its state and when it last saved it (lib/data/persist.ts).
// Officials only (the access gate requires a session for /api/platform/*).

import { NextResponse } from 'next/server';
import { persistenceStatus, liveKeys } from '@/lib/data/persist';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ state: { ...persistenceStatus(), stores: liveKeys().length } });
}
