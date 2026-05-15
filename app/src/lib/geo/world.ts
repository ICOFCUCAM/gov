// Real geographic dataset — Natural Earth 1:110m via world-atlas.
// Bundled (no network). Provides world + per-country features and a
// fitted projection so the sovereign map can show the whole world by
// default and zoom to a nation when one is selected.
import { feature } from 'topojson-client';
import topo from 'world-atlas/countries-110m.json';
import { geoNaturalEarth1, geoPath } from 'd3-geo';

/* eslint-disable @typescript-eslint/no-explicit-any */
type GeoFeature = { type: 'Feature'; properties: { name?: string }; geometry: any };

const fc = feature(topo as any, (topo as any).objects.countries) as unknown as {
  type: 'FeatureCollection';
  features: GeoFeature[];
};

export function worldFeatures(): GeoFeature[] {
  return fc.features;
}

export function findCountry(name?: string): GeoFeature | undefined {
  if (!name) return undefined;
  const n = name.trim().toLowerCase();
  return fc.features.find(f => String(f.properties?.name ?? '').toLowerCase() === n);
}

/** Path strings for every country, fitted to box; optional focus zooms. */
export function projectedPaths(
  width: number,
  height: number,
  focus?: GeoFeature,
): { name: string; d: string; focused: boolean }[] {
  const projection = geoNaturalEarth1();
  if (focus) {
    projection.fitExtent([[16, 16], [width - 16, height - 16]], focus as any);
  } else {
    projection.fitExtent([[2, 2], [width - 2, height - 2]], { type: 'Sphere' } as any);
  }
  const path = geoPath(projection as any);
  const fname = focus?.properties?.name;
  return fc.features.map(f => ({
    name: String(f.properties?.name ?? ''),
    d: path(f as any) ?? '',
    focused: !!fname && f.properties?.name === fname,
  }));
}
