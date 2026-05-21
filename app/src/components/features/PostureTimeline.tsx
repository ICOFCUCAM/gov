'use client';

import * as React from 'react';
import { TONE } from '@/components/features/SituationRoom';
import type { PostureHistoryRow } from '@/lib/db/types';

const postureTone = (p: string) =>
  p === 'national-emergency' || p === 'crisis' ? TONE.alert
  : p === 'elevated' ? TONE.warn
  : p === 'recovery' ? TONE.link
  : TONE.ok;

/**
 * PostureTimeline — compact SVG sparkline for one charter's posture
 * history. Renders two stacked lines (readiness top, stress bottom)
 * over the supplied snapshot window. Coloured dots mark posture
 * transitions so the operator can see *when* a charter shifted.
 */
export function PostureTimeline({
  rows, height = 96,
}: { rows: PostureHistoryRow[]; height?: number }) {
  if (rows.length === 0) {
    return <div className="px-3 py-4 text-[10px] text-ink-muted">No snapshots in window.</div>;
  }
  // Oldest-first for left-to-right rendering.
  const ordered = [...rows].sort((a, b) => +new Date(a.snapshot_at) - +new Date(b.snapshot_at));
  const firstAt = +new Date(ordered[0]!.snapshot_at);
  const lastAt  = +new Date(ordered[ordered.length - 1]!.snapshot_at);
  const span = Math.max(1, lastAt - firstAt);
  const width = 480;
  const padX = 8;
  const innerW = width - 2 * padX;
  const innerH = height - 18; // leave room for posture dot row

  const xFor = (iso: string) => padX + ((+new Date(iso) - firstAt) / span) * innerW;
  const yFor = (v: number | null) => {
    if (v == null) return innerH / 2;
    const t = Math.max(0, Math.min(100, v)) / 100;
    return innerH - t * innerH + 2;
  };

  const readinessPath = ordered.map((r, i) => `${i === 0 ? 'M' : 'L'} ${xFor(r.snapshot_at).toFixed(1)} ${yFor(r.readiness).toFixed(1)}`).join(' ');
  const stressPath    = ordered.map((r, i) => `${i === 0 ? 'M' : 'L'} ${xFor(r.snapshot_at).toFixed(1)} ${yFor(r.stress).toFixed(1)}`).join(' ');

  // Posture-transition dots — only mark when posture changes from the previous snapshot.
  const dots: { x: number; tone: string; posture: string; at: string }[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const r = ordered[i]!;
    const prev = i > 0 ? ordered[i - 1]!.posture : null;
    if (prev !== r.posture) {
      dots.push({ x: xFor(r.snapshot_at), tone: postureTone(r.posture) ?? TONE.neutral ?? '#888',
                  posture: r.posture, at: r.snapshot_at });
    }
  }

  return (
    <div className="space-y-1">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block w-full"
        role="img"
        aria-label="posture timeline"
      >
        {/* axis ticks at 0, 50, 100 */}
        {[0, 50, 100].map(v => (
          <line key={v}
            x1={padX} x2={width - padX}
            y1={yFor(v)} y2={yFor(v)}
            stroke="rgb(var(--c-line))" strokeDasharray="2 3" strokeWidth="0.5" />
        ))}
        {/* readiness — green */}
        <path d={readinessPath} fill="none" stroke={TONE.ok} strokeWidth="1.4" />
        {/* stress — alert */}
        <path d={stressPath} fill="none" stroke={TONE.alert} strokeWidth="1.4" opacity="0.85" />
        {/* posture-shift dots along the bottom */}
        {dots.map((d, i) => (
          <g key={i} transform={`translate(${d.x.toFixed(1)} ${height - 6})`}>
            <circle r="3.5" fill={d.tone}>
              <title>{`${d.posture} · ${new Date(d.at).toLocaleString()}`}</title>
            </circle>
          </g>
        ))}
      </svg>
      <div className="flex items-center gap-3 text-[8.5px] uppercase tracking-wider text-ink-muted">
        <span><span className="inline-block h-1 w-3 align-middle" style={{ backgroundColor: TONE.ok }} /> readiness</span>
        <span><span className="inline-block h-1 w-3 align-middle" style={{ backgroundColor: TONE.alert }} /> stress</span>
        <span className="ml-auto">
          {new Date(firstAt).toLocaleDateString()} → {new Date(lastAt).toLocaleDateString()} · {ordered.length} snapshots
        </span>
      </div>
    </div>
  );
}
