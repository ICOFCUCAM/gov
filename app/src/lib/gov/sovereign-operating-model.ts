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
