// Police: limited incident intake and referral (directions 16.2, Gate 5).
// What is built is the front door only: an incident report received from a
// person or an officer, triaged, classified against the law in force (the
// classification cites the offence's provision and version), assigned, and
// then referred to another institution as a linked case, converted to an
// investigation, or closed with reasons, and reopened when new information
// arrives. Investigations, evidence, arrest, custody and prosecution
// handover are separate records with their own safeguards and are not built
// here (directions 15.6; Gate 5 says "full investigation later").
//
// An incident is not an allegation, an investigation or anyone's legal
// status: no field records a "suspect" or guilt; people mentioned are
// personal data, read only under the case rules (restricted: the assigned
// officer and those who can sign; every read logged). Closed never means
// evidence destroyed, guilt, or that the matter cannot be reopened.

import { registerEffect, registeredEffects, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import type { CasePackage } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;

export const INCIDENT_CATEGORIES = ['theft', 'burglary', 'assault', 'fraud', 'traffic', 'property-damage', 'missing-person', 'domestic', 'public-order', 'cybercrime', 'other'] as const;

// A classification names the provision it relies on: the step carries the citation (requires.citations).
registerEffect('police.checkClassification', ({ case: c }: EffectContext) => {
  if (!c.fields.category) return { error: 'Choose the category before classifying' };
});

export const REFERENCE_INCIDENT: Ref = {
  key: 'police.incident', version: 1, owner: 'police', title: 'Incident report', refPrefix: 'INC', reference: true, citations: [],
  fields: [
    { key: 'occurredOn', label: 'When it happened (date)', type: 'date', required: true },
    { key: 'place', label: 'Where it happened', type: 'text', required: true, personal: true },
    { key: 'region', label: 'Region', type: 'text' },
    { key: 'category', label: 'Category', type: 'choice', options: [...INCIDENT_CATEGORIES] },
    { key: 'account', label: 'What happened, in the reporting person\'s words', type: 'longtext', required: true, personal: true },
    { key: 'reportingParty', label: 'Who reported it', type: 'text', personal: true },
    { key: 'contact', label: 'How to reach them', type: 'text', personal: true },
    { key: 'personsMentioned', label: 'People mentioned (no finding is made about anyone)', type: 'longtext', personal: true },
    { key: 'urgentRisk', label: 'Someone is at risk now', type: 'boolean' },
  ],
  documents: [
    { class: 'statement', label: 'Written statement', required: false },
    { class: 'media', label: 'Photographs or recordings given with the report', required: false },
    { class: 'referral-note', label: 'Referral note to the receiving institution', required: false },
  ],
  stages: [
    { key: 'received', label: 'Received' }, { key: 'triage', label: 'Triage' }, { key: 'classified', label: 'Classified' },
    { key: 'assigned', label: 'Assigned' }, { key: 'referred', label: 'Referred to another institution' },
    { key: 'investigation', label: 'Converted to an investigation' }, { key: 'closed', label: 'Closed (can be reopened)' },
    { key: 'archived', label: 'Archived under the retention rules', terminal: true },
  ],
  actions: [
    { key: 'triage', label: 'Start triage', from: ['received'], to: 'triage', needs: { role: 'officer' } },
    { key: 'classify', label: 'Classify, citing the provision', from: ['triage'], to: 'classified', needs: { role: 'officer' }, requires: { fields: ['category'], reasons: true, citations: true }, effects: ['police.checkClassification'] },
    { key: 'assign', label: 'Assign to an officer', from: ['classified'], to: 'assigned', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'refer', label: 'Refer to another institution (a linked case)', from: ['triage', 'classified', 'assigned'], to: 'referred', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'convert', label: 'Convert to an investigation', from: ['assigned'], to: 'investigation', decision: 'open-investigation', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
    { key: 'close', label: 'Close: no further police action', from: ['triage', 'classified', 'assigned', 'referred'], to: 'closed', decision: 'no-further-action', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'reopen', label: 'Reopen on new information', from: ['closed', 'referred'], to: 'triage', needs: { role: 'signatory' }, requires: { reasons: true } },
    { key: 'archive', label: 'Archive under the retention rules', from: ['closed'], to: 'archived', needs: { role: 'signatory' }, requires: { reasons: true } },
  ],
  deadlines: [
    { key: 'triage', label: 'Triage within 1 working day', from: 'opened', days: 1, calendar: 'working', onLapse: 'escalate' },
    { key: 'classify', label: 'Classify within 5 working days', from: 'triage', days: 5, calendar: 'working', onLapse: 'escalate' },
  ],
  notifications: [], retention: 'police-incident-report', sensitivity: 'restricted',
  tests: [
    { name: 'classified, assigned, converted', steps: [
      { action: 'triage', expect: 'triage' },
      { action: 'classify', expect: 'refused' },
      { action: 'classify', fields: { category: 'burglary' }, expect: 'classified' },
      { action: 'assign', expect: 'assigned' },
      { action: 'convert', expect: 'investigation' },
    ] },
    { name: 'closed and reopened', steps: [
      { action: 'triage', expect: 'triage' },
      { action: 'close', expect: 'closed' },
      { action: 'reopen', expect: 'triage' },
      { action: 'refer', expect: 'referred' },
    ] },
  ],
};

export const POLICE_PROCEDURES: Ref[] = [REFERENCE_INCIDENT];

export function installPoliceProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of POLICE_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const r = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in r)) drafted.push(p.key);
  }
  return { drafted, present };
}
