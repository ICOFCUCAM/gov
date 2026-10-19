// Located points at national scale (map plan budgets: canvas above ~2,000
// features; architecture review G4, R13). Below the threshold every point is
// an SVG element (focusable links, titles); above it the points are painted on
// one canvas over the map and found again by a grid index for hover and
// click, so 10⁴–10⁵ registered sites stay responsive. Keyboard and screen
// reader access go through the map's table view, which lists the points by
// unit either way.

export const CANVAS_POINTS = 2000;
export const drawsOnCanvas = (n: number): boolean => n > CANVAS_POINTS;

export interface ScreenPoint { x: number; y: number; label: string; tone: 'alert' | 'warn' | 'ok' | 'neutral'; href?: string; unit?: string }

/** A grid over screen positions: the nearest point to a pointer within a radius, in O(1) cells. */
export function pointIndex(points: readonly ScreenPoint[], cell = 16) {
  const cells = new Map<string, number[]>();
  points.forEach((p, i) => {
    const k = `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)}`;
    const a = cells.get(k); if (a) a.push(i); else cells.set(k, [i]);
  });
  return {
    /** The index of the nearest point within `radius` pixels of (x, y), the one drawn last on ties; null when none. */
    nearest(x: number, y: number, radius = 8): number | null {
      let best: number | null = null, bestD = radius * radius;
      const r = Math.ceil(radius / cell);
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
      for (let i = cx - r; i <= cx + r; i++) {
        for (let j = cy - r; j <= cy + r; j++) {
          for (const k of cells.get(`${i},${j}`) ?? []) {
            const d = (points[k]!.x - x) ** 2 + (points[k]!.y - y) ** 2;
            if (d < bestD || (d === bestD && best !== null && k > best)) { bestD = d; best = k; }
          }
        }
      }
      return best;
    },
  };
}

/** The part of a 2D context the layer paints with (a real canvas, or a recorder in tests). */
export type Paint = Pick<CanvasRenderingContext2D, 'setTransform' | 'clearRect' | 'beginPath' | 'arc' | 'fill' | 'stroke' | 'moveTo' | 'closePath'> & { fillStyle: unknown; strokeStyle: unknown; lineWidth: number; globalAlpha: number };

/**
 * Paint points: a dot per point in its status colour with a halo in the
 * background colour, alert points last so they stay on top. One path per tone,
 * so 100,000 points are four fills.
 */
export function paintPoints(ctx: Paint, points: readonly ScreenPoint[], o: { width: number; height: number; dpr?: number; zoom?: { z: number; tx: number; ty: number } | null; colours: Record<ScreenPoint['tone'], string>; halo: string; radius?: number; highlight?: number | null }): void {
  const dpr = o.dpr ?? 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, o.width, o.height);
  const z = o.zoom && o.zoom.z > 1 ? o.zoom : null;
  if (z) ctx.setTransform(dpr * z.z, 0, 0, dpr * z.z, dpr * z.tx, dpr * z.ty);
  const r = (o.radius ?? 3.5) / (z?.z ?? 1);
  for (const tone of ['neutral', 'ok', 'warn', 'alert'] as const) {
    ctx.beginPath();
    let any = false;
    for (const p of points) {
      if (p.tone !== tone) continue;
      ctx.moveTo(p.x + r, p.y);
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      any = true;
    }
    if (!any) continue;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = o.colours[tone];
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1 / (z?.z ?? 1);
    ctx.strokeStyle = o.halo;
    ctx.stroke();
  }
  if (o.highlight != null && points[o.highlight]) {
    const p = points[o.highlight]!;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 2.2, 0, Math.PI * 2);
    ctx.lineWidth = 2 / (z?.z ?? 1);
    ctx.strokeStyle = o.colours[p.tone];
    ctx.stroke();
  }
}
