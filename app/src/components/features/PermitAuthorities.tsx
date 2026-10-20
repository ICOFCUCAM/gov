'use client';

// Permit authorities (lib/permits/authority.ts): which authority the law
// designates for each permit, licence and register type, version by version.
// A version governs decisions only after a second administrator approves it,
// with its legal basis cited from the laws register, and only from its date.
// The defaults CivicOS proposes arrive as drafts marked as proposals.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { CountryRules } from './CountryRules';

interface Mapping { permitType: string; title: string; version: number; lead: string; consulted: { authority: string; role: string; mandatory: boolean }[]; scope: { level: string; regions?: string[] }; legalBasis: { title?: string; num?: string; eId: string }[]; effectiveFrom: string; effectiveTo?: string; powers: { renew: string; suspend: string; revoke: string; appealBody: string }; state: string; proposal: boolean; note?: string; draftedBy: string; approvedBy?: string; handover?: { from: string; plan: string }; suspensions?: { at: string; by: string; reason: string; reviewBy: string; confirmed?: { by: string }; lifted?: { by: string; at: string; reason: string }; reviews?: { by: string; at: string; reviewBy: string; reason: string }[] }[] }
const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';

export function PermitAuthorities() {
  const [list, setList] = React.useState<Mapping[]>([]);
  const [inForce, setInForce] = React.useState<Record<string, number | null>>({});
  const [msg, setMsg] = React.useState<string | null>(null);
  const [f, setF] = React.useState({ permitType: '', title: '', lead: '', effectiveFrom: new Date().toISOString().slice(0, 10), instrument: '', eId: '', consulted: '', appealBody: '', handoverPlan: '' });
  const load = React.useCallback(() => {
    fetch('/api/permit-authorities', { cache: 'no-store' }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setList(j.mappings); setInForce(j.inForce); }).catch(e => setMsg((e as Error).message));
  }, []);
  React.useEffect(load, [load]);
  const send = async (body: Record<string, unknown>, done: string) => {
    const r = await fetch('/api/permit-authorities', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    setMsg(r.ok ? done : j.error);
    load();
  };
  const types = [...new Set(list.map(m => m.permitType))].sort();
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Permit authorities</h1>
      <p className="max-w-3xl text-sm text-ink-muted">Which authority the nation&apos;s law designates for each permit, licence and register type: who issues, who is consulted, who renews, suspends and revokes, and who hears appeals. A version governs decisions only after a second administrator approves it with its legal basis, and only from its date. Changing the lead authority needs a handover plan.</p>
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      <Section title="Permit types" meta={`${types.length}`}>
        {types.length ? (
          <ul className="space-y-3 text-sm">
            {types.map(t => {
              const versions = list.filter(m => m.permitType === t).sort((a, b) => b.version - a.version);
              return (
                <li key={t} className="rounded border border-line p-2">
                  <p><strong>{versions[0]!.title}</strong> <span className="font-mono text-xs text-ink-muted">{t}</span> · {inForce[t] ? `version ${inForce[t]} in force` : 'no approved authority yet'}</p>
                  <ul className="mt-1 space-y-1">
                    {versions.map(m => (
                      <li key={m.version} className="text-xs">
                        Version {m.version} · {m.state}{m.proposal ? ' · proposed by CivicOS, not the nation\'s' : ''} · lead <strong>{m.lead}</strong> from {m.effectiveFrom}{m.effectiveTo ? ` to ${m.effectiveTo}` : ''} · {m.scope.level}
                        {m.consulted.length ? ` · consults ${m.consulted.map(c => `${c.authority} (${c.role}${c.mandatory ? ', mandatory' : ''})`).join(', ')}` : ''}
                        {m.legalBasis.length ? ` · basis ${m.legalBasis.map(l => `${l.title ?? ''} ${l.num ?? l.eId}`).join('; ')}` : ' · no legal basis cited'}
                        {m.note ? <span className="block text-ink-muted">{m.note}</span> : null}
                        {m.handover ? <span className="block">Handover from {m.handover.from}: {m.handover.plan}</span> : null}
                        {(m.suspensions ?? []).map((x, k) => (
                          <span key={k} className={`block ${x.lifted ? 'text-ink-muted' : 'text-alert'}`}>
                            {x.lifted ? 'Was suspended' : 'Suspended (no new decision rests on it)'} since {x.at.slice(0, 10)} by {x.by}: {x.reason} · {x.confirmed ? `confirmed by ${x.confirmed.by}` : 'not yet confirmed'} · review by {x.reviewBy}
                            {x.lifted ? ` · lifted ${x.lifted.at.slice(0, 10)} by ${x.lifted.by}: ${x.lifted.reason}` : ''}
                          </span>
                        ))}
                        {m.state === 'approved' ? (() => {
                          const live = (m.suspensions ?? []).find(x => !x.lifted);
                          return live ? (
                            <span className="mt-1 flex flex-wrap gap-2">
                              {!live.confirmed ? <Button onClick={() => void send({ op: 'confirm-suspension', permitType: t, version: m.version }, 'Suspension confirmed.')}>Confirm the suspension (a different official)</Button> : null}
                              <Button variant="secondary" onClick={() => { const reason = window.prompt('Why does the suspension continue?'); const reviewBy = reason ? window.prompt('Next review date (YYYY-MM-DD)') : null; if (reason && reviewBy) void send({ op: 'review-suspension', permitType: t, version: m.version, reason, reviewBy }, 'Reviewed.'); }}>Review</Button>
                              <Button variant="secondary" onClick={() => { const reason = window.prompt('Why is the suspension lifted?'); if (reason) void send({ op: 'lift-suspension', permitType: t, version: m.version, reason }, 'Lifted: decisions may rest on this mapping again.'); }}>Lift (a different official)</Button>
                            </span>
                          ) : (
                            <span className="mt-1 flex gap-2">
                              <Button variant="secondary" onClick={() => { const reason = window.prompt('Emergency suspension: why must no new decision rest on this mapping?'); if (reason) void send({ op: 'suspend', permitType: t, version: m.version, reason }, 'Suspended: a different official confirms it.'); }}>Suspend in an emergency</Button>
                            </span>
                          );
                        })() : null}
                        {m.state === 'draft' ? (
                          <span className="mt-1 flex gap-2">
                            <Button onClick={() => void send({ op: 'approve', permitType: t, version: m.version }, 'Approved.')}>Approve (a different administrator)</Button>
                            <Button variant="secondary" onClick={() => { const reason = window.prompt('Why is this draft withdrawn?'); if (reason) void send({ op: 'withdraw', permitType: t, version: m.version, reason }, 'Withdrawn.'); }}>Withdraw</Button>
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm text-ink-muted">No permit type has an authority recorded yet.</p>}
        <Button className="mt-3" variant="secondary" onClick={() => void send({ op: 'install-proposals' }, 'Proposed defaults added as drafts. None governs anything until approved with its legal basis.')}>Add the proposed defaults as drafts</Button>
      </Section>
      <CountryRules />
      <Section title="Record a version" meta="administrators">
        <div className="grid gap-2 md:grid-cols-3">
          <label className="text-sm">Permit type key<input className={field} value={f.permitType} onChange={e => setF(x => ({ ...x, permitType: e.target.value }))} placeholder="pharmacy-licence" /></label>
          <label className="text-sm">Name<input className={field} value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))} /></label>
          <label className="text-sm">Lead authority (responsible authority or institution id)<input className={field} value={f.lead} onChange={e => setF(x => ({ ...x, lead: e.target.value }))} /></label>
          <label className="text-sm">Governs from<input type="date" className={field} value={f.effectiveFrom} onChange={e => setF(x => ({ ...x, effectiveFrom: e.target.value }))} /></label>
          <label className="text-sm">Legal basis: law (id from Laws)<input className={field} value={f.instrument} onChange={e => setF(x => ({ ...x, instrument: e.target.value }))} placeholder="/eli/…" /></label>
          <label className="text-sm">Provision (e.g. sec_3)<input className={field} value={f.eId} onChange={e => setF(x => ({ ...x, eId: e.target.value }))} /></label>
          <label className="text-sm">Consulted (authority:role, one per line)<textarea className={field} rows={2} value={f.consulted} onChange={e => setF(x => ({ ...x, consulted: e.target.value }))} /></label>
          <label className="text-sm">Appeals heard by<input className={field} value={f.appealBody} onChange={e => setF(x => ({ ...x, appealBody: e.target.value }))} /></label>
          <label className="text-sm">Handover plan (when the lead changes)<textarea className={field} rows={2} value={f.handoverPlan} onChange={e => setF(x => ({ ...x, handoverPlan: e.target.value }))} /></label>
        </div>
        <Button className="mt-2" onClick={() => void send({ op: 'draft', mapping: {
          permitType: f.permitType, title: f.title, lead: f.lead, effectiveFrom: f.effectiveFrom,
          legalBasis: f.instrument ? [{ instrument: f.instrument, eId: f.eId }] : [],
          consulted: f.consulted.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [authority, ...role] = l.split(':'); return { authority: authority!.trim(), role: role.join(':').trim(), mandatory: true }; }),
          powers: { appealBody: f.appealBody }, handoverPlan: f.handoverPlan,
        } }, 'Drafted: a different administrator approves it.')}>Record the draft</Button>
      </Section>
    </div>
  );
}
