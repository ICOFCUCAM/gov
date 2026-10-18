// Where the nation meets its neighbours and the sea, from the map data the
// console already draws (the nation's units: lib/map/geography; the world:
// lib/map/world). Used by the command maps of the police, emergency and
// immigration apps to put their examples where they would really be: border
// posts in the region that touches each neighbour, ports and storm tracks on
// the coast. Nothing here is a fact about operations; it is geography only.
// Pure apart from the cached loads; no React.

import { geoCentroid, geoContains } from 'd3-geo';
import { loadNationGeography, type NationGeography } from '@/lib/map/geography';
import { loadWorld, nationIndex, type WorldModel } from '@/lib/map/world';
import type { Geom } from '@/lib/geo/admin1';

export interface FrontierNeighbour {
  /** The neighbouring country (world data name). */
  name: string;
  /** Index in the world model. */
  index: number;
  /** The nation's unit (region) that shares the longest stretch of this border. */
  region: string;
  /** A point on the shared border, on the nation's side (lng, lat). */
  at: [number, number];
  /** The neighbour's own centre (lng, lat). */
  centre: [number, number];
}
export interface Frontier {
  geo: NationGeography;
  world: WorldModel;
  home: number;
  neighbours: FrontierNeighbour[];
  /** Units with a coastline, most coast first (share of their outline on the sea), islands last. */
  coastal: { region: string; share: number; at: [number, number] }[];
}

type Pt = [number, number];
const feature = (g: Geom) => ({ type: 'Feature' as const, properties: {}, geometry: g });

function vertices(g: Geom | undefined): Pt[] {
  if (!g) return [];
  const polys = (g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []) as number[][][][];
  const out: Pt[] = [];
  for (const p of polys) for (const ring of p) for (const c of ring) out.push([c[0]!, c[1]!]);
  return out;
}

/** A coarse grid of points, to find near points without comparing every pair. */
class Grid {
  private cells = new Map<string, Pt[]>();
  constructor(private size: number) {}
  private key(x: number, y: number) { return `${Math.floor(x / this.size)},${Math.floor(y / this.size)}`; }
  add(p: Pt) { const k = this.key(p[0], p[1]); const c = this.cells.get(k); if (c) c.push(p); else this.cells.set(k, [p]); }
  near(p: Pt, tol: number): boolean {
    const cx = Math.floor(p[0] / this.size), cy = Math.floor(p[1] / this.size);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const c = this.cells.get(`${cx + dx},${cy + dy}`);
      if (c) for (const q of c) if (Math.abs(q[0] - p[0]) <= tol && Math.abs(q[1] - p[1]) <= tol) return true;
    }
    return false;
  }
}

/** The frontier analysis for a geography and the world (exported for tests). */
export function analyseFrontier(geo: NationGeography, world: WorldModel): Frontier {
  const units = geo.units.filter(u => u.geometry);
  const all = units.flatMap(u => vertices(u.geometry));
  const shape: Geom | undefined = geo.outline ?? (units.length ? {
    type: 'MultiPolygon',
    coordinates: units.flatMap(u => (u.geometry!.type === 'Polygon' ? [u.geometry!.coordinates as number[][][]] : (u.geometry!.coordinates as number[][][][]))),
  } : undefined);
  const centre = shape ? (geoCentroid(feature(shape) as never) as Pt) : null;
  const home = nationIndex(world, centre);
  if (!all.length || home < 0) return { geo, world, home, neighbours: [], coastal: [] };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of all) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const inBox = (p: Pt) => p[0] >= x0 - 1 && p[0] <= x1 + 1 && p[1] >= y0 - 1 && p[1] <= y1 + 1;
  const TOL = 0.15;

  // Land neighbours: the unit with the most outline along each neighbour's border.
  const anyForeign = new Grid(0.3);
  const neighbours: FrontierNeighbour[] = [];
  for (const i of world.neighbours[home] ?? []) {
    const c = world.countries[i];
    if (!c) continue;
    const pts = vertices(c.geometry).filter(inBox);
    const grid = new Grid(0.3);
    for (const p of pts) { grid.add(p); anyForeign.add(p); }
    let best: { name: string; hits: Pt[] } | null = null;
    for (const u of units) {
      const hits = vertices(u.geometry).filter(p => grid.near(p, TOL));
      if (hits.length && (!best || hits.length > best.hits.length)) best = { name: u.name, hits };
    }
    if (!best) continue;
    const mid = best.hits[Math.floor(best.hits.length / 2)]!;
    neighbours.push({ name: c.name, index: i, region: best.name, at: mid, centre: geoCentroid(feature(c.geometry) as never) as Pt });
  }

  // Coast: outline that is neither shared with another of the nation's units nor with a neighbour.
  const coastal: Frontier['coastal'] = [];
  const grids = units.map(u => { const g = new Grid(0.2); for (const p of vertices(u.geometry)) g.add(p); return g; });
  units.forEach((u, k) => {
    const vs = vertices(u.geometry);
    const sea = vs.filter(p => !anyForeign.near(p, TOL) && !grids.some((g, j) => j !== k && g.near(p, 0.05)));
    const share = vs.length ? sea.length / vs.length : 0;
    if (sea.length >= 6 && share >= 0.08) coastal.push({ region: u.name, share, at: sea[Math.floor(sea.length / 2)]! });
  });
  // Mainland coasts first: units that are nearly all coastline (islands) come after the rest.
  coastal.sort((a, b) => Number(a.share > 0.85) - Number(b.share > 0.85) || b.share - a.share);
  return { geo, world, home, neighbours, coastal };
}

const cache = new Map<string, Promise<Frontier | null>>();

/** The nation's frontier (neighbours by region, coastline), loaded once per nation and region list. */
export function loadFrontier(iso3: string, regions: readonly string[]): Promise<Frontier | null> {
  const key = `${iso3}|${regions.join('|')}`;
  let p = cache.get(key);
  if (!p) {
    p = Promise.all([loadNationGeography(iso3, regions), loadWorld()])
      .then(([geo, world]) => (geo ? analyseFrontier(geo, world) : null))
      .catch(() => null);
    cache.set(key, p);
  }
  return p;
}

/** The nation's unit that holds a point (e.g. the capital), or null. */
export function regionAt(f: Frontier | null, at: { lng: number; lat: number } | null | undefined): string | null {
  if (!f || !at) return null;
  const u = f.geo.units.find(x => x.geometry && geoContains(feature(x.geometry) as never, [at.lng, at.lat]));
  return u?.name ?? null;
}
