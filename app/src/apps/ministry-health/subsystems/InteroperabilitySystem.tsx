'use client';

// apps/ministry-health/subsystems/InteroperabilitySystem — Layer 11. The
// cross-government health data fabric: live links to 9 institutions +
// flagship automatic flows (birth registration → health identity).

import * as React from 'react';
import { StatGrid, Panel, PosturePill, ac } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { nationalInteroperability } from '@/lib/gov/health-operations';
import { aiAdvisory } from '@/shared/ai/advisory';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function InteroperabilitySystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const io = nationalInteroperability(id, ts);
  const pTone: 'ok' | 'warn' | 'alert' = io.posture === 'fragmented' ? 'alert' : io.posture === 'partial' ? 'warn' : 'ok';
  const adv = aiAdvisory('National Interoperability', [
    { label: 'Degraded links', value: Math.min(100, io.degradedLinks * 18), adverse: true },
    { label: 'Identity federation gap', value: Math.max(0, 100 - io.identityFederationPct), adverse: true },
  ]);
  const at: 'ok' | 'warn' | 'alert' = adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-line bg-surface px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">National Interoperability</span>
        <PosturePill label={io.posture} tone={pTone} />
        <span className="text-[9px] text-ink-muted">{io.liveLinks}/{io.links.length} links live · identity federation <span className="text-ink-soft">{io.identityFederationPct}%</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">operator · {role}</span>
      </div>
      <StatGrid items={[
        { l: 'Live links', v: `${io.liveLinks}/${io.links.length}`, t: io.degradedLinks >= 3 ? 'alert' : io.degradedLinks ? 'warn' : 'ok' },
        { l: 'Identity federation', v: `${io.identityFederationPct}%`, t: io.identityFederationPct >= 90 ? 'ok' : 'warn' },
        { l: 'Events/min', v: io.eventsExchangedPerMin.toLocaleString(), t: 'ok' },
        { l: 'Degraded', v: `${io.degradedLinks}`, t: io.degradedLinks ? 'warn' : 'ok' },
        { l: 'Flagship flows', v: `${io.flows.length}`, t: 'ok' },
        { l: 'Posture', v: io.posture, t: pTone },
      ]} />
      <div className="rounded-[3px] border border-line bg-surface p-2" style={{ borderLeft: `3px solid ${ac(at)}` }}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: ac(at) }}>AI interoperability intelligence · {adv.severity}</div>
        <div className="mt-0.5 text-[10px] text-ink">{adv.headline}</div>
        <ul className="mt-0.5 flex flex-wrap gap-x-4">{adv.recommended.map((r, i) => <li key={i} className="text-[9px] text-ink-soft">▸ {r}</li>)}</ul>
      </div>
      <Panel title="Inter-ministry links" meta="institution · direction · status · latency · throughput">
        <div className="space-y-1">
          {io.links.map(l => (
            <div key={l.institution} className="flex items-center gap-2 text-[10px]">
              <span className="w-32 shrink-0 truncate text-ink">{l.institution}</span>
              <span className="w-20 shrink-0 text-[8px] uppercase tracking-wider text-ink-muted">{l.direction}</span>
              <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{l.purpose}</span>
              <span className="w-12 shrink-0 text-right font-mono tabular-nums text-ink-muted">{l.latencyMs}ms</span>
              <span className="w-14 shrink-0 text-right text-[8px] font-bold uppercase" style={{ color: ac(l.tone) }}>{l.status}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Flagship automatic flows" meta="cross-government event exchange">
        <div className="space-y-1">
          {io.flows.map(f => (
            <div key={f.name} className="flex items-center gap-2 text-[10px]">
              <span className="w-44 shrink-0 truncate text-ink">{f.name}</span>
              <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{f.from} → {f.to}</span>
              <span className="w-20 shrink-0 text-right font-mono tabular-nums text-ink-muted">{f.perDay.toLocaleString()}/d</span>
              <span className="w-12 shrink-0 text-right font-mono tabular-nums" style={{ color: ac(f.tone) }}>{f.autoPct}% auto</span>
            </div>
          ))}
        </div>
      </Panel>
      <RuntimeQueue scope={`${id}:interop`} kind="case" title="Interoperability runtime — establish → verify → exchange → reconcile" by="Integration Officer" role={role} withheld={withheld} />
    </div>
  );
}
