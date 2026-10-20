// Cross-institution referral as a case (directions 16.7): when one
// institution needs another's work (Education asks Health for a fire and
// health inspection of a campus before accrediting it), the referring
// official opens a case under the receiving institution's referral
// procedure from their own case (engine refer(): linked both ways, audited).
// The receiving institution works it under its own approved version, with a
// deadline, and its report closes it; the originating case is told in the
// audit chain. Each institution adopts the template as its own procedure,
// `referral.<institution>`, drafted here and approved by a second official
// like any other.

import { registerEffect, registeredEffects, getCase, type EffectContext } from './engine';
import { draftPackage, listPackages } from './packages';
import { recordAudit } from '@/lib/data/store/audit';
import { getMinistry } from '@/lib/data/store';
import type { CasePackage } from './types';

registerEffect('referral.reportToOrigin', ({ case: c, actor }: EffectContext) => {
  const from = c.links.find(l => l.kind === 'referred-from')?.case;
  const origin = from ? getCase(from) : undefined;
  if (!origin) return { error: 'This case was not opened by a referral' };
  recordAudit(actor.name, 'case.referral.report', `Case:${origin.ref}`, 'ok', `${c.ref} reported back${c.pending?.reason ? `: ${c.pending.reason.slice(0, 200)}` : ''}`);
  return { facts: { reportedTo: origin.ref } };
});

/** The referral key of an institution's procedure. */
export const referralKey = (institution: string) => `referral.${institution.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

export function referralTemplate(institution: string, title: string): Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'> {
  return {
    key: referralKey(institution), version: 1, owner: institution, title: `Referral to ${title}`, refPrefix: 'REF', reference: true, citations: [],
    fields: [
      { key: 'request', label: 'What is asked', type: 'longtext', required: true },
      { key: 'site', label: 'Registered site concerned (id)', type: 'text' },
    ],
    documents: [{ class: 'referral-report', label: 'Report to the referring institution', required: true }],
    stages: [{ key: 'received', label: 'Received' }, { key: 'working', label: 'In hand' }, { key: 'reported', label: 'Reported back', terminal: true }, { key: 'declined', label: 'Declined', terminal: true }],
    actions: [
      { key: 'accept', label: 'Accept the referral', from: ['received'], to: 'working', needs: { role: 'officer' }, requires: { fields: ['request'] } },
      { key: 'report', label: 'Report back', from: ['working'], to: 'reported', needs: { role: 'officer' }, requires: { documents: ['referral-report'], reasons: true }, effects: ['referral.reportToOrigin'] },
      { key: 'decline', label: 'Decline, with reasons', from: ['received', 'working'], to: 'declined', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['referral.reportToOrigin'] },
    ],
    deadlines: [{ key: 'report', label: 'Report back within 15 working days', from: 'opened', days: 15, calendar: 'working', onLapse: 'escalate' }],
    notifications: [], retention: 'case-file-standard', sensitivity: 'normal',
    tests: [
      { name: 'reported', steps: [{ action: 'accept', fields: { request: 'Inspect the campus' }, expect: 'working' }, { action: 'report', expect: 'refused' }, { action: 'report', documents: ['referral-report'], expect: 'reported' }] },
      { name: 'declined', steps: [{ action: 'decline', expect: 'declined' }] },
    ],
  };
}

/** Draft an institution's referral procedure from the template (once). */
export function draftReferralProcedure(institution: string, by: string): { drafted: string } | { present: string } | { error: string } {
  const m = getMinistry(institution);
  if (!m) return { error: 'No such institution' };
  const key = referralKey(institution);
  if (listPackages({ key }).length) return { present: key };
  const r = draftPackage(referralTemplate(institution, m.name), by, undefined, registeredEffects());
  return 'error' in r ? r : { drafted: key };
}
