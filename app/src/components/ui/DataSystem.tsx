import * as React from 'react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
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
    <section className="animate-fade-in space-y-3" aria-label={title}>
      <div className="flex items-end justify-between gap-3 border-b border-line pb-1.5">
        <h2 className="text-base font-semibold uppercase tracking-[0.08em] text-ink-soft">
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
  /** Provide to make the column sortable via header click. */
  sort?: (a: T, b: T) => number;
  /** Text this column contributes to the global filter and per-column scan. */
  filter?: (row: T) => string;
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
    return <EmptyState title={empty} glyph="▤" />;
  }
  return (
    <div className="max-h-[70vh] overflow-auto rounded-sm border border-line">
      <table className="w-full border-collapse text-sm tabular-nums">
        <thead>
          <tr className="sticky top-0 z-10 bg-surface-2 text-left shadow-[0_1px_0_rgb(var(--c-line))]">
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
              className="border-t border-line-soft transition-colors duration-150 even:bg-surface-2/40 hover:bg-surface-2/70"
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
  warn: 'text-warn',
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

export interface BulkAction<T> {
  label: string;
  /** Tone of the action button. */
  tone?: 'default' | 'alert';
  run: (selected: T[]) => void | Promise<void>;
}

/**
 * Enterprise operational grid. Dense by default; adds the things government
 * operators actually need to work a register at scale: global filter,
 * column sort, multi-select with bulk actions, and per-row drill-down
 * (expansion for linked records / audit context). Dependency-free and
 * low-bandwidth safe — no virtualisation, no chart libraries.
 */
export function EnterpriseTable<T extends { id?: string }>({
  columns,
  rows,
  rowKey,
  empty = 'No records.',
  search = false,
  searchPlaceholder = 'Filter records…',
  expand,
  bulk,
  initialSort,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, i: number) => string;
  empty?: string;
  search?: boolean;
  searchPlaceholder?: string;
  expand?: (row: T) => React.ReactNode;
  bulk?: BulkAction<T>[];
  initialSort?: { key: string; dir: 'asc' | 'desc' };
}) {
  const [q, setQ] = React.useState('');
  const [sortKey, setSortKey] = React.useState<string | null>(initialSort?.key ?? null);
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>(initialSort?.dir ?? 'asc');
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [open, setOpen] = React.useState<Set<string>>(new Set());
  const [running, setRunning] = React.useState(false);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    const cols = columns.filter(c => c.filter);
    return rows.filter(r =>
      cols.some(c => c.filter!(r).toLowerCase().includes(needle)),
    );
  }, [rows, q, columns]);

  const sorted = React.useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find(c => c.key === sortKey && c.sort);
    if (!col?.sort) return filtered;
    const out = [...filtered].sort(col.sort);
    return sortDir === 'desc' ? out.reverse() : out;
  }, [filtered, sortKey, sortDir, columns]);

  const keyed = React.useMemo(
    () => sorted.map((r, i) => ({ r, k: rowKey(r, i) })),
    [sorted, rowKey],
  );
  const visibleKeys = React.useMemo(() => keyed.map(x => x.k), [keyed]);
  const allOn =
    visibleKeys.length > 0 && visibleKeys.every(k => selected.has(k));
  const someOn = visibleKeys.some(k => selected.has(k));

  function toggleSort(c: Column<T>) {
    if (!c.sort) return;
    if (sortKey !== c.key) {
      setSortKey(c.key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
    }
  }
  function toggleRow(k: string) {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }
  function toggleAll() {
    setSelected(prev => {
      if (visibleKeys.every(k => prev.has(k))) {
        const n = new Set(prev);
        visibleKeys.forEach(k => n.delete(k));
        return n;
      }
      return new Set([...prev, ...visibleKeys]);
    });
  }
  function toggleOpen(k: string) {
    setOpen(prev => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }
  async function runBulk(a: BulkAction<T>) {
    const picked = keyed.filter(x => selected.has(x.k)).map(x => x.r);
    if (picked.length === 0) return;
    setRunning(true);
    try {
      await a.run(picked);
      setSelected(new Set());
    } finally {
      setRunning(false);
    }
  }

  const colSpan =
    columns.length + (bulk ? 1 : 0) + (expand ? 1 : 0);

  return (
    <div className="space-y-2">
      {(search || bulk) && (
        <div className="flex flex-wrap items-center gap-2">
          {search ? (
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Filter records"
              className="min-h-tap w-full max-w-xs rounded-sm border border-line bg-surface px-2 py-1 text-sm"
            />
          ) : null}
          {bulk && selected.size > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-sm border border-line bg-surface-2 px-2 py-1 text-sm">
              <span className="font-medium tabular-nums">
                {selected.size} selected
              </span>
              {bulk.map(a => (
                <button
                  key={a.label}
                  type="button"
                  disabled={running}
                  onClick={() => void runBulk(a)}
                  className={cn(
                    'rounded-xs border px-2 py-0.5 text-xs disabled:opacity-50',
                    a.tone === 'alert'
                      ? 'border-alert text-alert hover:bg-[#f7e3e1]'
                      : 'border-line hover:bg-surface',
                  )}
                >
                  {a.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-xs text-ink-muted underline underline-offset-2"
              >
                Clear
              </button>
            </div>
          ) : null}
          <span className="ml-auto text-xs text-ink-muted tabular-nums">
            {sorted.length === rows.length
              ? `${rows.length} records`
              : `${sorted.length} of ${rows.length} records`}
          </span>
        </div>
      )}
      {keyed.length === 0 ? (
        q ? (
          <EmptyState
            glyph="⌕"
            title="No records match the filter"
            hint={`Nothing matches “${q}”. Adjust or clear the filter to see all records.`}
          />
        ) : (
          <EmptyState title={empty} glyph="▤" />
        )
      ) : (
        <div className="max-h-[70vh] overflow-auto rounded-sm border border-line">
          <table className="w-full border-collapse text-sm tabular-nums">
            <thead>
              <tr className="sticky top-0 z-10 bg-surface-2 text-left shadow-[0_1px_0_rgb(var(--c-line))]">
                {bulk ? (
                  <th scope="col" className="w-9 px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label="Select all rows"
                      checked={allOn}
                      ref={el => {
                        if (el) el.indeterminate = !allOn && someOn;
                      }}
                      onChange={toggleAll}
                    />
                  </th>
                ) : null}
                {expand ? <th scope="col" className="w-9 px-2 py-2" /> : null}
                {columns.map(c => (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={
                      sortKey === c.key
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                    className={cn(
                      'whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-soft',
                      c.align === 'right' && 'text-right',
                      c.sort && 'cursor-pointer select-none hover:text-ink',
                    )}
                    onClick={() => toggleSort(c)}
                  >
                    {c.header}
                    {c.sort ? (
                      <span className="ml-1 text-[10px] text-ink-muted">
                        {sortKey === c.key
                          ? sortDir === 'asc'
                            ? '▲'
                            : '▼'
                          : '↕'}
                      </span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keyed.map(({ r, k }) => {
                const isOpen = open.has(k);
                return (
                  <React.Fragment key={k}>
                    <tr
                      className={cn(
                        'border-t border-line-soft transition-colors duration-150 even:bg-surface-2/40 hover:bg-surface-2/70',
                        selected.has(k) && 'bg-link/10 even:bg-link/10 hover:bg-link/15',
                      )}
                    >
                      {bulk ? (
                        <td className="px-3 py-2 align-top">
                          <input
                            type="checkbox"
                            aria-label="Select row"
                            checked={selected.has(k)}
                            onChange={() => toggleRow(k)}
                          />
                        </td>
                      ) : null}
                      {expand ? (
                        <td className="px-2 py-2 align-top">
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-label={isOpen ? 'Collapse row' : 'Expand row'}
                            onClick={() => toggleOpen(k)}
                            className="rounded-xs border border-line px-1.5 text-xs text-ink-soft hover:bg-surface-2"
                          >
                            {isOpen ? '▾' : '▸'}
                          </button>
                        </td>
                      ) : null}
                      {columns.map(c => (
                        <td
                          key={c.key}
                          className={cn(
                            'px-3 py-2 align-top',
                            c.align === 'right' && 'text-right',
                          )}
                        >
                          {c.render(r)}
                        </td>
                      ))}
                    </tr>
                    {expand && isOpen ? (
                      <tr className="border-t border-line-soft bg-[#f6f8fa]">
                        <td colSpan={colSpan} className="px-4 py-3">
                          {expand(r)}
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
