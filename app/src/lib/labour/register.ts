// The labour and employment register (Institutional specification Part 2
// §A.6 and §C.5; catalogue supplement Part 14, LAB-EMP-001 … 020; plan step
// I6). Kept for the institution the nation names for the `labour` slot:
//
//   employers        registered employers and their workplaces (an organisation of the organisations register by
//                    number, never a second identity), with standing and every step
//   employments      employment relationships registered (the worker by identity or civil registration reference,
//                    restricted), with the immigration status check where the worker's nationality calls for one
//   vacancies        notified vacancies and their publication; jobseekers; referrals of a jobseeker to a vacancy
//   inspections      workplace inspections: the visit, findings (each a requirement, an observation, the evidence
//                    and its severity in the nation's scale, corrected only by a new version), corrective orders,
//                    the employer's responses and the verification of each order
//   injuries         occupational injury and incident notifications: what happened at work, the category the
//                    nation's reporting uses and the control measures; any medical content is only a sealed
//                    document reference, never a field
//   mediations       requests, sessions and outcomes (a mediator has no power to decide: the parties settle)
//   notices          strike or work-stoppage and redundancy notices, acknowledged
//
// What the specification asks, kept here: an allegation is never a finding
// (complaints are cases; a finding exists only once an inspector records it
// with its evidence); the authority sees no private medical information; an
// employer, an inspector and a complainant each see only what their part
// allows; nobody is scored. Records are restricted: read by the labour
// authority's officials (auditors with a purpose), every read logged by the
// route (lib/auth/roles.ts canReadLabour()). Others learn an employer's
// standing through the exchange (employer.standing). Changes only through the
// labour procedures' effects (lib/labour/procedures.ts). Held in platform state.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';

export interface Step { at: string; by: string; what: string; reason: string; case?: string; decision?: string }
export interface Workplace { id: string; address: string; region?: string; site?: string }
export interface Employer {
  number: string;
  /** The organisation (organisations register number) or, where the nation's law registers an individual employer, the name given. */
  organisation?: string;
  name: string;
  industry: string;
  workplaces: Workplace[];
  representative: string;
  state: 'registered' | 'suspended' | 'deregistered';
  case: string; decision?: string; history: Step[]; createdAt: string; sample?: true;
}
export interface Employment {
  number: string; employer: string;
  /** The worker: an identity record or civil registration reference, and the name given (restricted). */
  worker: { reference: string; name: string; nationality?: string };
  startDate: string; endDate?: string; employmentType: string; occupation: string; workplace?: string;
  /** The immigration.status answer for a worker who is not a national (receipt only; never the file). */
  workAuthorisation?: { result: string; receipt: string; at: string } | { result: 'not-required' };
  state: 'active' | 'ended';
  case: string; decision?: string; history: Step[]; sample?: true;
}
export interface Vacancy { number: string; employer: string; title: string; occupation: string; location: string; closingDate?: string; state: 'published' | 'closed' | 'filled'; case: string; history: Step[]; sample?: true }
export interface Jobseeker { number: string; reference: string; occupations: string[]; availableFrom?: string; state: 'registered' | 'placed' | 'withdrawn'; referrals: { vacancy: string; at: string; by: string; outcome?: string }[]; case: string; history: Step[]; sample?: true }
export interface FindingVersion { n: number; requirement: string; observation: string; evidence: string[]; severity: string; at: string; by: string; reason: string }
export interface InspectionFinding { n: number; versions: FindingVersion[] }
export interface CorrectiveOrder { n: number; finding: number; action: string; due?: string; responses: { at: string; by: string; response: string; evidence: string[] }[]; verified?: { at: string; by: string; outcome: 'complied' | 'not-complied' | 'partly-complied'; note: string } }
export interface Inspection {
  number: string; employer: string; workplace?: string;
  visit?: { date: string; basis: string; inspector: string; at: string };
  findings: InspectionFinding[];
  orders: CorrectiveOrder[];
  /** The complaint case that led to it, if any (a reference only: the allegation stays in the complaint). */
  fromComplaint?: string;
  state: 'planned' | 'visited' | 'ordered' | 'closed';
  case: string; decision?: string; history: Step[]; sample?: true;
}
export interface Injury {
  number: string; employer: string; workplace?: string; occurredAt: string;
  /** The category the nation's occupational safety reporting uses (fatal, serious, other …: the nation's list). */
  category: string;
  description: string;
  controls: string[];
  /** A sealed document of the case holding any medical content; never read into a field. */
  medicalEvidence?: string;
  state: 'notified' | 'investigated' | 'closed';
  case: string; history: Step[]; sample?: true;
}
export interface Mediation { number: string; kind: 'individual' | 'collective'; parties: string[]; sessions: { at: string; by: string; note: string }[]; outcome?: { result: 'settled' | 'partly-settled' | 'not-settled' | 'withdrawn'; agreement?: string; at: string; by: string }; case: string; sample?: true }
export interface LabourNotice { number: string; kind: 'strike' | 'work-stoppage' | 'redundancy' | 'collective-dismissal'; employer?: string; union?: string; effectiveDate: string; workersAffected?: number; acknowledged: { at: string; by: string }; case: string; sample?: true }

interface Db { employers: Employer[]; employments: Employment[]; vacancies: Vacancy[]; jobseekers: Jobseeker[]; inspections: Inspection[]; injuries: Injury[]; mediations: Mediation[]; notices: LabourNotice[]; seq: Record<string, number> }
const g = globalThis as unknown as { __civicosLabour?: Db };
const db = (): Db => {
  const d = touch('__civicosLabour', g.__civicosLabour ??= { employers: [], employments: [], vacancies: [], jobseekers: [], inspections: [], injuries: [], mediations: [], notices: [], seq: {} });
  for (const k of ['employers', 'employments', 'vacancies', 'jobseekers', 'inspections', 'injuries', 'mediations', 'notices'] as const) d[k] ??= [];
  d.seq ??= {};
  return d;
};
export function resetLabour(): void { g.__civicosLabour = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const next = (prefix: string, now: Date) => { const d = db(); const y = String(now.getUTCFullYear()); const k = `${prefix}:${y}`; d.seq[k] = (d.seq[k] ?? 0) + 1; return `${prefix}-${y}-${String(d.seq[k]).padStart(6, '0')}`; };
const step = (by: string, what: string, reason: string, caseId?: string): Step => ({ at: new Date().toISOString(), by, what, reason: reason.slice(0, 500), ...(caseId ? { case: caseId } : {}) });
const audit = (by: string, action: string, target: string, detail: string) => recordAudit(by, `labour.${action}`, target, 'ok', detail);
type Sample = { sample?: true };

// ── Employers ────────────────────────────────────────────────────────────────

export function registerEmployer(i: { organisation?: string; name: string; industry: string; workplaces: { address: string; region?: string; site?: string }[]; representative: string } & Sample, caseId: string, by: string, now = new Date()): Employer | { error: string } {
  if (!i.name.trim()) return { error: 'Give the employer\'s legal name' };
  if (!i.industry.trim()) return { error: 'Give the industry code (the nation\'s classification)' };
  if (!i.representative.trim()) return { error: 'Name the authorised representative' };
  if (i.organisation && db().employers.some(e => e.organisation === i.organisation && e.state !== 'deregistered')) return { error: `Organisation ${i.organisation} is already a registered employer` };
  if (db().employers.some(e => e.case === caseId)) return { error: 'This case has already registered an employer' };
  const e: Employer = {
    number: next('EMP', now), ...(i.organisation ? { organisation: i.organisation } : {}), name: i.name.trim().slice(0, 200), industry: i.industry.trim().slice(0, 40),
    workplaces: i.workplaces.filter(w => w.address.trim()).slice(0, 200).map(w => ({ id: uuid7(), address: w.address.trim().slice(0, 300), ...(w.region ? { region: w.region } : {}), ...(w.site ? { site: w.site } : {}) })),
    representative: i.representative.trim().slice(0, 200), state: 'registered', case: caseId, history: [step(by, 'registered', 'Registration decided', caseId)], createdAt: now.toISOString(), ...(i.sample ? { sample: true } : {}),
  };
  db().employers.push(e);
  audit(by, 'employer.register', `Employer:${e.number}`, `case ${caseId}${i.sample ? ' · sample' : ''}`);
  return clone(e);
}
export function attachLabourDecision(kind: 'employer' | 'employment' | 'inspection', number: string, decision: string): void {
  const list = kind === 'employer' ? db().employers : kind === 'employment' ? db().employments : db().inspections;
  const x = (list as { number: string; decision?: string; history: Step[] }[]).find(r => r.number === number);
  if (!x) return;
  x.decision ??= decision;
  const s = x.history.at(-1);
  if (s && !s.decision) s.decision = decision;
}
export const getEmployer = (n: string): Employer | undefined => { const e = db().employers.find(x => x.number === n || x.organisation === n); return e ? clone(e) : undefined; };
export const employerOfCase = (caseId: string): Employer | undefined => { const e = db().employers.find(x => x.case === caseId); return e ? clone(e) : undefined; };

// ── Employment ───────────────────────────────────────────────────────────────

export function registerEmployment(i: Omit<Employment, 'number' | 'state' | 'case' | 'decision' | 'history'> & Sample, caseId: string, by: string, now = new Date()): Employment | { error: string } {
  const e = db().employers.find(x => x.number === i.employer);
  if (!e || e.state !== 'registered') return { error: `${i.employer} is not a registered employer` };
  if (!i.worker.reference.trim() || !i.worker.name.trim()) return { error: 'Name the worker and give their identity or civil registration reference' };
  if (!DATE.test(i.startDate)) return { error: 'The start date is a date (YYYY-MM-DD)' };
  if (!i.employmentType.trim() || !i.occupation.trim()) return { error: 'Give the employment type and the occupation code (the nation\'s lists)' };
  if (db().employments.some(x => x.case === caseId)) return { error: 'This case has already registered an employment' };
  const x: Employment = { ...clone(i), number: next('EMR', now), state: 'active', case: caseId, history: [step(by, 'registered', 'Employment registered', caseId)] };
  db().employments.push(x);
  audit(by, 'employment.register', `Employment:${x.number}`, `employer ${i.employer} · case ${caseId}`);
  return clone(x);
}
export const employmentOfCase = (caseId: string): Employment | undefined => { const e = db().employments.find(x => x.case === caseId); return e ? clone(e) : undefined; };

// ── Employment services ──────────────────────────────────────────────────────

export function publishVacancy(i: Omit<Vacancy, 'number' | 'state' | 'case' | 'history'> & Sample, caseId: string, by: string, now = new Date()): Vacancy | { error: string } {
  const e = db().employers.find(x => x.number === i.employer);
  if (!e || e.state !== 'registered') return { error: `${i.employer} is not a registered employer` };
  if (!i.title.trim() || !i.occupation.trim() || !i.location.trim()) return { error: 'Give the title, occupation code and work location' };
  if (i.closingDate && !DATE.test(i.closingDate)) return { error: 'The closing date is a date (YYYY-MM-DD)' };
  const v: Vacancy = { ...clone(i), number: next('VAC', now), state: 'published', case: caseId, history: [step(by, 'published', 'Vacancy published', caseId)] };
  db().vacancies.push(v);
  audit(by, 'vacancy.publish', `Vacancy:${v.number}`, `employer ${i.employer} · case ${caseId}`);
  return clone(v);
}
export function closeVacancy(number: string, state: 'closed' | 'filled', reason: string, caseId: string, by: string): Vacancy | { error: string } {
  const v = db().vacancies.find(x => x.number === number);
  if (!v) return { error: `No vacancy ${number}` };
  if (v.state !== 'published') return { error: `Vacancy ${number} is ${v.state}` };
  v.state = state; v.history.push(step(by, state, reason, caseId));
  audit(by, `vacancy.${state}`, `Vacancy:${number}`, `case ${caseId}`);
  return clone(v);
}
export function registerJobseeker(i: { reference: string; occupations: string[]; availableFrom?: string } & Sample, caseId: string, by: string, now = new Date()): Jobseeker | { error: string } {
  if (!i.reference.trim()) return { error: 'Give the jobseeker\'s identity or civil registration reference' };
  if (!i.occupations.length) return { error: 'Give at least one occupation sought (the nation\'s classification)' };
  if (db().jobseekers.some(j => j.reference === i.reference && j.state === 'registered')) return { error: 'This person is already registered as a jobseeker' };
  const j: Jobseeker = { number: next('JSK', now), reference: i.reference.trim().slice(0, 40), occupations: i.occupations.slice(0, 20), ...(i.availableFrom ? { availableFrom: i.availableFrom } : {}), state: 'registered', referrals: [], case: caseId, history: [step(by, 'registered', 'Jobseeker registered', caseId)], ...(i.sample ? { sample: true } : {}) };
  db().jobseekers.push(j);
  audit(by, 'jobseeker.register', `Jobseeker:${j.number}`, `case ${caseId}`);
  return clone(j);
}
export function referJobseeker(jobseeker: string, vacancy: string, caseId: string, by: string, now = new Date()): Jobseeker | { error: string } {
  const j = db().jobseekers.find(x => x.number === jobseeker || x.case === jobseeker);
  const v = db().vacancies.find(x => x.number === vacancy);
  if (!j || j.state !== 'registered') return { error: 'Name a registered jobseeker' };
  if (!v || v.state !== 'published') return { error: `Vacancy ${vacancy} is not published` };
  j.referrals.push({ vacancy: v.number, at: now.toISOString(), by });
  j.history.push(step(by, 'referred', `To vacancy ${v.number}`, caseId));
  audit(by, 'jobseeker.refer', `Jobseeker:${j.number}`, `vacancy ${v.number} · case ${caseId}`);
  return clone(j);
}
export function placeJobseeker(jobseeker: string, vacancy: string, caseId: string, by: string): Jobseeker | { error: string } {
  const j = db().jobseekers.find(x => x.number === jobseeker || x.case === jobseeker);
  if (!j || j.state !== 'registered') return { error: 'Name a registered jobseeker' };
  const r = j.referrals.find(x => x.vacancy === vacancy);
  if (!r) return { error: `The jobseeker was not referred to ${vacancy}` };
  r.outcome = 'placed'; j.state = 'placed'; j.history.push(step(by, 'placed', `In vacancy ${vacancy}`, caseId));
  audit(by, 'jobseeker.place', `Jobseeker:${j.number}`, `vacancy ${vacancy} · case ${caseId}`);
  return clone(j);
}
export const jobseekerOfCase = (caseId: string): Jobseeker | undefined => { const j = db().jobseekers.find(x => x.case === caseId); return j ? clone(j) : undefined; };
export const vacancyOfCase = (caseId: string): Vacancy | undefined => { const v = db().vacancies.find(x => x.case === caseId); return v ? clone(v) : undefined; };

// ── Inspections ──────────────────────────────────────────────────────────────

export function openInspection(i: { employer: string; workplace?: string; fromComplaint?: string } & Sample, caseId: string, by: string, now = new Date()): Inspection | { error: string } {
  const e = db().employers.find(x => x.number === i.employer);
  if (!e) return { error: `${i.employer} is not a registered employer` };
  if (i.workplace && !e.workplaces.some(w => w.id === i.workplace || w.address === i.workplace)) return { error: `The workplace is not one of ${e.number}'s` };
  const existing = db().inspections.find(x => x.case === caseId);
  if (existing) return clone(existing);
  const x: Inspection = { number: next('INS', now), employer: e.number, ...(i.workplace ? { workplace: i.workplace } : {}), ...(i.fromComplaint ? { fromComplaint: i.fromComplaint } : {}), findings: [], orders: [], state: 'planned', case: caseId, history: [step(by, 'planned', 'Inspection opened', caseId)], ...(i.sample ? { sample: true } : {}) };
  db().inspections.push(x);
  audit(by, 'inspection.open', `Inspection:${x.number}`, `employer ${e.number} · case ${caseId}`);
  return clone(x);
}
const inspectionOf = (caseId: string) => db().inspections.find(x => x.case === caseId);
export function recordVisit(caseId: string, v: { date: string; basis: string }, by: string, now = new Date()): Inspection | { error: string } {
  const x = inspectionOf(caseId);
  if (!x) return { error: 'This case has no inspection' };
  if (!DATE.test(v.date) || v.date > now.toISOString().slice(0, 10)) return { error: 'The visit date is a date, not in the future' };
  if (!v.basis.trim()) return { error: 'Cite the legal basis of the inspection (the provision of the nation\'s law)' };
  x.visit = { date: v.date, basis: v.basis.trim().slice(0, 300), inspector: by, at: now.toISOString() };
  x.state = 'visited'; x.history.push(step(by, 'visited', `Visit on ${v.date}`, caseId));
  audit(by, 'inspection.visit', `Inspection:${x.number}`, `case ${caseId}`);
  return clone(x);
}
/** A finding (or, naming one, a correction of it as a new version; the original is kept). */
export function recordFinding(caseId: string, f: { requirement: string; observation: string; evidence: string[]; severity: string; correct?: number }, reason: string, by: string, now = new Date()): InspectionFinding | { error: string } {
  const x = inspectionOf(caseId);
  if (!x || !x.visit) return { error: 'A finding is recorded after the visit' };
  if (x.state === 'closed') return { error: 'The inspection is closed' };
  if (!f.requirement.trim() || !f.observation.trim()) return { error: 'A finding names the requirement and what was observed' };
  if (!f.evidence.length) return { error: 'A finding rests on evidence (documents of the case or items described)' };
  if (!f.severity.trim()) return { error: 'Give its severity in the nation\'s scale' };
  const v = { requirement: f.requirement.trim().slice(0, 500), observation: f.observation.trim().slice(0, 2000), evidence: f.evidence.slice(0, 50), severity: f.severity.trim().slice(0, 40), at: now.toISOString(), by, reason: reason.slice(0, 500) };
  let out: InspectionFinding;
  if (f.correct !== undefined) {
    const old = x.findings.find(y => y.n === f.correct);
    if (!old) return { error: `No finding ${f.correct} in this inspection` };
    if (!reason.trim()) return { error: 'A correction states why' };
    old.versions.push({ n: old.versions.length + 1, ...v });
    out = old;
  } else {
    out = { n: x.findings.length + 1, versions: [{ n: 1, ...v }] };
    x.findings.push(out);
  }
  x.history.push(step(by, f.correct !== undefined ? `finding ${out.n} corrected` : `finding ${out.n}`, reason || 'Finding recorded', caseId));
  audit(by, f.correct !== undefined ? 'inspection.finding.correct' : 'inspection.finding', `Inspection:${x.number}`, `finding ${out.n} · version ${out.versions.length} · case ${caseId}`);
  return clone(out);
}
export function issueOrders(caseId: string, orders: { finding: number; action: string; due?: string }[], by: string, now = new Date()): CorrectiveOrder[] | { error: string } {
  const x = inspectionOf(caseId);
  if (!x || !x.findings.length) return { error: 'Corrective orders follow recorded findings' };
  if (!orders.length) return { error: 'Name the action each finding needs' };
  for (const o of orders) {
    if (!x.findings.some(f => f.n === o.finding)) return { error: `No finding ${o.finding}` };
    if (!o.action.trim()) return { error: 'Say what each order requires' };
    if (o.due && !DATE.test(o.due)) return { error: 'A due date is a date (YYYY-MM-DD), as the order sets it' };
  }
  for (const o of orders) x.orders.push({ n: x.orders.length + 1, finding: o.finding, action: o.action.trim().slice(0, 1000), ...(o.due ? { due: o.due } : {}), responses: [] });
  x.state = 'ordered'; x.history.push(step(by, 'ordered', `${orders.length} corrective order(s)`, caseId));
  audit(by, 'inspection.order', `Inspection:${x.number}`, `${orders.length} order(s) · case ${caseId}`);
  void now;
  return clone(x.orders);
}
/** The employer's response to an order (LAB-EMP-020), kept beside the order; the finding is never changed by it. */
export function recordResponse(caseId: string, r: { order: number; response: string; evidence: string[] }, by: string, now = new Date()): CorrectiveOrder | { error: string } {
  const x = inspectionOf(caseId);
  const o = x?.orders.find(y => y.n === r.order);
  if (!x || !o) return { error: `No corrective order ${r.order} in this inspection` };
  if (!r.response.trim()) return { error: 'Record what the employer says it did' };
  o.responses.push({ at: now.toISOString(), by, response: r.response.trim().slice(0, 2000), evidence: r.evidence.slice(0, 50) });
  x.history.push(step(by, `response to order ${o.n}`, 'Employer response recorded', caseId));
  audit(by, 'inspection.response', `Inspection:${x.number}`, `order ${o.n} · case ${caseId}`);
  return clone(o);
}
export function verifyOrder(caseId: string, v: { order: number; outcome: 'complied' | 'not-complied' | 'partly-complied'; note: string }, by: string, now = new Date()): CorrectiveOrder | { error: string } {
  const x = inspectionOf(caseId);
  const o = x?.orders.find(y => y.n === v.order);
  if (!x || !o) return { error: `No corrective order ${v.order} in this inspection` };
  if (!['complied', 'not-complied', 'partly-complied'].includes(v.outcome)) return { error: 'The verification finds the order complied with, partly complied with or not complied with' };
  if (!v.note.trim()) return { error: 'Say what the verification found' };
  o.verified = { at: now.toISOString(), by, outcome: v.outcome, note: v.note.trim().slice(0, 1000) };
  x.history.push(step(by, `order ${o.n} verified`, v.outcome, caseId));
  audit(by, 'inspection.verify', `Inspection:${x.number}`, `order ${o.n} · ${v.outcome} · case ${caseId}`);
  return clone(o);
}
export function closeInspection(caseId: string, reason: string, by: string): Inspection | { error: string } {
  const x = inspectionOf(caseId);
  if (!x) return { error: 'This case has no inspection' };
  if (x.orders.some(o => !o.verified)) return { error: 'Every corrective order is verified before the inspection closes' };
  x.state = 'closed'; x.history.push(step(by, 'closed', reason, caseId));
  audit(by, 'inspection.close', `Inspection:${x.number}`, `case ${caseId}`);
  return clone(x);
}
export const inspectionOfCase = (caseId: string): Inspection | undefined => { const x = inspectionOf(caseId); return x ? clone(x) : undefined; };

// ── Injuries, mediation, notices ─────────────────────────────────────────────

export function recordInjury(i: Omit<Injury, 'number' | 'state' | 'case' | 'history'> & Sample, caseId: string, by: string, now = new Date()): Injury | { error: string } {
  if (!db().employers.some(e => e.number === i.employer)) return { error: `${i.employer} is not a registered employer` };
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/.test(i.occurredAt) || i.occurredAt.slice(0, 10) > now.toISOString().slice(0, 10)) return { error: 'When it happened: a date and time, not in the future' };
  if (!i.category.trim() || !i.description.trim()) return { error: 'Give the category (the nation\'s reporting list) and what happened at work' };
  const x: Injury = { ...clone(i), number: next('OIN', now), state: 'notified', case: caseId, history: [step(by, 'notified', 'Notification recorded', caseId)] };
  db().injuries.push(x);
  audit(by, 'injury.notify', `Injury:${x.number}`, `employer ${i.employer} · ${i.category} · case ${caseId}`);
  return clone(x);
}
export function closeInjury(caseId: string, state: 'investigated' | 'closed', reason: string, by: string): Injury | { error: string } {
  const x = db().injuries.find(y => y.case === caseId);
  if (!x) return { error: 'This case recorded no notification' };
  x.state = state; x.history.push(step(by, state, reason, caseId));
  audit(by, `injury.${state}`, `Injury:${x.number}`, `case ${caseId}`);
  return clone(x);
}
export const injuryOfCase = (caseId: string): Injury | undefined => { const x = db().injuries.find(y => y.case === caseId); return x ? clone(x) : undefined; };

export function openMediation(i: { kind: 'individual' | 'collective'; parties: string[] } & Sample, caseId: string, by: string, now = new Date()): Mediation | { error: string } {
  if (i.parties.length < 2) return { error: 'A mediation has at least two parties' };
  const existing = db().mediations.find(m => m.case === caseId);
  if (existing) return clone(existing);
  const m: Mediation = { number: next('MED', now), kind: i.kind, parties: i.parties.slice(0, 20), sessions: [], case: caseId, ...(i.sample ? { sample: true } : {}) };
  db().mediations.push(m);
  audit(by, 'mediation.open', `Mediation:${m.number}`, `${i.kind} · case ${caseId}`);
  return clone(m);
}
export function recordSession(caseId: string, note: string, by: string, now = new Date()): Mediation | { error: string } {
  const m = db().mediations.find(x => x.case === caseId);
  if (!m || m.outcome) return { error: 'No open mediation in this case' };
  if (!note.trim()) return { error: 'Record what the session covered' };
  m.sessions.push({ at: now.toISOString(), by, note: note.trim().slice(0, 2000) });
  audit(by, 'mediation.session', `Mediation:${m.number}`, `session ${m.sessions.length} · case ${caseId}`);
  return clone(m);
}
export function recordMediationOutcome(caseId: string, o: { result: 'settled' | 'partly-settled' | 'not-settled' | 'withdrawn'; agreement?: string }, by: string, now = new Date()): Mediation | { error: string } {
  const m = db().mediations.find(x => x.case === caseId);
  if (!m || m.outcome) return { error: 'No open mediation in this case' };
  if (!['settled', 'partly-settled', 'not-settled', 'withdrawn'].includes(o.result)) return { error: 'The outcome is settled, partly settled, not settled or withdrawn' };
  if (['settled', 'partly-settled'].includes(o.result) && !o.agreement) return { error: 'A settlement is recorded with the agreement the parties signed' };
  m.outcome = { result: o.result, ...(o.agreement ? { agreement: o.agreement } : {}), at: now.toISOString(), by };
  audit(by, 'mediation.outcome', `Mediation:${m.number}`, `${o.result} · case ${caseId}`);
  return clone(m);
}
export const mediationOfCase = (caseId: string): Mediation | undefined => { const m = db().mediations.find(x => x.case === caseId); return m ? clone(m) : undefined; };

export function acknowledgeNotice(i: Omit<LabourNotice, 'number' | 'acknowledged' | 'case'> & Sample, caseId: string, by: string, now = new Date()): LabourNotice | { error: string } {
  if (!['strike', 'work-stoppage', 'redundancy', 'collective-dismissal'].includes(i.kind)) return { error: 'The notice is of a strike, a work stoppage, a redundancy or a collective dismissal' };
  if (!DATE.test(i.effectiveDate)) return { error: 'The date it takes effect (YYYY-MM-DD)' };
  if (i.employer && !db().employers.some(e => e.number === i.employer)) return { error: `${i.employer} is not a registered employer` };
  if (db().notices.some(n => n.case === caseId)) return { error: 'This case has already acknowledged its notice' };
  const n: LabourNotice = { ...clone(i), number: next('LNT', now), acknowledged: { at: now.toISOString(), by }, case: caseId };
  db().notices.push(n);
  audit(by, 'notice.acknowledge', `LabourNotice:${n.number}`, `${i.kind} · case ${caseId}`);
  return clone(n);
}

// ── Reads ────────────────────────────────────────────────────────────────────

/** Is this employer registered with the labour authority? Standing only (employer.standing): never workers, inspections or complaints. */
export function employerStanding(n: string): { registered: 'yes' | 'no'; state?: Employer['state']; employer?: string } {
  const e = db().employers.find(x => x.number === n || x.organisation === n);
  return e ? { registered: e.state === 'registered' ? 'yes' : 'no', state: e.state, employer: e.number } : { registered: 'no' };
}

/** Officials' search: an employer with its inspections, or the records of a case (the route logs it). */
export function findLabour(q: { employer?: string; case?: string }): { employers: Employer[]; inspections: Inspection[]; injuries: Injury[]; vacancies: Vacancy[] } {
  const d = db();
  if (q.case) return { employers: d.employers.filter(x => x.case === q.case).map(clone), inspections: d.inspections.filter(x => x.case === q.case).map(clone), injuries: d.injuries.filter(x => x.case === q.case).map(clone), vacancies: d.vacancies.filter(x => x.case === q.case).map(clone) };
  if (q.employer) { const e = d.employers.find(x => x.number === q.employer || x.organisation === q.employer); return e ? { employers: [clone(e)], inspections: d.inspections.filter(x => x.employer === e.number).map(clone), injuries: d.injuries.filter(x => x.employer === e.number).map(clone), vacancies: d.vacancies.filter(x => x.employer === e.number).map(clone) } : { employers: [], inspections: [], injuries: [], vacancies: [] }; }
  return { employers: [], inspections: [], injuries: [], vacancies: [] };
}

/** Counts (no person, no employer named): the register's overview and the indicators' inputs. */
export function labourCounts(): Record<string, number> {
  const d = db();
  const open = d.inspections.filter(x => x.state !== 'closed').length;
  const outstanding = d.inspections.flatMap(x => x.orders).filter(o => !o.verified || o.verified.outcome !== 'complied').length;
  return {
    employers: d.employers.filter(x => x.state === 'registered').length, employments: d.employments.filter(x => x.state === 'active').length,
    vacancies: d.vacancies.filter(x => x.state === 'published').length, jobseekers: d.jobseekers.filter(x => x.state === 'registered').length,
    inspectionsOpen: open, inspectionsClosed: d.inspections.length - open, outstandingOrders: outstanding,
    injuries: d.injuries.length, mediations: d.mediations.length, notices: d.notices.length,
    samples: [...d.employers, ...d.employments, ...d.inspections, ...d.injuries].filter(x => x.sample).length,
  };
}
