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
import { nationalEcosystem } from '@/lib/institution/blueprint';
import { legislativeState } from '@/lib/gov/legislative-engine';
import { judicialState } from '@/lib/gov/judicial-engine';
import { stateFabric } from '@/lib/gov/state-fabric';
import { nationalRuntime } from '@/lib/gov/national-runtime';
import { subscribe as auditSubscribe, auditStats, version as auditVersion } from '@/services/audit-ledger';
import { federationPosture, sovereignExecutionIndex } from '@/services/federation-aggregate';
import { deployableRoots } from '@/apps/deployment';
import { interoperabilityFabric } from '@/services/interoperability-fabric';
import { nationalHealthcareCapacity } from '@/lib/gov/health-systems';
import { useFederationSync } from '@/apps/useFederationSync';
import { subscribe as orchSubscribe, activatedApps, version as orchVersion } from '@/services/orchestration-engine';
import { subscribeBus, version as busVersion, eventLog, eventStats } from '@/services/event-bus';
import { subscribe as rtSubscribe, runtimeStats, scopeSummaries, executionDelta, version as rtVersion } from '@/lib/gov/runtime-store';
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

  const [fed, setFed] = React.useState<{ apps: { id: string; label: string; domain: string; kind: string; activated: boolean; navCount: number }[]; stats: { registered: number; activated: number } } | null>(null);
  React.useEffect(() => {
    const load = () => {
      api.sovereign.get().then(r => setSov(r.sovereign)).catch(() => {});
      api.cabinet.national().then(setNat).catch(() => {});
      api.org.ministries().then(r => setMins(r.ministries)).catch(() => {});
      api.org.federation().then(setFed).catch(() => {});
    };
    load();
    const poll = setInterval(load, 15_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, []);

  const ts = now / 4000;
  React.useSyncExternalStore(rtSubscribe, rtVersion, rtVersion);
  const liveRt = runtimeStats();
  React.useSyncExternalStore(auditSubscribe, auditVersion, auditVersion);
  const audit = auditStats();
  useFederationSync(mins);
  React.useSyncExternalStore(orchSubscribe, orchVersion, orchVersion);
  const fedApps = activatedApps();
  React.useSyncExternalStore(subscribeBus, busVersion, busVersion);
  const busEvents = eventLog(8);
  const busAgg = eventStats();
  const healthCap = nationalHealthcareCapacity(
    mins.filter(m => m.archetype === 'HEALTH' && m.status === 'active').map(m => m.id), ts,
  );
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
  const ne = nationalEcosystem(mins, ts);
  const fp = federationPosture(mins, ts, executionDelta);
  const iof = interoperabilityFabric(mins, ts);
  const sei = sovereignExecutionIndex({
    federationOperational: fp.institutions.length ? fp.meanOperational : 100,
    resilience: resilience.index,
    runtimeLoad: liveRt.open > 0 ? Math.min(100, liveRt.open) : 0,
    auditIntact: audit.intact,
  });
  const leg = legislativeState(ts, model.legislature.chambers.map(c => c.name).slice(0, 2));
  const jud = judicialState(ts);
  const constContinuity =
    !leg.quorum || jud.meanClearance < 60 ? { l: 'STRAINED', t: 'alert' as const }
      : leg.blocked >= 4 || jud.totalBacklog > 900 ? { l: 'WATCH', t: 'warn' as const }
        : { l: 'STABLE', t: 'ok' as const };

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

      <P title="Resilience stress matrix" meta="index drawdown under the top vectors">
        <div className="grid gap-1.5 sm:grid-cols-3">
          {sweep.slice(0, 3).map(r => {
            const st = resilienceUnderShock(mins, ts, r.key);
            return (
              <Link key={r.key} href={`/gov/simulation?s=${r.key}`} className="focus-ring flex flex-col rounded-[3px] border border-line-soft bg-surface-2/40 p-2 no-underline transition-colors hover:bg-surface-2/70">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[11px] font-semibold text-ink">{r.label}</span>
                  <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider" style={{ color: TONE[st.tone] }}>{st.band}</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-mono text-[12px] tabular-nums text-ink-muted">{st.baseline}</span>
                  <span className="text-[10px] text-ink-muted">→</span>
                  <span className="font-mono text-[18px] leading-none tabular-nums" style={{ color: TONE[st.tone] }}>{st.projected}</span>
                  <span className="ml-auto font-mono text-[11px] tabular-nums" style={{ color: st.drawdown > 0 ? TONE.alert : TONE.ok }}>−{st.drawdown}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${st.projected}%`, backgroundColor: TONE[st.tone] }} /></div>
              </Link>
            );
          })}
        </div>
      </P>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {tele.map(m => (
          <div key={m.l} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
            <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{m.l}</div>
            <div className="truncate font-mono text-[13px] leading-tight tabular-nums" style={{ color: TONE[m.t] }}>{m.v}</div>
            <div className="-mb-1 h-4 overflow-hidden opacity-70"><Spark pts={waveSeries(`nsh:${m.k}`, ts, 14, 40, 92)} tone={m.t} /></div>
          </div>
        ))}
      </div>

      {(() => {
        const st = sei.band === 'degraded' ? 'alert' : sei.band === 'strained' ? 'warn' : 'ok';
        return (
          <P title="Sovereign execution index" meta="emergent composite — institutional operations · resilience · runtime · audit">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[32px] leading-none tabular-nums" style={{ color: TONE[st] }}>{sei.index}</span>
                <span className="text-[10px] uppercase tracking-[0.16em]" style={{ color: TONE[st] }}>{sei.band}</span>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-1.5 sm:grid-cols-4">
                {sei.drivers.map(dvr => (
                  <div key={dvr.label} className="rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1">
                    <div className="truncate text-[8px] uppercase tracking-wider text-ink-muted">{dvr.label} · w{Math.round(dvr.weight * 100)}%</div>
                    <div className="font-mono text-[12px] tabular-nums text-ink-soft">{dvr.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </P>
        );
      })()}

      {(() => {
        const ptn = fp.posture === 'critical' ? 'alert' : fp.posture === 'strained' ? 'warn' : 'ok';
        return (
          <P title="Emergent national operational posture" meta={`RULE 3 · derived from ${fp.institutions.length} institutions' own engines — no hardcoded figure`}>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[30px] leading-none tabular-nums" style={{ color: TONE[ptn] }}>{fp.meanOperational}</span>
                <span className="text-[10px] uppercase tracking-[0.16em]" style={{ color: TONE[ptn] }}>{fp.posture}</span>
              </div>
              <span className="text-[10px] text-ink-muted">{fp.degraded} degraded · worst · <strong className="text-ink-soft">{fp.worst?.name ?? '—'}</strong></span>
            </div>
            {fp.institutions.length === 0 ? (
              <p className="text-[11px] text-ink-muted">No active institutions — national operational posture is undefined until institutions operate. It is not a fabricated number.</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-4">
                {fp.institutions.map(i => (
                  <Link key={i.id} href={`/ministries/${i.id}/operations`} className="focus-ring flex items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5 no-underline transition-colors hover:bg-surface-2/70">
                    <span className="min-w-0 flex-1 truncate text-[11px] text-ink">{i.name}</span>
                    <span className="shrink-0 text-[8px] uppercase tracking-wider text-ink-muted">{i.archetype}</span>
                    <span className="w-8 shrink-0 text-right font-mono text-[10px] tabular-nums" style={{ color: TONE[i.tone] }}>{i.operational}</span>
                  </Link>
                ))}
              </div>
            )}
          </P>
        );
      })()}

      {(() => {
        const itn = iof.posture === 'fragmented' ? 'alert' : iof.posture === 'strained' ? 'warn' : 'ok';
        return (
          <P title="Emergent interoperability fabric" meta={`RULE 2 · ${iof.edges.length} contracts from active federation · ${iof.meanHealth}% mean health`}>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <span className="rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${TONE[itn]} 16%, transparent)`, color: TONE[itn] }}>{iof.posture}</span>
              <span className="text-[10px] text-ink-muted">{iof.nodes} institutions · {iof.stressedLinks} stressed links — dependency health derived from real operational posture, not fabricated</span>
            </div>
            {iof.edges.length === 0 ? (
              <p className="text-[11px] text-ink-muted">No inter-institution contracts — provision more institutions to form the interoperability mesh.</p>
            ) : (
              <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                {iof.edges.slice(0, 9).map((e, i) => (
                  <Link key={i} href={`/ministries/${e.from}/operations`} className="focus-ring rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5 no-underline transition-colors hover:bg-surface-2/70">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[10px] text-ink">{e.fromName} <span className="text-ink-muted">→</span> {e.toName}</span>
                      <span className="shrink-0 font-mono text-[10px] tabular-nums" style={{ color: TONE[e.tone] }}>{e.health}</span>
                    </div>
                    <div className="truncate text-[8.5px] text-ink-muted">{e.relation} · {e.direction}</div>
                  </Link>
                ))}
              </div>
            )}
          </P>
        );
      })()}

      <P title="National institutional footprint" meta="every active institution, instantiated from its archetype">
        <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { l: 'Institutions', v: String(ne.institutions), t: 'ok' as const },
            { l: 'System groups', v: String(ne.groups), t: 'ok' as const },
            { l: 'Operational systems', v: String(ne.operational), t: 'ok' as const },
            { l: 'Degraded systems', v: String(ne.degraded), t: ne.degraded ? 'alert' as const : 'ok' as const },
            { l: 'Total systems', v: String(ne.systems), t: 'ok' as const },
            { l: 'Mean system health', v: `${ne.meanHealth}%`, t: ne.meanHealth >= 80 ? 'ok' as const : ne.meanHealth >= 65 ? 'warn' as const : 'alert' as const },
          ].map(s => (
            <div key={s.l} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
              <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{s.l}</div>
              <div className="font-mono text-[15px] tabular-nums" style={{ color: TONE[s.t] }}>{s.v}</div>
            </div>
          ))}
        </div>
        {ne.weakest.length ? (
          <div>
            <div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Most-degraded systems · government-wide</div>
            <div className="grid gap-1 sm:grid-cols-2">
              {ne.weakest.map((w, i) => (
                <div key={i} className="flex items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1 text-[10px]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: TONE.alert }} />
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{w.system}</span>
                  <span className="shrink-0 truncate text-[8.5px] text-ink-muted">{w.institution} · {w.group}</span>
                  <span className="w-9 shrink-0 text-right font-mono tabular-nums" style={{ color: TONE.alert }}>{w.uptime}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-ink-muted">All instantiated systems within tolerance across {ne.institutions} institutions.</p>
        )}
      </P>

      {(() => {
        const finOp = fp.institutions.find(i => i.archetype === 'FINANCE')?.operational ?? 100;
        const intOp = fp.institutions.find(i => i.archetype === 'INTERIOR')?.operational ?? 100;
        const rows = [
          { src: 'Judiciary', effect: 'Constitutional integrity', v: Math.max(0, 100 - (jud.totalBacklog > 900 ? 45 : jud.totalBacklog > 500 ? 25 : 8) - (100 - jud.meanClearance) * 0.4) },
          { src: 'Legislature', effect: 'Fiscal authorization', v: Math.max(0, 100 - (!leg.quorum ? 35 : 0) - leg.blocked * 8) },
          { src: 'Treasury', effect: 'National liquidity', v: finOp },
          { src: 'Police', effect: 'Civil stability', v: intOp },
        ].map(r => ({ ...r, v: Math.round(r.v) }));
        return (
          <P title="Institutional → national propagation" meta="RULE · national intelligence derived from institutional operations">
            <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
              {rows.map(r => {
                const tn = r.v >= 70 ? 'ok' : r.v >= 50 ? 'warn' : 'alert';
                return (
                  <div key={r.src} className="rounded-[3px] border border-line-soft bg-surface-2/40 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold text-ink">{r.src}</span>
                      <span className="font-mono text-[12px] tabular-nums" style={{ color: TONE[tn] }}>{r.v}</span>
                    </div>
                    <div className="mt-0.5 mb-1 h-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${r.v}%`, backgroundColor: TONE[tn] }} /></div>
                    <div className="text-[8.5px] text-ink-muted">→ {r.effect}</div>
                  </div>
                );
              })}
            </div>
          </P>
        );
      })()}

      <P title="Constitutional continuity" meta="legislature & judiciary as running institutions">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px]">
          <span className="rounded-[3px] px-1.5 py-0.5 font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${TONE[constContinuity.t]} 16%, transparent)`, color: TONE[constContinuity.t] }}>
            {constContinuity.l}
          </span>
          <span className="text-ink-muted">Branches propagate into whole-of-government posture</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/gov/branch/legislature" className="focus-ring rounded-[3px] border border-line-soft bg-surface-2/40 p-2 no-underline transition-colors hover:bg-surface-2/70">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-ink">Legislature</span>
              <span className="font-mono text-[10px] tabular-nums" style={{ color: leg.quorum ? TONE.ok : TONE.alert }}>{leg.quorum ? 'QUORUM' : 'AT RISK'}</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-[9px]">
              {[
                ['Bills', `${leg.bills.length}`, 'rgb(var(--c-ink))'],
                ['In session', `${leg.inSession}`, TONE.ok],
                ['Blocked', `${leg.blocked}`, leg.blocked ? TONE.alert : TONE.ok],
                ['Attend', `${leg.attendancePct}%`, leg.attendancePct >= 60 ? TONE.ok : TONE.warn],
              ].map(([l, v, c]) => (
                <div key={l} className="rounded-[3px] border border-line-soft bg-surface px-1 py-0.5">
                  <div className="truncate text-[7px] uppercase tracking-wider text-ink-muted">{l}</div>
                  <div className="font-mono tabular-nums" style={{ color: c as string }}>{v}</div>
                </div>
              ))}
            </div>
          </Link>
          <Link href="/gov/branch/judiciary" className="focus-ring rounded-[3px] border border-line-soft bg-surface-2/40 p-2 no-underline transition-colors hover:bg-surface-2/70">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-ink">Judiciary</span>
              <span className="font-mono text-[10px] tabular-nums" style={{ color: jud.meanClearance >= 75 ? TONE.ok : jud.meanClearance >= 60 ? TONE.warn : TONE.alert }}>{jud.meanClearance}% clearance</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-[9px]">
              {[
                ['Open', `${jud.openCases}`, 'rgb(var(--c-ink))'],
                ['Appeals', `${jud.appeals}`, TONE.warn],
                ['Const.', `${jud.constitutionalMatters}`, jud.constitutionalMatters ? TONE.warn : TONE.ok],
                ['Backlog', `${jud.totalBacklog}`, jud.totalBacklog > 900 ? TONE.alert : jud.totalBacklog > 500 ? TONE.warn : TONE.ok],
              ].map(([l, v, c]) => (
                <div key={l} className="rounded-[3px] border border-line-soft bg-surface px-1 py-0.5">
                  <div className="truncate text-[7px] uppercase tracking-wider text-ink-muted">{l}</div>
                  <div className="font-mono tabular-nums" style={{ color: c as string }}>{v}</div>
                </div>
              ))}
            </div>
          </Link>
        </div>
      </P>

      {(() => {
        const sf = stateFabric(mins, ts);
        const ctn = sf.contagion === 'systemic' ? 'alert' : sf.contagion === 'coupled-stress' ? 'warn' : 'ok';
        return (
          <P title="Cross-system propagation" meta={`state fabric · ${sf.contagion} · systemic ${sf.systemicStress}`}>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px]">
              <span className="rounded-[3px] px-1.5 py-0.5 font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${TONE[ctn]} 16%, transparent)`, color: TONE[ctn] }}>
                {sf.contagion}
              </span>
              <span className="text-ink-muted">No institution is an island — instability propagates across coupled domains. Worst source · <strong className="text-ink-soft">{sf.worst}</strong></span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {sf.domains.map(d => (
                <div key={d.domain} className="rounded-[3px] border border-line-soft bg-surface-2/40 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold capitalize text-ink">{d.label}</span>
                    <span className="font-mono text-[12px] tabular-nums" style={{ color: TONE[d.tone] }}>{d.instability}</span>
                  </div>
                  <div className="mt-1 mb-1 h-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${d.instability}%`, backgroundColor: TONE[d.tone] }} /></div>
                  <ul className="space-y-0.5">
                    {d.effects.map((e, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-[9px]">
                        <span className="h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: e.magnitude >= 65 ? TONE.alert : e.magnitude >= 40 ? TONE.warn : TONE.ok }} />
                        <span className="min-w-0 flex-1 truncate text-ink-soft">{e.target}</span>
                        <span className="shrink-0 font-mono tabular-nums text-ink-muted">{e.magnitude}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {sf.sectors.length ? (
              <div className="mt-2 border-t border-line-soft pt-2">
                <div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Sector instability · all line ministries</div>
                <div className="flex flex-wrap gap-1">
                  {sf.sectors.map(s => (
                    <span key={s.archetype} className="rounded-[3px] border border-line-soft bg-surface px-1.5 py-0.5 text-[9px]" style={{ color: TONE[s.tone] }}>
                      {s.archetype} {s.instability}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </P>
        );
      })()}

      {(() => {
        const rt = nationalRuntime(mins, ts);
        const pt = rt.posture === 'overloaded' ? 'alert' : rt.posture === 'strained' ? 'warn' : 'ok';
        return (
          <P title="National operations runtime" meta={`work backlog · ${rt.posture} · ${rt.throughputPerHr}/h throughput`}>
            <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {[
                { l: 'Open work items', v: rt.totalOpen.toLocaleString(), t: 'ok' as const },
                { l: 'Urgent', v: `${rt.totalUrgent}`, t: rt.totalUrgent > 80 ? 'alert' as const : 'warn' as const },
                { l: 'SLA breaching', v: `${rt.totalBreaching}`, t: rt.totalBreaching > 80 ? 'alert' as const : 'warn' as const },
                { l: 'Throughput/hr', v: `${rt.throughputPerHr}`, t: 'ok' as const },
                { l: 'Mean load', v: `${rt.meanLoad}`, t: pt },
                { l: 'Operator transitions', v: `${liveRt.transitions}`, t: 'ok' as const },
                { l: 'Audit chains', v: `${audit.scopes} · ${audit.intact ? 'intact' : 'BREACH'}`, t: audit.intact ? 'ok' as const : 'alert' as const },
              ].map(s => (
                <div key={s.l} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
                  <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{s.l}</div>
                  <div className="font-mono text-[15px] tabular-nums" style={{ color: TONE[s.t] }}>{s.v}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
              {rt.institutions.slice(0, 9).map(i => {
                const it = i.load >= 65 ? 'alert' : i.load >= 42 ? 'warn' : 'ok';
                return (
                  <Link key={i.id} href={`/ministries/${i.id}/operations`} className="focus-ring flex items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5 no-underline transition-colors hover:bg-surface-2/70">
                    <span className="min-w-0 flex-1 truncate text-[11px] text-ink">{i.name}</span>
                    <span className="shrink-0 text-[8.5px] text-ink-muted">{i.open} open · {i.urgent}!</span>
                    <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums" style={{ color: TONE[it] }}>{i.load}</span>
                  </Link>
                );
              })}
            </div>
            <div className="mt-1.5 text-right">
              <Link href="/gov/ledger" className="text-[10px] text-link underline underline-offset-2">Operations Ledger →</Link>
            </div>
          </P>
        );
      })()}

      <P title="Healthcare capacity" meta={healthCap.hospitals ? `emergent from ${healthCap.hospitals} active health institution(s)` : 'no health institution provisioned'}>
        {healthCap.hospitals === 0 ? (
          <p className="text-[11px] text-ink-muted">No Ministry of Health is active. National healthcare capacity is <strong>not a hardcoded figure</strong> — it emerges from real hospital/ICU/ambulance/doctor state once a health institution is provisioned.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {[
              { l: 'Capacity index', v: `${healthCap.capacityIndex}`, t: healthCap.tone },
              { l: 'Bed occupancy', v: `${healthCap.bedOccupancyPct}%`, t: healthCap.bedOccupancyPct >= 92 ? 'alert' as const : healthCap.bedOccupancyPct >= 82 ? 'warn' as const : 'ok' as const },
              { l: 'ICU occupancy', v: `${healthCap.icuOccupancyPct}%`, t: healthCap.icuOccupancyPct >= 95 ? 'alert' as const : healthCap.icuOccupancyPct >= 85 ? 'warn' as const : 'ok' as const },
              { l: 'Ambulances available', v: `${healthCap.ambulanceAvailablePct}%`, t: healthCap.ambulanceAvailablePct >= 40 ? 'ok' as const : 'warn' as const },
              { l: 'Doctor availability', v: `${healthCap.doctorAvailabilityPct}%`, t: healthCap.doctorAvailabilityPct >= 30 ? 'ok' as const : 'warn' as const },
            ].map(s => (
              <div key={s.l} className="rounded-[3px] border border-line bg-surface px-3 py-2" style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}>
                <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{s.l}</div>
                <div className="font-mono text-[15px] tabular-nums" style={{ color: TONE[s.t] }}>{s.v}</div>
              </div>
            ))}
          </div>
        )}
      </P>

      {(() => {
        // RULE 2/3: the platform aggregates from institutional systems —
        // server-authoritative federation is the source of truth; the
        // client registry is a fallback mirror.
        const serverApps = (fed?.apps ?? []).filter(a => a.activated);
        const apps = serverApps.length
          ? serverApps.map(a => ({ id: a.id, label: a.label, domain: a.domain, kind: a.kind, navCount: a.navCount, instanceId: undefined as string | undefined }))
          : fedApps.map(a => ({ id: a.id, label: a.label, domain: a.domain, kind: a.kind, navCount: a.nav.length, instanceId: a.instanceId }));
        const meta = fed
          ? `${fed.stats.activated}/${fed.stats.registered} sovereign applications · server-authoritative federation`
          : `${fedApps.length} sovereign applications · orchestration registry`;
        const opByArch = new Map(fp.institutions.map(i => [i.archetype, i]));
        const DOMAIN_ARCH: Record<string, string> = {
          health: 'HEALTH', treasury: 'FINANCE', education: 'EDUCATION', transport: 'TRANSPORT',
          energy: 'ENERGY', agriculture: 'AGRICULTURE', justice: 'JUSTICE', environment: 'ENVIRONMENT',
          interior: 'INTERIOR', labour: 'LABOR', trade: 'TRADE',
        };
        return (
          <P title="Federated institutions" meta={`${meta} · live posture emergent from operations`}>
            {apps.length === 0 ? (
              <p className="text-[11px] text-ink-muted">No institutional applications activated. Provision and activate an institution — its sovereign application registers and appears here automatically.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {apps.map(a => {
                  const op = opByArch.get((DOMAIN_ARCH[a.domain] ?? '') as never);
                  return (
                    <Link key={`${a.id}:${a.instanceId ?? ''}`} href={`/app/${a.domain}`} className="focus-ring group flex flex-col rounded-[3px] border border-line bg-bg p-2.5 no-underline transition-all hover:-translate-y-0.5 hover:border-link/40">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[12px] font-semibold text-ink">{a.label}</span>
                        <span className="shrink-0 rounded-[3px] px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${TONE.ok} 18%, transparent)`, color: TONE.ok }}>{a.kind}</span>
                      </div>
                      <span className="mt-0.5 font-mono text-[9px] lowercase tracking-wide text-ink-muted">{a.domain}.gov · {a.navCount} systems</span>
                      {op ? (
                        <span className="mt-1 flex items-center gap-1.5">
                          <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full" style={{ width: `${op.operational}%`, backgroundColor: TONE[op.tone] }} /></span>
                          <span className="font-mono text-[9px] tabular-nums" style={{ color: TONE[op.tone] }}>{op.operational}</span>
                        </span>
                      ) : null}
                      <span className="mt-2 flex items-center justify-between border-t border-line pt-1.5 text-[10px] text-link">Enter application<span className="transition-transform group-hover:translate-x-0.5">→</span></span>
                    </Link>
                  );
                })}
              </div>
            )}
          </P>
        );
      })()}

      {(() => {
        const ss = scopeSummaries().slice(0, 10);
        if (ss.length === 0) return null;
        return (
          <P title="Institutional execution" meta="live work scopes — emergent from operational runtimes">
            <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
              {ss.map(s => {
                const tn = s.open > 12 ? 'alert' : s.open > 6 ? 'warn' : 'ok';
                return (
                  <div key={s.scope} className="flex items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5 text-[10px]">
                    <span className="min-w-0 flex-1 truncate font-mono text-ink-soft">{s.scope}</span>
                    <span className="shrink-0 text-ink-muted">{s.transitions} tx</span>
                    <span className="w-12 shrink-0 text-right font-mono tabular-nums" style={{ color: TONE[tn] }}>{s.open}/{s.total}</span>
                  </div>
                );
              })}
            </div>
          </P>
        );
      })()}

      <P title="Deployable federation topology" meta="federation management · institution = deployment boundary">
        <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {deployableRoots().map(r => (
            <Link key={r.root} href={`/app/${r.domain}`} className="focus-ring flex items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1.5 no-underline transition-colors hover:bg-surface-2/70">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] text-ink">{r.label}</span>
                <span className="block truncate font-mono text-[8.5px] lowercase text-ink-muted">apps/{r.root} · {r.domain}.gov · {r.subsystems.length} subsystems</span>
              </span>
              <span className="shrink-0 rounded-[3px] px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ backgroundColor: `color-mix(in srgb, ${TONE.ok} 16%, transparent)`, color: TONE.ok }}>{r.kind}</span>
            </Link>
          ))}
        </div>
        <p className="mt-1.5 text-[9px] text-ink-muted">Each is an independently deployable sovereign root; subsystems live inside the institution, never as separate deployments. The platform root is the nervous system only.</p>
      </P>

      <P title="Sovereign event bus" meta={`${busAgg.total} federation events · institutions emit, the platform consumes`}>
        {busEvents.length === 0 ? (
          <p className="text-[11px] text-ink-muted">No federation events yet. Activating institutions and entering their applications emits registration & metric events here.</p>
        ) : (
          <div className="space-y-1">
            {busEvents.map((e, i) => (
              <div key={i} className="flex items-center gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1 text-[10px]">
                <span className="w-16 shrink-0 font-mono tabular-nums text-ink-muted">{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <span className="w-36 shrink-0 truncate font-mono text-ink-soft">{e.type}</span>
                <span className="min-w-0 flex-1 truncate text-ink-muted">{e.source}</span>
              </div>
            ))}
          </div>
        )}
      </P>

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
              const linkable = !c.id.startsWith('ext:');
              const body = (
                <>
                  <span className="truncate text-ink-soft">{c.name.replace(/ Ministry| \(capability\)/, '')}</span>
                  <span className="font-mono tabular-nums" style={{ color: TONE[tn] }}>{c.totalStress}{c.inheritedStress ? ` (+${c.inheritedStress})` : ''}</span>
                </>
              );
              return linkable ? (
                <Link key={c.id} href={`/ministries/${c.id}/operations`} className="focus-ring flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1 text-[11px] no-underline transition-colors hover:bg-surface-2/70">{body}</Link>
              ) : (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1 text-[11px]">{body}</div>
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
                <Link key={r.name} href={`/gov/regional?region=${encodeURIComponent(r.name)}`}
                  className="focus-ring flex items-center justify-between gap-2 rounded-[3px] border border-line-soft bg-surface-2/40 px-2 py-1 text-[11px] no-underline transition-colors hover:bg-surface-2/70">
                  <span className="truncate text-ink-soft">{r.capital ? '★ ' : ''}{r.name}</span>
                  <span className="font-mono tabular-nums" style={{ color: TONE[tn] }}>{r.readiness}%{r.incidents ? ` · ${r.incidents} inc` : ''}</span>
                </Link>
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
