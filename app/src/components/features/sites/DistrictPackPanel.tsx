'use client';

// District shapes for the nation (map plan phase 3: district shapes for
// every other nation at install). Says whether the maps' districts are
// bundled with the platform, installed for this nation (source, licence,
// date, by whom) or missing, and lets an administrator install them from
// geoBoundaries, upload the geoBoundaries file (offline or air-gapped), or
// remove the installed ones (maps return to the bundled districts, or none).
// Rules: lib/data/map-pack.ts. API: /api/map-pack.

import * as React from 'react';
import { useOfficial } from '@/lib/official';
import { forgetInstalledDistricts } from '@/lib/map/districts-installed';
import type { DistrictPackStatus } from '@/lib/data/map-pack';
import { Msg, btn, callApi, input, label, when } from './shared';

const DRAWN: Record<DistrictPackStatus['drawn'], string> = {
  own: 'The districts published by the nation’s mapping authority (below)',
  installed: 'The districts installed for this nation',
  bundled: 'The districts bundled with the platform',
  none: 'None: maps cannot open a region to its districts yet',
};

export function DistrictPackPanel() {
  const [official] = useOfficial();
  const [s, setS] = React.useState<DistrictPackStatus | null>(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [adm, setAdm] = React.useState('');
  const [file, setFile] = React.useState<{ name: string; text: string } | null>(null);
  const [meta, setMeta] = React.useState<{ name: string; text: string } | null>(null);
  const [f, setF] = React.useState({ source: '', licence: '', year: '', adm: 'ADM2' });
  const [reason, setReason] = React.useState('');

  const reload = React.useCallback(async () => {
    try { setS(await callApi<DistrictPackStatus>('/api/map-pack')); setError(''); }
    catch (e) { setError((e as Error).message); }
  }, []);
  React.useEffect(() => { void reload(); }, [reload]);

  async function act(body: Record<string, unknown>, done: string) {
    if (!official) { setMsg({ ok: false, text: 'Sign in or name the acting official first: every installation is recorded under a person.' }); return; }
    setBusy(true); setMsg(null);
    try {
      setS(await callApi<DistrictPackStatus>('/api/map-pack', { ...body, by: official }));
      forgetInstalledDistricts();
      setMsg({ ok: true, text: done });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  }

  const read = async (x: File | undefined, set: (v: { name: string; text: string } | null) => void) => {
    setMsg(null);
    if (!x) { set(null); return; }
    if (s && x.size > s.maxBytes) { setMsg({ ok: false, text: `The file is larger than ${Math.round(s.maxBytes / 1_000_000)} MB: use the simplified file.` }); return; }
    set({ name: x.name, text: await x.text() });
  };

  const p = s?.installed;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(v => ({ ...v, [k]: e.target.value }));

  return (
    <section className="space-y-3 rounded-[3px] border border-line bg-surface p-3" aria-labelledby="district-pack-h">
      <h2 id="district-pack-h" className="text-[15px] font-semibold text-ink">District shapes</h2>
      {error ? <p className="text-[13px] text-alert">{error}</p> : null}
      {s && !s.iso3 ? <p className="text-[13px] text-ink-soft">Set the nation in setup first: districts belong to a nation.</p> : null}
      {s?.iso3 ? (
        <div className="space-y-1.5 text-[13px]">
          <p className="text-ink"><span className="text-ink-muted">Maps open regions to:</span> <strong>{DRAWN[s.drawn]}</strong></p>
          <p className="text-ink-soft">
            Bundled with the platform: {s.bundled ? `${s.bundled.units} districts (${s.bundled.adm}) from ${s.bundled.source} ${s.bundled.year} (${s.bundled.licence}, via ${s.bundled.via})` : 'none for this nation'}.
          </p>
          {p ? (
            <p className="text-ink-soft">
              Installed: {p.unitCount} districts ({p.adm}, {p.parents} placed in a region) from {p.credit.source}{p.credit.year ? ` ${p.credit.year}` : ''} ({p.credit.licence}, via {p.credit.via}) · {p.method === 'download' ? 'downloaded' : 'uploaded'} by {p.installedBy}, {when(p.installedAt)}
              {p.boundaryId ? <> · release <span className="font-mono">{p.boundaryId}</span></> : null} · SHA-256 <span className="font-mono">{p.sha256.slice(0, 16)}…</span>
            </p>
          ) : <p className="text-ink-soft">Installed for this nation: none.</p>}
          {p?.warnings.length ? <details><summary className="cursor-pointer text-[12px] text-warn">{p.warnings.length} note{p.warnings.length === 1 ? '' : 's'} from the conversion</summary><ul className="list-disc ps-5 text-[12px] text-ink-soft">{p.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></details> : null}
        </div>
      ) : null}
      <p className="text-[12px] text-ink-muted">
        Only an administrator installs or removes districts. Shapes come from geoBoundaries (open licences only, never GADM-derived), each district placed in the region whose shape holds it; the source is credited on every map. A version published by the mapping authority (below) is drawn first.
      </p>

      {s?.iso3 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <form className="space-y-2 rounded-[3px] border border-line p-3" onSubmit={e => { e.preventDefault(); void act({ action: 'install', ...(adm ? { adm } : {}) }, 'Districts installed from geoBoundaries: maps can open regions to them.'); }}>
            <h3 className="text-[14px] font-semibold text-ink">Install from geoBoundaries</h3>
            <p className="text-[12px] text-ink-soft">The server asks {s.hosts.join(' and ')} for the nation&rsquo;s districts (nothing else is fetched).</p>
            <label className={label}>Level
              <select className={`${input} mt-1`} value={adm} onChange={e => setAdm(e.target.value)}>
                <option value="">The first level finer than the regions</option>
                <option value="ADM2">ADM2</option><option value="ADM3">ADM3</option><option value="ADM4">ADM4</option>
              </select>
            </label>
            <button type="submit" className={btn} disabled={busy}>{busy ? 'Working…' : p ? 'Install again' : 'Install'}</button>
          </form>

          <form className="space-y-2 rounded-[3px] border border-line p-3" onSubmit={e => { e.preventDefault(); if (!file) { setMsg({ ok: false, text: 'Attach the geoBoundaries GeoJSON file.' }); return; } void act({ action: 'upload', text: file.text, ...(meta ? { metaText: meta.text } : { source: f.source, licence: f.licence, year: f.year, adm: f.adm }) }, `Districts installed from ${file.name}.`); }}>
            <h3 className="text-[14px] font-semibold text-ink">Upload the file (offline)</h3>
            <label className={label}>geoBoundaries GeoJSON (…-ADM2.geojson or …_simplified.geojson)
              <input type="file" accept=".geojson,.json,application/geo+json,application/json" className={`${input} mt-1`} onChange={e => void read(e.target.files?.[0], setFile)} />
            </label>
            <label className={label}>Its metadata file (…-metaData.json, optional)
              <input type="file" accept=".json,application/json" className={`${input} mt-1`} onChange={e => void read(e.target.files?.[0], setMeta)} />
            </label>
            {!meta ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <label className={label}>Published by<input className={`${input} mt-1`} value={f.source} onChange={set('source')} maxLength={200} placeholder="boundarySource" /></label>
                <label className={label}>Licence<input className={`${input} mt-1`} value={f.licence} onChange={set('licence')} maxLength={120} placeholder="boundaryLicense" /></label>
                <label className={label}>Year<input className={`${input} mt-1`} value={f.year} onChange={set('year')} maxLength={10} /></label>
                <label className={label}>Level
                  <select className={`${input} mt-1`} value={f.adm} onChange={set('adm')}><option>ADM2</option><option>ADM3</option><option>ADM4</option></select>
                </label>
              </div>
            ) : null}
            <button type="submit" className={btn} disabled={busy || !file}>Install the file</button>
          </form>
        </div>
      ) : null}

      {p ? (
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${input} max-w-xs`} aria-label="Reason for removing the installed districts" placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} />
          <button type="button" className={btn} disabled={busy} onClick={() => void act({ action: 'remove', reason }, s?.bundled ? 'Installed districts removed: maps draw the bundled districts again.' : 'Installed districts removed: maps show regions only.')}>
            {s?.bundled ? 'Remove (reinstate the bundled districts)' : 'Remove'}
          </button>
        </div>
      ) : null}
      <Msg msg={msg} />

      {s?.history.length ? (
        <details>
          <summary className="cursor-pointer text-[13px] text-ink">History ({s.history.length})</summary>
          <ul className="mt-1 space-y-0.5 text-[12px] text-ink-soft">
            {s.history.map((h, i) => (
              <li key={i}>{when(h.at)} · {h.action === 'install' ? `installed (${h.method === 'download' ? 'download' : 'upload'}) ${h.units} districts, ${h.source} (${h.licence})` : `removed ${h.units} districts${h.reason ? `: ${h.reason}` : ''}`} · {h.by}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
