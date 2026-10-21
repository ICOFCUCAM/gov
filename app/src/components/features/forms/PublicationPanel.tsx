'use client';

// Publication of one procedure version's form (lib/forms/publication.ts):
// the checks the platform verifies and the approvals only an authorised
// official gives, shown apart. An approval here is an act of the signed-in
// official (the server takes who acted from the session and refuses the
// drafter, anyone who changed the form, and anyone who cannot sign at the
// institution responsible); there is no status to set.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { RefusalText } from '@/components/ui/RefusalText';

interface Gate { id: string; label: string; kind: 'automatic' | 'human'; passed: boolean; applies: boolean; detail: string[]; act?: { by: string; at: string; outcome: string; note: string } }
interface Publication { status: string; scope: { status: string; reason?: string }; automatic: Gate[]; human: Gate[]; blockers: string[]; pendingRelease?: { by: string; at: string; rollbackPlan?: string; releaseNotes?: string }; warning?: string }
interface Answer { publication: Publication; statusLabel: string; approvalLabels: Record<string, string>; approvals: { kind: string; outcome: string; by: string; at: string; note: string }[]; library?: boolean }

const KINDS = ['legal-review', 'authority', 'privacy', 'scope-review', 'release-proposal', 'release-approval'] as const;
const input = 'mt-1 block w-full min-h-tap rounded-sm border border-line bg-surface px-2 py-1 text-sm text-ink focus-ring';

function GateList({ gates, title, meta }: { gates: Gate[]; title: string; meta: string }) {
  return (
    <Section title={title} meta={meta}>
      <ul className="space-y-2">
        {gates.filter(g => g.applies).map(g => (
          <li key={g.id} className={`rounded-sm border-s-4 bg-surface-2 px-3 py-2 text-sm ${g.passed ? 'border-ok' : 'border-alert'}`}>
            <span className="font-medium">{g.passed ? 'Passed' : 'Not yet'}: {g.label}</span>
            {g.act ? <span className="block text-xs text-ink-muted">{g.act.outcome === 'approved' ? 'Given' : 'Returned'} by {g.act.by} · {g.act.at.slice(0, 16).replace('T', ' ')}{g.act.note ? ` · ${g.act.note}` : ''}</span> : null}
            {g.detail.length ? <ul className="mt-1 list-disc ps-5 text-xs">{g.detail.map(d => <li key={d}><RefusalText text={d} /></li>)}</ul> : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function PublicationPanel({ pkgKey, version }: { pkgKey: string; version: number }) {
  const [data, setData] = React.useState<Answer | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [kind, setKind] = React.useState<(typeof KINDS)[number]>('legal-review');
  const [note, setNote] = React.useState('');
  const [instrument, setInstrument] = React.useState('');
  const [eId, setEId] = React.useState('');
  const [rollback, setRollback] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const load = React.useCallback(() => {
    fetch(`/api/case-packages?publication=${encodeURIComponent(pkgKey)}&version=${version}`, { cache: 'no-store' })
      .then(r => r.json()).then(j => (j.publication ? setData(j as Answer) : setErr(j.error ?? 'Not available'))).catch(e => setErr((e as Error).message));
  }, [pkgKey, version]);
  React.useEffect(load, [load]);

  const record = async (outcome: 'approved' | 'returned') => {
    setErr(null); setMsg(null);
    const approval = { kind, outcome, note, ...(kind === 'scope-review' ? { citation: { instrument, eId } } : {}), ...(kind === 'release-proposal' ? { rollbackPlan: rollback, releaseNotes: notes } : {}) };
    const r = await fetch('/api/case-packages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'approval', key: pkgKey, version, approval }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error ?? `Not recorded (${r.status})`); return; }
    setMsg(`${data?.approvalLabels[kind] ?? kind}: ${outcome === 'approved' ? 'recorded' : 'returned'}, in the audit chain.`);
    setNote(''); load();
  };

  if (!data) return err ? <p role="alert" className="text-sm text-alert"><RefusalText text={err} /></p> : <p className="text-sm text-ink-muted">Loading the publication gates…</p>;
  const p = data.publication;
  const applies = KINDS.filter(k => k !== 'scope-review' || p.scope.status === 'legal_review');
  return (
    <div className="space-y-4">
      <Section title="Publication" meta={`register status: ${data.statusLabel}`}>
        <p className="text-sm">A form is published only when every check below passes. The platform verifies the first list itself, on every read. The second list are approvals only an official who can sign at the institution responsible gives, each a different person from whoever drafted or changed the form, each recorded in the audit chain. No status can be set by hand.</p>
        {p.scope.status !== 'allowed' ? <p className="mt-2 rounded-sm border-s-4 border-alert bg-surface-2 px-3 py-2 text-sm"><strong>{p.scope.status === 'excluded' ? 'Excluded by the approved scope' : 'Held for a legal review'}:</strong> {p.scope.reason}</p> : null}
        {p.warning ? <p className="mt-2 text-sm text-ink-muted">{p.warning}.</p> : null}
      </Section>
      <div className="grid gap-4 xl:grid-cols-2">
        <GateList gates={p.automatic} title="Checked by the platform" meta={`${p.automatic.filter(g => g.applies && g.passed).length} of ${p.automatic.filter(g => g.applies).length} pass`} />
        <GateList gates={p.human} title="Approvals by officials" meta={`${p.human.filter(g => g.applies && g.passed).length} of ${p.human.filter(g => g.applies).length} given`} />
      </div>
      {p.pendingRelease ? <p role="status" className="text-sm">Release proposed by {p.pendingRelease.by} on {p.pendingRelease.at.slice(0, 10)}, waiting for a second official. Rollback plan: {p.pendingRelease.rollbackPlan}</p> : null}
      {data.library ? <p role="note" className="text-sm text-ink-muted">A library form: approvals are recorded on the version of the procedure that carries it, once that version is drafted, tested and approved by a second official. Nothing can be approved here.</p> : null}
      {p.scope.status !== 'excluded' && !data.library ? (
        <Section title="Record an approval" meta="as the signed-in official">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">Approval
              <select className={input} value={kind} onChange={e => setKind(e.target.value as (typeof KINDS)[number])}>
                {applies.map(k => <option key={k} value={k}>{data.approvalLabels[k]}</option>)}
              </select>
            </label>
            <label className="text-sm">What the review found
              <textarea className={input} rows={2} value={note} onChange={e => setNote(e.target.value)} />
            </label>
            {kind === 'scope-review' ? (
              <>
                <label className="text-sm">Law it rests on (instrument id, from the laws register)<input className={input} dir="ltr" value={instrument} onChange={e => setInstrument(e.target.value)} /></label>
                <label className="text-sm">Provision (e.g. sec_12)<input className={input} dir="ltr" value={eId} onChange={e => setEId(e.target.value)} /></label>
              </>
            ) : null}
            {kind === 'release-proposal' ? (
              <>
                <label className="text-sm">Rollback plan (required)<textarea className={input} rows={3} value={rollback} onChange={e => setRollback(e.target.value)} /></label>
                <label className="text-sm">Release notes<textarea className={input} rows={3} value={notes} onChange={e => setNotes(e.target.value)} /></label>
              </>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button type="button" onClick={() => record('approved')}>Record the approval</Button>
            <Button type="button" variant="secondary" onClick={() => record('returned')}>Return for changes</Button>
          </div>
          {err ? <p role="alert" className="mt-2 text-sm text-alert"><RefusalText text={err} /></p> : null}
          {msg ? <p role="status" className="mt-2 text-sm text-ok">{msg}</p> : null}
        </Section>
      ) : null}
      {data.approvals.length ? (
        <Section title="Acts recorded" meta={`${data.approvals.length}`}>
          <ul className="space-y-1 text-sm">{data.approvals.map((a, i) => <li key={i}>{a.at.slice(0, 16).replace('T', ' ')} · {data.approvalLabels[a.kind] ?? a.kind} · {a.outcome} by {a.by}{a.note ? ` · ${a.note}` : ''}</li>)}</ul>
        </Section>
      ) : null}
    </div>
  );
}
