'use client';

// The twin's territory: the nation's official subdivisions shaded by one
// metric as the twin knew it on a date. Only observed values are drawn; a
// unit without one stays blank and says so. A slider steps through the dates
// the metric was observed. Drawn by the shared map engine
// (components/map/NationMap.tsx): the nation's own projection, legend, scale
// bar, sources and a table of every unit.

import * as React from 'react';
import { NationMap, type MapValue } from '@/components/map/NationMap';
import { INFO } from '@/lib/theme/tokens';

export interface TerritoryObs { entityId: string; value: number; unit: string; validFrom: string }
export interface TerritoryEntity { id: string; name: string; code?: string }

export function TwinTerritory({ metric, obs, entities, dates, date, onDate }: {
  metric: string; obs: TerritoryObs[]; entities: TerritoryEntity[];
  dates: string[]; date: string; onDate: (d: string) => void;
}) {
  // Value per ISO 3166-2 code, through the register's entities.
  const values = React.useMemo<MapValue[]>(() => {
    const codeOf = new Map(entities.filter(e => e.code).map(e => [e.id, e.code!]));
    const m = new Map<string, MapValue>();
    for (const o of obs) { const c = codeOf.get(o.entityId); if (c) m.set(c, { key: c, value: o.value, unit: o.unit, asOf: o.validFrom }); }
    return [...m.values()];
  }, [obs, entities]);
  const unit = obs[0]?.unit ?? '';
  const idx = Math.max(0, dates.indexOf(dates.filter(d => d <= date).at(-1) ?? ''));

  return (
    <div className="space-y-2">
      <NationMap title={`${metric} by subdivision`} values={values} kind="observed" source="National data (recorded observations)"
        valueLabel={metric} unit={unit} asOf={date} maxHeight={480} />
      {dates.length > 1 ? (
        <label className="flex flex-wrap items-center gap-2 text-[12px] text-ink-soft">
          History
          <input type="range" min={0} max={dates.length - 1} step={1} value={idx} onChange={e => onDate(dates[Number(e.currentTarget.value)]!)}
            className="min-w-[12rem] flex-1" style={{ accentColor: INFO }} aria-valuetext={dates[idx]} />
          <span className="font-mono tabular-nums text-ink">{dates[idx]}</span>
          <span>({dates.length} observation dates)</span>
        </label>
      ) : null}
    </div>
  );
}
