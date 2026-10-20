// GET /api/organisations/{id or number} — one organisation. Its full record
// (representatives, every version, every step of each standing with the case
// and decision behind it) for those canReadOrganisation() allows, with the
// read written to the access log; its public view for every other official.
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { canReadOrganisation } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { ownerInstitution } from '@/lib/casework/packages';
import { getOrganisation, publicOrganisation, registerType } from '@/lib/organisations/register';
import { recordAccess } from '@/lib/records/access-log';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = getOrganisation(decodeURIComponent(id));
  if (!o) return NextResponse.json({ error: 'No such organisation' }, { status: 404 });
  const s = await caseScope();
  if (!s) return NextResponse.json({ organisation: o, full: true });
  const keepers = o.standings.map(x => registerType(x.register)).map(t => (t ? ownerInstitution(t.authority, authorityFor) : undefined)).filter((x): x is string => !!x);
  const purpose = req.nextUrl.searchParams.get('purpose') ?? undefined;
  const why = canReadOrganisation(s, keepers, purpose);
  if (why) return NextResponse.json({ organisation: publicOrganisation(o), full: false, why });
  recordAccess({ by: { id: s.id, name: s.label, ...(s.institution ? { institution: s.institution } : {}) }, record: { register: 'organisations', id: o.number }, action: 'view', ...(purpose ? { purpose } : {}), result: 'allowed' });
  return NextResponse.json({ organisation: o, full: true });
}
