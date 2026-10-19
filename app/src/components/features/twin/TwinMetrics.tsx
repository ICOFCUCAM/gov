'use client';

// The Metrics tab of National data (/gov/twin): what each metric means, its
// UCUM unit and how regional values combine into a national figure
// (lib/twin/metrics.ts, /api/twin/metrics). Officials register a metric or
// edit its definition; every change is audited with what changed. Metrics
// found in observations but never defined are shown as "not defined" and are
// never combined until someone defines them.

import * as React from 'react';

interface Metric {
  id: string; label: string; unit: string; aggregation: 'sum' | 'mean' | 'weighted-mean' | 'none';
  weightMetric?: string; sdmxConcept?: string; period: 'instant' | 'year' | 'quarter' | 'month' | 'day'; description?: string;
  origin: 'official' | 'standard' | 'observed'; registeredBy?: string; registeredAt?: string; updatedBy?: string; updatedAt?: string;
}

const input = 'w-full rounded-[3px] border border-line bg-surface-2 px-2.5 py-2 text-[13px] text-ink placeholder:text-ink-muted focus-ring';
const label = 'block text-[12px] font-semibold text-ink-soft';
const btn = 'focus-ring rounded-[3px] border border-line px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-surface-2 disabled:opacity-50';

const COMBINE: Record<Metric['aggregation'], string> = { sum: 'Added up', mean: 'Average', 'weighted-mean': 'Weighted average', none: 'Not combined' };
const ORIGIN: Record<Metric['origin'], string> = { official: 'Defined here', standard: 'Standard definition', observed: 'Not defined yet' };
const PERIOD: Record<Metric['period'], string> = { instant: 'On a date', year: 'Per year', quarter: 'Per quarter', month: 'Per month', day: 'Per day' };

const blank = { id: '', label: '', unit: '', aggregation: 'none', weightMetric: '', period: 'instant', sdmxConcept: '', description: '' };

export function TwinMetrics({ by, onChange }: { by: string; onChange?: () => void }) {
  const [list, setList] = React.useState<Metric[]>([]);
  const [units, setUnits] = React.useState<string[]>([]);
  const [f, setF] = React.useState(blank);
  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  const load = React.useCallback(async () => {
    const r = await fetch('/api/twin/metrics', { cache: 'no-store' });
    if (!r.ok) return;
    const d = (await r.json()) as { metrics: Metric[]; units: string[] };
    setList(d.metrics); setUnits(d.units);
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { const v = e.currentTarget.value; setF(x => ({ ...x, [k]: v })); };
  const edit = (m: Metric) => {
    setEditing(true);
    setF({ id: m.id, label: m.origin === 'observed' ? '' : m.label, unit: m.origin === 'observed' ? '' : m.unit, aggregation: m.aggregation, weightMetric: m.weightMetric ?? '', period: m.period, sdmxConcept: m.sdmxConcept ?? '', description: m.description ?? '' });
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/twin/metrics', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...f, by }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d as { error?: string }).error ?? `Request failed (${r.status})`);
      setMsg({ ok: true, text: editing ? `Definition of ${f.id} saved.` : `Metric ${f.id} registered.` });
      setF(blank); setEditing(false);
      await load(); onChange?.();
    } catch (err) { setMsg({ ok: false, text: (err as Error).message }); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[3px] border border-line bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink">Metrics</h2>
          <span className="text-[12px] text-ink-muted">what each figure means · its unit · how regions combine</span>
        </div>
        {list.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-ink-muted">
                  <th className="py-1 text-start font-semibold">Metric</th><th className="text-start font-semibold">Unit</th>
                  <th className="text-start font-semibold">Regions combine</th><th className="text-start font-semibold">Period</th>
                  <th className="text-start font-semibold">Statistics code</th><th className="text-start font-semibold">Definition</th><th />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map(m => (
                  <tr key={m.id}>
                    <td className="py-1.5 pe-2"><span className="font-semibold">{m.label}</span> <span className="font-mono text-ink-muted">{m.id}</span></td>
                    <td className="pe-2 font-mono">{m.unit}</td>
                    <td className="pe-2">{COMBINE[m.aggregation]}{m.weightMetric ? ` by ${m.weightMetric}` : ''}</td>
                    <td className="pe-2">{PERIOD[m.period]}</td>
                    <td className="pe-2 font-mono">{m.sdmxConcept ?? '—'}</td>
                    <td className={`pe-2 ${m.origin === 'observed' ? 'text-warn' : 'text-ink-soft'}`} title={m.registeredBy ? `Registered by ${m.registeredBy}${m.updatedBy ? `, last changed by ${m.updatedBy}` : ''}` : undefined}>{ORIGIN[m.origin]}</td>
                    <td className="text-end"><button type="button" className={btn} onClick={() => edit(m)}>{m.origin === 'official' ? 'Edit' : 'Define'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-ink-soft">No metrics yet.</p>}
      </section>

      <section className="rounded-[3px] border border-line bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink">{editing ? `Edit ${f.id}` : 'Register a metric'}</h2>
          <span className="text-[12px] text-ink-muted">named official · audited</span>
        </div>
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
          <label><span className={label}>Name in the data</span><input className={`${input} mt-1`} value={f.id} onChange={set('id')} readOnly={editing} placeholder="e.g. hospital_beds" /></label>
          <label><span className={label}>Label</span><input className={`${input} mt-1`} value={f.label} onChange={set('label')} placeholder="e.g. Hospital beds" /></label>
          <label><span className={label}>Unit (UCUM code)</span>
            <input className={`${input} mt-1`} value={f.unit} onChange={set('unit')} list="twin-units" placeholder="e.g. {beds}, km2, %" />
            <datalist id="twin-units">{units.map(u => <option key={u} value={u} />)}</datalist>
            <span className="mt-0.5 block text-[12px] text-ink-muted">Counted things in braces, e.g. {'{persons}'}; currencies as {'{KES}'}.</span>
          </label>
          <label><span className={label}>How regions combine into the nation</span>
            <select className={`${input} mt-1`} value={f.aggregation} onChange={set('aggregation')}>
              <option value="sum">Add them up (counts, stocks)</option>
              <option value="mean">Average of the regions</option>
              <option value="weighted-mean">Weighted average (rates)</option>
              <option value="none">Do not combine (indexes)</option>
            </select>
          </label>
          {f.aggregation === 'weighted-mean' ? (
            <label><span className={label}>Weighted by</span>
              <select className={`${input} mt-1`} value={f.weightMetric} onChange={set('weightMetric')}>
                <option value="">Choose a metric</option>
                {list.filter(m => m.id !== f.id).map(m => <option key={m.id} value={m.id}>{m.label} ({m.id})</option>)}
              </select>
            </label>
          ) : null}
          <label><span className={label}>Period a value covers</span>
            <select className={`${input} mt-1`} value={f.period} onChange={set('period')}>
              {(Object.keys(PERIOD) as Metric['period'][]).map(p => <option key={p} value={p}>{PERIOD[p]}</option>)}
            </select>
          </label>
          <label><span className={label}>Statistics office code (optional)</span><input className={`${input} mt-1`} value={f.sdmxConcept} onChange={set('sdmxConcept')} placeholder="e.g. SP_POP_TOTL" /></label>
          <label className="md:col-span-2"><span className={label}>Description (optional)</span><input className={`${input} mt-1`} value={f.description} onChange={set('description')} /></label>
          <div className="flex items-end gap-2 md:col-span-3">
            <button className={btn} disabled={busy || !by.trim() || !f.id.trim() || !f.label.trim() || !f.unit.trim()}>{editing ? 'Save definition' : 'Register metric'}</button>
            {editing ? <button type="button" className={btn} onClick={() => { setF(blank); setEditing(false); }}>Cancel</button> : null}
          </div>
          {!by.trim() ? <p className="text-[12px] text-warn md:col-span-3">Enter your name at the top of the page first.</p> : null}
          {msg ? <p role="status" className={`text-[12px] md:col-span-3 ${msg.ok ? 'text-ok' : 'text-alert'}`}>{msg.text}</p> : null}
        </form>
      </section>
    </div>
  );
}
