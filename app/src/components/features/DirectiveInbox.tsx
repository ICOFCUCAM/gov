'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { listDirectivesRows } from '@/lib/db/repos/memory';
import { substrateAvailable } from '@/lib/db/client';
import type { DirectiveRow } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';
import { directiveStatusTone } from '@/lib/tone';
import { SurfaceHeading } from '@/components/ui/SurfaceHeading';

/** DirectiveInbox — directives addressed TO the signed-in officer's
 *  charter. Reads all visible directives and filters by
 *  `targets` array including the officer's charter_id. Hidden for
 *  non-officer sessions. */
export function DirectiveInbox() {
  const { actor, session, ready } = useIdentity();
  const [rows, setRows] = React.useState<DirectiveRow[]>([]);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const all = await listDirectivesRows({ limit: 200 });
    setRows(all);
  }, [available]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'directives' as const }], []),
    refresh,
  );

  if (!available) {
    return <SubstrateNotConfigured title="Directive inbox" />;
  }

  if (!session) {
    return (
      <Panel title="Directive inbox" meta="signed out" bodyClass="!p-3 space-y-2">
        <p className="text-[11px] text-ink-muted">Sign in to see directives addressed to your charter.</p>
        <a href="/sign-in?from=/gov/inbox" className="inline-block focus-ring rounded-[3px] border border-line bg-bg px-3 py-1 text-[9px] uppercase tracking-wider text-ink hover:bg-surface-2">Sign in</a>
      </Panel>
    );
  }
  if (!actor || actor.kind !== 'officer') {
    return (
      <Panel title="Directive inbox" meta="officers only" bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">This surface is for officers.</p>
      </Panel>
    );
  }
  const myCharter = actor.charterId;
  const addressed = myCharter
    ? rows.filter(r => Array.isArray(r.targets) && r.targets.includes(myCharter))
    : [];
  const open = addressed.filter(r => r.status !== 'rescinded');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <SurfaceHeading title="Directive inbox" badge="addressed to {myCharter ?? '—'}" />
        <span className="font-mono text-[10px] text-ink-muted">{open.length} open · {addressed.length} total</span>
      </div>

      <Panel title="Addressed to your charter" meta={`${addressed.length}`} bodyClass="!p-0">
        {addressed.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            No directives currently address charter <span className="font-mono">{myCharter ?? '—'}</span>.
          </p>
        ) : (
          <div className="max-h-[560px] overflow-y-auto">
            {addressed.map(d => (
              <Link key={d.id} href={`/gov/directives/${encodeURIComponent(d.ref)}`}
                className="block border-b border-line-soft px-3 py-2 last:border-0 text-[10px] hover:bg-surface-2">
                <div className="flex items-center gap-2">
                  <span className="w-28 shrink-0 truncate font-mono text-ink-soft">{d.ref}</span>
                  <span className="w-28 shrink-0 truncate font-mono text-link">{d.issued_by_charter_id}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{d.title}</span>
                  <span className="w-20 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                    style={{ color: directiveStatusTone(d.status) }}>
                    {d.status}
                  </span>
                </div>
                {d.signed_at ? (
                  <div className="mt-0.5 font-mono text-[9px] text-ink-muted">
                    signed {new Date(d.signed_at).toLocaleString()}
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
