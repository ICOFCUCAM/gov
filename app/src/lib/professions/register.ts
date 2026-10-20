// The register of regulated professionals (owner's Cycle 3 directive,
// workstream 3): doctors, nurses, midwives, pharmacists and the other
// professions a nation regulates. Each profession is configured with the
// authority that keeps its register (a deployment-profile key or an
// institution: a medical council, a nursing council...), like the
// organisations register's types; the permit authority registry
// (lib/permits/authority.ts, `health-professional-licence` by default) can
// say who holds each power.
//
// A professional's entry is changed only by the effects of approved
// procedures (lib/professions/procedures.ts): registration, renewal,
// suspension with reinstatement, revocation; four-eyes on each decision,
// every step kept. A registration can cite a qualification from the
// education register, checked against the holder's name there.
//
// Public: whether someone is registered (name, profession, number, standing,
// conditions, valid until), through `publicProfessional()`. The person
// reference stays on the full record. No clinical or patient data, ever.
// Held in platform state.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';
import { getAward, sameName } from '@/lib/education/register';
import type { AuthorityKey } from '@/lib/nation/deployment';

export interface Profession {
  key: string;
  title: string;
  /** Who keeps its register: a deployment-profile authority or an institution id. */
  authority: AuthorityKey | string;
  /** The permit type whose approved authority mapping governs it. */
  permitType: string;
  /** Anyone may check a professional's standing in it. */
  publicCheck: boolean;
  reference: boolean;
  createdBy: string;
  createdAt: string;
}

export type ProfessionalState = 'registered' | 'suspended' | 'revoked' | 'lapsed';

export interface ProfessionalStep { state: ProfessionalState; at: string; by: string; reason: string; case: string; decision?: string; validUntil?: string; conditions?: string[] }

export interface Professional {
  id: string;
  /** The registration number: PRN-YYYY-NNNNNN. */
  number: string;
  profession: string;
  /** The person: a reference in the civil register or identity provider. Personal data. */
  personRef: string;
  name: string;
  qualifications: string[];
  state: ProfessionalState;
  validUntil?: string;
  conditions: string[];
  history: ProfessionalStep[];
  certificate?: string;
}

export const REFERENCE_PROFESSIONS: Omit<Profession, 'createdBy' | 'createdAt'>[] = [
  { key: 'medical-practitioner', title: 'Medical practitioners', authority: 'professionalRegulation', permitType: 'health-professional-licence', publicCheck: true, reference: true },
  { key: 'nurse', title: 'Nurses', authority: 'professionalRegulation', permitType: 'health-professional-licence', publicCheck: true, reference: true },
  { key: 'midwife', title: 'Midwives', authority: 'professionalRegulation', permitType: 'health-professional-licence', publicCheck: true, reference: true },
  { key: 'pharmacist', title: 'Pharmacists', authority: 'professionalRegulation', permitType: 'health-professional-licence', publicCheck: true, reference: true },
];

interface Db { people: Professional[]; professions: Profession[]; seq: Record<string, number> }
const g = globalThis as unknown as { __civicosProfessions?: Db };
const db = (): Db => {
  const d = touch('__civicosProfessions', g.__civicosProfessions ??= { people: [], professions: [], seq: {} });
  d.people ??= []; d.professions ??= []; d.seq ??= {};
  return d;
};
export function resetProfessions(): void { g.__civicosProfessions = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);
const KEY = /^[a-z][a-z0-9-]{1,40}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const next = (now: Date) => { const d = db(); const y = String(now.getUTCFullYear()); d.seq[y] = (d.seq[y] ?? 0) + 1; return `PRN-${y}-${String(d.seq[y]).padStart(6, '0')}`; };

// ── Professions ───────────────────────────────────────────────────────────────

export function professions(): Profession[] {
  const own = db().professions;
  return clone([...REFERENCE_PROFESSIONS.filter(r => !own.some(p => p.key === r.key)).map(r => ({ ...r, createdBy: 'CivicOS', createdAt: '2026-01-01T00:00:00.000Z' })), ...own]);
}
export const profession = (key: string): Profession | undefined => professions().find(p => p.key === key);

/** An administrator configures a profession (or changes one: same key), naming the authority that keeps it. */
export function defineProfession(input: Partial<Profession>, by: string, now = new Date()): Profession | { error: string } {
  const key = String(input.key ?? '').trim();
  if (!KEY.test(key)) return { error: 'A profession needs a short key: lower-case letters, digits and hyphens (e.g. physiotherapist)' };
  const title = String(input.title ?? '').trim().slice(0, 200);
  if (title.length < 3) return { error: 'Give the profession its title' };
  const authority = String(input.authority ?? '').trim().slice(0, 80);
  if (!authority) return { error: 'Name the authority that keeps its register' };
  const permitType = KEY.test(String(input.permitType ?? '')) ? String(input.permitType) : 'health-professional-licence';
  const p: Profession = { key, title, authority, permitType, publicCheck: input.publicCheck !== false, reference: false, createdBy: by, createdAt: now.toISOString() };
  const d = db();
  d.professions = [...d.professions.filter(x => x.key !== key), p];
  recordAudit(by, 'profession.define', `Profession:${key}`, 'ok', `${title} · kept by ${authority}`);
  return clone(p);
}

// ── Entries ───────────────────────────────────────────────────────────────────

export interface NewProfessional { profession: string; personRef: string; name: string; qualifications?: string[]; validUntil?: string; conditions?: string[] }

/** Each qualification cited from the education register must be valid and the holder's (by name). Free-text ones (foreign degrees) are kept as stated. */
export function checkQualifications(name: string, quals: string[]): string | null {
  for (const q of quals) {
    if (!/^QUA-\d{4}-\d{6}$/.test(q)) continue;
    const a = getAward(q);
    if (!a || a.state !== 'valid') return `Qualification ${q} is not a valid qualification in the education register`;
    if (!sameName(a.versions.at(-1)!.holderName, name)) return `Qualification ${q} is recorded for someone else`;
  }
  return null;
}

export function registerProfessional(input: NewProfessional, caseId: string, by: string, now = new Date()): Professional | { error: string } {
  const p = profession(input.profession);
  if (!p) return { error: `No profession ${input.profession || '(none given)'}` };
  if (!input.personRef?.trim() || !input.name?.trim()) return { error: 'Name the professional and their person reference' };
  const quals = (input.qualifications ?? []).map(q => q.trim()).filter(Boolean).slice(0, 20);
  const bad = checkQualifications(input.name, quals);
  if (bad) return { error: bad };
  if (input.validUntil && (!DATE.test(input.validUntil) || input.validUntil <= now.toISOString().slice(0, 10))) return { error: 'Valid until is a future date (YYYY-MM-DD)' };
  if (db().people.some(x => x.profession === p.key && x.personRef === input.personRef.trim() && x.state !== 'revoked' && x.state !== 'lapsed')) return { error: `${input.name} is already on the register of ${p.title.toLowerCase()}` };
  const at = now.toISOString();
  const conditions = (input.conditions ?? []).map(c => c.trim()).filter(Boolean).slice(0, 20);
  const e: Professional = {
    id: uuid7(), number: next(now), profession: p.key, personRef: input.personRef.trim().slice(0, 80), name: input.name.trim().slice(0, 200),
    qualifications: quals, state: 'registered', ...(input.validUntil ? { validUntil: input.validUntil } : {}), conditions,
    history: [{ state: 'registered', at, by, reason: 'Registered', case: caseId, ...(input.validUntil ? { validUntil: input.validUntil } : {}), ...(conditions.length ? { conditions } : {}) }],
  };
  db().people.push(e);
  recordAudit(by, 'profession.register', `Professional:${e.number}`, 'ok', `${p.key} · case ${caseId}`);
  return clone(e);
}

const MOVES: Record<ProfessionalState, ProfessionalState[]> = { registered: ['registered', 'suspended', 'revoked', 'lapsed'], suspended: ['registered', 'revoked'], revoked: [], lapsed: ['registered'] };

/** A decided change of standing: renewal (registered again, new validity), suspension, reinstatement, revocation. */
export function setProfessionalState(number: string, ch: { state: ProfessionalState; reason: string; validUntil?: string; conditions?: string[] }, caseId: string, by: string, now = new Date()): Professional | { error: string } {
  const e = db().people.find(x => x.number === number);
  if (!e) return { error: `No registered professional ${number || '(none given)'}` };
  if (!MOVES[e.state].includes(ch.state)) return { error: `A ${e.state} registration cannot become ${ch.state}` };
  if (!ch.reason?.trim()) return { error: 'State the reason' };
  if (ch.validUntil && (!DATE.test(ch.validUntil) || ch.validUntil <= now.toISOString().slice(0, 10))) return { error: 'Valid until is a future date (YYYY-MM-DD)' };
  e.state = ch.state;
  if (ch.validUntil) e.validUntil = ch.validUntil;
  if (ch.conditions) e.conditions = ch.conditions.map(c => c.trim()).filter(Boolean).slice(0, 20);
  e.history.push({ state: ch.state, at: now.toISOString(), by, reason: ch.reason.slice(0, 500), case: caseId, ...(ch.validUntil ? { validUntil: ch.validUntil } : {}), ...(ch.conditions ? { conditions: e.conditions } : {}) });
  recordAudit(by, `profession.${ch.state === 'registered' ? 'renew' : ch.state}`, `Professional:${e.number}`, 'ok', `case ${caseId}`);
  return clone(e);
}

export function attachProfessionalDecision(number: string, decision: string): void {
  const e = db().people.find(x => x.number === number);
  const last = e?.history.at(-1);
  if (last && !last.decision) last.decision = decision;
}
export function attachProfessionalCertificate(number: string, code: string): void {
  const e = db().people.find(x => x.number === number);
  if (e) e.certificate = code;
}

/** Registrations past their validity lapse (the daily job). */
export function lapseRegistrations(now = new Date()): string[] {
  const today = now.toISOString().slice(0, 10), lapsed: string[] = [];
  for (const e of db().people) {
    if (e.state === 'registered' && e.validUntil && e.validUntil < today) {
      e.state = 'lapsed';
      e.history.push({ state: 'lapsed', at: now.toISOString(), by: 'System (validity)', reason: `Not renewed by ${e.validUntil}`, case: '' });
      recordAudit('System (validity)', 'profession.lapsed', `Professional:${e.number}`, 'ok', `valid until ${e.validUntil}`);
      lapsed.push(e.number);
    }
  }
  return lapsed;
}

export const getProfessional = (numberOrId: string): Professional | undefined => { const e = db().people.find(x => x.number === numberOrId || x.id === numberOrId); return e ? clone(e) : undefined; };
export const professionalOfCase = (caseId: string): Professional | undefined => { const e = [...db().people].reverse().find(x => x.history.some(h => h.case === caseId)); return e ? clone(e) : undefined; };
export function listProfessionals(f: { profession?: string; state?: ProfessionalState; personRef?: string; limit?: number } = {}): Professional[] {
  return db().people.filter(e => (!f.profession || e.profession === f.profession) && (!f.state || e.state === f.state) && (!f.personRef || e.personRef === f.personRef)).slice(-(f.limit ?? 200)).map(clone);
}

export interface PublicProfessional { number: string; name: string; profession: string; professionTitle: string; state: ProfessionalState; validUntil?: string; conditions: string[] }
/** What anyone may see: never the person reference, the qualifications or the history. */
export function publicProfessional(e: Professional): PublicProfessional {
  return { number: e.number, name: e.name, profession: e.profession, professionTitle: profession(e.profession)?.title ?? e.profession, state: e.state, ...(e.validUntil ? { validUntil: e.validUntil } : {}), conditions: [...e.conditions] };
}

/** The public check: by registration number, or by full name (at least 5 letters), in professions open to checking. */
export function checkProfessional(q: string): PublicProfessional[] {
  const s = q.trim();
  if (!s) return [];
  const open = new Set(professions().filter(p => p.publicCheck).map(p => p.key));
  const byNumber = db().people.filter(e => e.number === s);
  const found = byNumber.length ? byNumber : s.replace(/\s/g, '').length >= 5 ? db().people.filter(e => sameName(e.name, s)) : [];
  return found.filter(e => open.has(e.profession)).slice(0, 20).map(publicProfessional);
}

export function professionCounts(): Record<string, Record<ProfessionalState, number>> {
  const out: Record<string, Record<ProfessionalState, number>> = {};
  for (const e of db().people) { const c = out[e.profession] ??= { registered: 0, suspended: 0, revoked: 0, lapsed: 0 }; c[e.state] += 1; }
  return out;
}
