'use client';

// The indicator register on the console (plan step I3; National data ›
// Indicators): every definition with its owner, versions and approvals, and
// its current value computed from the records with its marker, period and
// coverage; the small-cell rule (two officials, citing the law); publishing
// the approved values to the national data now. Definitions change on each
// definition's page (/gov/twin/indicators/[id]).

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { SignalTag } from '@/components/ui/SignalTag';
import { valueText, sourceText } from './IndicatorTile';
import type { IndicatorValue, IndicatorVersion, IndicatorApproval, IndicatorOwner } from '@/lib/indicators/types';

interface Citation { instrument: string; eId: string; title?: string; num?: string }
interface Pending { by: string; expiresAt: string; values: { threshold: number }; basis: Citation[] }
interface DefRow { id: string; owner: IndicatorOwner; ownerLabel: string; ownerInstitution?: { id: string; name: string } | null; latest: IndicatorVersion; versions: number; approvals: IndicatorApproval[]; approvedAt: { id: string; name: string }[] }
interface Data {
  period: { start: string; end: string; month: string };
  definitions: DefRow[]; values: (IndicatorValue & { institutions?: number })[];
  methods: { id: string; version: number; label: string; unit: string; geography: string; coverage: string; params: string[] }[];
  smallCells: { threshold: number; version: number } | null; smallCellChanges: { pending?: Pending; history?: unknown[] };
}

const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';
const cite = (b: Citation[]) => b.map(c => `${c.title ?? c.instrument} ${c.num ? `s. ${c.num}` : c.eId}`).join('; ');

export function IndicatorRegister() {
  const [data, setData] = React.useState<Data | null>(null);
  const [month, setMonth] = React.useState('');
  const [msg, setMsg] = React.useState<string | null>(null);
  const [law, setLaw] = React.useState({ instrument: '', eId: '' });
  const [threshold, setThreshold] = React.useState('');
  const load = React.useCallback(async () => {
    const r = await fetch(`/api/indicators${month ? `?month=${month}` : ''}`, { cache: 'no-store' });
    const j = await r.json().catch(() => null);
    if (r.ok && j?.definitions) setData(j); else setMsg(j?.error ?? 'Could not read the indicator register');
  }, [month]);
  React.useEffect(() => { void load(); }, [load]);
  const post = async (body: Record<string, unknown>, done: string) => {
    const r = await fetch('/api/indicators', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? (typeof j.result?.published === 'boolean' ? (j.result.published ? `${done} (${j.result.accepted} value(s) in the national data)` : 'Nothing new to publish: no approved definition has new values') : done) : j.error);
    await load();
  };
  const value = (id: string) => data?.values.find(v => v.indicatorId === id);
  const domains = [...new Set((data?.definitions ?? []).map(d => d.latest.terms.domain))];

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Indicator register</h1>
      <p className="max-w-3xl text-sm text-ink-muted">
        A definition before a number: each indicator says what it counts, what it is divided by, for which period, how coverage is decided, which computation (and version) produces it and which disclosure rule protects it.
        Values are computed from the platform&apos;s own records when this page is read: cases under approved procedures and the registers. Nothing is typed.
        A definition is drafted by one official and approved by a different official who can sign at the institution whose figures it defines; every version is kept.
        Reference definitions ship as drafts. Only approved definitions reach the <Link className="underline" href="/gov/twin">national data</Link>.
      </p>
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}

      <Section title="Definitions and current values" meta={data ? `${data.definitions.length} definitions · ${data.period.month}` : 'loading'}>
        <div className="flex flex-wrap items-end gap-2 text-sm">
          <label>Month<input className={field} type="month" value={month} onChange={e => setMonth(e.target.value)} /></label>
          <p className="text-xs text-ink-muted">A value marked Sample counts sample records (demonstration and training only; never in production). Not connected: no source keeps these records yet. Held back: the small-cell rule.</p>
        </div>
        {domains.map(dom => (
          <div key={dom} className="mt-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">{dom}</h3>
            <div className="overflow-x-auto">
              <table className="mt-1 w-full min-w-[640px] text-xs">
                <thead><tr className="text-ink-muted"><th className="text-start font-normal">Indicator</th><th className="text-start font-normal">Kept by</th><th className="text-start font-normal">Version</th><th className="text-start font-normal">Value</th><th className="text-start font-normal">Coverage</th><th className="text-start font-normal">Computation</th></tr></thead>
                <tbody>{data!.definitions.filter(d => d.latest.terms.domain === dom).map(d => {
                  const v = value(d.id);
                  return (
                    <tr key={d.id} className="border-t border-line align-top">
                      <td className="py-1 pe-2"><Link className="text-link underline underline-offset-2" href={`/gov/twin/indicators/${encodeURIComponent(d.id)}`}>{d.latest.terms.title}</Link><div className="font-mono text-[10px] text-ink-muted">{d.id}</div></td>
                      <td className="pe-2">{'each' in d.owner ? 'Each institution, for its own cases' : d.ownerInstitution ? d.ownerInstitution.name : d.ownerInstitution === null ? <span className="text-ink-muted">{d.ownerLabel}: nobody named</span> : d.ownerLabel}</td>
                      <td className="pe-2">v{d.latest.n}{d.latest.reference ? ' · reference draft' : ''}<div className="text-[10px] text-ink-muted">{d.approvedAt.length ? `approved at ${d.approvedAt.map(a => a.name).join(', ')}` : 'not approved anywhere'}</div></td>
                      <td className="pe-2">{v ? <span className="inline-flex items-center gap-1"><span className="font-mono tabular-nums">{valueText(v)}</span><SignalTag kind={v.kind} source={sourceText(v)} />{v.status === 'draft' ? <span className="rounded-[2px] border border-line px-1 text-[8px] uppercase">Draft</span> : null}</span> : '—'}
                        {v?.reason ? <div className="max-w-[18rem] text-[10px] text-ink-muted">{v.reason}</div> : null}</td>
                      <td className="pe-2">{v ? `${v.coverage.reporting} of ${v.coverage.expected} ${v.coverage.of}` : '—'}{v?.lastUpdated ? <div className="text-[10px] text-ink-muted">updated {v.lastUpdated.slice(0, 10)}</div> : null}</td>
                      <td className="font-mono text-[10px]">{d.latest.terms.method.id}@{d.latest.terms.method.version}{d.latest.terms.method.params ? ` (${Object.entries(d.latest.terms.method.params).map(([k, x]) => `${k}=${x}`).join(', ')})` : ''}<div className="font-sans text-ink-muted">{d.latest.terms.disclosure.kind === 'small-cells' ? 'small-cell rule' : 'not personal data'}</div></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Disclosure rule for indicator values" meta={data?.smallCells ? `small-cell threshold ${data.smallCells.threshold} (version ${data.smallCells.version})` : 'no small-cell threshold adopted: counts about people are held back'}>
        <p className="text-sm text-ink-muted">Counts about people (births, deaths, marriages) pass the nation&apos;s small-cell rule before they leave the keeping institution: a count above zero and below the threshold is held back, and a breakdown that would reveal it is withheld. Until two officials adopt a threshold citing the law, nothing protected is published. Administrators propose; a different official confirms.</p>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="text-sm">Legal basis: law (id from Laws)<input className={field} value={law.instrument} onChange={e => setLaw(x => ({ ...x, instrument: e.target.value }))} placeholder="/eli/…" /></label>
          <label className="text-sm">Provision (e.g. sec_9)<input className={field} value={law.eId} onChange={e => setLaw(x => ({ ...x, eId: e.target.value }))} /></label>
        </div>
        {data?.smallCellChanges.pending ? (
          <p className="mt-1 text-sm">Waiting for a second official: threshold {data.smallCellChanges.pending.values.threshold}, proposed by {data.smallCellChanges.pending.by} · {cite(data.smallCellChanges.pending.basis)}{' '}
            <Button onClick={() => void post({ op: 'confirm-small-cells' }, 'Confirmed: the threshold applies from now.')}>Confirm</Button>{' '}
            <Button variant="secondary" onClick={() => void post({ op: 'withdraw-small-cells' }, 'Withdrawn.')}>Withdraw</Button></p>
        ) : (
          <div className="mt-1 flex flex-wrap items-end gap-2">
            <label className="text-sm">Threshold<input className={field} inputMode="numeric" value={threshold} onChange={e => setThreshold(e.target.value)} /></label>
            <Button onClick={() => void post({ op: 'propose-small-cells', threshold: Number(threshold), legalBasis: law.instrument ? [{ instrument: law.instrument.trim(), eId: law.eId.trim() }] : [] }, 'Proposed: a different official confirms it.')}>Propose</Button>
          </div>
        )}
      </Section>

      <Section title="National data" meta="approved definitions only, real records only">
        <p className="text-sm text-ink-muted">The approved values of the last three complete months enter the national data as observations of one registered source, the indicator register, each with the period it was true for and the time it was recorded. The twin ingest job does this every hour; an official can do it now. Nobody can type, upload or import an indicator value.</p>
        <Button onClick={() => void post({ op: 'publish' }, 'Published')}>Publish approved values now</Button>
      </Section>

      <Section title="Computations" meta="a definition names one and its version">
        <ul className="space-y-1 text-sm">{(data?.methods ?? []).map(m => (
          <li key={`${m.id}@${m.version}`} className="border-t border-line pt-1"><span className="font-mono text-xs">{m.id}@{m.version}</span> · {m.label} · unit {m.unit} · by {m.geography}{m.params.length ? ` · parameters: ${m.params.join(', ')}` : ''}<div className="text-xs text-ink-muted">Coverage: {m.coverage}</div></li>
        ))}</ul>
      </Section>
    </div>
  );
}
