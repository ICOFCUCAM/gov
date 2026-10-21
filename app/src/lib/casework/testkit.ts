// A small procedure for the workflow foundation's tests (not shipped to any nation).
import type { CasePackage } from './types';
import { editDraft, listPackages, unsetDays } from './packages';
import { registeredEffects } from './engine';

export function samplePackage(x: Partial<CasePackage> = {}): Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'> {
  return {
    key: 'test.licence', version: 1, owner: 'licensing', title: 'Test licence', refPrefix: 'TL',
    citations: [],
    fields: [{ key: 'name', label: 'Name', type: 'text', required: true, personal: true }, { key: 'premises', label: 'Premises', type: 'text' }],
    documents: [{ class: 'application-form', label: 'Application form', required: true }],
    stages: [{ key: 'submitted', label: 'Submitted' }, { key: 'review', label: 'Under review' }, { key: 'granted', label: 'Granted', terminal: true }, { key: 'refused', label: 'Refused', terminal: true }],
    actions: [
      { key: 'accept', label: 'Accept for review', from: ['submitted'], to: 'review', needs: { role: 'officer' }, requires: { documents: ['application-form'], fields: ['name'] } },
      { key: 'grant', label: 'Grant', from: ['review'], to: 'granted', decision: 'grant', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true } },
      { key: 'refuse', label: 'Refuse', from: ['review'], to: 'refused', decision: 'refuse', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    deadlines: [{ key: 'decide', label: 'Decide within 10 working days', from: 'review', days: 10, calendar: 'working', onLapse: 'escalate' }],
    notifications: [],
    appeal: { days: 30, body: 'Licensing appeals board', suspensive: false },
    retention: 'licences', sensitivity: 'normal',
    tests: [{ name: 'grant', steps: [{ action: 'accept', fields: { name: 'A' }, documents: ['application-form'], expect: 'review' }, { action: 'grant', expect: 'granted' }] }],
    ...x,
  };
}

/** A reference procedure with the day counts the nation sets (in a test: its sample values, as if the nation had chosen them). */
export function asNationSets<P extends Pick<CasePackage, 'deadlines' | 'appeal'>>(p: P): P {
  return {
    ...p,
    deadlines: p.deadlines.map(d => (d.days === undefined ? { ...d, days: d.sampleDays ?? 30 } : d)),
    ...(p.appeal ? { appeal: { ...p.appeal, days: p.appeal.days ?? p.appeal.sampleDays ?? 30 } } : {}),
  };
}

/** Set the day counts on every draft that lacks them, as the nation does before approving its version (a test stand-in for the drafting official). */
export function setNationDays(): void {
  for (const p of listPackages({ state: 'draft' })) if (unsetDays(p).length) editDraft(p.key, p.version, asNationSets({ deadlines: p.deadlines, appeal: p.appeal }), 'Nation drafter', 'nation-drafter', registeredEffects());
}
