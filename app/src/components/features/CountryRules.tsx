'use client';

// The country's own rules behind decisions, on one screen: the emergency
// suspension periods and who may suspend (/api/permit-authorities), and the
// two-official rules beyond the platform's minimum (/api/dual-control). Each
// changes the same way (lib/law/policy-change.ts): one administrator proposes
// the values, citing the law from the laws register; a different official
// confirms; values left out keep their setting; every version is kept.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';

interface Cite { title?: string; num?: string; eId: string; instrument: string }
interface Pending { by: string; at: string; expiresAt: string; basis: Cite[]; values: Record<string, unknown> }
interface History { by: string; at: string; outcome: string; confirmed?: { by: string; independence: string }; basis: Cite[] }
interface Changes { pending?: Pending; history?: History[] }
interface Suspension { confirmWithinHours: number; reviewWithinDays: number; suspendBy?: string; adopted: boolean; basis?: string; citations?: Cite[]; confirmedBy?: string; changes?: Changes }
interface DualControl { extra: string[]; requireIdentityBinding: boolean; pendingHours: number; adopted: boolean; basis?: string; citations?: Cite[]; confirmedBy?: string; changes?: Changes }
const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';
const cites = (c?: Cite[], typed?: string) => (c?.length ? c.map(x => `${x.title ?? x.instrument} ${x.num ?? x.eId}`).join('; ') : typed ? `${typed} (typed before citations were required)` : 'none');

function Waiting({ changes, onConfirm, onWithdraw }: { changes?: Changes; onConfirm: () => void; onWithdraw: () => void }) {
  const p = changes?.pending;
  return (
    <>
      {p ? (
        <div className="mt-2 rounded border border-line p-2 text-sm">
          <p><strong>Waiting for a second official</strong> until {new Date(p.expiresAt).toLocaleString()}: proposed by {p.by}, citing {cites(p.basis)}.</p>
          <p className="font-mono text-xs">{JSON.stringify(p.values)}</p>
          <div className="mt-1 flex gap-2"><Button onClick={onConfirm}>Confirm (a different official)</Button><Button variant="secondary" onClick={onWithdraw}>Withdraw</Button></div>
        </div>
      ) : null}
      {changes?.history?.length ? (
        <details className="mt-2 text-sm"><summary className="cursor-pointer">Earlier versions ({changes.history.length})</summary>
          <ul className="mt-1 space-y-1 text-xs">{changes.history.slice().reverse().map((h, i) => <li key={i}>{h.outcome} · proposed by {h.by} {h.at.slice(0, 10)}{h.confirmed ? ` · confirmed by ${h.confirmed.by} (${h.confirmed.independence})` : ''} · {cites(h.basis)}</li>)}</ul>
        </details>
      ) : null}
    </>
  );
}

export function CountryRules() {
  const [sus, setSus] = React.useState<Suspension | null>(null);
  const [dc, setDc] = React.useState<{ minimum: string[]; policy: DualControl } | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [law, setLaw] = React.useState({ instrument: '', eId: '' });
  const [s, setS] = React.useState({ confirmWithinHours: '', reviewWithinDays: '', suspendBy: '' });
  const [d, setD] = React.useState({ extra: '', pendingHours: '', requireIdentityBinding: '' });
  const load = React.useCallback(() => {
    fetch('/api/permit-authorities', { cache: 'no-store' }).then(r => r.json()).then(j => setSus(j.suspensionPolicy ?? null)).catch(() => setSus(null));
    fetch('/api/dual-control', { cache: 'no-store' }).then(r => r.json()).then(j => setDc(j.policy ? j : null)).catch(() => setDc(null));
  }, []);
  React.useEffect(load, [load]);
  const post = async (url: string, body: Record<string, unknown>, done: string) => {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    setMsg(r.ok ? done : j.error);
    load();
  };
  const legalBasis = law.instrument ? [{ instrument: law.instrument.trim(), eId: law.eId.trim() }] : [];
  const num = (v: string) => (v.trim() ? Number(v) : undefined);
  return (
    <Section title="The country's rules for decisions" meta="proposed by one administrator, confirmed by another, citing the law">
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      <div className="grid gap-2 md:grid-cols-2">
        <label className="text-sm">Legal basis: law (id from Laws)<input className={field} value={law.instrument} onChange={e => setLaw(x => ({ ...x, instrument: e.target.value }))} placeholder="/eli/…" /></label>
        <label className="text-sm">Provision (e.g. sec_3)<input className={field} value={law.eId} onChange={e => setLaw(x => ({ ...x, eId: e.target.value }))} /></label>
      </div>
      <p className="mt-1 text-xs text-ink-muted">The law must be recorded and confirmed in Laws first. Leave a value empty to keep its current setting.</p>

      <h3 className="mt-4 font-semibold">Emergency suspension</h3>
      {sus ? (
        <p className="text-sm">Confirmed within {sus.confirmWithinHours} hours · reviewed within {sus.reviewWithinDays} days · suspended by {sus.suspendBy === 'government-administrator' ? 'government-wide administrators only' : 'any administrator'} · {sus.adopted ? `adopted (confirmed by ${sus.confirmedBy ?? '—'}), basis: ${cites(sus.citations, sus.basis)}` : 'platform defaults, not adopted by the country'}</p>
      ) : <p className="text-sm text-ink-muted">Not available.</p>}
      <div className="mt-2 grid gap-2 md:grid-cols-3">
        <label className="text-sm">Confirm within (hours)<input className={field} inputMode="numeric" value={s.confirmWithinHours} onChange={e => setS(x => ({ ...x, confirmWithinHours: e.target.value }))} /></label>
        <label className="text-sm">Review within (days)<input className={field} inputMode="numeric" value={s.reviewWithinDays} onChange={e => setS(x => ({ ...x, reviewWithinDays: e.target.value }))} /></label>
        <label className="text-sm">Who may suspend<select className={field} value={s.suspendBy} onChange={e => setS(x => ({ ...x, suspendBy: e.target.value }))}><option value="">Keep as it is</option><option value="administrator">Any administrator</option><option value="government-administrator">Government-wide administrators only</option></select></label>
      </div>
      <Button className="mt-2" onClick={() => void post('/api/permit-authorities', { op: 'suspension-policy', confirmWithinHours: num(s.confirmWithinHours), reviewWithinDays: num(s.reviewWithinDays), suspendBy: s.suspendBy || undefined, legalBasis }, 'Proposed: a different administrator confirms it.')}>Propose</Button>
      <Waiting changes={sus?.changes} onConfirm={() => void post('/api/permit-authorities', { op: 'confirm-suspension-policy' }, 'Confirmed: the suspension rules apply from now.')} onWithdraw={() => void post('/api/permit-authorities', { op: 'withdraw-suspension-policy' }, 'Withdrawn.')} />

      <h3 className="mt-4 font-semibold">Two officials</h3>
      {dc ? (
        <>
          <p className="text-sm">Always two officials (the platform&apos;s minimum, which no rule lowers):</p>
          <ul className="ms-5 list-disc text-sm">{dc.minimum.map(m => <li key={m}>{m}</li>)}</ul>
          <p className="mt-1 text-sm">The country adds: {dc.policy.extra.length ? dc.policy.extra.join(', ') : 'nothing'} · a proposal waits {dc.policy.pendingHours} hours · identity provider link {dc.policy.requireIdentityBinding ? 'required' : 'not required'} · {dc.policy.adopted ? `adopted (confirmed by ${dc.policy.confirmedBy ?? '—'}), basis: ${cites(dc.policy.citations, dc.policy.basis)}` : 'platform defaults, not adopted by the country'}</p>
        </>
      ) : <p className="text-sm text-ink-muted">Not available.</p>}
      <div className="mt-2 grid gap-2 md:grid-cols-3">
        <label className="text-sm">Further steps (procedure:step, one per line)<textarea className={field} rows={2} value={d.extra} onChange={e => setD(x => ({ ...x, extra: e.target.value }))} placeholder="customs.declaration:release" /></label>
        <label className="text-sm">A proposal waits (hours)<input className={field} inputMode="numeric" value={d.pendingHours} onChange={e => setD(x => ({ ...x, pendingHours: e.target.value }))} /></label>
        <label className="text-sm">Identity provider link<select className={field} value={d.requireIdentityBinding} onChange={e => setD(x => ({ ...x, requireIdentityBinding: e.target.value }))}><option value="">Keep as it is</option><option value="yes">Required for both officials</option><option value="no">Not required</option></select></label>
      </div>
      <Button className="mt-2" onClick={() => void post('/api/dual-control', {
        op: 'propose', legalBasis,
        ...(d.extra.trim() ? { extra: d.extra.split('\n').map(x => x.trim()).filter(Boolean) } : {}),
        ...(num(d.pendingHours) !== undefined ? { pendingHours: num(d.pendingHours) } : {}),
        ...(d.requireIdentityBinding ? { requireIdentityBinding: d.requireIdentityBinding === 'yes' } : {}),
      }, 'Proposed: a different administrator confirms it.')}>Propose</Button>
      <Waiting changes={dc?.policy.changes} onConfirm={() => void post('/api/dual-control', { op: 'confirm' }, 'Confirmed: the two-official rules apply from now.')} onWithdraw={() => void post('/api/dual-control', { op: 'withdraw' }, 'Withdrawn.')} />
    </Section>
  );
}
