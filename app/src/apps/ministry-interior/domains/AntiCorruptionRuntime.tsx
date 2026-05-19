'use client';

// Interior Sovereign Runtime — Anti-Corruption Execution Layer. Detects
// deliberate file delay (the bribery-solicitation signature): invisible
// delay, unauthorized holds, unlawful pauses, reassignment & officer
// anomalies. Surfaces the obstruction chain immutably — it cannot be
// hidden at the agency level.

import * as React from 'react';
import { observabilityLedger, AGENCY_LABEL, AGENCIES } from '@/lib/gov/sovereign-observability';

const RISK = (r: number) => (r >= 65 ? 'rgb(var(--c-alert))' : r >= 40 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))');

const FLAG_LABEL: Record<string, string> = {
  'invisible-delay': 'INVISIBLE DELAY',
  'unauthorized-hold': 'UNAUTHORIZED HOLD',
  'unlawful-pause': 'UNLAWFUL PAUSE',
  'reassignment-anomaly': 'REASSIGNMENT ANOMALY',
  'officer-anomaly': 'OFFICER ANOMALY',
  'queue-stagnation': 'QUEUE STAGNATION',
};

export function AntiCorruptionRuntime({ id, now }: { id: string; now: number }) {
  void id;
  const txns = observabilityLedger(now);
  const flagged = txns.filter(t => t.riskFlags.length > 0).sort((a, b) => b.corruptionRisk - a.corruptionRisk);

  // Institution-wide delay/obstruction heat.
  const agencyHeat = AGENCIES.map(agency => {
    const a = txns.filter(t => t.agency === agency);
    const obstructed = a.filter(t => t.riskFlags.length > 0);
    return {
      agency,
      obstructed: obstructed.length,
      meanRisk: obstructed.length ? Math.round(obstructed.reduce((s, t) => s + t.corruptionRisk, 0) / obstructed.length) : 0,
    };
  }).filter(x => x.obstructed > 0).sort((x, y) => y.meanRisk - x.meanRisk);

  const flagTotals = Object.keys(FLAG_LABEL).map(f => ({
    f, n: txns.filter(t => (t.riskFlags as string[]).includes(f)).length,
  })).sort((a, b) => b.n - a.n);

  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/30">
        {flagTotals.map(ft => (
          <div key={ft.f} className="min-w-[140px] flex-1 px-2 py-1.5">
            <div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">{FLAG_LABEL[ft.f]}</div>
            <div className="mt-0.5 text-[16px] font-semibold tabular-nums" style={{ color: ft.n ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{ft.n}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[280px_1fr]">
        <div>
          <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Institution obstruction heat</div>
          <div className="border border-line">
            {agencyHeat.length === 0 ? (
              <p className="px-2 py-2 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>No obstruction signatures detected this epoch.</p>
            ) : agencyHeat.map(a => (
              <div key={a.agency} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
                <span className="w-32 shrink-0 truncate text-ink">{AGENCY_LABEL[a.agency]}</span>
                <div className="relative h-2 min-w-0 flex-1 bg-surface-2">
                  <span className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, a.meanRisk)}%`, background: RISK(a.meanRisk) }} />
                </div>
                <span className="w-8 shrink-0 text-right tabular-nums text-ink-muted">{a.obstructed}</span>
                <span className="w-10 shrink-0 text-right tabular-nums" style={{ color: RISK(a.meanRisk) }}>{a.meanRisk}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Immutable obstruction trail — officer & chain exposed</div>
          <div className="border border-line">
            <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              <span className="w-16 shrink-0">File</span>
              <span className="w-28 shrink-0">Agency</span>
              <span className="w-24 shrink-0">Officer</span>
              <span className="w-16 shrink-0">Age</span>
              <span className="w-10 shrink-0">Risk</span>
              <span className="min-w-0 flex-1">Obstruction signatures</span>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {flagged.length === 0 ? (
                <p className="px-2 py-2 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>Clean — no files exhibit obstruction signatures.</p>
              ) : flagged.slice(0, 50).map(t => (
                <div key={t.id} className="flex items-center gap-2 border-b border-line/50 px-2 py-1 text-[10px] last:border-0">
                  <span className="w-16 shrink-0 truncate tabular-nums text-ink-muted">{t.id}</span>
                  <span className="w-28 shrink-0 truncate text-ink">{AGENCY_LABEL[t.agency]}</span>
                  <span className="w-24 shrink-0 truncate text-ink-soft">{t.officer}</span>
                  <span className="w-16 shrink-0 tabular-nums text-ink-muted">{t.ageHrs}h</span>
                  <span className="w-10 shrink-0 font-semibold tabular-nums" style={{ color: RISK(t.corruptionRisk) }}>{t.corruptionRisk}</span>
                  <span className="flex min-w-0 flex-1 flex-wrap gap-1">
                    {t.riskFlags.map(f => (
                      <span key={f} className="border px-1 text-[8px] uppercase tracking-[0.08em]" style={{ borderColor: 'rgb(var(--c-alert))', color: 'rgb(var(--c-alert))' }}>{FLAG_LABEL[f]}</span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Obstruction signatures propagate to ministry oversight and the national coordination layer with an immutable
        audit trail — an agency cannot intentionally delay a file to solicit a bribe without exposing the office, officer and timing chain.
      </p>
    </div>
  );
}
