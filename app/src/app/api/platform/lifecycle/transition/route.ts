import { NextRequest, NextResponse } from 'next/server';
import { transitionTenant } from '@/lib/data/store';
import { withOfficial } from '@/lib/auth/official';
import type { TenantState } from '@/lib/api/types';
import { actingName } from '@/lib/casework/actor';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  let raw: { to?: string; reason?: string; actor?: string; by?: string };
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  // A signed-in official's verified name replaces any name in the request.
  const b = await withOfficial(raw);
  if (!b.to || !b.reason) return NextResponse.json({ error: 'to and reason required' }, { status: 422 });
  const r = transitionTenant(b.to as TenantState, b.reason, await actingName(b.by ?? b.actor));
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ lifecycle: r });
}
