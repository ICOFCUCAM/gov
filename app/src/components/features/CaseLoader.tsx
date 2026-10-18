'use client';

// Load cases: an institution brings the cases it already holds into its queue
// (and so into My work) — a CSV saved from its spreadsheet or case system, or
// one case typed in. The file is checked first; refused rows come back with
// their reasons and nothing changes until the official loads. Every load is
// audited with the file's SHA-256 and can be withdrawn. Rules and storage:
// lib/data/case-import.ts.

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import type { CaseColumn, CaseFeed, CaseImport, CaseRefusal } from '@/lib/api/types';
import { canManageFeeds } from '@/lib/auth/roles';
import { useOfficial, useSignIn } from '@/lib/official';
import { ActingOfficial } from '@/components/ui/ActingOfficial';
import { buildCsv, downloadCsv } from '@/lib/csv-download';

const input = 'focus-ring w-full rounded-[3px] border border-line bg-surface px-2.5 py-2 text-[14px] text-ink';
const btn = 'focus-ring rounded-[3px] border border-line px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-surface-2 disabled:opacity-50';
const when = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—');

interface Institution { id: string; name: string; status: string }
interface Check { fileName: string; csv: string; accepted: number; refused: CaseRefusal[] }

export function CaseLoader() {
  const signedIn = useSignIn()?.official ?? null;
  const [official, setOfficial] = useOfficial();
  const [institutions, setInstitutions] = React.useState<Institution[]>([]);
  const [inst, setInst] = React.useState('');
  const [info, setInfo] = React.useState<{ columns: CaseColumn[]; maxRows: number; samples: number; imports: CaseImport[] } | null>(null);
  const [check, setCheck] = React.useState<Check | null>(null);
  const [removeSamples, setRemoveSamples] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const blank = { reference: '', subject: '', received: new Date().toISOString().slice(0, 10), region: '', priority: 'routine', assignee: '', note: '' };
  const [one, setOne] = React.useState(blank);
  const fixed = signedIn?.institution;
  const [feeds, setFeeds] = React.useState<CaseFeed[]>([]);
  const [feedName, setFeedName] = React.useState('');
  const [newKey, setNewKey] = React.useState<{ name: string; key: string } | null>(null);
  const [origin, setOrigin] = React.useState('');
  React.useEffect(() => { setOrigin(window.location.origin); }, []);

  React.useEffect(() => {
    void api.org.ministries().then(d => setInstitutions(d.ministries.filter(m => m.status === 'active').sort((a, b) => a.name.localeCompare(b.name))));
  }, []);
  React.useEffect(() => { if (fixed) setInst(fixed); }, [fixed]);
  const load = React.useCallback(async () => {
    if (!inst) { setInfo(null); return; }
    setInfo(await api.org.caseImports(inst));
    setFeeds((await api.org.caseFeeds(inst)).feeds);
  }, [inst]);
  React.useEffect(() => { setCheck(null); setNewKey(null); void load(); }, [load]);
  const mayConnect = !signedIn || !canManageFeeds(signedIn, inst);

  const name = institutions.find(m => m.id === inst)?.name ?? 'this institution';

  async function run<T>(fn: () => Promise<T>, done: (r: T) => string) {
    if (!official) { setMsg({ ok: false, text: 'Sign in or name the acting official first: every load is recorded under a person.' }); return null; }
    setBusy(true); setMsg(null);
    try { const r = await fn(); setMsg({ ok: true, text: done(r) }); await load(); return r; }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); return null; }
    finally { setBusy(false); }
  }

  async function onFile(f: File | undefined) {
    setCheck(null); setMsg(null);
    if (!f || !inst) return;
    const csv = await f.text();
    setBusy(true);
    try {
      const r = await api.org.importCases(inst, { csv, fileName: f.name, dryRun: true });
      setCheck({ fileName: f.name, csv, accepted: r.accepted, refused: r.refused });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 text-[14px] text-ink">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">Load cases</h2>
          <p className="mt-1 max-w-3xl text-ink-soft">
            Bring the cases your institution already holds into its queue, so <Link href="/gov/work" className="text-link underline">My work</Link> shows
            your real work and its real ages. Every file is checked before anything changes.
          </p>
        </div>
        <ActingOfficial name={official} onChange={setOfficial} />
      </header>

      <label className="block max-w-md text-[13px] text-ink-soft">Institution
        <select className={`${input} mt-1`} value={inst} disabled={!!fixed} onChange={e => setInst(e.currentTarget.value)}>
          <option value="">Choose an institution</option>
          {institutions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        {fixed ? <span className="mt-1 block text-[12px] text-ink-muted">You load cases for your own institution.</span> : null}
      </label>

      {msg ? <p role="status" className={msg.ok ? 'text-ok' : 'text-alert'}>{msg.text}</p> : null}

      {!inst || !info ? null : (
        <>
          {info.samples > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[3px] border border-dashed border-line bg-surface p-3 text-[13px]">
              <span>{name}&rsquo;s queue still holds <strong>{info.samples}</strong> example case{info.samples === 1 ? '' : 's'} from the platform, marked &ldquo;Sample&rdquo;.</span>
              <button className={btn} disabled={busy} onClick={() => run(() => api.org.removeSampleCases(inst, official), r => `${r.removed} example cases removed from ${name}`)}>Remove the example cases</button>
            </div>
          ) : null}

          <section className="space-y-3 rounded-[3px] border border-line bg-surface p-4">
            <h3 className="text-[16px] font-semibold">Load from a spreadsheet</h3>
            <p className="text-[13px] text-ink-soft">
              Save your spreadsheet as CSV (comma, semicolon or tab separated) with a header row. Up to {info.maxRows.toLocaleString()} cases per file.{' '}
              <button type="button" className="text-link underline" onClick={() => downloadCsv('cases-template', buildCsv(info.columns.map(c => c.name), []))}>Download the template</button>
            </p>
            <table className="w-full text-[13px]">
              <thead><tr className="border-b border-line text-ink-muted"><th className="py-1 text-start font-semibold">Column</th><th className="text-start font-semibold">Needed</th><th className="text-start font-semibold">What goes in it</th></tr></thead>
              <tbody>
                {info.columns.map(c => (
                  <tr key={c.name} className="border-b border-line-soft">
                    <td className="py-1 font-mono text-[12px]">{c.name}</td>
                    <td>{c.required ? 'Yes' : 'No'}</td>
                    <td className="text-ink-soft">{c.means}{c.aliases.length ? <span className="text-ink-muted"> Also read from: {c.aliases.join(', ')}.</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <label className="block text-[13px] text-ink-soft">Choose the CSV file
              <input type="file" accept=".csv,text/csv,text/plain" className="mt-1 block text-[13px]" disabled={busy}
                onChange={e => void onFile(e.currentTarget.files?.[0])} />
            </label>

            {check ? (
              <div className="space-y-2 rounded-[3px] border border-line p-3" aria-live="polite">
                <p><strong>{check.fileName}</strong>: {check.accepted} case{check.accepted === 1 ? '' : 's'} ready to load
                  {check.refused.length ? <>, <span className="text-alert">{check.refused.length} row{check.refused.length === 1 ? '' : 's'} refused</span></> : null}.</p>
                {check.refused.length ? (
                  <>
                    <table className="w-full text-[13px]">
                      <thead><tr className="border-b border-line text-ink-muted"><th className="py-1 text-start font-semibold">Row</th><th className="text-start font-semibold">Reference</th><th className="text-start font-semibold">Why it was refused</th></tr></thead>
                      <tbody>
                        {check.refused.slice(0, 50).map(r => (
                          <tr key={r.row} className="border-b border-line-soft"><td className="py-1 font-mono">{r.row}</td><td className="font-mono">{r.reference ?? '—'}</td><td>{r.reason}</td></tr>
                        ))}
                      </tbody>
                    </table>
                    <button type="button" className="text-[13px] text-link underline"
                      onClick={() => downloadCsv(`${check.fileName.replace(/\.csv$/i, '')}-refused`, buildCsv(['row', 'reference', 'reason'], check.refused.map(r => [String(r.row), r.reference ?? '', r.reason])))}>
                      Download all refused rows{check.refused.length > 50 ? ` (${check.refused.length})` : ''}
                    </button>
                  </>
                ) : null}
                {info.samples > 0 && check.accepted > 0 ? (
                  <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={removeSamples} onChange={e => setRemoveSamples(e.currentTarget.checked)} />
                    Remove the {info.samples} example cases from {name}&rsquo;s queue in the same step</label>
                ) : null}
                {check.accepted > 0 ? (
                  <button className={btn} disabled={busy}
                    onClick={async () => {
                      const r = await run(() => api.org.importCases(inst, { csv: check.csv, fileName: check.fileName, removeSamples, by: official }),
                        x => `${x.accepted} cases loaded into ${name}${x.import?.removedSamples ? `; ${x.import.removedSamples} example cases removed` : ''}`);
                      if (r) setCheck(null);
                    }}>Load {check.accepted} case{check.accepted === 1 ? '' : 's'}</button>
                ) : <p className="text-[13px] text-ink-soft">Correct the rows and choose the file again.</p>}
              </div>
            ) : null}
          </section>

          <section className="space-y-3 rounded-[3px] border border-line bg-surface p-4">
            <h3 className="text-[16px] font-semibold">Add one case</h3>
            <form className="grid gap-2 md:grid-cols-4"
              onSubmit={async e => {
                e.preventDefault();
                const r = await run(() => api.org.addCase(inst, { ...one, by: official }), x => `Case ${x.item.ref} added to ${name}`);
                if (r) setOne(blank);
              }}>
              <label className="text-[12px] text-ink-soft">Reference<input className={`${input} mt-1`} required value={one.reference} onChange={e => setOne({ ...one, reference: e.currentTarget.value })} /></label>
              <label className="text-[12px] text-ink-soft md:col-span-2">Subject<input className={`${input} mt-1`} required value={one.subject} onChange={e => setOne({ ...one, subject: e.currentTarget.value })} /></label>
              <label className="text-[12px] text-ink-soft">Received<input type="date" className={`${input} mt-1`} required value={one.received} onChange={e => setOne({ ...one, received: e.currentTarget.value })} /></label>
              <label className="text-[12px] text-ink-soft">Region (optional)<input className={`${input} mt-1`} value={one.region} onChange={e => setOne({ ...one, region: e.currentTarget.value })} /></label>
              <label className="text-[12px] text-ink-soft">Priority<select className={`${input} mt-1`} value={one.priority} onChange={e => setOne({ ...one, priority: e.currentTarget.value })}>
                <option value="routine">Routine</option><option value="elevated">Elevated</option><option value="urgent">Urgent</option></select></label>
              <label className="text-[12px] text-ink-soft">Handled by (optional)<input className={`${input} mt-1`} value={one.assignee} onChange={e => setOne({ ...one, assignee: e.currentTarget.value })} /></label>
              <label className="text-[12px] text-ink-soft">Note (optional)<input className={`${input} mt-1`} value={one.note} onChange={e => setOne({ ...one, note: e.currentTarget.value })} /></label>
              <div className="md:col-span-4"><button className={btn} disabled={busy}>Add the case</button></div>
            </form>
          </section>

          <section className="space-y-3 rounded-[3px] border border-line bg-surface p-4">
            <h3 className="text-[16px] font-semibold">Connect your case system</h3>
            <p className="text-[13px] text-ink-soft">
              Instead of loading files, {name}&rsquo;s own case system can send its cases here directly and keep them up to date
              (closed or reassigned there, changed here). Each system gets its own key; the system can also read back what officials did here.
              Cases loaded or typed in on the platform are never changed by a system.
            </p>
            {newKey ? (
              <div className="space-y-2 rounded-[3px] border border-warn p-3 text-[13px]" role="status">
                <p><strong>Key for {newKey.name}.</strong> Copy it now into the system&rsquo;s settings: it is shown only this once and is not kept on the platform.</p>
                <code className="block break-all rounded-[3px] bg-bg px-2 py-1 font-mono text-[12px]">{newKey.key}</code>
                <details>
                  <summary className="cursor-pointer text-link">How the system calls the platform</summary>
                  <pre className="mt-1 overflow-x-auto rounded-[3px] bg-bg px-2 py-1 font-mono text-[11px]">{`POST ${origin}/api/org/ministries/${inst}/queue/feed
Authorization: Bearer ${newKey.key}
Content-Type: application/json

{ "cases": [ { "reference": "…", "subject": "…", "received": "2026-10-01",
               "region": "…", "priority": "routine", "assignee": "…", "state": "open" } ] }

GET ${origin}/api/org/ministries/${inst}/queue/feed?since=2026-10-01T00:00:00Z
Authorization: Bearer ${newKey.key}`}</pre>
                  <p className="mt-1 text-ink-soft">state is open, assigned, escalated or closed. Every case is answered: added, updated, unchanged or refused with its reason. The full description is in the <Link href="/developers" className="text-link underline">developer page</Link>.</p>
                </details>
                <button type="button" className={btn} onClick={() => setNewKey(null)}>I have copied the key</button>
              </div>
            ) : null}
            {feeds.length ? (
              <table className="w-full text-[13px]">
                <thead><tr className="border-b border-line text-ink-muted"><th className="py-1 text-start font-semibold">System</th><th className="text-start font-semibold">Key</th><th className="text-start font-semibold">Connected</th><th className="text-start font-semibold">Last call</th><th /></tr></thead>
                <tbody>
                  {feeds.map(f => (
                    <tr key={f.id} className="border-b border-line-soft">
                      <td className="py-1.5"><strong>{f.name}</strong></td>
                      <td className="font-mono text-[12px]">ccf_{f.prefix}…</td>
                      <td>{when(f.issuedAt)}<div className="text-ink-muted">by {f.issuedBy}</div></td>
                      <td>{f.lastCallAt ? <>{when(f.lastCallAt)}<div className="text-ink-muted">{f.lastResult ? `${f.lastResult.added} added, ${f.lastResult.updated} updated, ${f.lastResult.refused} refused` : ''} · {f.calls} calls</div></> : 'Not yet'}</td>
                      <td className="text-end">
                        {f.revokedAt ? <span className="text-ink-muted">Disconnected {when(f.revokedAt)} by {f.revokedBy}</span>
                          : mayConnect ? <button className={btn} disabled={busy} onClick={() => run(() => api.org.revokeCaseFeed(inst, f.id, official), x => `${x.feed.name} disconnected; its key no longer works`)}>Disconnect</button> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-[13px] text-ink-soft">No system is connected to {name} yet.</p>}
            {mayConnect ? (
              <form className="flex flex-wrap items-end gap-2" onSubmit={async e => {
                e.preventDefault();
                const r = await run(() => api.org.issueCaseFeed(inst, feedName, official), x => `${x.feed.name} connected`);
                if (r) { setNewKey({ name: r.feed.name, key: r.key }); setFeedName(''); }
              }}>
                <label className="text-[12px] text-ink-soft">Name of the system<input className={`${input} mt-1 w-72`} required maxLength={80} value={feedName} onChange={e => setFeedName(e.currentTarget.value)} placeholder="e.g. Licensing case system" /></label>
                <button className={btn} disabled={busy}>Connect and issue a key</button>
              </form>
            ) : <p className="text-[13px] text-ink-muted">An administrator or an official who can sign for {name} connects case systems.</p>}
          </section>

          <section className="space-y-2">
            <h3 className="text-[16px] font-semibold">Earlier loads</h3>
            {info.imports.length === 0 ? <p className="text-[13px] text-ink-soft">No cases have been loaded into {name} yet.</p> : (
              <table className="w-full text-[13px]">
                <thead><tr className="border-b border-line text-ink-muted"><th className="py-1 text-start font-semibold">When</th><th className="text-start font-semibold">By</th><th className="text-start font-semibold">File</th><th className="text-start font-semibold">Loaded</th><th className="text-start font-semibold">Fingerprint</th><th /></tr></thead>
                <tbody>
                  {info.imports.map(r => (
                    <tr key={r.id} className="border-b border-line-soft">
                      <td className="py-1.5">{when(r.at)}</td>
                      <td>{r.by}</td>
                      <td>{r.fileName ?? '—'}</td>
                      <td>{r.accepted} cases{r.refused ? `, ${r.refused} refused` : ''}{r.removedSamples ? `; ${r.removedSamples} examples removed` : ''}</td>
                      <td><abbr title={`SHA-256 of the file: ${r.sha256}`} className="font-mono text-[12px] no-underline">{r.sha256.slice(0, 12)}…</abbr></td>
                      <td className="text-end">
                        {r.withdrawnAt
                          ? <span className="text-ink-muted">Withdrawn {when(r.withdrawnAt)} by {r.withdrawnBy}: {r.withdrawn} removed</span>
                          : <button className={btn} disabled={busy} onClick={() => run(() => api.org.withdrawImport(inst, r.id, official), x => `Load withdrawn: ${x.import.withdrawn} cases removed; cases already acted on stay`)}>Withdraw</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
