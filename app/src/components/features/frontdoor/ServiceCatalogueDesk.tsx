'use client';

// The public service catalogue for officials (plan step I13; /api/services,
// lib/frontdoor/catalogue.ts). Every service with every version, its status
// computed now from the records (and why it is not what its owner declared),
// its journey step by step, and how citizens prove who they are. A version is
// proposed by an official of the owning institution and published or retired
// by a different person who can sign there; the server checks each act. The
// public sees only published entries, at /services.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { SignalTag } from '@/components/ui/SignalTag';

type Json = Record<string, unknown>;
interface Version { n: number; state: string; reason: string; proposedBy: { name: string }; proposedAt: string; publishedBy?: { name: string }; publishedAt?: string; terms: { name: string; declared: string; procedure?: string; forms: string[]; channels: string[]; fee: { rule: string } | null } }
interface Row { id: string; name: string; owner: string; status: string; statusLabel: string; reasons: string[]; stages: string[]; procedure: { key: string; version: number } | null; fee: { rule: string; approved: boolean } | null; versions: Version[]; retirement: { state: string; proposedBy: { name: string }; reason: string }[]; sample?: true }
interface Data { services: Row[]; counts: Json; identity: { statement: string; provider: { issuer: string } | null; assisted: boolean }; channels: { key: string; label: string }[]; slots: { key: string; label: string }[]; institutions: { id: string; name: string }[]; templates: { key: string; title: string; forms: string[]; adoptedBy: { key: string; institution: string; state: string }[] }[] }
interface Step { key: string; label: string; state: string; detail: string }

const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';
const TONE: Record<string, string> = { active: 'text-ok', pilot: 'text-ok', informational: 'text-ink', unavailable: 'text-alert', retired: 'text-ink-muted', unpublished: 'text-ink-muted' };

export function ServiceCatalogueDesk() {
  const [data, setData] = React.useState<Data | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [journey, setJourney] = React.useState<{ id: string; steps: Step[] } | null>(null);
  const load = React.useCallback(() => { fetch('/api/services', { cache: 'no-store' }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setData(j); }).catch(e => setMsg((e as Error).message)); }, []);
  React.useEffect(load, [load]);
  const post = async (body: Json, done: string) => {
    setMsg(null);
    const r = await fetch('/api/services', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? done : j.error ?? `Refused (${r.status})`);
    if (r.ok) load();
  };
  const showJourney = async (id: string) => { const r = await fetch(`/api/services?journey=${encodeURIComponent(id)}`, { cache: 'no-store' }); const j = await r.json(); if (r.ok) setJourney({ id, steps: j.steps }); else setMsg(j.error); };

  const [f, setF] = React.useState<Record<string, string>>({ declared: 'active', ownerKind: 'institution', privacy: 'normal' });
  const [channels, setChannels] = React.useState<string[]>(['online', 'assisted']);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(x => ({ ...x, [k]: e.target.value }));
  const lines = (s?: string) => (s ?? '').split('\n').map(x => x.trim()).filter(Boolean);
  const propose = () => post({
    op: 'propose', ...(f.id ? { id: f.id } : {}), reason: f.reason ?? '',
    terms: {
      name: f.name ?? '', description: f.description ?? '', owner: f.ownerKind === 'slot' ? { slot: f.owner ?? '' } : { institution: f.owner ?? '' },
      legalBasis: [{ instrument: f.instrument ?? '', eId: f.eId ?? '' }], procedure: f.procedure ?? '', forms: lines(f.forms), fee: f.fee ? { rule: f.fee } : null,
      channels, declared: f.declared, representatives: f.representatives === 'yes', eligibility: f.eligibility ?? '', evidence: lines(f.evidence), outcome: f.outcome ?? '', review: f.review ?? '',
      languages: lines(f.languages), accessibility: f.accessibility ?? '', privacy: f.privacy, contact: f.contact ?? '', lifeEvents: lines(f.lifeEvents), category: f.category ?? '',
    },
  }, 'Proposed: a different official who can sign at the owning institution publishes it.');
  const [adoptFor, setAdoptFor] = React.useState('');

  return (
    <div className="space-y-5 p-4">
      <h1 className="text-xl font-semibold">Service catalogue</h1>
      <p className="max-w-3xl text-sm text-ink-muted">Every service the government offers, as a record: who owns it, the law it rests on, the procedure and forms that carry it, its fee (only as a rule in <Link className="underline" href="/gov/law/rules">Rates and tariffs</Link>, never an amount), channels and languages. What the public sees at <Link className="underline" href="/services">/services</Link> is only the published version, and its status is worked out from the records each time: a service whose procedure is not approved never shows as active.</p>
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      {data ? (
        <>
          <Section title="How people prove who they are" meta={data.identity.provider ? 'identity provider connected' : 'not connected'}>
            <p className="text-sm">{data.identity.statement} <Link className="underline" href="/gov/configuration">Configuration</Link></p>
          </Section>
          <Section title="Services" meta={`${data.services.length} in the catalogue`}>
            {data.services.length ? (
              <ul className="space-y-2">
                {data.services.map(s => {
                  const waiting = s.versions.find(v => v.state === 'proposed');
                  const retiring = s.retirement.find(r => r.state === 'proposed');
                  return (
                    <li key={s.id} className="rounded border border-line p-2 text-sm">
                      <p className="flex flex-wrap items-center gap-2"><strong>{s.name}</strong><span className="font-mono text-xs">{s.id}</span> · {s.owner} · <span className={TONE[s.status] ?? ''}>{s.statusLabel}</span>{s.sample ? <SignalTag kind="sample" source="a demonstration entry" /> : null}</p>
                      {s.reasons.length ? <p className="text-xs text-ink-muted">Why: {s.reasons.join('; ')}</p> : null}
                      <p className="text-xs text-ink-muted">{s.procedure ? `Procedure ${s.procedure.key} version ${s.procedure.version}` : 'No procedure in force'}{s.stages.length ? ` · ${s.stages.join(' → ')}` : ''}{s.fee ? ` · fee rule ${s.fee.rule} (${s.fee.approved ? 'approved' : 'not approved'})` : ''}</p>
                      <details className="mt-1 text-xs"><summary className="cursor-pointer">Versions ({s.versions.length})</summary>
                        <ul>{s.versions.map(v => <li key={v.n} className="border-t border-line py-1">Version {v.n} · {v.state} · {v.terms.declared} · proposed by {v.proposedBy.name} on {v.proposedAt.slice(0, 10)}{v.publishedBy ? ` · published by ${v.publishedBy.name} on ${v.publishedAt?.slice(0, 10)}` : ''} · {v.reason}</li>)}</ul>
                      </details>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {waiting ? <Button variant="secondary" onClick={() => post({ op: 'publish', id: s.id }, `Version ${waiting.n} published.`)}>Publish version {waiting.n} (proposed by {waiting.proposedBy.name})</Button> : null}
                        {waiting ? <Button variant="secondary" onClick={() => post({ op: 'withdraw', id: s.id, reason: 'Withdrawn from the console' }, 'Withdrawn; the proposal is kept.')}>Withdraw the proposal</Button> : null}
                        {s.status !== 'unpublished' ? <Button variant="secondary" onClick={() => showJourney(s.id)}>Journey</Button> : null}
                        {retiring ? <Button variant="secondary" onClick={() => post({ op: 'decide-retirement', id: s.id, decision: 'confirm' }, 'Retired: the record is kept.')}>Confirm retirement (proposed by {retiring.proposedBy.name})</Button> : null}
                        {!retiring && s.status !== 'retired' && s.status !== 'unpublished' ? <Button variant="secondary" onClick={() => { const reason = window.prompt('Why is the service retired?'); const plan = reason ? window.prompt('Plan for applications in progress and where people go instead') : null; if (reason && plan) void post({ op: 'retire', id: s.id, reason, plan }, 'Retirement proposed: a different official confirms it.'); }}>Propose retirement</Button> : null}
                        <Button variant="secondary" onClick={() => setF(x => ({ ...x, id: s.id, name: s.name }))}>Propose a new version</Button>
                      </div>
                      {journey?.id === s.id ? (
                        <ol className="mt-2 space-y-1 text-xs">{journey.steps.map(st => <li key={st.key}><strong>{st.label}</strong> · {st.state === 'ready' ? 'ready' : st.state === 'not-applicable' ? 'not applicable' : 'not connected'} · {st.detail}</li>)}</ol>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-ink-muted">No service is in the catalogue yet. None ships: each institution proposes its own below.</p>}
          </Section>
          <Section title={f.id ? `New version of ${f.id}` : 'Propose a service'} meta="published by a different official">
            <div className="grid gap-2 md:grid-cols-3">
              <label className="text-sm">Name<input className={field} value={f.name ?? ''} onChange={set('name')} /></label>
              <label className="text-sm">Owner is<select className={field} value={f.ownerKind} onChange={set('ownerKind')}><option value="institution">an institution</option><option value="slot">who is responsible for a register (slot)</option></select></label>
              <label className="text-sm">Owner<select className={field} value={f.owner ?? ''} onChange={set('owner')}><option value="">Choose…</option>{f.ownerKind === 'slot' ? data.slots.map(s => <option key={s.key} value={s.key}>{s.label}</option>) : data.institutions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
              <label className="text-sm md:col-span-3">Description<textarea className={field} value={f.description ?? ''} onChange={set('description')} /></label>
              <label className="text-sm">Law (instrument id)<input className={field} value={f.instrument ?? ''} onChange={set('instrument')} /></label>
              <label className="text-sm">Provision (eId)<input className={field} value={f.eId ?? ''} onChange={set('eId')} /></label>
              <label className="text-sm">Declared as<select className={field} value={f.declared} onChange={set('declared')}><option value="active">Active</option><option value="pilot">Pilot</option><option value="informational">Information only</option></select></label>
              <label className="text-sm">Procedure (key)<input className={field} value={f.procedure ?? ''} onChange={set('procedure')} /></label>
              <label className="text-sm">Fee rule (key in Rates and tariffs)<input className={field} value={f.fee ?? ''} onChange={set('fee')} /></label>
              <label className="text-sm">Someone may act for the applicant<select className={field} value={f.representatives ?? 'no'} onChange={set('representatives')}><option value="no">No</option><option value="yes">Yes, within a representation the applicant grants</option></select></label>
              <label className="text-sm md:col-span-2">Forms (one identity per line, catalogue:form-id@version)<textarea className={field} value={f.forms ?? ''} onChange={set('forms')} /></label>
              <fieldset className="text-sm"><legend>Channels</legend>{data.channels.map(c => <label key={c.key} className="me-3 inline-flex items-center gap-1"><input type="checkbox" checked={channels.includes(c.key)} onChange={e => setChannels(x => e.target.checked ? [...x, c.key] : x.filter(y => y !== c.key))} />{c.label}</label>)}</fieldset>
              <label className="text-sm">Who may use it<input className={field} value={f.eligibility ?? ''} onChange={set('eligibility')} /></label>
              <label className="text-sm">Evidence (one per line)<textarea className={field} value={f.evidence ?? ''} onChange={set('evidence')} /></label>
              <label className="text-sm">Outcome<input className={field} value={f.outcome ?? ''} onChange={set('outcome')} /></label>
              <label className="text-sm">Review route<input className={field} value={f.review ?? ''} onChange={set('review')} /></label>
              <label className="text-sm">Languages (codes, one per line)<textarea className={field} value={f.languages ?? ''} onChange={set('languages')} /></label>
              <label className="text-sm">Accessibility and alternatives<input className={field} value={f.accessibility ?? ''} onChange={set('accessibility')} /></label>
              <label className="text-sm">Privacy class<select className={field} value={f.privacy} onChange={set('privacy')}><option value="normal">Normal</option><option value="restricted">Restricted</option><option value="secret">Secret</option></select></label>
              <label className="text-sm">Contact and support<input className={field} value={f.contact ?? ''} onChange={set('contact')} /></label>
              <label className="text-sm">Life events (one per line)<textarea className={field} value={f.lifeEvents ?? ''} onChange={set('lifeEvents')} /></label>
              <label className="text-sm">Category<input className={field} value={f.category ?? ''} onChange={set('category')} /></label>
              <label className="text-sm md:col-span-2">Why (a new service, or what changed)<input className={field} value={f.reason ?? ''} onChange={set('reason')} /></label>
            </div>
            <div className="flex gap-2"><Button onClick={propose}>Propose</Button>{f.id ? <Button variant="secondary" onClick={() => setF({ declared: 'active', ownerKind: 'institution', privacy: 'normal' })}>A new service instead</Button> : null}</div>
          </Section>
          <Section title="Front-door procedures" meta="each institution's own, drafts until a second official approves">
            <ul className="text-sm">{data.templates.map(t => <li key={t.key}><span className="font-mono text-xs">{t.key}</span> · {t.title} · forms {t.forms.join(', ')} · adopted by {t.adoptedBy.length ? t.adoptedBy.map(a => `${data.institutions.find(m => m.id === a.institution)?.name ?? a.institution} (${a.state})`).join(', ') : 'none yet'}</li>)}</ul>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-sm">Institution<select className={field} value={adoptFor} onChange={e => setAdoptFor(e.target.value)}><option value="">Choose…</option>{data.institutions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
              <Button variant="secondary" onClick={() => post({ op: 'adopt', institution: adoptFor }, 'Drafted: approve each under Procedures.')}>Draft its own appointment, complaint, reconsideration and refund procedures</Button>
            </div>
            <p className="text-xs text-ink-muted"><Link className="underline" href="/gov/law/procedures">Procedures</Link> · <Link className="underline" href="/gov/services/management">Service management</Link> · <Link className="underline" href="/gov/records">Records management</Link></p>
          </Section>
        </>
      ) : null}
    </div>
  );
}
