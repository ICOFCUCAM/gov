// Shading classes for a map: five quantile classes over the values present,
// so each class holds about the same number of units (robust to a few
// extreme values); every class says which values it covers for the legend.

import { MAP_SEQUENTIAL } from '@/lib/theme/tokens';

export const CLASSES = MAP_SEQUENTIAL.length;

export interface Classes {
  /** Class index (0 = lowest) for a value. */
  of: (v: number) => number;
  /** Legend rows: colour and the range of values in each class actually used. */
  legend: { colour: string; from: number; to: number }[];
}

export function quantileClasses(values: number[]): Classes {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return { of: () => 0, legend: [] };
  const lo = v[0]!, hi = v.at(-1)!;
  if (lo === hi) return { of: () => CLASSES - 1, legend: [{ colour: MAP_SEQUENTIAL[CLASSES - 1]!, from: lo, to: hi }] };
  // Upper bounds of classes 0..CLASSES-2 at the quantiles; the last class takes the rest.
  const breaks = Array.from({ length: CLASSES - 1 }, (_, i) => v[Math.min(v.length - 1, Math.floor(((i + 1) * v.length) / CLASSES))]!);
  const of = (x: number) => { let k = 0; while (k < CLASSES - 1 && x >= breaks[k]!) k++; return k; };
  const legend = MAP_SEQUENTIAL.map((colour, k) => {
    const members = v.filter(x => of(x) === k);
    return members.length ? { colour, from: members[0]!, to: members.at(-1)! } : null;
  }).filter((x): x is NonNullable<typeof x> => !!x);
  return { of, legend };
}

export const classColour = (k: number): string => MAP_SEQUENTIAL[Math.max(0, Math.min(CLASSES - 1, k))]!;
