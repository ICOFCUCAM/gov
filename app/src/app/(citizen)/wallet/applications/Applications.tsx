'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface App { id: string; ref: string; procedure: string; stage: string; openedAt: string; closedAt: string | null; certificates: { code: string; title: string; status: string }[] }
const field = 'mt-1 block w-full rounded border border-line bg-surface px-2 py-1.5 text-sm';

export function Applications() {
  const [apps, setApps] = React.useState<App[] | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [f, setF] = React.useState({ childGiven: '', childFamily: '', sex: 'unknown', birthDate: '', birthPlace: '', motherGiven: '', motherFamily: '', fatherGiven: '', fatherFamily: '' });
  const load = React.useCallback(() => {
    fetch('/api/citizen/applications', { cache: 'no-store' }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setApps(j.applications); }).catch(e => setMsg((e as Error).message));
  }, []);
  React.useEffect(load, [load]);
  const submit = async () => {
    setMsg(null);
    const r = await fetch('/api/citizen/applications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ procedure: 'civil.birth', fields: { ...f, informantName: [f.motherGiven, f.motherFamily].join(' ').trim(), informantRelation: 'parent' }, idempotencyKey: `${f.childFamily}-${f.birthDate}` }) });
    const j = await r.json();
    setMsg(r.ok ? `Sent. Your reference is ${j.application.ref}. The civil registry will ask for the birth notification from the health facility if it has not received it.` : j.error);
    if (r.ok) load();
  };
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
      <Card tight>
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
      </Card>
    </div>
  );
}
