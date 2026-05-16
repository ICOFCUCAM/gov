// Sovereign state simulation engine. Applies a scenario shock to the
// national model and projects deltas across regions, ministries, cascade
// and constitutional stress. Pure & deterministic; the platform's
// "what-if" nervous system.

import { seed } from '@/lib/telemetry';

export type ScenarioKey =
  | 'baseline' | 'economic-shock' | 'energy-outage' | 'logistics-disruption'
  | 'healthcare-crisis' | 'civil-unrest' | 'cyber-attack' | 'climate-disaster'
  | 'border-crisis' | 'treasury-pressure';

export interface Scenario {
  key: ScenarioKey;
  label: string;
  vector: string;
  /** primary archetypes hit hardest */
  epicentres: string[];
  /** 0-100 shock magnitude */
  severity: number;
}

export const SCENARIOS: Scenario[] = [
  { key: 'baseline', label: 'Baseline (no shock)', vector: 'Steady-state operations', epicentres: [], severity: 0 },
  { key: 'economic-shock', label: 'Economic shock', vector: 'Commodity + currency shock', epicentres: ['FINANCE', 'TRADE'], severity: 72 },
  { key: 'energy-outage', label: 'National grid outage', vector: 'Cascading grid failure', epicentres: ['ENERGY', 'HEALTH', 'TRANSPORT'], severity: 84 },
  { key: 'logistics-disruption', label: 'Logistics disruption', vector: 'Corridor + port blockade', epicentres: ['TRANSPORT', 'TRADE', 'AGRICULTURE'], severity: 66 },
  { key: 'healthcare-crisis', label: 'Healthcare crisis', vector: 'Outbreak surge', epicentres: ['HEALTH', 'INTERIOR'], severity: 78 },
  { key: 'civil-unrest', label: 'Civil unrest', vector: 'Regional instability', epicentres: ['INTERIOR', 'JUSTICE'], severity: 70 },
  { key: 'cyber-attack', label: 'Cyber attack', vector: 'Critical-infra intrusion', epicentres: ['INTERIOR', 'FINANCE', 'ENERGY'], severity: 80 },
  { key: 'climate-disaster', label: 'Climate disaster', vector: 'Flood / drought', epicentres: ['ENVIRONMENT', 'AGRICULTURE', 'HEALTH'], severity: 76 },
  { key: 'border-crisis', label: 'Border crisis', vector: 'Cross-border pressure', epicentres: ['INTERIOR', 'TRANSPORT'], severity: 68 },
  { key: 'treasury-pressure', label: 'Treasury pressure', vector: 'Liquidity squeeze', epicentres: ['FINANCE'], severity: 62 },
];

export function scenarioFor(key: ScenarioKey): Scenario {
  return SCENARIOS.find(s => s.key === key) ?? SCENARIOS[0]!;
}

export interface SimImpact {
  scenario: Scenario;
  nationalReadinessDelta: number;   // negative = degradation
  economicImpactPct: number;
  civilUnrestProb: number;          // 0-100
  constitutionalStress: number;     // 0-100
  cascadeNodes: number;             // institutions pushed critical
  ministryImpact: { archetype: string; stress: number }[];
  regionImpact: { region: string; readinessDelta: number }[];
  timeline: { t: string; event: string; sev: 'info' | 'warn' | 'alert' }[];
  recommendation: string[];
}

const ARCHS = ['HEALTH', 'ENERGY', 'TRANSPORT', 'FINANCE', 'INTERIOR', 'AGRICULTURE', 'TRADE', 'ENVIRONMENT', 'JUSTICE', 'EDUCATION'];
const REGIONS = ['Northern Province', 'Highland Region', 'Eastern Region', 'Capital District', 'Western Region', 'Coastal Region'];

export function simulate(key: ScenarioKey, t: number): SimImpact {
  const sc = scenarioFor(key);
  const k = sc.severity / 100;

  const ministryImpact = ARCHS.map(a => {
    const hit = sc.epicentres.includes(a) ? 1 : 0.28;
    const stress = Math.round(sc.severity * hit + seed(`sim:${key}:${a}`) * 14);
    return { archetype: a, stress: Math.max(0, Math.min(100, stress)) };
  }).sort((a, b) => b.stress - a.stress);

  const regionImpact = REGIONS.map(r => {
    const exposure = 0.4 + seed(`simr:${key}:${r}`) * 0.9;
    return { region: r, readinessDelta: -Math.round(sc.severity * exposure * 0.4) };
  }).sort((a, b) => a.readinessDelta - b.readinessDelta);

  const cascadeNodes = Math.round(k * 6 + (sc.epicentres.length ? 1 : 0));
  const nationalReadinessDelta = -Math.round(sc.severity * 0.42) || 0;
  const economicImpactPct = (-Math.round((sc.severity * 0.06 + (sc.epicentres.includes('FINANCE') ? 1.4 : 0)) * 10) / 10) || 0;
  const civilUnrestProb = Math.round(Math.min(95, sc.severity * 0.55 + (sc.epicentres.includes('INTERIOR') ? 18 : 0)));
  const constitutionalStress = Math.round(Math.min(95, sc.severity * 0.4 + (key === 'civil-unrest' || key === 'border-crisis' ? 22 : 0)));

  const sev = (n: number): 'info' | 'warn' | 'alert' => (n >= 70 ? 'alert' : n >= 45 ? 'warn' : 'info');
  const timeline = sc.key === 'baseline' ? [{ t: 'T+0', event: 'Steady-state — no shock applied', sev: 'info' as const }] : [
    { t: 'T+0m', event: `${sc.vector} initiated`, sev: sev(sc.severity) },
    { t: 'T+8m', event: `${sc.epicentres[0] ?? 'Primary'} sector enters strained posture`, sev: sev(sc.severity) },
    { t: 'T+22m', event: `Cascade reaches ${cascadeNodes} dependent institutions`, sev: sev(sc.severity - 8) },
    { t: 'T+40m', event: `Regional readiness degraded ${Math.abs(nationalReadinessDelta)}pts nationally`, sev: sev(sc.severity) },
    { t: 'T+1h', event: civilUnrestProb >= 60 ? 'Civil-protection posture elevated' : 'Containment holding', sev: sev(civilUnrestProb) },
  ];

  const recommendation = sc.key === 'baseline' ? ['Sustain monitoring tempo'] : [
    `Convene cabinet cell · lead ministry ${sc.epicentres[0] ?? 'coordination'}`,
    cascadeNodes >= 4 ? 'Authorise reserve drawdown · pre-position assets' : 'Pre-position contingency reserves',
    civilUnrestProb >= 60 ? 'Elevate civil-protection & security posture' : 'Maintain security watch',
    constitutionalStress >= 60 ? 'Brief Constitutional Court · prepare emergency-power sunset clock' : 'No constitutional action required',
  ];

  return {
    scenario: sc, nationalReadinessDelta, economicImpactPct, civilUnrestProb, constitutionalStress,
    cascadeNodes, ministryImpact, regionImpact, timeline, recommendation,
  };
}

export interface ScenarioRisk {
  key: ScenarioKey;
  label: string;
  vector: string;
  severity: number;
  /** 0-100 composite national risk index */
  composite: number;
  readinessDelta: number;
  civilUnrestProb: number;
  constitutionalStress: number;
  cascadeNodes: number;
  band: 'severe' | 'high' | 'elevated' | 'contained';
}

// Whole-of-government threat board: runs every scenario and ranks them by a
// composite national-risk index (readiness loss, unrest, constitutional
// stress, cascade breadth). Drives the simulation surface's threat ranking.
export function scenarioSweep(t: number): ScenarioRisk[] {
  return SCENARIOS.filter(s => s.key !== 'baseline').map(s => {
    const im = simulate(s.key, t);
    const composite = Math.round(Math.min(100,
      Math.abs(im.nationalReadinessDelta) * 1.4 +
      im.civilUnrestProb * 0.3 +
      im.constitutionalStress * 0.3 +
      im.cascadeNodes * 4,
    ));
    const band: ScenarioRisk['band'] =
      composite >= 75 ? 'severe' : composite >= 58 ? 'high' : composite >= 40 ? 'elevated' : 'contained';
    return {
      key: s.key, label: s.label, vector: s.vector, severity: s.severity, composite,
      readinessDelta: im.nationalReadinessDelta, civilUnrestProb: im.civilUnrestProb,
      constitutionalStress: im.constitutionalStress, cascadeNodes: im.cascadeNodes, band,
    };
  }).sort((a, b) => b.composite - a.composite);
}

export interface PlaybookPhase {
  phase: string;
  window: string;
  lead: string;
  actions: string[];
  /** composite-risk points this phase removes */
  reduction: number;
}

export interface MitigationPlaybook {
  scenario: Scenario;
  phases: PlaybookPhase[];
  /** 0-100 risk before any response */
  grossRisk: number;
  /** 0-100 risk after the full playbook executes */
  residualRisk: number;
  /** % of national risk neutralised by the response */
  effectiveness: number;
}

// Phased response doctrine for a scenario: contain → stabilise → recover,
// each with a lead institution, concrete actions and the composite-risk
// reduction it buys. Turns the what-if from consequence into consequence +
// response efficacy. Pure & deterministic — advisory only.
export function mitigationPlaybook(key: ScenarioKey, t: number): MitigationPlaybook {
  const sc = scenarioFor(key);
  const im = simulate(key, t);
  const gross = Math.round(Math.min(100,
    Math.abs(im.nationalReadinessDelta) * 1.4 + im.civilUnrestProb * 0.3 +
    im.constitutionalStress * 0.3 + im.cascadeNodes * 4));
  const lead = sc.epicentres[0] ?? 'COORDINATION';
  const sec = sc.epicentres[1] ?? 'INTERIOR';

  if (sc.key === 'baseline') {
    return {
      scenario: sc,
      phases: [{ phase: 'Steady-state', window: 'Continuous', lead: 'COORDINATION', actions: ['Sustain monitoring tempo', 'Maintain reserve posture'], reduction: 0 }],
      grossRisk: 0, residualRisk: 0, effectiveness: 0,
    };
  }

  const phases: PlaybookPhase[] = [
    {
      phase: 'Contain', window: 'T+0 → T+1h', lead,
      actions: [
        `Convene cabinet cell · lead ministry ${lead}`,
        `Isolate ${sc.epicentres[0] ?? 'primary'} sector · halt propagation paths`,
        im.civilUnrestProb >= 60 ? 'Elevate civil-protection & security posture' : 'Raise security watch level',
      ],
      reduction: Math.round(gross * 0.34),
    },
    {
      phase: 'Stabilise', window: 'T+1h → T+12h', lead: sec,
      actions: [
        im.cascadeNodes >= 4 ? 'Authorise reserve drawdown · pre-position assets' : 'Pre-position contingency reserves',
        'Activate mutual-aid between unaffected institutions',
        im.constitutionalStress >= 60 ? 'Brief Constitutional Court · arm emergency-power sunset clock' : 'Maintain constitutional baseline',
      ],
      reduction: Math.round(gross * 0.3),
    },
    {
      phase: 'Recover', window: 'T+12h → T+72h', lead: 'COORDINATION',
      actions: [
        'Sequenced service restoration · worst-readiness regions first',
        'After-action capture · update institutional doctrine',
        'Stand down emergency posture on threshold recovery',
      ],
      reduction: Math.round(gross * 0.18),
    },
  ];

  const removed = phases.reduce((a, p) => a + p.reduction, 0);
  const residualRisk = Math.max(0, gross - removed);
  const effectiveness = gross ? Math.round((removed / gross) * 100) : 0;
  return { scenario: sc, phases, grossRisk: gross, residualRisk, effectiveness };
}
