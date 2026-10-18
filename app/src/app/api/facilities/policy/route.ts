// The nation's facility policy: who certifies a site's location (the owning
// institution, the national mapping agency, or both in turn), which body sets
// each category's sensitivity and under which law, the capture methods it
// accepts, and how far restricted sites are generalised. GET: the policy and
// its changes. POST { patch, reason }: an administrator proposes a change; a
// different administrator confirms it (/api/facilities/policy/{id}).
import { NextRequest, NextResponse } from 'next/server';
import { facilityPolicy, mappingAgency, policyChanges, proposePolicyChange, type PolicyChange } from '@/lib/data/facilities';
import { withOfficial } from '@/lib/auth/official';
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ policy: facilityPolicy(), mappingAgency: mappingAgency(), changes: policyChanges() });
}

export async function POST(req: NextRequest) {
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { patch?: PolicyChange['patch']; reason?: string; by?: string };
  const r = proposePolicyChange(b, b.by ?? '');
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ change: r }, { status: 201 });
}
