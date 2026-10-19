import { describe, it, expect } from 'vitest';
import { directiveStatsOf, directiveTrendOf, directiveStatsSignal } from './directive-stats';
import type { DirectiveRow } from '@/lib/db/types';

const now = new Date('2026-05-14T12:00:00Z'); // a Thursday
const day = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
let n = 0;
function row(charter: string, signedDaysAgo: number | null, o: { effectiveAfterDays?: number; rescinded?: boolean } = {}): DirectiveRow {
  const signed = signedDaysAgo === null ? null : now.getTime() - signedDaysAgo * day;
  const effective = signed !== null && o.effectiveAfterDays !== undefined ? signed + o.effectiveAfterDays * day : null;
  return {
    id: `id-${++n}`, ref: `DIR-${n}`, kind: 'policy', issued_by_charter_id: charter, issued_by_name: null, title: 't', citation: null,
    status: o.rescinded ? 'rescinded' : signed === null ? 'drafting' : 'signed', targets: [], payload: {},
    signed_at: signed === null ? null : iso(signed), signed_by_id: null,
    effective_at: effective === null ? null : iso(effective), rescinded_at: o.rescinded ? iso(now.getTime() - day) : null,
    created_at: iso(now.getTime() - 400 * day), updated_at: iso(now.getTime()),
  };
}

describe('directiveStatsOf (the substrate directive_stats definitions, over the platform register)', () => {
  const rows = [
    row('presidency', 10, { effectiveAfterDays: 2 }),
    row('presidency', 20, { effectiveAfterDays: 4, rescinded: true }),
    row('presidency', 5, { effectiveAfterDays: 30 }), // effective in the future: not in force
    row('presidency', 400),                             // outside the year
    row('presidency', null),                            // draft: never counted
    row('senate', 1),
  ];

  it('counts signed, effective, in force and rescinded per charter, most signed first', () => {
    const out = directiveStatsOf(rows, { now });
    expect(out.map(s => s.charterId)).toEqual(['presidency', 'senate']);
    expect(out[0]).toEqual({ charterId: 'presidency', signed: 3, effective: 3, inForce: 1, rescinded: 1, medianSignToEffectiveDays: 4 });
    expect(out[1]).toEqual({ charterId: 'senate', signed: 1, effective: 0, inForce: 0, rescinded: 0, medianSignToEffectiveDays: null });
  });

  it('interpolates the median like percentile_cont and rounds to one decimal', () => {
    const out = directiveStatsOf([row('x', 3, { effectiveAfterDays: 1 }), row('x', 4, { effectiveAfterDays: 2.25 })], { now });
    expect(out[0]!.medianSignToEffectiveDays).toBe(1.6);
  });

  it('scopes to a charter and clamps the window', () => {
    expect(directiveStatsOf(rows, { now, charterId: 'senate' }).map(s => s.charterId)).toEqual(['senate']);
    expect(directiveStatsOf(rows, { now, days: 99_999 })[0]!.signed).toBe(4);
  });
});

describe('directiveTrendOf', () => {
  it('buckets by the Monday of the signed week, oldest first, within the window', () => {
    const rows = [row('p', 0, { effectiveAfterDays: 1 }), row('p', 1), row('p', 8), row('p', 200)];
    const out = directiveTrendOf(rows, { now, weeks: 12 });
    expect(out).toEqual([
      { weekStart: '2026-05-04', signed: 1, effective: 0, medianSignToEffectiveDays: null },
      { weekStart: '2026-05-11', signed: 2, effective: 1, medianSignToEffectiveDays: 1 },
    ]);
    expect(directiveTrendOf(rows, { now, weeks: 1 }).map(p => p.weekStart)).toEqual(['2026-05-11']);
  });
});

describe('directiveStatsSignal', () => {
  it('marks the figures as reported by the platform register', () => {
    expect(directiveStatsSignal('2026-05-14T12:00:00Z')).toEqual({ kind: 'reported', source: expect.stringContaining('Directives register'), asOf: '2026-05-14T12:00:00Z' });
  });
});
