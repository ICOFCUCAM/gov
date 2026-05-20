// lib/gov/transport-network.ts
//
// Sovereign Transport & National Logistics engine. National mobility
// command, ports & maritime, rail & transit, aviation & airspace,
// logistics network, infrastructure maintenance, emergency response and
// forecasting — one connected deterministic runtime. Cross-ministry
// propagation chains turn a transport disruption into a national cascade
// across Health / Treasury / Interior / Energy / Trade & Industry /
// Emergency Operations / National Coordination. Pure & deterministic;
// SSR-stable per operational epoch.

import { seed, wave } from '@/lib/telemetry';
import { transportOps } from '@/lib/gov/transport-systems';

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

export type Tone = 'ok' | 'warn' | 'alert';
export type MobilityPosture = 'flowing' | 'engaged' | 'congested' | 'critical' | 'collapse-watch';

// ── 1. National mobility command ─────────────────────────────────────
export interface CorridorState {
  id: string;
  name: string;
  mode: 'Road' | 'Rail' | 'Maritime' | 'Aviation';
  loadPct: number;
  throughputKt: number;          // kilo-tonnes / day
  congestion: 'free' | 'flowing' | 'heavy' | 'bottleneck' | 'collapse';
  stabilization: 'nominal' | 'rerouting' | 'emergency-corridor';
  tone: Tone;
}

export interface MobilityCommand {
  posture: MobilityPosture;
  nationalThroughputKt: number;
  averageLoadPct: number;
  bottlenecks: number;
  emergencyCorridorsActive: number;
  corridors: CorridorState[];
  regionalCongestion: { region: string; congestionPct: number; tone: Tone }[];
}

// ── 2. Ports & maritime ──────────────────────────────────────────────
export interface PortState {
  id: string;
  name: string;
  region: string;
  berthOccupancyPct: number;
  containersInYard: number;
  customsCoordination: Tone;
  emergencyDiversion: boolean;
  maritimeRisk: 'calm' | 'advisory' | 'storm' | 'security';
}

// ── 3. Rail & transit ────────────────────────────────────────────────
export interface RailCorridor {
  id: string;
  route: string;
  syncPct: number;             // schedule synchronisation
  freightKt: number;
  maintenanceWindowHrs: number;
  disruption: 'none' | 'minor' | 'major';
}

// ── 4. Aviation & airspace ───────────────────────────────────────────
export interface AirHub {
  id: string;
  name: string;
  movementsPerHr: number;
  airspaceStrain: number;       // 0..100
  weatherImpact: 'clear' | 'caution' | 'severe';
  cargoCapacityPct: number;
  emergencyCorridor: boolean;
}

// ── 5. National logistics network ────────────────────────────────────
export interface LogisticsLane {
  id: string;
  lane: string;                 // origin → destination
  cargoClass: 'food' | 'medical' | 'fuel' | 'industrial' | 'consumer' | 'strategic-reserve';
  continuityPct: number;
  warehouseCoverDays: number;
  freightIntelligence: Tone;
  interMinistrySupport: string[];
}

// ── 6. Infrastructure maintenance ────────────────────────────────────
export interface InfraAsset {
  id: string;
  asset: string;
  type: 'Bridge' | 'Tunnel' | 'Highway' | 'Rail junction' | 'Port terminal';
  integrityPct: number;
  degradationRate: number;     // pts per epoch
  repairDispatched: boolean;
  constructionCoordinated: boolean;
}

// ── 7. Transport emergency response ──────────────────────────────────
export type TransportIncidentKind =
  | 'bridge-collapse' | 'port-closure' | 'rail-derailment'
  | 'aviation-grounding' | 'fuel-convoy-attack' | 'disaster-route-collapse'
  | 'highway-accident' | 'maritime-storm';

export interface TransportIncident {
  id: string;
  kind: TransportIncidentKind;
  region: string;
  severity: 'advisory' | 'elevated' | 'critical' | 'national';
  ageHrs: number;
  evacuationActive: boolean;
  rescueDispatched: boolean;
  ministryCascade: { ministry: string; effect: string; delayHrs: number; status: 'pending' | 'engaged' | 'cleared' }[];
  status: 'open' | 'rerouting' | 'evacuating' | 'contained' | 'recovering';
}

// ── 8. Mobility intelligence & forecasting ───────────────────────────
export interface MobilityForecast {
  horizonHrs: number[];
  congestionPct: number[];
  weatherImpact: number[];
  economicMobilityIdx: number;
  cascadingDisruptionRisk: number;  // 0..100
  routeCollapseEtaHrs: number | null;
  crisisRoutingReadiness: number;   // 0..100
}

export interface TransportNetworkBoard {
  epoch: number;
  command: MobilityCommand;
  ports: PortState[];
  rail: RailCorridor[];
  aviation: AirHub[];
  logistics: LogisticsLane[];
  infrastructure: InfraAsset[];
  incidents: TransportIncident[];
  forecast: MobilityForecast;
  systemBanner: string;
  ministriesEngaged: { ministry: string; engaged: number }[];
}

const PROPAGATION: Record<TransportIncidentKind, { ministry: string; effect: string; delayHrs: number }[]> = {
  'bridge-collapse': [
    { ministry: 'Health', effect: 'Medical-supply rerouting', delayHrs: 2 },
    { ministry: 'Treasury', effect: 'Emergency infrastructure allocation', delayHrs: 6 },
    { ministry: 'Interior', effect: 'Civil-stability route stabilisation', delayHrs: 2 },
    { ministry: 'Energy', effect: 'Fuel-convoy redistribution', delayHrs: 4 },
    { ministry: 'Trade & Industry', effect: 'Freight-impact assessment', delayHrs: 8 },
    { ministry: 'National Coordination', effect: 'Continuity review', delayHrs: 8 },
  ],
  'port-closure': [
    { ministry: 'Trade & Industry', effect: 'Export halt; container backlog', delayHrs: 0 },
    { ministry: 'Treasury', effect: 'Customs-revenue impact', delayHrs: 6 },
    { ministry: 'Health', effect: 'Medical-import rerouting', delayHrs: 4 },
    { ministry: 'Energy', effect: 'Fuel-import rerouting', delayHrs: 6 },
  ],
  'rail-derailment': [
    { ministry: 'Health', effect: 'Casualty response', delayHrs: 0 },
    { ministry: 'Trade & Industry', effect: 'Freight rerouting', delayHrs: 2 },
    { ministry: 'Emergency Operations', effect: 'Incident command activated', delayHrs: 0 },
  ],
  'aviation-grounding': [
    { ministry: 'Health', effect: 'Critical-supply air corridor activation', delayHrs: 2 },
    { ministry: 'Treasury', effect: 'Emergency contingency assessment', delayHrs: 6 },
    { ministry: 'National Coordination', effect: 'Air-corridor coordination brief', delayHrs: 4 },
  ],
  'fuel-convoy-attack': [
    { ministry: 'Interior', effect: 'Police & intelligence engaged', delayHrs: 0 },
    { ministry: 'Energy', effect: 'Fuel-distribution rerouting', delayHrs: 2 },
    { ministry: 'National Coordination', effect: 'Sovereign incident brief', delayHrs: 4 },
  ],
  'disaster-route-collapse': [
    { ministry: 'Emergency Operations', effect: 'Evacuation routing activated', delayHrs: 0 },
    { ministry: 'Health', effect: 'Medical surge & casualty triage', delayHrs: 1 },
    { ministry: 'Treasury', effect: 'Disaster contingency release', delayHrs: 6 },
    { ministry: 'Interior', effect: 'Regional stabilisation', delayHrs: 4 },
    { ministry: 'National Coordination', effect: 'National emergency brief', delayHrs: 4 },
  ],
  'highway-accident': [
    { ministry: 'Health', effect: 'Casualty response', delayHrs: 0 },
    { ministry: 'Interior', effect: 'Patrol & traffic control', delayHrs: 0 },
  ],
  'maritime-storm': [
    { ministry: 'Trade & Industry', effect: 'Shipping schedule rebuild', delayHrs: 8 },
    { ministry: 'Emergency Operations', effect: 'Coastal continuity posture', delayHrs: 4 },
  ],
};

const KIND_LIST: TransportIncidentKind[] = [
  'bridge-collapse', 'port-closure', 'rail-derailment', 'aviation-grounding',
  'fuel-convoy-attack', 'disaster-route-collapse', 'highway-accident', 'maritime-storm',
];

const CORRIDOR_DEFS: { name: string; mode: CorridorState['mode'] }[] = [
  { name: 'Northern trunk', mode: 'Road' },
  { name: 'Coastal export', mode: 'Maritime' },
  { name: 'Capital ring', mode: 'Road' },
  { name: 'Eastern freight', mode: 'Rail' },
  { name: 'Highland link', mode: 'Road' },
  { name: 'Western air corridor', mode: 'Aviation' },
  { name: 'Cross-border rail', mode: 'Rail' },
  { name: 'Southern maritime spine', mode: 'Maritime' },
];

function congestionOf(load: number): CorridorState['congestion'] {
  return load >= 120 ? 'collapse'
    : load >= 100 ? 'bottleneck'
      : load >= 80 ? 'heavy'
        : load >= 50 ? 'flowing' : 'free';
}

export function transportNetworkBoard(now: number): TransportNetworkBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const ts = epoch;
  const o = transportOps('national', ts);

  // 1. Corridors + regional congestion
  const corridors: CorridorState[] = CORRIDOR_DEFS.map((c, i) => {
    const k = `tn:cor:${c.name}`;
    const loadPct = Math.round(wave(`${k}:l`, epoch / 5, 28, 130));
    const throughputKt = Math.round(wave(`${k}:t`, epoch / 6, 8, 96) * 10) / 10;
    const congestion = congestionOf(loadPct);
    const stabilization: CorridorState['stabilization'] =
      congestion === 'collapse' ? 'emergency-corridor'
        : congestion === 'bottleneck' || congestion === 'heavy' ? 'rerouting' : 'nominal';
    const tone: Tone = loadPct >= 100 ? 'alert' : loadPct >= 80 ? 'warn' : 'ok';
    void i;
    return {
      id: `COR-${c.name.slice(0, 3).toUpperCase()}-${c.mode.slice(0, 3).toUpperCase()}`,
      name: c.name, mode: c.mode, loadPct, throughputKt, congestion, stabilization, tone,
    };
  }).sort((a, b) => b.loadPct - a.loadPct);

  const regionalCongestion = REGIONS.map(region => {
    const k = `tn:rg:${region}`;
    const congestionPct = Math.round(wave(`${k}:c`, epoch / 4, 20, 110));
    return {
      region, congestionPct,
      tone: (congestionPct >= 90 ? 'alert' : congestionPct >= 70 ? 'warn' : 'ok') as Tone,
    };
  }).sort((a, b) => b.congestionPct - a.congestionPct);

  const bottlenecks = corridors.filter(c => c.congestion === 'bottleneck' || c.congestion === 'collapse').length;
  const emergencyCorridorsActive = corridors.filter(c => c.stabilization === 'emergency-corridor').length;
  const averageLoadPct = Math.round(corridors.reduce((s, c) => s + c.loadPct, 0) / corridors.length);
  const nationalThroughputKt = Math.round(corridors.reduce((s, c) => s + c.throughputKt, 0) * 10) / 10;
  const posture: MobilityPosture =
    emergencyCorridorsActive >= 1 && bottlenecks >= 3 ? 'collapse-watch'
      : bottlenecks >= 3 || averageLoadPct >= 95 ? 'critical'
        : bottlenecks >= 1 || averageLoadPct >= 80 ? 'congested'
          : averageLoadPct >= 65 ? 'engaged' : 'flowing';

  const command: MobilityCommand = {
    posture, nationalThroughputKt, averageLoadPct, bottlenecks,
    emergencyCorridorsActive, corridors, regionalCongestion,
  };

  // 2. Ports
  const portNames: { name: string; region: string }[] = [
    { name: 'Capital Port', region: 'Capital District' },
    { name: 'Eastern Container Terminal', region: 'Eastern' },
    { name: 'Coastal Bulk Port', region: 'Coastal' },
    { name: 'Northern River Port', region: 'Northern' },
  ];
  const ports: PortState[] = portNames.map((p, i) => {
    const k = `tn:pt:${p.name}`;
    const berthOccupancyPct = Math.round(wave(`${k}:bo`, epoch / 5, 38, 96));
    const containersInYard = Math.round(wave(`${k}:cy`, epoch / 6, 1200, 18000));
    const customsTone: Tone = berthOccupancyPct > 88 ? 'alert' : berthOccupancyPct > 70 ? 'warn' : 'ok';
    const maritimeRoll = seed(`${k}:mr:${Math.floor(epoch / 7)}`);
    const maritimeRisk: PortState['maritimeRisk'] = maritimeRoll > 0.9 ? 'security' : maritimeRoll > 0.78 ? 'storm' : maritimeRoll > 0.55 ? 'advisory' : 'calm';
    void i;
    return {
      id: `PRT-${p.name.slice(0, 3).toUpperCase()}`,
      name: p.name, region: p.region, berthOccupancyPct, containersInYard,
      customsCoordination: customsTone,
      emergencyDiversion: maritimeRisk === 'storm' || maritimeRisk === 'security',
      maritimeRisk,
    };
  });

  // 3. Rail
  const railRoutes = ['Capital → Northern', 'Capital → Coastal', 'Eastern → Western', 'Highland → Capital'];
  const rail: RailCorridor[] = railRoutes.map((route, i) => {
    const k = `tn:rl:${route}`;
    const syncPct = Math.round(wave(`${k}:s`, epoch / 4, 62, 99));
    const freightKt = Math.round(wave(`${k}:f`, epoch / 5, 12, 78) * 10) / 10;
    const maintRoll = seed(`${k}:m:${Math.floor(epoch / 8)}`);
    const disruption: RailCorridor['disruption'] = maintRoll > 0.9 ? 'major' : maintRoll > 0.74 ? 'minor' : 'none';
    void i;
    return {
      id: `RL-${i + 1}`, route, syncPct, freightKt,
      maintenanceWindowHrs: 4 + Math.floor(seed(`${k}:mw`) * 18),
      disruption,
    };
  });

  // 4. Aviation hubs
  const hubs = ['Capital International', 'Northern Regional', 'Coastal Cargo Hub'];
  const aviation: AirHub[] = hubs.map((name, i) => {
    const k = `tn:av:${name}`;
    const movementsPerHr = Math.round(wave(`${k}:m`, epoch / 4, 18, 86));
    const airspaceStrain = Math.round(wave(`${k}:as`, epoch / 5, 22, 92));
    const wxRoll = seed(`${k}:wx:${Math.floor(epoch / 7)}`);
    const weatherImpact: AirHub['weatherImpact'] = wxRoll > 0.88 ? 'severe' : wxRoll > 0.65 ? 'caution' : 'clear';
    const cargoCapacityPct = Math.round(wave(`${k}:c`, epoch / 5, 35, 92));
    void i;
    return {
      id: `AV-${i + 1}`, name, movementsPerHr, airspaceStrain, weatherImpact, cargoCapacityPct,
      emergencyCorridor: weatherImpact === 'severe' || airspaceStrain > 85,
    };
  });

  // 5. Logistics lanes
  const laneDefs: { lane: string; cargoClass: LogisticsLane['cargoClass']; support: string[] }[] = [
    { lane: 'Capital → Northern food corridor', cargoClass: 'food', support: ['Trade & Industry'] },
    { lane: 'Coastal → Highland medical corridor', cargoClass: 'medical', support: ['Health'] },
    { lane: 'Capital → Coastal fuel corridor', cargoClass: 'fuel', support: ['Energy'] },
    { lane: 'Eastern industrial spine', cargoClass: 'industrial', support: ['Trade & Industry', 'Energy'] },
    { lane: 'National consumer distribution', cargoClass: 'consumer', support: ['Trade & Industry'] },
    { lane: 'Strategic reserve relay', cargoClass: 'strategic-reserve', support: ['Treasury', 'Energy'] },
  ];
  const logistics: LogisticsLane[] = laneDefs.map((l, i) => {
    const k = `tn:lg:${l.lane}`;
    const continuityPct = Math.round(wave(`${k}:c`, epoch / 5, 48, 96));
    const warehouseCoverDays = 4 + Math.floor(seed(`${k}:w`) * 36);
    const fi: Tone = continuityPct >= 80 ? 'ok' : continuityPct >= 60 ? 'warn' : 'alert';
    void i;
    return {
      id: `LN-${i + 1}`, lane: l.lane, cargoClass: l.cargoClass,
      continuityPct, warehouseCoverDays, freightIntelligence: fi,
      interMinistrySupport: l.support,
    };
  }).sort((a, b) => a.continuityPct - b.continuityPct);

  // 6. Infrastructure
  const assetDefs: { asset: string; type: InfraAsset['type'] }[] = [
    { asset: 'Capital North Bridge', type: 'Bridge' },
    { asset: 'Eastern Highland Tunnel', type: 'Tunnel' },
    { asset: 'Trunk Highway H1', type: 'Highway' },
    { asset: 'Capital Rail Junction', type: 'Rail junction' },
    { asset: 'Coastal Container Terminal', type: 'Port terminal' },
    { asset: 'Western Mountain Bridge', type: 'Bridge' },
  ];
  const infrastructure: InfraAsset[] = assetDefs.map((a, i) => {
    const k = `tn:if:${a.asset}`;
    const integrityPct = Math.round(wave(`${k}:i`, epoch / 9, 42, 96));
    const degradationRate = Math.round(wave(`${k}:d`, epoch / 12, 0, 4) * 10) / 10;
    void i;
    return {
      id: `IF-${i + 1}`, asset: a.asset, type: a.type, integrityPct, degradationRate,
      repairDispatched: integrityPct < 65,
      constructionCoordinated: integrityPct < 60,
    };
  }).sort((a, b) => a.integrityPct - b.integrityPct);

  // 7. Incidents
  const incidents: TransportIncident[] = Array.from({ length: 8 }, (_, i) => {
    const k = `tn:inc:${i}:${Math.floor(epoch / 4)}`;
    const kind = KIND_LIST[Math.floor(seed(`${k}:k`) * KIND_LIST.length)]!;
    const region = REGIONS[Math.floor(seed(`${k}:r`) * REGIONS.length)]!;
    const sevRoll = seed(`${k}:sv`);
    const severity: TransportIncident['severity'] = sevRoll > 0.92 ? 'national' : sevRoll > 0.76 ? 'critical' : sevRoll > 0.5 ? 'elevated' : 'advisory';
    const ageHrs = Math.round(wave(`${k}:age`, epoch / 6, 1, 72));
    const cascade = (PROPAGATION[kind] ?? []).map(c => ({
      ...c,
      status: (ageHrs < c.delayHrs ? 'pending' : ageHrs > c.delayHrs * 6 ? 'cleared' : 'engaged') as 'pending' | 'engaged' | 'cleared',
    }));
    const isDisaster = kind === 'disaster-route-collapse' || kind === 'bridge-collapse' || kind === 'rail-derailment';
    return {
      id: `TNI-${(2000 + Math.floor(seed(`${k}:id`) * 60000))}`,
      kind, region, severity, ageHrs,
      evacuationActive: kind === 'disaster-route-collapse' || (kind === 'bridge-collapse' && severity !== 'advisory'),
      rescueDispatched: isDisaster && severity !== 'advisory',
      ministryCascade: cascade,
      status: (
        ageHrs > 48 ? 'recovering'
          : kind === 'disaster-route-collapse' ? 'evacuating'
            : kind === 'bridge-collapse' || kind === 'port-closure' || kind === 'aviation-grounding' ? 'rerouting'
              : ageHrs > 24 ? 'contained' : 'open'
      ) as TransportIncident['status'],
    };
  }).sort((a, b) => {
    const sev = (s: TransportIncident['severity']) => s === 'national' ? 3 : s === 'critical' ? 2 : s === 'elevated' ? 1 : 0;
    return sev(b.severity) - sev(a.severity) || b.ageHrs - a.ageHrs;
  });

  // 8. Forecast
  const horizon = [4, 8, 12, 16, 20, 24];
  const forecast: MobilityForecast = {
    horizonHrs: horizon,
    congestionPct: horizon.map(h => Math.min(100, Math.round(wave(`tn:fc:c`, epoch / 4 + h * 0.08, averageLoadPct - 10, averageLoadPct + 20)))),
    weatherImpact: horizon.map(h => Math.round(wave(`tn:fc:w`, epoch / 5 + h * 0.1, 10, 80))),
    economicMobilityIdx: Math.round(o.networkAvailabilityPct * 0.7 + (100 - averageLoadPct) * 0.3),
    cascadingDisruptionRisk: Math.min(100, Math.round(bottlenecks * 14 + emergencyCorridorsActive * 22)),
    routeCollapseEtaHrs: posture === 'collapse-watch' ? 2 + Math.floor(seed(`tn:rc:eta:${epoch}`) * 10) : null,
    crisisRoutingReadiness: Math.max(0, Math.min(100, Math.round(100 - bottlenecks * 8 - emergencyCorridorsActive * 12))),
  };

  const systemBanner =
    posture === 'collapse-watch' ? 'ROUTE COLLAPSE WATCH — emergency corridors active'
      : posture === 'critical' ? 'MOBILITY CRITICAL — bottlenecks compounding'
        : posture === 'congested' ? 'NATIONAL CONGESTION — rerouting engaged'
          : posture === 'engaged' ? 'NETWORK ENGAGED'
            : 'NATIONAL CIRCULATION FLOWING';

  const ministries = new Map<string, number>();
  for (const inc of incidents) {
    for (const c of inc.ministryCascade) {
      if (c.status !== 'pending') ministries.set(c.ministry, (ministries.get(c.ministry) ?? 0) + 1);
    }
  }
  const ministriesEngaged = Array.from(ministries.entries())
    .map(([ministry, engaged]) => ({ ministry, engaged }))
    .sort((a, b) => b.engaged - a.engaged);

  return { epoch, command, ports, rail, aviation, logistics, infrastructure, incidents, forecast, systemBanner, ministriesEngaged };
}
