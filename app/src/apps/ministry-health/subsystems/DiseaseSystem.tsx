'use client';

// Domain 5 — Disease Intelligence Command. The epidemiology war-room:
// map-dominant, intelligence-heavy. Amber/red command rhythm, distinct
// from every other domain.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { diseaseCommandView } from '@/lib/gov/health-operations';
import { healthGeo } from '@/lib/gov/health-geo';
import { GeoMap } from '@/apps/_shared/GeoMap';
import { CommandHeader, CommandPanel, KpiSpark, Donut, TrendChart, ACCENT, type Tone } from '@/apps/_shared/SovereignUI';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const C = (t: Tone) => (t === 'info' ? 'rgb(var(--c-link))' : `rgb(var(--c-${t}))`);
const ACC = ACCENT.disease!;
const LAYERS = ['Heatmap', 'Clusters', 'Hospitals', 'Mobility', 'Testing', 'Vaccination'];

export function DiseaseSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const d = diseaseCommandView(id, ts);
  const geo = healthGeo(id, ts);
  const [layer, setLayer] = React.useState('Heatmap');
  const [win, setWin] = React.useState('7D');
  const norm = (s: number[]) => { const mn = Math.min(...s), sp = Math.max(...s) - mn || 1; return s.map(v => ((v - mn) / sp) * 100); };

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#05080e', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.7)' }}>
      <CommandHeader index={5} title="Disease Intelligence Command" subtitle="Predict · Detect · Prevent"
        postureLabel={`Rt · ${d.kpis[2]!.value}`} postureTone={Number(d.kpis[2]!.value) > 1.2 ? 'alert' : Number(d.kpis[2]!.value) > 1 ? 'warn' : 'ok'}
        now={now} role={role} accent={ACC} />

      {/* KPI epidemic telemetry */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
        {d.kpis.map(k => (
          <KpiSpark key={k.label} label={k.label} value={k.value} unit={k.sub} tone={k.tone}
            points={k.series} />
        ))}
      </div>

      {/* National outbreak map | Epidemic curve + age donut */}
      <div className="grid gap-2 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CommandPanel title="National outbreak map" meta={`active cases · ${win}`} accent={ACC} live>
            <div className="mb-1.5 flex flex-wrap items-center gap-1">
              {LAYERS.map(l => (
                <button key={l} onClick={() => setLayer(l)}
                  className="focus-ring rounded-[3px] border px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wider transition-colors"
                  style={{ borderColor: layer === l ? ACC : 'color-mix(in srgb,#1d2a36 70%,transparent)', color: layer === l ? ACC : 'rgb(var(--c-ink-muted))' }}>{l}</button>
              ))}
              <div className="ml-auto flex gap-0.5">
                {['7D', '30D', '90D', '1Y'].map(wv => (
                  <button key={wv} onClick={() => setWin(wv)}
                    className="focus-ring rounded-[3px] px-1.5 py-0.5 text-[8px] font-bold tabular-nums transition-colors"
                    style={{ background: win === wv ? ACC : 'transparent', color: win === wv ? '#100a02' : 'rgb(var(--c-ink-muted))' }}>{wv}</button>
                ))}
              </div>
            </div>
            <GeoMap geo={geo} metric="outbreakHeat" title="" height={300} />
            <div className="mt-1 flex items-center gap-1 text-[7px] text-ink-muted">
              <span>0</span>
              {['#1f6f4a', '#9bbf3a', '#f0c33a', '#f0892a', '#e0452a', '#c01020'].map((c, i) => <span key={i} className="h-2 flex-1 rounded-sm" style={{ background: c }} />)}
              <span>10K+</span>
            </div>
          </CommandPanel>
        </div>
        <div className="space-y-2">
          <CommandPanel title="Epidemic curve" meta="new cases · 7-day avg" accent={ACC} live>
            <TrendChart height={104}
              series={[
                { name: 'New cases', points: norm(d.epidemicCurve.cases), tone: 'alert' },
                { name: '7-day avg', points: norm(d.epidemicCurve.avg), tone: 'warn' },
              ]}
              labels={['Apr 19', 'May 3', 'May 16']} />
          </CommandPanel>
          <CommandPanel title="Cases by age group" meta={`${d.totalCases.toLocaleString()} total`} accent={ACC}>
            <Donut total={d.totalCases} label="cases"
              segments={d.ageGroups.map(a => ({ label: `${a.band} (${a.pct}%)`, value: a.count, tone: a.tone }))} />
          </CommandPanel>
        </div>
      </div>

      {/* Top regions | Variants | Intervention impact | Mobility */}
      <div className="grid gap-2 xl:grid-cols-4">
        <CommandPanel title="Top regions by active cases" meta="incidence /100K" accent={ACC}>
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_auto_46px_auto] gap-x-2 px-1 text-[7px] font-bold uppercase tracking-wider text-ink-muted">
              <span>Region</span><span>Active</span><span>Trend</span><span>Inc</span>
            </div>
            {d.topRegions.map(r => (
              <div key={r.region} className="grid grid-cols-[1fr_auto_46px_auto] items-center gap-x-2 px-1 text-[9px]">
                <span className="truncate text-ink-soft">{r.region}</span>
                <span className="font-mono tabular-nums text-ink-muted">{r.active.toLocaleString()}</span>
                <svg width="46" height="14" viewBox="0 0 46 14"><polyline points={r.trend.map((v, i) => `${(i / (r.trend.length - 1)) * 46},${14 - v}`).join(' ')} fill="none" stroke={C(r.tone)} strokeWidth="1.1" /></svg>
                <span className="text-right font-mono tabular-nums" style={{ color: C(r.tone) }}>{r.incidence}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Variant distribution" meta={`${d.totalCases.toLocaleString()} samples`} accent={ACC}>
          <Donut total={d.totalCases} label="samples"
            segments={d.variants.map(v => ({ label: `${v.name} ${v.pct}%`, value: Math.round(d.totalCases * v.pct / 100), tone: v.tone }))} />
        </CommandPanel>
        <CommandPanel title="Intervention impact" meta="Rₜ change" accent={ACC}>
          <div className="space-y-1">
            {d.interventions.map(iv => (
              <div key={iv.name} className="flex items-center gap-2 text-[9.5px]">
                <span className="min-w-0 flex-1 truncate text-ink-soft">{iv.name}</span>
                <span className="font-mono tabular-nums" style={{ color: C('ok') }}>{iv.rtChange}</span>
                <span className="w-16 shrink-0 text-right text-[7.5px] font-bold uppercase" style={{ color: C(iv.tone) }}>{iv.impact}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Mobility impact" meta="vs baseline" accent={ACC}>
          <div className="space-y-1.5">
            {d.mobility.map(m => (
              <div key={m.category} className="flex items-center gap-2 text-[9.5px]">
                <span className="min-w-0 flex-1 truncate text-ink-soft">{m.category}</span>
                <span className="font-mono tabular-nums" style={{ color: C(m.tone) }}>{m.pct > 0 ? '+' : ''}{m.pct}% {m.up ? '↑' : '↓'}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      {/* Predictive outlook | Early warning signals */}
      <div className="grid gap-2 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CommandPanel title="Predictive outlook" meta={`${d.predictive.model} · confidence ${d.predictive.confidence}`} accent={ACC} live>
            <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
              <div className="space-y-1 text-[10px]">
                <div><span className="text-ink-muted">Peak cases</span><div className="font-semibold" style={{ color: C('alert') }}>{d.predictive.peakDate} <span className="text-[8px] text-ink-muted">{d.predictive.peakBand}</span></div></div>
                <div><span className="text-ink-muted">Projected peak</span><div className="font-mono tabular-nums text-ink">{d.predictive.peakPerDay.toLocaleString()} / day</div></div>
                <div><span className="text-ink-muted">Total projected</span><div className="font-mono tabular-nums text-ink">{d.predictive.totalLow}K – {d.predictive.totalHigh}K</div></div>
              </div>
              <div>
                <TrendChart height={110}
                  series={[
                    { name: 'Observed', points: norm([...d.predictive.observed, ...d.predictive.best.slice(0, 1)]), tone: 'info' },
                    { name: 'Projected (best)', points: norm(d.predictive.best), tone: 'ok' },
                    { name: 'Projected (worst)', points: norm(d.predictive.worst), tone: 'alert' },
                  ]}
                  labels={['May 1', 'May 22', 'Jun 12']} />
              </div>
            </div>
            <div className="mt-1.5 rounded-[3px] border px-2 py-1 text-[9px] text-ink-soft" style={{ borderColor: `color-mix(in srgb,${ACC} 35%,transparent)` }}>
              <span style={{ color: ACC }}>Key insight ▸ </span>{d.predictive.insight}
            </div>
          </CommandPanel>
        </div>
        <CommandPanel title="Early warning signals" meta={`${d.warnings.length}`} accent={ACC} live>
          <div className="space-y-1">
            {d.warnings.map(w => (
              <div key={w.signal} className="flex items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/30 px-2 py-1" style={{ borderLeft: `3px solid ${C(w.tone)}` }}>
                <span className="min-w-0 flex-1 text-[9px] text-ink-soft">{w.signal}</span>
                <span className="shrink-0 text-[7.5px] font-bold uppercase" style={{ color: C(w.tone) }}>{w.level}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      <RuntimeQueue
        scope={`${id}:disease`}
        kind="incident"
        title="Outbreak response runtime — detect → investigate → contain → stand-down"
        by="Epidemiologist"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
