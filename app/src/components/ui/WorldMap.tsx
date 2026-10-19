'use client';

import * as React from 'react';
import { projectedPaths, findCountry, findCountryByIso3 } from '@/lib/geo/world';
import { nationIso3 } from '@/lib/nation/registry';

import { TONE } from '@/lib/tone-palette';
const toneFor = (v: number) => (v >= 75 ? 'alert' : v >= 55 ? 'warn' : v >= 35 ? 'neutral' : 'ok');

/**
 * Real geographic basemap (Natural Earth 110m). World by default;
 * zooms to a nation when `focus` matches a country, or to the installed
 * nation (by ISO code) when a page asks for it by its formal name. `riskOf` tints
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
  // A page asking for the nation (focus set) gets it by ISO code when the name does not match the map.
  const iso3 = nationIso3();
  const focusFeat = React.useMemo(() => (focus ? findCountry(focus) ?? findCountryByIso3(iso3) : undefined), [focus, iso3]);
  const paths = React.useMemo(
    () => projectedPaths(1000, 620, focusFeat),
    [focusFeat],
  );
  return (
    <svg viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice" className={`absolute inset-0 h-full w-full ${className}`}>
      <defs>
        <pattern id="ocean" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.7" fill="rgb(var(--c-line))" fillOpacity="0.4" />
        </pattern>
        <filter id="landglow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="1000" height="620" fill="rgb(var(--c-bg))" />
      <rect width="1000" height="620" fill="url(#ocean)" />
      {paths.map(p => {
        let fill = 'rgb(var(--c-surface-2))';
        let op = 0.62;
        let stroke = 'rgb(var(--c-line))';
        if (focusFeat) {
          if (p.focused) { fill = accent; op = 0.2; stroke = accent; }
          else { fill = 'rgb(var(--c-surface-2))'; op = 0.34; }
        } else if (riskOf) {
          const r = riskOf(p.name);
          if (r != null) { fill = TONE[toneFor(r)] ?? fill; op = 0.16 + (r / 100) * 0.5; }
          else { op = 0.4; }
        }
        return (
          <path key={p.name} d={p.d} fill={fill} fillOpacity={op}
            stroke={stroke} strokeWidth={p.focused ? 1.6 : 0.5} strokeOpacity={p.focused ? 0.9 : 0.5}
            filter={p.focused ? 'url(#landglow)' : undefined}
            className="transition-all duration-1000 ease-sov" />
        );
      })}
    </svg>
  );
}
