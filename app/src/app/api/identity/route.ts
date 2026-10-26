// GET /api/identity — the national identity register (lib/identity/register.ts;
// plan step I6) for the identity authority's officials, and auditors with a
// purpose. Without a search: counts only (records, credentials by status,
// open reviews, determinations, deliveries; no person, no number) and whether
// the authority is named. ?number= (register or credential number),
// ?civilRegistration=, or ?familyName=&birthDate=[&givenNames=]: the matching
// records with their claims, credentials, production and delivery events and
// determinations; every search and read, allowed or refused, is written to the
// access log, and a purpose is needed to search by name (field series Part 4
// §3.2: never inferred from a name alone; numbers masked in lists, ?masked=1).
// Changes happen only through decided identity cases (/api/cases); other
// institutions verify through the exchange (identity.verify), never this file.
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { canReadIdentity } from '@/lib/auth/roles';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { findIdentities, identityCounts, listedIdentity, CREDENTIAL_STATE_LABEL, VERIFY_MEANING, DETERMINATIONS } from '@/lib/identity/register';
import { IDENTITY_PROCEDURES } from '@/lib/identity/procedures';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const get = (k: string) => q.get(k)?.trim() || undefined;
  const number = get('number'), civilRegistration = get('civilRegistration'), familyName = get('familyName'), birthDate = get('birthDate'), givenNames = get('givenNames');
  const purpose = get('purpose');
  const byName = !number && !civilRegistration && !!familyName && !!birthDate;
  const searching = !!number || !!civilRegistration || byName;
  const authority = authorityFor('identity');
  const s = await caseScope();
  if (s) {
    let why = canReadIdentity(s, authority, purpose);
    // A search by name and date of birth is a broad search: it states its purpose (directions 15.2).
    if (!why && byName && !purpose) why = 'Say why you search by name and date of birth';
    if (searching || why) recordAccess({ ...accessBy(s), record: { register: 'identity', ...(number ? { id: number } : { query: civilRegistration ? 'civil registration link' : byName ? 'names and date of birth' : '(counts)' }) }, action: why ? 'refused' : number ? 'view' : 'search', ...(purpose ? { purpose } : {}), result: why ? 'refused' : 'allowed', ...(why ? { rule: why } : {}) });
    if (why) return NextResponse.json({ error: why }, { status: 403 });
  }
  const meta = {
    authority: authority ? { id: authority, name: getMinistry(authority)?.name ?? authority } : null,
    procedures: IDENTITY_PROCEDURES.map(p => ({ key: p.key, title: p.title })),
    labels: { credentialStates: CREDENTIAL_STATE_LABEL, verify: VERIFY_MEANING, determinations: DETERMINATIONS },
  };
  if (!searching) return NextResponse.json({ ...meta, counts: identityCounts(), records: [] });
  const found = findIdentities({ number, civilRegistration, familyName, givenNames, birthDate });
  return NextResponse.json({ ...meta, counts: identityCounts(), records: q.get('masked') === '1' ? found.map(listedIdentity) : found });
}
