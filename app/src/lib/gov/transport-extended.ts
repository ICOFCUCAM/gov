// lib/gov/transport-extended.ts
//
// Sovereign Transport extension — three operational layers
// complementing the core mobility-theater / multi-modal / logistics-
// network / continuity stack: dedicated transport emergency &
// recovery operations (corridor / runway / port collapse response),
// 25-year mobility intelligence & long-horizon forecasting, and the
// public transport services portal (schedules, permits, freight
// authorizations, advisories). Pure & deterministic.

import { seed, wave } from '@/lib/telemetry';
import { transportNetworkBoard } from '@/lib/gov/transport-network';
import { transportOps } from '@/lib/gov/transport-systems';

export const TRANSPORT_EXTENDED_SAFEGUARDS = {
  equitableMobilityAccess: true as const,
  emergencyEvacuationPriority: true as const,
  freightContinuityForCriticalGoods: true as const,
  transparentSchedulingAndPermits: true as const,
  prohibited: [
    'discriminatory-route-closure', 'arbitrary-freight-detention',
    'concealment-of-infrastructure-failure', 'denial-of-evacuation-priority',
    'unilateral-corridor-monopolisation', 'extraction-of-citizen-movement-data',
  ] as const,
};

export const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];
export type TransportMode = 'highway' | 'rail' | 'aviation' | 'maritime' | 'urban-transit' | 'bridge-tunnel';

// ── A. Transport Emergency & Recovery Operations ────────────────────
export type RecoveryPhase = 'isolation' | 'damage-survey' | 'repair-dispatch' | 'detour-routing' | 'partial-reopen' | 'restored';

export interface InfrastructureFailure {
  id: string;
  mode: TransportMode;
  asset: string;                  // e.g. "Eastern Trunk Highway km 124"
  region: string;
  cause: 'flood' | 'collapse' | 'collision' | 'wildfire' | 'storm' | 'subsidence' | 'cyber-incident';
  startedHrsAgo: number;
  detoursActive: number;
  reroutedTrafficPctOfNormal: number;   // % of normal flow rerouted
  estimatedRestorationHrs: number;
  phase: RecoveryPhase;
  populationDisruptedK: number;
  freightDisruptedTonsK: number;
}

export interface EvacuationCorridor {
  id: string;
  region: string;
  origin: string;
  destination: string;
  capacityVehiclesHr: number;
  utilisationPct: number;
  modesActive: TransportMode[];
  status: 'activated' | 'priority-lanes-open' | 'capacity-pressured' | 'closed';
}

export interface RepairCrew {
  id: string;
  mode: TransportMode;
  region: string;
  crewSize: number;
  vehiclesDeployed: number;
  enRouteTo: string;
  estimatedDurationHrs: number;
}

export interface TransportEmergency {
  posture: 'standby' | 'engaged' | 'major-disruption' | 'national-recovery';
  failures: InfrastructureFailure[];
  evacuationCorridors: EvacuationCorridor[];
  repairCrews: RepairCrew[];
  reroutedNationalLoadPct: number;
  meanRestorationHrs: number;
}

// ── B. Mobility Intelligence & Long-Horizon Forecasting ─────────────
export interface MobilityDemandForecast {
  horizonYears: number[];         // [5,10,15,20,25]
  passengerKmTrajectory: number[];        // index 100 = today
  freightTonKmTrajectory: number[];       // index 100 = today
  electrificationShareTrajectory: number[];
  congestionIndexTrajectory: number[];    // higher worse
  infrastructureResilienceTrajectory: number[];
  modalShiftTowardsRailPctTrajectory: number[];
}

export interface ClimateMobilityRisk {
  hazard: 'flood-corridor' | 'heatwave-rail-buckling' | 'wildfire-airspace' | 'storm-aviation' | 'sea-level-port' | 'permafrost-thaw-road';
  probabilityNext12mPct: number;
  impactIfRealisedIdx: number;
  preparednessIdx: number;
  composite: number;
  classification: 'low' | 'moderate' | 'elevated' | 'severe';
}

export interface FreightBottleneck {
  id: string;
  corridor: string;
  mode: TransportMode;
  utilisationPct: number;
  averageDelayHrs: number;
  vulnerabilityIdx: number;
  classification: 'flowing' | 'thinning' | 'congested' | 'critical';
}

export interface MobilityAnomaly {
  id: string;
  region: string;
  signal: 'unusual-corridor-load' | 'unscheduled-rail-stop' | 'port-clearance-spike' | 'aviation-diversion-cluster' | 'evac-route-engagement' | 'sensor-blackout';
  confidence: number;
  detectedHrsAgo: number;
  tier: 'observation' | 'elevated' | 'urgent' | 'critical';
}

export interface MobilityIntelligence {
  demand: MobilityDemandForecast;
  climateRisks: ClimateMobilityRisk[];
  bottlenecks: FreightBottleneck[];
  anomalies: MobilityAnomaly[];
  aiReasoningCoveragePct: number;
  longHorizonResilienceIdx: number;
  systemicMobilityRisk: number;
}

// ── C. Public Transport Services Portal ─────────────────────────────
export interface TransitSchedule {
  mode: 'urban-rail' | 'long-distance-rail' | 'bus' | 'ferry' | 'aviation' | 'tram-light-rail';
  routesActive: number;
  onTimePct: number;
  cancelledToday: number;
  averageHeadwayMin: number;
  ridershipDailyK: number;
}

export interface TransportPermitFlow {
  category: 'commercial-vehicle' | 'oversize-cargo' | 'hazardous-materials' | 'cross-border-freight' | 'special-event-routing' | 'aviation-charter';
  pending: number;
  approvedThisWeek: number;
  rejectedThisWeek: number;
  medianReviewDays: number;
}

export interface LogisticsRequest {
  id: string;
  shipper: string;
  origin: string;
  destination: string;
  cargoTons: number;
  mode: TransportMode;
  daysOpen: number;
  status: 'queued' | 'routing' | 'scheduled' | 'in-transit' | 'delivered';
}

export interface PublicAdvisoryMobility {
  id: string;
  kind: 'congestion-alert' | 'corridor-closure' | 'transit-disruption' | 'weather-advisory' | 'cargo-priority-update' | 'border-delay';
  region: string;
  ageHrs: number;
  reachM: number;
  severity: 'advisory' | 'warning' | 'critical';
}

export interface PublicTransportPortal {
  schedules: TransitSchedule[];
  permits: TransportPermitFlow[];
  logisticsRequests: LogisticsRequest[];
  advisories: PublicAdvisoryMobility[];
  citizenComplaintsOpen: number;
  rideshipDailyMillions: number;
  portalAvailabilityPct: number;
}

export interface TransportExtendedBoard {
  epoch: number;
  emergency: TransportEmergency;
  intelligence: MobilityIntelligence;
  portal: PublicTransportPortal;
  prohibited: readonly string[];
}

const MODES: TransportMode[] = ['highway', 'rail', 'aviation', 'maritime', 'urban-transit', 'bridge-tunnel'];
const CAUSES: InfrastructureFailure['cause'][] = ['flood', 'collapse', 'collision', 'wildfire', 'storm', 'subsidence', 'cyber-incident'];
const PHASES: RecoveryPhase[] = ['isolation', 'damage-survey', 'repair-dispatch', 'detour-routing', 'partial-reopen', 'restored'];

const CORRIDOR_NAMES = [
  'Eastern Trunk Highway km 124', 'Capital Ring Rail Junction', 'Coastal Container Port — Berth 7',
  'Northern Mountain Pass Tunnel', 'Highland Bridge № 312', 'Capital International Runway 09L',
  'Western Freight Yard', 'Southern Maritime Approach Channel',
];

const CLIMATE_HAZARDS: ClimateMobilityRisk['hazard'][] = ['flood-corridor', 'heatwave-rail-buckling', 'wildfire-airspace', 'storm-aviation', 'sea-level-port', 'permafrost-thaw-road'];

const ANOMALY_SIGNALS: MobilityAnomaly['signal'][] = ['unusual-corridor-load', 'unscheduled-rail-stop', 'port-clearance-spike', 'aviation-diversion-cluster', 'evac-route-engagement', 'sensor-blackout'];

const FREIGHT_CORRIDORS = [
  'Northern Iron Corridor', 'Capital Port Spur', 'Eastern Grain Trunk', 'Coastal LNG Terminal Lane',
  'Highland Mining Rail', 'Continental Bridge Corridor', 'Southern Auto-export Lane', 'Western Industrial Spur',
];

const SCHEDULE_MODES: TransitSchedule['mode'][] = ['urban-rail', 'long-distance-rail', 'bus', 'ferry', 'aviation', 'tram-light-rail'];
const PERMIT_CATEGORIES: TransportPermitFlow['category'][] = ['commercial-vehicle', 'oversize-cargo', 'hazardous-materials', 'cross-border-freight', 'special-event-routing', 'aviation-charter'];
const ADVISORY_KINDS: PublicAdvisoryMobility['kind'][] = ['congestion-alert', 'corridor-closure', 'transit-disruption', 'weather-advisory', 'cargo-priority-update', 'border-delay'];
const SHIPPERS = ['National Grain Co-op', 'Northern Mining SOE', 'Coastal Petrochemical', 'Continental Auto Mfg', 'Capital Pharma Distributor', 'Eastern Electronics Hub'];

export function transportExtendedBoard(now: number): TransportExtendedBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;
  const net = transportNetworkBoard(now);
  const op = transportOps('national', ts);
  void op;

  // ── A. Emergency operations ───────────────────────────────────────
  const failures: InfrastructureFailure[] = Array.from({ length: 6 }, (_, i) => {
    const k = `tx:if:${i}:${Math.floor(epoch / 4)}`;
    const mode = MODES[Math.floor(seed(`${k}:m`) * MODES.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const cause = CAUSES[Math.floor(seed(`${k}:c`) * CAUSES.length)]!;
    const asset = CORRIDOR_NAMES[Math.floor(seed(`${k}:a`) * CORRIDOR_NAMES.length)]!;
    const startedHrsAgo = Math.round(wave(`${k}:s`, epoch / 4, 1, 72));
    const phaseIdx = Math.min(PHASES.length - 1, Math.floor((startedHrsAgo / 48) * PHASES.length));
    const phase = PHASES[phaseIdx]!;
    const detoursActive = Math.round(wave(`${k}:d`, epoch / 4, 1, 14));
    const reroutedTrafficPctOfNormal = phase === 'restored' ? 0
      : phase === 'partial-reopen' ? 20 + Math.round(seed(`${k}:rt`) * 30)
        : phase === 'detour-routing' ? 60 + Math.round(seed(`${k}:rt`) * 30)
          : 90 + Math.round(seed(`${k}:rt`) * 10);
    const estimatedRestorationHrs = Math.max(1, Math.round(wave(`${k}:er`, epoch / 5, 1, 96) - startedHrsAgo));
    const populationDisruptedK = Math.round(wave(`${k}:pd`, epoch / 4, 2, 880));
    const freightDisruptedTonsK = Math.round(wave(`${k}:fd`, epoch / 4, 0.4, 220) * 10) / 10;
    return {
      id: `IF-${(21000 + Math.floor(seed(`${k}:id`) * 60000))}`,
      mode, asset, region, cause, startedHrsAgo, detoursActive,
      reroutedTrafficPctOfNormal, estimatedRestorationHrs, phase,
      populationDisruptedK, freightDisruptedTonsK,
    };
  }).sort((a, b) => b.populationDisruptedK - a.populationDisruptedK);

  const evacuationCorridors: EvacuationCorridor[] = Array.from({ length: 4 }, (_, i) => {
    const k = `tx:ec:${i}:${Math.floor(epoch / 4)}`;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const origin = ['Eastern Coastal Zone', 'Highland Floodplain', 'Capital Periphery', 'Northern Border Town', 'Western Industrial Belt'][Math.floor(seed(`${k}:o`) * 5)]!;
    const destination = ['Capital District Safe Zone', 'Northern Reception Centre', 'Eastern Transit Hub', 'Coastal Highland Refuge'][Math.floor(seed(`${k}:dt`) * 4)]!;
    const capacityVehiclesHr = Math.round(wave(`${k}:c`, epoch / 5, 800, 14000));
    const utilisationPct = Math.round(wave(`${k}:u`, epoch / 3, 12, 124));
    const status: EvacuationCorridor['status'] =
      utilisationPct >= 100 ? 'capacity-pressured'
        : utilisationPct >= 70 ? 'priority-lanes-open'
          : utilisationPct >= 20 ? 'activated' : 'closed';
    const modesActive: TransportMode[] = ['highway', 'rail'].filter((_, j) => seed(`${k}:ma:${j}`) > 0.3) as TransportMode[];
    return { id: `EC-${i + 1}`, region, origin, destination, capacityVehiclesHr, utilisationPct, modesActive: modesActive.length ? modesActive : ['highway'], status };
  });

  const repairCrews: RepairCrew[] = Array.from({ length: 8 }, (_, i) => {
    const k = `tx:rc:${i}:${Math.floor(epoch / 5)}`;
    const mode = MODES[Math.floor(seed(`${k}:m`) * MODES.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    return {
      id: `TR-${(22000 + Math.floor(seed(`${k}:id`) * 50000))}`,
      mode, region,
      crewSize: 4 + Math.floor(seed(`${k}:cs`) * 28),
      vehiclesDeployed: 1 + Math.floor(seed(`${k}:vd`) * 12),
      enRouteTo: failures[Math.floor(seed(`${k}:to`) * Math.max(1, failures.length))]?.id ?? 'depot',
      estimatedDurationHrs: Math.round(wave(`${k}:ed`, epoch / 4, 2, 96)),
    };
  });

  const activeMajor = failures.filter(f => f.populationDisruptedK >= 200 && f.phase !== 'restored').length;
  const totalDisrupted = failures.reduce((s, f) => s + f.populationDisruptedK, 0);
  const posture: TransportEmergency['posture'] =
    activeMajor >= 3 || totalDisrupted >= 1600 ? 'national-recovery'
      : activeMajor >= 1 || totalDisrupted >= 600 ? 'major-disruption'
        : failures.some(f => f.phase !== 'restored') ? 'engaged' : 'standby';
  const reroutedNationalLoadPct = Math.round(failures.reduce((s, f) => s + f.reroutedTrafficPctOfNormal, 0) / Math.max(1, failures.length));
  const meanRestorationHrs = Math.round(failures.reduce((s, f) => s + f.estimatedRestorationHrs, 0) / Math.max(1, failures.length));

  const emergency: TransportEmergency = { posture, failures, evacuationCorridors, repairCrews, reroutedNationalLoadPct, meanRestorationHrs };

  // ── B. Intelligence & long-horizon forecasting ────────────────────
  const horizon = [5, 10, 15, 20, 25];
  const demand: MobilityDemandForecast = {
    horizonYears: horizon,
    passengerKmTrajectory: horizon.map(h => Math.round(wave(`tx:fc:pk`, epoch / 7 + h * 0.13, 90, 180))),
    freightTonKmTrajectory: horizon.map(h => Math.round(wave(`tx:fc:fk`, epoch / 6 + h * 0.14, 95, 190))),
    electrificationShareTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`tx:fc:el`, epoch / 5 + h * 0.16, 18, 78))))),
    congestionIndexTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`tx:fc:cg`, epoch / 6 + h * 0.13, 32, 82))))),
    infrastructureResilienceTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`tx:fc:ir`, epoch / 7 + h * 0.15, 42, 92))))),
    modalShiftTowardsRailPctTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`tx:fc:ms`, epoch / 6 + h * 0.14, 14, 64))))),
  };

  const climateRisks: ClimateMobilityRisk[] = CLIMATE_HAZARDS.map(hazard => {
    const k = `tx:cr:${hazard}`;
    const probabilityNext12mPct = Math.round(wave(`${k}:p`, epoch / 7, 8, 78));
    const impactIfRealisedIdx = Math.round(wave(`${k}:i`, epoch / 6, 38, 96));
    const preparednessIdx = Math.round(wave(`${k}:pr`, epoch / 7, 40, 92));
    const composite = Math.min(100, Math.round((probabilityNext12mPct * impactIfRealisedIdx) / Math.max(1, preparednessIdx)));
    const classification: ClimateMobilityRisk['classification'] =
      composite >= 70 ? 'severe' : composite >= 45 ? 'elevated' : composite >= 25 ? 'moderate' : 'low';
    return { hazard, probabilityNext12mPct, impactIfRealisedIdx, preparednessIdx, composite, classification };
  }).sort((a, b) => b.composite - a.composite);

  const bottlenecks: FreightBottleneck[] = FREIGHT_CORRIDORS.map((corridor, i) => {
    const k = `tx:fb:${corridor}`;
    const mode = MODES[Math.floor(seed(`${k}:m`) * MODES.length)]!;
    const utilisationPct = Math.round(wave(`${k}:u`, epoch / 4, 38, 132));
    const averageDelayHrs = Math.round(wave(`${k}:ad`, epoch / 5, 0, 36));
    const vulnerabilityIdx = Math.round(wave(`${k}:v`, epoch / 5, 14, 92));
    const classification: FreightBottleneck['classification'] =
      utilisationPct >= 100 || averageDelayHrs >= 24 ? 'critical'
        : utilisationPct >= 85 || averageDelayHrs >= 12 ? 'congested'
          : utilisationPct >= 65 ? 'thinning' : 'flowing';
    void i;
    return { id: `FB-${i + 1}`, corridor, mode, utilisationPct, averageDelayHrs, vulnerabilityIdx, classification };
  }).sort((a, b) => b.vulnerabilityIdx - a.vulnerabilityIdx);

  const anomalies: MobilityAnomaly[] = Array.from({ length: 8 }, (_, i) => {
    const k = `tx:an:${i}:${Math.floor(epoch / 4)}`;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const signal = ANOMALY_SIGNALS[Math.floor(seed(`${k}:s`) * ANOMALY_SIGNALS.length)]!;
    const confidence = Math.round(wave(`${k}:c`, epoch / 4, 38, 96));
    const detectedHrsAgo = Math.round(wave(`${k}:d`, epoch / 4, 1, 96));
    const tier: MobilityAnomaly['tier'] =
      confidence >= 85 ? 'critical'
        : confidence >= 70 ? 'urgent'
          : confidence >= 55 ? 'elevated' : 'observation';
    return { id: `MA-${(23000 + Math.floor(seed(`${k}:id`) * 60000))}`, region, signal, confidence, detectedHrsAgo, tier };
  }).sort((a, b) => {
    const t = (x: MobilityAnomaly['tier']) => x === 'critical' ? 3 : x === 'urgent' ? 2 : x === 'elevated' ? 1 : 0;
    return t(b.tier) - t(a.tier) || a.detectedHrsAgo - b.detectedHrsAgo;
  });

  const intelligence: MobilityIntelligence = {
    demand, climateRisks, bottlenecks, anomalies,
    aiReasoningCoveragePct: Math.round(wave(`tx:in:ai`, epoch / 8, 42, 92)),
    longHorizonResilienceIdx: Math.round(wave(`tx:in:lh`, epoch / 9, 48, 92)),
    systemicMobilityRisk: Math.min(100, Math.round(
      bottlenecks.filter(b => b.classification === 'critical').length * 16
      + climateRisks.filter(r => r.classification === 'severe').length * 12
      + (net.command.posture === 'critical' || net.command.posture === 'collapse-watch' ? 28 : net.command.posture === 'congested' ? 14 : 0)
    )),
  };

  // ── C. Public portal ──────────────────────────────────────────────
  const schedules: TransitSchedule[] = SCHEDULE_MODES.map(mode => {
    const k = `tx:ts:${mode}`;
    return {
      mode,
      routesActive: Math.round(wave(`${k}:r`, epoch / 5, 12, 480)),
      onTimePct: Math.round(wave(`${k}:o`, epoch / 4, 62, 99)),
      cancelledToday: Math.round(wave(`${k}:cc`, epoch / 4, 0, 38)),
      averageHeadwayMin: Math.round(wave(`${k}:h`, epoch / 5, 3, 96)),
      ridershipDailyK: Math.round(wave(`${k}:rd`, epoch / 4, 4, 2200) * 10) / 10,
    };
  });

  const permits: TransportPermitFlow[] = PERMIT_CATEGORIES.map(category => {
    const k = `tx:pm:${category}`;
    return {
      category,
      pending: Math.round(wave(`${k}:p`, epoch / 4, 60, 4800)),
      approvedThisWeek: Math.round(wave(`${k}:a`, epoch / 3, 60, 2400)),
      rejectedThisWeek: Math.round(wave(`${k}:r`, epoch / 4, 2, 220)),
      medianReviewDays: Math.round(wave(`${k}:m`, epoch / 5, 1, 48)),
    };
  });

  const logisticsRequests: LogisticsRequest[] = Array.from({ length: 10 }, (_, i) => {
    const k = `tx:lr:${i}:${Math.floor(epoch / 4)}`;
    const shipper = SHIPPERS[Math.floor(seed(`${k}:s`) * SHIPPERS.length)]!;
    const origin = REGIONS[Math.floor(seed(`${k}:o`) * REGIONS.length)]!;
    const destination = REGIONS[Math.floor(seed(`${k}:dt`) * REGIONS.length)]!;
    const cargoTons = Math.round(wave(`${k}:c`, epoch / 4, 1, 2200));
    const mode = MODES[Math.floor(seed(`${k}:m`) * MODES.length)]!;
    const daysOpen = Math.round(wave(`${k}:d`, epoch / 4, 0, 22));
    const status: LogisticsRequest['status'] =
      daysOpen >= 14 ? 'delivered'
        : daysOpen >= 8 ? 'in-transit'
          : daysOpen >= 4 ? 'scheduled'
            : daysOpen >= 1 ? 'routing' : 'queued';
    return { id: `LR-${(24000 + Math.floor(seed(`${k}:id`) * 70000))}`, shipper, origin, destination, cargoTons, mode, daysOpen, status };
  }).sort((a, b) => b.cargoTons - a.cargoTons);

  const advisories: PublicAdvisoryMobility[] = Array.from({ length: 6 }, (_, i) => {
    const k = `tx:ad:${i}:${Math.floor(epoch / 4)}`;
    const kind = ADVISORY_KINDS[Math.floor(seed(`${k}:k`) * ADVISORY_KINDS.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const ageHrs = Math.round(wave(`${k}:h`, epoch / 4, 1, 72));
    const reachM = Math.round(wave(`${k}:rm`, epoch / 5, 0.2, 8) * 10) / 10;
    const sevRoll = seed(`${k}:sv`);
    const severity: PublicAdvisoryMobility['severity'] = sevRoll > 0.85 ? 'critical' : sevRoll > 0.55 ? 'warning' : 'advisory';
    return { id: `TAD-${i + 1}`, kind, region, ageHrs, reachM, severity };
  });

  const portal: PublicTransportPortal = {
    schedules, permits, logisticsRequests, advisories,
    citizenComplaintsOpen: Math.round(wave(`tx:po:cc`, epoch / 4, 80, 4800)),
    rideshipDailyMillions: Math.round(schedules.reduce((s, x) => s + x.ridershipDailyK, 0) / 1000 * 10) / 10,
    portalAvailabilityPct: Math.round(wave(`tx:po:av`, epoch / 4, 94, 99.95) * 100) / 100,
  };

  return {
    epoch, emergency, intelligence, portal,
    prohibited: TRANSPORT_EXTENDED_SAFEGUARDS.prohibited,
  };
}
