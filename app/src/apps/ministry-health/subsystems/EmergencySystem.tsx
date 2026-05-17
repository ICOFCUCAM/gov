'use client';

// Domain 8 — Emergency Response Command. Tactical dispatch: incident-map
// dominant, master/detail incident command, red high-pressure rhythm.
// Built to the benchmark. Distinct from every other domain.

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { emergencyCommandView } from '@/lib/gov/health-operations';
import { healthGeo } from '@/lib/gov/health-geo';
import { GeoMap } from '@/apps/_shared/GeoMap';
import { CommandHeader, CommandPanel, KpiSpark, Donut, TrendChart, ACCENT, type Tone } from '@/apps/_shared/SovereignUI';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

const C = (t: Tone) => (t === 'info' ? 'rgb(var(--c-link))' : `rgb(var(--c-${t}))`);
const ACC = ACCENT.emergency!;

export function EmergencySystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const e = emergencyCommandView(id, ts);
  const geo = healthGeo(id, ts);
  const [selId, setSelId] = React.useState<string | undefined>(undefined);
  const sel = e.incidents.find(x => x.id === selId) ?? e.incidents[0]!;
  const norm = (a: number[]) => { const mn = Math.min(...a), sp = Math.max(...a) - mn || 1; return a.map(v => ((v - mn) / sp) * 100); };

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#0a0608', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.7)' }}>
      <CommandHeader index={8} title="Emergency Response Command" subtitle="Sovereign Healthcare System"
        postureLabel={`ACTIVE ALERTS · ${e.alerts.length}`} postureTone="alert" now={now} role={role} accent={ACC} />

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-7">
        {e.kpis.map(k => <KpiSpark key={k.label} label={k.label} value={k.value} unit={k.sub} tone={k.tone} points={k.series} />)}
      </div>

      {/* Incident map | Active incidents | Incident details */}
      <div className="grid gap-2 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <CommandPanel title="Incident map" meta="incident density · live" accent={ACC} live>
            <GeoMap geo={geo} metric="pressure" title="" height={300} />
          </CommandPanel>
        </div>
        <CommandPanel title="Active incidents" meta={`${e.incidents.length}`} accent={ACC} live>
          <div className="space-y-1">
            {e.incidents.map(x => {
              const on = x.id === sel.id;
              return (
                <button key={x.id} onClick={() => setSelId(x.id)}
                  className="focus-ring block w-full rounded-[3px] border px-2 py-1.5 text-left transition-colors"
                  style={{ borderColor: on ? C(x.tone) : 'rgb(var(--c-line-soft))', background: on ? 'rgb(var(--c-surface-2))' : 'transparent', borderLeft: `3px solid ${C(x.tone)}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-medium text-ink">{x.title}</span>
                    <span className="shrink-0 text-[7.5px] font-bold uppercase" style={{ color: C(x.tone) }}>{x.severity}</span>
                  </div>
                  <div className="flex items-center justify-between text-[8px] text-ink-muted">
                    <span className="truncate">{x.place} · {x.started}</span>
                    <span className="shrink-0 font-mono">{x.affected.toLocaleString()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </CommandPanel>
        <CommandPanel title="Incident details" meta={sel.severity} accent={ACC}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-ink">{sel.title}</div>
              <div className="text-[9px] text-ink-muted">{sel.place}</div>
            </div>
            <span className="shrink-0 font-mono text-[8px] text-ink-muted">{sel.id}</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1 text-[8.5px]">
            <div><div className="text-ink-muted">Started</div><div className="text-ink-soft">{sel.started}</div></div>
            <div><div className="text-ink-muted">Status</div><div style={{ color: C(sel.tone) }}>{sel.status}</div></div>
            <div><div className="text-ink-muted">Affected</div><div className="font-mono text-ink-soft">{sel.affected.toLocaleString()}</div></div>
          </div>
          <p className="mt-2 text-[9px] text-ink-soft">{sel.desc}</p>
          <div className="mt-2 text-[8px] text-ink-muted">Response progress · {sel.progressPct}%</div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${sel.progressPct}%`, background: C(sel.tone) }} /></div>
          <div className="mt-2 grid grid-cols-4 gap-1 text-center">
            {[['Rescue', sel.resources.rescue], ['Boats', sel.resources.boats], ['Vehicles', sel.resources.vehicles], ['Helos', sel.resources.helicopters]].map(([l, n]) => (
              <div key={l as string} className="rounded-[3px] border border-line-soft py-1"><div className="font-mono text-[12px] text-ink">{n as number}</div><div className="text-[7px] uppercase text-ink-muted">{l as string}</div></div>
            ))}
          </div>
        </CommandPanel>
      </div>

      {/* Resource deployment | Unit status | Situational | Evacuation */}
      <div className="grid gap-2 xl:grid-cols-4">
        <CommandPanel title="Resource deployment" accent={ACC}>
          <div className="space-y-1.5">
            {e.resources.map(r => (
              <div key={r.kind} className="text-[9px]">
                <div className="flex items-center justify-between"><span className="text-ink-soft">{r.kind}</span><span className="font-mono text-ink-muted">{r.have}/{r.total}</span></div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${r.pct}%`, background: C(r.tone) }} /></div>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Unit status" meta={`${e.unitTotal} total`} accent={ACC}>
          <Donut total={e.unitTotal} label="units"
            segments={e.unitStatus.map(u => ({ label: `${u.label} ${u.value} (${u.pct}%)`, value: u.value, tone: u.tone }))} />
        </CommandPanel>
        <CommandPanel title="Situational awareness" accent={ACC} live>
          <div className="grid grid-cols-2 gap-1">
            {e.situational.map(s => (
              <div key={s.kind} className="rounded-[3px] border border-line-soft bg-surface-2/30 px-2 py-1.5" style={{ borderLeft: `3px solid ${C(s.tone)}` }}>
                <div className="text-[7px] font-bold uppercase tracking-wider" style={{ color: C(s.tone) }}>{s.kind}</div>
                <div className="text-[10px] font-medium text-ink">{s.title}</div>
                <div className="text-[7.5px] text-ink-muted">{s.sub}</div>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Evacuation centers" accent={ACC}>
          <div className="space-y-1.5">
            {e.evacuation.map(v => (
              <div key={v.name} className="text-[9px]">
                <div className="flex items-center justify-between"><span className="min-w-0 truncate text-ink-soft">{v.name}</span><span className="font-mono text-ink-muted">{v.used}/{v.cap}</span></div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${v.pct}%`, background: C(v.tone) }} /></div>
              </div>
            ))}
          </div>
        </CommandPanel>
      </div>

      {/* Incident trend | Response timeline | Alerts | Comms */}
      <div className="grid gap-2 xl:grid-cols-4">
        <CommandPanel title="Incident trend" meta="7 days" accent={ACC} live>
          <TrendChart height={108}
            series={[
              { name: 'Total', points: norm(e.trend.total), tone: 'info' },
              { name: 'Resolved', points: norm(e.trend.resolved), tone: 'ok' },
              { name: 'Critical', points: norm(e.trend.critical), tone: 'alert' },
            ]} labels={['May 10', 'May 13', 'May 16']} />
        </CommandPanel>
        <CommandPanel title="Response timeline" meta="today" accent={ACC} live>
          <div className="space-y-1.5">
            {e.timeline.map((tl, i) => (
              <div key={i} className="flex gap-2">
                <div className="flex flex-col items-center"><span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ background: C(tl.tone) }} />{i < e.timeline.length - 1 ? <span className="w-px flex-1 bg-[#2a1518]" /> : null}</div>
                <div className="min-w-0 pb-1"><div className="font-mono text-[8px] text-ink-muted">{tl.at}</div><div className="text-[9.5px] text-ink">{tl.detail}</div><div className="text-[8px] text-ink-muted">{tl.sub}</div></div>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Alerts & notifications" accent={ACC} live>
          <div className="space-y-1">
            {e.alerts.map(a => (
              <div key={a.title} className="flex items-start gap-2 rounded-[3px] border border-line-soft bg-surface-2/30 px-2 py-1" style={{ borderLeft: `3px solid ${C(a.tone)}` }}>
                <span className="shrink-0 text-[7px] font-bold uppercase" style={{ color: C(a.tone) }}>{a.sev}</span>
                <div className="min-w-0 flex-1"><div className="truncate text-[9.5px] text-ink">{a.title}</div><div className="text-[7.5px] text-ink-muted">{a.sub}</div></div>
                <span className="shrink-0 font-mono text-[7.5px] text-ink-muted">{a.at}</span>
              </div>
            ))}
          </div>
        </CommandPanel>
        <CommandPanel title="Communications" accent={ACC}>
          <div className="space-y-1">
            {e.channels.map(ch => (
              <div key={ch.name} className="flex items-center gap-2 rounded-[3px] border border-line-soft px-2 py-1 text-[9px]">
                <div className="min-w-0 flex-1"><div className="truncate text-ink-soft">{ch.name}</div><div className="text-[7.5px] text-ink-muted">{ch.channel}</div></div>
                <span className="text-[8px]" style={{ color: C(ch.signal >= 4 ? 'ok' : 'warn') }}>{'▮'.repeat(ch.signal)}</span>
                <span className="font-mono text-[8px] text-ink-muted">{ch.count}</span>
              </div>
            ))}
            <button className="focus-ring mt-1 w-full rounded-[3px] border py-1 text-[9px] font-semibold uppercase tracking-wider" style={{ borderColor: ACC, color: ACC }}>Open radio console</button>
          </div>
        </CommandPanel>
      </div>

      <RuntimeQueue
        scope={`${id}:emergency`}
        kind="incident"
        title="Emergency dispatch runtime — receive → dispatch → on-scene → transport → clear"
        by="EMS Controller"
        role={role}
        withheld={withheld}
      />
    </div>
  );
}
