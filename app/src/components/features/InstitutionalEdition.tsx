'use client';

// The Institutional Edition and institutions' portable exports (spec Part 5 D
// and L; Health I4 standalone-and-pilot), on National settings → Institutional
// Edition.
//
// Edition: whether this installation runs as one institution (or a few, e.g.
// the health institutions) standing alone. During setup it is saved with the
// deployment profile (/api/sovereign); once setup is complete it is proposed
// citing the law and confirmed by a different official (/api/sovereign/edition).
// None ships: "No Institutional Edition" means every institution is connected.
//
// Export: an institution's own records sealed like a backup, proposed by its
// administrator and confirmed by a different official who can sign there
// (/api/org/ministries/{id}/export); each confirmed export can be downloaded
// (still sealed) or checked here, and verified offline with
// app/scripts/verify-institution-export.mjs.

import * as React from 'react';
import { Section } from '@/components/ui/DataSystem';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api/client';
import { MODULES, type ModuleKey } from '@/lib/nation/deployment';
import type { Ministry } from '@/lib/api/types';

interface Edition { kind: 'institutional'; label: string; institutions: string[]; modules: ModuleKey[] }
interface Scope {
  edition: Edition | null;
  institutions: { id: string; name: string; slots: string[] }[];
  modules: { key: string; label: string; runs: boolean }[];
  registers: { id: string; name: string }[];
  procedures: { key: string; title: string; version: number; state: string }[];
  notConnected: { slot: string; label: string; name: string }[];
}
interface Version { values: { edition: Edition | null }; basis: { title?: string; instrument: string; num?: string; eId: string }[]; by: string; at: string; expiresAt?: string; confirmed?: { by: string; at: string }; outcome?: string }
interface ExportProposal {
  id: string; institution: string; reason: string; by: string; at: string; expiresAt: string;
  state: 'proposed' | 'confirmed' | 'lapsed' | 'withdrawn' | 'failed'; problem?: string;
  confirmed?: { by: string; at: string; independence: string };
  export?: { sizeBytes: number; sha256: string; digest: string; parts: number; counts: Record<string, number>; installation: string };
}
interface Report { ok: boolean; checks: string[]; problems: string[]; notes: string[] }

const field = 'mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-sm';
const when = (s?: string) => (s ? s.slice(0, 16).replace('T', ' ') + ' UTC' : '');
async function call(url: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) throw new Error(String(j.error ?? `Request failed (${r.status})`));
  return j;
}

export function InstitutionalEditionSettings() {
  const [ministries, setMinistries] = React.useState<Ministry[]>([]);
  const [scope, setScope] = React.useState<Scope | null>(null);
  const [changes, setChanges] = React.useState<{ pending?: Version; history?: Version[] }>({});
  const [setupComplete, setSetupComplete] = React.useState(false);
  const [draft, setDraft] = React.useState<{ on: boolean; label: string; institutions: string[]; modules: ModuleKey[] }>({ on: false, label: '', institutions: [], modules: [] });
  const [law, setLaw] = React.useState({ instrument: '', eId: '' });
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const r = await fetch('/api/sovereign/edition', { cache: 'no-store' });
    if (!r.ok) { setMsg('Could not read the Institutional Edition'); return; }
    const d = (await r.json()) as { scope: Scope; changes: { pending?: Version; history?: Version[] }; setupComplete: boolean };
    setScope(d.scope); setChanges(d.changes); setSetupComplete(d.setupComplete);
    const e = d.scope.edition;
    setDraft(e ? { on: true, label: e.label, institutions: e.institutions, modules: e.modules } : { on: false, label: '', institutions: [], modules: [] });
  }, []);
  React.useEffect(() => {
    api.org.ministries().then(m => setMinistries(m.ministries.filter(x => x.status === 'active'))).catch(() => setMinistries([]));
    void load();
  }, [load]);

  const value = (): Edition | null => (draft.on ? { kind: 'institutional', label: draft.label.trim(), institutions: draft.institutions, modules: draft.modules } : null);
  const act = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); await load(); setMsg(done); } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not save'); } finally { setBusy(false); }
  };
  const saveDuringSetup = () => act(() => api.sovereign.update({ deployment: { edition: value() } } as never), 'Saved.');
  const propose = () => act(() => call('/api/sovereign/edition', { op: 'propose', edition: value(), legalBasis: law.instrument ? [{ instrument: law.instrument.trim(), eId: law.eId.trim() }] : [] }), 'Proposed: a different official confirms it before it takes effect.');
  const nameOf = (id: string) => ministries.find(m => m.id === id)?.name ?? id;
  const describe = (e: Edition | null) => (e ? `${e.label}: ${e.institutions.map(nameOf).join(', ')} · ${e.modules.map(k => MODULES.find(m => m.key === k)?.label ?? k).join(', ')}` : 'No Institutional Edition (every institution connected)');
  const cites = (v: Version) => v.basis.map(c => `${c.title ?? c.instrument} ${c.num ?? c.eId}`).join('; ');
  const toggle = <T extends string>(list: T[], v: T, on: boolean) => (on ? [...new Set([...list, v])] : list.filter(x => x !== v));

  return (
    <div id="edition" className="scroll-mt-24">
      <Section title="Institutional Edition" meta="this installation as one institution standing alone">
        <p className="mb-3 max-w-3xl text-xs text-ink-muted">
          An Institutional Edition runs only the institutions it names, with their own registers and procedures. Every other institution is not connected:
          its procedures open no case, and a check with a service it owns answers &ldquo;not connected&rdquo; and is recorded as not performed. Nothing is chosen for the nation.
          {setupComplete ? ' Setup is complete, so a change here is proposed citing the law and takes effect only when a different official confirms it.' : ' During setup, it is saved directly.'}
        </p>
        <div className="rounded border border-line p-3 text-sm" data-testid="edition-in-force">
          <p><strong>In force:</strong> {describe(scope?.edition ?? null)}</p>
          {scope?.edition ? (
            <ul className="mt-2 grid gap-1 text-xs text-ink-muted md:grid-cols-2">
              <li><strong>Institutions:</strong> {scope.institutions.map(i => `${i.name}${i.slots.length ? ` (${i.slots.length} responsibilities)` : ''}`).join(', ')}</li>
              <li><strong>Modules that run:</strong> {scope.modules.filter(m => m.runs).map(m => m.label).join(', ') || 'none'}</li>
              <li><strong>Registers kept here:</strong> {scope.registers.map(r => r.id).join(', ') || 'none'}</li>
              <li><strong>Procedures:</strong> {scope.procedures.length} version(s) of {new Set(scope.procedures.map(p => p.key)).size} procedure(s)</li>
              <li className="md:col-span-2"><strong>Not connected:</strong> {scope.notConnected.map(n => `${n.label} (${n.name})`).join(', ') || 'none'}</li>
            </ul>
          ) : null}
        </div>
        <fieldset className="mt-3 space-y-2 text-sm">
          <legend className="sr-only">Change the Institutional Edition</legend>
          <label className="flex items-center gap-2"><input type="checkbox" checked={draft.on} onChange={e => setDraft(d => ({ ...d, on: e.target.checked }))} /> Run as an Institutional Edition</label>
          {draft.on ? (
            <>
              <label className="block">Name of the edition (for example the institution or sector)<input className={field} value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} placeholder="Health regulation" /></label>
              <div>
                <p className="font-medium">Institutions it runs as</p>
                <div className="mt-1 grid gap-1 md:grid-cols-3">
                  {ministries.map(m => <label key={m.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={draft.institutions.includes(m.id)} onChange={e => setDraft(d => ({ ...d, institutions: toggle(d.institutions, m.id, e.target.checked) }))} /> {m.name}</label>)}
                </div>
              </div>
              <div>
                <p className="font-medium">Modules it runs</p>
                <div className="mt-1 grid gap-1 md:grid-cols-3">
                  {MODULES.map(m => <label key={m.key} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={draft.modules.includes(m.key)} onChange={e => setDraft(d => ({ ...d, modules: toggle(d.modules, m.key, e.target.checked) }))} /> {m.label}</label>)}
                </div>
              </div>
            </>
          ) : null}
        </fieldset>
        {setupComplete ? (
          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <label className="text-sm">Legal basis: law (id from Laws)<input className={field} value={law.instrument} onChange={e => setLaw(x => ({ ...x, instrument: e.target.value }))} placeholder="/eli/…" /></label>
            <label className="text-sm">Provision (e.g. sec_3)<input className={field} value={law.eId} onChange={e => setLaw(x => ({ ...x, eId: e.target.value }))} /></label>
            <div className="flex items-end"><Button variant="primary" disabled={busy || !!changes.pending} onClick={() => void propose()}>Propose a change</Button></div>
          </div>
        ) : (
          <div className="mt-3"><Button variant="primary" disabled={busy} onClick={() => void saveDuringSetup()}>Save the edition</Button></div>
        )}
        {changes.pending ? (
          <div className="mt-3 rounded border border-line p-2 text-sm">
            <p><strong>Waiting for a second official:</strong> {describe(changes.pending.values.edition)}</p>
            <p className="text-xs text-ink-muted">Proposed by {changes.pending.by} · basis {cites(changes.pending)} · lapses {when(changes.pending.expiresAt)}</p>
            <div className="mt-2 flex gap-2">
              <Button variant="primary" disabled={busy} onClick={() => void act(() => call('/api/sovereign/edition', { op: 'confirm' }), 'Confirmed: the edition is in force.')}>Confirm</Button>
              <Button disabled={busy} onClick={() => void act(() => call('/api/sovereign/edition', { op: 'withdraw' }), 'Withdrawn.')}>Withdraw</Button>
            </div>
          </div>
        ) : null}
        {msg ? <p role="status" className="mt-2 text-xs text-ink-muted">{msg}</p> : null}
        {changes.history?.length ? (
          <details className="mt-3 text-xs text-ink-muted">
            <summary className="cursor-pointer">Earlier changes ({changes.history.length})</summary>
            <ul className="mt-1 space-y-1">{[...changes.history].reverse().map((h, i) => <li key={i}>{h.outcome} · {describe(h.values.edition)} · proposed by {h.by}{h.confirmed ? `, confirmed by ${h.confirmed.by}` : ''} · {h.at.slice(0, 10)} · basis {cites(h)}</li>)}</ul>
          </details>
        ) : null}
      </Section>
    </div>
  );
}

export function InstitutionExports() {
  const [ministries, setMinistries] = React.useState<Ministry[]>([]);
  const [inst, setInst] = React.useState('');
  const [list, setList] = React.useState<ExportProposal[]>([]);
  const [reason, setReason] = React.useState('');
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [reports, setReports] = React.useState<Record<string, Report>>({});

  React.useEffect(() => {
    api.org.ministries().then(m => {
      const active = m.ministries.filter(x => x.status === 'active');
      setMinistries(active);
      const fromUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('institution') : null;
      setInst(i => i || (fromUrl && active.some(a => a.id === fromUrl) ? fromUrl : active.find(a => a.slug === 'health')?.id ?? active[0]?.id ?? ''));
    }).catch(() => setMinistries([]));
  }, []);
  const load = React.useCallback(async () => {
    if (!inst) return;
    const r = await fetch(`/api/org/ministries/${encodeURIComponent(inst)}/export`, { cache: 'no-store' });
    const j = (await r.json().catch(() => ({}))) as { exports?: ExportProposal[]; error?: string };
    if (!r.ok) { setList([]); setMsg(j.error ?? 'Could not read the exports'); return; }
    setList(j.exports ?? []);
  }, [inst]);
  React.useEffect(() => { void load(); }, [load]);

  const act = async (body: Record<string, unknown>, done: string) => {
    setBusy(true); setMsg(null);
    try { await call(`/api/org/ministries/${encodeURIComponent(inst)}/export`, body); await load(); setMsg(done); if (body.op === 'propose') setReason(''); } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not save'); } finally { setBusy(false); }
  };
  const check = async (id: string) => {
    const r = await fetch(`/api/org/ministries/${encodeURIComponent(inst)}/export/${id}?check`, { cache: 'no-store' });
    const j = (await r.json().catch(() => ({}))) as Report & { error?: string };
    if (!r.ok) { setMsg(j.error ?? 'Could not check the export'); return; }
    setReports(x => ({ ...x, [id]: j }));
  };
  const waiting = list.filter(p => p.state === 'proposed');
  const done = list.filter(p => p.state !== 'proposed');

  return (
    <div id="export" className="scroll-mt-24">
      <Section title="Portable export" meta="an institution's own records, sealed and verifiable offline">
        <p className="mb-3 max-w-3xl text-xs text-ink-muted">
          An export carries one institution&apos;s registers, cases, sealed decisions, documents and its audit and access-log entries, and nothing of any other institution,
          so it can move to another host, run standing alone or federate later with every record identifier unchanged. It is sealed through key custody like a backup,
          proposed by the institution&apos;s administrator and made only when a different official who can sign there confirms it. Verify one without a server:
          <code className="ms-1">node scripts/verify-institution-export.mjs &lt;file.cvx&gt;</code>.
        </p>
        <div className="grid gap-2 md:grid-cols-[1fr_2fr_auto]">
          <label className="text-sm">Institution
            <select className={field} value={inst} onChange={e => { setInst(e.target.value); setReports({}); }}>
              {ministries.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Why it is exported<input className={field} value={reason} onChange={e => setReason(e.target.value)} placeholder="Moving to the institution's own host" /></label>
          <div className="flex items-end"><Button variant="primary" disabled={busy || !inst || !reason.trim()} onClick={() => void act({ op: 'propose', reason }, 'Proposed: an official who can sign at the institution confirms it, and the export is made then.')}>Propose an export</Button></div>
        </div>
        {msg ? <p role="status" className="mt-2 text-xs text-ink-muted">{msg}</p> : null}
        {waiting.map(p => (
          <div key={p.id} className="mt-3 rounded border border-line p-2 text-sm" data-testid="export-waiting">
            <p><strong>Waiting for a second official:</strong> export {p.id} of {ministries.find(m => m.id === p.institution)?.name ?? p.institution}</p>
            <p className="text-xs text-ink-muted">Proposed by {p.by} · {p.reason} · lapses {when(p.expiresAt)} · confirmed by a different official who can sign at the institution</p>
            <div className="mt-2 flex gap-2">
              <Button variant="primary" disabled={busy} onClick={() => void act({ op: 'confirm', proposal: p.id }, 'Confirmed: the export is made, sealed and written to the backup target.')}>Confirm and export</Button>
              <Button disabled={busy} onClick={() => void act({ op: 'withdraw', proposal: p.id }, 'Withdrawn.')}>Withdraw</Button>
            </div>
          </div>
        ))}
        {done.length ? (
          <table className="mt-3 w-full text-left text-xs">
            <thead className="text-ink-muted"><tr><th className="py-1 pe-2">Export</th><th className="pe-2">State</th><th className="pe-2">Officials</th><th className="pe-2">Contents</th><th>Check</th></tr></thead>
            <tbody>
              {done.map(p => (
                <tr key={p.id} className="border-t border-line align-top">
                  <td className="py-1 pe-2 font-mono">{p.id}</td>
                  <td className="pe-2">{p.state}{p.problem ? `: ${p.problem}` : ''}</td>
                  <td className="pe-2">{p.by}{p.confirmed ? ` → ${p.confirmed.by} (${p.confirmed.independence})` : ''}</td>
                  <td className="pe-2">{p.export ? `${Object.entries(p.export.counts).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(', ')} · ${(p.export.sizeBytes / 1024).toFixed(1)} KB · sha256 ${p.export.sha256.slice(0, 12)}…` : ''}</td>
                  <td>
                    {p.export ? (
                      <div className="space-y-1">
                        <div className="flex gap-2"><a className="underline" href={`/api/org/ministries/${encodeURIComponent(inst)}/export/${p.id}`}>Download</a><button type="button" className="underline" onClick={() => void check(p.id)}>Check</button></div>
                        {reports[p.id] ? <p className={reports[p.id]!.ok ? '' : 'font-semibold'}>{reports[p.id]!.ok ? 'Verified' : `Not verified: ${reports[p.id]!.problems.join('; ')}`}</p> : null}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <InstitutionImports />
      </Section>
    </div>
  );
}

interface ImportProposal { id: string; exportId: string; institutionName: string; by: string; at: string; expiresAt: string; state: string; problem?: string; confirmed?: { by: string }; restored?: Record<string, number> }

/** Bringing an institution's export into this installation: administrators serving the whole government, two of them. */
function InstitutionImports() {
  const [list, setList] = React.useState<ImportProposal[] | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const load = React.useCallback(async () => {
    const r = await fetch('/api/platform/institution-import', { cache: 'no-store' });
    if (!r.ok) { setList(null); return; }
    setList(((await r.json()) as { imports: ImportProposal[] }).imports);
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  if (!list) return null;
  const act = async (body: Record<string, unknown>, done: string) => {
    setBusy(true); setMsg(null);
    try { await call('/api/platform/institution-import', body); await load(); setMsg(done); } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not import'); } finally { setBusy(false); }
  };
  const upload = async (f: File | undefined) => {
    if (!f) return;
    const bytes = new Uint8Array(await f.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    await act({ op: 'propose', archive: btoa(bin) }, 'Verified and proposed: a second administrator confirms the import.');
  };
  return (
    <div className="mt-4 border-t border-line pt-3">
      <h3 className="text-sm font-semibold">Import an institution&apos;s export</h3>
      <p className="text-xs text-ink-muted">The export is verified first and must hold nothing already here; every record keeps its id. A second administrator confirms it.</p>
      <label className="mt-2 block text-sm">Sealed export (.cvx)<input className={field} type="file" accept=".cvx,application/octet-stream" disabled={busy} onChange={e => void upload(e.target.files?.[0])} /></label>
      {msg ? <p role="status" className="mt-2 text-xs text-ink-muted">{msg}</p> : null}
      <ul className="mt-2 space-y-2 text-xs">
        {list.map(p => (
          <li key={p.id} className="rounded border border-line p-2">
            <p>{p.institutionName} · export {p.exportId} · {p.state}{p.problem ? `: ${p.problem}` : ''} · proposed by {p.by}{p.confirmed ? `, confirmed by ${p.confirmed.by}` : ''}</p>
            {p.restored ? <p className="text-ink-muted">{Object.entries(p.restored).map(([k, n]) => `${k} ${n}`).join(', ')}</p> : null}
            {p.state === 'proposed' ? (
              <div className="mt-1 flex gap-2">
                <Button variant="primary" disabled={busy} onClick={() => void act({ op: 'confirm', proposal: p.id }, 'Imported with every record identifier unchanged.')}>Confirm the import</Button>
                <Button disabled={busy} onClick={() => void act({ op: 'withdraw', proposal: p.id }, 'Withdrawn.')}>Withdraw</Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
