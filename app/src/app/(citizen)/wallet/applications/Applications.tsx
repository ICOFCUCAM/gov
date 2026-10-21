'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FormRenderer, type Submission, type SubmitResult } from '@/components/features/forms/FormRenderer';
import type { FormView } from '@/lib/forms/contract';

interface App { id: string; ref: string; procedure: string; stage: string; openedAt: string; closedAt: string | null; certificates: { code: string; title: string; status: string }[] }
const field = 'mt-1 block w-full rounded border border-line bg-surface px-2 py-1.5 text-sm';

export function Applications() {
  const [apps, setApps] = React.useState<App[] | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  // Each procedure's form in force (null: no approved version). A procedure with a form is asked through it: one question per page, check your answers, the declaration, a receipt.
  const [forms, setForms] = React.useState<Record<string, FormView | null>>({});
  const [f, setF] = React.useState({ childGiven: '', childFamily: '', sex: 'unknown', birthDate: '', birthPlace: '', motherGiven: '', motherFamily: '', fatherGiven: '', fatherFamily: '' });
  const load = React.useCallback(() => {
    fetch('/api/citizen/applications', { cache: 'no-store' }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setApps(j.applications); setForms(j.forms ?? {}); }).catch(e => setMsg((e as Error).message));
  }, []);
  React.useEffect(load, [load]);
  const submit = async () => {
    setMsg(null);
    const r = await fetch('/api/citizen/applications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ procedure: 'civil.birth', fields: { ...f, informantName: [f.motherGiven, f.motherFamily].join(' ').trim(), informantRelation: 'parent' }, idempotencyKey: `${f.childFamily}-${f.birthDate}` }) });
    const j = await r.json();
    setMsg(r.ok ? `Sent. Your reference is ${j.application.ref}. The civil registry will ask for the birth notification from the health facility if it has not received it.` : j.error);
    if (r.ok) load();
  };
  const [inc, setInc] = React.useState({ occurredOn: '', place: '', account: '', contact: '' });
  const report = async () => {
    setMsg(null);
    const r = await fetch('/api/citizen/applications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ procedure: 'police.incident', fields: { ...inc, reportingParty: 'The signed-in person' }, idempotencyKey: `incident-${inc.occurredOn}-${inc.place.slice(0, 30)}` }) });
    const j = await r.json();
    setMsg(r.ok ? `Reported. Your reference is ${j.application.ref}. The police will triage it and contact you if they need more.` : j.error);
    if (r.ok) { load(); setInc({ occurredOn: '', place: '', account: '', contact: '' }); }
  };
  const sendForm = (procedure: string) => async (x: Submission): Promise<SubmitResult> => {
    const r = await fetch('/api/citizen/applications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ procedure, fields: x.fields, declaration: x.declaration, locale: x.locale, idempotencyKey: x.idempotencyKey }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) load();
    return r.ok ? { ok: true, receipt: j.receipt } : { ok: false, error: j.error ?? `Not sent (${r.status})`, ...(j.fieldErrors ? { fieldErrors: j.fieldErrors } : {}) };
  };
  const birthForm = forms['civil.birth']?.form ? forms['civil.birth'] : null;
  const incidentForm = forms['police.incident']?.form ? forms['police.incident'] : null;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(x => ({ ...x, [k]: e.target.value }));
  return (
    <div className="space-y-3">
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      <Card tight>
        <h2 className="font-semibold">Applications</h2>
        {apps?.length ? (
          <ul className="mt-2 space-y-2 text-sm">
            {apps.map(a => <li key={a.id}><strong>{a.ref}</strong> · {a.procedure} · {a.stage}{a.certificates.map(c => <span key={c.code} className="block">{c.title}: <a className="underline" href={`/verify/${c.code}`}>{c.code}</a> ({c.status})</span>)}</li>)}
          </ul>
        ) : <p className="mt-1 text-sm text-ink-muted">{apps ? 'You have no applications yet.' : 'Loading…'}</p>}
      </Card>
      {birthForm ? (
        <Card tight>
          <h2 className="font-semibold">Notify a birth</h2>
          <div className="mt-2"><FormRenderer view={birthForm} channel="self-service" submit={sendForm('civil.birth')} /></div>
        </Card>
      ) : null}
      {birthForm ? null : <Card tight>
        <h2 className="font-semibold">Notify a birth</h2>
        <div className="mt-2 grid gap-2">
          <label className="text-sm">Child&apos;s given names<input className={field} value={f.childGiven} onChange={set('childGiven')} /></label>
          <label className="text-sm">Child&apos;s family name<input className={field} value={f.childFamily} onChange={set('childFamily')} /></label>
          <label className="text-sm">Sex<select className={field} value={f.sex} onChange={set('sex')}><option value="female">female</option><option value="male">male</option><option value="other">other</option><option value="unknown">not stated</option></select></label>
          <label className="text-sm">Date of birth<input type="date" className={field} value={f.birthDate} onChange={set('birthDate')} /></label>
          <label className="text-sm">Place of birth<input className={field} value={f.birthPlace} onChange={set('birthPlace')} /></label>
          <label className="text-sm">Mother&apos;s given names<input className={field} value={f.motherGiven} onChange={set('motherGiven')} /></label>
          <label className="text-sm">Mother&apos;s family name<input className={field} value={f.motherFamily} onChange={set('motherFamily')} /></label>
          <label className="text-sm">Father&apos;s given names (if declared)<input className={field} value={f.fatherGiven} onChange={set('fatherGiven')} /></label>
          <label className="text-sm">Father&apos;s family name (if declared)<input className={field} value={f.fatherFamily} onChange={set('fatherFamily')} /></label>
        </div>
        <Button className="mt-3" variant="primary" disabled={!f.childGiven || !f.childFamily || !f.birthDate || !f.motherFamily} onClick={submit}>Send to the civil registry</Button>
      </Card>}
      {incidentForm ? (
        <Card tight>
          <h2 className="font-semibold">Report an incident to the police</h2>
          <p className="mt-1 text-sm"><strong>If someone is in danger now, call the emergency number.</strong> This form is for things that have already happened and need recording. Your report is read only by the police officers handling it.</p>
          <div className="mt-2"><FormRenderer view={incidentForm} channel="self-service" submit={sendForm('police.incident')} /></div>
        </Card>
      ) : null}
      {incidentForm ? null : <Card tight>
        <h2 className="font-semibold">Report an incident to the police</h2>
        <p className="mt-1 text-sm"><strong>If someone is in danger now, call the emergency number.</strong> This form is for things that have already happened and need recording. Your report is read only by the police officers handling it.</p>
        <div className="mt-2 grid gap-2">
          <label className="text-sm">When it happened<input type="date" className={field} value={inc.occurredOn} onChange={e => setInc(x => ({ ...x, occurredOn: e.target.value }))} /></label>
          <label className="text-sm">Where it happened<input className={field} value={inc.place} onChange={e => setInc(x => ({ ...x, place: e.target.value }))} /></label>
          <label className="text-sm">What happened<textarea className={field} rows={4} value={inc.account} onChange={e => setInc(x => ({ ...x, account: e.target.value }))} /></label>
          <label className="text-sm">How the police can reach you<input className={field} value={inc.contact} onChange={e => setInc(x => ({ ...x, contact: e.target.value }))} /></label>
        </div>
        <Button className="mt-3" variant="primary" disabled={!inc.occurredOn || !inc.place || !inc.account} onClick={report}>Send to the police</Button>
      </Card>}
    </div>
  );
}
