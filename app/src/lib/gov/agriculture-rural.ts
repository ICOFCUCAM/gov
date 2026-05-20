// lib/gov/agriculture-rural.ts
//
// Sovereign Agriculture extension — three operational layers
// complementing the core food-continuity / harvest / water / response
// stack: rural governance & community stability (cooperatives,
// subsidies, agricultural workforce, land management), long-horizon
// agricultural intelligence & forecasting (yield, trade exposure,
// sustainability), and the public agriculture portal (permits,
// subsidy applications, advisories, pest alerts, irrigation
// requests). Pure & deterministic; SSR-stable per operational epoch.

import { seed, wave } from '@/lib/telemetry';
import { agricultureOps } from '@/lib/gov/agriculture-systems';

export const AGRICULTURE_RURAL_SAFEGUARDS = {
  smallholderProtection: true as const,
  landTenureRights: true as const,
  cooperativeAutonomy: true as const,
  rightToFood: true as const,
  prohibited: [
    'forced-land-consolidation', 'subsidy-discrimination',
    'denial-of-rural-cooperative-autonomy', 'extraction-of-subsistence-yields',
    'suppression-of-pest-advisories', 'unlawful-land-titling',
  ] as const,
};

export const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];
const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

// ── A. Rural Governance & Community Stability ───────────────────────
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface RuralZone {
  id: string;
  region: string;
  population: number;
  farmingHouseholdsK: number;
  cooperativesActive: number;
  ruralStabilityIdx: number;
  outmigrationPressureIdx: number;
  classification: 'thriving' | 'stable' | 'pressured' | 'fragile' | 'distressed';
}

export interface SubsidyProgramme {
  id: string;
  programme: string;
  category: 'crop-input' | 'irrigation' | 'livestock' | 'cooperative-grant' | 'climate-adaptation' | 'youth-rural';
  beneficiariesK: number;
  disbursedBn: number;
  fulfilmentPct: number;        // % of approved subsidies actually disbursed
  status: 'open' | 'oversubscribed' | 'closed' | 'review';
}

export interface AgriWorkforce {
  totalAgricultureWorkforceK: number;
  womenInAgriculturePct: number;
  youthInAgriculturePct: number;
  meanAgeYears: number;
  trainedExtensionOfficersK: number;
  workforceShortagesIdx: number;
}

export interface LandRegistration {
  category: 'title-issuance' | 'tenancy-renewal' | 'subdivision' | 'cooperative-trust' | 'commons-registration';
  pending: number;
  registeredThisQ: number;
  medianProcessingDays: number;
  disputesOpen: number;
}

export interface RuralGovernance {
  zones: RuralZone[];
  subsidyProgrammes: SubsidyProgramme[];
  workforce: AgriWorkforce;
  landRegistrations: LandRegistration[];
  ruralContinuityIdx: number;
  cooperativeMembershipMillions: number;
}

// ── B. Agricultural Intelligence & Forecasting ──────────────────────
export interface YieldForecast {
  crop: 'cereals' | 'pulses' | 'oilseeds' | 'fruit-vegetable' | 'tubers' | 'industrial-cash';
  currentSeasonOutlook: 'strong' | 'on-target' | 'soft' | 'shortfall';
  productionTrajectoryMt: number[];     // 5-year horizon
  exportShareIdx: number;
  importDependencyPct: number;
  scarcityRiskIdx: number;
}

export interface TradeExposureLine {
  partner: string;
  tradeKind: 'export' | 'import';
  commodity: string;
  shareOfPartnerPct: number;
  vulnerabilityIdx: number;
}

export interface SustainabilityHorizon {
  horizonYears: number[];               // [5,10,15,20,25]
  soilHealthTrajectory: number[];
  freshwaterAvailabilityTrajectory: number[];
  biodiversityIntegrationTrajectory: number[];
  foodSelfSufficiencyTrajectory: number[];
  climateMigrationPressureTrajectory: number[];
  longHorizonResilienceIdx: number;
  systemicAgriRisk: number;
}

export interface AgriIntelligence {
  yieldForecasts: YieldForecast[];
  tradeExposure: TradeExposureLine[];
  sustainability: SustainabilityHorizon;
  aiReasoningCoveragePct: number;
  earlyWarningSignalsActive: number;
  scarcityProbability90dPct: number;
}

// ── C. Public Agriculture Portal ────────────────────────────────────
export interface AgriPermitFlow {
  category: 'farm-registration' | 'irrigation-water-right' | 'livestock-movement' | 'agro-chemical-use' | 'export-certification' | 'organic-certification';
  pending: number;
  approvedThisWeek: number;
  rejectedThisWeek: number;
  medianReviewDays: number;
}

export interface SubsidyApplication {
  id: string;
  category: SubsidyProgramme['category'];
  region: string;
  amountRequestedK: number;
  daysOpen: number;
  status: 'received' | 'verified' | 'approved' | 'rejected' | 'disbursed';
}

export interface ClimateAdvisory {
  id: string;
  region: string;
  kind: 'drought-watch' | 'frost-warning' | 'heatwave' | 'storm-advisory' | 'rainfall-deficit' | 'flood-risk';
  daysAhead: number;
  severity: 'advisory' | 'warning' | 'severe';
  cropsAtRisk: string;
}

export interface PestAlert {
  id: string;
  pest: 'locust' | 'army-worm' | 'rust' | 'aphid' | 'fungal-blight' | 'rodent';
  region: string;
  reportedHrsAgo: number;
  outbreakStatus: 'monitoring' | 'localized' | 'spreading' | 'epidemic';
  affectedAreaHa: number;
}

export interface IrrigationRequest {
  id: string;
  scheme: string;
  region: string;
  volumeMcm: number;            // requested million cubic metres
  filedDaysAgo: number;
  status: 'queued' | 'reviewing' | 'approved' | 'partial' | 'denied';
}

export interface PublicAgriPortal {
  permits: AgriPermitFlow[];
  subsidyApplications: SubsidyApplication[];
  climateAdvisories: ClimateAdvisory[];
  pestAlerts: PestAlert[];
  irrigationRequests: IrrigationRequest[];
  farmingSupportContactsDailyK: number;
  portalUptimePct: number;
  publicNoticesIssued24h: number;
}

export interface AgricultureRuralBoard {
  epoch: number;
  rural: RuralGovernance;
  intelligence: AgriIntelligence;
  portal: PublicAgriPortal;
  season: Season;
  prohibited: readonly string[];
}

const SUBSIDY_DEFS: { programme: string; category: SubsidyProgramme['category'] }[] = [
  { programme: 'Strategic seed & fertilizer support', category: 'crop-input' },
  { programme: 'Smallholder irrigation grant', category: 'irrigation' },
  { programme: 'Livestock vaccination & feed', category: 'livestock' },
  { programme: 'Cooperative formation grant', category: 'cooperative-grant' },
  { programme: 'Climate-resilient varietals incentive', category: 'climate-adaptation' },
  { programme: 'Youth-in-agriculture stipend', category: 'youth-rural' },
];

const LAND_CATEGORIES: LandRegistration['category'][] = ['title-issuance', 'tenancy-renewal', 'subdivision', 'cooperative-trust', 'commons-registration'];

const CROP_KINDS: YieldForecast['crop'][] = ['cereals', 'pulses', 'oilseeds', 'fruit-vegetable', 'tubers', 'industrial-cash'];
const COMMODITIES = ['Rice', 'Wheat', 'Maize', 'Pulses', 'Tea', 'Coffee', 'Cotton', 'Edible oils', 'Sugar'];
const TRADE_PARTNERS = ['Northern Federation', 'Pacific Realm', 'Atlantic Union', 'Continental Compact', 'Southern League', 'Indo-Maritime Pact', 'Equatorial Alliance'];

const PERMIT_CATEGORIES: AgriPermitFlow['category'][] = ['farm-registration', 'irrigation-water-right', 'livestock-movement', 'agro-chemical-use', 'export-certification', 'organic-certification'];
const ADVISORY_KINDS: ClimateAdvisory['kind'][] = ['drought-watch', 'frost-warning', 'heatwave', 'storm-advisory', 'rainfall-deficit', 'flood-risk'];
const PEST_KINDS: PestAlert['pest'][] = ['locust', 'army-worm', 'rust', 'aphid', 'fungal-blight', 'rodent'];

function deriveSeason(epoch: number): Season {
  return SEASONS[Math.floor(epoch / 16) % 4]!;
}

export function agricultureRuralBoard(now: number): AgricultureRuralBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;
  const ag = agricultureOps('national', ts);
  void ag;
  const season = deriveSeason(epoch);

  // ── A. Rural Governance ───────────────────────────────────────────
  const zones: RuralZone[] = REGIONS.map(region => {
    const k = `ar:zn:${region}`;
    const population = Math.round(wave(`${k}:p`, epoch / 8, 280000, 5400000));
    const farmingHouseholdsK = Math.round(wave(`${k}:fh`, epoch / 7, 28, 680));
    const cooperativesActive = Math.round(wave(`${k}:co`, epoch / 6, 12, 480));
    const ruralStabilityIdx = Math.round(wave(`${k}:rs`, epoch / 6, 38, 92));
    const outmigrationPressureIdx = Math.round(wave(`${k}:om`, epoch / 5, 12, 78));
    const composite = ruralStabilityIdx - outmigrationPressureIdx * 0.5;
    const classification: RuralZone['classification'] =
      composite >= 72 ? 'thriving'
        : composite >= 58 ? 'stable'
          : composite >= 40 ? 'pressured'
            : composite >= 22 ? 'fragile' : 'distressed';
    return { id: `RZ-${region}`, region, population, farmingHouseholdsK, cooperativesActive, ruralStabilityIdx, outmigrationPressureIdx, classification };
  });

  const subsidyProgrammes: SubsidyProgramme[] = SUBSIDY_DEFS.map((s, i) => {
    const k = `ar:sb:${s.programme}`;
    const beneficiariesK = Math.round(wave(`${k}:b`, epoch / 5, 8, 1200));
    const disbursedBn = Math.round(wave(`${k}:d`, epoch / 6, 0.2, 18) * 10) / 10;
    const fulfilmentPct = Math.round(wave(`${k}:f`, epoch / 4, 38, 96));
    const statusRoll = seed(`${k}:st:${Math.floor(epoch / 6)}`);
    const status: SubsidyProgramme['status'] =
      fulfilmentPct < 50 ? 'review'
        : statusRoll > 0.88 ? 'closed'
          : statusRoll > 0.62 ? 'oversubscribed' : 'open';
    return { id: `SP-${i + 1}`, programme: s.programme, category: s.category, beneficiariesK, disbursedBn, fulfilmentPct, status };
  });

  const workforce: AgriWorkforce = {
    totalAgricultureWorkforceK: Math.round(wave(`ar:wf:t`, epoch / 8, 1200, 8800)),
    womenInAgriculturePct: Math.round(wave(`ar:wf:w`, epoch / 7, 30, 58)),
    youthInAgriculturePct: Math.round(wave(`ar:wf:y`, epoch / 6, 8, 32)),
    meanAgeYears: Math.round(wave(`ar:wf:a`, epoch / 9, 38, 56)),
    trainedExtensionOfficersK: Math.round(wave(`ar:wf:e`, epoch / 7, 4, 86)),
    workforceShortagesIdx: Math.round(wave(`ar:wf:s`, epoch / 5, 22, 78)),
  };

  const landRegistrations: LandRegistration[] = LAND_CATEGORIES.map(category => {
    const k = `ar:lr:${category}`;
    return {
      category,
      pending: Math.round(wave(`${k}:p`, epoch / 4, 800, 38000)),
      registeredThisQ: Math.round(wave(`${k}:r`, epoch / 4, 200, 9800)),
      medianProcessingDays: Math.round(wave(`${k}:m`, epoch / 6, 14, 240)),
      disputesOpen: Math.round(wave(`${k}:d`, epoch / 5, 4, 380)),
    };
  });

  const rural: RuralGovernance = {
    zones, subsidyProgrammes, workforce, landRegistrations,
    ruralContinuityIdx: Math.round(zones.reduce((s, z) => s + z.ruralStabilityIdx, 0) / zones.length),
    cooperativeMembershipMillions: Math.round(wave(`ar:cm:m`, epoch / 7, 0.8, 8.4) * 10) / 10,
  };

  // ── B. Intelligence ───────────────────────────────────────────────
  const yieldForecasts: YieldForecast[] = CROP_KINDS.map(crop => {
    const k = `ar:yf:${crop}`;
    const baseMt = wave(`${k}:base`, epoch / 8, 200, 4800);
    const productionTrajectoryMt = [5, 10, 15, 20, 25].map(h =>
      Math.max(0, Math.round(baseMt + wave(`${k}:tr:${h}`, epoch / 6 + h * 0.13, -800, 600))));
    const seasonOutlookRoll = seed(`${k}:os:${Math.floor(epoch / 6)}`);
    const currentSeasonOutlook: YieldForecast['currentSeasonOutlook'] =
      seasonOutlookRoll > 0.88 ? 'strong'
        : seasonOutlookRoll > 0.62 ? 'on-target'
          : seasonOutlookRoll > 0.32 ? 'soft' : 'shortfall';
    const exportShareIdx = Math.round(wave(`${k}:ex`, epoch / 7, 4, 48));
    const importDependencyPct = Math.round(wave(`${k}:im`, epoch / 8, 0, 68));
    const scarcityRiskIdx = Math.round(wave(`${k}:sc`, epoch / 5, 6, 78));
    return { crop, currentSeasonOutlook, productionTrajectoryMt, exportShareIdx, importDependencyPct, scarcityRiskIdx };
  }).sort((a, b) => b.scarcityRiskIdx - a.scarcityRiskIdx);

  const tradeExposure: TradeExposureLine[] = Array.from({ length: 10 }, (_, i) => {
    const k = `ar:te:${i}`;
    const partner = TRADE_PARTNERS[Math.floor(seed(`${k}:p`) * TRADE_PARTNERS.length)]!;
    const tradeKind: 'export' | 'import' = seed(`${k}:k`) > 0.5 ? 'export' : 'import';
    const commodity = COMMODITIES[Math.floor(seed(`${k}:c`) * COMMODITIES.length)]!;
    const shareOfPartnerPct = Math.round(wave(`${k}:s`, epoch / 6, 4, 38));
    const vulnerabilityIdx = Math.round(wave(`${k}:v`, epoch / 5, 8, 88));
    return { partner, tradeKind, commodity, shareOfPartnerPct, vulnerabilityIdx };
  }).sort((a, b) => b.vulnerabilityIdx - a.vulnerabilityIdx);

  const horizon = [5, 10, 15, 20, 25];
  const sustainability: SustainabilityHorizon = {
    horizonYears: horizon,
    soilHealthTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`ar:su:so`, epoch / 7 + h * 0.13, 40, 86))))),
    freshwaterAvailabilityTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`ar:su:fw`, epoch / 6 + h * 0.14, 36, 84))))),
    biodiversityIntegrationTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`ar:su:bi`, epoch / 7 + h * 0.15, 38, 88))))),
    foodSelfSufficiencyTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`ar:su:fs`, epoch / 6 + h * 0.13, 42, 92))))),
    climateMigrationPressureTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`ar:su:mg`, epoch / 5 + h * 0.16, 12, 74))))),
    longHorizonResilienceIdx: Math.round(wave(`ar:su:lh`, epoch / 9, 48, 92)),
    systemicAgriRisk: Math.round(wave(`ar:su:sr`, epoch / 6, 14, 78)),
  };

  const intelligence: AgriIntelligence = {
    yieldForecasts, tradeExposure, sustainability,
    aiReasoningCoveragePct: Math.round(wave(`ar:in:ai`, epoch / 8, 38, 88)),
    earlyWarningSignalsActive: Math.round(wave(`ar:in:ew`, epoch / 4, 0, 14)),
    scarcityProbability90dPct: Math.round(wave(`ar:in:sc`, epoch / 5, 4, 62)),
  };

  // ── C. Public portal ──────────────────────────────────────────────
  const permits: AgriPermitFlow[] = PERMIT_CATEGORIES.map(category => {
    const k = `ar:pm:${category}`;
    return {
      category,
      pending: Math.round(wave(`${k}:p`, epoch / 4, 200, 12800)),
      approvedThisWeek: Math.round(wave(`${k}:a`, epoch / 3, 60, 4800)),
      rejectedThisWeek: Math.round(wave(`${k}:r`, epoch / 4, 4, 320)),
      medianReviewDays: Math.round(wave(`${k}:m`, epoch / 5, 4, 84)),
    };
  });

  const subsidyApplications: SubsidyApplication[] = Array.from({ length: 8 }, (_, i) => {
    const k = `ar:sa:${i}:${Math.floor(epoch / 4)}`;
    const category = SUBSIDY_DEFS[Math.floor(seed(`${k}:c`) * SUBSIDY_DEFS.length)]!.category;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const amountRequestedK = Math.round(wave(`${k}:am`, epoch / 4, 1, 480) * 10) / 10;
    const daysOpen = Math.round(wave(`${k}:do`, epoch / 4, 1, 96));
    const statusRoll = seed(`${k}:st`);
    const status: SubsidyApplication['status'] =
      daysOpen > 60 ? 'disbursed'
        : daysOpen > 30 ? 'approved'
          : daysOpen > 14 ? 'verified'
            : statusRoll > 0.92 ? 'rejected' : 'received';
    return { id: `SA-${(16000 + Math.floor(seed(`${k}:id`) * 60000))}`, category, region, amountRequestedK, daysOpen, status };
  }).sort((a, b) => a.daysOpen - b.daysOpen);

  const climateAdvisories: ClimateAdvisory[] = Array.from({ length: 6 }, (_, i) => {
    const k = `ar:ca:${i}:${Math.floor(epoch / 4)}`;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const kind = ADVISORY_KINDS[Math.floor(seed(`${k}:k`) * ADVISORY_KINDS.length)]!;
    const daysAhead = Math.round(wave(`${k}:d`, epoch / 4, 1, 21));
    const sevRoll = seed(`${k}:sv`);
    const severity: ClimateAdvisory['severity'] = sevRoll > 0.85 ? 'severe' : sevRoll > 0.55 ? 'warning' : 'advisory';
    const cropsAtRisk = COMMODITIES[Math.floor(seed(`${k}:c`) * COMMODITIES.length)]!;
    return { id: `CA-${i + 1}`, region, kind, daysAhead, severity, cropsAtRisk };
  });

  const pestAlerts: PestAlert[] = Array.from({ length: 6 }, (_, i) => {
    const k = `ar:pa:${i}:${Math.floor(epoch / 4)}`;
    const pest = PEST_KINDS[Math.floor(seed(`${k}:k`) * PEST_KINDS.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const reportedHrsAgo = Math.round(wave(`${k}:h`, epoch / 4, 1, 168));
    const affectedAreaHa = Math.round(wave(`${k}:a`, epoch / 4, 80, 84000));
    const outbreakStatus: PestAlert['outbreakStatus'] =
      affectedAreaHa > 40000 ? 'epidemic'
        : affectedAreaHa > 12000 ? 'spreading'
          : affectedAreaHa > 2000 ? 'localized' : 'monitoring';
    return { id: `PA-${i + 1}`, pest, region, reportedHrsAgo, outbreakStatus, affectedAreaHa };
  }).sort((a, b) => b.affectedAreaHa - a.affectedAreaHa);

  const irrigationRequests: IrrigationRequest[] = Array.from({ length: 7 }, (_, i) => {
    const k = `ar:ir:${i}:${Math.floor(epoch / 4)}`;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const scheme = ['Eastern Confluence Scheme', 'Northern Spring Network', 'Coastal Delta Lift', 'Highland Channel', 'Capital Catchment'][Math.floor(seed(`${k}:s`) * 5)]!;
    const volumeMcm = Math.round(wave(`${k}:v`, epoch / 5, 0.4, 84) * 10) / 10;
    const filedDaysAgo = Math.round(wave(`${k}:d`, epoch / 4, 1, 60));
    const statusRoll = seed(`${k}:st`);
    const status: IrrigationRequest['status'] =
      filedDaysAgo > 30 ? (statusRoll > 0.3 ? 'approved' : 'partial')
        : filedDaysAgo > 14 ? 'reviewing'
          : statusRoll > 0.92 ? 'denied' : 'queued';
    return { id: `IR-${i + 1}`, scheme, region, volumeMcm, filedDaysAgo, status };
  });

  const portal: PublicAgriPortal = {
    permits, subsidyApplications, climateAdvisories, pestAlerts, irrigationRequests,
    farmingSupportContactsDailyK: Math.round(wave(`ar:po:fc`, epoch / 4, 1.2, 48) * 10) / 10,
    portalUptimePct: Math.round(wave(`ar:po:up`, epoch / 4, 94, 99.9) * 10) / 10,
    publicNoticesIssued24h: Math.round(wave(`ar:po:pn`, epoch / 4, 4, 180)),
  };

  return {
    epoch, rural, intelligence, portal, season,
    prohibited: AGRICULTURE_RURAL_SAFEGUARDS.prohibited,
  };
}
