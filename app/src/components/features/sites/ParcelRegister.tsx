'use client';

// The land parcel register (/gov/sites/parcels, a tab of National data): the
// nation's cadastre as recorded by its cadastre authority. The map draws
// published parcels from the parcel vector tiles at high zoom; the register
// table reads a page at a time (GET /api/parcels?limit=); what waits on a
// second official (a parcel to publish, a change to confirm) is listed on its
// own; one parcel's record shows its versions, and its rights and holders
// only to the cadastre authority and officials with need (the server
// decides). Officials record a parcel (its outline as GeoJSON; the area is
// computed and region and district come from the map), load a file, and
// administrators change the nation's parcel policy four-eyes.
// Design: docs/PARCEL_REGISTER.md. Rules: lib/data/parcels.ts.

import * as React from 'react';
import { ActingOfficial } from '@/components/ui/ActingOfficial';
import { useOfficial } from '@/lib/official';
import type {
  LandUse, OfficialParcel, ParcelImport, ParcelPolicy, ParcelPolicyChange, ParcelRight, PublicParcel, SurveyMethod,
} from '@/lib/data/parcels';
import { ParcelMap } from './ParcelMap';
import { Count, Msg, btn, callApi, input, label, when, useInstitutions, type Institution } from './shared';

const ROWS = 200;
type Opt<K extends string = string> = { key: K; label: string };
interface Vocab {
  parcels: PublicParcel[]; page: { total: number; offset: number; limit: number; next: number | null };
  counts: { total: number; published: number; proposed: number; waiting: number; withdrawn: number; areaM2: number; byLandUse: Record<string, number> };
  policy: ParcelPolicy; authority: { id: string; name: string } | null; seesRights: boolean;
  landUses: Opt<LandUse>[]; methods: (Opt<SurveyMethod> & { how: string; typicalAccuracyM: number })[];
  rightTypes: (Opt & { rrr: string })[]; holderKinds: Opt[]; sourceKinds: Opt[];
}
const STATE_WORD: Record<PublicParcel['state'], string> = { proposed: 'Waiting to be published', published: 'Published', withdrawn: 'Withdrawn' };
export const area = (m2: number) => (m2 >= 10_000 ? `${(m2 / 10_000).toLocaleString('en', { maximumFractionDigits: 2 })} ha` : `${Math.round(m2).toLocaleString('en')} m²`);

function Panel({ id, title, meta, children }: { id: string; title: string; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="space-y-3 rounded-[3px] border border-line bg-surface p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`${id}-h`} className="text-[16px] font-semibold text-ink">{title}</h3>
        {meta ? <span className="text-[12px] text-ink-muted">{meta}</span> : null}
      </header>
      {children}
    </section>
  );
}

/** Rights as the form edits them (personal data: sent to the server, shown back only to viewers with need). */
type RightRow = { type: string; holderKind: string; holder: string; holderRef: string; share: string; kind: string; ref: string; date: string };
const blankRight = (): RightRow => ({ type: 'ownership', holderKind: 'person', holder: '', holderRef: '', share: '', kind: 'title', ref: '', date: '' });
const rightsOut = (rows: RightRow[]) => rows.map(r => ({ type: r.type, holderKind: r.holderKind, holder: r.holder, holderRef: r.holderRef || undefined, share: r.share || undefined, source: { kind: r.kind, ref: r.ref, date: r.date || undefined } }));

function RightsEditor({ rows, onChange, vocab }: { rows: RightRow[]; onChange: (r: RightRow[]) => void; vocab: Vocab }) {
  const set = (i: number, k: keyof RightRow, v: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <fieldset className="space-y-2 rounded-[3px] border border-line-soft p-2">
      <legend className="px-1 text-[13px] text-ink-soft">Rights, restrictions and responsibilities <span className="text-ink-muted">(personal data: seen only by the cadastre authority and officials with need)</span></legend>
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-4">
          <label className={label}>Right<select className={`${input} mt-1`} value={r.type} onChange={e => set(i, 'type', e.currentTarget.value)}>{vocab.rightTypes.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</select></label>
          <label className={label}>Holder is<select className={`${input} mt-1`} value={r.holderKind} onChange={e => set(i, 'holderKind', e.currentTarget.value)}>{vocab.holderKinds.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</select></label>
          <label className={label}>Holder&rsquo;s name<input className={`${input} mt-1`} value={r.holder} onChange={e => set(i, 'holder', e.currentTarget.value)} autoComplete="off" /></label>
          <label className={label}>Holder&rsquo;s id number<input className={`${input} mt-1`} value={r.holderRef} onChange={e => set(i, 'holderRef', e.currentTarget.value)} autoComplete="off" /></label>
          <label className={label}>Share<input className={`${input} mt-1`} value={r.share} onChange={e => set(i, 'share', e.currentTarget.value)} placeholder="1/2" /></label>
          <label className={label}>Document<select className={`${input} mt-1`} value={r.kind} onChange={e => set(i, 'kind', e.currentTarget.value)}>{vocab.sourceKinds.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</select></label>
          <label className={label}>Document reference<input className={`${input} mt-1`} value={r.ref} onChange={e => set(i, 'ref', e.currentTarget.value)} /></label>
          <label className={label}>Document date<input type="date" className={`${input} mt-1`} value={r.date} onChange={e => set(i, 'date', e.currentTarget.value)} /></label>
          <div className="sm:col-span-4"><button type="button" className={btn} onClick={() => onChange(rows.filter((_, j) => j !== i))}>Remove this right</button></div>
        </div>
      ))}
      <button type="button" className={btn} onClick={() => onChange([...rows, blankRight()])}>Add a right</button>
    </fieldset>
  );
}

function RecordForm({ vocab, official, onDone }: { vocab: Vocab; official: string; onDone: () => void }) {
  const [f, setF] = React.useState({ parcelId: '', landUse: 'residential', method: vocab.policy.methods[0] ?? 'cadastral-import', accuracyM: '', planRef: '', surveyedAt: '', geometry: '', note: '' });
  const [rights, setRights] = React.useState<RightRow[]>([]);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [check, setCheck] = React.useState<{ areaM2?: number; place?: { region?: string; district?: string }; errors?: string[]; warnings: string[] } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { setF(s => ({ ...s, [k]: e.target.value })); if (k === 'geometry') setCheck(null); };
  const body = () => ({ ...f, accuracyM: f.accuracyM || undefined, rights: rightsOut(rights), by: official });
  const run = async (checkOnly: boolean) => {
    if (!official) { setMsg({ ok: false, text: 'Sign in or name the acting official first: every parcel is recorded under a person.' }); return; }
    setBusy(true); setMsg(null);
    try {
      if (checkOnly) { const r = await callApi<{ check: NonNullable<typeof check> }>('/api/parcels?check=1', body()); setCheck(r.check); }
      else {
        const r = await callApi<{ parcel: OfficialParcel; check: { warnings: string[] } }>('/api/parcels', body());
        setMsg({ ok: true, text: `Recorded ${r.parcel.parcelId} (${r.parcel.id}, ${area(r.parcel.areaM2)}, ${r.parcel.place.district ?? r.parcel.place.region ?? ''}). A different official publishes it.${r.check.warnings.length ? ` Note: ${r.check.warnings.join('; ')}` : ''}` });
        setF(s => ({ ...s, parcelId: '', geometry: '' })); setRights([]); setCheck(null); onDone();
      }
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  };
  return (
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); void run(false); }}>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={label}>National parcel id<input className={`${input} mt-1`} value={f.parcelId} onChange={set('parcelId')} placeholder={vocab.policy.idExample} required /></label>
        <label className={label}>Land use<select className={`${input} mt-1`} value={f.landUse} onChange={set('landUse')}>{vocab.landUses.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}</select></label>
        <label className={label}>Survey method<select className={`${input} mt-1`} value={f.method} onChange={set('method')}>{vocab.methods.filter(m => vocab.policy.methods.includes(m.key)).map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</select></label>
        <label className={label}>Accuracy (m)<input className={`${input} mt-1`} inputMode="decimal" value={f.accuracyM} onChange={set('accuracyM')} placeholder={String(vocab.methods.find(m => m.key === f.method)?.typicalAccuracyM ?? '')} /></label>
        <label className={label}>Survey plan reference<input className={`${input} mt-1`} value={f.planRef} onChange={set('planRef')} /></label>
        <label className={label}>Surveyed on<input type="date" className={`${input} mt-1`} value={f.surveyedAt} onChange={set('surveyedAt')} /></label>
      </div>
      <label className={label}>Outline (GeoJSON Polygon or MultiPolygon, longitude/latitude; the area is computed, region and district come from the map)
        <textarea className={`${input} mt-1 h-28 font-mono text-[12px]`} value={f.geometry} onChange={set('geometry')} required
          placeholder='{"type":"Polygon","coordinates":[[[lng,lat],[lng,lat],[lng,lat],[lng,lat],[first lng,first lat]]]}' />
      </label>
      <label className={label}>Or read the outline from a GeoJSON file
        <input type="file" accept=".geojson,.json,application/geo+json" className="mt-1 block text-[13px]" onChange={async e => { const x = e.currentTarget.files?.[0]; if (x) { const t = await x.text(); setF(s => ({ ...s, geometry: t })); setCheck(null); } }} />
      </label>
      <RightsEditor rows={rights} onChange={setRights} vocab={vocab} />
      <label className={label}>Note<input className={`${input} mt-1`} value={f.note} onChange={set('note')} /></label>
      {check ? (
        <div aria-live="polite" className="text-[13px]">
          {check.errors?.length ? <ul role="alert" className="list-disc ps-5 text-alert">{check.errors.map((x, i) => <li key={i}>{x}</li>)}</ul>
            : <p className="text-ok">The outline can be recorded: {check.areaM2 ? area(check.areaM2) : ''}{check.place?.region ? ` in ${check.place.district ? `${check.place.district}, ` : ''}${check.place.region}` : ''}.</p>}
          {check.warnings.length ? <ul className="list-disc ps-5 text-warn">{check.warnings.map((x, i) => <li key={i}>{x}</li>)}</ul> : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} disabled={busy} onClick={() => void run(true)}>Check the outline</button>
        <button type="submit" className={btn} disabled={busy}>Record the parcel</button>
      </div>
      <Msg msg={msg} />
    </form>
  );
}

function ParcelDetail({ id, vocab, official, onChanged, onClose }: { id: string; vocab: Vocab; official: string; onChanged: () => void; onClose: () => void }) {
  const [p, setP] = React.useState<OfficialParcel | null>(null);
  const [err, setErr] = React.useState('');
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [reason, setReason] = React.useState('');
  const [landUse, setLandUse] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const load = React.useCallback(async () => {
    try { setP((await callApi<{ parcel: OfficialParcel }>(`/api/parcels/${encodeURIComponent(id)}`)).parcel); setErr(''); } catch (e) { setErr((e as Error).message); }
  }, [id]);
  React.useEffect(() => { void load(); }, [load]);
  const act = async (body: Record<string, unknown>, done: string) => {
    if (!official) { setMsg({ ok: false, text: 'Sign in or name the acting official first.' }); return; }
    setBusy(true); setMsg(null);
    try { const r = await callApi<{ parcel: OfficialParcel }>(`/api/parcels/${encodeURIComponent(id)}`, { ...body, by: official }); setP(r.parcel); setMsg({ ok: true, text: done }); setReason(''); onChanged(); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  };
  if (err) return <p role="alert" className="text-[13px] text-alert">The parcel could not be read: {err}</p>;
  if (!p) return <p className="text-[13px] text-ink-muted">Reading the parcel…</p>;
  const rightWord = (k: string) => vocab.rightTypes.find(t => t.key === k)?.label ?? k;
  const showRights = (rs: ParcelRight[] | undefined, count: number) => (rs ? (
    rs.length ? <ul className="list-disc space-y-0.5 ps-5">{rs.map((r, i) => <li key={i}>{rightWord(r.type)}: {r.holder || 'holder not yet known'}{r.holderRef ? ` (${r.holderRef})` : ''}{r.share ? `, share ${r.share}` : ''} · {vocab.sourceKinds.find(s => s.key === r.source.kind)?.label} {r.source.ref}{r.source.date ? ` of ${r.source.date}` : ''}</li>)}</ul> : <p className="text-ink-muted">No rights recorded.</p>
  ) : <p className="text-ink-muted">{count} right{count === 1 ? '' : 's'} recorded. Rights and holders are shown only to the cadastre authority and officials with need.</p>);
  return (
    <article aria-labelledby="parcel-h" className="space-y-2 rounded-[3px] border border-line-soft bg-surface-2 p-3 text-[13px]">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 id="parcel-h" className="text-[15px] font-semibold">Parcel {p.parcelId} <span className="font-mono text-[12px] text-ink-muted">{p.id}</span></h4>
        <button type="button" className={btn} onClick={onClose}>Close</button>
      </header>
      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        <div><dt className="text-ink-muted">Stage</dt><dd>{STATE_WORD[p.state]}{p.withdrawReason ? ` — ${p.withdrawReason}` : ''}</dd></div>
        <div><dt className="text-ink-muted">Area (computed from the outline)</dt><dd>{area(p.areaM2)}</dd></div>
        <div><dt className="text-ink-muted">Where (from the map)</dt><dd>{p.place.district ? `${p.place.district}, ` : ''}{p.place.region ?? '—'}</dd></div>
        <div><dt className="text-ink-muted">Land use</dt><dd>{vocab.landUses.find(l => l.key === p.landUse)?.label}</dd></div>
        <div><dt className="text-ink-muted">Survey</dt><dd>{vocab.methods.find(m => m.key === p.survey.method)?.label}, ±{p.survey.accuracyM} m{p.survey.planRef ? ` · plan ${p.survey.planRef}` : ''}{p.survey.surveyedAt ? ` · ${p.survey.surveyedAt}` : ''}{p.survey.sourceCrs ? ` · from ${p.survey.sourceCrs.name}` : ''}</dd></div>
        <div><dt className="text-ink-muted">Recorded</dt><dd>{p.recordedBy}, {when(p.recordedAt)}{p.publishedBy ? ` · published by ${p.publishedBy}, ${when(p.publishedAt)}` : ''}</dd></div>
        {p.overlaps.length ? <div className="sm:col-span-2"><dt className="text-ink-muted">Overlaps flagged</dt><dd className="text-warn">{p.overlaps.map(o => `${o.parcelId} (${area(o.areaM2)})`).join(', ')}</dd></div> : null}
      </dl>
      <section aria-label="Rights"><h5 className="font-semibold">Rights</h5>{showRights(p.rights, p.rightsCount)}</section>
      {p.pending ? (
        <section className="rounded-[3px] border border-line p-2">
          <h5 className="font-semibold text-warn">A change waits for a second official</h5>
          <p>{p.pending.reason} — proposed by {p.pending.proposedBy}, {when(p.pending.proposedAt)}. Land use {vocab.landUses.find(l => l.key === p.pending!.landUse)?.label}, {area(p.pending.areaM2)}.</p>
          {showRights(p.pending.rights, p.pending.rightsCount)}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={btn} disabled={busy} onClick={() => void act({ action: 'confirm-amend' }, 'The change is confirmed.')}>Confirm the change</button>
            <button type="button" className={btn} disabled={busy || !reason.trim()} onClick={() => void act({ action: 'discard-amend', reason }, 'The change is discarded.')}>Discard it (give a reason below)</button>
          </div>
        </section>
      ) : null}
      {p.state !== 'withdrawn' ? (
        <div className="space-y-2">
          <label className={label}>Reason (for a change, a discarded change or a withdrawal)<input className={`${input} mt-1`} value={reason} onChange={e => setReason(e.currentTarget.value)} /></label>
          <div className="flex flex-wrap items-end gap-2">
            {p.state === 'proposed' ? <button type="button" className={btn} disabled={busy} onClick={() => void act({ action: 'publish' }, 'Published.')}>Publish (a different official from the one who recorded it)</button> : null}
            <label className={label}>New land use<select className={`${input} mt-1`} value={landUse} onChange={e => setLandUse(e.currentTarget.value)}><option value="">Keep</option>{vocab.landUses.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}</select></label>
            <button type="button" className={btn} disabled={busy || !landUse || !reason.trim()} onClick={() => void act({ action: 'amend', landUse, reason }, p.state === 'published' ? 'The change waits for a second official.' : 'Changed.')}>Change the land use</button>
            <button type="button" className={btn} disabled={busy || !reason.trim()} onClick={() => void act({ action: 'withdraw', reason }, 'Withdrawn.')}>Withdraw the parcel</button>
          </div>
        </div>
      ) : null}
      <Msg msg={msg} />
      <details>
        <summary className="cursor-pointer text-ink-soft">Versions ({p.versions.length})</summary>
        <ol className="mt-1 list-decimal space-y-0.5 ps-5">{p.versions.map(v => <li key={v.n}>{when(v.at)} · {v.by}: {v.what} · {area(v.areaM2)} · {v.landUse}{v.rights ? ` · ${v.rights.length} right${v.rights.length === 1 ? '' : 's'}` : ''}</li>)}</ol>
      </details>
    </article>
  );
}

function ImportForm({ vocab, official, onDone }: { vocab: Vocab; official: string; onDone: () => void }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [o, setO] = React.useState({ crs: '', idField: '', landUseField: '', method: 'cadastral-import' });
  const [result, setResult] = React.useState<(ParcelImport & { dryRun: boolean; fields: string[] }) | null>(null);
  const [loads, setLoads] = React.useState<ParcelImport[]>([]);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [why, setWhy] = React.useState<Record<string, string>>({});
  const reload = React.useCallback(async () => { try { setLoads((await callApi<{ imports: ParcelImport[] }>('/api/parcels/import')).imports); } catch { setLoads([]); } }, []);
  React.useEffect(() => { void reload(); }, [reload]);
  const send = async (dryRun: boolean) => {
    if (!official) { setMsg({ ok: false, text: 'Sign in or name the acting official first.' }); return; }
    if (!file) { setMsg({ ok: false, text: 'Choose the file.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('body', JSON.stringify({ ...o, by: official }));
      const r = await fetch(`/api/parcels/import${dryRun ? '?dryRun=1' : ''}`, { method: 'POST', body: form });
      const j = await r.json().catch(() => ({})) as { import?: ParcelImport & { dryRun: boolean; fields: string[] }; error?: string };
      if (!r.ok || !j.import) throw new Error(j.error ?? `Refused (${r.status})`);
      setResult(j.import);
      if (!dryRun) { setMsg({ ok: true, text: `Loaded ${j.import.accepted} of ${j.import.rows} parcels; each waits for a different official to publish it.` }); onDone(); void reload(); }
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  };
  const withdraw = async (id: string) => {
    try { await callApi(`/api/parcels/import/${encodeURIComponent(id)}`, { action: 'withdraw', reason: why[id] ?? '', by: official }); onDone(); void reload(); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  };
  return (
    <div className="space-y-3 text-[13px]">
      <p className="text-ink-soft">GeoJSON, a zipped Shapefile (.zip with its .shp, .dbf, .prj and .cpg) or a GeoPackage (.gpkg). A Shapefile&rsquo;s .prj or a GeoPackage&rsquo;s coordinate system is converted on the server; GeoJSON in a national grid needs its EPSG code. Columns: parcel id (parcel_id, upi, pin, lr_no …), land use, and optionally accuracy, plan reference, holder, holder kind, right, share and document.</p>
      <div className="grid gap-3 sm:grid-cols-5">
        <label className={label}>File<input type="file" accept=".geojson,.json,.zip,.gpkg" className="mt-1 block" onChange={e => { setFile(e.currentTarget.files?.[0] ?? null); setResult(null); }} /></label>
        <label className={label}>Coordinate system (GeoJSON only)<input className={`${input} mt-1`} value={o.crs} onChange={e => setO({ ...o, crs: e.currentTarget.value })} placeholder="EPSG:21037" /></label>
        <label className={label}>Parcel id column<input className={`${input} mt-1`} value={o.idField} onChange={e => setO({ ...o, idField: e.currentTarget.value })} placeholder={result?.fields[0] ?? 'detected'} /></label>
        <label className={label}>Land use column<input className={`${input} mt-1`} value={o.landUseField} onChange={e => setO({ ...o, landUseField: e.currentTarget.value })} placeholder="detected" /></label>
        <label className={label}>Survey method<select className={`${input} mt-1`} value={o.method} onChange={e => setO({ ...o, method: e.currentTarget.value })}>{vocab.methods.filter(m => vocab.policy.methods.includes(m.key)).map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</select></label>
      </div>
      <div className="flex gap-2">
        <button type="button" className={btn} disabled={busy} onClick={() => void send(true)}>Check the file</button>
        <button type="button" className={btn} disabled={busy || !result?.dryRun} onClick={() => void send(false)}>Load it</button>
      </div>
      <Msg msg={msg} />
      {result ? (
        <div aria-live="polite">
          <p>{result.dryRun ? 'Checked (nothing recorded)' : 'Loaded'}: {result.accepted} of {result.rows} parcels accepted{result.crs ? `, converted from ${result.crs.name}` : ''}. Columns: {result.fields.join(', ') || '—'}.</p>
          {result.notes.length ? <ul className="list-disc ps-5 text-ink-muted">{result.notes.map((n, i) => <li key={i}>{n}</li>)}</ul> : null}
          {result.refused.length ? <ul className="list-disc ps-5 text-alert">{result.refused.slice(0, 30).map((r, i) => <li key={i}>Row {r.row}: {r.reason}</li>)}</ul> : null}
        </div>
      ) : null}
      {loads.length ? (
        <table className="w-full text-[12px]">
          <caption className="text-start font-semibold">Loads</caption>
          <thead><tr className="border-b border-line text-ink-muted"><th className="text-start">When</th><th className="text-start">By</th><th className="text-start">Parcels</th><th className="text-start">File SHA-256</th><th className="text-start">Withdraw</th></tr></thead>
          <tbody>{loads.map(l => (
            <tr key={l.id} className="border-b border-line-soft align-top">
              <td>{when(l.at)}</td><td>{l.by}</td><td>{l.accepted} of {l.rows}</td><td className="font-mono">{l.sha256.slice(0, 16)}…</td>
              <td>{l.withdrawn ? `Withdrawn (${l.withdrawn.count}): ${l.withdrawn.reason}` : (
                <span className="flex gap-1"><input aria-label={`Reason to withdraw load ${l.id}`} className={input} value={why[l.id] ?? ''} onChange={e => setWhy({ ...why, [l.id]: e.currentTarget.value })} placeholder="Reason" />
                  <button type="button" className={btn} onClick={() => void withdraw(l.id)}>Withdraw</button></span>
              )}</td>
            </tr>
          ))}</tbody>
        </table>
      ) : null}
    </div>
  );
}

function PolicyForm({ vocab, institutions, official, onDone }: { vocab: Vocab; institutions: Institution[]; official: string; onDone: () => void }) {
  const p = vocab.policy;
  const [d, setD] = React.useState({ authorityId: p.authorityId ?? '', idPattern: p.idPattern, idExample: p.idExample, overlap: p.overlap, toleranceM2: String(p.toleranceM2), methods: p.methods as string[], reason: '' });
  const [changes, setChanges] = React.useState<ParcelPolicyChange[]>([]);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const reload = React.useCallback(async () => { try { setChanges((await callApi<{ changes: ParcelPolicyChange[] }>('/api/parcels/policy')).changes); } catch { setChanges([]); } }, []);
  React.useEffect(() => { void reload(); }, [reload]);
  const propose = async () => {
    const patch: Record<string, unknown> = {};
    if (d.authorityId !== (p.authorityId ?? '')) patch.authorityId = d.authorityId;
    if (d.idPattern !== p.idPattern) patch.idPattern = d.idPattern;
    if (d.idExample !== p.idExample) patch.idExample = d.idExample;
    if (d.overlap !== p.overlap) patch.overlap = d.overlap;
    if (Number(d.toleranceM2) !== p.toleranceM2) patch.toleranceM2 = Number(d.toleranceM2);
    if (d.methods.join() !== p.methods.join()) patch.methods = d.methods;
    try { await callApi('/api/parcels/policy', { patch, reason: d.reason, by: official }); setMsg({ ok: true, text: 'Proposed: a different administrator confirms it.' }); void reload(); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  };
  const decide = async (id: string, decision: 'confirm' | 'withdraw') => {
    try { await callApi(`/api/parcels/policy/${encodeURIComponent(id)}`, { decision, by: official }); setMsg({ ok: true, text: decision === 'confirm' ? 'The policy is changed.' : 'The proposal is withdrawn.' }); void reload(); onDone(); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  };
  return (
    <div className="space-y-3 text-[13px]">
      <p className="text-ink-soft">
        Cadastre authority: <strong className="text-ink">{vocab.authority?.name ?? 'not named yet'}</strong> · parcel id format <code className="font-mono">{p.idPattern}</code> (e.g. {p.idExample}) ·
        an overlap above {p.toleranceM2} m² with a published parcel is {p.overlap === 'refuse' ? 'refused' : 'recorded and flagged'} · gaps between parcels are not checked.
        {p.decidedBy ? ` Decided by ${p.decidedBy.join(' and ')}, ${when(p.decidedAt)}.` : ''}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={label}>Cadastre authority<select className={`${input} mt-1`} value={d.authorityId} onChange={e => setD({ ...d, authorityId: e.currentTarget.value })}><option value="">None</option>{institutions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <label className={label}>Parcel id format<input className={`${input} mt-1 font-mono`} value={d.idPattern} onChange={e => setD({ ...d, idPattern: e.currentTarget.value })} /></label>
        <label className={label}>Example id<input className={`${input} mt-1`} value={d.idExample} onChange={e => setD({ ...d, idExample: e.currentTarget.value })} /></label>
        <label className={label}>An overlap is<select className={`${input} mt-1`} value={d.overlap} onChange={e => setD({ ...d, overlap: e.currentTarget.value as 'refuse' | 'flag' })}><option value="refuse">Refused</option><option value="flag">Recorded and flagged</option></select></label>
        <label className={label}>Overlap tolerance (m²)<input className={`${input} mt-1`} inputMode="decimal" value={d.toleranceM2} onChange={e => setD({ ...d, toleranceM2: e.currentTarget.value })} /></label>
        <label className={label}>Reason<input className={`${input} mt-1`} value={d.reason} onChange={e => setD({ ...d, reason: e.currentTarget.value })} /></label>
      </div>
      <fieldset><legend className="text-ink-soft">Survey methods the nation accepts</legend>
        <div className="mt-1 flex flex-wrap gap-3">{vocab.methods.map(m => (
          <label key={m.key} className="inline-flex items-center gap-1.5"><input type="checkbox" checked={d.methods.includes(m.key)} onChange={e => setD({ ...d, methods: e.currentTarget.checked ? [...d.methods, m.key] : d.methods.filter(x => x !== m.key) })} />{m.label}</label>
        ))}</div>
      </fieldset>
      <button type="button" className={btn} onClick={() => void propose()}>Propose the change</button>
      <Msg msg={msg} />
      {changes.filter(c => c.state === 'pending').map(c => (
        <div key={c.id} className="rounded-[3px] border border-line p-2">
          <p><strong>{c.id}</strong>: {Object.keys(c.patch).join(', ')} — {c.reason} (proposed by {c.proposedBy}, {when(c.proposedAt)})</p>
          <div className="mt-1 flex gap-2">
            <button type="button" className={btn} onClick={() => void decide(c.id, 'confirm')}>Confirm (a different administrator)</button>
            <button type="button" className={btn} onClick={() => void decide(c.id, 'withdraw')}>Withdraw</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ParcelRegister() {
  const [official, setOfficial] = useOfficial();
  const institutions = useInstitutions();
  const [filter, setFilter] = React.useState({ state: 'current', landUse: '', q: '' });
  const [search, setSearch] = React.useState('');
  React.useEffect(() => { const t = setTimeout(() => setFilter(f => (f.q === search.trim() ? f : { ...f, q: search.trim() })), 300); return () => clearTimeout(t); }, [search]);
  const [round, setRound] = React.useState(0);
  const reload = React.useCallback(() => setRound(n => n + 1), []);
  const query = `state=${filter.state}${filter.landUse ? `&landUse=${encodeURIComponent(filter.landUse)}` : ''}${filter.q ? `&q=${encodeURIComponent(filter.q)}` : ''}`;
  const [data, setData] = React.useState<Vocab | null>(null);
  const [rows, setRows] = React.useState<PublicParcel[]>([]);
  const [error, setError] = React.useState('');
  const [waiting, setWaiting] = React.useState<PublicParcel[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [focus, setFocus] = React.useState<[number, number, number, number] | null>(null);
  React.useEffect(() => {
    let live = true;
    callApi<Vocab>(`/api/parcels?${query}&limit=${ROWS}`).then(j => { if (live) { setData(j); setRows(j.parcels); setError(''); } }).catch(e => { if (live) setError((e as Error).message); });
    callApi<Vocab>('/api/parcels?state=all&waiting=1&limit=200').then(j => { if (live) setWaiting(j.parcels); }).catch(() => undefined);
    return () => { live = false; };
  }, [query, round]);
  const more = async () => {
    if (!data?.page.next) return;
    const j = await callApi<Vocab>(`/api/parcels?${query}&limit=${ROWS * 4}&offset=${data.page.next}`);
    setRows(r => [...r, ...j.parcels]); setData(d => (d ? { ...d, page: j.page } : d));
  };
  const open = (p: { id: string; bbox?: [number, number, number, number] }) => { setSelected(p.id); if (p.bbox) setFocus(p.bbox); };

  if (error && !data) return <p role="alert" className="text-alert">The parcel register could not be read: {error}</p>;
  if (!data) return <p className="text-[13px] text-ink-muted">Loading the parcel register…</p>;
  const lu = (k: string) => data.landUses.find(l => l.key === k)?.label ?? k;

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 text-[14px] text-ink">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">Land parcels</h2>
          <p className="mt-1 max-w-3xl text-ink-soft">
            The nation&rsquo;s cadastre: every parcel recorded by {data.authority ? <strong className="text-ink">{data.authority.name}</strong> : 'the cadastre authority'} with its outline, how it was surveyed and the rights on it,
            and published by a second official. The area is computed from the outline; region and district come from the boundaries in force.
            Who holds a parcel is personal data, shown only to the cadastre authority and officials with need.
          </p>
        </div>
        <ActingOfficial name={official} onChange={setOfficial} />
      </header>
      {!data.authority ? <p role="status" className="rounded-[3px] border border-line p-3 text-[13px] text-warn">The nation has not named its cadastre authority yet: an administrator names it under &ldquo;How the nation runs its cadastre&rdquo; below, and a second administrator confirms it. Until then no parcel can be recorded.</p> : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Count n={data.counts.total} label="Parcels recorded" note="not withdrawn" />
        <Count n={data.counts.published} label="Published" />
        <Count n={data.counts.waiting} label="Waiting on an official" />
        <Count n={Math.round(data.counts.areaM2 / 10_000)} label="Hectares published" note="computed from the outlines" />
      </div>

      <ParcelMap version={`${round}`} selected={selected} focus={focus} onSelect={id => setSelected(id)} />

      <Panel id="waiting" title="Waiting on a second official" meta="publish a parcel, confirm a change">
        {waiting.length ? (
          <ul className="space-y-1 text-[13px]">{waiting.map(p => (
            <li key={p.id}><button type="button" className="text-link underline underline-offset-2" onClick={() => open(p)}>{p.parcelId}</button> · {STATE_WORD[p.state]} · {area(p.areaM2)} · {p.place.district ?? p.place.region ?? ''}</li>
          ))}</ul>
        ) : <p className="text-[13px] text-ink-muted">Nothing is waiting.</p>}
      </Panel>

      <Panel id="register" title="The register" meta={`${rows.length.toLocaleString()} shown of ${data.page.total.toLocaleString()} matching`}>
        <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Filter the register">
          <label className={label}>Search<input type="search" className={`${input} mt-1`} value={search} onChange={e => setSearch(e.currentTarget.value)} placeholder="Parcel id, record number, region or district" /></label>
          <label className={label}>Land use<select className={`${input} mt-1`} value={filter.landUse} onChange={e => setFilter({ ...filter, landUse: e.currentTarget.value })}><option value="">All</option>{data.landUses.map(l => <option key={l.key} value={l.key}>{l.label}{data.counts.byLandUse[l.key] ? ` (${data.counts.byLandUse[l.key]})` : ''}</option>)}</select></label>
          <label className={label}>Stage<select className={`${input} mt-1`} value={filter.state} onChange={e => setFilter({ ...filter, state: e.currentTarget.value })}>
            <option value="current">Published and waiting</option><option value="published">Published</option><option value="proposed">Waiting to be published</option><option value="withdrawn">Withdrawn</option>
          </select></label>
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <caption className="sr-only">Land parcels: id, land use, area, where, survey and stage</caption>
              <thead><tr className="border-b border-line text-ink-muted">
                <th className="py-1 text-start font-semibold">Parcel</th><th className="text-start font-semibold">Land use</th><th className="text-end font-semibold">Area</th>
                <th className="text-start font-semibold">Where</th><th className="text-start font-semibold">Survey</th><th className="text-start font-semibold">Stage</th>
              </tr></thead>
              <tbody>{rows.map(p => (
                <tr key={p.id} className={`border-b border-line-soft align-top ${selected === p.id ? 'bg-surface-2' : ''}`}>
                  <td className="py-1.5"><button type="button" className="font-semibold text-link underline-offset-2 hover:underline" onClick={() => open(p)}>{p.parcelId}</button><span className="block font-mono text-[12px] text-ink-muted">{p.id}</span></td>
                  <td>{lu(p.landUse)}</td>
                  <td className="text-end font-mono tabular-nums">{area(p.areaM2)}</td>
                  <td>{p.place.region ?? '—'}{p.place.district ? <span className="block text-[12px] text-ink-muted">{p.place.district}</span> : null}</td>
                  <td>{data.methods.find(m => m.key === p.survey.method)?.label}<span className="block text-[12px] text-ink-muted">±{p.survey.accuracyM} m</span></td>
                  <td>{STATE_WORD[p.state]}{p.overlaps.length ? <span className="block text-[12px] text-warn">overlap flagged</span> : null}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="text-[13px] text-ink-muted">No parcel matches. The cadastre authority records parcels below or loads them from a file; nothing is invented or seeded.</p>}
        {data.page.next !== null ? <button type="button" className={btn} onClick={() => void more()}>Show more</button> : null}
        {selected ? <ParcelDetail key={selected} id={selected} vocab={data} official={official} onChanged={reload} onClose={() => setSelected(null)} /> : null}
      </Panel>

      <Panel id="record" title="Record a parcel" meta="recorded as waiting; a different official publishes it">
        <RecordForm vocab={data} official={official} onDone={reload} />
      </Panel>

      <Panel id="load" title="Load parcels from a file" meta="checked first; nothing changes until you load">
        <ImportForm vocab={data} official={official} onDone={reload} />
      </Panel>

      <Panel id="policy" title="How the nation runs its cadastre" meta={`policy version ${data.policy.version}`}>
        <PolicyForm key={data.policy.version} vocab={data} institutions={institutions} official={official} onDone={reload} />
      </Panel>
    </div>
  );
}
