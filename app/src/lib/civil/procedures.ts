// Civil registration on the workflow foundation (docs/GOVERNMENT_OPERATING_MODEL.md
// §8.2): the module's effects (duplicate check, registering the event,
// issuing the certificate) and the reference procedures CivicOS ships. A
// reference arrives as a draft: the civil registration authority approves it
// (and adds the citations of its own law in a new version) before any case
// runs. Importing this module registers its effects with the engine.

import { registerEffect, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { registeredEffects } from '@/lib/casework/engine';
import { issueCertificate } from '@/lib/records/certificates';
import { findMatches, registerEvent, attachDecision, eventOfCase, getPerson, amendPerson, current, type Sex } from './register';
import type { CasePackage } from '@/lib/casework/types';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
/** Days after which a birth registration counts as late (a reference value; the nation's law sets its own in its procedure). */
export const LATE_AFTER_DAYS = 365;

registerEffect('civil.checkDuplicates', ({ case: c }: EffectContext) => {
  const f = c.fields;
  const m = findMatches({ given: str(f.childGiven), family: str(f.childFamily), birthDate: str(f.birthDate), motherFamily: str(f.motherFamily) }).filter(x => x.score >= 0.7);
  if (m.length) return { error: `Possible duplicate of ${m.map(x => x.registration ?? x.person).join(', ')}: refer the case for adjudication` };
});

registerEffect('civil.registerBirth', ({ case: c, actor, now }: EffectContext) => {
  const f = c.fields;
  const date = str(f.birthDate);
  const late = !!date && (now.getTime() - Date.parse(`${date}T00:00:00Z`)) / 86_400_000 > LATE_AFTER_DAYS;
  const e = registerEvent({
    kind: 'birth', date, case: c.id, late,
    place: { text: str(f.birthPlace), ...(str(f.region) ? { region: str(f.region) } : {}), ...(str(f.birthFacility) ? { facility: str(f.birthFacility) } : {}) },
    child: { given: str(f.childGiven), family: str(f.childFamily), sex: (['female', 'male', 'other'].includes(str(f.sex)) ? str(f.sex) : 'unknown') as Sex,
      mother: { given: str(f.motherGiven), family: str(f.motherFamily) }, ...(str(f.fatherFamily) ? { father: { given: str(f.fatherGiven), family: str(f.fatherFamily) } } : {}) },
    ...(str(f.informantName) ? { informant: { name: str(f.informantName), ...(str(f.informantRelation) ? { relation: str(f.informantRelation) } : {}) } } : {}),
  }, actor.name, now);
  if ('error' in e) return { error: e.error };
  return { facts: { registrationNumber: e.registrationNumber, dateOfBirth: e.date, late: e.late }, after: d => { if (d) attachDecision(e.id, d.id); } };
});

registerEffect('civil.issueCertificate', ({ case: c, actor }: EffectContext) => {
  const e = eventOfCase(c.id);
  const decision = c.decisions[c.decisions.length - 1];
  if (!e || !decision) return { error: 'The birth must be registered (decided) before its certificate is issued' };
  // What the certificate itself states and anyone with its code may check: no names (privacy by default).
  const cert = issueCertificate({ kind: 'birth-registration', title: 'Certificate of birth registration', decision, publicFacts: { 'Registration number': e.registrationNumber, 'Date of birth': e.date, 'Registered on': e.registeredAt.slice(0, 10) } }, actor.name);
  if ('error' in cert) return { error: cert.error };
  return { facts: { certificate: cert.code } };
});

registerEffect('civil.registerDeath', ({ case: c, actor, now }: EffectContext) => {
  const f = c.fields;
  const p = getPerson(str(f.deceasedRegistration));
  if (!p) return { error: `No person with birth registration ${str(f.deceasedRegistration)} in the register: register the birth late first` };
  const e = registerEvent({ kind: 'death', date: str(f.deathDate), case: c.id, deceased: p.id, place: { text: str(f.deathPlace), ...(str(f.region) ? { region: str(f.region) } : {}) }, ...(str(f.informantName) ? { informant: { name: str(f.informantName), ...(str(f.informantRelation) ? { relation: str(f.informantRelation) } : {}) } } : {}) }, actor.name, now);
  if ('error' in e) return { error: e.error };
  return { facts: { registrationNumber: e.registrationNumber, dateOfDeath: e.date }, after: d => { if (d) attachDecision(e.id, d.id); } };
});

registerEffect('civil.registerMarriage', ({ case: c, actor, now }: EffectContext) => {
  const f = c.fields;
  const a = getPerson(str(f.spouseOneRegistration)), b = getPerson(str(f.spouseTwoRegistration));
  if (!a || !b) return { error: 'Both spouses must be in the register (by their birth registration numbers)' };
  const e = registerEvent({ kind: 'marriage', date: str(f.marriageDate), case: c.id, spouses: [a.id, b.id], form: str(f.form), place: { text: str(f.marriagePlace), ...(str(f.region) ? { region: str(f.region) } : {}) } }, actor.name, now);
  if ('error' in e) return { error: e.error };
  return { facts: { registrationNumber: e.registrationNumber, dateOfMarriage: e.date, form: str(f.form) }, after: d => { if (d) attachDecision(e.id, d.id); } };
});

registerEffect('civil.applyCorrection', ({ case: c, actor, now }: EffectContext) => {
  const f = c.fields;
  const p = getPerson(str(f.personRegistration));
  if (!p) return { error: `No person with birth registration ${str(f.personRegistration)}` };
  const v = current(p);
  const names = (str(f.correctGiven) || str(f.correctFamily)) ? { names: { ...v.names, ...(str(f.correctGiven) ? { given: str(f.correctGiven) } : {}), ...(str(f.correctFamily) ? { family: str(f.correctFamily) } : {}) } } : {};
  const birth = str(f.correctBirthDate) && v.birth ? { birth: { ...v.birth, date: str(f.correctBirthDate) } } : {};
  const r = amendPerson(p.id, { ...names, ...birth }, str(f.grounds), c.id, actor.name, now);
  if ('error' in r) return { error: r.error };
  return { facts: { registrationNumber: str(f.personRegistration), version: r.versions.length } };
});

const BIRTH_FIELDS: CasePackage['fields'] = [
  { key: 'childGiven', label: 'Child\'s given names', type: 'text', required: true, personal: true },
  { key: 'childFamily', label: 'Child\'s family name', type: 'text', required: true, personal: true },
  { key: 'sex', label: 'Sex', type: 'choice', options: ['female', 'male', 'other', 'unknown'], personal: true },
  { key: 'birthDate', label: 'Date of birth', type: 'date', required: true, personal: true },
  { key: 'birthPlace', label: 'Place of birth', type: 'text', personal: true },
  { key: 'region', label: 'Region', type: 'text' },
  { key: 'birthFacility', label: 'Health facility (registered site)', type: 'text' },
  { key: 'motherGiven', label: 'Mother\'s given names', type: 'text', personal: true },
  { key: 'motherFamily', label: 'Mother\'s family name', type: 'text', required: true, personal: true },
  { key: 'fatherGiven', label: 'Father\'s given names', type: 'text', personal: true },
  { key: 'fatherFamily', label: 'Father\'s family name', type: 'text', personal: true },
  { key: 'informantName', label: 'Informant', type: 'text', personal: true },
  { key: 'informantRelation', label: 'Informant\'s relation to the child', type: 'text' },
];

/** The reference birth registration procedure (design §8.2, directions 16.1). */
export const REFERENCE_BIRTH: Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'> = {
  key: 'civil.birth', version: 1, owner: 'civilRegistration', title: 'Birth registration', refPrefix: 'BRA', reference: true,
  citations: [],
  fields: BIRTH_FIELDS,
  documents: [
    { class: 'birth-notification', label: 'Birth notification (from the health facility or a witness)', required: true },
    { class: 'parent-identity', label: 'Parent\'s identity document', required: false },
  ],
  stages: [
    { key: 'submitted', label: 'Submitted' }, { key: 'completeness', label: 'Completeness check' }, { key: 'returned', label: 'Returned for correction' },
    { key: 'verification', label: 'Verification' }, { key: 'adjudication', label: 'Referred for adjudication' }, { key: 'pending-approval', label: 'Pending approval' },
    { key: 'registered', label: 'Registered' }, { key: 'certificate-issued', label: 'Certificate issued', terminal: true }, { key: 'rejected', label: 'Rejected', terminal: true },
  ],
  actions: [
    { key: 'check', label: 'Start the completeness check', from: ['submitted'], to: 'completeness', needs: { role: 'officer' } },
    { key: 'return', label: 'Return for correction', from: ['completeness', 'verification'], to: 'returned', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'resubmit', label: 'Corrected: check again', from: ['returned'], to: 'completeness', needs: { role: 'officer' } },
    { key: 'complete', label: 'Complete: verify', from: ['completeness'], to: 'verification', needs: { role: 'officer' }, requires: { documents: ['birth-notification'], fields: ['childGiven', 'childFamily', 'birthDate', 'motherFamily'] } },
    { key: 'verify', label: 'Verified: propose registration', from: ['verification'], to: 'pending-approval', needs: { role: 'officer' }, effects: ['civil.checkDuplicates'] },
    { key: 'refer-adjudication', label: 'Refer for adjudication (possible duplicate)', from: ['verification'], to: 'adjudication', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'adjudicate', label: 'Adjudicated: not a duplicate', from: ['adjudication'], to: 'pending-approval', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'register', label: 'Register the birth', from: ['pending-approval'], to: 'registered', decision: 'register', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['civil.registerBirth'] },
    { key: 'reject', label: 'Reject', from: ['pending-approval', 'adjudication'], to: 'rejected', decision: 'reject', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'issue', label: 'Issue the certificate', from: ['registered'], to: 'certificate-issued', needs: { role: 'officer' }, effects: ['civil.issueCertificate'] },
  ],
  deadlines: [{ key: 'register', label: 'Register within 30 days of notification', from: 'opened', days: 30, calendar: 'calendar', onLapse: 'escalate' }],
  notifications: [],
  appeal: { days: 30, body: 'the civil registration appeals authority', suspensive: false },
  retention: 'civil-register-permanent', sensitivity: 'restricted',
  tests: [
    { name: 'registered and certified', steps: [
      { action: 'check', expect: 'completeness' },
      { action: 'complete', fields: { childGiven: 'A', childFamily: 'B', birthDate: '2026-01-01', motherFamily: 'B' }, documents: ['birth-notification'], expect: 'verification' },
      { action: 'verify', expect: 'pending-approval' },
      { action: 'register', expect: 'registered' },
      { action: 'issue', expect: 'certificate-issued' },
    ] },
    { name: 'returned, corrected, rejected', steps: [
      { action: 'check', expect: 'completeness' },
      { action: 'complete', expect: 'refused' },
      { action: 'return', expect: 'returned' },
      { action: 'resubmit', expect: 'completeness' },
      { action: 'complete', fields: { childGiven: 'A', childFamily: 'B', birthDate: '2026-01-01', motherFamily: 'B' }, documents: ['birth-notification'], expect: 'verification' },
      { action: 'refer-adjudication', expect: 'adjudication' },
      { action: 'reject', expect: 'rejected' },
    ] },
  ],
};

const informant: CasePackage['fields'] = [
  { key: 'informantName', label: 'Informant', type: 'text', personal: true },
  { key: 'informantRelation', label: 'Informant\'s relation', type: 'text' },
];
const simpleStages = (done: string): CasePackage['stages'] => [
  { key: 'submitted', label: 'Submitted' }, { key: 'verification', label: 'Verification' }, { key: 'returned', label: 'Returned for correction' },
  { key: 'pending-approval', label: 'Pending approval' }, { key: 'registered', label: done, terminal: true }, { key: 'rejected', label: 'Rejected', terminal: true },
];
const simpleActions = (decision: string, label: string, effect: string, docs: string[], fields: string[]): CasePackage['actions'] => [
  { key: 'check', label: 'Check the evidence', from: ['submitted'], to: 'verification', needs: { role: 'officer' }, requires: { documents: docs, fields } },
  { key: 'return', label: 'Return for correction', from: ['verification'], to: 'returned', needs: { role: 'officer' }, requires: { reasons: true } },
  { key: 'resubmit', label: 'Corrected: check again', from: ['returned'], to: 'verification', needs: { role: 'officer' } },
  { key: 'verify', label: 'Verified: propose', from: ['verification'], to: 'pending-approval', needs: { role: 'officer' } },
  { key: decision, label, from: ['pending-approval'], to: 'registered', decision, needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: [effect] },
  { key: 'reject', label: 'Reject', from: ['pending-approval'], to: 'rejected', decision: 'reject', needs: { role: 'signatory' }, requires: { reasons: true } },
];
const simpleTests = (decision: string, fields: Record<string, unknown>, docs: string[]): CasePackage['tests'] => [
  { name: 'decided', steps: [{ action: 'check', fields, documents: docs, expect: 'verification' }, { action: 'verify', expect: 'pending-approval' }, { action: decision, expect: 'registered' }] },
  { name: 'returned and rejected', steps: [{ action: 'check', fields, documents: docs, expect: 'verification' }, { action: 'return', expect: 'returned' }, { action: 'resubmit', expect: 'verification' }, { action: 'verify', expect: 'pending-approval' }, { action: 'reject', expect: 'rejected' }] },
];

/** The reference death registration procedure (directions 16.1): a death certificate is not a medical cause-of-death record. */
export const REFERENCE_DEATH: typeof REFERENCE_BIRTH = {
  key: 'civil.death', version: 1, owner: 'civilRegistration', title: 'Death registration', refPrefix: 'DRA', reference: true, citations: [],
  fields: [
    { key: 'deceasedRegistration', label: 'Birth registration number of the deceased', type: 'text', required: true },
    { key: 'deathDate', label: 'Date of death', type: 'date', required: true, personal: true },
    { key: 'deathPlace', label: 'Place of death', type: 'text', personal: true },
    { key: 'region', label: 'Region', type: 'text' }, ...informant,
  ],
  documents: [{ class: 'death-notification', label: 'Notification of death (medical or witness)', required: true }],
  stages: simpleStages('Registered'),
  actions: simpleActions('register', 'Register the death', 'civil.registerDeath', ['death-notification'], ['deceasedRegistration', 'deathDate']),
  deadlines: [{ key: 'register', label: 'Register within 30 days of notification', from: 'opened', days: 30, calendar: 'calendar', onLapse: 'escalate' }],
  notifications: [], appeal: { days: 30, body: 'the civil registration appeals authority', suspensive: false },
  retention: 'civil-register-permanent', sensitivity: 'restricted',
  tests: simpleTests('register', { deceasedRegistration: 'BR-1', deathDate: '2026-01-01' }, ['death-notification']),
};

/** The reference marriage registration procedure: the form (civil, customary, religious, other) as the law recognises it. */
export const REFERENCE_MARRIAGE: typeof REFERENCE_BIRTH = {
  key: 'civil.marriage', version: 1, owner: 'civilRegistration', title: 'Marriage registration', refPrefix: 'MRA', reference: true, citations: [],
  fields: [
    { key: 'spouseOneRegistration', label: 'First spouse\'s birth registration number', type: 'text', required: true },
    { key: 'spouseTwoRegistration', label: 'Second spouse\'s birth registration number', type: 'text', required: true },
    { key: 'marriageDate', label: 'Date of marriage', type: 'date', required: true },
    { key: 'marriagePlace', label: 'Place of marriage', type: 'text' },
    { key: 'region', label: 'Region', type: 'text' },
    { key: 'form', label: 'Form of marriage', type: 'choice', options: ['civil', 'customary', 'religious', 'other'], required: true },
  ],
  documents: [{ class: 'marriage-record', label: 'Record of the ceremony or event', required: true }, { class: 'consent', label: 'Consent of both spouses', required: true }],
  stages: simpleStages('Registered'),
  actions: simpleActions('register', 'Register the marriage', 'civil.registerMarriage', ['marriage-record', 'consent'], ['spouseOneRegistration', 'spouseTwoRegistration', 'marriageDate', 'form']),
  deadlines: [], notifications: [], appeal: { days: 30, body: 'the civil registration appeals authority', suspensive: false },
  retention: 'civil-register-permanent', sensitivity: 'restricted',
  tests: simpleTests('register', { spouseOneRegistration: 'BR-1', spouseTwoRegistration: 'BR-2', marriageDate: '2026-01-01', form: 'civil' }, ['marriage-record', 'consent']),
};

/** The reference correction procedure: a new version of the person record, the earlier one kept. */
export const REFERENCE_CORRECTION: typeof REFERENCE_BIRTH = {
  key: 'civil.correction', version: 1, owner: 'civilRegistration', title: 'Correction of a civil record', refPrefix: 'CRA', reference: true, citations: [],
  fields: [
    { key: 'personRegistration', label: 'Birth registration number', type: 'text', required: true },
    { key: 'correctGiven', label: 'Correct given names', type: 'text', personal: true },
    { key: 'correctFamily', label: 'Correct family name', type: 'text', personal: true },
    { key: 'correctBirthDate', label: 'Correct date of birth', type: 'date', personal: true },
    { key: 'grounds', label: 'What is wrong and how it is shown', type: 'longtext', required: true },
  ],
  documents: [{ class: 'supporting-evidence', label: 'Evidence of the correct entry', required: true }],
  stages: simpleStages('Corrected'),
  actions: simpleActions('correct', 'Correct the record', 'civil.applyCorrection', ['supporting-evidence'], ['personRegistration', 'grounds']),
  deadlines: [], notifications: [], appeal: { days: 30, body: 'the civil registration appeals authority', suspensive: false },
  retention: 'civil-register-permanent', sensitivity: 'restricted',
  tests: simpleTests('correct', { personRegistration: 'BR-1', grounds: 'Spelling' }, ['supporting-evidence']),
};

/** Late birth registration: the birth procedure with a sworn statement and supporting evidence required. */
export const REFERENCE_LATE_BIRTH: typeof REFERENCE_BIRTH = {
  ...REFERENCE_BIRTH, key: 'civil.late-birth', title: 'Late birth registration', refPrefix: 'LBR',
  documents: [...REFERENCE_BIRTH.documents, { class: 'sworn-statement', label: 'Sworn statement of the birth', required: true }, { class: 'supporting-evidence', label: 'Supporting evidence (school, baptism, health records)', required: true }],
  actions: REFERENCE_BIRTH.actions.map(a => a.key === 'complete' ? { ...a, requires: { ...a.requires, documents: ['birth-notification', 'sworn-statement', 'supporting-evidence'] } } : a),
  deadlines: [],
  tests: REFERENCE_BIRTH.tests.map(t => ({ ...t, steps: t.steps.map(st => st.documents ? { ...st, documents: ['birth-notification', 'sworn-statement', 'supporting-evidence'] } : st) })),
};

export const REFERENCE_PROCEDURES = [REFERENCE_BIRTH, REFERENCE_LATE_BIRTH, REFERENCE_DEATH, REFERENCE_MARRIAGE, REFERENCE_CORRECTION];

/** Draft the reference procedures this installation does not have yet (each arrives as a draft for the authority to approve). */
export function installReferenceProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of REFERENCE_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const r = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in r)) drafted.push(p.key);
  }
  return { drafted, present };
}
