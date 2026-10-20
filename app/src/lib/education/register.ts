// The education register (owner's Cycle 3 directive, workstream 2). Schools,
// colleges and universities are organisations (lib/organisations/register.ts):
// their registration and accreditation are standings there, never a second
// identity. This register holds what education adds around them:
//
// - inspections of an institution (outcome, summary, the case that made it);
// - qualifications awarded by an accredited institution, each citing the
//   standing that made the awarding body competent on the day of the award;
//   corrected or revoked only by a decided case, every version kept;
// - institutional returns: aggregate counts an institution reports for a
//   period (enrolment, teaching staff), versioned, always marked reported.
//
// No student record system: a qualification names its holder (personal data,
// read by the education authority and auditors with a purpose, every read
// logged by the routes); anyone else checks a qualification by its number and
// the holder's name through the exchange (qualification.verify) and learns
// only whether it is valid and what it is. Held in platform state.

import { createHash } from 'node:crypto';
import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';
import { getOrganisation, registerTypes, current } from '@/lib/organisations/register';

export type InspectionOutcome = 'no-action' | 'improvement-required' | 'referred-for-suspension';
export const INSPECTION_OUTCOMES: InspectionOutcome[] = ['no-action', 'improvement-required', 'referred-for-suspension'];

export interface Inspection {
  id: string;
  organisation: string;
  register: string;
  date: string;
  outcome: InspectionOutcome;
  summary: string;
  case: string;
  by: string;
  at: string;
}

export interface AwardVersion { n: number; title: string; level?: string; field?: string; awardedOn: string; holderName: string; at: string; by: string; case: string; reason: string }

export interface Award {
  id: string;
  /** The qualification number printed on the award: QUA-YYYY-NNNNNN. */
  number: string;
  /** The holder: a person reference from the civil register or identity provider. Personal data. */
  holderRef: string;
  awardingBody: string;
  /** The standing that made the awarding body competent on the day (register and state then). */
  accreditation: { register: string; title: string; state: 'granted' };
  versions: AwardVersion[];
  state: 'valid' | 'revoked';
  certificate?: string;
  revoked?: { at: string; by: string; case: string; reason: string };
}

/** The counts an institutional return carries; aggregate only, never a list of pupils. */
export const RETURN_METRICS = ['enrolment.total', 'enrolment.female', 'enrolment.male', 'staff.teaching', 'staff.total'] as const;
export type ReturnMetric = typeof RETURN_METRICS[number];

export interface InstitutionReturn {
  id: string;
  organisation: string;
  period: string;
  versions: { n: number; counts: Partial<Record<ReturnMetric, number>>; at: string; by: string; note?: string }[];
}

interface Db { inspections: Inspection[]; awards: Award[]; returns: InstitutionReturn[]; seq: Record<string, number> }
const g = globalThis as unknown as { __civicosEducation?: Db };
const db = (): Db => {
  const d = touch('__civicosEducation', g.__civicosEducation ??= { inspections: [], awards: [], returns: [], seq: {} });
  d.inspections ??= []; d.awards ??= []; d.returns ??= []; d.seq ??= {};
  return d;
};
export function resetEducation(): void { g.__civicosEducation = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PERIOD = /^\d{4}(-(0[1-9]|1[0-2])|-T[1-4]|\/\d{4})?$/;
const next = (k: string, now: Date) => { const d = db(); const y = String(now.getUTCFullYear()); d.seq[`${k}${y}`] = (d.seq[`${k}${y}`] ?? 0) + 1; return `${k}-${y}-${String(d.seq[`${k}${y}`]).padStart(6, '0')}`; };
/** Names compared without case, accents or extra spaces. */
export const sameName = (a: string, b: string) => {
  const n = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
  return !!n(a) && n(a) === n(b);
};

// ── Inspections ───────────────────────────────────────────────────────────────

export function recordInspection(input: { organisation: string; register: string; date: string; outcome: string; summary: string }, caseId: string, by: string, now = new Date()): Inspection | { error: string } {
  const o = getOrganisation(input.organisation);
  if (!o) return { error: `No organisation ${input.organisation || '(none given)'} in the register` };
  if (!o.standings.some(s => s.register === input.register)) return { error: `${current(o).name} holds no standing in ${input.register}` };
  if (!DATE.test(input.date) || input.date > now.toISOString().slice(0, 10)) return { error: 'The inspection date is a date (YYYY-MM-DD), not in the future' };
  if (!INSPECTION_OUTCOMES.includes(input.outcome as InspectionOutcome)) return { error: `The outcome is one of ${INSPECTION_OUTCOMES.join(', ')}` };
  if (!input.summary.trim()) return { error: 'Summarise the findings' };
  const i: Inspection = { id: uuid7(), organisation: o.number, register: input.register, date: input.date, outcome: input.outcome as InspectionOutcome, summary: input.summary.trim().slice(0, 2000), case: caseId, by, at: now.toISOString() };
  db().inspections.push(i);
  recordAudit(by, 'education.inspection.record', `Organisation:${o.number}`, 'ok', `${input.register} · ${i.outcome} · case ${caseId}`);
  return clone(i);
}

export const inspectionsOf = (organisation: string): Inspection[] => db().inspections.filter(i => i.organisation === organisation).map(clone);

// ── Qualifications ────────────────────────────────────────────────────────────

/** The awarding body's standing that lets it award: granted in an accreditation register, or in the schools register. */
function competence(orgNumber: string): { register: string; title: string } | { error: string } {
  const o = getOrganisation(orgNumber);
  if (!o) return { error: `No awarding body ${orgNumber || '(none given)'} in the organisations register` };
  const types = new Map(registerTypes().map(t => [t.key, t]));
  const s = o.standings.find(x => x.state === 'granted' && (types.get(x.register)?.kind === 'accreditation' || x.register === 'schools'));
  if (!s) return { error: `${current(o).name} is not accredited or registered to award qualifications today` };
  return { register: s.register, title: types.get(s.register)?.title ?? s.register };
}

export interface NewAward { holderRef: string; holderName: string; title: string; level?: string; field?: string; awardingBody: string; awardedOn: string }

export function recordAward(input: NewAward, caseId: string, by: string, now = new Date()): Award | { error: string } {
  if (!input.holderRef?.trim() || !input.holderName?.trim()) return { error: 'Name the holder and their person reference' };
  if (!input.title?.trim()) return { error: 'Name the qualification' };
  if (!DATE.test(input.awardedOn) || input.awardedOn > now.toISOString().slice(0, 10)) return { error: 'The award date is a date (YYYY-MM-DD), not in the future' };
  const c = competence(input.awardingBody);
  if ('error' in c) return c;
  if (db().awards.some(a => a.state === 'valid' && a.holderRef === input.holderRef.trim() && a.awardingBody === input.awardingBody && a.versions.at(-1)!.title === input.title.trim() && a.versions.at(-1)!.awardedOn === input.awardedOn)) return { error: 'This qualification is already recorded for this holder' };
  const at = now.toISOString();
  const a: Award = {
    id: uuid7(), number: next('QUA', now), holderRef: input.holderRef.trim().slice(0, 80), awardingBody: input.awardingBody,
    accreditation: { ...c, state: 'granted' }, state: 'valid',
    versions: [{ n: 1, title: input.title.trim().slice(0, 200), ...(input.level?.trim() ? { level: input.level.trim().slice(0, 60) } : {}), ...(input.field?.trim() ? { field: input.field.trim().slice(0, 120) } : {}), awardedOn: input.awardedOn, holderName: input.holderName.trim().slice(0, 200), at, by, case: caseId, reason: 'Recorded' }],
  };
  db().awards.push(a);
  recordAudit(by, 'education.award.record', `Award:${a.number}`, 'ok', `awarded by ${input.awardingBody} under ${c.register} · case ${caseId}`);
  return clone(a);
}

/** A correction decided by a case: a new version, the earlier ones kept. */
export function correctAward(number: string, patch: Partial<Pick<AwardVersion, 'title' | 'level' | 'field' | 'awardedOn' | 'holderName'>>, reason: string, caseId: string, by: string, now = new Date()): Award | { error: string } {
  const a = db().awards.find(x => x.number === number);
  if (!a) return { error: `No qualification ${number}` };
  if (a.state !== 'valid') return { error: 'A revoked qualification is not corrected' };
  if (!reason.trim()) return { error: 'State the reason for the correction' };
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => typeof v === 'string' && v.trim()).map(([k, v]) => [k, (v as string).trim().slice(0, 200)]));
  if (!Object.keys(clean).length) return { error: 'Nothing to correct' };
  if (clean.awardedOn && !DATE.test(clean.awardedOn)) return { error: 'The award date is a date (YYYY-MM-DD)' };
  const prev = a.versions.at(-1)!;
  a.versions.push({ ...prev, ...clean, n: prev.n + 1, at: now.toISOString(), by, case: caseId, reason: reason.slice(0, 500) });
  recordAudit(by, 'education.award.correct', `Award:${a.number}`, 'ok', `${Object.keys(clean).join(', ')} · case ${caseId}`);
  return clone(a);
}

export function revokeAward(number: string, reason: string, caseId: string, by: string, now = new Date()): Award | { error: string } {
  const a = db().awards.find(x => x.number === number);
  if (!a) return { error: `No qualification ${number}` };
  if (a.state === 'revoked') return { error: 'Already revoked' };
  if (!reason.trim()) return { error: 'State the reason for the revocation' };
  a.state = 'revoked';
  a.revoked = { at: now.toISOString(), by, case: caseId, reason: reason.slice(0, 500) };
  recordAudit(by, 'education.award.revoke', `Award:${a.number}`, 'ok', `case ${caseId}`);
  return clone(a);
}

export function attachAwardCertificate(number: string, code: string): void {
  const a = db().awards.find(x => x.number === number);
  if (a) a.certificate = code;
}

export const getAward = (number: string): Award | undefined => { const a = db().awards.find(x => x.number === number || x.id === number); return a ? clone(a) : undefined; };
export const awardsOf = (q: { holderRef?: string; awardingBody?: string }): Award[] => db().awards.filter(a => (q.holderRef && a.holderRef === q.holderRef) || (q.awardingBody && a.awardingBody === q.awardingBody)).map(clone);
export const awardOfCase = (caseId: string): Award | undefined => { const a = [...db().awards].reverse().find(x => x.versions.some(v => v.case === caseId)); return a ? clone(a) : undefined; };

/**
 * Check a qualification someone presents: its number and the holder's name.
 * The answer says only whether it is valid and what it is; never the holder's
 * reference, other qualifications or the history. A wrong name answers the
 * same as an unknown number.
 */
export function verifyAward(number: string, holderName: string): { valid: false } | { valid: true; title: string; level?: string; field?: string; awardedOn: string; awardingBody: string; accreditedUnder: string } {
  const a = db().awards.find(x => x.number === number.trim());
  const v = a?.versions.at(-1);
  if (!a || !v || a.state !== 'valid' || !sameName(v.holderName, holderName)) return { valid: false };
  const body = getOrganisation(a.awardingBody);
  return { valid: true, title: v.title, ...(v.level ? { level: v.level } : {}), ...(v.field ? { field: v.field } : {}), awardedOn: v.awardedOn, awardingBody: body ? current(body).name : a.awardingBody, accreditedUnder: a.accreditation.title };
}

// ── Institutional returns ─────────────────────────────────────────────────────

/** Record (or re-record, as a new version) the counts an institution reported for a period. */
export function recordReturn(input: { organisation: string; period: string; counts: Record<string, unknown>; note?: string }, by: string, now = new Date()): InstitutionReturn | { error: string } {
  const o = getOrganisation(input.organisation);
  if (!o) return { error: `No organisation ${input.organisation || '(none given)'} in the register` };
  if (!o.standings.some(s => s.state === 'granted' && (s.register === 'schools' || registerTypes().find(t => t.key === s.register)?.kind === 'accreditation'))) return { error: `${current(o).name} is not a registered or accredited education institution` };
  if (!PERIOD.test(input.period)) return { error: 'The period is a year (2026), a school year (2026/2027), a month (2026-03) or a term (2026-T1)' };
  const counts: Partial<Record<ReturnMetric, number>> = {};
  for (const [k, v] of Object.entries(input.counts ?? {})) {
    if (!RETURN_METRICS.includes(k as ReturnMetric)) return { error: `Unknown count ${k}: one of ${RETURN_METRICS.join(', ')}` };
    if (!Number.isInteger(v) || (v as number) < 0) return { error: `${k} is a whole, non-negative number` };
    counts[k as ReturnMetric] = v as number;
  }
  if (!Object.keys(counts).length) return { error: 'Report at least one count' };
  if (counts['enrolment.female'] !== undefined && counts['enrolment.male'] !== undefined && counts['enrolment.total'] !== undefined && counts['enrolment.female'] + counts['enrolment.male'] > counts['enrolment.total']) return { error: 'Female and male enrolment add up to more than the total' };
  const d = db();
  let r = d.returns.find(x => x.organisation === o.number && x.period === input.period);
  const v = { counts, at: now.toISOString(), by, ...(input.note?.trim() ? { note: input.note.trim().slice(0, 500) } : {}) };
  if (r) r.versions.push({ n: r.versions.length + 1, ...v });
  else { r = { id: uuid7(), organisation: o.number, period: input.period, versions: [{ n: 1, ...v }] }; d.returns.push(r); }
  recordAudit(by, 'education.return.record', `Organisation:${o.number}`, 'ok', `${input.period} · version ${r.versions.length}`);
  return clone(r);
}

export const returnsOf = (organisation: string): InstitutionReturn[] => db().returns.filter(r => r.organisation === organisation).map(clone);
export const allReturns = (period?: string): InstitutionReturn[] => db().returns.filter(r => !period || r.period === period).map(clone);

export function educationCounts(): { inspections: number; awards: number; revoked: number; returns: number } {
  const d = db();
  return { inspections: d.inspections.length, awards: d.awards.length, revoked: d.awards.filter(a => a.state === 'revoked').length, returns: d.returns.length };
}

/** A fingerprint of a set of ids (lineage for published counts). */
export const lineage = (ids: string[]) => createHash('sha256').update([...ids].sort().join('\n'), 'utf8').digest('hex');
