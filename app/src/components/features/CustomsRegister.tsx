'use client';

// The customs register (lib/customs/register.ts) for the customs authority:
// counts, and a declaration opened by number or a declarant's declarations,
// with every version of the goods lines, the channel an officer chose and
// why, inspections, the duty per line (approved tariff or entered with
// reasons), payment and release. Commercially confidential: auditors give a
// purpose and every search is in the access log. Declarations move only
// through cases under the approved procedure.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { formatMoney } from '@/lib/nation/registry';

interface Line { n: number; code: string; description: string; origin: string; quantity: number; unit: string; valueMinor: number }
interface Declaration { number: string; direction: string; state: string; currency: string; case: string; declarant: { name: string; ref: string }; shipment: { mode: string; transportRef: string; from: string; to: string };
  versions: { n: number; lines: Line[]; reason: string; at: string }[]; channel?: { kind: string; reasons: string; by: string };
  inspections: { at: string; outcome: string; findings: string; by: string }[];
  assessment?: { reference: string; totalMinor: number; paidMinor: number; lines: { n: number; dutyMinor: number; method: { kind: string; rule?: string; version?: number; reasons?: string } }[] };
  release?: { at: string; reasons: string } }
const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';
const money = (minor: number, currency: string) => formatMoney(minor / 100, { currency });

export function CustomsRegister() {
  const [counts, setCounts] = React.useState<Record<string, number> | null>(null);
  const [q, setQ] = React.useState({ number: '', declarant: '', purpose: '' });
  const [found, setFound] = React.useState<Declaration[] | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const ask = async (params: Record<string, string>) => {
    const r = await fetch(`/api/customs?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)))}`, { cache: 'no-store' });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? 'Could not read the register');
    return j;
  };
  React.useEffect(() => { ask({}).then(j => setCounts(j.counts)).catch(e => setMsg((e as Error).message)); }, []);
  const search = async () => { setMsg(null); try { const j = await ask(q); setCounts(j.counts); setFound(j.declarations); } catch (e) { setMsg((e as Error).message); } };
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Customs</h1>
      <p className="max-w-3xl text-sm text-ink-muted">Goods declarations from lodging to release. Each moves through a <Link className="underline" href="/gov/work/cases/open">case</Link> under the approved procedure: an officer chooses the control channel and gives the reasons (no score chooses it), duty comes from the approved tariff (<Link className="underline" href="/gov/law/rules">Rates and tariffs</Link>) or is entered with reasons, and goods are released once the duty is paid. Declarations are commercially confidential: every search is recorded in the access log.</p>
      {msg ? <p role="alert" className="text-sm text-alert">{msg}</p> : null}
      {counts ? <p className="text-sm">{Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · ')}</p> : null}
      <Section title="Find a declaration" meta="by number or declarant">
        <div className="grid gap-2 md:grid-cols-3">
          <label className="text-sm">Declaration number<input className={field} value={q.number} onChange={e => setQ(x => ({ ...x, number: e.target.value }))} /></label>
          <label className="text-sm">Declarant&apos;s register reference<input className={field} value={q.declarant} onChange={e => setQ(x => ({ ...x, declarant: e.target.value }))} /></label>
          <label className="text-sm">Purpose (auditors)<input className={field} value={q.purpose} onChange={e => setQ(x => ({ ...x, purpose: e.target.value }))} /></label>
        </div>
        <Button className="mt-2" onClick={search}>Search</Button>
      </Section>
      {found ? found.length ? found.map(d => { const v = d.versions.at(-1)!; return (
        <Section key={d.number} title={`${d.number} · ${d.declarant.name}`} meta={`${d.direction} · ${d.state} · ${d.shipment.mode} ${d.shipment.transportRef} · ${d.shipment.from} → ${d.shipment.to}`}>
          <p className="text-sm font-medium">Goods (version {v.n}: {v.reason})</p>
          <table className="mt-1 w-full text-xs">
            <thead><tr className="text-start"><th className="text-start">#</th><th className="text-start">Code</th><th className="text-start">Goods</th><th className="text-start">Origin</th><th className="text-start">Quantity</th><th className="text-start">Value</th><th className="text-start">Duty</th></tr></thead>
            <tbody>{v.lines.map(l => { const duty = d.assessment?.lines.find(x => x.n === l.n); return (
              <tr key={l.n}><td>{l.n}</td><td>{l.code}</td><td>{l.description}</td><td>{l.origin}</td><td>{l.quantity} {l.unit}</td><td>{money(l.valueMinor, d.currency)}</td>
                <td>{duty ? <>{money(duty.dutyMinor, d.currency)} <span className="text-ink-muted">({duty.method.kind === 'rule' ? `tariff v${duty.method.version}` : `entered: ${duty.method.reasons}`})</span></> : '—'}</td></tr>
            ); })}</tbody>
          </table>
          <p className="mt-2 text-sm">Channel: {d.channel ? `${d.channel.kind} — ${d.channel.reasons} (${d.channel.by})` : 'not chosen yet'}</p>
          {d.inspections.length ? <ul className="text-xs">{d.inspections.map((i, k) => <li key={k}>{i.at.slice(0, 10)} · {i.outcome} · {i.findings} · {i.by}</li>)}</ul> : null}
          {d.assessment ? <p className="text-sm">Duty {money(d.assessment.totalMinor, d.currency)}, paid {money(d.assessment.paidMinor, d.currency)} · {d.assessment.reference}</p> : null}
          {d.release ? <p className="text-sm">{d.state === 'released' ? 'Released' : 'Release refused'} on {d.release.at.slice(0, 10)}: {d.release.reasons}</p> : null}
          <p className="text-xs"><Link className="underline" href={`/gov/cases/${d.case}`}>Open the case</Link>{d.versions.length > 1 ? ` · ${d.versions.length} versions of the goods lines` : ''}</p>
        </Section>
      ); }) : <p className="text-sm text-ink-muted">Nothing matches.</p> : null}
    </div>
  );
}
