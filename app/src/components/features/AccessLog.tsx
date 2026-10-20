'use client';

// Who read what (lib/records/access-log.ts): reads of restricted and secret
// records, searches, exports and refusals, newest first, with the chain's
// check and the patterns the data-protection authority looks at. Read only.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';

interface Entry { id: string; seq: number; at: string; by: { id?: string; name: string; institution?: string }; record: { register: string; id?: string; query?: string }; action: string; purpose?: string; result: string; rule?: string }
interface Answer { entries: Entry[]; chain: { ok: boolean; entries: number; brokenAt?: number }; unusual: { official: string; name: string; reason: string; count: number }[]; raised?: { seq: number; at: string; watch: string; kind: string; subject: string; detail: string }[]; awaiting?: { id: string; rule: { days?: number; basis?: string }; reason: string; proposedBy: string; confirmedBy?: string }[] }

export function AccessLog() {
  const [a, setA] = React.useState<Answer | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [action, setAction] = React.useState('');
  React.useEffect(() => {
    fetch(`/api/access-log${action ? `?action=${action}` : ''}`, { cache: 'no-store' })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'Could not load'); setA(j as Answer); setErr(null); })
      .catch(e => setErr(e instanceof Error ? e.message : 'Could not load'));
  }, [action]);
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Who read what</h1>
      <p className="max-w-3xl text-sm text-ink-muted">
        Every read of a restricted or secret record, every search over them, every export and every refusal, with the reason given.
        No record content is kept here. Nobody can change this log; only the nation&apos;s retention rule shortens it.
      </p>
      {err ? <p role="alert" className="text-sm text-alert">{err}</p> : null}
      {a ? (
        <>
          <p role="status" className="text-sm">{a.chain.ok ? `Intact: ${a.chain.entries} entries checked.` : `Broken at entry ${a.chain.brokenAt}: report this to the data-protection authority.`}</p>
          {a.unusual.length ? (
            <Section title="Worth a look" meta="last 24 hours">
              <ul className="text-sm">{a.unusual.map(u => <li key={`${u.official}-${u.reason}`}>{u.name}: {u.reason} ({u.count})</li>)}</ul>
            </Section>
          ) : null}
          <Section title="Findings raised" meta="last 30 days · from the audit record">
            <p className="mb-2 text-xs text-ink-muted">
              What the watches raised: unusual access to records (checked by the daily scheduled job) and possible harvesting of the public professional check.
              A finding is a prompt to look, never a conclusion about anyone.
            </p>
            {a.raised?.length ? (
              <table className="w-full text-left text-sm" data-testid="raised-findings">
                <thead><tr><th scope="col">When</th><th scope="col">Watch</th><th scope="col">About</th><th scope="col">Finding</th><th scope="col">Audit entry</th></tr></thead>
                <tbody>
                  {a.raised.map(f => (
                    <tr key={f.seq} className="border-t border-line">
                      <td>{new Date(f.at).toLocaleString()}</td>
                      <td>{f.kind}</td>
                      <td className="font-mono text-xs">{f.subject}</td>
                      <td>{f.detail}</td>
                      <td className="font-mono text-xs">#{f.seq}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-ink-muted">No findings raised in the last 30 days. Unusual access is checked only when the scheduled job runs (Platform health → Scheduled tasks).</p>}
          </Section>
          {a.awaiting?.length ? (
            <Section title="Shortening this log" meta="waiting for the data-protection authority">
              <ul className="space-y-2 text-sm">{a.awaiting.map(w => (
                <li key={w.id}>Delete entries older than {w.rule.days} days ({w.rule.basis}): {w.reason}. Proposed by {w.proposedBy}, confirmed by {w.confirmedBy}.{' '}
                  <button type="button" className="rounded border border-line px-2 py-0.5" onClick={async () => {
                    const r = await fetch('/api/access-log/retention', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: w.id }) });
                    const j = await r.json();
                    setErr(r.ok ? null : j.error);
                    if (r.ok) setA(x => (x ? { ...x, awaiting: x.awaiting?.filter(y => y.id !== w.id) } : x));
                  }}>Confirm for the oversight side</button>
                </li>
              ))}</ul>
            </Section>
          ) : null}
          <Section title="Entries" meta="newest first">
            <label className="mb-2 block text-sm">Show{' '}
              <select value={action} onChange={e => setAction(e.target.value)} className="rounded border border-line bg-surface px-2 py-1">
                <option value="">everything</option><option value="view">reads</option><option value="search">searches</option><option value="export">exports</option><option value="refused">refusals</option><option value="permission">permission changes</option>
              </select>
            </label>
            {a.entries.length ? (
              <table className="w-full text-left text-sm">
                <thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">Record</th><th scope="col">What</th><th scope="col">Why</th><th scope="col">Result</th></tr></thead>
                <tbody>
                  {a.entries.map(e => (
                    <tr key={e.id} className="border-t border-line">
                      <td>{new Date(e.at).toLocaleString()}</td>
                      <td>{e.by.name}{e.by.institution ? ` (${e.by.institution})` : ''}</td>
                      <td>{e.record.register}{e.record.id ? ` ${e.record.id}` : ''}{e.record.query ? ` · search: ${e.record.query}` : ''}</td>
                      <td>{e.action}</td>
                      <td>{e.purpose ?? '—'}</td>
                      <td>{e.result}{e.rule ? `: ${e.rule}` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-ink-muted">Nothing recorded yet.</p>}
          </Section>
        </>
      ) : null}
    </div>
  );
}
