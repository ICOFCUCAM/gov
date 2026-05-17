// Energy Systems — deep operational engine (ENERGY archetype).
// Generation, grid, electrification, fuel reserves and consumer services
// as live operational environments. Pure & deterministic.

import { seed, wave } from '@/lib/telemetry';

export interface EnergyOps {
  gridFrequencyHz: number;
  reserveMarginPct: number;
  demandGw: number; supplyGw: number;
  generation: { source: string; outputPct: number; tone: 'ok' | 'warn' | 'alert' }[];
  substations: { total: number; online: number; faults: number };
  electrificationPct: number;
  outageMinutesPerDay: number;
  fuelReserveDays: number;
  loadShedding: boolean;
}
const SOURCES = ['Hydro', 'Thermal', 'Solar', 'Wind', 'Imports'];

export function energyOps(id: string, t: number): EnergyOps {
  const demand = Math.round(wave(`eg:dm:${id}`, t, 6, 18) * 10) / 10;
  const supply = Math.round(wave(`eg:sp:${id}`, t, 6, 19) * 10) / 10;
  const reserve = Math.round(((supply - demand) / Math.max(1, demand)) * 100);
  const subsTotal = 120 + Math.round(seed(`eg:st:${id}`) * 160);
  const online = Math.round(subsTotal * wave(`eg:so:${id}`, t, 0.82, 0.99));
  return {
    gridFrequencyHz: Math.round(wave(`eg:fr:${id}`, t, 49.4, 50.3) * 100) / 100,
    reserveMarginPct: reserve,
    demandGw: demand,
    supplyGw: supply,
    generation: SOURCES.map((source, i) => {
      const out = Math.round(wave(`eg:o:${id}:${i}`, t, 30, 99));
      return { source, outputPct: out, tone: out >= 75 ? 'ok' : out >= 55 ? 'warn' : 'alert' };
    }),
    substations: { total: subsTotal, online, faults: subsTotal - online },
    electrificationPct: Math.round(wave(`eg:el:${id}`, t, 62, 98)),
    outageMinutesPerDay: Math.round(wave(`eg:ou:${id}`, t, 0, 120)),
    fuelReserveDays: Math.round(wave(`eg:fu:${id}`, t, 6, 60)),
    loadShedding: reserve < 6,
  };
}

// ── Energy Command ───────────────────────────────────────────────────
// Grid & energy-security authority: synthesises generation/grid/reserve
// state into one emergent posture, domain rollup and ranked directives.
export interface EnDomainStatus { domain: string; metric: string; value: string; tone: 'ok' | 'warn' | 'alert' }
export interface EnDirective { priority: 'critical' | 'priority' | 'advisory'; title: string; rationale: string; target: string }
export interface EnergyCommand {
  postureIndex: number;
  posture: 'steady' | 'engaged' | 'crisis';
  domains: EnDomainStatus[];
  directives: EnDirective[];
  criticalDomains: number;
}
export function energyCommand(id: string, t: number): EnergyCommand {
  const o = energyOps(id, t);
  const freqDev = Math.abs(o.gridFrequencyHz - 50);
  const worstGen = [...o.generation].sort((a, b) => a.outputPct - b.outputPct)[0]!;
  const domains: EnDomainStatus[] = [
    { domain: 'Grid frequency', metric: 'Deviation', value: `${o.gridFrequencyHz}Hz`,
      tone: freqDev <= 0.2 ? 'ok' : freqDev <= 0.4 ? 'warn' : 'alert' },
    { domain: 'Reserve margin', metric: 'Headroom', value: `${o.reserveMarginPct}%`,
      tone: o.reserveMarginPct >= 12 ? 'ok' : o.reserveMarginPct >= 6 ? 'warn' : 'alert' },
    { domain: `Weakest source · ${worstGen.source}`, metric: 'Output', value: `${worstGen.outputPct}%`,
      tone: worstGen.tone },
    { domain: 'Substation faults', metric: 'Offline', value: `${o.substations.faults}`,
      tone: o.substations.faults > 24 ? 'alert' : o.substations.faults > 10 ? 'warn' : 'ok' },
    { domain: 'Fuel reserves', metric: 'Days cover', value: `${o.fuelReserveDays}d`,
      tone: o.fuelReserveDays < 14 ? 'alert' : o.fuelReserveDays < 30 ? 'warn' : 'ok' },
  ];
  const directives: EnDirective[] = [];
  if (o.loadShedding) directives.push({ priority: 'critical', title: 'Activate load-shedding management & demand response', rationale: `Reserve margin ${o.reserveMarginPct}% — supply deficit`, target: 'grid' });
  if (freqDev > 0.4) directives.push({ priority: 'critical', title: 'Stabilise grid frequency', rationale: `Frequency ${o.gridFrequencyHz}Hz off nominal`, target: 'grid' });
  if (worstGen.tone === 'alert') directives.push({ priority: 'priority', title: `Recover ${worstGen.source} generation`, rationale: `${worstGen.source} output ${worstGen.outputPct}%`, target: 'generation' });
  if (o.fuelReserveDays < 14) directives.push({ priority: 'priority', title: 'Replenish strategic fuel reserves', rationale: `${o.fuelReserveDays}d reserve cover`, target: 'fuel' });
  if (o.electrificationPct < 75) directives.push({ priority: 'advisory', title: 'Accelerate electrification programme', rationale: `Access at ${o.electrificationPct}%`, target: 'access' });
  directives.sort((a, b) => ({ critical: 0, priority: 1, advisory: 2 }[a.priority] - { critical: 0, priority: 1, advisory: 2 }[b.priority]));
  const criticalDomains = domains.filter(d => d.tone === 'alert').length;
  const postureIndex = Math.max(0, Math.min(100, Math.round((100 - energyInstability(id, t)) * 0.5 + (100 - criticalDomains * 18) * 0.5)));
  const posture: EnergyCommand['posture'] =
    criticalDomains >= 3 || postureIndex < 45 ? 'crisis' : criticalDomains >= 1 || postureIndex < 70 ? 'engaged' : 'steady';
  return { postureIndex, posture, domains, directives, criticalDomains };
}

export function energyInstability(id: string, t: number): number {
  const o = energyOps(id, t);
  const v =
    Math.max(0, (8 - o.reserveMarginPct) * 6) +
    Math.abs(o.gridFrequencyHz - 50) * 40 +
    o.substations.faults * 1.2 +
    o.outageMinutesPerDay * 0.4 +
    (o.loadShedding ? 20 : 0);
  return Math.round(Math.max(0, Math.min(100, v)));
}
