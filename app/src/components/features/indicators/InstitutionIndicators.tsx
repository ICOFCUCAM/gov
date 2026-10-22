'use client';

// An institution's indicators on its workspace (plan step I3): values computed
// from its records under the indicator register's definitions
// (/api/indicators?institution=, /api/indicators/[id]), replacing generated
// panels. Each value carries its marker, approval state, period and coverage
// (IndicatorTile); a definition with no source says "Not connected", never zero.

import * as React from 'react';
import Link from 'next/link';
import { IndicatorTile, valueText, sourceText } from './IndicatorTile';
import { SignalTag } from '@/components/ui/SignalTag';
import type { IndicatorValue } from '@/lib/indicators/types';

export function useInstitutionIndicators(institution: string): { values: IndicatorValue[] | null; error: string | null } {
  const [values, setValues] = React.useState<IndicatorValue[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    let live = true;
    fetch(`/api/indicators?institution=${encodeURIComponent(institution)}`, { cache: 'no-store' })
      .then(async r => { const j = await r.json().catch(() => null); if (!live) return; if (r.ok && j?.values) setValues(j.values); else setError(j?.error ?? 'The indicators could not be read'); })
      .catch(() => { if (live) setError('The indicators could not be read'); });
    return () => { live = false; };
  }, [institution]);
  return { values, error };
}

/** Tiles for the named indicators of one institution, in the order given. */
export function InstitutionIndicatorStrip({ institution, ids, labels = {}, className = '' }: { institution: string; ids: string[]; labels?: Record<string, string>; className?: string }) {
  const { values, error } = useInstitutionIndicators(institution);
  if (error) return <p className="text-[11px] text-ink-muted" role="status">{error}</p>;
  if (!values) return <p className="text-[11px] text-ink-muted">Computing from the records…</p>;
  const shown = ids.map(id => values.find(v => v.indicatorId === id)).filter((v): v is IndicatorValue => !!v);
  return (
    <div className={`grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-6 ${className}`}>
      {shown.map(v => <IndicatorTile key={v.indicatorId} v={v} label={labels[v.indicatorId]} />)}
    </div>
  );
}

/** Twelve months of one indicator as bars; a month with no value is left empty, never drawn as zero. */
function MonthBars({ series }: { series: IndicatorValue[] }) {
  const max = Math.max(1, ...series.map(s => s.value ?? 0));
  return (
    <div className="flex h-10 items-end gap-[2px]" role="img" aria-label={series.map(s => `${s.period.start.slice(0, 7)}: ${valueText(s)}`).join('; ')}>
      {series.map(s => (
        <div key={s.period.start} className="flex-1" title={`${s.period.start.slice(0, 7)}: ${valueText(s)}`}>
          {s.value === null
            ? <div className="h-[2px] border-t border-dashed border-line" />
            : <div className="rounded-[1px]" style={{ height: `${Math.max(2, (40 * s.value) / max)}px`, backgroundColor: 'rgb(var(--c-link))', opacity: s.kind === 'sample' ? 0.55 : 0.9 }} />}
        </div>
      ))}
    </div>
  );
}

/** The last twelve months of each named indicator for one institution. */
export function InstitutionIndicatorSeries({ institution, ids }: { institution: string; ids: string[] }) {
  const [data, setData] = React.useState<Record<string, IndicatorValue[]> | null>(null);
  React.useEffect(() => {
    let live = true;
    Promise.all(ids.map(id => fetch(`/api/indicators/${encodeURIComponent(id)}?institution=${encodeURIComponent(institution)}`, { cache: 'no-store' })
      .then(r => r.json()).then(j => [id, (j?.series ?? []) as IndicatorValue[]] as const).catch(() => [id, [] as IndicatorValue[]] as const)))
      .then(rows => { if (live) setData(Object.fromEntries(rows)); });
    return () => { live = false; };
  }, [institution, ids.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return <p className="text-[11px] text-ink-muted">Computing from the records…</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ids.map(id => {
        const s = data[id] ?? [];
        const last = s.at(-1);
        if (!last) return null;
        return (
          <div key={id} className="rounded-[3px] border border-line bg-surface p-2" data-indicator={id} data-kind={last.kind}>
            <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              <span className="truncate">{last.title}</span><SignalTag kind={last.kind} source={sourceText(last)} />
              {last.status === 'draft' ? <span className="shrink-0 rounded-[2px] border border-line px-1 text-[8px]">Draft</span> : null}
            </div>
            <div className="font-mono text-[15px] tabular-nums text-ink">{valueText(last)}</div>
            {last.kind === 'unavailable' ? <p className="text-[10px] text-ink-muted">{last.reason}</p> : <MonthBars series={s} />}
            <div className="mt-0.5 flex justify-between text-[9px] text-ink-muted"><span>{s[0]?.period.start.slice(0, 7)}</span><Link className="underline" href={`/gov/twin/indicators/${encodeURIComponent(id)}?institution=${encodeURIComponent(institution)}`}>Definition</Link><span>{last.period.start.slice(0, 7)}</span></div>
          </div>
        );
      })}
    </div>
  );
}

/** One indicator broken down by procedure (or region), each part through the same disclosure rule. */
export function IndicatorBreakdown({ institution, id, empty }: { institution: string; id: string; empty?: string }) {
  const { values, error } = useInstitutionIndicators(institution);
  if (error) return <p className="text-[11px] text-ink-muted" role="status">{error}</p>;
  const v = values?.find(x => x.indicatorId === id);
  if (!v) return <p className="text-[11px] text-ink-muted">Computing from the records…</p>;
  if (v.value === null && v.kind === 'unavailable') return <IndicatorTile v={v} />;
  const groups = v.groups ?? [];
  const max = Math.max(1, ...groups.map(g => (v.unit === '%' ? 100 : g.value ?? 0)));
  return (
    <div className="space-y-1" data-indicator={id} data-kind={v.kind}>
      <div className="flex items-center gap-1 text-[10px] text-ink-muted">
        <span>{v.title}: {valueText(v)}</span><SignalTag kind={v.kind} source={sourceText(v)} />
        {v.status === 'draft' ? <span className="rounded-[2px] border border-line px-1 text-[8px] uppercase">Draft</span> : null}
        <Link className="ms-auto underline" href={`/gov/twin/indicators/${encodeURIComponent(id)}?institution=${encodeURIComponent(institution)}`}>Definition</Link>
      </div>
      {v.disclosure.breakdownWithheld ? <p className="text-[10px] text-ink-muted">Breakdown withheld: a small number could be worked out from it.</p> : null}
      {groups.length ? groups.map(g => (
        <div key={g.key} className="flex items-center gap-2 text-[11px]">
          <span className="w-40 shrink-0 truncate text-ink-soft" title={g.label}>{g.label}</span>
          <span className="h-2 flex-1 rounded-full bg-surface-2">
            {g.value !== null ? <span className="block h-2 rounded-full" style={{ width: `${Math.max(2, (100 * g.value) / max)}%`, backgroundColor: 'rgb(var(--c-link))' }} /> : null}
          </span>
          <span className="w-24 shrink-0 text-end font-mono tabular-nums text-ink-soft">
            {g.value === null ? (g.suppressed ? 'held back' : 'no value') : v.unit === '%' ? `${g.value}%${g.denominator !== undefined ? ` of ${g.denominator}` : ''}` : g.value.toLocaleString()}
          </span>
        </div>
      )) : <p className="text-[11px] text-ink-muted">{empty ?? 'Nothing to break down in this period.'}</p>}
    </div>
  );
}
