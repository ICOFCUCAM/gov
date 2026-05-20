// lib/gov/environmental-governance.ts
//
// Sovereign Environmental Governance & Public Continuity engine.
// Complements the climate-resilience board with three operational
// layers: natural-resource governance (water allocations, land
// protection, forestry administration, mineral & extraction
// compliance), energy↔ecology interdependency diagnostics, and the
// public environmental portal (permits, citizen reports, advisories
// and conservation engagement). Pure & deterministic; SSR-stable per
// operational epoch. Composed from existing climate, energy and
// agriculture engines for cross-ministry interoperability.

import { seed, wave } from '@/lib/telemetry';
import { climateResilienceBoard } from '@/lib/gov/climate-resilience';
import { energyOps } from '@/lib/gov/energy-systems';
import { agricultureOps } from '@/lib/gov/agriculture-systems';

export const ENVIRONMENTAL_GOVERNANCE_SAFEGUARDS = {
  nonExploitativeResourceUse: true as const,
  publicParticipation: true as const,
  intergenerationalStewardship: true as const,
  prohibited: [
    'unilateral-extraction-without-consent', 'discriminatory-permit-allocation',
    'concealment-of-pollution-data', 'silencing-of-citizen-reports',
    'circumvention-of-environmental-review', 'expropriation-of-protected-land',
  ] as const,
};

// ── A. Natural Resource Governance ──────────────────────────────────
export interface WaterAllocation {
  basin: string;
  allocationMcm: number;       // million cubic metres per year
  withdrawalPct: number;       // share of allocation withdrawn
  ecologicalReservePct: number;
  status: 'within-budget' | 'observant' | 'over-allocation' | 'critical-depletion';
}

export interface LandProtection {
  category: 'national-park' | 'nature-reserve' | 'wildlife-corridor' | 'wetland' | 'marine-protected';
  hectaresK: number;
  encroachmentIncidents: number;
  ecologicalStatusIdx: number;
  enforcementCases: number;
}

export interface ForestryRegister {
  region: string;
  managedHectaresK: number;
  sustainableHarvestPct: number;
  illegalLoggingCases: number;
  reforestationActiveK: number;
  posture: 'managed' | 'pressured' | 'over-extraction' | 'recovery';
}

export interface ExtractionPermit {
  id: string;
  resource: 'minerals' | 'aggregates' | 'groundwater' | 'forestry' | 'oil-gas';
  region: string;
  operator: string;
  complianceIdx: number;
  monitoringCadenceDays: number;
  status: 'active' | 'review' | 'suspended' | 'revoked';
  daysToReview: number;
}

export interface ResourceGovernance {
  waterAllocations: WaterAllocation[];
  landProtections: LandProtection[];
  forestry: ForestryRegister[];
  extractionPermits: ExtractionPermit[];
  resourceSustainabilityIdx: number;
  enforcementCasesOpen: number;
  intergenerationalStewardshipIdx: number;
}

// ── B. Energy ↔ Ecology Interdependency ─────────────────────────────
export interface CouplingDiagnostic {
  axis: 'energy-emissions' | 'energy-water' | 'industry-pollution' | 'agriculture-runoff' | 'transport-air-quality' | 'infrastructure-climate-exposure';
  loadIdx: number;            // 0..100 pressure on ecology
  recoveryIdx: number;        // 0..100 ecology's capacity to absorb
  tension: number;            // load - recovery + 50
  classification: 'balanced' | 'observant' | 'tightening' | 'overload';
}

export interface InterdependencyMatrix {
  diagnostics: CouplingDiagnostic[];
  energyEcologyAlignmentIdx: number;
  industrialPollutionExposureIdx: number;
  agriculturalClimatePressureIdx: number;
  waterEnergyDependencyIdx: number;
  greenTransitionProgressPct: number;
}

// ── C. Public Environment Portal ────────────────────────────────────
export interface PermitApplicationFlow {
  category: 'environmental-impact' | 'water-use' | 'emissions' | 'land-change' | 'waste-disposal';
  pending: number;
  approvedToday: number;
  rejectedToday: number;
  medianReviewDays: number;
  appealsOpen: number;
}

export interface CitizenIncidentReport {
  id: string;
  kind: 'pollution-event' | 'illegal-dumping' | 'wildlife-distress' | 'water-contamination' | 'air-quality' | 'illegal-logging';
  region: string;
  reportedHrsAgo: number;
  status: 'received' | 'triaged' | 'investigating' | 'resolved';
  severity: 'low' | 'elevated' | 'severe';
}

export interface PublicAdvisory {
  id: string;
  channel: 'wildfire-alert' | 'flood-notice' | 'air-quality-warning' | 'conservation-call' | 'water-restriction';
  region: string;
  ageHrs: number;
  reachK: number;
  severity: 'advisory' | 'warning' | 'emergency';
}

export interface PublicPortal {
  permits: PermitApplicationFlow[];
  reports: CitizenIncidentReport[];
  advisories: PublicAdvisory[];
  participationIdx: number;
  conservationEnrolmentsK: number;
  educationProgrammesActive: number;
  portalUptimePct: number;
}

export interface EnvironmentalGovernanceBoard {
  epoch: number;
  resources: ResourceGovernance;
  interdependency: InterdependencyMatrix;
  portal: PublicPortal;
  prohibited: readonly string[];
}

const WATER_BASINS = ['Aurine', 'Eastern Confluence', 'Coastal Delta', 'Northern Spring', 'Highland Tributary'];
const LAND_CATEGORIES: LandProtection['category'][] = ['national-park', 'nature-reserve', 'wildlife-corridor', 'wetland', 'marine-protected'];
const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];
const PERMIT_RESOURCES: ExtractionPermit['resource'][] = ['minerals', 'aggregates', 'groundwater', 'forestry', 'oil-gas'];
const OPERATORS = ['Northland Resources Co.', 'Eastern Mining Authority', 'Coastal Aggregates', 'Highland Forestry SOE', 'Capital Water Utility', 'Southern Petrochemical'];
const PERMIT_CATEGORIES: PermitApplicationFlow['category'][] = ['environmental-impact', 'water-use', 'emissions', 'land-change', 'waste-disposal'];
const INCIDENT_KINDS: CitizenIncidentReport['kind'][] = ['pollution-event', 'illegal-dumping', 'wildlife-distress', 'water-contamination', 'air-quality', 'illegal-logging'];
const ADVISORY_CHANNELS: PublicAdvisory['channel'][] = ['wildfire-alert', 'flood-notice', 'air-quality-warning', 'conservation-call', 'water-restriction'];

export function environmentalGovernanceBoard(now: number): EnvironmentalGovernanceBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;
  const climate = climateResilienceBoard(now);
  const en = energyOps('national', ts);
  const ag = agricultureOps('national', ts);

  // ── A. Resource governance ────────────────────────────────────────
  const waterAllocations: WaterAllocation[] = WATER_BASINS.map(basin => {
    const k = `eg:wa:${basin}`;
    const allocationMcm = Math.round(wave(`${k}:al`, epoch / 7, 800, 6400));
    const withdrawalPct = Math.round(wave(`${k}:wd`, epoch / 5, 38, 122));
    const ecologicalReservePct = Math.round(wave(`${k}:er`, epoch / 7, 18, 48));
    const status: WaterAllocation['status'] =
      withdrawalPct > 110 ? 'critical-depletion'
        : withdrawalPct > 95 ? 'over-allocation'
          : withdrawalPct > 80 ? 'observant' : 'within-budget';
    return { basin, allocationMcm, withdrawalPct, ecologicalReservePct, status };
  });

  const landProtections: LandProtection[] = LAND_CATEGORIES.map(category => {
    const k = `eg:lp:${category}`;
    const hectaresK = 60 + Math.floor(seed(`${k}:h`) * 3400);
    const encroachmentIncidents = Math.floor(seed(`${k}:en:${Math.floor(epoch / 5)}`) * 14);
    const ecologicalStatusIdx = Math.round(wave(`${k}:es`, epoch / 6, 52, 96));
    const enforcementCases = Math.floor(seed(`${k}:ef:${Math.floor(epoch / 6)}`) * 28);
    return { category, hectaresK, encroachmentIncidents, ecologicalStatusIdx, enforcementCases };
  });

  const forestry: ForestryRegister[] = REGIONS.map(region => {
    const k = `eg:fr:${region}`;
    const managedHectaresK = Math.round(wave(`${k}:mh`, epoch / 8, 80, 2400));
    const sustainableHarvestPct = Math.round(wave(`${k}:sh`, epoch / 6, 38, 96));
    const illegalLoggingCases = Math.floor(seed(`${k}:il:${Math.floor(epoch / 5)}`) * 24);
    const reforestationActiveK = Math.round(wave(`${k}:rf`, epoch / 7, 4, 220) * 10) / 10;
    const posture: ForestryRegister['posture'] =
      illegalLoggingCases >= 12 || sustainableHarvestPct < 50 ? 'over-extraction'
        : sustainableHarvestPct < 70 ? 'pressured'
          : reforestationActiveK > 80 ? 'recovery' : 'managed';
    return { region, managedHectaresK, sustainableHarvestPct, illegalLoggingCases, reforestationActiveK, posture };
  });

  const extractionPermits: ExtractionPermit[] = Array.from({ length: 8 }, (_, i) => {
    const k = `eg:ep:${i}:${Math.floor(epoch / 4)}`;
    const resource = PERMIT_RESOURCES[Math.floor(seed(`${k}:r`) * PERMIT_RESOURCES.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:rg`) * REGIONS.length)]!;
    const operator = OPERATORS[Math.floor(seed(`${k}:op`) * OPERATORS.length)]!;
    const complianceIdx = Math.round(wave(`${k}:c`, epoch / 6, 48, 96));
    const monitoringCadenceDays = Math.round(wave(`${k}:mc`, epoch / 7, 14, 120));
    const statusRoll = seed(`${k}:st`);
    const status: ExtractionPermit['status'] =
      statusRoll > 0.94 ? 'revoked'
        : statusRoll > 0.86 ? 'suspended'
          : statusRoll > 0.66 || complianceIdx < 60 ? 'review' : 'active';
    const daysToReview = Math.max(0, Math.round(wave(`${k}:dr`, epoch / 5, -30, 240)));
    return { id: `EP-${(6000 + Math.floor(seed(`${k}:id`) * 50000))}`, resource, region, operator, complianceIdx, monitoringCadenceDays, status, daysToReview };
  }).sort((a, b) => a.complianceIdx - b.complianceIdx);

  const resources: ResourceGovernance = {
    waterAllocations, landProtections, forestry, extractionPermits,
    resourceSustainabilityIdx: Math.round(wave(`eg:rs:si`, epoch / 9, 48, 92)),
    enforcementCasesOpen: landProtections.reduce((s, l) => s + l.enforcementCases, 0)
      + forestry.reduce((s, f) => s + f.illegalLoggingCases, 0)
      + extractionPermits.filter(p => p.status === 'review' || p.status === 'suspended').length * 3,
    intergenerationalStewardshipIdx: Math.round(wave(`eg:rs:is`, epoch / 11, 52, 94)),
  };

  // ── B. Interdependency ────────────────────────────────────────────
  // Derive cross-engine coupling pressures from real engine state.
  const energyEmissionsPressure = wave(`eg:cd:ee`, epoch / 5, 32, 84);
  const agriRunoffPressure = wave(`eg:cd:ar`, epoch / 5, 28, 78);
  void en; void ag;
  const diagnostics: CouplingDiagnostic[] = (
    [
      ['energy-emissions', energyEmissionsPressure, 100 - (climate.atmosphere.airQualityIndex / 2)],
      ['energy-water', wave(`eg:cd:ew`, epoch / 5, 30, 84), wave(`eg:cd:ewR`, epoch / 6, 38, 88)],
      ['industry-pollution', climate.pollution.emissionsVsTargetPct - 30, climate.pollution.complianceIdx],
      ['agriculture-runoff', agriRunoffPressure, wave(`eg:cd:arR`, epoch / 6, 36, 82)],
      ['transport-air-quality', wave(`eg:cd:ta`, epoch / 5, 36, 86), 100 - Math.min(100, climate.atmosphere.airQualityIndex * 0.5)],
      ['infrastructure-climate-exposure', wave(`eg:cd:ie`, epoch / 6, 32, 82), climate.command.adaptationReadinessIdx],
    ] as Array<[CouplingDiagnostic['axis'], number, number]>
  ).map(([axis, l, r]) => {
    const loadIdx = Math.max(0, Math.min(100, Math.round(l)));
    const recoveryIdx = Math.max(0, Math.min(100, Math.round(r)));
    const tension = Math.max(0, Math.min(100, loadIdx - recoveryIdx + 50));
    const classification: CouplingDiagnostic['classification'] =
      tension >= 78 ? 'overload'
        : tension >= 60 ? 'tightening'
          : tension >= 45 ? 'observant' : 'balanced';
    return { axis, loadIdx, recoveryIdx, tension, classification };
  });

  const interdependency: InterdependencyMatrix = {
    diagnostics,
    energyEcologyAlignmentIdx: Math.round(diagnostics.reduce((s, d) => s + (100 - d.tension), 0) / diagnostics.length),
    industrialPollutionExposureIdx: Math.round(wave(`eg:in:ip`, epoch / 6, 22, 78)),
    agriculturalClimatePressureIdx: Math.round(wave(`eg:in:ac`, epoch / 5, 18, 72)),
    waterEnergyDependencyIdx: Math.round(wave(`eg:in:we`, epoch / 7, 28, 78)),
    greenTransitionProgressPct: Math.round(wave(`eg:in:gt`, epoch / 9, 12, 62)),
  };

  // ── C. Public portal ──────────────────────────────────────────────
  const permits: PermitApplicationFlow[] = PERMIT_CATEGORIES.map(category => {
    const k = `eg:pa:${category}`;
    return {
      category,
      pending: Math.round(wave(`${k}:p`, epoch / 4, 40, 2400)),
      approvedToday: Math.round(wave(`${k}:a`, epoch / 3, 4, 280)),
      rejectedToday: Math.round(wave(`${k}:r`, epoch / 3, 0, 38)),
      medianReviewDays: Math.round(wave(`${k}:m`, epoch / 6, 8, 96)),
      appealsOpen: Math.round(wave(`${k}:ap`, epoch / 5, 1, 84)),
    };
  });

  const reports: CitizenIncidentReport[] = Array.from({ length: 10 }, (_, i) => {
    const k = `eg:rp:${i}:${Math.floor(epoch / 4)}`;
    const kind = INCIDENT_KINDS[Math.floor(seed(`${k}:k`) * INCIDENT_KINDS.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:rg`) * REGIONS.length)]!;
    const reportedHrsAgo = Math.round(wave(`${k}:hr`, epoch / 4, 1, 168));
    const statusRoll = seed(`${k}:st`);
    const status: CitizenIncidentReport['status'] =
      reportedHrsAgo > 96 ? 'resolved'
        : reportedHrsAgo > 48 ? 'investigating'
          : statusRoll > 0.5 ? 'triaged' : 'received';
    const sevRoll = seed(`${k}:sv`);
    const severity: CitizenIncidentReport['severity'] = sevRoll > 0.85 ? 'severe' : sevRoll > 0.55 ? 'elevated' : 'low';
    return { id: `EIR-${(7000 + Math.floor(seed(`${k}:id`) * 50000))}`, kind, region, reportedHrsAgo, status, severity };
  }).sort((a, b) => a.reportedHrsAgo - b.reportedHrsAgo);

  const advisories: PublicAdvisory[] = Array.from({ length: 6 }, (_, i) => {
    const k = `eg:ad:${i}:${Math.floor(epoch / 4)}`;
    const channel = ADVISORY_CHANNELS[Math.floor(seed(`${k}:c`) * ADVISORY_CHANNELS.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:rg`) * REGIONS.length)]!;
    const ageHrs = Math.round(wave(`${k}:ag`, epoch / 4, 1, 96));
    const reachK = Math.round(wave(`${k}:rk`, epoch / 5, 20, 4800));
    const sevRoll = seed(`${k}:sv`);
    const severity: PublicAdvisory['severity'] = sevRoll > 0.85 ? 'emergency' : sevRoll > 0.6 ? 'warning' : 'advisory';
    return { id: `EA-${i + 1}`, channel, region, ageHrs, reachK, severity };
  });

  const portal: PublicPortal = {
    permits, reports, advisories,
    participationIdx: Math.round(wave(`eg:po:p`, epoch / 7, 38, 88)),
    conservationEnrolmentsK: Math.round(wave(`eg:po:ce`, epoch / 6, 8, 240)),
    educationProgrammesActive: Math.round(wave(`eg:po:ed`, epoch / 5, 12, 180)),
    portalUptimePct: Math.round(wave(`eg:po:up`, epoch / 4, 92, 99.9) * 10) / 10,
  };

  return {
    epoch, resources, interdependency, portal,
    prohibited: ENVIRONMENTAL_GOVERNANCE_SAFEGUARDS.prohibited,
  };
}
