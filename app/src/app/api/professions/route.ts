// GET /api/professions — the register of regulated professionals for the
// regulators and auditors with a purpose: ?number= one full record (person
// reference, qualifications, every step); ?person= a person's registrations;
// ?profession= a list; with none, counts per profession and standing. A
// regulator reads the professions it keeps. Every search and read, allowed
// or refused, is in the access log. Anyone can check standing publicly at
// /api/registers/professionals. Changes only through decided cases.
import { NextRequest, NextResponse } from 'next/server';
import { caseScope } from '@/lib/auth/official';
import { canReadProfessionals } from '@/lib/auth/roles';
import { authorityFor } from '@/lib/data/store';
import { ownerInstitution } from '@/lib/casework/packages';
import { getProfessional, listProfessionals, professions, professionCounts } from '@/lib/professions/register';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const number = q.get('number') ?? undefined, person = q.get('person') ?? undefined, profession = q.get('profession') ?? undefined;
  const purpose = q.get('purpose') ?? undefined;
  const s = await caseScope();
  // The professions this official's institution keeps (all of them for an auditor with a purpose).
  const kept = (inst?: string) => professions().filter(p => ownerInstitution(p.authority, authorityFor) === inst).map(p => p.key);
  let allowed: string[] | 'all' = 'all';
  if (s) {
    const why = canReadProfessionals(s, kept(s.institution), purpose);
    if (number || person || profession || why) recordAccess({ ...accessBy(s), record: { register: 'professions', ...(number ? { id: number } : { query: person ? 'person=…' : profession ? `profession=${profession}` : '(counts)' }) }, action: why ? 'refused' : number ? 'view' : 'search', ...(purpose ? { purpose } : {}), result: why ? 'refused' : 'allowed', ...(why ? { rule: why } : {}) });
    if (why) return NextResponse.json({ error: why }, { status: 403 });
    if (s.role !== 'auditor') allowed = kept(s.institution);
  }
  const may = (key: string) => allowed === 'all' || allowed.includes(key);
  const counts = Object.fromEntries(Object.entries(professionCounts()).filter(([k]) => may(k)));
  if (number) { const e = getProfessional(number); return e && may(e.profession) ? NextResponse.json({ counts, professionals: [e] }) : NextResponse.json({ error: 'No such registration on a register you keep' }, { status: 404 }); }
  if (person || profession) return NextResponse.json({ counts, professionals: listProfessionals({ ...(person ? { personRef: person } : {}), ...(profession ? { profession } : {}) }).filter(e => may(e.profession)) });
  return NextResponse.json({ counts, professions: professions().filter(p => may(p.key)) });
}
