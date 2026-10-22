// The land registry's transaction and dispute records (plan step I7;
// Institutional specification Part 3 §C.7; catalogue Part 8 §3.1–3.3,
// LND-REG-005, 007–012, 016, 017, 020–022).
//
// The rights themselves stay on the parcel's own record (lib/data/parcels.ts:
// each right with its stable reference, every change a new version with the
// date it takes effect and the case that authorised it). This register keeps
// what happened around them, the way the specification's core records name
// it: each registered transaction (a transfer, a succession, an interest
// registered, discharged or corrected) with its parties, instrument, case,
// sealed decision, effective date and the parcel versions before and after;
// and each dispute or objection with the interest it holds, its grounds, the
// parties, a referral and its outcome. Both are written only by the effects
// of the land registry's procedures (lib/land/procedures.ts), so every
// change is a step of a case under an approved procedure.
//
// Parties and grounds are personal data: they are returned only by
// viewTransaction() / viewDispute() with `parties: true`, which the route
// decides with canSeeParcelRights() (the cadastre authority and the land
// registry, whole-government administrators and auditors), every such read
// in the access log. Everything else (lists, counts, the twin) carries the
// parcel and the right's reference, never a holder.

import { touch } from '@/lib/data/repo/track';
import type { HolderKind, RightType, SourceKind } from '@/lib/data/parcels';

export type TransactionKind = 'transfer' | 'succession' | 'encumbrance' | 'discharge' | 'correction';
export const TRANSACTION_KINDS: { key: TransactionKind; label: string }[] = [
  { key: 'transfer', label: 'Transfer of a registered interest' }, { key: 'succession', label: 'Registration on succession (inheritance)' },
  { key: 'encumbrance', label: 'Interest registered (lease, mortgage, easement, caveat, restriction)' }, { key: 'discharge', label: 'Interest discharged' },
  { key: 'correction', label: 'Controlled correction of a registered interest' },
];
export type DisputeKind = 'boundary' | 'title' | 'objection' | 'conflicting-title' | 'encumbrance';
export const DISPUTE_KINDS: { key: DisputeKind; label: string }[] = [
  { key: 'boundary', label: 'Boundary dispute' }, { key: 'title', label: 'Dispute over a registered interest' }, { key: 'objection', label: 'Objection to a registration' },
  { key: 'conflicting-title', label: 'Duplicate or conflicting title' }, { key: 'encumbrance', label: 'Dispute over an encumbrance' },
];
export type DisputeOutcome = 'upheld' | 'dismissed' | 'settled' | 'court-order';
export const DISPUTE_OUTCOMES: DisputeOutcome[] = ['upheld', 'dismissed', 'settled', 'court-order'];

/** A party to a transaction as the instrument names it: personal data. */
export interface LandParty { holderKind: HolderKind; holder: string; holderRef?: string; share?: string }
export interface CaseRef { id: string; ref: string }

export interface LandTransaction {
  number: string;
  kind: TransactionKind;
  parcel: { id: string; parcelId: string };
  /** The interest it moved, discharged or corrected, or the one it created (a right's reference, never its holder). */
  interest: string;
  rightType?: RightType;
  /** Personal data: shown only to the keepers of the rights and officials with need. */
  parties: { transferring?: string; receiving: LandParty[] };
  instrument: { kind: SourceKind; ref: string; date?: string };
  case: CaseRef;
  decision?: string;
  /** The date the registration takes effect. */
  effective: string;
  /** The parcel's versions before and after: the prior state is kept, never erased. */
  versions: { before: number; after: number };
  at: string; by: string;
  sample?: true;
}

export interface LandDispute {
  number: string;
  kind: DisputeKind;
  parcel: { id: string; parcelId: string };
  /** What it holds: a right's reference, `boundary` or `parcel`. */
  interest: string;
  /** Personal data: the grounds as stated and who the parties are. */
  grounds: string;
  parties: string;
  case: CaseRef;
  state: 'held' | 'referred' | 'decided' | 'withdrawn';
  held: { at: string; by: string };
  referral?: { to: string; at: string; by: string; reason: string };
  outcome?: { result: DisputeOutcome | 'withdrawn'; reasons: string; decision?: string; at: string; by: string; confirmedBy?: string };
  sample?: true;
}

interface Db { transactions: LandTransaction[]; disputes: LandDispute[]; seq: Record<string, number> }
const g = globalThis as unknown as { __civicosLand?: Db };
const db = (): Db => {
  const d = touch('__civicosLand', g.__civicosLand ??= { transactions: [], disputes: [], seq: {} });
  d.transactions ??= []; d.disputes ??= []; d.seq ??= {};
  return d;
};
export function resetLand(): void { g.__civicosLand = undefined; }

const clone = <T,>(x: T): T => structuredClone(x);
const next = (prefix: string, now: Date) => { const d = db(); d.seq[prefix] = (d.seq[prefix] ?? 0) + 1; return `${prefix}-${now.getUTCFullYear()}-${String(d.seq[prefix]).padStart(6, '0')}`; };

// ── Changes (only from lib/land/procedures.ts) ────────────────────────────────

export function recordTransaction(input: Omit<LandTransaction, 'number' | 'at' | 'sample'> & { sample?: boolean }, now = new Date()): LandTransaction {
  const { sample, ...rest } = input;
  const t: LandTransaction = { ...clone(rest), number: next('LTR', now), at: now.toISOString(), ...(sample ? { sample: true as const } : {}) };
  db().transactions.push(t);
  return clone(t);
}

export function openDispute(input: Omit<LandDispute, 'number' | 'state' | 'held' | 'sample'> & { by: string; sample?: boolean }, now = new Date()): LandDispute {
  const { sample, by, ...rest } = input;
  const existing = db().disputes.find(x => x.case.id === input.case.id);
  if (existing) return clone(existing);
  const d: LandDispute = { ...clone(rest), number: next('LDS', now), state: 'held', held: { at: now.toISOString(), by }, ...(sample ? { sample: true as const } : {}) };
  db().disputes.push(d);
  return clone(d);
}

export function referDispute(caseId: string, referral: { to: string; by: string; reason: string }, now = new Date()): LandDispute | { error: string } {
  const d = db().disputes.find(x => x.case.id === caseId);
  if (!d) return { error: 'No dispute is recorded for this case' };
  if (d.state !== 'held') return { error: `The dispute is already ${d.state}` };
  d.state = 'referred';
  d.referral = { ...referral, at: now.toISOString() };
  return clone(d);
}

export function decideDispute(caseId: string, outcome: Omit<NonNullable<LandDispute['outcome']>, 'at'>, now = new Date()): LandDispute | { error: string } {
  const d = db().disputes.find(x => x.case.id === caseId);
  if (!d) return { error: 'No dispute is recorded for this case' };
  if (d.state === 'decided' || d.state === 'withdrawn') return { error: `The dispute is already ${d.state}` };
  d.state = outcome.result === 'withdrawn' ? 'withdrawn' : 'decided';
  d.outcome = { ...outcome, at: now.toISOString() };
  return clone(d);
}

// ── Reads ─────────────────────────────────────────────────────────────────────

const PARCEL = (p: string) => (x: { parcel: { id: string; parcelId: string } }) => x.parcel.id === p || x.parcel.parcelId.toUpperCase() === p.toUpperCase();
export const transactionsOf = (parcel: string): LandTransaction[] => db().transactions.filter(PARCEL(parcel)).map(clone);
export const disputesOf = (parcel: string): LandDispute[] => db().disputes.filter(PARCEL(parcel)).map(clone);
export const transactionOfCase = (caseId: string): LandTransaction | undefined => { const t = db().transactions.find(x => x.case.id === caseId); return t ? clone(t) : undefined; };
export const disputeOfCase = (caseId: string): LandDispute | undefined => { const d = db().disputes.find(x => x.case.id === caseId); return d ? clone(d) : undefined; };
export const openDisputes = (): LandDispute[] => db().disputes.filter(d => d.state === 'held' || d.state === 'referred').map(clone);

/** A transaction as an official sees it: the parties and the instrument's reference (a title or deed number names its holder) only with need. */
export type TransactionView = Omit<LandTransaction, 'parties' | 'instrument'> & { parties?: LandTransaction['parties']; instrument: Omit<LandTransaction['instrument'], 'ref'> & { ref?: string }; partiesHidden: boolean; receivingCount: number };
export function viewTransaction(t: LandTransaction, viewer: { parties: boolean }): TransactionView {
  const { parties, instrument, ...rest } = clone(t);
  const { ref, ...kind } = instrument;
  return { ...rest, instrument: viewer.parties ? { ...kind, ref } : kind, receivingCount: parties.receiving.length, partiesHidden: !viewer.parties, ...(viewer.parties ? { parties } : {}) };
}
/** A dispute as an official sees it: the grounds and parties only with need. */
export type DisputeView = Omit<LandDispute, 'grounds' | 'parties'> & { grounds?: string; parties?: string; detailHidden: boolean };
export function viewDispute(d: LandDispute, viewer: { parties: boolean }): DisputeView {
  const { grounds, parties, ...rest } = clone(d);
  return { ...rest, detailHidden: !viewer.parties, ...(viewer.parties ? { grounds, parties } : {}) };
}

/** Counts for the console, onboarding and indicators (no personal data). */
export function landCounts(): { transactions: number; byKind: Record<string, number>; disputes: number; held: number; referred: number; decided: number; samples: number } {
  const d = db();
  const byKind: Record<string, number> = {};
  for (const t of d.transactions) byKind[t.kind] = (byKind[t.kind] ?? 0) + 1;
  return {
    transactions: d.transactions.length, byKind, disputes: d.disputes.length,
    held: d.disputes.filter(x => x.state === 'held').length, referred: d.disputes.filter(x => x.state === 'referred').length,
    decided: d.disputes.filter(x => x.state === 'decided' || x.state === 'withdrawn').length,
    samples: [...d.transactions, ...d.disputes].filter(x => x.sample).length,
  };
}
/** The latest transactions and open disputes across the register (for the console list; parties never). */
export function recentLand(limit = 50): { transactions: LandTransaction[]; disputes: LandDispute[] } {
  const d = db();
  return { transactions: d.transactions.slice(-limit).reverse().map(clone), disputes: d.disputes.slice(-limit).reverse().map(clone) };
}
