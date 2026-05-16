'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel, Spark, seed, toneFor, waveSeries, TerritoryHeat } from '@/components/features/SituationRoom';
import { nationalRegions, regionRollup, projectRegions } from '@/lib/gov/regions';
import { networkPressure } from '@/lib/gov/infrastructure';
import { SCENARIOS, type ScenarioKey } from '@/lib/gov/simulation';

const POS_TONE: Record<string, string> = { stable: 'ok', watch: 'neutral', elevated: 'warn', critical: 'alert' };

export function RegionalOverview({ initialRegion }: { initialRegion?: string } = {}) {
  const [now, setNow] = React.useState(() => Date.now());
  const [open, setOpen] = React.useState<string | null>(initialRegion ?? 'Capital District');
  const [scn, setScn] = React.useState<ScenarioKey>('baseline');
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ts = now / 4000;

  const regions = nationalRegions(ts);
  const roll = regionRollup(regions);
  const crit = roll.critical;

  const proj = projectRegions(scn, ts);
  const projActive = scn !== 'baseline';
  const projLabel = SCENARIOS.find(s => s.key === scn)?.label ?? scn;
  const projWorst = [...proj].sort((a, b) => a.readinessDelta - b.readinessDelta)[0];
  const projCritical = proj.filter(p => p.projectedPosture === 'critical').length;

  const tele = [
    { l: 'Regional posture', v: roll.posture.toUpperCase(), sub: `${roll.meanReadiness}% mean readiness`, t: POS_TONE[roll.posture]!, k: 'np' },
    { l: 'Regions critical', v: String(roll.critical), sub: `${roll.elevated} elevated`, t: roll.critical ? 'alert' : roll.elevated ? 'warn' : 'ok', k: 'rc' },
    { l: 'Population', v: `${roll.population}M`, sub: 'under regional command', t: 'ok', k: 'po' },
    { l: 'Infrastructure', v: `${roll.meanInfra}%`, sub: 'mean coverage', t: roll.meanInfra >= 80 ? 'ok' : 'warn', k: 'in' },
    { l: 'Incident load', v: String(roll.totalIncidents), sub: 'active · all regions', t: roll.totalIncidents > 12 ? 'alert' : roll.totalIncidents ? 'warn' : 'ok', k: 'il' },
    { l: 'Coordination tempo', v: `${Math.round(waveSeries('ro:ct', ts, 1, 40, 90).at(-1)!)}/min`, sub: 'inter-region', t: 'ok', k: 'ct' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Regional Command</h1>
          <span className="flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold tracking-widest" style={{ backgroundColor: `color-mix(in srgb, ${TONE.ok} 18%, transparent)`, color: TONE.ok }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.ok }} />LIVE
          </span>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]" style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}>Advisory · Simulated</span>
          <span className="font-mono text-[10px] tabular-nums text-ink-muted">{new Date(now).toLocaleTimeString()} · updated {Math.round((now % 60000) / 1000)}s ago</span>
        </div>
        {crit >= 1 ? (
          <span className="flex items-center gap-1.5 rounded-[3px] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: TONE.alert, color: TONE.alert, backgroundColor: `color-mix(in srgb, ${TONE.alert} 14%, transparent)` }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE.alert }} />
            {crit >= 2 ? 'Regional surge' : 'Regional alert'} · {crit} critical
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {tele.map(m => (
          <div key={m.l} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
            <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{m.l}</div>
            <div className="truncate font-mono text-lg leading-tight tabular-nums" style={{ color: TONE[m.t] }}>{m.v}</div>
            <div className="-mb-1 h-5 overflow-hidden opacity-80"><Spark pts={waveSeries(`ro:${m.k}`, ts, 16, 35, 92)} tone={m.t} /></div>
            <div className="truncate text-[8px] text-ink-muted">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-2 xl:grid-cols-12">
        <Panel title="Regional theatre" meta="provincial posture · live" className="xl:col-span-7" bodyClass="!p-2">
          <TerritoryHeat epoch={Math.floor(ts) % 60} height={330} />
          <div className="mt-1.5 grid grid-cols-2 gap-1 sm:grid-cols-4">
            {[
              ['Provinces synced', 'psy', 80, 100, '%'], ['Field deployment', 'pfd', 22, 58, ''],
              ['Escalation rate', 'per', 0, 9, '/h'], ['Coordination', 'pct', 40, 92, '/m'],
            ].map(([l, k, lo, hi, u]) => {
              const L = l as string, K = k as string, LO = lo as number, HI = hi as number;
              const v = Math.round(waveSeries(`rth:${K}`, ts, 1, LO, HI).at(-1)!);
              const low = K === 'per';
              const pct = ((v - LO) / (HI - LO)) * 100;
              const t = (low ? 100 - pct : pct) >= 60 ? 'ok' : (low ? 100 - pct : pct) >= 35 ? 'warn' : 'alert';
              return (
                <div key={K} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                  <div className="truncate text-[7.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{L}</div>
                  <div className="font-mono text-[13px] leading-tight tabular-nums" style={{ color: TONE[t] }}>{v}{u as string}</div>
                  <div className="-mb-0.5 h-3 overflow-hidden opacity-70"><Spark pts={waveSeries(`rths:${K}`, ts, 12, 35, 92)} tone={t} /></div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Regional command grid" meta={`${regions.length} regions · expand for detail`} className="xl:col-span-5" bodyClass="!p-0">
          {regions.map(r => {
            const o = open === r.name;
            const tn = POS_TONE[r.posture]!;
            return (
              <div key={r.name} className="border-b border-line-soft last:border-0" style={{ borderLeft: `3px solid ${TONE[tn]}` }}>
                <button onClick={() => setOpen(o ? null : r.name)} className="focus-ring flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-2/50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium text-ink">{r.capital ? '★ ' : ''}{r.name}</span>
                    <span className="block truncate text-[9px] text-ink-muted">{r.archetype} · {r.populationM}M · {r.incidents} incidents</span>
                  </span>
                  <span className="shrink-0 rounded-[2px] px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ backgroundColor: `color-mix(in srgb, ${TONE[tn]} 16%, transparent)`, color: TONE[tn] }}>{r.posture}</span>
                  <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums" style={{ color: TONE[tn] }}>{r.readiness}%</span>
                  <span className="text-ink-muted transition-transform" style={{ transform: o ? 'rotate(90deg)' : 'none' }}>›</span>
                </button>
                {o ? (
                  <div className="grid gap-2 px-3 pb-2.5 sm:grid-cols-2">
                    <div className="rounded-[3px] border border-line-soft bg-surface-2/40 p-2">
                      <div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Infrastructure coverage</div>
                      {r.infra.map(inf => {
                        const it = inf.coverage >= 85 ? 'ok' : inf.coverage >= 65 ? 'warn' : 'alert';
                        return (
                          <div key={inf.l} className="mb-1 last:mb-0">
                            <div className="flex items-center justify-between text-[9px]"><span className="text-ink-soft">{inf.l}</span><span className="font-mono tabular-nums" style={{ color: TONE[it] }}>{inf.coverage}%</span></div>
                            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full" style={{ width: `${inf.coverage}%`, backgroundColor: TONE[it] }} /></div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="rounded-[3px] border border-line-soft bg-surface-2/40 p-2">
                      <div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Domain stress</div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                        {r.domains.map(d => {
                          const dt = d.v >= 78 ? 'alert' : d.v >= 58 ? 'warn' : d.v >= 40 ? 'neutral' : 'ok';
                          return (<React.Fragment key={d.k}><span className="uppercase text-ink-muted">{d.k}</span><span className="text-right font-mono tabular-nums" style={{ color: TONE[dt] }}>{d.v}</span></React.Fragment>);
                        })}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between border-t border-line-soft pt-1 text-[9px]">
                        <span className="text-ink-muted">Capital dependency</span>
                        <span className="font-mono tabular-nums" style={{ color: r.capitalDependency >= 70 ? TONE.warn : 'rgb(var(--c-ink-soft))' }}>{r.capital ? 'sovereign hub' : `${r.capitalDependency}%`}</span>
                      </div>
                      <Link href="/gov/coordination" className="focus-ring mt-1.5 inline-block text-[10px] text-link underline underline-offset-2">Coordinate region →</Link>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </Panel>
      </div>

      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Regional readiness ladder" meta="composite" bodyClass="!p-1.5">
          <div className="space-y-1">
            {[...regions].sort((a, b) => a.readiness - b.readiness).map(r => {
              const tn = POS_TONE[r.posture]!;
              return (
                <div key={r.name} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="truncate text-ink-soft">{r.capital ? '★ ' : ''}{r.name}</span>
                    <span className="font-mono tabular-nums" style={{ color: TONE[tn] }}>{r.readiness}%</span>
                  </div>
                  <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full transition-all duration-1000 ease-sov" style={{ width: `${r.readiness}%`, backgroundColor: TONE[tn] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Capital-dependency map" meta="centralisation risk" bodyClass="!p-1.5">
          <div className="space-y-1">
            {regions.filter(r => !r.capital).map(r => {
              const tn = r.capitalDependency >= 70 ? 'alert' : r.capitalDependency >= 50 ? 'warn' : 'ok';
              return (
                <div key={r.name} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-[11px] text-ink-soft">{r.name} → Capital</span>
                  <span className="font-mono text-[10px] tabular-nums" style={{ color: TONE[tn] }}>{r.capitalDependency}%</span>
                </div>
              );
            })}
            <p className="mt-1 text-[9px] text-ink-muted">High dependency = a Capital disruption cascades to that region.</p>
          </div>
        </Panel>

        <Panel title="Escalation cadence" meta="by region · 24h" bodyClass="!p-1.5">
          <div className="space-y-1">
            {regions.map(r => {
              const n = r.incidents;
              const tn = n >= 6 ? 'alert' : n >= 3 ? 'warn' : 'ok';
              return (
                <div key={r.name} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5 text-[10px]">
                  <span className="truncate text-ink-soft">{r.name}</span>
                  <span className="font-mono tabular-nums" style={{ color: TONE[tn] }}>{n} esc</span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Regional actions" meta="coordination authority" bodyClass="!p-1.5">
          <div className="grid grid-cols-2 gap-1">
            {[
              { l: 'Deploy field unit', g: '⛑', h: '/gov/coordination' },
              { l: 'Regional brief', g: '▤', h: '/gov' },
              { l: 'Resource shift', g: '⇄', h: '/ops' },
              { l: 'Escalate region', g: '⚠', h: '/gov/coordination' },
              { l: 'Sync provinces', g: '◉', h: '/gov/fabric' },
              { l: 'Situation Room', g: '◎', h: '/gov/situation-room' },
            ].map((q, i) => (
              <Link key={q.l} href={q.h} className="focus-ring group flex items-center gap-1.5 rounded-[3px] border border-line px-2 py-1.5 text-[10px] font-medium text-ink-soft no-underline transition-all hover:bg-surface-2/60">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[3px] bg-surface-2 text-[11px]" style={{ color: i === 3 ? TONE.warn : TONE.ok }}>{q.g}</span>
                <span className="min-w-0 truncate">{q.l}</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
        {[
          ['Field units', 'fu', 18, 56], ['Relief tempo', 'rt', 30, 88], ['Road status', 'rs', 55, 96],
          ['Comms uptime', 'cu', 80, 99], ['Power coverage', 'pc', 70, 98], ['Water pressure', 'wp', 45, 90],
          ['Shelter capacity', 'sc', 40, 92], ['Medical readiness', 'mr', 55, 96], ['Evac throughput', 'et', 30, 85],
          ['Border activity', 'ba', 15, 70], ['Supply buffer', 'sb', 35, 90], ['Patrol coverage', 'pv', 50, 95],
          ['Incident load', 'il', 0, 14], ['Sync health', 'sy', 80, 99], ['Drift', 'df', 0, 16], ['Cadence', 'cd', 30, 85],
        ].map(([l, k, lo, hi]) => {
          const L = l as string, K = k as string, LO = lo as number, HI = hi as number;
          const v = Math.round(waveSeries(`romg:${K}`, ts, 1, LO, HI).at(-1)!);
          const pct = ((v - LO) / (HI - LO)) * 100;
          const low = K === 'il' || K === 'df';
          const t = (low ? 100 - pct : pct) >= 60 ? 'ok' : (low ? 100 - pct : pct) >= 35 ? 'warn' : 'alert';
          const d = Math.round((waveSeries(`romgd:${K}`, ts, 1, 0, 1).at(-1)! - 0.45) * 12);
          return (
            <div key={K} className="rounded-[3px] border border-line bg-surface px-2 py-1" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.05)' }}>
              <div className="truncate text-[7.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{L}</div>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-[13px] leading-none tabular-nums" style={{ color: TONE[t] }}>{v}</span>
                <span className="ml-auto text-[8px]" style={{ color: d >= 0 ? TONE.ok : TONE.alert }}>{d >= 0 ? '▲' : '▼'}{Math.abs(d)}</span>
              </div>
              <div className="-mb-0.5 h-3.5 overflow-hidden opacity-70"><Spark pts={waveSeries(`romgs:${K}`, ts, 12, 35, 92)} tone={t} /></div>
            </div>
          );
        })}
      </div>

      <Panel title="Regional scenario projection" meta={projActive ? `${projLabel} · projected readiness` : 'select a shock to project'} bodyClass="!p-1.5">
        <div className="mb-2 grid grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-5">
          {SCENARIOS.map(sc => {
            const on = sc.key === scn;
            return (
              <button key={sc.key} onClick={() => setScn(sc.key)}
                className="focus-ring rounded-[3px] border px-2 py-1 text-left text-[10px] transition-all"
                style={{ borderColor: on ? TONE.link : 'rgb(var(--c-line))', backgroundColor: on ? `color-mix(in srgb, ${TONE.link} 12%, transparent)` : undefined, color: on ? TONE.link : 'rgb(var(--c-ink-soft))' }}>
                <span className="block truncate font-semibold">{sc.label}</span>
              </button>
            );
          })}
        </div>
        {projActive && projWorst ? (
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px]">
            <span className="rounded-[3px] px-1.5 py-0.5 font-bold uppercase" style={{ backgroundColor: `color-mix(in srgb, ${TONE.alert} 16%, transparent)`, color: TONE.alert }}>
              Worst-hit · {projWorst.name} ({projWorst.readinessDelta})
            </span>
            <span className="text-ink-muted">{projCritical} regions projected critical</span>
            <Link href={`/gov/simulation?s=${scn}`} className="ml-auto text-[10px] text-link underline underline-offset-2">Full simulation →</Link>
          </div>
        ) : null}
        <div className="space-y-1">
          {proj.map(r => {
            const tn = r.projectedPosture === 'critical' ? 'alert' : r.projectedPosture === 'elevated' ? 'warn' : r.projectedPosture === 'watch' ? 'neutral' : 'ok';
            return (
              <div key={r.name} className="flex items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5 text-[11px]">
                <span className="w-28 shrink-0 truncate text-ink-soft">{r.capital ? '★ ' : ''}{r.name}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <span className="block h-full" style={{ width: `${r.readiness}%`, backgroundColor: TONE[tn] }} />
                </div>
                <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums" style={{ color: TONE[tn] }}>{r.readiness}%</span>
                <span className="w-12 shrink-0 text-right font-mono text-[9px] tabular-nums" style={{ color: r.readinessDelta < 0 ? TONE.alert : 'rgb(var(--c-ink-muted))' }}>
                  {r.readinessDelta < 0 ? r.readinessDelta : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Infrastructure network pressure" meta="national digital twin" bodyClass="!p-1.5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {(['road', 'rail', 'grid', 'telecom', 'water', 'pipeline'] as const).map(k => {
            const p = networkPressure(k, ts);
            const tn = p >= 78 ? 'alert' : p >= 62 ? 'warn' : 'ok';
            return (
              <div key={k} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                <div className="truncate text-[8px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{k}</div>
                <div className="font-mono text-sm tabular-nums" style={{ color: TONE[tn] }}>{p}%</div>
                <div className="-mb-0.5 h-3 overflow-hidden opacity-70"><Spark pts={waveSeries(`ronp:${k}`, ts, 12, 30, 88)} tone={tn} /></div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line text-[10px] md:grid-cols-5">
        {[
          { l: 'Regional posture', v: roll.posture.toUpperCase(), t: POS_TONE[roll.posture]! },
          { l: 'Mean readiness', v: `${roll.meanReadiness}%`, t: roll.meanReadiness >= 60 ? 'ok' : 'warn' },
          { l: 'Critical regions', v: `${roll.critical} · ${roll.elevated} elevated`, t: roll.critical ? 'alert' : 'warn' },
          { l: 'Population', v: `${roll.population}M`, t: 'ok' },
          { l: 'Provinces synced', v: 'ALL', t: 'ok' },
        ].map(s => (
          <div key={s.l} className="flex items-center justify-between gap-2 bg-surface px-3 py-1.5">
            <span className="uppercase tracking-[0.14em] text-ink-muted">{s.l}</span>
            <span className="flex items-center gap-1.5 font-mono font-semibold tabular-nums" style={{ color: TONE[s.t] }}>
              {s.l === 'Regional posture' || s.l === 'Provinces synced' ? <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: TONE[s.t] }} /> : null}
              {s.v}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-ink-muted">
        Regional command is read-only and advisory. Composite posture is derived from operational, security, infrastructure and civil signals per region; capital-dependency models centralisation cascade risk. Regional coordinators hold deployment and escalation authority.
      </p>
    </div>
  );
}
