'use client';

import * as React from 'react';
import { api } from '@/lib/api/client';
import { Field, inputCls, goldBtn, goldStyle, ghostBtn, hair, CHAMPAGNE } from '@/components/features/onboarding/Chrome';
import type { ChamberRelease, PreflightReport, PreflightStatus, StagingEnvironment, StagingRun } from '@/lib/api/types';
import { Chip, ErrorLine, Panel, fmtDateTime, useActor } from './ui';

const STATUS_TONE: Record<PreflightStatus, string> = { compatible: '#9be7c4', 'needs-change': '#f1b36b', blocking: '#f1938f' };
const STATUS_TEXT: Record<PreflightStatus, string> = { compatible: 'Compatible', 'needs-change': 'Needs change', blocking: 'Blocking' };

/**
 * Release readiness: the preflight scan of the nation's customisations, and
 * staging probation with user-acceptance sign-off before production.
 */
export function ReadinessPanel({ r, link, onChange }: { r: ChamberRelease; link?: string; onChange?: () => void }) {
  const [data, setData] = React.useState<{ preflight: PreflightReport | null; staging: StagingEnvironment; run: StagingRun | null; stagingRequired: boolean } | null>(null);
  const [actor] = useActor();
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [waive, setWaive] = React.useState<{ key: string; reason: string } | null>(null);
  const [uat, setUat] = React.useState({ tester: '', date: '', evidence: '' });
  const [failReason, setFailReason] = React.useState('');
  const [env, setEnv] = React.useState({ name: '', url: '' });
  const load = React.useCallback(() => { api.updates.readiness(r.id, link).then(setData).catch(e => setErr(e instanceof Error ? e.message : 'Could not load readiness')); }, [r.id, link]);
  React.useEffect(load, [load]);
  React.useEffect(() => { setUat(u => ({ ...u, date: u.date || new Date().toISOString().slice(0, 10) })); }, []);
  const running = data?.run?.state === 'probation';
  React.useEffect(() => { if (!running) return; const t = setInterval(load, 5000); return () => clearInterval(t); }, [running, load]);

  async function act(body: Parameters<typeof api.updates.readinessAction>[1]) {
    setErr(null);
    if (!actor.trim() && body.action !== 'uat') { setErr('Enter your name in the decision panel first.'); return; }
    setBusy(true);
    try { await api.updates.readinessAction(r.id, { by: actor.trim(), link, ...body }); load(); onChange?.(); setWaive(null); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  }
  async function register() {
    setErr(null);
    try { await api.updates.registerStaging({ ...env, by: actor, link }); load(); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not register'); }
  }

  if (!data) return <div className="min-h-[200px]"><ErrorLine>{err}</ErrorLine></div>;
  const p = data.preflight, run = data.run;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <Panel className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/75">Preflight compatibility</span>
          {p ? <><Chip tone="#9be7c4">{p.summary.compatible} compatible</Chip><Chip tone="#f1b36b">{p.summary.needsChange} need change</Chip><Chip tone="#f1938f" solid={p.summary.blocking - p.summary.waived > 0}>{p.summary.blocking} blocking{p.summary.waived ? ` · ${p.summary.waived} waived` : ''}</Chip></> : <Chip tone="#8a8f99">Not run yet</Chip>}
          <button type="button" className={`${ghostBtn} ml-auto py-1.5 text-[12px]`} disabled={busy} onClick={() => act({ action: 'preflight' })}>{p ? 'Run again' : 'Run preflight'}</button>
        </div>
        <p className="mt-2 text-[12.5px] font-light text-night-muted">Scans your own modules, integrations and builds, integration clients, signed configuration and custom-charter institutions against {r.version}. Approval runs it again automatically; blocking findings stop approval unless two officials waive them (one proposes, a different signed-in official confirms).</p>
        {p ? (
          <ul className="mt-3 grid gap-2">
            {p.findings.map(f => (
              <li key={f.key} className="rounded-[2px] border px-3 py-2" style={{ borderColor: f.status === 'blocking' && !f.waiver ? '#f1938f55' : hair(0.1) }}>
                <p className="flex flex-wrap items-center gap-2 text-[13px] font-light text-[#f3efe6]"><Chip tone={STATUS_TONE[f.status]} solid={f.status === 'blocking' && !f.waiver}>{f.waiver ? 'Waived' : STATUS_TEXT[f.status]}</Chip>{f.subject}<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-night-faint">{f.kind}</span></p>
                <p className="mt-1 text-[12px] font-light text-night-muted">{f.reason}</p>
                {f.waiver ? <p className="mt-1 text-[11.5px] text-night-muted">Waived by {f.waiver.by} and {f.waiver.secondBy}: {f.waiver.reason}</p> : null}
                {f.status === 'blocking' && !f.waiver && f.waiverProposal ? (
                  <div className="mt-2 grid gap-2">
                    <p className="text-[11.5px] text-white/60">Waiver proposed by {f.waiverProposal.by} on {fmtDateTime(f.waiverProposal.at)}: {f.waiverProposal.reason}. A different official confirms it, signed in.</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={`${ghostBtn} py-2 text-[12px]`} disabled={busy} onClick={() => act({ action: 'waive', findingKey: f.key })}>Confirm waiver (second official)</button>
                      <button type="button" className={`${ghostBtn} py-2 text-[12px]`} disabled={busy} onClick={() => act({ action: 'cancel-waiver', findingKey: f.key })}>Cancel proposal</button>
                    </div>
                  </div>
                ) : f.status === 'blocking' && !f.waiver ? (
                  waive?.key === f.key ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1.6fr)_auto] sm:items-end">
                      <Field label="Reason"><input className={inputCls} value={waive.reason} onChange={e => setWaive({ ...waive, reason: e.target.value })} /></Field>
                      <button type="button" className={`${ghostBtn} py-2.5 text-[12px]`} disabled={busy} onClick={() => act({ action: 'waive', findingKey: f.key, reason: waive.reason })}>Propose waiver</button>
                    </div>
                  ) : <button type="button" className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#f1938f]/80 hover:text-[#f1938f]" onClick={() => setWaive({ key: f.key, reason: '' })}>Propose a waiver for a second official…</button>
                ) : null}
              </li>
            ))}
            {!p.findings.length ? <li className="text-[12.5px] text-night-muted">No customisations registered.</li> : null}
          </ul>
        ) : null}
        {p ? <p className="mt-2 font-mono text-[10px] text-night-faint">Run {fmtDateTime(p.runAt)} by {p.runBy}</p> : null}
      </Panel>

      <Panel className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/75">Staging and user acceptance</span>
          {!data.stagingRequired ? <Chip tone="#8a8f99">Policy off for this nation</Chip> : <Chip tone="#a9c7e8">Required before production</Chip>}
          {run ? <Chip tone={run.state === 'passed' ? '#9be7c4' : run.state === 'failed' ? '#f1938f' : '#f4d58d'} solid>{run.state === 'probation' ? 'Staging probation' : run.state === 'passed' ? 'Staging passed' : 'Staging failed'}</Chip> : null}
          {run?.uat ? <Chip tone="#9be7c4" solid>UAT signed</Chip> : null}
        </div>
        {!data.staging.provisioned ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end">
            <Field label="Staging name"><input className={inputCls} value={env.name} onChange={e => setEnv({ ...env, name: e.target.value })} placeholder="National staging" /></Field>
            <Field label="Staging URL"><input className={inputCls} value={env.url} onChange={e => setEnv({ ...env, url: e.target.value })} placeholder="https://staging…" /></Field>
            <button type="button" className={`${ghostBtn} py-2.5 text-[12px]`} onClick={register}>Register staging</button>
          </div>
        ) : (
          <p className="mt-2 text-[12.5px] font-light text-night-muted">{data.staging.name}{data.staging.url ? ` · ${data.staging.url}` : ''} · {data.staging.provisionedBy === 'publisher' ? 'provisioned for you' : 'registered by your team'}</p>
        )}
        {data.staging.provisioned && (!run || run.state === 'failed') && r.newer ? (
          <button type="button" className={`${goldBtn} mt-3 px-4 py-2 text-[12.5px]`} style={goldStyle} disabled={busy || r.blocked} onClick={() => act({ action: 'stage' })}>Install {r.version} on staging</button>
        ) : null}
        {run ? (
          <div className="mt-3 text-[12.5px] font-light text-white/65">
            <p>Started {fmtDateTime(run.startedAt)} by {run.startedBy} · window ends {fmtDateTime(run.endsAt)}{run.passedAt ? ` · passed ${fmtDateTime(run.passedAt)}` : ''}</p>
            {run.failedReason ? <p className="mt-1 text-[#f1938f]">Failed: {run.failedReason}</p> : null}
            {run.state === 'probation' ? (
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <input aria-label="Failure" className={`${inputCls} min-w-[220px] flex-1 py-2 text-[13px]`} value={failReason} onChange={e => setFailReason(e.target.value)} placeholder="What failed on staging" />
                <button type="button" className={`${ghostBtn} py-2 text-[12px]`} onClick={() => act({ action: 'stage-fail', reason: failReason })}>Record staging failure</button>
              </div>
            ) : null}
            {run.uat ? <p className="mt-2 text-[#9be7c4]">UAT signed by {run.uat.tester} on {fmtDateTime(run.uat.date)}: “{run.uat.evidence}”</p> : null}
            {run.state === 'passed' && !run.uat ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-end">
                <Field label="Tester (name, office)"><input className={inputCls} value={uat.tester} onChange={e => setUat({ ...uat, tester: e.target.value })} /></Field>
                <Field label="Test date"><input type="date" className={inputCls} value={uat.date} onChange={e => setUat({ ...uat, date: e.target.value })} /></Field>
                <div className="sm:col-span-2"><Field label="Evidence" hint="Scripts run, results, ticket or report reference."><textarea className={`${inputCls} min-h-[60px]`} value={uat.evidence} onChange={e => setUat({ ...uat, evidence: e.target.value })} /></Field></div>
                <button type="button" className={`${goldBtn} px-4 py-2 text-[12.5px] sm:col-span-2 sm:justify-self-start`} style={goldStyle} disabled={busy} onClick={() => act({ action: 'uat', tester: uat.tester, date: uat.date ? new Date(uat.date).toISOString() : '', evidence: uat.evidence })}>Sign user acceptance</button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Panel>
      <div className="min-h-[16px]" aria-live="polite"><ErrorLine>{err}</ErrorLine></div>
      <p className="text-[11.5px] font-light text-night-faint" style={{ color: CHAMPAGNE + '80' }}>Every step is written to the audit chain.</p>
    </div>
  );
}
