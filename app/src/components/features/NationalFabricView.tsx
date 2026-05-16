'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { TONE, Panel, Spark, waveSeries } from '@/components/features/SituationRoom';
import { identityFor } from '@/lib/archetype-profiles';
import { buildNationalFabric } from '@/lib/institution/national-fabric';
import { buildCascade } from '@/lib/institution/cascade';
import { cascadeEscalations } from '@/lib/institution/cascade-escalation';
import { nationalResilience } from '@/lib/gov/national-resilience';
import type { Ministry } from '@/lib/api/types';

const DIR_TONE = { mutual: 'link', provides: 'ok', consumes: 'warn' } as const;

export function NationalFabricView() {
  const [now, setNow] = React.useState(() => Date.now());
  const [mins, setMins] = React.useState<Ministry[]>([]);
  const [ack, setAck] = React.useState<Record<string, boolean>>({});
  React.useEffect(() => {
    api.org.ministries().then(r => setMins(r.ministries)).catch(() => {});
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ts = now / 4000;
  const f = buildNationalFabric(mins);
  // Live node health drifts; cascade propagates degradation along edges.
  const liveHealth = (id: string) => Math.round(waveSeries(`nh:${id}`, ts, 1, 58, 99).at(-1)!);
  const cascade = buildCascade(mins, liveHealth);
  const cascadeById = new Map(cascade.map(c => [c.id, c]));
  const POS_TONE: Record<string, string> = { stable: 'ok', watch: 'neutral', strained: 'warn', critical: 'alert' };
  const linkHealth = (id: string) => Math.round(waveSeries(`nf:${id}`, ts, 1, 52, 99).at(-1)!);
  const meanHealth = f.edges.length
    ? Math.round(f.edges.reduce((a, e) => a + linkHealth(e.id), 0) / f.edges.length) : 100;
  const strained = f.edges.filter(e => linkHealth(e.id) < 72).length;

  const resilience = nationalResilience(mins, ts);
  const cascPillar = resilience.pillars.find(p => p.key === 'casc');
  const degree = new Map<string, number>();
  for (const e of f.edges) {
    degree.set(e.fromId, (degree.get(e.fromId) ?? 0) + 1);
    degree.set(e.toId, (degree.get(e.toId) ?? 0) + 1);
  }
  const erosion = [...cascade]
    .map(c => ({ ...c, dependents: degree.get(c.id) ?? 0, weight: c.totalStress * (1 + (degree.get(c.id) ?? 0) * 0.2) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);

  const tele = [
    { l: 'Institutions meshed', v: String(f.stats.institutions), t: 'ok', k: 'in' },
    { l: 'Dependency links', v: String(f.stats.links), t: 'ok', k: 'lk' },
    { l: 'Mean link health', v: `${meanHealth}%`, t: meanHealth >= 85 ? 'ok' : meanHealth >= 70 ? 'warn' : 'alert', k: 'mh' },
    { l: 'Strained links', v: String(strained), t: strained ? 'warn' : 'ok', k: 'st' },
    { l: 'Mutual / Provides / Consumes', v: `${f.stats.mutual}/${f.stats.provides}/${f.stats.consumes}`, t: 'ok', k: 'mp' },
    { l: 'Cascade-critical', v: String(cascade.filter(c => c.posture === 'critical' || c.posture === 'strained').length), t: cascade.some(c => c.posture === 'critical') ? 'alert' : cascade.some(c => c.posture === 'strained') ? 'warn' : 'ok', k: 'cx' },
  ];

  // circular mesh layout
  const N = f.nodes.length;
  const pos = new Map(f.nodes.map((n, i) => {
    const a = (i / Math.max(1, N)) * Math.PI * 2 - Math.PI / 2;
    return [n.id, { x: 50 + Math.cos(a) * 38, y: 50 + Math.sin(a) * 38 }];
  }));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">National Interoperability Fabric</h1>
          <span className="flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold tracking-widest" style={{ backgroundColor: `color-mix(in srgb, ${TONE.ok} 18%, transparent)`, color: TONE.ok }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.ok }} />LIVE
          </span>
          <span className="font-mono text-[10px] tabular-nums text-ink-muted">{new Date(now).toLocaleTimeString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-[3px] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: TONE[resilience.tone], color: TONE[resilience.tone], backgroundColor: `color-mix(in srgb, ${TONE[resilience.tone]} 12%, transparent)` }}>
            Resilience {resilience.index} · cascade {cascPillar?.score ?? '—'}
          </span>
          <span className="rounded-[3px] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: strained ? TONE.warn : TONE.ok, color: strained ? TONE.warn : TONE.ok, backgroundColor: `color-mix(in srgb, ${strained ? TONE.warn : TONE.ok} 12%, transparent)` }}>
            Whole-of-government · {strained ? `${strained} strained links` : 'cohesive'}
          </span>
        </div>
      </div>

      <p className="text-[11px] text-ink-muted">
        The state is interconnected, not a set of isolated ministries. Every active institution&rsquo;s dependency graph is aggregated into one live national mesh — cascade risk propagates along these links.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {tele.map(m => (
          <div key={m.l} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
            <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{m.l}</div>
            <div className="truncate font-mono text-[13px] leading-tight tabular-nums" style={{ color: TONE[m.t] }}>{m.v}</div>
            <div className="-mb-1 h-4 overflow-hidden opacity-70"><Spark pts={waveSeries(`nft:${m.k}`, ts, 14, 40, 92)} tone={m.t} /></div>
          </div>
        ))}
      </div>

      <div className="grid gap-2 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="National dependency mesh" meta={`${f.nodes.length} nodes · ${f.edges.length} links`} bodyClass="!p-2">
          {f.nodes.length === 0 ? (
            <div className="grid h-[360px] place-items-center text-[11px] text-ink-muted">No active institutions — compose and activate ministries to form the national fabric.</div>
          ) : (
            <div className="relative w-full" style={{ height: 380 }}>
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                {f.edges.map(e => {
                  const a = pos.get(e.fromId)!, b = pos.get(e.toId)!;
                  const h = linkHealth(e.id);
                  const tn = h >= 85 ? 'ok' : h >= 72 ? 'warn' : 'alert';
                  return <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={TONE[tn]} strokeWidth={0.2 + (e.weight / 100) * 0.6}
                    strokeOpacity={0.25 + (e.weight / 100) * 0.5} strokeDasharray="1 1.5"
                    className="motion-safe:animate-dash-flow" vectorEffect="non-scaling-stroke" />;
                })}
              </svg>
              {f.nodes.map(n => {
                const p = pos.get(n.id)!;
                const id = identityFor(n.archetype);
                const cn = cascadeById.get(n.id);
                const ring = cn ? TONE[POS_TONE[cn.posture]!] : 'rgba(255,255,255,0.15)';
                return (
                  <span key={n.id} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                    <span className="grid h-7 w-7 place-items-center rounded-full text-[11px] text-white"
                      style={{ backgroundColor: n.external ? 'rgb(var(--c-surface-2))' : id.accent, color: n.external ? TONE.warn : '#fff', boxShadow: `0 0 0 2px ${ring}` }}
                      title={`${n.name}${n.external ? ' · external capability' : cn ? ` · ${cn.posture} (stress ${cn.totalStress})` : ''}`}>{id.glyph}</span>
                    <span className="mt-0.5 block max-w-[80px] truncate text-[8px] text-ink-muted">{n.name.replace(/ Ministry| \(capability\)/, '')}</span>
                  </span>
                );
              })}
            </div>
          )}
          <div className="mt-1 flex flex-wrap gap-3 text-[9px] text-ink-muted">
            <span className="flex items-center gap-1"><span className="h-0.5 w-3" style={{ backgroundColor: TONE.ok }} />healthy link</span>
            <span className="flex items-center gap-1"><span className="h-0.5 w-3" style={{ backgroundColor: TONE.warn }} />strained</span>
            <span className="flex items-center gap-1"><span className="h-0.5 w-3" style={{ backgroundColor: TONE.alert }} />degraded</span>
            <span className="border-l border-line pl-2">ring colour = institution · grey = external capability</span>
          </div>
        </Panel>

        <Panel title="Systemic-risk institutions" meta="most depended-upon" bodyClass="!p-1.5">
          <div className="space-y-1">
            {f.systemic.length === 0 ? <p className="p-2 text-[11px] text-ink-muted">No dependency pressure yet.</p> : f.systemic.map(s => {
              const tn = s.weight >= 78 ? 'alert' : s.weight >= 62 ? 'warn' : 'ok';
              return (
                <div key={s.id} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] text-ink">{s.name.replace(/ \(capability\)/, '')}</span>
                    <span className="font-mono text-[10px] tabular-nums" style={{ color: TONE[tn] }}>{s.inbound} dependents</span>
                  </div>
                  <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full" style={{ width: `${s.weight}%`, backgroundColor: TONE[tn] }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 text-[9px] text-ink-muted">High inbound dependency = single-point-of-failure risk; degradation cascades to dependents.</p>
        </Panel>
      </div>

      <Panel title="Resilience erosion · cascade pillar" meta={`pillar ${cascPillar?.score ?? '—'} · stress × dependency weighting`} bodyClass="!p-1.5">
        {erosion.length === 0 ? (
          <p className="text-[11px] text-ink-muted">No active institutions in the mesh.</p>
        ) : (
          <div className="space-y-1">
            {erosion.map(c => {
              const tn = c.posture === 'critical' ? 'alert' : c.posture === 'strained' ? 'warn' : c.posture === 'watch' ? 'neutral' : 'ok';
              const pct = Math.min(100, Math.round(c.weight));
              return (
                <div key={c.id} className="flex items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5 text-[11px]">
                  <span className="w-40 shrink-0 truncate text-ink-soft">{c.name.replace(/ Ministry| \(capability\)/, '')}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${pct}%`, backgroundColor: TONE[tn] }} /></div>
                  <span className="w-10 shrink-0 text-right font-mono text-[10px] tabular-nums" style={{ color: TONE[tn] }}>{c.totalStress}</span>
                  <span className="w-14 shrink-0 text-right font-mono text-[9px] tabular-nums text-ink-muted">{c.dependents} dep</span>
                </div>
              );
            })}
            <p className="px-1 pt-0.5 text-[9px] text-ink-muted">Erosion weight = cascade stress amplified by mesh degree. Reducing these institutions&rsquo; stress lifts the national cascade-integrity pillar most.</p>
          </div>
        )}
      </Panel>

      <Panel title="Cascade propagation" meta="upstream degradation flowing to dependents" bodyClass="!p-0">
        <div className="max-h-[300px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="sticky top-0 z-10 border-b border-line bg-surface-2 text-left text-[8.5px] uppercase tracking-wider text-ink-muted">
              <th className="px-3 py-1.5">Institution</th><th className="px-2 py-1.5 text-right">Base stress</th><th className="px-2 py-1.5 text-right">Inherited</th><th className="px-2 py-1.5 text-right">Total</th><th className="px-2 py-1.5">Posture</th><th className="px-3 py-1.5">Top cascade contributors</th>
            </tr></thead>
            <tbody>
              {cascade.map(c => {
                const tn = POS_TONE[c.posture]!;
                return (
                  <tr key={c.id} className="border-b border-line-soft last:border-0">
                    <td className="px-3 py-1.5 text-ink">{c.name.replace(/ Ministry/, '')}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-ink-muted">{c.baseStress}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums" style={{ color: c.inheritedStress >= 20 ? TONE.warn : 'rgb(var(--c-ink-muted))' }}>+{c.inheritedStress}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums" style={{ color: TONE[tn] }}>{c.totalStress}</td>
                    <td className="px-2 py-1.5"><span className="rounded-[2px] px-1.5 py-0.5 text-[9px] font-semibold uppercase" style={{ backgroundColor: `color-mix(in srgb, ${TONE[tn]} 16%, transparent)`, color: TONE[tn] }}>{c.posture}</span></td>
                    <td className="px-3 py-1.5 text-[10px] text-ink-muted">{c.contributors.length ? c.contributors.map(x => `${x.name.replace(/ Ministry/, '')} (+${x.amount})`).join(' · ') : '—'}</td>
                  </tr>
                );
              })}
              {cascade.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-ink-muted">No active institutions — no cascade surface.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Cascade escalations" meta="actionable · coordination required" bodyClass="!p-0">
        {(() => {
          const esc = cascadeEscalations(cascade);
          if (!esc.length) return <p className="p-3 text-[11px] text-ink-muted">No cascade escalations — propagation within tolerance.</p>;
          return esc.map(e => {
            const tn = e.severity === 'critical' ? TONE.alert : TONE.warn;
            const done = ack[e.id];
            return (
              <div key={e.id} className="flex flex-wrap items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tn}`, opacity: done ? 0.55 : 1 }}>
                <span className="rounded-[2px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${tn} 18%, transparent)`, color: tn }}>{e.severity}</span>
                <span className="text-[11px] font-medium text-ink">{e.institution}</span>
                <span className="font-mono text-[10px] tabular-nums text-ink-muted">stress {e.totalStress} · +{e.inheritedStress} via {e.driver}</span>
                <span className="min-w-0 flex-1 truncate text-[10px] text-ink-soft">▸ {e.recommendation}</span>
                <span className="font-mono text-[9px] tabular-nums text-ink-muted">{e.ageMin}m</span>
                <Link href={e.route} className="focus-ring rounded-[3px] border px-1.5 py-0.5 text-[9px] uppercase tracking-wider no-underline" style={{ borderColor: tn, color: tn }}>Coordinate →</Link>
                <button onClick={() => setAck(a => ({ ...a, [e.id]: !a[e.id] }))} className="focus-ring rounded-[3px] border border-line px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-ink-soft">{done ? 'Acked' : 'Acknowledge'}</button>
              </div>
            );
          });
        })()}
      </Panel>

      <Panel title="Cascade event timeline" meta="propagation chronology" bodyClass="!p-0">
        {(() => {
          const events = cascade
            .filter(c => c.contributors.length && c.totalStress >= 30)
            .flatMap(c => c.contributors.slice(0, 2).map(ct => ({
              t: 2 + Math.round(waveSeries(`ce:${c.id}:${ct.name}`, ts, 1, 1, 58).at(-1)!),
              sev: c.posture, target: c.name, src: ct.name, via: ct.via, amt: ct.amount,
            })))
            .sort((a, b) => a.t - b.t)
            .slice(0, 10);
          if (!events.length) return <p className="p-3 text-[11px] text-ink-muted">No active cascade propagation — national fabric stable.</p>;
          return events.map((e, i) => {
            const tn = e.sev === 'critical' ? TONE.alert : e.sev === 'strained' ? TONE.warn : TONE.neutral;
            return (
              <div key={i} className="flex items-center gap-3 border-b border-line-soft px-3 py-2 last:border-0" style={{ borderLeft: `3px solid ${tn}` }}>
                <span className="font-mono text-[10px] tabular-nums text-ink-muted">{e.t}m</span>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: tn }} />
                <span className="min-w-0 flex-1 truncate text-[11px] text-ink-soft">
                  <span className="text-ink">{e.src.replace(/ Ministry| \(capability\)/, '')}</span> degradation propagated <span className="font-mono" style={{ color: tn }}>+{e.amt}</span> stress to <span className="text-ink">{e.target.replace(/ Ministry/, '')}</span> via {e.via}
                </span>
                <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider" style={{ color: tn }}>{e.sev}</span>
              </div>
            );
          });
        })()}
      </Panel>

      <Panel title="Dependency ledger" meta="live link health" bodyClass="!p-0">
        <div className="max-h-[320px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="sticky top-0 z-10 border-b border-line bg-surface-2 text-left text-[8.5px] uppercase tracking-wider text-ink-muted">
              <th className="px-3 py-1.5">From</th><th className="px-2 py-1.5">Relation</th><th className="px-2 py-1.5">To</th><th className="px-2 py-1.5">Direction</th><th className="px-2 py-1.5 text-right">Weight</th><th className="px-3 py-1.5 text-right">Link health</th>
            </tr></thead>
            <tbody>
              {f.edges.map(e => {
                const h = linkHealth(e.id);
                const tn = h >= 85 ? 'ok' : h >= 72 ? 'warn' : 'alert';
                const dt = DIR_TONE[e.direction];
                return (
                  <tr key={e.id} className="border-b border-line-soft last:border-0">
                    <td className="px-3 py-1.5 text-ink">{e.fromName.replace(/ Ministry/, '')}</td>
                    <td className="px-2 py-1.5 text-ink-muted">{e.relation}</td>
                    <td className="px-2 py-1.5 text-ink-soft">{e.toName.replace(/ Ministry/, '')}</td>
                    <td className="px-2 py-1.5"><span className="rounded-[2px] px-1.5 py-0.5 text-[9px] font-semibold uppercase" style={{ backgroundColor: `color-mix(in srgb, ${TONE[dt]} 16%, transparent)`, color: TONE[dt] }}>{e.direction}</span></td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-ink-muted">{e.weight}</td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums" style={{ color: TONE[tn] }}>{h}%</td>
                  </tr>
                );
              })}
              {f.edges.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-ink-muted">No dependency links — activate institutions to form the fabric.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] md:grid-cols-5">
        {[
          { l: 'Fabric posture', v: strained ? 'STRAINED' : 'COHESIVE', t: strained ? 'warn' : 'ok' },
          { l: 'Institutions', v: String(f.stats.institutions), t: 'ok' },
          { l: 'Links', v: String(f.stats.links), t: 'ok' },
          { l: 'Mean health', v: `${meanHealth}%`, t: meanHealth >= 85 ? 'ok' : 'warn' },
          { l: 'Coordination', v: 'WHOLE-OF-GOVERNMENT', t: 'ok' },
        ].map(s => (
          <div key={s.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
            <span className="uppercase tracking-[0.14em] text-ink-muted">{s.l}</span>
            <span className="flex items-center gap-1.5 font-mono font-semibold tabular-nums" style={{ color: TONE[s.t] }}>
              {s.l === 'Fabric posture' || s.l === 'Coordination' ? <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE[s.t] }} /> : null}
              {s.v}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-ink-muted">
        Derived live from every activated institution&rsquo;s dependency graph. Read-only and advisory — surfaces interconnection and cascade exposure; humans coordinate. <Link href="/gov/coordination" className="text-link underline underline-offset-2">National coordination →</Link>
      </p>
    </div>
  );
}
