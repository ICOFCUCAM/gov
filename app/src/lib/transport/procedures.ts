// Transport procedures (plan step I7; specification Part 3 §D.10; catalogue
// Part 9 §2.1–2.3, §4.1, §4.3: TRN-VEH-001, TRN-VEH-002, TRN-DRV-001,
// TRN-ROAD-002, TRN-OPS-001). Reference drafts the nation adapts and a second
// official approves; none is approved, none names a body: each belongs to a
// slot of the deployment profile (vehicleRegistration, roadAuthority,
// transportRegulator), empty until the nation names it, and its decisions to
// a proposed, unapproved authority mapping (TRANSPORT_PERMITS).
//
//   transport.vehicle-registration  a vehicle registered with its keepers (TRN-VEH-001)
//   transport.vehicle-transfer      a change of keeper, the earlier one kept in the history (TRN-VEH-002)
//   transport.driving-licence       a driving licence: evidence, the test, the decision (TRN-DRV-001); medical
//                                   fitness only as a sealed document's reference, never a clinical field
//   transport.road-works            a permit for works in a public road, its place from the map and its period (TRN-ROAD-002)
//   transport.operator-licence      an operator's licence for an organisation of the organisations register (TRN-OPS-001)
//
// The vehicle, licence, operator and categories lists are the nation's
// (configured lists, none ship); a licence's validity is set by the deciding
// officials as the law gives it, never a period in code. No score, no AI.

import { registerEffect, registeredEffects, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { authorityFor } from '@/lib/data/store';
import { getDocument } from '@/lib/records/documents';
import { placePoint } from '@/lib/data/facilities';
import { getOrganisation } from '@/lib/organisations/register';
import { nationRegions } from '@/lib/nation/registry';
import { VIN, vehicleByVin, vehicleByMark, registerVehicle, transferVehicle, issueLicence, grantRoadWorks, licenseOperator, type Keeper } from './register';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';
import type { AuthorityKey } from '@/lib/nation/deployment';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const lines = (v: unknown) => str(v).split(/\n|,/).map(x => x.trim()).filter(Boolean);
const list = (v: unknown) => (Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean) : lines(v));
const sample = (c: Case) => c.source === 'sample';

/** The permit type whose approved mapping governs each family's decisions (lib/permits/decisions.ts). */
export const TRANSPORT_PERMITS: Record<string, string> = {
  'transport.vehicle-': 'vehicle-registration',
  'transport.driving-licence': 'driving-licence',
  'transport.road-works': 'road-works-permit',
  'transport.operator-licence': 'transport-operator-licence',
};

const SLOT: [string, AuthorityKey, string][] = [
  ['transport.vehicle-', 'vehicleRegistration', 'Vehicles are registered by the vehicle and driver licensing authority'],
  ['transport.driving-licence', 'vehicleRegistration', 'Driving licences are issued by the vehicle and driver licensing authority'],
  ['transport.road-works', 'roadAuthority', 'Works in public roads are permitted by the road authority'],
  ['transport.operator-licence', 'transportRegulator', 'Transport operators are licensed by the transport regulator'],
];
function keeper(c: Case): { error: string } | null {
  const s = SLOT.find(([p]) => c.package.key.startsWith(p));
  if (!s) return { error: `${c.package.key} is not a transport procedure` };
  return authorityFor(s[1]) === c.owner ? null : { error: `${s[2]} the nation names under Who is responsible: this institution is not it` };
}
const keepersOf = (c: Case, prefix: string): Keeper[] | { error: string } => {
  const holder = str(c.fields[`${prefix}Name`]);
  if (!holder) return { error: 'Name the keeper' };
  const kind = (str(c.fields[`${prefix}Kind`]) || 'person') as Keeper['holderKind'];
  if (!['person', 'organisation', 'state'].includes(kind)) return { error: 'The keeper is a person, an organisation or the state' };
  return [{ holderKind: kind, holder, ...(str(c.fields[`${prefix}Ref`]) ? { holderRef: str(c.fields[`${prefix}Ref`]) } : {}) }];
};

registerEffect('transport.check-vehicle', ({ case: c }: EffectContext) => {
  const k = keeper(c); if (k) return k;
  const vin = str(c.fields.vin).toUpperCase();
  if (!VIN.test(vin)) return { error: 'The vehicle identification number is 17 letters and digits (ISO 3779; never I, O or Q)' };
  if (vehicleByVin(vin)) return { error: `A vehicle with this identification number is already registered` };
  const kp = keepersOf(c, 'keeper'); if ('error' in kp) return kp;
  return { facts: { vin } };
});

registerEffect('transport.register-vehicle', ({ case: c, now }: EffectContext) => {
  const k = keeper(c); if (k) return k;
  const vin = str(c.fields.vin).toUpperCase(), mark = str(c.fields.registrationMark).toUpperCase();
  if (!VIN.test(vin) || vehicleByVin(vin)) return { error: 'The identification number is not valid or already registered' };
  if (!mark) return { error: 'Give the registration mark assigned' };
  if (vehicleByMark(mark)) return { error: `The mark ${mark} is already on a registered vehicle` };
  const kp = keepersOf(c, 'keeper'); if ('error' in kp) return kp;
  return {
    facts: { mark, category: str(c.fields.vehicleCategory) },
    after: (d, done) => { registerVehicle({ vin, mark, category: str(c.fields.vehicleCategory), make: str(c.fields.make), ...(str(c.fields.model) ? { model: str(c.fields.model) } : {}), keepers: kp, case: c.ref, ...(d ? { decision: d.id } : {}), by: done.history.at(-1)!.by.name, sample: sample(c) }, now); },
  };
});

registerEffect('transport.transfer-vehicle', ({ case: c, now }: EffectContext) => {
  const k = keeper(c); if (k) return k;
  const v = vehicleByMark(str(c.fields.registrationMark));
  if (!v) return { error: `No registered vehicle ${str(c.fields.registrationMark)}` };
  const kp = keepersOf(c, 'newKeeper'); if ('error' in kp) return kp;
  return { facts: { mark: v.mark }, after: (d, done) => { transferVehicle(v.mark, kp, { case: c.ref, ...(d ? { decision: d.id } : {}), by: done.history.at(-1)!.by.name }, now); } };
});

/** Medical fitness, where the law asks for it: only the reference of a sealed document of the case (its id and digest). */
function fitnessOf(c: Case): { document: string; sha256?: string } | undefined {
  const d = c.documents.map(id => getDocument(id)).filter(x => x?.class === 'medical-fitness-certificate').at(-1);
  return d ? { document: d.id, ...(d.versions.at(-1)?.sha256 ? { sha256: d.versions.at(-1)!.sha256 } : {}) } : undefined;
}

registerEffect('transport.issue-licence', ({ case: c, now }: EffectContext) => {
  const k = keeper(c); if (k) return k;
  if (str(c.fields.testResult) !== 'passed') return { error: 'A licence is issued once the required test is passed' };
  const categories = list(c.fields.licenceCategories);
  if (!categories.length) return { error: 'Name the licence categories' };
  const validFrom = str(c.fields.validFrom) || now.toISOString().slice(0, 10), validUntil = str(c.fields.validUntil);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil) || validUntil <= validFrom) return { error: 'Give the date the licence is valid until, as the law sets it (after the date it is valid from)' };
  const fitness = fitnessOf(c);
  if (c.fields.fitnessRequired === true && !fitness) return { error: 'Attach the sealed medical fitness certificate the law requires (its content stays in the document)' };
  return {
    facts: { categories: categories.join(', '), validUntil },
    after: (d, done) => { issueLicence({ holder: { name: str(c.fields.applicantName), ...(str(c.fields.applicantRef) ? { ref: str(c.fields.applicantRef) } : {}) }, categories, restrictions: lines(c.fields.restrictions), validFrom, validUntil, ...(fitness ? { medicalFitness: fitness } : {}), case: c.ref, ...(d ? { decision: d.id } : {}), by: done.history.at(-1)!.by.name, sample: sample(c) }, now); },
  };
});

registerEffect('transport.road-works', async ({ case: c, now }: EffectContext) => {
  const k = keeper(c); if (k) return k;
  const from = str(c.fields.worksFrom), to = str(c.fields.worksTo);
  if (!from || !to || to < from) return { error: 'Give the period of the works: from and to, the end on or after the start' };
  let place: { regionCode?: string; region?: string; districtCode?: string; district?: string; point?: [number, number] };
  if (c.fields.longitude !== undefined && c.fields.longitude !== '' && c.fields.latitude !== undefined && c.fields.latitude !== '') {
    const lng = Number(c.fields.longitude), lat = Number(c.fields.latitude);
    const p = await placePoint({ lng, lat, noun: 'place' });
    if (p.errors.length) return { error: p.errors[0]! };
    if (!p.place.inside) return { error: 'The works lie outside the nation as the map draws it' };
    place = { ...(p.place.regionCode ? { regionCode: p.place.regionCode, region: p.place.region } : {}), ...(p.place.districtCode ? { districtCode: p.place.districtCode, district: p.place.district } : {}), point: [lng, lat] };
  } else if (nationRegions().includes(str(c.fields.region))) place = { region: str(c.fields.region) };
  else return { error: 'Say where: a position on the map, or one of the nation\'s regions' };
  return {
    facts: { road: str(c.fields.roadReference), from, to, closure: c.fields.closureNeeded === true },
    after: d => { grantRoadWorks({ road: str(c.fields.roadReference), place, window: { from, to }, closure: c.fields.closureNeeded === true, promoter: str(c.fields.promoter), conditions: lines(c.fields.conditions), case: c.ref, ...(d ? { decision: d.id } : {}), sample: sample(c) }, now); },
  };
});

registerEffect('transport.license-operator', ({ case: c, now }: EffectContext) => {
  const k = keeper(c); if (k) return k;
  const org = getOrganisation(str(c.fields.organisation));
  if (!org) return { error: 'The operator is an organisation of the organisations register: give its number' };
  const fleet = lines(c.fields.fleetMarks).map(m => m.toUpperCase());
  const unknown = fleet.filter(m => !vehicleByMark(m));
  if (unknown.length) return { error: `Not registered vehicles: ${unknown.join(', ')}` };
  return {
    facts: { organisation: org.number, fleet: fleet.length },
    after: d => { licenseOperator({ organisation: org.number, operatorClass: str(c.fields.operatorClass), fleet, areas: lines(c.fields.serviceAreas), conditions: lines(c.fields.conditions), case: c.ref, ...(d ? { decision: d.id } : {}), sample: sample(c) }, now); },
  };
});

// ── Reference procedures ─────────────────────────────────────────────────────

const adm = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'administrative', ...extra });
const per = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'restricted', ...extra });
const configured = (key: string, label: string, listName: string, what: string, extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type: 'enum', valuesSource: { kind: 'configured', list: listName }, personalDataClass: 'administrative', countryDecision: `The nation's ${what}; none ship`, ...extra });
const base = { reference: true as const, citations: [], notifications: [], deadlines: [] };
const decided = (p: { key: string; title: string; refPrefix: string; owner: AuthorityKey; sensitivity: 'normal' | 'restricted'; fields: FieldSpec[]; documents: CasePackage['documents']; checkFields: string[]; checkDocs: string[]; checkEffect?: string; middle?: { key: string; label: string; fields: string[]; docs: string[] }; decisionFields: string[]; decision: string; effect: string; noun: string }): Ref => ({
  ...base, key: p.key, version: 1, title: p.title, refPrefix: p.refPrefix, owner: p.owner, sensitivity: p.sensitivity, retention: 'transport-record',
  fields: p.fields, documents: p.documents,
  stages: [
    { key: 'received', label: 'Received' }, ...(p.middle ? [{ key: 'examination', label: p.middle.label }] : []), { key: 'decision', label: 'Waiting for the decision' },
    { key: 'granted', label: `${p.noun}: decided and recorded`, terminal: true }, { key: 'not-granted', label: 'Refused, with reasons', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
  ],
  actions: [
    { key: 'check', label: 'Check the application and its evidence', from: ['received'], to: p.middle ? 'examination' : 'decision', needs: { role: 'officer' }, requires: { fields: p.checkFields, documents: p.checkDocs }, ...(p.checkEffect ? { effects: [p.checkEffect] } : {}) },
    ...(p.middle ? [{ key: p.middle.key, label: p.middle.label, from: ['examination'], to: 'decision', needs: { role: 'officer' as const }, requires: { fields: p.middle.fields, documents: p.middle.docs, reasons: true } }] : []),
    { key: 'grant', label: `Decide: ${p.noun.toLowerCase()} (a second official confirms)`, from: ['decision'], to: 'granted', decision: p.decision, needs: { role: 'signatory', fourEyes: true }, requires: { fields: p.decisionFields, reasons: true }, effects: [p.effect] },
    { key: 'refuse', label: 'Refuse, with reasons and the review route', from: ['decision'], to: 'not-granted', decision: 'refuse', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'withdraw', label: 'Withdrawn by the applicant', from: ['received', ...(p.middle ? ['examination'] : []), 'decision'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  tests: [{ name: 'checked and decided', steps: [
    { action: 'check', expect: 'refused' },
    { action: 'check', fields: Object.fromEntries(p.checkFields.map(f => [f, 'x'])), documents: p.checkDocs, expect: p.middle ? 'examination' : 'decision' },
    ...(p.middle ? [{ action: p.middle.key, fields: Object.fromEntries(p.middle.fields.map(f => [f, 'x'])), documents: p.middle.docs, expect: 'decision' }] : []),
    { action: 'grant', fields: Object.fromEntries(p.decisionFields.map(f => [f, 'x'])), expect: 'granted' },
  ] }],
});

const KEEPER = (prefix: string, who: string): FieldSpec[] => [
  per(`${prefix}Name`, `${who}: name`), adm(`${prefix}Kind`, `${who}: a person, an organisation or the state`, 'choice', { options: ['person', 'organisation', 'state'] }), per(`${prefix}Ref`, `${who}: identity or organisation number`),
];

export const TRANSPORT_PROCEDURES: Ref[] = [
  decided({ key: 'transport.vehicle-registration', title: 'Vehicle registration', refPrefix: 'VREG', owner: 'vehicleRegistration', sensitivity: 'restricted', noun: 'Vehicle registered',
    fields: [adm('vin', 'Vehicle identification number (17 characters)'), adm('make', 'Make'), adm('model', 'Model'), configured('vehicleCategory', 'Vehicle category', 'transport.country.vehicle_categories', 'vehicle classification (e.g. following UNECE categories)'),
      ...KEEPER('keeper', 'Keeper'), adm('importReference', 'Customs release reference, for an imported vehicle'), adm('inspectionResult', 'Result of the inspection', 'choice', { options: ['passed', 'failed', 'not-required'] }), adm('registrationMark', 'Registration mark assigned (in the nation\'s format)')],
    documents: [{ class: 'ownership-evidence', label: 'Evidence of ownership or lawful keeping', required: true }, { class: 'inspection-record', label: 'Inspection or roadworthiness record', required: false }, { class: 'customs-clearance', label: 'Customs clearance, for an imported vehicle', required: false }],
    checkFields: ['vin', 'make', 'vehicleCategory', 'keeperName'], checkDocs: ['ownership-evidence'], checkEffect: 'transport.check-vehicle',
    middle: { key: 'record-inspection', label: 'Inspection recorded', fields: ['inspectionResult'], docs: [] },
    decisionFields: ['registrationMark'], decision: 'register', effect: 'transport.register-vehicle' }),
  decided({ key: 'transport.vehicle-transfer', title: 'Change of vehicle keeper', refPrefix: 'VTRF', owner: 'vehicleRegistration', sensitivity: 'restricted', noun: 'Keeper changed',
    fields: [adm('registrationMark', 'Registration mark'), ...KEEPER('newKeeper', 'New keeper')],
    documents: [{ class: 'transfer-instrument', label: 'The sale or transfer document, signed by both', required: true }],
    checkFields: ['registrationMark', 'newKeeperName'], checkDocs: ['transfer-instrument'], decisionFields: [], decision: 'register-transfer', effect: 'transport.transfer-vehicle' }),
  decided({ key: 'transport.driving-licence', title: 'Driving licence', refPrefix: 'DLIC', owner: 'vehicleRegistration', sensitivity: 'restricted', noun: 'Licence issued',
    fields: [per('applicantName', 'Applicant: name'), per('applicantRef', 'Applicant: identity number'), configured('licenceCategories', 'Licence categories', 'transport.country.licence_categories', 'licence categories (e.g. following the Vienna Convention)', { multiple: true }),
      adm('testResult', 'Result of the driving test', 'choice', { options: ['passed', 'failed'] }), adm('fitnessRequired', 'The law requires a medical fitness certificate for these categories', 'boolean'),
      adm('validFrom', 'Valid from', 'date'), adm('validUntil', 'Valid until (as the law sets it)', 'date'), adm('restrictions', 'Restrictions on the licence (one per line)', 'longtext')],
    documents: [{ class: 'identity-evidence', label: 'Identity evidence seen', required: true }, { class: 'test-record', label: 'Record of the driving test', required: false }, { class: 'medical-fitness-certificate', label: 'Medical fitness certificate (sealed: only its reference is kept on the licence)', required: false }],
    checkFields: ['applicantName', 'licenceCategories'], checkDocs: ['identity-evidence'], middle: { key: 'record-test', label: 'Test recorded', fields: ['testResult'], docs: ['test-record'] },
    decisionFields: ['validUntil'], decision: 'issue', effect: 'transport.issue-licence' }),
  decided({ key: 'transport.road-works', title: 'Permit for works in a public road', refPrefix: 'RWRK', owner: 'roadAuthority', sensitivity: 'normal', noun: 'Works permitted',
    fields: [adm('roadReference', 'Road and section (as the road register names it)'), adm('longitude', 'Where: longitude', 'number'), adm('latitude', 'Where: latitude', 'number'), adm('region', 'Or the region, where no position is given'),
      adm('worksFrom', 'Works from', 'date'), adm('worksTo', 'Works to', 'date'), adm('worksDescription', 'The works', 'longtext'), adm('closureNeeded', 'The road is closed during the works', 'boolean'),
      adm('promoter', 'Who carries out the works (organisation or institution)'), adm('conditions', 'Conditions (one per line)', 'longtext')],
    documents: [{ class: 'traffic-management-plan', label: 'Temporary traffic management plan', required: true }, { class: 'works-drawings', label: 'Drawings of the works', required: false }],
    checkFields: ['roadReference', 'worksFrom', 'worksTo', 'worksDescription'], checkDocs: ['traffic-management-plan'], decisionFields: [], decision: 'grant', effect: 'transport.road-works' }),
  decided({ key: 'transport.operator-licence', title: 'Transport operator licence', refPrefix: 'TOPL', owner: 'transportRegulator', sensitivity: 'normal', noun: 'Operator licensed',
    fields: [adm('organisation', 'The operator: its number in the organisations register'), configured('operatorClass', 'Operator class', 'transport.country.operator_classes', 'transport operator classes'),
      adm('fleetMarks', 'Fleet: registration marks, one per line', 'longtext'), adm('serviceAreas', 'Routes or service areas (one per line)', 'longtext'), adm('conditions', 'Conditions (one per line)', 'longtext')],
    documents: [{ class: 'insurance-evidence', label: 'Insurance', required: true }, { class: 'safety-management', label: 'Safety-management procedures and qualifications', required: false }, { class: 'financial-standing', label: 'Financial standing, where the law requires it', required: false }],
    checkFields: ['organisation', 'operatorClass'], checkDocs: ['insurance-evidence'], decisionFields: [], decision: 'grant', effect: 'transport.license-operator' }),
];

export function installTransportProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of TRANSPORT_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const d = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in d)) drafted.push(p.key);
  }
  return { drafted, present };
}
