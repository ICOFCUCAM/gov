// Housing procedures (plan step I7; supplement Part 20 HPC-HOU-001 … 004;
// specification Part 3 §D.13). Reference drafts the nation adapts and a
// second official approves; none is approved, none names a body: each
// belongs to the `housing` slot of the deployment profile, empty until the
// nation names its housing authority.
//
//   housing.programme    a housing programme registered with its approved eligibility criteria, priority
//                        factors and points, and its homes (HPC-HOU-001), decided by two officials citing the law
//   housing.application  an application assessed criterion by criterion against the programme's terms in force,
//                        and a home allocated by an official with reasons (HPC-HOU-002, 003, 004)
//
// Eligibility and priority come only from the programme's approved terms:
// the officer records what is met and on what evidence; whether the
// applicant is eligible and the priority points follow from that version,
// which the decision records (its digest on the sealed decision). The
// allocation is a decision with reasons; an allocation that passes over an
// eligible applicant with more points says so on the decision. No model,
// score or map decides anything here.

import { registerEffect, registeredEffects, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { authorityFor } from '@/lib/data/store';
import {
  readTerms, readUnits, registerProgramme, receiveApplication, recordAssessment, allocate, closeApplication, getProgramme, termsInForce, applicationOfCase, waitingList,
  type CriterionAnswer, type HousingProgramme,
} from './register';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** The permit type whose approved mapping governs each decision (lib/permits/decisions.ts). */
export const HOUSING_PERMITS: Record<string, string> = {
  'housing.programme': 'housing-programme',
  'housing.application': 'housing-allocation',
};

function keeper(c: Case): { error: string } | null {
  const id = authorityFor('housing');
  return id && id === c.owner ? null : { error: 'Housing programmes are kept by the housing authority the nation names under Who is responsible: this institution is not it' };
}
const sample = (c: Case) => c.source === 'sample';

function terms(c: Case) {
  const t = readTerms({ eligibility: str(c.fields.eligibilityCriteria), priority: str(c.fields.priorityFactors) });
  if ('error' in t) return t;
  const units = readUnits(str(c.fields.homes));
  if ('error' in units) return units;
  return { terms: t, units };
}

registerEffect('housing.check-terms', ({ case: c }: EffectContext) => {
  const k = keeper(c);
  if (k) return k;
  const r = terms(c);
  return 'error' in r ? r : { facts: { criteria: r.terms.eligibility.length, factors: r.terms.priority.length, homes: r.units.length } };
});

registerEffect('housing.register-programme', ({ case: c, now }: EffectContext) => {
  const k = keeper(c);
  if (k) return k;
  const r = terms(c);
  if ('error' in r) return r;
  return {
    facts: { criteria: r.terms.eligibility.length, factors: r.terms.priority.length, homes: r.units.length },
    after: d => { registerProgramme({ title: str(c.fields.programmeTitle), case: { id: c.id, ref: c.ref }, terms: r.terms, units: r.units, ...(d ? { decision: d.id } : {}), sample: sample(c) }, now); },
  };
});

function programmeOf(c: Case): HousingProgramme | { error: string } {
  const p = getProgramme(str(c.fields.programme));
  if (!p) return { error: `No housing programme ${str(c.fields.programme) || '(none named)'} in the register` };
  if (p.state !== 'active') return { error: `Programme ${p.number} is closed` };
  return p;
}

registerEffect('housing.receive', ({ case: c, now }: EffectContext) => {
  const k = keeper(c);
  if (k) return k;
  const p = programmeOf(c);
  if ('error' in p) return p;
  const size = Number(c.fields.householdSize);
  return { facts: { programme: p.number }, after: () => { receiveApplication({ programme: p.number, case: { id: c.id, ref: c.ref }, ...(Number.isInteger(size) && size > 0 ? { householdSize: size } : {}), sample: sample(c) }, now); } };
});

/** The officer's answers, criterion by criterion (`key | yes or no | evidence`), and the priority factors found (`key`, one per line). */
function assessed(c: Case, p: HousingProgramme): { answers: CriterionAnswer[]; eligible: boolean; factors: string[]; points: number; terms: number; digest: string } | { error: string } {
  const t = termsInForce(p);
  const answers: CriterionAnswer[] = [];
  for (const l of str(c.fields.criteriaAnswers).split('\n').map(x => x.trim()).filter(Boolean)) {
    const [key = '', met = '', evidence = ''] = l.split('|').map(x => x.trim());
    if (!t.eligibility.some(x => x.key === key)) return { error: `${key || 'A line'} is not a criterion of programme ${p.number} (version ${t.n}): ${t.eligibility.map(x => x.key).join(', ')}` };
    if (!/^(yes|no)$/i.test(met)) return { error: `Criterion ${key}: say yes or no` };
    answers.push({ key, met: /^yes$/i.test(met), ...(evidence ? { evidence } : {}) });
  }
  const missing = t.eligibility.filter(x => !answers.some(a => a.key === x.key)).map(x => x.key);
  if (missing.length) return { error: `Assess every criterion of the programme's terms (version ${t.n}): ${missing.join(', ')} not answered` };
  const factors = str(c.fields.priorityFactorsFound).split(/[\n,]/).map(x => x.trim()).filter(Boolean);
  const unknown = factors.filter(f => !t.priority.some(x => x.key === f));
  if (unknown.length) return { error: `Not a priority factor of the programme's terms: ${unknown.join(', ')}` };
  const points = [...new Set(factors)].reduce((n, f) => n + t.priority.find(x => x.key === f)!.points, 0);
  return { answers, eligible: answers.every(a => a.met), factors: [...new Set(factors)], points, terms: t.n, digest: t.digest };
}

function assess(eligible: boolean) {
  return ({ case: c, now, actor }: EffectContext) => {
    const k = keeper(c);
    if (k) return k;
    const p = programmeOf(c);
    if ('error' in p) return p;
    const a = assessed(c, p);
    if ('error' in a) return a;
    if (a.eligible !== eligible) return { error: eligible ? 'Not every criterion is met: the application is found ineligible, by an official who can sign, with reasons' : 'Every criterion is met: the application is eligible' };
    return {
      facts: { programme: p.number, terms: a.terms, eligible: a.eligible, points: a.points },
      rules: [{ key: `housing.terms.${p.number}`, version: a.terms, digest: a.digest }],
      after: () => {
        recordAssessment(c.id, { terms: a.terms, answers: a.answers, eligible: a.eligible, factors: a.factors, points: a.points, by: actor.name, at: now.toISOString() });
        if (!eligible) closeApplication(c.id, 'ineligible');
      },
    };
  };
}
registerEffect('housing.assess', assess(true));
registerEffect('housing.assess-ineligible', assess(false));

registerEffect('housing.allocate', ({ case: c, now }: EffectContext) => {
  const k = keeper(c);
  if (k) return k;
  const p = programmeOf(c);
  if ('error' in p) return p;
  const app = applicationOfCase(c.id);
  if (app?.state !== 'eligible' || !app.assessment) return { error: 'A home is allocated to an eligible application, assessed against the programme\'s terms' };
  const unit = p.units.find(u => u.ref === str(c.fields.unit));
  if (!unit) return { error: `Name a home of programme ${p.number}` };
  if (unit.state !== 'available') return { error: `Home ${unit.ref} is already allocated` };
  const t = termsInForce(p);
  // Who would come first by the approved priority: an allocation that passes over them says so, and its reasons carry it.
  const before = waitingList(p.number).filter(x => x.case.id !== c.id && (x.assessment?.points ?? 0) > app.assessment!.points);
  return {
    facts: { programme: p.number, home: unit.ref, terms: t.n, points: app.assessment.points, outOfOrder: before.length > 0 },
    rules: [{ key: `housing.terms.${p.number}`, version: t.n, digest: t.digest }],
    after: (d, done) => {
      const last = done.history.at(-1)!;
      allocate(c.id, { unit: unit.ref, terms: t.n, ...(d ? { decision: d.id } : {}), reasons: last.reason ?? '', outOfOrder: before.length > 0, higherWaiting: before.length, by: last.by.name, at: now.toISOString() });
    },
  };
});

registerEffect('housing.withdraw', ({ case: c }: EffectContext) => ({ after: () => { if (applicationOfCase(c.id)) closeApplication(c.id, 'withdrawn'); } }));

// ── Reference procedures ─────────────────────────────────────────────────────

const adm = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'administrative', ...extra });
const per = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'restricted', ...extra });
const base = { reference: true as const, citations: [], notifications: [], deadlines: [], retention: 'housing-file', owner: 'housing' };

export const REFERENCE_HOUSING_PROGRAMME: Ref = {
  ...base, sensitivity: 'normal', key: 'housing.programme', version: 1, title: 'Housing programme registration, with its eligibility and priority rules', refPrefix: 'HPR',
  fields: [
    adm('programmeTitle', 'Name of the programme'),
    adm('programmeDescription', 'What the programme provides, and for whom', 'longtext'),
    adm('eligibilityCriteria', 'Eligibility criteria as the law sets them: one per line, key | criterion', 'longtext'),
    adm('priorityFactors', 'Priority factors and their points as the approved rules give them: one per line, key | factor | points', 'longtext'),
    adm('homes', 'Homes in the programme: one per line, reference | region | parcel | rooms', 'longtext'),
  ],
  documents: [{ class: 'programme-instrument', label: 'The instrument establishing the programme and its rules', required: true }],
  stages: [
    { key: 'received', label: 'Received' }, { key: 'review', label: 'Terms reviewed against the law' },
    { key: 'registered', label: 'Registered: its terms in force', terminal: true }, { key: 'not-registered', label: 'Not registered, with reasons', terminal: true },
  ],
  actions: [
    { key: 'check', label: 'Check the terms: every criterion and factor stated, points whole numbers, each home once', from: ['received'], to: 'review', needs: { role: 'officer' }, requires: { fields: ['programmeTitle', 'eligibilityCriteria', 'priorityFactors', 'homes'], documents: ['programme-instrument'] }, effects: ['housing.check-terms'] },
    { key: 'register', label: 'Register the programme and its terms, citing the law (a second official confirms)', from: ['review'], to: 'registered', decision: 'register-programme', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true, citations: true }, effects: ['housing.register-programme'] },
    { key: 'refuse', label: 'Do not register, with reasons', from: ['review'], to: 'not-registered', decision: 'refuse', needs: { role: 'signatory' }, requires: { reasons: true } },
  ],
  tests: [
    { name: 'checked and registered', steps: [
      { action: 'check', expect: 'refused' },
      { action: 'check', fields: { programmeTitle: 'x', eligibilityCriteria: 'x', priorityFactors: 'x', homes: 'x' }, documents: ['programme-instrument'], expect: 'review' },
      { action: 'register', expect: 'registered' },
    ] },
    { name: 'not registered', steps: [
      { action: 'check', fields: { programmeTitle: 'x', eligibilityCriteria: 'x', priorityFactors: 'x', homes: 'x' }, documents: ['programme-instrument'], expect: 'review' },
      { action: 'refuse', expect: 'not-registered' },
    ] },
  ],
};

export const REFERENCE_HOUSING_APPLICATION: Ref = {
  ...base, sensitivity: 'restricted', key: 'housing.application', version: 1, title: 'Housing application: eligibility, priority and allocation', refPrefix: 'HAP',
  fields: [
    adm('programme', 'Housing programme (its number)'),
    per('householdSize', 'Number of people in the household', 'number'),
    per('currentSituation', 'Where the household lives now', 'choice', { options: ['homeless', 'temporary-accommodation', 'overcrowded', 'unaffordable', 'unsuitable', 'other'] }),
    per('preferredLocalities', 'Preferred localities'),
    per('accessibilityNeeds', 'What the home must have to be accessible (no medical details)', 'longtext', { hint: 'Say what the home needs (step-free access, a ground floor, wider doors). Do not give medical details.' }),
    per('criteriaAnswers', 'Assessment: one line per criterion of the programme, key | yes or no | evidence seen', 'longtext'),
    adm('priorityFactorsFound', 'Priority factors found (their keys, one per line)', 'longtext'),
    adm('unit', 'Home allocated (its reference in the programme)'),
  ],
  documents: [
    { class: 'application', label: 'The application as received', required: true },
    { class: 'eligibility-evidence', label: 'Evidence for a criterion or a priority factor (income, household, current home)', required: false, multiple: true },
  ],
  stages: [
    { key: 'received', label: 'Received' }, { key: 'assessment', label: 'Assessed against the programme\'s terms' }, { key: 'waiting', label: 'Eligible: waiting, by priority' },
    { key: 'allocated', label: 'A home allocated, with reasons', terminal: true }, { key: 'ineligible', label: 'Found ineligible, with reasons', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
  ],
  actions: [
    { key: 'accept', label: 'Accept the application under a programme', from: ['received'], to: 'assessment', needs: { role: 'officer' }, requires: { fields: ['programme'], documents: ['application'] }, effects: ['housing.receive'] },
    { key: 'assess-eligible', label: 'Record the assessment: every criterion met (the priority follows from the terms)', from: ['assessment'], to: 'waiting', needs: { role: 'officer', assigned: true }, requires: { fields: ['criteriaAnswers'], reasons: true }, effects: ['housing.assess'] },
    { key: 'find-ineligible', label: 'Find the application ineligible, with reasons and the review route', from: ['assessment'], to: 'ineligible', decision: 'refuse', needs: { role: 'signatory' }, requires: { fields: ['criteriaAnswers'], reasons: true }, effects: ['housing.assess-ineligible'] },
    { key: 'allocate', label: 'Allocate a home, with reasons (a second official confirms)', from: ['waiting'], to: 'allocated', decision: 'allocate', needs: { role: 'signatory', fourEyes: true, distinctFrom: ['assess-eligible'] }, requires: { fields: ['unit'], reasons: true }, effects: ['housing.allocate'] },
    { key: 'withdraw', label: 'Withdrawn by the applicant', from: ['received', 'assessment', 'waiting'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['housing.withdraw'] },
  ],
  tests: [
    { name: 'assessed eligible and allocated', steps: [
      { action: 'accept', expect: 'refused' },
      { action: 'accept', fields: { programme: 'x' }, documents: ['application'], expect: 'assessment' },
      { action: 'assess-eligible', fields: { criteriaAnswers: 'x' }, expect: 'waiting' },
      { action: 'allocate', fields: { unit: 'x' }, expect: 'allocated' },
    ] },
    { name: 'ineligible', steps: [
      { action: 'accept', fields: { programme: 'x' }, documents: ['application'], expect: 'assessment' },
      { action: 'find-ineligible', fields: { criteriaAnswers: 'x' }, expect: 'ineligible' },
    ] },
  ],
};

export const HOUSING_PROCEDURES: Ref[] = [REFERENCE_HOUSING_PROGRAMME, REFERENCE_HOUSING_APPLICATION];

export function installHousingProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of HOUSING_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const d = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in d)) drafted.push(p.key);
  }
  return { drafted, present };
}
