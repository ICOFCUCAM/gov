// lib/gov/energy-grid.ts
//
// Sovereign Energy & Grid Continuity engine. National grid command,
// generation, strategic reserves, transmission infrastructure, industrial
// continuity, emergency response and forecasting — one connected
// deterministic runtime. Cross-ministry propagation chains turn an energy
// failure into a cascade across Health / Transport / Telecom / Treasury /
// Interior / National Coordination. Pure & deterministic; SSR-stable per
// operational epoch.

import { seed, wave } from '@/lib/telemetry';
import { energyOps } from '@/lib/gov/energy-systems';

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];
export type GridPosture = 'stable' | 'engaged' | 'strained' | 'critical' | 'blackout-watch';
export type Tone = 'ok' | 'warn' | 'alert';

// ── 1. National Grid Command ─────────────────────────────────────────
export interface RegionalLoad {
  region: string;
  demandGw: number;
  supplyGw: number;
  reserveMarginPct: number;
  stressZone: boolean;
  loadShedRisk: 'none' | 'monitor' | 'imminent';
}

export interface GridCommand {
  frequencyHz: number;
  frequencyTone: Tone;
  totalDemandGw: number;
  totalSupplyGw: number;
  reserveMarginPct: number;
  regions: RegionalLoad[];
  blackoutPreventionPct: number;  // higher = better
  posture: GridPosture;
}

// ── 2. Generation Operations ─────────────────────────────────────────
export interface GenerationUnit {
  source: 'Hydro' | 'Solar' | 'Wind' | 'Gas' | 'Nuclear';
  outputPct: number;
  capacityGw: number;
  outputGw: number;
  forecastGw: number;     // next-window forecast
  maintenance: 'live' | 'scheduled' | 'unscheduled';
  fuelConversionPct: number;
  tone: Tone;
}

// ── 3. Strategic Energy Reserves ─────────────────────────────────────
export interface StrategicReserve {
  bucket: 'Diesel' | 'Natural Gas' | 'Coal' | 'Uranium' | 'Battery Stack';
  daysCover: number;
  capacityFillPct: number;
  emergencyReleaseEligible: boolean;
  geopoliticalExposure: number;   // 0..100 (higher = worse)
  survivabilityDays: number;
}

// ── 4. Transmission & Infrastructure ─────────────────────────────────
export interface Corridor {
  id: string;
  from: string;
  to: string;
  capacityGw: number;
  loadGw: number;
  utilPct: number;
  transformerHealth: number;
  faults: number;
  repairDispatched: boolean;
  tone: Tone;
}

// ── 5. Industrial Energy Continuity ──────────────────────────────────
export interface IndustrialContinuity {
  sector: 'Refineries' | 'Manufacturing' | 'Cold-chain' | 'Telecom' | 'Critical infra';
  consumptionGw: number;
  protectedAllocationGw: number;
  continuityPct: number;
  emergencyAllocation: boolean;
}

// ── 6. Energy Emergency Response ─────────────────────────────────────
export type EnergyIncidentKind =
  | 'frequency-collapse' | 'transformer-fault' | 'fuel-shortage'
  | 'corridor-overload' | 'infrastructure-sabotage' | 'disaster-power-loss';

export interface EnergyIncident {
  id: string;
  kind: EnergyIncidentKind;
  region: string;
  severity: 'advisory' | 'elevated' | 'critical' | 'national';
  ageHrs: number;
  ministryCascade: { ministry: string; effect: string; delayHrs: number; status: 'pending' | 'engaged' | 'cleared' }[];
  mobilePowerDeployed: boolean;
  status: 'open' | 'rerouting' | 'recovering' | 'contained';
}

// ── 7. Energy Intelligence & Forecasting ─────────────────────────────
export interface EnergyForecast {
  horizonHrs: number[];
  demandGw: number[];
  supplyGw: number[];
  weatherStress: number[];
  cascadingFailureRisk: number;   // 0..100
  fuelGeopoliticalRisk: number;   // 0..100
  blackoutEtaHrs: number | null;  // null = not on the horizon
}

export interface EnergyGridBoard {
  epoch: number;
  command: GridCommand;
  generation: GenerationUnit[];
  reserves: StrategicReserve[];
  corridors: Corridor[];
  industry: IndustrialContinuity[];
  incidents: EnergyIncident[];
  forecast: EnergyForecast;
  systemStressBanner: string;
  ministriesEngaged: { ministry: string; effect: string; engaged: number }[];
}

const PROPAGATION: Record<EnergyIncidentKind, { ministry: string; effect: string; delayHrs: number }[]> = {
  'frequency-collapse': [
    { ministry: 'Health', effect: 'Hospital emergency power activated', delayHrs: 0 },
    { ministry: 'Transport', effect: 'Rail & signalling slowdown', delayHrs: 1 },
    { ministry: 'Telecom', effect: 'Tower battery reserves engaged', delayHrs: 0 },
    { ministry: 'Treasury', effect: 'Emergency allocation gate', delayHrs: 4 },
    { ministry: 'Interior', effect: 'Civil-stability watch raised', delayHrs: 2 },
    { ministry: 'National Coordination', effect: 'Cabinet continuity brief', delayHrs: 6 },
  ],
  'transformer-fault': [
    { ministry: 'Industrial', effect: 'Manufacturing throttle', delayHrs: 2 },
    { ministry: 'Transport', effect: 'Local rail rerouting', delayHrs: 3 },
    { ministry: 'Interior', effect: 'Regional escalation', delayHrs: 4 },
  ],
  'fuel-shortage': [
    { ministry: 'Treasury', effect: 'Strategic-reserve drawdown gate', delayHrs: 4 },
    { ministry: 'Transport', effect: 'Logistics fuel rationing', delayHrs: 6 },
    { ministry: 'National Coordination', effect: 'Geopolitical brief', delayHrs: 8 },
  ],
  'corridor-overload': [
    { ministry: 'Industrial', effect: 'Load curtailment', delayHrs: 1 },
    { ministry: 'Transport', effect: 'Corridor protection raised', delayHrs: 2 },
  ],
  'infrastructure-sabotage': [
    { ministry: 'Interior', effect: 'Police & intelligence engaged', delayHrs: 0 },
    { ministry: 'National Coordination', effect: 'Sovereign infrastructure brief', delayHrs: 4 },
    { ministry: 'Treasury', effect: 'Emergency repair allocation', delayHrs: 6 },
  ],
  'disaster-power-loss': [
    { ministry: 'Health', effect: 'Medical surge with backup power', delayHrs: 0 },
    { ministry: 'Emergency Operations', effect: 'Incident command activated', delayHrs: 0 },
    { ministry: 'Treasury', effect: 'Disaster contingency release', delayHrs: 6 },
    { ministry: 'Transport', effect: 'Evacuation & logistics routing', delayHrs: 2 },
    { ministry: 'National Coordination', effect: 'National emergency brief', delayHrs: 4 },
  ],
};

const KIND_LIST: EnergyIncidentKind[] = [
  'frequency-collapse', 'transformer-fault', 'fuel-shortage',
  'corridor-overload', 'infrastructure-sabotage', 'disaster-power-loss',
];

export function energyGridBoard(now: number): EnergyGridBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;  // floor for SSR-stable determinism
  const o = energyOps('national', ts);

  // 1. National grid command
  const regions: RegionalLoad[] = REGIONS.map(region => {
    const k = `eg:rg:${region}:${Math.floor(epoch / 4)}`;
    const dem = Math.round(wave(`${k}:d`, epoch / 5, 0.8, 3.6) * 10) / 10;
    const sup = Math.round(wave(`${k}:s`, epoch / 6, 0.7, 3.8) * 10) / 10;
    const margin = Math.round(((sup - dem) / Math.max(0.1, dem)) * 100);
    const stress = margin < 6;
    return {
      region, demandGw: dem, supplyGw: sup, reserveMarginPct: margin,
      stressZone: stress,
      loadShedRisk: margin < 2 ? 'imminent' : margin < 8 ? 'monitor' : 'none',
    };
  });
  const freqTone: Tone = Math.abs(o.gridFrequencyHz - 50) > 0.4 ? 'alert' : Math.abs(o.gridFrequencyHz - 50) > 0.2 ? 'warn' : 'ok';
  const stressedCount = regions.filter(r => r.stressZone).length;
  const blackoutPreventionPct = Math.max(0, Math.min(100, Math.round(100 - stressedCount * 12 - (o.gridFrequencyHz < 49.7 ? 20 : 0) - (o.loadShedding ? 15 : 0))));
  const posture: GridPosture =
    o.loadShedding && stressedCount >= 3 ? 'blackout-watch'
      : stressedCount >= 3 || blackoutPreventionPct < 45 ? 'critical'
        : stressedCount >= 1 || blackoutPreventionPct < 65 ? 'strained'
          : freqTone !== 'ok' ? 'engaged' : 'stable';
  const command: GridCommand = {
    frequencyHz: o.gridFrequencyHz, frequencyTone: freqTone,
    totalDemandGw: o.demandGw, totalSupplyGw: o.supplyGw,
    reserveMarginPct: o.reserveMarginPct, regions, blackoutPreventionPct, posture,
  };

  // 2. Generation operations (5 sources with capacity + forecast)
  const sources: GenerationUnit['source'][] = ['Hydro', 'Solar', 'Wind', 'Gas', 'Nuclear'];
  const generation: GenerationUnit[] = sources.map((source, i) => {
    const k = `eg:gen:${source}`;
    const capacityGw = 2 + Math.floor(seed(`${k}:c`) * 7);
    const outputPct = Math.round(wave(`${k}:o`, epoch / 4, 30, 99));
    const outputGw = Math.round(capacityGw * outputPct) / 100;
    const forecastGw = Math.round((capacityGw * Math.round(wave(`${k}:f`, epoch / 5 + 1, 30, 99))) / 100 * 10) / 10;
    const maintRoll = seed(`${k}:mt:${Math.floor(epoch / 9)}`);
    const maintenance: GenerationUnit['maintenance'] = maintRoll > 0.92 ? 'unscheduled' : maintRoll > 0.78 ? 'scheduled' : 'live';
    const fuelConversionPct = Math.round(wave(`${k}:fc`, epoch / 7, 78, 96));
    return {
      source, outputPct, capacityGw, outputGw, forecastGw, maintenance, fuelConversionPct,
      tone: maintenance === 'unscheduled' ? 'alert' : outputPct >= 75 ? 'ok' : outputPct >= 55 ? 'warn' : 'alert',
    };
  });

  // 3. Strategic reserves
  const buckets: StrategicReserve['bucket'][] = ['Diesel', 'Natural Gas', 'Coal', 'Uranium', 'Battery Stack'];
  const reserves: StrategicReserve[] = buckets.map(bucket => {
    const k = `eg:res:${bucket}`;
    const daysCover = Math.round(wave(`${k}:dc`, epoch / 9, 4, 90));
    const capacityFillPct = Math.round(wave(`${k}:cf`, epoch / 8, 35, 96));
    const geopoliticalExposure = Math.round(wave(`${k}:ge`, epoch / 12, 8, bucket === 'Natural Gas' || bucket === 'Uranium' ? 78 : 50));
    return {
      bucket, daysCover, capacityFillPct, geopoliticalExposure,
      emergencyReleaseEligible: capacityFillPct >= 45,
      survivabilityDays: Math.round(daysCover * (1 - geopoliticalExposure * 0.005)),
    };
  });

  // 4. Transmission corridors (between regions)
  const pairs: [string, string][] = [
    ['Capital District', 'Northern'], ['Capital District', 'Eastern'],
    ['Northern', 'Highland'], ['Eastern', 'Coastal'],
    ['Western', 'Capital District'], ['Coastal', 'Western'],
  ];
  const corridors: Corridor[] = pairs.map(([a, b], i) => {
    const k = `eg:cor:${a}-${b}`;
    const capacityGw = 3 + Math.floor(seed(`${k}:c`) * 6);
    const loadGw = Math.round(wave(`${k}:l`, epoch / 4, 1.2, capacityGw * 1.15) * 10) / 10;
    const utilPct = Math.min(140, Math.round((loadGw / capacityGw) * 100));
    const transformerHealth = Math.max(0, Math.min(100, Math.round(100 - (utilPct - 80) * 0.8 + wave(`${k}:h`, epoch / 7, -8, 8))));
    const faults = utilPct > 110 ? 2 : utilPct > 95 ? 1 : 0;
    const tone: Tone = utilPct > 110 ? 'alert' : utilPct > 90 ? 'warn' : 'ok';
    void i;
    return {
      id: `COR-${a.slice(0, 3).toUpperCase()}-${b.slice(0, 3).toUpperCase()}`,
      from: a, to: b, capacityGw, loadGw, utilPct, transformerHealth, faults,
      repairDispatched: faults > 0,
      tone,
    };
  }).sort((x, y) => y.utilPct - x.utilPct);

  // 5. Industrial continuity
  const sectors: IndustrialContinuity['sector'][] = ['Refineries', 'Manufacturing', 'Cold-chain', 'Telecom', 'Critical infra'];
  const industry: IndustrialContinuity[] = sectors.map(sector => {
    const k = `eg:ind:${sector}`;
    const consumption = Math.round(wave(`${k}:cn`, epoch / 5, 0.6, 4.2) * 10) / 10;
    const protectedAllocation = Math.round(consumption * (0.7 + seed(`${k}:p`) * 0.25) * 10) / 10;
    const continuityPct = Math.min(100, Math.round((protectedAllocation / Math.max(0.1, consumption)) * 100));
    return {
      sector, consumptionGw: consumption, protectedAllocationGw: protectedAllocation,
      continuityPct,
      emergencyAllocation: continuityPct < 80 || posture === 'critical' || posture === 'blackout-watch',
    };
  });

  // 6. Energy emergency response
  const incidents: EnergyIncident[] = Array.from({ length: 8 }, (_, i) => {
    const k = `eg:inc:${i}:${Math.floor(epoch / 4)}`;
    const kind = KIND_LIST[Math.floor(seed(`${k}:k`) * KIND_LIST.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:rg`) * REGIONS.length)]!;
    const sevRoll = seed(`${k}:sv`);
    const severity: EnergyIncident['severity'] = sevRoll > 0.93 ? 'national' : sevRoll > 0.78 ? 'critical' : sevRoll > 0.5 ? 'elevated' : 'advisory';
    const ageHrs = Math.round(wave(`${k}:age`, epoch / 6, 1, 72));
    const cascade = (PROPAGATION[kind] ?? []).map(c => ({
      ...c,
      status: (ageHrs < c.delayHrs ? 'pending' : ageHrs > c.delayHrs * 6 ? 'cleared' : 'engaged') as 'pending' | 'engaged' | 'cleared',
    }));
    return {
      id: `ENI-${(2000 + Math.floor(seed(`${k}:id`) * 60000))}`,
      kind, region, severity, ageHrs,
      ministryCascade: cascade,
      mobilePowerDeployed: severity === 'critical' || severity === 'national',
      status: (
        ageHrs > 48 ? 'recovering'
          : kind === 'corridor-overload' || kind === 'transformer-fault' ? 'rerouting'
            : ageHrs > 24 ? 'contained' : 'open'
      ) as EnergyIncident['status'],
    };
  }).sort((a, b) => {
    const sev = (s: EnergyIncident['severity']) => s === 'national' ? 3 : s === 'critical' ? 2 : s === 'elevated' ? 1 : 0;
    return sev(b.severity) - sev(a.severity) || b.ageHrs - a.ageHrs;
  });

  // 7. Forecasting (24h horizon at 4h steps)
  const horizon = [4, 8, 12, 16, 20, 24];
  const forecast: EnergyForecast = {
    horizonHrs: horizon,
    demandGw: horizon.map(h => Math.round(wave(`eg:fc:d`, epoch / 4 + h * 0.07, o.demandGw - 1.2, o.demandGw + 1.6) * 10) / 10),
    supplyGw: horizon.map(h => Math.round(wave(`eg:fc:s`, epoch / 4 + h * 0.08, o.supplyGw - 1.4, o.supplyGw + 1.4) * 10) / 10),
    weatherStress: horizon.map(h => Math.round(wave(`eg:fc:w`, epoch / 5 + h * 0.1, 10, 80))),
    cascadingFailureRisk: Math.min(100, Math.round(stressedCount * 12 + (100 - blackoutPreventionPct) * 0.5)),
    fuelGeopoliticalRisk: Math.round(reserves.reduce((s, r) => s + r.geopoliticalExposure, 0) / reserves.length),
    blackoutEtaHrs: posture === 'blackout-watch' ? 4 + Math.floor(seed(`eg:bo:eta:${epoch}`) * 12) : null,
  };

  const stress =
    posture === 'blackout-watch' ? 'NATIONAL BLACKOUT WATCH — emergency rerouting active'
      : posture === 'critical' ? 'GRID UNDER CRITICAL LOAD'
        : posture === 'strained' ? 'GRID STRAINED — regional pressure'
          : posture === 'engaged' ? 'GRID ENGAGED — frequency drift'
            : 'NATIONAL GRID STABLE';

  const ministries = new Map<string, { effect: string; engaged: number }>();
  for (const inc of incidents) {
    for (const c of inc.ministryCascade) {
      if (c.status !== 'pending') {
        const cur = ministries.get(c.ministry);
        ministries.set(c.ministry, { effect: c.effect, engaged: (cur?.engaged ?? 0) + 1 });
      }
    }
  }
  const ministriesEngaged = Array.from(ministries.entries())
    .map(([ministry, v]) => ({ ministry, effect: v.effect, engaged: v.engaged }))
    .sort((a, b) => b.engaged - a.engaged);

  return { epoch, command, generation, reserves, corridors, industry, incidents, forecast, systemStressBanner: stress, ministriesEngaged };
}
