// The nation's parcel policy: its cadastre authority (an institution of the
// registry), the national parcel id format, whether an overlap with a
// published parcel is refused or flagged and above what area, and the survey
// methods it accepts. GET: the policy and its changes. POST { patch, reason }:
// an administrator proposes a change; a different administrator confirms it
// (/api/parcels/policy/{id}). Administrators only (ADMIN_ONLY in lib/auth/roles.ts).
import { NextRequest, NextResponse } from 'next/server';
import { cadastreAuthority, parcelPolicy, parcelPolicyChanges, proposeParcelPolicyChange, type ParcelPolicyChange } from '@/lib/data/parcels';
import { withOfficial } from '@/lib/auth/official';
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ policy: parcelPolicy(), authority: cadastreAuthority(), changes: parcelPolicyChanges() });
}

export async function POST(req: NextRequest) {
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { patch?: ParcelPolicyChange['patch']; reason?: string; by?: string };
  const r = proposeParcelPolicyChange(b, b.by ?? '');
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ change: r }, { status: 201 });
}
