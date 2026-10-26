'use client';

// Who may act for you, and for whom you may act (plan step I13; forms
// catalogue Part 13 §5.3, GOV-SVC-014; /api/citizen/representation). You
// grant a representation yourself: the person, the services and the acts it
// covers, until when; you revoke it yourself. They act only within it, and
// every application they make records both of you.

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Rep { id: string; principal: { name: string }; agent: { id: string; name: string }; services?: string[]; procedures: string[]; actions?: string[]; validFrom: string; validUntil?: string; basis: string; byPrincipal?: true; revoked?: { at: string; reason: string } }
const field = 'mt-1 block w-full rounded border border-line bg-surface px-2 py-1.5 text-sm';

export function Representation() {
  const [data, setData] = React.useState<{ granted: Rep[]; received: Rep[]; actions: { key: string; label: string }[]; services: { id: string; name: string; owner: string }[] } | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [f, setF] = React.useState({ sub: '', name: '', until: '', basis: '' });
  const [svc, setSvc] = React.useState<string[]>([]);
  const [acts, setActs] = React.useState<string[]>(['track']);
  const load = React.useCallback(() => { fetch('/api/citizen/representation', { cache: 'no-store' }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setData(j); }).catch(e => setMsg((e as Error).message)); }, []);
  React.useEffect(load, [load]);
  const post = async (body: Record<string, unknown>, done: string) => {
    const r = await fetch('/api/citizen/representation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? done : j.error ?? 'Not done');
    if (r.ok) load();
  };
  const name = (id: string) => data?.services.find(s => s.id === id)?.name ?? id;
  const describe = (r: Rep) => `${(r.services ?? r.procedures).map(name).join(', ')} · ${(r.actions ?? ['every act']).map(a => data?.actions.find(x => x.key === a)?.label ?? a).join(', ')} · from ${r.validFrom}${r.validUntil ? ` until ${r.validUntil}` : ' until you revoke it'}${r.revoked ? ` · revoked ${r.revoked.at.slice(0, 10)}` : ''}`;
  return (
    <div className="space-y-3">
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      <Card tight>
        <h2 className="font-semibold">People who may act for you</h2>
        {data?.granted.length ? <ul className="mt-2 space-y-2 text-sm">{data.granted.map(r => <li key={r.id} className="border-t border-line pt-2"><strong>{r.agent.name}</strong> · {describe(r)}{!r.revoked && r.byPrincipal ? <Button className="mt-1" variant="secondary" onClick={() => void post({ op: 'revoke', id: r.id, reason: 'Revoked by me' }, 'Revoked.')}>Revoke</Button> : null}</li>)}</ul> : <p className="mt-1 text-sm text-ink-muted">Nobody.</p>}
      </Card>
      <Card tight>
        <h2 className="font-semibold">Let someone act for you</h2>
        <div className="mt-2 grid gap-2">
          <label className="text-sm">Their name<input className={field} value={f.name} onChange={e => setF(x => ({ ...x, name: e.target.value }))} /></label>
          <label className="text-sm">Their identifier at the identity provider<input className={field} value={f.sub} onChange={e => setF(x => ({ ...x, sub: e.target.value }))} /></label>
          <fieldset className="text-sm"><legend>For which services</legend>{data?.services.length ? data.services.map(s => <label key={s.id} className="block"><input type="checkbox" checked={svc.includes(s.id)} onChange={e => setSvc(x => e.target.checked ? [...x, s.id] : x.filter(y => y !== s.id))} /> {s.name} ({s.owner})</label>) : <span className="text-ink-muted">No service allows a representative yet.</span>}</fieldset>
          <fieldset className="text-sm"><legend>What they may do</legend>{data?.actions.map(a => <label key={a.key} className="block"><input type="checkbox" checked={acts.includes(a.key)} onChange={e => setActs(x => e.target.checked ? [...x, a.key] : x.filter(y => y !== a.key))} /> {a.label}</label>)}</fieldset>
          <label className="text-sm">Until (optional)<input type="date" className={field} value={f.until} onChange={e => setF(x => ({ ...x, until: e.target.value }))} /></label>
          <label className="text-sm">Why (for example: family member, lawyer)<input className={field} value={f.basis} onChange={e => setF(x => ({ ...x, basis: e.target.value }))} /></label>
        </div>
        <Button className="mt-3" variant="primary" disabled={!f.sub || !f.name || !svc.length || !acts.length} onClick={() => void post({ op: 'grant', agent: { sub: f.sub, name: f.name }, services: svc, actions: acts, ...(f.until ? { validUntil: f.until } : {}), basis: f.basis }, 'Granted. They can act only within what you chose.')}>Grant</Button>
      </Card>
      <Card tight>
        <h2 className="font-semibold">People you may act for</h2>
        {data?.received.length ? <ul className="mt-2 space-y-2 text-sm">{data.received.map(r => <li key={r.id} className="border-t border-line pt-2"><strong>{r.principal.name}</strong> · {describe(r)}</li>)}</ul> : <p className="mt-1 text-sm text-ink-muted">Nobody.</p>}
      </Card>
    </div>
  );
}
