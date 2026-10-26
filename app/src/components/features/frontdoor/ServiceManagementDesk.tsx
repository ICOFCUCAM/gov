'use client';

// Service management for the console (plan step I13; /api/services/management,
// lib/frontdoor/service-management.ts): a service's performance worked out
// from its procedure's cases now (each figure marked where it is a sample or
// not connected; never a generated number), its objectives and the target in
// force (none until the nation's target, cited, is approved by a second
// official), performance reports frozen with their hash and validated by a
// second official, disruptions, changes, architecture exceptions that always
// expire, and the dashboard registry.

import * as React from 'react';
import Link from 'next/link';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/States';
import { SignalTag } from '@/components/ui/SignalTag';
import type { Signal } from '@/lib/twin/signal';

type Json = Record<string, unknown>;
type Who = { name: string };
interface Overview {
  dashboards: { id: string; institution: string; versions: { n: number; title: string; purpose: string; sources: string[]; access: string; state: string; proposedBy: Who; limitations: string }[] }[];
  objectives: { id: string; service: string; measure: string; label: string; methodology: string; inForce: { value: number; withinDays?: number } | null; target?: { state: string; value: number; proposedBy: Who }[] }[];
  reports: { id: string; service: string; period: { from: string; to: string }; sha256: string; recordedBy: Who; validatedBy?: Who }[];
  disruptions: { id: string; service: string; startedAt: string; impact: string; reportedBy: Who; updates: { at: string; text: string }[]; resolved?: { at: string; recovery: string } }[];
  changes: { id: string; service: string; description: string; reason: string; impact: string; proposedBy: Who; decision?: { outcome: string; by: Who; reasons: string } }[];
  exceptions: { id: string; institution: string; requirement: string; scope: string; expiresOn: string; state: string; proposedBy: Who }[];
  measures: { key: string; label: string }[];
  access: string[];
}
interface Perf { figures: Record<string, Signal<number>>; objectives: { id: string; label: string; target: number | null; met: boolean | null }[] }
const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';
const LABEL: Record<string, string> = { received: 'Received', decided: 'Decided', open: 'Open', medianDaysToDecision: 'Median days to a decision', deadlinesLapsed: 'Deadlines lapsed', reconsiderations: 'Reconsiderations asked', complaints: 'Complaints', shareWithinTarget: 'Share decided within the target' };

export function ServiceManagementDesk() {
  const [data, setData] = React.useState<Overview | null>(null);
  const [services, setServices] = React.useState<{ id: string; name: string }[]>([]);
  const [institutions, setInstitutions] = React.useState<{ id: string; name: string }[]>([]);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [svc, setSvc] = React.useState('');
  const year = new Date().getUTCFullYear();
  const [from, setFrom] = React.useState(`${year}-01-01`), [to, setTo] = React.useState(new Date().toISOString().slice(0, 10));
  const [perf, setPerf] = React.useState<Perf | null>(null);
  const [f, setF] = React.useState<Record<string, string>>({});
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(x => ({ ...x, [k]: e.target.value }));
  const load = React.useCallback(() => {
    fetch('/api/services/management', { cache: 'no-store' }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setData(j); }).catch(e => setMsg((e as Error).message));
    fetch('/api/services', { cache: 'no-store' }).then(r => r.json()).then(j => { setServices((j.services ?? []).filter((s: { status: string }) => s.status !== 'unpublished').map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))); setInstitutions(j.institutions ?? []); }).catch(() => undefined);
  }, []);
  React.useEffect(load, [load]);
  const compute = async () => { const r = await fetch(`/api/services/management?service=${encodeURIComponent(svc)}&from=${from}&to=${to}`, { cache: 'no-store' }); const j = await r.json(); if (r.ok) setPerf(j); else setMsg(j.error); };
  const post = async (body: Json, done: string) => {
    setMsg(null);
    const r = await fetch('/api/services/management', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? done : j.error ?? `Refused (${r.status})`);
    if (r.ok) { load(); if (svc) void compute(); }
  };
  const name = (id: string) => services.find(s => s.id === id)?.name ?? id;

  return (
    <div className="space-y-5 p-4">
      <h2 className="text-xl font-semibold">Service management</h2>
      <p className="max-w-3xl text-sm text-ink-muted">How each service performs, worked out from its cases when you ask (never typed in or generated), the objectives each service is held to and the targets the nation sets for them (none ships), reports frozen with their fingerprint and validated by a second official, disruptions, changes and architecture exceptions. Services themselves are kept in the <Link className="underline" href="/gov/services">Service catalogue</Link>.</p>
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      <Section title="Performance" meta="computed from the records">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">Service<select className={field} value={svc} onChange={e => setSvc(e.target.value)}><option value="">Choose…</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label className="text-sm">From<input type="date" className={field} value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label className="text-sm">To<input type="date" className={field} value={to} onChange={e => setTo(e.target.value)} /></label>
          <Button variant="secondary" onClick={compute} disabled={!svc}>Work it out</Button>
          <Button variant="secondary" onClick={() => post({ op: 'report', service: svc, from, to }, 'Report recorded: a different official validates it.')} disabled={!svc}>Record as a report</Button>
        </div>
        {perf ? (
          <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-4">
              {Object.entries(perf.figures).map(([k, s]) => <React.Fragment key={k}><dt className="text-ink-muted">{LABEL[k] ?? k}</dt><dd className="flex items-center gap-1 tabular-nums">{s.value === null ? '—' : `${s.value}${s.unit === 'd' ? ' days' : s.unit === '%' ? '%' : ''}`}<SignalTag kind={s.kind} source={s.source} /></dd></React.Fragment>)}
            </dl>
            <ul className="text-sm">{perf.objectives.map(o => <li key={o.id}>{o.label}: {o.target === null ? 'no target set (the nation sets it)' : `target ${o.target}`}{o.met === null ? '' : o.met ? ' · met' : ' · not met'}</li>)}</ul>
          </>
        ) : null}
      </Section>
      {data ? (
        <>
          <Section title="Objectives and targets" meta="targets are the nation's">
            <ul className="space-y-1 text-sm">{data.objectives.map(o => { const waiting = o.target?.find(t => t.state === 'proposed'); return (
              <li key={o.id} className="rounded border border-line p-2">{name(o.service)} · {o.label} · {o.inForce ? `target in force: ${o.inForce.value}${o.inForce.withinDays ? ` within ${o.inForce.withinDays} days` : ''}` : 'no target in force'}
                {waiting ? <Button className="ms-2" variant="secondary" onClick={() => post({ op: 'approve-target', id: o.id }, 'Target approved.')}>Approve target {waiting.value} (proposed by {waiting.proposedBy.name})</Button> : null}
                <span className="block text-xs text-ink-muted">{o.methodology}</span>
              </li>); })}</ul>
            <div className="grid gap-2 md:grid-cols-4">
              <label className="text-sm">Service<select className={field} value={f.oService ?? ''} onChange={set('oService')}><option value="">Choose…</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
              <label className="text-sm">Measure<select className={field} value={f.measure ?? ''} onChange={set('measure')}><option value="">Choose…</option>{data.measures.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</select></label>
              <label className="text-sm md:col-span-2">Methodology<input className={field} value={f.methodology ?? ''} onChange={set('methodology')} /></label>
            </div>
            <Button variant="secondary" onClick={() => post({ op: 'objective', service: f.oService, measure: f.measure, methodology: f.methodology }, 'Objective defined (no target until one is approved).')}>Define the objective</Button>
            <div className="grid gap-2 md:grid-cols-5">
              <label className="text-sm">Objective<select className={field} value={f.objective ?? ''} onChange={set('objective')}><option value="">Choose…</option>{data.objectives.map(o => <option key={o.id} value={o.id}>{name(o.service)}: {o.label}</option>)}</select></label>
              <label className="text-sm">Target value<input className={field} value={f.value ?? ''} onChange={set('value')} /></label>
              <label className="text-sm">Within days (for a share)<input className={field} value={f.withinDays ?? ''} onChange={set('withinDays')} /></label>
              <label className="text-sm">Law (instrument id)<input className={field} value={f.instrument ?? ''} onChange={set('instrument')} /></label>
              <label className="text-sm">Provision (eId)<input className={field} value={f.eId ?? ''} onChange={set('eId')} /></label>
            </div>
            <Button variant="secondary" onClick={() => post({ op: 'target', id: f.objective, value: Number(f.value), withinDays: Number(f.withinDays), citations: f.instrument ? [{ instrument: f.instrument, eId: f.eId }] : [], basis: f.basis ?? '' }, 'Target proposed: a different official who can sign approves it.')}>Propose the nation's target</Button>
          </Section>
          <Section title="Performance reports" meta="frozen with their SHA-256">
            <ul className="text-sm">{data.reports.map(r => <li key={r.id}>{name(r.service)} · {r.period.from} to {r.period.to} · <span className="font-mono text-xs">{r.sha256.slice(0, 16)}</span> · recorded by {r.recordedBy.name}{r.validatedBy ? ` · validated by ${r.validatedBy.name}` : <Button className="ms-2" variant="secondary" onClick={() => post({ op: 'validate-report', id: r.id }, 'Validated.')}>Validate</Button>}</li>)}</ul>
            {!data.reports.length ? <p className="text-sm text-ink-muted">No report recorded yet.</p> : null}
          </Section>
          <Section title="Disruptions" meta="open ones show on the service's public page">
            <ul className="text-sm">{data.disruptions.map(d => <li key={d.id} className="border-t border-line py-1">{name(d.service)} · since {d.startedAt.slice(0, 16)} · {d.impact}{d.resolved ? ` · resolved ${d.resolved.at.slice(0, 16)}: ${d.resolved.recovery}` : <Button className="ms-2" variant="secondary" onClick={() => { const recovery = window.prompt('How was the service restored?'); if (recovery) void post({ op: 'update-disruption', id: d.id, resolve: true, recovery }, 'Resolved.'); }}>Record recovery</Button>}</li>)}</ul>
            <div className="grid gap-2 md:grid-cols-3">
              <label className="text-sm">Service<select className={field} value={f.dService ?? ''} onChange={set('dService')}><option value="">Choose…</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
              <label className="text-sm md:col-span-2">Impact on people using it<input className={field} value={f.impact ?? ''} onChange={set('impact')} /></label>
            </div>
            <Button variant="secondary" onClick={() => post({ op: 'disruption', service: f.dService, impact: f.impact }, 'Disruption reported.')}>Report a disruption</Button>
          </Section>
          <Section title="Changes to services" meta="decided by a different official">
            <ul className="text-sm">{data.changes.map(c => <li key={c.id} className="border-t border-line py-1">{name(c.service)} · {c.description} · {c.reason} · proposed by {c.proposedBy.name}{c.decision ? ` · ${c.decision.outcome} by ${c.decision.by.name}: ${c.decision.reasons}` : <><Button className="ms-2" variant="secondary" onClick={() => post({ op: 'decide-change', id: c.id, outcome: 'approved', reasons: 'Approved from the console' }, 'Approved.')}>Approve</Button><Button className="ms-2" variant="secondary" onClick={() => { const reasons = window.prompt('Why is it rejected?'); if (reasons) void post({ op: 'decide-change', id: c.id, outcome: 'rejected', reasons }, 'Rejected.'); }}>Reject</Button></>}</li>)}</ul>
            <div className="grid gap-2 md:grid-cols-4">
              <label className="text-sm">Service<select className={field} value={f.cService ?? ''} onChange={set('cService')}><option value="">Choose…</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
              <label className="text-sm">Change<input className={field} value={f.description ?? ''} onChange={set('description')} /></label>
              <label className="text-sm">Why<input className={field} value={f.reason ?? ''} onChange={set('reason')} /></label>
              <label className="text-sm">Impact<input className={field} value={f.cImpact ?? ''} onChange={set('cImpact')} /></label>
            </div>
            <Button variant="secondary" onClick={() => post({ op: 'change', service: f.cService, description: f.description, reason: f.reason, impact: f.cImpact }, 'Change proposed.')}>Propose a change</Button>
          </Section>
          <Section title="Architecture exceptions" meta="each expires">
            <ul className="text-sm">{data.exceptions.map(x => <li key={x.id} className="border-t border-line py-1">{x.requirement} · {x.scope} · until {x.expiresOn} · {x.state.replace('-', ' ')}{x.state === 'waiting' ? <Button className="ms-2" variant="secondary" onClick={() => post({ op: 'approve-exception', id: x.id }, 'Approved until its expiry.')}>Approve</Button> : null}</li>)}</ul>
            <div className="grid gap-2 md:grid-cols-5">
              <label className="text-sm">Institution<select className={field} value={f.xInst ?? ''} onChange={set('xInst')}><option value="">Choose…</option>{institutions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
              <label className="text-sm">Requirement waived<input className={field} value={f.requirement ?? ''} onChange={set('requirement')} /></label>
              <label className="text-sm">Scope<input className={field} value={f.scope ?? ''} onChange={set('scope')} /></label>
              <label className="text-sm">Justification<input className={field} value={f.justification ?? ''} onChange={set('justification')} /></label>
              <label className="text-sm">Expires on<input type="date" className={field} value={f.expiresOn ?? ''} onChange={set('expiresOn')} /></label>
            </div>
            <Button variant="secondary" onClick={() => post({ op: 'exception', institution: f.xInst, requirement: f.requirement, scope: f.scope, justification: f.justification, expiresOn: f.expiresOn }, 'Exception proposed: a different official approves it.')}>Propose an exception</Button>
          </Section>
          <Section title="Dashboard registry" meta="sources are indicator definitions or twin metrics">
            <ul className="text-sm">{data.dashboards.map(d => { const v = d.versions.at(-1)!; return <li key={d.id} className="border-t border-line py-1">{v.title} · {v.access} · {v.purpose} · sources {v.sources.join(', ')} · {v.state}{v.state === 'proposed' ? <Button className="ms-2" variant="secondary" onClick={() => post({ op: 'publish-dashboard', id: d.id }, 'Published.')}>Publish</Button> : null}</li>; })}</ul>
            <div className="grid gap-2 md:grid-cols-5">
              <label className="text-sm">Institution<select className={field} value={f.bInst ?? ''} onChange={set('bInst')}><option value="">Choose…</option>{institutions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
              <label className="text-sm">Title<input className={field} value={f.title ?? ''} onChange={set('title')} /></label>
              <label className="text-sm">Purpose<input className={field} value={f.purpose ?? ''} onChange={set('purpose')} /></label>
              <label className="text-sm">Sources (indicator ids or metric:&lt;key&gt;, one per line)<textarea className={field} value={f.sources ?? ''} onChange={set('sources')} /></label>
              <label className="text-sm">Access<select className={field} value={f.access ?? ''} onChange={set('access')}><option value="">Choose…</option>{data.access.map(a => <option key={a} value={a}>{a}</option>)}</select></label>
            </div>
            <Button variant="secondary" onClick={() => post({ op: 'dashboard', institution: f.bInst, title: f.title, purpose: f.purpose, sources: (f.sources ?? '').split('\n'), access: f.access, limitations: f.limitations ?? '' }, 'Registered: a different official publishes it.')}>Register a dashboard</Button>
          </Section>
        </>
      ) : msg ? null : <LoadingState label="Loading service management" />}
    </div>
  );
}
