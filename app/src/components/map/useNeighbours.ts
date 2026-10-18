'use client';

// The nation's land neighbours (shared borders in the world data), for panels
// that list frontiers; null until known, [] for a nation without land borders.
import * as React from 'react';
import { geoCentroid } from 'd3-geo';
import { loadCountry } from '@/lib/geo/admin1';
import { loadWorld, nationIndex } from '@/lib/map/world';
import { nationIso3 } from '@/lib/nation/registry';

export function useNeighbours(): string[] | null {
  const iso3 = nationIso3();
  const [names, setNames] = React.useState<string[] | null>(null);
  React.useEffect(() => {
    if (!iso3) return;
    let live = true;
    void Promise.all([loadWorld(), loadCountry(iso3)]).then(([world, c]) => {
      if (!live || !c) return;
      const shape = c.outline ?? (c.provinces[0] ? { type: 'MultiPolygon', coordinates: c.provinces.flatMap(p => (p.geometry.type === 'Polygon' ? [p.geometry.coordinates as number[][][]] : (p.geometry.coordinates as number[][][][]))) } : null);
      if (!shape) return;
      const home = nationIndex(world, geoCentroid({ type: 'Feature', properties: {}, geometry: shape } as never) as [number, number]);
      setNames(home >= 0 ? (world.neighbours[home] ?? []).map(i => world.countries[i]!.name).sort() : []);
    });
    return () => { live = false; };
  }, [iso3]);
  return names;
}
