'use client';

// Procedures (lib/casework/packages.ts, design §6.3): every version with its
// state, the date it applies from, the authority responsible, its steps and
// whether its own tests pass. A draft runs only once an official who can
// sign at the responsible institution, other than its author, approves it.
// Reference procedures shipped with CivicOS arrive as drafts. Demo and
// training installations can load the demonstration set (a sample act and
// the civil procedures approved under it, lib/casework/demo.ts).

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';

interface Pkg { key: string; version: number; title: string; owner: string; ownerInstitution: string | null; state: string; activeFrom?: string; author: string; approvedBy?: string; reference?: boolean; stages: { key: string; label: string }[]; actions: { key: string; label: string; from: string[]; to: string; decision?: string; needs: { role: string; fourEyes?: boolean } }[]; testResult: { ok: boolean; failures: string[] } }

export function ProceduresBoard({ demonstration = false }: { demonstration?: boolean }) {
  const [list, setList] = React.useState<Pkg[]>([]);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [institutions, setInstitutions] = React.useState<{ id: string; name: string }[]>([]);
  const [referTo, setReferTo] = React.useState('');
  React.useEffect(() => { fetch('/api/org/ministries', { cache: 'no-store' }).then(r => r.json()).then(j => setInstitutions((j.ministries ?? []) as { id: string; name: string }[])).catch(() => setInstitutions([])); }, []);
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
        <p className="text-sm text-ink-muted">Civil records (birth, late birth, death, marriage, correction), organisations (registration, licences and accreditation with their renewal, suspension and revocation), visas and residence permits, police incident reports and court cases. They arrive as drafts: the responsible authority adapts them to its law (a new version citing it) and approves them before any case runs.</p>
        <Button className="mt-2" variant="secondary" onClick={async () => {
          const r = await fetch('/api/case-packages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'install-references' }) });
          const j = await r.json();
          setMsg(r.ok ? (j.drafted.length ? `Drafted: ${j.drafted.join(', ')}.` : 'All reference procedures are already here.') : j.error);
          load();
        }}>Add the reference procedures as drafts</Button>
        {demonstration ? (
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-sm text-ink-muted">Demonstration installation: load sample acts (civil registration; business registration, licensing and accreditation; immigration; police; rules of court, for the authorities named) and approve these procedures under them, so cases can be run end to end. The acts are marked as samples; a production installation never has them.</p>
            <Button className="mt-2" variant="secondary" onClick={async () => {
              const r = await fetch('/api/case-packages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'load-demonstration' }) });
              const j = await r.json();
              setMsg(r.ok ? (j.approved.length ? `Sample act recorded; approved: ${j.approved.join(', ')}.` : 'The demonstration set is already loaded.') : j.error);
              load();
            }}>Load the demonstration set</Button>
          </div>
        ) : null}
      </Section>
      <Section title="Referrals between institutions" meta="a case at the other institution, linked to yours">
        <p className="text-sm text-ink-muted">When a case needs another institution's work (an inspection, an opinion, a determination), it is referred as a case under that institution's referral procedure, with a deadline, and reported back. Each institution adopts the template as its own procedure and approves it.</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-sm">Institution<select className="mt-1 block rounded border border-line bg-surface px-2 py-1 text-sm" value={referTo} onChange={e => setReferTo(e.target.value)}><option value="">Choose</option>{institutions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
          <Button variant="secondary" disabled={!referTo} onClick={async () => {
            const r = await fetch('/api/case-packages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'draft-referral', institution: referTo }) });
            const j = await r.json();
            setMsg(r.ok ? (j.drafted ? `Referral procedure drafted (${j.drafted}): approve it below.` : `That institution already has its referral procedure (${j.present}).`) : j.error);
            load();
          }}>Draft its referral procedure</Button>
        </div>
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
