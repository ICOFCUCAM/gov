import { NextRequest, NextResponse } from 'next/server';
import { proposeGrant } from '@/lib/data/store';
import { parseUsagePolicy } from '@/lib/exchange/usage-policy';
import { withOfficial } from '@/lib/auth/official';
export const dynamic = 'force-dynamic';
// POST { toTenant, scopes, reason, expiresAt?, policy: { purposes, retentionDays, onwardSharing } }.
// The usage policy is required for new proposals and is enforced at every exchange.
export async function POST(req: NextRequest) {
  let b: { toTenant?: string; scopes?: string[]; reason?: string; expiresAt?: string; policy?: unknown; by?: string };
  try { b = await withOfficial(await req.json()); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!b.toTenant || !b.scopes?.length || !b.reason) {
    return NextResponse.json({ error: 'toTenant, scopes, reason required' }, { status: 422 });
  }
  const policy = parseUsagePolicy(b.policy);
  if ('error' in policy) return NextResponse.json(policy, { status: 422 });
  const r = proposeGrant({ toTenant: b.toTenant, scopes: b.scopes, reason: b.reason, expiresAt: b.expiresAt, policy, by: b.by });
  if ('error' in r) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ grant: r }, { status: 201 });
}
