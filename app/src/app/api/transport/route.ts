// /api/transport — vehicles, driving licences, road works and transport
// operators (plan step I7; lib/transport). Each runs as cases through
// /api/cases under the approved procedures of the body the nation names for
// it (vehicleRegistration, roadAuthority, transportRegulator). GET: the
// bodies named, counts, the procedures and their state, and the registers as
// lists carry them: never a keeper, a licence holder or a medical reference.
import { NextResponse } from 'next/server';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { listPackages } from '@/lib/casework/packages';
import { transportCounts, transportRegister } from '@/lib/transport/register';
import { TRANSPORT_PROCEDURES } from '@/lib/transport/procedures';
import '@/lib/casework/modules';

export const dynamic = 'force-dynamic';

const named = (slot: 'vehicleRegistration' | 'roadAuthority' | 'transportRegulator') => { const id = authorityFor(slot); return id ? { id, name: getMinistry(id)?.name ?? id } : null; };

export async function GET() {
  return NextResponse.json({
    bodies: { vehicleRegistration: named('vehicleRegistration'), roadAuthority: named('roadAuthority'), transportRegulator: named('transportRegulator') },
    counts: transportCounts(), ...transportRegister(50),
    procedures: TRANSPORT_PROCEDURES.map(p => ({ key: p.key, title: p.title, owner: p.owner, versions: listPackages({ key: p.key }).map(v => ({ version: v.version, state: v.state })) })),
  });
}
