// lib/gov/food-security.ts
//
// Sovereign Food Security & Environmental Continuity engine. National
// food continuity command, agricultural production, climate resilience,
// water & irrigation infrastructure, food distribution, rural community
// stability and agricultural intelligence — one connected deterministic
// runtime. Cross-ministry propagation chains turn an agricultural failure
// into a national cascade across Treasury / Transport / Health / Interior
// / Environment / Emergency Operations / National Coordination.
// Pure & deterministic; SSR-stable per operational epoch.

import { seed, wave } from '@/lib/telemetry';
import { agricultureOps } from '@/lib/gov/agriculture-systems';

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];
const SEASONS = ['Planting', 'Growing', 'Harvest', 'Dormant'] as const;
export type Season = typeof SEASONS[number];
export type Tone = 'ok' | 'warn' | 'alert';
export type FoodPosture = 'sustained' | 'engaged' | 'tightening' | 'critical' | 'famine-watch';

// ── 1. National food continuity command ─────────────────────────────
export interface RegionFoodState {
  region: string;
  productionIdx: number;        // 0..100 (higher = better)
  reservesDays: number;
  nutritionContinuity: number;  // 0..100
  shortageRisk: 'none' | 'monitor' | 'imminent';
  emergencyAllocation: boolean;
}

export interface FoodReserve {
  bucket: 'Grain' | 'Pulses' | 'Cooking oil' | 'Sugar' | 'Salt' | 'Powdered milk';
  daysCover: number;
  capacityFillPct: number;
  reserveEligible: boolean;
}

export interface FoodContinuityCommand {
  posture: FoodPosture;
  nationalReserveDays: number;
  regions: RegionFoodState[];
  reserves: FoodReserve[];
  shortageRiskCount: number;
  emergencyAllocationCount: number;
}

// ── 2. Agricultural production ──────────────────────────────────────
export interface CropProduction {
  crop: 'Maize' | 'Wheat' | 'Rice' | 'Sorghum' | 'Cassava' | 'Vegetables';
  region: string;
  yieldIdx: number;        // 0..100
  forecastIdx: number;
  seasonalPhase: Season;
  pestPressure: number;    // 0..100 (higher = worse)
  diseasePressure: number;
  irrigationCoverPct: number;
}

export interface LivestockHerd {
  category: 'Cattle' | 'Goats' | 'Poultry' | 'Sheep' | 'Fisheries';
  populationK: number;
  healthIdx: number;
  vaccinationPct: number;
  outbreakRisk: 'low' | 'monitor' | 'outbreak';
}

// ── 3. Climate & environmental resilience ───────────────────────────
export interface ClimatePressure {
  region: string;
  droughtIdx: number;      // 0..100 (higher = worse)
  floodIdx: number;
  wildfireRisk: number;
  soilDegradation: number;
  climateSurvivability: number;  // 0..100 (higher = better)
}

// ── 4. Water & irrigation infrastructure ────────────────────────────
export interface Reservoir {
  id: string;
  name: string;
  region: string;
  capacityFillPct: number;
  drawdownRate: number;        // pts per epoch
  ruralWaterPressure: number;  // 0..100
  agriAllocationPct: number;
  status: 'nominal' | 'rationing' | 'emergency';
}

// ── 5. Food distribution & supply network ───────────────────────────
export interface DistributionLane {
  id: string;
  lane: string;
  coldChainIntegrity: number;  // 0..100
  storageDays: number;
  throughputTons: number;
  emergencyRouting: boolean;
  tone: Tone;
}

// ── 6. Rural governance & community stability ───────────────────────
export interface RuralStability {
  region: string;
  farmingCommunityIdx: number;  // 0..100
  agriculturalLabour: number;   // workforce index 0..100
  economicPressure: number;     // 0..100 (higher = worse)
  migrationRisk: 'low' | 'monitor' | 'elevated';
}

// ── 7. Agricultural intelligence & forecasting ──────────────────────
export interface AgriIncidentKind { kind: 'drought-escalation' | 'pest-outbreak' | 'flood-impact' | 'livestock-disease' | 'cold-chain-failure' | 'rural-unrest' | 'fuel-shortage-for-irrigation' }

export interface AgriIncident {
  id: string;
  kind: AgriIncidentKind['kind'];
  region: string;
  severity: 'advisory' | 'elevated' | 'critical' | 'national';
  ageHrs: number;
  ministryCascade: { ministry: string; effect: string; delayHrs: number; status: 'pending' | 'engaged' | 'cleared' }[];
  emergencyInterventionActive: boolean;
}

export interface AgriForecast {
  horizonWeeks: number[];
  yieldOutlook: number[];
  droughtRisk: number[];
  geopoliticalFoodDependency: number;
  scarcityRisk: number;             // 0..100
  pestEscalationRisk: number;
  seasonalConfidence: number;
}

export interface FoodSecurityBoard {
  epoch: number;
  currentSeason: Season;
  seasonProgressPct: number;        // 0..100 progress within current season
  command: FoodContinuityCommand;
  crops: CropProduction[];
  livestock: LivestockHerd[];
  climate: ClimatePressure[];
  reservoirs: Reservoir[];
  distribution: DistributionLane[];
  rural: RuralStability[];
  incidents: AgriIncident[];
  forecast: AgriForecast;
  bannerLine: string;
  ministriesEngaged: { ministry: string; engaged: number }[];
}

const PROPAGATION: Record<AgriIncidentKind['kind'], { ministry: string; effect: string; delayHrs: number }[]> = {
  'drought-escalation': [
    { ministry: 'Treasury', effect: 'Emergency food allocation gate', delayHrs: 8 },
    { ministry: 'Transport', effect: 'Strategic-reserve relay activation', delayHrs: 12 },
    { ministry: 'Health', effect: 'Nutritional-stress surveillance', delayHrs: 24 },
    { ministry: 'Interior', effect: 'Regional stability watch', delayHrs: 12 },
    { ministry: 'Environment', effect: 'Ecological recovery operations', delayHrs: 48 },
    { ministry: 'National Coordination', effect: 'Continuity review', delayHrs: 24 },
  ],
  'pest-outbreak': [
    { ministry: 'Environment', effect: 'Ecological intervention dispatch', delayHrs: 8 },
    { ministry: 'Trade & Industry', effect: 'Export-quality assessment', delayHrs: 24 },
    { ministry: 'Treasury', effect: 'Emergency pesticide-procurement gate', delayHrs: 12 },
  ],
  'flood-impact': [
    { ministry: 'Emergency Operations', effect: 'Rural evacuation coordination', delayHrs: 4 },
    { ministry: 'Health', effect: 'Water-borne disease surveillance', delayHrs: 12 },
    { ministry: 'Transport', effect: 'Rural-corridor rerouting', delayHrs: 6 },
    { ministry: 'Treasury', effect: 'Disaster contingency release', delayHrs: 8 },
  ],
  'livestock-disease': [
    { ministry: 'Health', effect: 'Zoonotic-risk surveillance', delayHrs: 6 },
    { ministry: 'Trade & Industry', effect: 'Livestock export halt', delayHrs: 12 },
    { ministry: 'Environment', effect: 'Veterinary intervention dispatch', delayHrs: 8 },
  ],
  'cold-chain-failure': [
    { ministry: 'Energy', effect: 'Grid stabilisation request', delayHrs: 2 },
    { ministry: 'Transport', effect: 'Refrigerated logistics rerouting', delayHrs: 4 },
    { ministry: 'Health', effect: 'Spoilage-related health watch', delayHrs: 12 },
  ],
  'rural-unrest': [
    { ministry: 'Interior', effect: 'Regional administration engagement', delayHrs: 4 },
    { ministry: 'Treasury', effect: 'Rural subsidy review', delayHrs: 24 },
    { ministry: 'National Coordination', effect: 'Cabinet stability brief', delayHrs: 12 },
  ],
  'fuel-shortage-for-irrigation': [
    { ministry: 'Energy', effect: 'Agri-fuel allocation gate', delayHrs: 4 },
    { ministry: 'Treasury', effect: 'Fuel-subsidy continuation review', delayHrs: 12 },
    { ministry: 'Transport', effect: 'Rural fuel-convoy escort', delayHrs: 8 },
  ],
};

const KIND_LIST: AgriIncidentKind['kind'][] = [
  'drought-escalation', 'pest-outbreak', 'flood-impact', 'livestock-disease',
  'cold-chain-failure', 'rural-unrest', 'fuel-shortage-for-irrigation',
];

function seasonFor(epoch: number): { season: Season; progressPct: number } {
  const seasonLen = 24;        // 24 epochs per season for clear progression
  const idx = Math.floor(epoch / seasonLen) % SEASONS.length;
  const progress = Math.round(((epoch % seasonLen) / seasonLen) * 100);
  return { season: SEASONS[idx]!, progressPct: progress };
}

export function foodSecurityBoard(now: number): FoodSecurityBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;
  const o = agricultureOps('national', ts);
  void o;
  const { season: currentSeason, progressPct: seasonProgressPct } = seasonFor(epoch);

  // 1. Regional food state
  const regions: RegionFoodState[] = REGIONS.map(region => {
    const k = `fs:rg:${region}`;
    const productionIdx = Math.round(wave(`${k}:p`, epoch / 5, 38, 96));
    const reservesDays = Math.round(wave(`${k}:r`, epoch / 6, 6, 90));
    const nutritionContinuity = Math.round(wave(`${k}:n`, epoch / 5, 52, 96));
    const shortageRisk: RegionFoodState['shortageRisk'] =
      reservesDays < 14 ? 'imminent' : reservesDays < 30 ? 'monitor' : 'none';
    return {
      region, productionIdx, reservesDays, nutritionContinuity,
      shortageRisk,
      emergencyAllocation: shortageRisk === 'imminent' || productionIdx < 50,
    };
  });

  // Reserve buckets
  const buckets: FoodReserve['bucket'][] = ['Grain', 'Pulses', 'Cooking oil', 'Sugar', 'Salt', 'Powdered milk'];
  const reserves: FoodReserve[] = buckets.map(bucket => {
    const k = `fs:res:${bucket}`;
    const daysCover = Math.round(wave(`${k}:d`, epoch / 8, 8, 120));
    const capacityFillPct = Math.round(wave(`${k}:f`, epoch / 6, 38, 96));
    return { bucket, daysCover, capacityFillPct, reserveEligible: capacityFillPct >= 40 };
  });

  const nationalReserveDays = Math.round(reserves.reduce((s, r) => s + r.daysCover, 0) / reserves.length);
  const shortageRiskCount = regions.filter(r => r.shortageRisk !== 'none').length;
  const emergencyAllocationCount = regions.filter(r => r.emergencyAllocation).length;
  const posture: FoodPosture =
    emergencyAllocationCount >= 3 && nationalReserveDays < 20 ? 'famine-watch'
      : shortageRiskCount >= 3 || nationalReserveDays < 25 ? 'critical'
        : shortageRiskCount >= 1 || nationalReserveDays < 45 ? 'tightening'
          : nationalReserveDays < 65 ? 'engaged' : 'sustained';

  const command: FoodContinuityCommand = {
    posture, nationalReserveDays, regions, reserves,
    shortageRiskCount, emergencyAllocationCount,
  };

  // 2. Crop production (6 crops × 1 representative region each)
  const cropDefs: { crop: CropProduction['crop']; region: string }[] = [
    { crop: 'Maize', region: 'Northern' }, { crop: 'Wheat', region: 'Highland' },
    { crop: 'Rice', region: 'Coastal' }, { crop: 'Sorghum', region: 'Eastern' },
    { crop: 'Cassava', region: 'Western' }, { crop: 'Vegetables', region: 'Capital District' },
  ];
  const crops: CropProduction[] = cropDefs.map(({ crop, region }) => {
    const k = `fs:cp:${crop}`;
    const yieldIdx = Math.round(wave(`${k}:y`, epoch / 5, 42, 94));
    const forecastIdx = Math.round(wave(`${k}:f`, epoch / 6 + 1, 42, 94));
    const pestPressure = Math.round(wave(`${k}:pp`, epoch / 7, 6, 78));
    const diseasePressure = Math.round(wave(`${k}:dp`, epoch / 8, 4, 64));
    const irrigationCoverPct = Math.round(wave(`${k}:ic`, epoch / 6, 30, 92));
    return { crop, region, yieldIdx, forecastIdx, seasonalPhase: currentSeason, pestPressure, diseasePressure, irrigationCoverPct };
  });

  // Livestock
  const livestock: LivestockHerd[] = (['Cattle', 'Goats', 'Poultry', 'Sheep', 'Fisheries'] as LivestockHerd['category'][]).map(category => {
    const k = `fs:lv:${category}`;
    const populationK = Math.round(wave(`${k}:p`, epoch / 9, 50, 1800));
    const healthIdx = Math.round(wave(`${k}:h`, epoch / 5, 62, 96));
    const vaccinationPct = Math.round(wave(`${k}:v`, epoch / 6, 48, 94));
    const outRoll = seed(`${k}:o:${Math.floor(epoch / 8)}`);
    const outbreakRisk: LivestockHerd['outbreakRisk'] = outRoll > 0.92 ? 'outbreak' : outRoll > 0.74 ? 'monitor' : 'low';
    return { category, populationK, healthIdx, vaccinationPct, outbreakRisk };
  });

  // 3. Climate
  const climate: ClimatePressure[] = REGIONS.map(region => {
    const k = `fs:cl:${region}`;
    const droughtIdx = Math.round(wave(`${k}:dr`, epoch / 8, 8, 92));
    const floodIdx = Math.round(wave(`${k}:fl`, epoch / 7, 4, 74));
    const wildfireRisk = Math.round(wave(`${k}:wf`, epoch / 9, 4, 78));
    const soilDegradation = Math.round(wave(`${k}:sd`, epoch / 11, 10, 70));
    const climateSurvivability = Math.max(0, Math.min(100, Math.round(100 - droughtIdx * 0.3 - floodIdx * 0.2 - wildfireRisk * 0.2 - soilDegradation * 0.3)));
    return { region, droughtIdx, floodIdx, wildfireRisk, soilDegradation, climateSurvivability };
  });

  // 4. Reservoirs
  const reservoirNames: { name: string; region: string }[] = [
    { name: 'Capital Catchment', region: 'Capital District' },
    { name: 'Northern Highland Dam', region: 'Northern' },
    { name: 'Eastern Reservoir', region: 'Eastern' },
    { name: 'Coastal River Storage', region: 'Coastal' },
    { name: 'Western Aquifer Lake', region: 'Western' },
    { name: 'Highland Snowmelt Basin', region: 'Highland' },
  ];
  const reservoirs: Reservoir[] = reservoirNames.map((r, i) => {
    const k = `fs:rv:${r.name}`;
    const capacityFillPct = Math.round(wave(`${k}:c`, epoch / 9, 22, 94));
    const drawdownRate = Math.round(wave(`${k}:dr`, epoch / 11, 0, 4) * 10) / 10;
    const ruralWaterPressure = Math.round(wave(`${k}:rp`, epoch / 7, 14, 88));
    const agriAllocationPct = Math.round(wave(`${k}:ag`, epoch / 6, 35, 78));
    const status: Reservoir['status'] =
      capacityFillPct < 30 ? 'emergency' : capacityFillPct < 50 ? 'rationing' : 'nominal';
    void i;
    return { id: `RV-${i + 1}`, name: r.name, region: r.region, capacityFillPct, drawdownRate, ruralWaterPressure, agriAllocationPct, status };
  });

  // 5. Distribution lanes
  const laneDefs = [
    'Northern grain → Capital silo',
    'Highland wheat → Eastern milling',
    'Coastal rice → Highland village',
    'Western cassava → Northern market',
    'Capital cold-chain → Western highland',
  ];
  const distribution: DistributionLane[] = laneDefs.map((lane, i) => {
    const k = `fs:dist:${lane}`;
    const coldChainIntegrity = Math.round(wave(`${k}:cc`, epoch / 5, 56, 96));
    const storageDays = 4 + Math.floor(seed(`${k}:sd`) * 28);
    const throughputTons = Math.round(wave(`${k}:tp`, epoch / 4, 120, 980));
    const tone: Tone = coldChainIntegrity >= 82 ? 'ok' : coldChainIntegrity >= 65 ? 'warn' : 'alert';
    return {
      id: `DL-${i + 1}`, lane, coldChainIntegrity, storageDays, throughputTons,
      emergencyRouting: tone === 'alert' || posture === 'critical' || posture === 'famine-watch',
      tone,
    };
  }).sort((a, b) => a.coldChainIntegrity - b.coldChainIntegrity);

  // 6. Rural stability
  const rural: RuralStability[] = REGIONS.map(region => {
    const k = `fs:ru:${region}`;
    const farmingCommunityIdx = Math.round(wave(`${k}:f`, epoch / 8, 42, 92));
    const agriculturalLabour = Math.round(wave(`${k}:l`, epoch / 6, 48, 96));
    const economicPressure = Math.round(wave(`${k}:ep`, epoch / 7, 14, 82));
    const migrationRisk: RuralStability['migrationRisk'] =
      economicPressure > 60 ? 'elevated' : economicPressure > 40 ? 'monitor' : 'low';
    return { region, farmingCommunityIdx, agriculturalLabour, economicPressure, migrationRisk };
  });

  // Incidents
  const incidents: AgriIncident[] = Array.from({ length: 7 }, (_, i) => {
    const k = `fs:inc:${i}:${Math.floor(epoch / 4)}`;
    const kind = KIND_LIST[Math.floor(seed(`${k}:k`) * KIND_LIST.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const sevRoll = seed(`${k}:sv`);
    const severity: AgriIncident['severity'] = sevRoll > 0.92 ? 'national' : sevRoll > 0.76 ? 'critical' : sevRoll > 0.5 ? 'elevated' : 'advisory';
    const ageHrs = Math.round(wave(`${k}:age`, epoch / 6, 1, 96));
    const cascade = (PROPAGATION[kind] ?? []).map(c => ({
      ...c,
      status: (ageHrs < c.delayHrs ? 'pending' : ageHrs > c.delayHrs * 6 ? 'cleared' : 'engaged') as 'pending' | 'engaged' | 'cleared',
    }));
    return {
      id: `AGI-${(3000 + Math.floor(seed(`${k}:id`) * 50000))}`,
      kind, region, severity, ageHrs,
      ministryCascade: cascade,
      emergencyInterventionActive: severity === 'critical' || severity === 'national',
    };
  }).sort((a, b) => {
    const sev = (s: AgriIncident['severity']) => s === 'national' ? 3 : s === 'critical' ? 2 : s === 'elevated' ? 1 : 0;
    return sev(b.severity) - sev(a.severity) || b.ageHrs - a.ageHrs;
  });

  // Forecast
  const horizon = [2, 4, 6, 8, 10, 12];   // weeks ahead
  const forecast: AgriForecast = {
    horizonWeeks: horizon,
    yieldOutlook: horizon.map(h => Math.round(wave(`fs:fc:y`, epoch / 3 + h * 0.15, 40, 96))),
    droughtRisk: horizon.map(h => Math.round(wave(`fs:fc:dr`, epoch / 4 + h * 0.18, 8, 84))),
    geopoliticalFoodDependency: Math.round(wave(`fs:fc:gp`, epoch / 12, 14, 68)),
    scarcityRisk: Math.min(100, Math.round(shortageRiskCount * 14 + emergencyAllocationCount * 12)),
    pestEscalationRisk: Math.round(crops.reduce((s, c) => s + c.pestPressure, 0) / crops.length),
    seasonalConfidence: Math.max(0, Math.min(100, 86 - Math.round(climate.reduce((s, c) => s + c.droughtIdx, 0) / climate.length * 0.5))),
  };

  const banner =
    posture === 'famine-watch' ? 'FAMINE WATCH — emergency reserve release authorised'
      : posture === 'critical' ? 'NATIONAL FOOD CONTINUITY CRITICAL'
        : posture === 'tightening' ? 'FOOD SUPPLY TIGHTENING — strategic monitoring engaged'
          : posture === 'engaged' ? 'AGRICULTURAL POSTURE ENGAGED'
            : 'NATIONAL FOOD CONTINUITY SUSTAINED';

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
    epoch, currentSeason, seasonProgressPct,
    command, crops, livestock, climate, reservoirs, distribution, rural, incidents, forecast,
    bannerLine: banner, ministriesEngaged,
  };
}
