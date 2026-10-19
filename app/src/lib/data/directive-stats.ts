// Directive (governance output) statistics and weekly trend, computed from the
// platform's directives register (lib/data/directives.ts; architecture review
// D8). They replace the substrate's civicos_directive_stats and
// civicos_directive_trend for every screen and the open-data feed: those SQL
// functions read civicos.directives, which is only a mirror of the register.
// Same definitions as the SQL (migrations 20260521800000 and 20260521810000):
// only signed directives count, so drafts never leak; aggregate-only.
//
// Pure functions over directive rows, so the browser bundle never pulls in the
// register's store; the server routes pass the register's rows in.

import type { DirectiveRow } from '@/lib/db/types';
import type { Signal } from '@/lib/twin/signal';

export interface DirectiveStat {
  charterId: string;
  signed: number;
  effective: number;
  inForce: number;
  rescinded: number;
  medianSignToEffectiveDays: number | null;
}

export interface DirectiveTrendPoint {
  weekStart: string;
  signed: number;
  effective: number;
  medianSignToEffectiveDays: number | null;
}

/** Where these figures come from (lib/twin/signal.ts): the platform's own register, so "reported". */
export const DIRECTIVE_STATS_SOURCE = 'Directives register (platform, /api/directives)';
export function directiveStatsSignal(asOf: string): Pick<Signal, 'kind' | 'source' | 'asOf'> {
  return { kind: 'reported', source: DIRECTIVE_STATS_SOURCE, asOf };
}

const DAY = 86_400_000;
const t = (iso: string | null): number | null => (iso ? Date.parse(iso) : null);

/** percentile_cont(0.5), rounded to one decimal as round(numeric, 1) does. */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) / 2;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  const v = s[lo]! + (s[hi]! - s[lo]!) * (pos - lo);
  return Math.sign(v) * Math.round(Math.abs(v) * 10) / 10;
}

const lagDays = (r: DirectiveRow): number | null => {
  const s = t(r.signed_at), e = t(r.effective_at);
  return s === null || e === null ? null : (e - s) / DAY;
};

/** Monday 00:00 UTC of the week holding `ms` (date_trunc('week', …) in UTC). */
function weekStart(ms: number): number {
  const d = new Date(ms);
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return midnight - ((d.getUTCDay() + 6) % 7) * DAY;
}

/**
 * Per issuing charter over the last `days` (by signed date, 1–1825, default
 * 365): signed, reached effect, in force now, rescinded, median signed→effective
 * lag in days. Most signed first.
 */
export function directiveStatsOf(rows: DirectiveRow[], opts: { charterId?: string; days?: number; now?: Date } = {}): DirectiveStat[] {
  const now = (opts.now ?? new Date()).getTime();
  const days = Math.max(1, Math.min(Math.trunc(opts.days ?? 365) || 365, 1825));
  const from = now - days * DAY;
  const groups = new Map<string, DirectiveRow[]>();
  for (const r of rows) {
    const s = t(r.signed_at);
    if (s === null || s < from) continue;
    if (opts.charterId && r.issued_by_charter_id !== opts.charterId) continue;
    const list = groups.get(r.issued_by_charter_id) ?? [];
    list.push(r);
    groups.set(r.issued_by_charter_id, list);
  }
  return [...groups.entries()].map(([charterId, list]) => ({
    charterId,
    signed: list.length,
    effective: list.filter(r => r.effective_at).length,
    inForce: list.filter(r => r.effective_at && t(r.effective_at)! <= now && !r.rescinded_at).length,
    rescinded: list.filter(r => r.rescinded_at).length,
    medianSignToEffectiveDays: median(list.map(lagDays).filter((v): v is number => v !== null)),
  })).sort((a, b) => b.signed - a.signed || a.charterId.localeCompare(b.charterId));
}

/**
 * Weekly trend over the last `weeks` (1–104, default 12), bucketed by the
 * week each directive was signed, oldest first; weeks with no signature are
 * absent, as in the SQL.
 */
export function directiveTrendOf(rows: DirectiveRow[], opts: { charterId?: string; weeks?: number; now?: Date } = {}): DirectiveTrendPoint[] {
  const now = (opts.now ?? new Date()).getTime();
  const weeks = Math.max(1, Math.min(Math.trunc(opts.weeks ?? 12) || 12, 104));
  const from = weekStart(now) - (weeks - 1) * 7 * DAY;
  const buckets = new Map<number, DirectiveRow[]>();
  for (const r of rows) {
    const s = t(r.signed_at);
    if (s === null || s < from) continue;
    if (opts.charterId && r.issued_by_charter_id !== opts.charterId) continue;
    const w = weekStart(s);
    const list = buckets.get(w) ?? [];
    list.push(r);
    buckets.set(w, list);
  }
  return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([w, list]) => ({
    weekStart: new Date(w).toISOString().slice(0, 10),
    signed: list.length,
    effective: list.filter(r => r.effective_at).length,
    medianSignToEffectiveDays: median(list.map(lagDays).filter((v): v is number => v !== null)),
  }));
}
