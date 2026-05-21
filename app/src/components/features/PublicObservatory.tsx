'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { substrateAvailable, publicClient } from '@/lib/db/client';
import { listDirectivesRows } from '@/lib/db/repos/memory';
import { listInstitutionsRows } from '@/lib/db/repos/institutions';
import { listTelemetryStreamsRows } from '@/lib/db/repos/telemetry';
import type { DirectiveRow, InstitutionRow, TelemetryStreamRow } from '@/lib/db/types';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';

/**
 * PublicObservatory — what an anonymous visitor can see of the
 * sovereign substrate. Reads only the tables whose RLS includes
 * an anon read policy: institutions, facilities, workflow definitions,
 * telemetry stream catalogue, and public directives
 * (signed / effective / rescinded / published).
 *
 * The page is designed to demonstrate the RLS contract honestly:
 * draft directives, dispatches, escalations, audit entries, citizen
 * records, and work items are intentionally absent — those require
 * an authenticated session.
 */
export function PublicObservatory() {
  const [directives, setDirectives] = React.useState<DirectiveRow[]>([]);
  const [institutions, setInstitutions] = React.useState<InstitutionRow[]>([]);
  const [streams, setStreams] = React.useState<TelemetryStreamRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const available = substrateAvailable();

  React.useEffect(() => {
    if (!available) return;
    setLoading(true);
    void (async () => {
      try {
        // Filter directives client-side to the publicly visible statuses;
        // the policy already does this server-side but a defensive filter
        // keeps the page honest about what it's showing.
        const ds = await listDirectivesRows({ limit: 30 });
        setDirectives(ds.filter(d => ['signed','effective','rescinded','published'].includes(d.status)));
        setInstitutions(await listInstitutionsRows({ activated: true }));
        setStreams(await listTelemetryStreamsRows({ activeOnly: true, limit: 30 }));
      } finally {
        setLoading(false);
      }
    })();
  }, [available]);

  if (!available) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <SubstrateNotConfigured title="Public Observatory" />
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-ink">Public Observatory</h1>
        <p className="text-sm text-ink-muted">
          What anyone can see of the sovereign substrate without signing in.
          Restricted material (audit chains, operator dispatches, citizen
          records, work items in flight) requires authentication — it does
          not appear here.
        </p>
        <p className="font-mono text-[10px] text-ink-muted">
          loaded {institutions.length} institutions · {directives.length} public directives · {streams.length} active telemetry streams
        </p>
      </div>

      <Panel title="Signed directives" meta={`${directives.length}`} bodyClass="!p-0">
        {directives.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            {loading ? 'Loading…' : 'No public directives on record.'}
          </p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            {directives.map(d => (
              <div key={d.id} className="border-b border-line-soft px-3 py-2 last:border-0 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-32 shrink-0 truncate font-mono text-link">{d.ref}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{d.title}</span>
                  <span
                    className="w-20 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                    style={{
                      color: d.status === 'effective' ? TONE.ok
                           : d.status === 'rescinded' ? TONE.alert
                           : TONE.link
                    }}
                  >
                    {d.status}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[9.5px] text-ink-muted">
                  {d.kind} · {d.issued_by_charter_id}
                  {d.signed_at ? ` · signed ${new Date(d.signed_at).toLocaleDateString()}` : ''}
                  {d.targets && d.targets.length > 0 ? ` · targets: ${d.targets.join(', ')}` : ''}
                </div>
                {d.citation ? (
                  <p className="mt-1 text-[10px] text-ink-soft">{d.citation}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Active institutions" meta={`${institutions.length}`} bodyClass="!p-0">
          {institutions.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">No activated institutions.</p>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              {institutions.map(i => (
                <div key={i.id} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-[8.5px] font-bold uppercase tracking-wider text-ink-muted">{i.kind}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{i.label}</span>
                    <span className="w-20 shrink-0 truncate text-right font-mono text-link">{i.charter_id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Telemetry streams" meta={`${streams.length}`} bodyClass="!p-0">
          {streams.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-ink-muted">No active telemetry streams.</p>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              {streams.map(s => (
                <div key={s.id} className="border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="w-32 shrink-0 truncate font-mono text-ink-soft">{s.stream_id}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{s.label}</span>
                    <span className="w-12 shrink-0 truncate text-right font-mono text-ink-muted">{s.unit ?? ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <p className="text-[10px] text-ink-muted">
        The substrate enforces visibility at the database. This page reads
        the same views every authenticated surface uses, but the RLS
        policies clip rows to what an anonymous session is entitled to see.
        To see your own records, <Link href="/sign-in?from=/public" className="text-link underline">sign in</Link>.
      </p>
    </main>
  );
}
