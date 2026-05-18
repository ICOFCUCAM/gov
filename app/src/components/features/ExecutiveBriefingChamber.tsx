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
  const fHe = forecast('hsat', peakP, ts, false);
  const fCv = forecast('civil', nationalRisk, ts, false);
  const fc = (r: string) => (r === 'alert' ? 'alert' : r === 'warn' ? 'warn' : 'ok');

  const stability = Math.max(1, 100 - nationalRisk);
  const stabTone = stability >= 65 ? 'ok' : stability >= 45 ? 'warn' : 'alert';
  const reserveTone = opS.resources.reserves.headroom >= 55 ? 'ok' : opS.resources.reserves.headroom >= 35 ? 'warn' : 'alert';

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
          <span className="rounded-sm border px-2 py-1 font-semibold uppercase tracking-wider"
            style={{ borderColor: TONE[powersTone], color: TONE[powersTone] }}>{powers}</span>
          <span className="font-mono tabular-nums text-ink-muted">{new Date(now).toLocaleTimeString()}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1320px] flex-1 space-y-3 p-4">
        <div className="grid gap-3 xl:grid-cols-3">
          <Panel title="National posture" meta="evolving doctrine">
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
            <Stat label="Coordination caution" value={`${post.coordinationCaution}`} tone={post.coordinationCaution >= 55 ? 'warn' : 'ok'} />
            <Stat label="Geopolitical sensitivity" value={`${post.geopolitical}`} tone={post.geopolitical >= 60 ? 'warn' : 'ok'} />
          </Panel>

          <Panel title="Reserve & infrastructure integrity" meta="finite national capacity">
            <Stat label="Strategic reserves" value={`${opS.resources.reserves.headroom}%`} tone={reserveTone} note="headroom" />
            <Stat label="Telecom coordination" value={`${opS.display.telecom.toFixed(0)}%`} tone={opS.display.telecom >= 90 ? 'ok' : opS.display.telecom >= 78 ? 'warn' : 'alert'} />
            <Stat label="Energy grid load" value={`${opS.display.gridLoad}%`} tone={opS.display.gridLoad >= 85 ? 'alert' : opS.display.gridLoad >= 70 ? 'warn' : 'ok'} />
            <Stat label="Logistics throughput" value={`${opS.display.logiThru.toLocaleString()}`} tone="ok" note="kt/h" />
            <Stat label="Treasury draw" value={`${opS.resources.treasury.util}%`} tone={opS.resources.treasury.util >= 80 ? 'warn' : 'ok'} />
            <Stat label="Coordination bandwidth" value={`${opS.display.coordBw}%`} tone={opS.display.coordBw >= 60 ? 'ok' : 'warn'} />
            <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
              Emergency-powers posture: <span className="font-semibold" style={{ color: TONE[powersTone] }}>{powers}</span>.
              Reserve deployment requires Treasury concurrence; containment directives bind Transport &amp; Logistics.
            </p>
          </Panel>

          <Panel title="Strategic forecast" meta="24h → 72h doctrine outlook">
            <Stat label="National stability" value={`${stability}`} tone={stabTone} note="now" />
            <Stat label="Energy grid outlook" value={`${fEn.h24}→${fEn.h72}%`} tone={fc(fEn.risk)} />
            <Stat label="Reserve exhaustion" value={fRes.exhaustMin ? `~${Math.max(1, Math.round(fRes.exhaustMin / 60))}h` : 'sustained'} tone={fc(fRes.risk)} />
            <Stat label="Healthcare saturation" value={`${fHe.h24}→${fHe.h72}%`} tone={fc(fHe.risk)} />
            <Stat label="Civil instability" value={`${fCv.h24}→${fCv.h72}`} tone={fc(fCv.risk)} />
            <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
              Doctrine drift: posture <span className="text-ink-soft">{post.label.toLowerCase()}</span> —
              {post.deploymentConservatism >= 55 ? ' reserves managed conservatively;' : ' reserves nominal;'}
              {post.stabilizationCaution >= 55 ? ' fragile-recovery caution active.' : ' recovery confidence holding.'}
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

        <p className="pb-2 text-center text-[11px] leading-relaxed text-ink-muted">
          Advisory synthesis from the sovereign operating doctrine. No autonomous action — national leadership decides.
        </p>
      </main>
    </div>
  );
}
