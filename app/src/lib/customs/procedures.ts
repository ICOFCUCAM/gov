// Customs on the workflow foundation (owner's Cycle 3 directive, workstream
// 4). One reference procedure, a draft for the customs authority to adapt to
// its law and approve: a goods declaration from lodging to release.
//
//   lodged → checking (amend: a new version of the goods lines)
//          → controls (an officer chooses the channel, with reasons; an
//            inspection is recorded when one was chosen; a matter for another
//            regulator is referred as a linked case to its referral procedure)
//          → assessment (four-eyes: duty per line from the approved tariff,
//            `customs.tariff`, or entered with reasons)
//          → awaiting release (notice and bill) → released / release refused.
//
// No automated risk score, no seizure, penalty or detention: enforcement
// powers stay with the nation's law and a later, reviewed module.

import { registerEffect, registeredEffects, type EffectContext } from '@/lib/casework/engine';
import { libraryForm } from '@/lib/forms/library/definitions';
import { attachForm } from '@/lib/forms/library/build';
import { groupLines } from '@/lib/forms/contract';
import { GOODS_ITEMS } from '@/lib/forms/library/definitions';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { calculate } from '@/lib/law/rules';
import { issueBill } from '@/lib/data/store/payments';
import { nationCurrency } from '@/lib/nation/registry';
import { lodgeDeclaration, amendGoods, chooseChannel, recordCustomsInspection, recordDuty, attachDutyDecision, releaseGoods, refuseRelease, attachReleaseDecision, declarationOfCase, linesOf, type LineDuty, type Declaration } from './register';
import type { Case, CasePackage } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
export const TARIFF_RULE = 'customs.tariff';

const declarationOf = (c: Case): Declaration | undefined => declarationOfCase(c.id);

/** Duty entered by hand, one line each: `line number | duty in minor units`. */
function enteredDuty(c: Case): Map<number, number> {
  const out = new Map<number, number>();
  for (const row of str(c.fields.enteredDuty).split('\n')) {
    const [n, v] = row.split('|').map(x => x.trim());
    if (n && v && Number.isInteger(Number(n)) && Number.isInteger(Number(v))) out.set(Number(n), Number(v));
  }
  return out;
}

/** Duty per line: the approved tariff where it applies, otherwise the amount the officer entered with reasons. */
function dutyLines(c: Case, d: Declaration, on: string): LineDuty[] | { error: string } {
  const entered = enteredDuty(c), reasons = str(c.fields.dutyReasons);
  const out: LineDuty[] = [];
  for (const l of linesOf(d)) {
    const calc = calculate(TARIFF_RULE, { amountMinor: l.valueMinor, code: l.code }, on);
    if (!('error' in calc)) { out.push({ n: l.n, code: l.code, valueMinor: l.valueMinor, dutyMinor: calc.amountMinor, method: { kind: 'rule', rule: calc.rule.key, version: calc.rule.version, digest: calc.rule.digest, citations: calc.rule.citations, steps: calc.steps } }); continue; }
    const v = entered.get(l.n);
    if (v === undefined || v < 0 || !reasons) return { error: `Line ${l.n} (${l.code}): ${calc.error}. Enter its duty (line | amount) and the reasons.` };
    out.push({ n: l.n, code: l.code, valueMinor: l.valueMinor, dutyMinor: v, method: { kind: 'entered', reasons } });
  }
  return out;
}

registerEffect('customs.lodge', ({ case: c, actor, now }: EffectContext) => {
  const f = c.fields;
  const d = lodgeDeclaration({ direction: str(f.direction), declarant: { kind: str(f.declarantKind), ref: str(f.declarantRef), name: str(f.declarantName) }, shipment: { mode: str(f.transportMode), transportRef: str(f.transportRef), from: str(f.dispatchCountry).toUpperCase(), to: str(f.destinationCountry).toUpperCase(), ...(str(f.arrival) ? { arrival: str(f.arrival) } : {}) }, currency: (str(f.currency) || nationCurrency()).toUpperCase(), goods: groupLines(f.goods, GOODS_ITEMS) }, c.id, actor.name, now);
  if ('error' in d) return d;
  return { facts: { declaration: d.number, lines: linesOf(d).length } };
});

registerEffect('customs.amend', ({ case: c, actor, now }: EffectContext) => {
  const d = declarationOf(c);
  if (!d) return { error: 'Lodge the declaration first' };
  const r = amendGoods(d.number, groupLines(c.fields.goods, GOODS_ITEMS), str(c.fields.amendmentReason) || c.pending?.reason || '', c.id, actor.name, now);
  if ('error' in r) return r;
  return { facts: { declaration: r.number, version: r.versions.length } };
});

registerEffect('customs.channel', ({ case: c, actor, now }: EffectContext) => {
  const d = declarationOf(c);
  if (!d) return { error: 'Lodge the declaration first' };
  const r = chooseChannel(d.number, str(c.fields.channel), str(c.fields.channelReasons), actor.name, now);
  if ('error' in r) return r;
  return { facts: { channel: r.channel!.kind } };
});

registerEffect('customs.inspect', ({ case: c, actor, now }: EffectContext) => {
  const d = declarationOf(c);
  if (!d) return { error: 'Lodge the declaration first' };
  const r = recordCustomsInspection(d.number, { outcome: str(c.fields.inspectionOutcome), findings: str(c.fields.findings) }, c.id, actor.name, now);
  if ('error' in r) return r;
  return { facts: { inspection: r.inspections.at(-1)!.outcome } };
});

registerEffect('customs.checkDuty', ({ case: c, now }: EffectContext) => {
  const d = declarationOf(c);
  if (!d) return { error: 'Lodge the declaration first' };
  if (!d.channel) return { error: 'Choose the control channel first' };
  const lines = dutyLines(c, d, now.toISOString().slice(0, 10));
  if ('error' in lines) return lines;
  return { facts: { proposedMinor: lines.reduce((s, l) => s + l.dutyMinor, 0), byTariff: lines.filter(l => l.method.kind === 'rule').length } };
});

registerEffect('customs.assess', ({ case: c, actor, now }: EffectContext) => {
  const d = declarationOf(c);
  if (!d) return { error: 'Lodge the declaration first' };
  const lines = dutyLines(c, d, now.toISOString().slice(0, 10));
  if ('error' in lines) return lines;
  const r = recordDuty(d.number, lines, c.id, actor.name, now);
  if ('error' in r) return r;
  // Every tariff version the lines were assessed with, once each, kept on the sealed decision.
  const rules = [...new Map(lines.flatMap(l => l.method.kind === 'rule' ? [[`${l.method.rule}@${l.method.version}`, { key: l.method.rule, version: l.method.version, digest: l.method.digest }] as const] : [])).values()];
  return { facts: { assessment: r.assessment!.reference, dutyMinor: r.assessment!.totalMinor }, ...(rules.length ? { rules } : {}), after: (dec?: { id: string }) => { if (dec) attachDutyDecision(r.number, dec.id); } };
});

registerEffect('customs.issueNotice', ({ case: c, actor }: EffectContext) => {
  const d = declarationOf(c);
  if (!d?.assessment) return { error: 'The duty must be assessed before its notice is issued' };
  if (d.assessment.totalMinor === 0) return { facts: { bill: 'none (no duty)' } };
  const due = str(c.fields.dueDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: 'Give the date payment is due (the law sets it; no default is assumed)' };
  const b = issueBill({ kind: 'customs-duty', description: `Duty on ${d.number}`, amountMinor: d.assessment.totalMinor, currency: d.currency, dueDate: due, reference: d.assessment.reference, payer: { kind: d.declarant.kind, id: d.declarant.ref, name: d.declarant.name }, issuer: c.owner }, actor.name);
  if ('error' in b) return b;
  return { facts: { bill: b.id } };
});

registerEffect('customs.release', ({ case: c, actor, now }: EffectContext) => {
  const d = declarationOf(c);
  if (!d) return { error: 'Lodge the declaration first' };
  const r = releaseGoods(d.number, c.pending?.reason ?? 'Released', c.id, actor.name, now);
  if ('error' in r) return r;
  return { facts: { released: r.number }, after: (dec?: { id: string }) => { if (dec) attachReleaseDecision(r.number, dec.id); } };
});

registerEffect('customs.refuseRelease', ({ case: c, actor, now }: EffectContext) => {
  const d = declarationOf(c);
  if (!d) return { error: 'Lodge the declaration first' };
  const r = refuseRelease(d.number, c.pending?.reason ?? str(c.fields.channelReasons), c.id, actor.name, now);
  if ('error' in r) return r;
  return { facts: { releaseRefused: r.number }, after: (dec?: { id: string }) => { if (dec) attachReleaseDecision(r.number, dec.id); } };
});

const GOODS_HELP = 'Goods, one line each: code | description | origin (2 letters) | quantity unit | customs value in minor units';

export const REFERENCE_CUSTOMS_DECLARATION: Ref = {
  key: 'customs.declaration', version: 1, owner: 'customs', title: 'Goods declaration and release', refPrefix: 'CUS', reference: true, citations: [],
  fields: [
    { key: 'direction', label: 'Direction', type: 'choice', options: ['import', 'export', 'transit'], required: true },
    { key: 'declarantKind', label: 'Declarant is', type: 'choice', options: ['organisation', 'person'], required: true },
    { key: 'declarantRef', label: 'Declarant\'s register reference', type: 'text', required: true },
    { key: 'declarantName', label: 'Declarant', type: 'text', required: true },
    { key: 'transportMode', label: 'Mode of transport', type: 'text' },
    { key: 'transportRef', label: 'Transport document (bill of lading, air waybill, consignment note)', type: 'text', required: true },
    { key: 'dispatchCountry', label: 'Country of dispatch (2 letters)', type: 'text', required: true },
    { key: 'destinationCountry', label: 'Country of destination (2 letters)', type: 'text', required: true },
    { key: 'arrival', label: 'Arrival', type: 'date' },
    { key: 'currency', label: 'Currency of the values (the nation\'s by default)', type: 'text' },
    { key: 'goods', label: GOODS_HELP, type: 'longtext', required: true },
    { key: 'amendmentReason', label: 'Why the goods or their classification change (amendments)', type: 'longtext' },
    { key: 'channel', label: 'Control channel', type: 'choice', options: ['release-on-documents', 'documentary-check', 'physical-inspection'] },
    { key: 'channelReasons', label: 'Why this channel (the officer\'s reasons)', type: 'longtext' },
    { key: 'inspectionOutcome', label: 'Inspection outcome', type: 'choice', options: ['no-discrepancy', 'discrepancy'] },
    { key: 'findings', label: 'Inspection findings', type: 'longtext' },
    { key: 'enteredDuty', label: 'Duty entered by hand where no approved tariff applies (line | amount in minor units)', type: 'longtext' },
    { key: 'dutyReasons', label: 'How the entered duty was determined', type: 'longtext' },
    { key: 'dueDate', label: 'Payment due on (as the law sets it)', type: 'date' },
  ],
  documents: [
    { class: 'commercial-invoice', label: 'Commercial invoice', required: true },
    { class: 'transport-document', label: 'Transport document', required: true },
    { class: 'certificate-of-origin', label: 'Certificate of origin (where claimed)', required: false },
    { class: 'inspection-report', label: 'Inspection report', required: false },
  ],
  stages: [
    { key: 'lodged', label: 'Lodged' }, { key: 'checking', label: 'Checking' }, { key: 'controls', label: 'Controls' },
    { key: 'pending-approval', label: 'Assessment' }, { key: 'assessed', label: 'Assessed' }, { key: 'awaiting-release', label: 'Awaiting payment and release' },
    { key: 'released', label: 'Released', terminal: true }, { key: 'release-refused', label: 'Release refused', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
  ],
  actions: [
    { key: 'check', label: 'Record the declaration and check it', from: ['lodged'], to: 'checking', needs: { role: 'officer' }, requires: { documents: ['commercial-invoice', 'transport-document'], fields: ['direction', 'declarantKind', 'declarantRef', 'declarantName', 'transportRef', 'dispatchCountry', 'destinationCountry', 'goods'] }, effects: ['customs.lodge'] },
    { key: 'amend', label: 'Amend the goods or their classification', from: ['checking', 'controls'], to: 'checking', needs: { role: 'officer' }, requires: { fields: ['goods', 'amendmentReason'] }, effects: ['customs.amend'] },
    { key: 'choose', label: 'Choose the control channel', from: ['checking'], to: 'controls', needs: { role: 'officer' }, requires: { fields: ['channel', 'channelReasons'] }, effects: ['customs.channel'] },
    { key: 'inspect', label: 'Record the inspection', from: ['controls'], to: 'controls', needs: { role: 'officer' }, requires: { documents: ['inspection-report'], fields: ['inspectionOutcome', 'findings'] }, effects: ['customs.inspect'] },
    { key: 'propose', label: 'Propose the duty', from: ['controls'], to: 'pending-approval', needs: { role: 'officer' }, requires: { reasons: true }, effects: ['customs.checkDuty'] },
    { key: 'assess', label: 'Assess the duty', from: ['pending-approval'], to: 'assessed', decision: 'assess', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['customs.assess'] },
    { key: 'notify', label: 'Issue the duty notice and bill', from: ['assessed'], to: 'awaiting-release', needs: { role: 'officer' }, effects: ['customs.issueNotice'] },
    { key: 'release', label: 'Release the goods', from: ['awaiting-release'], to: 'released', decision: 'release', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['customs.release'] },
    { key: 'refuse', label: 'Refuse release, with reasons', from: ['controls', 'awaiting-release'], to: 'release-refused', decision: 'refuse-release', needs: { role: 'signatory', fourEyes: true }, requires: { reasons: true }, effects: ['customs.refuseRelease'] },
    { key: 'withdraw', label: 'Withdrawn by the declarant', from: ['lodged', 'checking'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  deadlines: [{ key: 'clear', label: 'Clear within 2 working days of controls', from: 'controls', days: 2, calendar: 'working', onLapse: 'escalate' }],
  notifications: [], appeal: { days: 30, body: 'a review by the customs authority, then the customs appeals tribunal', suspensive: false },
  retention: 'customs-record', sensitivity: 'restricted',
  tests: [
    { name: 'released on documents', steps: [
      { action: 'check', fields: { direction: 'import', declarantKind: 'organisation', declarantRef: 'ORG-1', declarantName: 'A', transportRef: 'T-1', dispatchCountry: 'ET', destinationCountry: 'KE', goods: '0901 | coffee | ET | 1 kg | 100' }, documents: ['commercial-invoice', 'transport-document'], expect: 'checking' },
      { action: 'choose', expect: 'refused' },
      { action: 'choose', fields: { channel: 'release-on-documents', channelReasons: 'Regular trader' }, expect: 'controls' },
      { action: 'propose', expect: 'pending-approval' }, { action: 'assess', expect: 'assessed' },
      { action: 'notify', expect: 'awaiting-release' }, { action: 'release', expect: 'released' },
    ] },
    { name: 'inspected and release refused', steps: [
      { action: 'check', fields: { direction: 'import', declarantKind: 'organisation', declarantRef: 'ORG-1', declarantName: 'A', transportRef: 'T-1', dispatchCountry: 'ET', destinationCountry: 'KE', goods: '0901 | coffee | ET | 1 kg | 100' }, documents: ['commercial-invoice', 'transport-document'], expect: 'checking' },
      { action: 'choose', fields: { channel: 'physical-inspection', channelReasons: 'Officer\'s judgement' }, expect: 'controls' },
      { action: 'inspect', fields: { inspectionOutcome: 'discrepancy', findings: 'x' }, documents: ['inspection-report'], expect: 'controls' },
      { action: 'refuse', expect: 'release-refused' },
    ] },
  ],
};

// The specification's form (customs-declaration-v1), attached to the procedure's own fields and documents (lib/forms/library); still a draft the nation approves.
Object.assign(REFERENCE_CUSTOMS_DECLARATION, attachForm(REFERENCE_CUSTOMS_DECLARATION.fields, REFERENCE_CUSTOMS_DECLARATION.documents, libraryForm('customs-declaration-v1')));

export const CUSTOMS_PROCEDURES: Ref[] = [REFERENCE_CUSTOMS_DECLARATION];

export function installCustomsProcedures(by: string): { drafted: string[]; present: string[] } {
  const drafted: string[] = [], present: string[] = [];
  for (const p of CUSTOMS_PROCEDURES) {
    if (listPackages({ key: p.key }).length) { present.push(p.key); continue; }
    const r = draftPackage(p, by, undefined, registeredEffects());
    if (!('error' in r)) drafted.push(p.key);
  }
  return { drafted, present };
}
