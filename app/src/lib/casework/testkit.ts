// A small procedure for the workflow foundation's tests (not shipped to any nation).
import type { CasePackage } from './types';

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
