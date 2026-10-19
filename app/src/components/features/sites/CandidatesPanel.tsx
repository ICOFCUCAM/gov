'use client';

// Open-data suggestions for the national facility register (map plan 4c).
// An official loads an open dataset (OpenStreetMap exports, healthsites.io,
// OurAirports, power plant databases…) with its publisher and licence — by
// file or by its address, fetched by the platform's server from that address
// only — and works through the suggestions: record one as a new site of an
// institution, link it to a site already recorded, or reject it with a
// reason. Nothing is published from an open dataset.
// API: /api/facilities/candidates; rules: lib/data/facilities.ts.

import * as React from 'react';
import { useOfficial } from '@/lib/official';
import type { Candidate, OpenSource } from '@/lib/data/facilities';
import { Msg, btn, callApi, input, label, when, type Institution, type Vocabulary } from './shared';

export function CandidatesPanel({ vocab, institutions, onChanged }: { vocab: Vocabulary; institutions: Institution[]; onChanged: () => void }) {
  const [official] = useOfficial();
  const [data, setData] = React.useState<{ sources: OpenSource[]; candidates: Candidate[] } | null>(null);
  const [form, setForm] = React.useState({ name: '', publisher: '', licence: '', url: '', category: '' });
  const [text, setText] = React.useState('');
  const [fileName, setFileName] = React.useState('');
  const [owner, setOwner] = React.useState<Record<string, string>>({});
  const [reason, setReason] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const load = React.useCallback(async () => {
    try { setData(await callApi('/api/facilities/candidates')); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  const accepted = vocab.policy.methods.includes('open-data');
  const catName = (k: string) => vocab.categories.find(c => c.key === k)?.label ?? k;
  const site = (id: string) => vocab.sites.find(s => s.id === id);

  const run = async (f: () => Promise<unknown>, ok: string) => {
    if (!official) { setMsg({ ok: false, text: 'Sign in or name the acting official first: every step is recorded under a person.' }); return; }
    setBusy(true);
    try { await f(); setMsg({ ok: true, text: ok }); await load(); onChanged(); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  };

  const open = data?.candidates ?? [];
  return (
    <div className="space-y-3 text-[13px]">
      <p className="text-ink-soft">
        Open datasets can suggest sites the register does not have yet. Each suggestion inside the nation waits for an official: record it as a
        site of your institution, link it to a site already recorded, or reject it. Nothing is published from an open dataset.
        Share-alike licences (such as ODbL, used by OpenStreetMap) oblige the nation to share a database built from them under the same terms.
      </p>
      {!accepted ? <p className="text-warn">The nation&rsquo;s facility policy does not accept open-data suggestions yet; an administrator can change it below.</p> : null}
      <Msg msg={msg} />
      <form className="grid gap-2 md:grid-cols-3" onSubmit={e => {
        e.preventDefault();
        void run(() => callApi('/api/facilities/candidates', { ...form, url: text ? undefined : form.url || undefined, text: text || undefined, category: form.category || undefined, by: official }), 'Dataset loaded: its suggestions are listed below');
      }}>
        <label className={label}>Dataset<input className={`${input} mt-1`} required value={form.name} onChange={e => setForm({ ...form, name: e.currentTarget.value })} placeholder="e.g. OpenStreetMap health facilities" /></label>
        <label className={label}>Publisher<input className={`${input} mt-1`} required value={form.publisher} onChange={e => setForm({ ...form, publisher: e.currentTarget.value })} placeholder="e.g. OpenStreetMap contributors" /></label>
        <label className={label}>Licence<input className={`${input} mt-1`} required value={form.licence} onChange={e => setForm({ ...form, licence: e.currentTarget.value })} placeholder="e.g. ODbL 1.0, CC BY 4.0" /></label>
        <label className={label}>Its address (or upload the file)<input type="url" className={`${input} mt-1`} value={form.url} onChange={e => setForm({ ...form, url: e.currentTarget.value })} placeholder="https://…" disabled={!!text} /></label>
        <label className={label}>File (CSV, GeoJSON or GPX)
          <input type="file" accept=".csv,.geojson,.json,.gpx,text/csv,application/geo+json,application/json" className="mt-1 block text-[12px]"
            onChange={async e => { const f = e.currentTarget.files?.[0]; setFileName(f?.name ?? ''); setText(f ? await f.text() : ''); }} />
          {fileName ? <span className="text-ink-muted">{fileName}</span> : null}
        </label>
        <label className={label}>Kind of site, when the file does not say
          <select className={`${input} mt-1`} value={form.category} onChange={e => setForm({ ...form, category: e.currentTarget.value })}>
            <option value="">From the file (its category column, or OpenStreetMap tags such as amenity=school)</option>
            {vocab.categories.map(c => <option key={c.key} value={c.key}>{c.glyph} {c.label}</option>)}
          </select>
        </label>
        <div className="md:col-span-3"><button className={btn} disabled={busy || !accepted}>Load the dataset</button></div>
      </form>

      {data?.sources.length ? (
        <details>
          <summary className="cursor-pointer text-link">Datasets loaded ({data.sources.length})</summary>
          <ul className="mt-1 space-y-1">
            {data.sources.map(s => (
              <li key={s.id}>
                <strong>{s.name}</strong> · {s.publisher} · {s.licence}{s.shareAlike ? <span className="text-warn"> (share-alike)</span> : null}
                <span className="text-ink-muted"> · {s.candidates} of {s.rows} rows · loaded {when(s.loadedAt)} by {s.loadedBy}</span>
                {s.refused.length ? <span className="text-ink-muted"> · {s.refused.length} refused (e.g. row {s.refused[0]!.row}: {s.refused[0]!.reason})</span> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {open.length ? (
        <table className="w-full" data-stack>
          <caption className="sr-only">Suggestions waiting for an official</caption>
          <thead><tr className="border-b border-line text-ink-muted"><th className="py-1 text-start font-semibold">Suggestion</th><th className="text-start font-semibold">Where</th><th className="text-start font-semibold">Already recorded?</th><th className="text-start font-semibold">Decide</th></tr></thead>
          <tbody>
            {open.slice(0, 100).map(c => {
              const src = data!.sources.find(s => s.id === c.sourceId);
              return (
                <tr key={c.id} className="border-b border-line-soft align-top">
                  <td data-label="Suggestion" className="py-1.5"><strong>{c.name}</strong><div className="text-ink-muted">{catName(c.category)}{c.kindFrom === 'osm' ? ' (from its OpenStreetMap tags)' : ''} · {src?.name}{c.ref ? ` · ${c.ref}` : ''}</div></td>
                  <td data-label="Where">{c.region ?? '—'}<div className="font-mono text-[11px] text-ink-muted">{c.lat.toFixed(5)}, {c.lng.toFixed(5)}</div></td>
                  <td data-label="Already recorded?">{c.match ? <>{site(c.match.id)?.name ?? c.match.name} <span className="text-ink-muted">({c.match.metres} m away)</span></> : <span className="text-ink-muted">Nothing close by</span>}</td>
                  <td data-label="Decide" className="space-y-1.5">
                    {c.match ? <button className={btn} disabled={busy} onClick={() => run(() => callApi(`/api/facilities/candidates/${c.id}`, { decision: 'link', facilityId: c.match!.id, by: official }), `${c.name} linked to the site already recorded`)}>Same site: link</button> : null}
                    <div className="flex flex-wrap items-center gap-1">
                      <select aria-label={`Institution for ${c.name}`} className={`${input} w-auto py-1 text-[12px]`} value={owner[c.id] ?? ''} onChange={e => setOwner({ ...owner, [c.id]: e.currentTarget.value })}>
                        <option value="">Institution…</option>
                        {institutions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <button className={btn} disabled={busy || !owner[c.id]} onClick={() => run(() => callApi(`/api/facilities/candidates/${c.id}`, { decision: 'confirm', ministryId: owner[c.id], by: official }), `${c.name} recorded; another official publishes it`)}>Record as a new site</button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <input aria-label={`Why reject ${c.name}`} className={`${input} w-44 py-1 text-[12px]`} placeholder="Why not" value={reason[c.id] ?? ''} onChange={e => setReason({ ...reason, [c.id]: e.currentTarget.value })} />
                      <button className={btn} disabled={busy || !reason[c.id]} onClick={() => run(() => callApi(`/api/facilities/candidates/${c.id}`, { decision: 'reject', reason: reason[c.id], by: official }), `${c.name} rejected`)}>Reject</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : <p className="text-ink-muted">No suggestions are waiting.</p>}
      {open.length > 100 ? <p className="text-ink-muted">Showing the first 100 of {open.length} suggestions.</p> : null}
    </div>
  );
}
