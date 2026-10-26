'use client';

// The front door in the citizen's wallet (plan step I13; /api/citizen/applications,
// lib/frontdoor/journey.ts): how they prove who they are, the catalogue
// services that take an application online (each through its own form; for
// another person only within the representation that person granted), and
// every application they follow: where it went, its stage and deadlines, the
// sealed decisions, and a request to reconsider a decision, which goes to the
// institution that decided it.

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FormRenderer, type Submission, type SubmitResult } from '@/components/features/forms/FormRenderer';
import type { FormView } from '@/lib/forms/contract';

interface Service { id: string; name: string; owner: string; status: string; representatives: boolean; form: FormView | null }
interface Tracked {
  id: string; ref: string; procedure: string; service?: string; institution: string; stage: string; openedAt: string; closedAt: string | null; role: string;
  deadlines: { label: string; due: string; met?: string; lapsed?: string; sample?: true }[];
  decisions: { id: string; decision: string; at: string }[];
  certificates: { code: string; title: string; status: string }[];
  challenge: { available: boolean; why?: string };
  reconsiderations: { ref: string; outcome?: string }[];
}
const field = 'mt-1 block w-full rounded border border-line bg-surface px-2 py-1.5 text-sm';

export function FrontDoor() {
  const [services, setServices] = React.useState<Service[]>([]);
  const [tracked, setTracked] = React.useState<Tracked[]>([]);
  const [identity, setIdentity] = React.useState<string>('');
  const [chosen, setChosen] = React.useState('');
  const [forWhom, setForWhom] = React.useState('');
  const [plain, setPlain] = React.useState<Record<string, string>>({});
  const [msg, setMsg] = React.useState<string | null>(null);
  const load = React.useCallback(() => {
    fetch('/api/citizen/applications', { cache: 'no-store' }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setServices(j.services ?? []); setTracked(j.tracked ?? []); setIdentity(j.identity?.statement ?? ''); }).catch(e => setMsg((e as Error).message));
  }, []);
  React.useEffect(load, [load]);
  React.useEffect(() => { const s = new URLSearchParams(window.location.search).get('service'); if (s) setChosen(s); }, []);
  const service = services.find(s => s.id === chosen);
  const send = async (fields: Record<string, unknown>, extra: Partial<Submission> = {}): Promise<SubmitResult> => {
    const r = await fetch('/api/citizen/applications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: chosen, fields, ...(forWhom.trim() ? { onBehalfOf: forWhom.trim() } : {}), ...(extra.declaration ? { declaration: extra.declaration } : {}), ...(extra.locale ? { locale: extra.locale } : {}), ...(extra.idempotencyKey ? { idempotencyKey: extra.idempotencyKey } : {}) }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { load(); setMsg(`Sent. Your reference is ${j.application.ref}.`); }
    return r.ok ? { ok: true, receipt: j.receipt } : { ok: false, error: j.error ?? `Not sent (${r.status})`, ...(j.fieldErrors ? { fieldErrors: j.fieldErrors } : {}) };
  };
  const reconsider = async (t: Tracked) => {
    const grounds = window.prompt('Why should the decision be reconsidered? The institution that decided it reviews it, by officials who took no part in it.');
    if (!grounds) return;
    const r = await fetch('/api/citizen/applications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'reconsider', case: t.id, grounds }) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? `Your request is ${j.application.ref}.` : j.error ?? 'Not sent');
    if (r.ok) load();
  };
  return (
    <div className="space-y-3">
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      <Card tight>
        <h2 className="font-semibold">Apply for a service</h2>
        <p className="mt-1 text-sm text-ink-muted">{identity} The full list is at <Link className="underline" href="/services">Public services</Link>.</p>
        {services.length ? (
          <>
            <label className="mt-2 block text-sm">Service<select className={field} value={chosen} onChange={e => setChosen(e.target.value)}><option value="">Choose…</option>{services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.owner})</option>)}</select></label>
            {service?.representatives ? <label className="mt-2 block text-sm">For another person (their identifier; only within a representation they granted you)<input className={field} value={forWhom} onChange={e => setForWhom(e.target.value)} /></label> : null}
            {service?.form?.form ? <div className="mt-2"><FormRenderer view={service.form} channel="self-service" submit={(x: Submission) => send(x.fields, x)} /></div> : null}
            {service && !service.form?.form ? (
              <div className="mt-2 grid gap-2">
                {(service.form?.fields ?? []).filter(x => (x.audience ?? 'applicant') === 'applicant').map(x => <label key={x.key} className="text-sm">{x.label}<input className={field} value={plain[x.key] ?? ''} onChange={e => setPlain(p => ({ ...p, [x.key]: e.target.value }))} /></label>)}
                <Button variant="primary" onClick={() => void send(plain)}>Send the application</Button>
              </div>
            ) : null}
          </>
        ) : <p className="mt-1 text-sm text-ink-muted">No service takes applications online yet.</p>}
        <p className="mt-2 text-xs"><Link className="underline" href="/wallet/representation">Who may act for you</Link></p>
      </Card>
      <Card tight>
        <h2 className="font-semibold">Follow your applications</h2>
        {tracked.length ? (
          <ul className="mt-2 space-y-2 text-sm">{tracked.map(t => (
            <li key={t.id} className="border-t border-line pt-2">
              <strong>{t.ref}</strong> · {t.service ?? t.procedure} · {t.institution} · {t.stage}{t.role !== 'own' ? ` · ${t.role}` : ''}
              {t.deadlines.filter(d => !d.met).map(d => <span key={d.label} className="block text-xs">{d.label}: {d.lapsed ? 'passed' : `by ${d.due.slice(0, 10)}`}{d.sample ? ' (sample period)' : ''}</span>)}
              {t.decisions.map(d => <span key={d.id} className="block text-xs">Decision {d.decision} on {d.at.slice(0, 10)}</span>)}
              {t.certificates.map(c => <span key={c.code} className="block text-xs">{c.title}: <a className="underline" href={`/verify/${c.code}`}>{c.code}</a> ({c.status})</span>)}
              {t.reconsiderations.map(r => <span key={r.ref} className="block text-xs">Reconsideration {r.ref}: {r.outcome ?? 'in progress'}</span>)}
              {t.challenge.available ? <Button className="mt-1" variant="secondary" onClick={() => void reconsider(t)}>Ask for reconsideration</Button> : t.closedAt && t.challenge.why ? <span className="block text-xs text-ink-muted">{t.challenge.why}</span> : null}
            </li>
          ))}</ul>
        ) : <p className="mt-1 text-sm text-ink-muted">Nothing to follow yet.</p>}
      </Card>
    </div>
  );
}
