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
