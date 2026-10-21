// The legislature's own record (docs/CONSTITUTIONAL_ARCHITECTURE.md §2.3,
// §6.2; plan phase 7; audit J). Kept by the clerk as custodian for the
// institution the nation named for the `legislature` authority: bills with
// every version of their text, the stages they pass through, amendments,
// recorded votes (counts and, where the standing orders say, names),
// committee referrals and reports, passage, assent (by the head of state's
// office where one is named), commencement, publication and the clerk's
// certification of the record.
//
// Who writes it: only officials of the legislature (lib/auth/roles.ts
// legislativeRecordRefusal()); never an official serving the whole
// government, never a ministry. A recorded vote or a journal entry is never
// rewritten: a correction is proposed by one official of the legislature
// and confirmed by a different one who can sign there, and the previous
// version stays with the entry.
//
// The stages, how votes are counted and named, whether assent is needed and
// what the public sees come from the nation's legislative procedure: drafted
// by one official of the legislature (from the reference shipped here, which
// is never approved by the platform), approved by a different one who can
// sign there, every version kept. No bill is introduced until a procedure is
// approved, in any installation.
//
// On publication the enacted text enters the laws register from this record
// (transmitToLaws()): recorded by the clerk with its provenance (bill, text
// version, votes, assent, publication, certification) and confirmed by a
// different official of the law-register authority, as every law is. The
// text is the bill's, never retyped.

import { sha256Hex } from '@/lib/audit/sha256';
import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { withDefaults } from '@/lib/data/defaults';
import { uuid7 } from '@/lib/data/uuid7';
import { dualControlRefusal, dualControlPendingHours } from '@/lib/data/dual-control';
import { authorityFor, getSovereign } from '@/lib/data/store/sovereign';
import { getMinistry } from '@/lib/data/store/ministries';
import { legislativeRecordRefusal, assentRefusal, type Scope } from '@/lib/auth/roles';
import { checkProvisions, canonicalDigest, recordVersion, getInstrument, INSTRUMENT_TYPES, type Provision, type InstrumentType, type Citation, type LegislativeSource } from '@/lib/law/register';
import { citeBasis } from '@/lib/law/policy-change';

// ── The nation's legislative procedure ─────────────────────────────────────

export type StageKind = 'introduction' | 'reading' | 'committee' | 'report' | 'consideration' | 'vote' | 'other';
export const STAGE_KINDS: StageKind[] = ['introduction', 'reading', 'committee', 'report', 'consideration', 'vote', 'other'];
export interface LegislativeStage {
  key: string;
  label: string;
  kind: StageKind;
  /** The chamber this stage happens in (a name from the procedure's chambers). */
  chamber?: string;
  /** A vote on the bill is taken at this stage: the bill moves on only once it is carried. */
  vote?: boolean;
  /** The standing orders let a bill pass over this stage. */
  optional?: boolean;
}
export type Majority = 'simple' | 'absolute' | 'two-thirds-voting' | 'two-thirds-members';
export const MAJORITIES: { key: Majority; label: string }[] = [
  { key: 'simple', label: 'More yes than no' },
  { key: 'absolute', label: 'More than half of all members' },
  { key: 'two-thirds-voting', label: 'Two thirds of those voting yes or no' },
  { key: 'two-thirds-members', label: 'Two thirds of all members' },
];
export interface VoteRules {
  /** Whether members' names are recorded with a vote: always, only on a division, or never. */
  names: 'always' | 'on-division' | 'never';
  majority: Majority;
  /** Members who must take part (yes, no or abstain) for a vote to count. */
  quorum?: number;
  /** Seats in the chamber (needed for majorities of all members). */
  membership?: number;
}
export interface LegislativeProcedure {
  version: number;
  title: string;
  chambers: string[];
  stages: LegislativeStage[];
  votes: VoteRules;
  /** Whether a passed bill needs assent before it is enacted. */
  assent: { required: boolean };
  /** What the public sees: bills from which point, and votes with names, counts only or not at all. */
  publicRecord: { bills: 'introduced' | 'passed' | 'enacted' | 'none'; votes: 'names' | 'counts' | 'none' };
  /** The standing orders (or law) it rests on, cited from the laws register. */
  basis: Citation[];
  state: 'reference' | 'draft' | 'approved' | 'superseded' | 'withdrawn';
  /** Drafted from the reference shipped with the platform. */
  fromReference?: boolean;
  author: string; authorId?: string; createdAt: string;
  approvedBy?: string; approvedById?: string; approvedAt?: string; activeFrom?: string;
  withdrawn?: { by: string; at: string; reason: string };
}

/**
 * The reference shipped with the platform: a starting point, never the
 * nation's procedure. It cannot be approved as it stands; an official of the
 * legislature drafts the nation's version from it (and changes what its
 * standing orders say differently), a different one approves that.
 */
export const REFERENCE_PROCEDURE: LegislativeProcedure = {
  version: 0, title: 'Reference legislative procedure (not approved; adapt to the standing orders)', chambers: ['Chamber'],
  stages: [
    { key: 'introduced', label: 'Introduction and first reading', kind: 'introduction' },
    { key: 'second-reading', label: 'Second reading', kind: 'reading', vote: true },
    { key: 'committee', label: 'Committee stage', kind: 'committee' },
    { key: 'report', label: 'Report stage', kind: 'report', optional: true },
    { key: 'third-reading', label: 'Third reading', kind: 'vote', vote: true },
  ],
  votes: { names: 'on-division', majority: 'simple' },
  assent: { required: true },
  publicRecord: { bills: 'introduced', votes: 'names' },
  basis: [], state: 'reference', author: 'CivicOS (reference)', createdAt: '2026-10-21T00:00:00.000Z',
};

// ── Bills ───────────────────────────────────────────────────────────────────

export type BillState = 'in-progress' | 'passed' | 'assented' | 'assent-withheld' | 'published' | 'withdrawn' | 'lapsed' | 'defeated';
export const BILL_STATES: { key: BillState; label: string }[] = [
  { key: 'in-progress', label: 'Before the chamber' }, { key: 'passed', label: 'Passed' }, { key: 'assented', label: 'Assented' },
  { key: 'assent-withheld', label: 'Assent withheld' }, { key: 'published', label: 'Published as law' }, { key: 'withdrawn', label: 'Withdrawn' },
  { key: 'lapsed', label: 'Lapsed' }, { key: 'defeated', label: 'Defeated' },
];
export const billStateLabel = (k: BillState) => BILL_STATES.find(s => s.key === k)?.label ?? k;

export interface BillText { n: number; label: string; provisions: Provision[]; digest: string; date: string; stage: string; amendments?: string[]; by: string; byId?: string; at: string }
export type JournalKind = 'introduced' | 'stage' | 'text' | 'referral' | 'report' | 'amendment' | 'amendment-decided' | 'vote' | 'passed' | 'assent' | 'commencement' | 'publication' | 'certification' | 'transmitted' | 'closed' | 'correction';
interface Kept<T> { values: T; correction: string; at: string }
export interface JournalEntry { id: string; kind: JournalKind; date: string; stage?: string; text: string; ref?: string; by: string; byId?: string; at: string; history?: Kept<{ date: string; text: string }>[] }
export type VoteResult = 'carried' | 'negatived' | 'inquorate';
export interface MemberVote { name: string; vote: 'yes' | 'no' | 'abstain' }
export interface RecordedVote {
  id: string; stage: string; question: string; on: 'bill' | 'amendment'; amendment?: string; date: string;
  yes: number; no: number; abstain: number; division?: boolean; names?: MemberVote[];
  result: VoteResult; rule: string; procedureVersion: number;
  by: string; byId?: string; at: string;
  history?: Kept<Pick<RecordedVote, 'question' | 'date' | 'yes' | 'no' | 'abstain' | 'names' | 'result'>>[];
}
export interface Amendment { id: string; number: string; stage: string; proposer?: string; text: string; outcome: 'pending' | 'agreed' | 'negatived' | 'withdrawn'; vote?: string; date: string; decidedOn?: string; by: string; at: string }
export interface CommitteeReferral { id: string; committee: string; date: string; stage: string; by: string; at: string }
export type Recommendation = 'proceed' | 'proceed-with-amendments' | 'not-proceed' | 'no-recommendation';
export const RECOMMENDATIONS: { key: Recommendation; label: string }[] = [
  { key: 'proceed', label: 'Proceed' }, { key: 'proceed-with-amendments', label: 'Proceed with amendments' },
  { key: 'not-proceed', label: 'Do not proceed' }, { key: 'no-recommendation', label: 'No recommendation' },
];
export interface CommitteeReport { id: string; committee: string; date: string; recommendation: Recommendation; summary: string; reference?: string; by: string; at: string }
export interface Assent { outcome: 'assented' | 'withheld'; date: string; by: string; byId?: string; institution?: string; communicated?: boolean; reference?: string; note?: string; at: string }
export interface Certification { digest: string; textVersion: number; by: string; byId?: string; at: string }
export interface Correction {
  id: string; target: { kind: 'vote' | 'journal'; id: string }; values: Record<string, unknown>; reason: string;
  by: string; byId?: string; at: string; state: 'waiting' | 'confirmed' | 'withdrawn' | 'lapsed';
  confirmedBy?: string; confirmedById?: string; confirmedAt?: string; withdrawnBy?: string;
}
export interface Bill {
  id: string; number: string; title: string; instrumentType: InstrumentType; language: string;
  sponsor?: string; chamber?: string; summary?: string;
  /** An instrument already in the laws register that this bill gives a new version of (an amending or consolidating bill). */
  lawInstrument?: string;
  /** The approved procedure the bill was introduced under; it keeps it. */
  procedureVersion: number;
  stage: string; state: BillState;
  texts: BillText[]; journal: JournalEntry[]; votes: RecordedVote[]; amendments: Amendment[];
  referrals: CommitteeReferral[]; reports: CommitteeReport[];
  passed?: { date: string; textVersion: number; by: string; at: string };
  assent?: Assent;
  commencement?: { inForce: string; note?: string; by: string; at: string };
  publication?: { date: string; reference: string; actNumber: string; by: string; at: string };
  closed?: { outcome: 'withdrawn' | 'lapsed' | 'defeated'; date: string; reason: string; by: string; at: string };
  certifications: Certification[];
  corrections: Correction[];
  law?: { instrument: string; version: string; by: string; at: string }[];
  createdAt: string;
}

// ── The store ───────────────────────────────────────────────────────────────

type LegislatureDb = { procedures: LegislativeProcedure[]; bills: Bill[]; seq: Record<string, number> };
const seed = (): LegislatureDb => ({ procedures: [], bills: [], seq: {} });
const g = globalThis as unknown as { __civicosLegislature?: LegislatureDb };
const db = (): LegislatureDb => touch('__civicosLegislature', g.__civicosLegislature = withDefaults(g.__civicosLegislature ??= seed(), seed(), { opaque: ['seq'] }));
export function resetLegislature(): void { g.__civicosLegislature = undefined; }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const KEY = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const today = (now: Date) => now.toISOString().slice(0, 10);
const clone = <T,>(x: T): T => structuredClone(x);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const AUDIT = 'legislature';

/** Who acts: the verified official's scope (null only where sign-in is not enforced: declared names). */
export interface LegislativeActor { by: string; byId?: string; scope: Scope | null }

/** The institution keeping the record: the one named for the legislature. */
export const legislatureId = (): string | undefined => authorityFor('legislature');
export const legislatureName = (): string | undefined => { const id = legislatureId(); return id ? getMinistry(id)?.name ?? id : undefined; };

function refusal(a: LegislativeActor, level: 'record' | 'sign'): string | null {
  const id = legislatureId();
  if (!a.scope) return id ? null : 'Name the legislature under Who is responsible first: its record is kept by its own officials';
  return legislativeRecordRefusal(a.scope, id, level);
}
const audit = (a: LegislativeActor, action: string, target: string, detail: string) => recordAudit(a.by, `${AUDIT}.${action}`, target, 'ok', detail);

// ── Procedure ───────────────────────────────────────────────────────────────

/** Check a procedure's structure (stages, vote rules, what the public sees). */
export function checkProcedure(p: Partial<LegislativeProcedure>): string | null {
  if (!str(p.title, 200)) return 'Give the procedure a title (e.g. the standing orders it follows)';
  const chambers = p.chambers ?? [];
  if (!Array.isArray(chambers) || !chambers.length || chambers.length > 4 || chambers.some(c => typeof c !== 'string' || !c.trim())) return 'Name the chamber or chambers (one to four)';
  const stages = p.stages ?? [];
  if (!Array.isArray(stages) || stages.length < 2 || stages.length > 40) return 'A legislative procedure has at least two stages (and at most forty)';
  const keys = new Set<string>();
  for (const s of stages) {
    if (!s || typeof s.key !== 'string' || !KEY.test(s.key) || keys.has(s.key)) return 'Stage keys are distinct lowercase words joined by dashes (e.g. second-reading)';
    keys.add(s.key);
    if (!str(s.label, 120)) return `Stage ${s.key}: give its name as the standing orders use it`;
    if (!STAGE_KINDS.includes(s.kind)) return `Stage ${s.key}: its kind is one of ${STAGE_KINDS.join(', ')}`;
    if (s.chamber !== undefined && !chambers.includes(s.chamber)) return `Stage ${s.key}: its chamber must be one of the chambers named`;
  }
  if (stages[0]!.optional) return 'The first stage (introduction) cannot be passed over';
  if (stages.at(-1)!.optional) return 'The last stage cannot be passed over';
  const v = p.votes;
  if (!v || !['always', 'on-division', 'never'].includes(v.names)) return 'Say whether members\' names are recorded with votes: always, on-division or never';
  if (!MAJORITIES.some(m => m.key === v.majority)) return `The majority is one of ${MAJORITIES.map(m => m.key).join(', ')}`;
  for (const k of ['quorum', 'membership'] as const) if (v[k] !== undefined && (!Number.isInteger(v[k]) || v[k]! < 1 || v[k]! > 10_000)) return `The ${k} is a whole number of members`;
  if ((v.majority === 'absolute' || v.majority === 'two-thirds-members') && !v.membership) return 'A majority of all members needs the number of seats (membership)';
  if (typeof p.assent?.required !== 'boolean') return 'Say whether a passed bill needs assent (assent.required: true or false)';
  const pub = p.publicRecord;
  if (!pub || !['introduced', 'passed', 'enacted', 'none'].includes(pub.bills) || !['names', 'counts', 'none'].includes(pub.votes)) return 'Say what the public sees: bills (introduced, passed, enacted or none) and votes (names, counts or none)';
  if (pub.votes === 'names' && v.names === 'never') return 'Votes cannot be published with names when names are never recorded';
  return null;
}

function cleanProcedure(input: Partial<LegislativeProcedure>): Omit<LegislativeProcedure, 'version' | 'state' | 'author' | 'createdAt' | 'basis'> {
  const v = input.votes!;
  return {
    title: str(input.title, 200), chambers: input.chambers!.map(c => c.trim().slice(0, 120)),
    stages: input.stages!.map(s => ({ key: s.key, label: str(s.label, 120), kind: s.kind, ...(s.chamber ? { chamber: s.chamber } : {}), ...(s.vote ? { vote: true } : {}), ...(s.optional ? { optional: true } : {}) })),
    votes: { names: v.names, majority: v.majority, ...(v.quorum ? { quorum: v.quorum } : {}), ...(v.membership ? { membership: v.membership } : {}) },
    assent: { required: input.assent!.required }, publicRecord: { bills: input.publicRecord!.bills, votes: input.publicRecord!.votes },
  };
}

/** The nation's procedure versions, newest first, after the reference (which is never approved). */
export function listProcedures(): LegislativeProcedure[] {
  return [clone(REFERENCE_PROCEDURE), ...db().procedures.map(clone).sort((a, b) => b.version - a.version)];
}
export const getProcedure = (version: number): LegislativeProcedure | undefined =>
  version === 0 ? clone(REFERENCE_PROCEDURE) : (() => { const p = db().procedures.find(x => x.version === version); return p ? clone(p) : undefined; })();

/** The approved procedure in force on a date (none: no bill can be introduced). */
export function activeProcedure(on = today(new Date())): LegislativeProcedure | undefined {
  const live = db().procedures.filter(p => p.state === 'approved' && (p.activeFrom ?? '') <= on).sort((a, b) => b.version - a.version);
  return live[0] ? clone(live[0]) : undefined;
}

/**
 * An official of the legislature drafts the next version of the procedure
 * (from the reference, or changing the one in force), citing the standing
 * orders where the laws register holds them. It applies only once a
 * different official who can sign there approves it.
 */
export function draftProcedure(input: Partial<LegislativeProcedure> & { legalBasis?: unknown; fromReference?: unknown }, a: LegislativeActor, now = new Date()): LegislativeProcedure | { error: string } {
  const why = refusal(a, 'record');
  if (why) return { error: why };
  const base = input.fromReference ? REFERENCE_PROCEDURE : undefined;
  const merged: Partial<LegislativeProcedure> = { ...(base ? clone(base) : {}), ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) };
  if (base && !input.title) merged.title = 'Legislative procedure';
  const problem = checkProcedure(merged);
  if (problem) return { error: problem };
  let basis: Citation[] = [];
  if (Array.isArray(input.legalBasis) && input.legalBasis.length) {
    const c = citeBasis(input.legalBasis, today(now), 'Legislative procedure');
    if ('error' in c) return c;
    basis = c;
  }
  if (db().procedures.some(p => p.state === 'draft')) return { error: 'A draft is waiting for approval: approve or withdraw it first' };
  const version = Math.max(0, ...db().procedures.map(p => p.version)) + 1;
  const p: LegislativeProcedure = { ...cleanProcedure(merged), version, basis, state: 'draft', ...(base ? { fromReference: true } : {}), author: a.by, ...(a.byId ? { authorId: a.byId } : {}), createdAt: now.toISOString() };
  db().procedures.push(p);
  audit(a, 'procedure.draft', `LegislativeProcedure:${version}`, `${p.title} · ${p.stages.length} stages · ${p.votes.majority} majority${base ? ' · from the reference' : ''}`);
  return clone(p);
}

/** A different official who can sign at the legislature approves the draft; it applies from `activeFrom` (default today). */
export function approveProcedure(version: number, a: LegislativeActor, activeFrom?: string, now = new Date()): LegislativeProcedure | { error: string } {
  const why = refusal(a, 'sign');
  if (why) return { error: why };
  const p = db().procedures.find(x => x.version === version);
  if (!p) return { error: version === 0 ? 'The reference is never approved as it stands: draft the nation\'s procedure from it first' : 'No such procedure version' };
  if (p.state !== 'draft') return { error: `This version is already ${p.state}` };
  const same = dualControlRefusal({ by: p.author, byId: p.authorId }, { by: a.by, byId: a.byId });
  if (same) return { error: same };
  const problem = checkProcedure(p);
  if (problem) return { error: problem };
  const from = activeFrom ?? today(now);
  if (!ISO_DATE.test(from)) return { error: 'It applies from a date (YYYY-MM-DD)' };
  for (const q of db().procedures) if (q.state === 'approved' && (q.activeFrom ?? '') <= from) q.state = 'superseded';
  Object.assign(p, { state: 'approved', approvedBy: a.by, ...(a.byId ? { approvedById: a.byId } : {}), approvedAt: now.toISOString(), activeFrom: from });
  audit(a, 'procedure.approve', `LegislativeProcedure:${version}`, `${p.title} · applies from ${from} · drafted by ${p.author}`);
  return clone(p);
}

/** The author or an official of the legislature withdraws a draft (kept, marked). */
export function withdrawProcedure(version: number, reason: string, a: LegislativeActor, now = new Date()): LegislativeProcedure | { error: string } {
  const why = refusal(a, 'record');
  if (why) return { error: why };
  const p = db().procedures.find(x => x.version === version);
  if (!p || p.state !== 'draft') return { error: 'Only a draft waiting for approval is withdrawn' };
  p.state = 'withdrawn';
  p.withdrawn = { by: a.by, at: now.toISOString(), reason: str(reason, 300) || 'Withdrawn' };
  audit(a, 'procedure.withdraw', `LegislativeProcedure:${version}`, p.withdrawn.reason);
  return clone(p);
}

// ── Votes ───────────────────────────────────────────────────────────────────

/** The result of a vote under the procedure's rules (the nation's values; the platform only counts). */
export function voteResult(rules: VoteRules, v: { yes: number; no: number; abstain: number }): { result: VoteResult; rule: string } {
  const present = v.yes + v.no + v.abstain;
  if (rules.quorum && present < rules.quorum) return { result: 'inquorate', rule: `Quorum ${rules.quorum}: ${present} took part` };
  const m = rules.membership ?? 0;
  switch (rules.majority) {
    case 'absolute': return { result: v.yes * 2 > m ? 'carried' : 'negatived', rule: `More than half of ${m} members` };
    case 'two-thirds-voting': return { result: v.yes > 0 && v.yes * 3 >= (v.yes + v.no) * 2 ? 'carried' : 'negatived', rule: 'Two thirds of those voting yes or no' };
    case 'two-thirds-members': return { result: v.yes * 3 >= m * 2 ? 'carried' : 'negatived', rule: `Two thirds of ${m} members` };
    default: return { result: v.yes > v.no ? 'carried' : 'negatived', rule: 'More yes than no' };
  }
}

function checkCounts(rules: VoteRules, x: { yes?: unknown; no?: unknown; abstain?: unknown; names?: unknown; division?: unknown }): { yes: number; no: number; abstain: number; names?: MemberVote[]; division?: boolean } | { error: string } {
  const n = (v: unknown) => (v === undefined ? 0 : Number(v));
  const yes = n(x.yes), no = n(x.no), abstain = n(x.abstain);
  for (const c of [yes, no, abstain]) if (!Number.isInteger(c) || c < 0 || c > 10_000) return { error: 'Counts are whole numbers of members (yes, no, abstain)' };
  if (rules.membership && yes + no + abstain > rules.membership) return { error: `More votes than the ${rules.membership} seats the procedure records` };
  const division = x.division === true;
  let names: MemberVote[] | undefined;
  if (x.names !== undefined && x.names !== null && !(Array.isArray(x.names) && !x.names.length)) {
    if (rules.names === 'never') return { error: 'The standing orders do not record members\' names with votes' };
    if (rules.names === 'on-division' && !division) return { error: 'Names are recorded only on a division: mark the vote as a division' };
    if (!Array.isArray(x.names) || x.names.length > 10_000) return { error: 'Names are a list of { name, vote: yes | no | abstain }' };
    names = [];
    const seen = new Set<string>();
    for (const m of x.names as { name?: unknown; vote?: unknown }[]) {
      const name = str(m?.name, 160);
      if (!name || !['yes', 'no', 'abstain'].includes(m?.vote as string)) return { error: 'Each name needs the member\'s name and vote (yes, no or abstain)' };
      if (seen.has(name.toLowerCase())) return { error: `${name} is listed twice` };
      seen.add(name.toLowerCase());
      names.push({ name, vote: m.vote as MemberVote['vote'] });
    }
    const t = { yes: names.filter(m => m.vote === 'yes').length, no: names.filter(m => m.vote === 'no').length, abstain: names.filter(m => m.vote === 'abstain').length };
    if (t.yes !== yes || t.no !== no || t.abstain !== abstain) return { error: `The names (${t.yes} yes, ${t.no} no, ${t.abstain} abstain) do not match the counts` };
  } else if (rules.names === 'always' || (rules.names === 'on-division' && division)) {
    return { error: 'The standing orders record members\' names with this vote: list them' };
  }
  return { yes, no, abstain, ...(names ? { names } : {}), ...(division ? { division } : {}) };
}

// ── Bills: reading ──────────────────────────────────────────────────────────

const findBill = (id: string) => db().bills.find(b => b.id === id || b.number === id);
export const getBill = (id: string): Bill | undefined => { const b = findBill(id); return b ? clone(b) : undefined; };
export function listBills(filter: { state?: string; q?: string } = {}): Bill[] {
  const q = filter.q?.trim().toLowerCase();
  return db().bills.filter(b => (!filter.state || b.state === filter.state) && (!q || b.title.toLowerCase().includes(q) || b.number.toLowerCase().includes(q)))
    .map(clone).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
const procedureOf = (b: Bill): LegislativeProcedure => getProcedure(b.procedureVersion) ?? REFERENCE_PROCEDURE;
export const stageLabel = (b: Bill, key: string | undefined) => (key ? procedureOf(b).stages.find(s => s.key === key)?.label ?? key : '');
/** The bill is enacted: assented, or passed when the procedure asks no assent (and not yet published). */
const enacted = (b: Bill) => b.state === 'assented' || (b.state === 'passed' && !procedureOf(b).assent.required);

/** The SHA-256 of the authoritative record (texts, journal, votes, amendments, reports, passage, assent, commencement, publication). */
export function recordDigest(b: Bill): string {
  return sha256Hex(JSON.stringify({
    number: b.number, title: b.title, procedure: b.procedureVersion, state: b.state, stage: b.stage,
    texts: b.texts.map(t => [t.n, t.label, t.digest, t.date, t.stage]),
    journal: b.journal.filter(j => j.kind !== 'certification' && j.kind !== 'transmitted').map(j => [j.id, j.kind, j.date, j.stage ?? null, j.text]),
    votes: b.votes.map(v => [v.id, v.stage, v.question, v.date, v.yes, v.no, v.abstain, v.names ?? null, v.result]),
    amendments: b.amendments.map(m => [m.id, m.number, m.text, m.outcome]),
    reports: b.reports.map(r => [r.id, r.committee, r.date, r.recommendation, r.summary]),
    referrals: b.referrals.map(r => [r.id, r.committee, r.date]),
    passed: b.passed ? [b.passed.date, b.passed.textVersion] : null,
    assent: b.assent ? [b.assent.outcome, b.assent.date, b.assent.communicated ?? false] : null,
    commencement: b.commencement?.inForce ?? null, publication: b.publication ? [b.publication.date, b.publication.reference, b.publication.actNumber] : null,
    closed: b.closed ? [b.closed.outcome, b.closed.date] : null,
  }));
}
/** The latest certification, and whether it still covers the record as it stands. */
export function certificationOf(b: Bill): (Certification & { current: boolean }) | null {
  const c = b.certifications.at(-1);
  return c ? { ...c, current: c.digest === recordDigest(b) } : null;
}

// ── Bills: the clerk's record ───────────────────────────────────────────────

function journal(b: Bill, a: LegislativeActor, kind: JournalKind, date: string, text: string, now: Date, ref?: string): JournalEntry {
  const e: JournalEntry = { id: uuid7(now), kind, date, stage: b.stage, text: text.slice(0, 600), ...(ref ? { ref } : {}), by: a.by, ...(a.byId ? { byId: a.byId } : {}), at: now.toISOString() };
  b.journal.push(e);
  return e;
}
const dateOf = (v: unknown, now: Date): string | { error: string } => {
  if (v === undefined || v === '') return today(now);
  return typeof v === 'string' && ISO_DATE.test(v) ? v : { error: 'Dates are YYYY-MM-DD' };
};
function open(id: string, a: LegislativeActor, level: 'record' | 'sign'): Bill | { error: string } {
  const why = refusal(a, level);
  if (why) return { error: why };
  const b = findBill(id);
  return b ?? { error: 'No such bill' };
}
const inProgress = (b: Bill) => (b.state === 'in-progress' ? null : { error: `The bill is ${billStateLabel(b.state).toLowerCase()}: its proceedings are closed` });

export interface IntroduceInput { title?: unknown; number?: unknown; instrumentType?: unknown; language?: unknown; sponsor?: unknown; chamber?: unknown; summary?: unknown; provisions?: unknown; date?: unknown; lawInstrument?: unknown }

/** Introduce a bill under the approved procedure in force: its text as introduced is version 1. */
export function introduceBill(input: IntroduceInput, a: LegislativeActor, now = new Date()): Bill | { error: string } {
  const why = refusal(a, 'record');
  if (why) return { error: why };
  const date = dateOf(input.date, now);
  if (typeof date !== 'string') return date;
  const p = activeProcedure(date);
  if (!p) return { error: 'The legislature has not approved its legislative procedure: draft it (from the reference) and have a different official who can sign approve it' };
  const title = str(input.title, 500);
  if (!title) return { error: 'Give the bill its long title' };
  const type = (input.instrumentType ?? 'act') as InstrumentType;
  if (!INSTRUMENT_TYPES.includes(type)) return { error: `The kind of instrument is one of ${INSTRUMENT_TYPES.join(', ')}` };
  const provisions = checkProvisions(input.provisions);
  if ('error' in provisions) return provisions;
  const language = str(input.language, 20) || 'en';
  if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(language)) return { error: 'Language must be a language code such as en or fr' };
  const chamber = str(input.chamber, 120) || p.chambers[0]!;
  if (!p.chambers.includes(chamber)) return { error: `The chamber is one of ${p.chambers.join(', ')}` };
  let lawInstrument: string | undefined;
  if (input.lawInstrument) {
    lawInstrument = str(input.lawInstrument, 300);
    if (!getInstrument(lawInstrument)) return { error: `No instrument ${lawInstrument} in the laws register` };
  }
  const year = date.slice(0, 4);
  const seq = (db().seq[year] ?? 0) + 1;
  const number = str(input.number, 60) || `Bill ${seq} of ${year}`;
  if (db().bills.some(b => b.number.toLowerCase() === number.toLowerCase())) return { error: `${number} is already recorded` };
  db().seq[year] = seq;
  const by = { by: a.by, ...(a.byId ? { byId: a.byId } : {}), at: now.toISOString() };
  const b: Bill = {
    id: uuid7(now), number, title, instrumentType: type, language,
    ...(str(input.sponsor, 200) ? { sponsor: str(input.sponsor, 200) } : {}), chamber, ...(str(input.summary, 2000) ? { summary: str(input.summary, 2000) } : {}),
    ...(lawInstrument ? { lawInstrument } : {}),
    procedureVersion: p.version, stage: p.stages[0]!.key, state: 'in-progress',
    texts: [{ n: 1, label: 'As introduced', provisions, digest: canonicalDigest(provisions), date, stage: p.stages[0]!.key, ...by }],
    journal: [], votes: [], amendments: [], referrals: [], reports: [], certifications: [], corrections: [], createdAt: now.toISOString(),
  };
  db().bills.push(b);
  journal(b, a, 'introduced', date, `${number} introduced in ${chamber}${b.sponsor ? ` by ${b.sponsor}` : ''}: ${title}`, now);
  audit(a, 'bill.introduce', `Bill:${b.id}`, `${number} · ${title} · procedure version ${p.version}`);
  return clone(b);
}

/** A new version of the text (as amended in committee, as reported, as passed…); earlier versions are kept. */
export function addText(id: string, input: { label?: unknown; provisions?: unknown; date?: unknown; amendments?: unknown }, a: LegislativeActor, now = new Date()): Bill | { error: string } {
  const b = open(id, a, 'record');
  if ('error' in b) return b;
  const closed = inProgress(b);
  if (closed) return closed;
  const date = dateOf(input.date, now);
  if (typeof date !== 'string') return date;
  const label = str(input.label, 120);
  if (!label) return { error: 'Say which version this is (e.g. As amended in committee)' };
  const provisions = checkProvisions(input.provisions);
  if ('error' in provisions) return provisions;
  const amendments = Array.isArray(input.amendments) ? input.amendments.map(x => String(x)) : [];
  for (const m of amendments) if (!b.amendments.some(x => x.id === m && x.outcome === 'agreed')) return { error: 'A new text lists only amendments the chamber agreed' };
  const digest = canonicalDigest(provisions);
  if (digest === b.texts.at(-1)!.digest) return { error: 'This text is the same as the current version' };
  const n = b.texts.length + 1;
  b.texts.push({ n, label, provisions, digest, date, stage: b.stage, ...(amendments.length ? { amendments } : {}), by: a.by, ...(a.byId ? { byId: a.byId } : {}), at: now.toISOString() });
  journal(b, a, 'text', date, `Text version ${n}: ${label}`, now);
  audit(a, 'bill.text', `Bill:${b.id}`, `${b.number} · version ${n} · ${digest.slice(0, 12)}`);
  return clone(b);
}

/**
 * The bill moves to a later stage of the procedure it was introduced under:
 * forward only, passing over only stages the standing orders mark optional,
 * and past a stage with a vote only once a vote on the bill there was carried.
 */
export function recordStage(id: string, input: { stage?: unknown; date?: unknown; note?: unknown }, a: LegislativeActor, now = new Date()): Bill | { error: string } {
  const b = open(id, a, 'record');
  if ('error' in b) return b;
  const closed = inProgress(b);
  if (closed) return closed;
  const date = dateOf(input.date, now);
  if (typeof date !== 'string') return date;
  const p = procedureOf(b);
  const from = p.stages.findIndex(s => s.key === b.stage);
  const to = p.stages.findIndex(s => s.key === input.stage);
  if (to < 0) return { error: `The stages of this bill's procedure are ${p.stages.map(s => s.key).join(', ')}` };
  if (to <= from) return { error: 'A bill moves forward through its stages; a step back is a correction or the chamber\'s own decision recorded in the journal' };
  const skipped = p.stages.slice(from + 1, to).filter(s => !s.optional);
  if (skipped.length) return { error: `The standing orders do not let the bill pass over ${skipped.map(s => s.label).join(', ')}` };
  const here = p.stages[from]!;
  if (here.vote && !b.votes.some(v => v.stage === here.key && v.on === 'bill' && v.result === 'carried')) return { error: `${here.label} ends with a vote on the bill: record it (carried) first` };
  b.stage = p.stages[to]!.key;
  journal(b, a, 'stage', date, `${p.stages[to]!.label}${str(input.note, 300) ? ` — ${str(input.note, 300)}` : ''}`, now);
  audit(a, 'bill.stage', `Bill:${b.id}`, `${b.number} · ${p.stages[to]!.label}`);
  return clone(b);
}

export function referToCommittee(id: string, input: { committee?: unknown; date?: unknown }, a: LegislativeActor, now = new Date()): Bill | { error: string } {
  const b = open(id, a, 'record');
  if ('error' in b) return b;
  const closed = inProgress(b);
  if (closed) return closed;
  const date = dateOf(input.date, now);
  if (typeof date !== 'string') return date;
  const committee = str(input.committee, 200);
  if (!committee) return { error: 'Name the committee' };
  b.referrals.push({ id: uuid7(now), committee, date, stage: b.stage, by: a.by, at: now.toISOString() });
  journal(b, a, 'referral', date, `Referred to ${committee}`, now);
  audit(a, 'bill.refer', `Bill:${b.id}`, `${b.number} · ${committee}`);
  return clone(b);
}

export function recordReport(id: string, input: { committee?: unknown; date?: unknown; recommendation?: unknown; summary?: unknown; reference?: unknown }, a: LegislativeActor, now = new Date()): Bill | { error: string } {
  const b = open(id, a, 'record');
  if ('error' in b) return b;
  const closed = inProgress(b);
  if (closed) return closed;
  const date = dateOf(input.date, now);
  if (typeof date !== 'string') return date;
  const committee = str(input.committee, 200);
  if (!b.referrals.some(r => r.committee === committee)) return { error: 'A committee reports on a bill referred to it: record the referral first' };
  if (!RECOMMENDATIONS.some(r => r.key === input.recommendation)) return { error: `The recommendation is one of ${RECOMMENDATIONS.map(r => r.key).join(', ')}` };
  const summary = str(input.summary, 4000);
  if (!summary) return { error: 'Summarise the report' };
  const r: CommitteeReport = { id: uuid7(now), committee, date, recommendation: input.recommendation as Recommendation, summary, ...(str(input.reference, 200) ? { reference: str(input.reference, 200) } : {}), by: a.by, at: now.toISOString() };
  b.reports.push(r);
  journal(b, a, 'report', date, `${committee} reported: ${RECOMMENDATIONS.find(x => x.key === r.recommendation)!.label}`, now, r.id);
  audit(a, 'bill.report', `Bill:${b.id}`, `${b.number} · ${committee} · ${r.recommendation}`);
  return clone(b);
}

export function proposeAmendment(id: string, input: { number?: unknown; proposer?: unknown; text?: unknown; date?: unknown }, a: LegislativeActor, now = new Date()): Bill | { error: string } {
  const b = open(id, a, 'record');
  if ('error' in b) return b;
  const closed = inProgress(b);
  if (closed) return closed;
  const date = dateOf(input.date, now);
  if (typeof date !== 'string') return date;
  const text = str(input.text, 20_000);
  if (!text) return { error: 'Give the amendment\'s text' };
  const number = str(input.number, 40) || String(b.amendments.length + 1);
  if (b.amendments.some(m => m.number === number)) return { error: `Amendment ${number} is already recorded on this bill` };
  const m: Amendment = { id: uuid7(now), number, stage: b.stage, ...(str(input.proposer, 200) ? { proposer: str(input.proposer, 200) } : {}), text, outcome: 'pending', date, by: a.by, at: now.toISOString() };
  b.amendments.push(m);
  journal(b, a, 'amendment', date, `Amendment ${number} moved${m.proposer ? ` by ${m.proposer}` : ''}`, now, m.id);
  audit(a, 'bill.amendment', `Bill:${b.id}`, `${b.number} · amendment ${number}`);
  return clone(b);
}

/** Record how the chamber decided an amendment: agreed, negatived or withdrawn; when by a recorded vote, as that vote went. */
export function decideAmendment(id: string, input: { amendment?: unknown; outcome?: unknown; vote?: unknown; date?: unknown }, a: LegislativeActor, now = new Date()): Bill | { error: string } {
  const b = open(id, a, 'record');
  if ('error' in b) return b;
  const closed = inProgress(b);
  if (closed) return closed;
  const date = dateOf(input.date, now);
  if (typeof date !== 'string') return date;
  const m = b.amendments.find(x => x.id === input.amendment || x.number === input.amendment);
  if (!m) return { error: 'No such amendment on this bill' };
  if (m.outcome !== 'pending') return { error: `Amendment ${m.number} is already ${m.outcome}` };
  if (!['agreed', 'negatived', 'withdrawn'].includes(input.outcome as string)) return { error: 'The outcome is agreed, negatived or withdrawn' };
  if (input.vote) {
    const v = b.votes.find(x => x.id === input.vote);
    if (!v || v.on !== 'amendment' || v.amendment !== m.id) return { error: 'That vote was not on this amendment' };
    if ((v.result === 'carried') !== (input.outcome === 'agreed')) return { error: `The vote was ${v.result}: the outcome follows it` };
    m.vote = v.id;
  }
  m.outcome = input.outcome as Amendment['outcome'];
  m.decidedOn = date;
  journal(b, a, 'amendment-decided', date, `Amendment ${m.number} ${m.outcome}`, now, m.id);
  audit(a, 'bill.amendment.decide', `Bill:${b.id}`, `${b.number} · amendment ${m.number} · ${m.outcome}`);
  return clone(b);
}

/**
 * Record a vote at the bill's current stage, as the chair declared it:
 * counts, and members' names where the standing orders record them. The
 * result follows the procedure's majority and quorum. The clerk (an official
 * who can sign at the legislature) records it; it is never rewritten, only
 * corrected through the chamber's process.
 */
export function recordVote(id: string, input: { question?: unknown; on?: unknown; amendment?: unknown; date?: unknown; yes?: unknown; no?: unknown; abstain?: unknown; division?: unknown; names?: unknown }, a: LegislativeActor, now = new Date()): Bill | { error: string } {
  const b = open(id, a, 'sign');
  if ('error' in b) return b;
  const closed = inProgress(b);
  if (closed) return closed;
  const date = dateOf(input.date, now);
  if (typeof date !== 'string') return date;
  const p = procedureOf(b);
  const on = input.on === 'amendment' ? 'amendment' : 'bill';
  let amendment: string | undefined;
  if (on === 'amendment') {
    const m = b.amendments.find(x => x.id === input.amendment || x.number === input.amendment);
    if (!m || m.outcome !== 'pending') return { error: 'A vote on an amendment names a pending amendment of this bill' };
    amendment = m.id;
  } else if (!p.stages.find(s => s.key === b.stage)?.vote) return { error: `The standing orders take no vote on the bill at ${stageLabel(b, b.stage)}` };
  const counts = checkCounts(p.votes, input);
  if ('error' in counts) return counts;
  const question = str(input.question, 500) || (on === 'bill' ? `That the bill be read: ${stageLabel(b, b.stage)}` : `That amendment ${b.amendments.find(m => m.id === amendment)!.number} be agreed`);
  const r = voteResult(p.votes, counts);
  const v: RecordedVote = { id: uuid7(now), stage: b.stage, question, on, ...(amendment ? { amendment } : {}), date, ...counts, ...r, procedureVersion: p.version, by: a.by, ...(a.byId ? { byId: a.byId } : {}), at: now.toISOString() };
  b.votes.push(v);
  journal(b, a, 'vote', date, `${question}: ${counts.yes} yes, ${counts.no} no, ${counts.abstain} abstained — ${r.result}`, now, v.id);
  audit(a, 'bill.vote', `Bill:${b.id}`, `${b.number} · ${stageLabel(b, b.stage)} · ${counts.yes}/${counts.no}/${counts.abstain} · ${r.result}`);
  return clone(b);
}

/** The bill has passed: at the last stage, its vote there carried; the latest text is the text as passed. */
export function passBill(id: string, input: { date?: unknown }, a: LegislativeActor, now = new Date()): Bill | { error: string } {
  const b = open(id, a, 'sign');
  if ('error' in b) return b;
  const closed = inProgress(b);
  if (closed) return closed;
  const date = dateOf(input.date, now);
  if (typeof date !== 'string') return date;
  const p = procedureOf(b);
  const last = p.stages.at(-1)!;
  if (b.stage !== last.key) return { error: `A bill passes at its last stage (${last.label})` };
  if (last.vote && !b.votes.some(v => v.stage === last.key && v.on === 'bill' && v.result === 'carried')) return { error: `${last.label} ends with a vote on the bill: record it (carried) first` };
  const pending = b.amendments.filter(m => m.outcome === 'pending');
  if (pending.length) return { error: `Amendments still pending: ${pending.map(m => m.number).join(', ')}` };
  const text = b.texts.at(-1)!;
  b.state = 'passed';
  b.passed = { date, textVersion: text.n, by: a.by, at: now.toISOString() };
  journal(b, a, 'passed', date, `Passed (text version ${text.n}: ${text.label})${p.assent.required ? '; awaiting assent' : ''}`, now);
  audit(a, 'bill.pass', `Bill:${b.id}`, `${b.number} · text version ${text.n} · ${text.digest.slice(0, 12)}`);
  return clone(b);
}

/**
 * Assent to a passed bill, or that it was withheld, where the procedure asks
 * for assent: recorded by an official who can sign at the head of state's
 * office; where the nation names none, by the clerk as communicated to the
 * chamber (marked so).
 */
export function recordAssent(id: string, input: { outcome?: unknown; date?: unknown; reference?: unknown; note?: unknown }, a: LegislativeActor, now = new Date()): Bill | { error: string } {
  const head = authorityFor('headOfState');
  const why = a.scope ? assentRefusal(a.scope, head, legislatureId()) : (legislatureId() ? null : 'Name the legislature under Who is responsible first');
  if (why) return { error: why };
  const b = findBill(id);
  if (!b) return { error: 'No such bill' };
  if (!procedureOf(b).assent.required) return { error: 'This bill\'s procedure asks no assent: it is enacted when passed' };
  if (b.state !== 'passed') return { error: b.assent ? `Assent is already recorded (${b.assent.outcome})` : 'Assent is recorded once the bill has passed' };
  const date = dateOf(input.date, now);
  if (typeof date !== 'string') return date;
  if (date < b.passed!.date) return { error: 'Assent cannot come before passage' };
  if (input.outcome !== 'assented' && input.outcome !== 'withheld') return { error: 'The outcome is assented or withheld' };
  const communicated = !head;
  b.assent = { outcome: input.outcome, date, by: a.by, ...(a.byId ? { byId: a.byId } : {}), ...(head ? { institution: head } : {}), ...(communicated ? { communicated: true } : {}),
    ...(str(input.reference, 200) ? { reference: str(input.reference, 200) } : {}), ...(str(input.note, 500) ? { note: str(input.note, 500) } : {}), at: now.toISOString() };
  b.state = input.outcome === 'assented' ? 'assented' : 'assent-withheld';
  journal(b, a, 'assent', date, `Assent ${input.outcome === 'assented' ? 'given' : 'withheld'}${communicated ? ' (as communicated to the chamber)' : ''}`, now);
  audit(a, 'bill.assent', `Bill:${b.id}`, `${b.number} · ${input.outcome}${communicated ? ' · communicated' : ` · ${getMinistry(head!)?.name ?? head}`}`);
  return clone(b);
}

/** When the enacted text comes into force (from the act itself or a commencement instrument). */
export function recordCommencement(id: string, input: { inForce?: unknown; note?: unknown }, a: LegislativeActor, now = new Date()): Bill | { error: string } {
  const b = open(id, a, 'sign');
  if ('error' in b) return b;
  if (!enacted(b) && b.state !== 'published') return { error: 'Commencement is recorded for an enacted bill (passed, and assented where assent is needed)' };
  if (typeof input.inForce !== 'string' || !ISO_DATE.test(input.inForce)) return { error: 'Say from which date it is in force (YYYY-MM-DD)' };
  if (b.commencement) return { error: `Commencement is already recorded (${b.commencement.inForce}); a change is a correction through the chamber's process` };
  b.commencement = { inForce: input.inForce, ...(str(input.note, 500) ? { note: str(input.note, 500) } : {}), by: a.by, at: now.toISOString() };
  journal(b, a, 'commencement', today(now), `In force from ${input.inForce}${b.commencement.note ? ` — ${b.commencement.note}` : ''}`, now);
  audit(a, 'bill.commence', `Bill:${b.id}`, `${b.number} · in force ${input.inForce}`);
  return clone(b);
}

/** Publication of the enacted text (gazette or official journal reference) and the number it carries as law. */
export function publishBill(id: string, input: { date?: unknown; reference?: unknown; actNumber?: unknown }, a: LegislativeActor, now = new Date()): Bill | { error: string } {
  const b = open(id, a, 'sign');
  if ('error' in b) return b;
  if (!enacted(b)) return { error: b.state === 'published' ? 'Already published' : 'Only an enacted bill is published as law (passed, and assented where assent is needed)' };
  const date = dateOf(input.date, now);
  if (typeof date !== 'string') return date;
  const reference = str(input.reference, 200);
  if (!reference) return { error: 'Give the publication reference (gazette or official journal)' };
  const actNumber = str(input.actNumber, 40);
  if (!actNumber || !/^[A-Za-z0-9.-]+$/.test(actNumber)) return { error: 'Give the number the act carries (letters, digits, dots and dashes)' };
  b.publication = { date, reference, actNumber, by: a.by, at: now.toISOString() };
  b.state = 'published';
  journal(b, a, 'publication', date, `Published as act ${actNumber} (${reference})`, now);
  audit(a, 'bill.publish', `Bill:${b.id}`, `${b.number} · act ${actNumber} · ${reference}`);
  return clone(b);
}

/** Withdrawn by its sponsor, lapsed with the session, or defeated: the record stays. */
export function closeBill(id: string, input: { outcome?: unknown; date?: unknown; reason?: unknown }, a: LegislativeActor, now = new Date()): Bill | { error: string } {
  const b = open(id, a, 'sign');
  if ('error' in b) return b;
  const closed = inProgress(b);
  if (closed) return closed;
  if (!['withdrawn', 'lapsed', 'defeated'].includes(input.outcome as string)) return { error: 'The outcome is withdrawn, lapsed or defeated' };
  const date = dateOf(input.date, now);
  if (typeof date !== 'string') return date;
  const reason = str(input.reason, 500);
  if (!reason) return { error: 'Say why (the chamber\'s decision or the rule that applies)' };
  b.closed = { outcome: input.outcome as 'withdrawn' | 'lapsed' | 'defeated', date, reason, by: a.by, at: now.toISOString() };
  b.state = b.closed.outcome;
  journal(b, a, 'closed', date, `${billStateLabel(b.state)}: ${reason}`, now);
  audit(a, 'bill.close', `Bill:${b.id}`, `${b.number} · ${b.state}`);
  return clone(b);
}

/** The clerk certifies the authoritative record as it stands: its SHA-256 and the text version, by name and time. */
export function certifyBill(id: string, a: LegislativeActor, now = new Date()): Bill | { error: string } {
  const b = open(id, a, 'sign');
  if ('error' in b) return b;
  if (b.corrections.some(c => c.state === 'waiting')) return { error: 'A correction is waiting: confirm or withdraw it before certifying' };
  const digest = recordDigest(b);
  if (certificationOf(b)?.current) return { error: 'The record is already certified as it stands' };
  const textVersion = b.passed?.textVersion ?? b.texts.at(-1)!.n;
  b.certifications.push({ digest, textVersion, by: a.by, ...(a.byId ? { byId: a.byId } : {}), at: now.toISOString() });
  journal(b, a, 'certification', today(now), `Record certified · ${digest.slice(0, 16)}`, now);
  audit(a, 'bill.certify', `Bill:${b.id}`, `${b.number} · ${digest}`);
  return clone(b);
}

/**
 * The enacted text enters the laws register from this record: recorded by
 * the clerk with its provenance, waiting for a different official of the
 * law-register authority to confirm it (lib/law/register.ts confirmVersion()).
 * Needs publication, commencement and a certification of the record as it
 * stands. A version withdrawn from the laws register can be sent again.
 */
export function transmitToLaws(id: string, a: LegislativeActor, now = new Date()): { bill: Bill; instrument: string; version: string } | { error: string } {
  const b = open(id, a, 'sign');
  if ('error' in b) return b;
  if (b.state !== 'published' || !b.publication) return { error: 'The enacted text enters the laws register once it is published' };
  if (!b.commencement) return { error: 'Record when it comes into force (commencement) first' };
  const cert = certificationOf(b);
  if (!cert?.current) return { error: 'Certify the record as it stands first: the laws register receives a certified record' };
  for (const l of b.law ?? []) {
    const v = getInstrument(l.instrument)?.versions.find(x => x.id === l.version);
    if (v && v.state !== 'withdrawn') return { error: `Already in the laws register (${v.state}): ${l.instrument}` };
  }
  const p = procedureOf(b);
  const text = b.texts.find(t => t.n === b.passed!.textVersion)!;
  const leg = legislatureId();
  const source: LegislativeSource = {
    kind: 'legislature', legislature: leg ?? 'legislature', bill: b.id, billNumber: b.number, billVersion: text.n, textDigest: text.digest,
    votes: b.votes.filter(v => v.on === 'bill').map(v => ({ stage: stageLabel(b, v.stage), date: v.date, yes: v.yes, no: v.no, abstain: v.abstain, result: v.result })),
    ...(b.assent ? { assent: { outcome: b.assent.outcome, date: b.assent.date, by: b.assent.by, ...(b.assent.communicated ? { communicated: true } : {}) } } : {}),
    publication: { date: b.publication.date, reference: b.publication.reference },
    certification: { digest: cert.digest, by: cert.by, at: cert.at }, procedureVersion: p.version,
  };
  const dates = { adopted: b.assent?.date ?? b.passed!.date, published: b.publication.date, inForce: b.commencement.inForce };
  const r = recordVersion({
    instrument: b.lawInstrument ? { id: b.lawInstrument } : {
      title: b.title, type: b.instrumentType, jurisdiction: getSovereign().iso3 ?? 'national', year: Number(b.publication.date.slice(0, 4)),
      number: b.publication.actNumber, issuingAuthority: legislatureName() ?? 'Legislature',
    },
    language: b.language, dates, publicationRef: b.publication.reference, provisions: text.provisions, source,
  }, a.by, a.byId, now);
  if ('error' in r) return r;
  (b.law ??= []).push({ instrument: r.instrument.id, version: r.version.id, by: a.by, at: now.toISOString() });
  journal(b, a, 'transmitted', today(now), `Sent to the laws register as ${r.instrument.id} (waiting for the law-register authority to confirm)`, now);
  audit(a, 'bill.transmit', `Bill:${b.id}`, `${b.number} → ${r.instrument.id} · ${r.version.digest.slice(0, 12)}`);
  return { bill: clone(b), instrument: r.instrument.id, version: r.version.id };
}

// ── Corrections through the chamber's process ───────────────────────────────

const lapseCorrections = (b: Bill, now: Date) => {
  const hours = dualControlPendingHours();
  for (const c of b.corrections) if (c.state === 'waiting' && now.getTime() - Date.parse(c.at) > hours * 3600_000) c.state = 'lapsed';
};

/**
 * Propose correcting a recorded vote (question, date, counts, names) or a
 * journal entry (date, text): an official of the legislature, with the
 * reason. Nothing changes until a different official who can sign there
 * confirms it; the previous version stays with the entry.
 */
export function proposeCorrection(id: string, input: { target?: unknown; values?: unknown; reason?: unknown }, a: LegislativeActor, now = new Date()): Bill | { error: string } {
  const b = open(id, a, 'record');
  if ('error' in b) return b;
  lapseCorrections(b, now);
  const t = input.target as { kind?: unknown; id?: unknown } | undefined;
  if (!t || (t.kind !== 'vote' && t.kind !== 'journal')) return { error: 'A correction names a recorded vote or a journal entry: { kind: vote | journal, id }' };
  const reason = str(input.reason, 500);
  if (!reason) return { error: 'Say why the record is corrected (the chamber\'s decision or the error found)' };
  const values = (input.values && typeof input.values === 'object' && !Array.isArray(input.values) ? input.values : {}) as Record<string, unknown>;
  const allowed = t.kind === 'vote' ? ['question', 'date', 'yes', 'no', 'abstain', 'names', 'division'] : ['date', 'text'];
  const keys = Object.keys(values).filter(k => allowed.includes(k));
  if (!keys.length) return { error: `Give the corrected values (${allowed.join(', ')})` };
  if (t.kind === 'vote') {
    const v = b.votes.find(x => x.id === t.id);
    if (!v) return { error: 'No such vote on this bill' };
    const checked = correctedVote(b, v, values);
    if ('error' in checked) return checked;
  } else {
    const j = b.journal.find(x => x.id === t.id);
    if (!j) return { error: 'No such journal entry on this bill' };
    if (['certification', 'transmitted', 'correction'].includes(j.kind)) return { error: 'This entry records the platform\'s own step; it is not corrected' };
    if (values.date !== undefined && (typeof values.date !== 'string' || !ISO_DATE.test(values.date))) return { error: 'Dates are YYYY-MM-DD' };
    if (values.text !== undefined && !str(values.text, 600)) return { error: 'The corrected text is empty' };
  }
  if (b.corrections.some(c => c.state === 'waiting' && c.target.id === t.id)) return { error: 'A correction of this entry is already waiting' };
  b.corrections.push({ id: uuid7(now), target: { kind: t.kind, id: String(t.id) }, values: Object.fromEntries(keys.map(k => [k, values[k]])), reason, by: a.by, ...(a.byId ? { byId: a.byId } : {}), at: now.toISOString(), state: 'waiting' });
  audit(a, 'bill.correction.propose', `Bill:${b.id}`, `${b.number} · ${t.kind} · ${reason.slice(0, 200)}`);
  return clone(b);
}

function correctedVote(b: Bill, v: RecordedVote, values: Record<string, unknown>): Pick<RecordedVote, 'question' | 'date' | 'yes' | 'no' | 'abstain' | 'names' | 'result' | 'rule' | 'division'> | { error: string } {
  const p = getProcedure(v.procedureVersion) ?? procedureOf(b);
  const date = values.date ?? v.date;
  if (typeof date !== 'string' || !ISO_DATE.test(date)) return { error: 'Dates are YYYY-MM-DD' };
  const counts = checkCounts(p.votes, { yes: values.yes ?? v.yes, no: values.no ?? v.no, abstain: values.abstain ?? v.abstain, names: values.names !== undefined ? values.names : v.names, division: values.division ?? v.division });
  if ('error' in counts) return counts;
  const r = voteResult(p.votes, counts);
  // A correction fixes the record; it never reverses a result the bill has already moved on from (that is the chamber's own decision, recorded anew).
  if (r.result !== v.result && (b.state !== 'in-progress' || b.stage !== v.stage || (v.amendment && b.amendments.find(m => m.id === v.amendment)?.outcome !== 'pending'))) {
    return { error: `The corrected counts change the result (${v.result} → ${r.result}) of a vote the bill has moved on from: that is the chamber's own decision, recorded as new proceedings, not a correction` };
  }
  return { question: str(values.question ?? v.question, 500) || v.question, date, yes: counts.yes, no: counts.no, abstain: counts.abstain, ...(counts.names ? { names: counts.names } : {}), division: counts.division, ...r };
}

/** A different official who can sign at the legislature confirms a waiting correction; the entry keeps its previous version. */
export function confirmCorrection(id: string, correction: string, a: LegislativeActor, now = new Date()): Bill | { error: string } {
  const b = open(id, a, 'sign');
  if ('error' in b) return b;
  lapseCorrections(b, now);
  const c = b.corrections.find(x => x.id === correction);
  if (!c || c.state !== 'waiting') return { error: c ? `This correction is ${c.state}` : 'No such correction' };
  const same = dualControlRefusal({ by: c.by, byId: c.byId }, { by: a.by, byId: a.byId });
  if (same) return { error: same };
  const kept = { correction: c.id, at: now.toISOString() };
  if (c.target.kind === 'vote') {
    const v = b.votes.find(x => x.id === c.target.id)!;
    const next = correctedVote(b, v, c.values);
    if ('error' in next) return next;
    (v.history ??= []).push({ values: { question: v.question, date: v.date, yes: v.yes, no: v.no, abstain: v.abstain, ...(v.names ? { names: v.names } : {}), result: v.result }, ...kept });
    const { division, ...rest } = next;
    Object.assign(v, rest);
    if (!next.names) delete v.names;
    if (division) v.division = true; else delete v.division;
  } else {
    const j = b.journal.find(x => x.id === c.target.id)!;
    (j.history ??= []).push({ values: { date: j.date, text: j.text }, ...kept });
    if (typeof c.values.date === 'string') j.date = c.values.date;
    if (typeof c.values.text === 'string') j.text = str(c.values.text, 600);
  }
  Object.assign(c, { state: 'confirmed', confirmedBy: a.by, ...(a.byId ? { confirmedById: a.byId } : {}), confirmedAt: now.toISOString() });
  journal(b, a, 'correction', today(now), `Correction of a ${c.target.kind === 'vote' ? 'recorded vote' : 'journal entry'}: ${c.reason} (proposed by ${c.by})`, now, c.target.id);
  audit(a, 'bill.correction.confirm', `Bill:${b.id}`, `${b.number} · ${c.target.kind} ${c.target.id} · proposed by ${c.by}`);
  return clone(b);
}

export function withdrawCorrection(id: string, correction: string, a: LegislativeActor, now = new Date()): Bill | { error: string } {
  const b = open(id, a, 'record');
  if ('error' in b) return b;
  const c = b.corrections.find(x => x.id === correction);
  if (!c || c.state !== 'waiting') return { error: 'Only a waiting correction is withdrawn' };
  c.state = 'withdrawn';
  c.withdrawnBy = a.by;
  audit(a, 'bill.correction.withdraw', `Bill:${b.id}`, `${b.number} · ${c.target.kind} ${c.target.id}`);
  void now;
  return clone(b);
}

// ── What others see ─────────────────────────────────────────────────────────

/** Whether the public sees this bill under the procedure in force (the chamber's own setting). */
function publicBillVisible(b: Bill, p: LegislativeProcedure | undefined): boolean {
  if (!p || p.publicRecord.bills === 'none') return false;
  if (p.publicRecord.bills === 'introduced') return true;
  if (p.publicRecord.bills === 'passed') return ['passed', 'assented', 'assent-withheld', 'published'].includes(b.state);
  return b.state === 'published' || b.state === 'assented' || (b.state === 'passed' && !procedureOf(b).assent.required);
}

export interface PublicBill {
  id: string; number: string; title: string; summary?: string; sponsor?: string; chamber?: string; state: BillState; stage: string;
  texts: { n: number; label: string; date: string; digest: string; provisions: Provision[] }[];
  journal: { kind: JournalKind; date: string; stage: string; text: string; corrected?: boolean }[];
  votes?: { stage: string; question: string; date: string; yes: number; no: number; abstain: number; result: VoteResult; names?: MemberVote[]; corrected?: boolean }[];
  amendments: { number: string; proposer?: string; text: string; outcome: Amendment['outcome'] }[];
  reports: { committee: string; date: string; recommendation: string; summary: string; reference?: string }[];
  assent?: { outcome: string; date: string; communicated?: boolean };
  commencement?: string; publication?: { date: string; reference: string; actNumber: string };
  certified?: { at: string; digest: string; current: boolean };
  law?: { instrument: string; version: string }[];
}

/**
 * What the public sees of a bill, as the chamber's procedure in force allows:
 * the texts, the journal, amendments, committee reports, assent, publication
 * and, as set, votes with names or counts only. Never who on the staff
 * recorded each step, nor waiting corrections. Null when it is not public.
 */
export function publicBill(id: string): PublicBill | null {
  const b = findBill(id);
  const p = activeProcedure();
  if (!b || !publicBillVisible(b, p)) return null;
  const votes = p!.publicRecord.votes;
  const cert = certificationOf(b);
  return {
    id: b.id, number: b.number, title: b.title, ...(b.summary ? { summary: b.summary } : {}), ...(b.sponsor ? { sponsor: b.sponsor } : {}), ...(b.chamber ? { chamber: b.chamber } : {}),
    state: b.state, stage: stageLabel(b, b.stage),
    texts: b.texts.map(t => ({ n: t.n, label: t.label, date: t.date, digest: t.digest, provisions: clone(t.provisions) })),
    journal: b.journal.map(j => ({ kind: j.kind, date: j.date, stage: stageLabel(b, j.stage), text: j.text, ...(j.history?.length ? { corrected: true } : {}) })),
    ...(votes === 'none' ? {} : { votes: b.votes.map(v => ({ stage: stageLabel(b, v.stage), question: v.question, date: v.date, yes: v.yes, no: v.no, abstain: v.abstain, result: v.result, ...(votes === 'names' && v.names ? { names: clone(v.names) } : {}), ...(v.history?.length ? { corrected: true } : {}) })) }),
    amendments: b.amendments.map(m => ({ number: m.number, ...(m.proposer ? { proposer: m.proposer } : {}), text: m.text, outcome: m.outcome })),
    reports: b.reports.map(r => ({ committee: r.committee, date: r.date, recommendation: RECOMMENDATIONS.find(x => x.key === r.recommendation)?.label ?? r.recommendation, summary: r.summary, ...(r.reference ? { reference: r.reference } : {}) })),
    ...(b.assent ? { assent: { outcome: b.assent.outcome, date: b.assent.date, ...(b.assent.communicated ? { communicated: true } : {}) } } : {}),
    ...(b.commencement ? { commencement: b.commencement.inForce } : {}),
    ...(b.publication ? { publication: { date: b.publication.date, reference: b.publication.reference, actNumber: b.publication.actNumber } } : {}),
    ...(cert ? { certified: { at: cert.at, digest: cert.digest, current: cert.current } } : {}),
    ...(b.law?.length ? { law: b.law.map(l => ({ instrument: l.instrument, version: l.version })) } : {}),
  };
}
export const publicBills = (): PublicBill[] => listBills().map(b => publicBill(b.id)).filter((x): x is PublicBill => !!x);

/**
 * Who reads the full record (who recorded each step, waiting corrections):
 * signed-in officials of the legislature; the head of state's office for
 * bills passed and on (to decide on assent). Everyone else, and anyone not
 * signed in, reads what the public reads.
 */
export function readsFullRecord(s: Scope | null, b: Pick<Bill, 'state'>): boolean {
  // Nobody signed in reads what the public reads (the bills routes are public reads).
  if (!s) return false;
  const leg = legislatureId();
  if (leg && s.institution === leg) return true;
  const head = authorityFor('headOfState');
  return !!head && s.institution === head && b.state !== 'in-progress';
}

/** What waits for a second official of the legislature, for the onboarding page and the workspace. */
export function waitingLegislative(now = new Date()): { what: string; by: string; at: string; href: string }[] {
  const out: { what: string; by: string; at: string; href: string }[] = [];
  for (const p of db().procedures) if (p.state === 'draft') out.push({ what: `Legislative procedure version ${p.version} — waiting for approval by a different official of the legislature`, by: p.author, at: p.createdAt, href: '/gov/legislature/procedure' });
  for (const b of db().bills) {
    lapseCorrections(b, now);
    for (const c of b.corrections) if (c.state === 'waiting') out.push({ what: `${b.number}: a correction of a ${c.target.kind === 'vote' ? 'recorded vote' : 'journal entry'} waiting for confirmation`, by: c.by, at: c.at, href: `/gov/legislature/bills/${encodeURIComponent(b.id)}` });
  }
  return out;
}
