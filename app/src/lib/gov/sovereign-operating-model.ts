// Sovereign operating model — a pure, deterministic engine that makes the
// government behave like one interdependent national machine: finite shared
// resources under contention, cross-ministry failure cascades, institutional
// behavioural identity, staged response latency and forward forecasts.
//
// No React/DOM — unit-testable. Every command surface derives its numbers
// from this single model so the ecosystem stays mutually consistent.

import { seed, wave } from '@/lib/telemetry';

// Unified national operating cadence (ms). Every surface polls/animates on
// this rhythm so the ecosystem reads as one synchronized machine.
export const OP_TICK = 4000;

export type Resource =
  | 'logistics' | 'reserves' | 'telecom' | 'energy' | 'transport' | 'treasury' | 'responseUnits';

const RESOURCES: Resource[] = ['logistics', 'reserves', 'telecom', 'energy', 'transport', 'treasury', 'responseUnits'];

// ── 5. Ministry behavioural identity ──────────────────────────────────────
export interface Behavior {
  // authorization cadence multiplier (higher = slower to authorize)
  auth: number;
  // escalation aggression (higher = pushes through the pipeline faster)
  aggression: number;
  orientation: string;
  reserveSensitive: boolean;
}
const BEHAVIOR: Record<string, Behavior> = {
  FINANCE:     { auth: 2.4, aggression: 0.45, orientation: 'stabilization', reserveSensitive: true },
  TREASURY:    { auth: 2.4, aggression: 0.45, orientation: 'stabilization', reserveSensitive: true },
  EMERGENCY:   { auth: 0.5, aggression: 1.35, orientation: 'rapid-deployment', reserveSensitive: false },
  HEALTH:      { auth: 1.1, aggression: 0.8, orientation: 'load-balancing', reserveSensitive: false },
  TRANSPORT:   { auth: 1.0, aggression: 0.7, orientation: 'corridor-rerouting', reserveSensitive: false },
  ENERGY:      { auth: 1.1, aggression: 0.65, orientation: 'infrastructure-stability', reserveSensitive: false },
  TELECOM:     { auth: 0.9, aggression: 0.6, orientation: 'coordination-integrity', reserveSensitive: false },
  INTERIOR:    { auth: 0.8, aggression: 1.0, orientation: 'security-priority', reserveSensitive: false },
  JUSTICE:     { auth: 1.8, aggression: 0.5, orientation: 'due-process', reserveSensitive: false },
  AGRICULTURE: { auth: 1.3, aggression: 0.55, orientation: 'supply-continuity', reserveSensitive: false },
  TRADE:       { auth: 1.2, aggression: 0.6, orientation: 'throughput-protection', reserveSensitive: false },
  EDUCATION:   { auth: 1.5, aggression: 0.45, orientation: 'service-continuity', reserveSensitive: false },
  LABOR:       { auth: 1.4, aggression: 0.5, orientation: 'workforce-stability', reserveSensitive: false },
  ENVIRONMENT: { auth: 1.3, aggression: 0.6, orientation: 'hazard-containment', reserveSensitive: false },
};
export function ministryBehavior(arch: string): Behavior {
  return BEHAVIOR[arch] ?? { auth: 1.2, aggression: 0.6, orientation: 'containment', reserveSensitive: false };
}

// ── 1. Resource-contention engine ─────────────────────────────────────────
// Each ministry archetype draws weighted demand on the shared national
// pools. Pools are finite: utilisation is demand vs capacity, so a surge in
// one ministry visibly starves the others (dynamic operational tradeoffs).
const DRAW: Partial<Record<string, Partial<Record<Resource, number>>>> = {
  HEALTH:      { logistics: 0.9, responseUnits: 0.8, telecom: 0.4, treasury: 0.5 },
  EMERGENCY:   { responseUnits: 1.0, transport: 0.7, telecom: 0.6, reserves: 0.6 },
  ENERGY:      { energy: 1.0, telecom: 0.5, treasury: 0.4 },
  TRANSPORT:   { transport: 1.0, logistics: 0.8, energy: 0.4 },
  FINANCE:     { treasury: 1.0, reserves: 0.9 },
  INTERIOR:    { responseUnits: 0.7, telecom: 0.5, transport: 0.5 },
  TELECOM:     { telecom: 1.0, energy: 0.4 },
  AGRICULTURE: { logistics: 0.6, transport: 0.5, treasury: 0.3 },
  TRADE:       { transport: 0.6, treasury: 0.5, logistics: 0.5 },
};

export interface ResourceState { util: number; headroom: number; tone: 'ok' | 'warn' | 'alert'; }
export interface OperatingState {
  resources: Record<Resource, ResourceState>;
  contention: number;                // 0..100 aggregate scarcity
  display: {
    gridLoad: number; logiThru: number; telecom: number; reserves: number; coordBw: number;
  };
}

const tone = (util: number): 'ok' | 'warn' | 'alert' =>
  (util >= 86 ? 'alert' : util >= 70 ? 'warn' : 'ok');

// aggP/peakP 0..100, sevLoad = # severe incidents, epoch = operating epoch.
export function nationalOperatingState(
  ts: number, aggP: number, peakP: number, sevLoad: number, incidentN: number, epoch: number,
): OperatingState {
  // base + crisis-driven demand on each pool, with finite capacity = 100.
  const dem: Record<Resource, number> = {
    logistics:     38 + aggP * 0.5 + sevLoad * 6 + wave('som:logi', ts, 0, 9),
    reserves:      26 + sevLoad * 8 + (epoch % 9) * 1.4 + wave('som:res', ts, 0, 6),
    telecom:       30 + peakP * 0.42 + incidentN * 2.4 + wave('som:tel', ts, 0, 7),
    energy:        40 + aggP * 0.46 + wave('som:en', ts, 0, 9),
    transport:     34 + peakP * 0.4 + sevLoad * 5 + wave('som:tr', ts, 0, 8),
    treasury:      30 + sevLoad * 6 + (epoch % 7) * 1.2 + wave('som:tre', ts, 0, 6),
    responseUnits: 28 + peakP * 0.5 + incidentN * 3 + wave('som:ru', ts, 0, 8),
  };
  const resources = {} as Record<Resource, ResourceState>;
  let sum = 0;
  for (const r of RESOURCES) {
    const util = Math.max(4, Math.min(99, Math.round(dem[r])));
    resources[r] = { util, headroom: 100 - util, tone: tone(util) };
    sum += util;
  }
  const contention = Math.round(sum / RESOURCES.length);
  // Display channels are projections of the same pools so the substrate
  // strip and per-incident strain stay mutually consistent.
  return {
    resources, contention,
    display: {
      gridLoad: resources.energy.util,
      logiThru: Math.max(120, Math.round(900 - resources.logistics.util * 6.4 - resources.transport.util * 1.6)),
      telecom: Math.max(70, Math.round(100 - resources.telecom.util * 0.34)),
      reserves: resources.reserves.headroom,
      coordBw: Math.max(32, Math.round(100 - resources.telecom.util * 0.4 - contention * 0.3)),
    },
  };
}

// Per-ministry draw on a pool — used to attribute contention to a ministry.
export function ministryDraw(arch: string, r: Resource): number {
  return DRAW[arch]?.[r] ?? 0;
}

// ── 3. Failure-cascade physics ────────────────────────────────────────────
// Directed dependency edges: a stressed ministry propagates a named
// operational consequence downstream. depth grows with severity.
const CASCADE: Record<string, { to: string; effect: string }[]> = {
  ENERGY:      [{ to: 'TELECOM', effect: 'telecom degradation' }, { to: 'HEALTH', effect: 'hospital capacity reduction' }, { to: 'EMERGENCY', effect: 'response slowdown' }],
  TELECOM:     [{ to: 'INTERIOR', effect: 'coordination confidence loss' }, { to: 'EMERGENCY', effect: 'dispatch latency' }],
  HEALTH:      [{ to: 'TRANSPORT', effect: 'medical-supply rerouting' }, { to: 'LABOR', effect: 'workforce absorption' }],
  TRANSPORT:   [{ to: 'HEALTH', effect: 'supply delay' }, { to: 'TRADE', effect: 'throughput contraction' }],
  FINANCE:     [{ to: 'ENERGY', effect: 'reserve contraction' }, { to: 'EMERGENCY', effect: 'delayed deployment' }],
  ENVIRONMENT: [{ to: 'TRANSPORT', effect: 'road congestion' }, { to: 'HEALTH', effect: 'medical-supply delay' }],
  INTERIOR:    [{ to: 'JUSTICE', effect: 'custody backlog' }],
  AGRICULTURE: [{ to: 'TRADE', effect: 'export contraction' }, { to: 'LABOR', effect: 'rural employment shock' }],
};
export interface Cascade { hops: string[]; effect: string; depth: number; }
export function cascadeChain(arch: string, sev: number): Cascade {
  const maxDepth = sev >= 3 ? 3 : sev >= 2 ? 2 : 1;
  const hops: string[] = [arch];
  let cur = arch, effect = 'localized strain';
  for (let d = 0; d < maxDepth; d++) {
    const next = CASCADE[cur]?.[0];
    if (!next || hops.includes(next.to)) break;
    hops.push(next.to);
    effect = next.effect;
    cur = next.to;
  }
  return { hops, effect, depth: hops.length - 1 };
}

// ── 4. Operational memory ─────────────────────────────────────────────────
// State accumulates: corridor fatigue and ministry reliability drift over
// operating epochs rather than resetting each tick.
export function corridorFatigue(id: string, epoch: number): number {
  let acc = 0;
  for (let e = Math.max(0, epoch - 8); e <= epoch; e++) acc += seed(`fatigue:${id}:${e}`) * 14;
  return Math.min(100, Math.round(acc));
}
export function ministryReliability(arch: string, epoch: number): number {
  const b = ministryBehavior(arch);
  let breaches = 0;
  for (let e = Math.max(0, epoch - 10); e <= epoch; e++) {
    if (seed(`breach:${arch}:${e}`) > 0.62 + b.aggression * 0.06) breaches++;
  }
  return Math.max(48, Math.min(99, Math.round(99 - breaches * 4.5)));
}

// ── 2. Response latency + authorization delay ─────────────────────────────
// Staged institutional response. Timing varies with severity, ministry
// behaviour, national load, telecom integrity and reserve availability.
export interface LatencyStage { k: string; min: number; }
export function responseLatency(
  arch: string, sev: number, load: number, telecom: number, reservesHeadroom: number,
): { stages: LatencyStage[]; totalMin: number } {
  const b = ministryBehavior(arch);
  const sevK = sev >= 3 ? 0.6 : sev >= 2 ? 1.0 : 1.7;          // criticals move faster
  const loadK = 1 + load / 140;                                 // congestion drag
  const telK = 1 + (100 - telecom) / 120;                       // poor comms = lag
  const resK = 1 + (100 - reservesHeadroom) / 150;              // thin reserves = staging delay
  const base = sevK * loadK * telK;
  const stages: LatencyStage[] = [
    { k: 'ACK', min: Math.round(2 * base * (0.6 + b.auth * 0.3)) },
    { k: 'AUTH', min: Math.round(6 * base * b.auth) },
    { k: 'DISPATCH', min: Math.round(7 * base * resK / Math.max(0.6, b.aggression)) },
    { k: 'ACTIVE', min: Math.round(9 * base / Math.max(0.6, b.aggression)) },
    { k: 'STABILIZE', min: Math.round(14 * base * resK) },
  ];
  const totalMin = stages.reduce((s, x) => s + x.min, 0);
  return { stages, totalMin };
}

// ── 6. Strategic forecasting ──────────────────────────────────────────────
// Forward projection of a metric using its own trend gradient — proactive
// 24h / 72h outlook with an exhaustion estimate.
export interface Forecast { h24: number; h72: number; risk: 'ok' | 'warn' | 'alert'; exhaustMin: number | null; }
export function forecast(
  key: string, current: number, ts: number, goodHigh: boolean,
): Forecast {
  const prev = wave(key, ts - 6, 0, 100);
  const grad = current - prev;                                  // per ~6 ticks
  const h24 = Math.max(0, Math.min(100, Math.round(current + grad * 4)));
  const h72 = Math.max(0, Math.min(100, Math.round(current + grad * 12)));
  const proj = goodHigh ? Math.min(h24, h72) : Math.max(h24, h72);
  const risk: 'ok' | 'warn' | 'alert' = goodHigh
    ? (proj <= 35 ? 'alert' : proj <= 55 ? 'warn' : 'ok')
    : (proj >= 80 ? 'alert' : proj >= 62 ? 'warn' : 'ok');
  let exhaustMin: number | null = null;
  if (goodHigh && grad < -0.1) exhaustMin = Math.round((current / -grad) * 6 * 4);
  return { h24, h72, risk, exhaustMin };
}

// ── 4b. Territorial pressure doctrine ─────────────────────────────────────
// One shared territorial law so every map-bearing surface diffuses, cools
// and clusters identically (no isolated per-surface noise).

// Decayed crisis memory for a region — recent epochs keep a zone warm so
// recovery is gradual and stabilization never resets the territory.
export function provinceMemory(i: number, epoch: number, cap = 58, decay = 7.5): number {
  let acc = 0;
  for (let e = Math.max(0, epoch - 6); e <= epoch; e++) {
    acc += seed(`prov:${i}:${e}`) * 30 * (e === epoch ? 1 : 1 - (epoch - e) / decay);
  }
  return Math.min(cap, acc);
}

// Propagate raw strain along an infrastructure adjacency (corridor topology)
// — each region inherits a partial share of its connected neighbours.
export function diffuseTopology(raw: number[], adjacency: number[][], inherit = 0.22): number[] {
  return raw.map((v, i) => {
    const ns = adjacency[i] ?? [];
    const inh = ns.length ? ns.reduce((s, j) => s + (raw[j] ?? 0), 0) / ns.length : 0;
    return v * (1 - inherit) + inh * inherit;
  });
}

// Deterministic territorial field for prop-less surfaces (heatmaps): a
// national contention floor + crisis memory, propagated through topology
// and floored to memory so crisis zones stay warm after containment.
export function territorialField(epoch: number, adjacency: number[][], n: number): number[] {
  const aggP = 28 + seed(`natagg:${epoch}`) * 52;
  const peakP = Math.min(99, aggP + 14 + seed(`natpk:${epoch}`) * 24);
  const sev = Math.floor(seed(`natsev:${epoch}`) * 5);
  const st = nationalOperatingState(epoch, aggP, peakP, sev, sev + 1, epoch);
  const raw = Array.from({ length: n }).map((_, i) =>
    20 + seed(`prov:${i}:${epoch}`) * 34 + st.contention * 0.3 + provinceMemory(i, epoch) * 0.6);
  const diff = diffuseTopology(raw, adjacency);
  return diff.map((v, i) =>
    Math.max(2, Math.min(99, Math.round(Math.max(v, provinceMemory(i, epoch) * 0.9)))));
}

// Build an undirected adjacency list from corridor edges (province indices).
export function corridorAdjacency(edges: [number, number][], n: number): number[][] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) { adj[a]?.push(b); adj[b]?.push(a); }
  return adj;
}

// ── Executive command doctrine ────────────────────────────────────────────
// How a crisis is *governed*: the institutional gate it sits behind,
// command velocity (severity accelerates, bureaucracy & contention drag),
// the authority chain that owns it, and the live prioritization conflict.

export const GOV_STAGES = [
  'REGIONAL ACK', 'MINISTRY ESCALATION', 'CABINET REVIEW', 'EXECUTIVE AUTHORIZATION',
  'SOVEREIGN DIRECTIVE', 'OPERATIONAL DEPLOYMENT', 'STABILIZATION OVERSIGHT', 'RECOVERY SUPERVISION',
] as const;

// >1 = faster than baseline. Severity accelerates command velocity;
// bureaucratic authorization cadence and national contention slow it.
export function commandVelocity(sev: number, behAuth: number, contention: number): number {
  const sevK = sev >= 3 ? 2.2 : sev >= 2 ? 1.3 : 0.7;
  return Math.max(0.25, sevK / (behAuth * (1 + contention / 180)));
}

export interface GovGate { idx: number; stage: string; held: boolean; }
export function executiveGate(
  sev: number, ageM: number, ack: boolean, behAuth: number, contention: number,
): GovGate {
  const v = commandVelocity(sev, behAuth, contention);
  let idx = Math.floor((ageM / 9) * v);
  // executive review gate — unacknowledged crises cannot pass CABINET REVIEW
  if (!ack) idx = Math.min(idx, 2);
  // governmental inertia — low-severity events drag through governance layers
  if (sev <= 1) idx = Math.min(idx, 5);
  idx = Math.max(0, Math.min(7, idx));
  const held = (!ack && idx === 2) || (sev <= 1 && idx === 5);
  return { idx, stage: GOV_STAGES[idx]!, held };
}

// Who governs whom — escalation ownership inherits up the command chain
// with severity (regional → cabinet → executive → sovereign).
export function authorityChain(arch: string, sev: number): string[] {
  const chain = [`${arch} lead`, 'Cabinet'];
  if (sev >= 2) chain.push('Executive');
  if (sev >= 3) chain.push('Sovereign');
  return chain;
}

// Live prioritization conflict — the institution contending with this
// ministry for executive authorization / national resources.
const CONFLICT: Record<string, string> = {
  HEALTH: 'Treasury resists deployment cost',
  EMERGENCY: 'Treasury resists emergency-deployment cost',
  ENERGY: 'Civilian recovery delayed for grid stabilization',
  TRANSPORT: 'Containment policy conflicts with rerouting',
  FINANCE: 'Reserve draw contested by Emergency',
  TELECOM: 'Restoration competes with reserve bandwidth',
  INTERIOR: 'Civil-stability priority contests logistics',
  AGRICULTURE: 'Supply continuity contests transport allocation',
  TRADE: 'Throughput protection contests containment',
  JUSTICE: 'Custody capacity contests interior tempo',
  EDUCATION: 'Service continuity contests budget reallocation',
  LABOR: 'Workforce stability contests fiscal exposure',
  ENVIRONMENT: 'Hazard containment contests economic activity',
};
export function priorityConflict(arch: string, contention: number): { text: string; tense: boolean } {
  return { text: CONFLICT[arch] ?? 'Cross-ministry authorization contention', tense: contention >= 60 };
}

// ── Unified executive doctrine ────────────────────────────────────────────
// The single governing model. Every panel renders this output rather than
// scripting its own escalation behaviour, so governance is centrally
// derived, not panel-local.

// Cross-ministry causality — upstream stressors, downstream strain and the
// plain operational consequence (explainable escalation narrative).
export const NATL_DEP: Record<string, { up: string[]; down: string[]; effect: string }> = {
  HEALTH: { up: ['ENERGY', 'TRANSPORT'], down: ['INTERIOR', 'LABOR'], effect: 'care capacity erosion → civil-stability strain' },
  ENERGY: { up: ['FINANCE'], down: ['HEALTH', 'TRANSPORT', 'INTERIOR'], effect: 'grid load → hospital & corridor degradation' },
  TRANSPORT: { up: ['ENERGY'], down: ['HEALTH', 'TRADE', 'AGRICULTURE'], effect: 'corridor disruption → supply & care delay' },
  FINANCE: { up: [], down: ['ENERGY', 'TRADE', 'LABOR', 'EDUCATION'], effect: 'liquidity stress → cross-sector funding shortfall' },
  AGRICULTURE: { up: ['ENERGY', 'TRANSPORT'], down: ['TRADE', 'LABOR'], effect: 'yield/logistics loss → food-security pressure' },
  TRADE: { up: ['FINANCE', 'TRANSPORT'], down: ['LABOR'], effect: 'throughput contraction → revenue & employment drag' },
  INTERIOR: { up: ['ENERGY'], down: ['JUSTICE'], effect: 'security load → judicial backlog escalation' },
  JUSTICE: { up: ['INTERIOR'], down: [], effect: 'case surge → custody & due-process strain' },
  EDUCATION: { up: ['FINANCE'], down: ['LABOR'], effect: 'service interruption → workforce-pipeline risk' },
  LABOR: { up: ['FINANCE'], down: [], effect: 'employment shock → social-cohesion pressure' },
  ENVIRONMENT: { up: ['ENERGY'], down: ['HEALTH', 'AGRICULTURE'], effect: 'environmental hazard → public-health & yield impact' },
};
export function depChain(arch: string): { up: string[]; down: string[]; effect: string } {
  return NATL_DEP[arch] ?? { up: [], down: [], effect: 'localized operational strain' };
}

// Sovereign decision pipeline — the procedural spine every crisis moves
// through. Stage is derived from severity, age and acknowledgement.
export const PIPELINE = [
  'DETECTED', 'VERIFIED', 'ESCALATED', 'CABINET REVIEW', 'RESPONSE AUTHORIZED',
  'FIELD EXECUTION', 'CONTAINMENT', 'STABILIZATION', 'RECOVERY',
] as const;
export function pipeStage(lvl: number, ageM: number, ack: boolean): number {
  const speed = lvl >= 3 ? 1.6 : lvl === 2 ? 1.05 : 0.7;
  let idx = Math.floor((ageM / 9) * speed);
  if (!ack) idx = Math.min(idx, 3);       // authorization gate holds until acknowledged
  if (lvl === 1) idx = Math.min(idx, 6);  // routine crises resolved at containment level
  return Math.max(0, Math.min(8, idx));
}
export function responseMachinery(idx: number): string {
  return idx <= 1 ? 'Signal verification · triage in progress'
    : idx === 2 ? 'Cross-ministry coordination bridge opened'
    : idx === 3 ? 'Cabinet escalation pending · authorization gate'
    : idx === 4 ? 'Intervention authorized · reserves unlocked'
    : idx === 5 ? 'Field execution · resource rerouting active'
    : idx === 6 ? 'Containment active · ministry synchronization'
    : idx === 7 ? 'Stabilization · load normalization'
    : 'Recovery · resilience restoration';
}
export function mandateFor(lvl: number): string {
  return lvl >= 3 ? 'SOVEREIGN OVERRIDE' : lvl === 2 ? 'CABINET MANDATE' : 'MINISTRY MANDATE';
}

export type Sev = 'sev1' | 'sev2' | 'sev3' | 'sev4';
export interface GovInput {
  archetype: string;
  severity: Sev | number;
  ageM: number;
  ack: boolean;
  epoch: number;
  ministryId: string;
  prop: number;
  contention: number;
  telecom: number;
  reservesHeadroom: number;
  transportUtil?: number;    // corridor saturation (defaults to contention)
  posture?: NationalPosture; // shared strategic doctrine (derived if absent)
}
export interface IncidentGovernance {
  lvl: number;
  arch: string;
  behavior: Behavior;
  reliability: number;
  cause: string;
  dep: { up: string[]; down: string[]; effect: string };
  cascade: Cascade;
  latencyMin: number;
  eta: string;
  pIdx: number;
  stageCur: string;
  stageNext: string;
  machinery: string;
  stTone: string;
  mandate: string;
  gate: GovGate;
  authority: string[];
  conflict: { text: string; tense: boolean };
  velocity: number;
  wear: number;
  aged: boolean;
  wornDot: boolean;
  strain: number;
  strainTone: 'ok' | 'warn' | 'alert';
  fragile: boolean;
  // ── command cognition ──
  attention: number;     // executive attention weight 0..100
  fatigue: number;       // institutional exhaustion 0..100
  confidence: number;    // command confidence in the picture 0..100
  confLabel: string;     // verified | probable | uncertain | contested
  burden: number;        // cross-ministry coordination burden 0..100
  // ── national field operations ──
  field: FieldOps;
}

export interface FieldOps {
  fIdx: number;          // -1 = pre-authorization
  stage: string;         // field execution stage
  region: string;        // territorial theatre
  velocity: number;      // 0..100 execution velocity (regional)
  friction: string;      // nominal | staging backlog | corridor congestion | deployment delay
  frictionTone: 'ok' | 'warn' | 'alert' | 'neutral';
  eta: string;           // ETA to next field stage
  relapse: boolean;      // fragile stabilization at risk of relapse
}

// ── Command cognition & operator psychology ───────────────────────────────
// The system reasons under finite executive attention, institutional
// fatigue, probabilistic confidence and coordination cost — it triages a
// nation, it is not omniscient.

// Sustained pressure accumulates institutional exhaustion; calm epochs
// relieve it slowly (recovery restores capability gradually, not instantly).
export function institutionalFatigue(arch: string, epoch: number): number {
  let acc = 0;
  for (let e = Math.max(0, epoch - 9); e <= epoch; e++) {
    const stress = seed(`fatig:${arch}:${e}`);
    acc += stress > 0.5 ? (stress - 0.5) * 26 : -3;
  }
  return Math.max(0, Math.min(100, Math.round(acc)));
}

// Executive attention weight — severity, cascade reach, multi-ministry
// dependency, unresolved-chain age and national contention all compete.
export function attentionWeight(
  lvl: number, cascadeDepth: number, depDown: number, ageM: number, ack: boolean, contention: number,
): number {
  const sev = lvl * 22;
  const casc = cascadeDepth * 12;
  const dep = Math.min(18, depDown * 6);
  const unresolved = (!ack ? 10 : 0) + Math.min(16, ageM * 0.25);
  const nat = contention * 0.18;
  return Math.max(0, Math.min(100, Math.round(sev + casc + dep + unresolved + nat)));
}

// Probabilistic command confidence — degraded by unacknowledged reports,
// telecom loss, contention, institutional fatigue and incident age.
export function commandConfidence(
  ack: boolean, ageM: number, telecom: number, contention: number, fatigue: number,
): { pct: number; label: string } {
  let c = 92;
  if (!ack) c -= 18;
  c -= (100 - telecom) * 0.5;
  c -= contention * 0.18;
  c -= fatigue * 0.12;
  c -= Math.min(14, ageM * 0.18);
  const pct = Math.max(20, Math.min(99, Math.round(c)));
  const label = pct >= 85 ? 'verified' : pct >= 68 ? 'probable' : pct >= 48 ? 'uncertain' : 'contested';
  return { pct, label };
}

// Coordination burden — more ministries, weaker telecom and higher
// contention make an operation harder to govern at scale.
export function coordinationBurden(cascadeDepth: number, telecom: number, contention: number): number {
  return Math.max(0, Math.min(100, Math.round(
    cascadeDepth * 18 + (100 - telecom) * 0.42 + contention * 0.34)));
}

// ── Geopolitical & external pressure ──────────────────────────────────────
// No sovereign operates in isolation. The external environment is integrated
// over a long horizon of geopolitical memory (regional instability, foreign
// telecom failures, sanctions, alliance reliability, cross-border
// disruption) and bends national doctrine accordingly.
export interface ExternalEnvironment {
  externalPressure: number;    // 0..100 aggregate external strain
  foreignDependency: number;   // 0..100 import/energy/logistics reliance
  allianceReliability: number; // 0..100 partner dependability
  intlCoordLoad: number;       // 0..100 treaty/diplomatic coordination drag
  reserveSensitivity: number;  // 0..100 sanctions-scarred reserve caution
  strategicCaution: number;    // 0..100 externally-imposed caution
  label: string;               // STABLE NEIGHBOURHOOD | PRESSURED | CONTESTED | HOSTILE
}
export function externalEnvironment(epoch: number): ExternalEnvironment {
  const H = 14;
  let regionInstab = 0, foreignTel = 0, sanctions = 0, allianceFail = 0,
    crossBorder = 0, market = 0, n = 0;
  for (let e = Math.max(0, epoch - H); e <= epoch; e++) {
    const decay = 1 - (epoch - e) / (H + 4);
    regionInstab += (seed(`ext:reg:${e}`) > 0.58 ? 1 : 0) * decay;
    foreignTel += (seed(`ext:tel:${e}`) > 0.64 ? 1 : 0) * decay;
    sanctions += (seed(`ext:san:${e}`) > 0.7 ? 1 : 0) * decay;
    allianceFail += (seed(`ext:ally:${e}`) > 0.66 ? 1 : 0) * decay;
    crossBorder += (seed(`ext:xb:${e}`) > 0.6 ? 1 : 0) * decay;
    market += seed(`ext:mkt:${e}`) * decay;
    n += decay;
  }
  const norm = (v: number) => Math.max(0, Math.min(100, Math.round((v / Math.max(1, n)) * 100)));
  // foreign dependency is partly structural (a fixed national exposure)
  // plus accumulated cross-border reliance.
  const foreignDependency = Math.max(0, Math.min(100, Math.round(
    28 + seed('ext:struct') * 34 + norm(crossBorder) * 0.4)));
  const allianceReliability = Math.max(10, Math.min(98, Math.round(85 - norm(allianceFail) * 0.7)));
  const reserveSensitivity = Math.max(0, Math.min(100, Math.round(
    norm(sanctions) * 0.6 + norm(market) * 0.4)));
  const intlCoordLoad = Math.max(0, Math.min(100, Math.round(
    norm(crossBorder) * 0.4 + norm(regionInstab) * 0.3 + (100 - allianceReliability) * 0.3)));
  const externalPressure = Math.max(0, Math.min(100, Math.round(
    norm(regionInstab) * 0.28 + norm(foreignTel) * 0.18 + norm(sanctions) * 0.2
    + norm(crossBorder) * 0.18 + norm(market) * 0.16)));
  const strategicCaution = Math.max(0, Math.min(100, Math.round(
    externalPressure * 0.5 + reserveSensitivity * 0.3 + (100 - allianceReliability) * 0.2)));
  const label = externalPressure >= 66 ? 'HOSTILE'
    : externalPressure >= 46 ? 'CONTESTED'
    : externalPressure >= 28 ? 'PRESSURED'
    : 'STABLE NEIGHBOURHOOD';
  return {
    externalPressure, foreignDependency, allianceReliability, intlCoordLoad,
    reserveSensitivity, strategicCaution, label,
  };
}

// ── Strategic evolution & doctrine drift ──────────────────────────────────
// The nation is a geopolitical organism: long-running history bends
// executive doctrine over time. Posture is integrated over a long horizon
// of operating epochs, not the current tick — it remembers and adapts.
export interface NationalPosture {
  authThreshold: number;          // >1 slower to authorize (conservative), <1 faster
  deploymentConservatism: number; // 0..100 reserve-protective
  containmentWeight: number;      // 0..100 prioritise containment
  stabilizationCaution: number;   // 0..100 distrust of fragile recovery
  execConfidence: number;         // 0..100 institutional confidence
  coordinationCaution: number;    // 0..100 telecom-failure scarring
  geopolitical: number;           // 0..100 external-pressure sensitivity
  label: string;
}
export function nationalPosture(epoch: number): NationalPosture {
  const H = 16; // long-horizon strategic memory window (epochs)
  let telecomFail = 0, energyStrain = 0, reserveDepl = 0, containFail = 0,
    recoverWin = 0, unrest = 0, external = 0, n = 0;
  for (let e = Math.max(0, epoch - H); e <= epoch; e++) {
    const decay = 1 - (epoch - e) / (H + 4); // recent epochs weigh more
    telecomFail += (seed(`hist:tel:${e}`) > 0.62 ? 1 : 0) * decay;
    energyStrain += (seed(`hist:en:${e}`) > 0.58 ? 1 : 0) * decay;
    reserveDepl += seed(`hist:res:${e}`) * decay;
    containFail += (seed(`hist:cont:${e}`) > 0.66 ? 1 : 0) * decay;
    recoverWin += (seed(`hist:rec:${e}`) > 0.55 ? 1 : 0) * decay;
    unrest += (seed(`hist:civ:${e}`) > 0.6 ? 1 : 0) * decay;
    external += seed(`hist:geo:${e}`) * decay;
    n += decay;
  }
  const norm = (v: number) => Math.max(0, Math.min(100, Math.round((v / Math.max(1, n)) * 100)));
  // External environment bends doctrine — the nation is geopolitically
  // situated, not isolated.
  const ext = externalEnvironment(epoch);
  const deploymentConservatism = Math.min(100, Math.round(norm(reserveDepl * 1.1) * 0.78 + ext.reserveSensitivity * 0.22));
  const containmentWeight = norm(unrest);
  const coordinationCaution = norm(telecomFail);
  const stabilizationCaution = norm(containFail);
  const geopolitical = Math.min(100, Math.round(norm(external) * 0.5 + ext.externalPressure * 0.5));
  // confidence: successful recoveries build it, containment failures erode
  // it, fragile alliances temper it
  const execConfidence = Math.max(15, Math.min(95, Math.round(
    60 + norm(recoverWin) * 0.4 - norm(containFail) * 0.45 - norm(energyStrain) * 0.15
    - (100 - ext.allianceReliability) * 0.1)));
  // doctrine drift: chronic severity accelerates authorization, but exhausted
  // reserves, low confidence & external strategic caution make it conservative
  const authThreshold = Math.max(0.55, Math.min(1.7, Number((
    1 + deploymentConservatism / 220 + (100 - execConfidence) / 260 - containmentWeight / 320
    + ext.strategicCaution / 480
  ).toFixed(3))));
  const label = execConfidence < 35 ? 'STRAINED'
    : deploymentConservatism >= 60 ? 'CONSERVATIVE'
    : containmentWeight >= 60 ? 'HARDENED'
    : stabilizationCaution >= 55 ? 'CAUTIOUS-RECOVERY'
    : execConfidence >= 75 ? 'ADAPTIVE-STABLE'
    : 'BALANCED';
  return {
    authThreshold, deploymentConservatism, containmentWeight, stabilizationCaution,
    execConfidence, coordinationCaution, geopolitical, label,
  };
}

// ── Inter-ministerial governance operations ───────────────────────────────
// Ministries are competing & cooperating institutions, not isolated feeds.
// Each carries a standing institutional ask of a counterpart; the
// counterpart's stance is its own behavioural culture under live pressure,
// posture and contention — concurrence, delay or resistance.

interface MinistryAsk { ask: string; from: string; }
const MINISTRY_ASK: Record<string, MinistryAsk> = {
  HEALTH:      { ask: 'emergency logistics allocation', from: 'TRANSPORT' },
  EMERGENCY:   { ask: 'deployment-priority authorization', from: 'FINANCE' },
  TRANSPORT:   { ask: 'corridor-closure relief', from: 'INTERIOR' },
  ENERGY:      { ask: 'grid-stabilization funding window', from: 'FINANCE' },
  TELECOM:     { ask: 'coordination bandwidth restoration', from: 'ENERGY' },
  INTERIOR:    { ask: 'containment deployment priority', from: 'EMERGENCY' },
  FINANCE:     { ask: 'reserve-preservation concurrence', from: 'INTERIOR' },
  AGRICULTURE: { ask: 'supply-corridor protection', from: 'TRANSPORT' },
  TRADE:       { ask: 'throughput-continuity guarantee', from: 'TRANSPORT' },
  JUSTICE:     { ask: 'custody-capacity relief', from: 'INTERIOR' },
  EDUCATION:   { ask: 'service-continuity funding', from: 'FINANCE' },
  LABOR:       { ask: 'workforce-stabilization support', from: 'FINANCE' },
  ENVIRONMENT: { ask: 'hazard-containment logistics', from: 'TRANSPORT' },
};

export interface MinistryInteraction {
  ask: string;
  counterpart: string;
  stance: string;          // concurred | conditional | delayed | resisted
  stanceTone: 'ok' | 'warn' | 'alert' | 'neutral';
  aligned: boolean;
}
// The counterpart answers from its own institutional culture: a
// conservative / fatigued / contended counterpart delays or resists.
export function ministryInteraction(
  arch: string, pressure: number, opS: OperatingState, post: NationalPosture, epoch: number,
): MinistryInteraction {
  const a = MINISTRY_ASK[arch] ?? { ask: 'cross-ministry concurrence', from: 'FINANCE' };
  const cb = ministryBehavior(a.from);
  const cFatigue = institutionalFatigue(a.from, epoch);
  // friction rises with the counterpart's conservatism, fatigue, national
  // contention, conservative posture and the asking ministry's pressure.
  let friction = cb.auth * 16 + cFatigue * 0.3 + opS.contention * 0.28
    + post.deploymentConservatism * 0.16 + pressure * 0.12;
  if (cb.reserveSensitive && opS.resources.reserves.headroom < 45) friction += 18;
  if (a.from === 'TRANSPORT' && opS.resources.transport.util >= 75) friction += 12;
  if (a.from === 'ENERGY' && opS.resources.energy.util >= 80) friction += 12;
  friction -= post.execConfidence * 0.12;
  const f = Math.round(friction);
  const stance = f >= 78 ? 'resisted' : f >= 56 ? 'delayed' : f >= 38 ? 'conditional' : 'concurred';
  const stanceTone = f >= 78 ? 'alert' : f >= 56 ? 'warn' : f >= 38 ? 'neutral' : 'ok';
  return { ask: a.ask, counterpart: a.from, stance, stanceTone, aligned: f < 38 };
}

// National coordination load — how hard the state is to synchronize right
// now: active institutions, telecom integrity, executive-review burden and
// institutional fatigue all add cabinet bandwidth strain.
export function coordinationLoad(
  activeMinistries: number, opS: OperatingState, post: NationalPosture, heldGates: number,
): number {
  return Math.max(0, Math.min(100, Math.round(
    activeMinistries * 5
    + (100 - opS.display.telecom) * 0.5
    + opS.contention * 0.25
    + heldGates * 6
    + (100 - post.execConfidence) * 0.15)));
}

// ── National field operations ─────────────────────────────────────────────
// Authorized decisions propagate into real territorial execution: a
// deployment pipeline that trails the decision pipeline, runs at a
// region-specific velocity (infrastructure, telecom, corridor saturation,
// fatigue, reserves, distance) under operational friction, and recovers
// gradually with relapse risk under strategic strain.
export const FIELD_STAGES = [
  'AUTHORIZATION', 'STAGING', 'MOBILIZATION', 'REGIONAL DEPLOYMENT',
  'ACTIVE STABILIZATION', 'INFRASTRUCTURE RECOVERY', 'OPERATIONAL SUPERVISION', 'NORMALIZATION',
] as const;
const FIELD_REGIONS = [
  'Capital District', 'Northern Province', 'Highland Region',
  'Eastern Region', 'Western Region', 'Coastal Region',
] as const;

export function fieldDeployment(
  ministryId: string, pIdx: number, lvl: number,
  telecom: number, transportUtil: number, reservesHeadroom: number, contention: number,
  post: NationalPosture, fatigue: number, epoch: number,
): FieldOps {
  const region = FIELD_REGIONS[Math.floor(seed(`fr:${ministryId}:${epoch}`) * FIELD_REGIONS.length)]
    ?? FIELD_REGIONS[0]!;
  // Regional execution variance — distance + infrastructure quality are
  // per-region structural; telecom / corridor / reserves / fatigue are live.
  const distance = seed(`fdist:${ministryId}`) * 26;          // 0..26 drag
  const infraQuality = 40 + seed(`finfra:${region}`) * 50;    // 40..90
  let velocity = 58 + infraQuality * 0.25
    - distance
    - (100 - telecom) * 0.32
    - Math.max(0, transportUtil - 60) * 0.5                    // corridor saturation
    - Math.max(0, 50 - reservesHeadroom) * 0.4                 // thin reserves stall staging
    - fatigue * 0.22
    - contention * 0.14
    + (lvl >= 3 ? 12 : 0);                                     // criticals surge faster
  velocity = Math.max(6, Math.min(99, Math.round(velocity)));
  // Field execution trails authorization (pipeline stage 4 = RESPONSE
  // AUTHORIZED). Before that, operations are not yet released.
  let fIdx = -1;
  if (pIdx >= 4) {
    const released = pIdx - 4;                                 // 0..4
    const advance = Math.round(released * (velocity / 70));
    fIdx = Math.max(0, Math.min(7, advance + (pIdx >= 8 ? 2 : 0)));
  }
  const stage = fIdx < 0 ? 'AWAITING AUTHORIZATION' : FIELD_STAGES[fIdx]!;
  // Operational friction sources, worst-first.
  const friction =
    fIdx < 0 ? 'pending mandate'
    : transportUtil >= 78 ? 'corridor congestion'
    : reservesHeadroom < 38 ? 'staging backlog'
    : velocity < 40 ? 'deployment delay'
    : 'nominal';
  const frictionTone: FieldOps['frictionTone'] =
    friction === 'corridor congestion' || friction === 'staging backlog' ? 'alert'
    : friction === 'deployment delay' ? 'warn'
    : friction === 'pending mandate' ? 'neutral' : 'ok';
  const stepMin = Math.max(8, Math.round(120 / Math.max(8, velocity) * 9));
  const eta = fIdx < 0 || fIdx >= 7 ? '—'
    : stepMin >= 60 ? `${(stepMin / 60).toFixed(1)}h` : `${stepMin}m`;
  // Fragile stabilization can relapse when the nation is strategically
  // scarred (recovery is gradual, not guaranteed).
  const relapse = fIdx >= 4 && fIdx <= 6
    && post.stabilizationCaution >= 55 && contention >= 60;
  return { fIdx, stage, region, velocity, friction, frictionTone, eta, relapse };
}

// ── National civilian reality ─────────────────────────────────────────────
// The state governs a society, not just infrastructure. Civilian
// confidence, public order, institutional trust and economic continuity
// are coupled to operational reality; trust erodes fast but rebuilds slowly
// (societal recovery lags infrastructure recovery).

// Long-horizon societal memory — accumulated recovery success vs. failure
// scars institutional trust and slows its restoration.
// Shared decayed binary-event memory — consolidates the long-horizon
// "competence vs. failure" accumulators (societal / foresight / political /
// capability) into one primitive. Recent epochs weigh more (recency decay).
function eventMemory(
  prefix: string, epoch: number, H: number, hi: number, lo: number, tail: number,
): { pos: number; neg: number } {
  let p = 0, q = 0, n = 0;
  for (let e = Math.max(0, epoch - H); e <= epoch; e++) {
    const decay = 1 - (epoch - e) / (H + tail);
    const s = seed(`${prefix}:${e}`);
    if (s > hi) p += decay; else if (s < lo) q += decay;
    n += decay;
  }
  return { pos: Math.round((p / Math.max(1, n)) * 100), neg: Math.round((q / Math.max(1, n)) * 100) };
}

function societalMemory(epoch: number): { trust: number; scar: number } {
  const m = eventMemory('soc:rec', epoch, 14, 0.55, 0.32, 4);
  return { trust: m.pos, scar: m.neg };
}

export interface NationalSociety {
  civilianConfidence: number;   // 0..100
  publicOrder: number;          // 0..100 compliance / order
  institutionalTrust: number;   // 0..100
  economicContinuity: number;   // 0..100
  socialStrain: number;         // 0..100
  recoveryLag: number;          // 0..100 how far societal trails infra recovery
  continuityPressure: number;   // 0..100 governing-tradeoff burden
  label: string;                // COHESIVE | STRAINED | FRAGILE | ERODING
}
export function nationalSociety(
  opS: OperatingState, post: NationalPosture, incidentN: number, sevLoad: number, epoch: number,
): NationalSociety {
  const mem = societalMemory(epoch);
  const telecom = opS.display.telecom;
  const reserves = opS.resources.reserves.headroom;
  // Economic continuity — energy stability, transport throughput, telecom
  // productivity, treasury slack.
  const economicContinuity = Math.max(8, Math.min(99, Math.round(
    (100 - opS.display.gridLoad) * 0.3
    + (100 - opS.resources.transport.util) * 0.3
    + telecom * 0.22
    + (100 - opS.resources.treasury.util) * 0.18
    - sevLoad * 3)));
  // Civilian confidence — executive confidence + public coordination
  // (telecom) + reserve assurance, eroded by crises and prolonged
  // containment, rebuilt slowly by a record of recoveries.
  const civilianConfidence = Math.max(6, Math.min(99, Math.round(
    post.execConfidence * 0.4
    + telecom * 0.18
    + reserves * 0.16
    + mem.trust * 0.16
    - incidentN * 2.4
    - post.containmentWeight * 0.12
    - mem.scar * 0.14)));
  const socialStrain = Math.max(1, Math.min(100, Math.round(
    100 - (civilianConfidence * 0.5 + economicContinuity * 0.5))));
  const publicOrder = Math.max(5, Math.min(99, Math.round(
    civilianConfidence * 0.55 + (100 - socialStrain) * 0.3 + post.containmentWeight * 0.1)));
  const institutionalTrust = Math.max(5, Math.min(99, Math.round(
    post.execConfidence * 0.35 + mem.trust * 0.35 + publicOrder * 0.2 - mem.scar * 0.25)));
  // Societal recovery lags infrastructure recovery (trust restoration delay).
  const recoveryLag = Math.max(0, Math.min(100, Math.round(
    post.stabilizationCaution * 0.4 + mem.scar * 0.4 + (100 - institutionalTrust) * 0.2)));
  // National-continuity pressure — the governing tradeoff burden
  // (containment vs mobility, stability vs economy, caution vs recovery).
  const continuityPressure = Math.max(0, Math.min(100, Math.round(
    socialStrain * 0.34 + (100 - economicContinuity) * 0.28
    + post.containmentWeight * 0.2 + opS.contention * 0.18)));
  const label = institutionalTrust < 35 || socialStrain >= 70 ? 'ERODING'
    : socialStrain >= 52 ? 'FRAGILE'
    : socialStrain >= 36 ? 'STRAINED'
    : 'COHESIVE';
  return {
    civilianConfidence, publicOrder, institutionalTrust, economicContinuity,
    socialStrain, recoveryLag, continuityPressure, label,
  };
}

// ── Strategic foresight & predictive intelligence ─────────────────────────
// Anticipatory governance: read leading indicators before full escalation,
// project a probabilistic national-risk band, weigh divergent scenarios and
// decay foresight confidence from a record of forecast hits vs. misses.
export interface EarlyWarning { signal: string; risk: number; lead: string; }
export interface Scenario { label: string; prob: number; }
export interface StrategicForesight {
  warnings: EarlyWarning[];
  projRisk: number;       // projected national risk (forward)
  projLo: number;         // confidence band
  projHi: number;
  horizon: string;        // dominant lead time
  confidence: number;     // 0..100 foresight confidence
  scenarios: Scenario[];  // divergent futures, weighted ~100
  dominant: string;
}
// Record of anticipation: prior misses erode foresight confidence and widen
// the uncertainty band; consistent anticipation builds doctrine trust.
function foresightMemory(epoch: number): { miss: number; hit: number } {
  const m = eventMemory('fore', epoch, 12, 0.6, 0.34, 4);
  return { miss: m.neg, hit: m.pos };
}
export function strategicForesight(
  opS: OperatingState, post: NationalPosture, society: NationalSociety,
  ext: ExternalEnvironment, nationalRisk: number, sevLoad: number, incidentN: number, epoch: number,
): StrategicForesight {
  const w: EarlyWarning[] = [];
  const add = (cond: boolean, signal: string, risk: number, lead: string) => { if (cond) w.push({ signal, risk, lead }); };
  add(opS.display.telecom < 82, 'telecom degradation → coordination risk', Math.round((100 - opS.display.telecom) * 0.6), '24h');
  add(opS.resources.reserves.headroom < 42, 'reserve exhaustion → recovery fragility', Math.round((50 - opS.resources.reserves.headroom) * 1.1), '48h');
  add(opS.resources.transport.util >= 72, 'corridor congestion → deployment slowdown', Math.round((opS.resources.transport.util - 60) * 1.1), '24h');
  add(post.containmentWeight >= 55, 'sustained containment → social fatigue', Math.round(post.containmentWeight * 0.6), '72h');
  add(ext.externalPressure >= 44, 'regional instability → migration & strategic pressure', Math.round(ext.externalPressure * 0.6), '72h');
  add(ext.allianceReliability < 60, 'alliance unreliability → strategic caution', Math.round((70 - ext.allianceReliability) * 0.9), '72h');
  add(opS.contention >= 62, 'infrastructure fatigue → cascade risk', Math.round((opS.contention - 50) * 1.1), '48h');
  w.sort((a, b) => b.risk - a.risk);

  const mem = foresightMemory(epoch);
  const confidence = Math.max(20, Math.min(95, Math.round(70 + mem.hit * 0.3 - mem.miss * 0.5 - ext.externalPressure * 0.1)));
  const warnLift = w.reduce((s, x) => s + x.risk, 0) / Math.max(1, w.length) * 0.35;
  const projRisk = Math.max(0, Math.min(100, Math.round(
    nationalRisk + warnLift + sevLoad * 2 + (100 - confidence) * 0.08 - society.institutionalTrust * 0.05)));
  const spread = Math.round(6 + (100 - confidence) * 0.22 + ext.externalPressure * 0.12 + w.length * 1.4);
  const projLo = Math.max(0, projRisk - spread);
  const projHi = Math.min(100, projRisk + spread);
  const horizon = w[0]?.lead ?? '72h';

  // Divergent futures — weighted by present signals (deterministic).
  const raw: Scenario[] = [
    { label: 'Rapid stabilization', prob: 30 + post.execConfidence * 0.3 - projRisk * 0.3 - sevLoad * 4 },
    { label: 'Prolonged containment', prob: 14 + post.containmentWeight * 0.4 + incidentN * 1.5 },
    { label: 'Economic degradation', prob: 10 + (100 - society.economicContinuity) * 0.35 },
    { label: 'Geopolitical escalation', prob: 6 + ext.externalPressure * 0.4 },
    { label: 'Infrastructure recovery', prob: 16 + opS.resources.reserves.headroom * 0.25 - projRisk * 0.15 },
    { label: 'Societal fracture', prob: 4 + society.socialStrain * 0.35 - society.institutionalTrust * 0.1 },
  ].map(s => ({ label: s.label, prob: Math.max(2, s.prob) }));
  const tot = raw.reduce((s, x) => s + x.prob, 0);
  const scenarios = raw.map(s => ({ label: s.label, prob: Math.round((s.prob / tot) * 100) }))
    .sort((a, b) => b.prob - a.prob);
  const dominant = scenarios[0]?.label ?? 'Rapid stabilization';

  return { warnings: w, projRisk, projLo, projHi, horizon, confidence, scenarios, dominant };
}

// ── Multi-timeline policy simulation ──────────────────────────────────────
// Project competing executive doctrines forward before any decision is
// executed: each doctrine bends the present trajectory along its own
// tradeoffs, yielding alternate national futures with simulation
// confidence and a recommended (but uncertain) course.
export interface DoctrineSim {
  key: string;
  label: string;
  stability: number;     // projected national stability (higher better)
  reserves: number;      // projected reserve headroom
  economy: number;       // economic continuity
  society: number;       // civilian confidence
  geoExposure: number;   // geopolitical exposure (higher worse)
  recoveryWeeks: number; // time to stabilize
  confidence: number;    // simulation confidence
  score: number;         // composite desirability 0..100
  survivalWeeks: number; // how long the nation can sustain this doctrine
  sustainable: boolean;  // endures beyond the recovery horizon
  note: string;          // headline tradeoff
}
export interface PolicySimulation {
  sims: DoctrineSim[];
  recommended: string;
  ambiguity: number;     // 0..100 — how close the leading options are
}
export function simulateDoctrines(
  opS: OperatingState, post: NationalPosture, society: NationalSociety,
  ext: ExternalEnvironment, foresight: StrategicForesight, nationalRisk: number, epoch: number,
): PolicySimulation {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  const base = {
    stability: 100 - nationalRisk,
    reserves: opS.resources.reserves.headroom,
    economy: society.economicContinuity,
    society: society.civilianConfidence,
    geoExposure: ext.externalPressure,
    recoveryWeeks: 2 + Math.round(foresight.projRisk / 12 + post.stabilizationCaution / 30),
  };
  // Each doctrine: deltas vs. baseline (decision-consequence modelling).
  const D: { key: string; label: string; d: Partial<typeof base>; note: string }[] = [
    { key: 'aggressive', label: 'Aggressive deployment', note: 'faster stabilization, reserves & geopolitical exposure strained',
      d: { stability: +14, reserves: -22, society: +6, geoExposure: +12, recoveryWeeks: -2 } },
    { key: 'conservative', label: 'Reserve-sensitive conservative', note: 'resilient reserves, slower recovery',
      d: { stability: -8, reserves: +16, recoveryWeeks: +2, geoExposure: -4 } },
    { key: 'containment', label: 'Containment-heavy', note: 'short-term order, mobility & economy reduced',
      d: { stability: +8, society: -12, economy: -10, recoveryWeeks: +1 } },
    { key: 'continuity', label: 'Civilian-continuity-heavy', note: 'economy & confidence protected, slower crisis grip',
      d: { stability: -6, economy: +14, society: +12, reserves: -6 } },
    { key: 'diplomatic', label: 'Diplomatic-caution', note: 'lower external exposure, slower assertive recovery',
      d: { geoExposure: -16, recoveryWeeks: +2, stability: -2, economy: +4 } },
  ];
  const sims: DoctrineSim[] = D.map(({ key, label, d, note }) => {
    const stability = clamp(base.stability + (d.stability ?? 0));
    const reserves = clamp(base.reserves + (d.reserves ?? 0));
    const economy = clamp(base.economy + (d.economy ?? 0));
    const soc = clamp(base.society + (d.society ?? 0));
    const geoExposure = clamp(base.geoExposure + (d.geoExposure ?? 0));
    const recoveryWeeks = Math.max(1, base.recoveryWeeks + (d.recoveryWeeks ?? 0));
    // simulation confidence — foresight confidence with per-doctrine
    // uncertainty (assertive doctrines are harder to predict).
    const confidence = clamp(foresight.confidence
      - (key === 'aggressive' ? 10 : key === 'containment' ? 6 : 0)
      - ext.externalPressure * 0.06
      - seed(`sim:${key}:${epoch}`) * 6);
    const score = clamp(
      stability * 0.3 + reserves * 0.18 + economy * 0.2 + soc * 0.17
      + (100 - geoExposure) * 0.1 - recoveryWeeks * 1.6 + 8);
    // Recovery economics — how long the nation can carry this doctrine:
    // reserves & economy fund endurance, recovery time consumes it.
    const survivalWeeks = Math.max(1, Math.round(
      (reserves * 0.12 + economy * 0.08) - recoveryWeeks * 0.4
      + (key === 'conservative' ? 6 : key === 'aggressive' ? -4 : key === 'continuity' ? 3 : 0)));
    const sustainable = survivalWeeks >= recoveryWeeks + 2;
    return { key, label, stability, reserves, economy, society: soc, geoExposure, recoveryWeeks, confidence, score, survivalWeeks, sustainable, note };
  }).sort((a, b) => b.score - a.score);
  const recommended = sims[0]?.label ?? '';
  const top = sims[0]?.score ?? 0;
  const second = sims[1]?.score ?? 0;
  const ambiguity = clamp(100 - (top - second) * 6);
  return { sims, recommended, ambiguity };
}

// ── Long-horizon national sustainability ──────────────────────────────────
// A nation is finite. Sustained operations age infrastructure and draw
// reserves faster than industry rebuilds them; survivability is whether
// the state can endure its own doctrine over a long horizon.
export interface NationalSustainability {
  reserveLongevityWeeks: number; // reserves at current net draw
  infraAging: number;            // 0..100 accumulated structural fatigue
  productionIndex: number;       // 0..100 industrial/repair output
  replenishmentRate: number;     // 0..100 reserve-rebuild velocity (slow post-overuse)
  economicResilience: number;    // 0..100
  survivabilityWeeks: number;    // overall endurance horizon
  outlook: string;               // SUSTAINABLE | STRAINED | DEPLETING | UNSUSTAINABLE
}
export function nationalSustainability(
  opS: OperatingState, post: NationalPosture, society: NationalSociety,
  foresight: StrategicForesight, epoch: number,
): NationalSustainability {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  // Infrastructure ages from a long-horizon record of strain epochs.
  const H = 18;
  let strain = 0, n = 0;
  for (let e = Math.max(0, epoch - H); e <= epoch; e++) {
    const decay = 1 - (epoch - e) / (H + 6);
    strain += (seed(`age:infra:${e}`) > 0.55 ? 1 : 0) * decay;
    n += decay;
  }
  const infraAging = clamp((strain / Math.max(1, n)) * 100 * 0.85 + opS.contention * 0.18);
  // Industrial / production output — energy generation stability, repair
  // throughput, logistics replenishment, minus structural aging.
  const productionIndex = clamp(
    (100 - opS.display.gridLoad) * 0.3
    + (100 - opS.resources.transport.util) * 0.22
    + opS.display.telecom * 0.2
    + (100 - opS.resources.treasury.util) * 0.16
    - infraAging * 0.3);
  // Reserves rebuild slowly, slower still after heavy overuse / low output.
  const replenishmentRate = clamp(productionIndex * 0.5
    - post.deploymentConservatism * 0.1
    + opS.resources.reserves.headroom * 0.3
    - infraAging * 0.2);
  // Net weekly reserve draw vs. rebuild → longevity horizon.
  const netDraw = Math.max(0.4, (foresight.projRisk / 22) + post.deploymentConservatism / 60 - replenishmentRate / 45);
  const reserveLongevityWeeks = Math.max(1, Math.round(opS.resources.reserves.headroom / (netDraw * 6)));
  const economicResilience = clamp(
    society.economicContinuity * 0.5 + productionIndex * 0.3 + replenishmentRate * 0.2);
  const survivabilityWeeks = Math.max(1, Math.round(
    reserveLongevityWeeks * 0.5 + economicResilience * 0.12 + (100 - infraAging) * 0.06));
  const outlook = survivabilityWeeks >= 18 && infraAging < 55 ? 'SUSTAINABLE'
    : survivabilityWeeks >= 10 ? 'STRAINED'
    : survivabilityWeeks >= 5 ? 'DEPLETING'
    : 'UNSUSTAINABLE';
  return {
    reserveLongevityWeeks, infraAging, productionIndex, replenishmentRate,
    economicResilience, survivabilityWeeks, outlook,
  };
}

// ── Political stability & regime continuity ───────────────────────────────
// Nations are governed by political structures that gain or lose
// legitimacy, cohesion and unity under pressure. Continuity is whether the
// government can keep governing — distinct from operational capacity.
export interface PoliticalContinuity {
  legitimacy: number;            // 0..100 governing mandate / public authority
  cabinetCohesion: number;       // 0..100 executive-layer alignment
  regionalStrain: number;        // 0..100 territorial political tension (higher worse)
  nationalUnity: number;         // 0..100 collective cohesion
  governanceContinuity: number;  // 0..100 ability to keep governing
  fragility: number;             // 0..100 regime fragility (higher worse)
  label: string;                 // CONSOLIDATED | STABLE | STRAINED | FRAGILE | FRACTURING
}
// Long-horizon political memory — legitimacy erodes through visible failure
// and rebuilds slowly through demonstrated competence.
function politicalMemory(epoch: number): { competence: number; failure: number } {
  const m = eventMemory('pol', epoch, 16, 0.58, 0.34, 5);
  return { competence: m.pos, failure: m.neg };
}
export function politicalContinuity(
  opS: OperatingState, post: NationalPosture, society: NationalSociety,
  ext: ExternalEnvironment, foresight: StrategicForesight, epoch: number,
): PoliticalContinuity {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  const mem = politicalMemory(epoch);
  // Legitimacy — executive confidence + institutional trust + a record of
  // competence, eroded by prolonged containment and reserve exhaustion.
  const legitimacy = clamp(
    post.execConfidence * 0.32 + society.institutionalTrust * 0.3 + mem.competence * 0.18
    - post.containmentWeight * 0.12 - Math.max(0, 50 - opS.resources.reserves.headroom) * 0.2
    - mem.failure * 0.16);
  // Cabinet cohesion — sustained crisis & contention create fatigue;
  // forecast uncertainty and conservative overreach weaken alignment.
  const cabinetCohesion = clamp(
    post.execConfidence * 0.4 + (100 - opS.contention) * 0.22
    + foresight.confidence * 0.16 - post.deploymentConservatism * 0.12
    - (100 - society.economicContinuity) * 0.14);
  // Regional political strain — uneven recovery, containment burden and
  // corridor saturation breed territorial tension.
  const regionalStrain = clamp(
    post.containmentWeight * 0.3 + opS.resources.transport.util * 0.22
    + (100 - society.economicContinuity) * 0.24 + ext.externalPressure * 0.12
    + seed(`reg:pol:${epoch}`) * 14);
  // National unity — coordination & shared confidence build it; visible
  // strain and regional inequality fracture it.
  const nationalUnity = clamp(
    society.civilianConfidence * 0.4 + legitimacy * 0.28 + (100 - regionalStrain) * 0.22
    - (100 - cabinetCohesion) * 0.12);
  const governanceContinuity = clamp(
    legitimacy * 0.34 + cabinetCohesion * 0.3 + nationalUnity * 0.24
    - ext.strategicCaution * 0.1);
  const fragility = clamp(100 - governanceContinuity * 0.7 - nationalUnity * 0.3 + regionalStrain * 0.2);
  const label = governanceContinuity >= 78 ? 'CONSOLIDATED'
    : governanceContinuity >= 60 ? 'STABLE'
    : governanceContinuity >= 44 ? 'STRAINED'
    : governanceContinuity >= 28 ? 'FRAGILE'
    : 'FRACTURING';
  return {
    legitimacy, cabinetCohesion, regionalStrain, nationalUnity,
    governanceContinuity, fragility, label,
  };
}

// ── Civilizational continuity & national capability ───────────────────────
// Beyond surviving a crisis, a nation must preserve and regenerate its
// long-term capability: human capital, institutional knowledge,
// technological resilience and generational continuity. Institutions learn
// from demonstrated competence and deteriorate under chronic failure.
export interface NationalCapability {
  humanCapital: number;            // 0..100 workforce / expertise capacity
  institutionalKnowledge: number;  // 0..100 accumulated doctrine competence
  technologicalResilience: number; // 0..100 innovation / modernization depth
  generationalContinuity: number;  // 0..100 long-term demographic resilience
  capabilityIndex: number;         // 0..100 composite
  trajectory: 'regenerating' | 'holding' | 'eroding';
  label: string;                   // ADVANCING | RESILIENT | STRAINED | ERODING | DECLINING
}
// Long-horizon learning memory — repeated competent recovery compounds
// institutional knowledge; chronic failure causes hesitation that lingers.
function capabilityMemory(epoch: number): { learned: number; lost: number } {
  const m = eventMemory('cap:learn', epoch, 20, 0.57, 0.33, 6);
  return { learned: m.pos, lost: m.neg };
}
export function nationalCapability(
  opS: OperatingState, post: NationalPosture, society: NationalSociety,
  ext: ExternalEnvironment, sustain: NationalSustainability, polit: PoliticalContinuity,
  peakPressure: number, incidentN: number, epoch: number,
): NationalCapability {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  const mem = capabilityMemory(epoch);
  // Human capital — workforce/expertise: economy & confidence sustain it,
  // hospital overload and telecom loss and chronic crises erode it.
  const humanCapital = clamp(
    society.economicContinuity * 0.32 + society.civilianConfidence * 0.26
    + opS.display.telecom * 0.16 + mem.learned * 0.16
    - Math.max(0, peakPressure - 60) * 0.4 - incidentN * 1.8 - mem.lost * 0.12);
  // Institutional knowledge — doctrine competence compounds with learning,
  // erodes with fatigue and chronic failure.
  const institutionalKnowledge = clamp(
    post.execConfidence * 0.3 + mem.learned * 0.34 + polit.cabinetCohesion * 0.18
    - mem.lost * 0.22 - opS.contention * 0.12);
  // Technological resilience — telecom reliability, infrastructure youth,
  // modernization funding (reserves), external cooperation.
  const technologicalResilience = clamp(
    opS.display.telecom * 0.3 + (100 - sustain.infraAging) * 0.28
    + opS.resources.reserves.headroom * 0.2 + (100 - ext.externalPressure) * 0.22);
  // Generational continuity — long-term demographic/readiness resilience.
  const generationalContinuity = clamp(
    polit.nationalUnity * 0.3 + sustain.economicResilience * 0.26
    + society.institutionalTrust * 0.22 - post.containmentWeight * 0.14
    - Math.max(0, 50 - sustain.survivabilityWeeks) * 0.3);
  const capabilityIndex = clamp(
    humanCapital * 0.3 + institutionalKnowledge * 0.26
    + technologicalResilience * 0.22 + generationalContinuity * 0.22);
  const drift = mem.learned - mem.lost;
  const trajectory: NationalCapability['trajectory'] =
    drift >= 12 && capabilityIndex >= 50 ? 'regenerating'
    : drift <= -12 || capabilityIndex < 38 ? 'eroding'
    : 'holding';
  const label = capabilityIndex >= 74 ? 'ADVANCING'
    : capabilityIndex >= 58 ? 'RESILIENT'
    : capabilityIndex >= 44 ? 'STRAINED'
    : capabilityIndex >= 30 ? 'ERODING'
    : 'DECLINING';
  return {
    humanCapital, institutionalKnowledge, technologicalResilience,
    generationalContinuity, capabilityIndex, trajectory, label,
  };
}

// ── National execution & governance operations continuity ─────────────────
// The state never stops operating. Each ministry runs a continuous rolling
// programme that advances through cycle phases every operating epoch,
// carries an accountability signal from its live capacity, and accumulates
// a historical execution record — administratively alive at all times.
const MINISTRY_PROGRAMS: Record<string, { name: string; phases: string[] }> = {
  TRANSPORT:   { name: 'Rolling logistics rotation', phases: ['routing', 'dispatch', 'corridor clearance', 'replenishment'] },
  HEALTH:      { name: 'Hospital stabilization programme', phases: ['triage', 'surge support', 'consolidation', 'normalization'] },
  FINANCE:     { name: 'Staged reserve allocation', phases: ['assessment', 'tranche release', 'audit', 'rebalance'] },
  TREASURY:    { name: 'Staged reserve allocation', phases: ['assessment', 'tranche release', 'audit', 'rebalance'] },
  TELECOM:     { name: 'Continuity restoration sequence', phases: ['survey', 'repair', 'validation', 'hardening'] },
  ENERGY:      { name: 'Grid-hardening campaign', phases: ['load balancing', 'reinforcement', 'inspection', 'reserve build'] },
  INTERIOR:    { name: 'Deployment rotation', phases: ['staging', 'deployment', 'relief', 'recovery'] },
  EMERGENCY:   { name: 'Field deployment rotation', phases: ['staging', 'deployment', 'relief', 'recovery'] },
  AGRICULTURE: { name: 'Supply-continuity cycle', phases: ['planning', 'distribution', 'review', 'replenishment'] },
  TRADE:       { name: 'Throughput-continuity cycle', phases: ['scheduling', 'clearance', 'audit', 'rebalance'] },
  JUSTICE:     { name: 'Case-continuity programme', phases: ['intake', 'processing', 'review', 'clearance'] },
  EDUCATION:   { name: 'Service-continuity cycle', phases: ['planning', 'delivery', 'assessment', 'consolidation'] },
  LABOR:       { name: 'Workforce-continuity cycle', phases: ['assessment', 'placement', 'review', 'stabilization'] },
  ENVIRONMENT: { name: 'Hazard-containment cycle', phases: ['survey', 'containment', 'monitoring', 'remediation'] },
};
export interface MinistryProgram {
  ministry: string;
  program: string;
  phase: string;
  cycle: number;            // rolling cycle index (continuous, grows with epoch)
  progress: number;         // 0..100 within current cycle
  throughput: number;       // 0..100 operational output
  accountability: 'on-track' | 'delayed' | 'backlog';
  accTone: 'ok' | 'warn' | 'alert';
  completedCycles: number;  // historical execution record
  lastOutcome: 'met' | 'partial' | 'missed';
}
export function ministryOperations(
  arch: string, pressure: number, reliability: number, fatigue: number, epoch: number,
): MinistryProgram {
  const def = MINISTRY_PROGRAMS[arch] ?? { name: 'Operational continuity cycle', phases: ['plan', 'execute', 'review', 'sustain'] };
  const phases = def.phases;
  const phase = phases[epoch % phases.length] ?? phases[0]!;
  // structural offset so ministries are not phase-locked to each other.
  const off = Math.floor(seed(`mop:${arch}`) * 4);
  const cycle = Math.floor((epoch + off) / phases.length) + 1;
  const progress = Math.round(((epoch % phases.length) / phases.length) * 100
    + wave(`mop:p:${arch}`, epoch, 0, 22));
  // operational output: reliability sustains it; pressure & fatigue erode it.
  const throughput = Math.max(8, Math.min(99, Math.round(
    reliability * 0.62 - Math.max(0, pressure - 55) * 0.5 - fatigue * 0.22
    + wave(`mop:t:${arch}`, epoch, 0, 16))));
  const accountability: MinistryProgram['accountability'] =
    throughput < 38 || pressure >= 82 ? 'backlog'
    : throughput < 56 || pressure >= 64 ? 'delayed'
    : 'on-track';
  const accTone: MinistryProgram['accTone'] =
    accountability === 'backlog' ? 'alert' : accountability === 'delayed' ? 'warn' : 'ok';
  // historical execution record — completed cycles accumulate; the most
  // recent closed cycle's outcome comes from a decayed performance memory.
  const m = eventMemory(`mop:rec:${arch}`, epoch, 12, 0.55, 0.34, 4);
  const completedCycles = Math.max(0, cycle - 1) + Math.round(m.pos / 24);
  const lastOutcome: MinistryProgram['lastOutcome'] =
    m.neg > m.pos + 14 ? 'missed' : m.pos >= m.neg + 12 ? 'met' : 'partial';
  return {
    ministry: arch, program: def.name, phase, cycle,
    progress: Math.max(0, Math.min(100, progress)), throughput,
    accountability, accTone, completedCycles, lastOutcome,
  };
}

// ── Live national crisis exercise & sovereign war-gaming ──────────────────
// A deterministic stress drill runs continuously: each operating epoch
// selects a national exercise, injects an adversarial stress vector,
// propagates a cascading multi-system failure, degrades executive decision
// quality under overload, and returns a resilience verdict. The nation is
// tested, not assumed stable.
const EXERCISES: { key: string; name: string; vector: string; hits: string[] }[] = [
  { key: 'telecom-blackout', name: 'Telecom blackout drill', vector: 'national telecom degradation', hits: ['telecom', 'coordination', 'deployment', 'civilian', 'economy'] },
  { key: 'grid-collapse', name: 'Grid collapse exercise', vector: 'cascading energy failure', hits: ['energy', 'telecom', 'health', 'economy', 'reserves'] },
  { key: 'reserve-exhaustion', name: 'Reserve exhaustion rehearsal', vector: 'strategic reserve depletion', hits: ['reserves', 'deployment', 'recovery', 'economy'] },
  { key: 'pandemic-resurgence', name: 'Pandemic resurgence scenario', vector: 'health-system surge', hits: ['health', 'logistics', 'civilian', 'workforce', 'economy'] },
  { key: 'logistics-blockade', name: 'Logistics blockade simulation', vector: 'corridor / supply blockade', hits: ['transport', 'logistics', 'health', 'economy'] },
  { key: 'cyber-coordination', name: 'Cyber coordination-failure drill', vector: 'coordination-layer compromise', hits: ['telecom', 'coordination', 'authorization', 'deployment'] },
  { key: 'multi-region', name: 'Multi-region containment breakdown', vector: 'simultaneous regional failure', hits: ['containment', 'deployment', 'civilian', 'unity', 'reserves'] },
  { key: 'sanction-escalation', name: 'Geopolitical sanction escalation', vector: 'hostile economic & alliance pressure', hits: ['geopolitical', 'reserves', 'economy', 'alliance', 'recovery'] },
];
export interface StressExercise {
  key: string;
  name: string;
  vector: string;
  intensity: number;          // 0..100 stress magnitude
  cascade: string[];          // propagated multi-system impacts
  decisionDegradation: number;// 0..100 executive decision-quality loss
  resilienceScore: number;    // 0..100 (higher = withstands)
  recoveryWeeks: number;      // projected recovery timeline under stress
  verdict: string;            // WITHSTANDS | STRAINED | DEGRADED | FAILS
}
export function nationalStressExercise(
  opS: OperatingState, post: NationalPosture, society: NationalSociety,
  ext: ExternalEnvironment, foresight: StrategicForesight, sustain: NationalSustainability,
  polit: PoliticalContinuity, cap: NationalCapability, incidentN: number, epoch: number,
): StressExercise {
  const ex = EXERCISES[Math.floor(seed(`drill:${epoch}`) * EXERCISES.length)] ?? EXERCISES[0]!;
  // intensity scales with present fragility & external pressure so drills
  // bite harder when the nation is already strained.
  const intensity = Math.max(20, Math.min(100, Math.round(
    46 + ext.externalPressure * 0.22 + foresight.projRisk * 0.2
    + incidentN * 2 + (100 - sustain.survivabilityWeeks) * 0.1
    + seed(`drill:i:${epoch}`) * 14)));
  // Cascading multi-system failure — each hit compounds the prior.
  const CASCADE_TXT: Record<string, string> = {
    telecom: 'telecom degradation weakens national coordination',
    coordination: 'coordination failure slows emergency deployment',
    deployment: 'delayed deployment worsens civilian instability',
    civilian: 'civilian instability erodes economic continuity',
    economy: 'economic contraction limits recovery funding',
    reserves: 'reserve depletion constrains intervention capacity',
    energy: 'energy collapse destabilises dependent infrastructure',
    health: 'health-system surge overruns regional capacity',
    logistics: 'logistics blockade delays critical supply',
    transport: 'corridor disruption isolates affected regions',
    recovery: 'recovery timeline extends under sustained load',
    geopolitical: 'geopolitical pressure amplifies internal strain',
    alliance: 'alliance hesitation removes external relief',
    workforce: 'workforce attrition lowers operational throughput',
    containment: 'containment breakdown spreads instability',
    unity: 'national cohesion fractures under simultaneous strain',
    authorization: 'authorization integrity loss stalls directives',
  };
  const cascade = ex.hits.map(h => CASCADE_TXT[h] ?? `${h} under stress`);
  // Executive decision degradation — simultaneous load + ambiguity +
  // coordination strain reduce prioritisation quality.
  const decisionDegradation = Math.max(0, Math.min(100, Math.round(
    incidentN * 4 + (100 - foresight.confidence) * 0.3 + opS.contention * 0.22
    + (100 - post.execConfidence) * 0.2 + intensity * 0.18 - polit.cabinetCohesion * 0.15)));
  // Resilience — endurance vs. the injected stress.
  const endurance =
    sustain.survivabilityWeeks * 1.6 + cap.capabilityIndex * 0.34
    + polit.governanceContinuity * 0.3 + society.institutionalTrust * 0.18
    + opS.resources.reserves.headroom * 0.16;
  const resilienceScore = Math.max(0, Math.min(100, Math.round(
    endurance - intensity * 0.55 - decisionDegradation * 0.3 + 10)));
  const recoveryWeeks = Math.max(1, Math.round(
    2 + intensity / 14 + decisionDegradation / 22 + (100 - resilienceScore) / 16));
  const verdict = resilienceScore >= 66 ? 'WITHSTANDS'
    : resilienceScore >= 48 ? 'STRAINED'
    : resilienceScore >= 30 ? 'DEGRADED'
    : 'FAILS';
  return {
    key: ex.key, name: ex.name, vector: ex.vector, intensity, cascade,
    decisionDegradation, resilienceScore, recoveryWeeks, verdict,
  };
}

// ── Persistent sovereign administrative statecraft ────────────────────────
// The state is a living administrative organism: standing directives
// persist across operating epochs, move through an institutional policy
// lifecycle, are judged by executing-ministry performance, accumulate
// outcome memory, and roll into successive doctrine generations (eras).
const DIRECTIVE_DEFS: { key: string; arch: string; title: string; span: number }[] = [
  { key: 'energy-stab', arch: 'ENERGY', title: 'National energy stabilization mandate', span: 11 },
  { key: 'telecom-rest', arch: 'TELECOM', title: 'Telecom restoration order', span: 8 },
  { key: 'reserve-pres', arch: 'FINANCE', title: 'Strategic reserve preservation policy', span: 14 },
  { key: 'logi-decree', arch: 'TRANSPORT', title: 'Emergency logistics decree', span: 7 },
  { key: 'infra-harden', arch: 'ENERGY', title: 'Infrastructure hardening initiative', span: 16 },
  { key: 'health-surge', arch: 'HEALTH', title: 'Healthcare surge doctrine', span: 9 },
  { key: 'industrial-rec', arch: 'TRADE', title: 'Industrial recovery programme', span: 13 },
  { key: 'reserve-rebuild', arch: 'FINANCE', title: 'Strategic reserve rebuilding directive', span: 12 },
];
export interface SovereignDirective {
  key: string;
  title: string;
  ministry: string;
  generation: number;     // doctrine generation (re-issued across eras)
  ageEpochs: number;      // epochs since this generation was issued
  stage: string;          // institutional lifecycle stage
  progress: number;       // 0..100
  accountability: 'reliable' | 'lagging' | 'failing';
  accTone: 'ok' | 'warn' | 'alert';
  outcome: 'pending' | 'succeeded' | 'failed';
}
export interface DirectiveRegister {
  directives: SovereignDirective[];
  era: string;            // governing administration / doctrine generation
  completed: number;
  failed: number;
  active: number;
}
export function nationalDirectiveRegister(
  post: NationalPosture, contention: number, epoch: number,
): DirectiveRegister {
  let completed = 0, failed = 0, active = 0;
  const directives: SovereignDirective[] = DIRECTIVE_DEFS.map(def => {
    const off = Math.floor(seed(`dir:off:${def.key}`) * def.span);
    const t = epoch + off;
    const generation = Math.floor(t / def.span) + 1;
    const ageEpochs = t % def.span;
    const frac = ageEpochs / def.span; // 0..1 progression through lifecycle
    // Executing-ministry performance gates the lifecycle branch.
    const rel = ministryReliability(def.arch, epoch);
    const fatigue = institutionalFatigue(def.arch, epoch);
    const perf = rel - fatigue * 0.4 - Math.max(0, contention - 55) * 0.3
      - post.deploymentConservatism * 0.1;
    const mem = eventMemory(`dir:out:${def.key}`, epoch, 12, 0.56, 0.36, 4);
    let stage: string;
    let outcome: SovereignDirective['outcome'] = 'pending';
    if (frac < 0.12) stage = 'proposed';
    else if (frac < 0.24) stage = 'under review';
    else if (frac < 0.36) stage = 'authorized';
    else if (frac < 0.52) stage = perf < 40 ? 'delayed' : 'partially deployed';
    else if (frac < 0.72) stage = perf < 32 ? 'resisted' : perf < 48 ? 'degraded' : 'nationally active';
    else if (frac < 0.86) stage = perf < 42 ? 'revised' : 'nationally active';
    else {
      // terminal: outcome from performance + accumulated outcome memory.
      const ok = perf + (mem.pos - mem.neg) >= 46;
      stage = ok ? 'completed' : 'failed';
      outcome = ok ? 'succeeded' : 'failed';
    }
    if (frac >= 0.97) stage = 'archived';
    const progress = stage === 'archived' ? 100
      : stage === 'completed' || stage === 'failed' ? Math.round(90 + frac * 10)
      : Math.round(frac * 100);
    const accountability: SovereignDirective['accountability'] =
      perf >= 56 ? 'reliable' : perf >= 38 ? 'lagging' : 'failing';
    const accTone: SovereignDirective['accTone'] =
      accountability === 'failing' ? 'alert' : accountability === 'lagging' ? 'warn' : 'ok';
    if (outcome === 'succeeded') completed++;
    else if (outcome === 'failed') failed++;
    else active++;
    return {
      key: def.key, title: def.title, ministry: def.arch, generation, ageEpochs,
      stage, progress, accountability, accTone, outcome,
    };
  });
  // Governing era — dominant long-horizon administrative character.
  const recovery = eventMemory('era:rec', epoch, 18, 0.56, 0.34, 6);
  const era = post.deploymentConservatism >= 62 ? 'Reserve Rebuilding Era'
    : recovery.neg > recovery.pos + 16 ? 'Reconstruction Administration'
    : post.containmentWeight >= 60 ? 'Hardening Generation'
    : recovery.pos >= recovery.neg + 16 ? 'Recovery Administration'
    : post.execConfidence >= 70 ? 'Continuity Administration'
    : 'Stabilization Administration';
  return { directives, era, completed, failed, active };
}

// ── Human political governance & constitutional realism ───────────────────
// Government is shaped by finite human leadership: cabinet factions
// disagree, legitimacy constrains power, emergency mandates carry
// constitutional cost, and decisions degrade under overload. Builds on the
// political-continuity layer (no duplicated legitimacy logic).
export interface CabinetVoice {
  ministry: string;
  position: string;
  dissent: number;   // 0..100 strength of internal objection
  tone: 'ok' | 'warn' | 'alert';
}
export interface ExecutiveLeadership {
  cabinet: CabinetVoice[];
  consensus: number;            // 0..100 (100 = aligned)
  leadershipStability: number;  // 0..100
  successionPressure: number;   // 0..100 (higher worse)
  constitutionalStrain: number; // 0..100 emergency-mandate / oversight cost
  decisionQuality: number;      // 0..100 human-imperfection-adjusted
  administration: number;       // tenure index (administrations over time)
  label: string;                // DECISIVE | FUNCTIONAL | CONTESTED | STRAINED | CARETAKER
}
export function executiveLeadership(
  opS: OperatingState, post: NationalPosture, society: NationalSociety,
  ext: ExternalEnvironment, polit: PoliticalContinuity, powersLevel: number,
  incidentN: number, epoch: number,
): ExecutiveLeadership {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  // Cabinet factions — each voice's objection rises with the doctrine
  // pressure it cares about.
  const cabinet: CabinetVoice[] = [
    { ministry: 'Treasury', position: 'resist aggressive expenditure', dissent: clamp(20 + Math.max(0, 50 - opS.resources.reserves.headroom) * 0.9 + (100 - post.deploymentConservatism) * 0.18) },
    { ministry: 'Emergency', position: 'demand rapid escalation', dissent: clamp(18 + incidentN * 6 + (100 - post.execConfidence) * 0.2) },
    { ministry: 'Health', position: 'prioritise containment', dissent: clamp(16 + post.containmentWeight * 0.4 + (100 - society.civilianConfidence) * 0.2) },
    { ministry: 'Transport', position: 'prioritise economic continuity', dissent: clamp(16 + (100 - society.economicContinuity) * 0.45) },
    { ministry: 'Foreign Affairs', position: 'urge diplomatic caution', dissent: clamp(14 + ext.externalPressure * 0.45 + (100 - ext.allianceReliability) * 0.2) },
    { ministry: 'Energy', position: 'preserve strategic reserves', dissent: clamp(16 + Math.max(0, 55 - opS.resources.reserves.headroom) * 0.7 + opS.display.gridLoad * 0.12) },
  ].map(v => ({ ...v, tone: (v.dissent >= 60 ? 'alert' : v.dissent >= 38 ? 'warn' : 'ok') as CabinetVoice['tone'] }))
    .sort((a, b) => b.dissent - a.dissent);
  const meanDissent = cabinet.reduce((s, v) => s + v.dissent, 0) / cabinet.length;
  const consensus = clamp(100 - meanDissent);
  // Leadership stability — governance continuity & confidence sustain it;
  // dissent, crisis fatigue and a record of failure erode it.
  const failMem = eventMemory('lead:fail', epoch, 16, 0.6, 0.34, 5);
  const leadershipStability = clamp(
    polit.governanceContinuity * 0.4 + post.execConfidence * 0.24 + consensus * 0.2
    - failMem.pos * 0.2 - incidentN * 2);
  const successionPressure = clamp(
    (100 - leadershipStability) * 0.5 + meanDissent * 0.28
    + failMem.pos * 0.16 + Math.max(0, powersLevel - 1) * 10);
  // Constitutional strain — emergency mandates & aggressive doctrine carry
  // oversight cost; eroded legitimacy amplifies it.
  const constitutionalStrain = clamp(
    powersLevel * 22 + (100 - post.deploymentConservatism < 40 ? 14 : 0)
    + (100 - polit.legitimacy) * 0.3 + post.containmentWeight * 0.16);
  // Human decision imperfection — overload, low confidence, faction
  // ambiguity and fatigue degrade prioritisation quality.
  const decisionQuality = clamp(
    post.execConfidence * 0.42 + consensus * 0.24 + polit.legitimacy * 0.16
    - incidentN * 3 - (100 - leadershipStability) * 0.18);
  const administration = Math.floor(epoch / 12) + 1
    + Math.round(failMem.pos / 40); // failed governments shorten tenures
  const label = leadershipStability >= 70 && consensus >= 60 ? 'DECISIVE'
    : leadershipStability >= 52 ? 'FUNCTIONAL'
    : successionPressure >= 66 ? 'CARETAKER'
    : consensus < 42 ? 'CONTESTED'
    : 'STRAINED';
  return {
    cabinet, consensus, leadershipStability, successionPressure,
    constitutionalStrain, decisionQuality, administration, label,
  };
}

// ── Strategic intelligence & deep-state realism ───────────────────────────
// Continuous classified assessment: confidence-weighted emerging-threat
// vectors, counter-intelligence internal-vulnerability indicators,
// preemptive measures and a classified risk memory. Analytic, cautious,
// never omniscient — it interprets, it does not assert certainty.
export interface IntelSignal {
  vector: string;
  confidence: 'probable' | 'possible' | 'speculative';
  risk: number;        // 0..100 weighted threat
}
export interface CounterIntel {
  indicator: string;
  exposure: number;    // 0..100
  tone: 'ok' | 'warn' | 'alert';
}
export interface IntelligenceAssessment {
  signals: IntelSignal[];
  counter: CounterIntel[];
  preemptive: string[];
  assessmentConfidence: number;  // analytic confidence (not omniscience)
  threatLevel: number;           // 0..100 classified composite
  posture: string;               // NOMINAL | GUARDED | ELEVATED | ALERT | CRITICAL
  memoNote: string;              // classified risk-memory across eras
}
export function intelligenceAssessment(
  opS: OperatingState, post: NationalPosture, society: NationalSociety,
  ext: ExternalEnvironment, foresight: StrategicForesight, sustain: NationalSustainability,
  polit: PoliticalContinuity, epoch: number,
): IntelligenceAssessment {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  // Analytic confidence is bounded — degraded comms & external noise lower
  // it; a record of accurate prior assessment raises it.
  const intelMem = eventMemory('intel:rec', epoch, 14, 0.57, 0.35, 5);
  const assessmentConfidence = clamp(
    foresight.confidence * 0.5 + intelMem.pos * 0.3 - intelMem.neg * 0.2
    - (100 - opS.display.telecom) * 0.18 - ext.externalPressure * 0.12);
  // Confidence label per signal: stronger raw risk + analytic confidence +
  // per-signal seeded ambiguity → probable / possible / speculative.
  const conf = (risk: number, key: string): IntelSignal['confidence'] => {
    const c = risk * 0.5 + assessmentConfidence * 0.5 - seed(`intel:amb:${key}:${epoch}`) * 30;
    return c >= 60 ? 'probable' : c >= 38 ? 'possible' : 'speculative';
  };
  const raw: { vector: string; risk: number; key: string }[] = [
    { key: 'telecom', vector: 'emerging coordination-layer instability', risk: clamp((100 - opS.display.telecom) * 0.8 + opS.contention * 0.2) },
    { key: 'reserve', vector: 'anomalous strategic-reserve depletion', risk: clamp((60 - opS.resources.reserves.headroom) * 1.1 + ext.reserveSensitivity * 0.2) },
    { key: 'corridor', vector: 'suspicious corridor / supply disruption', risk: clamp(Math.max(0, opS.resources.transport.util - 55) * 1.0 + 8) },
    { key: 'external', vector: 'external coordination anomaly', risk: clamp(ext.externalPressure * 0.6 + (100 - ext.allianceReliability) * 0.3) },
    { key: 'economic', vector: 'hostile economic-pressure pattern', risk: clamp(ext.reserveSensitivity * 0.5 + (100 - society.economicContinuity) * 0.4) },
    { key: 'covert', vector: 'covert geopolitical destabilization', risk: clamp(ext.externalPressure * 0.4 + (100 - polit.nationalUnity) * 0.35) },
    { key: 'sabotage', vector: 'infrastructure-sabotage probability', risk: clamp(sustain.infraAging * 0.5 + opS.contention * 0.3) },
    { key: 'dependency', vector: 'strategic dependency exposure', risk: clamp(ext.foreignDependency * 0.6 + (100 - sustain.economicResilience) * 0.25) },
  ];
  const signals: IntelSignal[] = raw
    .filter(r => r.risk >= 24)
    .map(r => ({ vector: r.vector, risk: r.risk, confidence: conf(r.risk, r.key) }))
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 6);
  // Counter-intelligence — internal vulnerability surfaces.
  const counter: CounterIntel[] = [
    { indicator: 'coordination leakage exposure', exposure: clamp((100 - opS.display.telecom) * 0.5 + opS.contention * 0.3) },
    { indicator: 'institutional compromise risk', exposure: clamp((100 - polit.cabinetCohesion) * 0.5 + (100 - post.execConfidence) * 0.25) },
    { indicator: 'strategic dependency manipulation', exposure: clamp(ext.foreignDependency * 0.6 + ext.externalPressure * 0.2) },
    { indicator: 'diplomatic reliability degradation', exposure: clamp((100 - ext.allianceReliability) * 0.7) },
    { indicator: 'reserve-market exploitation', exposure: clamp(ext.reserveSensitivity * 0.6 + Math.max(0, 50 - opS.resources.reserves.headroom) * 0.5) },
  ].map(c => ({ ...c, tone: (c.exposure >= 60 ? 'alert' : c.exposure >= 38 ? 'warn' : 'ok') as CounterIntel['tone'] }))
    .sort((a, b) => b.exposure - a.exposure);
  // Preemptive measures — act before visible collapse, keyed to top signals.
  const PRE: Record<string, string> = {
    telecom: 'telecom hardening ahead of outage',
    reserve: 'reserve reinforcement ahead of shortage',
    corridor: 'corridor stabilization ahead of congestion',
    external: 'diplomatic caution ahead of escalation',
    economic: 'liquidity ring-fencing ahead of market pressure',
    covert: 'internal-security tightening ahead of destabilization',
    sabotage: 'critical-infrastructure protection ahead of compromise',
    dependency: 'supply diversification ahead of dependency shock',
  };
  const preemptive = raw.filter(r => r.risk >= 50)
    .sort((a, b) => b.risk - a.risk).slice(0, 4)
    .map(r => PRE[r.key] ?? 'preemptive stabilization');
  const threatLevel = clamp(
    (signals.reduce((s, x) => s + x.risk, 0) / Math.max(1, signals.length)) * 0.6
    + (counter.reduce((s, x) => s + x.exposure, 0) / Math.max(1, counter.length)) * 0.4);
  const posture = threatLevel >= 72 ? 'CRITICAL'
    : threatLevel >= 56 ? 'ALERT'
    : threatLevel >= 40 ? 'ELEVATED'
    : threatLevel >= 24 ? 'GUARDED'
    : 'NOMINAL';
  const memoNote = intelMem.neg > intelMem.pos + 14
    ? 'prior assessments under-weighted emerging pressure — caution bias applied'
    : intelMem.pos >= intelMem.neg + 14
      ? 'preemptive assessments historically validated — analytic confidence reinforced'
      : 'mixed assessment record — interpretations held at stated confidence';
  return { signals, counter, preemptive, assessmentConfidence, threatLevel, posture, memoNote };
}

// ── National continuity chronology ────────────────────────────────────────
// The doctrine is a pure function of the operating epoch, so the nation's
// trajectory can be deterministically replayed. This reconstructs the
// continuity record — era segmentation, posture/leadership transitions and
// analytical historical interpretation — without any stored state.
export interface ChronEvent {
  epoch: number;
  kind: 'era' | 'posture' | 'external' | 'administration' | 'confidence';
  text: string;
  tone: 'ok' | 'warn' | 'alert' | 'neutral';
}
export interface ChronEra { from: number; to: number; label: string; }
export interface NationalChronology {
  events: ChronEvent[];
  eras: ChronEra[];
  interpretation: string[];
  currentEra: string;
  administration: number;
  span: number;            // epochs covered
}
export function nationalChronology(epoch: number, contention: number): NationalChronology {
  const start = Math.max(0, epoch - 14);
  const events: ChronEvent[] = [];
  const eras: ChronEra[] = [];
  let prevPost = '', prevExt = '', prevEra = '', prevAdmin = -1, prevConfBand = '';
  let eraStart = start, eraLabel = '';
  const confBand = (c: number) => (c >= 70 ? 'high' : c >= 45 ? 'moderate' : 'low');
  for (let e = start; e <= epoch; e++) {
    const post = nationalPosture(e);
    const ext = externalEnvironment(e);
    const reg = nationalDirectiveRegister(post, contention, e);
    const admin = Math.floor(e / 12) + 1;
    const cb = confBand(post.execConfidence);
    if (e === start) { prevPost = post.label; prevExt = ext.label; prevEra = reg.era; prevAdmin = admin; prevConfBand = cb; eraLabel = reg.era; }
    if (reg.era !== prevEra) {
      eras.push({ from: eraStart, to: e - 1, label: eraLabel });
      eraStart = e; eraLabel = reg.era;
      events.push({ epoch: e, kind: 'era', text: `Governing era transition: ${prevEra} → ${reg.era}`, tone: 'neutral' });
      prevEra = reg.era;
    }
    if (post.label !== prevPost) {
      const worse = post.execConfidence < 45;
      events.push({ epoch: e, kind: 'posture', text: `Doctrine posture shifted: ${prevPost} → ${post.label}`, tone: worse ? 'warn' : 'ok' });
      prevPost = post.label;
    }
    if (ext.label !== prevExt) {
      const worse = ext.externalPressure >= 46;
      events.push({ epoch: e, kind: 'external', text: `External environment: ${prevExt} → ${ext.label}`, tone: worse ? 'alert' : 'ok' });
      prevExt = ext.label;
    }
    if (admin !== prevAdmin) {
      events.push({ epoch: e, kind: 'administration', text: `Administration ${admin} assumed continuity of government`, tone: 'neutral' });
      prevAdmin = admin;
    }
    if (cb !== prevConfBand) {
      events.push({ epoch: e, kind: 'confidence', text: `Executive confidence ${cb === 'low' ? 'weakened to low' : cb === 'high' ? 'strengthened to high' : 'moved to moderate'}`, tone: cb === 'low' ? 'alert' : cb === 'high' ? 'ok' : 'warn' });
      prevConfBand = cb;
    }
  }
  eras.push({ from: eraStart, to: epoch, label: eraLabel });
  const nowPost = nationalPosture(epoch);
  const nowExt = externalEnvironment(epoch);
  const nowReg = nationalDirectiveRegister(nowPost, contention, epoch);
  // Historical interpretation — analytical, not archival.
  const interpretation: string[] = [];
  if (nowPost.deploymentConservatism >= 58) interpretation.push('Continuity preserved through conservative reserve policy.');
  if (nowPost.containmentWeight >= 58) interpretation.push('Legitimacy erosion followed prolonged containment posture.');
  if (nowExt.externalPressure >= 50) interpretation.push('External pressure accumulation amplified internal strain.');
  if (events.filter(x => x.kind === 'era').length >= 2) interpretation.push('The state transitioned through successive governing eras under sustained pressure.');
  if (nowPost.execConfidence >= 70) interpretation.push('Demonstrated competence rebuilt executive assertiveness over the period.');
  else if (nowPost.execConfidence < 45) interpretation.push('Repeated strain suppressed executive confidence across administrations.');
  if (nowReg.failed > nowReg.completed) interpretation.push('Directive failure outpaced completion — doctrine caution increased.');
  else if (nowReg.completed > nowReg.failed) interpretation.push('Directive completion outpaced failure — institutional trust reinforced.');
  if (interpretation.length === 0) interpretation.push('Continuity held without major doctrinal discontinuity over the period.');
  return {
    events: events.slice(-12),
    eras,
    interpretation,
    currentEra: nowReg.era,
    administration: Math.floor(epoch / 12) + 1,
    span: epoch - start + 1,
  };
}

// ── Multi-sovereign coordination & alliance realism ───────────────────────
// No sovereign operates in isolation. This models the external coordination
// environment: partner blocs of varying reliability that strategically
// diverge, multinational dependency exposure, regional order and the
// executive negotiation tension between national survival and alliance
// obligation. Builds on externalEnvironment (no duplicated logic).
export interface AlliancePartner {
  name: string;
  role: string;
  reliability: number;  // 0..100
  stance: 'aligned' | 'conditional' | 'diverging' | 'restraint' | 'escalation';
  tone: 'ok' | 'warn' | 'alert';
}
export interface DependencyChannel { channel: string; exposure: number; tone: 'ok' | 'warn' | 'alert'; }
export interface AllianceFramework {
  partners: AlliancePartner[];
  coalitionConsensus: number;     // 0..100
  treatyReliability: number;      // 0..100
  dependency: DependencyChannel[];
  regionalOrder: string;          // STABLE ORDER | FRAGILE EQUILIBRIUM | STRAINED BLOC | FRAGMENTED REGION | SANCTION-HEAVY ENVIRONMENT
  negotiationTension: number;     // 0..100 survival-vs-obligation strain
  memoNote: string;               // interstate continuity memory
  blocPosture: string;            // COHESIVE | FUNCTIONAL | DIVIDED | FRACTURED
}
export function allianceFramework(
  ext: ExternalEnvironment, post: NationalPosture, society: NationalSociety,
  foresight: StrategicForesight, powersLevel: number, epoch: number,
): AllianceFramework {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  const mem = eventMemory('ally:hist', epoch, 16, 0.57, 0.34, 5);
  const baseRel = ext.allianceReliability + mem.pos * 0.12 - mem.neg * 0.16;
  const DEFS: { name: string; role: string; bias: number }[] = [
    { name: 'Northern Security Pact', role: 'collective security & intelligence', bias: 4 },
    { name: 'Regional Trade Bloc', role: 'trade & logistics corridors', bias: -6 },
    { name: 'Strategic Energy Partners', role: 'energy & infrastructure', bias: 0 },
    { name: 'Continuity Treaty Group', role: 'reserve-sharing & recovery', bias: 6 },
    { name: 'Diplomatic Coordination Forum', role: 'sanction & diplomatic alignment', bias: -10 },
  ];
  const partners: AlliancePartner[] = DEFS.map(d => {
    const reliability = clamp(baseRel + d.bias - ext.externalPressure * 0.2
      + seed(`ally:${d.name}:${epoch}`) * 18 - 9);
    // stance diverges with external pressure, foresight risk and reliability.
    const press = ext.externalPressure + foresight.projRisk * 0.4;
    let stance: AlliancePartner['stance'];
    if (reliability >= 70 && press < 60) stance = 'aligned';
    else if (reliability < 42) stance = 'diverging';
    else if (press >= 70) stance = seed(`ally:s:${d.name}:${epoch}`) > 0.5 ? 'escalation' : 'restraint';
    else stance = 'conditional';
    const tone: AlliancePartner['tone'] = reliability >= 65 ? 'ok' : reliability >= 45 ? 'warn' : 'alert';
    return { name: d.name, role: d.role, reliability, stance, tone };
  }).sort((a, b) => b.reliability - a.reliability);
  const meanRel = partners.reduce((s, p) => s + p.reliability, 0) / partners.length;
  const diverging = partners.filter(p => p.stance === 'diverging' || p.stance === 'escalation').length;
  const coalitionConsensus = clamp(meanRel - diverging * 9 - ext.externalPressure * 0.12);
  const treatyReliability = clamp(meanRel * 0.7 + (100 - ext.intlCoordLoad) * 0.3);
  const dependency: DependencyChannel[] = [
    { channel: 'telecom & coordination imports', exposure: clamp(ext.foreignDependency * 0.6 + ext.externalPressure * 0.2) },
    { channel: 'strategic energy reliance', exposure: clamp(ext.foreignDependency * 0.5 + 14) },
    { channel: 'reserve-market vulnerability', exposure: clamp(ext.reserveSensitivity * 0.7 + (100 - treatyReliability) * 0.2) },
    { channel: 'foreign logistics corridors', exposure: clamp(ext.foreignDependency * 0.55 + ext.externalPressure * 0.15) },
    { channel: 'treaty-based security dependence', exposure: clamp((100 - treatyReliability) * 0.6 + ext.externalPressure * 0.18) },
  ].map(c => ({ ...c, tone: (c.exposure >= 60 ? 'alert' : c.exposure >= 40 ? 'warn' : 'ok') as DependencyChannel['tone'] }))
    .sort((a, b) => b.exposure - a.exposure);
  const regionalOrder =
    ext.externalPressure >= 66 ? 'SANCTION-HEAVY ENVIRONMENT'
    : ext.externalPressure >= 50 || diverging >= 3 ? 'FRAGMENTED REGION'
    : coalitionConsensus < 48 ? 'STRAINED BLOC'
    : coalitionConsensus < 64 ? 'FRAGILE EQUILIBRIUM'
    : 'STABLE ORDER';
  // Executive negotiation tension — survival vs. obligation.
  const negotiationTension = clamp(
    post.deploymentConservatism * 0.24 + ext.foreignDependency * 0.26
    + Math.max(0, powersLevel - 1) * 14 + (100 - coalitionConsensus) * 0.24
    + (100 - society.economicContinuity) * 0.12);
  const memoNote = mem.neg > mem.pos + 14
    ? 'prior coordination failures scarred diplomacy — alliance caution applied'
    : mem.pos >= mem.neg + 14
      ? 'reliable allied behaviour historically reinforced trust & openness'
      : 'mixed alliance record — treaty commitments weighed cautiously';
  const blocPosture = coalitionConsensus >= 70 ? 'COHESIVE'
    : coalitionConsensus >= 52 ? 'FUNCTIONAL'
    : coalitionConsensus >= 36 ? 'DIVIDED'
    : 'FRACTURED';
  return {
    partners, coalitionConsensus, treatyReliability, dependency,
    regionalOrder, negotiationTension, memoNote, blocPosture,
  };
}

// ── Interactive national execution operations ─────────────────────────────
// The doctrine now executes. Standing national operations require
// coordinated multi-ministry participation, advance through sovereign
// execution phases, accumulate real friction, degrade when coordination
// fails, and persist across operating epochs. Reuses ministryOperations
// for per-ministry contribution (no duplicated execution logic).
const OPERATION_DEFS: { key: string; title: string; ministries: string[]; span: number }[] = [
  { key: 'reserve-rebuild', title: 'National reserve rebuilding campaign', ministries: ['FINANCE', 'ENERGY', 'TRADE'], span: 15 },
  { key: 'telecom-restore', title: 'Telecom restoration programme', ministries: ['TELECOM', 'ENERGY', 'INTERIOR'], span: 9 },
  { key: 'infra-harden', title: 'Strategic infrastructure hardening', ministries: ['ENERGY', 'TRANSPORT', 'FINANCE'], span: 14 },
  { key: 'logi-mobilize', title: 'Emergency logistics mobilization', ministries: ['TRANSPORT', 'EMERGENCY', 'HEALTH'], span: 7 },
  { key: 'econ-continuity', title: 'Economic continuity operation', ministries: ['FINANCE', 'TRADE', 'LABOR'], span: 12 },
  { key: 'health-stab', title: 'Healthcare stabilization initiative', ministries: ['HEALTH', 'TRANSPORT', 'INTERIOR'], span: 10 },
];
const OP_PHASES = ['PROPOSED', 'REVIEW', 'AUTHORIZED', 'MOBILIZING', 'PARTIAL EXECUTION',
  'NATIONAL EXECUTION', 'STABILIZING', 'RECOVERY', 'COMPLETED'] as const;
export interface OpMinistry { ministry: string; contribution: number; status: 'on-track' | 'lagging' | 'failing'; }
export interface NationalOperation {
  key: string;
  title: string;
  ministries: OpMinistry[];
  phase: string;
  generation: number;
  progress: number;       // 0..100
  coordination: number;   // 0..100 inter-ministry cohesion for this op
  confidence: number;     // 0..100 executive confidence in the op
  survivability: number;  // 0..100 likelihood it endures to completion
  escalationRisk: number; // 0..100
  friction: string[];
  outcome: 'pending' | 'succeeded' | 'failed';
  tone: 'ok' | 'warn' | 'alert';
}
export function nationalOperations(
  opS: OperatingState, post: NationalPosture, society: NationalSociety,
  ext: ExternalEnvironment, polit: PoliticalContinuity, lead: ExecutiveLeadership,
  alliance: AllianceFramework, epoch: number,
): { operations: NationalOperation[]; activeCount: number; atRisk: number; note: string } {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  let atRisk = 0;
  const operations: NationalOperation[] = OPERATION_DEFS.map(def => {
    const off = Math.floor(seed(`op:off:${def.key}`) * def.span);
    const t = epoch + off;
    const generation = Math.floor(t / def.span) + 1;
    const frac = (t % def.span) / def.span;
    // Per-ministry contribution via the rolling ministry programme.
    const ministries: OpMinistry[] = def.ministries.map(a => {
      const rel = ministryReliability(a, epoch);
      const fat = institutionalFatigue(a, epoch);
      const mp = ministryOperations(a, Math.max(0, 100 - rel), rel, fat, epoch);
      const contribution = clamp(mp.throughput * 0.7 + rel * 0.3 - fat * 0.15);
      return {
        ministry: a, contribution,
        status: contribution >= 56 ? 'on-track' : contribution >= 38 ? 'lagging' : 'failing',
      };
    });
    const coordination = clamp(
      ministries.reduce((s, m) => s + m.contribution, 0) / ministries.length
      - (100 - lead.consensus) * 0.16 - (100 - polit.cabinetCohesion) * 0.12);
    // Friction sources — real execution strain.
    const friction: string[] = [];
    if (lead.consensus < 50) friction.push('ministry disagreement');
    if (opS.resources.reserves.headroom < 40) friction.push('reserve exhaustion');
    if (opS.display.telecom < 80) friction.push('telecom degradation');
    if (opS.resources.transport.util >= 76) friction.push('corridor congestion');
    if (alliance.blocPosture === 'DIVIDED' || alliance.blocPosture === 'FRACTURED') friction.push('alliance hesitation');
    if (post.deploymentConservatism >= 60) friction.push('political caution');
    if (society.civilianConfidence < 45) friction.push('public instability');
    if (opS.contention >= 62) friction.push('infrastructure fatigue');
    if (post.execConfidence < 45) friction.push('low executive confidence');
    if (ext.intlCoordLoad >= 60) friction.push('international coordination drag');
    // Phase — lifecycle gated by coordination & friction load.
    const drag = friction.length * 0.045;
    const eff = Math.max(0, frac - drag);
    let phase: string;
    let outcome: NationalOperation['outcome'] = 'pending';
    if (frac < 0.12) phase = 'PROPOSED';
    else if (frac < 0.22) phase = 'REVIEW';
    else if (frac < 0.32) phase = 'AUTHORIZED';
    else if (coordination < 34) phase = 'FAILED';
    else if (coordination < 46) phase = friction.length >= 5 ? 'DEGRADED' : 'STALLED';
    else if (eff < 0.5) phase = 'MOBILIZING';
    else if (eff < 0.62) phase = 'PARTIAL EXECUTION';
    else if (eff < 0.76) phase = 'NATIONAL EXECUTION';
    else if (eff < 0.86) phase = 'STABILIZING';
    else if (eff < 0.96) phase = 'RECOVERY';
    else phase = coordination >= 52 ? 'COMPLETED' : 'DEGRADED';
    if (phase === 'COMPLETED') outcome = 'succeeded';
    else if (phase === 'FAILED') outcome = 'failed';
    const progress = phase === 'COMPLETED' ? 100
      : phase === 'FAILED' ? clamp(frac * 70)
      : clamp(eff * 100);
    const confidence = clamp(
      lead.decisionQuality * 0.34 + coordination * 0.4 + post.execConfidence * 0.16
      - friction.length * 4);
    const survivability = clamp(
      coordination * 0.45 + opS.resources.reserves.headroom * 0.22
      + polit.governanceContinuity * 0.18 - friction.length * 3.5);
    const escalationRisk = clamp(
      ext.externalPressure * 0.34 + opS.contention * 0.26
      + (100 - coordination) * 0.24 + friction.length * 2);
    const tone: NationalOperation['tone'] =
      phase === 'FAILED' || survivability < 34 ? 'alert'
      : phase === 'STALLED' || phase === 'DEGRADED' || survivability < 52 ? 'warn' : 'ok';
    if (tone !== 'ok') atRisk++;
    return {
      key: def.key, title: def.title, ministries, phase, generation, progress,
      coordination, confidence, survivability, escalationRisk, friction, outcome, tone,
    };
  });
  const activeCount = operations.filter(o => o.outcome === 'pending').length;
  const note = atRisk === 0
    ? 'all national operations executing within coordination tolerance'
    : `${atRisk} operation${atRisk > 1 ? 's' : ''} under coordination strain — executive oversight required`;
  return { operations, activeCount, atRisk, note };
}

// ── National population & social order ────────────────────────────────────
// The state governs people, not only infrastructure. Distinct societal
// cohorts react differently to doctrine, civil order evolves dynamically,
// the public remembers, and society feeds back into governing capability.
// Builds on nationalSociety (consumes it; no duplicated social logic).
export interface PopulationCohort {
  name: string;
  sentiment: number;    // 0..100 supportive/calm
  compliance: number;   // 0..100
  tone: 'ok' | 'warn' | 'alert';
}
export interface PopulationOrder {
  cohorts: PopulationCohort[];
  protestPressure: number;   // 0..100
  civilFatigue: number;      // 0..100
  panicRisk: number;         // 0..100
  migrationPressure: number; // 0..100
  morale: number;            // 0..100
  governability: number;     // 0..100
  feedbackDrag: number;      // 0..100 society→state capability drag
  label: string;             // GOVERNABLE | STRAINED | FRACTURING | UNGOVERNABLE
  memoNote: string;
}
export function populationOrder(
  opS: OperatingState, post: NationalPosture, society: NationalSociety,
  ext: ExternalEnvironment, polit: PoliticalContinuity, peakPressure: number, epoch: number,
): PopulationOrder {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  const econ = society.economicContinuity, conf = society.civilianConfidence;
  const tel = opS.display.telecom, res = opS.resources.reserves.headroom;
  const cont = post.containmentWeight, trust = society.institutionalTrust;
  const mem = eventMemory('pop:mem', epoch, 16, 0.56, 0.34, 5);
  const memShift = (mem.pos - mem.neg) * 0.12;
  // Each cohort weights the signals it is structurally sensitive to.
  const C = (name: string, base: number) => {
    const sentiment = clamp(base + memShift);
    const compliance = clamp(sentiment * 0.7 + trust * 0.3 - cont * 0.1);
    return { name, sentiment, compliance, tone: (sentiment >= 58 ? 'ok' : sentiment >= 40 ? 'warn' : 'alert') as PopulationCohort['tone'] };
  };
  const cohorts: PopulationCohort[] = [
    C('Urban population', tel * 0.3 + econ * 0.34 + (100 - cont) * 0.22 + conf * 0.14),
    C('Industrial workforce', econ * 0.4 + (100 - opS.display.gridLoad) * 0.24 + (100 - cont) * 0.2 + 6),
    C('Rural population', (100 - society.recoveryLag) * 0.4 + econ * 0.26 + conf * 0.2),
    C('Logistics sector', (100 - opS.resources.transport.util) * 0.42 + econ * 0.3 + 4),
    C('Healthcare personnel', (100 - Math.max(0, peakPressure - 55)) * 0.5 + trust * 0.26),
    C('Institutional workforce', post.execConfidence * 0.36 + polit.legitimacy * 0.34 + trust * 0.2),
    C('Reserve-dependent civilians', res * 0.45 + econ * 0.3 + conf * 0.12),
    C('Youth & students', tel * 0.28 + econ * 0.3 + (100 - society.socialStrain) * 0.28),
    C('Vulnerable populations', conf * 0.34 + res * 0.26 + (100 - cont) * 0.24),
  ];
  const meanSent = cohorts.reduce((s, c) => s + c.sentiment, 0) / cohorts.length;
  const meanComp = cohorts.reduce((s, c) => s + c.compliance, 0) / cohorts.length;
  const protestPressure = clamp((100 - meanSent) * 0.55 + cont * 0.2 + society.socialStrain * 0.2);
  const civilFatigue = clamp(society.socialStrain * 0.4 + cont * 0.24 + (100 - econ) * 0.2 + mem.neg * 0.1);
  const panicRisk = clamp((100 - tel) * 0.34 + (100 - res) * 0.28 + (100 - conf) * 0.24);
  const migrationPressure = clamp(ext.externalPressure * 0.3 + polit.regionalStrain * 0.34 + (100 - econ) * 0.22);
  const morale = clamp(meanSent * 0.5 + conf * 0.26 + (100 - civilFatigue) * 0.18);
  const governability = clamp(
    meanComp * 0.4 + trust * 0.24 + morale * 0.2 - protestPressure * 0.18 - panicRisk * 0.12);
  // Society→state capability drag (reported, not recursively fed back).
  const feedbackDrag = clamp(
    (100 - meanComp) * 0.4 + civilFatigue * 0.26 + protestPressure * 0.2 + migrationPressure * 0.14);
  const label = governability >= 66 ? 'GOVERNABLE'
    : governability >= 48 ? 'STRAINED'
    : governability >= 30 ? 'FRACTURING'
    : 'UNGOVERNABLE';
  const memoNote = mem.neg > mem.pos + 14
    ? 'repeated failure scarred public trust — long-term civic caution'
    : mem.pos >= mem.neg + 14
      ? 'resilient recoveries rebuilt legitimacy & national cohesion'
      : 'mixed public memory — civic belief held conditionally';
  return {
    cohorts: cohorts.sort((a, b) => a.sentiment - b.sentiment),
    protestPressure, civilFatigue, panicRisk, migrationPressure, morale,
    governability, feedbackDrag, label, memoNote,
  };
}

// Govern one incident end-to-end from the shared doctrine — causality,
// cascade, latency, decision pipeline, mandate, executive gate, authority
// chain, prioritization conflict, aging, recovery & cognition. One source.
export function governIncident(inp: GovInput): IncidentGovernance {
  const lvl = typeof inp.severity === 'number'
    ? inp.severity
    : inp.severity === 'sev1' ? 3 : inp.severity === 'sev2' ? 2 : 1;
  const arch = inp.archetype;
  const behavior = ministryBehavior(arch);
  const reliability = ministryReliability(arch, inp.epoch);
  const dep = depChain(arch);
  const cause = dep.up.length ? dep.up.join('·') : 'root cause';
  const cascade = cascadeChain(arch, lvl);
  const lat = responseLatency(arch, lvl, inp.contention, inp.telecom, inp.reservesHeadroom);
  const eta = lat.totalMin >= 60 ? `${(lat.totalMin / 60).toFixed(1)}h` : `${lat.totalMin}m`;
  // Strategic doctrine drift — long-running national history bends the
  // effective authorization cadence (single shared posture).
  const post = inp.posture ?? nationalPosture(inp.epoch);
  // Institutional fatigue slows escalation velocity (felt, not shown loudly).
  const fatigue = institutionalFatigue(arch, inp.epoch);
  const effAuth = behavior.auth * post.authThreshold;
  const pIdx = pipeStage(lvl, inp.ageM / (effAuth * (1 + fatigue / 240)), inp.ack);
  const stageCur = PIPELINE[pIdx]!;
  const stageNext = PIPELINE[Math.min(8, pIdx + 1)]!;
  const machinery = responseMachinery(pIdx);
  const stTone = pIdx >= 7 ? 'ok' : pIdx >= 4 ? 'accent' : pIdx >= 2 ? 'warn' : 'alert';
  const mandate = mandateFor(lvl);
  const gate = executiveGate(lvl, inp.ageM, inp.ack, effAuth, inp.contention);
  const authority = authorityChain(arch, lvl);
  const conflict = priorityConflict(arch, inp.contention);
  const velocity = commandVelocity(lvl, effAuth, inp.contention);
  const wear = Math.min(100, Math.round(inp.ageM * (inp.ack ? 0.7 : 1.4) + corridorFatigue(inp.ministryId, inp.epoch) * 0.4 + (pIdx <= 3 ? 16 : 0)));
  const aged = wear >= 55;
  const wornDot = aged && !inp.ack;
  // stabilization caution: a strategically scarred nation distrusts fragile
  // recovery, so residual strain lingers harder late in the pipeline.
  const cautionDrag = pIdx >= 6 ? Math.round(post.stabilizationCaution * 0.08) : 0;
  const strain = Math.max(6, Math.min(99, Math.round(
    inp.prop * 0.5 + lvl * 12 + inp.ageM * 0.3 + inp.contention * 0.2 + wear * 0.12
    - (pIdx >= 8 ? 40 : pIdx >= 7 ? 24 : pIdx >= 6 ? 14 : 0) + (aged && pIdx >= 6 ? 8 : 0) + cautionDrag)));
  const strainTone: 'ok' | 'warn' | 'alert' = strain >= 75 ? 'alert' : strain >= 50 ? 'warn' : 'ok';
  const fragile = pIdx === 7;
  // containment-weighted doctrine raises attention to spreading events.
  const attention = Math.min(100, attentionWeight(lvl, cascade.depth, dep.down.length, inp.ageM, inp.ack, inp.contention)
    + (cascade.depth >= 1 ? Math.round(post.containmentWeight * 0.08) : 0));
  // confidence tempered by institutional confidence & telecom-failure scarring.
  const baseConf = commandConfidence(inp.ack, inp.ageM, inp.telecom, inp.contention, fatigue);
  const confPct = Math.max(20, Math.min(99, Math.round(
    baseConf.pct * 0.7 + post.execConfidence * 0.3 - post.coordinationCaution * 0.08)));
  const conf = {
    pct: confPct,
    label: confPct >= 85 ? 'verified' : confPct >= 68 ? 'probable' : confPct >= 48 ? 'uncertain' : 'contested',
  };
  const burden = coordinationBurden(cascade.depth, inp.telecom, inp.contention);
  const field = fieldDeployment(
    inp.ministryId, pIdx, lvl, inp.telecom, inp.transportUtil ?? inp.contention,
    inp.reservesHeadroom, inp.contention, post, fatigue, inp.epoch);
  return {
    lvl, arch, behavior, reliability, cause, dep, cascade, latencyMin: lat.totalMin, eta,
    pIdx, stageCur, stageNext, machinery, stTone, mandate, gate, authority, conflict,
    velocity, wear, aged, wornDot, strain, strainTone, fragile,
    attention, fatigue, confidence: conf.pct, confLabel: conf.label, burden, field,
  };
}
