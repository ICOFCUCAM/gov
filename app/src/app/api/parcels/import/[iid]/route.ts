// Withdraw a parcel load: POST { action: "withdraw", reason } withdraws every
// parcel the load recorded and not yet withdrawn (each its own version and
// audit entry), by an official who can sign at the cadastre authority.
import { NextRequest, NextResponse } from 'next/server';
import { parcelPolicy, withdrawParcelImport } from '@/lib/data/parcels';
import { refusal, withOfficial } from '@/lib/auth/official';
import { canCertifyParcel } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ iid: string }> }) {
  const params = await props.params;
  const refused = await refusal(s => canCertifyParcel(s, parcelPolicy().authorityId));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { action?: string; reason?: string; by?: string };
  if (b.action !== 'withdraw') return NextResponse.json({ error: 'Say what to do: withdraw' }, { status: 422 });
  const r = withdrawParcelImport(params.iid, b.reason, b.by ?? '');
  if ('error' in r) return NextResponse.json(r, { status: /No such/.test(r.error) ? 404 : 422 });
  return NextResponse.json({ import: r });
}
