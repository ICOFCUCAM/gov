'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import {
  directiveByRef, signDirectiveRow, rescindDirectiveRow,
} from '@/lib/db/repos/memory';
import { substrateAvailable } from '@/lib/db/client';
import type { DirectiveRow } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { WatchStar } from '@/components/identity/WatchStar';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';

const statusTone = (s: string) =>
  s === 'effective' ? TONE.ok
  : s === 'signed'    ? TONE.link
  : s === 'rescinded' ? TONE.alert
  : TONE.warn;

/**
 * DirectiveDetail — single-record drill-in for /gov/directives/[ref].
 * Shows the full directive metadata + payload; inline sign / rescind
 * affordances appear for callers whose substrate identity is allowed
 * to mutate (strict-identity override gates this server-side anyway).
 */
export function DirectiveDetail({ ref: directiveRef }: { ref: string }) {
  const { actor, ready } = useIdentity();
  const [row, setRow] = React.useState<DirectiveRow | null>(null);
  const [busy, setBusy] = React.useState(false);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    setRow(await directiveByRef(directiveRef));
  }, [available, directiveRef]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [
      { table: 'directives' as const, filter: `ref=eq.${directiveRef}` },
    ], [directiveRef]),
    refresh,
  );

  if (!available) {
    return <SubstrateNotConfigured title="Directive" />;
  }
  if (!row) {
    return (
      <Panel title="Directive" meta={directiveRef} bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          No directive with ref <span className="font-mono">{directiveRef}</span> is
          visible at the current scope. Drafts are restricted to the issuing
          charter; signed/effective/rescinded are public.{' '}
          <Link href="/gov/directives" className="text-link underline">Back to board</Link>
        </p>
      </Panel>
    );
  }

  const canMutate = actor?.kind === 'officer';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">{row.title}</h2>
          <WatchStar kind="directive" ref={row.ref} label={row.title} />
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: statusTone(row.status), color: statusTone(row.status) }}
          >
            {row.status}
          </span>
        </div>
        <Link href="/gov/directives" className="font-mono text-[10px] text-link underline">← board</Link>
      </div>

      <Panel title="Metadata" meta={row.ref} bodyClass="!p-3 text-[11px] space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Field label="Ref" value={row.ref} mono />
          <Field label="Kind" value={row.kind} />
          <Field label="Issuer" value={row.issued_by_charter_id} mono />
          <Field label="Issued by" value={row.issued_by_name ?? '—'} />
          <Field label="Status" value={row.status} />
          <Field label="Updated" value={new Date(row.updated_at).toLocaleString()} />
          {row.signed_at ? <Field label="Signed at" value={new Date(row.signed_at).toLocaleString()} /> : null}
          {row.effective_at ? <Field label="Effective" value={new Date(row.effective_at).toLocaleString()} /> : null}
          {row.rescinded_at ? <Field label="Rescinded" value={new Date(row.rescinded_at).toLocaleString()} /> : null}
        </div>
        {row.citation ? (
          <div>
            <div className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Citation</div>
            <p className="mt-1 text-[11px] text-ink">{row.citation}</p>
          </div>
        ) : null}
        {row.targets && row.targets.length > 0 ? (
          <div>
            <div className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Targets</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {row.targets.map(t => (
                <span key={t} className="rounded-[3px] border border-line px-1.5 py-0.5 font-mono text-[10px] text-link">{t}</span>
              ))}
            </div>
          </div>
        ) : null}

        {canMutate ? (
          <div className="flex flex-wrap gap-1">
            {row.status === 'drafting' ? (
              <button type="button" disabled={busy}
                onClick={async () => { setBusy(true); try { await signDirectiveRow(row.ref); } finally { setBusy(false); } }}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
                sign
              </button>
            ) : null}
            {row.status !== 'rescinded' ? (
              <button type="button" disabled={busy}
                onClick={async () => { setBusy(true); try { await rescindDirectiveRow(row.ref); } finally { setBusy(false); } }}
                className="focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2 disabled:opacity-50">
                rescind
              </button>
            ) : null}
          </div>
        ) : null}
      </Panel>

      {row.payload && Object.keys(row.payload).length > 0 ? (
        <Panel title="Payload" meta="jsonb" bodyClass="!p-3 text-[10px]">
          <pre className="overflow-x-auto rounded-[3px] bg-bg px-2 py-1 font-mono">{JSON.stringify(row.payload, null, 2)}</pre>
        </Panel>
      ) : null}
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</div>
      <div className={`mt-0.5 truncate text-[11px] text-ink ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
