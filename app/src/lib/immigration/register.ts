// Immigration: visas and residence permits (directions 16.3, Gate 5; the
// ordinary visa or permit first, never asylum or enforcement automation).
// Each grant is a record of what a decided case gave a person: its kind and
// category, validity, entries, conditions and state (issued, active,
// expired, revoked, cancelled; refused decisions are kept too), with the
// case, sealed decision and certificate behind it and every step kept.
//
// A visa is not a residence permit and neither alone proves current lawful
// status: `statusOn()` answers only "does this travel document hold a valid
// grant of this kind on this date" (for border officials, employers through
// the exchange), never the holder's file. Holders are personal data and the
// records are restricted: only the immigration authority's officials read
// them, every read goes to the access log (the routes write it). Grants
// change only through the effects of approved procedures
// (lib/immigration/procedures.ts); AI never decides (directions 15.7).
// Held in platform state.

import { createHash } from 'node:crypto';
import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';

export type GrantKind = 'visa' | 'residence-permit';
export type GrantState = 'issued' | 'active' | 'expired' | 'revoked' | 'cancelled' | 'refused';
export const VISA_CATEGORIES = ['visitor', 'business', 'transit', 'student', 'work', 'family', 'diplomatic', 'other'] as const;
export const PERMIT_CATEGORIES = ['work', 'study', 'family', 'investment', 'retirement', 'long-term', 'other'] as const;

export interface Holder { name: string; nationality: string; documentNumber: string; birthDate?: string }

export interface GrantStep { state: GrantState; at: string; by: string; reason: string; case?: string; decision?: string; validUntil?: string }

export interface ImmigrationGrant {
  id: string;
  number: string;
  kind: GrantKind;
  category: string;
  holder: Holder;
  /** SHA-256 of the normalised nationality and travel document number: how a status check finds a grant without a name. */
  documentKey: string;
  validFrom?: string;
  validUntil?: string;
  entries?: 'single' | 'multiple';
  conditions: string[];
  state: GrantState;
  case: string;
  decision?: string;
  certificate?: string;
  history: GrantStep[];
  createdAt: string;
}

interface Db { grants: ImmigrationGrant[]; seq: Record<string, number> }
const g = globalThis as unknown as { __civicosImmigration?: Db };
const db = (): Db => {
  const d = touch('__civicosImmigration', g.__civicosImmigration ??= { grants: [], seq: {} });
  d.grants ??= []; d.seq ??= {};
  return d;
};
export function resetImmigration(): void { g.__civicosImmigration = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const documentKeyOf = (nationality: string, documentNumber: string): string =>
  createHash('sha256').update(`${nationality.trim().toUpperCase()}|${documentNumber.replace(/[\s-]/g, '').toUpperCase()}`, 'utf8').digest('hex');

function nextNumber(kind: GrantKind, now: Date): string {
  const d = db();
  const y = String(now.getUTCFullYear());
  const k = `${kind}:${y}`;
  d.seq[k] = (d.seq[k] ?? 0) + 1;
  return `${kind === 'visa' ? 'VIS' : 'RP'}-${y}-${String(d.seq[k]).padStart(6, '0')}`;
}

export interface GrantInput { kind: GrantKind; category: string; holder: Partial<Holder>; validFrom?: string; validUntil?: string; entries?: string; conditions?: string[] }

/** Checked before anything is written, so a refused case uses no number. */
export function checkGrant(input: GrantInput): string | null {
  const cats: readonly string[] = input.kind === 'visa' ? VISA_CATEGORIES : PERMIT_CATEGORIES;
  if (!cats.includes(input.category)) return `Category must be one of ${cats.join(', ')}`;
  const h = input.holder;
  if (!h.name?.trim()) return 'Name the holder as in the travel document';
  if (!/^[A-Z]{3}$/.test((h.nationality ?? '').trim().toUpperCase())) return 'Nationality is a three-letter country code (ISO 3166-1 alpha-3)';
  if (!h.documentNumber?.trim() || h.documentNumber.trim().length > 30) return 'Give the travel document number';
  if (h.birthDate && !DATE.test(h.birthDate)) return 'Date of birth must be YYYY-MM-DD';
  for (const [k, v] of [['validFrom', input.validFrom], ['validUntil', input.validUntil]] as const) if (v && !DATE.test(v)) return `${k} must be YYYY-MM-DD`;
  if (!input.validFrom || !input.validUntil) return 'A grant states the dates it is valid from and until';
  if (input.validUntil <= input.validFrom) return 'A grant must end after it starts';
  if (input.kind === 'visa' && input.entries && !['single', 'multiple'].includes(input.entries)) return 'Entries are single or multiple';
  return null;
}

/** A grant from a decided case (or a refusal kept as a record of the decision). */
export function recordGrant(input: GrantInput, state: 'issued' | 'refused', caseId: string, reason: string, by: string, now = new Date()): ImmigrationGrant | { error: string } {
  if (state === 'issued') { const why = checkGrant(input); if (why) return { error: why }; }
  const h = input.holder;
  const at = now.toISOString();
  const grant: ImmigrationGrant = {
    id: uuid7(), number: state === 'issued' ? nextNumber(input.kind, now) : `${input.kind === 'visa' ? 'VIS' : 'RP'}-REFUSED-${caseId.slice(-8)}`, kind: input.kind, category: input.category,
    holder: { name: (h.name ?? '').trim().slice(0, 200), nationality: (h.nationality ?? '').trim().toUpperCase().slice(0, 3), documentNumber: (h.documentNumber ?? '').trim().slice(0, 30), ...(h.birthDate ? { birthDate: h.birthDate } : {}) },
    documentKey: documentKeyOf(h.nationality ?? '', h.documentNumber ?? ''),
    ...(input.validFrom ? { validFrom: input.validFrom } : {}), ...(input.validUntil ? { validUntil: input.validUntil } : {}),
    ...(input.kind === 'visa' && input.entries ? { entries: input.entries as 'single' | 'multiple' } : {}),
    conditions: input.conditions ?? [], state, case: caseId, history: [{ state, at, by, reason: reason.slice(0, 500), case: caseId }], createdAt: at,
  };
  db().grants.push(grant);
  recordAudit(by, `immigration.${state === 'issued' ? 'grant' : 'refuse'}`, `Immigration:${grant.number}`, 'ok', `${grant.kind} · ${grant.category} · case ${caseId}`);
  return clone(grant);
}

const MOVES: Record<GrantState, GrantState[]> = {
  issued: ['active', 'revoked', 'cancelled', 'expired', 'issued'],
  active: ['revoked', 'cancelled', 'expired', 'active'],
  expired: [], revoked: [], cancelled: [], refused: [],
};

/** Change a grant's state (revocation, cancellation, extension: through a decided case; expiry: the daily job). */
export function changeGrant(numberOrId: string, ch: { state: GrantState; reason: string; case?: string; validUntil?: string; conditions?: string[] }, by: string, now = new Date()): ImmigrationGrant | { error: string } {
  const gr = db().grants.find(x => x.number === numberOrId || x.id === numberOrId);
  if (!gr) return { error: 'No such visa or permit' };
  if (!MOVES[gr.state].includes(ch.state)) return { error: `A ${gr.kind} that is ${gr.state} cannot become ${ch.state}` };
  if (ch.validUntil && (!DATE.test(ch.validUntil) || (gr.validUntil && ch.validUntil <= gr.validUntil && ch.state === gr.state))) return { error: 'An extension ends after the current end date' };
  gr.state = ch.state;
  if (ch.validUntil) gr.validUntil = ch.validUntil;
  if (ch.conditions) gr.conditions = ch.conditions;
  gr.history.push({ state: ch.state, at: now.toISOString(), by, reason: ch.reason.slice(0, 500), ...(ch.case ? { case: ch.case } : {}), ...(ch.validUntil ? { validUntil: ch.validUntil } : {}) });
  recordAudit(by, `immigration.${ch.state === gr.history.at(-2)?.state ? 'extend' : ch.state}`, `Immigration:${gr.number}`, 'ok', `${gr.kind}${ch.validUntil ? ` · until ${ch.validUntil}` : ''}${ch.case ? ` · case ${ch.case}` : ''}`);
  return clone(gr);
}

export function attachGrantDecision(numberOrId: string, decision: string): void {
  const gr = db().grants.find(x => x.number === numberOrId || x.id === numberOrId);
  if (!gr) return;
  gr.decision ??= decision;
  const last = gr.history.at(-1);
  if (last && !last.decision) last.decision = decision;
}
export function attachGrantCertificate(numberOrId: string, code: string): void {
  const gr = db().grants.find(x => x.number === numberOrId || x.id === numberOrId);
  if (gr) gr.certificate = code;
}

export const getGrant = (numberOrId: string): ImmigrationGrant | undefined => { const x = db().grants.find(gr => gr.number === numberOrId || gr.id === numberOrId); return x ? clone(x) : undefined; };
export const grantOfCase = (caseId: string): ImmigrationGrant | undefined => { const x = db().grants.find(gr => gr.case === caseId); return x ? clone(x) : undefined; };

/** Officials' search (by number, or by nationality and travel document). */
export function findGrants(q: { number?: string; nationality?: string; documentNumber?: string }): ImmigrationGrant[] {
  if (q.number) return db().grants.filter(x => x.number === q.number).map(clone);
  if (q.nationality && q.documentNumber) { const k = documentKeyOf(q.nationality, q.documentNumber); return db().grants.filter(x => x.documentKey === k).map(clone); }
  return [];
}

/** Grants past their end date become expired (run by the case-deadlines job). */
export function expireGrants(now = new Date()): string[] {
  const today = now.toISOString().slice(0, 10);
  const out: string[] = [];
  for (const gr of db().grants) if ((gr.state === 'issued' || gr.state === 'active') && gr.validUntil && gr.validUntil < today) {
    const r = changeGrant(gr.id, { state: 'expired', reason: `Validity ended on ${gr.validUntil}` }, 'System (validity)', now);
    if (!('error' in r)) out.push(gr.number);
  }
  return out;
}

export interface StatusAnswer { valid: boolean; kind?: GrantKind; category?: string; number?: string; validUntil?: string; entries?: string; conditions?: string[] }

/**
 * Does this travel document hold a valid grant of this kind on this date?
 * The answer carries no name or file: the grant's number, category, end
 * date, entries and conditions, or `valid: false`.
 */
export function statusOn(q: { nationality: string; documentNumber: string; kind?: GrantKind; on?: string }): StatusAnswer {
  const on = q.on && DATE.test(q.on) ? q.on : new Date().toISOString().slice(0, 10);
  const k = documentKeyOf(q.nationality, q.documentNumber);
  const hit = db().grants.find(x => x.documentKey === k && (!q.kind || x.kind === q.kind) && (x.state === 'issued' || x.state === 'active') && (x.validFrom ?? '') <= on && (!x.validUntil || x.validUntil >= on));
  return hit ? { valid: true, kind: hit.kind, category: hit.category, number: hit.number, ...(hit.validUntil ? { validUntil: hit.validUntil } : {}), ...(hit.entries ? { entries: hit.entries } : {}), conditions: hit.conditions } : { valid: false };
}

/** Counts by kind, category and state (no holder data). */
export function grantCounts(): { kind: GrantKind; category: string; state: GrantState; count: number }[] {
  const m = new Map<string, number>();
  for (const x of db().grants) m.set(`${x.kind}|${x.category}|${x.state}`, (m.get(`${x.kind}|${x.category}|${x.state}`) ?? 0) + 1);
  return [...m].map(([key, count]) => { const [kind, category, state] = key.split('|') as [GrantKind, string, GrantState]; return { kind, category, state, count }; });
}
