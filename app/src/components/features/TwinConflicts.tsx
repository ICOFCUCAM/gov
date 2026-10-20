'use client';

// Sources that disagree (/gov/twin/conflicts; lib/twin/conflicts.ts,
// /api/twin/conflicts): two registered sources giving different values for
// the same place, measure and date. Never settled by which import came
// last: an official who can sign at the statistics authority chooses the
// source that stands, with a reason (named and audited); from then the
// national data takes that source's value for that date.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import type { Conflict } from '@/lib/twin/conflicts';

const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';
const keyOf = (c: Pick<Conflict, 'entityId' | 'metric' | 'validFrom'>) => `${c.entityId}|${c.metric}|${c.validFrom}`;

export function TwinConflicts() {
  const [list, setList] = React.useState<Conflict[] | null>(null);
  const [sources, setSources] = React.useState<Record<string, string>>({});
  const [msg, setMsg] = React.useState<string | null>(null);
  const [show, setShow] = React.useState<'open' | 'all'>('open');
  const [choice, setChoice] = React.useState<Record<string, { source: string; reason: string }>>({});

  const load = React.useCallback(() => {
    fetch('/api/twin/conflicts', { cache: 'no-store' })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'Could not load'); setList(j.conflicts); })
      .catch(e => setMsg(e instanceof Error ? e.message : 'Could not load'));
    fetch('/api/twin/sources', { cache: 'no-store' })
      .then(r => r.json())
      .then((j: { sources?: { id: string; name: string; publisher: string }[] }) => setSources(Object.fromEntries((j.sources ?? []).map(s => [s.id, `${s.name} (${s.publisher})`]))))
      .catch(() => setSources({}));
  }, []);
  React.useEffect(load, [load]);

  const decide = async (c: Conflict) => {
    const ch = choice[keyOf(c)];
    if (!ch?.source) return;
    setMsg(null);
    const r = await fetch('/api/twin/conflicts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ entityId: c.entityId, metric: c.metric, validFrom: c.validFrom, chosenSource: ch.source, reason: ch.reason }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg((j as { error?: string }).error ?? `Request failed (${r.status})`); return; }
    setMsg('Recorded and audited. The national data now takes that source\'s value for that date.');
    load();
  };

  const shown = (list ?? []).filter(c => show === 'all' || !c.resolved);
  const open = (list ?? []).filter(c => !c.resolved).length;

  return (
    <div className="space-y-4 p-4">
      <p className="max-w-3xl text-sm text-ink-muted">
        Two registered sources giving different values for the same place, measure and date. The later import never wins by itself:
        an official who can sign at the statistics authority chooses the source that stands and says why. A correction within one source is not a conflict.
        Sources and their imports are under <a className="text-link underline underline-offset-2" href="/gov/twin">National data</a>.
      </p>
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      {list ? (
        <Section title="Values in conflict" meta={`${open} waiting · ${list.length - open} decided`}>
          <label className="mb-2 block text-sm">Show{' '}
            <select value={show} onChange={e => setShow(e.target.value as 'open' | 'all')} className="rounded border border-line bg-surface px-2 py-1">
              <option value="open">waiting for a decision</option><option value="all">all, with decisions</option>
            </select>
          </label>
          {shown.length ? (
            <ul className="space-y-3">
              {shown.map(c => {
                const k = keyOf(c);
                const ch = choice[k] ?? { source: '', reason: '' };
                return (
                  <li key={k} className="rounded border border-line p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{c.metric}</span>
                      <span className="text-ink-muted">{c.entityId} · true from {c.validFrom}</span>
                      {c.resolved ? <Pill tone="ok">Decided</Pill> : <Pill tone="warn">In conflict</Pill>}
                    </div>
                    <ul className="mt-1">
                      {c.values.map(v => (
                        <li key={v.sourceId}>
                          {sources[v.sourceId] ?? v.sourceId}: <span className="font-mono tabular-nums">{v.value}</span> {v.unit}
                          <span className="text-xs text-ink-muted"> · import {v.runId}</span>
                          {c.resolved?.chosenSource === v.sourceId ? <span className="text-xs"> · stands</span> : null}
                        </li>
                      ))}
                    </ul>
                    {c.resolved ? (
                      <p className="mt-1 text-xs text-ink-muted">Decided by {c.resolved.by} on {c.resolved.at.slice(0, 10)}: {c.resolved.reason}</p>
                    ) : null}
                    <details className="mt-1">
                      <summary className="cursor-pointer text-ink-muted">{c.resolved ? 'Decide again' : 'Choose the source that stands'}</summary>
                      <div className="mt-2 grid gap-2 md:grid-cols-3">
                        <label>Source<select className={field} value={ch.source} onChange={e => setChoice(x => ({ ...x, [k]: { ...ch, source: e.target.value } }))}><option value="">Choose</option>{c.values.map(v => <option key={v.sourceId} value={v.sourceId}>{sources[v.sourceId] ?? v.sourceId}</option>)}</select></label>
                        <label className="md:col-span-2">Why<input className={field} value={ch.reason} onChange={e => setChoice(x => ({ ...x, [k]: { ...ch, reason: e.target.value } }))} /></label>
                      </div>
                      <div className="mt-2"><Button variant="primary" onClick={() => decide(c)} disabled={!ch.source || !ch.reason.trim()}>Record decision</Button></div>
                    </details>
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-ink-muted">{show === 'open' ? 'No values wait for a decision.' : 'No sources disagree.'}</p>}
        </Section>
      ) : <p className="text-sm text-ink-muted">Loading…</p>}
    </div>
  );
}
