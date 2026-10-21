'use client';

// One indicator definition (plan step I3): its terms by version, every
// approval (withdrawn ones kept), its value computed from the records with the
// last twelve months, each institution's value for a definition every
// institution keeps, and the value in the common indicator contract. Drafting
// a version and approving one are acts of signed-in officials (the server
// checks who may: lib/auth/roles.ts).

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { SignalTag } from '@/components/ui/SignalTag';
import { IndicatorTile, valueText, sourceText } from './IndicatorTile';
import type { IndicatorDefinition, IndicatorValue, IndicatorTerms } from '@/lib/indicators/types';

interface Data {
  period: { month: string };
  definition: IndicatorDefinition; ownerLabel: string; ownerInstitution?: { id: string; name: string } | null;
  methods: { version: number; method: string }[];
  institution: { id: string; name: string } | null;
  value: IndicatorValue; series: IndicatorValue[];
  byInstitution: { institution: { id: string; name: string }; status: string; version: number; value: number | null; kind: IndicatorValue['kind']; unit: string; reason: string | null; coverage: IndicatorValue['coverage'] }[];
  contract: Record<string, unknown>;
}

const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';
const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean);

function Terms({ t }: { t: IndicatorTerms }) {
  const row = (k: string, v: React.ReactNode) => <><dt className="text-ink-muted">{k}</dt><dd>{v}</dd></>;
  return (
    <dl className="grid gap-x-3 gap-y-0.5 text-xs sm:grid-cols-[max-content_1fr]">
      {row('Definition', t.definition)}
      {row('Intended use', t.intendedUse)}
      {row('Domain', t.domain)}
      {row('Numerator', t.numerator)}
      {row('Denominator', t.denominator ?? 'none (a count)')}
      {row('Unit', t.unit)}
      {row('Period', 'calendar month')}
      {row('Coverage', t.coverage)}
      {row('Computation', <span className="font-mono">{t.method.id}@{t.method.version}{t.method.params ? ` (${Object.entries(t.method.params).map(([k, v]) => `${k}=${v}`).join(', ')})` : ''}</span>)}
      {row('Disclosure', t.disclosure.kind === 'small-cells' ? 'the nation\'s small-cell rule (counts about people)' : `not personal data: ${t.disclosure.reason}`)}
      {row('Source', `${t.source.registerId} · record type ${t.source.recordType}`)}
      {row('Qualifications', <ul className="list-disc ps-4">{t.qualifications.map((q, i) => <li key={i}>{q}</li>)}</ul>)}
      {row('Limitations', t.limitations.length ? <ul className="list-disc ps-4">{t.limitations.map((q, i) => <li key={i}>{q}</li>)}</ul> : 'none stated')}
    </dl>
  );
}

export function IndicatorDefinitionView({ id, institution }: { id: string; institution?: string }) {
  const [data, setData] = React.useState<Data | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [shown, setShown] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState<{ title: string; definition: string; numerator: string; denominator: string; qualifications: string; limitations: string; reason: string } | null>(null);
  const [approveFor, setApproveFor] = React.useState('');
  const load = React.useCallback(async () => {
    const r = await fetch(`/api/indicators/${encodeURIComponent(id)}${institution ? `?institution=${encodeURIComponent(institution)}` : ''}`, { cache: 'no-store' });
    const j = await r.json().catch(() => null);
    if (r.ok && j?.definition) setData(j); else setMsg(j?.error ?? 'Could not read the definition');
  }, [id, institution]);
  React.useEffect(() => { void load(); }, [load]);
  const post = async (body: Record<string, unknown>, done: string) => {
    const r = await fetch('/api/indicators', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? done : j.error);
    if (r.ok) setDraft(null);
    await load();
  };
  if (!data) return <div className="space-y-2 p-4"><h1 className="text-xl font-semibold">Indicator</h1><p className="text-sm text-ink-muted" role="status">{msg ?? 'Loading…'}</p></div>;
  const d = data.definition;
  const latest = d.versions.at(-1)!;
  const version = d.versions.find(v => v.n === (shown ?? latest.n)) ?? latest;
  const each = 'each' in d.owner;
  const startDraft = () => setDraft({ title: latest.terms.title, definition: latest.terms.definition, numerator: latest.terms.numerator, denominator: latest.terms.denominator ?? '', qualifications: latest.terms.qualifications.join('\n'), limitations: latest.terms.limitations.join('\n'), reason: '' });

  return (
    <div className="space-y-4 p-4">
      <p className="text-xs"><Link className="text-link underline" href="/gov/twin/indicators">Indicator register</Link> › <span className="font-mono">{d.id}</span></p>
      <h1 className="text-xl font-semibold">{latest.terms.title}</h1>
      <p className="max-w-3xl text-sm text-ink-muted">
        {latest.terms.definition}. Kept by {each ? 'each institution, for its own cases' : data.ownerInstitution ? data.ownerInstitution.name : `${data.ownerLabel} (nobody named yet under Who is responsible)`}.
        {' '}{d.versions.length} version(s); {d.approvals.filter(a => !a.withdrawn).length ? `approved at ${[...new Set(d.approvals.filter(a => !a.withdrawn).map(a => a.institution))].length} institution(s)` : 'not approved anywhere: a draft'}.
      </p>
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}

      <Section title="Value" meta={`${data.institution ? data.institution.name : each ? 'whole government' : ''} · ${data.period.month}`}>
        <div className="grid gap-2 md:grid-cols-[minmax(0,16rem)_1fr]">
          <IndicatorTile v={data.value} href={false} />
          <div className="min-w-0">
            {data.series.length ? (
              <div className="flex h-14 items-end gap-[2px]" role="img" aria-label={data.series.map(s => `${s.period.start.slice(0, 7)}: ${valueText(s)}`).join('; ')}>
                {data.series.map(s => {
                  const max = Math.max(1, ...data.series.map(x => x.value ?? 0));
                  return <div key={s.period.start} className="flex-1" title={`${s.period.start.slice(0, 7)}: ${valueText(s)}`}>{s.value === null ? <div className="border-t border-dashed border-line" /> : <div style={{ height: `${Math.max(2, (52 * s.value) / max)}px`, backgroundColor: 'rgb(var(--c-link))', opacity: s.kind === 'sample' ? 0.55 : 0.9 }} />}</div>;
                })}
              </div>
            ) : <p className="text-xs text-ink-muted">Choose an institution below to see its last twelve months.</p>}
            {data.series.length ? <p className="mt-0.5 text-[10px] text-ink-muted">Last twelve months; a month with no value is left empty, never drawn as zero.</p> : null}
            {data.value.groups?.length ? (
              <table className="mt-2 w-full text-xs"><tbody>{data.value.groups.map(g => (
                <tr key={g.key} className="border-t border-line"><td className="py-0.5 pe-2">{g.label}</td><td className="font-mono">{g.value === null ? (g.suppressed ? 'held back' : 'no value (not reporting)') : `${g.value}${data.value.unit === '%' ? '%' : ''}`}</td></tr>
              ))}</tbody></table>
            ) : data.value.disclosure.breakdownWithheld ? <p className="mt-1 text-xs text-ink-muted">Breakdown withheld: a small number could be worked out from it.</p> : null}
          </div>
        </div>
        {each && data.byInstitution.length ? (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-xs">
              <thead><tr className="text-ink-muted"><th className="text-start font-normal">Institution</th><th className="text-start font-normal">Definition</th><th className="text-start font-normal">Value</th><th className="text-start font-normal">Why none</th></tr></thead>
              <tbody>{data.byInstitution.map(r => (
                <tr key={r.institution.id} className="border-t border-line">
                  <td className="py-0.5 pe-2"><Link className="underline" href={`/gov/twin/indicators/${encodeURIComponent(d.id)}?institution=${encodeURIComponent(r.institution.id)}`}>{r.institution.name}</Link></td>
                  <td className="pe-2">v{r.version} {r.status === 'approved' ? 'approved' : 'draft'}</td>
                  <td className="pe-2"><span className="inline-flex items-center gap-1 font-mono">{r.value === null ? (r.kind === 'unavailable' ? 'Not connected' : '—') : `${r.value}${r.unit === '%' ? '%' : r.unit === 'd' ? ' days' : ''}`}<SignalTag kind={r.kind} source={r.reason ?? undefined} /></span></td>
                  <td className="text-ink-muted">{r.reason ?? ''}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : null}
      </Section>

      <Section title="Terms" meta={`version ${version.n}${version.reference ? ' · reference draft' : ''}`}>
        <div className="flex flex-wrap gap-1">{d.versions.map(v => <Button key={v.n} variant={v.n === version.n ? 'primary' : 'secondary'} onClick={() => setShown(v.n)}>v{v.n}</Button>)}</div>
        <Terms t={version.terms} />
      </Section>

      <Section title="Versions and approvals" meta="every version kept; approvals by an official who can sign at the institution, other than the drafter">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs">
            <thead><tr className="text-ink-muted"><th className="text-start font-normal">Version</th><th className="text-start font-normal">Drafted</th><th className="text-start font-normal">Why</th><th className="text-start font-normal">Approvals</th><th className="text-start font-normal"> </th></tr></thead>
            <tbody>{[...d.versions].reverse().map(v => (
              <tr key={v.n} className="border-t border-line align-top">
                <td className="py-1 pe-2">v{v.n}{v.reference ? <div className="text-[10px] text-ink-muted">reference draft</div> : null}</td>
                <td className="pe-2">{v.by}<div className="text-[10px] text-ink-muted">{v.at.slice(0, 10)}</div></td>
                <td className="pe-2">{v.reason}</td>
                <td className="pe-2">{d.approvals.filter(a => a.version === v.n).map((a, i) => (
                  <div key={i}>{a.institution} · {a.by} · {a.at.slice(0, 10)} · {a.independence}{a.withdrawn ? <span className="text-ink-muted"> · withdrawn {a.withdrawn.at.slice(0, 10)} by {a.withdrawn.by}: {a.withdrawn.reason}</span> : null}</div>
                ))}{d.approvals.some(a => a.version === v.n) ? null : <span className="text-ink-muted">none</span>}</td>
                <td>{v.reference ? null : <Button variant="secondary" onClick={() => void post({ op: 'approve', id: d.id, version: v.n, ...(approveFor ? { institution: approveFor } : {}) }, `Version ${v.n} approved.`)}>Approve v{v.n}</Button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {each ? <label className="mt-1 block text-sm">Approve for institution (taken from your sign-in when you are signed in)<input className={field} value={approveFor} onChange={e => setApproveFor(e.target.value)} placeholder="institution id" /></label> : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <Button onClick={startDraft}>Draft a version</Button>
          {d.approvals.some(a => !a.withdrawn) ? <Button variant="secondary" onClick={() => { const reason = window.prompt('Why is the approval withdrawn?'); if (reason) void post({ op: 'withdraw-approval', id: d.id, reason, ...(approveFor ? { institution: approveFor } : {}) }, 'Approval withdrawn (kept in the history).'); }}>Withdraw approval</Button> : null}
        </div>
        {draft ? (
          <form className="mt-2 space-y-1 rounded border border-line p-2" onSubmit={e => { e.preventDefault(); void post({ op: 'draft', id: d.id, reason: draft.reason, terms: { title: draft.title, definition: draft.definition, numerator: draft.numerator, ...(draft.denominator ? { denominator: draft.denominator } : {}), qualifications: lines(draft.qualifications), limitations: lines(draft.limitations) } }, 'Drafted: a different official approves it.'); }}>
            <p className="text-xs text-ink-muted">The new version keeps the computation, disclosure rule and source of version {latest.n}; there is no target field.</p>
            <label className="block text-sm">Title<input className={field} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
            <label className="block text-sm">Definition<textarea className={field} value={draft.definition} onChange={e => setDraft({ ...draft, definition: e.target.value })} /></label>
            <label className="block text-sm">Numerator<input className={field} value={draft.numerator} onChange={e => setDraft({ ...draft, numerator: e.target.value })} /></label>
            <label className="block text-sm">Denominator<input className={field} value={draft.denominator} onChange={e => setDraft({ ...draft, denominator: e.target.value })} /></label>
            <label className="block text-sm">Qualifications (one per line)<textarea className={field} value={draft.qualifications} onChange={e => setDraft({ ...draft, qualifications: e.target.value })} /></label>
            <label className="block text-sm">Limitations (one per line)<textarea className={field} value={draft.limitations} onChange={e => setDraft({ ...draft, limitations: e.target.value })} /></label>
            <label className="block text-sm">Why this version<input className={field} value={draft.reason} onChange={e => setDraft({ ...draft, reason: e.target.value })} /></label>
            <div className="flex gap-2"><Button type="submit">Draft version {latest.n + 1}</Button><Button variant="secondary" type="button" onClick={() => setDraft(null)}>Cancel</Button></div>
          </form>
        ) : null}
      </Section>

      <Section title="In the common indicator contract" meta="spec Part 1 §12 and Part 2 F field names">
        <p className="text-xs text-ink-muted">{sourceText(data.value)}</p>
        <pre className="max-h-80 overflow-auto rounded border border-line bg-surface p-2 text-[11px]">{JSON.stringify(data.contract, null, 2)}</pre>
      </Section>
    </div>
  );
}
