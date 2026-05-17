'use client';

// Domain 7 — Pharmaceutical & Supply Chain Command. National medicine
// logistics: map + supply-chain dense, teal logistics rhythm. Built to
// the benchmark. Distinct from every other domain.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { pharmaSupplyCommand } from '@/lib/gov/health-operations';
import { healthGeo } from '@/lib/gov/health-geo';
import { GeoMap } from '@/apps/_shared/GeoMap';
import { CommandHeader, CommandPanel, KpiSpark, Donut, TrendChart, RingGauge, Sparkline, ACCENT, type Tone } from '@/apps/_shared/SovereignUI';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const C = (t: Tone) => (t === 'info' ? 'rgb(var(--c-link))' : `rgb(var(--c-${t}))`);
const ACC = ACCENT.pharma!;

export function PharmaceuticalSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const s = pharmaSupplyCommand(id, ts);
  const geo = healthGeo(id, ts);
  const [authorised, setAuthorised] = React.useState<Set<string>>(() => new Set());
  const norm = (a: number[]) => { const mn = Math.min(...a), sp = Math.max(...a) - mn || 1; return a.map(v => ((v - mn) / sp) * 100); };

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#05090e', boxShadow: 'inset 0 0 80px rgba(0,0,0,0.65)' }}>
      <CommandHeader index={7} title="Pharmaceutical & Supply Chain Command" subtitle="Active · Predict · Optimize"
        postureLabel={`SC HEALTH · ${s.scHealth}`} postureTone={s.scHealth >= 80 ? 'ok' : s.scHealth >= 60 ? 'warn' : 'alert'}
        now={now} role={role} accent={ACC} />

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
        {s.kpis.map(k => <KpiSpark key={k.label} label={k.label} value={k.value} unit={k.sub} tone={k.tone} points={k.series} />)}
      </div>

      {/* National supply chain map | Inventory availability + Critical shortages */}
      <div className="grid gap-2 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <CommandPanel title="National supply chain map" meta="warehouses · hubs · routes" accent={ACC} live>
            <GeoMap geo={geo} metric="pressure" title="" height={300} />
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[7.5px] uppercase tracking-wider text-ink-muted">
              {['> 80%', '50–80%', '20–50%', '< 20%', 'Stockout'].map((l, i) => (
                <span key={l} className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: ['#3fd6a8', '#f0c33a', '#f0892a', '#e0452a', '#c01020'][i] }} />{l}</span>
              ))}
            </div>
          </CommandPanel>
        </div>
        <CommandPanel title="Inventory availability" meta={`overall ${s.overallAvailabilityPct}%`} accent={ACC}>
          <Donut total={s.overallAvailabilityPct} label="overall"
            segments={s.availability.map(a => ({ label: `${a.band} · ${a.skus}`, value: a.pct, tone: a.tone }))} />
        </CommandPanel>
        <CommandPanel title="Critical shortages" meta={`${s.shortages.length}`} accent={ACC} live>
          <div className="space-y-1.5">
            {s.shortages.map(sh => {
              const done = authorised.has(sh.drug);
              return (
                <div key={sh.drug} className="rounded-[3px] border border-line-soft bg-surface-2/30 px-2 py-1.5" style={{ borderLeft: `3px solid ${C(sh.tone)}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-medium text-ink">{sh.drug}</span>
                    <span className="shrink-0 text-[7.5px] font-bold uppercase" style={{ color: C(sh.tone) }}>{sh.level}</span>
                  </div>
                  <div className="flex items-center justify-between text-[8px] text-ink-muted">
                    <span>{sh.cat} · stock {sh.stock} / req {sh.req}</span>
                    {done ? <span style={{ color: C('ok') }}>✓ reorder</span> : (
                      <button onClick={() => setAuthorised(p => new Set(p).add(sh.drug))} className="focus-ring rounded-[2px] border px-1.5 py-0.5 text-[7.5px] font-bold uppercase" style={{ borderColor: C(sh.tone), color: C(sh.tone) }}>Reorder</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CommandPanel>
      </div>

      {/* Supply vs demand trend */}
      <CommandPanel title="Supply vs demand trend" meta="30 days · demand · supply · stock" accent={ACC} live>
        <TrendChart height={120}
          series={[
            { name: 'Demand', points: norm(s.supplyDemand.demand), tone: 'alert' },
            { name: 'Supply', points: norm(s.supplyDemand.supply), tone: 'ok' },
            { name: 'Stock level', points: norm(s.supplyDemand.stock), tone: 'warn' },
          ]} labels={['Apr 17', 'May 1', 'May 15']} />
      </CommandPanel>

      {/* Movers | Warehouses | Shipments | Suppliers */}
      <div className="grid gap-2 xl:grid-cols-4">
        <CommandPanel title="Top moving items" meta="7 days" accent={ACC}>
          <div className="space-y-1">
            {s.movers.map(m => (
              <div key={m.item} className="flex items-center gap-2 text-[9px]">
                <div className="min-w-0 flex-1"><div className="truncate text-ink-soft">{m.item}</div><div className="text-[7.5px] text-ink-muted">{m.cat}</div></div>
                <span className="font-mono tabular-nums text-ink-muted">{m.movement}</span>
                <Sparkline points={m.trend} tone="ok" width={40} height={12} />
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Warehouse performance" accent={ACC}>
          <div className="space-y-1">
            {s.warehouses.map(w => (
              <div key={w.name} className="flex items-center gap-2 text-[9px]">
                <span className="min-w-0 flex-1 truncate text-ink-soft">{w.name}</span>
                <span className="font-mono tabular-nums text-ink-muted">{w.fillRate}%</span>
                <span className="w-16 shrink-0 text-right text-[7.5px] font-bold uppercase" style={{ color: C(w.tone) }}>{w.health}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Inbound shipments" accent={ACC} live>
          <div className="space-y-1">
            {s.shipments.map(sh => (
              <div key={sh.sid} className="flex items-center gap-2 text-[9px]">
                <span className="font-mono text-ink-muted">{sh.sid}</span>
                <span className="min-w-0 flex-1 truncate text-ink-soft">{sh.supplier}</span>
                <span className="w-14 shrink-0 text-right text-[7.5px] font-bold uppercase" style={{ color: C(sh.tone) }}>{sh.status}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Supplier performance" accent={ACC}>
          <div className="space-y-1">
            {s.suppliers.map(su => (
              <div key={su.name} className="flex items-center gap-2 text-[9px]">
                <span className="min-w-0 flex-1 truncate text-ink-soft">{su.name}</span>
                <span className="font-mono tabular-nums text-ink-muted">{su.onTime}% · Q{su.quality}</span>
                <span className="shrink-0 text-[8px]" style={{ color: C(su.tone) }}>{'★'.repeat(Math.round(su.rating))}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      {/* Demand forecast | Cold chain | AI recommendations */}
      <div className="grid gap-2 xl:grid-cols-3">
        <CommandPanel title="Demand forecast (AI)" meta="historical · forecast · confidence" accent={ACC} live>
          <TrendChart height={104}
            series={[
              { name: 'Historical', points: norm(s.forecast.historical), tone: 'info' },
              { name: 'Forecast', points: norm(s.forecast.forecast), tone: 'warn' },
              { name: 'Confidence', points: norm(s.forecast.band), tone: 'ok' },
            ]} labels={['Apr 17', 'May 15', 'Jun 12']} />
          <div className="mt-1 space-y-0.5">
            {s.forecast.highDemand.map((h, i) => (
              <div key={h.item} className="flex items-center gap-2 text-[9px]">
                <span className="w-3 text-center text-ink-muted">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-ink-soft">{h.item}</span>
                <span className="font-mono tabular-nums" style={{ color: C('alert') }}>↑{h.pct}%</span>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Cold chain monitoring" meta={`${s.coldChain.compliancePct}% compliance`} accent={ACC} live>
          <div className="flex items-center gap-3">
            <RingGauge value={s.coldChain.compliancePct} label="compliant" tone={s.coldChain.compliancePct >= 95 ? 'ok' : 'warn'} size={80} sub="%" />
            <div className="min-w-0 flex-1 space-y-1 text-[9px]">
              <div className="flex items-center justify-between"><span style={{ color: C('ok') }}>● Within range</span><span className="font-mono text-ink-muted">{s.coldChain.withinRange.toLocaleString()}</span></div>
              <div className="flex items-center justify-between"><span style={{ color: C('warn') }}>● Warning</span><span className="font-mono text-ink-muted">{s.coldChain.warning}</span></div>
              <div className="flex items-center justify-between"><span style={{ color: C('alert') }}>● Breach</span><span className="font-mono text-ink-muted">{s.coldChain.breach}</span></div>
              <div className="mt-1 space-y-0.5 border-t border-line-soft pt-1">
                {s.coldChain.nodes.map(n => (
                  <div key={n.node} className="flex items-center justify-between text-[8px]"><span className="text-ink-soft">{n.node}</span><span style={{ color: C(n.tone) }}>{n.tempC}°C · {n.status}</span></div>
                ))}
              </div>
            </div>
          </div>
        </CommandPanel>
        <CommandPanel title="AI recommendations" meta={`${s.recommendations.length}`} accent={ACC} live>
          <div className="space-y-1">
            {s.recommendations.map(r => (
              <div key={r.text} className="rounded-[3px] border border-line-soft bg-surface-2/30 px-2 py-1" style={{ borderLeft: `3px solid ${C(r.tone)}` }}>
                <div className="text-[9.5px] font-medium text-ink">{r.text}</div>
                <div className="text-[8px] text-ink-muted">{r.sub}</div>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      <RuntimeQueue
        scope={`${id}:pharma`}
        kind="procurement"
        title="Pharmaceutical supply runtime — requisition → sourced → contracted → delivered"
        by="Supply Officer"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
