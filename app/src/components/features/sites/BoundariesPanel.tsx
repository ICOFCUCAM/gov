'use client';

// The nation's own boundaries (map plan phase 4). The mapping authority loads
// its boundary file (GeoJSON or TopoJSON, longitude/latitude) for regions or
// districts with its source, licence and the date it took effect; the server
// checks it first (nothing is recorded) and says what it found. Recording it
// makes a proposal; a different official publishes it, and from its date
// every map draws it and credits it. Every version is kept; withdrawing a
// published one hands the map back to the one before. Rules:
// lib/data/boundaries.ts. API: /api/boundaries.

import * as React from 'react';
import { geoIdentity, geoPath } from 'd3-geo';
import { feature as topoFeature } from 'topojson-client';
import { useOfficial } from '@/lib/official';
import { forgetActiveBoundaries } from '@/lib/map/boundary-active';
import type { BoundaryCheck, BoundaryVersion } from '@/lib/data/boundaries';
import { Msg, btn, callApi, input, label, when } from './shared';

type Row = BoundaryVersion & { unitCount: number; inForce: boolean };
type Fc = { type: 'FeatureCollection'; features: { type: 'Feature'; properties?: Record<string, unknown> | null; geometry: unknown }[] };
const LEVEL: Record<1 | 2, string> = { 1: 'Regions', 2: 'Districts' };
const STATE: Record<BoundaryVersion['state'], string> = { proposed: 'Waiting to be published', published: 'Published', withdrawn: 'Withdrawn' };

/** Read the file in the browser for the preview and its field names (the server checks it again). */
function readFc(text: string): Fc | null {
  try {
    const j = JSON.parse(text) as { type?: string; objects?: Record<string, unknown>; features?: Fc['features'] };
    if (j.type === 'Topology' && j.objects) {
      const first = Object.keys(j.objects)[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const f = first ? (topoFeature(j as any, j.objects[first] as any) as unknown as Fc) : null;
      return f && Array.isArray(f.features) ? f : null;
    }
    return j.type === 'FeatureCollection' && Array.isArray(j.features) ? { type: 'FeatureCollection', features: j.features } : null;
  } catch { return null; }
}

/** The units drawn flat (no projection needed to see their shape), with their names on hover. */
function Preview({ fc, title }: { fc: Fc; title: string }) {
  const W = 520, H = 340;
  const proj = geoIdentity().reflectY(true).fitSize([W, H], fc as never);
  const path = geoPath(proj);
  return (
    <figure className="rounded-[3px] border border-line bg-surface p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[520px]" role="img" aria-label={`${title}: ${fc.features.length} units`}>
        {fc.features.map((f, i) => (
          <path key={i} d={path(f as never) ?? ''} fill="rgb(var(--c-surface-2))" stroke="rgb(var(--c-ink-soft))" strokeWidth={0.6}>
            <title>{String(f.properties?.name ?? f.properties?.shapeName ?? f.properties?.NAME ?? `unit ${i + 1}`)}</title>
          </path>
        ))}
      </svg>
      <figcaption className="mt-1 text-[12px] text-ink-muted">{title} · {fc.features.length} units (drawn flat for checking; maps use the nation&rsquo;s projection)</figcaption>
    </figure>
  );
}

function CheckResult({ check }: { check: BoundaryCheck }) {
  const s = check.summary;
  return (
    <section aria-live="polite" className="space-y-1.5 text-[13px]">
      <p className="text-ink">
        {s.units} unit{s.units === 1 ? '' : 's'}, {s.matched} matched to the official list · {s.areaKm2.toLocaleString()} km²
        {s.previousAreaKm2 ? ` (the map now draws ${s.previousAreaKm2.toLocaleString()} km² in ${s.previousUnits} units)` : ''}
      </p>
      {check.errors.length ? (
        <ul className="list-disc space-y-0.5 ps-5 text-alert" role="alert">{check.errors.slice(0, 12).map((e, i) => <li key={i}>{e}</li>)}{check.errors.length > 12 ? <li>and {check.errors.length - 12} more</li> : null}</ul>
      ) : <p className="text-ok">No errors: the boundaries can be recorded.</p>}
      {check.warnings.length ? <ul className="list-disc space-y-0.5 ps-5 text-warn">{check.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul> : null}
    </section>
  );
}

export function BoundariesPanel() {
  const [official] = useOfficial();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [agency, setAgency] = React.useState<{ id: string; name: string } | null>(null);
  const [error, setError] = React.useState('');
  const [file, setFile] = React.useState<{ name: string; text: string; fc: Fc | null } | null>(null);
  const [f, setF] = React.useState({ level: '1', publisher: '', licence: '', url: '', year: '', validFrom: new Date().toISOString().slice(0, 10), codeField: '', nameField: '', note: '' });
  const [confirmFewer, setConfirmFewer] = React.useState(false);
  const [check, setCheck] = React.useState<BoundaryCheck | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [shown, setShown] = React.useState<{ id: string; fc: Fc; title: string } | null>(null);
  const [reasons, setReasons] = React.useState<Record<string, string>>({});
  const uid = React.useId().replace(/:/g, '');

  const reload = React.useCallback(async () => {
    try {
      const j = await callApi<{ versions: Row[]; mappingAgency: { id: string; name: string } | null }>('/api/boundaries');
      setRows(j.versions); setAgency(j.mappingAgency); setError('');
    } catch (e) { setError((e as Error).message); }
  }, []);
  React.useEffect(() => { void reload(); }, [reload]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setF(s => ({ ...s, [k]: e.target.value })); setCheck(null); };
  const fields = React.useMemo(() => Object.keys(file?.fc?.features[0]?.properties ?? {}), [file]);

  async function onFile(x: File | undefined) {
    setCheck(null); setMsg(null);
    if (!x) { setFile(null); return; }
    if (x.size > 30_000_000) { setMsg({ ok: false, text: 'The file is larger than 30 MB: simplify it first (for example with mapshaper).' }); return; }
    const text = await x.text();
    const fc = readFc(text);
    setFile({ name: x.name, text, fc });
    if (!fc) setMsg({ ok: false, text: 'This is not a GeoJSON FeatureCollection or a TopoJSON topology.' });
  }

  async function submit(dryRun: boolean) {
    if (!official) { setMsg({ ok: false, text: 'Sign in or name the acting official first: every boundary version is recorded under a person.' }); return; }
    if (!file) { setMsg({ ok: false, text: 'Attach the boundary file.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await callApi<{ check: BoundaryCheck; version?: BoundaryVersion; dryRun: boolean }>(`/api/boundaries${dryRun ? '?dryRun=1' : ''}`, {
        level: Number(f.level), text: file.text, validFrom: f.validFrom, codeField: f.codeField, nameField: f.nameField, note: f.note, confirmFewer, by: official,
        source: { publisher: f.publisher, licence: f.licence, url: f.url, year: f.year },
      });
      setCheck(r.check);
      if (!dryRun) { setMsg({ ok: true, text: `Recorded as version ${r.version!.n} of the ${LEVEL[r.version!.level].toLowerCase()}: a different official publishes it.` }); setFile(null); await reload(); }
    } catch (e) {
      const b = (e as Error & { body?: { check?: BoundaryCheck } }).body;
      if (b?.check) setCheck(b.check);
      setMsg({ ok: false, text: (e as Error).message });
    } finally { setBusy(false); }
  }

  async function act(v: Row, action: 'publish' | 'withdraw') {
    if (!official) { setMsg({ ok: false, text: 'Sign in or name the acting official first.' }); return; }
    setBusy(true); setMsg(null);
    try {
      await callApi(`/api/boundaries/${v.id}`, { action, by: official, reason: reasons[v.id] });
      forgetActiveBoundaries();
      setMsg({ ok: true, text: action === 'publish' ? `Version ${v.n} published: maps draw it from ${v.validFrom}.` : `Version ${v.n} withdrawn; kept in the record.` });
      await reload();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  }

  async function preview(v: Row) {
    if (shown?.id === v.id) { setShown(null); return; }
    try {
      const j = await callApi<{ version: BoundaryVersion }>(`/api/boundaries/${v.id}`);
      setShown({ id: v.id, title: `${LEVEL[v.level]} version ${v.n}`, fc: { type: 'FeatureCollection', features: j.version.units.map(u => ({ type: 'Feature', properties: { name: u.name }, geometry: u.geometry })) } });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  }

  const inForce = (l: 1 | 2) => rows?.find(r => r.level === l && r.inForce);

  return (
    <div className="space-y-4">
      <section className="grid gap-2 sm:grid-cols-2">
        {([1, 2] as const).map(l => {
          const v = inForce(l);
          return (
            <div key={l} className="rounded-[3px] border border-line bg-surface px-3 py-2 text-[13px]">
              <div className="text-[12px] uppercase tracking-[0.08em] text-ink-muted">{LEVEL[l]} on every map</div>
              {v ? (
                <p className="mt-0.5 text-ink"><strong>Version {v.n}</strong> from {v.source.publisher}{v.source.year ? ` ${v.source.year}` : ''} ({v.source.licence}), in force from {v.validFrom} · {v.unitCount} units · published by {v.publishedBy}</p>
              ) : <p className="mt-0.5 text-ink-soft">The platform&rsquo;s bundled shapes (Natural Earth, upgraded from geoBoundaries / OCHA where they disagree with the official list). None published by the nation yet.</p>}
            </div>
          );
        })}
      </section>
      <p className="text-[13px] text-ink-soft">
        Loaded and published by {agency ? <strong>{agency.name}</strong> : 'the national mapping agency'} or a government administrator; one official loads, a different one publishes.
      </p>

      <form className="space-y-3 rounded-[3px] border border-line bg-surface p-3" onSubmit={e => { e.preventDefault(); void submit(true); }}>
        <h2 className="text-[15px] font-semibold text-ink">Load a boundary file</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={label}>Level
            <select className={`${input} mt-1`} value={f.level} onChange={set('level')}><option value="1">Regions</option><option value="2">Districts</option></select>
          </label>
          <label className={`${label} sm:col-span-2`}>File (GeoJSON or TopoJSON, longitude/latitude WGS 84)
            <input type="file" accept=".geojson,.json,.topojson,application/geo+json,application/json" className={`${input} mt-1`} onChange={e => void onFile(e.target.files?.[0])} />
          </label>
          <label className={label}>Published by
            <input className={`${input} mt-1`} value={f.publisher} onChange={set('publisher')} maxLength={200} placeholder="National mapping agency" required />
          </label>
          <label className={label}>Licence
            <input className={`${input} mt-1`} value={f.licence} onChange={set('licence')} maxLength={120} placeholder="e.g. Open Government Licence" required />
          </label>
          <label className={label}>In force from
            <input type="date" className={`${input} mt-1`} value={f.validFrom} onChange={set('validFrom')} required />
          </label>
          <label className={label}>Edition or year (optional)
            <input className={`${input} mt-1`} value={f.year} onChange={set('year')} maxLength={10} />
          </label>
          <label className={`${label} sm:col-span-2`}>Where it is published (optional)
            <input className={`${input} mt-1`} value={f.url} onChange={set('url')} maxLength={400} placeholder="https://…" />
          </label>
          {fields.length ? (
            <>
              <label className={label}>Field holding the code
                <select className={`${input} mt-1`} value={f.codeField} onChange={set('codeField')}><option value="">Found automatically</option>{fields.map(k => <option key={k} value={k}>{k}</option>)}</select>
              </label>
              <label className={label}>Field holding the name
                <select className={`${input} mt-1`} value={f.nameField} onChange={set('nameField')}><option value="">Found automatically</option>{fields.map(k => <option key={k} value={k}>{k}</option>)}</select>
              </label>
            </>
          ) : null}
          <label className={`${label} sm:col-span-3`}>Note (optional)
            <input className={`${input} mt-1`} value={f.note} onChange={set('note')} maxLength={400} placeholder="e.g. gazette notice of the new boundaries" />
          </label>
        </div>
        {check?.summary.fewer ? (
          <label className="flex items-start gap-2 text-[13px] text-ink">
            <input type="checkbox" checked={confirmFewer} onChange={e => setConfirmFewer(e.target.checked)} className="mt-1" id={`${uid}-fewer`} />
            <span>Fewer units than the boundaries in force is intended (units were merged by law).</span>
          </label>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={btn} disabled={busy || !file}>{busy ? 'Checking…' : 'Check the file'}</button>
          <button type="button" className={`${btn} bg-surface-2`} disabled={busy || !check || check.errors.length > 0} onClick={() => void submit(false)}>Record as a proposal</button>
        </div>
        <Msg msg={msg} />
        {check ? <CheckResult check={check} /> : null}
        {file?.fc ? <Preview fc={file.fc} title={file.name} /> : null}
      </form>

      <section>
        <h2 className="text-[15px] font-semibold text-ink">Every version</h2>
        {error ? <p className="text-[13px] text-alert">{error}</p> : null}
        {rows && !rows.length ? <p className="text-[13px] text-ink-muted">No boundaries loaded yet: the maps draw the platform&rsquo;s bundled shapes.</p> : null}
        <ul className="mt-2 space-y-2">
          {(rows ?? []).map(v => (
            <li key={v.id} className="rounded-[3px] border border-line bg-surface p-3 text-[13px]">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <strong className="text-ink">{LEVEL[v.level]} · version {v.n}</strong>
                <span className={v.inForce ? 'font-semibold text-ok' : 'text-ink-soft'}>{v.inForce ? 'In force on every map' : STATE[v.state]}</span>
                <span className="text-ink-soft">from {v.validFrom} · {v.unitCount} units · {v.source.publisher}{v.source.year ? ` ${v.source.year}` : ''} ({v.source.licence})</span>
              </div>
              <div className="mt-1 text-[12px] text-ink-muted">
                Loaded by {v.proposedBy}, {when(v.proposedAt)}{v.publishedBy ? ` · published by ${v.publishedBy}, ${when(v.publishedAt)}` : ''}
                {v.withdrawnBy ? ` · withdrawn by ${v.withdrawnBy}, ${when(v.withdrawnAt)}${v.withdrawReason ? ` (${v.withdrawReason})` : ''}` : ''}
                {' · '}SHA-256 <span className="font-mono">{v.sha256.slice(0, 16)}…</span>{v.confirmFewer ? ' · fewer units confirmed' : ''}{v.note ? ` · ${v.note}` : ''}
              </div>
              {v.check.warnings.length ? <details className="mt-1"><summary className="cursor-pointer text-[12px] text-warn">{v.check.warnings.length} note{v.check.warnings.length === 1 ? '' : 's'} from the check</summary><ul className="list-disc ps-5 text-[12px] text-ink-soft">{v.check.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></details> : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" className={btn} aria-expanded={shown?.id === v.id} onClick={() => void preview(v)}>{shown?.id === v.id ? 'Hide the shapes' : 'See the shapes'}</button>
                {v.state === 'proposed' ? <button type="button" className={`${btn} bg-surface-2`} disabled={busy} onClick={() => void act(v, 'publish')}>Publish</button> : null}
                {v.state !== 'withdrawn' ? (
                  <>
                    <input className={`${input} max-w-xs`} aria-label={`Reason for withdrawing version ${v.n}`} placeholder={v.state === 'published' ? 'Reason (required)' : 'Reason (optional)'} value={reasons[v.id] ?? ''} onChange={e => setReasons(r => ({ ...r, [v.id]: e.target.value }))} />
                    <button type="button" className={btn} disabled={busy} onClick={() => void act(v, 'withdraw')}>Withdraw</button>
                  </>
                ) : null}
              </div>
              {shown?.id === v.id ? <div className="mt-2"><Preview fc={shown.fc} title={shown.title} /></div> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
