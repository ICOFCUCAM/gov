// lib/gov/climate-resilience.ts
//
// Sovereign Environment & Climate Resilience engine. National climate
// resilience command, biosphere restoration & biodiversity, atmospheric
// & weather systems, water & oceanic continuity, pollution &
// environmental compliance, climate emergency & disaster coordination
// and 25-year planetary intelligence — one connected deterministic
// runtime. Cross-ministry cascade carries every ecological event
// through Agriculture / Energy / Health / Transport / Interior /
// Treasury / Foreign Affairs / Cabinet / National Coordination.
// Pure & deterministic; SSR-stable per operational epoch.

import { seed, wave } from '@/lib/telemetry';
import { environmentOps } from '@/lib/gov/environment-systems';

export const CLIMATE_RESILIENCE_SAFEGUARDS = {
  humanitarianDoctrine: true as const,
  intergenerationalContinuity: true as const,
  nonExploitative: true as const,
  lawfulEnforcementOnly: true as const,
  prohibited: [
    'ecological-exploitation', 'discriminatory-displacement',
    'climate-data-suppression', 'coercive-restoration-without-consent',
    'unlawful-extraterritorial-resource-claim', 'non-consensual-ecological-data-aggregation',
  ] as const,
};

export type ClimatePosture =
  | 'stable' | 'observant' | 'engaged' | 'stressed' | 'crisis-coordination';

export const ECOREGIONS = ['Boreal Belt', 'Temperate Plateau', 'Coastal Shelf', 'Highland Watershed', 'Equatorial Basin', 'Polar Frontier'] as const;
export type Ecoregion = (typeof ECOREGIONS)[number];

// ── 1. Climate command ──────────────────────────────────────────────
export interface EcoregionStress {
  ecoregion: Ecoregion;
  thermalStressIdx: number;        // 0..100
  hydroStressIdx: number;
  biodiversityPressureIdx: number;
  pollutionPressureIdx: number;
  compositeStress: number;
  classification: 'stable' | 'observant' | 'stressed' | 'critical' | 'tipping';
}

export interface ClimateCommand {
  posture: ClimatePosture;
  climateRiskPostureIdx: number;      // 0..100 (lower = worse)
  adaptationReadinessIdx: number;
  ecologicalContinuityIdx: number;
  civilizationalSurvivabilityIdx: number;
  ecoregions: EcoregionStress[];
}

// ── 2. Biosphere & biodiversity ─────────────────────────────────────
export interface ProtectedRegion {
  id: string;
  region: string;
  ecoregion: Ecoregion;
  hectaresK: number;             // protected area in K hectares
  integrityPct: number;
  speciesUnderProtection: number;
  rangerCoverage: number;        // 0..100
  status: 'intact' | 'monitored' | 'pressured' | 'degrading';
}

export interface BiosphereRestoration {
  forestCoverPct: number;
  biodiversityIdx: number;
  endangeredSpecies: number;
  restorationCorridorsActiveK: number;   // K hectares under active restoration
  reforestationRatePctYr: number;
  habitatLossYrPct: number;
  protectedRegions: ProtectedRegion[];
}

// ── 3. Atmosphere & weather ─────────────────────────────────────────
export type WeatherEventKind = 'heatwave' | 'cold-snap' | 'severe-storm' | 'wind-event' | 'air-quality-spike' | 'pollen-surge';

export interface AtmosphericEvent {
  id: string;
  kind: WeatherEventKind;
  region: string;
  severity: 'advisory' | 'watch' | 'warning' | 'emergency';
  startedHrsAgo: number;
  populationExposedK: number;
}

export interface AtmosphericSystems {
  airQualityIndex: number;       // higher = worse
  meanTemperatureAnomalyC: number; // ±
  precipitationAnomalyPct: number; // ±
  monitoringOnlinePct: number;
  anomaliesDetected: number;
  activeEvents: AtmosphericEvent[];
}

// ── 4. Water & oceanic continuity ───────────────────────────────────
export interface RiverBasin {
  id: string;
  basin: string;
  flowIdx: number;             // 0..100 of normal
  contaminationIdx: number;    // 0..100 higher = worse
  status: 'healthy' | 'thinning' | 'stressed' | 'contaminated';
}

export interface OceanicReadout {
  coastalResilienceIdx: number;
  seaLevelRiseMmYr: number;
  marineEcosystemIdx: number;
  bleachingEventsActive: number;
  floodplainExposurePct: number;
}

// ── 5. Pollution & compliance ───────────────────────────────────────
export interface PollutionRegister {
  emissionsVsTargetPct: number;   // 100 = on target
  airViolationsActive: number;
  waterViolationsActive: number;
  hazardousMaterialIncidents: number;
  enforcementActions: number;
  complianceIdx: number;
  topEmitters: { sector: string; sharePct: number; tone: 'ok' | 'warn' | 'alert' }[];
}

// ── 6. Climate emergencies ──────────────────────────────────────────
export type ClimateIncidentKind =
  | 'wildfire' | 'flood' | 'drought' | 'heatwave-emergency'
  | 'coastal-surge' | 'toxic-contamination' | 'air-quality-crisis'
  | 'biodiversity-collapse';

export interface ClimateIncident {
  id: string;
  kind: ClimateIncidentKind;
  severity: 'advisory' | 'elevated' | 'critical' | 'national';
  region: string;
  ecoregion: Ecoregion;
  ageHours: number;
  populationExposedK: number;
  hectaresAffectedK: number;
  recoveryPathway: 'emergency-response' | 'evacuation-relief' | 'remediation' | 'restoration';
  ministryCascade: { ministry: string; effect: string; delayHrs: number; status: 'pending' | 'engaged' | 'cleared' }[];
}

// ── 7. Forecast (25-year horizon) ───────────────────────────────────
export interface ClimateForecast {
  horizonYears: number[];                 // 5,10,15,20,25
  temperatureAnomalyTrajectory: number[]; // °C
  biodiversityTrajectory: number[];
  forestCoverTrajectory: number[];
  waterStressTrajectory: number[];        // higher = worse
  carbonContinuityTrajectory: number[];
  planetaryResilienceIdx: number;
  ecosystemCollapseRisk: number;
  intergenerationalContinuityIdx: number;
}

export interface ClimateResilienceBoard {
  epoch: number;
  command: ClimateCommand;
  biosphere: BiosphereRestoration;
  atmosphere: AtmosphericSystems;
  rivers: RiverBasin[];
  ocean: OceanicReadout;
  pollution: PollutionRegister;
  incidents: ClimateIncident[];
  forecast: ClimateForecast;
  bannerLine: string;
  ministriesEngaged: { ministry: string; engaged: number }[];
  prohibited: readonly string[];
}

const PROPAGATION: Record<ClimateIncidentKind, { ministry: string; effect: string; delayHrs: number }[]> = {
  wildfire: [
    { ministry: 'Interior', effect: 'Evacuation & fire-services coordination', delayHrs: 1 },
    { ministry: 'Health', effect: 'Respiratory care surge engaged', delayHrs: 6 },
    { ministry: 'Agriculture', effect: 'Crop & livestock-loss assessment', delayHrs: 24 },
    { ministry: 'Transport', effect: 'Road & rail closures', delayHrs: 2 },
    { ministry: 'Cabinet', effect: 'Climate-emergency review', delayHrs: 24 },
  ],
  flood: [
    { ministry: 'Transport', effect: 'Corridor & bridge integrity assessment', delayHrs: 2 },
    { ministry: 'Agriculture', effect: 'Yield-loss & livestock assessment', delayHrs: 12 },
    { ministry: 'Health', effect: 'Water-borne illness response', delayHrs: 6 },
    { ministry: 'Interior', effect: 'Displacement & shelter coordination', delayHrs: 4 },
    { ministry: 'Treasury', effect: 'Emergency-relief disbursement', delayHrs: 24 },
    { ministry: 'Cabinet', effect: 'Continuity advisory', delayHrs: 48 },
  ],
  drought: [
    { ministry: 'Agriculture', effect: 'Irrigation contingency & crop rerouting', delayHrs: 24 },
    { ministry: 'Energy', effect: 'Hydroelectric capacity rebalancing', delayHrs: 48 },
    { ministry: 'Health', effect: 'Public-water access protocol', delayHrs: 24 },
    { ministry: 'Treasury', effect: 'Drought-relief disbursement', delayHrs: 72 },
  ],
  'heatwave-emergency': [
    { ministry: 'Energy', effect: 'Peak-load grid stress mitigation', delayHrs: 2 },
    { ministry: 'Health', effect: 'Heat-illness surge & cooling centres', delayHrs: 4 },
    { ministry: 'Agriculture', effect: 'Heat-stress crop & livestock advisories', delayHrs: 12 },
    { ministry: 'Interior', effect: 'Vulnerable-population outreach', delayHrs: 6 },
    { ministry: 'Cabinet', effect: 'Climate-continuity review', delayHrs: 24 },
  ],
  'coastal-surge': [
    { ministry: 'Transport', effect: 'Port & coastal-road closures', delayHrs: 2 },
    { ministry: 'Interior', effect: 'Coastal-area evacuation', delayHrs: 4 },
    { ministry: 'Treasury', effect: 'Coastal-asset exposure modelled', delayHrs: 12 },
    { ministry: 'Trade & Industry', effect: 'Maritime corridor & industrial-port impact', delayHrs: 6 },
  ],
  'toxic-contamination': [
    { ministry: 'Health', effect: 'Exposure-monitoring & care protocol', delayHrs: 4 },
    { ministry: 'Agriculture', effect: 'Soil & water contamination assessment', delayHrs: 12 },
    { ministry: 'Interior', effect: 'Site cordon & cleanup oversight', delayHrs: 6 },
    { ministry: 'Treasury', effect: 'Remediation funding pathway', delayHrs: 48 },
  ],
  'air-quality-crisis': [
    { ministry: 'Health', effect: 'Respiratory surge & vulnerable advisories', delayHrs: 4 },
    { ministry: 'Education', effect: 'School closures & remote-learning protocol', delayHrs: 6 },
    { ministry: 'Transport', effect: 'Vehicle-restriction protocol', delayHrs: 6 },
    { ministry: 'Cabinet', effect: 'Air-quality emergency review', delayHrs: 24 },
  ],
  'biodiversity-collapse': [
    { ministry: 'Agriculture', effect: 'Pollinator & ecosystem-service review', delayHrs: 48 },
    { ministry: 'Cabinet', effect: 'Intergenerational-continuity review', delayHrs: 72 },
    { ministry: 'National Coordination', effect: 'Cross-ministry biosphere protocol', delayHrs: 72 },
  ],
};

const KIND_LIST: ClimateIncidentKind[] = [
  'wildfire', 'flood', 'drought', 'heatwave-emergency',
  'coastal-surge', 'toxic-contamination', 'air-quality-crisis', 'biodiversity-collapse',
];

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

const PROTECTED_DEFS: { region: string; ecoregion: Ecoregion }[] = [
  { region: 'Northern Boreal Reserve', ecoregion: 'Boreal Belt' },
  { region: 'Eastern Highland Reserve', ecoregion: 'Highland Watershed' },
  { region: 'Coastal Marine Sanctuary', ecoregion: 'Coastal Shelf' },
  { region: 'Western Wetlands Park', ecoregion: 'Temperate Plateau' },
  { region: 'Highland Cloud-Forest', ecoregion: 'Highland Watershed' },
  { region: 'Polar Glacier Reserve', ecoregion: 'Polar Frontier' },
];

const RIVER_DEFS = ['Aurine River Basin', 'Eastern Confluence', 'Coastal Delta System', 'Northern Spring Network', 'Highland Tributary Basin'];

const EMITTER_SECTORS = ['Heavy industry', 'Transport', 'Energy generation', 'Residential', 'Agriculture'];

export function climateResilienceBoard(now: number): ClimateResilienceBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;
  const e = environmentOps('national', ts);

  // 1. Ecoregion stress + climate command
  const ecoregions: EcoregionStress[] = ECOREGIONS.map(ecoregion => {
    const k = `cr:er:${ecoregion}`;
    const thermalStressIdx = Math.round(wave(`${k}:th`, epoch / 6, 14, 84));
    const hydroStressIdx = Math.round(wave(`${k}:hy`, epoch / 5, 18, 86));
    const biodiversityPressureIdx = Math.round(wave(`${k}:bi`, epoch / 8, 12, 78));
    const pollutionPressureIdx = Math.round(wave(`${k}:pl`, epoch / 7, 12, 76));
    const compositeStress = Math.round((thermalStressIdx + hydroStressIdx + biodiversityPressureIdx + pollutionPressureIdx) / 4);
    const classification: EcoregionStress['classification'] =
      compositeStress >= 72 ? 'tipping'
        : compositeStress >= 58 ? 'critical'
          : compositeStress >= 42 ? 'stressed'
            : compositeStress >= 28 ? 'observant' : 'stable';
    return { ecoregion, thermalStressIdx, hydroStressIdx, biodiversityPressureIdx, pollutionPressureIdx, compositeStress, classification };
  });
  const tipping = ecoregions.filter(x => x.classification === 'tipping').length;
  const critical = ecoregions.filter(x => x.classification === 'critical').length;
  const climateRiskPostureIdx = Math.round(wave(`cr:cmd:rp`, epoch / 7, 36, 92));
  const adaptationReadinessIdx = Math.round(wave(`cr:cmd:ar`, epoch / 6, 38, 90));
  const ecologicalContinuityIdx = Math.round(wave(`cr:cmd:ec`, epoch / 8, 42, 92));
  const civilizationalSurvivabilityIdx = Math.round((climateRiskPostureIdx + adaptationReadinessIdx + ecologicalContinuityIdx) / 3);
  const posture: ClimatePosture =
    tipping >= 1 || climateRiskPostureIdx < 45 ? 'crisis-coordination'
      : critical >= 2 || climateRiskPostureIdx < 60 ? 'stressed'
        : critical >= 1 || climateRiskPostureIdx < 72 ? 'engaged'
          : climateRiskPostureIdx < 84 ? 'observant' : 'stable';
  const command: ClimateCommand = {
    posture, climateRiskPostureIdx, adaptationReadinessIdx, ecologicalContinuityIdx, civilizationalSurvivabilityIdx, ecoregions,
  };

  // 2. Biosphere
  const protectedRegions: ProtectedRegion[] = PROTECTED_DEFS.map((p, i) => {
    const k = `cr:pr:${p.region}`;
    const hectaresK = 40 + Math.floor(seed(`${k}:h`) * 4000);
    const integrityPct = Math.round(wave(`${k}:i`, epoch / 6, 52, 96));
    const speciesUnderProtection = 80 + Math.floor(seed(`${k}:sp`) * 920);
    const rangerCoverage = Math.round(wave(`${k}:rc`, epoch / 5, 38, 96));
    const status: ProtectedRegion['status'] =
      integrityPct < 60 || rangerCoverage < 50 ? 'degrading'
        : integrityPct < 75 ? 'pressured'
          : integrityPct < 88 ? 'monitored' : 'intact';
    return { id: `PR-${i + 1}`, region: p.region, ecoregion: p.ecoregion, hectaresK, integrityPct, speciesUnderProtection, rangerCoverage, status };
  });
  const biosphere: BiosphereRestoration = {
    forestCoverPct: Math.round(wave(`cr:bs:fc`, epoch / 8, 32, 64)),
    biodiversityIdx: Math.round(wave(`cr:bs:bi`, epoch / 7, 40, 88)),
    endangeredSpecies: Math.round(wave(`cr:bs:es`, epoch / 6, 120, 920)),
    restorationCorridorsActiveK: Math.round(wave(`cr:bs:rc`, epoch / 5, 40, 380) * 10) / 10,
    reforestationRatePctYr: Math.round(wave(`cr:bs:rr`, epoch / 7, 0, 32) * 10) / 10,
    habitatLossYrPct: Math.round(wave(`cr:bs:hl`, epoch / 6, 0, 28) * 10) / 10,
    protectedRegions,
  };

  // 3. Atmosphere
  const eventKinds: WeatherEventKind[] = ['heatwave', 'cold-snap', 'severe-storm', 'wind-event', 'air-quality-spike', 'pollen-surge'];
  const activeEvents: AtmosphericEvent[] = Array.from({ length: 5 }, (_, i) => {
    const k = `cr:aw:${i}:${Math.floor(epoch / 4)}`;
    const kind = eventKinds[Math.floor(seed(`${k}:k`) * eventKinds.length)]!;
    const sevRoll = seed(`${k}:sv`);
    const severity: AtmosphericEvent['severity'] = sevRoll > 0.92 ? 'emergency' : sevRoll > 0.74 ? 'warning' : sevRoll > 0.5 ? 'watch' : 'advisory';
    const region = REGIONS[Math.floor(seed(`${k}:rg`) * REGIONS.length)]!;
    const startedHrsAgo = Math.round(wave(`${k}:ag`, epoch / 4, 1, 96));
    const populationExposedK = Math.round(wave(`${k}:pp`, epoch / 5, 6, 2400));
    return { id: `AE-${i + 1}`, kind, region, severity, startedHrsAgo, populationExposedK };
  });
  const atmosphere: AtmosphericSystems = {
    airQualityIndex: e.airQualityIndex,
    meanTemperatureAnomalyC: Math.round((wave(`cr:at:tm`, epoch / 6, -1.4, 3.8)) * 10) / 10,
    precipitationAnomalyPct: Math.round(wave(`cr:at:pa`, epoch / 5, -28, 36)),
    monitoringOnlinePct: Math.round((e.monitoringOnline / Math.max(1, e.monitoringTotal)) * 100),
    anomaliesDetected: Math.floor(seed(`cr:at:an:${Math.floor(epoch / 5)}`) * 7),
    activeEvents,
  };

  // 4. Rivers & oceanic
  const rivers: RiverBasin[] = RIVER_DEFS.map((basin, i) => {
    const k = `cr:rv:${basin}`;
    const flowIdx = Math.round(wave(`${k}:fl`, epoch / 5, 34, 116));
    const contaminationIdx = Math.round(wave(`${k}:cn`, epoch / 6, 4, 72));
    const status: RiverBasin['status'] =
      contaminationIdx >= 50 ? 'contaminated'
        : flowIdx < 50 ? 'stressed'
          : flowIdx < 75 ? 'thinning' : 'healthy';
    return { id: `RB-${i + 1}`, basin, flowIdx, contaminationIdx, status };
  });
  const ocean: OceanicReadout = {
    coastalResilienceIdx: Math.round(wave(`cr:oc:cr`, epoch / 6, 40, 92)),
    seaLevelRiseMmYr: Math.round(wave(`cr:oc:sl`, epoch / 8, 2, 8.5) * 10) / 10,
    marineEcosystemIdx: Math.round(wave(`cr:oc:me`, epoch / 7, 38, 88)),
    bleachingEventsActive: Math.floor(seed(`cr:oc:be:${Math.floor(epoch / 5)}`) * 5),
    floodplainExposurePct: Math.round(wave(`cr:oc:fp`, epoch / 6, 8, 36)),
  };

  // 5. Pollution & compliance
  const topEmitters = EMITTER_SECTORS.map(sector => {
    const sharePct = Math.round(wave(`cr:em:${sector}`, epoch / 7, 6, 32));
    const tone: 'ok' | 'warn' | 'alert' = sharePct >= 26 ? 'alert' : sharePct >= 16 ? 'warn' : 'ok';
    return { sector, sharePct, tone };
  }).sort((a, b) => b.sharePct - a.sharePct);
  const pollution: PollutionRegister = {
    emissionsVsTargetPct: e.emissionsVsTargetPct,
    airViolationsActive: Math.floor(seed(`cr:pl:av:${Math.floor(epoch / 4)}`) * 14),
    waterViolationsActive: Math.floor(seed(`cr:pl:wv:${Math.floor(epoch / 4)}`) * 10),
    hazardousMaterialIncidents: Math.floor(seed(`cr:pl:hm:${Math.floor(epoch / 6)}`) * 6),
    enforcementActions: Math.round(wave(`cr:pl:ea`, epoch / 5, 4, 86)),
    complianceIdx: e.compliancePct,
    topEmitters,
  };

  // 6. Climate incidents
  const recoveries: ClimateIncident['recoveryPathway'][] = ['emergency-response', 'evacuation-relief', 'remediation', 'restoration'];
  const incidents: ClimateIncident[] = Array.from({ length: 7 }, (_, i) => {
    const k = `cr:inc:${i}:${Math.floor(epoch / 4)}`;
    const kind = KIND_LIST[Math.floor(seed(`${k}:k`) * KIND_LIST.length)]!;
    const sevRoll = seed(`${k}:sv`);
    const severity: ClimateIncident['severity'] = sevRoll > 0.92 ? 'national' : sevRoll > 0.76 ? 'critical' : sevRoll > 0.5 ? 'elevated' : 'advisory';
    const ageHours = Math.round(wave(`${k}:age`, epoch / 4, 1, 320));
    const populationExposedK = Math.round(wave(`${k}:pp`, epoch / 5, 4, 2200));
    const hectaresAffectedK = Math.round(wave(`${k}:ha`, epoch / 5, 0.4, 880) * 10) / 10;
    const region = REGIONS[Math.floor(seed(`${k}:rg`) * REGIONS.length)]!;
    const ecoregion = ECOREGIONS[Math.floor(seed(`${k}:ec`) * ECOREGIONS.length)]!;
    const cascade = (PROPAGATION[kind] ?? []).map(c => ({
      ...c,
      status: (ageHours < c.delayHrs ? 'pending' : ageHours > c.delayHrs * 6 ? 'cleared' : 'engaged') as 'pending' | 'engaged' | 'cleared',
    }));
    return {
      id: `CCI-${(9000 + Math.floor(seed(`${k}:id`) * 60000))}`,
      kind, severity, region, ecoregion, ageHours, populationExposedK, hectaresAffectedK,
      recoveryPathway: recoveries[Math.floor(seed(`${k}:rp`) * recoveries.length)]!,
      ministryCascade: cascade,
    };
  }).sort((a, b) => {
    const sev = (s: ClimateIncident['severity']) => s === 'national' ? 3 : s === 'critical' ? 2 : s === 'elevated' ? 1 : 0;
    return sev(b.severity) - sev(a.severity) || b.hectaresAffectedK - a.hectaresAffectedK;
  });

  // 7. Forecast — 25 years, 5-year steps
  const horizon = [5, 10, 15, 20, 25];
  const forecast: ClimateForecast = {
    horizonYears: horizon,
    temperatureAnomalyTrajectory: horizon.map(h => Math.round((atmosphere.meanTemperatureAnomalyC + wave(`cr:fc:tm`, epoch / 7 + h * 0.13, -0.3, 1.6)) * 10) / 10),
    biodiversityTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(biosphere.biodiversityIdx + wave(`cr:fc:bi`, epoch / 6 + h * 0.14, -14, 8))))),
    forestCoverTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(biosphere.forestCoverPct + wave(`cr:fc:fc`, epoch / 6 + h * 0.15, -8, 4))))),
    waterStressTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`cr:fc:ws`, epoch / 6 + h * 0.14, 22, 78))))),
    carbonContinuityTrajectory: horizon.map(h => Math.max(0, Math.min(100, Math.round(wave(`cr:fc:cc`, epoch / 5 + h * 0.16, 38, 82))))),
    planetaryResilienceIdx: Math.round((command.ecologicalContinuityIdx + command.adaptationReadinessIdx + biosphere.biodiversityIdx) / 3),
    ecosystemCollapseRisk: Math.min(100, Math.round(
      tipping * 22
      + critical * 12
      + (100 - command.ecologicalContinuityIdx) * 0.4
      + Math.max(0, atmosphere.meanTemperatureAnomalyC * 14)
    )),
    intergenerationalContinuityIdx: Math.round(wave(`cr:fc:ig`, epoch / 9, 42, 92)),
  };

  const banner =
    posture === 'crisis-coordination' ? 'PLANETARY RESILIENCE CRISIS — climate continuity convened'
      : posture === 'stressed' ? 'ECOSYSTEMS UNDER ACUTE STRESS — adaptation engaged'
        : posture === 'engaged' ? 'ECOLOGICAL CONTINUITY ENGAGED'
          : posture === 'observant' ? 'CLIMATE SYSTEMS UNDER OBSERVATION' : 'PLANETARY SYSTEMS STABLE';

  const ministries = new Map<string, number>();
  for (const inc of incidents) {
    for (const c of inc.ministryCascade) {
      if (c.status !== 'pending') ministries.set(c.ministry, (ministries.get(c.ministry) ?? 0) + 1);
    }
  }
  const ministriesEngaged = Array.from(ministries.entries())
    .map(([ministry, engaged]) => ({ ministry, engaged }))
    .sort((a, b) => b.engaged - a.engaged);

  return {
    epoch, command, biosphere, atmosphere, rivers, ocean, pollution, incidents,
    forecast, bannerLine: banner, ministriesEngaged,
    prohibited: CLIMATE_RESILIENCE_SAFEGUARDS.prohibited,
  };
}
