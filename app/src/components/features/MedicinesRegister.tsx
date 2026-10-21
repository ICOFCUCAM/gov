'use client';

// The register of medicines and medical devices (lib/health/products/register.ts)
// for the console: the public view everyone gets (publicProductView() under
// the nation's approved public information classification), the full record
// for the medicines authority's own officials (each read in the access log),
// and what the public check shows, changed by two officials citing the law.
// Products themselves change only through decided cases.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { SignalTag } from '@/components/ui/SignalTag';

interface PublicProduct { productId: string; kind: 'medicine' | 'device'; fields: Record<string, unknown>; notices: { kind: string; at: string; notice: string }[]; source: { record: string; version: number; classificationVersion?: number }; sample?: true }
interface Attribute { value: unknown; class: string; approvedBy?: { decision: string; at: string } }
interface Full {
  product: { number: string; kind: string; holder: string; state: string; sample?: true; case: string;
    versions: { n: number; at: string; by: string; reason: string; case: string; attributes: Record<string, Attribute> }[];
    history: { state: string; at: string; by: string; reason: string; case: string; decision?: string }[];
    enforcement: { id: string; kind: string; at: string; approvedBy?: { decision: string }; publishedAt?: string; publicNotice?: string; grounds?: string; completion?: { at: string; summary: string } }[] };
  record: { attributes: Record<string, Attribute> };
  labels: Record<string, string>;
}
interface Listing {
  products: PublicProduct[]; publishable: string[]; authorityNamed: boolean;
  classification: { fields: string[]; approved: boolean; version?: number };
  changes: { pending?: { by: string; expiresAt: string; values: { fields: string[] }; basis: { title?: string; instrument: string; num?: string; eId: string }[] } };
  counts: { total: number; byState: Record<string, number>; byKind: Record<string, number>; samples: number };
}
const LABEL: Record<string, string> = {
  name: 'Name', strength: 'Strength', dosageForm: 'Form', route: 'Route', therapeuticClass: 'Therapeutic class', deviceClass: 'Risk class', deviceNomenclature: 'Nomenclature',
  holder: 'Holder', authorisationNumber: 'Authorisation number', status: 'Status', authorisedOn: 'Authorised on', validUntil: 'Valid until', conditions: 'Conditions',
  legalSupplyCategory: 'Supply category', activeIngredients: 'Active ingredients', composition: 'Composition', manufacturingSites: 'Manufacturing sites',
  packagingAndLabelling: 'Packaging and labelling', dossier: 'Dossier versions', assessmentReport: 'Assessment', inspectionFindings: 'Inspection findings', legalBasis: 'Legal basis',
};
const CLASS: Record<string, string> = { public: 'public', administrative: 'administrative', commercial_confidential: 'commercially confidential', restricted: 'restricted', personal: 'personal' };
const show = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(show).join('; ');
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('organisation' in o) return `${o.name ?? ''} (${o.organisation})`.trim();
    if ('documents' in o) return `${o.n ? `version ${o.n}: ` : ''}${(o.documents as string[]).length} document(s)${o.summary ? ` · ${o.summary}` : ''}${o.note ? ` · ${o.note}` : ''}`;
    return Object.entries(o).map(([k, x]) => `${k} ${show(x)}`).join(', ');
  }
  return String(v);
};
const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';

export function MedicinesRegister() {
  const [list, setList] = React.useState<Listing | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [q, setQ] = React.useState('');
  const [number, setNumber] = React.useState('');
  const [full, setFull] = React.useState<Full | null>(null);
  const [mine, setMine] = React.useState<{ number: string; kind: string; state: string; holder: string; name?: string; sample?: true }[] | null>(null);
  const [draft, setDraft] = React.useState<string[] | null>(null);
  const [law, setLaw] = React.useState({ instrument: '', eId: '' });
  const load = React.useCallback(async (query = '') => {
    const r = await fetch(`/api/health-regulation/products${query ? `?q=${encodeURIComponent(query)}` : ''}`, { cache: 'no-store' });
    const j = await r.json().catch(() => null);
    if (j) setList(j); else setMsg('Could not read the register');
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  const open = async (n = number) => {
    setMsg(null); setFull(null);
    const r = await fetch(`/api/health-regulation/products?number=${encodeURIComponent(n.trim())}&full=1`, { cache: 'no-store' });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error ?? 'Not found'); return; }
    setFull(j);
  };
  const search = async () => {
    setMsg(null);
    const r = await fetch('/api/health-regulation/products?search=1', { cache: 'no-store' });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error); setMine(null); return; }
    setMine(j.products);
  };
  const disclosure = async (body: Record<string, unknown>, done: string) => {
    const r = await fetch('/api/health-regulation/products', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    setMsg(r.ok ? done : j.error);
    if (r.ok) setDraft(null);
    await load();
  };
  const cls = list?.classification;
  const shown = draft ?? cls?.fields ?? [];
  const pending = list?.changes.pending;

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Medicines and medical devices</h1>
      <p className="max-w-3xl text-sm text-ink-muted">
        The register of authorised medicines and devices, kept by the medicines authority the nation names under <Link className="underline" href="/gov/configuration/responsible">Who is responsible</Link>.
        A product enters and changes only through decided <Link className="underline" href="/gov/work/cases/open">cases</Link> (marketing authorisation, variation, renewal, suspension and withdrawal, recall, device registration);
        its status comes only from a sealed decision. Holders are <Link className="underline" href="/gov/organisations">organisations</Link>; manufacturers, importers and wholesalers hold licences there.
        Everyone sees the public view below; patient data is never kept here.
      </p>
      {list && !list.authorityNamed ? <p role="status" className="rounded border border-line p-2 text-sm">No medicines authority is named yet: nobody reads full records or decides product cases until the nation names it.</p> : null}
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}

      <Section title="Public register" meta={cls?.approved ? `classification version ${cls.version}` : 'no public classification approved yet'}>
        <p className="mb-2 text-sm text-ink-muted">
          {cls?.approved ? `The public check shows: ${cls.fields.map(f => LABEL[f] ?? f).join(', ') || 'no attribute'}, each only once a decision approved it.` : 'Until two officials approve what the public check shows, it shows only each product\'s number, kind and published notices.'}
          {list ? ` ${list.counts.total} record(s): ${list.counts.byKind.medicine ?? 0} medicines, ${list.counts.byKind.device ?? 0} devices.` : ''}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">Register number{cls?.fields.includes('name') ? ' or name' : ''}<input className={field} value={q} onChange={e => setQ(e.target.value)} /></label>
          <Button onClick={() => void load(q.trim())}>Search</Button>
        </div>
        {list ? list.products.length ? (
          <ul className="mt-3 space-y-2 text-sm">{list.products.map(p => (
            <li key={p.productId} className="rounded border border-line p-2">
              <p className="flex flex-wrap items-center gap-2"><strong>{p.productId}</strong> · {p.kind === 'device' ? 'medical device' : 'medicine'}{p.sample ? <SignalTag kind="sample" source="a sample case of a demonstration" /> : null}</p>
              {Object.keys(p.fields).length ? <dl className="mt-1 grid gap-x-3 text-xs sm:grid-cols-[max-content_1fr]">{Object.entries(p.fields).map(([k, v]) => <React.Fragment key={k}><dt className="text-ink-muted">{LABEL[k] ?? k}</dt><dd className="break-words">{show(v)}</dd></React.Fragment>)}</dl> : <p className="text-xs text-ink-muted">No attribute published (the nation&apos;s classification lists none yet).</p>}
              {p.notices.map((n, i) => <p key={i} className="mt-1 text-xs">Notice ({n.kind.replace('_', ' ')}, {n.at.slice(0, 10)}): {n.notice}</p>)}
              <p className="text-xs text-ink-muted">From the regulator&apos;s record, version {p.source.version}</p>
            </li>
          ))}</ul>
        ) : <p className="mt-2 text-sm text-ink-muted">No decided product on the register.</p> : null}
      </Section>

      <Section title="Full record" meta="the medicines authority's officials; every read logged">
        <p className="mb-2 text-sm text-ink-muted">Dossier versions, the assessment, composition, sites, the grounds of enforcement and recall completions are read only by the medicines authority&apos;s own officials. Each read, allowed or refused, is written to the access log.</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">Register number (PRD-…)<input className={field} value={number} onChange={e => setNumber(e.target.value)} /></label>
          <Button onClick={() => void open()}>Open the full record</Button>
          <Button variant="secondary" onClick={() => void search()}>List the register (applications included)</Button>
        </div>
        {mine ? <ul className="mt-2 text-sm">{mine.map(m => <li key={m.number}><button type="button" className="underline" onClick={() => { setNumber(m.number); void open(m.number); }}>{m.number}</button> · {m.name ?? ''} · {m.kind} · {m.state} · holder {m.holder}{m.sample ? <> <SignalTag kind="sample" source="a sample case" /></> : null}</li>)}{mine.length ? null : <li className="text-ink-muted">Nothing recorded.</li>}</ul> : null}
        {full ? (
          <div className="mt-3 space-y-3 text-sm">
            <p className="flex flex-wrap items-center gap-2"><strong>{full.product.number}</strong> · {full.product.kind} · {full.labels[full.product.state] ?? full.product.state} · holder <Link className="underline" href="/gov/organisations">{full.product.holder}</Link>{full.product.sample ? <SignalTag kind="sample" source="a sample case of a demonstration" /> : null}</p>
            <table className="w-full text-xs">
              <thead><tr><th className="text-start">Attribute</th><th className="text-start">Value</th><th className="text-start">Class</th><th className="text-start">Approved by</th></tr></thead>
              <tbody>{Object.entries(full.record.attributes).map(([k, a]) => (
                <tr key={k} className="border-t border-line align-top"><td className="py-1 pe-2">{LABEL[k] ?? k}</td><td className="break-words pe-2">{show(a.value)}</td><td className="pe-2">{CLASS[a.class] ?? a.class}</td><td>{a.approvedBy ? `decision ${a.approvedBy.decision.slice(0, 8)}…` : 'not decided'}</td></tr>
              ))}</tbody>
            </table>
            <div><p className="font-medium">Status history</p><ul className="text-xs">{full.product.history.map((h, i) => <li key={i}>{h.at.slice(0, 10)} · {full.labels[h.state] ?? h.state} · {h.reason}{h.decision ? ' · sealed decision' : ''}{h.case ? <> · <Link className="underline" href={`/gov/cases/${h.case}`}>case</Link></> : null}</li>)}</ul></div>
            <div><p className="font-medium">Versions</p><ul className="text-xs">{full.product.versions.map(v => <li key={v.n}>Version {v.n} · {v.at.slice(0, 10)} · {v.reason} · {v.by}</li>)}</ul></div>
            {full.product.enforcement.length ? <div><p className="font-medium">Enforcement</p><ul className="text-xs">{full.product.enforcement.map(e => <li key={e.id}>{e.at.slice(0, 10)} · {e.kind} · {e.approvedBy ? 'decided' : 'not decided'} · {e.publishedAt ? `published ${e.publishedAt.slice(0, 10)}: ${e.publicNotice}` : 'notice not published'}{e.grounds ? ` · grounds (restricted): ${e.grounds}` : ''}{e.completion ? ` · completion verified ${e.completion.at.slice(0, 10)}` : ''}</li>)}</ul></div> : null}
          </div>
        ) : null}
      </Section>

      <Section title="What the public check shows" meta="the nation's public information classification; administrators, two officials">
        <p className="text-sm text-ink-muted">Only attributes of the public class can be listed; the dossier, the assessment, composition, sites, findings and persons never leave the regulator. A change cites the law and applies when a different official confirms it.</p>
        {pending ? (
          <div className="mt-2 rounded border border-line p-2 text-sm">
            <p>Waiting for a second official (proposed by {pending.by}, until {pending.expiresAt.slice(0, 16).replace('T', ' ')}): {pending.values.fields.map(f => LABEL[f] ?? f).join(', ') || 'no attribute'} · {pending.basis.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`).join('; ')}</p>
            <span className="mt-1 flex gap-1">
              <Button onClick={() => void disclosure({ op: 'confirm-disclosure' }, 'Confirmed: the public check shows these attributes from now.')}>Confirm</Button>
              <Button variant="secondary" onClick={() => void disclosure({ op: 'withdraw-disclosure' }, 'Withdrawn.')}>Withdraw</Button>
            </span>
          </div>
        ) : (
          <>
            <fieldset className="mt-2 flex flex-wrap gap-3 text-sm"><legend className="sr-only">Attributes the public check shows</legend>
              {(list?.publishable ?? []).map(f => <label key={f} className="flex items-center gap-1"><input type="checkbox" checked={shown.includes(f)} onChange={e => setDraft(e.target.checked ? [...new Set([...shown, f])] : shown.filter(x => x !== f))} />{LABEL[f] ?? f}</label>)}
            </fieldset>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <label className="text-sm">Legal basis: law (id from Laws)<input className={field} value={law.instrument} onChange={e => setLaw(x => ({ ...x, instrument: e.target.value }))} placeholder="/eli/…" /></label>
              <label className="text-sm">Provision (e.g. sec_30)<input className={field} value={law.eId} onChange={e => setLaw(x => ({ ...x, eId: e.target.value }))} /></label>
            </div>
            {draft ? <Button className="mt-2" onClick={() => void disclosure({ op: 'propose-disclosure', fields: draft, legalBasis: law.instrument ? [{ instrument: law.instrument.trim(), eId: law.eId.trim() }] : [] }, 'Proposed: a different official confirms it.')}>Propose</Button> : null}
          </>
        )}
      </Section>
    </div>
  );
}
