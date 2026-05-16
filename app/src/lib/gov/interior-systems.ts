// Interior Systems — deep operational engine (INTERIOR archetype).
// Civil identity, border control, internal coordination and licensing
// as live operational environments. Pure & deterministic.

import { seed, wave } from '@/lib/telemetry';

export interface InteriorOps {
  identity: { enrolledM: number; issuanceBacklog: number; verificationsPerHr: number; uptimePct: number };
  border: { posts: number; open: number; crossingsToday: number; flaggedEntries: number; meanClearanceMin: number };
  coordination: { cellsActive: number; jointOpsActive: number; publicOrderIndex: number };
  licensing: { pending: number; issuedToday: number; slaMetPct: number };
  internalThreatLevel: 'low' | 'guarded' | 'elevated' | 'high';
}

export function interiorOps(id: string, t: number): InteriorOps {
  const posts = 60 + Math.round(seed(`io:bp:${id}`) * 90);
  const order = Math.round(wave(`io:po:${id}`, t, 42, 95));
  const lvl: InteriorOps['internalThreatLevel'] = order < 55 ? 'high' : order < 68 ? 'elevated' : order < 82 ? 'guarded' : 'low';
  return {
    identity: {
      enrolledM: Math.round(wave(`io:ie:${id}`, t, 22, 46) * 10) / 10,
      issuanceBacklog: Math.round(wave(`io:ib:${id}`, t, 200, 9400)),
      verificationsPerHr: Math.round(wave(`io:iv:${id}`, t, 400, 12000)),
      uptimePct: Math.round(wave(`io:iu:${id}`, t, 96, 100) * 100) / 100,
    },
    border: {
      posts, open: Math.max(1, posts - Math.round(seed(`io:bc:${id}:${Math.floor(t / 9)}`) * 6)),
      crossingsToday: Math.round(wave(`io:bx:${id}`, t, 4000, 90000)),
      flaggedEntries: Math.round(wave(`io:bf:${id}`, t, 0, 140)),
      meanClearanceMin: Math.round(wave(`io:bm:${id}`, t, 4, 48)),
    },
    coordination: {
      cellsActive: Math.round(wave(`io:cc:${id}`, t, 6, 40)),
      jointOpsActive: Math.round(wave(`io:jo:${id}`, t, 0, 14)),
      publicOrderIndex: order,
    },
    licensing: {
      pending: Math.round(wave(`io:lp:${id}`, t, 100, 5200)),
      issuedToday: Math.round(wave(`io:li:${id}`, t, 200, 8000)),
      slaMetPct: Math.round(wave(`io:ls:${id}`, t, 62, 96)),
    },
    internalThreatLevel: lvl,
  };
}

export function interiorInstability(id: string, t: number): number {
  const o = interiorOps(id, t);
  const v =
    Math.max(0, (85 - o.coordination.publicOrderIndex)) * 1.2 +
    o.border.flaggedEntries * 0.4 +
    (o.border.posts - o.border.open) * 4 +
    Math.max(0, (o.border.meanClearanceMin - 20)) * 0.8;
  return Math.round(Math.max(0, Math.min(100, v)));
}
