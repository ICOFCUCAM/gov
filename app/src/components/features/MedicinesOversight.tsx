'use client';

// The medicines regulator's oversight work beside its register (Health I4):
// the cases of corrective action, import and controlled-medicine
// authorisation, safety reports, device incidents and reconsideration (lists
// carry no personal field; each case opens on its own page, every read
// logged), the recall notices and safety alerts sent through HX-005 with the
// subscribers two officials approved (approved ones only), and the
// controlled-medicine quantity limits the nation's law sets, changed by two
// officials citing the law.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { SignalTag } from '@/components/ui/SignalTag';

const PROCEDURES: { key: string; title: string }[] = [
  { key: 'medicines.safety-report', title: 'Safety reports' },
  { key: 'medicines.device-incident', title: 'Device incidents' },
  { key: 'medicines.import-authorisation', title: 'Import authorisations' },
  { key: 'medicines.controlled', title: 'Controlled medicines' },
  { key: 'medicines.corrective-action', title: 'Corrective action plans' },
  { key: 'medicines.reconsideration', title: 'Reconsiderations' },
];
interface CaseRow { id: string; ref: string; stage: string; openedAt: string; closedAt?: string; source: string; package: { key: string }; assignee?: { name: string } }
interface Notice { notice: string; kind: 'recall' | 'safety_notice'; product: { productId: string; kind: string }; recallClass?: string; reference: string; decidedOn: string; publishedOn: string; supplyChainNotice: string; sample?: true }
interface Oversight {
  notices: Notice[];
  subscribers: { id: string; name: string; ownerOrg: string; purposes: string[]; approvedAt?: string }[];
  deliveries: { notices: number; queued: number; collected: number };
  limits: { limits: { schedule: string; unit: string; max: number }[]; version: number };
  limitChanges: { pending?: { by: string; expiresAt: string; values: { limits: { schedule: string; unit: string; max: number }[] }; basis: { title?: string; instrument: string; num?: string; eId: string }[] } };
  imports: { total: number; samples: number }; controlled: { total: number; samples: number }; controlledAuthorityNamed: boolean;
}
const words = (s: string) => s.replace(/-/g, ' ');
const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';

export function MedicinesOversight() {
  const [cases, setCases] = React.useState<Record<string, CaseRow[] | string>>({});
  const [data, setData] = React.useState<Oversight | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState('');
  const [law, setLaw] = React.useState({ instrument: '', eId: '' });
  const load = React.useCallback(async () => {
    const r = await fetch('/api/health-regulation/products?view=oversight', { cache: 'no-store' });
    const j = await r.json().catch(() => null);
    if (j && r.ok) setData(j); else setMsg(j?.error ?? 'Could not read the notices and limits');
    const out: Record<string, CaseRow[] | string> = {};
    await Promise.all(PROCEDURES.map(async p => {
      const c = await fetch(`/api/cases?procedure=${encodeURIComponent(p.key)}&limit=20`, { cache: 'no-store' });
      const cj = await c.json().catch(() => null);
      out[p.key] = c.ok && cj ? cj.cases : cj?.error ?? 'Not readable';
    }));
    setCases(out);
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  const limits = async (body: Record<string, unknown>, done: string) => {
    const r = await fetch('/api/health-regulation/products', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    setMsg(r.ok ? done : j.error);
    if (r.ok) setDraft('');
    await load();
  };
  const parsed = draft.split('\n').map(l => l.split('|').map(x => x.trim())).filter(x => x[0]).map(([schedule, unit, max]) => ({ schedule, unit, max: Number(max) }));
  const pending = data?.limitChanges.pending;

  return (
    <div className="space-y-4">
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      <Section title="Oversight cases" meta="lists carry no personal field; each case read is logged">
        <p className="mb-2 text-sm text-ink-muted">
          Safety reports and device incidents are signals about a product, assessed by the assigned officer with reasons: never a finding by themselves, never a score.
          The assessment may open the product&apos;s own variation, suspension or recall case, or lead to a safety alert two officials decide.
          Reconsiderations are decided by officials other than those who made the decision; an appeal to a court stays with the court.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {PROCEDURES.map(p => {
            const rows = cases[p.key];
            return (
              <div key={p.key} className="min-w-0 rounded border border-line p-2">
                <p className="text-sm font-medium">{p.title} <span className="text-xs text-ink-muted">({p.key})</span></p>
                {rows === undefined ? <p className="text-xs text-ink-muted">Loading…</p> : typeof rows === 'string' ? <p className="text-xs text-ink-muted">{rows}</p> : rows.length ? (
                  <ul className="mt-1 space-y-1 text-xs">{rows.map(c => (
                    <li key={c.id} className="flex flex-wrap items-center gap-1">
                      <Link className="underline" href={`/gov/cases/${c.id}`}>{c.ref}</Link> · {words(c.stage)} · opened {c.openedAt.slice(0, 10)}{c.closedAt ? ` · closed ${c.closedAt.slice(0, 10)}` : ''}{c.assignee ? ` · ${c.assignee.name}` : ''}
                      {c.source === 'sample' ? <SignalTag kind="sample" source="a sample case of a demonstration" /> : null}
                    </li>
                  ))}</ul>
                ) : <p className="text-xs text-ink-muted">No case yet.</p>}
              </div>
            );
          })}
        </div>
        {data ? <p className="mt-2 text-xs text-ink-muted">{data.imports.total} import authorisation(s) and {data.controlled.total} controlled-medicine authorisation(s) recorded through decided cases.</p> : null}
      </Section>

      <Section title="Recall notices and safety alerts (HX-005)" meta="approved subscribers only; the public view only">
        <p className="mb-2 text-sm text-ink-muted">
          When a recall or safety alert is decided and its public notice published, a notice goes to each institution, facility or pharmacy two officials approved for this service and a purpose
          (<Link className="underline" href="/integrations">Data sharing</Link>). It carries only the product&apos;s public view, the recall class, the case reference and its dates: never the grounds, the report or who made it.
          The holder&apos;s own notice to its supply chain stays a document of the recall case.
        </p>
        <p className="text-sm font-medium">Approved subscribers</p>
        {data ? data.subscribers.length ? (
          <ul className="mt-1 space-y-1 text-sm">{data.subscribers.map(s => <li key={s.id}>{s.name} · {s.ownerOrg} · purposes: {s.purposes.join(', ')}{s.approvedAt ? ` · approved ${s.approvedAt.slice(0, 10)}` : ''}</li>)}</ul>
        ) : <p className="text-sm text-ink-muted">None approved. None ships: two officials approve each subscriber and its purpose.</p> : null}
        {data ? <p className="mt-2 text-xs text-ink-muted">{data.deliveries.notices} notice(s) issued · {data.deliveries.collected} delivery(ies) collected · {data.deliveries.queued} waiting for their subscriber</p> : null}
        {data?.notices.length ? (
          <ul className="mt-2 space-y-1 text-xs">{data.notices.map(n => (
            <li key={n.notice} className="flex flex-wrap items-center gap-1">{n.notice} · {n.kind === 'recall' ? 'recall' : 'safety alert'} · {n.product.productId}{n.recallClass ? ` · class ${n.recallClass}` : ''} · case {n.reference} · decided {n.decidedOn} · published {n.publishedOn}{n.kind === 'recall' ? ` · supply-chain notice ${n.supplyChainNotice}` : ''}{n.sample ? <SignalTag kind="sample" source="a sample case of a demonstration" /> : null}</li>
          ))}</ul>
        ) : null}
      </Section>

      <Section title="Controlled-medicine quantity limits" meta="the nation's controlled-substances law; administrators, two officials">
        <p className="text-sm text-ink-muted">
          The most one authorisation may cover, per schedule and unit. None ship: until two officials adopt them citing the law, a production installation refuses every controlled-medicine authorisation.
          {data && !data.controlledAuthorityNamed ? ' No controlled-substances authority is named under Who is responsible yet.' : ''}
        </p>
        {data ? data.limits.version ? <ul className="mt-1 text-sm">{data.limits.limits.map(l => <li key={`${l.schedule}|${l.unit}`}>{l.schedule}: up to {l.max} {l.unit}</li>)}<li className="text-xs text-ink-muted">Version {data.limits.version}</li></ul> : <p className="mt-1 text-sm text-ink-muted">No limits adopted.</p> : null}
        {pending ? (
          <div className="mt-2 rounded border border-line p-2 text-sm">
            <p>Waiting for a second official (proposed by {pending.by}, until {pending.expiresAt.slice(0, 16).replace('T', ' ')}): {pending.values.limits.map(l => `${l.schedule} ${l.max} ${l.unit}`).join('; ') || 'no limit'} · {pending.basis.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`).join('; ')}</p>
            <span className="mt-1 flex gap-1">
              <Button onClick={() => void limits({ op: 'confirm-limits' }, 'Confirmed: the limits apply to decisions from now.')}>Confirm</Button>
              <Button variant="secondary" onClick={() => void limits({ op: 'withdraw-limits' }, 'Withdrawn.')}>Withdraw</Button>
            </span>
          </div>
        ) : (
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <label className="text-sm md:col-span-3">Limits, one per line: schedule | unit | most per authorisation<textarea className={field} rows={3} value={draft} onChange={e => setDraft(e.target.value)} /></label>
            <label className="text-sm">Legal basis: law (id from Laws)<input className={field} value={law.instrument} onChange={e => setLaw(x => ({ ...x, instrument: e.target.value }))} placeholder="/eli/…" /></label>
            <label className="text-sm">Provision (e.g. sec_4)<input className={field} value={law.eId} onChange={e => setLaw(x => ({ ...x, eId: e.target.value }))} /></label>
            <span className="flex items-end">{parsed.length ? <Button onClick={() => void limits({ op: 'propose-limits', limits: parsed, legalBasis: law.instrument ? [{ instrument: law.instrument.trim(), eId: law.eId.trim() }] : [] }, 'Proposed: a different official confirms it.')}>Propose</Button> : null}</span>
          </div>
        )}
      </Section>
    </div>
  );
}
