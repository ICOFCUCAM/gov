'use client';

// Disputed territory on a map, drawn as the nation's worldview says
// (lib/map/disputed.ts). Neutral (the default): hatched with a dashed edge
// and named as disputed, with who administers and who claims it. When the
// chosen point of view gives an area to the nation it is drawn in the
// nation's colour; to another country, in the plain colour of foreign land.
// It sits above the countries and below anything the map marks.

import * as React from 'react';
import type { Geom } from '@/lib/geo/admin1';
import { disputeText, type DisputedArea } from '@/lib/map/disputed';

export function DisputedLayer({ areas, pathOf, project, nation, nationFill, landFill = 'rgb(var(--c-surface-2))', view, labels = true }: {
  areas: DisputedArea[];
  pathOf: (g: Geom) => string;
  project: (lng: number, lat: number) => [number, number] | null;
  /** The installed nation (platform code). */
  nation?: string | null;
  /** How the map fills the nation (an area the worldview gives to it takes the same). */
  nationFill: string;
  landFill?: string;
  view?: string;
  /** Name each disputed area at its label point. */
  labels?: boolean;
}) {
  const uid = React.useId().replace(/:/g, '');
  const drawn = areas.map(a => ({ a, d: pathOf(a.geometry) })).filter(x => x.d);
  if (!drawn.length) return null;
  return (
    <g>
      <defs>
        <pattern id={`dsp-${uid}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <rect width="5" height="5" fill="rgb(var(--c-surface-2))" fillOpacity="0.55" />
          <line x1="0" y1="0" x2="0" y2="5" stroke="rgb(var(--c-ink-soft))" strokeWidth="1.1" strokeOpacity="0.75" />
        </pattern>
      </defs>
      {drawn.map(({ a, d }) => {
        const text = disputeText(a, view);
        const disputed = a.shownAs === 'disputed';
        const fill = disputed ? `url(#dsp-${uid})` : a.shownAs === nation ? nationFill : landFill;
        return (
          <path key={a.id} d={d} fill={fill} fillOpacity={disputed ? 1 : 0.9}
            stroke={disputed ? 'rgb(var(--c-ink-soft))' : 'rgb(var(--c-bg))'} strokeWidth={disputed ? 0.9 : 0.4} strokeDasharray={disputed ? '3 2' : undefined}
            role="img" aria-label={text}>
            <title>{text}</title>
          </path>
        );
      })}
      {labels ? drawn.filter(x => x.a.shownAs === 'disputed').map(({ a }) => {
        const p = project(a.label[0], a.label[1]);
        return p ? (
          <text key={`l${a.id}`} x={p[0]} y={p[1]} textAnchor="middle" fontSize="8" fontStyle="italic" fill="rgb(var(--c-ink-soft))"
            stroke="rgb(var(--c-bg))" strokeWidth={2.2} paintOrder="stroke" pointerEvents="none" aria-hidden>{a.name} (disputed)</text>
        ) : null;
      }) : null}
    </g>
  );
}
