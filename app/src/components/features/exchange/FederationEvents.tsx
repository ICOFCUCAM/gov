'use client';

// Federation (/gov/exchange/federation; plan I9, lib/federation/events.ts):
// the envelopes this installation's institutions published for others and
// the envelopes they received (accepted, rejected or pending, never applied to
// a register), the keys trusted for other installations' institutions (one
// administrator proposes, a different official confirms, one official revokes
// at once), and the event catalogue. Envelopes carry references only.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Pill, type PillTone } from '@/components/ui/Pill';

type Peer = { id: string; institution: string; keyId: string; endpoint?: string; state: string; proposed: { by: string; at: string }; confirmed?: { by: string; at: string; independence: string }; revoked?: { by: string; at: string; reason: string } };
type Published = { envelope: { event_id: string; event_type: string; schema_version: string; source_institution_id: string; aggregate_reference: string; published_at: string; legal_context: { instrument_reference: string; version_reference: string }; integrity: { key_id: string } }; at: string; keySource: string; production: boolean };
type Inbound = { id: string; eventId: string; type: string; source: string; recipient: string; aggregate: string; receivedAt: string; state: 'accepted' | 'rejected' | 'pending'; reasons: string[]; relationship?: string; duplicates: number; decided?: { outcome: string; by: string; at: string; reason: string } };
type Data = { scope: { institution: string | null; name: string }; catalogue: { type: string; means: string; versions: string[] }[]; published: Published[]; inbound: Inbound[]; peers: Peer[]; names: Record<string, string> };

const when = (iso?: string) => (iso ? iso.slice(0, 16).replace('T', ' ') + ' UTC' : '—');
const TONE: Record<string, PillTone> = { accepted: 'ok', approved: 'ok', rejected: 'alert', revoked: 'alert', pending: 'warn', proposed: 'warn', retired: 'neutral', withdrawn: 'neutral', lapsed: 'neutral' };
const input = 'w-full rounded border border-line bg-surface px-2 py-1 text-sm';

export function FederationEvents() {
  const [d, setD] = React.useState<Data | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [peer, setPeer] = React.useState({ institution: '', publicKeyPem: '', endpoint: '' });
  const load = React.useCallback(() => {
    fetch('/api/exchange/events', { cache: 'no-store' })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'Could not load'); setD(j); setErr(null); })
      .catch(e => setErr(e instanceof Error ? e.message : 'Could not load'));
  }, []);
  React.useEffect(load, [load]);
  const post = async (url: string, body: Record<string, unknown>) => {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? 'Recorded.' : j.error ?? 'Refused');
    load();
  };
  const name = (id: string) => d?.names[id] ?? id;

  return (
    <div className="space-y-4 p-4">
      <p className="max-w-3xl text-sm text-ink-muted">
        Events one institution tells another, without giving it the record: each envelope names its type and schema version, the institution it
        comes from, the law version it rests on and the record it is about, and is signed with that institution&apos;s own key. Another
        installation collects them only while an approved exchange relationship covers the event type
        (<a className="text-link underline underline-offset-2" href="/gov/configuration/relationships">Relationships</a>). What arrives is
        accepted, rejected or held pending with reasons, and applied to nothing: the receiving institution acts in its own procedures.
      </p>
      {err ? <p role="alert" className="text-sm text-alert">{err}</p> : null}
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      {d ? (
        <>
          <p className="text-sm">Showing <strong>{d.scope.name}</strong> · {d.published.length} published · {d.inbound.length} received · {d.peers.filter(p => p.state === 'approved').length} trusted keys{' '}
            <button type="button" className="rounded border border-line px-2 py-0.5 text-xs" onClick={load}>Refresh</button></p>

          <Section title="Received" meta="accepted, rejected or pending">
            {d.inbound.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr><th scope="col">Received</th><th scope="col">Event</th><th scope="col">From → to</th><th scope="col">About</th><th scope="col">State</th><th scope="col">Reasons</th></tr></thead>
                  <tbody>
                    {d.inbound.map(r => (
                      <tr key={r.id} className="border-t border-line align-top">
                        <td className="whitespace-nowrap font-mono text-xs">{when(r.receivedAt)}</td>
                        <td><span className="font-mono text-xs">{r.type || '?'}</span>{r.duplicates ? <div className="text-xs text-ink-muted">{r.duplicates} retr{r.duplicates === 1 ? 'y' : 'ies'} recognised</div> : null}</td>
                        <td>{name(r.source)} → {name(r.recipient)}{r.relationship ? <div className="text-xs text-ink-muted">relationship {r.relationship}</div> : null}</td>
                        <td className="font-mono text-xs">{r.aggregate}</td>
                        <td><Pill tone={TONE[r.state] ?? 'neutral'}>{r.state}</Pill>{r.decided ? <div className="text-xs text-ink-muted">by {r.decided.by}</div> : null}</td>
                        <td className="text-xs">
                          {r.reasons.join('; ') || '—'}
                          {r.state === 'pending' ? (
                            <form className="mt-1 flex flex-wrap gap-1" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void post('/api/exchange/events', { op: 'decide', id: r.id, outcome: f.get('outcome'), reason: f.get('reason') }); }}>
                              <label className="sr-only" htmlFor={`o-${r.id}`}>Outcome</label>
                              <select id={`o-${r.id}`} name="outcome" className="rounded border border-line bg-surface px-1 text-xs"><option value="accept">Accept</option><option value="reject">Reject</option></select>
                              <label className="sr-only" htmlFor={`r-${r.id}`}>Reasons</label>
                              <input id={`r-${r.id}`} name="reason" required placeholder="Reasons" className="rounded border border-line bg-surface px-1 text-xs" />
                              <button type="submit" className="rounded border border-line px-2 text-xs">Decide</button>
                            </form>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-ink-muted">Nothing received yet. Another installation sends envelopes to /api/federation/inbound with its integration key.</p>}
          </Section>

          <Section title="Published" meta="references only, signed by the institution's own key">
            {d.published.length ? (
              <ul className="space-y-1 text-sm">
                {d.published.map(p => (
                  <li key={p.envelope.event_id}>
                    <span className="font-mono text-xs text-ink-muted">{when(p.envelope.published_at)}</span> <span className="font-mono text-xs">{p.envelope.event_type}</span> v{p.envelope.schema_version} · {name(p.envelope.source_institution_id)} · <span className="font-mono text-xs">{p.envelope.aggregate_reference}</span> · key <span className="font-mono text-xs">{p.envelope.integrity.key_id}</span>
                    {!p.production ? <> <Pill tone="neutral">development key (not evidence)</Pill></> : null}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-muted">No envelope published. An official publishes one about their own institution&apos;s record through POST /api/exchange/events.</p>}
          </Section>

          <Section title="Keys trusted for other installations' institutions" meta="two officials to trust, one to revoke">
            {d.peers.length ? (
              <table className="w-full text-left text-sm">
                <thead><tr><th scope="col">Institution</th><th scope="col">Key</th><th scope="col">State</th><th scope="col">Who</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
                <tbody>
                  {d.peers.map(p => (
                    <tr key={p.id} className="border-t border-line align-top">
                      <td>{name(p.institution)}</td>
                      <td className="font-mono text-xs">{p.keyId}</td>
                      <td><Pill tone={TONE[p.state] ?? 'neutral'}>{p.state}</Pill></td>
                      <td className="text-xs">proposed by {p.proposed.by}{p.confirmed ? `, confirmed by ${p.confirmed.by} (${p.confirmed.independence})` : ''}{p.revoked ? `; revoked by ${p.revoked.by}: ${p.revoked.reason}` : ''}</td>
                      <td className="space-x-1 text-xs">
                        {p.state === 'proposed' ? <button type="button" className="rounded border border-line px-2" onClick={() => void post('/api/federation/peers', { op: 'confirm', id: p.id })}>Confirm</button> : null}
                        {['proposed', 'approved', 'retired'].includes(p.state) ? <button type="button" className="rounded border border-line px-2" onClick={() => { const reason = window.prompt('Why is this key no longer trusted?'); if (reason) void post('/api/federation/peers', { op: 'revoke', id: p.id, reason }); }}>{p.state === 'proposed' ? 'Withdraw' : 'Revoke'}</button> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-ink-muted">No key is trusted: none ships. Envelopes from another installation are rejected until two officials trust its institution&apos;s key.</p>}
            <form className="grid gap-2 md:grid-cols-3" onSubmit={e => { e.preventDefault(); void post('/api/federation/peers', { op: 'propose', ...peer }); }}>
              <div><label className="text-xs text-ink-muted" htmlFor="peer-inst">Institution (its id in the register)</label>
                <select id="peer-inst" className={input} value={peer.institution} onChange={e => setPeer({ ...peer, institution: e.target.value })} required>
                  <option value="">Choose…</option>{Object.entries(d.names).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
                </select></div>
              <div className="md:col-span-2"><label className="text-xs text-ink-muted" htmlFor="peer-key">Public key (Ed25519, SPKI PEM)</label>
                <textarea id="peer-key" className={`${input} font-mono text-xs`} rows={3} value={peer.publicKeyPem} onChange={e => setPeer({ ...peer, publicKeyPem: e.target.value })} required /></div>
              <div className="md:col-span-2"><label className="text-xs text-ink-muted" htmlFor="peer-end">Where it publishes (https, optional)</label>
                <input id="peer-end" className={input} value={peer.endpoint} onChange={e => setPeer({ ...peer, endpoint: e.target.value })} /></div>
              <div className="flex items-end"><button type="submit" className="rounded border border-line px-3 py-1 text-sm">Propose trusting this key</button></div>
            </form>
          </Section>

          <Section title="Event catalogue" meta="types and schema versions accepted">
            <ul className="grid gap-1 text-sm md:grid-cols-2">
              {d.catalogue.map(c => <li key={c.type}><span className="font-mono text-xs">{c.type}</span> <span className="text-ink-muted">v{c.versions.join(', ')}</span> · {c.means}</li>)}
            </ul>
          </Section>
        </>
      ) : !err ? <p className="text-sm text-ink-muted">Loading…</p> : null}
    </div>
  );
}
