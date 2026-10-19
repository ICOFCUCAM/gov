'use client';

// National Twin (/gov/twin): the twin's register, its sources and what it knew
// when (lib/twin/register.ts). Officials register a source (a statistics office
// CSV on its own website, or an upload for air-gapped nations), run imports and
// see every refused row with its reason, and look up the state of any metric
// as of any date, and withdraw an import with a reason. The Metrics tab
// (?tab=metrics) defines what each metric means, its unit and how regions
// combine. Every figure here is observed; nothing is generated.

import * as React from 'react';
import { TwinTerritory } from '@/components/features/twin/TwinTerritory';
import { TwinScenarios } from '@/components/features/twin/TwinScenarios';
import { TwinMetrics } from '@/components/features/twin/TwinMetrics';

type Tab = 'facts' | 'metrics';
const TABS: { id: Tab; label: string }[] = [{ id: 'facts', label: 'Facts and sources' }, { id: 'metrics', label: 'Metrics' }];

interface Entity { id: string; kind: string; name: string; code?: string; region?: boolean }
interface Source { id: string; name: string; publisher: string; kind: 'csv-url' | 'csv-upload'; url?: string; schedule: string; registeredBy: string; registeredAt: string; lastRun?: string; mapping: { entity: string; value: string; metric: { column: string } | { fixed: string } } }
interface Run { id: string; sourceId: string; at: string; by: string; status: 'ok' | 'partial' | 'failed'; rows: number; accepted: number; rejected: { row: number; reason: string }[]; error?: string; withdrawn?: { at: string; by: string; reason: string } }
interface Obs { entityId: string; metric: string; value: number; unit: string; validFrom: string; recordedAt: string; sourceId: string; runId: string }
/** The national figure for a metric, or why there is none (lib/twin/register.ts nationalTotal). */
interface National { value: number | null; unit?: string; source: string; coverage: { have: number; of: number }; vintage?: { oldest: string; newest: string }; aggregation?: string; refused?: string }

const input = 'w-full rounded-[3px] border border-line bg-surface-2 px-2.5 py-2 text-[13px] text-ink placeholder:text-ink-muted focus-ring';
const label = 'block text-[12px] font-semibold text-ink-soft';
const btn = 'focus-ring rounded-[3px] border border-line px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-surface-2 disabled:opacity-50';
const when = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—');
const STATUS = { ok: 'text-ok', partial: 'text-warn', failed: 'text-alert' } as const;

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { 'content-type': 'application/json' }, cache: 'no-store' });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d as { error?: string }).error ?? `Request failed (${r.status})`);
  return d as T;
}

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[3px] border border-line bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink">{title}</h2>
        {aside ? <div className="text-[12px] text-ink-muted">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function TwinWorkspace() {
  const [entities, setEntities] = React.useState<Entity[]>([]);
  const [data, setData] = React.useState<{ sources: Source[]; runs: Run[]; regions: number; metrics: { metric: string; coverage: { have: number; of: number } }[] } | null>(null);
  const [by, setBy] = React.useState('');
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  // One metric and date for the table, the territory and the scenario form.
  const [metric, setMetric] = React.useState('');
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = React.useState<Obs[] | null>(null);
  const [national, setNational] = React.useState<National | null>(null);
  const [dates, setDates] = React.useState<string[]>([]);
  // Off: what was true on the date, as known now. On: only what had been recorded by that date.
  const [knownThen, setKnownThen] = React.useState(false);
  // Tabs of this page (?tab=metrics opens the metric definitions).
  const [tab, setTab] = React.useState<Tab>('facts');
  React.useEffect(() => { if (new URLSearchParams(window.location.search).get('tab') === 'metrics') setTab('metrics'); }, []);
  const choose = (t: Tab) => {
    setTab(t);
    const u = new URL(window.location.href);
    if (t === 'facts') u.searchParams.delete('tab'); else u.searchParams.set('tab', t);
    window.history.replaceState(null, '', u.toString());
  };

  const load = React.useCallback(async () => {
    const [e, s] = await Promise.all([call<{ entities: Entity[] }>('/api/twin/entities'), call<NonNullable<typeof data>>('/api/twin/sources')]);
    setEntities(e.entities); setData(s);
  }, []);
  React.useEffect(() => { void load().catch(err => setMsg({ ok: false, text: (err as Error).message })); }, [load]);

  async function act(done: string, fn: () => Promise<unknown>) {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: done }); await load(); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  }

  const metrics = data?.metrics.map(x => x.metric) ?? [];
  const m = metric || metrics[0] || '';
  React.useEffect(() => {
    if (!m) return;
    const known = knownThen ? `${date}T23:59:59Z` : new Date().toISOString();
    void call<{ observations: Obs[]; national?: National | null }>(`/api/twin/state?metric=${encodeURIComponent(m)}&asOf=${encodeURIComponent(`${date}T23:59:59Z`)}&knownAt=${encodeURIComponent(known)}`).then(r => { setObs(r.observations); setNational(r.national ?? null); }).catch(() => { setObs([]); setNational(null); });
  }, [m, date, data, knownThen]);
  React.useEffect(() => {
    if (!m) return;
    void call<{ dates: string[] }>(`/api/twin/timeline?metric=${encodeURIComponent(m)}`).then(r => setDates(r.dates)).catch(() => setDates([]));
  }, [m, data]);

  const counts = entities.reduce<Record<string, number>>((m, e) => ({ ...m, [e.kind]: (m[e.kind] ?? 0) + 1 }), {});
  const nameOf = new Map(entities.map(e => [e.id, e.name]));
  const sourceName = new Map((data?.sources ?? []).map(s => [s.id, s.name]));

  return (
    <div className="mx-auto max-w-[1280px] space-y-4 text-[13px] text-ink">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight">National Twin</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-ink-soft">
            The nation's places and institutions, the sources that report on them, and every fact with when it was true and when it was recorded.
            Figures elsewhere in the console are marked <span className="font-semibold">Sample</span> until a source here reports them.
          </p>
          <p className="mt-1 text-[12px] text-ink-muted">
            For GIS tools: the subdivisions with their observed values as <a className="text-link underline underline-offset-2" href="/api/twin/ogc">OGC API – Features</a> (GeoJSON, CRS84).
          </p>
        </div>
        <label className="w-full max-w-xs">
          <span className={label}>Your name (official)</span>
          <input className={`${input} mt-1`} value={by} onChange={e => setBy(e.currentTarget.value)} placeholder="e.g. Director of Statistics" />
        </label>
      </header>
      {msg ? <p role="status" className={`text-[13px] ${msg.ok ? 'text-ok' : 'text-alert'}`}>{msg.text}</p> : null}

      <div role="tablist" aria-label="National data" className="flex gap-1 border-b border-line">
        {TABS.map(t => (
          <button key={t.id} type="button" role="tab" id={`twin-tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`twin-panel-${t.id}`}
            className={`focus-ring -mb-px border-b-2 px-3 py-2 text-[13px] font-semibold ${tab === t.id ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}
            onClick={() => choose(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'metrics' ? (
        <div role="tabpanel" id="twin-panel-metrics" aria-labelledby="twin-tab-metrics"><TwinMetrics by={by} onChange={() => void load()} /></div>
      ) : (
      <div role="tabpanel" id="twin-panel-facts" aria-labelledby="twin-tab-facts" className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Register" aside="stable ids">
          <dl className="grid grid-cols-2 gap-y-1.5">
            {[['Nation', counts.nation], ['Places (ISO 3166-2)', counts.place], ['Operational regions', data?.regions], ['Institutions', counts.institution], ['Facilities', counts.facility]].map(([k, v]) => (
              <React.Fragment key={String(k)}><dt className="text-ink-soft">{k}</dt><dd className="text-right font-mono tabular-nums">{v ?? 0}</dd></React.Fragment>
            ))}
          </dl>
        </Section>
        <Section title="Metrics observed" aside="coverage of the regions">
          {data?.metrics.length ? (
            <ul className="space-y-1.5">
              {data.metrics.map(m => (
                <li key={m.metric} className="flex items-center justify-between gap-2">
                  <span className="font-mono">{m.metric}</span>
                  <span className={m.coverage.have === m.coverage.of && m.coverage.of > 0 ? 'text-ok' : 'text-warn'}>{m.coverage.have}/{m.coverage.of} regions</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-ink-soft">Nothing observed yet. Register a source and run it.</p>}
        </Section>
        <AsOf metrics={metrics} metric={m} setMetric={setMetric} date={date} setDate={setDate} knownThen={knownThen} setKnownThen={setKnownThen} rows={obs} national={national} nameOf={nameOf} sourceName={sourceName} />
      </div>

      <Section title="Territory" aside={m ? `${m} · as of ${date}` : 'no metric observed yet'}>
        {m ? <TwinTerritory metric={m} obs={obs ?? []} entities={entities} dates={dates} date={date} onDate={setDate} />
          : <p className="text-ink-soft">The map shades the nation's subdivisions once a source reports a metric for them.</p>}
      </Section>

      <Section title="Scenarios" aside="versioned · evidence hash · modelled, never observed">
        {metrics.length ? <TwinScenarios by={by} metrics={metrics} metric={m} date={date} entities={entities} />
          : <p className="text-ink-soft">Scenarios start from observed values; register a source first.</p>}
      </Section>

      <LinkKey entities={entities} by={by} busy={busy} act={act} />

      <RegisterSource by={by} busy={busy} act={act} />

      <Section title="Sources" aside={`${data?.sources.length ?? 0} registered`}>
        {data?.sources.length ? (
          <ul className="divide-y divide-line">
            {data.sources.map(s => <SourceRow key={s.id} s={s} by={by} busy={busy} act={act} />)}
          </ul>
        ) : <p className="text-ink-soft">No sources yet.</p>}
      </Section>

      <Section title="Imports" aside="lineage of every observation">
        {data?.runs.length ? (
          <ul className="space-y-2">
            {data.runs.slice(0, 20).map(r => (
              <li key={r.id} className="rounded-[3px] border border-line px-3 py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span><span className={`font-semibold uppercase ${STATUS[r.status]}`}>{r.status}</span> · {sourceName.get(r.sourceId) ?? r.sourceId} · {r.accepted} of {r.rows} rows accepted</span>
                  <span className="font-mono text-[12px] text-ink-muted">{r.id} · {when(r.at)} · {r.by}</span>
                </div>
                {r.error ? <p className="mt-1 text-alert">{r.error}</p> : null}
                {r.rejected.length ? (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-ink-soft">{r.rejected.length}{r.rows - r.accepted > r.rejected.length ? '+' : ''} rows refused</summary>
                    <ul className="mt-1 space-y-0.5 text-[12px] text-ink-soft">{r.rejected.map(x => <li key={x.row}>Row {x.row}: {x.reason}</li>)}</ul>
                  </details>
                ) : null}
                <Withdraw run={r} by={by} busy={busy} act={act} />
              </li>
            ))}
          </ul>
        ) : <p className="text-ink-soft">No imports yet.</p>}
      </Section>
      </div>
      )}
    </div>
  );
}

/** Withdraw an import (a correction): its observations are superseded from now, never deleted. */
function Withdraw({ run, by, busy, act }: { run: Run; by: string; busy: boolean; act: (done: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  if (run.withdrawn) return <p className="mt-1 text-[12px] text-warn">Withdrawn {when(run.withdrawn.at)} by {run.withdrawn.by}: {run.withdrawn.reason}</p>;
  if (!run.accepted) return null;
  if (!open) return <button type="button" className={`${btn} mt-1`} disabled={busy || !by.trim()} onClick={() => setOpen(true)}>Withdraw this import</button>;
  return (
    <form className="mt-1 flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); void act(`Import ${run.id} withdrawn; its values are no longer used`, () => call(`/api/twin/runs/${run.id}/withdraw`, { method: 'POST', body: JSON.stringify({ by, reason }) })); }}>
      <label className="min-w-[16rem] flex-1"><span className={label}>Why is it withdrawn?</span><input className={`${input} mt-1`} value={reason} onChange={e => setReason(e.currentTarget.value)} placeholder="e.g. figures keyed against the wrong year" /></label>
      <button className={btn} disabled={busy || !by.trim() || reason.trim().length < 4}>Withdraw</button>
      <button type="button" className={btn} onClick={() => setOpen(false)}>Cancel</button>
      <span className="w-full text-[12px] text-ink-muted">Its {run.accepted} values stay on record for what was known before now, and are no longer used from now on.</span>
    </form>
  );
}

function RegisterSource({ by, busy, act }: { by: string; busy: boolean; act: (done: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const [f, setF] = React.useState({ name: '', publisher: '', kind: 'csv-upload', url: '', entity: 'region', value: 'value', metricMode: 'fixed', metric: 'population', unit: 'persons', date: 'year', validTo: '', status: '', stdErr: '', schedule: 'manual' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { const v = e.currentTarget.value; setF(x => ({ ...x, [k]: v })); };
  const submit = () => act('Source registered', () => call('/api/twin/sources', {
    method: 'POST',
    body: JSON.stringify({
      by, name: f.name, publisher: f.publisher, kind: f.kind, url: f.url || undefined, schedule: f.schedule,
      mapping: {
        entity: f.entity, value: f.value,
        metric: f.metricMode === 'fixed' ? { fixed: f.metric } : { column: f.metric },
        ...(f.unit ? { unit: { fixed: f.unit } } : {}),
        ...(f.date ? { date: /^\d{4}(-\d{2}(-\d{2})?)?$/.test(f.date) ? { fixed: f.date } : { column: f.date } } : {}),
        ...(f.validTo ? { validTo: { column: f.validTo } } : {}),
        ...(f.status || f.stdErr ? { quality: { ...(f.status ? { status: { column: f.status } } : {}), ...(f.stdErr ? { stdErr: { column: f.stdErr } } : {}) } } : {}),
      },
    }),
  }));
  const F = ({ k, l, hint, ph }: { k: keyof typeof f; l: string; hint?: string; ph?: string }) => (
    <label className="block"><span className={label}>{l}</span><input className={`${input} mt-1`} value={f[k]} onChange={set(k)} placeholder={ph} />{hint ? <span className="mt-0.5 block text-[12px] text-ink-muted">{hint}</span> : null}</label>
  );
  return (
    <Section title="Register a source" aside="named official · audited">
      <div className="grid gap-3 md:grid-cols-3">
        {F({ k: 'name', l: 'Name', ph: 'Population by region, census 2024' })}
        {F({ k: 'publisher', l: 'Publisher', ph: 'National Statistics Office' })}
        <label className="block"><span className={label}>How it arrives</span>
          <select className={`${input} mt-1`} value={f.kind} onChange={set('kind')}>
            <option value="csv-upload">CSV uploaded here (works offline)</option>
            <option value="csv-url">CSV at the publisher's address</option>
          </select>
        </label>
        {f.kind === 'csv-url' ? F({ k: 'url', l: 'CSV address', hint: 'Fetched only from this host, by the platform\'s server, within size and time limits.', ph: 'https://stats.example.gov/population.csv' }) : null}
        {f.kind === 'csv-url' ? (
          <label className="block"><span className={label}>Schedule</span>
            <select className={`${input} mt-1`} value={f.schedule} onChange={set('schedule')}><option value="manual">When run by hand</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select>
          </label>
        ) : null}
        {F({ k: 'entity', l: 'Column with the place or institution', hint: 'Its ISO 3166-2 code, its name, or the publisher\'s own id (link ids below).' })}
        {F({ k: 'value', l: 'Column with the value' })}
        <label className="block"><span className={label}>Metric</span>
          <span className="mt-1 flex gap-2">
            <select className={`${input} w-40`} value={f.metricMode} onChange={set('metricMode')} aria-label="Metric is"><option value="fixed">One metric</option><option value="column">From a column</option></select>
            <input className={input} value={f.metric} onChange={set('metric')} aria-label={f.metricMode === 'fixed' ? 'Metric name' : 'Metric column'} />
          </span>
        </label>
        {F({ k: 'unit', l: 'Unit', ph: 'persons' })}
        {F({ k: 'date', l: 'Date: a column, or one year or date for the file', ph: 'year or 2024' })}
        {F({ k: 'validTo', l: 'Column with the end date (optional)', hint: 'For values true over a period; empty cells mean still true.' })}
        {F({ k: 'status', l: 'Column with the status (optional)', hint: 'provisional, final or revised' })}
        {F({ k: 'stdErr', l: 'Column with the standard error (optional)' })}
      </div>
      <div className="mt-3"><button type="button" className={btn} disabled={busy || !by.trim() || !f.name.trim() || !f.publisher.trim()} onClick={() => void submit()}>Register source</button></div>
    </Section>
  );
}

function SourceRow({ s, by, busy, act }: { s: Source; by: string; busy: boolean; act: (done: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const file = React.useRef<HTMLInputElement>(null);
  const run = (csv?: string) => act(`Import of ${s.name} finished — see Imports`, () => call(`/api/twin/sources/${s.id}/run`, { method: 'POST', body: JSON.stringify({ by, ...(csv !== undefined ? { csv } : {}) }) }));
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="font-semibold">{s.name}</div>
        <div className="text-[12px] text-ink-soft">{s.publisher} · {s.kind === 'csv-url' ? s.url : 'uploaded'} · {s.schedule} · registered by {s.registeredBy} · last run {when(s.lastRun)}</div>
      </div>
      <div className="flex items-center gap-2">
        {s.kind === 'csv-url' ? <button type="button" className={btn} disabled={busy || !by.trim()} onClick={() => void run()}>Run now</button> : null}
        <label className={`${btn} cursor-pointer ${busy || !by.trim() ? 'pointer-events-none opacity-50' : ''}`}>
          Upload CSV
          <input ref={file} type="file" accept=".csv,text/csv,text/plain" className="sr-only" disabled={busy || !by.trim()}
            onChange={async e => { const f = e.currentTarget.files?.[0]; if (f) await run(await f.text()); if (file.current) file.current.value = ''; }} />
        </label>
      </div>
    </li>
  );
}

function AsOf({ metrics, metric: m, setMetric, date, setDate, knownThen, setKnownThen, rows, national, nameOf, sourceName }: {
  metrics: string[]; metric: string; setMetric: (v: string) => void; date: string; setDate: (v: string) => void;
  knownThen: boolean; setKnownThen: (v: boolean) => void;
  rows: Obs[] | null; national: National | null; nameOf: Map<string, string>; sourceName: Map<string, string>;
}) {
  return (
    <Section title="As of" aside={knownThen ? 'what was known on the date' : 'true on the date, as known now'}>
      <div className="flex gap-2">
        <select className={input} value={m} onChange={e => setMetric(e.currentTarget.value)} aria-label="Metric">{metrics.map(x => <option key={x}>{x}</option>)}</select>
        <input type="date" className={input} value={date} onChange={e => setDate(e.currentTarget.value)} aria-label="As of date" />
      </div>
      <label className="mt-2 flex items-center gap-2 text-[12px] text-ink-soft">
        <input type="checkbox" checked={knownThen} onChange={e => setKnownThen(e.currentTarget.checked)} />
        Only what had been recorded by that date
      </label>
      {national ? (
        national.value !== null ? (
          <p className="mt-2 text-[12px]">
            <span className="font-semibold">Nation</span>: <span className="font-mono tabular-nums">{national.value.toLocaleString('en', { maximumFractionDigits: 2 })} {national.unit}</span>
            <span className="text-ink-muted"> · {national.aggregation === 'national' ? 'recorded for the nation' : `${national.aggregation} of ${national.coverage.have} regions`}{national.vintage ? ` · true ${national.vintage.oldest === national.vintage.newest ? `from ${national.vintage.oldest}` : `${national.vintage.oldest} to ${national.vintage.newest}`}` : ''}</span>
          </p>
        ) : <p className="mt-2 text-[12px] text-warn">No national figure: {national.refused}</p>
      ) : null}
      {rows?.length ? (
        <table className="mt-2 w-full text-[12px]">
          <thead><tr className="text-left text-ink-muted"><th className="font-semibold">Entity</th><th className="text-right font-semibold">Value</th><th className="pl-2 font-semibold">True from</th></tr></thead>
          <tbody>{rows.slice(0, 60).map(o => (
            <tr key={`${o.entityId}${o.metric}`} title={`${sourceName.get(o.sourceId) ?? o.sourceId} · ${o.runId} · recorded ${when(o.recordedAt)}`}>
              <td>{nameOf.get(o.entityId) ?? o.entityId}</td><td className="text-right font-mono tabular-nums">{o.value.toLocaleString('en')} {o.unit}</td><td className="pl-2 font-mono">{o.validFrom}</td>
            </tr>
          ))}</tbody>
        </table>
      ) : <p className="mt-2 text-ink-soft">{m ? 'Nothing known for that date.' : 'No metrics yet.'}</p>}
    </Section>
  );
}

/** The crosswalk: the id another system (a statistics office, a ministry's case system) uses for a twin entity. */
function LinkKey({ entities, by, busy, act }: { entities: Entity[]; by: string; busy: boolean; act: (done: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const [f, setF] = React.useState({ entityId: '', system: '', key: '' });
  const pick = f.entityId || entities.find(e => e.kind === 'institution')?.id || entities[0]?.id || '';
  return (
    <Section title="Link an id from another system" aside="crosswalk · named official · audited">
      <form className="grid gap-2 md:grid-cols-4" onSubmit={e => { e.preventDefault(); void act(`Linked ${f.system}:${f.key}`, () => call('/api/twin/keys', { method: 'POST', body: JSON.stringify({ ...f, entityId: pick, by }) })); }}>
        <label><span className={label}>Entity</span>
          <select className={`${input} mt-1`} value={pick} onChange={e => setF({ ...f, entityId: e.currentTarget.value })}>
            {entities.map(e => <option key={e.id} value={e.id}>{e.name} ({e.kind})</option>)}
          </select>
        </label>
        <label><span className={label}>System</span><input className={`${input} mt-1`} value={f.system} onChange={e => setF({ ...f, system: e.currentTarget.value })} placeholder="e.g. statistics-office" /></label>
        <label><span className={label}>Its id there</span><input className={`${input} mt-1`} value={f.key} onChange={e => setF({ ...f, key: e.currentTarget.value })} placeholder="e.g. 047" /></label>
        <div className="flex items-end"><button className={btn} disabled={busy || !by.trim() || !f.system.trim() || !f.key.trim()}>Link</button></div>
      </form>
    </Section>
  );
}
