// Agency Systems — deep operational engine for sovereign agency apps.
//
// Police Command, Emergency Response, Immigration and Customs are
// independent sovereign applications, not dashboard cards. This engine
// produces their live operational state — command, dispatch, casework,
// throughput, regional posture. Pure & deterministic; no React/DOM.

import { seed, wave } from '@/lib/telemetry';

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];
type Tone = 'ok' | 'warn' | 'alert';
const tone = (n: number, hi = 70, mid = 45): Tone => (n >= hi ? 'ok' : n >= mid ? 'warn' : 'alert');

export interface AgencyMetric { label: string; value: string; tone: Tone }
export interface AgencyUnitRow { id: string; label: string; status: string; region: string; tone: Tone }

// Constitutional safeguard envelope for sovereign law-enforcement.
// Every operational surface in police-command is bound by this contract.
export const POLICE_SAFEGUARDS = {
  warrantBackedSearch: true as const,
  useOfForceProportional: true as const,
  custodyTimeLimited: true as const,
  detaineeRightsAttested: true as const,
  surveillanceJudiciallyAuthorised: true as const,
  internalAffairsIndependentlyOverseen: true as const,
  prohibited: [
    'warrantless-mass-surveillance', 'arbitrary-detention',
    'extra-judicial-force', 'torture-or-degrading-treatment',
    'racial-or-political-profiling', 'evidence-tampering',
    'concealment-of-misconduct', 'use-of-force-without-review',
  ] as const,
};

export interface PoliceOps {
  activeIncidents: number;
  unitsDeployed: number; unitsTotal: number;
  meanResponseMin: number;
  clearanceRatePct: number;
  openInvestigations: number;
  custodyOccupancyPct: number;
  patrols: AgencyUnitRow[];
  regional: { region: string; load: number; tone: Tone }[];
}
export function policeOps(id: string, t: number): PoliceOps {
  const unitsTotal = 240 + Math.round(seed(`pol:ut:${id}`) * 360);
  return {
    activeIncidents: Math.round(wave(`pol:ai:${id}`, t, 8, 140)),
    unitsDeployed: Math.round(unitsTotal * wave(`pol:ud:${id}`, t, 0.4, 0.86)),
    unitsTotal,
    meanResponseMin: Math.round(wave(`pol:rt:${id}`, t, 5, 28)),
    clearanceRatePct: Math.round(wave(`pol:cr:${id}`, t, 42, 86)),
    openInvestigations: Math.round(wave(`pol:oi:${id}`, t, 60, 2400)),
    custodyOccupancyPct: Math.round(wave(`pol:co:${id}`, t, 55, 118)),
    patrols: REGIONS.slice(0, 5).map((region, i) => {
      const st = seed(`pol:ps:${id}:${i}`);
      return { id: `PTL-${10 + i}`, label: `Patrol division ${i + 1}`, status: st > 0.7 ? 'responding' : st > 0.3 ? 'patrolling' : 'staging', region, tone: st > 0.7 ? 'alert' : 'ok' };
    }),
    regional: REGIONS.map((region, i) => {
      const load = Math.round(wave(`pol:rl:${id}:${i}`, t, 20, 96));
      return { region, load, tone: tone(100 - load, 60, 35) };
    }),
  };
}

export interface EmergencyOps {
  activeCrises: number;
  severity: 'standby' | 'elevated' | 'major' | 'national';
  responders: number; respondersAvailable: number;
  meanMobiliseMin: number;
  sheltersOpen: number; populationAssisted: number;
  resourceCoverPct: number;
  regional: { region: string; status: string; tone: Tone }[];
}
export function emergencyOps(id: string, t: number): EmergencyOps {
  const crises = Math.round(wave(`emg:ac:${id}`, t, 0, 9));
  const sev: EmergencyOps['severity'] = crises >= 6 ? 'national' : crises >= 4 ? 'major' : crises >= 1 ? 'elevated' : 'standby';
  const responders = 1800 + Math.round(seed(`emg:rt:${id}`) * 5200);
  return {
    activeCrises: crises,
    severity: sev,
    responders,
    respondersAvailable: Math.round(responders * wave(`emg:ra:${id}`, t, 0.35, 0.9)),
    meanMobiliseMin: Math.round(wave(`emg:mm:${id}`, t, 4, 40)),
    sheltersOpen: Math.round(wave(`emg:so:${id}`, t, 0, 60)),
    populationAssisted: Math.round(wave(`emg:pa:${id}`, t, 0, 240000)),
    resourceCoverPct: Math.round(wave(`emg:rc:${id}`, t, 38, 96)),
    regional: REGIONS.map((region, i) => {
      const s = wave(`emg:rs:${id}:${i}`, t, 0, 1);
      return { region, status: s > 0.78 ? 'crisis' : s > 0.45 ? 'watch' : 'nominal', tone: s > 0.78 ? 'alert' : s > 0.45 ? 'warn' : 'ok' };
    }),
  };
}

export interface ImmigrationOps {
  bordersOpen: number; bordersTotal: number;
  crossingsToday: number;
  visaBacklog: number; visaSlaMetPct: number;
  residentsRegisteredM: number;
  enforcementActions: number;
  flaggedEntries: number;
}
export function immigrationOps(id: string, t: number): ImmigrationOps {
  const bt = 18 + Math.round(seed(`imm:bt:${id}`) * 22);
  return {
    bordersOpen: Math.max(4, bt - Math.round(seed(`imm:bc:${id}:${Math.floor(t / 9)}`) * 5)),
    bordersTotal: bt,
    crossingsToday: Math.round(wave(`imm:cx:${id}`, t, 6000, 140000)),
    visaBacklog: Math.round(wave(`imm:vb:${id}`, t, 200, 9400)),
    visaSlaMetPct: Math.round(wave(`imm:vs:${id}`, t, 58, 94)),
    residentsRegisteredM: Math.round(wave(`imm:rr:${id}`, t, 1, 12) * 10) / 10,
    enforcementActions: Math.round(wave(`imm:ea:${id}`, t, 0, 220)),
    flaggedEntries: Math.round(wave(`imm:fe:${id}`, t, 0, 160)),
  };
}

export interface CustomsOps {
  declarationsToday: number;
  clearanceMedianHrs: number;
  revenueIdx: number;
  inspectionRatePct: number;
  seizures: number;
  corridorsOpen: number; corridorsTotal: number;
}
export function customsOps(id: string, t: number): CustomsOps {
  const ct = 8;
  return {
    declarationsToday: Math.round(wave(`cus:dt:${id}`, t, 800, 24000)),
    clearanceMedianHrs: Math.round(wave(`cus:cm:${id}`, t, 2, 60)),
    revenueIdx: Math.round(wave(`cus:rv:${id}`, t, 44, 96)),
    inspectionRatePct: Math.round(wave(`cus:ir:${id}`, t, 4, 28)),
    seizures: Math.round(wave(`cus:sz:${id}`, t, 0, 40)),
    corridorsOpen: Math.max(2, ct - Math.round(seed(`cus:co:${id}:${Math.floor(t / 9)}`) * 4)),
    corridorsTotal: ct,
  };
}
