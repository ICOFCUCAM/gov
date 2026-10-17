// CivicOS — Update Center support lifecycle, server-side.
//
// Releases belong to lines (major.minor). Each line is either long-term
// support (LTS) or standard, and runs through three windows from its first
// global release: active (features and fixes), security-only, then end of
// life. The publisher sets the policy (window lengths, which lines are LTS,
// when notices go out); every change is audited. End-of-life notices are
// issued at 12, 6 and 3 months before the date — once each, written to the
// audit chain and handed to the alerts of officials who subscribed to EOL
// notices. A nation's chamber warns when the line it runs nears its end.

import type { DistributionRelease, LifecycleKind, LifecycleLine, LifecyclePolicy, LifecycleWarning, SubscribedNation } from '@/lib/api/types';
import { recordAudit } from './store';
import { parseVersion } from '@/lib/updates/semver';

const DAY = 86_400_000;
export const DEFAULT_LIFECYCLE: LifecyclePolicy = {
  standard: { activeMonths: 6, securityMonths: 6 },
  lts: { activeMonths: 12, securityMonths: 24 },
  noticeMonths: [12, 6, 3],
  ltsLines: ['1.3'],
};

interface LcDb { policy: LifecyclePolicy; issued: Record<string, string> }
const g = globalThis as unknown as { __civicosLifecycle?: LcDb };
function ldb(): LcDb { return (g.__civicosLifecycle ??= { policy: structuredClone(DEFAULT_LIFECYCLE), issued: {} }); }
export function resetLifecycle(): void { g.__civicosLifecycle = undefined; }
export function lifecyclePolicy(): LifecyclePolicy { return structuredClone(ldb().policy); }

/** Listeners for issued notices (alerts subscribe; kept as a hook so this module stays free of cycles). */
type NoticeListener = (n: { line: string; months: number; endOfLife: string; at: string }) => void;
const listeners: NoticeListener[] = [];
export function onEolNotice(fn: NoticeListener): void { if (!listeners.includes(fn)) listeners.push(fn); }

export const lineOf = (version: string): string => { const v = parseVersion(version); return v ? `${v.major}.${v.minor}` : version; };
const addMonths = (iso: string, m: number) => { const d = new Date(iso); d.setUTCMonth(d.getUTCMonth() + m); return d.toISOString(); };

/** Every line with at least one global release, newest first. */
export function lifecycleLines(releases: DistributionRelease[], now = Date.now()): LifecycleLine[] {
  const pol = ldb().policy;
  const byLine = new Map<string, DistributionRelease[]>();
  for (const r of releases.filter(x => x.channel === 'global')) {
    const l = lineOf(r.version);
    byLine.set(l, [...(byLine.get(l) ?? []), r]);
  }
  const lines: LifecycleLine[] = [];
  for (const [line, rs] of byLine) {
    const sorted = [...rs].sort((a, b) => a.releasedAt.localeCompare(b.releasedAt));
    const kind: LifecycleKind = pol.ltsLines.includes(line) ? 'lts' : 'standard';
    const w = pol[kind];
    const gaAt = sorted[0]!.releasedAt;
    const activeUntil = addMonths(gaAt, w.activeMonths);
    const endOfLife = addMonths(gaAt, w.activeMonths + w.securityMonths);
    const phase = now >= Date.parse(endOfLife) ? 'end-of-life' : now >= Date.parse(activeUntil) ? 'security-only' : 'active';
    const notices = [...pol.noticeMonths].sort((a, b) => b - a)
      .map(m => ({ months: m, dueAt: addMonths(endOfLife, -m) }))
      .filter(n => Date.parse(n.dueAt) <= now)
      .map(n => ({ ...n, issuedAt: ldb().issued[`${line}:${n.months}:${endOfLife}`] }));
    lines.push({ line, kind, gaAt, activeUntil, endOfLife, phase, latestVersion: sorted[sorted.length - 1]!.version, notices });
  }
  return lines.sort((a, b) => b.gaAt.localeCompare(a.gaAt));
}

/**
 * Issue every notice whose time has come and that has not gone out yet:
 * once per line, threshold and end-of-life date. Called by the watchdog and
 * on read; idempotent.
 */
export function issueDueNotices(releases: DistributionRelease[], now = Date.now()): { line: string; months: number }[] {
  const out: { line: string; months: number }[] = [];
  const db = ldb();
  for (const l of lifecycleLines(releases, now)) {
    if (l.phase === 'end-of-life') continue;
    for (const n of l.notices) {
      const key = `${l.line}:${n.months}:${l.endOfLife}`;
      if (db.issued[key]) continue;
      // Only the most recent threshold goes out; earlier ones passed before the line existed or the policy changed.
      const latest = l.notices[l.notices.length - 1]!;
      if (n.months !== latest.months) { db.issued[key] = 'superseded'; continue; }
      const at = new Date(now).toISOString();
      db.issued[key] = at;
      recordAudit('system (lifecycle)', 'lifecycle.eol-notice', `Lifecycle:${l.line}`, 'ok', `${n.months} months before end of life ${l.endOfLife.slice(0, 10)}`);
      for (const fn of listeners) fn({ line: l.line, months: n.months, endOfLife: l.endOfLife, at });
      out.push({ line: l.line, months: n.months });
    }
  }
  return out;
}

/** The chamber's warning when the installed line is within the first notice period of its end of life. */
export function lifecycleWarning(n: Pick<SubscribedNation, 'installedVersion'>, releases: DistributionRelease[], now = Date.now()): LifecycleWarning | undefined {
  const lines = lifecycleLines(releases, now);
  const l = lines.find(x => x.line === lineOf(n.installedVersion));
  if (!l) return undefined;
  const pol = ldb().policy;
  const first = Math.max(...pol.noticeMonths);
  const daysLeft = Math.ceil((Date.parse(l.endOfLife) - now) / DAY);
  if (Date.parse(addMonths(l.endOfLife, -first)) > now) return undefined;
  const sorted = [...pol.noticeMonths].sort((a, b) => a - b);
  const level: LifecycleWarning['level'] = daysLeft <= 0 ? 'expired'
    : Date.parse(addMonths(l.endOfLife, -sorted[0]!)) <= now ? 'urgent'
    : sorted[1] !== undefined && Date.parse(addMonths(l.endOfLife, -sorted[1])) <= now ? 'warning' : 'notice';
  const moveTo = lines.find(x => x.phase !== 'end-of-life' && x.gaAt > l.gaAt)?.line; // a newer line, never an older LTS
  return { line: l.line, version: n.installedVersion, endOfLife: l.endOfLife, daysLeft, level, moveTo };
}

const months = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

export function setLifecyclePolicy(input: Partial<LifecyclePolicy> & { by?: string }, knownLines: string[]): LifecyclePolicy | { error: string; status: number } {
  const by = typeof input.by === 'string' ? input.by.trim() : '';
  if (!by) return { error: 'Name who is changing the policy', status: 422 };
  const cur = ldb().policy;
  const next: LifecyclePolicy = structuredClone(cur);
  for (const k of ['standard', 'lts'] as const) {
    const w = input[k];
    if (!w) continue;
    if (!months(w.activeMonths, 1, 60) || !months(w.securityMonths, 0, 120)) return { error: `${k === 'lts' ? 'LTS' : 'Standard'} windows must be whole months (active 1–60, security-only 0–120)`, status: 422 };
    next[k] = { activeMonths: w.activeMonths, securityMonths: w.securityMonths };
  }
  if (next.lts.activeMonths + next.lts.securityMonths < next.standard.activeMonths + next.standard.securityMonths) return { error: 'LTS lines must be supported at least as long as standard lines', status: 422 };
  if (input.noticeMonths) {
    const n = [...new Set(input.noticeMonths)];
    if (!n.length || !n.every(m => months(m, 1, 24))) return { error: 'Notice times must be whole months between 1 and 24', status: 422 };
    next.noticeMonths = n.sort((a, b) => b - a);
  }
  if (input.ltsLines) {
    const bad = input.ltsLines.filter(l => !knownLines.includes(l));
    if (bad.length) return { error: `Unknown release line: ${bad.join(', ')}`, status: 422 };
    next.ltsLines = [...new Set(input.ltsLines)];
  }
  next.updatedAt = new Date().toISOString();
  next.updatedBy = by;
  ldb().policy = next;
  recordAudit(by, 'lifecycle.policy', 'Lifecycle:policy', 'ok',
    `standard ${next.standard.activeMonths}+${next.standard.securityMonths} · LTS ${next.lts.activeMonths}+${next.lts.securityMonths} · notices ${next.noticeMonths.join('/')} · LTS lines ${next.ltsLines.join(',') || 'none'}`);
  return structuredClone(next);
}
