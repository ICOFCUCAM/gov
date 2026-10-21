'use client';

// How the laws relate (/gov/law/relations): which law amends, repeals,
// replaces, implements, cites or depends on which, as recorded in the laws
// register (lib/law/register.ts relate(), POST /api/law/relate), read both
// ways for one law. Recording a relation is for officials of the
// law-register authority (the route checks canRecordLaw()); it is audited.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { RELATION_LABEL, relationRows, relationsOf, type RelatedInstrument } from '@/lib/law/relations';
import type { RelationKind } from '@/lib/law/register';

const KINDS = Object.keys(RELATION_LABEL) as RelationKind[];
const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';

export function LawRelations() {
  const [list, setList] = React.useState<RelatedInstrument[]>([]);
  const [authority, setAuthority] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [focus, setFocus] = React.useState('');
  const [f, setF] = React.useState({ instrument: '', kind: 'amends' as RelationKind, target: '', at: '' });

  const load = React.useCallback(() => {
    fetch('/api/law', { cache: 'no-store' })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'Could not load'); setList(j.instruments); setAuthority(j.authority); })
      .catch(e => setMsg(e instanceof Error ? e.message : 'Could not load'));
  }, []);
  React.useEffect(load, [load]);

  const rows = React.useMemo(() => relationRows(list), [list]);
  const mine = focus ? relationsOf(focus, rows) : [];

  const record = async () => {
    setMsg(null);
    const r = await fetch('/api/law/relate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ instrument: f.instrument, kind: f.kind, target: f.target, ...(f.at ? { at: f.at } : {}) }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg((j as { error?: string }).error ?? `Request failed (${r.status})`); return; }
    setMsg('Recorded and audited.');
    setF(x => ({ ...x, target: '', at: '' }));
    load();
  };

  return (
    <div className="space-y-4 p-4">
      <p className="max-w-3xl text-sm text-ink-muted">
        Which law amends, repeals, replaces, implements, cites or depends on which, as the law-register authority recorded it.
        The texts themselves and their versions are under <a className="text-link underline underline-offset-2" href="/gov/law">Laws</a>.
        {authority ? '' : ' The law-register authority is not named yet (National settings, Who is responsible).'}
      </p>
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}

      <Section title="One law, both ways" meta="what it does to others and what others do to it">
        <label className="block max-w-xl text-sm">Law
          <select className={field} value={focus} onChange={e => setFocus(e.target.value)}>
            <option value="">Choose</option>
            {list.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}
          </select>
        </label>
        {focus ? (mine.length ? (
          <ul className="space-y-0.5 text-sm">
            {mine.map((r, n) => <li key={n}>This law {r.phrase} <button type="button" className="text-link underline underline-offset-2" onClick={() => setFocus(r.other)}>{r.otherTitle}</button>{r.at ? ` from ${r.at}` : ''} <span className="text-xs text-ink-muted">· recorded by {r.by}</span></li>)}
          </ul>
        ) : <p className="text-sm text-ink-muted">No relation recorded for this law.</p>) : null}
      </Section>

      <Section title="All relations" meta={`${rows.length} recorded`}>
        {rows.length ? (
          <table className="w-full text-left text-sm">
            <thead><tr><th scope="col">Law</th><th scope="col">Relation</th><th scope="col">Other law</th><th scope="col">From</th><th scope="col">Recorded by</th></tr></thead>
            <tbody>
              {rows.map((r, n) => (
                <tr key={n} className="border-t border-line">
                  <td>{r.fromTitle}</td><td>{RELATION_LABEL[r.kind].forward}</td><td>{r.toTitle}</td><td>{r.at ?? '—'}</td><td>{r.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-sm text-ink-muted">No relations recorded yet. Nothing is entered for the nation.</p>}
      </Section>

      <Section title="Record a relation" meta="officials of the law-register authority">
        <div className="grid gap-2 md:grid-cols-4">
          <label className="text-sm">Law<select className={field} value={f.instrument} onChange={e => setF(x => ({ ...x, instrument: e.target.value }))}><option value="">Choose</option>{list.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}</select></label>
          <label className="text-sm">Relation<select className={field} value={f.kind} onChange={e => setF(x => ({ ...x, kind: e.target.value as RelationKind }))}>{KINDS.map(k => <option key={k} value={k}>{RELATION_LABEL[k].forward}</option>)}</select></label>
          <label className="text-sm">Other law<select className={field} value={f.target} onChange={e => setF(x => ({ ...x, target: e.target.value }))}><option value="">Choose</option>{list.filter(i => i.id !== f.instrument).map(i => <option key={i.id} value={i.id}>{i.title}</option>)}</select></label>
          <label className="text-sm">From (optional)<input type="date" className={field} value={f.at} onChange={e => setF(x => ({ ...x, at: e.target.value }))} /></label>
        </div>
        <div className="mt-2"><Button variant="primary" onClick={record} disabled={!f.instrument || !f.target}>Record relation</Button></div>
      </Section>
    </div>
  );
}
