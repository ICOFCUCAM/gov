'use client';

import * as React from 'react';
import { projectedPaths, findCountry } from '@/lib/geo/world';

const TONE: Record<string, string> = {
  alert: '#f1707a', warn: '#e0b341', ok: '#34d39c', neutral: '#6b7a90',
};
const toneFor = (v: number) => (v >= 75 ? 'alert' : v >= 55 ? 'warn' : v >= 35 ? 'neutral' : 'ok');

/**
 * Real geographic basemap (Natural Earth 110m). World by default;
 * zooms to a nation when `focus` matches a country. `riskOf` tints
 * countries for the heatmap; otherwise renders a neutral command base.
 */
export function WorldMap({
  focus,
  riskOf,
  accent = '#37c7d4',
  className = '',
}: {
  focus?: string;
  riskOf?: (name: string) => number | null;
  accent?: string;
  className?: string;
}) {
  const focusFeat = React.useMemo(() => findCountry(focus), [focus]);
  const paths = React.useMemo(
    () => projectedPaths(1000, 620, focusFeat),
    [focusFeat],
  );
  return (
    <svg viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice" className={`absolute inset-0 h-full w-full ${className}`}>
      <rect width="1000" height="620" fill="rgb(var(--c-bg))" />
      {paths.map(p => {
        let fill = 'rgb(var(--c-surface-2))';
        let op = 0.55;
        let stroke = 'rgb(var(--c-line))';
        if (focusFeat) {
          if (p.focused) { fill = accent; op = 0.16; stroke = accent; }
          else { fill = 'rgb(var(--c-surface-2))'; op = 0.3; }
        } else if (riskOf) {
          const r = riskOf(p.name);
          if (r != null) { fill = TONE[toneFor(r)] ?? fill; op = 0.16 + (r / 100) * 0.5; }
          else { op = 0.35; }
        }
        return (
          <path key={p.name} d={p.d} fill={fill} fillOpacity={op}
            stroke={stroke} strokeWidth={p.focused ? 1.4 : 0.5} strokeOpacity={0.5}
            className="transition-all duration-1000 ease-sov" />
        );
      })}
    </svg>
  );
}
