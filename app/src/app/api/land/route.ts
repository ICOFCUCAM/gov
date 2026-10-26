// /api/land — the land registry's transactions and disputes (plan step I7;
// lib/land). Dealings and disputes run as cases through /api/cases under the
// land registry's approved procedures (lib/land/procedures.ts); this route
// reads what they recorded.
//
// GET: the land registry the nation named (the `landRegistry` slot, empty by
// default) and the cadastre authority of the parcel policy, the counts, the
// reference procedures and their state, and the latest transactions and
// disputes by parcel and interest reference only (never a party, a holder or
// the grounds).
// ?parcel=<record number or national parcel id>: that parcel's transactions,
// disputes and the interests a dispute holds now. Parties, grounds and the
// interests' types only for those who may see rights and holders
// (canSeeParcelRights(): the cadastre authority and the land registry, and
// whole-government administrators and auditors), every such read written to
// the access log by reference only.
import { NextRequest, NextResponse } from 'next/server';
import { currentOfficial, actorLabel } from '@/lib/auth/official';
import { canSeeParcelRights } from '@/lib/auth/roles';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { cadastreAuthority, getParcel, rightRefs, rightsKeepers, RIGHT_TYPES } from '@/lib/data/parcels';
import { listPackages } from '@/lib/casework/packages';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';
import { DISPUTE_KINDS, TRANSACTION_KINDS, disputesOf, landCounts, recentLand, transactionsOf, viewDispute, viewTransaction } from '@/lib/land/register';
import { LAND_PROCEDURES } from '@/lib/land/procedures';
import '@/lib/casework/modules';

export const dynamic = 'force-dynamic';

const labels = { transactions: TRANSACTION_KINDS, disputes: DISPUTE_KINDS, rightTypes: RIGHT_TYPES.map(r => ({ key: r.key, label: r.label })) };

export async function GET(req: NextRequest) {
  const o = await currentOfficial();
  const sees = !!o && !canSeeParcelRights(o, rightsKeepers());
  const pid = req.nextUrl.searchParams.get('parcel')?.trim();
  if (pid) {
    const p = getParcel(pid);
    if (!p) return NextResponse.json({ error: 'No such parcel' }, { status: 404 });
    if (o && sees) recordAccess({ ...accessBy({ id: o.sub, label: actorLabel(o), institution: o.institution }), record: { register: 'land', id: p.id }, action: 'view', result: 'allowed', rule: 'parties to land transactions and disputes (canSeeParcelRights)' });
    return NextResponse.json({
      parcel: { id: p.id, parcelId: p.parcelId, state: p.state, version: p.versions.length },
      transactions: transactionsOf(p.id).map(t => viewTransaction(t, { parties: sees })),
      disputes: disputesOf(p.id).map(d => viewDispute(d, { parties: sees })),
      held: (p.freezes ?? []).map(f => ({ ...f })),
      // The interests' references and types only for those who may see rights: a mortgage on a person's land is theirs.
      ...(sees ? { interests: rightRefs(p) } : { interestsCount: p.rights.length }),
      seesParties: sees, labels,
    });
  }
  const registry = authorityFor('landRegistry');
  const recent = recentLand(50);
  return NextResponse.json({
    registry: registry ? { id: registry, name: getMinistry(registry)?.name ?? registry } : null,
    cadastre: cadastreAuthority(),
    counts: landCounts(),
    procedures: LAND_PROCEDURES.map(p => ({ key: p.key, title: p.title, versions: listPackages({ key: p.key }).map(v => ({ version: v.version, state: v.state })) })),
    transactions: recent.transactions.map(t => viewTransaction(t, { parties: false })),
    disputes: recent.disputes.map(d => viewDispute(d, { parties: false })),
    seesParties: sees, labels,
  });
}
