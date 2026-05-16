// National infrastructure topology — the digital-twin substrate the
// strategic map renders: typed asset clusters and linear networks
// (road, rail, power grid, telecom backbone, water, pipelines) in the
// 1000×620 map space. Pure & deterministic; no React/DOM.

import { seed, wave } from '@/lib/telemetry';

export type AssetKind =
  | 'hospital' | 'port' | 'airport' | 'power' | 'telecom' | 'water'
  | 'logistics' | 'military' | 'industrial' | 'customs';

export interface Asset { id: string; kind: AssetKind; x: number; y: number; tier: 1 | 2 | 3 }
export interface NetworkSeg { id: string; kind: 'road' | 'rail' | 'grid' | 'telecom' | 'water' | 'pipeline'; d: string }

// Anchor settlements (also the rough landmass spine).
const HUBS = [
  { x: 520, y: 356 }, { x: 320, y: 196 }, { x: 545, y: 188 },
  { x: 770, y: 232 }, { x: 286, y: 404 }, { x: 742, y: 432 },
];

const KIND_BY_I: AssetKind[] = [
  'hospital', 'power', 'telecom', 'water', 'logistics', 'port',
  'airport', 'military', 'industrial', 'customs',
];

/** ~140 deterministic infrastructure assets clustered around hubs. */
export function nationalAssets(): Asset[] {
  const out: Asset[] = [];
  let n = 0;
  for (let h = 0; h < HUBS.length; h++) {
    const hub = HUBS[h]!;
    const count = 18 + Math.round(seed(`acount:${h}`) * 10);
    for (let i = 0; i < count; i++) {
      const ang = seed(`aa:${h}:${i}`) * Math.PI * 2;
      const rad = 18 + seed(`ar:${h}:${i}`) * 130;
      const kind = KIND_BY_I[Math.floor(seed(`ak:${h}:${i}`) * KIND_BY_I.length)] ?? 'hospital';
      const tier = (seed(`at:${h}:${i}`) > 0.85 ? 1 : seed(`at:${h}:${i}`) > 0.55 ? 2 : 3) as 1 | 2 | 3;
      out.push({
        id: `A${n++}`, kind, tier,
        x: Math.max(20, Math.min(980, hub.x + Math.cos(ang) * rad)),
        y: Math.max(20, Math.min(600, hub.y + Math.sin(ang) * rad * 0.66)),
      });
    }
  }
  return out;
}

function chain(kind: NetworkSeg['kind'], order: number[], bow: number): NetworkSeg[] {
  const segs: NetworkSeg[] = [];
  for (let i = 0; i < order.length - 1; i++) {
    const a = HUBS[order[i]!]!, b = HUBS[order[i + 1]!]!;
    const mx = (a.x + b.x) / 2 + (seed(`${kind}:${i}:mx`) - 0.5) * bow;
    const my = (a.y + b.y) / 2 - bow * 0.4 - seed(`${kind}:${i}:my`) * bow * 0.4;
    segs.push({ id: `${kind}${i}`, kind, d: `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}` });
  }
  return segs;
}

/** Linear infrastructure networks across the territory. */
export function nationalNetworks(): NetworkSeg[] {
  return [
    ...chain('road', [4, 0, 1, 2, 3, 5, 0], 90),
    ...chain('rail', [1, 0, 4, 5], 50),
    ...chain('grid', [2, 1, 0, 3], 70),
    ...chain('telecom', [0, 1, 2, 3, 4, 5], 30),
    ...chain('water', [4, 0, 5], 60),
    ...chain('pipeline', [3, 0, 2], 80),
  ];
}

/** Live infrastructure pressure 0-100 per network kind. */
export function networkPressure(kind: NetworkSeg['kind'], t: number): number {
  return Math.round(wave(`netp:${kind}`, t, 18, 82));
}

export const ASSET_GLYPH: Record<AssetKind, string> = {
  hospital: '✚', port: '⚓', airport: '✈', power: '⚡', telecom: '◬',
  water: '◑', logistics: '▣', military: '◈', industrial: '⚙', customs: '⛬',
};
export const NET_TONE: Record<NetworkSeg['kind'], string> = {
  road: 'rgb(var(--c-ink-soft))', rail: '#9a86d4', grid: '#37c7d4',
  telecom: '#5fb0d9', water: '#4f93d4', pipeline: '#e0b341',
};
