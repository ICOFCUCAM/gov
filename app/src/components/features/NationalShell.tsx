'use client';

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { TONE, Spark, waveSeries } from '@/components/features/SituationRoom';
import { deployableInstitutions } from '@/lib/institution/readiness';
import { buildCascade } from '@/lib/institution/cascade';
import { buildNationalFabric } from '@/lib/institution/national-fabric';
import { constitutionFor } from '@/lib/gov/constitution';
import { branchReadiness, separationIntegrity } from '@/lib/gov/branches';
import { nationalRegions, regionRollup } from '@/lib/gov/regions';
import { networkPressure } from '@/lib/gov/infrastructure';
import { serviceReadings } from '@/lib/gov/ministry-services';
import { scenarioSweep } from '@/lib/gov/simulation';
import { nationalResilience, resilienceUnderShock } from '@/lib/gov/national-resilience';
import { resolveIdentity } from '@/lib/sovereign-identity';
import type { SovereignProfile, NationalSnapshot, Ministry } from '@/lib/api/types';

function P({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <section className="flex min-h-0 flex-col rounded-[3px] border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-2.5 py-1.5" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">{title}</h2>
        {meta ? <span className="text-[10px] text-ink-muted">{meta}</span> : null}
      </div>
      <div className="min-h-0 flex-1 p-2.5">{children}</div>
    </section>
  );
}

// The National Shell is the whole-of-government orchestration layer:
// it does NOT replicate the Situation Room (real-time ops) or Cabinet
// (executive command). It binds the four estates of the platform —
// constitution, institutions, interoperability, posture — into one
// sovereign control surface.
export function NationalShell() {
  const [sov, setSov] = React.useState<SovereignProfile | null>(null);
  const [nat, setNat] = React.useState<NationalSnapshot | null>(null);
  const [mins, setMins] = React.useState<Ministry[]>([]);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const load = () => {
      api.sovereign.get().then(r => setSov(r.sovereign)).catch(() => {});
      api.cabinet.national().then(setNat).catch(() => {});
      api.org.ministries().then(r => setMins(r.ministries)).catch(() => {});
    };
    load();
    const poll = setInterval(load, 15_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, []);

  const ts = now / 4000;
  const identity = sov ? resolveIdentity(sov) : null;
  const model = constitutionFor(sov?.stateForm ?? 'republic');
  const dir = deployableInstitutions(mins);
  const fabric = buildNationalFabric(mins);
  const cascade = buildCascade(mins, (mid) => Math.round(waveSeries(`nh:${mid}`, ts, 1, 58, 99).at(-1)!));
  const sep = separationIntegrity(ts);
  const deployable = dir.filter(d => d.readiness.deployable).length;
  const meanReady = dir.length ? Math.round(dir.reduce((a, d) => a + d.readiness.total, 0) / dir.length) : 0;
  const cascCrit = cascade.filter(c => c.posture === 'critical').length;
  const cascStrain = cascade.filter(c => c.posture === 'strained').length;
  const incidents = nat?.crossMinistryIncidents ?? [];
  const branchMean = Math.round(model.branches.reduce((a, b) => a + branchReadiness(b.key, ts).total, 0) / model.branches.length);

  const posture =
    cascCrit || incidents.length >= 5 ? { l: 'STRAINED', t: 'alert' }
      : cascStrain || incidents.length ? { l: 'WATCH', t: 'warn' } : { l: 'STABLE', t: 'ok' };

  const tele = [
    { l: 'National posture', v: posture.l, t: posture.t, k: 'np' },
    { l: 'Active institutions', v: `${dir.length}`, t: 'ok', k: 'ai' },
    { l: 'Deployable', v: `${deployable}/${dir.length || 0}`, t: deployable === dir.length ? 'ok' : 'warn', k: 'dp' },
    { l: 'Mean readiness', v: `${meanReady}%`, t: meanReady >= 70 ? 'ok' : 'warn', k: 'mr' },
    { l: 'Branch mean', v: `${branchMean}%`, t: branchMean >= 75 ? 'ok' : 'warn', k: 'br' },
    { l: 'Separation', v: sep.intact ? 'INTACT' : 'STRAINED', t: sep.intact ? 'ok' : 'alert', k: 'sp' },
  ];

  const svcHealth = dir.map(({ ministry: m }) => {
    const rs = serviceReadings(m.id, m.archetype, ts);
    const alert = rs.filter(r => r.tone === 'alert').length;
    const warn = rs.filter(r => r.tone === 'warn').length;
    const ok = rs.length - alert - warn;
    const idx = rs.length ? Math.round((ok * 100 + warn * 45) / rs.length) : 100;
    return { id: m.id, name: m.name, archetype: m.archetype, total: rs.length, alert, warn, idx };
  }).sort((a, b) => a.idx - b.idx);
  const svcDegraded = svcHealth.filter(s => s.alert > 0).length;
  const svcMean = svcHealth.length ? Math.round(svcHealth.reduce((a, s) => a + s.idx, 0) / svcHealth.length) : 100;

  const resilience = nationalResilience(mins, ts);
  const sweep = scenarioSweep(ts);
  const lead = sweep[0];
  const leadTone = !lead ? 'ok' : lead.band === 'severe' || lead.band === 'high' ? 'alert' : lead.band === 'elevated' ? 'warn' : 'ok';
  const stress = lead ? resilienceUnderShock(mins, ts, lead.key) : null;

  const regions = nationalRegions(ts);
  const rRoll = regionRollup(regions);
  const rTone = rRoll.posture === 'critical' ? 'alert' : rRoll.posture === 'elevated' ? 'warn' : rRoll.posture === 'watch' ? 'neutral' : 'ok';

  const estates = [
    { l: 'Constitutional Architecture', s: model.label, href: '/gov/branches', v: `${model.branches.length} branches`, t: sep.intact ? 'ok' : 'alert' },
    { l: 'Regional Command', s: `${regions.length} regions · ${rRoll.population}M`, href: '/gov/regional', v: `${rRoll.meanReadiness}% ready`, t: rTone },
    { l: 'National Simulation', s: lead ? `Lead · ${lead.label}` : 'Scenario · cascade what-if', href: lead ? `/gov/simulation?s=${lead.key}` : '/gov/simulation', v: lead ? `${lead.composite} risk` : '10 vectors', t: leadTone },
    { l: 'Cabinet Intelligence', s: 'Executive command', href: '/gov', v: posture.l, t: posture.t },
    { l: 'Situation Room', s: 'Real-time operations', href: '/gov/situation-room', v: `${incidents.length} incidents`, t: incidents.length ? 'warn' : 'ok' },
    { l: 'National Coordination', s: 'Dependency · cascade', href: '/gov/coordination', v: `${cascCrit + cascStrain} cascade`, t: cascCrit ? 'alert' : cascStrain ? 'warn' : 'ok' },
    { l: 'Interoperability Fabric', s: 'Whole-of-government mesh', href: '/gov/fabric', v: `${fabric.stats.links} links`, t: 'ok' },
    { l: 'Operations Centre', s: 'Cross-institution state', href: '/ops', v: 'Operational', t: 'ok' },
    { l: 'Oversight', s: 'Audit · integrity', href: '/audit', v: nat?.totals.auditIntact === false ? 'Review' : 'Intact', t: nat?.totals.auditIntact === false ? 'alert' : 'ok' },
    { l: 'Institutions Admin', s: 'Compose · activate', href: '/ministries', v: `${mins.length} composed`, t: 'ok' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-[3px] text-[11px] font-bold text-white" style={{ backgroundColor: identity ? 'rgb(var(--c-link))' : 'rgb(var(--c-line))' }}>{identity?.seal ?? 'NS'}</span>
          <h1 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">National Shell</h1>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}>{sov?.stateName ?? 'Sovereign'} · {model.label}</span>
          <span className="font-mono text-[10px] tabular-nums text-ink-muted">{new Date(now).toLocaleTimeString()}</span>
        </div>
        <span className="rounded-[3px] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]"
          style={{ borderColor: TONE[posture.t], color: TONE[posture.t], backgroundColor: `color-mix(in srgb, ${TONE[posture.t]} 12%, transparent)` }}>
          Whole-of-government posture · {posture.l}
        </span>
      </div>

      <p className="text-[11px] text-ink-muted">
        The orchestration layer binding the constitution, the institution factory, the interoperability fabric and national posture into one sovereign control surface — distinct from real-time operations (Situation Room) and executive command (Cabinet).
      </p>

      <div className="rounded-[3px] border border-line bg-surface" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[34px] leading-none tabular-nums" style={{ color: TONE[resilience.tone] }}>{resilience.index}</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">National Resilience Index</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: TONE[resilience.tone] }}>
                {resilience.band}{resilience.weakest ? ` · weakest · ${resilience.weakest.label}` : ''}
              </span>
            </div>
            {stress && stress.drawdown > 0 ? (
              <div className="ml-2 flex flex-col border-l border-line pl-3">
                <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Under lead vector</span>
                <span className="font-mono text-[15px] leading-none tabular-nums" style={{ color: TONE[stress.tone] }}>
                  {stress.projected}<span className="ml-1 text-[10px]" style={{ color: TONE.alert }}>−{stress.drawdown}</span>
                </span>
                <span className="text-[8px] text-ink-muted">{stress.scenarioLabel}</span>
              </div>
            ) : null}
          </div>
          <div className="grid flex-1 grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5">
            {resilience.pillars.map(p => (
              <div key={p.key} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[8px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{p.label}</span>
                  <span className="font-mono text-[11px] tabular-nums" style={{ color: TONE[p.tone] }}>{p.score}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${p.score}%`, backgroundColor: TONE[p.tone] }} /></div>
                <div className="mt-0.5 truncate text-[8px] text-ink-muted">{p.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {tele.map(m => (
          <div key={m.l} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
            <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{m.l}</div>
            <div className="truncate font-mono text-[13px] leading-tight tabular-nums" style={{ color: TONE[m.t] }}>{m.v}</div>
            <div className="-mb-1 h-4 overflow-hidden opacity-70"><Spark pts={waveSeries(`nsh:${m.k}`, ts, 14, 40, 92)} tone={m.t} /></div>
          </div>
        ))}
      </div>

      <P title="State estates" meta="whole-of-government launchpad">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {estates.map(e => (
            <Link key={e.l} href={e.href} className="focus-ring group flex flex-col rounded-[3px] border border-line bg-bg p-2.5 no-underline transition-all hover:-translate-y-0.5 hover:border-link/40">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[12px] font-semibold text-ink">{e.l}</span>
                <span className="shrink-0 rounded-[3px] px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${TONE[e.t]} 18%, transparent)`, color: TONE[e.t] }}>{e.v}</span>
              </div>
              <span className="mt-0.5 text-[10px] text-ink-muted">{e.s}</span>
              <span className="mt-2 flex items-center justify-between border-t border-line pt-1.5 text-[10px] text-link">Enter<span className="transition-transform group-hover:translate-x-0.5">→</span></span>
            </Link>
          ))}
        </div>
      </P>

      <div className="grid gap-2 xl:grid-cols-3">
        <P title="Institutions" meta={`${dir.length} active · ${deployable} deployable`}>
          <div className="space-y-1">
            {dir.length === 0 ? <p className="text-[11px] text-ink-muted">No activated institutions. <Link href="/ministries" className="text-link underline">Compose →</Link></p> : dir.slice(0, 7).map(({ ministry: m, readiness: r }) => (
              <Link key={m.id} href={`/gov/ministry/${m.id}`} className="focus-ring flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1 no-underline transition-colors hover:bg-surface-2/70">
                <span className="min-w-0 truncate text-[11px] text-ink">{m.name}</span>
                <span className="font-mono text-[10px] tabular-nums" style={{ color: r.deployable ? TONE.ok : TONE.warn }}>{r.total}%</span>
              </Link>
            ))}
          </div>
        </P>
        <P title="Cascade posture" meta="whole-of-government propagation">
          <div className="mb-1.5 flex gap-2 text-[10px]">
            <span className="rounded-[3px] px-1.5 py-0.5 font-bold" style={{ backgroundColor: `color-mix(in srgb, ${TONE.alert} 16%, transparent)`, color: TONE.alert }}>{cascCrit} critical</span>
            <span className="rounded-[3px] px-1.5 py-0.5 font-bold" style={{ backgroundColor: `color-mix(in srgb, ${TONE.warn} 16%, transparent)`, color: TONE.warn }}>{cascStrain} strained</span>
            <Link href="/gov/fabric" className="ml-auto text-[10px] text-link underline underline-offset-2">Fabric →</Link>
          </div>
          <div className="space-y-1">
            {cascade.slice(0, 6).map(c => {
              const tn = c.posture === 'critical' ? 'alert' : c.posture === 'strained' ? 'warn' : c.posture === 'watch' ? 'neutral' : 'ok';
              return (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1 text-[11px]">
                  <span className="truncate text-ink-soft">{c.name.replace(/ Ministry| \(capability\)/, '')}</span>
                  <span className="font-mono tabular-nums" style={{ color: TONE[tn] }}>{c.totalStress}{c.inheritedStress ? ` (+${c.inheritedStress})` : ''}</span>
                </div>
              );
            })}
          </div>
        </P>
        <P title="Regional posture" meta={`${rRoll.critical} critical · ${rRoll.elevated} elevated`}>
          <div className="mb-1.5 flex items-center gap-2 text-[10px]">
            <span className="rounded-[3px] px-1.5 py-0.5 font-bold uppercase" style={{ backgroundColor: `color-mix(in srgb, ${TONE[rTone]} 16%, transparent)`, color: TONE[rTone] }}>{rRoll.posture}</span>
            <span className="text-ink-muted">{rRoll.meanReadiness}% mean readiness</span>
            <Link href="/gov/regional" className="ml-auto text-[10px] text-link underline underline-offset-2">Regional Command →</Link>
          </div>
          <div className="space-y-1">
            {[...regions].sort((a, b) => a.readiness - b.readiness).map(r => {
              const tn = r.posture === 'critical' ? 'alert' : r.posture === 'elevated' ? 'warn' : r.posture === 'watch' ? 'neutral' : 'ok';
              return (
                <div key={r.name} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1 text-[11px]">
                  <span className="truncate text-ink-soft">{r.capital ? '★ ' : ''}{r.name}</span>
                  <span className="font-mono tabular-nums" style={{ color: TONE[tn] }}>{r.readiness}%{r.incidents ? ` · ${r.incidents} inc` : ''}</span>
                </div>
              );
            })}
          </div>
        </P>
      </div>

      <P title="Service signature health" meta={`${svcMean}% mean · ${svcDegraded} institutions degraded`}>
        {svcHealth.length === 0 ? (
          <p className="text-[11px] text-ink-muted">No activated institutions. <Link href="/ministries" className="text-link underline">Compose →</Link></p>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
            {svcHealth.map(s => {
              const tn = s.alert ? 'alert' : s.warn ? 'warn' : 'ok';
              return (
                <Link key={s.id} href={`/control?ministry=${s.id}`} className="focus-ring flex items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5 no-underline transition-colors hover:bg-surface-2/70">
                  <span className="min-w-0 flex-1 truncate text-[11px] text-ink">{s.name}</span>
                  <span className="shrink-0 text-[9px] uppercase tracking-wider text-ink-muted">{s.archetype}</span>
                  <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${s.idx}%`, backgroundColor: TONE[tn] }} /></div>
                  <span className="w-16 shrink-0 text-right font-mono text-[10px] tabular-nums" style={{ color: TONE[tn] }}>
                    {s.idx}%{s.alert ? ` ·${s.alert}!` : s.warn ? ` ·${s.warn}` : ''}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </P>

      <P title="National infrastructure pressure" meta="digital-twin networks">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {(['road', 'rail', 'grid', 'telecom', 'water', 'pipeline'] as const).map(k => {
            const p = networkPressure(k, ts);
            const tn = p >= 78 ? 'alert' : p >= 62 ? 'warn' : 'ok';
            return (
              <div key={k} className="rounded-[3px] border border-line bg-surface px-2.5 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.05)' }}>
                <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{k}</div>
                <div className="font-mono text-base tabular-nums" style={{ color: TONE[tn] }}>{p}%</div>
                <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${p}%`, backgroundColor: TONE[tn] }} /></div>
              </div>
            );
          })}
        </div>
      </P>

      <p className="text-[10px] text-ink-muted">Read-only orchestration. The National Shell binds the estates; humans govern through the constituted branches and command surfaces.</p>
    </div>
  );
}
