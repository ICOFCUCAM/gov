// Trade & Industry Systems — deep operational engine (TRADE archetype).
// Business registry, standards/metrology, export facilitation, licensing
// and industrial development as live environments. Pure & deterministic.

import { seed, wave } from '@/lib/telemetry';

export interface TradeOps {
  businessRegistry: { activeM: number; newToday: number; backlog: number; medianDays: number };
  standards: { labs: number; conformityPct: number; certificationsPending: number };
  exports: { corridorsOpen: number; corridorsTotal: number; valueIdx: number; clearanceDays: number };
  licensing: { pending: number; issuedToday: number; slaMetPct: number };
  industrialParks: { parks: number; occupancyPct: number; investmentIdx: number };
  tradeBalanceIdx: number;            // 0-100 (higher better)
}

export function tradeOps(id: string, t: number): TradeOps {
  const corridorsTotal = 8;
  return {
    businessRegistry: {
      activeM: Math.round(wave(`td:ba:${id}`, t, 0.6, 3.4) * 10) / 10,
      newToday: Math.round(wave(`td:bn:${id}`, t, 40, 1400)),
      backlog: Math.round(wave(`td:bb:${id}`, t, 50, 4200)),
      medianDays: Math.round(wave(`td:bm:${id}`, t, 1, 26)),
    },
    standards: {
      labs: 30 + Math.round(seed(`td:sl:${id}`) * 30),
      conformityPct: Math.round(wave(`td:sc:${id}`, t, 70, 99)),
      certificationsPending: Math.round(wave(`td:sp:${id}`, t, 20, 1800)),
    },
    exports: {
      corridorsOpen: Math.max(2, corridorsTotal - Math.round(seed(`td:eo:${id}:${Math.floor(t / 9)}`) * 4)),
      corridorsTotal,
      valueIdx: Math.round(wave(`td:ev:${id}`, t, 44, 96)),
      clearanceDays: Math.round(wave(`td:ec:${id}`, t, 1, 18)),
    },
    licensing: {
      pending: Math.round(wave(`td:lp:${id}`, t, 60, 3800)),
      issuedToday: Math.round(wave(`td:li:${id}`, t, 100, 5200)),
      slaMetPct: Math.round(wave(`td:ls:${id}`, t, 60, 95)),
    },
    industrialParks: {
      parks: 16 + Math.round(seed(`td:ip:${id}`) * 18),
      occupancyPct: Math.round(wave(`td:io:${id}`, t, 48, 95)),
      investmentIdx: Math.round(wave(`td:ii:${id}`, t, 40, 94)),
    },
    tradeBalanceIdx: Math.round(wave(`td:tb:${id}`, t, 38, 88)),
  };
}

export function tradeInstability(id: string, t: number): number {
  const o = tradeOps(id, t);
  const v =
    (o.exports.corridorsTotal - o.exports.corridorsOpen) * 7 +
    Math.max(0, (o.exports.clearanceDays - 7) * 2) +
    Math.max(0, (80 - o.tradeBalanceIdx) * 0.8) +
    Math.max(0, (90 - o.standards.conformityPct) * 0.6);
  return Math.round(Math.max(0, Math.min(100, v)));
}
