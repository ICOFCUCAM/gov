'use client';

// Data-sharing services (/gov/exchange; lib/exchange/overview.ts): every
// service one institution answers for others (immigration.status,
// taxpayer.status, qualification.verify…), what it answers and never
// answers, the authority responsible for it as the nation named it in
// setup, the register it reads, the connected systems approved for it with
// their purposes, and how often it was called and refused (counts from the
// exchange log, never what was asked or answered). Read only: approving a
// system or changing its purposes is done on Connected systems by two
// officials.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Pill } from '@/components/ui/Pill';
import type { ServiceOverview } from '@/lib/exchange/overview';

const when = (iso?: string) => (iso ? iso.slice(0, 16).replace('T', ' ') + ' UTC' : '—');
const CLASS: Record<ServiceOverview['dataClass'], string> = { public: 'Public', personal: 'Personal data', restricted: 'Restricted' };

export function DataSharingServices() {
  const [list, setList] = React.useState<ServiceOverview[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [at, setAt] = React.useState<string | null>(null);
  const load = React.useCallback(() => {
    fetch('/api/exchange/overview', { cache: 'no-store' })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'Could not load'); setList(j.services); setAt(j.at); setErr(null); })
      .catch(e => setErr(e instanceof Error ? e.message : 'Could not load'));
  }, []);
  React.useEffect(load, [load]);

  const totals = (list ?? []).reduce((t, s) => ({ calls: t.calls + s.calls.total, refused: t.refused + s.calls.refused, unnamed: t.unnamed + (s.owner.named ? 0 : 1) }), { calls: 0, refused: 0, unnamed: 0 });

  return (
    <div className="space-y-4 p-4">
      <p className="max-w-3xl text-sm text-ink-muted">
        The questions one institution answers for others, and only those: each answer carries the fields listed here and nothing else, every call
        gets a signed receipt, and an outside system may state only a purpose two officials approved for it and that service.
        Approving a system or changing its purposes is done on <a className="text-link underline underline-offset-2" href="/integrations">Connected systems</a>.
        Calls are counted from the exchange log; what was asked and answered is never shown here.
      </p>
      {err ? <p role="alert" className="text-sm text-alert">{err}</p> : null}
      {list ? (
        <>
          <p role="status" className="text-sm">
            {list.length} services · {totals.calls} calls recorded, {totals.refused} refused
            {totals.unnamed ? ` · ${totals.unnamed} without a responsible authority named yet (National settings, Who is responsible)` : ''}
            {at ? <span className="text-ink-muted"> · as of {when(at)}</span> : null}{' '}
            <button type="button" className="rounded border border-line px-2 py-0.5 text-xs" onClick={load}>Refresh</button>
          </p>
          {list.map(s => (
            <Section key={s.id} title={s.title} meta={<span className="font-mono">{s.id} · v{s.version} · {s.kind === 'event' ? 'event' : 'question'}</span>}>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div className="space-y-1">
                  <div>
                    <span className="text-ink-muted">Responsible: </span>
                    {s.owner.institution ? <>{s.owner.institution.name} <span className="text-ink-muted">({s.owner.label})</span></> : <Pill tone="warn">{s.owner.label}: not named yet</Pill>}
                  </div>
                  {s.register ? <div><span className="text-ink-muted">Answers from: </span>{s.register.name.split(':')[0]}</div> : null}
                  <div><span className="text-ink-muted">Data: </span>{CLASS[s.dataClass]} · scope <code className="font-mono text-xs">{s.scope}</code>{s.eventType ? <> · event <code className="font-mono text-xs">{s.eventType}</code></> : null}</div>
                  {s.legalBasis ? <div className="text-xs text-ink-muted">Legal basis: {s.legalBasis}</div> : null}
                  <details>
                    <summary className="cursor-pointer text-ink-muted">What it answers ({Object.keys(s.returns).length} fields)</summary>
                    <ul className="mt-1 space-y-0.5 text-xs">
                      {Object.entries(s.returns).map(([k, v]) => <li key={k}><code className="font-mono">{k}</code>: {v}</li>)}
                    </ul>
                  </details>
                </div>
                <div className="space-y-1">
                  {s.kind === 'query' ? (
                    <>
                      <div>
                        <span className="text-ink-muted">Calls: </span>{s.calls.total} · answered {s.calls.answered} · refused {s.calls.refused}{s.calls.failed ? ` · not answered ${s.calls.failed}` : ''}
                        {s.calls.unauthenticated ? ` · ${s.calls.unauthenticated} without a recognised key` : ''}
                      </div>
                      {s.calls.total ? <div className="text-xs text-ink-muted">From {when(s.calls.firstAt)} to {when(s.calls.lastAt)} (the log keeps the most recent calls)</div> : null}
                      {s.calls.reasons.length ? (
                        <ul className="text-xs">{s.calls.reasons.slice(0, 5).map(r => <li key={r.reason}>{r.reason}: {r.count}</li>)}</ul>
                      ) : null}
                      {s.calls.byCaller.length ? (
                        <details>
                          <summary className="cursor-pointer text-ink-muted">By caller ({s.calls.byCaller.length})</summary>
                          <ul className="mt-1 text-xs">{s.calls.byCaller.map(c => <li key={c.caller}>{c.name}: {c.total}{c.refused ? `, ${c.refused} not answered` : ''}</li>)}</ul>
                        </details>
                      ) : null}
                    </>
                  ) : (
                    <div>
                      <span className="text-ink-muted">Sent through automatic notifications: </span>
                      {s.webhooks?.length ? s.webhooks.map(w => `${w.topic} (${w.status})`).join(', ') : 'no subscription receives it'}{' '}
                      · <a className="text-link underline underline-offset-2" href="/gov/exchange/events">deliveries</a>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-sm">
                <div className="text-ink-muted">Systems approved for it</div>
                {s.integrations.length ? (
                  <ul className="mt-1 space-y-1">
                    {s.integrations.map(i => (
                      <li key={i.id} className="flex flex-wrap items-center gap-2">
                        <a className="text-link underline underline-offset-2" href={`/integrations#integration-${i.id}`}>{i.name}</a>
                        <span className="text-xs text-ink-muted">{i.ownerOrg}</span>
                        <Pill tone={i.status === 'approved' ? 'ok' : i.status === 'pending' ? 'warn' : 'alert'}>{i.status}</Pill>
                        {i.legacy ? <Pill tone="warn">purposes not approved yet</Pill> : i.status === 'approved' ? <span className="text-xs">purposes: {i.purposes.length ? i.purposes.join(', ') : 'none'}</span> : null}
                        {i.waiting ? <span className="text-xs text-ink-muted">change proposed by {i.waiting.by} ({i.waiting.purposes.join(', ') || 'no purposes'}), waiting for a second official</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-ink-muted">None. A system is approved with the scope <code className="font-mono">{s.scope}</code> and its purposes on <a className="text-link underline underline-offset-2" href="/integrations">Connected systems</a>.</p>}
              </div>
            </Section>
          ))}
        </>
      ) : !err ? <p className="text-sm text-ink-muted">Loading…</p> : null}
    </div>
  );
}
