'use client';

// The national-scale renderer's own check page (scripts/check-map-webgl.mjs,
// architecture review G4): the installed nation's map with N synthetic points
// (default 100,000) spread over its extent, and a few thousand synthetic
// outlines near the capital, so a production build can be shown to draw and
// pick at that scale with WebGL. Every figure here is generated and marked as
// a sample; nothing is read from or written to the registers. The page that
// renders it answers 404 unless the server runs with CIVICOS_MAP_CHECK=1.

import * as React from 'react';
import { geoBounds } from 'd3-geo';
import { NationMap, type MapArea, type MapPoint } from './NationMap';
import { loadNationGeography } from '@/lib/map/geography';
import { nationCapital, nationIso3, nationRegions } from '@/lib/nation/registry';

const rand = (seed: number) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); };
const TONES = ['ok', 'ok', 'ok', 'warn', 'warn', 'alert', 'neutral'] as const;
const GLYPHS = ['✚', '✎', '⛨', '⚖', '⌂', '⚡', '✈', '⚓'];

export function MapRenderCheck({ n, areas: areaCount, style, webglAbove, cluster = false }: { n: number; areas: number; style: 'dot' | 'tile'; webglAbove?: number; cluster?: boolean }) {
  const [box, setBox] = React.useState<[[number, number], [number, number]] | null>(null);
  const iso3 = nationIso3();
  React.useEffect(() => {
    if (!iso3) return;
    void loadNationGeography(iso3, nationRegions()).then(g => {
      const shapes = g?.units.filter(u => u.geometry).map(u => ({ type: 'Feature' as const, properties: {}, geometry: u.geometry! }));
      if (shapes?.length) setBox(geoBounds({ type: 'FeatureCollection', features: shapes } as never) as [[number, number], [number, number]]);
    });
  }, [iso3]);

  const points = React.useMemo<MapPoint[]>(() => {
    if (!box) return [];
    const r = rand(20261019);
    const [[x0, y0], [x1, y1]] = box;
    return Array.from({ length: n }, (_, i) => {
      const lng = x0 + r() * (x1 - x0), lat = y0 + r() * (y1 - y0);
      return { key: `pt-${i}`, label: `Synthetic point ${i} (sample)`, tone: TONES[i % TONES.length]!, lng, lat, glyph: GLYPHS[i % GLYPHS.length], href: `#pt-${i}` };
    });
  }, [box, n]);

  const areas = React.useMemo<MapArea[]>(() => {
    const cap = nationCapital();
    if (!box || !areaCount) return [];
    const cx = cap?.lng ?? (box[0][0] + box[1][0]) / 2, cy = cap?.lat ?? (box[0][1] + box[1][1]) / 2;
    const side = Math.ceil(Math.sqrt(areaCount)), step = 0.012, r = step * 0.45;
    return Array.from({ length: areaCount }, (_, i) => {
      const gx = cx + ((i % side) - side / 2) * step, gy = cy + (Math.floor(i / side) - side / 2) * step;
      const ring = Array.from({ length: 7 }, (_, k) => { const a = (k % 6) * (Math.PI / 3); return [gx + r * Math.cos(a), gy + r * Math.sin(a)]; });
      return { key: `area-${i}`, label: `Synthetic parcel ${i} (sample)`, rings: [ring], tone: TONES[i % TONES.length], href: `#area-${i}` };
    });
  }, [box, areaCount]);

  const [hash, setHash] = React.useState('');
  React.useEffect(() => {
    const on = () => setHash(window.location.hash);
    on(); window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  return (
    <main id="main" className="mx-auto max-w-[1200px] space-y-3 p-4 text-ink">
      <h1 className="text-[20px] font-semibold">Map renderer check</h1>
      <p className="text-[13px] text-ink-soft">
        {points.length.toLocaleString('en')} synthetic points and {areas.length.toLocaleString('en')} synthetic outlines (samples, generated in the browser) on the installed nation&rsquo;s map.
        {' '}Last picked: <span data-testid="map-check-hash">{hash || 'none'}</span>
      </p>
      {points.length ? (
        <NationMap title="Synthetic points" kind="sample" source="Generated for the renderer check" points={points} pointsLabel="Synthetic points" areas={areas}
          maxHeight={640} pointStyle={style} webglAbove={webglAbove} cluster={cluster} selectedPoint={hash.startsWith('#pt-') ? hash.slice(1) : undefined} />
      ) : <p className="text-[13px] text-ink-muted">Preparing the synthetic points…</p>}
    </main>
  );
}
