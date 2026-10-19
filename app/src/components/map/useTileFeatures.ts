'use client';

// The features of a tile-backed point layer for what a map shows now: the
// tiles covering its visible extent at a zoom fine enough for its scale
// (lib/map/tile-loader.ts), fetched from the platform (live tile route or
// PMTiles archive), cached, and merged. Waits a moment after the view changes
// so a zoom does not fetch every step of its animation.

import * as React from 'react';
import { TileCache, chooseTiles, loadTiles, tileFetcher, tileKey, viewBounds, type PointTileSource, type TileFeature } from '@/lib/map/tile-loader';
import type { MapModel } from '@/lib/map/model';

export interface TileState { features: TileFeature[]; loading: boolean; error: string; truncated: boolean; tiles: number; z: number | null }
const EMPTY: TileState = { features: [], loading: false, error: '', truncated: false, tiles: 0, z: null };

export function useTileFeatures(src: PointTileSource | undefined, model: MapModel | null, zoom?: { z: number; tx: number; ty: number } | null): TileState {
  const [state, setState] = React.useState<TileState>(EMPTY);
  const url = src ? `${src.source.kind}:${src.source.url}` : '';
  const cache = React.useMemo(() => new TileCache(512), [url]); // eslint-disable-line react-hooks/exhaustive-deps
  const fetchTile = React.useMemo(() => (src ? tileFetcher(src.source) : null), [url]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = React.useMemo(() => (model ? viewBounds(model, zoom) : null), [model, zoom?.z, zoom?.tx, zoom?.ty]); // eslint-disable-line react-hooks/exhaustive-deps
  const plan = React.useMemo(() => (view && src ? chooseTiles(view.bounds, view.pxPerDegree, { minZoom: src.minZoom ?? 0, maxZoom: src.maxZoom ?? 14 }) : null), [view, src?.minZoom, src?.maxZoom]); // eslint-disable-line react-hooks/exhaustive-deps
  const planKey = plan ? plan.tiles.map(tileKey).join(',') : '';
  const version = src?.version;
  const layer = src?.layer ?? 'facilities';
  const maxZoom = src?.maxZoom ?? 14;

  React.useEffect(() => {
    if (!plan || !fetchTile) { setState(EMPTY); return; }
    let live = true;
    setState(s => ({ ...s, loading: true }));
    const t = setTimeout(() => {
      loadTiles(plan.tiles, { fetch: fetchTile, cache, layer, version, maxZoom })
        .then(r => { if (live) setState({ features: r.features, loading: false, error: '', truncated: r.truncated, tiles: r.tiles, z: plan.z }); })
        .catch((e: Error) => { if (live) setState(s => ({ ...s, loading: false, error: e.message })); });
    }, 120);
    return () => { live = false; clearTimeout(t); };
  }, [planKey, version, layer, maxZoom, fetchTile, cache]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
