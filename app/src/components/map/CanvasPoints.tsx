'use client';

// Located points painted on a canvas over the map when there are more than
// the plan's ~2,000 (lib/map/point-layer.ts). The canvas takes no pointer
// events: NationMap hit-tests the pointer against the same points and shows
// the hovered one, and its table view lists them all for keyboard and screen
// reader users. Colours are the status tokens; the halo is the background
// colour where the map is drawn, read from the theme so it follows light,
// dark and the console's own ground (which sets its colours on its frame).

import * as React from 'react';
import { STATUS } from '@/lib/theme/tokens';
import { paintPoints, type ScreenPoint } from '@/lib/map/point-layer';

/** A theme colour variable ("r g b") as a CSS colour the canvas understands, as it applies at `el`. */
function themeColour(el: Element, name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v ? `rgb(${v.split(/[\s,]+/).join(',')})` : fallback;
}

export function CanvasPoints({ points, width, height, zoom, highlight }: { points: readonly ScreenPoint[]; width: number; height: number; zoom?: { z: number; tx: number; ty: number } | null; highlight?: number | null }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    c.width = Math.round(width * dpr); c.height = Math.round(height * dpr);
    paintPoints(ctx, points, { width, height, dpr, zoom, colours: STATUS, halo: themeColour(c, '--c-bg', STATUS.neutral), highlight });
  }, [points, width, height, zoom, highlight]);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute start-0 top-0" style={{ width, height }} data-testid="map-point-canvas" />;
}
