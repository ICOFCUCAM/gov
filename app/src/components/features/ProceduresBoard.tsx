'use client';

// Procedures (lib/casework/packages.ts, design §6.3): every version with its
// state, the date it applies from, the authority responsible, its steps and
// whether its own tests pass. A draft runs only once an official who can
// sign at the responsible institution, other than its author, approves it.
// Reference procedures shipped with CivicOS arrive as drafts.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';

interface Pkg { key: string; version: number; title: string; owner: string; ownerInstitution: string | null; state: string; activeFrom?: string; author: string; approvedBy?: string; reference?: boolean; stages: { key: string; label: string }[]; actions: { key: string; label: string; from: string[]; to: string; decision?: string; needs: { role: string; fourEyes?: boolean } }[]; testResult: { ok: boolean; failures: string[] } }

export function ProceduresBoard() {
  const [list, setList] = React.useState<Pkg[]>([]);
  const [msg, setMsg] = React.useState<string | null>(null);
  const load = React.useCallback(() => {
    fetch('/api/case-packages', { cache: 'no-store' }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'Could not load'); setList(j.packages as Pkg[]); }).catch(e => setMsg((e as Error).message));
  }, []);
  React.useEffect(load, [load]);
  const approve = async (p: Pkg) => {
    const activeFrom = window.prompt('Applies from (YYYY-MM-DD)', new Date().toISOString().slice(0, 10));
    if (!activeFrom) return;
    const r = await fetch('/api/case-packages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'approve', key: p.key, version: p.version, activeFrom }) });
    const j = await r.json();
    setMsg(r.ok ? `${p.title} version ${p.version} approved from ${activeFrom}.` : j.error);
    load();
  };
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Procedures</h1>
      <p className="max-w-3xl text-sm text-ink-muted">How each kind of case is handled: its steps, who may take them, its deadlines and the laws it rests on. A procedure runs only after the responsible institution approves it.</p>
      {msg ? <p role="status" className="text-sm">{msg}</p> : null}
      <Section title="Reference procedures" meta="shipped with the platform, as drafts">
        <p className="text-sm text-ink-muted">Birth, late birth, death, marriage and correction of civil records. They arrive as drafts: the responsible authority adapts them to its law (a new version citing it) and approves them before any case runs.</p>
        <Button className="mt-2" variant="secondary" onClick={async () => {
          const r = await fetch('/api/case-packages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'install-references' }) });
          const j = await r.json();
          setMsg(r.ok ? (j.drafted.length ? `Drafted: ${j.drafted.join(', ')}.` : 'All reference procedures are already here.') : j.error);
          load();
        }}>Add the reference procedures as drafts</Button>
      </Section>
      <Section title="Versions" meta={`${list.length}`}>
        {list.length ? (
          <ul className="divide-y divide-line">
            {list.map(p => (
              <li key={`${p.key}@${p.version}`} className="py-2 text-sm">
                <div><strong>{p.title}</strong> · {p.key} version {p.version} · {p.state}{p.activeFrom ? ` from ${p.activeFrom}` : ''}{p.reference ? ' · reference' : ''}</div>
                <div className="text-xs text-ink-muted">Responsible: {p.ownerInstitution ?? `${p.owner} (not named yet)`} · written by {p.author}{p.approvedBy ? ` · approved by ${p.approvedBy}` : ''} · tests {p.testResult.ok ? 'pass' : `fail: ${p.testResult.failures.join('; ')}`}</div>
                <div className="mt-1 text-xs">{p.actions.map(a => `${a.label} (${a.from.join('/')} → ${a.to}${a.decision ? ', decision' : ''}${a.needs.fourEyes ? ', two officials' : ''})`).join(' · ')}</div>
                {p.state === 'draft' ? <Button className="mt-1" disabled={!p.testResult.ok || !p.ownerInstitution} onClick={() => approve(p)}>Approve</Button> : null}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-muted">No procedures yet.</p>}
      </Section>
    </div>
  );
}
