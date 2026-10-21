// How long the platform keeps personal data (go-live review M-13).
//
// Two kinds of rule:
//
// - Fixed, for data nobody needs once its purpose has passed: unconfirmed
//   email-update requests go after their link expires (CONFIRM_DAYS), the
//   counters behind the sign-in lockout after their 15-minute window, and
//   queued email to an address is deleted when it unsubscribes. These run
//   from the sweep below.
// - The nation's own, for permits and cases: by default everything is kept
//   (`keep`). An administrator proposes a rule (anonymise or delete decided
//   permits / closed cases after N days, with its legal basis), a different
//   administrator confirms it, and only then does the sweep act on it.
//   Going back to `keep` applies at once. Every proposal, confirmation and
//   sweep is audited; the sweep writes one entry with counts, never names.
//
// The sweep is `runRetention()`, called hourly by /api/cron/retention
// (CIVICOS_CRON_SECRET, supabase/cron/schedule.sql). Example cases
// (`source: 'sample'`) are never touched by it.
//
// Durable through lib/data/persist.ts (`__civicosRetention`).

import { randomUUID } from 'node:crypto';
import type { Permit, QueueItem } from '@/lib/api/types';
import { recordAudit } from '@/lib/data/store/audit';
import { db as store } from '@/lib/data/store/state';
import { touch } from '@/lib/data/repo/track';
import { personOf } from '@/lib/data/dual-control';
import { sweepSubscriptions } from '@/lib/data/site-subscriptions';
import { sweepSignInFailures } from '@/lib/auth/officials';
import { flushAggregated } from '@/lib/audit/aggregate';
import { disposeDocument, dueDocuments } from '@/lib/records/documents';
import { pruneAccessLog } from '@/lib/records/access-log';
import { anonymiseClosedCases } from '@/lib/casework/engine';

export type RetentionCategory = 'permits' | 'cases' | 'procedure-cases' | 'documents' | 'access-log';
export type RetentionAction = 'keep' | 'anonymise' | 'delete';
export const RETENTION_CATEGORIES: { id: RetentionCategory; label: string; applies: string }[] = [
  { id: 'permits', label: 'Permits', applies: 'Decided permits (approved or declined), counted from the decision.' },
  { id: 'cases', label: 'Cases', applies: 'Closed cases of an institution\'s queue that came from a loaded file, were typed in or came from a connected case system, counted from when they were closed. Example cases are never touched.' },
  { id: 'procedure-cases', label: 'Cases under procedures', applies: 'Closed cases under approved procedures, counted from when they closed: anonymise removes personal fields and the parties\' names and keeps the case, its steps and sealed decisions. Never a case under a legal hold, a sample, or a procedure whose retention class is permanent (the civil register, organisations).' },
  { id: 'documents', label: 'Documents', applies: 'Documents of cases and register records, counted from when they were added. Delete destroys the content and keeps the record and its hashes; a document under a legal hold is never touched.' },
  { id: 'access-log', label: 'Access log', applies: 'Entries of who read restricted records, counted from when they were written. Delete removes the oldest entries and keeps the hash they chain to.' },
];
/** Categories where only keep or delete applies (nothing to anonymise in place). */
const DELETE_ONLY: RetentionCategory[] = ['documents', 'access-log'];
/** Categories where only keep or anonymise applies (legal records are never deleted). */
const ANONYMISE_ONLY: RetentionCategory[] = ['procedure-cases'];
export const MIN_DAYS = 30;
export const MAX_DAYS = 36_500;

export interface RetentionRule {
  action: RetentionAction;
  /** Days after the decision / closure; only for anonymise and delete. */
  days?: number;
  /** The legal basis or records schedule the rule follows. */
  basis?: string;
  /** Who proposed and who confirmed the rule in force (absent for the default). */
  proposedBy?: string;
  confirmedBy?: string;
  since?: string;
}

export interface RetentionChange {
  id: string;
  category: RetentionCategory;
  rule: RetentionRule;
  reason: string;
  proposedBy: string;
  /** The proposer's verified identity (session subject), when signed in: the oversight step compares persons, not names. */
  proposedById?: string;
  proposedAt: string;
  /** awaiting-oversight: deleting from the access log also needs the data-protection authority (directions 15.3). */
  state: 'proposed' | 'awaiting-oversight' | 'confirmed' | 'withdrawn';
  oversightBy?: string;
  decidedBy?: string;
  /** The confirming administrator's verified identity, when signed in. */
  decidedById?: string;
  decidedAt?: string;
}

export interface RetentionRun {
  at: string;
  permits: { anonymised: number; deleted: number };
  cases: { anonymised: number; deleted: number };
  /** Closed cases under procedures anonymised (absent on runs before this category). */
  procedureCases?: { anonymised: number };
  /** Documents whose content was destroyed, and those held back by a legal hold (absent on runs before documents). */
  documents?: { disposed: number; held: number };
  accessLog?: { removed: number };
  subscriptions: { expired: number };
  signInFailures: { expired: number };
  auditSummaries: number;
}

interface Db { rules: Partial<Record<RetentionCategory, RetentionRule>>; changes: RetentionChange[]; runs: RetentionRun[] }
const g = globalThis as unknown as { __civicosRetention?: Db };
const db = (): Db => {
  const d = touch('__civicosRetention', g.__civicosRetention ??= { rules: {}, changes: [], runs: [] });
  d.rules ??= {};
  d.changes ??= [];
  d.runs ??= [];
  return d;
};
export function resetRetention(): void { g.__civicosRetention = undefined; }

const KEEP: RetentionRule = { action: 'keep' };
const DAY = 86_400_000;

/** The rule in force for each category (keep unless one was confirmed). */
export function retentionRules(): Record<RetentionCategory, RetentionRule> {
  const r = db().rules;
  return { permits: r.permits ?? KEEP, cases: r.cases ?? KEEP, 'procedure-cases': r['procedure-cases'] ?? KEEP, documents: r.documents ?? KEEP, 'access-log': r['access-log'] ?? KEEP };
}
export const retentionChanges = (): RetentionChange[] => [...db().changes].reverse();
export const retentionRuns = (limit = 20): RetentionRun[] => db().runs.slice(-limit).reverse();

const describe = (r: RetentionRule) => r.action === 'keep' ? 'keep' : `${r.action} after ${r.days} days${r.basis ? ` (${r.basis})` : ''}`;
const isCategory = (v: unknown): v is RetentionCategory => RETENTION_CATEGORIES.some(c => c.id === v);

/**
 * Propose a rule for a category. Going back to `keep` applies at once (it
 * only stops deletion); anonymise and delete wait for a different
 * administrator's confirmation.
 */
export function proposeRetention(input: { category?: unknown; action?: unknown; days?: unknown; basis?: unknown; reason?: unknown }, by: string, now = Date.now(), byId?: string): RetentionChange | { error: string } {
  if (!by.trim()) return { error: 'Name the administrator proposing the rule' };
  if (!isCategory(input.category)) return { error: `category must be one of ${RETENTION_CATEGORIES.map(c => c.id).join(', ')}` };
  const action = input.action;
  if (action !== 'keep' && action !== 'anonymise' && action !== 'delete') return { error: 'action must be keep, anonymise or delete' };
  if (action === 'anonymise' && DELETE_ONLY.includes(input.category)) return { error: `${input.category} can be kept or deleted, not anonymised` };
  if (action === 'delete' && ANONYMISE_ONLY.includes(input.category)) return { error: `${input.category} can be kept or anonymised, never deleted: they are legal records` };
  const reason = typeof input.reason === 'string' ? input.reason.trim().slice(0, 500) : '';
  if (!reason) return { error: 'Give the reason for the change' };
  let rule: RetentionRule = { action };
  if (action !== 'keep') {
    const days = Number(input.days);
    if (!Number.isInteger(days) || days < MIN_DAYS || days > MAX_DAYS) return { error: `days must be a whole number from ${MIN_DAYS} to ${MAX_DAYS}` };
    const basis = typeof input.basis === 'string' ? input.basis.trim().slice(0, 300) : '';
    if (!basis) return { error: 'Name the legal basis or records schedule the rule follows' };
    rule = { action, days, basis };
  }
  const d = db();
  const at = new Date(now).toISOString();
  // A newer proposal for the same category replaces one still waiting.
  for (const c of d.changes) if (c.category === input.category && c.state === 'proposed') Object.assign(c, { state: 'withdrawn', decidedBy: by, decidedAt: at });
  const change: RetentionChange = { id: `RET-${randomUUID().slice(0, 8)}`, category: input.category, rule, reason, proposedBy: by, ...(byId ? { proposedById: byId } : {}), proposedAt: at, state: 'proposed' };
  d.changes.push(change);
  if (d.changes.length > 500) d.changes.splice(0, d.changes.length - 500);
  recordAudit(by, 'retention.propose', `Retention:${change.category}`, 'ok', `${describe(rule)} · ${reason}`);
  if (action === 'keep') {
    change.state = 'confirmed';
    change.decidedBy = by;
    change.decidedAt = at;
    d.rules[change.category] = { action: 'keep', proposedBy: by, confirmedBy: by, since: at };
    recordAudit(by, 'retention.confirm', `Retention:${change.category}`, 'ok', 'keep (applies at once: it only stops deletion)');
  }
  return change;
}

/** Confirm (a different administrator) or withdraw a proposed rule. */
export function decideRetention(id: string, decision: unknown, by: string, now = Date.now(), byId?: string): RetentionChange | { error: string } {
  if (!by.trim()) return { error: 'Name the administrator deciding' };
  const d = db();
  const c = d.changes.find(x => x.id === id);
  if (!c) return { error: 'No such proposal' };
  if (c.state !== 'proposed') return { error: `This proposal is already ${c.state}` };
  const at = new Date(now).toISOString();
  if (decision === 'withdraw') {
    Object.assign(c, { state: 'withdrawn', decidedBy: by, decidedAt: at });
    recordAudit(by, 'retention.withdraw', `Retention:${c.category}`, 'ok', describe(c.rule));
    return c;
  }
  if (decision !== 'confirm') return { error: 'decision must be confirm or withdraw' };
  if (by === c.proposedBy) return { error: 'A different administrator confirms the rule (four-eyes)' };
  if (byId && c.proposedById && (byId === c.proposedById || (personOf(byId).bound && personOf(byId).key === personOf(c.proposedById).key))) return { error: 'A different administrator confirms the rule (four-eyes)' };
  // Audit administration is separate from operational administration: shortening the access log
  // also needs the oversight side (confirmByOversight()).
  if (c.category === 'access-log' && c.rule.action === 'delete') {
    Object.assign(c, { state: 'awaiting-oversight', decidedBy: by, decidedAt: at }, byId ? { decidedById: byId } : {});
    recordAudit(by, 'retention.confirm', `Retention:${c.category}`, 'ok', `${describe(c.rule)} · proposed by ${c.proposedBy} · waiting for the data-protection authority`);
    return c;
  }
  Object.assign(c, { state: 'confirmed', decidedBy: by, decidedAt: at });
  d.rules[c.category] = { ...c.rule, proposedBy: c.proposedBy, confirmedBy: by, since: at };
  recordAudit(by, 'retention.confirm', `Retention:${c.category}`, 'ok', `${describe(c.rule)} · proposed by ${c.proposedBy}`);
  return c;
}

/**
 * The data-protection authority (or an auditor while none is named) confirms
 * a rule that deletes from the access log, after the two administrators.
 * The route checks who may (canConfirmAccessLogRetention()).
 */
export function confirmByOversight(id: string, by: string, now = Date.now(), byId?: string): RetentionChange | { error: string } {
  const d = db();
  const c = d.changes.find(x => x.id === id);
  if (!c) return { error: 'No such proposal' };
  if (c.state !== 'awaiting-oversight') return { error: 'This proposal is not waiting for the data-protection authority' };
  const refused = 'The oversight confirmation is by someone other than the administrators who proposed and confirmed it';
  if (by === c.proposedBy || by === c.decidedBy) return { error: refused };
  // Compared by person (audit L): the same account, or two accounts of one person at the identity
  // provider, is refused whatever names they carry; a proposal made signed in needs a signed-in confirmer.
  const earlier = [c.proposedById, c.decidedById].filter((x): x is string => !!x);
  if (earlier.length && !byId) return { error: 'The administrators were signed in: the oversight confirmation must be made signed in too' };
  if (byId) {
    const me = personOf(byId);
    for (const e of earlier) {
      const them = personOf(e);
      if (e === byId || (me.bound && them.bound && me.key === them.key)) return { error: refused };
    }
  }
  const at = new Date(now).toISOString();
  Object.assign(c, { state: 'confirmed', oversightBy: by });
  d.rules[c.category] = { ...c.rule, proposedBy: c.proposedBy, confirmedBy: `${c.decidedBy} and ${by} (oversight)`, since: at };
  recordAudit(by, 'retention.oversight-confirm', `Retention:${c.category}`, 'ok', `${describe(c.rule)} · proposed by ${c.proposedBy}, confirmed by ${c.decidedBy}`);
  return c;
}

const REMOVED = 'Removed under the retention rule';

/** When a permit was decided (its last approved/declined step), else undefined. */
function decidedAt(p: Permit): number | undefined {
  if (p.status !== 'approved' && p.status !== 'declined') return undefined;
  const step = [...p.timeline].reverse().find(t => t.status === p.status);
  const t = Date.parse(step?.at ?? p.submittedAt ?? '');
  return Number.isFinite(t) ? t : undefined;
}

function sweepPermits(rule: RetentionRule, now: number, at: string): { anonymised: number; deleted: number } {
  const out = { anonymised: 0, deleted: 0 };
  if (rule.action === 'keep' || !rule.days) return out;
  const cutoff = now - rule.days * DAY;
  const permits = store.permits;
  for (let i = permits.length - 1; i >= 0; i--) {
    const p = permits[i]!;
    const t = decidedAt(p);
    if (t === undefined || t > cutoff) continue;
    if (rule.action === 'delete') { permits.splice(i, 1); out.deleted++; continue; }
    if (p.anonymisedAt) continue;
    p.applicantName = REMOVED;
    p.title = `${p.type} permit (details removed)`;
    p.fields = {};
    p.timeline = p.timeline.map(({ note: _n, ...s }) => s);
    p.anonymisedAt = at;
    out.anonymised++;
  }
  return out;
}

const isRealCase = (c: QueueItem) => c.source === 'imported' || c.source === 'entered' || c.source === 'feed';

function sweepCases(rule: RetentionRule, now: number, at: string): { anonymised: number; deleted: number } {
  const out = { anonymised: 0, deleted: 0 };
  if (rule.action === 'keep' || !rule.days) return out;
  const cutoff = now - rule.days * DAY;
  for (const items of Object.values(store.ministryQueues)) {
    if (!items) continue;
    for (let i = items.length - 1; i >= 0; i--) {
      const c = items[i]!;
      if (!isRealCase(c) || c.state !== 'cleared') continue;
      const t = Date.parse(c.actedAt ?? c.receivedAt ?? '');
      if (!Number.isFinite(t) || t > cutoff) continue;
      if (rule.action === 'delete') { items.splice(i, 1); out.deleted++; continue; }
      if (c.anonymisedAt) continue;
      c.subject = REMOVED;
      delete c.note;
      c.anonymisedAt = at;
      out.anonymised++;
    }
  }
  return out;
}

function sweepDocuments(rule: RetentionRule, now: number): { disposed: number; held: number } {
  const out = { disposed: 0, held: 0 };
  if (rule.action !== 'delete' || !rule.days) return out;
  const cutoff = new Date(now - rule.days * DAY).toISOString();
  for (const d of dueDocuments(cutoff)) {
    if (d.legalHold) { out.held++; continue; }
    if (!('error' in disposeDocument(d.id, rule.basis ?? 'retention rule', 'retention schedule', new Date(now)))) out.disposed++;
  }
  return out;
}

/**
 * The retention sweep: the fixed rules (unconfirmed email-update requests,
 * sign-in lockout counters, aggregated audit windows) and the nation's
 * confirmed rules for permits and cases. One audit entry with the counts
 * when anything changed.
 */
export function runRetention(now = Date.now()): RetentionRun {
  const at = new Date(now).toISOString();
  const rules = retentionRules();
  const run: RetentionRun = {
    at,
    permits: sweepPermits(rules.permits, now, at),
    cases: sweepCases(rules.cases, now, at),
    procedureCases: { anonymised: rules['procedure-cases'].action === 'anonymise' && rules['procedure-cases'].days ? anonymiseClosedCases(new Date(now - rules['procedure-cases'].days * DAY).toISOString(), new Date(now)) : 0 },
    documents: sweepDocuments(rules.documents, now),
    accessLog: rules['access-log'].action === 'delete' && rules['access-log'].days ? pruneAccessLog(new Date(now - rules['access-log'].days * DAY).toISOString()) : { removed: 0 },
    subscriptions: { expired: sweepSubscriptions(now) },
    signInFailures: { expired: sweepSignInFailures(now) },
    auditSummaries: flushAggregated(now),
  };
  const d = db();
  d.runs.push(run);
  if (d.runs.length > 200) d.runs.splice(0, d.runs.length - 200);
  const n = run.permits.anonymised + run.permits.deleted + run.cases.anonymised + run.cases.deleted + (run.procedureCases?.anonymised ?? 0) + run.subscriptions.expired + (run.documents?.disposed ?? 0) + (run.accessLog?.removed ?? 0);
  if (n) {
    recordAudit('retention schedule', 'retention.sweep', 'Retention:platform', 'ok',
      `permits ${run.permits.anonymised} anonymised, ${run.permits.deleted} deleted · cases ${run.cases.anonymised} anonymised, ${run.cases.deleted} deleted · cases under procedures ${run.procedureCases?.anonymised ?? 0} anonymised · ${run.subscriptions.expired} unconfirmed email-update requests removed · documents ${run.documents?.disposed ?? 0} disposed (${run.documents?.held ?? 0} held) · access log ${run.accessLog?.removed ?? 0} entries removed`);
  }
  return run;
}
