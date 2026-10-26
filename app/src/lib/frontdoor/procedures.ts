// The front door's procedures every institution has for the services it
// offers (plan step I13; forms catalogue Part 13 §2.1 and §3.1). Templates
// each institution adopts as its own (`svc.<function>.<institution>`, drafted
// on request like the internal administration procedures) and a second
// official approves; each institution decides its own:
//
//   svc.appointment       appointment booking, rescheduling and cancellation (GOV-SVC-007,
//                         GOV-SVC-008), with any assistance the person needs (GOV-SVC-013)
//   svc.complaint         a complaint about a service (GOV-SVC-011): acknowledged, looked
//                         into and closed with reasons; it decides nothing about the case
//                         complained of, and may be referred to an oversight body (engine refer())
//   svc.reconsideration   administrative reconsideration of a decision of this institution
//                         (GOV-SVC-012): decided by two officials who took no part in the
//                         decision reconsidered, the original kept as sealed beside the outcome
//   svc.refund            refund of a fee (GOV-SVC-018): only a receipt the payments system
//                         holds for a bill this institution issued, for exactly what was paid,
//                         approved by two officials other than the assessor and recorded paid
//                         from the rail's reference by a different official
//
// No period, fee, amount or outcome list the law decides ships: the
// reconsideration and complaint periods are the nation's, set on its
// approved version (deadlines shipped unset); a refund's amount is the
// receipt's. Complaints and reconsiderations are restricted cases: the grounds
// stay on the case, read by the assigned officials and those who can sign.

import { registerEffect, registeredEffects, getCase, type EffectContext } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { getMinistry } from '@/lib/data/store';
import { dualControlRefusal } from '@/lib/data/dual-control';
import { refundableReceipt, instructRefund, recordRefundPaid, refundOfServiceCase } from '@/lib/data/store/payments';
import { setAppointment, recordComplaintOutcome, admitReconsideration, decideReconsideration } from './register';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const sample = (c: Pick<Case, 'source'>) => (c.source === 'sample' ? { sample: true as const } : {});
const officialsOf = (ctx: EffectContext) => [...(ctx.case.pending ? [ctx.case.pending.by] : []), { ...(ctx.actor.id ? { id: ctx.actor.id } : {}), name: ctx.actor.name }];
const reasonOf = (ctx: EffectContext) => ctx.case.pending?.reason ?? '';
const DATE = /^\d{4}-\d{2}-\d{2}$/, TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// ── Effects ────────────────────────────────────────────────────────────────

function appointment(state: 'confirmed' | 'wait-listed' | 'cancelled' | 'attended') {
  return (ctx: EffectContext) => {
    const c = ctx.case;
    let at: string | undefined;
    if (state === 'confirmed') {
      const day = str(c.fields.appointmentDate, 10), time = str(c.fields.appointmentTime, 5);
      if (!DATE.test(day) || !TIME.test(time)) return { error: 'Give the appointment\'s date and time (HH:MM)' };
      at = `${day}T${time}`;
    }
    const a = setAppointment({ case: c.ref, institution: c.owner, service: str(c.fields.service, 80), servicePoint: str(c.fields.servicePoint, 200), state, ...(at ? { at } : {}), when: ctx.now.toISOString(), by: ctx.actor.name, ...sample(c) });
    return { facts: { appointment: a.state, ...(a.at ? { at: a.at } : {}) } };
  };
}
registerEffect('svc.appointment.confirm', appointment('confirmed'));
registerEffect('svc.appointment.waitlist', appointment('wait-listed'));
registerEffect('svc.appointment.cancel', appointment('cancelled'));
registerEffect('svc.appointment.attended', appointment('attended'));

function complaint(outcome: 'resolved' | 'not-upheld') {
  return (ctx: EffectContext) => {
    const c = ctx.case;
    // Recorded with the reasons the sealed decision states.
    return { facts: { complaint: outcome }, after: (d?: { content: { reasons: string } }) => {
      recordComplaintOutcome({ case: c.ref, institution: c.owner, ...(str(c.fields.service, 80) ? { service: str(c.fields.service, 80) } : {}), ...(str(c.fields.relatedCase, 60) ? { relatedCase: str(c.fields.relatedCase, 60) } : {}), outcome, reasons: d?.content.reasons ?? reasonOf(ctx), at: ctx.now.toISOString(), by: officialsOf(ctx).map(x => x.name), ...sample(c) }, ctx.actor.name);
    } };
  };
}
registerEffect('svc.complaint.resolve', complaint('resolved'));
registerEffect('svc.complaint.not-upheld', complaint('not-upheld'));

/** The decision a reconsideration concerns: a closed case of this institution with a sealed decision. */
function originalOf(c: Case): Case | { error: string } {
  const o = getCase(str(c.fields.originalCase, 60));
  if (!o) return { error: 'Name the case whose decision is to be reconsidered (its reference)' };
  if (o.owner !== c.owner) return { error: 'A reconsideration is decided by the institution that made the decision: this case belongs to another institution' };
  if (!o.decisions.length) return { error: 'That case has no decision to reconsider' };
  if (o.id === c.id) return { error: 'A reconsideration cannot concern itself' };
  return o;
}

registerEffect('svc.reconsideration.admit', (ctx: EffectContext) => {
  const o = originalOf(ctx.case);
  if ('error' in o) return o;
  const r = admitReconsideration({ case: ctx.case.ref, institution: ctx.case.owner, original: { id: o.id, ref: o.ref, decisions: [...o.decisions] }, ...sample(ctx.case) }, ctx.actor.name);
  return { facts: { original: r.original.ref } };
});

function reconsider(outcome: 'confirmed' | 'varied' | 'revoked') {
  return (ctx: EffectContext) => {
    const o = originalOf(ctx.case);
    if ('error' in o) return o;
    // Decided by officials who took no part in the decision reconsidered: no one who took a step of that case (persons, never only accounts).
    const earlier = o.history.flatMap(s => [s.by, ...(s.confirmedBy ? [s.confirmedBy] : [])]).filter(p => p.name);
    for (const me of officialsOf(ctx)) for (const e of earlier) {
      if (!dualControlRefusal({ by: e.name, ...(e.id ? { byId: e.id } : {}) }, { by: me.name, ...(me.id ? { byId: me.id } : {}) })) continue;
      return { error: `A reconsideration is decided by officials who took no part in the decision: ${e.name} took a step of ${o.ref}` };
    }
    const correction = outcome === 'confirmed' ? '' : str(ctx.case.fields.correction, 2000);
    if (outcome !== 'confirmed' && !correction) return { error: 'Say what the original procedure must now do (the decision is corrected there, never here)' };
    const r = decideReconsideration(ctx.case.ref, outcome, reasonOf(ctx), correction, officialsOf(ctx).map(x => x.name), ctx.now.toISOString(), ctx.actor.name);
    return 'error' in r ? r : { facts: { original: o.ref, outcome } };
  };
}
registerEffect('svc.reconsideration.confirm', reconsider('confirmed'));
registerEffect('svc.reconsideration.vary', reconsider('varied'));
registerEffect('svc.reconsideration.revoke', reconsider('revoked'));

registerEffect('svc.refund.assess', (ctx: EffectContext) => {
  const r = refundableReceipt(str(ctx.case.fields.receipt, 60), ctx.case.owner);
  if ('error' in r) return r;
  return { facts: { receipt: r.receipt.id, amountMinor: r.receipt.amountMinor, currency: r.receipt.currency } };
});

registerEffect('svc.refund.instruct', (ctx: EffectContext) => {
  const r = instructRefund({ receipt: str(ctx.case.fields.receipt, 60), institution: ctx.case.owner, case: ctx.case.ref }, ctx.actor.name, ctx.now);
  return 'error' in r ? r : { facts: { refund: r.id, amountMinor: r.amountMinor, currency: r.currency } };
});

registerEffect('svc.refund.paid', (ctx: EffectContext) => {
  const x = refundOfServiceCase(ctx.case.ref);
  if (!x) return { error: 'No refund was instructed by this case' };
  const r = recordRefundPaid(x.id, { rail: str(ctx.case.fields.rail, 60), railReference: str(ctx.case.fields.railReference, 120), paidAt: str(ctx.case.fields.paidOn, 10) }, ctx.actor.name);
  return 'error' in r ? r : { facts: { refund: r.id, paid: r.paid!.railReference } };
});

// ── Reference procedures (templates) ──────────────────────────────────────

const f = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'administrative', ...extra });
const restricted = (key: string, label: string, type: FieldSpec['type'] = 'longtext', extra: Partial<FieldSpec> = {}): FieldSpec => f(key, label, type, { personalDataClass: 'restricted', ...extra });
const base = { reference: true as const, citations: [], notifications: [], owner: 'institution' };

/** The templates; each institution drafts `svc.<name>.<institution>` from them. */
export const FRONTDOOR_PROCEDURES: (Ref & { forms: string[] })[] = [
  {
    ...base, sensitivity: 'normal', retention: 'service-appointment', key: 'svc.appointment', version: 1, refPrefix: 'SAPT', forms: ['GOV-SVC-007', 'GOV-SVC-008', 'GOV-SVC-013'],
    title: 'Appointment',
    fields: [
      f('service', 'The service the appointment is for (its catalogue id)', 'text', { required: true }),
      f('servicePoint', 'Office or service point', 'text', { required: true }),
      f('preferredDate', 'Preferred date', 'date'),
      restricted('accessNeeds', 'Assistance or adjustments you need (restricted)'),
      f('appointmentDate', 'Appointment date', 'date', { audience: 'officer' }),
      f('appointmentTime', 'Appointment time (HH:MM)', 'text', { audience: 'officer' }),
    ],
    documents: [],
    stages: [{ key: 'requested', label: 'Requested' }, { key: 'confirmed', label: 'Confirmed' }, { key: 'wait-listed', label: 'On the waiting list' }, { key: 'attended', label: 'Attended', terminal: true }, { key: 'cancelled', label: 'Cancelled', terminal: true }],
    actions: [
      { key: 'confirm', label: 'Confirm a date and time', from: ['requested', 'wait-listed', 'confirmed'], to: 'confirmed', needs: { role: 'officer' }, requires: { fields: ['service', 'servicePoint', 'appointmentDate', 'appointmentTime'] }, effects: ['svc.appointment.confirm'] },
      { key: 'waitlist', label: 'Put on the waiting list', from: ['requested', 'confirmed'], to: 'wait-listed', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['svc.appointment.waitlist'] },
      { key: 'attended', label: 'Record that it took place', from: ['confirmed'], to: 'attended', needs: { role: 'officer' }, effects: ['svc.appointment.attended'] },
      { key: 'cancel', label: 'Cancel, with reasons', from: ['requested', 'confirmed', 'wait-listed'], to: 'cancelled', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['svc.appointment.cancel'] },
    ],
    deadlines: [],
    tests: [{ name: 'confirmed and attended', steps: [{ action: 'confirm', expect: 'refused' }, { action: 'confirm', fields: { service: 'SVC-x', servicePoint: 'Office', appointmentDate: '2026-11-02', appointmentTime: '10:30' }, expect: 'confirmed' }, { action: 'confirm', expect: 'confirmed' }, { action: 'attended', expect: 'attended' }] }, { name: 'cancelled', steps: [{ action: 'cancel', expect: 'cancelled' }] }],
  },
  {
    ...base, sensitivity: 'restricted', retention: 'service-complaint', key: 'svc.complaint', version: 1, refPrefix: 'SCMP', forms: ['GOV-SVC-011'],
    title: 'Service complaint',
    fields: [
      f('service', 'The service complained about (its catalogue id)', 'text'),
      f('relatedCase', 'Your case reference, if any', 'text'),
      restricted('complaintDescription', 'What went wrong (restricted)', 'longtext', { required: true }),
      restricted('outcomeSought', 'What you would like to happen (restricted)'),
    ],
    documents: [{ class: 'complaint-response', label: 'The response sent to the complainant', required: true }],
    stages: [{ key: 'received', label: 'Received' }, { key: 'acknowledged', label: 'Acknowledged' }, { key: 'investigation', label: 'Being looked into' }, { key: 'resolved', label: 'Resolved', terminal: true }, { key: 'not-upheld', label: 'Not upheld', terminal: true }],
    actions: [
      { key: 'acknowledge', label: 'Acknowledge', from: ['received'], to: 'acknowledged', needs: { role: 'officer' }, requires: { fields: ['complaintDescription'] } },
      { key: 'investigate', label: 'Look into it', from: ['acknowledged'], to: 'investigation', needs: { role: 'officer', assigned: true } },
      { key: 'resolve', label: 'Resolve, with reasons', from: ['investigation'], to: 'resolved', decision: 'resolve-complaint', needs: { role: 'signatory' }, requires: { documents: ['complaint-response'], reasons: true }, effects: ['svc.complaint.resolve'] },
      { key: 'not-upheld', label: 'Not upheld, with reasons', from: ['investigation'], to: 'not-upheld', decision: 'complaint-not-upheld', needs: { role: 'signatory' }, requires: { documents: ['complaint-response'], reasons: true }, effects: ['svc.complaint.not-upheld'] },
    ],
    // The time to answer a complaint is the nation's: set on its approved version (shipped unset; a demonstration's sample value is marked Sample).
    deadlines: [{ key: 'answer', label: 'Answer the complaint', from: 'opened', sampleDays: 20, calendar: 'working', onLapse: 'escalate' }],
    tests: [{ name: 'resolved', steps: [{ action: 'acknowledge', expect: 'refused' }, { action: 'acknowledge', fields: { complaintDescription: 'Waited too long' }, expect: 'acknowledged' }, { action: 'investigate', expect: 'investigation' }, { action: 'resolve', documents: ['complaint-response'], expect: 'resolved' }] }],
  },
  {
    ...base, sensitivity: 'restricted', retention: 'service-reconsideration', key: 'svc.reconsideration', version: 1, refPrefix: 'SREC', forms: ['GOV-SVC-012'],
    title: 'Administrative reconsideration',
    fields: [
      f('originalCase', 'The case whose decision you ask to be reconsidered (its reference)', 'text', { required: true }),
      restricted('grounds', 'Why the decision should be reconsidered (restricted)', 'longtext', { required: true }),
      restricted('newEvidence', 'Anything new you want considered (restricted)'),
      f('correction', 'What the original procedure must now do (when varied or revoked)', 'longtext', { audience: 'officer' }),
    ],
    documents: [{ class: 'reconsideration-notice', label: 'The reconsideration decision sent to the applicant', required: true }],
    stages: [{ key: 'received', label: 'Received' }, { key: 'admitted', label: 'Under reconsideration' }, { key: 'confirmed', label: 'Decision confirmed', terminal: true }, { key: 'varied', label: 'Decision varied', terminal: true }, { key: 'revoked', label: 'Decision revoked', terminal: true }, { key: 'inadmissible', label: 'Not admissible', terminal: true }],
    actions: [
      { key: 'admit', label: 'Admit for reconsideration', from: ['received'], to: 'admitted', needs: { role: 'officer' }, requires: { fields: ['originalCase', 'grounds'] }, effects: ['svc.reconsideration.admit'] },
      { key: 'confirm-decision', label: 'Confirm the decision', from: ['admitted'], to: 'confirmed', decision: 'reconsideration-confirm', needs: { role: 'signatory', fourEyes: true }, requires: { documents: ['reconsideration-notice'], reasons: true }, effects: ['svc.reconsideration.confirm'] },
      { key: 'vary', label: 'Vary the decision', from: ['admitted'], to: 'varied', decision: 'reconsideration-vary', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['correction'], documents: ['reconsideration-notice'], reasons: true }, effects: ['svc.reconsideration.vary'] },
      { key: 'revoke', label: 'Revoke the decision', from: ['admitted'], to: 'revoked', decision: 'reconsideration-revoke', needs: { role: 'signatory', fourEyes: true }, requires: { fields: ['correction'], documents: ['reconsideration-notice'], reasons: true }, effects: ['svc.reconsideration.revoke'] },
      { key: 'inadmissible', label: 'Not admissible, with reasons', from: ['received'], to: 'inadmissible', decision: 'reconsideration-inadmissible', needs: { role: 'signatory' }, requires: { reasons: true } },
    ],
    // The time to ask and to decide are the nation's law: set on its approved version (shipped unset).
    deadlines: [{ key: 'decide', label: 'Decide the reconsideration', from: 'opened', sampleDays: 30, calendar: 'calendar', onLapse: 'escalate' }],
    tests: [
      { name: 'confirmed', steps: [{ action: 'admit', expect: 'refused' }, { action: 'admit', fields: { originalCase: 'X-1', grounds: 'Wrong facts' }, expect: 'admitted' }, { action: 'confirm-decision', documents: ['reconsideration-notice'], expect: 'confirmed' }] },
      { name: 'varied', steps: [{ action: 'admit', fields: { originalCase: 'X-1', grounds: 'Wrong facts' }, expect: 'admitted' }, { action: 'vary', documents: ['reconsideration-notice'], expect: 'refused' }, { action: 'vary', fields: { correction: 'Correct the date' }, documents: ['reconsideration-notice'], expect: 'varied' }] },
      { name: 'inadmissible', steps: [{ action: 'inadmissible', expect: 'inadmissible' }] },
    ],
  },
  {
    ...base, sensitivity: 'normal', retention: 'service-refund', key: 'svc.refund', version: 1, refPrefix: 'SRFD', forms: ['GOV-SVC-018'],
    title: 'Service fee refund',
    fields: [
      f('receipt', 'The payment receipt (its number)', 'text', { required: true }),
      f('service', 'The service the fee was for (its catalogue id)', 'text'),
      restricted('grounds', 'Why the fee should be refunded (restricted)', 'longtext', { required: true }),
      f('rail', 'How the refund was paid (the payment rail)', 'text', { audience: 'officer' }),
      f('railReference', 'The refund\'s payment reference on that rail', 'text', { audience: 'officer' }),
      f('paidOn', 'Date the refund was paid', 'date', { audience: 'officer' }),
    ],
    documents: [{ class: 'refund-decision', label: 'The refund decision sent to the applicant', required: true }],
    stages: [{ key: 'received', label: 'Received' }, { key: 'assessed', label: 'Assessed' }, { key: 'approved', label: 'Refund approved' }, { key: 'paid', label: 'Refund paid', terminal: true }, { key: 'turned-down', label: 'Refused', terminal: true }],
    actions: [
      { key: 'assess', label: 'Assess against the receipt', from: ['received'], to: 'assessed', needs: { role: 'officer' }, requires: { fields: ['receipt', 'grounds'] }, effects: ['svc.refund.assess'] },
      { key: 'approve', label: 'Approve the refund of what was paid', from: ['assessed'], to: 'approved', decision: 'approve-refund', needs: { role: 'signatory', fourEyes: true, distinctFrom: ['assess'] }, requires: { documents: ['refund-decision'], reasons: true }, effects: ['svc.refund.instruct'] },
      { key: 'record-paid', label: 'Record the refund paid', from: ['approved'], to: 'paid', needs: { role: 'officer', distinctFrom: ['approve'] }, requires: { fields: ['rail', 'railReference', 'paidOn'] }, effects: ['svc.refund.paid'] },
      { key: 'refuse', label: 'Refuse, with reasons', from: ['received', 'assessed'], to: 'turned-down', decision: 'refuse-refund', needs: { role: 'signatory' }, requires: { documents: ['refund-decision'], reasons: true } },
    ],
    deadlines: [],
    tests: [{ name: 'paid', steps: [{ action: 'assess', expect: 'refused' }, { action: 'assess', fields: { receipt: 'PR-1', grounds: 'Service not delivered' }, expect: 'assessed' }, { action: 'approve', documents: ['refund-decision'], expect: 'approved' }, { action: 'record-paid', fields: { rail: 'Bank', railReference: 'R1', paidOn: '2026-11-01' }, expect: 'paid' }] }, { name: 'refused', steps: [{ action: 'refuse', documents: ['refund-decision'], expect: 'turned-down' }] }],
  },
];

/** The key an institution's own version of a template takes: svc.<name>.<institution>. */
export const frontdoorKey = (template: string, institution: string) => `${template}.${institution.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`.slice(0, 60);

/** Draft the institution's own front-door procedures from the templates (once each); a second official approves each. */
export function installFrontdoorProcedures(institution: string, by: string, byId?: string): { drafted: string[]; present: string[] } | { error: string } {
  const m = getMinistry(institution);
  if (!m) return { error: 'No such institution' };
  const drafted: string[] = [], present: string[] = [];
  for (const t of FRONTDOOR_PROCEDURES) {
    const key = frontdoorKey(t.key, institution);
    if (listPackages({ key }).length) { present.push(key); continue; }
    const { forms: _forms, ...pkg } = t;
    const d = draftPackage({ ...pkg, key, owner: institution, title: `${t.title} (${m.name})` }, by, byId, registeredEffects());
    if ('error' in d) return { error: `${key}: ${d.error}` };
    drafted.push(key);
  }
  return { drafted, present };
}
