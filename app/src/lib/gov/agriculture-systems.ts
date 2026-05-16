// Agriculture Systems — deep operational engine (AGRICULTURE archetype).
// Crop production, livestock/vet, irrigation, food security and farmer
// services as live operational environments. Pure & deterministic.

import { seed, wave } from '@/lib/telemetry';

const REGIONS = ['Northern', 'Eastern', 'Western', 'Coastal', 'Highland', 'Capital District'];

export interface AgricultureOps {
  foodSecurityIndex: number;          // 0-100 higher better
  strategicReserveDays: number;
  crops: { crop: string; yieldIdx: number; tone: 'ok' | 'warn' | 'alert' }[];
  livestockHealthPct: number;
  irrigationCoveragePct: number;
  pestAlerts: number;
  farmersRegisteredM: number;
  subsidyDisbursementPct: number;
  byRegion: { region: string; productionIdx: number; tone: 'ok' | 'warn' | 'alert' }[];
}
const CROPS = ['Maize', 'Rice', 'Wheat', 'Cassava', 'Coffee', 'Horticulture'];

export function agricultureOps(id: string, t: number): AgricultureOps {
  const fs = Math.round(wave(`ag:fs:${id}`, t, 45, 95));
  return {
    foodSecurityIndex: fs,
    strategicReserveDays: Math.round(wave(`ag:sr:${id}`, t, 14, 120)),
    crops: CROPS.map((crop, i) => {
      const y = Math.round(wave(`ag:cy:${id}:${i}`, t, 40, 99));
      return { crop, yieldIdx: y, tone: y >= 75 ? 'ok' : y >= 55 ? 'warn' : 'alert' };
    }),
    livestockHealthPct: Math.round(wave(`ag:lh:${id}`, t, 60, 97)),
    irrigationCoveragePct: Math.round(wave(`ag:ir:${id}`, t, 28, 82)),
    pestAlerts: Math.round(seed(`ag:pa:${id}:${Math.floor(t / 8)}`) * 16),
    farmersRegisteredM: Math.round(wave(`ag:fr:${id}`, t, 2, 9) * 10) / 10,
    subsidyDisbursementPct: Math.round(wave(`ag:sd:${id}`, t, 40, 96)),
    byRegion: REGIONS.map((region, i) => {
      const p = Math.round(wave(`ag:rp:${id}:${i}`, t, 45, 98));
      return { region, productionIdx: p, tone: p >= 75 ? 'ok' : p >= 55 ? 'warn' : 'alert' };
    }),
  };
}

export function agricultureInstability(id: string, t: number): number {
  const o = agricultureOps(id, t);
  const v =
    Math.max(0, (80 - o.foodSecurityIndex)) * 1.3 +
    Math.max(0, (30 - o.strategicReserveDays)) * 1.0 +
    o.pestAlerts * 1.4 +
    Math.max(0, (90 - o.livestockHealthPct)) * 0.5;
  return Math.round(Math.max(0, Math.min(100, v)));
}
