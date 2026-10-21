// Courts on the workflow foundation (directions 16.4, Gate 5): a reference
// procedure for a case filed at a court, which the judiciary adapts to its
// rules of procedure and approves. Filed → Registry review → Accepted or
// Rejected for procedural reasons → Served → Pending hearing → Hearing →
// Judgment reserved → Judgment issued → Appeal period → Final or Appealed →
// Enforcement → Archived. It is not linear: a stay suspends it and is lifted,
// a hearing can be adjourned, an appeal is a separate case at the appellate
// court (engine refer()), and the judgment, its appeal and its enforcement
// are distinct steps and records. An appeal does not suspend the judgment
// unless the court orders a stay.
//
// Judicial independence: the judiciary named in the deployment profile works
// its cases alone (case rules, `judicial`); no administrator or ministry
// official acts on them. Judgments are sealed decisions citing the law.
// Hearings go to the court's list (lib/courts/hearings.ts); the public cause
// list shows case numbers, never parties.

import { registerEffect, registeredEffects, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { getMinistry } from '@/lib/data/store';
import { scheduleHearing, concludeHearing } from './hearings';
import type { CasePackage } from '@/lib/casework/types';
import { libraryForm } from '@/lib/forms/library/definitions';
import { attachForm } from '@/lib/forms/library/build';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

registerEffect('court.scheduleHearing', ({ case: c, actor, now }: EffectContext) => {
  const at = str(c.fields.nextHearing);
  if (!at) return { error: 'Give the date (and time) of the hearing' };
  const h = scheduleHearing({ case: c.id, caseRef: c.ref, court: getMinistry(c.owner)?.name ?? c.owner, kind: str(c.fields.hearingKind) || 'hearing', at, ...(str(c.fields.courtroom) ? { room: str(c.fields.courtroom) } : {}) }, actor.name, now);
  if ('error' in h) return h;
  return { facts: { hearing: h.at } };
});
registerEffect('court.hearingHeld', ({ case: c, actor, now }: EffectContext) => {
  const h = concludeHearing(c.id, 'held', actor.name, undefined, now);
  if ('error' in h) return h;
});
registerEffect('court.hearingAdjourned', ({ case: c, actor, now }: EffectContext) => {
  const h = concludeHearing(c.id, 'adjourned', actor.name, c.pending?.reason, now);
  if ('error' in h) return h;
});

export const REFERENCE_COURT_CASE: Ref = {
  key: 'court.case', version: 1, owner: 'judiciary', title: 'Case before the court', refPrefix: 'CRT', reference: true, citations: [],
  fields: [
    { key: 'caseType', label: 'Type of case', type: 'choice', options: ['civil', 'commercial', 'family', 'administrative', 'labour', 'criminal', 'other'], required: true },
    { key: 'claimant', label: 'Claimant or applicant (prosecution in a criminal case)', type: 'text', required: true, personal: true },
    { key: 'respondent', label: 'Respondent or accused', type: 'text', required: true, personal: true },
    { key: 'representatives', label: 'Representatives', type: 'longtext', personal: true },
    { key: 'summary', label: 'What is claimed or charged', type: 'longtext', required: true, personal: true },
    { key: 'nextHearing', label: 'Next hearing (YYYY-MM-DD or YYYY-MM-DDTHH:MM)', type: 'text' },
    { key: 'hearingKind', label: 'Kind of hearing', type: 'text' },
    { key: 'courtroom', label: 'Courtroom', type: 'text' },
  ],
  documents: [
    { class: 'originating-document', label: 'Claim form, application or indictment', required: true },
    { class: 'proof-of-service', label: 'Proof of service', required: true },
    { class: 'pleading', label: 'Pleadings and submissions', required: false },
    { class: 'exhibit', label: 'Exhibits', required: false },
    { class: 'judgment', label: 'Judgment with reasons (signed)', required: true },
    { class: 'enforcement-order', label: 'Enforcement order', required: false },
  ],
  stages: [
    { key: 'filed', label: 'Filed' }, { key: 'registry-review', label: 'Registry review' }, { key: 'accepted', label: 'Accepted' },
    { key: 'served', label: 'Served' }, { key: 'pending-hearing', label: 'Pending hearing' }, { key: 'heard', label: 'Hearing held' },
    { key: 'reserved', label: 'Judgment reserved' }, { key: 'judgment', label: 'Judgment issued: appeal period' },
    { key: 'stayed', label: 'Stayed' }, { key: 'appealed', label: 'Appealed' }, { key: 'final', label: 'Final' },
    { key: 'enforcement', label: 'Enforcement' }, { key: 'rejected', label: 'Rejected for procedural reasons', terminal: true },
    { key: 'withdrawn', label: 'Withdrawn or settled', terminal: true }, { key: 'archived', label: 'Archived', terminal: true },
  ],
  actions: [
    { key: 'review', label: 'Registry review', from: ['filed'], to: 'registry-review', needs: { role: 'officer' }, requires: { documents: ['originating-document'], fields: ['caseType', 'claimant', 'respondent', 'summary'] } },
    { key: 'accept', label: 'Accept for hearing', from: ['registry-review'], to: 'accepted', needs: { role: 'officer' } },
    { key: 'reject', label: 'Reject for procedural reasons', from: ['registry-review'], to: 'rejected', decision: 'procedural-rejection', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'record-service', label: 'Record service on the parties', from: ['accepted'], to: 'served', needs: { role: 'officer' }, requires: { documents: ['proof-of-service'] } },
    { key: 'schedule', label: 'Schedule a hearing', from: ['served', 'heard', 'pending-hearing'], to: 'pending-hearing', needs: { role: 'officer' }, requires: { fields: ['nextHearing'] }, effects: ['court.scheduleHearing'] },
    { key: 'hold-hearing', label: 'Hearing held', from: ['pending-hearing'], to: 'heard', needs: { role: 'officer' }, effects: ['court.hearingHeld'] },
    { key: 'adjourn', label: 'Adjourn the hearing', from: ['pending-hearing'], to: 'served', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['court.hearingAdjourned'] },
    { key: 'reserve', label: 'Reserve judgment', from: ['heard'], to: 'reserved', needs: { role: 'signatory' } },
    { key: 'deliver', label: 'Deliver judgment', from: ['heard', 'reserved'], to: 'judgment', decision: 'judgment', needs: { role: 'signatory' }, requires: { documents: ['judgment'], reasons: true } },
    { key: 'stay', label: 'Stay the proceedings or the judgment', from: ['served', 'pending-hearing', 'heard', 'reserved', 'judgment', 'appealed', 'enforcement'], to: 'stayed', decision: 'stay', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'lift-stay', label: 'Lift the stay', from: ['stayed'], to: 'served', decision: 'lift-stay', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'record-appeal', label: 'Record that an appeal was lodged (the appeal is its own case)', from: ['judgment', 'final'], to: 'appealed', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'appeal-decided', label: 'Appeal decided: record the outcome', from: ['appealed'], to: 'final', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'make-final', label: 'Appeal period over: final', from: ['judgment'], to: 'final', needs: { role: 'officer' } },
    { key: 'enforce', label: 'Issue an enforcement order', from: ['final', 'judgment', 'appealed'], to: 'enforcement', decision: 'enforcement-order', needs: { role: 'signatory' }, requires: { documents: ['enforcement-order'], reasons: true } },
    { key: 'withdraw', label: 'Withdrawn or settled', from: ['filed', 'registry-review', 'accepted', 'served', 'pending-hearing', 'heard', 'stayed'], to: 'withdrawn', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'archive', label: 'Archive', from: ['final', 'enforcement'], to: 'archived', needs: { role: 'officer' } },
  ],
  deadlines: [
    { key: 'review', label: 'Registry review within the time the law sets', from: 'opened', sampleDays: 5, calendar: 'working', onLapse: 'escalate' },
    { key: 'appeal', label: 'Appeal period (from judgment, as the law sets it)', from: 'judgment', sampleDays: 30, calendar: 'calendar', onLapse: 'notify' },
  ],
  notifications: [], retention: 'court-record', sensitivity: 'restricted',
  tests: [
    { name: 'heard, judged, final, enforced', steps: [
      { action: 'review', expect: 'refused' },
      { action: 'review', fields: { caseType: 'civil', claimant: 'A', respondent: 'B', summary: 'Debt' }, documents: ['originating-document'], expect: 'registry-review' },
      { action: 'accept', expect: 'accepted' },
      { action: 'record-service', documents: ['proof-of-service'], expect: 'served' },
      { action: 'schedule', fields: { nextHearing: '2030-01-15T09:30' }, expect: 'pending-hearing' },
      { action: 'hold-hearing', expect: 'heard' },
      { action: 'reserve', expect: 'reserved' },
      { action: 'deliver', documents: ['judgment'], expect: 'judgment' },
      { action: 'make-final', expect: 'final' },
      { action: 'enforce', documents: ['enforcement-order'], expect: 'enforcement' },
      { action: 'archive', expect: 'archived' },
    ] },
    { name: 'stayed, appealed, rejected path', steps: [
      { action: 'review', fields: { caseType: 'civil', claimant: 'A', respondent: 'B', summary: 'Debt' }, documents: ['originating-document'], expect: 'registry-review' },
      { action: 'reject', expect: 'rejected' },
    ] },
  ],
};

// The specification's form (judiciary.case-filing), attached to the procedure's own fields and documents (lib/forms/library); still a draft the nation approves.
Object.assign(REFERENCE_COURT_CASE, attachForm(REFERENCE_COURT_CASE.fields, REFERENCE_COURT_CASE.documents, libraryForm('judiciary.case-filing')));

export const COURT_PROCEDURES: Ref[] = [REFERENCE_COURT_CASE];

export function installCourtProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of COURT_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const r = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in r)) drafted.push(p.key);
  }
  return { drafted, present };
}
