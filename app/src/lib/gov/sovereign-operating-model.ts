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
  const deploymentConservatism = norm(reserveDepl * 1.1);
  const containmentWeight = norm(unrest);
  const coordinationCaution = norm(telecomFail);
  const stabilizationCaution = norm(containFail);
  const geopolitical = norm(external);
  // confidence: successful recoveries build it, containment failures erode it
  const execConfidence = Math.max(15, Math.min(95, Math.round(
    60 + norm(recoverWin) * 0.4 - norm(containFail) * 0.45 - norm(energyStrain) * 0.15)));
  // doctrine drift: chronic severity accelerates authorization, but exhausted
  // reserves & low confidence make it conservative again
  const authThreshold = Math.max(0.55, Math.min(1.7, Number((
    1 + deploymentConservatism / 220 + (100 - execConfidence) / 260 - containmentWeight / 320
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
function societalMemory(epoch: number): { trust: number; scar: number } {
  const H = 14;
  let win = 0, loss = 0, n = 0;
  for (let e = Math.max(0, epoch - H); e <= epoch; e++) {
    const decay = 1 - (epoch - e) / (H + 4);
    if (seed(`soc:rec:${e}`) > 0.55) win += decay; else if (seed(`soc:rec:${e}`) < 0.32) loss += decay;
    n += decay;
  }
  const trust = Math.round((win / Math.max(1, n)) * 100);
  const scar = Math.round((loss / Math.max(1, n)) * 100);
  return { trust, scar };
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
