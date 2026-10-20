'use client';

// Events sent out (/gov/exchange/events; lib/events/overview.ts): the
// platform's event outbox as each receiving system sees it: how far it has
// been delivered (its cursor), how many events wait, its recent attempts and
// last result; the restore epoch and the events a data restore voided
// (docs/DISASTER_RECOVERY.md). Read only: the scheduled delivery job sends
// events in order and retries a failed one on its next run; subscriptions
// are paused on Connected systems.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Pill } from '@/components/ui/Pill';
import type { OutboxOverview } from '@/lib/events/overview';

const when = (iso?: string) => (iso ? iso.slice(0, 16).replace('T', ' ') + ' UTC' : '—');
const short = (t: string) => t.replace(/^org\.civicos\./, '');

export function EventOutbox() {
  const [o, setO] = React.useState<(OutboxOverview & { at: string }) | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const load = React.useCallback(() => {
    fetch('/api/events/outbox?limit=50', { cache: 'no-store' })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'Could not load'); setO(j); setErr(null); })
      .catch(e => setErr(e instanceof Error ? e.message : 'Could not load'));
  }, []);
  React.useEffect(load, [load]);

  return (
    <div className="space-y-4 p-4">
      <p className="max-w-3xl text-sm text-ink-muted">
        Every audited change of note becomes an event, written with its audit entry. Receiving systems subscribed on{' '}
        <a className="text-link underline underline-offset-2" href="/integrations">Connected systems</a> get them signed, in order, at least once.
        A failed delivery stops that subscription&apos;s run and is retried on the next run of the scheduled delivery job
        (<a className="text-link underline underline-offset-2" href="/gov/crons">Scheduled tasks</a>); nothing on this page sends or changes anything.
      </p>
      {err ? <p role="alert" className="text-sm text-alert">{err}</p> : null}
      {o ? (
        <>
          <p role="status" className="text-sm">
            {o.events.kept} events kept{o.events.oldestAt ? ` (${when(o.events.oldestAt)} to ${when(o.events.newestAt)})` : ''} · restore epoch {o.epoch}
            {o.events.voided ? ` · ${o.events.voided} voided by a restore` : ''}
            <span className="text-ink-muted"> · as of {when(o.at)}</span>{' '}
            <button type="button" className="rounded border border-line px-2 py-0.5 text-xs" onClick={load}>Refresh</button>
          </p>

          <Section title="Receiving systems" meta={`${o.consumers.length} subscriptions`}>
            {o.consumers.length ? (
              <table className="w-full text-left text-sm">
                <thead><tr><th scope="col">Topic</th><th scope="col">Receiver</th><th scope="col">State</th><th scope="col">Delivered up to</th><th scope="col">Waiting</th><th scope="col">Attempts</th><th scope="col">Last attempt</th></tr></thead>
                <tbody>
                  {o.consumers.map(c => (
                    <tr key={c.id} className="border-t border-line align-top">
                      <td className="font-mono text-xs">{c.topic}</td>
                      <td>{c.host}</td>
                      <td><Pill tone={c.status === 'active' ? (c.failures ? 'warn' : 'ok') : c.status === 'paused' ? 'neutral' : 'alert'}>{c.status}</Pill>{c.failures ? <div className="text-xs text-alert">{c.failures} failed runs in a row</div> : null}</td>
                      <td className="tabular-nums">audit entry {c.cursor}</td>
                      <td className="tabular-nums">{c.pending}{c.oldestPendingAt ? <div className="text-xs text-ink-muted">oldest {when(c.oldestPendingAt)}</div> : null}</td>
                      <td className="tabular-nums">{c.delivered} delivered · {c.failed} failed</td>
                      <td>{c.lastAttempt ? <>{when(c.lastAttempt.at)} · {c.lastAttempt.ok ? 'delivered' : <span className="text-alert">{c.lastAttempt.detail}</span>}</> : 'none yet'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-ink-muted">No subscriptions. Events are kept and wait for a system to subscribe.</p>}
            {o.orphanCursors.length ? <p className="text-xs text-ink-muted">Positions kept for {o.orphanCursors.length} subscriptions no longer registered.</p> : null}
          </Section>

          <Section title="Data restores" meta={`epoch ${o.epoch}`}>
            <p className="text-sm text-ink-muted">
              A data restore keeps the outbox, voids the events written after the restored point (never delivered), moves each subscription back to
              that point and raises the restore epoch, so receivers re-read when they see it grow.
            </p>
            {o.epoch === 0 ? <p className="text-sm">No data restore has been made.</p> : (
              <ul className="text-sm">
                {o.events.byEpoch.map(e => <li key={e.epoch}>Epoch {e.epoch}: {e.count} events kept</li>)}
                {o.voidedBy.map(v => <li key={v.backup}>Voided by the restore from <span className="font-mono text-xs">{v.backup}</span>: {v.count}</li>)}
              </ul>
            )}
          </Section>

          <Section title="Recent delivery attempts" meta="newest first">
            {o.recentDeliveries.length ? (
              <ul className="space-y-0.5 text-sm">
                {o.recentDeliveries.map((d, n) => (
                  <li key={`${d.eventId}-${d.webhookId}-${n}`}>
                    <span className="font-mono text-xs text-ink-muted">{when(d.at)}</span> {short(d.type)} → {o.consumers.find(c => c.id === d.webhookId)?.host ?? d.webhookId} ·{' '}
                    {d.ok ? 'delivered' : <span className="text-alert">failed: {d.detail}</span>}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-muted">No delivery attempted yet.</p>}
          </Section>

          <Section title="Recent events" meta="type, time and audit entry only">
            {o.recentEvents.length ? (
              <ul className="space-y-0.5 text-sm">
                {o.recentEvents.map(e => (
                  <li key={e.id}>
                    <span className="font-mono text-xs text-ink-muted">{when(e.time)}</span> {short(e.type)} · audit entry {e.auditseq}{e.restoreepoch ? ` · epoch ${e.restoreepoch}` : ''}
                    {e.voided ? <> <Pill tone="neutral">voided by a restore</Pill></> : null}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-muted">No events yet.</p>}
          </Section>
        </>
      ) : !err ? <p className="text-sm text-ink-muted">Loading…</p> : null}
    </div>
  );
}
