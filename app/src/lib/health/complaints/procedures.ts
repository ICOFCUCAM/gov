// Complaint intake of the health regulators (Institutional specification Part
// 2 §C.2: "Complaints and service-quality investigations"; Health I4
// dependency `health-department-functions`). Reference procedures, drafts the
// nation adapts and a second official approves:
//
//   health.complaint   a complaint or safety concern about a licensed health facility or
//                      pharmacy (HLT-FAC-009), kept by the health regulator (healthRegulation)
//   prof.complaint     a complaint about a health professional's conduct (HLT-LIC-008), kept by
//                      the regulator of the profession (professionalRegulation, or the institution
//                      the profession names)
//
// Each is intake → assessment by the assigned officer with reasons (never a
// score; AI never assesses) → referral into the regulator's own case on the
// licence or registration (the facility's or pharmacy's suspension procedure,
// prof.fitness) through the engine's refer(), or to another institution's
// referral procedure (lib/casework/referral.ts), or closed with reasons. A
// complaint is never a finding: the case it refers to decides, under its own
// procedure and mapping. No decision is made here, so no permit mapping is
// needed for intake.
//
// The complainant's identity, contact and the complaint itself are restricted:
// the cases are restricted (read by the assigned officials and their
// supervisors only; every read in the access log by the case route), the
// fields never appear in lists, events or exports, and nothing of the
// complainant passes to the referred case. No clinical field: the complaint is
// about the facility's or professional's conduct, in free text with a hint
// not to give anyone's health details.

import { registerEffect, registeredEffects, refer, type EffectContext } from '@/lib/casework/engine';
import { activePackage, draftPackage, listPackages, ownerInstitution } from '@/lib/casework/packages';
import { referralKey } from '@/lib/casework/referral';
import { authorityFor, getMinistry } from '@/lib/data/store';
import { recordAudit } from '@/lib/data/store/audit';
import { getOrganisation } from '@/lib/organisations/register';
import { getProfessional, profession } from '@/lib/professions/register';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const resolve = (a: string) => ownerInstitution(a, authorityFor);

/** The case a facility complaint may open: the suspension procedure of the register the organisation is licensed in. */
const FACILITY_FOLLOW_UPS: Record<string, string> = { 'health.facility-suspension': 'health-facilities', 'health.pharmacy-suspension': 'pharmacies' };
const OTHER_INSTITUTION = 'referral';

/** The facility a complaint names: an organisation licensed in one of the health regulator's registers. */
function facilityOf(c: Case): { number: string; registers: string[] } | { error: string } | null {
  const ref = str(c.fields.facility);
  if (!ref) return null;
  const o = getOrganisation(ref);
  if (!o) return { error: `No organisation ${ref} in the register of organisations (leave it empty and name the facility as the complainant knows it)` };
  const registers = o.standings.filter(s => Object.values(FACILITY_FOLLOW_UPS).includes(s.register)).map(s => s.register);
  if (!registers.length) return { error: `${o.number} holds no health facility or pharmacy licence` };
  return { number: o.number, registers };
}
/** The professional a complaint names, and whether this institution keeps that profession's register. */
function professionalOf(c: Case): { number: string; profession: string } | { error: string } | null {
  const ref = str(c.fields.professional);
  if (!ref) return null;
  const e = getProfessional(ref);
  if (!e) return { error: `No registered professional ${ref} (leave it empty and name the professional as the complainant knows them)` };
  const p = profession(e.profession);
  if (p && resolve(p.authority) !== c.owner) return { error: `The register of ${p.title.toLowerCase()} is kept by another authority: the complaint is referred there` };
  return { number: e.number, profession: e.profession };
}
const keeps = (c: Case, slot: 'healthRegulation' | 'professionalRegulation'): string | null =>
  resolve(slot) === c.owner ? null : slot === 'healthRegulation' ? 'Facility complaints are taken by the health regulator named under Who is responsible' : 'Conduct complaints are taken by the professional regulator named under Who is responsible';

/** Refer the complaint: to the regulator's own case (checked here, opened once the step is recorded) or to another institution's referral procedure. */
function referral(c: Case, to: string, fields: Record<string, unknown>, now: Date): { procedure: string; fields: Record<string, unknown> } | { error: string } {
  if (to === OTHER_INSTITUTION) {
    const inst = str(c.fields.referTo);
    if (!inst || !getMinistry(inst)) return { error: 'Name the institution the complaint is referred to' };
    if (inst === c.owner) return { error: 'A referral goes to another institution; open this regulator\'s own case instead' };
    const key = referralKey(inst);
    if (!activePackage(key, now.toISOString().slice(0, 10))) return { error: `${getMinistry(inst)!.name} has no approved referral procedure (${key})` };
    return { procedure: key, fields: { request: `A complaint received by another regulator (${c.ref}) concerns your institution: ${str(c.fields.referralReason) || 'see the referring case'}`.slice(0, 1000) } };
  }
  const pkg = activePackage(to, now.toISOString().slice(0, 10));
  if (!pkg || resolve(pkg.owner) !== c.owner) return { error: `No approved version of ${to} of this authority applies today: it is approved before a complaint is referred to it` };
  return { procedure: to, fields };
}
const doRefer = (c: Case, r: { procedure: string; fields: Record<string, unknown> }, ctx: EffectContext) => () => {
  const reason = ctx.case.pending?.reason ?? `Complaint ${c.ref} assessed`;
  const out = refer(c.id, { procedure: r.procedure, fields: r.fields, reason: `Complaint ${c.ref} assessed: ${reason}`.slice(0, 300) }, ctx.actor, ctx.now);
  if ('error' in out) recordAudit(ctx.actor.name, 'case.refer', `Case:${c.ref}`, 'error', out.error.slice(0, 200));
};

// ── Facility complaints (HLT-FAC-009) ────────────────────────────────────────

registerEffect('complaint.facility.register', ({ case: c }: EffectContext) => {
  const why = keeps(c, 'healthRegulation');
  if (why) return { error: why };
  const f = facilityOf(c);
  if (f && 'error' in f) return f;
  return { facts: { received: true, ...(f ? { facility: f.number } : {}) } };
});
registerEffect('complaint.facility.refer', (ctx: EffectContext) => {
  const { case: c, now } = ctx;
  const why = keeps(c, 'healthRegulation');
  if (why) return { error: why };
  const to = str(c.fields.followUp);
  if (to !== OTHER_INSTITUTION && !FACILITY_FOLLOW_UPS[to]) return { error: `Choose the case to open: ${[...Object.keys(FACILITY_FOLLOW_UPS), OTHER_INSTITUTION].join(', ')}` };
  let fields: Record<string, unknown> = {};
  if (to !== OTHER_INSTITUTION) {
    const f = facilityOf(c);
    if (!f) return { error: 'Name the facility or pharmacy (its organisation register number) before referring the complaint to its licence' };
    if ('error' in f) return f;
    if (!f.registers.includes(FACILITY_FOLLOW_UPS[to]!)) return { error: `${f.number} is not licensed in the register ${to} acts on` };
    fields = { organisation: f.number };
  }
  const r = referral(c, to, fields, now);
  if ('error' in r) return r;
  return { facts: { referredTo: r.procedure }, after: doRefer(c, r, ctx) };
});

// ── Conduct complaints (HLT-LIC-008) ─────────────────────────────────────────

registerEffect('complaint.conduct.register', ({ case: c }: EffectContext) => {
  const why = keeps(c, 'professionalRegulation');
  const e = professionalOf(c);
  if (e && 'error' in e) return e;
  // A profession kept by another institution is checked above; otherwise the professional regulator takes it.
  if (why && !(e && 'number' in e)) return { error: why };
  return { facts: { received: true, ...(e ? { professional: e.number } : {}) } };
});
registerEffect('complaint.conduct.refer', (ctx: EffectContext) => {
  const { case: c, now } = ctx;
  const to = str(c.fields.followUp);
  if (to !== 'prof.fitness' && to !== OTHER_INSTITUTION) return { error: `Choose the case to open: prof.fitness, ${OTHER_INSTITUTION}` };
  let fields: Record<string, unknown> = {};
  if (to === 'prof.fitness') {
    const e = professionalOf(c);
    if (!e) return { error: 'Name the professional (their registration number) before referring the complaint to a fitness-to-practise case' };
    if ('error' in e) return e;
    fields = { professional: e.number };
  } else {
    const why = keeps(c, 'professionalRegulation');
    if (why) return { error: why };
  }
  const r = referral(c, to, fields, now);
  if ('error' in r) return r;
  return { facts: { referredTo: r.procedure }, after: doRefer(c, r, ctx) };
});

/** The assessment, by the assigned officer with reasons: a prompt for officials, never a finding and never a score. */
registerEffect('complaint.assess', () => ({ facts: { assessed: true } }));

// ── Reference procedures ─────────────────────────────────────────────────────

const base = { reference: true as const, citations: [], notifications: [], deadlines: [], retention: 'case-file-standard', sensitivity: 'restricted' as const };
const r = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'restricted', ...extra });
const configured = (key: string, label: string, list: string, what: string): FieldSpec => ({ key, label, type: 'enum', valuesSource: { kind: 'configured', list }, personalDataClass: 'restricted', countryDecision: `The nation's ${what}; none ship` });
const HINT = 'Say what happened and when. Do not give anyone\'s medical details or anyone else\'s identity: the regulator asks for what it needs.';
const COMPLAINANT: FieldSpec[] = [
  r('raisedByAnonymous', 'The person raising it asked not to be identified', 'boolean'),
  r('raisedByName', 'Name of the person raising it (restricted: read only by the assigned officials, every read logged)'),
  r('raisedByContact', 'How to reach them (restricted)', 'contact'),
  configured('raisedByRelationship', 'Their connection to the matter', 'health.country.complainant_relationships', 'complainant relationships'),
  r('identityShared', 'They agree their identity may be shared with the facility or professional', 'boolean'),
];
const DOCS = [
  { class: 'complaint', label: 'The complaint as received (form, letter or message)', required: true },
  { class: 'evidence', label: 'Evidence given', required: false, multiple: true },
  { class: 'assessment-report', label: 'Assessment, with reasons', required: true },
];
const STAGES = [
  { key: 'received', label: 'Received' }, { key: 'assessment', label: 'Assessment' }, { key: 'assessed', label: 'Assessed' },
  { key: 'referred', label: 'Referred', terminal: true }, { key: 'closed', label: 'Closed with reasons', terminal: true },
];
const steps = (register: string, refer: string, idFields: string[]): CasePackage['actions'] => [
  { key: 'register', label: 'Register the complaint and assign it for assessment', from: ['received'], to: 'assessment', needs: { role: 'officer' }, requires: { fields: idFields, documents: ['complaint'] }, effects: [register] },
  { key: 'assess', label: 'Record the assessment, with reasons', from: ['assessment'], to: 'assessed', needs: { role: 'officer', assigned: true }, requires: { documents: ['assessment-report'], reasons: true }, effects: ['complaint.assess'] },
  { key: 'reassess', label: 'Return to assessment', from: ['assessed'], to: 'assessment', needs: { role: 'signatory' }, requires: { reasons: true } },
  { key: 'refer', label: 'Refer: open the regulator\'s case, or refer to another institution', from: ['assessed'], to: 'referred', needs: { role: 'signatory' }, requires: { fields: ['followUp'], reasons: true }, effects: [refer] },
  { key: 'close', label: 'Close with reasons (no case to open)', from: ['assessment', 'assessed'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true } },
];
const tests = (fields: Record<string, unknown>, follow: Record<string, unknown>): CasePackage['tests'] => [
  { name: 'assessed and referred', steps: [
    { action: 'register', expect: 'refused' },
    { action: 'register', fields, documents: ['complaint'], expect: 'assessment' },
    { action: 'assess', documents: ['assessment-report'], expect: 'assessed' }, { action: 'reassess', expect: 'assessment' },
    { action: 'assess', expect: 'assessed' }, { action: 'refer', fields: follow, expect: 'referred' },
  ] },
  { name: 'closed with reasons', steps: [{ action: 'register', fields, documents: ['complaint'], expect: 'assessment' }, { action: 'close', expect: 'closed' }] },
];

export const REFERENCE_FACILITY_COMPLAINT: Ref = {
  ...base, owner: 'healthRegulation', key: 'health.complaint', version: 1, title: 'Complaint or safety concern about a health facility or pharmacy', refPrefix: 'HFC',
  fields: [
    { key: 'facilityNamed', label: 'The facility or pharmacy as the complainant names it', type: 'text', personalDataClass: 'administrative' },
    { key: 'facility', label: 'The facility or pharmacy on the register, where known (organisation register number)', type: 'registryReference', register: 'organisation', rules: [{ rule: 'existingRecord' }], personalDataClass: 'administrative' },
    configured('category', 'Kind of concern', 'health.country.facility_concern_kinds', 'kinds of facility concern'),
    r('description', 'What happened (restricted)', 'longtext', { hint: HINT }),
    r('when', 'When it happened', 'dateRange', { allowSingle: true }),
    r('riskNow', 'There is a risk to people now', 'boolean'),
    ...COMPLAINANT,
    { key: 'followUp', label: 'Case to open', type: 'choice', options: [...Object.keys(FACILITY_FOLLOW_UPS), OTHER_INSTITUTION], personalDataClass: 'administrative' },
    { key: 'referTo', label: 'Institution referred to (where the complaint concerns another institution)', type: 'text', personalDataClass: 'administrative' },
    r('referralReason', 'Why it is referred (restricted)', 'longtext'),
  ],
  documents: DOCS, stages: STAGES,
  actions: steps('complaint.facility.register', 'complaint.facility.refer', ['facilityNamed', 'description']),
  tests: tests({ facilityNamed: 'A clinic', description: 'Unsafe premises' }, { followUp: 'health.facility-suspension' }),
};

export const REFERENCE_CONDUCT_COMPLAINT: Ref = {
  ...base, owner: 'professionalRegulation', key: 'prof.complaint', version: 1, title: 'Complaint about a health professional\'s conduct', refPrefix: 'PCC',
  fields: [
    r('professionalNamed', 'The professional as the complainant names them (restricted)'),
    { key: 'professional', label: 'The professional on the register, where known (registration number, PRN-…)', type: 'text', personalDataClass: 'administrative' },
    { key: 'facility', label: 'Where it happened, where it is a registered facility (organisation register number)', type: 'registryReference', register: 'organisation', rules: [{ rule: 'existingRecord' }], personalDataClass: 'administrative' },
    configured('category', 'Kind of complaint', 'health.country.conduct_complaint_kinds', 'kinds of conduct complaint'),
    r('description', 'What happened (restricted)', 'longtext', { hint: HINT }),
    r('when', 'When it happened', 'dateRange', { allowSingle: true }),
    r('riskNow', 'There is a risk to people now', 'boolean'),
    r('raisedElsewhere', 'It has also been raised with the facility or another body', 'boolean'),
    ...COMPLAINANT,
    { key: 'followUp', label: 'Case to open', type: 'choice', options: ['prof.fitness', OTHER_INSTITUTION], personalDataClass: 'administrative' },
    { key: 'referTo', label: 'Institution referred to (where the complaint concerns another institution)', type: 'text', personalDataClass: 'administrative' },
    r('referralReason', 'Why it is referred (restricted)', 'longtext'),
  ],
  documents: DOCS, stages: STAGES,
  actions: steps('complaint.conduct.register', 'complaint.conduct.refer', ['professionalNamed', 'description']),
  tests: tests({ professionalNamed: 'A nurse', description: 'Conduct' }, { followUp: 'prof.fitness' }),
};

export const COMPLAINT_PROCEDURES: Ref[] = [REFERENCE_FACILITY_COMPLAINT, REFERENCE_CONDUCT_COMPLAINT];

export function installComplaintProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of COMPLAINT_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const d = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in d)) drafted.push(p.key);
  }
  return { drafted, present };
}
