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
        // Rounded: server (Node) and browser trigonometry can differ in the last bits.
        x: Math.round(Math.max(20, Math.min(980, hub.x + Math.cos(ang) * rad)) * 100) / 100,
        y: Math.round(Math.max(20, Math.min(600, hub.y + Math.sin(ang) * rad * 0.66)) * 100) / 100,
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

/**
 * Sample assets on the nation's real map: a few typed assets around each
 * region's label point (screen space of the map they are drawn on), so the
 * infrastructure layer keeps its look until the nation's own facilities are
 * registered with coordinates. Always shown as samples, never as the nation's.
 */
export function sampleAssetsAround(anchors: { name: string; x: number; y: number }[], spread: number): Asset[] {
  const out: Asset[] = [];
  anchors.forEach((a, h) => {
    const count = 1 + Math.round(seed(`sa:${a.name}`) * 3);
    for (let i = 0; i < count; i++) {
      const ang = seed(`saa:${a.name}:${i}`) * Math.PI * 2, rad = (0.3 + seed(`sar:${a.name}:${i}`) * 0.7) * spread;
      const t = seed(`sat:${a.name}:${i}`);
      out.push({
        id: `S${h}-${i}`, kind: KIND_BY_I[Math.floor(seed(`sak:${a.name}:${i}`) * KIND_BY_I.length)] ?? 'hospital',
        tier: (t > 0.8 ? 1 : t > 0.45 ? 2 : 3) as 1 | 2 | 3,
        x: Math.round((a.x + Math.cos(ang) * rad) * 100) / 100, y: Math.round((a.y + Math.sin(ang) * rad) * 100) / 100,
      });
    }
  });
  return out;
}

/** Sample corridors on the real map: from the capital to the furthest-flung regions, one kind each (energy, logistics, air, telecom). */
export function sampleCorridors(capital: { x: number; y: number }, anchors: { name: string; x: number; y: number }[], n = 6): { id: string; kind: 'energy' | 'logistics' | 'air' | 'telecom'; to: string; d: string }[] {
  const KINDS = ['energy', 'logistics', 'air', 'telecom'] as const;
  return [...anchors]
    .sort((a, b) => Math.hypot(b.x - capital.x, b.y - capital.y) - Math.hypot(a.x - capital.x, a.y - capital.y))
    .filter((_, i, arr) => i % Math.max(1, Math.floor(arr.length / n)) === 0)
    .slice(0, n)
    .map((a, i) => {
      const mx = (capital.x + a.x) / 2, my = (capital.y + a.y) / 2;
      const len = Math.hypot(a.x - capital.x, a.y - capital.y) || 1;
      const bow = (seed(`cb:${a.name}`) - 0.5) * 0.5 * len;
      const qx = mx - ((a.y - capital.y) / len) * bow, qy = my + ((a.x - capital.x) / len) * bow;
      return { id: `K${i}`, kind: KINDS[i % KINDS.length]!, to: a.name, d: `M${capital.x.toFixed(1)},${capital.y.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${a.x.toFixed(1)},${a.y.toFixed(1)}` };
    });
}

/** What each kind of asset is called on the map's labels. */
export const ASSET_LABEL: Record<AssetKind, string> = {
  hospital: 'Referral hospital', port: 'Seaport', airport: 'Airport', power: 'Power station', telecom: 'Comms tower',
  water: 'Water works', logistics: 'Logistics hub', military: 'Command facility', industrial: 'Industrial zone', customs: 'Border checkpoint',
};

/**
 * Sample linear networks on the real map: road, rail, power grid and pipeline
 * chains threaded through the regions' label points (ordered around the
 * capital), each a curved segment between neighbours. Samples until the
 * nation's networks are registered.
 */
export function sampleNetworksOn(capital: { x: number; y: number }, anchors: { name: string; x: number; y: number }[]): NetworkSeg[] {
  if (anchors.length < 2) return [];
  const around = [...anchors].sort((a, b) => Math.atan2(a.y - capital.y, a.x - capital.x) - Math.atan2(b.y - capital.y, b.x - capital.x));
  const pick = (step: number, offset: number) => around.filter((_, i) => (i + offset) % step === 0);
  const chainOf = (kind: NetworkSeg['kind'], pts: { name: string; x: number; y: number }[], bow: number, viaCapital: boolean): NetworkSeg[] => {
    const seq = viaCapital ? [pts[0]!, { name: 'capital', ...capital }, ...pts.slice(1)] : pts;
    return seq.slice(0, -1).map((a, i) => {
      const b = seq[i + 1]!;
      const mx = (a.x + b.x) / 2 + (seed(`${kind}:${a.name}:mx`) - 0.5) * bow, my = (a.y + b.y) / 2 + (seed(`${kind}:${a.name}:my`) - 0.5) * bow;
      return { id: `${kind}${i}`, kind, d: `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}` };
    });
  };
  const n = anchors.length;
  return [
    ...chainOf('road', pick(Math.max(1, Math.round(n / 9)), 0), 30, true),
    ...chainOf('rail', pick(Math.max(1, Math.round(n / 5)), 1), 20, true),
    ...chainOf('grid', pick(Math.max(1, Math.round(n / 6)), 2), 26, true),
    ...chainOf('pipeline', pick(Math.max(1, Math.round(n / 3)), 0).slice(0, 4), 34, false),
  ];
}
