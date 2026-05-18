'use client';

// Executive Briefing Chamber — the executive-facing strategic governance
// surface. Calm, classified, decision-focused. It renders the shared
// sovereign operating doctrine (governIncident / nationalPosture /
// nationalOperatingState / forecast); it does not script its own logic.

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { resolveIdentity } from '@/lib/sovereign-identity';
import type { NationalSnapshot, NationalCoordination, SovereignProfile } from '@/lib/api/types';
import { Panel, TONE, ACCENT, PALETTE, LiveValue, seed } from '@/components/features/SituationRoom';
import {
  governIncident, nationalPosture, nationalOperatingState, forecast,
  ministryBehavior, ministryReliability, ministryInteraction, coordinationLoad,
  nationalSociety, externalEnvironment, strategicForesight, simulateDoctrines,
  nationalSustainability, politicalContinuity,
} from '@/lib/gov/sovereign-operating-model';

const sev = (s: string) => (s === 'sev1' ? 3 : s === 'sev2' ? 2 : 1);

function Stat({ label, value, tone = 'ok', note }: { label: string; value: string; tone?: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line-soft py-1.5 last:border-0">
      <span className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">{label}</span>
      <span className="flex items-baseline gap-2">
        {note ? <span className="text-[10px] text-ink-muted">{note}</span> : null}
        <span className="font-mono text-sm tabular-nums" style={{ color: TONE[tone] ?? 'rgb(var(--c-ink))' }}>
          <LiveValue raw={value} />
        </span>
      </span>
    </div>
  );
}

export function ExecutiveBriefingChamber() {
  const [nat, setNat] = React.useState<NationalSnapshot | null>(null);
  const [coord, setCoord] = React.useState<NationalCoordination | null>(null);
  const [sov, setSov] = React.useState<SovereignProfile | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const load = async () => {
      const [n, c, s] = await Promise.all([
        api.cabinet.national().catch(() => null),
        api.cabinet.coordination().catch(() => null),
        api.sovereign.get().then(r => r.sovereign).catch(() => null),
      ]);
      setNat(n); setCoord(c); setSov(s);
    };
    void load();
    const poll = setInterval(() => void load(), 10_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, []);

  const tickN = coord?.tick ?? 0;
  const epoch = Math.floor(tickN / 2);
  const ts = now / 4000;
  const identity = sov ? resolveIdentity(sov) : null;

  const nodes = coord?.nodes ?? [];
  const fabricById = new Map((coord?.fabric ?? []).map(f => [f.ministryId, f] as const));
  const pressureOf = (n: { ministryId: string; riskScore: number }) =>
    fabricById.get(n.ministryId)?.pressure ?? n.riskScore;
  const incidents = nat?.crossMinistryIncidents ?? [];
  const aggP = nodes.length ? Math.round(nodes.reduce((s, n) => s + pressureOf(n), 0) / nodes.length) : 38;
  const peakP = nodes.length ? Math.max(...nodes.map(pressureOf)) : 50;
  const sevLoad = incidents.filter(i => i.severity === 'sev1' || i.severity === 'sev2').length;
  const opS = nationalOperatingState(ts, aggP, peakP, sevLoad, incidents.length, epoch);
  const post = nationalPosture(epoch);
  const nationalRisk = coord?.posture.nationalRisk ?? 42;
  const critCount = incidents.filter(i => i.severity === 'sev1').length;

  // Executive triage — what national leadership must weigh right now.
  const threats = incidents.map((c, i) => {
    const ageM = 2 + Math.floor(seed(`ag:${c.ministry}:${i}`) * 58);
    const ack = seed(`ack:${c.ministry}:${i}:${epoch}`) > 0.45;
    const prop = Math.round(40 + seed(`pr:${c.ministry}:${i}:${epoch}`) * 58);
    const g = governIncident({
      archetype: String(c.archetype), severity: c.severity, ageM, ack, epoch,
      ministryId: c.ministryId, prop,
      contention: opS.contention, telecom: opS.display.telecom,
      reservesHeadroom: opS.resources.reserves.headroom,
      transportUtil: opS.resources.transport.util, posture: post,
    });
    return { c, g };
  }).sort((a, b) => b.g.attention - a.g.attention).slice(0, 5);

  // Emergency-powers posture — institutional, not dramatic.
  const powers = critCount >= 1 || post.label === 'STRAINED' || nationalRisk >= 65 ? 'WAR CABINET'
    : sevLoad >= 1 || post.label === 'HARDENED' || nationalRisk >= 50 ? 'ELEVATED MANDATE'
    : 'STANDING AUTHORITY';
  const powersTone = powers === 'WAR CABINET' ? 'alert' : powers === 'ELEVATED MANDATE' ? 'warn' : 'ok';

  // Ministry alignment & competing priorities.
  const ministries = [...nodes]
    .map(n => ({ n, p: pressureOf(n) }))
    .sort((a, b) => b.p - a.p)
    .slice(0, 6)
    .map(({ n, p }) => {
      const arch = String(n.archetype);
      const beh = ministryBehavior(arch);
      const rel = ministryReliability(arch, epoch);
      const interaction = ministryInteraction(arch, p, opS, post, epoch);
      return { n, p, beh, rel, interaction };
    });
  const heldGates = threats.filter(t => t.g.gate.held).length;
  const coordLoad = coordinationLoad(
    nat?.totals.activeMinistries ?? nodes.length, opS, post, heldGates);
  const aligned = ministries.filter(m => m.interaction.aligned).length;
  const coordTone = coordLoad >= 70 ? 'alert' : coordLoad >= 45 ? 'warn' : 'ok';

  // Strategic outlook — same doctrine pools as the situation room.
  const fEn = forecast('som:en', opS.resources.energy.util, ts, false);
  const fRes = forecast('som:res', opS.resources.reserves.headroom, ts, true);
  const fCv = forecast('civil', nationalRisk, ts, false);
  const fc = (r: string) => (r === 'alert' ? 'alert' : r === 'warn' ? 'warn' : 'ok');

  const stability = Math.max(1, 100 - nationalRisk);
  const stabTone = stability >= 65 ? 'ok' : stability >= 45 ? 'warn' : 'alert';
  const reserveTone = opS.resources.reserves.headroom >= 55 ? 'ok' : opS.resources.reserves.headroom >= 35 ? 'warn' : 'alert';
  // Civilian-state coupling — the society the state governs.
  const ext = externalEnvironment(epoch);
  const extTone = ext.label === 'HOSTILE' ? 'alert' : ext.label === 'CONTESTED' ? 'warn' : ext.label === 'PRESSURED' ? 'neutral' : 'ok';
  const society = nationalSociety(opS, post, incidents.length, sevLoad, epoch);
  const socTone = society.label === 'ERODING' ? 'alert' : society.label === 'FRAGILE' ? 'warn' : society.label === 'STRAINED' ? 'neutral' : 'ok';
  const foresight = strategicForesight(opS, post, society, ext, nationalRisk, sevLoad, incidents.length, epoch);
  const projTone = foresight.projRisk >= 60 ? 'alert' : foresight.projRisk >= 40 ? 'warn' : 'ok';
  const policy = simulateDoctrines(opS, post, society, ext, foresight, nationalRisk, epoch);
  const sustain = nationalSustainability(opS, post, society, foresight, epoch);
  const polit = politicalContinuity(opS, post, society, ext, foresight, epoch);
  const politTone = polit.label === 'FRACTURING' || polit.label === 'FRAGILE' ? 'alert' : polit.label === 'STRAINED' ? 'warn' : 'ok';
  const sustTone = sustain.outlook === 'UNSUSTAINABLE' ? 'alert' : sustain.outlook === 'DEPLETING' ? 'alert' : sustain.outlook === 'STRAINED' ? 'warn' : 'ok';
  const mostSust = [...policy.sims].sort((a, b) => b.survivalWeeks - a.survivalWeeks)[0];
  const hi = (v: number, good = true) => (good
    ? (v >= 65 ? 'ok' : v >= 45 ? 'warn' : 'alert')
    : (v >= 65 ? 'alert' : v >= 45 ? 'warn' : 'ok'));

  return (
    <div className="sov flex min-h-screen flex-col font-sans [min-height:100dvh]" style={PALETTE}>
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-surface px-6">
        <Link href="/gov/situation-room" className="focus-ring flex items-center gap-3 no-underline">
          <span aria-hidden className="grid h-9 w-9 place-items-center rounded-sm text-sm font-bold text-white ring-1 ring-white/15"
            style={{ backgroundColor: ACCENT }}>{identity ? identity.seal : 'CO'}</span>
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-[0.16em] text-ink">EXECUTIVE BRIEFING CHAMBER</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              {sov?.stateName ?? 'Sovereign State'} · Strategic Governance
            </span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-4 text-[11px]">
          <span className="hidden font-semibold uppercase tracking-[0.2em] sm:inline" style={{ color: ACCENT }}>
            SOVEREIGN ∕∕ EYES-ONLY
          </span>
          <span className="hidden text-ink-muted md:inline">{sov?.executiveTitle ?? 'Executive Office'}</span>
          <span className="hidden font-mono tabular-nums sm:inline" style={{ color: TONE[coordTone] }} title="national coordination load">
            coord {coordLoad}%
          </span>
          <span className="hidden font-mono uppercase tracking-wider md:inline" style={{ color: TONE[socTone] }} title="civilian state">
            society {society.label.toLowerCase()}
          </span>
          <span className="hidden font-mono uppercase tracking-wider lg:inline" style={{ color: TONE[extTone] }} title="external environment">
            ext {ext.label.toLowerCase()}
          </span>
          <span className="hidden font-mono uppercase tracking-wider lg:inline" style={{ color: TONE[sustTone] }} title="long-horizon sustainability">
            sustain {sustain.outlook.toLowerCase()}
          </span>
          <span className="hidden font-mono uppercase tracking-wider xl:inline" style={{ color: TONE[politTone] }} title="political continuity">
            regime {polit.label.toLowerCase()}
          </span>
          <span className="rounded-sm border px-2 py-1 font-semibold uppercase tracking-wider"
            style={{ borderColor: TONE[powersTone], color: TONE[powersTone] }}>{powers}</span>
          <span className="font-mono tabular-nums text-ink-muted">{new Date(now).toLocaleTimeString()}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1320px] flex-1 space-y-3 p-4">
        <div className="grid gap-3 xl:grid-cols-3">
          <Panel title="National posture & society" meta="evolving doctrine · civilian state">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-lg font-semibold tracking-wide text-ink">{post.label.replace('-', ' ')}</span>
              <span className="font-mono text-sm tabular-nums" style={{ color: TONE[stabTone] }}>
                stability {stability}
              </span>
            </div>
            <Stat label="Executive confidence" value={`${post.execConfidence}%`} tone={post.execConfidence >= 70 ? 'ok' : post.execConfidence >= 45 ? 'warn' : 'alert'} />
            <Stat label="National risk" value={`${nationalRisk}`} tone={nationalRisk >= 60 ? 'alert' : nationalRisk >= 40 ? 'warn' : 'ok'} />
            <Stat label="Deployment conservatism" value={`${post.deploymentConservatism}`} tone={post.deploymentConservatism >= 60 ? 'warn' : 'ok'} />
            <Stat label="Containment weighting" value={`${post.containmentWeight}`} tone={post.containmentWeight >= 60 ? 'warn' : 'ok'} />
            <div className="mt-2 mb-1 flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Civilian state</span>
              <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: TONE[socTone] }}>{society.label}</span>
            </div>
            <Stat label="Civilian confidence" value={`${society.civilianConfidence}`} tone={hi(society.civilianConfidence)} />
            <Stat label="Public order" value={`${society.publicOrder}`} tone={hi(society.publicOrder)} />
            <Stat label="Institutional trust" value={`${society.institutionalTrust}`} tone={hi(society.institutionalTrust)} />
            <Stat label="Economic continuity" value={`${society.economicContinuity}`} tone={hi(society.economicContinuity)} />
            <Stat label="Continuity pressure" value={`${society.continuityPressure}`} tone={hi(society.continuityPressure, false)} note={society.recoveryLag >= 55 ? 'recovery lag' : undefined} />
            <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
              National continuity: balancing {post.containmentWeight >= 55 ? 'containment over mobility' : 'mobility'} and{' '}
              {society.economicContinuity < 50 ? 'economic recovery' : 'economic continuity'}; societal trust restores slower than infrastructure.
            </p>
          </Panel>

          <Panel title="Reserve & infrastructure integrity" meta="finite national capacity">
            <Stat label="Strategic reserves" value={`${opS.resources.reserves.headroom}%`} tone={reserveTone} note="headroom" />
            <Stat label="Telecom coordination" value={`${opS.display.telecom.toFixed(0)}%`} tone={opS.display.telecom >= 90 ? 'ok' : opS.display.telecom >= 78 ? 'warn' : 'alert'} />
            <Stat label="Energy grid load" value={`${opS.display.gridLoad}%`} tone={opS.display.gridLoad >= 85 ? 'alert' : opS.display.gridLoad >= 70 ? 'warn' : 'ok'} />
            <Stat label="Logistics throughput" value={`${opS.display.logiThru.toLocaleString()}`} tone="ok" note="kt/h" />
            <Stat label="Treasury draw" value={`${opS.resources.treasury.util}%`} tone={opS.resources.treasury.util >= 80 ? 'warn' : 'ok'} />
            <Stat label="Coordination bandwidth" value={`${opS.display.coordBw}%`} tone={opS.display.coordBw >= 60 ? 'ok' : 'warn'} />
            <div className="mt-2 mb-1 flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">External environment</span>
              <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: TONE[extTone] }}>{ext.label}</span>
            </div>
            <Stat label="External pressure" value={`${ext.externalPressure}`} tone={ext.externalPressure >= 60 ? 'alert' : ext.externalPressure >= 38 ? 'warn' : 'ok'} />
            <Stat label="Foreign dependency" value={`${ext.foreignDependency}`} tone={ext.foreignDependency >= 60 ? 'warn' : 'ok'} />
            <Stat label="Alliance reliability" value={`${ext.allianceReliability}%`} tone={ext.allianceReliability >= 70 ? 'ok' : ext.allianceReliability >= 50 ? 'warn' : 'alert'} />
            <Stat label="Intl coordination load" value={`${ext.intlCoordLoad}`} tone={ext.intlCoordLoad >= 60 ? 'warn' : 'ok'} />
            <div className="mt-2 mb-1 flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Long-horizon sustainability</span>
              <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: TONE[sustTone] }}>{sustain.outlook}</span>
            </div>
            <Stat label="Reserve longevity" value={`${sustain.reserveLongevityWeeks}w`} tone={sustain.reserveLongevityWeeks >= 16 ? 'ok' : sustain.reserveLongevityWeeks >= 8 ? 'warn' : 'alert'} />
            <Stat label="Infrastructure aging" value={`${sustain.infraAging}`} tone={sustain.infraAging >= 60 ? 'alert' : sustain.infraAging >= 40 ? 'warn' : 'ok'} />
            <Stat label="Production index" value={`${sustain.productionIndex}`} tone={sustain.productionIndex >= 60 ? 'ok' : sustain.productionIndex >= 42 ? 'warn' : 'alert'} />
            <Stat label="Reserve replenishment" value={`${sustain.replenishmentRate}`} tone={sustain.replenishmentRate >= 55 ? 'ok' : sustain.replenishmentRate >= 35 ? 'warn' : 'alert'} note={`survivability ~${sustain.survivabilityWeeks}w`} />
            <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
              Emergency-powers posture: <span className="font-semibold" style={{ color: TONE[powersTone] }}>{powers}</span>.
              Reserve deployment requires Treasury concurrence{ext.reserveSensitivity >= 55 ? ' — sanctions-scarred reserves under strategic caution' : ''};
              containment directives bind Transport &amp; Logistics.
            </p>
          </Panel>

          <Panel title="Strategic foresight" meta="anticipatory · probabilistic">
            <Stat label="Projected national risk" value={`${foresight.projLo}–${foresight.projHi}`} tone={projTone} note={`p${foresight.projRisk} · ${foresight.horizon}`} />
            <Stat label="Foresight confidence" value={`${foresight.confidence}%`} tone={foresight.confidence >= 70 ? 'ok' : foresight.confidence >= 50 ? 'warn' : 'alert'} />
            <Stat label="Energy grid outlook" value={`${fEn.h24}→${fEn.h72}%`} tone={fc(fEn.risk)} />
            <Stat label="Reserve exhaustion" value={fRes.exhaustMin ? `~${Math.max(1, Math.round(fRes.exhaustMin / 60))}h` : 'sustained'} tone={fc(fRes.risk)} />
            <Stat label="Civil instability" value={`${fCv.h24}→${fCv.h72}`} tone={fc(fCv.risk)} />
            <div className="mt-2 mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Early warning</div>
            {foresight.warnings.length === 0 ? (
              <p className="text-[11px] text-ink-muted">No leading instability indicators above threshold.</p>
            ) : foresight.warnings.slice(0, 3).map(wn => (
              <div key={wn.signal} className="flex items-baseline justify-between gap-3 border-b border-line-soft py-1 last:border-0">
                <span className="truncate text-[11px] text-ink-soft">{wn.signal}</span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums" style={{ color: TONE[wn.risk >= 55 ? 'alert' : wn.risk >= 30 ? 'warn' : 'neutral'] }}>{wn.lead}</span>
              </div>
            ))}
            <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
              Dominant scenario: <span className="font-semibold text-ink-soft">{foresight.dominant}</span> ({foresight.scenarios[0]?.prob ?? 0}%)
              {foresight.scenarios[1] ? <>, then {foresight.scenarios[1].label.toLowerCase()} ({foresight.scenarios[1].prob}%)</> : null}.
              Doctrine adapts: {foresight.projRisk >= 55 ? 'projected risk raises reserve conservatism & executive caution.' : 'projected trajectory within planning tolerance.'}
            </p>
          </Panel>
        </div>

        <Panel title="Active strategic threats" meta="executive attention priority">
          {threats.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">No cross-ministry escalations require executive attention.</p>
          ) : (
            <div className="divide-y divide-line-soft">
              {threats.map(({ c, g }, rank) => (
                <div key={`${c.ministryId}:${rank}`} className="flex items-start gap-4 py-2.5">
                  <span className="mt-0.5 w-6 shrink-0 text-center font-mono text-sm tabular-nums" style={{ color: TONE[g.lvl >= 3 ? 'alert' : g.lvl === 2 ? 'warn' : 'neutral'] }}>
                    {rank + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-medium text-ink">{c.label}</span>
                      <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider" style={{ color: TONE[g.gate.held ? 'warn' : g.pIdx >= 5 ? 'ok' : 'neutral'] }}>
                        {g.gate.held ? '⏸ ' : ''}{g.gate.stage}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-ink-muted">
                      {c.ministry} · {g.authority.join(' › ')} · mandate {g.mandate.toLowerCase()}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] text-ink-muted">
                      <span>cause <span className="text-ink-soft">{g.cause}</span> ▸ {g.cascade.hops.join('▸')}</span>
                      <span>conf <span style={{ color: TONE[g.confidence >= 85 ? 'ok' : g.confidence >= 68 ? 'neutral' : g.confidence >= 48 ? 'warn' : 'alert'] }}>{g.confLabel} {g.confidence}%</span></span>
                      <span>ETA {g.eta}</span>
                      <span style={{ color: TONE[g.conflict.tense ? 'warn' : 'neutral'] }}>⚖ {g.conflict.text}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="grid gap-3 xl:grid-cols-2">
          <Panel title="Ministry alignment & conflict"
            meta={`coordination load ${coordLoad}% · ${aligned}/${ministries.length} aligned`}>
            {ministries.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-muted">Awaiting institutional telemetry…</p>
            ) : ministries.map(({ n, p, beh, rel, interaction }) => {
              const t = p >= 70 ? 'alert' : p >= 50 ? 'warn' : 'ok';
              return (
                <div key={n.ministryId} className="flex items-center gap-3 border-b border-line-soft py-2 last:border-0">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: TONE[t] }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[13px] text-ink">{n.ministry}</span>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-muted">
                        pressure <span style={{ color: TONE[t] }}>{p}</span> · rel {rel}%
                      </span>
                    </div>
                    <div className="truncate text-[10px] text-ink-muted">
                      <span className="text-ink-soft">{beh.orientation}</span> · → requests {interaction.ask} from {interaction.counterpart} ·{' '}
                      <span style={{ color: TONE[interaction.stanceTone] }}>{interaction.stance}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="mt-2 mb-1 flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Political continuity</span>
              <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: TONE[politTone] }}>{polit.label}</span>
            </div>
            <Stat label="Governing legitimacy" value={`${polit.legitimacy}`} tone={polit.legitimacy >= 60 ? 'ok' : polit.legitimacy >= 42 ? 'warn' : 'alert'} />
            <Stat label="Cabinet cohesion" value={`${polit.cabinetCohesion}`} tone={polit.cabinetCohesion >= 60 ? 'ok' : polit.cabinetCohesion >= 42 ? 'warn' : 'alert'} />
            <Stat label="Regional political strain" value={`${polit.regionalStrain}`} tone={polit.regionalStrain >= 60 ? 'alert' : polit.regionalStrain >= 40 ? 'warn' : 'ok'} />
            <Stat label="National unity" value={`${polit.nationalUnity}`} tone={polit.nationalUnity >= 60 ? 'ok' : polit.nationalUnity >= 42 ? 'warn' : 'alert'} />
            <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
              Governance continuity <span className="font-semibold" style={{ color: TONE[politTone] }}>{polit.governanceContinuity}</span> ·
              regime {polit.label.toLowerCase()}{polit.fragility >= 55 ? ' — sustained pressure threatens governing continuity' : ' — political continuity holding'}.
            </p>
          </Panel>

          <Panel title="Executive directive flow" meta="institutional governance procedure">
            {threats.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-muted">No directives pending executive review.</p>
            ) : threats.map(({ c, g }, i) => (
              <div key={`d${c.ministryId}:${i}`} className="border-b border-line-soft py-2 last:border-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[12px] text-ink-soft">{c.ministry}</span>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider" style={{ color: TONE[g.lvl >= 3 ? 'alert' : g.lvl === 2 ? 'warn' : 'neutral'] }}>
                    {g.mandate}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-ink-muted">
                  {g.gate.held
                    ? <>Held at <span style={{ color: TONE.warn }}>{g.gate.stage}</span> — {g.lvl >= 3 ? 'sovereign authorization' : 'cabinet concurrence'} required to proceed.</>
                    : <>Progressing · <span className="text-ink-soft">{g.stageCur}</span> → {g.stageNext}. {g.machinery}.</>}
                </div>
                <div className="mt-0.5 text-[11px] text-ink-muted">
                  {g.field.fIdx < 0
                    ? <>Field: awaiting authorization — no territorial deployment released.</>
                    : <>Field: <span className="text-ink-soft">{g.field.stage}</span> in {g.field.region} ·{' '}
                        <span style={{ color: TONE[g.field.frictionTone] }}>{g.field.friction}</span>
                        {g.field.relapse ? <span style={{ color: TONE.alert }}> · relapse risk</span> : null}
                        {g.field.eta !== '—' ? <> · ETA {g.field.eta}</> : null}.</>}
                </div>
              </div>
            ))}
          </Panel>
        </div>

        <Panel title="Policy doctrine simulation"
          meta={`alternate futures · ${policy.ambiguity >= 60 ? 'contested' : 'distinct'} · recommend ${policy.recommended.toLowerCase()}`}>
          <div className="hidden grid-cols-[1.6fr_repeat(6,1fr)_0.8fr] gap-x-3 border-b border-line pb-1 text-[10px] uppercase tracking-[0.12em] text-ink-muted sm:grid">
            <span>Doctrine</span><span className="text-right">Stability</span><span className="text-right">Reserves</span>
            <span className="text-right">Economy</span><span className="text-right">Society</span>
            <span className="text-right">Geo exp.</span><span className="text-right">Recovery</span><span className="text-right">Conf.</span>
          </div>
          {policy.sims.map((s, i) => (
            <div key={s.key}
              className="grid grid-cols-2 gap-x-3 gap-y-0.5 border-b border-line-soft py-1.5 text-[11px] last:border-0 sm:grid-cols-[1.6fr_repeat(6,1fr)_0.8fr] sm:py-1">
              <span className="col-span-2 flex items-baseline gap-2 sm:col-span-1">
                {i === 0 ? <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider" style={{ color: TONE.ok }}>▸ rec</span> : null}
                <span className="truncate text-ink-soft">{s.label}</span>
              </span>
              <span className="text-right font-mono tabular-nums" style={{ color: TONE[s.stability >= 60 ? 'ok' : s.stability >= 40 ? 'warn' : 'alert'] }}>{s.stability}</span>
              <span className="text-right font-mono tabular-nums" style={{ color: TONE[s.reserves >= 50 ? 'ok' : s.reserves >= 32 ? 'warn' : 'alert'] }}>{s.reserves}</span>
              <span className="text-right font-mono tabular-nums" style={{ color: TONE[s.economy >= 55 ? 'ok' : s.economy >= 40 ? 'warn' : 'alert'] }}>{s.economy}</span>
              <span className="text-right font-mono tabular-nums" style={{ color: TONE[s.society >= 55 ? 'ok' : s.society >= 38 ? 'warn' : 'alert'] }}>{s.society}</span>
              <span className="text-right font-mono tabular-nums" style={{ color: TONE[s.geoExposure >= 60 ? 'alert' : s.geoExposure >= 40 ? 'warn' : 'ok'] }}>{s.geoExposure}</span>
              <span className="text-right font-mono tabular-nums text-ink-muted">{s.recoveryWeeks}w</span>
              <span className="text-right font-mono tabular-nums" style={{ color: TONE[s.confidence >= 65 ? 'ok' : s.confidence >= 48 ? 'warn' : 'alert'] }}>{s.confidence}%</span>
              <span className="col-span-2 truncate text-[10px] text-ink-muted sm:hidden">{s.note}</span>
            </div>
          ))}
          <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
            {policy.sims[0]?.note ? <>Recommended path: {policy.sims[0]!.note}. </> : null}
            {policy.ambiguity >= 60
              ? 'Leading doctrines are closely scored — outcome ambiguous under present uncertainty.'
              : 'A distinct doctrine leads under current projections.'}{' '}
            {policy.sims[0] ? <>Recommended doctrine is {policy.sims[0]!.sustainable ? 'sustainable' : <span style={{ color: TONE.warn }}>not sustainable</span>} (~{policy.sims[0]!.survivalWeeks}w endurance){mostSust && mostSust.key !== policy.sims[0]!.key ? <>; most enduring is {mostSust.label.toLowerCase()} (~{mostSust.survivalWeeks}w)</> : null}. </> : null}
            Simulated, not executed — leadership decides.
          </p>
        </Panel>

        <p className="pb-2 text-center text-[11px] leading-relaxed text-ink-muted">
          Advisory synthesis from the sovereign operating doctrine. No autonomous action — national leadership decides.
        </p>
      </main>
    </div>
  );
}
