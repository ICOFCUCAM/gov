'use client';

// Load an institution's existing site data: a spreadsheet saved as CSV, a
// GeoJSON file of points, or GPX waypoints from a survey receiver or phone.
// The file is checked first (nothing changes): what would be loaded and every
// refused row with its reason. Loading proposes each accepted site; a
// different official publishes them. API: /api/org/ministries/{id}/facilities/import.

import * as React from 'react';
import { useOfficial, useSignIn } from '@/lib/official';
import { Msg, btn, callApi, input, label, type CaptureMethod, type FacilityImport, type Institution, type Vocabulary } from './shared';

interface Template { columns: { name: string; required: boolean; means: string; aliases: readonly string[] }[]; maxRows: number; formats: string[] }
type Result = FacilityImport & { dryRun: boolean; preview: { row: number; name: string; category: string; region?: string; warnings: string[] }[] };

const FILE_METHODS: CaptureMethod[] = ['survey-import', 'gnss-survey', 'system-feed', 'imagery', 'cadastre', 'national-grid', 'typed'];

export function ImportPanel({ vocab, institutions, fixedMinistry, onLoaded }: { vocab: Vocabulary; institutions: Institution[]; fixedMinistry?: string; onLoaded: () => Promise<void> | void }) {
  const [official] = useOfficial();
  const own = useSignIn()?.official?.institution;
  const [inst, setInst] = React.useState(fixedMinistry ?? own ?? '');
  const [template, setTemplate] = React.useState<Template | null>(null);
  const [file, setFile] = React.useState<{ name: string; text: string; format: 'csv' | 'geojson' | 'gpx' } | null>(null);
  const [method, setMethod] = React.useState<CaptureMethod | ''>('');
  const [result, setResult] = React.useState<Result | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [picker, setPicker] = React.useState(0);
  React.useEffect(() => { if (!fixedMinistry && own) setInst(own); }, [own, fixedMinistry]);
  React.useEffect(() => { if (!inst) return; void callApi<Template>(`/api/org/ministries/${encodeURIComponent(inst)}/facilities/import`).then(setTemplate).catch(() => setTemplate(null)); }, [inst]);
  const methods = FILE_METHODS.filter(m => vocab.policy.methods.includes(m));

  async function run(f: NonNullable<typeof file>, dryRun: boolean) {
    if (!official) { setMsg({ ok: false, text: 'Sign in or name the acting official first: every load is recorded under a person.' }); return; }
    if (!inst) { setMsg({ ok: false, text: 'Choose the institution the sites belong to.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await callApi<Result>(`/api/org/ministries/${encodeURIComponent(inst)}/facilities/import`, { text: f.text, format: f.format, dryRun, method: method || undefined, by: official });
      setResult(r);
      if (!dryRun) {
        setMsg({ ok: !!r.accepted, text: `Loaded ${r.accepted} of ${r.rows} rows from ${f.name} (fingerprint ${r.sha256.slice(0, 12)}…). Each site waits for a different official to publish it.` });
        setFile(null); setPicker(x => x + 1);
        await onLoaded();
      }
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  }

  async function choose(f: File | undefined) {
    setResult(null); setMsg(null); setFile(null);
    if (!f) return;
    if (f.size > 10_000_000) { setMsg({ ok: false, text: 'The file is larger than 10 MB: split it.' }); return; }
    const ext = f.name.toLowerCase().split('.').pop();
    const format = ext === 'gpx' ? 'gpx' : ext === 'geojson' || ext === 'json' ? 'geojson' : 'csv';
    const next = { name: f.name, text: await f.text(), format } as const;
    setFile(next);
    await run(next, true);
  }

  const name = institutions.find(m => m.id === inst)?.name ?? inst;
  return (
    <div className="space-y-3 text-[13px]">
      <div className="grid gap-3 sm:grid-cols-2">
        {fixedMinistry ? null : (
          <label className={label}>Institution the sites belong to
            <select className={`${input} mt-1`} value={inst} disabled={!!own} onChange={e => { setInst(e.currentTarget.value); setResult(null); }}>
              <option value="">Choose an institution</option>
              {institutions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
        )}
        <label className={label}>How the positions in the file were found
          <select className={`${input} mt-1`} value={method} onChange={e => setMethod(e.currentTarget.value as CaptureMethod | '')}>
            <option value="">From the file type (survey receiver file for GPX, existing survey data otherwise)</option>
            {methods.map(m => <option key={m} value={m}>{vocab.methods.find(x => x.key === m)?.label ?? m}</option>)}
          </select>
        </label>
      </div>
      {template ? (
        <details>
          <summary className="cursor-pointer text-link">Columns the file needs (spreadsheet saved as CSV; GeoJSON properties use the same names; GPX waypoints give name, type, position)</summary>
          <table className="mt-2 w-full text-[13px]">
            <thead><tr className="border-b border-line text-ink-muted"><th className="py-1 text-start font-semibold">Column</th><th className="text-start font-semibold">Needed</th><th className="text-start font-semibold">What goes in it</th></tr></thead>
            <tbody>
              {template.columns.map(c => (
                <tr key={c.name} className="border-b border-line-soft">
                  <td className="py-1 font-mono text-[12px]">{c.name}</td>
                  <td>{c.required ? 'Yes' : 'No'}</td>
                  <td className="text-ink-soft">{c.means}{c.aliases.length ? <span className="text-ink-muted"> Also read from: {c.aliases.join(', ')}.</span> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-ink-muted">Up to {template.maxRows.toLocaleString()} sites per file.</p>
        </details>
      ) : null}
      <label className={label}>Choose the file (CSV, GeoJSON or GPX)
        <input key={picker} type="file" accept=".csv,.geojson,.json,.gpx,text/csv,application/geo+json,application/json,application/gpx+xml" className="mt-1 block text-[13px]" disabled={busy || !inst} onChange={e => void choose(e.currentTarget.files?.[0])} />
        {!inst ? <span className="mt-1 block text-ink-muted">Choose the institution first.</span> : null}
      </label>
      <Msg msg={msg} />
      {result && result.dryRun && file ? (
        <div className="space-y-2 rounded-[3px] border border-line-soft p-3">
          <p><strong>{result.accepted}</strong> of {result.rows} rows in {file.name} can be loaded for {name}; {result.refused.length} refused. Nothing has changed yet.</p>
          {result.preview.length ? (
            <table className="w-full text-[13px]">
              <thead><tr className="border-b border-line text-ink-muted"><th className="py-1 text-start font-semibold">Row</th><th className="text-start font-semibold">Site</th><th className="text-start font-semibold">Kind</th><th className="text-start font-semibold">Region</th><th className="text-start font-semibold">To check</th></tr></thead>
              <tbody>
                {result.preview.slice(0, 50).map(p => (
                  <tr key={p.row} className="border-b border-line-soft">
                    <td className="py-1 font-mono">{p.row}</td><td>{p.name}</td><td>{vocab.categories.find(c => c.key === p.category)?.label ?? p.category}</td><td>{p.region ?? '—'}</td>
                    <td className="text-warn">{p.warnings.join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {result.refused.length ? (
            <div>
              <h5 className="font-semibold text-alert">Refused rows</h5>
              <ul className="list-disc ps-5">{result.refused.map(r => <li key={r.row}>Row {r.row}: {r.reason}</li>)}</ul>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button className={`${btn} border-ink`} disabled={busy || !result.accepted} onClick={() => void run(file, false)}>Load {result.accepted} site{result.accepted === 1 ? '' : 's'}</button>
            <button className={btn} onClick={() => { setFile(null); setResult(null); setPicker(x => x + 1); }}>Cancel</button>
          </div>
        </div>
      ) : null}
      {result && !result.dryRun && result.refused.length ? (
        <div><h5 className="font-semibold text-alert">Refused when loading</h5><ul className="list-disc ps-5">{result.refused.map(r => <li key={r.row}>Row {r.row}: {r.reason}</li>)}</ul></div>
      ) : null}
    </div>
  );
}
