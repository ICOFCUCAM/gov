'use client';

// apps/ministry-health/subsystems/DiseaseSystem — a TRUE epidemiological
// intelligence system: per-pathogen intelligence (master/detail), a
// region×pathogen heatmap grid, a predictive spread curve with confidence
// band, intervention modelling and national infection propagation. Its
// own visual grammar (epi grid + curve). Multi-role aware.

import * as React from 'react';
import { StatGrid, Panel, PosturePill, ac } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { diseaseIntel } from '@/lib/gov/health-systems';
import { diseaseEpidemiology } from '@/lib/gov/health-operations';
import { propagateNationalEvent } from '@/lib/gov/national-propagation';
import { aiAdvisory } from '@/shared/ai/advisory';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';

export function DiseaseSystem({ id, now, role, withheld }: {
  id: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const ts = now / 4000;
  const di = diseaseIntel(id, ts);
  const ep = diseaseEpidemiology(id, ts);
  const [selPath, setSelPath] = React.useState<string | null>(null);
  const lead = ep.pathogens.find(p => p.pathogen === selPath) ?? ep.pathogens[0]!;

  const sev = Math.min(100, Math.round((lead.rt - 1) * 80 + (lead.phase === 'epidemic' ? 35 : lead.phase === 'cluster' ? 15 : 0)));
  const prop = propagateNationalEvent({ trigger: 'outbreak', severity: sev, originRegion: di.worstRegion }, ts);
  const pTone: 'ok' | 'warn' | 'alert' = ep.posture === 'epidemic' ? 'alert' : ep.posture === 'response' ? 'warn' : 'ok';
  const maxProj = Math.max(...ep.spread.map(s => s.upper), 1);

  const adv = aiAdvisory('Disease Intelligence', [
    { label: 'Dominant Rt', value: Math.min(100, Math.round((lead.rt - 0.6) * 70)), adverse: true },
    { label: 'Epidemic pathogens', value: Math.min(100, ep.pathogens.filter(p => p.phase === 'epidemic').length * 34), adverse: true },
    { label: 'Cascade reach', value: Math.min(100, prop.reach * 14), adverse: true },
    { label: 'CFR', value: Math.min(100, lead.cfrPct * 8), adverse: true },
  ]);
  const at: 'ok' | 'warn' | 'alert' = adv.severity === 'critical' || adv.severity === 'priority' ? 'alert' : adv.severity === 'advisory' ? 'warn' : 'ok';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-line bg-surface px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Disease Intelligence — national epidemiology</span>
        <PosturePill label={ep.posture} tone={pTone} />
        <span className="text-[9px] text-ink-muted">dominant · <span className="text-ink-soft">{ep.dominantPathogen}</span> · peak ~<span className="text-ink-soft">{ep.peakInDays}d</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">operator · {role}</span>
      </div>

      <StatGrid items={[
        { l: 'National Rt', v: `${ep.nationalRt}`, t: ep.nationalRt > 1.3 ? 'alert' : ep.nationalRt > 1 ? 'warn' : 'ok' },
        { l: 'Active cases', v: di.activeCases.toLocaleString(), t: di.activeCases > 4000 ? 'alert' : 'warn' },
        { l: 'Mortality 7d', v: `${di.mortality7d}`, t: di.mortality7d > 200 ? 'alert' : 'warn' },
        { l: 'Vaccination', v: `${di.vaccinationCoverage}%`, t: di.vaccinationCoverage >= 80 ? 'ok' : 'warn' },
        { l: 'Epidemic pathogens', v: `${ep.pathogens.filter(p => p.phase === 'epidemic').length}`, t: ep.pathogens.some(p => p.phase === 'epidemic') ? 'alert' : 'ok' },
        { l: 'Cascade escalation', v: prop.escalation, t: prop.escalation === 'cabinet' || prop.escalation === 'mobilise' ? 'alert' : prop.escalation === 'coordinate' ? 'warn' : 'ok' },
      ]} />

      <div className="rounded-[3px] border border-line bg-surface p-2" style={{ borderLeft: `3px solid ${ac(at)}` }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: ac(at) }}>AI epidemic forecaster · {adv.severity}</span>
          <span className="font-mono text-[9px] tabular-nums text-ink-muted">{adv.confidence}%</span>
        </div>
        <div className="mt-0.5 text-[10px] text-ink">{adv.headline} — {lead.pathogen} Rt {lead.rt}, doubling {lead.doublingDays}d, peak ~{ep.peakInDays}d</div>
        <ul className="mt-0.5 flex flex-wrap gap-x-4">{adv.recommended.map((r, i) => <li key={i} className="text-[9px] text-ink-soft">▸ {r}</li>)}</ul>
      </div>

      <div className="grid gap-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Panel title="Pathogen intelligence" meta="Rt-ordered · select for detail">
            <div className="space-y-1">
              {ep.pathogens.map(p => {
                const on = lead.pathogen === p.pathogen;
                return (
                  <button key={p.pathogen} onClick={() => setSelPath(p.pathogen)}
                    className="focus-ring flex w-full items-center gap-2 rounded-[3px] border px-2 py-1 text-left transition-colors"
                    style={{ borderColor: on ? ac(p.tone) : 'rgb(var(--c-line-soft))', backgroundColor: on ? 'rgb(var(--c-surface-2))' : 'transparent', borderLeft: `3px solid ${ac(p.tone)}` }}>
                    <span className="min-w-0 flex-1 truncate text-[10px] text-ink">{p.pathogen}</span>
                    <span className="shrink-0 text-[8px] uppercase" style={{ color: ac(p.tone) }}>{p.phase}</span>
                    <span className="w-10 shrink-0 text-right font-mono text-[10px] tabular-nums" style={{ color: ac(p.tone) }}>Rt{p.rt}</span>
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>
        <div className="lg:col-span-3 space-y-2">
          <Panel title={`Epidemiology · ${lead.pathogen}`} meta={`${lead.trend} · ${lead.phase}`}>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {([
                { l: 'Rt', v: `${lead.rt}`, t: lead.rt > 1.3 ? 'alert' : lead.rt > 1 ? 'warn' : 'ok' },
                { l: 'Doubling', v: lead.doublingDays >= 99 ? '—' : `${lead.doublingDays}d`, t: lead.doublingDays < 5 ? 'alert' : 'warn' },
                { l: 'Attack /100k', v: `${lead.attackRatePer100k}`, t: lead.attackRatePer100k > 200 ? 'alert' : 'warn' },
                { l: 'CFR', v: `${lead.cfrPct}%`, t: lead.cfrPct > 5 ? 'alert' : 'warn' },
              ] as { l: string; v: string; t: 'ok' | 'warn' | 'alert' }[]).map(s => (
                <div key={s.l} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                  <div className="text-[7.5px] uppercase tracking-[0.14em] text-ink-muted">{s.l}</div>
                  <div className="font-mono text-[13px] tabular-nums" style={{ color: ac(s.t) }}>{s.v}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Predictive spread (30d · 78–130% band)</div>
            <div className="mt-1 flex items-end gap-1" style={{ height: 64 }}>
              {ep.spread.map(s => (
                <div key={s.tPlusDays} className="flex flex-1 flex-col items-center justify-end gap-0.5">
                  <div className="w-full rounded-t-[2px]" style={{ height: `${Math.max(3, (s.projected / maxProj) * 56)}px`, backgroundColor: ac(s.projected > ep.spread[0]!.projected ? 'alert' : 'ok') }} title={`${s.lower}–${s.upper}`} />
                  <span className="text-[7.5px] tabular-nums text-ink-muted">+{s.tPlusDays}d</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Intervention modelling" meta="projected peak · reduction vs no-action">
            <div className="space-y-1">
              {ep.scenarios.map(s => (
                <div key={s.scenario} className="flex items-center gap-2 text-[10px]">
                  <span className="w-32 shrink-0 text-ink">{s.scenario}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${Math.min(100, (s.peakCases / (ep.scenarios[0]!.peakCases || 1)) * 100)}%`, backgroundColor: ac(s.tone) }} /></div>
                  <span className="w-20 shrink-0 text-right font-mono tabular-nums text-ink-muted">{s.peakCases.toLocaleString()}</span>
                  <span className="w-10 shrink-0 text-right font-mono tabular-nums" style={{ color: ac(s.tone) }}>−{s.reductionPct}%</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="Region × pathogen heatmap" meta="intensity grid · top 3 pathogens">
        <div className="grid gap-0.5" style={{ gridTemplateColumns: `90px repeat(3, 1fr)` }}>
          <span />
          {ep.pathogens.slice(0, 3).map(p => <span key={p.pathogen} className="truncate px-1 text-[7.5px] font-semibold uppercase tracking-wider text-ink-muted">{p.pathogen}</span>)}
          {[...new Set(ep.grid.map(g => g.region))].map(region => (
            <React.Fragment key={region}>
              <span className="truncate px-1 py-1 text-[9px] text-ink-soft">{region}</span>
              {ep.pathogens.slice(0, 3).map(p => {
                const cell = ep.grid.find(g => g.region === region && g.pathogen === p.pathogen);
                const it = cell?.intensity ?? 0;
                return <div key={p.pathogen} className="flex items-center justify-center py-1 text-[8.5px] font-mono tabular-nums" style={{ backgroundColor: `color-mix(in srgb, ${ac(cell?.tone ?? 'ok')} ${Math.round(it * 0.7)}%, transparent)`, color: it > 55 ? '#fff' : 'rgb(var(--c-ink-soft))' }}>{it}</div>;
              })}
            </React.Fragment>
          ))}
        </div>
      </Panel>

      <Panel title="National infection propagation" meta={`outbreak cascade · ${prop.escalation}`}>
        <div className="space-y-0.5">
          {prop.hops.map(h => (
            <div key={h.order} className="flex items-center gap-2 text-[9.5px]" style={{ opacity: h.status === 'latent' ? 0.5 : 1 }}>
              <span className="w-5 text-center font-mono text-ink-muted">{h.order}</span>
              <span className="w-36 shrink-0 truncate text-ink">{h.institution}{h.amplified ? <span style={{ color: ac('alert') }}> ⤴</span> : null}</span>
              <span className="min-w-0 flex-1 truncate text-ink-muted">{h.signal}</span>
              <span className="w-8 shrink-0 text-right font-mono tabular-nums" style={{ color: ac(h.tone) }}>{h.magnitude}</span>
              <span className="w-9 shrink-0 text-right font-mono text-[8px] tabular-nums text-ink-muted">+{h.etaHrs}h</span>
              <span className="w-11 shrink-0 text-right text-[7.5px] font-bold uppercase" style={{ color: ac(h.tone) }}>{h.status}</span>
            </div>
          ))}
        </div>
      </Panel>

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
