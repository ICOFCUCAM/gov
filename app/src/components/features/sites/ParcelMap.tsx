'use client';

// The land parcel map (/gov/sites/parcels): published parcels drawn from the
// platform's parcel vector tiles (/api/twin/tiles/parcels, public fields
// only: never rights or holders) from zoom 13, over the outlines of the
// regions and districts in force from the boundary tiles. A Web Mercator view
// on a canvas: drag or the arrow keys to move, the wheel or + and − to zoom;
// clicking a parcel (or Enter on the one under the centre) opens its record.
// Nothing is fetched from outside the platform; colours are theme tokens
// read where the map is drawn. The register table beside it lists every
// parcel for keyboard and screen reader users.

import * as React from 'react';
import { fitZoom, fromPx, inShape, shapesOf, tilesInView, toPx, type View, type WorldShape } from '@/lib/map/parcel-view';

const PARCEL_MIN = 13, PARCEL_MAX = 20, BOUNDARY_MAX = 14;
const HEIGHT = 420;

/** A theme colour variable ("r g b") at `el`, with an alpha. */
function token(el: Element, name: string, alpha = 1): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v ? `rgb(${v.split(/[\s,]+/).join(' ')} / ${alpha})` : `rgb(128 128 128 / ${alpha})`;
}

type Tile = { key: string; z: number; x: number; y: number; shapes: WorldShape[] };
const cache = new Map<string, Promise<Tile>>();
function loadTile(url: string, t: { z: number; x: number; y: number }, layers: string[], key: string): Promise<Tile> {
  let p = cache.get(key);
  if (p) { cache.delete(key); cache.set(key, p); return p; }
  p = fetch(url, { credentials: 'same-origin' })
    .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then(b => ({ key, ...t, shapes: shapesOf(new Uint8Array(b), t, layers) }));
  p.catch(() => cache.delete(key));
  cache.set(key, p);
  while (cache.size > 400) cache.delete(cache.keys().next().value as string);
  return p;
}

export interface ParcelMapProps {
  /** Changes when the register changes (tiles are read again). */
  version: string;
  selected?: string | null;
  /** The selected parcel's box, to move the map to it. */
  focus?: [number, number, number, number] | null;
  onSelect: (id: string) => void;
}

export function ParcelMap({ version, selected, focus, onSelect }: ParcelMapProps) {
  const wrap = React.useRef<HTMLDivElement>(null);
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = React.useState(800);
  const [view, setView] = React.useState<View | null>(null);
  const [tiles, setTiles] = React.useState<{ parcels: Tile[]; bounds: Tile[] }>({ parcels: [], bounds: [] });
  const [status, setStatus] = React.useState('');
  const drag = React.useRef<{ x: number; y: number; v: View; moved: boolean } | null>(null);

  React.useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(280, Math.round(el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Start where the parcels are; without any, over the nation.
  React.useEffect(() => {
    if (view) return;
    let live = true;
    (async () => {
      const get = async (u: string) => { const r = await fetch(u, { credentials: 'same-origin' }); return r.ok ? r.json() as Promise<{ bounds?: [number, number, number, number] }> : null; };
      const p = await get('/api/twin/tiles/parcels').catch(() => null);
      let b = p?.bounds;
      let z: number | null = null;
      if (!b || b[0] <= -179) { b = (await get('/api/twin/tiles/boundaries').catch(() => null))?.bounds; z = null; }
      if (!live) return;
      if (!b || b[0] <= -179) { setView({ lng: 0, lat: 0, z: 2 }); return; }
      z = fitZoom(b, width, HEIGHT, 17);
      setView({ lng: (b[0] + b[2]) / 2, lat: (b[1] + b[3]) / 2, z });
    })();
    return () => { live = false; };
  }, [view, width]);

  // Move to a parcel opened from the table.
  React.useEffect(() => {
    if (!focus) return;
    setView({ lng: (focus[0] + focus[2]) / 2, lat: (focus[1] + focus[3]) / 2, z: Math.max(PARCEL_MIN + 1, Math.min(19, fitZoom(focus, width, HEIGHT, 19) - 1)) });
  }, [focus, width]);

  // The tiles for the view.
  React.useEffect(() => {
    if (!view) return;
    let live = true;
    const tz = Math.min(PARCEL_MAX, Math.max(0, Math.floor(view.z)));
    const bz = Math.min(BOUNDARY_MAX, tz);
    const pList = tz >= PARCEL_MIN ? tilesInView(view, width, HEIGHT, tz).slice(0, 64) : [];
    const bList = tilesInView(view, width, HEIGHT, bz).slice(0, 64);
    const t = setTimeout(async () => {
      try {
        const [parcels, bounds] = await Promise.all([
          Promise.all(pList.map(x => loadTile(`/api/twin/tiles/parcels/${x.z}/${x.x}/${x.y}.mvt?v=${encodeURIComponent(version)}`, x, ['parcels'], `p|${version}|${x.z}/${x.x}/${x.y}`))),
          Promise.all(bList.map(x => loadTile(`/api/twin/tiles/boundaries/${x.z}/${x.x}/${x.y}.mvt`, x, ['regions', 'districts'], `b|${x.z}/${x.x}/${x.y}`))),
        ]);
        if (!live) return;
        setTiles({ parcels, bounds });
        const n = new Set(parcels.flatMap(p => p.shapes.map(s => s.id))).size;
        setStatus(tz < PARCEL_MIN ? `Zoom in to see parcels (they are drawn from zoom ${PARCEL_MIN}; now ${view.z.toFixed(1)}).` : `${n.toLocaleString()} parcel${n === 1 ? '' : 's'} drawn from ${parcels.length} vector tile${parcels.length === 1 ? '' : 's'} (zoom ${tz}).`);
      } catch { if (live) setStatus('The map tiles could not be read.'); }
    }, 120);
    return () => { live = false; clearTimeout(t); };
  }, [view, width, version]);

  // Paint.
  React.useEffect(() => {
    const c = canvas.current, ctx = c?.getContext('2d');
    if (!c || !ctx || !view) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    c.width = Math.round(width * dpr); c.height = Math.round(HEIGHT * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = token(c, '--c-surface-2');
    ctx.fillRect(0, 0, width, HEIGHT);
    const [cx, cy] = toPx(view.lng, view.lat, view.z);
    const path = (s: WorldShape, tz: number) => {
      const k = 2 ** (view.z - tz);
      ctx.beginPath();
      for (const r of s.rings) r.forEach((p, i) => { const x = p[0] * k - cx + width / 2, y = p[1] * k - cy + HEIGHT / 2; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.closePath();
    };
    ctx.lineJoin = 'round';
    for (const t of tiles.bounds) for (const s of t.shapes) {
      path(s, t.z);
      ctx.strokeStyle = token(c, s.layer === 'regions' ? '--c-ink-soft' : '--c-line', s.layer === 'regions' ? 0.8 : 1);
      ctx.lineWidth = s.layer === 'regions' ? 1.4 : 0.8;
      ctx.stroke();
    }
    for (const t of tiles.parcels) for (const s of t.shapes) {
      path(s, t.z);
      const on = s.id === selected;
      ctx.fillStyle = token(c, on ? '--c-warn' : '--c-link', on ? 0.35 : 0.14);
      ctx.fill('evenodd');
      ctx.strokeStyle = token(c, on ? '--c-warn' : '--c-link', 0.9);
      ctx.lineWidth = on ? 2 : 0.9;
      ctx.stroke();
    }
  }, [tiles, view, width, selected]);

  const at = (sx: number, sy: number): string | null => {
    if (!view) return null;
    const tz = tiles.parcels[0]?.z;
    if (tz == null) return null;
    const [cx, cy] = toPx(view.lng, view.lat, view.z);
    const k = 2 ** (tz - view.z);
    const p: [number, number] = [(sx - width / 2 + cx) * k, (sy - HEIGHT / 2 + cy) * k];
    for (const t of tiles.parcels) for (const s of t.shapes) if (inShape(p, s)) return s.id;
    return null;
  };
  const pan = (dx: number, dy: number) => setView(v => { if (!v) return v; const [x, y] = toPx(v.lng, v.lat, v.z); const [lng, lat] = fromPx(x + dx, y + dy, v.z); return { ...v, lng, lat }; });
  const zoomBy = (d: number) => setView(v => (v ? { ...v, z: Math.max(2, Math.min(PARCEL_MAX + 1, v.z + d)) } : v));

  return (
    <figure className="space-y-1">
      <div ref={wrap} className="relative overflow-hidden rounded-[3px] border border-line">
        <canvas
          ref={canvas} style={{ width, height: HEIGHT, touchAction: 'none' }} tabIndex={0} role="img" data-testid="parcel-map"
          aria-label={`Map of published land parcels. ${status} Arrow keys move, plus and minus zoom, Enter opens the parcel at the centre.`}
          className="focus-ring block cursor-grab"
          onPointerDown={e => { if (view) { drag.current = { x: e.clientX, y: e.clientY, v: view, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); } }}
          onPointerMove={e => {
            const d = drag.current;
            if (!d) return;
            if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 3) d.moved = true;
            const [x, y] = toPx(d.v.lng, d.v.lat, d.v.z);
            const [lng, lat] = fromPx(x - (e.clientX - d.x), y - (e.clientY - d.y), d.v.z);
            setView({ ...d.v, lng, lat });
          }}
          onPointerUp={e => {
            const d = drag.current;
            drag.current = null;
            if (d && !d.moved) { const r = e.currentTarget.getBoundingClientRect(); const id = at(e.clientX - r.left, e.clientY - r.top); if (id) onSelect(id); }
          }}
          onWheel={e => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 0.5 : -0.5); }}
          onKeyDown={e => {
            const step = 80;
            if (e.key === 'ArrowLeft') pan(-step, 0); else if (e.key === 'ArrowRight') pan(step, 0);
            else if (e.key === 'ArrowUp') pan(0, -step); else if (e.key === 'ArrowDown') pan(0, step);
            else if (e.key === '+' || e.key === '=') zoomBy(1); else if (e.key === '-') zoomBy(-1);
            else if (e.key === 'Enter') { const id = at(width / 2, HEIGHT / 2); if (id) onSelect(id); }
            else return;
            e.preventDefault();
          }}
        />
        <div className="absolute end-2 top-2 flex flex-col gap-1">
          <button type="button" onClick={() => zoomBy(1)} aria-label="Zoom in" className="focus-ring rounded-[3px] border border-line bg-surface px-2 text-[16px] text-ink">+</button>
          <button type="button" onClick={() => zoomBy(-1)} aria-label="Zoom out" className="focus-ring rounded-[3px] border border-line bg-surface px-2 text-[16px] text-ink">−</button>
        </div>
      </div>
      <figcaption className="text-[12px] text-ink-muted" aria-live="polite">
        {status || 'Reading the map…'} Outlines of regions and districts from the boundaries in force. Parcels show only their public fields; rights and holders never reach the map.
      </figcaption>
    </figure>
  );
}
