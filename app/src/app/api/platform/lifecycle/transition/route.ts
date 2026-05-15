import { NextRequest, NextResponse } from 'next/server';
import { transitionTenant } from '@/lib/data/store';
import type { TenantState } from '@/lib/api/types';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  let b: { to?: string; reason?: string; actor?: string };
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!b.to || !b.reason) return NextResponse.json({ error: 'to and reason required' }, { status: 422 });
  const r = transitionTenant(b.to as TenantState, b.reason, b.actor ?? 'L. Mwakio');
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ lifecycle: r });
}
