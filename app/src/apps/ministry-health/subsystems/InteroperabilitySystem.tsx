'use client';

// Domain — National Interoperability. Cross-government health data fabric:
// live links to institutions + flagship automatic flows. Cinematic
// sovereign command rhythm.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { nationalInteroperability } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import { CommandPanel, sc, type Tone } from '@/apps/_shared/SovereignUI';
import { OpsHeader, KpiStrip, AdvisoryPanel } from '@/apps/ministry-health/subsystems/_ops';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const ACC = '#7c5cff';

export function InteroperabilitySystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const io = nationalInteroperability(id, ts);
  const pTone: Tone = io.posture === 'fragmented' ? 'alert' : io.posture === 'partial' ? 'warn' : 'ok';
  const adv = aiAdvisory('National Interoperability', [
    { label: 'Degraded links', value: Math.min(100, io.degradedLinks * 18), adverse: true },
    { label: 'Identity federation gap', value: Math.max(0, 100 - io.identityFederationPct), adverse: true },
  ]);

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#05060f', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={13} title="National Interoperability" subtitle="Cross-Government Health Data Fabric"
        posture={io.posture} tone={pTone} now={now} role={role} accent={ACC} />

      <KpiStrip ts={ts} accent={ACC} items={[
        { l: 'Live Links', v: `${io.liveLinks}/${io.links.length}`, s: 'institutions', t: io.degradedLinks >= 3 ? 'alert' : io.degradedLinks ? 'warn' : 'ok', k: 'iol' },
        { l: 'Identity Federation', v: `${io.identityFederationPct}%`, s: 'national', t: io.identityFederationPct >= 90 ? 'ok' : 'warn', k: 'iof' },
        { l: 'Events / Min', v: io.eventsExchangedPerMin.toLocaleString(), s: 'exchanged', t: 'ok', k: 'ioe' },
        { l: 'Degraded', v: `${io.degradedLinks}`, s: 'links', t: io.degradedLinks ? 'warn' : 'ok', k: 'iod' },
        { l: 'Flagship Flows', v: `${io.flows.length}`, s: 'automatic', t: 'ok', k: 'iow' },
      ]} />

      <div className="grid gap-2 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CommandPanel title="Inter-ministry links" meta="institution · direction · latency · status" accent={ACC} live>
            <div className="space-y-1">
              {io.links.map(l => (
                <div key={l.institution} className="flex items-center gap-2 text-[8.5px]">
                  <span className="w-28 shrink-0 truncate text-ink">{l.institution}</span>
                  <span className="w-16 shrink-0 text-[7px] uppercase tracking-wider text-ink-muted">{l.direction}</span>
                  <span className="min-w-0 flex-1 truncate text-[8px] text-ink-muted">{l.purpose}</span>
                  <span className="w-10 shrink-0 text-right font-mono tabular-nums text-ink-muted">{l.latencyMs}ms</span>
                  <span className="w-12 shrink-0 text-right text-[7px] font-bold uppercase" style={{ color: sc(l.tone) }}>{l.status}</span>
                </div>
              ))}
            </div>
          </CommandPanel>
        </div>
        <AdvisoryPanel accent={ACC} severity={adv.severity} headline={adv.headline} recommended={adv.recommended} />
      </div>

      <CommandPanel title="Flagship automatic flows" meta="cross-government event exchange" accent={ACC} live>
        <div className="space-y-1">
          {io.flows.map(f => (
            <div key={f.name} className="flex items-center gap-2 text-[8.5px]">
              <span className="w-40 shrink-0 truncate text-ink">{f.name}</span>
              <span className="min-w-0 flex-1 truncate text-[8px] text-ink-muted">{f.from} → {f.to}</span>
              <span className="w-16 shrink-0 text-right font-mono tabular-nums text-ink-muted">{f.perDay.toLocaleString()}/d</span>
              <span className="w-14 shrink-0 text-right font-mono tabular-nums" style={{ color: sc(f.tone) }}>{f.autoPct}% auto</span>
            </div>
          ))}
        </div>
      </CommandPanel>

      <RuntimeQueue scope={`${id}:interop`} kind="case" title="Interoperability runtime — establish → verify → exchange → reconcile" by="Integration Officer" role={role} withheld={withheld} />
    </div>
  );
}
