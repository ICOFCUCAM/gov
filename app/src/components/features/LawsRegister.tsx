'use client';

// The laws register (lib/law/register.ts, design §5.4): the nation's laws as
// versioned texts. Officials of the law-register authority record a version
// (typed provisions, or an Akoma Ntoso or CSV file); a different official who
// can sign confirms it, and only confirmed versions can be cited by
// decisions. Look up what a provision said on a given day.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { SignalTag } from '@/components/ui/SignalTag';

interface Version { id: string; language: string; dates: { adopted?: string; published?: string; inForce: string; ceased?: string }; provisions: { eId: string; num: string; heading?: string; text: string }[]; digest: string; state: string; recordedBy: string; confirmedBy?: string; withdrawn?: { reason: string }; source?: { kind: string; bill?: string; billNumber?: string; billVersion?: number; publication?: { date: string; reference: string }; certification?: { digest: string } } }
interface Instrument { id: string; title: string; type: string; jurisdiction: string; issuingAuthority: string; versions: Version[] }

async function call<T>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? `Request failed (${r.status})`);
  return j as T;
}

const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';

export function LawsRegister() {
  const [list, setList] = React.useState<Instrument[]>([]);
  const [authority, setAuthority] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState<string | null>(null);
  const [f, setF] = React.useState({ title: '', type: 'act', year: '', number: '', jurisdiction: '', issuingAuthority: '', inForce: '', adopted: '', published: '', format: 'akoma-ntoso', text: '', existing: '' });
  const [look, setLook] = React.useState({ instrument: '', eId: '', on: '' });
  const [found, setFound] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    call<{ instruments: Instrument[]; authority: string | null }>('/api/law').then(r => { setList(r.instruments); setAuthority(r.authority); }).catch(e => setMsg(e.message));
  }, []);
  React.useEffect(load, [load]);

  const act = async (url: string, body: unknown, done: string) => {
    setMsg(null);
    try { await call(url, body); setMsg(done); load(); } catch (e) { setMsg((e as Error).message); }
  };

  const record = () => act('/api/law', {
    format: f.format, text: f.text,
    instrument: f.existing ? { id: f.existing } : { title: f.title || undefined, type: f.type, year: Number(f.year) || undefined, number: f.number, jurisdiction: f.jurisdiction, issuingAuthority: f.issuingAuthority },
    dates: { inForce: f.inForce, ...(f.adopted ? { adopted: f.adopted } : {}), ...(f.published ? { published: f.published } : {}) },
  }, 'Recorded. A different official who can sign must confirm it before it can be cited.');

  const lookup = async () => {
    setFound(null);
    try {
      const r = await call<{ citation: { title: string; num: string; version: string }; provision: { text: string } }>(`/api/law/cite?${new URLSearchParams(look)}`);
      setFound(`${r.citation.title}, ${r.citation.num}: ${r.provision.text}`);
    } catch (e) { setFound((e as Error).message); }
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-semibold">Laws</h2>
      <p className="max-w-3xl text-sm text-ink-muted">
        The nation&apos;s laws and regulations as versioned texts. Every decision cites the provision that allowed it, as it stood on the day.
        {authority ? '' : ' The law-register authority is not named yet (Configuration, Who is responsible).'}
      </p>
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}

      <Section title="What did a provision say on a day?" meta="confirmed versions only">
        <div className="grid gap-2 md:grid-cols-4">
          <label className="text-sm">Law<select className={field} value={look.instrument} onChange={e => setLook(l => ({ ...l, instrument: e.target.value }))}><option value="">Choose</option>{list.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}</select></label>
          <label className="text-sm">Provision (eId)<input className={field} value={look.eId} onChange={e => setLook(l => ({ ...l, eId: e.target.value }))} placeholder="art_12__para_1" /></label>
          <label className="text-sm">On<input type="date" className={field} value={look.on} onChange={e => setLook(l => ({ ...l, on: e.target.value }))} /></label>
          <div className="flex items-end"><Button onClick={lookup} disabled={!look.instrument || !look.eId || !look.on}>Look up</Button></div>
        </div>
        {found ? <p className="mt-2 text-sm">{found}</p> : null}
      </Section>

      <Section title="Register" meta={`${list.length} instruments`}>
        {list.length ? (
          <ul className="divide-y divide-line">
            {list.map(i => (
              <li key={i.id} className="py-2">
                <button className="text-left font-medium underline-offset-2 hover:underline" onClick={() => setOpen(o => o === i.id ? null : i.id)} aria-expanded={open === i.id}>{i.title}</button>
                <span className="ml-2 text-xs text-ink-muted">{i.type} · {i.id}</span>
                {i.versions.some(v => v.source?.kind === 'sample') ? <SignalTag kind="sample" source="Sample for demonstration, not the nation's law" className="ml-2" /> : null}
                {open === i.id ? (
                  <ul className="mt-2 space-y-2 text-sm">
                    {i.versions.map(v => (
                      <li key={v.id} className="rounded border border-line p-2">
                        <div>In force {v.dates.inForce}{v.dates.ceased ? ` until ${v.dates.ceased}` : ''} · {v.language} · {v.provisions.length} provisions · <span className="font-mono text-xs">{v.digest.slice(0, 12)}</span></div>
                        {v.source?.kind === 'legislature' ? (
                          <div className="text-xs text-ink-muted">
                            From the legislature&apos;s record: <a className="underline" href={`/gov/legislature/bills/${encodeURIComponent(v.source.bill ?? '')}`}>{v.source.billNumber}</a>, text version {v.source.billVersion}, published {v.source.publication?.date} ({v.source.publication?.reference}); record certified <span className="font-mono">{v.source.certification?.digest.slice(0, 12)}</span>. The text is the legislature&apos;s: confirm that it entered as certified.
                          </div>
                        ) : v.source?.kind === 'entered' ? <div className="text-xs text-ink-muted">Typed in or loaded here (not from the legislature&apos;s record)</div> : null}
                        <div className="text-xs text-ink-muted">{v.state === 'confirmed' ? `Confirmed by ${v.confirmedBy}, recorded by ${v.recordedBy}` : v.state === 'withdrawn' ? `Withdrawn: ${v.withdrawn?.reason}` : `Recorded by ${v.recordedBy}; waiting for a second official`}</div>
                        <div className="mt-1 flex gap-2">
                          {v.state === 'recorded' ? <Button onClick={() => act('/api/law/confirm', { instrument: i.id, version: v.id }, 'Confirmed.')}>Confirm</Button> : null}
                          {v.state !== 'withdrawn' ? <Button variant="secondary" onClick={() => { const reason = window.prompt('Why is this version withdrawn?'); if (reason) void act('/api/law/withdraw', { instrument: i.id, version: v.id, reason }, 'Withdrawn and kept.'); }}>Withdraw</Button> : null}
                          {v.state === 'confirmed' ? <a className="text-xs underline" href={`/api/law/export?${new URLSearchParams({ instrument: i.id, version: v.id })}`}>Akoma Ntoso file</a> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-muted">No laws recorded yet. Nothing is entered for the nation.</p>}
      </Section>

      <Section title="Record a version" meta="officials of the law-register authority">
        <div className="grid gap-2 md:grid-cols-3">
          <label className="text-sm">Of an existing law<select className={field} value={f.existing} onChange={e => setF(x => ({ ...x, existing: e.target.value }))}><option value="">A new law</option>{list.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}</select></label>
          {!f.existing ? <>
            <label className="text-sm">Official title<input className={field} value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))} placeholder="Read from the file when empty" /></label>
            <label className="text-sm">Type<select className={field} value={f.type} onChange={e => setF(x => ({ ...x, type: e.target.value }))}>{['constitution', 'act', 'regulation', 'decree', 'order', 'treaty', 'bylaw', 'other'].map(t => <option key={t}>{t}</option>)}</select></label>
            <label className="text-sm">Year<input className={field} inputMode="numeric" value={f.year} onChange={e => setF(x => ({ ...x, year: e.target.value }))} /></label>
            <label className="text-sm">Number<input className={field} value={f.number} onChange={e => setF(x => ({ ...x, number: e.target.value }))} /></label>
            <label className="text-sm">Jurisdiction<input className={field} value={f.jurisdiction} onChange={e => setF(x => ({ ...x, jurisdiction: e.target.value }))} placeholder="The nation's code, or a region" /></label>
            <label className="text-sm">Issuing authority<input className={field} value={f.issuingAuthority} onChange={e => setF(x => ({ ...x, issuingAuthority: e.target.value }))} /></label>
          </> : null}
          <label className="text-sm">In force from<input type="date" className={field} value={f.inForce} onChange={e => setF(x => ({ ...x, inForce: e.target.value }))} /></label>
          <label className="text-sm">Adopted<input type="date" className={field} value={f.adopted} onChange={e => setF(x => ({ ...x, adopted: e.target.value }))} /></label>
          <label className="text-sm">Published<input type="date" className={field} value={f.published} onChange={e => setF(x => ({ ...x, published: e.target.value }))} /></label>
          <label className="text-sm">Text as<select className={field} value={f.format} onChange={e => setF(x => ({ ...x, format: e.target.value }))}><option value="akoma-ntoso">Akoma Ntoso XML</option><option value="csv">CSV (eId, num, heading, text, parent)</option></select></label>
        </div>
        <label className="mt-2 block text-sm">The text<textarea className={`${field} h-40 font-mono`} value={f.text} onChange={e => setF(x => ({ ...x, text: e.target.value }))} /></label>
        <label className="mt-1 block text-sm">Or a file<input type="file" accept=".xml,.akn,.csv,text/xml,text/csv" className="mt-1 block text-sm" onChange={async e => { const file = e.target.files?.[0]; if (file) setF(x => ({ ...x, text: '', format: /\.csv$/i.test(file.name) ? 'csv' : 'akoma-ntoso' })); if (file) { const t = await file.text(); setF(x => ({ ...x, text: t })); } }} /></label>
        <div className="mt-2"><Button variant="primary" onClick={record} disabled={!f.text || !f.inForce}>Record version</Button></div>
      </Section>
    </div>
  );
}
