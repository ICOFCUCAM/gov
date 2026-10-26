// Operational rules (the legal rules registry the review asked for, kept
// apart from the legal texts in lib/law/register.ts): rate tables and tariff
// schedules a tax or customs authority applies, as versioned data. Each
// version names its owning authority, the provisions of law it implements
// (cited from the laws register on its effective date), the dates it applies,
// its rows, and tests (input → expected amount) that must pass before it is
// approved. A draft is written by one official of the owning authority and
// approved by a different one who can sign there; it then applies from its
// date. CivicOS ships no rates, bands or tariffs: until a nation approves a
// rule, calculate() refuses and an official enters the amount with reasons.
//
// Amounts are integers in minor units (cents); rates are percentages with at
// most four decimals; results are rounded half up to the minor unit.
//
// Thresholds and approval tiers (plan step I5; specification Part 1 §4.3:
// "every monetary threshold, budget ceiling, approval tier and payment
// deadline must be a versioned national rule"): a `tiers` rule divides
// amounts into named tiers (from 0, each starting where the one before ends,
// the last open-ended), each optionally listing what it allows (procurement
// methods, approval levels). Its tests give an amount and the tier it must
// fall in. tierFor() reads the tier in force; without an approved rule it
// refuses, like calculate().
// Plan step I6 adds two kinds for human services: a schedule of fixed amounts
// by code (a fee for each kind of passport or travel document, an amount for
// each benefit category) and a means-tested amount (a base amount, an amount
// for each further household member, a taper on assessed means and a limit
// at which nothing is due) from which a benefit's eligibility and amount are
// calculated. Like every rule they ship empty: the nation's law sets each
// figure, cited, tested and approved by a second official.

import { dualControlRefusal } from '@/lib/data/dual-control';
import { createHash } from 'node:crypto';
import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';
import { cite, type Citation } from './register';
import type { AuthorityKey } from '@/lib/nation/deployment';

export type RuleKind = 'flat-rate' | 'rate-bands' | 'tariff' | 'tiers' | 'fixed-amounts' | 'means-tested';
export interface Band { from: number; to?: number; rate: number }
export interface TariffLine { code: string; rate: number; description?: string }
/** A tier of a `tiers` rule: amounts from `from` (inclusive) up to `to` (exclusive; open-ended when absent), named, with what it allows. */
export interface Tier { from: number; to?: number; tier: string; allows?: string[] }
/** fixed-amounts: one amount for each code (a fee per document type, an amount per benefit category). */
export interface AmountLine { code: string; amountMinor: number; description?: string }
/**
 * means-tested: what is due for assessed means M (minor units) and a household
 * of N members: nothing when M is at or above `limitMinor`; otherwise
 * baseMinor + perMemberMinor x (N - 1) - taperRate% x M, never below zero.
 */
export interface MeansTest { limitMinor: number; baseMinor: number; perMemberMinor: number; taperRate: number }
export interface RuleInputValues { amountMinor: number; code?: string; members?: number }
export interface RuleTest { name: string; input: RuleInputValues; expectMinor: number; /** A tiers rule: the tier the amount must fall in. */ expectTier?: string }

export interface RuleVersion {
  id: string;
  key: string;
  title: string;
  kind: RuleKind;
  owner: AuthorityKey | string;
  version: number;
  effectiveFrom: string;
  effectiveTo?: string;
  citations: Citation[];
  /** flat-rate: one rate; rate-bands: progressive bands over minor units; tariff: rates by classification code prefix. */
  rate?: number;
  bands?: Band[];
  lines?: TariffLine[];
  /** tiers: named tiers over minor units. */
  tiers?: Tier[];
  /** fixed-amounts: the amount for each code. */
  amounts?: AmountLine[];
  /** means-tested: the terms of the calculation. */
  means?: MeansTest;
  tests: RuleTest[];
  /** SHA-256 of the rule's content (kind, rate, bands, lines, amounts, means): what a calculation cites. */
  digest: string;
  state: 'draft' | 'approved' | 'withdrawn';
  draftedBy: string; draftedById?: string; draftedAt: string;
  approvedBy?: string; approvedById?: string; approvedAt?: string;
}

interface Db { rules: RuleVersion[] }
const g = globalThis as unknown as { __civicosRules?: Db };
const db = (): Db => { const d = touch('__civicosRules', g.__civicosRules ??= { rules: [] }); d.rules ??= []; return d; };
export function resetRules(): void { g.__civicosRules = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);
const KEY = /^[a-z][a-z0-9.-]{2,80}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CODE = /^[0-9]{2,10}$/;
const okRate = (r: unknown): r is number => typeof r === 'number' && Number.isFinite(r) && r >= 0 && r <= 1000 && Math.round(r * 10_000) === r * 10_000;
const AMOUNT_CODE = /^[a-z0-9][a-z0-9.-]{0,60}$/;
const okMinor = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 1e13;
/** The kinds before plan steps I5 and I6 keep their digest exactly; each new kind adds its own content. */
const digestOf = (r: Pick<RuleVersion, 'kind' | 'rate' | 'bands' | 'lines' | 'tiers' | 'amounts' | 'means'>) => createHash('sha256').update(JSON.stringify(
  r.kind === 'tiers' ? [r.kind, r.tiers ?? null]
    : r.kind === 'fixed-amounts' || r.kind === 'means-tested' ? [r.kind, r.amounts ?? null, r.means ?? null]
    : [r.kind, r.rate ?? null, r.bands ?? null, r.lines ?? null]), 'utf8').digest('hex');

/** Half-up rounding of amount × rate% to minor units. */
const pct = (amountMinor: number, rate: number) => Math.round((amountMinor * rate) / 100);

/** Apply one version to an input (no state is read: used by tests and calculate()). */
export function applyRule(r: Pick<RuleVersion, 'kind' | 'rate' | 'bands' | 'lines' | 'tiers' | 'amounts' | 'means'>, input: RuleInputValues): { amountMinor: number; steps: string[] } | { error: string } {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0) return { error: 'The base amount is a whole, non-negative number of minor units' };
  if (r.kind === 'tiers') return { error: 'A tiers rule names a tier, it calculates no amount: read it with tierFor()' };
  if (r.kind === 'fixed-amounts') {
    const code = (input.code ?? '').trim();
    if (!code) return { error: 'A schedule of amounts needs the code of the line that applies' };
    const line = r.amounts!.find(l => l.code === code);
    if (!line) return { error: `No line of the schedule covers ${code}` };
    return { amountMinor: line.amountMinor, steps: [`${code}: ${line.amountMinor}`] };
  }
  if (r.kind === 'means-tested') {
    const m = r.means!;
    const members = input.members ?? 1;
    if (!Number.isInteger(members) || members < 1 || members > 100) return { error: 'The household has a whole number of members, from 1' };
    if (input.amountMinor >= m.limitMinor) return { amountMinor: 0, steps: [`means ${input.amountMinor} at or above the limit ${m.limitMinor}: nothing due`] };
    const before = m.baseMinor + m.perMemberMinor * (members - 1);
    const taper = pct(input.amountMinor, m.taperRate);
    const due = Math.max(0, before - taper);
    return { amountMinor: due, steps: [`${m.baseMinor} + ${m.perMemberMinor} x ${members - 1} = ${before}`, `less ${m.taperRate}% of means ${input.amountMinor} = ${taper}`, `due ${due}`] };
  }
  if (r.kind === 'flat-rate') return { amountMinor: pct(input.amountMinor, r.rate!), steps: [`${input.amountMinor} × ${r.rate}%`] };
  if (r.kind === 'rate-bands') {
    let total = 0; const steps: string[] = [];
    for (const b of r.bands!) {
      if (input.amountMinor <= b.from) break;
      const top = b.to === undefined ? input.amountMinor : Math.min(input.amountMinor, b.to);
      const part = pct(top - b.from, b.rate);
      steps.push(`${b.from}–${top} × ${b.rate}% = ${part}`);
      total += part;
    }
    return { amountMinor: total, steps };
  }
  const code = (input.code ?? '').replace(/\D/g, '');
  if (!code) return { error: 'A tariff needs the goods classification code' };
  const line = [...r.lines!].sort((a, b) => b.code.length - a.code.length).find(l => code.startsWith(l.code));
  if (!line) return { error: `No tariff line covers code ${code}` };
  return { amountMinor: pct(input.amountMinor, line.rate), steps: [`code ${code} → line ${line.code} at ${line.rate}%: ${input.amountMinor} × ${line.rate}%`] };
}

/** The tier an amount falls in under a tiers rule (no state is read). */
export function applyTier(r: Pick<RuleVersion, 'kind' | 'tiers'>, amountMinor: number): { tier: string; allows?: string[]; steps: string[] } | { error: string } {
  if (r.kind !== 'tiers' || !r.tiers?.length) return { error: 'Not a tiers rule' };
  if (!Number.isInteger(amountMinor) || amountMinor < 0) return { error: 'The amount is a whole, non-negative number of minor units' };
  const t = r.tiers.find(x => amountMinor >= x.from && (x.to === undefined || amountMinor < x.to));
  if (!t) return { error: `No tier covers ${amountMinor}` };
  return { tier: t.tier, ...(t.allows?.length ? { allows: [...t.allows] } : {}), steps: [`${amountMinor} in ${t.from}–${t.to ?? '…'} → ${t.tier}`] };
}

export interface RuleInput { key?: unknown; title?: unknown; kind?: unknown; owner?: unknown; effectiveFrom?: unknown; effectiveTo?: unknown; citations?: unknown; rate?: unknown; bands?: unknown; lines?: unknown; tiers?: unknown; amounts?: unknown; means?: unknown; tests?: unknown }

function check(input: RuleInput): Omit<RuleVersion, 'id' | 'version' | 'citations' | 'digest' | 'state' | 'draftedBy' | 'draftedById' | 'draftedAt'> | { error: string } {
  const key = typeof input.key === 'string' ? input.key.trim() : '';
  if (!KEY.test(key)) return { error: 'A rule has a key such as tax.income.rates or customs.tariff' };
  const title = typeof input.title === 'string' ? input.title.trim().slice(0, 200) : '';
  if (title.length < 3) return { error: 'Give the rule its name' };
  const kind = input.kind as RuleKind;
  if (!['flat-rate', 'rate-bands', 'tariff', 'tiers', 'fixed-amounts', 'means-tested'].includes(kind)) return { error: 'A rule is a flat rate, rate bands, a tariff, tiers, a schedule of fixed amounts or a means-tested amount' };
  const owner = typeof input.owner === 'string' ? input.owner.trim() : '';
  if (!owner) return { error: 'Name the authority that owns the rule' };
  const effectiveFrom = String(input.effectiveFrom ?? '');
  if (!DATE.test(effectiveFrom)) return { error: 'Say from which date it applies (YYYY-MM-DD)' };
  const effectiveTo = typeof input.effectiveTo === 'string' && input.effectiveTo ? input.effectiveTo : undefined;
  if (effectiveTo && (!DATE.test(effectiveTo) || effectiveTo <= effectiveFrom)) return { error: 'An end date is after the start date' };
  const base = { key, title, kind, owner, effectiveFrom, ...(effectiveTo ? { effectiveTo } : {}) };
  let content: Pick<RuleVersion, 'rate' | 'bands' | 'lines' | 'tiers' | 'amounts' | 'means'>;
  if (kind === 'tiers') {
    const tiers = Array.isArray(input.tiers) ? input.tiers as Tier[] : [];
    if (!tiers.length || tiers.length > 50) return { error: 'Give between 1 and 50 tiers' };
    for (const [i, t] of tiers.entries()) {
      if (!Number.isInteger(t.from) || t.from < 0 || (i === 0 ? t.from !== 0 : t.from !== tiers[i - 1]!.to)) return { error: i === 0 ? 'The first tier starts at 0' : `Tier ${i + 1} must start where the tier before it ends` };
      if (t.to !== undefined && (!Number.isInteger(t.to) || t.to <= t.from)) return { error: `Tier ${i + 1} must end after it starts` };
      if (t.to === undefined && i !== tiers.length - 1) return { error: 'Only the last tier is open-ended' };
      if (!/^[a-z][a-z0-9-]{1,40}$/.test(String(t.tier))) return { error: `Tier ${i + 1}: name it in lower-case letters, digits and hyphens` };
      if (t.allows !== undefined && (!Array.isArray(t.allows) || t.allows.length > 30 || t.allows.some(a => !/^[a-z][a-z0-9-]{1,40}$/.test(String(a))))) return { error: `Tier ${i + 1}: what it allows is a list of short keys` };
    }
    if (tiers[tiers.length - 1]!.to !== undefined) return { error: 'The last tier is open-ended' };
    content = { tiers: tiers.map(t => ({ from: t.from, ...(t.to !== undefined ? { to: t.to } : {}), tier: String(t.tier), ...(t.allows?.length ? { allows: t.allows.map(String) } : {}) })) };
  } else if (kind === 'fixed-amounts') {
    const lines = Array.isArray(input.amounts) ? input.amounts as AmountLine[] : [];
    if (!lines.length || lines.length > 500) return { error: 'Give the amounts (1 to 500 lines)' };
    const seen = new Set<string>();
    for (const l of lines) {
      if (!AMOUNT_CODE.test(String(l.code))) return { error: `Code ${l.code}: lowercase letters, digits, dots and dashes` };
      if (seen.has(l.code)) return { error: `Code ${l.code} appears twice` };
      if (!okMinor(l.amountMinor)) return { error: `Code ${l.code}: the amount is a whole, non-negative number of minor units` };
      seen.add(l.code);
    }
    content = { amounts: lines.map(l => ({ code: String(l.code), amountMinor: l.amountMinor, ...(l.description ? { description: String(l.description).slice(0, 200) } : {}) })) };
  } else if (kind === 'means-tested') {
    const m = (input.means ?? {}) as Partial<MeansTest>;
    for (const k of ['limitMinor', 'baseMinor', 'perMemberMinor'] as const) if (!okMinor(m[k])) return { error: `${k} is a whole, non-negative number of minor units` };
    if (!okRate(m.taperRate)) return { error: 'The taper is a percentage from 0 to 1000 with at most four decimals' };
    content = { means: { limitMinor: m.limitMinor!, baseMinor: m.baseMinor!, perMemberMinor: m.perMemberMinor!, taperRate: m.taperRate! } };
  } else if (kind === 'flat-rate') {
    if (!okRate(input.rate)) return { error: 'The rate is a percentage from 0 to 1000 with at most four decimals' };
    content = { rate: input.rate };
  } else if (kind === 'rate-bands') {
    const bands = Array.isArray(input.bands) ? input.bands as Band[] : [];
    if (!bands.length || bands.length > 50) return { error: 'Give between 1 and 50 bands' };
    let prev = -1;
    for (const [i, b] of bands.entries()) {
      if (!Number.isInteger(b.from) || b.from < 0 || b.from <= prev - 1 || (i > 0 && b.from !== bands[i - 1]!.to)) return { error: `Band ${i + 1} must start where the band before it ends` };
      if (b.to !== undefined && (!Number.isInteger(b.to) || b.to <= b.from)) return { error: `Band ${i + 1} must end after it starts` };
      if (b.to === undefined && i !== bands.length - 1) return { error: 'Only the last band is open-ended' };
      if (!okRate(b.rate)) return { error: `Band ${i + 1}: the rate is a percentage with at most four decimals` };
      prev = b.from;
    }
    if (bands[0]!.from !== 0) return { error: 'The first band starts at 0' };
    content = { bands: bands.map(b => ({ from: b.from, ...(b.to !== undefined ? { to: b.to } : {}), rate: b.rate })) };
  } else {
    const lines = Array.isArray(input.lines) ? input.lines as TariffLine[] : [];
    if (!lines.length || lines.length > 20_000) return { error: 'Give the tariff lines (up to 20 000)' };
    const seen = new Set<string>();
    for (const l of lines) {
      if (!CODE.test(String(l.code))) return { error: `Tariff code ${l.code}: 2 to 10 digits` };
      if (seen.has(l.code)) return { error: `Tariff code ${l.code} appears twice` };
      if (!okRate(l.rate)) return { error: `Tariff code ${l.code}: the rate is a percentage with at most four decimals` };
      seen.add(l.code);
    }
    content = { lines: lines.map(l => ({ code: String(l.code), rate: l.rate, ...(l.description ? { description: String(l.description).slice(0, 200) } : {}) })) };
  }
  const tests = (Array.isArray(input.tests) ? input.tests : []) as RuleTest[];
  if (!tests.length) return { error: 'A rule needs at least one test (an input and the amount it must give)' };
  if (kind === 'tiers') {
    for (const t of tests) {
      const r = applyTier({ kind, ...content }, t.input?.amountMinor ?? -1);
      if ('error' in r) return { error: `Test ${t.name}: ${r.error}` };
      if (r.tier !== t.expectTier) return { error: `Test ${t.name}: falls in ${r.tier}, expected ${String(t.expectTier)}` };
    }
    return { ...base, ...content, tests: tests.map(t => ({ name: String(t.name ?? 'test').slice(0, 100), input: { amountMinor: t.input.amountMinor }, expectMinor: t.input.amountMinor, expectTier: String(t.expectTier) })) };
  }
  for (const t of tests) {
    const r = applyRule({ kind, ...content }, t.input ?? { amountMinor: -1 });
    if ('error' in r) return { error: `Test ${t.name}: ${r.error}` };
    if (r.amountMinor !== t.expectMinor) return { error: `Test ${t.name}: gives ${r.amountMinor}, expected ${t.expectMinor}` };
  }
  return { ...base, ...content, tests: tests.map(t => ({ name: String(t.name ?? 'test').slice(0, 100), input: { amountMinor: t.input.amountMinor, ...(t.input.code ? { code: t.input.code } : {}), ...(t.input.members !== undefined ? { members: t.input.members } : {}) }, expectMinor: t.expectMinor })) };
}

/** Draft the next version of a rule; its tests run now and must pass. */
export function draftRule(input: RuleInput, by: string, byId?: string, now = new Date()): RuleVersion | { error: string } {
  const c = check(input);
  if ('error' in c) return c;
  const citations: Citation[] = [];
  for (const l of (Array.isArray(input.citations) ? input.citations : []).slice(0, 20)) {
    const x = l as { instrument?: unknown; eId?: unknown };
    const ct = cite(String(x.instrument ?? ''), String(x.eId ?? ''), c.effectiveFrom, `Rule ${c.key}`);
    if ('error' in ct) return { error: `Legal basis: ${ct.error}` };
    citations.push(ct);
  }
  const r: RuleVersion = { ...c, id: uuid7(), version: Math.max(0, ...db().rules.filter(x => x.key === c.key).map(x => x.version)) + 1, citations, digest: digestOf(c), state: 'draft', draftedBy: by, ...(byId ? { draftedById: byId } : {}), draftedAt: now.toISOString() };
  db().rules.push(r);
  recordAudit(by, 'rule.draft', `Rule:${r.key}@${r.version}`, 'ok', `${r.title} · ${r.kind} · from ${r.effectiveFrom} · ${r.tests.length} tests pass · ${r.digest.slice(0, 12)}`);
  return clone(r);
}

export function approveRule(key: string, version: number, by: string, byId?: string, now = new Date()): RuleVersion | { error: string } {
  const r = db().rules.find(x => x.key === key && x.version === version);
  if (!r) return { error: 'No such rule version' };
  if (r.state !== 'draft') return { error: `This version is ${r.state}` };
  if (dualControlRefusal({ by: r.draftedBy, byId: r.draftedById }, { by, byId })) return { error: 'A different official approves the rule (four-eyes)' };
  if (!r.citations.length) return { error: 'A rule applies only with the provisions of law it implements cited' };
  for (const x of db().rules) if (x.key === key && x.state === 'approved' && x.version < version && (!x.effectiveTo || x.effectiveTo > r.effectiveFrom)) x.effectiveTo = r.effectiveFrom;
  Object.assign(r, { state: 'approved', approvedBy: by, ...(byId ? { approvedById: byId } : {}), approvedAt: now.toISOString() });
  recordAudit(by, 'rule.approve', `Rule:${key}@${version}`, 'ok', `${r.title} from ${r.effectiveFrom} · ${r.digest.slice(0, 12)} · drafted by ${r.draftedBy}`);
  return clone(r);
}

export function withdrawRule(key: string, version: number, reason: string, by: string, now = new Date()): RuleVersion | { error: string } {
  const r = db().rules.find(x => x.key === key && x.version === version);
  if (!r) return { error: 'No such rule version' };
  if (r.state !== 'draft') return { error: 'Only a draft is withdrawn; an approved rule is replaced by a newer approved version' };
  if (!reason.trim()) return { error: 'Say why it is withdrawn' };
  r.state = 'withdrawn';
  recordAudit(by, 'rule.withdraw', `Rule:${key}@${version}`, 'ok', `${reason.slice(0, 200)} · ${now.toISOString().slice(0, 10)}`);
  return clone(r);
}

export function ruleInForce(key: string, on = new Date().toISOString().slice(0, 10)): RuleVersion | undefined {
  const live = db().rules.filter(r => r.key === key && r.state === 'approved' && r.effectiveFrom <= on && (!r.effectiveTo || on < r.effectiveTo)).sort((a, b) => b.version - a.version);
  return live[0] ? clone(live[0]) : undefined;
}

export const listRules = (key?: string): RuleVersion[] => db().rules.filter(r => !key || r.key === key).map(clone);

/**
 * Re-apply one exact rule version (in force, superseded or since ended) to
 * recorded inputs: how a decision's calculation is reproduced (acceptance
 * P2-07). Refuses when the version's content no longer matches the digest the
 * decision recorded, or the version was never approved.
 */
export function recalculate(ref: { key: string; version: number; digest: string }, input: RuleInputValues): { amountMinor: number; steps: string[] } | { error: string } {
  const r = db().rules.find(x => x.key === ref.key && x.version === ref.version);
  if (!r) return { error: `Rule ${ref.key} version ${ref.version} is not in the register` };
  if (r.state !== 'approved') return { error: `Rule ${ref.key} version ${ref.version} was never approved` };
  if (digestOf(r) !== ref.digest || r.digest !== ref.digest) return { error: `Rule ${ref.key} version ${ref.version} does not match the digest the calculation recorded` };
  return applyRule(r, input);
}

export interface Calculation { amountMinor: number; rule: { key: string; version: number; digest: string; citations: Citation[] }; on: string; steps: string[] }

/** The tier an amount falls in under the approved tiers rule in force on a date; refuses when none is approved. */
export function tierFor(key: string, amountMinor: number, on = new Date().toISOString().slice(0, 10)): { tier: string; allows?: string[]; rule: { key: string; version: number; digest: string; citations: Citation[] }; on: string } | { error: string } {
  const r = ruleInForce(key, on);
  if (!r) return { error: `No approved rule ${key} applies on ${on}: the nation approves its thresholds first` };
  const t = applyTier(r, amountMinor);
  if ('error' in t) return t;
  return { tier: t.tier, ...(t.allows ? { allows: t.allows } : {}), rule: { key: r.key, version: r.version, digest: r.digest, citations: r.citations }, on };
}

/** Apply the approved rule in force on a date; refuses when none is approved (an official then enters the amount with reasons). */
export function calculate(key: string, input: RuleInputValues, on = new Date().toISOString().slice(0, 10)): Calculation | { error: string } {
  const r = ruleInForce(key, on);
  if (!r) return { error: `No approved rule ${key} applies on ${on}: enter the amount with its reasons, or have the rule approved` };
  const a = applyRule(r, input);
  if ('error' in a) return a;
  return { amountMinor: a.amountMinor, rule: { key: r.key, version: r.version, digest: r.digest, citations: r.citations }, on, steps: a.steps };
}
