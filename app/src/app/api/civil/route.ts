// GET /api/civil — the civil register (lib/civil/register.ts): search persons
// (?family=&given=&birthDate=&registration=) or open one event
// (?event=<registration number>), for the civil registration authority's
// officials and auditors with a purpose (canReadCivil()). Every search and
// read, allowed or refused, is written to the access log. Changes happen
// only through decided civil registration cases (/api/cases).
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { canReadCivil } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { searchPersons, getEvent, registerSize } from '@/lib/civil/register';
import { recordAccess } from '@/lib/records/access-log';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const s = await caseScope();
  const purpose = q.get('purpose') ?? undefined;
  const event = q.get('event');
  const query = event ? undefined : ['family', 'given', 'birthDate', 'registration'].map(k => q.get(k) ? `${k}=${q.get(k)}` : '').filter(Boolean).join('&');
  if (s) {
    const why = canReadCivil(s, authorityFor('civilRegistration'), purpose);
    recordAccess({ by: { id: s.id, name: s.label, ...(s.institution ? { institution: s.institution } : {}) }, record: { register: 'civil', ...(event ? { id: event } : { query: query || '(all)' }) }, action: why ? 'refused' : event ? 'view' : 'search', ...(purpose ? { purpose } : {}), result: why ? 'refused' : 'allowed', ...(why ? { rule: why } : {}) });
    if (why) return NextResponse.json({ error: why }, { status: 403 });
  }
  if (event) {
    const e = getEvent(event);
    return e ? NextResponse.json({ event: e }) : NextResponse.json({ error: 'No such registration' }, { status: 404 });
  }
  if (!query) return NextResponse.json({ size: registerSize(), persons: [] });
  return NextResponse.json({ size: registerSize(), persons: searchPersons({ family: q.get('family') ?? undefined, given: q.get('given') ?? undefined, birthDate: q.get('birthDate') ?? undefined, registration: q.get('registration') ?? undefined }) });
}
