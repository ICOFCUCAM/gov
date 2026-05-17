// National Resilience Index. Synthesises every sovereign engine —
// institutional readiness, service-signature health, cascade integrity,
// regional posture and threat preparedness — into one composite index
// with weighted pillars. Pure & deterministic; the platform's single
// headline measure of how well the state can absorb shock.

import { deployableInstitutions } from '@/lib/institution/readiness';
import { buildCascade } from '@/lib/institution/cascade';
import { regionRollup, nationalRegions, projectRegions } from '@/lib/gov/regions';
import { serviceReadings } from '@/lib/gov/ministry-services';
import { prioritisedThreats, scenarioFor, type ScenarioKey } from '@/lib/gov/simulation';
import { buildOperationalChain } from '@/lib/gov/operational-chain';
import { legislativeState } from '@/lib/gov/legislative-engine';
import { judicialState } from '@/lib/gov/judicial-engine';
import { nationalRuntime } from '@/lib/gov/national-runtime';
import { resiliencePropagation } from '@/services/resilience-propagation';
import { waveSeries } from '@/lib/telemetry';
import type { Ministry } from '@/lib/api/types';

export interface ResiliencePillar {
  key: string;
  label: string;
  score: number;      // 0-100 (higher = more resilient)
  weight: number;     // 0-1
  tone: 'ok' | 'warn' | 'alert';
  detail: string;
}

export interface NationalResilience {
  index: number;                 // 0-100 weighted composite
  band: 'robust' | 'sound' | 'fragile' | 'brittle';
  tone: 'ok' | 'warn' | 'alert';
  pillars: ResiliencePillar[];
  weakest: ResiliencePillar | null;
}

function toneOf(s: number): 'ok' | 'warn' | 'alert' {
  return s >= 70 ? 'ok' : s >= 50 ? 'warn' : 'alert';
}

export function nationalResilience(mins: Ministry[], t: number): NationalResilience {
  const dir = deployableInstitutions(mins);
  const cascade = buildCascade(mins, (mid) => Math.round(waveSeries(`nr:${mid}`, t, 1, 55, 99).at(-1)!));
  const regions = nationalRegions(t);
  const roll = regionRollup(regions);
  const prio = prioritisedThreats(t);

  // Institutional readiness — mean total, penalised by non-deployables.
  const meanReady = dir.length ? dir.reduce((a, d) => a + d.readiness.total, 0) / dir.length : 70;
  const deployRatio = dir.length ? dir.filter(d => d.readiness.deployable).length / dir.length : 1;
  const pInst = Math.round(Math.max(0, Math.min(100, meanReady * 0.7 + deployRatio * 30)));

  // Service-signature health across institutions.
  const svcIdx = dir.length
    ? dir.map(({ ministry: m }) => {
        const rs = serviceReadings(m.id, m.archetype, t);
        const alert = rs.filter(r => r.tone === 'alert').length;
        const warn = rs.filter(r => r.tone === 'warn').length;
        return rs.length ? ((rs.length - alert - warn) * 100 + warn * 45) / rs.length : 100;
      })
    : [100];
  const pSvc = Math.round(svcIdx.reduce((a, b) => a + b, 0) / svcIdx.length);

  // Cascade integrity — inverse of mean total stress, penalised by critical nodes.
  const meanStress = cascade.length ? cascade.reduce((a, c) => a + c.totalStress, 0) / cascade.length : 30;
  const critNodes = cascade.filter(c => c.posture === 'critical').length;
  const pCascade = Math.round(Math.max(0, Math.min(100, 100 - meanStress - critNodes * 6)));

  // Regional posture — mean readiness, penalised by critical regions.
  const pRegion = Math.round(Math.max(0, Math.min(100, roll.meanReadiness - roll.critical * 8)));

  // Threat preparedness — inverse of the lead prioritised residual-weighted threat.
  const leadPriority = prio[0]?.priority ?? 0;
  const pThreat = Math.round(Math.max(0, Math.min(100, 100 - leadPriority)));

  // Operational continuity — cross-system propagation: the live operational
  // chain (institutions failing into each other) plus constitutional
  // continuity (legislature able to legislate, judiciary clearing cases).
  const chain = buildOperationalChain(mins, null, t);
  const leg = legislativeState(t);
  const jud = judicialState(t);
  let pCont = 100;
  if (chain) {
    pCont -= chain.containment === 'critical' ? 40 : chain.containment === 'spreading' ? 22 : 8;
    pCont -= Math.min(20, chain.totalAffected * 3);
  }
  if (!leg.quorum) pCont -= 22;
  pCont -= Math.min(16, leg.blocked * 4);
  if (jud.meanClearance < 60) pCont -= 18;
  if (jud.totalBacklog > 900) pCont -= 14;
  const rt = nationalRuntime(mins, t);
  pCont -= Math.min(18, Math.max(0, (rt.meanLoad - 40) * 0.4));
  pCont = Math.round(Math.max(0, Math.min(100, pCont)));
  const contDetail = chain
    ? `chain ${chain.containment} · ${chain.totalAffected} affected · runtime ${rt.posture} · jud ${jud.meanClearance}%`
    : `runtime ${rt.posture} · leg ${leg.quorum ? 'quorum' : 'at-risk'} · jud ${jud.meanClearance}%`;

  // Network propagation integrity — how much resilience survives contagion
  // across the real interoperability fabric (a low score means failure
  // amplifies through dependencies, not that any single node is weak).
  const prop = resiliencePropagation(mins, t);
  const pProp = Math.round(Math.max(0, Math.min(100, prop.meanEffective - prop.amplification)));

  const pillars: ResiliencePillar[] = [
    { key: 'inst', label: 'Institutional readiness', score: pInst, weight: 0.20, tone: toneOf(pInst), detail: `${dir.length} active · ${Math.round(deployRatio * 100)}% deployable` },
    { key: 'svc', label: 'Service-signature health', score: pSvc, weight: 0.16, tone: toneOf(pSvc), detail: `mean across ${dir.length || 0} institutions` },
    { key: 'casc', label: 'Cascade integrity', score: pCascade, weight: 0.16, tone: toneOf(pCascade), detail: `${critNodes} critical nodes` },
    { key: 'reg', label: 'Regional posture', score: pRegion, weight: 0.12, tone: toneOf(pRegion), detail: `${roll.meanReadiness}% mean · ${roll.critical} critical` },
    { key: 'thr', label: 'Threat preparedness', score: pThreat, weight: 0.12, tone: toneOf(pThreat), detail: prio[0] ? `lead · ${prio[0].label}` : 'no active vectors' },
    { key: 'cont', label: 'Operational continuity', score: pCont, weight: 0.12, tone: toneOf(pCont), detail: contDetail },
    { key: 'prop', label: 'Network propagation integrity', score: pProp, weight: 0.12, tone: toneOf(pProp), detail: `fabric ${prop.fragility} · amplification ${prop.amplification} · worst ${prop.worst?.name ?? 'n/a'}` },
  ];

  const index = Math.round(pillars.reduce((a, p) => a + p.score * p.weight, 0));
  const band: NationalResilience['band'] =
    index >= 78 ? 'robust' : index >= 62 ? 'sound' : index >= 45 ? 'fragile' : 'brittle';
  const weakest = pillars.length ? pillars.reduce((w, p) => (p.score < w.score ? p : w)) : null;

  return { index, band, tone: toneOf(index), pillars, weakest };
}

export interface ResilienceUnderShock {
  baseline: number;
  projected: number;     // index if the scenario materialised
  drawdown: number;      // baseline − projected (resilience headroom consumed)
  scenarioLabel: string;
  band: NationalResilience['band'];
  tone: 'ok' | 'warn' | 'alert';
}

// Stress test: how far the National Resilience Index falls if a scenario
// materialises. Degrades the regional pillar via the real projection and
// the cascade/service pillars proportionally to scenario severity. Pure.
export function resilienceUnderShock(mins: Ministry[], t: number, key: ScenarioKey): ResilienceUnderShock {
  const sc = scenarioFor(key);
  const base = nationalResilience(mins, t);
  if (sc.key === 'baseline' || sc.severity === 0) {
    return { baseline: base.index, projected: base.index, drawdown: 0, scenarioLabel: sc.label, band: base.band, tone: base.tone };
  }
  const projRoll = regionRollup(projectRegions(key, t));

  const shocked = base.pillars.map(p => {
    if (p.key === 'reg') {
      return { ...p, score: Math.round(Math.max(0, Math.min(100, projRoll.meanReadiness - projRoll.critical * 8))) };
    }
    if (p.key === 'casc') return { ...p, score: Math.round(Math.max(0, p.score - sc.severity * 0.55)) };
    if (p.key === 'svc') return { ...p, score: Math.round(Math.max(0, p.score - sc.severity * 0.4)) };
    if (p.key === 'inst') return { ...p, score: Math.round(Math.max(0, p.score - sc.severity * 0.25)) };
    if (p.key === 'thr') return { ...p, score: Math.round(Math.max(0, 100 - sc.severity)) };
    if (p.key === 'cont') return { ...p, score: Math.round(Math.max(0, p.score - sc.severity * 0.5)) };
    // Shock tightens fabric coupling — contagion amplifies the harder it hits.
    if (p.key === 'prop') return { ...p, score: Math.round(Math.max(0, p.score - sc.severity * 0.45)) };
    return p;
  });
  const projected = Math.round(shocked.reduce((a, p) => a + p.score * p.weight, 0));
  const projBand: NationalResilience['band'] =
    projected >= 78 ? 'robust' : projected >= 62 ? 'sound' : projected >= 45 ? 'fragile' : 'brittle';
  return {
    baseline: base.index, projected, drawdown: base.index - projected,
    scenarioLabel: sc.label, band: projBand, tone: toneOf(projected),
  };
}
