// One indicator value on a console screen (plan step I3): the value computed
// from the records with its marker (a count of records carries none; Sample
// where sample records were counted; Not connected where there is no source),
// whether its definition is approved, its period, coverage and when the newest
// record counted changed. A value held back by the small-cell rule says so; a
// missing value is never a zero. No hooks: usable on server pages (/control)
// and in client panels alike.

import * as React from 'react';
import Link from 'next/link';
import { SignalTag } from '@/components/ui/SignalTag';
import type { IndicatorValue } from '@/lib/indicators/types';

/** The value in words: a number with its unit, or why there is none. */
export function valueText(v: Pick<IndicatorValue, 'value' | 'unit' | 'kind' | 'disclosure'>): string {
  if (v.value === null) {
    if (v.kind === 'unavailable') return 'Not connected';
    if (v.disclosure.suppressed) return v.disclosure.suppressed === 'no-threshold' ? 'Held back' : 'Small number';
    return '—';
  }
  const n = Number.isInteger(v.value) ? v.value.toLocaleString() : v.value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return v.unit === '%' ? `${n}%` : v.unit === 'd' ? `${n} days` : n;
}

/** Where the value comes from, for the marker's hover and screen readers. */
export function sourceText(v: IndicatorValue): string {
  return [
    `${v.title}: ${v.source.method} on ${v.source.registerId} (${v.source.recordType})`,
    v.source.institutionName ? `kept by ${v.source.institutionName}` : '',
    `period ${v.period.start} to ${v.period.end} (exclusive)`,
    `coverage ${v.coverage.reporting} of ${v.coverage.expected} ${v.coverage.of}`,
    v.status === 'approved' ? `definition version ${v.version} approved` : `definition version ${v.version} not approved (draft)`,
    v.disclosure.rule,
    v.reason ?? '',
  ].filter(Boolean).join(' · ');
}

export function IndicatorTile({ v, label, href = true, className = '' }: { v: IndicatorValue; label?: string; href?: boolean; className?: string }) {
  const muted = v.value === null;
  return (
    <div className={`rounded-[3px] border border-line bg-surface px-2.5 py-2 ${className}`} data-indicator={v.indicatorId} data-kind={v.kind}>
      <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        <span className="truncate">{label ?? v.title}</span>
        <SignalTag kind={v.kind} source={sourceText(v)} />
        {v.status === 'draft' ? <span title="The institution has not approved this definition yet" className="shrink-0 rounded-[2px] border border-line px-1 text-[8px] leading-[1.4] tracking-[0.08em]">Draft</span> : null}
      </div>
      <div className={`font-mono tabular-nums ${muted ? 'text-[11px] text-ink-muted' : 'text-[15px] text-ink'}`}>{valueText(v)}</div>
      <div className="truncate text-[9px] text-ink-muted" title={v.reason ?? undefined}>
        {v.value === null && v.reason ? v.reason : `${v.period.start.slice(0, 7)} · ${v.coverage.reporting}/${v.coverage.expected} ${v.coverage.of}${v.lastUpdated ? ` · updated ${v.lastUpdated.slice(0, 10)}` : ''}`}
      </div>
      {href ? <Link href={`/gov/twin/indicators/${encodeURIComponent(v.indicatorId)}${v.institution ? `?institution=${encodeURIComponent(v.institution)}` : ''}`} className="text-[9px] text-link underline underline-offset-2">Definition</Link> : null}
    </div>
  );
}
