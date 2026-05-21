'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { eventById, recentEventsRows, type PersistedEvent } from '@/lib/db/repos/events';
import { substrateAvailable } from '@/lib/db/client';
import { useIdentity } from '@/components/identity/useIdentity';

export function EventDetail({ id }: { id: string }) {
  const { ready } = useIdentity();
  const [row, setRow] = React.useState<PersistedEvent | null>(null);
  const [siblings, setSiblings] = React.useState<PersistedEvent[]>([]);
  const available = substrateAvailable();

  React.useEffect(() => {
    if (!available || !ready) return;
    void eventById(id).then(async r => {
      setRow(r);
      if (r) setSiblings((await recentEventsRows({ channel: r.channel, limit: 12 })).filter(x => x.id !== r.id));
    });
  }, [available, ready, id]);

  if (!available) {
    return <Panel title="Federation event" meta="not configured" bodyClass="!p-3"><p className="text-[10px] text-ink-muted">Substrate not configured.</p></Panel>;
  }
  if (!row) {
    return (
      <Panel title="Federation event" meta={id} bodyClass="!p-3">
        <p className="text-[11px] text-ink-muted">
          No event with id <span className="font-mono">{id}</span>.{' '}
          <Link href="/gov/federation" className="text-link underline">Back to stream</Link>
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">{row.type}</h2>
          <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{
              borderColor: row.channel === 'constitutional' ? TONE.warn : TONE.link,
              color: row.channel === 'constitutional' ? TONE.warn : TONE.link,
            }}>
            {row.channel}
          </span>
        </div>
        <Link href="/gov/federation" className="font-mono text-[10px] text-link underline">← stream</Link>
      </div>

      <Panel title="Event" meta={row.id.slice(0, 8)} bodyClass="!p-3 text-[11px] space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Field label="Type" value={row.type} mono />
          <Field label="Channel" value={row.channel} />
          <Field label="At" value={new Date(row.at).toLocaleString()} />
          <Field label="Source" value={row.source} mono />
          <Field label="Target" value={row.target ?? '—'} mono />
        </div>
        {row.payload && Object.keys(row.payload).length > 0 ? (
          <pre className="overflow-x-auto rounded-[3px] bg-bg px-2 py-1 font-mono text-[10px] text-ink-muted">
            {JSON.stringify(row.payload, null, 2)}
          </pre>
        ) : (
          <p className="text-[10px] text-ink-muted">No payload.</p>
        )}
      </Panel>

      <Panel title="Recent on this channel" meta={`${siblings.length}`} bodyClass="!p-0">
        {siblings.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">No siblings.</p>
        ) : (
          <div className="max-h-[320px] overflow-y-auto">
            {siblings.map(s => (
              <Link key={s.id} href={`/gov/federation/${s.id}`}
                className="block border-b border-line-soft px-3 py-1 last:border-0 text-[10px] hover:bg-surface-2">
                <div className="flex items-center gap-2">
                  <span className="w-16 shrink-0 font-mono tabular-nums text-ink-muted">
                    {new Date(s.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="w-44 shrink-0 truncate font-mono text-link">{s.type}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-ink-soft">{s.source}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
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
