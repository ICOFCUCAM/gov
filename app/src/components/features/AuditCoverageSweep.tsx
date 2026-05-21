'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { distinctAuditScopesRows, verifyChainRow } from '@/lib/db/repos/audit';
import { substrateAvailable } from '@/lib/db/client';
import { useIdentity } from '@/components/identity/useIdentity';
import { getBoolPref, setPref } from '@/lib/prefs';

interface SweepResult { scope: string; entries: number; intact: boolean; brokenAt: number | null }

/** AuditCoverageSweep — verify every visible scope's chain in one
 *  sweep. Pages the scope list (up to 100) and calls
 *  civicos_verify_audit_chain for each. Surfaces both totals and a
 *  per-scope table; downloadable as JSON for compliance attachments. */
export function AuditCoverageSweep() {
  const { ready } = useIdentity();
  const [running, setRunning] = React.useState(false);
  const [results, setResults] = React.useState<SweepResult[]>([]);
  const [doneAt, setDoneAt] = React.useState<number | null>(null);
  const available = substrateAvailable();

  const run = React.useCallback(async () => {
    if (!available) return;
    setRunning(true);
    try {
      const scopes = await distinctAuditScopesRows(100);
      const out = await Promise.all(scopes.map(async s => {
        const r = await verifyChainRow(s);
        return { scope: s, entries: r?.entries ?? 0, intact: r?.intact ?? false, brokenAt: r?.brokenAt ?? null };
      }));
      out.sort((a, b) => (a.intact === b.intact ? a.scope.localeCompare(b.scope) : a.intact ? 1 : -1));
      setResults(out);
      setDoneAt(Date.now());
    } finally {
      setRunning(false);
    }
  }, [available]);

  const [autoRun, setAutoRun] = React.useState(() => getBoolPref('coverage.autoRun', true));
  React.useEffect(() => { setPref('coverage.autoRun', autoRun); }, [autoRun]);
  React.useEffect(() => { if (ready && autoRun) void run(); }, [ready, autoRun, run]);

  function downloadReport() {
    const payload = {
      generated_at: new Date().toISOString(),
      scope_count: results.length,
      all_intact: results.every(r => r.intact),
      results,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `civicos-coverage-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (!available) {
    return <Panel title="Coverage sweep" meta="not configured" bodyClass="!p-3"><p className="text-[10px] text-ink-muted">Substrate not configured.</p></Panel>;
  }

  const intact = results.filter(r => r.intact).length;
  const broken = results.filter(r => !r.intact).length;
  const totalEntries = results.reduce((s, r) => s + r.entries, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Audit coverage sweep</h2>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}>
            full integrity scan
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void run()} disabled={running}
            className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
            {running ? 'sweeping…' : 'sweep again'}
          </button>
          <label className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-ink-muted">
            <input type="checkbox" checked={autoRun} onChange={e => setAutoRun(e.currentTarget.checked)} />
            auto on load
          </label>
          <button type="button" onClick={downloadReport} disabled={results.length === 0}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50">
            download report
          </button>
          <button type="button" disabled={results.length === 0}
            onClick={() => {
              const csv = ['scope,entries,intact,broken_at',
                ...results.map(r => `${r.scope.replace(/,/g, ';')},${r.entries},${r.intact},${r.brokenAt ?? ''}`)].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `civicos-coverage-${new Date().toISOString().slice(0,10)}.csv`;
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50">
            download csv
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Scopes swept" value={String(results.length)} />
        <Tile label="Intact" value={String(intact)} tone={TONE.ok} />
        <Tile label="Broken" value={String(broken)} tone={broken > 0 ? TONE.alert : TONE.ink} />
        <Tile label="Total entries" value={totalEntries.toLocaleString()} />
      </div>

      {doneAt ? (
        <p className="font-mono text-[10px] text-ink-muted">
          last sweep · {new Date(doneAt).toLocaleString()}
        </p>
      ) : null}

      <Panel title="Per-scope results" meta={`${results.length}`} bodyClass="!p-0">
        {results.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">No scopes visible.</p>
        ) : (
          <div className="max-h-[560px] overflow-y-auto">
            {results.map(r => (
              <Link key={r.scope} href={`/gov/audit?scope=${encodeURIComponent(r.scope)}`}
                className="block border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px] hover:bg-surface-2">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-link">{r.scope}</span>
                  <span className="w-16 shrink-0 text-right font-mono tabular-nums text-ink">{r.entries}</span>
                  <span className="w-20 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                    style={{ color: r.intact ? TONE.ok : TONE.alert }}>
                    {r.intact ? 'intact' : 'BROKEN'}
                  </span>
                  {r.brokenAt != null ? (
                    <span className="w-16 shrink-0 text-right font-mono tabular-nums text-ink-muted">@{r.brokenAt}</span>
                  ) : <span className="w-16 shrink-0" />}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-[3px] border border-line bg-surface px-3 py-2">
      <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</div>
      <div className="font-mono text-[15px] tabular-nums" style={{ color: tone ?? 'rgb(var(--c-ink))' }}>{value}</div>
    </div>
  );
}
