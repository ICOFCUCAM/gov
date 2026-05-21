'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import {
  recordDirectiveRow, signDirectiveRow, rescindDirectiveRow,
  listDirectivesRows,
} from '@/lib/db/repos/memory';
import { substrateAvailable } from '@/lib/db/client';
import type { DirectiveRow } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { resolvedActor } from '@/services/actor-resolver';

const statusTone = (s: string) =>
  s === 'effective' ? TONE.ok
  : s === 'signed'    ? TONE.link
  : s === 'rescinded' ? TONE.alert
  : TONE.warn;

const ALL_KINDS = ['executive-order', 'policy', 'budget', 'instruction', 'declaration'];

/**
 * Directive Board — operator surface for the directive lifecycle.
 *
 * Composer issues a new draft via record_directive. The list below
 * reads civicos.directives live (Realtime + RLS scope) and exposes
 * sign / rescind actions on each row. Signed-out viewers see only
 * the directives the substrate's directives_read_public policy makes
 * public (signed / effective / rescinded / published) — drafts stay
 * scoped to their issuer's charter.
 */
export function DirectiveBoard() {
  const { actor, session, ready } = useIdentity();
  const [items, setItems] = React.useState<DirectiveRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [busyRef, setBusyRef] = React.useState<string | null>(null);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    setLoading(true);
    try {
      setItems(await listDirectivesRows({ limit: 50 }));
    } finally {
      setLoading(false);
    }
  }, [available]);

  React.useEffect(() => {
    if (!ready) return;
    void refresh();
  }, [ready, actor?.id, session?.user.id, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'directives' as const }], []),
    refresh,
  );

  if (!available) {
    return (
      <Panel title="Directive Board" meta="not configured" bodyClass="!p-3">
        <p className="text-[10px] text-ink-muted">
          The persistent substrate is not configured. Set
          NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          to surface the directive lifecycle here.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Directive Board</h2>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            durable · realtime
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setComposerOpen(o => !o)}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
          >
            {composerOpen ? 'cancel' : '+ draft directive'}
          </button>
          <button
            type="button"
            onClick={() => { void refresh(); }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
            disabled={loading}
          >
            {loading ? 'refreshing…' : 'refresh'}
          </button>
        </div>
      </div>

      {composerOpen ? (
        <DirectiveComposer
          onDone={() => { setComposerOpen(false); void refresh(); }}
          defaultIssuer={actor?.charterId ?? 'platform'}
        />
      ) : null}

      <Panel title="Directives" meta={`${items.length} visible`} bodyClass="!p-0">
        {items.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            No directives visible at the current scope. Draft one above to
            create the first record — it will appear here live.
          </p>
        ) : (
          <div className="max-h-[480px] overflow-y-auto">
            {items.map(d => (
              <div
                key={d.id}
                className="flex items-center gap-2 border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]"
              >
                <a href={`/gov/directives/${encodeURIComponent(d.ref)}`}
                   className="w-28 shrink-0 truncate font-mono text-ink-soft hover:text-link hover:underline">
                  {d.ref}
                </a>
                <span className="w-28 shrink-0 truncate font-mono text-link no-underline">{d.issued_by_charter_id}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{d.title}</span>
                <span className="w-20 shrink-0 truncate text-right text-ink-soft">{d.kind}</span>
                <span
                  className="w-20 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                  style={{ color: statusTone(d.status) }}
                >
                  {d.status}
                </span>
                <div className="flex w-32 shrink-0 justify-end gap-1">
                  {d.status === 'drafting' ? (
                    <button
                      type="button"
                      className="focus-ring rounded-[3px] border border-line px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
                      disabled={busyRef === d.ref}
                      onClick={async () => {
                        setBusyRef(d.ref);
                        try { await signDirectiveRow(d.ref); }
                        finally { setBusyRef(null); }
                      }}
                    >
                      sign
                    </button>
                  ) : null}
                  {d.status !== 'rescinded' ? (
                    <button
                      type="button"
                      className="focus-ring rounded-[3px] border border-line px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
                      disabled={busyRef === d.ref}
                      onClick={async () => {
                        setBusyRef(d.ref);
                        try { await rescindDirectiveRow(d.ref); }
                        finally { setBusyRef(null); }
                      }}
                    >
                      rescind
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="text-[10px] text-ink-muted">
        Drafts are visible only to officers in the issuing charter (and
        platform-tier roles). Signed, effective, and rescinded directives
        are public per the substrate's directives_read_public policy.
      </p>
    </div>
  );
}

function DirectiveComposer({
  defaultIssuer, onDone,
}: { defaultIssuer: string; onDone: () => void }) {
  const [ref, setRef] = React.useState(() => `DIR-${Date.now()}`);
  const [issuer, setIssuer] = React.useState(defaultIssuer);
  const [title, setTitle] = React.useState('');
  const [kind, setKind] = React.useState('executive-order');
  const [targets, setTargets] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('title required'); return; }
    setBusy(true);
    setError(null);
    try {
      const me = resolvedActor();
      const row = await recordDirectiveRow({
        ref: ref.trim(), kind, issuedByCharterId: issuer.trim(),
        title: title.trim(),
        targets: targets.split(',').map(s => s.trim()).filter(Boolean),
        issuedByName: me?.name ?? null,
      });
      if (!row) { setError('record_directive failed (check console)'); return; }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-2 rounded-[3px] border border-line bg-surface p-3 text-[11px]"
    >
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Ref</span>
          <input
            className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
            value={ref} onChange={e => setRef(e.currentTarget.value)} required
          />
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Issuer charter</span>
          <input
            className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
            value={issuer} onChange={e => setIssuer(e.currentTarget.value)} required
          />
        </label>
      </div>
      <label className="block">
        <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Title</span>
        <input
          className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
          value={title} onChange={e => setTitle(e.currentTarget.value)} required
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Kind</span>
          <select
            className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 text-[11px]"
            value={kind} onChange={e => setKind(e.currentTarget.value)}
          >
            {ALL_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Targets (comma-separated charters)</span>
          <input
            className="mt-1 w-full rounded-[3px] border border-line bg-bg px-2 py-1 font-mono text-[11px]"
            value={targets} onChange={e => setTargets(e.currentTarget.value)}
            placeholder="ministry-health, ministry-finance"
          />
        </label>
      </div>
      {error ? <p className="text-[10px]" style={{ color: TONE.alert }}>{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={busy}
          className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50"
        >
          {busy ? 'recording…' : 'record draft'}
        </button>
      </div>
    </form>
  );
}
