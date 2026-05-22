'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import {
  serviceSlaStats, appealsStats, directiveStats, consentFootprintStats,
  type ServiceSlaStat, type AppealsStat, type DirectiveStat, type ConsentFootprintStat,
} from '@/lib/db/repos/institutions';
import { substrateAvailable } from '@/lib/db/client';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';
import { SurfaceHeading } from '@/components/ui/SurfaceHeading';
import { buildCsv, downloadCsv } from '@/lib/csv-download';
import { FilterChips } from '@/components/ui/FilterChips';

/**
 * AccountabilityScoreboard — one row per charter, merging the four public
 * accountability aggregates (service delivery, contestation, governance
 * output, data-access footprint) into a single sortable operator view. Each
 * source already exists on the Observatory / charter profile as its own
 * panel; this is the cross-charter scoreboard operators lacked.
 */

interface Row {
  charterId: string;
  slaOpen: number;
  slaMedianResolveHours: number | null;
  appealsPending: number;
  appealsMedianDays: number | null;
  directivesInForce: number;
  consentActive: number;
}

type SortKey = 'charter' | 'open' | 'pending' | 'in_force' | 'consent';

export function AccountabilityScoreboard() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<SortKey>('open');
  const available = substrateAvailable();

  React.useEffect(() => {
    if (!available) return;
    setLoading(true);
    void (async () => {
      try {
        const [sla, appeals, directives, footprint]: [
          ServiceSlaStat[], AppealsStat[], DirectiveStat[], ConsentFootprintStat[],
        ] = await Promise.all([
          serviceSlaStats({ days: 90 }),
          appealsStats({ days: 90 }),
          directiveStats({ days: 365 }),
          consentFootprintStats(),
        ]);
        const byCharter = new Map<string, Row>();
        const get = (id: string): Row => {
          let r = byCharter.get(id);
          if (!r) {
            r = { charterId: id, slaOpen: 0, slaMedianResolveHours: null, appealsPending: 0, appealsMedianDays: null, directivesInForce: 0, consentActive: 0 };
            byCharter.set(id, r);
          }
          return r;
        };
        for (const s of sla) { const r = get(s.charterId); r.slaOpen = s.open; r.slaMedianResolveHours = s.medianResolveHours; }
        for (const a of appeals) { const r = get(a.charterId); r.appealsPending = a.pending; r.appealsMedianDays = a.medianDecisionDays; }
        for (const d of directives) { const r = get(d.charterId); r.directivesInForce = d.inForce; }
        for (const f of footprint) { const r = get(f.charterId); r.consentActive += f.active; }
        setRows([...byCharter.values()]);
      } finally {
        setLoading(false);
      }
    })();
  }, [available]);

  if (!available) return <SubstrateNotConfigured title="Accountability Scoreboard" />;

  const sorted = [...rows].sort((a, b) =>
    sortBy === 'charter' ? a.charterId.localeCompare(b.charterId)
    : sortBy === 'open' ? b.slaOpen - a.slaOpen
    : sortBy === 'pending' ? b.appealsPending - a.appealsPending
    : sortBy === 'in_force' ? b.directivesInForce - a.directivesInForce
    : b.consentActive - a.consentActive);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <SurfaceHeading title="Accountability Scoreboard" badge="cross-charter · aggregate" />
        <button type="button"
          onClick={() => downloadCsv('civicos-accountability-scoreboard', buildCsv(
            ['charter_id','sla_open','sla_median_resolve_hours','appeals_pending','appeals_median_days','directives_in_force','consent_active'],
            sorted.map(r => [r.charterId, r.slaOpen, r.slaMedianResolveHours ?? '', r.appealsPending, r.appealsMedianDays ?? '', r.directivesInForce, r.consentActive]),
          ))}
          className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink">
          csv
        </button>
      </div>

      <p className="text-[10px] text-ink-muted">
        Service delivery + contestation over the last 90 days; governance output over 365 days;
        data-access footprint current. Each metric is also broken out on the
        <Link href="/public" className="text-link underline"> Public Observatory</Link> and per-charter profiles.
      </p>

      <FilterChips label="sort:"
        options={['open','pending','in_force','consent','charter'] as const}
        value={sortBy} onChange={setSortBy}
        format={k => k === 'in_force' ? 'in force' : k} />

      <Panel title="Charters" meta={`${rows.length}`} bodyClass="!p-0">
        {rows.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">{loading ? 'Loading…' : 'No charter activity on record.'}</p>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            <div className="flex items-center gap-2 border-b border-line px-3 py-1 text-[8.5px] font-bold uppercase tracking-wider text-ink-muted">
              <span className="min-w-0 flex-1">charter</span>
              <span className="w-20 shrink-0 text-right">open req</span>
              <span className="w-24 shrink-0 text-right">med resolve</span>
              <span className="w-24 shrink-0 text-right">appeals pend</span>
              <span className="w-24 shrink-0 text-right">directives</span>
              <span className="w-24 shrink-0 text-right">consents</span>
            </div>
            {sorted.map(r => (
              <div key={r.charterId} className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 font-mono text-[10px]">
                <Link href={`/public/charter/${encodeURIComponent(r.charterId)}`} className="min-w-0 flex-1 truncate text-link hover:underline">{r.charterId}</Link>
                <span className="w-20 shrink-0 text-right" style={{ color: r.slaOpen > 0 ? TONE.warn : TONE.ok }}>{r.slaOpen}</span>
                <span className="w-24 shrink-0 text-right text-ink-muted">{r.slaMedianResolveHours == null ? '—' : `${r.slaMedianResolveHours}h`}</span>
                <span className="w-24 shrink-0 text-right" style={{ color: r.appealsPending > 0 ? TONE.warn : TONE.ok }}>{r.appealsPending}</span>
                <span className="w-24 shrink-0 text-right text-ink">{r.directivesInForce}</span>
                <span className="w-24 shrink-0 text-right text-ink-muted">{r.consentActive}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
