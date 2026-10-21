import { NextResponse } from 'next/server';
import { analyticsFor } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export async function GET(_r: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const r = analyticsFor(params.id);
  if ('error' in (r as object)) return NextResponse.json(r, { status: 404 });
  // Generated (seeded) figures: marked as samples in every mode (step I0.1).
  return NextResponse.json({ kind: 'sample', analytics: r });
}
