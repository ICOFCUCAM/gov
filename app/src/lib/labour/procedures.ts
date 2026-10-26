// Labour and employment on the workflow foundation (Institutional
// specification Part 2 §C.5; catalogue supplement Part 14 LAB-EMP-001 … 020;
// plan step I6). Reference procedures, drafts the nation adapts and a second
// official approves, kept by the institution the nation names for the
// `labour` slot (never assumed):
//
//   labour.employer-registration    an employer and its workplaces (LAB-EMP-003)
//   labour.employment-registration  an employment relationship; a worker who is not a national is checked through the
//                                   immigration.status exchange, never refused on an unanswered check (LAB-EMP-001, 002, 007)
//   labour.vacancy                  a vacancy notified and published (LAB-EMP-004)
//   labour.jobseeker                a jobseeker registered, referred and placed (LAB-EMP-005, 006)
//   labour.inspection               a workplace inspection: visit, findings with evidence, corrective orders, the
//                                   employer's responses, verification, closure (LAB-EMP-008, 020)
//   labour.complaint                a labour complaint or wage claim: the allegation kept apart from any finding
//                                   (LAB-EMP-009, 011)
//   labour.injury                   an occupational injury or incident notification; medical content only as a sealed
//                                   document (LAB-EMP-010)
//   labour.mediation                a request for mediation, individual or collective (LAB-EMP-012, 013)
//   labour.notice                   a strike, work-stoppage, redundancy or collective dismissal notice (LAB-EMP-014, 015)
//
// No score, no automatic finding, no AI decision; every decision classified
// under a proposed, unapproved mapping (LABOUR_PERMITS). No day count ships.

import { registerEffect, registeredEffects, sampleMark, type EffectContext, type EffectResult } from '@/lib/casework/engine';
import { draftPackage, listPackages } from '@/lib/casework/packages';
import { getDocument } from '@/lib/records/documents';
import { callService } from '@/lib/exchange/services';
import { getOrganisation } from '@/lib/organisations/register';
import { getSovereign } from '@/lib/data/store';
import {
  registerEmployer, attachLabourDecision, getEmployer, registerEmployment, publishVacancy, closeVacancy, registerJobseeker, referJobseeker, placeJobseeker,
  openInspection, recordVisit, recordFinding, issueOrders, recordResponse, verifyOrder, closeInspection, inspectionOfCase, recordInjury, closeInjury,
  openMediation, recordSession, recordMediationOutcome, acknowledgeNotice,
} from './register';
import type { Case, CasePackage, FieldSpec } from '@/lib/casework/types';

type Ref = Omit<CasePackage, 'state' | 'createdAt' | 'author' | 'authorId' | 'approvedBy' | 'approvedAt'>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const num = (v: unknown) => (typeof v === 'number' ? v : Number(str(v)));
const lines = (v: unknown): string[] => str(v).split(/\n/).map(x => x.trim()).filter(Boolean);
const list = (v: unknown): string[] => str(v).split(/[\n;,]/).map(x => x.trim()).filter(Boolean);
const reasonOf = (done: Case, fallback: string) => done.history.at(-1)?.reason ?? fallback;

/** The permit type whose approved mapping governs each family's decisions (lib/permits/decisions.ts reads it). */
export const LABOUR_PERMITS: Record<string, string> = {
  'labour.employer-registration': 'labour-employer-registration',
  'labour.employment-registration': 'labour-employment-registration',
  'labour.inspection': 'labour-inspection-order',
  'labour.complaint': 'labour-complaint-decision',
};

// ── Employers and employment ─────────────────────────────────────────────────

const employerInput = (c: Case) => ({
  ...(str(c.fields.organisation) ? { organisation: str(c.fields.organisation) } : {}), name: str(c.fields.employerName), industry: str(c.fields.industry), representative: str(c.fields.representative),
  workplaces: lines(c.fields.workplaces).map(l => { const [address, region] = l.split('|').map(x => x.trim()); return { address: address ?? '', ...(region ? { region } : {}) }; }),
});
registerEffect('labour.checkEmployer', ({ case: c }: EffectContext) => {
  const org = str(c.fields.organisation);
  if (org && !getOrganisation(org)) return { error: `${org} is not in the organisations register: an employer is an organisation of that register (or, where the law allows, an individual named here)` };
  if (!lines(c.fields.workplaces).length) return { error: 'Give at least one workplace (address | region, one per line)' };
  return { facts: { organisation: org || 'none' } };
});
registerEffect('labour.registerEmployer', ({ case: c, actor, now }: EffectContext) => {
  const e = registerEmployer({ ...employerInput(c), ...sampleMark(c) }, c.id, actor.name, now);
  if ('error' in e) return e;
  return { facts: { employer: e.number }, after: d => { if (d) attachLabourDecision('employer', e.number, d.id); } };
});

/** A worker who is not a national: the immigration authority answers whether a permit is valid (the receipt is kept, never the file). */
registerEffect('labour.checkAuthorisation', async ({ case: c }: EffectContext): Promise<EffectResult> => {
  const e = getEmployer(str(c.fields.employer));
  if (!e || e.state !== 'registered') return { error: `${str(c.fields.employer) || 'The employer'} is not a registered employer` };
  const nationality = str(c.fields.workerNationality).toUpperCase();
  const own = (getSovereign().iso3 ?? '').toUpperCase();
  if (!nationality || nationality === own) return { facts: { workAuthorisation: 'not-required' } };
  const r = await callService({ kind: 'module', id: 'labour', name: 'Employment registration' }, 'immigration.status', { nationality, documentNumber: str(c.fields.workerDocument), kind: 'residence-permit' }, 'employment registration');
  if (r.status !== 200 || r.data?.valid !== 'yes') return { error: `The work authorisation is not confirmed (${r.data?.valid === 'no' ? 'no valid permit found' : r.error ?? 'the immigration service did not answer'}): refer the worker to the immigration authority (LAB-EMP-007) or hold the case; this is never a refusal by itself` };
  return { facts: { workAuthorisation: 'valid', receipt: r.receipt.id } };
});
registerEffect('labour.registerEmployment', ({ case: c, actor, now }: EffectContext) => {
  const f = c.fields;
  const checked = (c.verifications ?? []).at(-1);
  const nationality = str(f.workerNationality).toUpperCase();
  const own = (getSovereign().iso3 ?? '').toUpperCase();
  const step = [...c.history].reverse().find(h => h.action === 'check-authorisation');
  const x = registerEmployment({
    employer: str(f.employer), worker: { reference: str(f.workerReference), name: str(f.workerName), ...(nationality ? { nationality } : {}) },
    startDate: str(f.startDate), employmentType: str(f.employmentType), occupation: str(f.occupation), ...(str(f.workplace) ? { workplace: str(f.workplace) } : {}),
    workAuthorisation: !nationality || nationality === own ? { result: 'not-required' } : { result: 'valid', receipt: checked?.receipt ?? `step ${step?.seq ?? '?'} of ${c.ref}`, at: step?.at ?? now.toISOString() },
    ...sampleMark(c),
  }, c.id, actor.name, now);
  if ('error' in x) return x;
  return { facts: { employment: x.number }, after: d => { if (d) attachLabourDecision('employment', x.number, d.id); } };
});

// ── Employment services ──────────────────────────────────────────────────────

registerEffect('labour.publishVacancy', ({ case: c, actor, now }: EffectContext) => {
  if (c.fields.publicationConsent !== true) return { error: 'The employer consents to publication first' };
  const v = publishVacancy({ employer: str(c.fields.employer), title: str(c.fields.vacancyTitle), occupation: str(c.fields.occupation), location: str(c.fields.workLocation), ...(str(c.fields.closingDate) ? { closingDate: str(c.fields.closingDate) } : {}), ...sampleMark(c) }, c.id, actor.name, now);
  return 'error' in v ? v : { facts: { vacancy: v.number } };
});
registerEffect('labour.closeVacancy', (ctx: EffectContext) => {
  const n = str(ctx.case.fields.vacancyNumber);
  if (!n) return { error: 'Name the vacancy (its number)' };
  const state = ctx.action.key === 'filled' ? 'filled' : 'closed';
  return { facts: { vacancy: n, state }, after: (_d, done) => { closeVacancy(n, state, reasonOf(done, state), done.id, ctx.actor.name); } };
});
registerEffect('labour.registerJobseeker', ({ case: c, actor, now }: EffectContext) => {
  const j = registerJobseeker({ reference: str(c.fields.reference), occupations: list(c.fields.occupationsSought), ...(str(c.fields.availableFrom) ? { availableFrom: str(c.fields.availableFrom) } : {}), ...sampleMark(c) }, c.id, actor.name, now);
  return 'error' in j ? j : { facts: { jobseeker: j.number } };
});
registerEffect('labour.refer', ({ case: c, actor, now }: EffectContext) => {
  const j = referJobseeker(c.id, str(c.fields.referVacancy), c.id, actor.name, now);
  return 'error' in j ? j : { facts: { referred: str(c.fields.referVacancy) } };
});
registerEffect('labour.place', ({ case: c, actor }: EffectContext) => {
  const j = placeJobseeker(c.id, str(c.fields.placedVacancy), c.id, actor.name);
  return 'error' in j ? j : { facts: { placed: str(c.fields.placedVacancy) } };
});

// ── Inspection ───────────────────────────────────────────────────────────────

registerEffect('labour.recordVisit', ({ case: c, actor, now }: EffectContext) => {
  const x = openInspection({ employer: str(c.fields.employer), ...(str(c.fields.workplace) ? { workplace: str(c.fields.workplace) } : {}), ...(str(c.fields.fromComplaint) ? { fromComplaint: str(c.fields.fromComplaint) } : {}), ...sampleMark(c) }, c.id, actor.name, now);
  if ('error' in x) return x;
  const v = recordVisit(c.id, { date: str(c.fields.visitDate), basis: str(c.fields.legalBasis) }, actor.name, now);
  return 'error' in v ? v : { facts: { inspection: v.number } };
});
const findingOf = (c: Case) => ({ requirement: str(c.fields.findingRequirement), observation: str(c.fields.findingObservation), evidence: lines(c.fields.findingEvidence), severity: str(c.fields.findingSeverity) });
registerEffect('labour.recordFinding', (ctx: EffectContext) => {
  const c = ctx.case;
  const x = inspectionOfCase(c.id);
  if (!x?.visit) return { error: 'A finding is recorded after the visit' };
  const f = findingOf(c);
  if (!f.requirement || !f.observation || !f.evidence.length || !f.severity) return { error: 'A finding names the requirement, what was observed, the evidence (one item per line) and its severity in the nation\'s scale' };
  const correct = ctx.action.key === 'correct-finding' ? num(c.fields.correctFinding) : undefined;
  if (correct !== undefined && !x.findings.some(y => y.n === correct)) return { error: `No finding ${c.fields.correctFinding} in this inspection` };
  return { facts: { finding: correct ?? x.findings.length + 1 }, after: (_d, done) => { recordFinding(c.id, { ...f, ...(correct !== undefined ? { correct } : {}) }, reasonOf(done, 'Finding recorded'), ctx.actor.name, ctx.now); } };
});
const ordersOf = (c: Case) => lines(c.fields.orders).map(l => { const [finding, action, due] = l.split('|').map(x => x.trim()); return { finding: Number(finding), action: action ?? '', ...(due ? { due } : {}) }; });
registerEffect('labour.issueOrders', (ctx: EffectContext) => {
  const c = ctx.case;
  const x = inspectionOfCase(c.id);
  if (!x?.findings.length) return { error: 'Corrective orders follow recorded findings' };
  const os = ordersOf(c);
  if (!os.length || os.some(o => !x.findings.some(f => f.n === o.finding) || !o.action)) return { error: 'One order per line: finding number | what is required | due date (the order\'s own, if any)' };
  return { facts: { orders: os.length }, after: d => { issueOrders(c.id, os, ctx.actor.name, ctx.now); if (d) attachLabourDecision('inspection', x.number, d.id); } };
});
registerEffect('labour.recordResponse', ({ case: c, actor, now }: EffectContext) => {
  const r = recordResponse(c.id, { order: num(c.fields.responseOrder), response: str(c.fields.responseText), evidence: lines(c.fields.responseEvidence) }, actor.name, now);
  return 'error' in r ? r : { facts: { response: r.n } };
});
registerEffect('labour.verifyOrder', ({ case: c, actor, now }: EffectContext) => {
  const r = verifyOrder(c.id, { order: num(c.fields.verifyOrder), outcome: str(c.fields.verifyOutcome) as 'complied', note: str(c.fields.verifyNote) }, actor.name, now);
  return 'error' in r ? r : { facts: { verified: r.n } };
});
registerEffect('labour.closeInspection', (ctx: EffectContext) => {
  const x = inspectionOfCase(ctx.case.id);
  if (!x) return { error: 'This case has no inspection' };
  if (ctx.action.key === 'close-no-breach' && x.findings.length) return { error: 'Findings were recorded: corrective orders follow them' };
  if (x.orders.some(o => !o.verified)) return { error: 'Every corrective order is verified before the inspection closes' };
  return { facts: { closed: x.number }, after: (_d, done) => { closeInspection(ctx.case.id, reasonOf(done, 'Closed'), ctx.actor.name); } };
});

// ── Complaint, injury, mediation, notice ─────────────────────────────────────

registerEffect('labour.checkComplaint', ({ case: c }: EffectContext) => {
  const e = str(c.fields.respondentEmployer);
  if (e && !getEmployer(e)) return { error: `${e} is not a registered employer (leave it empty when the employer is not registered: the authority establishes who it is)` };
  return { facts: { received: true } };
});
registerEffect('labour.checkOutcome', ({ case: c }: EffectContext) => {
  const o = str(c.fields.complaintOutcome);
  // A complaint is upheld only on findings: an inspection's, or the officer's own recorded with their evidence (never the allegation alone).
  if (['upheld', 'partly-upheld'].includes(o) && !str(c.fields.basisFindings)) return { error: 'Name the findings the outcome rests on (an inspection\'s findings or the evidence assessed): an allegation is not a finding' };
  return { facts: { outcome: o } };
});
registerEffect('labour.recordInjury', ({ case: c, actor, now }: EffectContext) => {
  const medical = c.documents.find(id => getDocument(id)?.class === 'medical-evidence');
  const x = recordInjury({
    employer: str(c.fields.employer), ...(str(c.fields.workplace) ? { workplace: str(c.fields.workplace) } : {}), occurredAt: `${str(c.fields.occurredOn)}${str(c.fields.occurredTime) ? `T${str(c.fields.occurredTime)}` : ''}`,
    category: str(c.fields.injuryCategory), description: str(c.fields.incidentDescription), controls: lines(c.fields.controls), ...(medical ? { medicalEvidence: medical } : {}), ...sampleMark(c),
  }, c.id, actor.name, now);
  return 'error' in x ? x : { facts: { notification: x.number } };
});
registerEffect('labour.closeInjury', (ctx: EffectContext) => ({ facts: { closed: true }, after: (_d, done) => { closeInjury(ctx.case.id, ctx.action.key === 'refer-inspection' ? 'investigated' : 'closed', reasonOf(done, 'Closed'), ctx.actor.name); } }));
registerEffect('labour.openMediation', ({ case: c, actor, now }: EffectContext) => {
  const m = openMediation({ kind: str(c.fields.mediationKind) === 'collective' ? 'collective' : 'individual', parties: lines(c.fields.parties), ...sampleMark(c) }, c.id, actor.name, now);
  return 'error' in m ? m : { facts: { mediation: m.number } };
});
registerEffect('labour.recordSession', ({ case: c, actor, now }: EffectContext) => {
  const m = recordSession(c.id, str(c.fields.sessionNote), actor.name, now);
  return 'error' in m ? m : { facts: { sessions: m.sessions.length } };
});
registerEffect('labour.recordOutcome', ({ case: c, actor, now }: EffectContext) => {
  const agreement = c.documents.find(id => getDocument(id)?.class === 'agreement');
  const m = recordMediationOutcome(c.id, { result: str(c.fields.mediationResult) as 'settled', ...(agreement ? { agreement } : {}) }, actor.name, now);
  return 'error' in m ? m : { facts: { result: str(c.fields.mediationResult) } };
});
registerEffect('labour.acknowledgeNotice', ({ case: c, actor, now }: EffectContext) => {
  const n = acknowledgeNotice({ kind: str(c.fields.noticeKind) as 'strike', ...(str(c.fields.employer) ? { employer: str(c.fields.employer) } : {}), ...(str(c.fields.unionName) ? { union: str(c.fields.unionName) } : {}), effectiveDate: str(c.fields.effectiveDate), ...(Number.isInteger(num(c.fields.workersAffected)) && num(c.fields.workersAffected) >= 0 ? { workersAffected: num(c.fields.workersAffected) } : {}), ...sampleMark(c) }, c.id, actor.name, now);
  return 'error' in n ? n : { facts: { notice: n.number } };
});

// ── Reference procedures ─────────────────────────────────────────────────────

const p = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'personal', ...extra });
const r = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'restricted', ...extra });
const adm = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'administrative', ...extra });
const co = (key: string, label: string, type: FieldSpec['type'] = 'text', extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, type, personalDataClass: 'commercial', ...extra });
const base = { reference: true as const, citations: [], notifications: [], deadlines: [], owner: 'labour' };
const REVIEW_ROUTE = adm('reviewRoute', 'Review or appeal route (as the nation\'s law gives it)');
const install = (list: Ref[], by: string) => {
  const drafted: string[] = [], present: string[] = [];
  for (const x of list) {
    if (listPackages({ key: x.key }).length) { present.push(x.key); continue; }
    const d = draftPackage(x, by, undefined, registeredEffects());
    if (!('error' in d)) drafted.push(x.key);
  }
  return { drafted, present };
};

export const REFERENCE_EMPLOYER: Ref = {
  ...base, key: 'labour.employer-registration', version: 1, title: 'Employer registration with the labour authority', refPrefix: 'LER', retention: 'labour-employer', sensitivity: 'normal',
  fields: [
    adm('organisation', 'Organisation (its organisations register number)'),
    adm('employerName', 'Legal name', 'text', { required: true }),
    adm('tradingName', 'Trading name'),
    adm('industry', 'Industry code (the nation\'s classification, e.g. based on ISIC Rev. 4)', 'text', { required: true }),
    co('workplaces', 'Workplaces (address | region, one per line)', 'longtext', { required: true }),
    p('representative', 'Authorised representative', 'text', { required: true }),
    co('payrollReference', 'Payroll registration reference, where the law requires one'),
    REVIEW_ROUTE,
  ],
  documents: [{ class: 'application', label: 'The registration as received', required: true }, { class: 'authority-to-act', label: 'The representative\'s authority to act', required: false }],
  stages: [{ key: 'submitted', label: 'Submitted' }, { key: 'checked', label: 'Checked' }, { key: 'registered', label: 'Registered', terminal: true }, { key: 'not-registered', label: 'Not registered, with reasons', terminal: true }],
  actions: [
    { key: 'check', label: 'Check the organisation and workplaces', from: ['submitted'], to: 'checked', needs: { role: 'officer' }, requires: { fields: ['employerName', 'industry', 'workplaces', 'representative'], documents: ['application'] }, effects: ['labour.checkEmployer'] },
    { key: 'register', label: 'Register the employer', from: ['checked'], to: 'registered', decision: 'register', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['labour.registerEmployer'] },
    { key: 'refuse', label: 'Refuse, with reasons and the review route', from: ['checked'], to: 'not-registered', decision: 'refuse', needs: { role: 'signatory' }, requires: { fields: ['reviewRoute'], reasons: true } },
  ],
  tests: [{ name: 'registered', steps: [{ action: 'check', fields: { employerName: 'A', industry: '1', workplaces: 'x', representative: 'B' }, documents: ['application'], expect: 'checked' }, { action: 'register', expect: 'registered' }] }],
};

export const REFERENCE_EMPLOYMENT: Ref = {
  ...base, key: 'labour.employment-registration', version: 1, title: 'Employment registration', refPrefix: 'LEM', retention: 'labour-employment', sensitivity: 'restricted',
  fields: [
    adm('employer', 'Employer (its labour register number)', 'text', { required: true }),
    r('workerReference', 'Worker\'s identity record or civil registration reference', 'text', { required: true }),
    r('workerName', 'Worker\'s name', 'text', { required: true }),
    r('workerNationality', 'Worker\'s nationality (ISO 3166-1 alpha-3), where the law asks for it'),
    r('workerDocument', 'Travel document number (a worker who is not a national, for the work authorisation check)'),
    adm('startDate', 'Start date', 'date', { required: true }),
    adm('employmentType', 'Employment type (the nation\'s list)', 'text', { required: true }),
    adm('occupation', 'Occupation code (the nation\'s classification, e.g. based on ISCO-08)', 'text', { required: true }),
    co('workplace', 'Workplace (address or registered site)'),
    r('weeklyHours', 'Weekly hours', 'number'),
    REVIEW_ROUTE,
  ],
  documents: [{ class: 'application', label: 'The registration as received', required: true }, { class: 'contract', label: 'The employment contract, where the law requires it to be registered', required: false }, { class: 'authorisation-evidence', label: 'Evidence of work authorisation relied on when the exchange could not answer', required: false }],
  stages: [
    { key: 'submitted', label: 'Submitted' }, { key: 'held', label: 'Held: work authorisation not yet confirmed' }, { key: 'checked', label: 'Checked' },
    { key: 'registered', label: 'Registered', terminal: true }, { key: 'referred', label: 'Referred to the immigration authority (reference only)', terminal: true }, { key: 'not-registered', label: 'Not registered, with reasons', terminal: true },
  ],
  actions: [
    { key: 'check-authorisation', label: 'Check the employer and, for a worker who is not a national, the work authorisation (immigration.status)', from: ['submitted', 'held'], to: 'checked', needs: { role: 'officer' }, requires: { fields: ['employer', 'workerReference', 'workerName', 'startDate', 'employmentType', 'occupation'], documents: ['application'] }, effects: ['labour.checkAuthorisation'] },
    { key: 'hold', label: 'Hold until the work authorisation can be confirmed (never a refusal by itself)', from: ['submitted'], to: 'held', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'record-other-evidence', label: 'Record the authorisation evidence relied on, with reasons', from: ['held'], to: 'checked', needs: { role: 'signatory' }, requires: { documents: ['authorisation-evidence'], reasons: true } },
    { key: 'refer-authorisation', label: 'Refer the work authorisation to the immigration authority (LAB-EMP-007)', from: ['submitted', 'held'], to: 'referred', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'register', label: 'Register the employment', from: ['checked'], to: 'registered', decision: 'register', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['labour.registerEmployment'] },
    { key: 'refuse', label: 'Refuse, with reasons and the review route', from: ['checked'], to: 'not-registered', decision: 'refuse', needs: { role: 'signatory' }, requires: { fields: ['reviewRoute'], reasons: true } },
  ],
  tests: [
    { name: 'registered', steps: [{ action: 'check-authorisation', fields: { employer: 'EMP-1', workerReference: 'ID-1', workerName: 'A', startDate: '2026-11-01', employmentType: 'x', occupation: '1' }, documents: ['application'], expect: 'checked' }, { action: 'register', expect: 'registered' }] },
    { name: 'held, then referred', steps: [{ action: 'hold', expect: 'held' }, { action: 'refuse', expect: 'refused' }, { action: 'refer-authorisation', expect: 'referred' }] },
  ],
};

export const REFERENCE_VACANCY: Ref = {
  ...base, key: 'labour.vacancy', version: 1, title: 'Vacancy notification and publication', refPrefix: 'LVA', retention: 'labour-vacancy', sensitivity: 'normal',
  fields: [
    adm('employer', 'Employer (its labour register number)', 'text', { required: true }),
    adm('vacancyTitle', 'Vacancy title', 'text', { required: true }),
    adm('occupation', 'Occupation code (the nation\'s classification)', 'text', { required: true }),
    adm('jobDescription', 'Job description', 'longtext', { required: true }),
    adm('workLocation', 'Work location', 'text', { required: true }),
    adm('employmentType', 'Employment type (the nation\'s list)'),
    adm('minimumQualifications', 'Minimum qualifications (one per line)', 'longtext'),
    adm('closingDate', 'Closing date for applications', 'date'),
    adm('publicationConsent', 'The employer consents to publication', 'boolean', { required: true }),
    adm('vacancyNumber', 'Vacancy (its number, once published)'),
  ],
  documents: [{ class: 'notification', label: 'The notification as received', required: true }],
  stages: [{ key: 'submitted', label: 'Submitted' }, { key: 'published', label: 'Published' }, { key: 'closed', label: 'Closed', terminal: true }, { key: 'filled', label: 'Filled', terminal: true }],
  actions: [
    { key: 'publish', label: 'Publish the vacancy', from: ['submitted'], to: 'published', needs: { role: 'officer' }, requires: { fields: ['employer', 'vacancyTitle', 'occupation', 'workLocation', 'publicationConsent'], documents: ['notification'] }, effects: ['labour.publishVacancy'] },
    { key: 'close', label: 'Close the vacancy', from: ['published'], to: 'closed', needs: { role: 'officer' }, requires: { fields: ['vacancyNumber'], reasons: true }, effects: ['labour.closeVacancy'] },
    { key: 'filled', label: 'Record that it was filled', from: ['published'], to: 'filled', needs: { role: 'officer' }, requires: { fields: ['vacancyNumber'], reasons: true }, effects: ['labour.closeVacancy'] },
  ],
  tests: [{ name: 'published and filled', steps: [{ action: 'publish', fields: { employer: 'EMP-1', vacancyTitle: 'x', occupation: '1', workLocation: 'x', publicationConsent: true }, documents: ['notification'], expect: 'published' }, { action: 'filled', fields: { vacancyNumber: 'VAC-1' }, expect: 'filled' }] }],
};

export const REFERENCE_JOBSEEKER: Ref = {
  ...base, key: 'labour.jobseeker', version: 1, title: 'Jobseeker registration, referral and placement', refPrefix: 'LJS', retention: 'labour-jobseeker', sensitivity: 'restricted',
  fields: [
    r('reference', 'Jobseeker\'s identity record or civil registration reference', 'text', { required: true }),
    p('contact', 'How to reach the jobseeker', 'text', { required: true }),
    adm('occupationsSought', 'Occupations sought (codes of the nation\'s classification, one per line)', 'longtext', { required: true }),
    p('qualifications', 'Qualifications (numbers of the qualification register, checked through qualification.verify)', 'longtext'),
    p('skills', 'Skills (codes)', 'longtext'),
    p('availableFrom', 'Available from', 'date'),
    p('preferredLocations', 'Preferred locations (regions)', 'longtext'),
    r('adjustmentRequest', 'Adjustments the jobseeker asks for (restricted; give only what is needed)', 'longtext'),
    adm('referVacancy', 'Vacancy referred to (its number)'),
    adm('placedVacancy', 'Vacancy placed in (its number)'),
  ],
  documents: [{ class: 'registration', label: 'The registration as received', required: true }],
  stages: [{ key: 'submitted', label: 'Submitted' }, { key: 'registered', label: 'Registered' }, { key: 'placed', label: 'Placed', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true }],
  actions: [
    { key: 'register', label: 'Register the jobseeker', from: ['submitted'], to: 'registered', needs: { role: 'officer' }, requires: { fields: ['reference', 'contact', 'occupationsSought'], documents: ['registration'] }, effects: ['labour.registerJobseeker'] },
    { key: 'refer', label: 'Refer to a vacancy', from: ['registered'], to: 'registered', needs: { role: 'officer' }, requires: { fields: ['referVacancy'] }, effects: ['labour.refer'] },
    { key: 'place', label: 'Record the placement', from: ['registered'], to: 'placed', needs: { role: 'officer' }, requires: { fields: ['placedVacancy'] }, effects: ['labour.place'] },
    { key: 'withdraw', label: 'Withdrawn at the jobseeker\'s request', from: ['submitted', 'registered'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  tests: [{ name: 'registered, referred and placed', steps: [{ action: 'register', fields: { reference: 'ID-1', contact: 'x', occupationsSought: '1' }, documents: ['registration'], expect: 'registered' }, { action: 'refer', fields: { referVacancy: 'VAC-1' }, expect: 'registered' }, { action: 'place', fields: { placedVacancy: 'VAC-1' }, expect: 'placed' }] }],
};

const FINDING_FIELDS: FieldSpec[] = [
  adm('findingRequirement', 'Requirement concerned (the provision of law or standard)'),
  co('findingObservation', 'What was observed', 'longtext'),
  co('findingEvidence', 'Evidence relied on (documents of the case or items described, one per line)', 'longtext'),
  adm('findingSeverity', 'Severity (the nation\'s scale)'),
  adm('correctFinding', 'Finding corrected (its number; a correction is a new version, the original is kept)', 'number'),
];

export const REFERENCE_INSPECTION: Ref = {
  ...base, key: 'labour.inspection', version: 1, title: 'Workplace inspection', refPrefix: 'LIN', retention: 'labour-inspection', sensitivity: 'restricted',
  fields: [
    adm('employer', 'Employer (its labour register number)', 'text', { required: true }),
    co('workplace', 'Workplace (its id or address)'),
    adm('fromComplaint', 'Complaint that led to it (its case reference; the allegation stays there)'),
    adm('visitDate', 'Date of the visit', 'date'),
    adm('legalBasis', 'Legal basis of the inspection (the provision of the nation\'s law)'),
    ...FINDING_FIELDS,
    co('orders', 'Corrective orders (finding number | what is required | due date the order sets, one per line)', 'longtext'),
    adm('responseOrder', 'Order responded to (its number)', 'number'),
    co('responseText', 'The employer\'s response (LAB-EMP-020)', 'longtext'),
    co('responseEvidence', 'Evidence of remedial action (one item per line)', 'longtext'),
    adm('verifyOrder', 'Order verified (its number)', 'number'),
    adm('verifyOutcome', 'Verification', 'choice', { options: ['complied', 'partly-complied', 'not-complied'] }),
    co('verifyNote', 'What the verification found', 'longtext'),
    REVIEW_ROUTE,
  ],
  documents: [
    { class: 'inspection-plan', label: 'Inspection plan or authorisation', required: true },
    { class: 'evidence', label: 'Evidence gathered (photographs, documents, statements)', required: false, multiple: true },
    { class: 'inspection-report', label: 'Inspection report with findings', required: false },
    { class: 'order', label: 'Corrective order as notified to the employer', required: false },
    { class: 'response', label: 'The employer\'s response and remedial evidence', required: false, multiple: true },
  ],
  stages: [{ key: 'planned', label: 'Planned' }, { key: 'visited', label: 'Visited: findings' }, { key: 'ordered', label: 'Corrective orders issued: responses and verification' }, { key: 'closed', label: 'Closed', terminal: true }],
  actions: [
    { key: 'record-visit', label: 'Record the visit and its legal basis', from: ['planned'], to: 'visited', needs: { role: 'officer' }, requires: { fields: ['employer', 'visitDate', 'legalBasis'], documents: ['inspection-plan'] }, effects: ['labour.recordVisit'] },
    { key: 'record-finding', label: 'Record a finding with its evidence', from: ['visited'], to: 'visited', needs: { role: 'officer' }, requires: { fields: ['findingRequirement', 'findingObservation', 'findingEvidence', 'findingSeverity'], reasons: true }, effects: ['labour.recordFinding'] },
    { key: 'correct-finding', label: 'Correct a finding (a new version; the original is kept)', from: ['visited', 'ordered'], to: 'visited', needs: { role: 'officer' }, requires: { fields: ['correctFinding', 'findingRequirement', 'findingObservation', 'findingEvidence', 'findingSeverity'], reasons: true }, effects: ['labour.recordFinding'] },
    { key: 'issue-orders', label: 'Issue corrective orders, with reasons', from: ['visited'], to: 'ordered', decision: 'order', needs: { role: 'signatory' }, requires: { fields: ['orders'], documents: ['inspection-report'], reasons: true }, effects: ['labour.issueOrders'] },
    { key: 'record-response', label: 'Record the employer\'s response to an order', from: ['ordered'], to: 'ordered', needs: { role: 'officer' }, requires: { fields: ['responseOrder', 'responseText'] }, effects: ['labour.recordResponse'] },
    { key: 'verify-order', label: 'Verify an order', from: ['ordered'], to: 'ordered', needs: { role: 'officer' }, requires: { fields: ['verifyOrder', 'verifyOutcome', 'verifyNote'] }, effects: ['labour.verifyOrder'] },
    { key: 'close', label: 'Close once every order is verified', from: ['ordered'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['labour.closeInspection'] },
    { key: 'close-no-breach', label: 'Close: no breach found', from: ['visited'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['labour.closeInspection'] },
  ],
  tests: [
    { name: 'finding, order, response, verified', steps: [
      { action: 'record-visit', fields: { employer: 'EMP-1', visitDate: '2026-10-01', legalBasis: 'x' }, documents: ['inspection-plan'], expect: 'visited' },
      { action: 'record-finding', fields: { findingRequirement: 'x', findingObservation: 'x', findingEvidence: 'x', findingSeverity: 'x' }, expect: 'visited' },
      { action: 'issue-orders', expect: 'refused' },
      { action: 'issue-orders', fields: { orders: '1 | x' }, documents: ['inspection-report'], expect: 'ordered' },
      { action: 'record-response', fields: { responseOrder: 1, responseText: 'x' }, expect: 'ordered' },
      { action: 'verify-order', fields: { verifyOrder: 1, verifyOutcome: 'complied', verifyNote: 'x' }, expect: 'ordered' },
      { action: 'close', expect: 'closed' },
    ] },
    { name: 'no breach', steps: [{ action: 'record-visit', fields: { employer: 'EMP-1', visitDate: '2026-10-01', legalBasis: 'x' }, documents: ['inspection-plan'], expect: 'visited' }, { action: 'close-no-breach', expect: 'closed' }] },
  ],
};

export const REFERENCE_COMPLAINT: Ref = {
  ...base, key: 'labour.complaint', version: 1, title: 'Labour complaint or wage claim', refPrefix: 'LCP', retention: 'labour-complaint', sensitivity: 'restricted',
  fields: [
    adm('claimKind', 'Complaint or wage claim', 'choice', { options: ['complaint', 'wage-claim'], required: true }),
    r('complainantReference', 'Complainant\'s identity or civil registration reference (restricted; never shown to the employer without the complainant\'s consent or the law)', 'text', { required: true }),
    r('complainantContact', 'How to reach the complainant', 'text', { required: true }),
    adm('respondentEmployer', 'Employer complained about (its labour register number, if registered)'),
    r('complaintCategory', 'Kind of issue (the nation\'s list: wages, contract, safety, discrimination …)', 'text', { required: true }),
    r('incidentPeriod', 'When it happened (a date or a period)'),
    r('description', 'What happened (an allegation, never a finding)', 'longtext', { required: true, hint: 'Say what happened and when. The authority assesses it; a complaint is not proof that a rule was broken.' }),
    r('requestedResolution', 'What the complainant asks for', 'longtext'),
    { key: 'confidentialityRequest', label: 'The complainant asks for confidentiality', type: 'boolean', personalDataClass: 'restricted', raisesSensitivity: true },
    { key: 'claimedMinor', label: 'Amount claimed (minor units; the claimant\'s own figure, never calculated here)', type: 'number', personalDataClass: 'financial' },
    r('calculationBreakdown', 'How the claimed amount is made up (the claimant\'s lines)', 'longtext'),
    r('priorAttempts', 'What was tried before', 'longtext'),
    adm('inspectionCase', 'Inspection opened on it (its case reference)'),
    r('basisFindings', 'Findings the outcome rests on (an inspection\'s findings or the evidence assessed)', 'longtext'),
    adm('complaintOutcome', 'Outcome', 'choice', { options: ['upheld', 'partly-upheld', 'not-upheld', 'settled', 'referred-to-court'] }),
    REVIEW_ROUTE,
  ],
  documents: [{ class: 'complaint', label: 'The complaint or claim as received', required: true }, { class: 'evidence', label: 'Supporting evidence', required: false, multiple: true }, { class: 'outcome-letter', label: 'Outcome with reasons', required: false }],
  stages: [
    { key: 'received', label: 'Received' }, { key: 'jurisdiction', label: 'Jurisdiction' }, { key: 'investigation', label: 'Under investigation' },
    { key: 'pending-approval', label: 'Outcome' }, { key: 'decided', label: 'Decided, with reasons', terminal: true },
    { key: 'not-admitted', label: 'Outside the authority\'s mandate, with reasons', terminal: true }, { key: 'withdrawn', label: 'Withdrawn', terminal: true },
  ],
  actions: [
    { key: 'register', label: 'Register the complaint', from: ['received'], to: 'jurisdiction', needs: { role: 'officer' }, requires: { fields: ['claimKind', 'complainantReference', 'complainantContact', 'complaintCategory', 'description'], documents: ['complaint'] }, effects: ['labour.checkComplaint'] },
    { key: 'admit', label: 'Within the mandate: assign and investigate', from: ['jurisdiction'], to: 'investigation', needs: { role: 'officer' }, requires: { reasons: true } },
    { key: 'decline', label: 'Outside the mandate, with reasons and where to go', from: ['jurisdiction'], to: 'not-admitted', decision: 'decline', needs: { role: 'signatory' }, requires: { fields: ['reviewRoute'], reasons: true } },
    { key: 'link-inspection', label: 'Record the inspection opened on it', from: ['investigation'], to: 'investigation', needs: { role: 'officer' }, requires: { fields: ['inspectionCase'] } },
    { key: 'propose', label: 'Propose the outcome', from: ['investigation'], to: 'pending-approval', needs: { role: 'officer' }, requires: { fields: ['complaintOutcome'], reasons: true }, effects: ['labour.checkOutcome'] },
    { key: 'decide', label: 'Decide, with reasons and the review route', from: ['pending-approval'], to: 'decided', decision: 'decide', needs: { role: 'signatory' }, requires: { fields: ['reviewRoute'], documents: ['outcome-letter'], reasons: true }, effects: ['labour.checkOutcome'] },
    { key: 'withdraw', label: 'Withdrawn by the complainant', from: ['received', 'jurisdiction', 'investigation'], to: 'withdrawn', needs: { role: 'officer' }, requires: { reasons: true } },
  ],
  tests: [
    { name: 'investigated and decided', steps: [
      { action: 'register', fields: { claimKind: 'complaint', complainantReference: 'ID-1', complainantContact: 'x', complaintCategory: 'wages', description: 'x' }, documents: ['complaint'], expect: 'jurisdiction' },
      { action: 'admit', expect: 'investigation' }, { action: 'link-inspection', fields: { inspectionCase: 'LIN-1' }, expect: 'investigation' },
      { action: 'propose', fields: { complaintOutcome: 'upheld', basisFindings: 'x' }, expect: 'pending-approval' },
      { action: 'decide', fields: { reviewRoute: 'x' }, documents: ['outcome-letter'], expect: 'decided' },
    ] },
    { name: 'outside the mandate', steps: [{ action: 'register', fields: { claimKind: 'complaint', complainantReference: 'ID-1', complainantContact: 'x', complaintCategory: 'x', description: 'x' }, documents: ['complaint'], expect: 'jurisdiction' }, { action: 'decline', fields: { reviewRoute: 'x' }, expect: 'not-admitted' }] },
  ],
};

export const REFERENCE_INJURY: Ref = {
  ...base, key: 'labour.injury', version: 1, title: 'Occupational injury or incident notification', refPrefix: 'LOI', retention: 'labour-injury', sensitivity: 'restricted',
  fields: [
    adm('employer', 'Employer (its labour register number)', 'text', { required: true }),
    co('workplace', 'Workplace (its id or address)'),
    r('workerReference', 'Worker\'s identity or civil registration reference (restricted)', 'text', { required: true }),
    adm('occurredOn', 'Date it happened', 'date', { required: true }),
    adm('occurredTime', 'Time it happened (HH:MM)'),
    adm('injuryCategory', 'Category (the nation\'s occupational safety reporting list)', 'text', { required: true }),
    r('incidentDescription', 'What happened at work', 'longtext', { required: true, hint: 'The work activity, the equipment and the circumstances. Do not give medical details here: attach any medical evidence as a document, which is sealed.' }),
    co('controls', 'Immediate control measures taken (one per line)', 'longtext'),
    p('notifier', 'Who notifies (name and role)', 'text', { required: true }),
    adm('inspectionCase', 'Inspection opened on it (its case reference)'),
  ],
  documents: [
    { class: 'notification', label: 'The notification as received', required: true },
    { class: 'medical-evidence', label: 'Medical evidence, where the law requires it (sealed; read only under the authority\'s specific power, never copied into a field)', required: false },
  ],
  stages: [{ key: 'notified', label: 'Notified' }, { key: 'recorded', label: 'Recorded' }, { key: 'investigated', label: 'Referred for inspection', terminal: true }, { key: 'closed', label: 'Closed, with reasons', terminal: true }],
  actions: [
    { key: 'record', label: 'Record the notification', from: ['notified'], to: 'recorded', needs: { role: 'officer' }, requires: { fields: ['employer', 'workerReference', 'occurredOn', 'injuryCategory', 'incidentDescription', 'notifier'], documents: ['notification'] }, effects: ['labour.recordInjury'] },
    { key: 'refer-inspection', label: 'Refer for inspection (the inspection case)', from: ['recorded'], to: 'investigated', needs: { role: 'officer' }, requires: { fields: ['inspectionCase'], reasons: true }, effects: ['labour.closeInjury'] },
    { key: 'close', label: 'Close, with reasons', from: ['recorded'], to: 'closed', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['labour.closeInjury'] },
  ],
  tests: [{ name: 'recorded and referred', steps: [{ action: 'record', fields: { employer: 'EMP-1', workerReference: 'ID-1', occurredOn: '2026-10-01', injuryCategory: 'x', incidentDescription: 'x', notifier: 'x' }, documents: ['notification'], expect: 'recorded' }, { action: 'refer-inspection', fields: { inspectionCase: 'LIN-1' }, expect: 'investigated' }] }],
};

export const REFERENCE_MEDIATION: Ref = {
  ...base, key: 'labour.mediation', version: 1, title: 'Labour mediation (individual or collective dispute)', refPrefix: 'LMD', retention: 'labour-mediation', sensitivity: 'restricted',
  fields: [
    adm('mediationKind', 'Individual or collective', 'choice', { options: ['individual', 'collective'], required: true }),
    r('parties', 'Parties (one per line: workers or their union, the employer)', 'longtext', { required: true }),
    r('issue', 'What the dispute is about', 'longtext', { required: true }),
    r('sessionNote', 'What the session covered', 'longtext'),
    adm('mediationResult', 'Outcome', 'choice', { options: ['settled', 'partly-settled', 'not-settled', 'withdrawn'] }),
  ],
  documents: [{ class: 'request', label: 'The request as received', required: true }, { class: 'agreement', label: 'The settlement agreement the parties signed', required: false }],
  stages: [{ key: 'requested', label: 'Requested' }, { key: 'sessions', label: 'In mediation' }, { key: 'concluded', label: 'Concluded', terminal: true }, { key: 'declined', label: 'Not taken up, with reasons', terminal: true }],
  actions: [
    { key: 'accept', label: 'Accept and assign a mediator', from: ['requested'], to: 'sessions', needs: { role: 'officer' }, requires: { fields: ['mediationKind', 'parties', 'issue'], documents: ['request'] }, effects: ['labour.openMediation'] },
    { key: 'record-session', label: 'Record a session', from: ['sessions'], to: 'sessions', needs: { role: 'officer' }, requires: { fields: ['sessionNote'] }, effects: ['labour.recordSession'] },
    { key: 'record-outcome', label: 'Record the outcome (the parties settle; the mediator decides nothing)', from: ['sessions'], to: 'concluded', needs: { role: 'officer' }, requires: { fields: ['mediationResult'] }, effects: ['labour.recordOutcome'] },
    { key: 'decline', label: 'Not taken up, with reasons', from: ['requested'], to: 'declined', needs: { role: 'signatory' }, requires: { reasons: true } },
  ],
  tests: [{ name: 'mediated, not settled', steps: [{ action: 'accept', fields: { mediationKind: 'individual', parties: 'A\nB', issue: 'x' }, documents: ['request'], expect: 'sessions' }, { action: 'record-session', fields: { sessionNote: 'x' }, expect: 'sessions' }, { action: 'record-outcome', fields: { mediationResult: 'not-settled' }, expect: 'concluded' }] }],
};

export const REFERENCE_NOTICE: Ref = {
  ...base, key: 'labour.notice', version: 1, title: 'Strike, work-stoppage, redundancy or collective dismissal notice', refPrefix: 'LNO', retention: 'labour-notice', sensitivity: 'normal',
  fields: [
    adm('noticeKind', 'Kind of notice', 'choice', { options: ['strike', 'work-stoppage', 'redundancy', 'collective-dismissal'], required: true }),
    adm('employer', 'Employer (its labour register number)'),
    adm('unionName', 'Union or workers\' representative giving notice'),
    adm('effectiveDate', 'Date it takes effect', 'date', { required: true }),
    adm('workersAffected', 'Number of workers affected', 'number'),
    co('grounds', 'Grounds stated', 'longtext'),
  ],
  documents: [{ class: 'notice', label: 'The notice as received', required: true }],
  stages: [{ key: 'received', label: 'Received' }, { key: 'acknowledged', label: 'Acknowledged', terminal: true }],
  actions: [{ key: 'acknowledge', label: 'Acknowledge the notice', from: ['received'], to: 'acknowledged', needs: { role: 'officer' }, requires: { fields: ['noticeKind', 'effectiveDate'], documents: ['notice'] }, effects: ['labour.acknowledgeNotice'] }],
  tests: [{ name: 'acknowledged', steps: [{ action: 'acknowledge', fields: { noticeKind: 'redundancy', effectiveDate: '2026-12-01' }, documents: ['notice'], expect: 'acknowledged' }] }],
};

export const LABOUR_PROCEDURES: Ref[] = [REFERENCE_EMPLOYER, REFERENCE_EMPLOYMENT, REFERENCE_VACANCY, REFERENCE_JOBSEEKER, REFERENCE_INSPECTION, REFERENCE_COMPLAINT, REFERENCE_INJURY, REFERENCE_MEDIATION, REFERENCE_NOTICE];

export function installLabourProcedures(by: string): { drafted: string[]; present: string[] } { return install(LABOUR_PROCEDURES, by); }
