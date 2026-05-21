'use client';

import * as React from 'react';

/**
 * SurfaceHeading — the repeated "h2 + badge chip" header used at the top
 * of every Phase-B surface. Standardises wording, kerning, and the badge
 * border/muted style so the header strip stays uniform.
 *
 * Pair with right-side action buttons by wrapping with a flex row:
 *   <div className="flex flex-wrap items-end justify-between gap-2">
 *     <SurfaceHeading title="X" badge="durable · realtime" />
 *     <div className="flex items-center gap-2">…buttons…</div>
 *   </div>
 */
export function SurfaceHeading({
  title,
  badge,
  level = 'h2',
}: {
  title: string;
  badge?: string;
  level?: 'h1' | 'h2';
}) {
  const Tag = level;
  return (
    <div className="flex items-center gap-2">
      <Tag className="text-base font-semibold uppercase tracking-[0.16em] text-ink">{title}</Tag>
      {badge ? (
        <span
          className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
          style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
        >
          {badge}
        </span>
      ) : null}
    </div>
  );
}
