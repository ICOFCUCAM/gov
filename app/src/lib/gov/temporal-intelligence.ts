// lib/gov/temporal-intelligence.ts
//
// The Ministry of Interior temporal sovereign-intelligence core. Moves the
// ministry from reactive to ANTICIPATORY governance: deterministic
// seasonal cycles, forward pressure trajectories, collapse-signal early
// warning, continuity forecasting, temporal corruption intelligence and
// anticipatory (advisory) resource orchestration. Pure & deterministic;
// projected analytically from the live economy board so it stays one
// connected sovereign runtime.

import { economyBoard, type AgencyEconomy } from '@/lib/gov/institutional-economy';
import { AGENCIES, AGENCY_LABEL, type Agency } from '@/lib/gov/sovereign-observability';

export const FORECAST_HORIZON = 12; // operational epochs ahead

export interface Season {
  key: string;
  label: string;
  periodEpochs: number;
  phase: number;        // 0..1
  amplitude: number;    // utilisation points at peak
  agencies: Agency[];
}

// Recurring sovereign governance cycles (directive §2).
export const SEASONS: Season[] = [
  { key: 'migration-surge', label: 'Migration surge', periodEpochs: 60, phase: 0.10, amplitude: 34, agencies: ['IMMIGRATION', 'BORDER', 'CIVIL_REGISTRY'] },
  { key: 'enrollment', label: 'Enrollment season', periodEpochs: 50, phase: 0.42, amplitude: 26, agencies: ['CIVIL_REGISTRY', 'NATIONAL_ID', 'CITIZEN_SERVICES'] },
  { key: 'election-registration', label: 'Election registration', periodEpochs: 90, phase: 0.66, amplitude: 30, agencies: ['CIVIL_REGISTRY', 'NATIONAL_ID'] },
  { key: 'permit-renewal', label: 'Permit renewal period', periodEpochs: 40, phase: 0.20, amplitude: 24, agencies: ['PERMITS', 'LICENSING'] },
  { key: 'holiday-border', label: 'Holiday border pressure', periodEpochs: 70, phase: 0.80, amplitude: 28, agencies: ['BORDER', 'IMMIGRATION'] },
  { key: 'rainy-degradation', label: 'Rainy-season degradation', periodEpochs: 80, phase: 0.33, amplitude: 22, agencies: ['MUNICIPAL', 'REGIONAL', 'EMERGENCY'] },
  { key: 'disaster-window', label: 'Disaster recurrence window', periodEpochs: 100, phase: 0.55, amplitude: 32, agencies: ['EMERGENCY', 'MUNICIPAL'] },
  { key: 'civil-instability', label: 'Civil-instability period', periodEpochs: 110, phase: 0.48, amplitude: 30, agencies: ['POLICE', 'CORRECTIONS'] },
];

/** Smooth deterministic seasonal intensity 0..1 for an epoch. */
export function seasonIntensity(s: Season, epoch: number): number {
  const x = (epoch / s.periodEpochs) + s.phase;
  return (Math.sin(2 * Math.PI * x) * 0.5 + 0.5);
}

export function activeSeasons(now: number): { season: Season; intensity: number }[] {
  const epoch = Math.max(0, Math.floor(now / 4000));
  return SEASONS.map(season => ({ season, intensity: seasonIntensity(season, epoch) }))
    .filter(s => s.intensity >= 0.6)
    .sort((a, b) => b.intensity - a.intensity);
}

function seasonalDelta(agency: Agency, epoch: number): number {
  let d = 0;
  for (const s of SEASONS) {
    if (s.agencies.includes(agency)) d += s.amplitude * Math.max(0, seasonIntensity(s, epoch) - 0.5) * 2;
  }
  return d;
}

export interface AgencyTrajectory {
  agency: Agency;
  label: string;
  util: number[];        // index 0 = now, then +1..H
  backlog: number[];
  corruption: number[];
  collapseEta: number | null;     // epochs to first saturated/backlog collapse
  collapseKind: 'overload' | 'backlog' | 'corruption-spike' | null;
  peakUtil: number;
}

function projectAgency(a: AgencyEconomy, epoch: number): AgencyTrajectory {
  const util: number[] = []; const backlog: number[] = []; const corruption: number[] = [];
  let collapseEta: number | null = null;
  let collapseKind: AgencyTrajectory['collapseKind'] = null;
  // Compounding: unresolved backlog grows, corruption rises with delay,
  // seasonal load accelerates pressure.
  for (let t = 0; t <= FORECAST_HORIZON; t++) {
    const sd = seasonalDelta(a.agency, epoch + t);
    const u = Math.max(0, Math.min(220, a.baseUtilPct + a.inboundPressure + sd + a.queue.growthVel * t * 0.6));
    const b = Math.max(0, a.queue.backlog + a.queue.growthVel * t + sd * 0.4 * t);
    const c = Math.max(0, Math.min(100, a.corruption.pressure + Math.max(0, u - 100) * 0.3 + sd * 0.12 * t));
    util.push(Math.round(u)); backlog.push(Math.round(b)); corruption.push(Math.round(c));
    if (collapseEta === null) {
      if (u >= 130) { collapseEta = t; collapseKind = 'overload'; }
      else if (b >= a.queue.collapseAt) { collapseEta = t; collapseKind = 'backlog'; }
      else if (c >= 75) { collapseEta = t; collapseKind = 'corruption-spike'; }
    }
  }
  return { agency: a.agency, label: a.label, util, backlog, corruption, collapseEta, collapseKind, peakUtil: Math.max(...util) };
}

export interface EarlyWarning {
  agency: Agency;
  label: string;
  kind: 'overload' | 'backlog' | 'corruption-spike' | 'staffing-exhaustion';
  etaEpochs: number;
  severity: 'advisory' | 'elevated' | 'critical';
  detail: string;
}

export type TemporalResilience =
  | 'stable' | 'rising-pressure' | 'seasonal-strain' | 'escalating-overload'
  | 'continuity-risk' | 'constitutional-instability' | 'stabilization' | 'recovery-adaptation';

export interface ContinuityForecast {
  degradationProbPct: number;
  regionalCollapseProbPct: number;
  staffingFailureProbPct: number;
  emergencyEscalationProbPct: number;
  preemptiveActions: { kind: string; detail: string; advisory: true }[];
}

export interface TemporalBoard {
  epoch: number;
  active: { season: Season; intensity: number }[];
  trajectories: AgencyTrajectory[];
  warnings: EarlyWarning[];
  resilience: TemporalResilience;
  continuity: ContinuityForecast;
  temporalCorruption: { agency: Agency; label: string; pattern: 'chronic' | 'overload-triggered' | 'seasonal-window'; trajectory: number }[];
  memory: { recurringSeasons: string[]; annualCollapseCycle: string; chronicInstabilityRegions: string[]; recoveryEffectivenessPct: number };
}

export function temporalBoard(now: number): TemporalBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const eco = economyBoard(now);
  const trajectories = eco.agencies.map(a => projectAgency(a, epoch));

  const warnings: EarlyWarning[] = [];
  for (const tr of trajectories) {
    const a = eco.agencies.find(x => x.agency === tr.agency)!;
    if (tr.collapseEta !== null && tr.collapseKind) {
      warnings.push({
        agency: tr.agency, label: tr.label, kind: tr.collapseKind,
        etaEpochs: tr.collapseEta,
        severity: tr.collapseEta <= 3 ? 'critical' : tr.collapseEta <= 7 ? 'elevated' : 'advisory',
        detail: `${tr.collapseKind} trajectory crosses threshold in ~${tr.collapseEta} epochs (peak util ${tr.peakUtil}%)`,
      });
    }
    if (a.fatiguePct >= 55 && a.staffing.shortagePct >= 14) {
      const eta = Math.max(1, Math.round((100 - a.fatiguePct) / 6));
      warnings.push({
        agency: tr.agency, label: tr.label, kind: 'staffing-exhaustion', etaEpochs: eta,
        severity: eta <= 3 ? 'critical' : eta <= 7 ? 'elevated' : 'advisory',
        detail: `fatigue ${a.fatiguePct} + shortage ${a.staffing.shortagePct}% → projected staffing exhaustion ~${eta} epochs`,
      });
    }
  }
  warnings.sort((x, y) => x.etaEpochs - y.etaEpochs);

  const slope = trajectories.reduce((s, t) => s + (t.util[FORECAST_HORIZON]! - t.util[0]!), 0) / trajectories.length;
  const crit = warnings.filter(w => w.severity === 'critical').length;
  const resilience: TemporalResilience =
    eco.resilience === 'constitutional-continuity' ? 'constitutional-instability'
      : crit >= 4 ? 'continuity-risk'
        : slope >= 28 ? 'escalating-overload'
          : activeSeasons(now).length >= 2 && slope >= 12 ? 'seasonal-strain'
            : slope >= 10 ? 'rising-pressure'
              : slope <= -10 ? 'recovery-adaptation'
                : eco.meanFatigue > 60 ? 'stabilization' : 'stable';

  const collapsing = trajectories.filter(t => t.collapseEta !== null).length;
  const continuity: ContinuityForecast = {
    degradationProbPct: Math.min(99, Math.round((collapsing / trajectories.length) * 100 + Math.max(0, slope))),
    regionalCollapseProbPct: Math.min(99, Math.round((eco.regions.filter(r => r.resilienceScore < 40).length / eco.regions.length) * 100)),
    staffingFailureProbPct: Math.min(99, Math.round(eco.meanFatigue * 0.9)),
    emergencyEscalationProbPct: Math.min(99, Math.round(warnings.filter(w => w.kind === 'overload').length / Math.max(1, trajectories.length) * 100 + crit * 6)),
    preemptiveActions: [
      ...(collapsing > 0 ? [{ kind: 'pre-position-reserves', detail: `Pre-position continuity reserves for ${collapsing} agencies on a collapse trajectory`, advisory: true as const }] : []),
      ...(slope >= 12 ? [{ kind: 'pre-emptive-rerouting', detail: 'Reroute workflows ahead of forecast saturation', advisory: true as const }] : []),
      ...(eco.meanFatigue > 55 ? [{ kind: 'staffing-forecast', detail: 'Schedule reserve staffing ahead of projected fatigue exhaustion', advisory: true as const }] : []),
    ],
  };

  const temporalCorruption = eco.agencies.map(a => {
    const tr = trajectories.find(t => t.agency === a.agency)!;
    const trajectory = tr.corruption[FORECAST_HORIZON]! - tr.corruption[0]!;
    const pattern: 'chronic' | 'overload-triggered' | 'seasonal-window' =
      a.corruption.mode === 'suspicious-obstruction' ? 'chronic'
        : trajectory >= 18 && tr.peakUtil >= 105 ? 'overload-triggered'
          : 'seasonal-window';
    return { agency: a.agency, label: a.label, pattern, trajectory };
  }).filter(x => x.trajectory > 0 || x.pattern === 'chronic')
    .sort((x, y) => y.trajectory - x.trajectory);

  const recurringSeasons = SEASONS
    .map(s => ({ s, i: seasonIntensity(s, epoch) }))
    .sort((a, b) => b.i - a.i).slice(0, 3).map(x => x.s.label);
  const annualCollapseCycle = [...SEASONS].sort((a, b) => (b.periodEpochs * b.amplitude) - (a.periodEpochs * a.amplitude))[0]!.label;

  return {
    epoch,
    active: activeSeasons(now),
    trajectories,
    warnings,
    resilience,
    continuity,
    temporalCorruption,
    memory: {
      recurringSeasons,
      annualCollapseCycle,
      chronicInstabilityRegions: eco.regions.filter(r => r.resilienceScore < 45).map(r => r.region).slice(0, 3),
      recoveryEffectivenessPct: Math.max(20, Math.min(95, Math.round(100 - eco.meanFatigue * 0.6 - crit * 4))),
    },
  };
}

export { AGENCY_LABEL, AGENCIES };
