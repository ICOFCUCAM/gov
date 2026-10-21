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

import { proposePolicy, confirmPolicy, withdrawPolicy, type PolicyChanges } from '@/lib/law/policy-change';
import { samplesAllowed } from '@/lib/ops/mode';
import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { slotConnection } from '@/lib/nation/edition';
import { raiseCounter } from '@/lib/data/numbering';
import { uuid7 } from '@/lib/data/uuid7';
import { nextNumber, legacyMax } from '@/lib/data/numbering';
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
  /**
   * What the public check shows (the country's disclosure profile). By
   * default name, number, profession, standing and validity; conditions
   * (which can reveal a disciplinary history) only when the country's law
   * makes them public. The person reference and qualifications never.
   */
  publicFields?: PublicField[];
  reference: boolean;
  createdBy: string;
  createdAt: string;
}

export const PUBLIC_FIELDS = ['name', 'number', 'profession', 'state', 'validUntil', 'conditions'] as const;
export type PublicField = typeof PUBLIC_FIELDS[number];
export const DEFAULT_PUBLIC_FIELDS: PublicField[] = ['name', 'number', 'profession', 'state', 'validUntil'];

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

type Disclosure = { publicFields: PublicField[] };
interface Db { people: Professional[]; professions: Profession[]; seq: Record<string, number>; prnSeq: number; disclosure?: Record<string, PolicyChanges<Disclosure>> }
const g = globalThis as unknown as { __civicosProfessions?: Db };
const db = (): Db => {
  const d = touch('__civicosProfessions', g.__civicosProfessions ??= { people: [], professions: [], seq: {}, prnSeq: 0 });
  d.people ??= []; d.professions ??= []; d.seq ??= {}; d.disclosure ??= {};
  d.prnSeq ??= legacyMax(d.seq);
  return d;
};
export function resetProfessions(): void { g.__civicosProfessions = undefined; }

/** Every registration as kept, with the professions defined, for an institution's portable export (lib/portability/export.ts). Read only. */
export const professionalRecords = (): { professions: Profession[]; people: Professional[] } => ({ professions: db().professions.map(p => structuredClone(p)), people: db().people.map(p => structuredClone(p)) });
/** Put back professions and registrations keeping their ids and numbers (lib/portability/import.ts only: the confirmed import of an institution's own export (two officials) into an installation that holds none of these records). A profession defined here already is kept as it is. */
export function restoreProfessionals(input: { professions: Profession[]; people: Professional[] }): { restored: number } | { error: string } {
  const d = db();
  const clash = input.people.find(e => d.people.some(x => x.id === e.id || x.number === e.number));
  if (clash) return { error: `Registration ${clash.number} is already in this installation's register` };
  for (const p of input.professions) if (!d.professions.some(x => x.key === p.key)) d.professions.push(structuredClone(p));
  d.people.push(...input.people.map(e => structuredClone(e)));
  raiseCounter(d as unknown as Record<string, unknown>, 'prnSeq', input.people.map(e => e.number));
  return { restored: input.people.length };
}
const clone = <T,>(x: T): T => structuredClone(x);
const KEY = /^[a-z][a-z0-9-]{1,40}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const next = (now: Date) => nextNumber(db() as unknown as Record<string, unknown>, 'prnSeq', 'PRN', now);

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
  // What the public check shows changes only through proposeDisclosure (two officials, citing the law):
  // redefining a profession keeps its fields; a new one starts with the default in production.
  const existing = profession(key);
  const asked = Array.isArray(input.publicFields) ? input.publicFields.filter((f): f is PublicField => (PUBLIC_FIELDS as readonly string[]).includes(f)) : undefined;
  if (existing && asked && [...new Set(asked)].sort().join() !== [...(existing.publicFields ?? DEFAULT_PUBLIC_FIELDS)].sort().join()) return { error: 'What the public check shows is changed by two officials citing the law: propose it (op propose-disclosure)' };
  const fields = existing ? (existing.publicFields ?? DEFAULT_PUBLIC_FIELDS) : asked && samplesAllowed() ? asked : DEFAULT_PUBLIC_FIELDS;
  if (!fields.includes('name') || !fields.includes('state')) return { error: 'The public check shows at least the name and the standing' };
  const p: Profession = { key, title, authority, permitType, publicCheck: input.publicCheck !== false, publicFields: [...new Set(fields)], reference: false, createdBy: by, createdAt: now.toISOString() };
  const d = db();
  d.professions = [...d.professions.filter(x => x.key !== key), p];
  recordAudit(by, 'profession.define', `Profession:${key}`, 'ok', `${title} · kept by ${authority} · public check shows ${p.publicCheck ? (p.publicFields ?? []).join(', ') : 'nothing (not on the public check)'}`);
  return clone(p);
}

// ── What the public check shows: two officials, citing the law ───────────────

const DISCLOSURE_AUDIT = 'profession.disclosure';
const checkDisclosure = (v: Disclosure): string | null => {
  if (!Array.isArray(v.publicFields) || v.publicFields.some(f => !(PUBLIC_FIELDS as readonly string[]).includes(f))) return `Public fields are chosen from ${PUBLIC_FIELDS.join(', ')}`;
  return v.publicFields.includes('name') && v.publicFields.includes('state') ? null : 'The public check shows at least the name and the standing';
};
const describeDisclosure = (key: string) => (v: Disclosure) => `${key}: the public check shows ${v.publicFields.join(', ')}`;

/** One administrator proposes what a profession's public check shows, citing the law; a different official confirms. */
export function proposeDisclosure(key: string, publicFields: unknown, legalBasis: unknown, by: string, byId?: string, now = new Date(), pendingHours = 24) {
  const p = profession(key);
  if (!p) return { error: `No profession ${key}` };
  const fields = Array.isArray(publicFields) ? [...new Set(publicFields.map(String))] as PublicField[] : [];
  return proposePolicy(db().disclosure![key] ??= {}, { publicFields: p.publicFields ?? DEFAULT_PUBLIC_FIELDS }, { publicFields: fields }, legalBasis, {
    by, ...(byId ? { byId } : {}), now, pendingHours, audit: DISCLOSURE_AUDIT, context: `What the public check of ${p.title} shows`, check: checkDisclosure, describe: describeDisclosure(key),
  });
}

/** A different official confirms: the public check shows those fields from now (a reference profession becomes the country's own). */
export function confirmDisclosure(key: string, by: string, byId?: string, now = new Date(), requireIdentityBinding = false) {
  const p = profession(key);
  if (!p) return { error: `No profession ${key}` };
  const d = db();
  return confirmPolicy(d.disclosure![key] ??= {}, {
    by, ...(byId ? { byId } : {}), now, audit: DISCLOSURE_AUDIT, requireIdentityBinding, describe: describeDisclosure(key),
    adopt: v => {
      const own = d.professions.find(x => x.key === key);
      if (own) own.publicFields = [...v.values.publicFields];
      else d.professions.push({ ...p, publicFields: [...v.values.publicFields], reference: false, createdBy: v.by, createdAt: now.toISOString() });
    },
  });
}
export const withdrawDisclosure = (key: string, by: string, reason?: string) => withdrawPolicy(db().disclosure![key] ??= {}, { by, ...(reason ? { reason } : {}), audit: DISCLOSURE_AUDIT });
/** A profession's waiting proposal and earlier versions. */
export const disclosureChanges = (key: string): PolicyChanges<Disclosure> => clone(db().disclosure![key] ?? {});

// ── Entries ───────────────────────────────────────────────────────────────────

export interface NewProfessional { profession: string; personRef: string; name: string; qualifications?: string[]; validUntil?: string; conditions?: string[] }

/** Each qualification cited from the education register must be valid and the holder's (by name). Free-text ones (foreign degrees) are kept as stated. */
export function checkQualifications(name: string, quals: string[]): string | null {
  for (const q of quals) {
    if (!/^QUA-\d{4}-\d{6}$/.test(q)) continue;
    // An Institutional Edition without the education authority cannot check the register: the step pauses
    // (spec Part 5 D), never taking the qualification as checked. Qualifications as stated are not affected.
    const off = slotConnection('education');
    if (off) return `${off} Record the qualification as stated with its evidence, or check it once the education authority is connected.`;
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

export interface PublicProfessional { number?: string; name: string; profession: string; professionTitle: string; state: ProfessionalState; validUntil?: string; conditions?: string[] }
/** What anyone may see, as the profession's disclosure profile says: never the person reference, the qualifications or the history. */
export function publicProfessional(e: Professional): PublicProfessional {
  const p = profession(e.profession);
  const show = new Set(p?.publicFields ?? DEFAULT_PUBLIC_FIELDS);
  return {
    name: e.name, profession: e.profession, professionTitle: p?.title ?? e.profession, state: e.state,
    ...(show.has('number') ? { number: e.number } : {}),
    ...(show.has('validUntil') && e.validUntil ? { validUntil: e.validUntil } : {}),
    ...(show.has('conditions') ? { conditions: [...e.conditions] } : {}),
  };
}

/**
 * The public check of one person: by full name (five letters or more),
 * optionally narrowed by the registration number. A number alone answers
 * nothing, so the register cannot be read number by number; at most 20
 * answers, in professions open to checking.
 */
export function checkProfessional(input: { name?: string; number?: string } | string): PublicProfessional[] {
  const q = typeof input === 'string' ? { name: input } : input;
  const name = (q.name ?? '').trim(), number = (q.number ?? '').trim();
  if (name.replace(/\s/g, '').length < 5) return [];
  const open = new Set(professions().filter(p => p.publicCheck).map(p => p.key));
  return db().people.filter(e => open.has(e.profession) && sameName(e.name, name) && (!number || e.number === number)).slice(0, 20).map(publicProfessional);
}

export function professionCounts(): Record<string, Record<ProfessionalState, number>> {
  const out: Record<string, Record<ProfessionalState, number>> = {};
  for (const e of db().people) { const c = out[e.profession] ??= { registered: 0, suspended: 0, revoked: 0, lapsed: 0 }; c[e.state] += 1; }
  return out;
}
