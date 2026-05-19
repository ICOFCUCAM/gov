'use client';

// Police domain — Facility Network. Stations, rosters and record custody.
// The institutional chain section is the actor-engagement surface: enrol
// officers at a station, file/advance case records, refer cross-ministry,
// and run the facility ↔ ministry ↔ national dispatch lanes.

import * as React from 'react';
import { policeOps } from '@/lib/gov/agency-systems';
import { MinistryChainSection } from '@/apps/_shared/InstitutionChain';

export function FacilityNetwork({ id, now, accent }: {
  id: string; now: number; accent: string;
}) {
  const o = policeOps(id, now / 4000);
  const tiles = [
    { l: 'Patrol divisions', v: `${o.patrols.length}` },
    { l: 'Regions covered', v: `${o.regional.length}` },
    { l: 'Units total', v: `${o.unitsTotal}` },
    { l: 'Units deployed', v: `${o.unitsDeployed}` },
  ];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map(t => (
          <div key={t.l} className="rounded-[3px] border border-line bg-surface p-2"
            style={{ borderColor: `color-mix(in srgb,${accent} 16%,rgb(var(--c-line)))` }}>
            <div className="text-[9px] uppercase tracking-[0.14em] text-ink-muted">{t.l}</div>
            <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink">{t.v}</div>
          </div>
        ))}
      </div>
      <MinistryChainSection ministryKey="INTERIOR" id={id} now={now} accent={accent} />
    </div>
  );
}
