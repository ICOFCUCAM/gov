// lib/gov/industrial-continuity.ts
//
// Sovereign Trade, Industry & Strategic Production engine. National
// industrial command, trade corridors & exports, strategic production,
// commercial continuity, supply-chain intelligence, foreign trade &
// economic diplomacy, industrial crisis and 20-year economic foresight
// — one connected deterministic runtime. Cross-ministry cascade carries
// every industrial disruption through Transport / Treasury / Energy /
// Labor / Agriculture / Foreign Affairs / Interior / Cabinet.
// Pure & deterministic; SSR-stable per operational epoch.

import { seed, wave } from '@/lib/telemetry';
import { tradeOps } from '@/lib/gov/trade-systems';

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

export const INDUSTRIAL_CONTINUITY_SAFEGUARDS = {
  strategicReserveProtection: true as const,
  nonDiscriminatoryMarketAccess: true as const,
  workerProtectionDuringClosure: true as const,
  transparentTenderAndLicensing: true as const,
  prohibited: [
    'discriminatory-market-exclusion', 'arbitrary-export-ban-without-cabinet-review',
    'concealment-of-supply-chain-vulnerability', 'tariff-escalation-without-reciprocity-review',
    'cartel-toleration', 'extraction-of-strategic-reserve-without-authorisation',
  ] as const,
};

export type IndustrialPosture =
  | 'productive' | 'engaged' | 'pressured' | 'contraction' | 'industrial-crisis';

// ── 1. National industrial command ──────────────────────────────────
export interface FactoryCluster {
  id: string;
  cluster: string;
  region: string;
  capacityPct: number;          // 0..130
  utilisationPct: number;       // current load
  shiftsRunning: number;        // 1..3
  status: 'nominal' | 'derated' | 'priority' | 'halted';
}

export interface IndustrialCommand {
  posture: IndustrialPosture;
  outputContinuityIdx: number;
  manufacturingCapacityPct: number;
  factoryNetworkUtilisationPct: number;
  strategicPrioritisationIdx: number;
  resiliencePostureIdx: number;
  supplyChainStabilisationIdx: number;
  clusters: FactoryCluster[];
}

// ── 2. Trade & export operations ────────────────────────────────────
export interface TradeCorridor {
  id: string;
  corridor: string;             // e.g. Eastern Maritime Corridor
  mode: 'maritime' | 'rail' | 'road' | 'air';
  partner: string;
  throughputIdx: number;
  clearanceDays: number;
  status: 'open' | 'restricted' | 'congested' | 'closed';
  tariffPressurePct: number;
}

// ── 3. Strategic production ─────────────────────────────────────────
export interface StrategicIndustry {
  id: string;
  industry: string;             // e.g. Pharmaceuticals
  domesticOutputPct: number;    // share met domestically
  reserveDays: number;          // strategic reserve days of cover
  allocationPriority: 'sovereign' | 'critical' | 'standard';
  rerouteActive: boolean;
  riskClass: 'stable' | 'pressured' | 'critical' | 'rationed';
}

// ── 4. Commercial infrastructure & business continuity ──────────────
export interface IndustrialDistrict {
  id: string;
  district: string;
  region: string;
  enterprisesActiveK: number;
  smeContinuityIdx: number;
  utilisationPct: number;
  pressureClass: 'stable' | 'monitor' | 'pressured' | 'distressed';
}

// ── 5. Supply chain & distribution intelligence ─────────────────────
export interface SupplyChain {
  id: string;
  chain: string;                // e.g. Steel & alloys
  inboundDaysCover: number;
  bottlenecks: number;
  upstreamSource: string;
  visibilityIdx: number;
  status: 'flowing' | 'thinning' | 'choked' | 'fractured';
}

// ── 6. Foreign trade & economic diplomacy ───────────────────────────
export interface TradeAgreement {
  id: string;
  partner: string;
  scope: 'bilateral' | 'regional-bloc' | 'sectoral' | 'mfn';
  status: 'in-force' | 'under-review' | 'suspended' | 'expired';
  yearsRemaining: number;
  exportShareIdx: number;
}

export interface ForeignTrade {
  agreements: TradeAgreement[];
  exportDependencies: { partner: string; sharePct: number; risk: 'low' | 'moderate' | 'concentration' }[];
  geopoliticalPressureIdx: number;
  sanctionsExposureIdx: number;
  strategicAlignmentIdx: number;
}

// ── 7. Industrial incidents & crisis recovery ───────────────────────
export type IndustrialIncidentKind =
  | 'factory-shutdown' | 'port-blockade' | 'export-sanction'
  | 'raw-material-shortage' | 'industrial-sabotage'
  | 'tariff-escalation' | 'strategic-shortage' | 'supply-chain-fracture';

export interface IndustrialIncident {
  id: string;
  kind: IndustrialIncidentKind;
  severity: 'advisory' | 'elevated' | 'critical' | 'national';
  origin: string;               // region or partner
  ageHours: number;
  outputLossPct: number;
  recoveryPathway: 'emergency-mobilisation' | 'alternative-routing' | 'strategic-reserve-draw' | 'partner-substitution';
  ministryCascade: { ministry: string; effect: string; delayHrs: number; status: 'pending' | 'engaged' | 'cleared' }[];
}

// ── 8. Economic intelligence & forecasting ──────────────────────────
export interface IndustrialForecast {
  horizonYears: number[];
  industrialOutputTrajectory: number[];
  exportCapacityTrajectory: number[];
  manufacturingCapacityTrajectory: number[];
  strategicAutonomyTrajectory: number[];
  industrialSurvivabilityIdx: number;
  generationalCompetitivenessIdx: number;
  systemicEconomicRisk: number;
}

export interface IndustrialContinuityBoard {
  epoch: number;
  command: IndustrialCommand;
  corridors: TradeCorridor[];
  strategicIndustries: StrategicIndustry[];
  districts: IndustrialDistrict[];
  supplyChains: SupplyChain[];
  foreign: ForeignTrade;
  incidents: IndustrialIncident[];
  forecast: IndustrialForecast;
  bannerLine: string;
  ministriesEngaged: { ministry: string; engaged: number }[];
}

const PROPAGATION: Record<IndustrialIncidentKind, { ministry: string; effect: string; delayHrs: number }[]> = {
  'factory-shutdown': [
    { ministry: 'Transport', effect: 'Cargo backlog at industrial corridors', delayHrs: 4 },
    { ministry: 'Treasury', effect: 'Export-revenue contraction projected', delayHrs: 24 },
    { ministry: 'Energy', effect: 'Load reallocation to alternate clusters', delayHrs: 6 },
    { ministry: 'Labor', effect: 'Workforce reassignment & relief activated', delayHrs: 12 },
    { ministry: 'Cabinet', effect: 'Continuity intervention reviewed', delayHrs: 48 },
  ],
  'port-blockade': [
    { ministry: 'Transport', effect: 'Maritime corridor rerouting initiated', delayHrs: 2 },
    { ministry: 'Foreign Affairs', effect: 'Bilateral channel engaged', delayHrs: 6 },
    { ministry: 'Treasury', effect: 'Trade-revenue exposure modelled', delayHrs: 12 },
    { ministry: 'Interior', effect: 'Port-security posture elevated', delayHrs: 4 },
  ],
  'export-sanction': [
    { ministry: 'Foreign Affairs', effect: 'Diplomatic counter-measures formulated', delayHrs: 6 },
    { ministry: 'Treasury', effect: 'Revenue substitution scenarios', delayHrs: 24 },
    { ministry: 'Cabinet', effect: 'Strategic-trade realignment review', delayHrs: 48 },
  ],
  'raw-material-shortage': [
    { ministry: 'Energy', effect: 'Industrial allocation rebalanced', delayHrs: 6 },
    { ministry: 'Agriculture', effect: 'Equipment-supply contingency engaged', delayHrs: 24 },
    { ministry: 'Transport', effect: 'Priority freight lanes opened', delayHrs: 12 },
  ],
  'industrial-sabotage': [
    { ministry: 'Interior', effect: 'Investigation & site security', delayHrs: 1 },
    { ministry: 'Cabinet', effect: 'National-security advisory issued', delayHrs: 12 },
    { ministry: 'Transport', effect: 'Logistics chain shielded', delayHrs: 6 },
  ],
  'tariff-escalation': [
    { ministry: 'Treasury', effect: 'Customs revenue scenarios refreshed', delayHrs: 12 },
    { ministry: 'Foreign Affairs', effect: 'Trade-diplomacy escalation', delayHrs: 24 },
  ],
  'strategic-shortage': [
    { ministry: 'Cabinet', effect: 'Strategic-reserve directive issued', delayHrs: 6 },
    { ministry: 'Health', effect: 'Critical-supply prioritisation', delayHrs: 12 },
    { ministry: 'Agriculture', effect: 'Substitute-input chains activated', delayHrs: 24 },
  ],
  'supply-chain-fracture': [
    { ministry: 'Transport', effect: 'Alternative routing engaged', delayHrs: 4 },
    { ministry: 'Treasury', effect: 'Import-substitution funding modelled', delayHrs: 24 },
    { ministry: 'Health', effect: 'Medical-supply chain assessed', delayHrs: 12 },
    { ministry: 'Agriculture', effect: 'Food-supply continuity assessed', delayHrs: 12 },
  ],
};

const KIND_LIST: IndustrialIncidentKind[] = [
  'factory-shutdown', 'port-blockade', 'export-sanction', 'raw-material-shortage',
  'industrial-sabotage', 'tariff-escalation', 'strategic-shortage', 'supply-chain-fracture',
];

const CLUSTER_DEFS: { cluster: string; region: string }[] = [
  { cluster: 'Capital Steel Works', region: 'Capital District' },
  { cluster: 'Northern Heavy Engineering', region: 'Northern' },
  { cluster: 'Eastern Electronics Park', region: 'Eastern' },
  { cluster: 'Coastal Refinery Complex', region: 'Coastal' },
  { cluster: 'Western Chemical Cluster', region: 'Western' },
  { cluster: 'Highland Precision Manufacturing', region: 'Highland' },
  { cluster: 'Eastern Pharma Corridor', region: 'Eastern' },
  { cluster: 'Coastal Shipbuilding Yard', region: 'Coastal' },
];

const CORRIDOR_DEFS: { corridor: string; mode: TradeCorridor['mode']; partner: string }[] = [
  { corridor: 'Eastern Maritime Corridor', mode: 'maritime', partner: 'Pacific Bloc' },
  { corridor: 'Northern Rail Spine', mode: 'rail', partner: 'Northern Federation' },
  { corridor: 'Coastal Container Gateway', mode: 'maritime', partner: 'Atlantic Union' },
  { corridor: 'Western Highway Trunk', mode: 'road', partner: 'Continental Market' },
  { corridor: 'Capital Air Freight', mode: 'air', partner: 'Global LCL' },
  { corridor: 'Highland Mineral Rail', mode: 'rail', partner: 'Resource Bloc' },
  { corridor: 'Southern Pharma Air Lane', mode: 'air', partner: 'Health Compact' },
  { corridor: 'Eastern Bulk Carrier Lane', mode: 'maritime', partner: 'Indo-Pacific Pact' },
];

const STRATEGIC_INDUSTRY_DEFS: { industry: string; allocationPriority: StrategicIndustry['allocationPriority'] }[] = [
  { industry: 'Steel & alloys', allocationPriority: 'sovereign' },
  { industry: 'Pharmaceuticals', allocationPriority: 'sovereign' },
  { industry: 'Semiconductors', allocationPriority: 'sovereign' },
  { industry: 'Fertilizer', allocationPriority: 'critical' },
  { industry: 'Refined fuels', allocationPriority: 'sovereign' },
  { industry: 'Heavy machinery', allocationPriority: 'critical' },
  { industry: 'Textiles', allocationPriority: 'standard' },
  { industry: 'Cement & construction', allocationPriority: 'critical' },
  { industry: 'Defense matériel', allocationPriority: 'sovereign' },
  { industry: 'Consumer electronics', allocationPriority: 'standard' },
];

const DISTRICT_DEFS: { district: string; region: string }[] = [
  { district: 'Capital Enterprise Zone', region: 'Capital District' },
  { district: 'Northern Industrial Belt', region: 'Northern' },
  { district: 'Eastern Innovation Park', region: 'Eastern' },
  { district: 'Coastal Free-Trade Zone', region: 'Coastal' },
  { district: 'Western SME Cluster', region: 'Western' },
  { district: 'Highland Heavy-Industry Belt', region: 'Highland' },
];

const SUPPLY_CHAIN_DEFS: { chain: string; upstreamSource: string }[] = [
  { chain: 'Steel & alloys', upstreamSource: 'Resource Bloc' },
  { chain: 'Petrochemicals', upstreamSource: 'Pacific Bloc' },
  { chain: 'Semiconductor wafers', upstreamSource: 'Indo-Pacific Pact' },
  { chain: 'Pharma APIs', upstreamSource: 'Health Compact' },
  { chain: 'Fertilizer feedstock', upstreamSource: 'Northern Federation' },
  { chain: 'Industrial bearings', upstreamSource: 'Continental Market' },
  { chain: 'Lithium & rare earths', upstreamSource: 'Resource Bloc' },
  { chain: 'Specialty chemicals', upstreamSource: 'Atlantic Union' },
];

const PARTNERS = ['Pacific Bloc', 'Northern Federation', 'Atlantic Union', 'Continental Market', 'Indo-Pacific Pact', 'Resource Bloc', 'Health Compact', 'Global LCL'];

export function industrialContinuityBoard(now: number): IndustrialContinuityBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;
  const o = tradeOps('national', ts);

  // 1. Industrial command — factory clusters
  const clusters: FactoryCluster[] = CLUSTER_DEFS.map((c, i) => {
    const k = `ic:fc:${c.cluster}`;
    const capacityPct = Math.round(wave(`${k}:cp`, epoch / 5, 64, 124));
    const utilisationPct = Math.round(wave(`${k}:ut`, epoch / 4, 38, capacityPct - 2));
    const shifts = 1 + Math.floor(seed(`${k}:sh:${Math.floor(epoch / 8)}`) * 3);
    const haltRoll = seed(`${k}:hr:${Math.floor(epoch / 7)}`);
    const status: FactoryCluster['status'] =
      haltRoll > 0.94 ? 'halted'
        : haltRoll > 0.84 ? 'priority'
          : utilisationPct < 50 ? 'derated' : 'nominal';
    return { id: `FC-${i + 1}`, cluster: c.cluster, region: c.region, capacityPct, utilisationPct, shiftsRunning: shifts, status };
  });
  const outputContinuityIdx = Math.round(clusters.reduce((s, c) => s + c.utilisationPct, 0) / clusters.length);
  const manufacturingCapacityPct = Math.round(clusters.reduce((s, c) => s + c.capacityPct, 0) / clusters.length);
  const factoryNetworkUtilisationPct = Math.round(clusters.filter(c => c.status === 'nominal' || c.status === 'priority').length * 100 / clusters.length);
  const strategicPrioritisationIdx = Math.round(wave(`ic:cmd:sp`, epoch / 7, 56, 92));
  const resiliencePostureIdx = Math.round(wave(`ic:cmd:rp`, epoch / 9, 48, 90));
  const supplyChainStabilisationIdx = Math.round(wave(`ic:cmd:ss`, epoch / 6, 44, 92));
  const haltedClusters = clusters.filter(c => c.status === 'halted').length;
  const posture: IndustrialPosture =
    haltedClusters >= 3 || outputContinuityIdx < 45 ? 'industrial-crisis'
      : haltedClusters >= 1 || outputContinuityIdx < 60 ? 'contraction'
        : outputContinuityIdx < 72 ? 'pressured'
          : outputContinuityIdx < 84 ? 'engaged' : 'productive';
  const command: IndustrialCommand = {
    posture, outputContinuityIdx, manufacturingCapacityPct, factoryNetworkUtilisationPct,
    strategicPrioritisationIdx, resiliencePostureIdx, supplyChainStabilisationIdx, clusters,
  };

  // 2. Trade corridors
  const corridors: TradeCorridor[] = CORRIDOR_DEFS.map((c, i) => {
    const k = `ic:co:${c.corridor}`;
    const throughputIdx = Math.round(wave(`${k}:th`, epoch / 4, 30, 96));
    const clearanceDays = Math.round(wave(`${k}:cl`, epoch / 5, 1, 18));
    const tariffPressurePct = Math.round(wave(`${k}:tp`, epoch / 8, 0, 28));
    const statusRoll = seed(`${k}:st:${Math.floor(epoch / 6)}`);
    const status: TradeCorridor['status'] =
      statusRoll > 0.94 ? 'closed'
        : statusRoll > 0.82 ? 'restricted'
          : clearanceDays >= 10 || throughputIdx < 50 ? 'congested' : 'open';
    return { id: `CR-${i + 1}`, corridor: c.corridor, mode: c.mode, partner: c.partner, throughputIdx, clearanceDays, status, tariffPressurePct };
  });

  // 3. Strategic industries
  const strategicIndustries: StrategicIndustry[] = STRATEGIC_INDUSTRY_DEFS.map((s, i) => {
    const k = `ic:si:${s.industry}`;
    const domesticOutputPct = Math.round(wave(`${k}:do`, epoch / 7, 30, 96));
    const reserveDays = Math.round(wave(`${k}:rd`, epoch / 9, 8, 220));
    const rerouteRoll = seed(`${k}:rr:${Math.floor(epoch / 5)}`);
    const riskClass: StrategicIndustry['riskClass'] =
      reserveDays < 14 ? 'rationed'
        : reserveDays < 30 || domesticOutputPct < 50 ? 'critical'
          : domesticOutputPct < 70 ? 'pressured' : 'stable';
    return {
      id: `SI-${i + 1}`, industry: s.industry, domesticOutputPct, reserveDays,
      allocationPriority: s.allocationPriority,
      rerouteActive: rerouteRoll > 0.78 || riskClass === 'rationed' || riskClass === 'critical',
      riskClass,
    };
  });

  // 4. Industrial districts
  const districts: IndustrialDistrict[] = DISTRICT_DEFS.map((d, i) => {
    const k = `ic:dt:${d.district}`;
    const enterprisesActiveK = Math.round(wave(`${k}:ea`, epoch / 6, 4, 64) * 10) / 10;
    const smeContinuityIdx = Math.round(wave(`${k}:sc`, epoch / 5, 48, 96));
    const utilisationPct = Math.round(wave(`${k}:ut`, epoch / 6, 50, 96));
    const pressureClass: IndustrialDistrict['pressureClass'] =
      smeContinuityIdx < 60 ? 'distressed'
        : smeContinuityIdx < 72 ? 'pressured'
          : smeContinuityIdx < 84 ? 'monitor' : 'stable';
    return { id: `DT-${i + 1}`, district: d.district, region: d.region, enterprisesActiveK, smeContinuityIdx, utilisationPct, pressureClass };
  });

  // 5. Supply chains
  const supplyChains: SupplyChain[] = SUPPLY_CHAIN_DEFS.map((s, i) => {
    const k = `ic:sc:${s.chain}`;
    const inboundDaysCover = Math.round(wave(`${k}:in`, epoch / 7, 4, 120));
    const bottlenecks = Math.floor(seed(`${k}:bn:${Math.floor(epoch / 6)}`) * 5);
    const visibilityIdx = Math.round(wave(`${k}:vi`, epoch / 6, 48, 96));
    const status: SupplyChain['status'] =
      inboundDaysCover < 7 || bottlenecks >= 3 ? 'fractured'
        : inboundDaysCover < 18 ? 'choked'
          : inboundDaysCover < 40 || bottlenecks >= 1 ? 'thinning' : 'flowing';
    return { id: `SC-${i + 1}`, chain: s.chain, inboundDaysCover, bottlenecks, upstreamSource: s.upstreamSource, visibilityIdx, status };
  });

  // 6. Foreign trade
  const agreements: TradeAgreement[] = PARTNERS.slice(0, 8).map((p, i) => {
    const k = `ic:ag:${p}`;
    const statusRoll = seed(`${k}:st:${Math.floor(epoch / 9)}`);
    const status: TradeAgreement['status'] =
      statusRoll > 0.94 ? 'expired'
        : statusRoll > 0.84 ? 'suspended'
          : statusRoll > 0.62 ? 'under-review' : 'in-force';
    const yearsRemaining = 1 + Math.floor(seed(`${k}:yr`) * 18);
    const exportShareIdx = Math.round(wave(`${k}:es`, epoch / 7, 4, 32));
    const scopeRoll = seed(`${k}:sc`);
    const scope: TradeAgreement['scope'] = scopeRoll > 0.78 ? 'sectoral' : scopeRoll > 0.46 ? 'regional-bloc' : scopeRoll > 0.18 ? 'bilateral' : 'mfn';
    return { id: `TA-${i + 1}`, partner: p, scope, status, yearsRemaining, exportShareIdx };
  });
  const exportDependencies = PARTNERS.slice(0, 5).map(p => {
    const k = `ic:dp:${p}`;
    const sharePct = Math.round(wave(`${k}:sh`, epoch / 8, 4, 28));
    const risk: 'low' | 'moderate' | 'concentration' = sharePct >= 22 ? 'concentration' : sharePct >= 14 ? 'moderate' : 'low';
    return { partner: p, sharePct, risk };
  }).sort((a, b) => b.sharePct - a.sharePct);
  const foreign: ForeignTrade = {
    agreements,
    exportDependencies,
    geopoliticalPressureIdx: Math.round(wave(`ic:ft:gp`, epoch / 5, 14, 84)),
    sanctionsExposureIdx: Math.round(wave(`ic:ft:se`, epoch / 7, 8, 72)),
    strategicAlignmentIdx: Math.round(wave(`ic:ft:sa`, epoch / 6, 44, 94)),
  };

  // 7. Industrial incidents
  const recoveries: IndustrialIncident['recoveryPathway'][] = ['emergency-mobilisation', 'alternative-routing', 'strategic-reserve-draw', 'partner-substitution'];
  const incidents: IndustrialIncident[] = Array.from({ length: 7 }, (_, i) => {
    const k = `ic:inc:${i}:${Math.floor(epoch / 4)}`;
    const kind = KIND_LIST[Math.floor(seed(`${k}:k`) * KIND_LIST.length)]!;
    const sevRoll = seed(`${k}:sv`);
    const severity: IndustrialIncident['severity'] = sevRoll > 0.92 ? 'national' : sevRoll > 0.76 ? 'critical' : sevRoll > 0.5 ? 'elevated' : 'advisory';
    const ageHours = Math.round(wave(`${k}:age`, epoch / 4, 1, 320));
    const outputLossPct = Math.round(wave(`${k}:ol`, epoch / 5, 4, 38));
    const cascade = (PROPAGATION[kind] ?? []).map(c => ({
      ...c,
      status: (ageHours < c.delayHrs ? 'pending' : ageHours > c.delayHrs * 6 ? 'cleared' : 'engaged') as 'pending' | 'engaged' | 'cleared',
    }));
    return {
      id: `ICI-${(7000 + Math.floor(seed(`${k}:id`) * 50000))}`,
      kind, severity,
      origin: kind === 'export-sanction' || kind === 'tariff-escalation' || kind === 'port-blockade'
        ? PARTNERS[Math.floor(seed(`${k}:or`) * PARTNERS.length)]!
        : REGIONS[Math.floor(seed(`${k}:or`) * REGIONS.length)]!,
      ageHours, outputLossPct,
      recoveryPathway: recoveries[Math.floor(seed(`${k}:rp`) * recoveries.length)]!,
      ministryCascade: cascade,
    };
  }).sort((a, b) => {
    const sev = (s: IndustrialIncident['severity']) => s === 'national' ? 3 : s === 'critical' ? 2 : s === 'elevated' ? 1 : 0;
    return sev(b.severity) - sev(a.severity) || b.outputLossPct - a.outputLossPct;
  });

  // 8. Forecast — 20 years at 5-year steps
  const horizon = [5, 10, 15, 20];
  const forecast: IndustrialForecast = {
    horizonYears: horizon,
    industrialOutputTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(outputContinuityIdx + wave(`ic:fc:io`, epoch / 5 + h * 0.13, -12, 10))))),
    exportCapacityTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(o.exports.valueIdx + wave(`ic:fc:ec`, epoch / 6 + h * 0.12, -14, 10))))),
    manufacturingCapacityTrajectory: horizon.map(h => Math.max(0, Math.min(160, Math.round(manufacturingCapacityPct + wave(`ic:fc:mc`, epoch / 7 + h * 0.14, -10, 12))))),
    strategicAutonomyTrajectory: horizon.map(h => Math.round(wave(`ic:fc:sa`, epoch / 5 + h * 0.15, 38, 92))),
    industrialSurvivabilityIdx: Math.round((outputContinuityIdx + resiliencePostureIdx + supplyChainStabilisationIdx) / 3),
    generationalCompetitivenessIdx: Math.round(wave(`ic:fc:gc`, epoch / 8, 48, 92)),
    systemicEconomicRisk: Math.min(100, Math.round(
      haltedClusters * 14
      + foreign.sanctionsExposureIdx * 0.3
      + foreign.geopoliticalPressureIdx * 0.2
      + (100 - resiliencePostureIdx) * 0.4
    )),
  };

  const banner =
    posture === 'industrial-crisis' ? 'NATIONAL INDUSTRIAL CRISIS — emergency mobilisation in effect'
      : posture === 'contraction' ? 'INDUSTRIAL CONTRACTION — output continuity engaged'
        : posture === 'pressured' ? 'INDUSTRIAL OUTPUT UNDER PRESSURE'
          : posture === 'engaged' ? 'INDUSTRIAL CONTINUITY ENGAGED' : 'INDUSTRIAL OUTPUT PRODUCTIVE';

  const ministries = new Map<string, number>();
  for (const inc of incidents) {
    for (const c of inc.ministryCascade) {
      if (c.status !== 'pending') ministries.set(c.ministry, (ministries.get(c.ministry) ?? 0) + 1);
    }
  }
  const ministriesEngaged = Array.from(ministries.entries())
    .map(([ministry, engaged]) => ({ ministry, engaged }))
    .sort((a, b) => b.engaged - a.engaged);

  return { epoch, command, corridors, strategicIndustries: strategicIndustries, districts, supplyChains, foreign, incidents, forecast, bannerLine: banner, ministriesEngaged };
}
