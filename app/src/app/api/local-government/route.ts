// /api/local-government — local and regional governments (plan step I7;
// lib/localgov). Each is an institution of standing `subnational`, outside
// whole-government reach: its council's rules, resolutions, budgets and
// service requests are its own, changed only by its own officials and its own
// procedures (lg.<template>.<institution>, worked through /api/cases).
//
// GET: the local governments (institutions recorded as subnational), each
// with its council rules in force, counts and whether it has adopted its
// procedures. ?institution=<id>[&purpose=…]: its records (rules, certified
// resolutions, adopted budgets, service requests by place, never a
// description): for its own officials; for anyone else only under an approved
// audit or request-information relationship covering the purpose, the read
// logged with the relationship; refused otherwise, the refusal logged.
//
// POST (that local government's own officials only; checked here):
//   { op: 'adopt-procedures', institution }  draft its procedures from the templates (an official who can sign there)
//   { op: 'propose-rules', institution, seats, quorum: { kind: 'count' | 'fraction', value }, majority, legalBasis }
//   { op: 'confirm-rules', institution }  a different official who can sign there
//   { op: 'withdraw-rules', institution, reason }
import { NextRequest, NextResponse } from 'next/server';
import { currentOfficial, actorLabel, refusal, withOfficial } from '@/lib/auth/official';
import { readRelationship, relationshipRule, roleOf, type Scope } from '@/lib/auth/roles';
import { getMinistry, institutionBounds } from '@/lib/data/store';
import { listPackages } from '@/lib/casework/packages';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';
import { MAJORITIES, councilRules, councilRuleChanges, localCounts, localRecords, proposeCouncilRules, confirmCouncilRules, withdrawCouncilRules } from '@/lib/localgov/register';
import { LOCAL_GOVERNMENT_TEMPLATES, installLocalGovernmentProcedures, localKey } from '@/lib/localgov/procedures';
import '@/lib/casework/modules';

export const dynamic = 'force-dynamic';

const RECORD_TYPES = LOCAL_GOVERNMENT_TEMPLATES.map(t => t.key);

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('institution')?.trim();
  if (id) {
    const m = getMinistry(id);
    if (!m || !institutionBounds().subnational?.includes(id)) return NextResponse.json({ error: 'No such local government' }, { status: 404 });
    const o = await currentOfficial();
    if (o && o.institution !== id) {
      // The centre, or another institution: only under an approved relationship, for its purpose; never by serving the whole government.
      const purpose = req.nextUrl.searchParams.get('purpose')?.trim() ?? '';
      const grant = readRelationship(o, id, [...RECORD_TYPES, ...RECORD_TYPES.map(k => localKey(k, id)), 'local-records'], purpose);
      const by = accessBy({ id: o.sub, label: actorLabel(o), institution: o.institution });
      if (!grant) {
        const why = 'This is a regional or local government with its own powers: only its own officials read its records; another institution reads them only under an approved relationship, for its purpose';
        recordAccess({ ...by, record: { register: 'local-government', id }, action: 'refused', result: 'refused', rule: why, ...(purpose ? { purpose } : {}) });
        return NextResponse.json({ error: why }, { status: 403 });
      }
      recordAccess({ ...by, record: { register: 'local-government', id }, action: 'view', result: 'allowed', purpose, rule: relationshipRule(grant) });
    }
    const r = localRecords(id);
    return NextResponse.json({ institution: { id, name: m.name }, ...r, ruleChanges: councilRuleChanges(id), counts: localCounts(id) });
  }
  const ids = institutionBounds().subnational ?? [];
  return NextResponse.json({
    localGovernments: ids.map(i => ({
      id: i, name: getMinistry(i)?.name ?? i, rules: councilRules(i), counts: localCounts(i),
      procedures: LOCAL_GOVERNMENT_TEMPLATES.map(t => { const key = localKey(t.key, i); return { template: t.key, key, title: t.title, forms: t.forms, versions: listPackages({ key }).map(v => ({ version: v.version, state: v.state })) }; }),
    })),
    templates: LOCAL_GOVERNMENT_TEMPLATES.map(t => ({ key: t.key, title: t.title, forms: t.forms })),
    majorities: MAJORITIES, counts: localCounts(),
  });
}

/** Only the local government's own officials (never whole-government scope); confirming and adopting procedures: one who can sign there. */
const own = (institution: string, sign: boolean) => (s: Scope): string | null => {
  if (!institutionBounds().subnational?.includes(institution)) return 'No such local government (an institution recorded as subnational)';
  if (s.institution !== institution) return 'This is a regional or local government with its own powers: only its own officials change its rules and procedures';
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (sign && role !== 'signatory' && role !== 'administrator') return 'An official who can sign at this local government does this';
  return null;
};

export async function POST(req: NextRequest) {
  const b = (await withOfficial(await req.json().catch(() => ({})))) as Record<string, unknown> & { by?: string };
  const institution = typeof b.institution === 'string' ? b.institution.trim() : '';
  const by = String(b.by ?? '').trim();
  const byId = (await currentOfficial())?.sub;
  const done = (r: unknown) => (r && typeof r === 'object' && 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ result: r, rules: councilRules(institution), ruleChanges: councilRuleChanges(institution) }));
  const sign = b.op === 'confirm-rules' || b.op === 'adopt-procedures';
  const refused = await refusal(own(institution, sign), { register: 'local-government', id: institution || 'none' });
  if (refused) return refused;
  if (!by) return NextResponse.json({ error: 'Name the official acting' }, { status: 422 });
  switch (b.op) {
    case 'adopt-procedures': return done(installLocalGovernmentProcedures(institution, by, byId));
    case 'propose-rules': return done(proposeCouncilRules(institution, { seats: b.seats, quorum: b.quorum, majority: b.majority, legalBasis: b.legalBasis }, by, byId));
    case 'confirm-rules': return done(confirmCouncilRules(institution, by, byId));
    case 'withdraw-rules': return done(withdrawCouncilRules(institution, by, typeof b.reason === 'string' ? b.reason : undefined));
    default: return NextResponse.json({ error: 'op is adopt-procedures, propose-rules, confirm-rules or withdraw-rules' }, { status: 400 });
  }
}
