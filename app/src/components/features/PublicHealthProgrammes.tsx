'use client';

// Public-health programmes, complaints and workforce counts for the console
// (Health I4: lib/health/programmes/register.ts, lib/health/complaints,
// lib/professions/workforce.ts). The programme register as decided cases left
// it; the accepted returns only as they may be published (the nation's
// small-cell rule applied, reported, suspected, confirmed and modelled kept
// apart, a missing count never shown as zero); interventions; the complaint
// cases of the health regulators (list view: the complainant and the complaint
// never shown here); workforce counts derived from the professions register;
// and the country rule sets, changed by two officials citing the law.
// Nothing here changes a programme: that is done through decided cases.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { SignalTag } from '@/components/ui/SignalTag';

type Cell = { value: number } | { suppressed: 'below-threshold' | 'no-threshold' } | { missing: true };
interface Citation { instrument: string; eId: string; title?: string; num?: string }
interface Programme {
  number: string; state: string; sample?: true; case: string;
  versions: { n: number; at: string; reason: string; terms: { title: string; eligibility: { basis: Citation[]; note?: string }; coverage: { definition: string; denominator?: string; denominatorSource?: string }; budgetReference?: string; reportingPeriod: string; indicators: string[]; areas: string[]; supplyItems: { id: string; product: string; unit: string }[] } }[];
  history: { state: string; at: string; reason: string; decision?: string }[];
}
interface Published { number: string; programme: string; area: string; period: { from: string; to: string }; version: number; complete: boolean; corrected: boolean; sample?: true; counts: { indicator: string; breakdown?: string; supplyItem?: string; basis: string; quality: string; cell: Cell }[] }
interface Intervention { number: string; programme?: string; kind: string; areas: string[]; measure: string; from: string; to?: string; reviewBy?: string; state: string; rule: { version: number } | { none: true }; reviews: unknown[]; case: string; sample?: true }
interface Pending<T> { by: string; expiresAt: string; values: T; basis: Citation[] }
interface Data {
  programmes: Programme[]; returns: Published[]; interventions: Intervention[]; authorityNamed: boolean;
  rules: { rules: { kind: string; authority: string; reviewRequired: boolean; expiryRequired: boolean }[]; version: number }; ruleChanges: { pending?: Pending<{ rules: { kind: string }[] }> };
  smallCells: { threshold: number; version: number } | null; smallCellChanges: { pending?: Pending<{ threshold: number }> };
  labels: { states: Record<string, string>; bases: Record<string, string> };
}
interface Workforce { cells: { profession: string; title: string; state: string; region: string | null; cell: Cell }[]; totals: { profession: string; title: string; state: string; cell: Cell }[]; rule: { threshold: number; version: number } | null; regionNotRecorded: Cell; source: string; sha256: string }
interface CaseRow { id: string; ref: string; stage: string; package: { key: string }; openedAt?: string; createdAt?: string; source?: string; closedAt?: string }

const QUALITY: Record<string, string> = { counted: 'counted', estimated: 'estimated', incomplete: 'incomplete', 'not-available': 'not available' };
const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';
const cite = (b: Citation[]) => b.map(c => `${c.title ?? c.instrument} ${c.num ? `s. ${c.num}` : c.eId}`).join('; ');

/** A published cell: its value, or why it is held back (never a zero for a missing count). */
function CellText({ cell }: { cell: Cell }) {
  if ('value' in cell) return <>{cell.value.toLocaleString()}</>;
  if ('missing' in cell) return <span className="text-ink-muted">not available</span>;
  return <span className="text-ink-muted">{cell.suppressed === 'below-threshold' ? 'suppressed (small number)' : 'not published: no threshold adopted'}</span>;
}

export function PublicHealthProgrammes() {
  const [data, setData] = React.useState<Data | null>(null);
  const [work, setWork] = React.useState<Workforce | null>(null);
  const [complaints, setComplaints] = React.useState<CaseRow[] | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [law, setLaw] = React.useState({ instrument: '', eId: '' });
  const [threshold, setThreshold] = React.useState('');
  const [rules, setRules] = React.useState('');
  const load = React.useCallback(async () => {
    const [a, b] = await Promise.all([fetch('/api/health-regulation/programmes', { cache: 'no-store' }), fetch('/api/health-regulation/workforce', { cache: 'no-store' })]);
    const [ja, jb] = await Promise.all([a.json().catch(() => null), b.json().catch(() => null)]);
    if (ja && !ja.error) setData(ja); else setMsg('Could not read the programme register');
    if (jb && !jb.error) setWork(jb);
    const rows: CaseRow[] = [];
    for (const p of ['health.complaint', 'prof.complaint']) {
      const r = await fetch(`/api/cases?procedure=${p}&limit=50`, { cache: 'no-store' });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.cases) rows.push(...j.cases);
    }
    setComplaints(rows);
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  const post = async (body: Record<string, unknown>, done: string) => {
    const r = await fetch('/api/health-regulation/programmes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    setMsg(r.ok ? done : j.error);
    await load();
  };
  const basis = () => (law.instrument ? [{ instrument: law.instrument.trim(), eId: law.eId.trim() }] : []);
  const titles = new Map((data?.programmes ?? []).map(p => [p.number, p.versions.at(-1)!.terms.title]));
  const bases = data?.labels.bases ?? {};
  const regions = [...new Set((work?.cells ?? []).filter(c => c.state === 'registered').map(c => c.region ?? ''))].sort((a, b) => (a || '~').localeCompare(b || '~'));
  const professions = [...new Map((work?.cells ?? []).filter(c => c.state === 'registered').map(c => [c.profession, c.title])).entries()];

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Public-health programmes and workforce</h1>
      <p className="max-w-3xl text-sm text-ink-muted">
        Programme records and aggregate returns of the public-health authority the nation names under <Link className="underline" href="/gov/configuration/responsible">Who is responsible</Link>,
        complaint intake of the <Link className="underline" href="/gov/health-regulation">health regulators</Link>, and workforce counts derived from the register of professionals.
        Programmes, interventions and returns change only through decided <Link className="underline" href="/gov/work/cases/open">cases</Link>; supply items are products of the <Link className="underline" href="/gov/health-regulation/products">medicines register</Link>.
        Never an individual: no case, contact, laboratory or vaccination record is kept here.
      </p>
      {data && !data.authorityNamed ? <p role="status" className="rounded border border-line p-2 text-sm">No public-health authority is named yet: nobody keeps programmes or decides their cases until the nation names it.</p> : null}
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}

      <Section title="Programme register" meta={data ? `${data.programmes.length} programme(s)` : 'loading'}>
        {data?.programmes.length ? (
          <ul className="space-y-2 text-sm">{data.programmes.map(p => {
            const v = p.versions.at(-1)!; const t = v.terms;
            return (
              <li key={p.number} className="rounded border border-line p-2">
                <p className="flex flex-wrap items-center gap-2"><strong>{p.number}</strong> · {t.title} · {data.labels.states[p.state] ?? p.state} · version {v.n}{p.sample ? <SignalTag kind="sample" source="a sample case of a demonstration" /> : null}</p>
                <dl className="mt-1 grid gap-x-3 text-xs sm:grid-cols-[max-content_1fr]">
                  <dt className="text-ink-muted">Eligibility</dt><dd>{t.eligibility.basis.length ? cite(t.eligibility.basis) : 'no provision cited (demonstration)'}{t.eligibility.note ? ` · ${t.eligibility.note}` : ''}</dd>
                  <dt className="text-ink-muted">Coverage</dt><dd>{t.coverage.definition}{t.coverage.denominator ? ` · denominator: ${t.coverage.denominator} (source: ${t.coverage.denominatorSource})` : ' · no denominator documented'}</dd>
                  <dt className="text-ink-muted">Budget reference</dt><dd>{t.budgetReference ?? 'none given'} <span className="text-ink-muted">(kept by finance)</span></dd>
                  <dt className="text-ink-muted">Reporting period</dt><dd>{t.reportingPeriod}</dd>
                  <dt className="text-ink-muted">Indicators</dt><dd>{t.indicators.join(', ')}</dd>
                  <dt className="text-ink-muted">Areas</dt><dd>{t.areas.length ? t.areas.join(', ') : 'the whole nation'}</dd>
                  <dt className="text-ink-muted">Supply items</dt><dd>{t.supplyItems.length ? t.supplyItems.map(s => `${s.product} (${s.unit})`).join(', ') : 'none'}</dd>
                  <dt className="text-ink-muted">History</dt><dd>{p.history.map(h => `${h.at.slice(0, 10)} ${data.labels.states[h.state] ?? h.state}${h.decision ? ' (sealed decision)' : ''}`).join(' · ')} · <Link className="underline" href={`/gov/cases/${p.case}`}>establishing case</Link></dd>
                </dl>
              </li>
            );
          })}</ul>
        ) : <p className="text-sm text-ink-muted">No programme established yet.</p>}
      </Section>

      <Section title="Aggregate returns" meta={data?.smallCells ? `small-cell threshold ${data.smallCells.threshold} (version ${data.smallCells.version})` : 'no small-cell threshold adopted: nothing is published'}>
        <p className="text-sm text-ink-muted">Counts by area and period, as accepted after validation. Reported, suspected, confirmed and modelled counts are kept apart and never added together; a count not available is never shown as zero; counts above zero and below the nation&apos;s threshold are suppressed.</p>
        {data?.returns.length ? data.returns.map(r => (
          <div key={r.number} className="mt-2 overflow-x-auto rounded border border-line p-2">
            <p className="flex flex-wrap items-center gap-2 text-sm"><strong>{r.number}</strong> · {titles.get(r.programme) ?? r.programme} · {r.area} · {r.period.from} to {r.period.to} · version {r.version}{r.corrected ? ' (corrected; earlier versions kept)' : ''} · {r.complete ? 'complete' : 'partial'}{r.sample ? <SignalTag kind="sample" source="a sample case of a demonstration" /> : null}</p>
            <table className="mt-1 w-full text-xs">
              <thead><tr><th className="text-start">Indicator</th><th className="text-start">Class</th><th className="text-start">Count</th><th className="text-start">Quality</th></tr></thead>
              <tbody>{r.counts.map((c, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-1 pe-2">{c.indicator}{c.breakdown ? ` (${c.breakdown})` : ''}{c.supplyItem ? ` · ${c.supplyItem.replace('|', ', ')}` : ''}</td>
                  <td className="pe-2"><span className="flex items-center gap-1">{bases[c.basis] ?? c.basis}{c.basis === 'modelled' ? <SignalTag kind="modelled" source="a modelled figure in the return, never an observation" /> : null}</span></td>
                  <td className="pe-2"><CellText cell={c.cell} /></td>
                  <td>{QUALITY[c.quality] ?? c.quality}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )) : <p className="text-sm text-ink-muted">No return accepted yet.</p>}
      </Section>

      <Section title="Interventions" meta="area or population measures, under the nation's intervention rules">
        {data?.interventions.length ? <ul className="text-sm">{data.interventions.map(i => (
          <li key={i.number} className="border-t border-line py-1">
            <strong>{i.number}</strong> · {i.kind} · {i.areas.join(', ')} · {i.from}{i.to ? ` to ${i.to}` : ''}{i.reviewBy ? ` · review by ${i.reviewBy}` : ''} · {i.state} · {'none' in i.rule ? 'no adopted rule (demonstration)' : `rule version ${i.rule.version}`} · {i.reviews.length} review(s) · <Link className="underline" href={`/gov/cases/${i.case}`}>case</Link>{i.sample ? <> <SignalTag kind="sample" source="a sample case" /></> : null}
            <p className="text-xs text-ink-muted">{i.measure}</p>
          </li>
        ))}</ul> : <p className="text-sm text-ink-muted">No intervention decided.</p>}
      </Section>

      <Section title="Complaints" meta="facility and pharmacy complaints, professional conduct complaints">
        <p className="text-sm text-ink-muted">Each complaint is assessed by the assigned officer with reasons and referred to the regulator&apos;s own case on the licence or registration, or closed with reasons. Who complained and what they said are restricted to the case: they are not shown here, and every read of the case is logged.</p>
        {complaints?.length ? <ul className="mt-1 text-sm">{complaints.map(c => (
          <li key={c.id} className="flex flex-wrap items-center gap-2 border-t border-line py-1"><Link className="underline" href={`/gov/cases/${c.id}`}>{c.ref}</Link> · {c.package.key === 'health.complaint' ? 'facility or pharmacy' : 'professional conduct'} · {c.stage}{c.source === 'sample' ? <SignalTag kind="sample" source="a sample case" /> : null}</li>
        ))}</ul> : <p className="text-sm text-ink-muted">No complaint case you may read.</p>}
      </Section>

      <Section title="Workforce counts" meta={work?.rule ? `from the register of professionals · small-cell threshold ${work.rule.threshold}` : 'from the register of professionals · no small-cell threshold adopted'}>
        <p className="text-sm text-ink-muted">Registered professionals by profession and region of practice, counted from the register when this page is read; nobody is named. Registrations made before the region was asked show as &quot;region not recorded&quot;.</p>
        {work && professions.length ? (
          <div className="overflow-x-auto">
            <table className="mt-1 w-full text-xs">
              <thead><tr><th className="text-start">Profession</th>{regions.map(r => <th key={r || 'none'} className="text-start">{r || 'Region not recorded'}</th>)}<th className="text-start">All regions</th></tr></thead>
              <tbody>{professions.map(([key, title]) => (
                <tr key={key} className="border-t border-line">
                  <td className="py-1 pe-2">{title}</td>
                  {regions.map(r => { const c = work.cells.find(x => x.profession === key && x.state === 'registered' && (x.region ?? '') === r); return <td key={r || 'none'} className="pe-2">{c ? <CellText cell={c.cell} /> : <span className="text-ink-muted">none registered</span>}</td>; })}
                  <td>{(() => { const t = work.totals.find(x => x.profession === key && x.state === 'registered'); return t ? <CellText cell={t.cell} /> : null; })()}</td>
                </tr>
              ))}</tbody>
            </table>
            <p className="mt-1 text-xs text-ink-muted">Other standings: {work.totals.some(t => t.state !== 'registered') ? work.totals.filter(t => t.state !== 'registered').map((t, i) => <React.Fragment key={i}>{i ? ' · ' : ''}{t.title} {t.state}: <CellText cell={t.cell} /></React.Fragment>) : 'none'}. Source: {work.source}; records digest {work.sha256.slice(0, 12)}…</p>
          </div>
        ) : <p className="text-sm text-ink-muted">No registration on the register yet.</p>}
      </Section>

      <Section title="Country rules" meta="administrators; two officials, citing the law">
        <div className="grid gap-2 md:grid-cols-2">
          <label className="text-sm">Legal basis: law (id from Laws)<input className={field} value={law.instrument} onChange={e => setLaw(x => ({ ...x, instrument: e.target.value }))} placeholder="/eli/…" /></label>
          <label className="text-sm">Provision (e.g. sec_9)<input className={field} value={law.eId} onChange={e => setLaw(x => ({ ...x, eId: e.target.value }))} /></label>
        </div>
        <div className="mt-2 rounded border border-line p-2 text-sm">
          <p className="font-medium">Small-cell rule for health aggregates</p>
          <p className="text-xs text-ink-muted">{data?.smallCells ? `In force: counts above zero and below ${data.smallCells.threshold} are suppressed (version ${data.smallCells.version}).` : 'Ships unset: no programme figure or workforce count is published until two officials adopt it.'}</p>
          {data?.smallCellChanges.pending ? (
            <p className="mt-1">Waiting for a second official: threshold {data.smallCellChanges.pending.values.threshold}, proposed by {data.smallCellChanges.pending.by} · {cite(data.smallCellChanges.pending.basis)}{' '}
              <Button onClick={() => void post({ op: 'confirm-small-cells' }, 'Confirmed: the threshold applies from now.')}>Confirm</Button>{' '}
              <Button variant="secondary" onClick={() => void post({ op: 'withdraw-small-cells' }, 'Withdrawn.')}>Withdraw</Button></p>
          ) : (
            <div className="mt-1 flex flex-wrap items-end gap-2">
              <label className="text-sm">Threshold<input className={field} inputMode="numeric" value={threshold} onChange={e => setThreshold(e.target.value)} /></label>
              <Button onClick={() => void post({ op: 'propose-small-cells', threshold: Number(threshold), legalBasis: basis() }, 'Proposed: a different official confirms it.')}>Propose</Button>
            </div>
          )}
        </div>
        <div className="mt-2 rounded border border-line p-2 text-sm">
          <p className="font-medium">Intervention authority, review and expiry rules (CFG-PH-003)</p>
          <p className="text-xs text-ink-muted">{data?.rules.version ? data.rules.rules.map(r => `${r.kind} by ${r.authority}${r.reviewRequired ? ', review required' : ''}${r.expiryRequired ? ', expiry required' : ''}`).join('; ') : 'Ship empty: a production installation refuses an intervention no adopted rule covers.'}</p>
          {data?.ruleChanges.pending ? (
            <p className="mt-1">Waiting for a second official: {data.ruleChanges.pending.values.rules.map(r => r.kind).join(', ') || 'no rule'}, proposed by {data.ruleChanges.pending.by}{' '}
              <Button onClick={() => void post({ op: 'confirm-intervention-rules' }, 'Confirmed: the rules apply to decisions from now.')}>Confirm</Button>{' '}
              <Button variant="secondary" onClick={() => void post({ op: 'withdraw-intervention-rules' }, 'Withdrawn.')}>Withdraw</Button></p>
          ) : (
            <div className="mt-1">
              <label className="text-sm">One rule per line: kind | authority slot | review required (yes/no) | expiry required (yes/no)<textarea className={field} rows={3} value={rules} onChange={e => setRules(e.target.value)} /></label>
              <Button className="mt-1" onClick={() => void post({ op: 'propose-intervention-rules', legalBasis: basis(), rules: rules.split('\n').filter(l => l.trim()).map(l => { const [kind, authority, review, expiry] = l.split('|').map(x => x.trim()); return { kind, authority, reviewRequired: /^y/i.test(review ?? ''), expiryRequired: /^y/i.test(expiry ?? '') }; }) }, 'Proposed: a different official confirms it.')}>Propose</Button>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
