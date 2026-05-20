// lib/gov/energy-extended.ts
//
// Sovereign Energy extension — three operational layers complementing
// the core grid-theater / generation-reserves / transmission-infra /
// continuity stack: dedicated energy emergency & recovery operations
// (blackout restoration choreography), 25-year energy intelligence
// & long-horizon forecasting (climate-energy risk, geopolitical
// exposure, cascading grid failure), and the public energy services
// portal (outage reports, permits, renewable integration requests,
// complaints, advisories). Pure & deterministic; SSR-stable.

import { seed, wave } from '@/lib/telemetry';
import { energyGridBoard } from '@/lib/gov/energy-grid';
import { energyOps } from '@/lib/gov/energy-systems';

export const ENERGY_EXTENDED_SAFEGUARDS = {
  publicSafetyFirst: true as const,
  equitableLoadShedding: true as const,
  criticalServicesProtection: true as const,
  transparencyInOutages: true as const,
  prohibited: [
    'discriminatory-disconnection', 'concealment-of-grid-incidents',
    'critical-services-blackout-without-protocol', 'unilateral-rate-spike-during-emergency',
    'denial-of-renewable-integration', 'extraction-of-emergency-data',
  ] as const,
};

export const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

// ── A. Energy Emergency & Recovery Operations ───────────────────────
export type RecoveryPhase = 'isolation' | 'damage-assessment' | 'crew-dispatch' | 'restoration' | 'energisation' | 'stabilised';

export interface BlackoutEvent {
  id: string;
  region: string;
  affectedSubstations: number;
  populationAffectedK: number;
  industrialFacilitiesOut: number;
  startedHrsAgo: number;
  cause: 'storm' | 'equipment-failure' | 'overload' | 'cyber-incident' | 'wildfire' | 'cascading-trip' | 'cold-snap';
  phase: RecoveryPhase;
  estimatedRestorationHrs: number;
  loadRestoredPct: number;
}

export interface RestorationCrew {
  id: string;
  region: string;
  crewKind: 'line-crew' | 'substation-crew' | 'tree-clearance' | 'mobile-genset' | 'control-room';
  membersDeployed: number;
  membersAvailable: number;
  vehiclesActive: number;
  enRouteTo: string;
}

export interface EmergencyAssetDeployment {
  asset: 'mobile-genset' | 'mobile-substation' | 'helicopter-survey' | 'cable-repair-vehicle' | 'fuel-tanker';
  unitsDeployed: number;
  unitsTotal: number;
  utilisationPct: number;
}

export interface EmergencyOperations {
  posture: 'standby' | 'engaged' | 'major-restoration' | 'national-recovery';
  blackouts: BlackoutEvent[];
  crews: RestorationCrew[];
  assets: EmergencyAssetDeployment[];
  criticalServicesOnBackup: { service: string; backupHrsRemaining: number; status: 'fuel-ok' | 'low-fuel' | 'critical' }[];
  meanRestorationHrs: number;
  loadRestoredNationalPct: number;
}

// ── B. Energy Intelligence & Long-Horizon Forecasting ───────────────
export interface DemandForecast {
  horizonYears: number[];          // [5,10,15,20,25]
  peakDemandTrajectoryGw: number[];
  renewableShareTrajectoryPct: number[];
  carbonIntensityTrajectory: number[];   // gCO2/kWh, lower better
  energyImportDependencyTrajectory: number[];
  gridResilienceTrajectory: number[];
  selfSufficiencyTrajectory: number[];
}

export interface ClimateEnergyRisk {
  hazard: 'heatwave-peak' | 'cold-snap-peak' | 'drought-hydro' | 'wildfire-grid' | 'flood-substation' | 'storm-line-down';
  probabilityNext12mPct: number;
  impactIfRealisedIdx: number;        // 0..100
  preparednessIdx: number;
  composite: number;
  classification: 'low' | 'moderate' | 'elevated' | 'severe';
}

export interface GeopoliticalEnergyExposure {
  partner: string;
  resource: 'crude-oil' | 'refined-fuels' | 'natural-gas' | 'uranium' | 'lithium' | 'rare-earths-grid';
  importSharePct: number;
  vulnerabilityIdx: number;
  alternativeSourcesAvailable: number;
}

export interface CascadingFailureScenario {
  id: string;
  trigger: 'substation-loss' | 'generation-trip' | 'interconnector-fault' | 'cyber-intrusion' | 'fuel-interruption' | 'extreme-weather';
  affectedRegions: number;
  cascadeDepth: number;             // 1..6
  probability12mPct: number;
  impactSeverity: 'localised' | 'regional' | 'national' | 'systemic';
  preparednessIdx: number;
}

export interface EnergyIntelligence {
  demand: DemandForecast;
  climateRisks: ClimateEnergyRisk[];
  geopoliticalExposure: GeopoliticalEnergyExposure[];
  cascadingScenarios: CascadingFailureScenario[];
  aiReasoningCoveragePct: number;
  earlyWarningSignalsActive: number;
  longHorizonResilienceIdx: number;
  systemicEnergyRisk: number;
}

// ── C. Public Energy Services Portal ────────────────────────────────
export interface OutageReport {
  id: string;
  region: string;
  reportedHrsAgo: number;
  affectedAccountsK: number;
  estimatedRestorationHrs: number;
  status: 'received' | 'crew-en-route' | 'in-progress' | 'restored';
  severity: 'minor' | 'major' | 'critical';
}

export interface EnergyPermitFlow {
  category: 'rooftop-solar' | 'industrial-connection' | 'ev-charger' | 'biogas-microgrid' | 'wind-turbine' | 'storage-battery';
  pending: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  medianReviewDays: number;
}

export interface RenewableIntegrationRequest {
  id: string;
  region: string;
  source: 'solar' | 'wind' | 'small-hydro' | 'biomass' | 'geothermal';
  capacityMw: number;
  daysOpen: number;
  status: 'queued' | 'feasibility' | 'grid-study' | 'approved' | 'declined';
}

export interface PublicAdvisoryEnergy {
  id: string;
  kind: 'peak-demand-warning' | 'planned-maintenance' | 'load-shedding' | 'tariff-update' | 'energy-conservation' | 'storm-readiness';
  region: string;
  ageHrs: number;
  reachM: number;
  severity: 'advisory' | 'warning' | 'critical';
}

export interface PublicEnergyPortal {
  outages: OutageReport[];
  permits: EnergyPermitFlow[];
  renewableRequests: RenewableIntegrationRequest[];
  advisories: PublicAdvisoryEnergy[];
  consumerComplaintsOpen: number;
  consumerCallsDailyK: number;
  portalAvailabilityPct: number;
}

export interface EnergyExtendedBoard {
  epoch: number;
  emergency: EmergencyOperations;
  intelligence: EnergyIntelligence;
  portal: PublicEnergyPortal;
  prohibited: readonly string[];
}

const CAUSE_KINDS: BlackoutEvent['cause'][] = ['storm', 'equipment-failure', 'overload', 'cyber-incident', 'wildfire', 'cascading-trip', 'cold-snap'];
const PHASES: RecoveryPhase[] = ['isolation', 'damage-assessment', 'crew-dispatch', 'restoration', 'energisation', 'stabilised'];
const CREW_KINDS: RestorationCrew['crewKind'][] = ['line-crew', 'substation-crew', 'tree-clearance', 'mobile-genset', 'control-room'];
const ASSETS: EmergencyAssetDeployment['asset'][] = ['mobile-genset', 'mobile-substation', 'helicopter-survey', 'cable-repair-vehicle', 'fuel-tanker'];
const CRITICAL_SERVICES = ['National hospital network', 'Capital water treatment', 'Sovereign data centres', 'Air-traffic control', 'Defense installations', 'Emergency response HQ'];

const CLIMATE_HAZARDS: ClimateEnergyRisk['hazard'][] = ['heatwave-peak', 'cold-snap-peak', 'drought-hydro', 'wildfire-grid', 'flood-substation', 'storm-line-down'];

const EXPOSURE_PARTNERS = ['Resource Confederation', 'Northern Federation', 'Pacific Realm', 'Indo-Maritime Pact', 'Continental Compact', 'Southern League'];
const EXPOSURE_RESOURCES: GeopoliticalEnergyExposure['resource'][] = ['crude-oil', 'refined-fuels', 'natural-gas', 'uranium', 'lithium', 'rare-earths-grid'];

const CASCADE_TRIGGERS: CascadingFailureScenario['trigger'][] = ['substation-loss', 'generation-trip', 'interconnector-fault', 'cyber-intrusion', 'fuel-interruption', 'extreme-weather'];

const PERMIT_CATEGORIES: EnergyPermitFlow['category'][] = ['rooftop-solar', 'industrial-connection', 'ev-charger', 'biogas-microgrid', 'wind-turbine', 'storage-battery'];
const RENEWABLE_SOURCES: RenewableIntegrationRequest['source'][] = ['solar', 'wind', 'small-hydro', 'biomass', 'geothermal'];
const ADVISORY_KINDS: PublicAdvisoryEnergy['kind'][] = ['peak-demand-warning', 'planned-maintenance', 'load-shedding', 'tariff-update', 'energy-conservation', 'storm-readiness'];

export function energyExtendedBoard(now: number): EnergyExtendedBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;
  const grid = energyGridBoard(now);
  const eo = energyOps('national', ts);
  void eo;

  // ── A. Emergency operations ───────────────────────────────────────
  const blackouts: BlackoutEvent[] = Array.from({ length: 6 }, (_, i) => {
    const k = `ee:bo:${i}:${Math.floor(epoch / 4)}`;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const cause = CAUSE_KINDS[Math.floor(seed(`${k}:c`) * CAUSE_KINDS.length)]!;
    const startedHrsAgo = Math.round(wave(`${k}:s`, epoch / 4, 1, 48));
    const phaseIdx = Math.min(PHASES.length - 1, Math.floor((startedHrsAgo / 36) * PHASES.length));
    const phase = PHASES[phaseIdx]!;
    const affectedSubstations = Math.round(wave(`${k}:as`, epoch / 4, 1, 28));
    const populationAffectedK = Math.round(wave(`${k}:pa`, epoch / 4, 2, 840));
    const industrialFacilitiesOut = Math.round(wave(`${k}:ind`, epoch / 4, 0, 38));
    const estimatedRestorationHrs = Math.max(1, Math.round(wave(`${k}:er`, epoch / 5, 1, 72) - startedHrsAgo));
    const loadRestoredPct = phase === 'stabilised' ? 100
      : phase === 'energisation' ? 70 + Math.round(seed(`${k}:lr`) * 25)
        : phase === 'restoration' ? 30 + Math.round(seed(`${k}:lr`) * 35)
          : phase === 'crew-dispatch' ? 5 + Math.round(seed(`${k}:lr`) * 20)
            : 0;
    return {
      id: `BO-${(17000 + Math.floor(seed(`${k}:id`) * 60000))}`,
      region, affectedSubstations, populationAffectedK, industrialFacilitiesOut,
      startedHrsAgo, cause, phase, estimatedRestorationHrs, loadRestoredPct,
    };
  }).sort((a, b) => b.populationAffectedK - a.populationAffectedK);

  const crews: RestorationCrew[] = Array.from({ length: 10 }, (_, i) => {
    const k = `ee:cr:${i}:${Math.floor(epoch / 5)}`;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const crewKind = CREW_KINDS[Math.floor(seed(`${k}:k`) * CREW_KINDS.length)]!;
    const membersDeployed = Math.round(wave(`${k}:md`, epoch / 4, 4, 38));
    const membersAvailable = Math.round(wave(`${k}:ma`, epoch / 5, 0, 24));
    const vehiclesActive = Math.round(wave(`${k}:vh`, epoch / 4, 1, 14));
    return {
      id: `RC-${(18000 + Math.floor(seed(`${k}:id`) * 50000))}`,
      region, crewKind, membersDeployed, membersAvailable, vehiclesActive,
      enRouteTo: blackouts[Math.floor(seed(`${k}:en`) * Math.max(1, blackouts.length))]?.id ?? 'station-base',
    };
  });

  const assets: EmergencyAssetDeployment[] = ASSETS.map(asset => {
    const k = `ee:as:${asset}`;
    const unitsTotal = 40 + Math.floor(seed(`${k}:t`) * 220);
    const unitsDeployed = Math.round(unitsTotal * wave(`${k}:d`, epoch / 4, 0.12, 0.86));
    const utilisationPct = Math.round((unitsDeployed / unitsTotal) * 100);
    return { asset, unitsDeployed, unitsTotal, utilisationPct };
  });

  const criticalServicesOnBackup = CRITICAL_SERVICES.map(service => {
    const k = `ee:cs:${service}`;
    const onBackupRoll = seed(`${k}:ob:${Math.floor(epoch / 6)}`);
    const isOnBackup = onBackupRoll > 0.55;
    if (!isOnBackup) return null;
    const backupHrsRemaining = Math.round(wave(`${k}:hr`, epoch / 4, 2, 72));
    const status: 'fuel-ok' | 'low-fuel' | 'critical' =
      backupHrsRemaining < 6 ? 'critical'
        : backupHrsRemaining < 18 ? 'low-fuel' : 'fuel-ok';
    return { service, backupHrsRemaining, status };
  }).filter((x): x is { service: string; backupHrsRemaining: number; status: 'fuel-ok' | 'low-fuel' | 'critical' } => x !== null);

  const activeMajor = blackouts.filter(b => b.populationAffectedK >= 400 && b.phase !== 'stabilised').length;
  const totalAffected = blackouts.reduce((s, b) => s + b.populationAffectedK, 0);
  const posture: EmergencyOperations['posture'] =
    activeMajor >= 2 || totalAffected >= 1800 ? 'national-recovery'
      : activeMajor >= 1 || totalAffected >= 800 ? 'major-restoration'
        : blackouts.some(b => b.phase !== 'stabilised') ? 'engaged' : 'standby';
  const meanRestorationHrs = Math.round(blackouts.reduce((s, b) => s + b.estimatedRestorationHrs, 0) / Math.max(1, blackouts.length));
  const loadRestoredNationalPct = Math.round(blackouts.reduce((s, b) => s + b.loadRestoredPct, 0) / Math.max(1, blackouts.length));

  const emergency: EmergencyOperations = {
    posture, blackouts, crews, assets, criticalServicesOnBackup, meanRestorationHrs, loadRestoredNationalPct,
  };

  // ── B. Intelligence & long-horizon forecasting ────────────────────
  const horizon = [5, 10, 15, 20, 25];
  const demand: DemandForecast = {
    horizonYears: horizon,
    peakDemandTrajectoryGw: horizon.map(h => Math.round(wave(`ee:fc:pd`, epoch / 6 + h * 0.13, 60, 280))),
    renewableShareTrajectoryPct: horizon.map(h => Math.round(wave(`ee:fc:rs`, epoch / 5 + h * 0.16, 22, 86))),
    carbonIntensityTrajectory: horizon.map(h => Math.round(wave(`ee:fc:ci`, epoch / 6 + h * 0.14, 80, 480))),
    energyImportDependencyTrajectory: horizon.map(h => Math.round(wave(`ee:fc:id`, epoch / 7 + h * 0.13, 8, 64))),
    gridResilienceTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`ee:fc:gr`, epoch / 6 + h * 0.15, 44, 92))))),
    selfSufficiencyTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`ee:fc:ss`, epoch / 6 + h * 0.14, 38, 92))))),
  };

  const climateRisks: ClimateEnergyRisk[] = CLIMATE_HAZARDS.map(hazard => {
    const k = `ee:cr:${hazard}`;
    const probabilityNext12mPct = Math.round(wave(`${k}:p`, epoch / 7, 8, 78));
    const impactIfRealisedIdx = Math.round(wave(`${k}:i`, epoch / 6, 38, 96));
    const preparednessIdx = Math.round(wave(`${k}:pr`, epoch / 7, 40, 92));
    const composite = Math.min(100, Math.round((probabilityNext12mPct * impactIfRealisedIdx) / Math.max(1, preparednessIdx)));
    const classification: ClimateEnergyRisk['classification'] =
      composite >= 70 ? 'severe'
        : composite >= 45 ? 'elevated'
          : composite >= 25 ? 'moderate' : 'low';
    return { hazard, probabilityNext12mPct, impactIfRealisedIdx, preparednessIdx, composite, classification };
  }).sort((a, b) => b.composite - a.composite);

  const geopoliticalExposure: GeopoliticalEnergyExposure[] = EXPOSURE_RESOURCES.map((resource, i) => {
    const k = `ee:gx:${resource}`;
    const partner = EXPOSURE_PARTNERS[i % EXPOSURE_PARTNERS.length]!;
    const importSharePct = Math.round(wave(`${k}:s`, epoch / 7, 4, 78));
    const vulnerabilityIdx = Math.round(wave(`${k}:v`, epoch / 5, 14, 92));
    const alternativeSourcesAvailable = Math.floor(seed(`${k}:a`) * 5);
    return { partner, resource, importSharePct, vulnerabilityIdx, alternativeSourcesAvailable };
  }).sort((a, b) => b.vulnerabilityIdx - a.vulnerabilityIdx);

  const cascadingScenarios: CascadingFailureScenario[] = CASCADE_TRIGGERS.map((trigger, i) => {
    const k = `ee:cs:${trigger}`;
    const affectedRegions = 1 + Math.floor(seed(`${k}:ar`) * 6);
    const cascadeDepth = 1 + Math.floor(seed(`${k}:cd`) * 6);
    const probability12mPct = Math.round(wave(`${k}:p`, epoch / 6, 2, 48));
    const preparednessIdx = Math.round(wave(`${k}:pr`, epoch / 5, 38, 92));
    const impactSeverity: CascadingFailureScenario['impactSeverity'] =
      cascadeDepth >= 5 && affectedRegions >= 4 ? 'systemic'
        : cascadeDepth >= 4 || affectedRegions >= 4 ? 'national'
          : cascadeDepth >= 3 ? 'regional' : 'localised';
    return { id: `CF-${i + 1}`, trigger, affectedRegions, cascadeDepth, probability12mPct, impactSeverity, preparednessIdx };
  }).sort((a, b) => b.cascadeDepth * b.probability12mPct - a.cascadeDepth * a.probability12mPct);

  const intelligence: EnergyIntelligence = {
    demand, climateRisks, geopoliticalExposure, cascadingScenarios,
    aiReasoningCoveragePct: Math.round(wave(`ee:in:ai`, epoch / 8, 44, 92)),
    earlyWarningSignalsActive: Math.round(wave(`ee:in:ew`, epoch / 4, 0, 14)),
    longHorizonResilienceIdx: Math.round(wave(`ee:in:lh`, epoch / 9, 48, 92)),
    systemicEnergyRisk: Math.min(100, Math.round(
      cascadingScenarios.filter(c => c.impactSeverity === 'systemic').length * 28
      + cascadingScenarios.filter(c => c.impactSeverity === 'national').length * 14
      + climateRisks.filter(c => c.classification === 'severe').length * 12
      + (grid.command.posture === 'critical' || grid.command.posture === 'blackout-watch' ? 30 : grid.command.posture === 'strained' ? 16 : 0)
    )),
  };

  // ── C. Public energy services portal ──────────────────────────────
  const outages: OutageReport[] = Array.from({ length: 10 }, (_, i) => {
    const k = `ee:ou:${i}:${Math.floor(epoch / 4)}`;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const reportedHrsAgo = Math.round(wave(`${k}:h`, epoch / 4, 0, 48));
    const affectedAccountsK = Math.round(wave(`${k}:a`, epoch / 4, 0.1, 86) * 10) / 10;
    const sevRoll = seed(`${k}:sv`);
    const severity: OutageReport['severity'] =
      affectedAccountsK > 30 ? 'critical'
        : affectedAccountsK > 6 ? 'major'
          : sevRoll > 0.9 ? 'major' : 'minor';
    const estimatedRestorationHrs = Math.max(0, Math.round(wave(`${k}:er`, epoch / 4, 0, 16) - reportedHrsAgo * 0.5));
    const status: OutageReport['status'] =
      reportedHrsAgo >= 12 || estimatedRestorationHrs === 0 ? 'restored'
        : reportedHrsAgo >= 4 ? 'in-progress'
          : reportedHrsAgo >= 1 ? 'crew-en-route' : 'received';
    return { id: `OR-${(19000 + Math.floor(seed(`${k}:id`) * 70000))}`, region, reportedHrsAgo, affectedAccountsK, estimatedRestorationHrs, status, severity };
  }).sort((a, b) => {
    const sev = (s: OutageReport['severity']) => s === 'critical' ? 2 : s === 'major' ? 1 : 0;
    return sev(b.severity) - sev(a.severity) || a.reportedHrsAgo - b.reportedHrsAgo;
  });

  const permits: EnergyPermitFlow[] = PERMIT_CATEGORIES.map(category => {
    const k = `ee:pm:${category}`;
    return {
      category,
      pending: Math.round(wave(`${k}:p`, epoch / 4, 80, 6800)),
      approvedThisMonth: Math.round(wave(`${k}:a`, epoch / 4, 40, 2400)),
      rejectedThisMonth: Math.round(wave(`${k}:r`, epoch / 4, 4, 220)),
      medianReviewDays: Math.round(wave(`${k}:m`, epoch / 5, 5, 96)),
    };
  });

  const renewableRequests: RenewableIntegrationRequest[] = Array.from({ length: 8 }, (_, i) => {
    const k = `ee:rr:${i}:${Math.floor(epoch / 4)}`;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const source = RENEWABLE_SOURCES[Math.floor(seed(`${k}:s`) * RENEWABLE_SOURCES.length)]!;
    const capacityMw = Math.round(wave(`${k}:c`, epoch / 4, 0.4, 220) * 10) / 10;
    const daysOpen = Math.round(wave(`${k}:d`, epoch / 4, 1, 240));
    const statusRoll = seed(`${k}:st`);
    const status: RenewableIntegrationRequest['status'] =
      daysOpen > 180 ? (statusRoll > 0.3 ? 'approved' : 'declined')
        : daysOpen > 90 ? 'grid-study'
          : daysOpen > 30 ? 'feasibility' : 'queued';
    return { id: `RI-${(20000 + Math.floor(seed(`${k}:id`) * 60000))}`, region, source, capacityMw, daysOpen, status };
  }).sort((a, b) => b.capacityMw - a.capacityMw);

  const advisories: PublicAdvisoryEnergy[] = Array.from({ length: 6 }, (_, i) => {
    const k = `ee:ad:${i}:${Math.floor(epoch / 4)}`;
    const kind = ADVISORY_KINDS[Math.floor(seed(`${k}:k`) * ADVISORY_KINDS.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const ageHrs = Math.round(wave(`${k}:h`, epoch / 4, 1, 96));
    const reachM = Math.round(wave(`${k}:rm`, epoch / 5, 0.4, 12) * 10) / 10;
    const sevRoll = seed(`${k}:sv`);
    const severity: PublicAdvisoryEnergy['severity'] = sevRoll > 0.85 ? 'critical' : sevRoll > 0.55 ? 'warning' : 'advisory';
    return { id: `EAD-${i + 1}`, kind, region, ageHrs, reachM, severity };
  });

  const portal: PublicEnergyPortal = {
    outages, permits, renewableRequests, advisories,
    consumerComplaintsOpen: Math.round(wave(`ee:po:cc`, epoch / 4, 60, 3800)),
    consumerCallsDailyK: Math.round(wave(`ee:po:ck`, epoch / 4, 2, 64) * 10) / 10,
    portalAvailabilityPct: Math.round(wave(`ee:po:av`, epoch / 4, 94, 99.95) * 100) / 100,
  };

  return {
    epoch, emergency, intelligence, portal,
    prohibited: ENERGY_EXTENDED_SAFEGUARDS.prohibited,
  };
}
