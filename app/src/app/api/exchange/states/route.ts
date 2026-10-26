// GET /api/exchange/states — the declared degraded states (plan I9,
// lib/federation/degraded.ts): every exchange service and every dependency
// the kernel can run without, its state now (computed from the facts, never
// stored) and what the platform does while it is not available. Read only.
import { NextResponse } from 'next/server';
import { declaredStates } from '@/lib/federation/degraded';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ at: new Date().toISOString(), capabilities: declaredStates() });
}
