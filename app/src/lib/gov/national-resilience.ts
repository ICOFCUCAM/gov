// National Resilience Index. Synthesises every sovereign engine —
// institutional readiness, service-signature health, cascade integrity,
// regional posture and threat preparedness — into one composite index
// with weighted pillars. Pure & deterministic; the platform's single
// headline measure of how well the state can absorb shock.

import { deployableInstitutions } from '@/lib/institution/readiness';
import { buildCascade } from '@/lib/institution/cascade';
import { regionRollup, nationalRegions } from '@/lib/gov/regions';
import { serviceReadings } from '@/lib/gov/ministry-services';
import { prioritisedThreats } from '@/lib/gov/simulation';
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

  const pillars: ResiliencePillar[] = [
    { key: 'inst', label: 'Institutional readiness', score: pInst, weight: 0.26, tone: toneOf(pInst), detail: `${dir.length} active · ${Math.round(deployRatio * 100)}% deployable` },
    { key: 'svc', label: 'Service-signature health', score: pSvc, weight: 0.22, tone: toneOf(pSvc), detail: `mean across ${dir.length || 0} institutions` },
    { key: 'casc', label: 'Cascade integrity', score: pCascade, weight: 0.2, tone: toneOf(pCascade), detail: `${critNodes} critical nodes` },
    { key: 'reg', label: 'Regional posture', score: pRegion, weight: 0.16, tone: toneOf(pRegion), detail: `${roll.meanReadiness}% mean · ${roll.critical} critical` },
    { key: 'thr', label: 'Threat preparedness', score: pThreat, weight: 0.16, tone: toneOf(pThreat), detail: prio[0] ? `lead · ${prio[0].label}` : 'no active vectors' },
  ];

  const index = Math.round(pillars.reduce((a, p) => a + p.score * p.weight, 0));
  const band: NationalResilience['band'] =
    index >= 78 ? 'robust' : index >= 62 ? 'sound' : index >= 45 ? 'fragile' : 'brittle';
  const weakest = pillars.length ? pillars.reduce((w, p) => (p.score < w.score ? p : w)) : null;

  return { index, band, tone: toneOf(index), pillars, weakest };
}
