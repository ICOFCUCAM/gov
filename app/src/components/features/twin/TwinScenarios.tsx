'use client';

// Scenarios on the twin (lib/twin/scenarios.ts): stated assumptions applied
// to what the twin knew on a date. Every version is kept with its evidence
// hash; a directive drafted from a version cites the scenario, version and
// hash, so the decision can be traced back to the same inputs.

import * as React from 'react';
import { SignalTag } from '@/components/ui/SignalTag';

interface Result { entityId: string; name: string; baseline: number; projected: number; unit: string; interval?: { low: number; high: number } }
interface Version {
  version: number; at: string; by: string; metric: string; asOf: string; horizon?: string; note?: string;
  assumptions: { entityId: string; changePct: number; range?: { low: number; high: number }; note?: string }[];
  results: Result[]; national: { baseline: number; projected: number; unit: string; interval?: { low: number; high: number } } | null; nationalNote?: string;
  evidenceHash: string; evidenceOk: boolean;
  model?: { id: string; version: string }; build?: { commit?: string; release?: string; source: string };
}
interface Calibration { version: number; entityId: string; horizon: string; projected: number; observed: number; error: number; errorPct: number | null; withinInterval?: boolean; observedValidFrom: string; observedRunId: string }
interface Scenario { id: string; name: string; createdBy: string; createdAt: string; versions: Version[]; calibration?: Calibration[] }
interface Entity { id: string; name: string; region?: boolean }

const input = 'w-full rounded-[3px] border border-line bg-surface-2 px-2.5 py-2 text-[13px] text-ink placeholder:text-ink-muted focus-ring';
const label = 'block text-[12px] font-semibold text-ink-soft';
const btn = 'focus-ring rounded-[3px] border border-line px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-surface-2 disabled:opacity-50';
const fmt = (n: number) => n.toLocaleString('en', { maximumFractionDigits: 2 });

export function TwinScenarios({ by, metrics, metric, date, entities }: { by: string; metrics: string[]; metric: string; date: string; entities: Entity[] }) {
  const [list, setList] = React.useState<Scenario[]>([]);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [f, setF] = React.useState({ name: '', metric: '', asOf: '', horizon: '', note: '' });
  const [rows, setRows] = React.useState<{ entityId: string; changePct: string; low?: string; high?: string }[]>([{ entityId: '*', changePct: '' }]);
  const [revising, setRevising] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const r = await fetch('/api/twin/scenarios', { cache: 'no-store' });
    if (r.ok) setList(((await r.json()) as { scenarios: Scenario[] }).scenarios);
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const m = f.metric || metric || metrics[0] || '';
  const asOf = f.asOf || date;
  const places = entities.filter(e => e.region);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const body = { name: f.name, by, metric: m, asOf, ...(f.horizon ? { horizon: f.horizon } : {}), note: f.note, assumptions: rows.filter(r => r.changePct.trim() !== '').map(r => ({ entityId: r.entityId, changePct: Number(r.changePct), ...(r.low?.trim() || r.high?.trim() ? { range: { low: Number(r.low || r.changePct), high: Number(r.high || r.changePct) } } : {}) })) };
      const r = await fetch(revising ? `/api/twin/scenarios/${revising}` : '/api/twin/scenarios', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d as { error?: string }).error ?? `Request failed (${r.status})`);
      setMsg({ ok: true, text: revising ? `New version of ${revising} saved.` : 'Scenario saved.' });
      setRevising(null);
      await load();
    } catch (err) { setMsg({ ok: false, text: (err as Error).message }); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="grid gap-2 rounded-[3px] border border-line p-3 md:grid-cols-4">
        <p className="text-[12px] text-ink-soft md:col-span-4">
          {revising ? <>Adding a version to <strong className="text-ink">{revising}</strong>. Earlier versions stay as they were. <button type="button" className="text-link underline" onClick={() => setRevising(null)}>Cancel</button></> : 'Start from what the twin knew on a date and state the assumptions. Results are modelled figures, never observations.'}
        </p>
        {!revising ? <label className="md:col-span-2"><span className={label}>Name</span><input className={`${input} mt-1`} value={f.name} onChange={e => setF({ ...f, name: e.currentTarget.value })} placeholder="e.g. Urban growth to the next census" /></label> : null}
        <label><span className={label}>Metric</span>
          <select className={`${input} mt-1`} value={m} onChange={e => setF({ ...f, metric: e.currentTarget.value })}>{metrics.map(x => <option key={x}>{x}</option>)}</select>
        </label>
        <label><span className={label}>Known as of</span><input type="date" className={`${input} mt-1`} value={asOf} onChange={e => setF({ ...f, asOf: e.currentTarget.value })} /></label>
        <label><span className={label}>Projected for (optional)</span><input type="date" className={`${input} mt-1`} value={f.horizon} onChange={e => setF({ ...f, horizon: e.currentTarget.value })} /><span className="mt-0.5 block text-[12px] text-ink-muted">When a value for this date is observed, the error is logged.</span></label>
        <fieldset className="space-y-1 md:col-span-4">
          <legend className={label}>Assumptions (change in %, with an optional low–high range)</legend>
          {rows.map((r, i) => (
            <div key={i} className="flex flex-wrap gap-2">
              <select aria-label={`Assumption ${i + 1}: where`} className={`${input} max-w-xs`} value={r.entityId} onChange={e => setRows(rows.map((x, j) => (j === i ? { ...x, entityId: e.currentTarget.value } : x)))}>
                <option value="*">Every region</option>
                {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input aria-label={`Assumption ${i + 1}: change in percent`} inputMode="decimal" className={`${input} max-w-[8rem]`} value={r.changePct} onChange={e => setRows(rows.map((x, j) => (j === i ? { ...x, changePct: e.currentTarget.value } : x)))} placeholder="e.g. 3.5" />
              <input aria-label={`Assumption ${i + 1}: lowest plausible change in percent`} inputMode="decimal" className={`${input} max-w-[7rem]`} value={r.low ?? ''} onChange={e => setRows(rows.map((x, j) => (j === i ? { ...x, low: e.currentTarget.value } : x)))} placeholder="low (opt.)" />
              <input aria-label={`Assumption ${i + 1}: highest plausible change in percent`} inputMode="decimal" className={`${input} max-w-[7rem]`} value={r.high ?? ''} onChange={e => setRows(rows.map((x, j) => (j === i ? { ...x, high: e.currentTarget.value } : x)))} placeholder="high (opt.)" />
              {rows.length > 1 ? <button type="button" className={btn} onClick={() => setRows(rows.filter((_, j) => j !== i))}>Remove</button> : null}
            </div>
          ))}
          <button type="button" className={btn} onClick={() => setRows([...rows, { entityId: places[0]?.id ?? '*', changePct: '' }])}>Add an assumption</button>
        </fieldset>
        <label className="md:col-span-3"><span className={label}>Note</span><input className={`${input} mt-1`} value={f.note} onChange={e => setF({ ...f, note: e.currentTarget.value })} placeholder="Why these assumptions" /></label>
        <div className="flex items-end"><button className={btn} disabled={busy || !by.trim() || !m}>{revising ? 'Save version' : 'Save scenario'}</button></div>
        {!by.trim() ? <p className="text-[12px] text-warn md:col-span-4">Enter your name at the top of the page first.</p> : null}
        {msg ? <p role="status" className={`text-[12px] md:col-span-4 ${msg.ok ? 'text-ok' : 'text-alert'}`}>{msg.text}</p> : null}
      </form>

      {list.length ? (
        <ul className="space-y-3">
          {list.map(s => {
            const v = s.versions.at(-1)!;
            const directive = `/gov/directives?compose=${encodeURIComponent(`${s.name} — on scenario ${s.id} v${v.version} (evidence ${v.evidenceHash.slice(0, 16)})`)}&kind=policy`;
            return (
              <li key={s.id} className="rounded-[3px] border border-line p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span><strong>{s.name}</strong> <span className="font-mono text-[12px] text-ink-muted">{s.id} · v{v.version} · {v.metric} as of {v.asOf} · {v.by}{v.model ? ` · model ${v.model.id} ${v.model.version}` : ''}{v.build?.commit ? ` · build ${v.build.commit.slice(0, 12)}` : v.build?.release ? ` · release ${v.build.release}` : ''}</span></span>
                  <span className="flex flex-wrap gap-2">
                    <button type="button" className={btn} onClick={() => { setRevising(s.id); setF({ ...f, metric: v.metric, asOf: v.asOf }); setRows(v.assumptions.map(a => ({ entityId: a.entityId, changePct: String(a.changePct), ...(a.range ? { low: String(a.range.low), high: String(a.range.high) } : {}) }))); }}>New version</button>
                    <a className={`${btn} no-underline`} href={directive}>Draft a directive on it</a>
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-ink-soft">
                  Assumptions: {v.assumptions.map(a => `${a.entityId === '*' ? 'every region' : (entities.find(e => e.id === a.entityId)?.name ?? a.entityId)} ${a.changePct >= 0 ? '+' : ''}${a.changePct}%${a.range ? ` (${a.range.low}% to ${a.range.high}%)` : ''}`).join(' · ')}{v.note ? ` — ${v.note}` : ''}
                </p>
                <p className="mt-1 break-all font-mono text-[11px]" title={v.model ? 'SHA-256 (v2) over the scenario id, version, metric, date, model and build, who made it and when, the assumptions and the observations it started from' : 'SHA-256 (v1) over the scenario id, version, metric, date, assumptions and the observations it started from'}>
                  <span className={v.evidenceOk ? 'text-ok' : 'text-alert'}>{v.evidenceOk ? 'Evidence verifies' : 'Evidence does not verify'}</span> · {v.evidenceHash} · <a className="text-link underline underline-offset-2" href={`/api/twin/scenarios/${s.id}/versions/${v.version}/prov`}>provenance</a>
                </p>
                <table className="mt-2 w-full text-[12px]">
                  <thead><tr className="text-start text-ink-muted"><th className="text-start font-semibold">Entity</th><th className="text-end font-semibold">Observed</th><th className="text-end font-semibold">Modelled</th>{v.results.some(r => r.interval) ? <th className="text-end font-semibold">Range <SignalTag kind="modelled" source="From the low and high ends of the stated assumptions" /></th> : null}</tr></thead>
                  <tbody>
                    {v.results.slice(0, 50).map(r => (
                      <tr key={r.entityId}><td>{r.name}</td><td className="text-end font-mono tabular-nums">{fmt(r.baseline)}</td><td className="text-end font-mono tabular-nums">{fmt(r.projected)} {r.unit}</td>{r.interval ? <td className="text-end font-mono tabular-nums"><Band i={r.interval} /></td> : null}</tr>
                    ))}
                    {v.national ? <tr className="border-t border-line font-semibold"><td>Nation (all regions)</td><td className="text-end font-mono tabular-nums">{fmt(v.national.baseline)}</td><td className="text-end font-mono tabular-nums">{fmt(v.national.projected)} {v.national.unit}</td>{v.national.interval ? <td className="text-end font-mono tabular-nums"><Band i={v.national.interval} /></td> : null}</tr> : null}
                  </tbody>
                </table>
                {!v.national && v.nationalNote ? <p className="mt-1 text-[12px] text-ink-soft">No national figure: {v.nationalNote}.</p> : null}
                <CalibrationLog entries={s.calibration ?? []} horizon={v.horizon} nameOf={id => entities.find(e => e.id === id)?.name ?? id} />
                {s.versions.length > 1 ? (
                  <details className="mt-2 text-[12px]">
                    <summary className="cursor-pointer text-ink-soft">{s.versions.length - 1} earlier version{s.versions.length > 2 ? 's' : ''}</summary>
                    <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-ink-soft">
                      {s.versions.slice(0, -1).reverse().map(x => <li key={x.version}>v{x.version} · {x.asOf} · {x.by} · {x.evidenceOk ? 'verifies' : 'does not verify'} · {x.evidenceHash.slice(0, 24)}…</li>)}
                    </ul>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : <p className="text-ink-soft">No scenarios yet.</p>}
    </div>
  );
}

/** A modelled interval: the projection at the low and high ends of the assumptions, drawn as a band. */
function Band({ i }: { i: { low: number; high: number } }) {
  return (
    <span className="inline-flex items-center gap-1.5" title="Modelled: the projection at the low and high ends of the stated ranges">
      {fmt(i.low)}
      <span aria-hidden className="inline-block h-1.5 w-10 rounded-full border border-dashed border-ink-muted bg-surface-2" />
      {fmt(i.high)}
    </span>
  );
}

/** Projections checked against what was later observed (lib/twin/scenarios.ts calibrate). */
function CalibrationLog({ entries, horizon, nameOf }: { entries: Calibration[]; horizon?: string; nameOf: (id: string) => string }) {
  if (!entries.length) return horizon ? <p className="mt-1 text-[12px] text-ink-muted">Projected for {horizon}: nothing observed for that date yet.</p> : null;
  return (
    <details className="mt-2 text-[12px]" open>
      <summary className="cursor-pointer font-semibold text-ink-soft">Calibration: {entries.length} projection{entries.length === 1 ? '' : 's'} checked against observed values</summary>
      <table className="mt-1 w-full">
        <thead><tr className="text-ink-muted"><th className="text-start font-semibold">Version</th><th className="text-start font-semibold">Entity</th><th className="text-end font-semibold">Modelled</th><th className="text-end font-semibold">Observed</th><th className="text-end font-semibold">Error</th><th className="ps-2 text-start font-semibold">In range</th></tr></thead>
        <tbody>{entries.map(c => (
          <tr key={`${c.version}${c.entityId}${c.observedRunId}${c.observedValidFrom}`} title={`Observed ${c.observedValidFrom} (import ${c.observedRunId}); projected for ${c.horizon}`}>
            <td className="font-mono">v{c.version}</td><td>{nameOf(c.entityId)}</td>
            <td className="text-end font-mono tabular-nums">{fmt(c.projected)}</td><td className="text-end font-mono tabular-nums">{fmt(c.observed)}</td>
            <td className="text-end font-mono tabular-nums">{c.error >= 0 ? '+' : ''}{fmt(c.error)}{c.errorPct !== null ? ` (${c.errorPct >= 0 ? '+' : ''}${c.errorPct}%)` : ''}</td>
            <td className="ps-2">{c.withinInterval === undefined ? '—' : c.withinInterval ? 'yes' : 'no'}</td>
          </tr>
        ))}</tbody>
      </table>
    </details>
  );
}
