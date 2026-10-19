'use client';

// The units of a large map drawn from the boundary vector tiles for what it
// shows now (lib/map/boundary-tiles.ts): the tiles covering the visible extent
// at a zoom fine enough for its scale, fetched from the platform, cached and
// grouped by unit. Waits a moment after the view changes so a zoom does not
// fetch every step of its animation. Off (`enabled` false) it fetches nothing.

import * as React from 'react';
import { BOUNDARY_DISTRICT_ZOOM, BOUNDARY_MAX_ZOOM, BOUNDARY_TILES, PieceCache, loadUnitTiles, type TileUnits } from '@/lib/map/boundary-tiles';
import { chooseTiles, tileFetcher, tileKey, viewBounds } from '@/lib/map/tile-loader';
import type { MapModel } from '@/lib/map/model';

export interface BoundaryTileState { units: TileUnits | null; loading: boolean; error: string; tiles: number; z: number | null }
const OFF: BoundaryTileState = { units: null, loading: false, error: '', tiles: 0, z: null };

export function useBoundaryTiles(enabled: boolean, model: MapModel | null, zoom: { z: number; tx: number; ty: number } | null | undefined, o: { districts?: boolean } = {}): BoundaryTileState {
  const [state, setState] = React.useState<BoundaryTileState>(OFF);
  const cache = React.useMemo(() => new PieceCache(256), []);
  const fetchTile = React.useMemo(() => tileFetcher(BOUNDARY_TILES), []);
  const view = React.useMemo(() => (enabled && model ? viewBounds(model, zoom) : null), [enabled, model, zoom?.z, zoom?.tx, zoom?.ty]); // eslint-disable-line react-hooks/exhaustive-deps
  // Twice the point layer's scale: a tile unit is at most a quarter of a screen pixel, so the tiles' simplification stays under a pixel.
  const plan = React.useMemo(() => (view ? chooseTiles(view.bounds, view.pxPerDegree * 2, { minZoom: o.districts ? BOUNDARY_DISTRICT_ZOOM : 0, maxZoom: BOUNDARY_MAX_ZOOM }) : null), [view, o.districts]);
  const planKey = plan ? plan.tiles.map(tileKey).join(',') : '';

  React.useEffect(() => {
    if (!plan) { setState(OFF); return; }
    let live = true;
    setState(s => ({ ...s, loading: true }));
    const t = setTimeout(() => {
      loadUnitTiles(plan.tiles, { fetch: tile => fetchTile(tile), cache })
        .then(r => { if (live) setState({ units: r.units, loading: false, error: '', tiles: r.tiles, z: plan.z }); })
        .catch((e: Error) => { if (live) setState(s => ({ ...s, loading: false, error: e.message })); });
    }, 120);
    return () => { live = false; clearTimeout(t); };
  }, [planKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
