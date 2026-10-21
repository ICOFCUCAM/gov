'use client';

// The tax services (plan step I5, forms batch 6): each tax procedure as this
// installation holds it, who decides (the permit type and whether its
// mapping is approved), whether its periods are set, and the catalogue forms
// it carries with their procedure-link state; the forms still waiting for a
// procedure, with why. Configuration only: no taxpayer data (the register is
// the Tax tab, read under tax secrecy). Nothing here approves anything:
// procedures are approved by a second official at Procedures, mappings at
// Who decides each permit.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';

interface Form { identity: string; specId: string; title: string; batch: number; stage: string; action?: string; link: string }
interface Proc {
  key: string; title: string; state: 'not-installed' | 'draft' | 'approved'; version?: number; stages: number;
  decisions: { step: string; label: string; permitType: string | null; mapping: 'approved' | 'draft' | 'none' }[];
  periods: { label: string; set: boolean }[]; forms: Form[];
}
interface View { procedures: Proc[]; waiting: { identity: string; specId: string; title: string; batch: number; why: string }[]; counts: Record<string, number> }

const STATE: Record<Proc['state'], string> = { 'not-installed': 'not installed', draft: 'draft, not approved', approved: 'approved' };
const MAPPING: Record<string, string> = { approved: 'mapping approved', draft: 'mapping proposed, not approved', none: 'no mapping' };
const formHref = (f: { specId: string }) => `/gov/law/procedures/forms/${encodeURIComponent(f.specId)}`;

export function TaxServices() {
  const [view, setView] = React.useState<View | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  React.useEffect(() => {
    fetch('/api/tax/services', { cache: 'no-store' }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'Could not load the tax services'); setView(j as View); }).catch(e => setMsg((e as Error).message));
  }, []);
  const c = view?.counts;
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Tax services</h1>
      <p className="max-w-3xl text-sm text-ink-muted">
        How each tax service runs in this installation: returns and their amendment, objections, refunds, payment arrangements, voluntary disclosure,
        rulings, compliance reviews and changes to a registration. Each is a procedure the tax authority adapts to its law and a second official approves;
        every decision is made by two officials under an approved mapping of who decides. No rate, interest, penalty or period ships: each comes from the
        nation&apos;s approved rules (<Link className="underline" href="/gov/law/rules">Rates and tariffs</Link>). Taxpayer records are on the <Link className="underline" href="/gov/tax">Tax</Link> tab, read only by the tax authority.
      </p>
      {msg ? <p role="alert" className="text-sm text-alert">{msg}</p> : null}
      {c ? (
        <p className="text-sm">
          {c.procedures} procedures, {c.approved} approved · who decides: {c.mappingsApproved} of {c.permitTypes} mappings approved · {c.forms} catalogue forms, {c.linked} carried by a procedure, {c.waiting} waiting.
          {' '}<Link className="underline" href="/gov/law/procedures">Procedures</Link> · <Link className="underline" href="/gov/law/permit-authorities">Who decides each permit</Link>
        </p>
      ) : null}
      {view?.procedures.map(p => (
        <Section key={p.key} title={p.title} meta={`${p.key} · ${STATE[p.state]}${p.version ? ` (version ${p.version})` : ''}`}>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <p className="font-medium">Decisions</p>
              <ul className="text-xs text-ink-muted">
                {p.decisions.map(d => <li key={d.step}>{d.label} · {d.permitType ?? 'unclassified'} · {MAPPING[d.mapping]}</li>)}
              </ul>
              {p.periods.length ? (
                <>
                  <p className="mt-2 font-medium">Periods</p>
                  <ul className="text-xs text-ink-muted">{p.periods.map(d => <li key={d.label}>{d.label} · {d.set ? 'set by the nation' : 'not set: the nation sets it before approval'}</li>)}</ul>
                </>
              ) : null}
            </div>
            <div>
              <p className="font-medium">Forms it carries ({p.forms.length})</p>
              {p.forms.length ? (
                <ul className="text-xs">
                  {p.forms.map(f => <li key={f.identity}><Link className="underline" href={formHref(f)}>{f.title}</Link> <span className="text-ink-muted">· {f.stage}{f.action ? ` · ${f.action}` : ''} · procedure {f.link}</span></li>)}
                </ul>
              ) : <p className="text-xs text-ink-muted">The specification&apos;s own form, attached to the procedure.</p>}
            </div>
          </div>
        </Section>
      ))}
      {view ? (
        <Section title="Forms waiting for a procedure" meta={`${view.waiting.length} contract drafts`}>
          <ul className="space-y-1 text-xs">
            {view.waiting.map(f => <li key={f.identity}><Link className="underline" href={formHref(f)}>{f.title}</Link> <span className="text-ink-muted">· {f.why}</span></li>)}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
