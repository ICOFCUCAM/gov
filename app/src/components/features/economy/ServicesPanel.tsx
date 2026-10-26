'use client';

// The economic group's services (plan step I5): each procedure as this
// installation holds it (a procurement template: which institutions adopted
// it), who decides (the permit type and whether its mapping is approved),
// whether its periods are set, the rules it reads, and the catalogue forms it
// carries with their procedure-link state; the forms still waiting for a
// procedure, with why. Configuration only. Nothing here approves anything.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';

interface Form { identity: string; specId: string; title: string; stage: string; action?: string; link: string }
interface Proc {
  key: string; title: string; template: boolean; state: 'not-installed' | 'draft' | 'approved'; version?: number; adoptedBy?: { institution: string; state: string; version: number }[]; stages: number;
  decisions: { step: string; label: string; permitType: string | null; mapping: string }[]; periods: { label: string; set: boolean }[]; forms: Form[];
}
interface View { procedures: Proc[]; rules: { key: string; label: string; state: string }[]; waiting: { identity: string; specId: string; title: string; why: string }[]; counts: Record<string, number> }

const STATE: Record<Proc['state'], string> = { 'not-installed': 'not installed', draft: 'draft, not approved', approved: 'approved' };
const MAPPING: Record<string, string> = { approved: 'mapping approved', draft: 'mapping proposed, not approved', none: 'no mapping' };
const formHref = (f: { identity: string }) => `/gov/law/procedures/forms/${encodeURIComponent(f.identity)}`;

export function ServicesPanel({ group, names }: { group: 'finance' | 'procurement' | 'cabinet'; names?: Record<string, string> }) {
  const [view, setView] = React.useState<View | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    fetch(`/api/finance/services?group=${group}`, { cache: 'no-store' }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'Could not load the procedures'); setView(j as View); }).catch(e => setMsg((e as Error).message));
  }, [group]);
  const c = view?.counts;
  return (
    <Section title="Procedures, who decides and forms" meta={c ? `${c.approved} of ${c.procedures} procedures approved · ${c.mappingsApproved} of ${c.permitTypes} mappings approved · ${c.forms} forms` : undefined}>
      {msg ? <p role="alert" className="text-sm text-alert">{msg}</p> : null}
      {view ? (
        <div className="space-y-3 text-sm">
          <ul className="space-y-1 text-xs">
            {view.rules.map(r => <li key={r.key}><span className="font-medium">{r.label}</span> <span className="text-ink-muted">· {r.state}</span></li>)}
          </ul>
          <button type="button" className="text-xs underline" aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? 'Hide' : 'Show'} each procedure</button>
          {open ? view.procedures.map(p => (
            <div key={p.key} className="rounded border border-line p-2">
              <p className="font-medium">{p.title}</p>
              <p className="text-xs text-ink-muted">
                {p.key}{p.template ? ` · a template each institution adopts: ${p.adoptedBy?.length ? p.adoptedBy.map(a => `${names?.[a.institution] ?? a.institution} (${a.state})`).join(', ') : 'none yet'}` : ` · ${STATE[p.state]}${p.version ? ` (version ${p.version})` : ''}`}
              </p>
              <ul className="mt-1 text-xs text-ink-muted">
                {p.decisions.map(d => <li key={d.step}>{d.label} · {d.permitType ?? 'unclassified'} · {MAPPING[d.mapping]}</li>)}
                {p.periods.map(d => <li key={d.label}>{d.label} · {d.set ? 'set by the nation' : 'not set: the nation sets it before approval'}</li>)}
              </ul>
              {p.forms.length ? <ul className="mt-1 text-xs">{p.forms.map(f => <li key={f.identity}><Link className="underline" href={formHref(f)}>{f.title}</Link> <span className="text-ink-muted">· {f.stage}{f.action ? ` · ${f.action}` : ''} · procedure {f.link}</span></li>)}</ul> : null}
            </div>
          )) : null}
          {view.waiting.length ? (
            <details className="text-xs">
              <summary className="cursor-pointer">Forms waiting for a procedure ({view.waiting.length})</summary>
              <ul className="mt-1 space-y-1">{view.waiting.map(f => <li key={f.identity}><Link className="underline" href={formHref(f)}>{f.title}</Link> <span className="text-ink-muted">· {f.why}</span></li>)}</ul>
            </details>
          ) : null}
          <p className="text-xs"><Link className="underline" href="/gov/law/procedures">Procedures</Link> · <Link className="underline" href="/gov/law/permit-authorities">Who decides each permit</Link> · <Link className="underline" href="/gov/law/rules">Rates, thresholds and tiers</Link></p>
        </div>
      ) : null}
    </Section>
  );
}

/** An amount in minor units, with its currency (never the nation's guess: the record's own currency). */
export const money = (minor: number | undefined, currency: string) => (minor === undefined ? '—' : `${currency} ${(minor / 100).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
export const day = (iso?: string) => (iso ? iso.slice(0, 10) : '—');
