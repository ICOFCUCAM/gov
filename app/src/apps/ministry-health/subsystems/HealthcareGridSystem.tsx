'use client';

// apps/ministry-health/subsystems/HealthcareGridSystem — Layer 1 National
// Healthcare Grid: the complete national asset register with live
// telemetry (hospitals/clinics/labs/ambulances/pharmacies/blood banks/
// warehouses) + regional rollup. Multi-role aware.

import * as React from 'react';
import { StatGrid, Bars, Panel, PosturePill, ac } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { nationalHealthcareGrid } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function HealthcareGridSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const g = nationalHealthcareGrid(id, ts);
  const pTone: 'ok' | 'warn' | 'alert' = g.posture === 'critical' ? 'alert' : g.posture === 'degraded' ? 'warn' : 'ok';
  const adv = aiAdvisory('National Healthcare Grid', [
    { label: 'Offline assets', value: Math.min(100, 100 - g.onlinePct + 5), adverse: true },
    { label: 'Degraded classes', value: Math.min(100, g.classes.filter(c => c.tone === 'alert').length * 30), adverse: true },
    { label: 'Warehouse stock', value: Math.max(0, 100 - g.warehouseStockPct), adverse: true },
    { label: 'Blood reserve', value: Math.max(0, 100 - g.bloodUnitsAvailable / 480), adverse: true },
  ]);
  const at: 'ok' | 'warn' | 'alert' = adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-line bg-surface px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">National Healthcare Grid</span>
        <PosturePill label={g.posture} tone={pTone} />
        <span className="text-[9px] text-ink-muted">{g.totalAssets.toLocaleString()} assets · <span style={{ color: ac(g.onlinePct >= 92 ? 'ok' : 'warn') }}>{g.onlinePct}% online</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">operator · {role}</span>
      </div>

      <StatGrid items={[
        { l: 'Total assets', v: g.totalAssets.toLocaleString(), t: 'ok' },
        { l: 'Online', v: `${g.onlinePct}%`, t: g.onlinePct >= 92 ? 'ok' : g.onlinePct >= 82 ? 'warn' : 'alert' },
        { l: 'Degraded', v: g.degradedAssets.toLocaleString(), t: g.degradedAssets > 800 ? 'alert' : g.degradedAssets > 300 ? 'warn' : 'ok' },
        { l: 'Blood units', v: g.bloodUnitsAvailable.toLocaleString(), t: g.bloodUnitsAvailable < 8000 ? 'alert' : g.bloodUnitsAvailable < 16000 ? 'warn' : 'ok' },
        { l: 'Warehouse stock', v: `${g.warehouseStockPct}%`, t: g.warehouseStockPct >= 75 ? 'ok' : g.warehouseStockPct >= 55 ? 'warn' : 'alert' },
        { l: 'Asset classes', v: `${g.classes.length}`, t: 'ok' },
      ]} />

      <div className="rounded-[3px] border border-line bg-surface p-2" style={{ borderLeft: `3px solid ${ac(at)}` }}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: ac(at) }}>AI grid-resilience intelligence · {adv.severity}</div>
        <div className="mt-0.5 text-[10px] text-ink">{adv.headline}</div>
        <ul className="mt-0.5 flex flex-wrap gap-x-4">{adv.recommended.map((r, i) => <li key={i} className="text-[9px] text-ink-soft">▸ {r}</li>)}</ul>
      </div>

      <Panel title="Asset register & live telemetry" meta="class · online/total · utilisation · degraded">
        <div className="space-y-1">
          {g.classes.map(c => (
            <div key={c.kind} className="flex items-center gap-2 text-[10px]">
              <span className="w-32 shrink-0 truncate text-ink">{c.kind}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${Math.round((c.online / c.total) * 100)}%`, backgroundColor: ac(c.tone) }} /></div>
              <span className="w-36 shrink-0 text-right font-mono tabular-nums text-ink-muted">{c.online.toLocaleString()}/{c.total.toLocaleString()} · {c.utilisationPct}%</span>
              <span className="w-16 shrink-0 text-right font-mono tabular-nums" style={{ color: ac(c.tone) }}>{c.degraded} down</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Regional grid availability" meta="region · assets · online% (worst-first)">
        <Bars rows={g.regions.map(r => ({ label: `${r.region} (${r.assets.toLocaleString()})`, pct: r.onlinePct, tone: r.tone, tail: `${r.onlinePct}%` }))} />
      </Panel>

      <RuntimeQueue
        scope={`${id}:grid`}
        kind="case"
        title="Grid operations runtime — register → telemeter → remediate → restore"
        by="Grid Operations"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
