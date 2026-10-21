// /api/health-regulation/workforce — health workforce counts, derived from the
// register of regulated professionals on every read (lib/professions/workforce.ts):
// by profession, standing and region of practice, every cell through the
// nation's small-cell rule (lib/health/small-cells.ts). Read only: nothing is
// typed, and no name, number or person reference is in a count.
import { NextResponse } from 'next/server';
import { workforceCounts } from '@/lib/professions/workforce';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(workforceCounts());
}
