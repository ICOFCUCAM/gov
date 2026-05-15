import * as React from 'react';
import { cn } from '@/lib/utils';
import type { OpsTone } from '@/lib/api/types';

/**
 * Production-grade institutional primitives: authority, density, calm.
 * Government operators work with dense tabular information — these favour
 * legibility and information density over whitespace, with tabular numerals
 * and quiet rules. No startup gradients.
 */

export function Section({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex items-end justify-between gap-3 border-b border-line pb-1.5">
        <h2 className="text-base font-semibold uppercase tracking-wide text-ink-soft">
          {title}
        </h2>
        {meta ? <div className="text-xs text-ink-muted">{meta}</div> : null}
      </div>
      {children}
    </section>
  );
}

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => React.ReactNode;
}

export function DataTable<T extends { id?: string }>({
  columns,
  rows,
  empty = 'No records.',
  rowKey,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
  rowKey: (row: T, i: number) => string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-line p-6 text-center text-sm text-ink-muted">
        {empty}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-sm border border-line">
      <table className="w-full border-collapse text-sm tabular-nums">
        <thead>
          <tr className="bg-surface-2 text-left">
            {columns.map(c => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  'whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-soft',
                  c.align === 'right' && 'text-right',
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              className="border-t border-line-soft even:bg-[#fbfaf6]"
            >
              {columns.map(c => (
                <td
                  key={c.key}
                  className={cn(
                    'px-3 py-2 align-top',
                    c.align === 'right' && 'text-right',
                  )}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const toneText: Record<OpsTone, string> = {
  ok: 'text-ok',
  warn: 'text-[#6a4d00]',
  alert: 'text-alert',
  neutral: 'text-ink',
};

export function StatusText({ tone, children }: { tone: OpsTone; children: React.ReactNode }) {
  return <span className={cn('font-medium', toneText[tone])}>{children}</span>;
}

/** Period-over-period delta with direction-aware tone. */
export function Delta({
  value,
  delta,
  goodWhenUp,
}: {
  value: string;
  delta: number;
  goodWhenUp: boolean;
}) {
  const up = delta >= 0;
  const good = goodWhenUp ? up : !up;
  const arrow = up ? '▲' : '▼';
  return (
    <div>
      <div className="font-serif text-2xl tabular-nums">{value}</div>
      <div
        className={cn(
          'text-xs tabular-nums',
          good ? 'text-ok' : 'text-alert',
        )}
      >
        {arrow} {Math.abs(delta).toFixed(1)}% vs prior period
      </div>
    </div>
  );
}
