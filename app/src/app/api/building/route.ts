// /api/building — planning and building control, and housing (plan step I7;
// lib/building, lib/housing). Planning applications, building permits and
// housing applications run as cases through /api/cases under the approved
// procedures of the institutions the nation names (the `buildingControl` and
// `housing` slots); this route reads what they recorded and carries the
// nation's building control rules.
//
// GET: the institutions named, the rules in force (categories, uses,
// inspection checklists, severities: none ship) with a waiting change, the
// counts and the latest planning decisions, permits (their permit,
// construction and occupancy states apart), inspections and stop-work orders,
// and the housing programmes with their terms and homes (never an applicant).
// ?parcel=<record number or national parcel id>: the planning decisions and
// permits on that parcel. ?case=<id>: the permit of that case with its
// design versions, inspections and stop-work orders.
//
// POST (an official of the building control authority; checked here):
//   { op: 'propose-rules', categories, uses, checklists: [{ stage, items }], severities, legalBasis: [{ instrument, eId }] }
//   { op: 'confirm-rules' }   a different official who can sign there (two officials, every version kept)
//   { op: 'withdraw-rules', reason }
import { NextRequest, NextResponse } from 'next/server';
import { currentOfficial, refusal, withOfficial } from '@/lib/auth/official';
import { roleOf, type Scope } from '@/lib/auth/roles';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { getParcel } from '@/lib/data/parcels';
import { listPackages } from '@/lib/casework/packages';
import {
  buildingRules, buildingRuleChanges, buildingRegister, buildingCounts, planningOnParcel, permitsOnParcel, permitOfCase, inspectionsOf, stopOrdersOf,
  proposeBuildingRules, confirmBuildingRules, withdrawBuildingRules, PERMIT_STATE_LABEL, CONSTRUCTION_STATE_LABEL, OCCUPANCY_STATE_LABEL, RESULTS,
} from '@/lib/building/register';
import { listProgrammes, housingCounts } from '@/lib/housing/register';
import { BUILDING_PROCEDURES } from '@/lib/building/procedures';
import { HOUSING_PROCEDURES } from '@/lib/housing/procedures';
import '@/lib/casework/modules';

export const dynamic = 'force-dynamic';

const named = (slot: 'buildingControl' | 'housing') => { const id = authorityFor(slot); return id ? { id, name: getMinistry(id)?.name ?? id } : null; };
const labels = { permit: PERMIT_STATE_LABEL, construction: CONSTRUCTION_STATE_LABEL, occupancy: OCCUPANCY_STATE_LABEL, results: RESULTS };
const procedures = () => [...BUILDING_PROCEDURES, ...HOUSING_PROCEDURES].map(p => ({ key: p.key, title: p.title, owner: p.owner, versions: listPackages({ key: p.key }).map(v => ({ version: v.version, state: v.state })) }));

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const pid = q.get('parcel')?.trim();
  if (pid) {
    const p = getParcel(pid);
    if (!p) return NextResponse.json({ error: 'No such parcel' }, { status: 404 });
    return NextResponse.json({ parcel: { id: p.id, parcelId: p.parcelId, version: p.versions.length }, planning: planningOnParcel(p.id), permits: permitsOnParcel(p.id), labels });
  }
  const cid = q.get('case')?.trim();
  if (cid) {
    const permit = permitOfCase(cid);
    if (!permit) return NextResponse.json({ error: 'No permit is recorded for this case' }, { status: 404 });
    return NextResponse.json({ permit, inspections: inspectionsOf(permit.number), stops: stopOrdersOf(permit.number), labels });
  }
  // Housing programmes with their terms and homes; applications are counted, never listed here (applicants are personal data).
  const programmes = listProgrammes().map(p => ({ number: p.number, title: p.title, state: p.state, terms: p.terms, units: p.units.map(u => ({ ref: u.ref, region: u.region, parcel: u.parcel, rooms: u.rooms, state: u.state })), ...(p.sample ? { sample: true } : {}) }));
  return NextResponse.json({
    buildingControl: named('buildingControl'), housing: named('housing'),
    rules: buildingRules(), ruleChanges: buildingRuleChanges(), counts: { ...buildingCounts(), housing: housingCounts() },
    ...buildingRegister(50), programmes, procedures: procedures(), labels,
  });
}

/** Proposing the rules: an official of the building control authority who is not an auditor; confirming them: one who can sign there. */
const keeperRule = (sign: boolean) => (s: Scope): string | null => {
  const id = authorityFor('buildingControl');
  if (!id) return 'The nation has not named its planning and building control authority (Who is responsible)';
  if (s.institution !== id) return 'Only officials of the planning and building control authority change its rules';
  const role = roleOf(s);
  if (role === 'auditor') return 'Auditors can read records but not change them';
  if (sign && role !== 'signatory' && role !== 'administrator') return 'The rules are confirmed by an official who can sign at the building control authority';
  return null;
};

export async function POST(req: NextRequest) {
  const b = (await withOfficial(await req.json().catch(() => ({})))) as Record<string, unknown> & { by?: string };
  const by = String(b.by ?? '').trim();
  // The person behind the name: the signed-in official's own account (never an id from the request), compared as persons by the two-official check.
  const byId = (await currentOfficial())?.sub;
  const done = (r: unknown) => (r && typeof r === 'object' && 'error' in r ? NextResponse.json(r, { status: 422 }) : NextResponse.json({ result: r, rules: buildingRules(), ruleChanges: buildingRuleChanges() }));
  switch (b.op) {
    case 'propose-rules': {
      const refused = await refusal(keeperRule(false));
      if (refused) return refused;
      if (!by) return NextResponse.json({ error: 'Name the official proposing the rules' }, { status: 422 });
      return done(proposeBuildingRules({ categories: b.categories, uses: b.uses, checklists: b.checklists, severities: b.severities, legalBasis: b.legalBasis }, by, byId));
    }
    case 'confirm-rules': {
      const refused = await refusal(keeperRule(true));
      if (refused) return refused;
      if (!by) return NextResponse.json({ error: 'Name the official confirming the rules' }, { status: 422 });
      return done(confirmBuildingRules(by, byId));
    }
    case 'withdraw-rules': {
      const refused = await refusal(keeperRule(false));
      if (refused) return refused;
      return done(withdrawBuildingRules(by || 'Official', typeof b.reason === 'string' ? b.reason : undefined));
    }
    default: return NextResponse.json({ error: 'op is propose-rules, confirm-rules or withdraw-rules' }, { status: 400 });
  }
}
