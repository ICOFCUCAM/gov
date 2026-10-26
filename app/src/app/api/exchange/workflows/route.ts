// /api/exchange/workflows — cross-institution workflow (plan I9,
// lib/federation/procedures.ts): requests, consultations, handovers, tasks,
// decision requests, dependencies, disputes, agreements, onboarding, access
// and exceptions as cases of the receiving institution's own procedures,
// never binding orders. GET: the templates, the forms each carries, and how
// far each institution has adopted them (drafted, approved). POST
// { op: 'adopt', institution }: an official who can sign at that institution
// drafts its own procedures from the templates (a different official approves
// each under Laws › Procedures); never whole-government scope for another
// institution. Cases themselves move only through /api/cases.
import { NextRequest, NextResponse } from 'next/server';
import { currentOfficial, refusal, withOfficial } from '@/lib/auth/official';
import { roleOf, type Scope } from '@/lib/auth/roles';
import { getMinistry, listMinistries } from '@/lib/data/store';
import { CROSS_INSTITUTION_PROCEDURES, installCrossInstitutionProcedures, adoptionOf } from '@/lib/federation/procedures';
import '@/lib/casework/modules';

export const dynamic = 'force-dynamic';

export async function GET() {
  const institutions = listMinistries().filter(m => m.status === 'active');
  return NextResponse.json({
    templates: CROSS_INSTITUTION_PROCEDURES.map(t => ({ key: t.key, title: t.title, forms: t.forms, stages: t.stages.map(s => s.label), decisions: t.actions.filter(a => a.decision).map(a => a.label) })),
    adoption: institutions.map(m => ({ institution: m.id, name: m.name, procedures: adoptionOf(m.id) })),
  });
}

/** Only the institution's own officials who can sign (never whole-government scope for another institution). */
const own = (institution: string) => (s: Scope): string | null => {
  if (!getMinistry(institution)) return 'No such institution';
  if (s.institution !== institution) return 'An institution adopts its own procedures: only its own officials do this';
  const role = roleOf(s);
  if (role !== 'signatory' && role !== 'administrator') return 'An official who can sign at this institution (or its administrator) adopts its procedures';
  return null;
};

export async function POST(req: NextRequest) {
  const b = (await withOfficial(await req.json().catch(() => ({})))) as Record<string, unknown> & { by?: string };
  if (b.op !== 'adopt') return NextResponse.json({ error: "op is 'adopt'" }, { status: 400 });
  const institution = typeof b.institution === 'string' ? b.institution.trim() : '';
  const refused = await refusal(own(institution), { register: 'cross-institution-procedures', id: institution || 'none' });
  if (refused) return refused;
  const by = String(b.by ?? '').trim();
  if (!by) return NextResponse.json({ error: 'Name the official acting' }, { status: 422 });
  const r = installCrossInstitutionProcedures(institution, by, (await currentOfficial())?.sub);
  return 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ result: r, procedures: adoptionOf(institution) });
}
