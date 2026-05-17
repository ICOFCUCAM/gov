'use client';

// Domain — National Healthcare Grid. The complete national asset register
// with live telemetry (hospitals/clinics/labs/ambulances/pharmacies/blood
// banks/warehouses) + regional rollup. Cinematic sovereign command.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { nationalHealthcareGrid } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import { CommandPanel, type Tone } from '@/apps/_shared/SovereignUI';
import { OpsHeader, KpiStrip, BarPanel, AdvisoryPanel } from '@/apps/ministry-health/subsystems/_ops';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const ACC = '#37c7d4';

export function HealthcareGridSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const g = nationalHealthcareGrid(id, ts);
  const pTone: Tone = g.posture === 'critical' ? 'alert' : g.posture === 'degraded' ? 'warn' : 'ok';
  const adv = aiAdvisory('National Healthcare Grid', [
    { label: 'Offline assets', value: Math.min(100, 100 - g.onlinePct + 5), adverse: true },
    { label: 'Degraded classes', value: Math.min(100, g.classes.filter(c => c.tone === 'alert').length * 30), adverse: true },
    { label: 'Warehouse stock', value: Math.max(0, 100 - g.warehouseStockPct), adverse: true },
    { label: 'Blood reserve', value: Math.max(0, 100 - g.bloodUnitsAvailable / 480), adverse: true },
  ]);

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#030712', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={10} title="National Healthcare Grid" subtitle="National Asset Register · Live Telemetry"
        posture={g.posture} tone={pTone} now={now} role={role} accent={ACC} />

      <KpiStrip ts={ts} accent={ACC} items={[
        { l: 'Total Assets', v: g.totalAssets.toLocaleString(), s: 'registered', t: 'ok', k: 'gta' },
        { l: 'Online', v: `${g.onlinePct}%`, s: 'national', t: g.onlinePct >= 92 ? 'ok' : g.onlinePct >= 82 ? 'warn' : 'alert', k: 'gon' },
        { l: 'Degraded', v: g.degradedAssets.toLocaleString(), s: 'assets', t: g.degradedAssets > 800 ? 'alert' : g.degradedAssets > 300 ? 'warn' : 'ok', k: 'gdg' },
        { l: 'Blood Units', v: g.bloodUnitsAvailable.toLocaleString(), s: 'available', t: g.bloodUnitsAvailable < 8000 ? 'alert' : g.bloodUnitsAvailable < 16000 ? 'warn' : 'ok', k: 'gbl' },
        { l: 'Warehouse Stock', v: `${g.warehouseStockPct}%`, s: 'capacity', t: g.warehouseStockPct >= 75 ? 'ok' : g.warehouseStockPct >= 55 ? 'warn' : 'alert', k: 'gws' },
        { l: 'Asset Classes', v: `${g.classes.length}`, s: 'tracked', t: 'ok', k: 'gac' },
      ]} />

      <div className="grid gap-2 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CommandPanel title="Asset register & live telemetry" meta="class · online/total · utilisation" accent={ACC} live>
            <div className="space-y-1">
              {g.classes.map(c => (
                <div key={c.kind} className="flex items-center gap-2 text-[8.5px]">
                  <span className="w-28 shrink-0 truncate text-ink-soft">{c.kind}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#13243a' }}><span className="block h-full rounded-full" style={{ width: `${Math.round((c.online / c.total) * 100)}%`, background: `rgb(var(--c-${c.tone}))`, boxShadow: `0 0 6px rgb(var(--c-${c.tone}))` }} /></span>
                  <span className="w-32 shrink-0 text-right font-mono tabular-nums text-ink-muted">{c.online.toLocaleString()}/{c.total.toLocaleString()} · {c.utilisationPct}%</span>
                  <span className="w-14 shrink-0 text-right font-mono tabular-nums" style={{ color: `rgb(var(--c-${c.tone}))` }}>{c.degraded}↓</span>
                </div>
              ))}
            </div>
          </CommandPanel>
        </div>
        <AdvisoryPanel accent={ACC} severity={adv.severity} headline={adv.headline} recommended={adv.recommended} />
      </div>

      <BarPanel title="Regional grid availability" meta="region · online% (worst-first)" accent={ACC} live
        rows={g.regions.map(r => ({ label: `${r.region} (${r.assets.toLocaleString()})`, pct: r.onlinePct, tone: r.tone, tail: `${r.onlinePct}%` }))} />

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
