import { describe, it, expect } from 'vitest';
import { CANVAS_POINTS, drawsOnCanvas, pointIndex, paintPoints, type Paint, type ScreenPoint } from './point-layer';
import { STATUS } from '@/lib/theme/tokens';

function recorder() {
  const calls: { op: string; args: unknown[]; style?: unknown }[] = [];
  const ctx = {
    fillStyle: '' as unknown, strokeStyle: '' as unknown, lineWidth: 1, globalAlpha: 1,
    setTransform: (...a: unknown[]) => calls.push({ op: 'setTransform', args: a }),
    clearRect: (...a: unknown[]) => calls.push({ op: 'clearRect', args: a }),
    beginPath: () => calls.push({ op: 'beginPath', args: [] }),
    moveTo: () => undefined, closePath: () => undefined,
    arc: (...a: unknown[]) => calls.push({ op: 'arc', args: a }),
    fill: () => calls.push({ op: 'fill', args: [], style: ctx.fillStyle }),
    stroke: () => calls.push({ op: 'stroke', args: [], style: ctx.strokeStyle }),
  };
  return { ctx: ctx as unknown as Paint, calls };
}

const rand = (seed: number) => { let s = seed; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); };

describe('the canvas point layer', () => {
  it('switches to the canvas only above the plan\'s threshold', () => {
    expect(CANVAS_POINTS).toBe(2000);
    expect(drawsOnCanvas(2000)).toBe(false);
    expect(drawsOnCanvas(2001)).toBe(true);
  });

  it('finds the point under the pointer, as a scan would, without scanning', () => {
    const r = rand(3);
    const tones: ScreenPoint['tone'][] = ['alert', 'warn', 'ok', 'neutral'];
    const pts: ScreenPoint[] = Array.from({ length: 50_000 }, (_, i) => ({ x: r() * 900, y: r() * 600, label: `Site ${i}`, tone: tones[i % 4]! }));
    const ix = pointIndex(pts);
    const scan = (x: number, y: number, rad: number) => {
      let best: number | null = null, d0 = rad * rad;
      pts.forEach((p, i) => { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < d0 || (d === d0 && best !== null && i > best)) { d0 = d; best = i; } });
      return best;
    };
    for (let k = 0; k < 300; k++) { const x = r() * 900, y = r() * 600; expect(ix.nearest(x, y, 8)).toBe(scan(x, y, 8)); }
    const t = performance.now();
    for (let k = 0; k < 10_000; k++) ix.nearest(r() * 900, r() * 600, 8);
    expect(performance.now() - t).toBeLessThan(1000);
    expect(pointIndex([{ x: 10, y: 10, label: 'a', tone: 'ok' }]).nearest(30, 30, 8)).toBeNull();
  });

  it('paints every point in four fills, alert last, in the status colours, and follows the zoom', () => {
    const pts: ScreenPoint[] = Array.from({ length: 5000 }, (_, i) => ({ x: i % 100, y: Math.floor(i / 100), label: '', tone: (['ok', 'alert', 'warn'] as const)[i % 3]! }));
    const { ctx, calls } = recorder();
    paintPoints(ctx, pts, { width: 100, height: 50, dpr: 2, colours: STATUS, halo: 'rgb(0,0,0)' });
    expect(calls.filter(c => c.op === 'arc')).toHaveLength(5000);
    expect(calls.filter(c => c.op === 'fill').map(c => c.style)).toEqual([STATUS.ok, STATUS.warn, STATUS.alert]);
    expect(calls[0]).toEqual({ op: 'setTransform', args: [2, 0, 0, 2, 0, 0] });
    const zoomed = recorder();
    paintPoints(zoomed.ctx, pts.slice(0, 3), { width: 100, height: 50, dpr: 1, zoom: { z: 2, tx: -10, ty: -5 }, colours: STATUS, halo: '#000', highlight: 1 });
    expect(zoomed.calls.filter(c => c.op === 'setTransform').at(-1)!.args).toEqual([2, 0, 0, 2, -10, -5]);
    expect(zoomed.calls.filter(c => c.op === 'stroke').at(-1)!.style).toBe(STATUS.alert); // the highlighted point's ring
  });
});
