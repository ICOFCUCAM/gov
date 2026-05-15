import { NextRequest, NextResponse } from 'next/server';
import { proposeGrant } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  let b: { toTenant?: string; scopes?: string[]; reason?: string; expiresAt?: string };
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!b.toTenant || !b.scopes?.length || !b.reason) {
    return NextResponse.json({ error: 'toTenant, scopes, reason required' }, { status: 422 });
  }
  const r = proposeGrant({ toTenant: b.toTenant, scopes: b.scopes, reason: b.reason, expiresAt: b.expiresAt });
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ grant: r }, { status: 201 });
}
