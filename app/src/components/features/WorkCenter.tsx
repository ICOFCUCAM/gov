'use client';

// My work (/gov/work): everything waiting on officials, across institutions,
// from the records that hold it (/api/work). Past-SLA items first, then
// escalated, then oldest. Each row carries the actions that exist for it
// today, sent under the named official and written to the audit chain.

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import type { WorkOverview, WorkQueueItem } from '@/lib/api/types';
import { useOfficial } from '@/lib/official';
import { ActingOfficial } from '@/components/ui/ActingOfficial';
import { SeverityBadge } from '@/components/ui/Ops';
import { TONE_SHAPE } from '@/lib/tone-palette';

type View = 'all' | 'decisions' | 'incidents' | 'overdue';
/** Waiting time in words: hours under two days, then days. */
const age = (h: number) => (h < 48 ? `${h} hour${h === 1 ? '' : 's'}` : `${Math.round(h / 24)} days`);
const btn = 'focus-ring rounded-[3px] border border-line px-2.5 py-1 text-[13px] text-ink hover:bg-surface-2 disabled:opacity-50';

export function WorkCenter() {
  const [data, setData] = React.useState<WorkOverview | null>(null);
  const [view, setView] = React.useState<View>('all');
  const [inst, setInst] = React.useState('');
  const [official, setOfficial] = useOfficial();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  const load = React.useCallback(() => api.work().then(setData).catch(e => setMsg({ ok: false, text: (e as Error).message })), []);
  React.useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  async function act(key: string, done: string, fn: () => Promise<unknown>) {
    if (!official) { setMsg({ ok: false, text: 'Name the acting official first: every action is recorded under a person.' }); return; }
    setBusy(key); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: done }); await load(); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(null); }
  }

  const institutions = [...new Set([...(data?.queue ?? []).map(q => q.ministry), ...(data?.ministryIncidents ?? []).map(i => i.ministry)])].sort();
  const keep = (m: string) => !inst || m === inst;
  const queue = (data?.queue ?? []).filter(q => keep(q.ministry) && (view !== 'overdue' || q.overdue))
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || Number(b.state === 'escalated') - Number(a.state === 'escalated') || b.ageHours - a.ageHours);
  const mInc = (data?.ministryIncidents ?? []).filter(i => keep(i.ministry));
  const opsInc = inst ? [] : data?.incidents ?? [];
  const permits = inst ? [] : data?.permits ?? [];
  const showDecisions = view === 'all' || view === 'decisions' || view === 'overdue';
  const showIncidents = view === 'all' || view === 'incidents';

  const counter = (v: View, label: string, n: number | undefined, tone: string) => (
    <button type="button" onClick={() => setView(view === v ? 'all' : v)} aria-pressed={view === v}
      className={`focus-ring flex min-w-[10rem] flex-1 items-baseline justify-between gap-3 rounded-[3px] border px-3 py-2 text-start ${view === v ? 'border-ink bg-surface-2' : 'border-line bg-surface hover:bg-surface-2'}`}>
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="font-mono text-2xl font-semibold tabular-nums" style={{ color: n ? tone : 'rgb(var(--c-ok))' }}>{n ?? '—'}</span>
    </button>
  );

  return (
    <div className="mx-auto max-w-[1280px] space-y-4 text-[14px] text-ink">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">My work</h2>
          <p className="mt-1 max-w-3xl text-ink-soft">Everything waiting on an official, across every active institution, from the records that hold it. Late items come first.</p>
        </div>
        <ActingOfficial name={official} onChange={setOfficial} />
      </header>

      <div className="flex flex-wrap gap-2">
        {counter('decisions', 'Decisions waiting', data?.counts.decisions, 'rgb(var(--c-warn))')}
        {counter('overdue', 'Late', data?.counts.overdue, 'rgb(var(--c-alert))')}
        {counter('incidents', 'Incidents open', data?.counts.incidents, 'rgb(var(--c-alert))')}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        <label className="flex items-center gap-2 text-ink-soft">Institution
          <select value={inst} onChange={e => setInst(e.currentTarget.value)} className="focus-ring h-8 rounded-[3px] border border-line bg-surface px-2 text-ink">
            <option value="">All institutions</option>
            {institutions.map(i => <option key={i}>{i}</option>)}
          </select>
        </label>
        {view !== 'all' ? <button type="button" className={btn} onClick={() => setView('all')}>Show everything</button> : null}
        {msg ? <p role="status" className={msg.ok ? 'text-ok' : 'text-alert'}>{msg.text}</p> : null}
      </div>

      {showIncidents ? (
        <section aria-labelledby="w-inc" className="space-y-2">
          <h2 id="w-inc" className="text-[15px] font-semibold">Incidents <span className="font-normal text-ink-muted">({mInc.length + opsInc.length})</span></h2>
          <ul className="divide-y divide-line-soft rounded-[3px] border border-line bg-surface">
            {mInc.map(i => (
              <li key={`${i.ministryId}:${i.key}`} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <SeverityBadge severity={i.severity} />
                <span className="min-w-0 flex-1"><strong>{i.label}</strong> <span className="text-ink-muted">· <Link href={`/gov/ministry/${i.ministryId}`} className="text-link underline underline-offset-2">{i.ministry}</Link>{i.authority ? ` · with ${i.authority}` : ''}</span></span>
                <button className={btn} disabled={busy !== null || !i.canEscalate} onClick={() => act(`mi:${i.key}`, `Escalated: ${i.label}`, () => api.org.escalateIncident(i.ministryId, i.key, official))}>Escalate</button>
                <button className={btn} disabled={busy !== null} onClick={() => act(`mi:${i.key}`, `Resolved: ${i.label}`, () => api.org.resolveIncident(i.ministryId, i.key, official))}>Resolve</button>
              </li>
            ))}
            {opsInc.map(i => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <SeverityBadge severity={i.severity} />
                <span className="min-w-0 flex-1"><strong>{i.title}</strong> <span className="text-ink-muted">· Operations · {i.scope} · {i.status}</span></span>
                {i.status === 'open' ? <button className={btn} disabled={busy !== null} onClick={() => act(`oi:${i.id}`, `Acknowledged: ${i.title}`, () => api.ops.incidents.ack(i.id, official))}>Acknowledge</button> : null}
                <button className={btn} disabled={busy !== null} onClick={() => act(`oi:${i.id}`, `Resolved: ${i.title}`, () => api.ops.incidents.resolve(i.id, official))}>Resolve</button>
              </li>
            ))}
            {!mInc.length && !opsInc.length ? <li className="px-3 py-2 text-ink-muted">No open incidents.</li> : null}
          </ul>
        </section>
      ) : null}

      {showDecisions ? (
        <section aria-labelledby="w-dec" className="space-y-2">
          <h2 id="w-dec" className="text-[15px] font-semibold">Decisions <span className="font-normal text-ink-muted">({queue.length + (view === 'overdue' ? 0 : permits.length)})</span></h2>
          {permits.length && view !== 'overdue' ? (
            <div className="rounded-[3px] border border-line bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-3 py-2">
                <span><strong>{permits.length}</strong> permit application{permits.length === 1 ? '' : 's'} awaiting a decision</span>
                <Link href="/console" className={`${btn} no-underline`}>Decide in the Officer Console →</Link>
              </div>
              <ul className="divide-y divide-line-soft">
                {permits.slice(0, 5).map(p => (
                  <li key={p.id} className="flex flex-wrap gap-2 px-3 py-1.5 text-[13px]"><span className="font-mono text-ink-muted">{p.id}</span><span className="flex-1">{p.title}</span><span className="text-ink-muted">{p.municipality} · {p.status}</span></li>
                ))}
              </ul>
            </div>
          ) : null}
          <ul className="divide-y divide-line-soft rounded-[3px] border border-line bg-surface">
            {queue.slice(0, 200).map((q: WorkQueueItem) => (
              <li key={`${q.ministryId}:${q.id}`} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span aria-hidden className="text-[11px]" style={{ color: q.overdue ? 'rgb(var(--c-alert))' : q.state === 'escalated' ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ink-muted))' }}>{q.overdue ? TONE_SHAPE.alert : q.state === 'escalated' ? TONE_SHAPE.warn : TONE_SHAPE.neutral}</span>
                <span className="font-mono text-[12px] text-ink-muted">{q.ref}</span>
                <span className="min-w-0 flex-1">{q.subject} <span className="text-ink-muted">· <Link href={`/gov/ministry/${q.ministryId}`} className="text-link underline underline-offset-2">{q.ministry}</Link> · {q.region}</span></span>
                <span className="text-[12px] tabular-nums" style={{ color: q.overdue ? 'rgb(var(--c-alert))' : undefined }}>{age(q.ageHours)}{q.overdue ? `, ${age(q.ageHours - q.slaHours)} late (target ${age(q.slaHours)})` : ''}</span>
                <span className="text-[12px] capitalize text-ink-muted">{q.state}{q.assignee ? ` · ${q.assignee}` : ''}</span>
                {q.state === 'open' ? <button className={btn} disabled={busy !== null} onClick={() => act(`q:${q.id}`, `Assigned: ${q.ref}`, () => api.org.actOnQueueItem(q.ministryId, q.id, 'assign', undefined, official))}>Assign to me</button> : null}
                <button className={btn} disabled={busy !== null} onClick={() => act(`q:${q.id}`, `Escalated: ${q.ref}`, () => api.org.actOnQueueItem(q.ministryId, q.id, 'escalate', undefined, official))}>Escalate</button>
                <button className={btn} disabled={busy !== null} onClick={() => act(`q:${q.id}`, `Closed: ${q.ref}`, () => api.org.actOnQueueItem(q.ministryId, q.id, 'clear', undefined, official))}>Close</button>
              </li>
            ))}
            {!queue.length ? <li className="px-3 py-2 text-ink-muted">{view === 'overdue' ? 'Nothing is late.' : 'No decisions waiting.'}</li> : null}
          </ul>
        </section>
      ) : null}
      <p className="text-[12px] text-ink-muted">These cases and incidents are examples until your ministries connect their case systems. Directives awaiting signature are on the <Link href="/gov/directives" className="text-link underline">Directive Board</Link>.</p>
    </div>
  );
}
