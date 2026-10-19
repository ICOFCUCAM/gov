// Official subdivisions of each nation (ISO 3166-2, see scripts/build-divisions.py),
// in the nation's own order: first-level units (states, counties, regions…) and
// the level beneath them where the standard records it. Setup seeds a nation's
// operational regions from these; the map keeps its own admin-1 shapes.

export interface Division { code: string; name: string; type: string; parent?: string }
export interface DivisionLevel {
  depth: 1 | 2;
  units: Division[];
  /** Unit types on this level with their counts, most common first (e.g. State 50, District 1). */
  types: { type: string; count: number }[];
}

type Row = [string, string, string, string?];

/** Types a nation administers apart from its main territory; left out of the default selection. */
const DETACHED = /outlying|dependenc|overseas territory/i;

const cache = new Map<string, DivisionLevel[]>();

export async function loadDivisions(iso3: string): Promise<DivisionLevel[]> {
  const hit = cache.get(iso3);
  if (hit) return hit;
  const mod = await import('./divisions.json');
  const all = (mod.default ?? mod) as unknown as Record<string, Row[]>;
  const levels = divisionLevels((all[iso3] ?? []).map(([code, name, type, parent]) => ({ code, name, type, ...(parent ? { parent } : {}) })));
  cache.set(iso3, levels);
  return levels;
}

/** Group subdivisions into the nation's first and second levels, each in official order. */
export function divisionLevels(list: Division[]): DivisionLevel[] {
  const codes = new Set(list.map(d => d.code));
  const top = order(list.filter(d => !d.parent || !codes.has(d.parent)));
  const rank = new Map(top.map((d, i) => [d.code, i]));
  const second = list.filter(d => d.parent && rank.has(d.parent));
  const byParent = [...new Set(top.map(d => d.code))].flatMap(p => order(second.filter(d => d.parent === p)));
  const levels: DivisionLevel[] = [];
  if (top.length) levels.push({ depth: 1, units: top, types: typesOf(top) });
  if (byParent.length) levels.push({ depth: 2, units: byParent, types: typesOf(byParent) });
  return levels;
}

/** The units a nation reports by unless it chooses otherwise: the level without detached territories. */
export function defaultUnits(level: DivisionLevel): Division[] {
  const home = level.units.filter(d => !DETACHED.test(d.type));
  return home.length ? home : level.units;
}

/** What the nation calls the units on a level, e.g. "state", "county", "region". */
export function divisionNoun(level: DivisionLevel): string {
  const t = level.types[0]?.type ?? 'region';
  return t.replace(/^(geographical|administrative|metropolitan)\s+/i, '').toLowerCase();
}

// Numbered codes keep the standard's numbering (e.g. KE-01…47); otherwise alphabetical.
function order(units: Division[]): Division[] {
  const suffix = (d: Division) => d.code.slice(d.code.indexOf('-') + 1);
  const numbered = units.length > 0 && units.every(d => /^\d+$/.test(suffix(d)));
  return [...units].sort((a, b) => numbered ? Number(suffix(a)) - Number(suffix(b)) : a.name.localeCompare(b.name));
}

function typesOf(units: Division[]): { type: string; count: number }[] {
  const n = new Map<string, number>();
  for (const d of units) n.set(d.type, (n.get(d.type) ?? 0) + 1);
  return [...n].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
}
