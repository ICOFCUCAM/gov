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

import { dualControlRefusal } from '@/lib/data/dual-control';
import { createHash } from 'node:crypto';
import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';
import { cite, type Citation } from './register';
import type { AuthorityKey } from '@/lib/nation/deployment';

export type RuleKind = 'flat-rate' | 'rate-bands' | 'tariff' | 'tiers';
export interface Band { from: number; to?: number; rate: number }
export interface TariffLine { code: string; rate: number; description?: string }
/** A tier of a `tiers` rule: amounts from `from` (inclusive) up to `to` (exclusive; open-ended when absent), named, with what it allows. */
export interface Tier { from: number; to?: number; tier: string; allows?: string[] }
export interface RuleTest { name: string; input: { amountMinor: number; code?: string }; expectMinor: number; /** A tiers rule: the tier the amount must fall in. */ expectTier?: string }

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
  tests: RuleTest[];
  /** SHA-256 of the rule's content (kind, rate, bands, lines): what a calculation cites. */
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
// A tiers rule's tiers join the digest; the other kinds keep the digest they always had.
const digestOf = (r: Pick<RuleVersion, 'kind' | 'rate' | 'bands' | 'lines' | 'tiers'>) => createHash('sha256').update(JSON.stringify(r.kind === 'tiers' ? [r.kind, r.tiers ?? null] : [r.kind, r.rate ?? null, r.bands ?? null, r.lines ?? null]), 'utf8').digest('hex');

/** Half-up rounding of amount × rate% to minor units. */
const pct = (amountMinor: number, rate: number) => Math.round((amountMinor * rate) / 100);

/** Apply one version to an input (no state is read: used by tests and calculate()). */
export function applyRule(r: Pick<RuleVersion, 'kind' | 'rate' | 'bands' | 'lines' | 'tiers'>, input: { amountMinor: number; code?: string }): { amountMinor: number; steps: string[] } | { error: string } {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0) return { error: 'The base amount is a whole, non-negative number of minor units' };
  if (r.kind === 'tiers') return { error: 'A tiers rule names a tier, it calculates no amount: read it with tierFor()' };
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

export interface RuleInput { key?: unknown; title?: unknown; kind?: unknown; owner?: unknown; effectiveFrom?: unknown; effectiveTo?: unknown; citations?: unknown; rate?: unknown; bands?: unknown; lines?: unknown; tiers?: unknown; tests?: unknown }

function check(input: RuleInput): Omit<RuleVersion, 'id' | 'version' | 'citations' | 'digest' | 'state' | 'draftedBy' | 'draftedById' | 'draftedAt'> | { error: string } {
  const key = typeof input.key === 'string' ? input.key.trim() : '';
  if (!KEY.test(key)) return { error: 'A rule has a key such as tax.income.rates or customs.tariff' };
  const title = typeof input.title === 'string' ? input.title.trim().slice(0, 200) : '';
  if (title.length < 3) return { error: 'Give the rule its name' };
  const kind = input.kind as RuleKind;
  if (!['flat-rate', 'rate-bands', 'tariff', 'tiers'].includes(kind)) return { error: 'A rule is a flat rate, rate bands, a tariff or tiers' };
  const owner = typeof input.owner === 'string' ? input.owner.trim() : '';
  if (!owner) return { error: 'Name the authority that owns the rule' };
  const effectiveFrom = String(input.effectiveFrom ?? '');
  if (!DATE.test(effectiveFrom)) return { error: 'Say from which date it applies (YYYY-MM-DD)' };
  const effectiveTo = typeof input.effectiveTo === 'string' && input.effectiveTo ? input.effectiveTo : undefined;
  if (effectiveTo && (!DATE.test(effectiveTo) || effectiveTo <= effectiveFrom)) return { error: 'An end date is after the start date' };
  const base = { key, title, kind, owner, effectiveFrom, ...(effectiveTo ? { effectiveTo } : {}) };
  let content: Pick<RuleVersion, 'rate' | 'bands' | 'lines' | 'tiers'>;
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
  return { ...base, ...content, tests: tests.map(t => ({ name: String(t.name ?? 'test').slice(0, 100), input: { amountMinor: t.input.amountMinor, ...(t.input.code ? { code: t.input.code } : {}) }, expectMinor: t.expectMinor })) };
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
export function calculate(key: string, input: { amountMinor: number; code?: string }, on = new Date().toISOString().slice(0, 10)): Calculation | { error: string } {
  const r = ruleInForce(key, on);
  if (!r) return { error: `No approved rule ${key} applies on ${on}: enter the amount with its reasons, or have the rule approved` };
  const a = applyRule(r, input);
  if ('error' in a) return a;
  return { amountMinor: a.amountMinor, rule: { key: r.key, version: r.version, digest: r.digest, citations: r.citations }, on, steps: a.steps };
}
