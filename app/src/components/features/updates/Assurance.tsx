'use client';

// Supply-chain proof and source-code escrow, as the nation sees them:
// SLSA provenance per artifact (on each release), the escrow agreement and
// deposit status of every release, and source-code audit requests.

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { OnboardingFrame, Eyebrow, Section, Field, inputCls, Select, goldBtn, goldStyle, ghostBtn, hair, CHAMPAGNE, CHAMPAGNE_HI } from '@/components/features/onboarding/Chrome';
import type { EscrowStatusRow, ProvenanceSummary, SourceReview, SourceReviewStage } from '@/lib/api/types';
import { ChamberNav, ChamberTabs, Chip, CopyValue, ErrorLine, Loading, Panel, PoweredBy, fmtDate, fmtDateTime, useActor, useCenterTitle, useLink } from './ui';

export const ESCROW_TONE: Record<EscrowStatusRow['state'], string> = { verified: '#9be7c4', deposited: '#a9c7e8', pending: '#f4d58d', overdue: '#f1938f' };
export const ESCROW_TEXT: Record<EscrowStatusRow['state'], string> = { verified: 'In escrow · verified', deposited: 'In escrow', pending: 'Deposit pending', overdue: 'Deposit overdue' };
export const REVIEW_TEXT: Record<SourceReviewStage, string> = { requested: 'Requested', scoping: 'Scoping', approved: 'Approved', 'in-progress': 'In progress', completed: 'Completed', declined: 'Declined', withdrawn: 'Withdrawn' };
export const REVIEW_TONE: Record<SourceReviewStage, string> = { requested: '#f4d58d', scoping: '#f4d58d', approved: '#a9c7e8', 'in-progress': '#a9c7e8', completed: '#9be7c4', declined: '#f1938f', withdrawn: '#a5abb5' };
const KIND_TEXT: Record<SourceReview['auditorKind'], string> = { 'national-cert': 'National CERT / CSIRT', 'independent-firm': 'Independent security firm', academic: 'University or research institute', 'government-team': 'Government engineering team' };

/** Provenance for each artifact of one release (shown on the release page). */
export function ProvenancePanel({ releaseId, link }: { releaseId: string; link?: string }) {
  const [d, setD] = React.useState<{ provenance: ProvenanceSummary[]; channelKey: string } | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState<string | null>(null);
  React.useEffect(() => { api.updates.provenance(releaseId, link).then(setD).catch(e => setErr(e instanceof Error ? e.message : 'Could not load provenance')); }, [releaseId, link]);
  if (!d) return <div className="min-h-[160px]"><ErrorLine>{err}</ErrorLine></div>;
  const first = d.provenance[0];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {first ? (
        <p className="max-w-[72ch] text-[13.5px] font-light leading-relaxed text-white/60">
          Every artifact was built by <span className="font-mono text-[12px] text-[#f4e4bd]">{first.builder.id}</span> from tag <span className="font-mono text-[12px] text-[#f4e4bd]">{first.source.tag}</span> (commit <span className="font-mono text-[12px] text-[#f4e4bd]">{first.source.commit.slice(0, 12)}</span>). Each has an SLSA v1 provenance attestation you can download and verify independently. <span className="text-white/40">{first.slsaLevel}.</span>
        </p>
      ) : null}
      {d.provenance.map(p => (
        <Panel key={p.artifactId} className="min-w-0 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="min-w-0 flex-1 text-[13.5px] font-light text-[#f3efe6]">{p.label}</span>
            <a href={api.updates.attestationUrl(d.channelKey, p.artifactId)} download className="font-mono text-[10.5px] underline underline-offset-4" style={{ color: CHAMPAGNE }}>Attestation ↓</a>
            <button type="button" onClick={() => setOpen(o => (o === p.artifactId ? null : p.artifactId))} aria-expanded={open === p.artifactId} className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45 hover:text-[#f4e4bd]">{open === p.artifactId ? 'Hide' : 'Details'}</button>
          </div>
          <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] text-white/45">
            <span className="min-w-0 truncate">{p.subject.name}</span>
            <span>built {fmtDateTime(p.finishedOn)}</span>
          </p>
          {open === p.artifactId ? (
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2 text-[12.5px] font-light text-white/65">
              <div className="grid grid-cols-[minmax(0,1fr)] gap-1 sm:grid-cols-[140px_minmax(0,1fr)]"><span className="text-white/40">Digest (sha256)</span><CopyValue value={p.subject.digest.sha256} short label="digest" /></div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-1 sm:grid-cols-[140px_minmax(0,1fr)]"><span className="text-white/40">Builder</span><span className="min-w-0 break-all font-mono text-[11.5px]">{p.builder.id} ({p.builder.version})</span></div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-1 sm:grid-cols-[140px_minmax(0,1fr)]"><span className="text-white/40">Source</span><span className="min-w-0 break-all font-mono text-[11.5px]">{p.source.uri}@{p.source.tag}</span></div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-1 sm:grid-cols-[140px_minmax(0,1fr)]"><span className="text-white/40">Commit</span><CopyValue value={p.source.commit} short label="commit" /></div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-1 sm:grid-cols-[140px_minmax(0,1fr)]"><span className="text-white/40">Build time</span><span className="font-mono text-[11.5px]">{fmtDateTime(p.startedOn)} → {fmtDateTime(p.finishedOn)}</span></div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-1 sm:grid-cols-[140px_minmax(0,1fr)]"><span className="text-white/40">Materials</span>
                <ul className="grid min-w-0 gap-0.5">{p.materials.map(m => <li key={m.uri} className="min-w-0 break-all font-mono text-[11px] text-white/55">{m.uri} <span className="text-white/35">{Object.entries(m.digest).map(([k, v]) => `${k}:${v.slice(0, 12)}…`).join(' ')}</span></li>)}</ul>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-1 sm:grid-cols-[140px_minmax(0,1fr)]"><span className="text-white/40">Verify</span>
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1">{p.verify.map(c => <CopyValue key={c} value={c} label="command" />)}</div>
              </div>
            </div>
          ) : null}
        </Panel>
      ))}
    </div>
  );
}

type EscrowData = Awaited<ReturnType<typeof api.updates.escrow>>;

export function AssuranceCenter() {
  const { link, q } = useLink();
  const [d, setD] = React.useState<EscrowData | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [nationName, setNationName] = React.useState<string | undefined>();
  const load = React.useCallback(() => {
    api.updates.escrow(link).then(setD).catch(e => setErr(e instanceof Error ? e.message : 'Could not reach the update service'));
  }, [link]);
  React.useEffect(load, [load]);
  React.useEffect(() => { api.updates.chamber(link).then(r => setNationName(r.chamber.nation.name)).catch(() => undefined); }, [link]);
  const { nation } = useCenterTitle(nationName, true);
  const installed = d?.status.find(r => r.installed);

  return (
    <OnboardingFrame right={<ChamberNav q={q} active="assurance" />}>
      <div className="flex-1 py-10 lg:py-14">
        <ChamberTabs q={q} active="assurance" />
        <Eyebrow>Update Center · supply chain and escrow</Eyebrow>
        <h1 className="mt-4 text-[2.1rem] font-extralight leading-[1.05] tracking-[-0.035em] text-[#f3efe6] sm:text-[3rem]">
          Proof of what {nation ? <span className="bg-clip-text font-light text-transparent" style={{ backgroundImage: `linear-gradient(180deg, ${CHAMPAGNE_HI}, #b8955a)` }}>{nation}</span> : 'this installation'} runs
        </h1>
        <p className="mt-4 max-w-[70ch] text-[15px] font-light leading-relaxed text-white/55">
          Every release is built from a known commit by an isolated builder, with a provenance attestation for each artifact. Its source is deposited with an independent escrow agent, released to you if the publisher fails, and your own auditors can review it.
        </p>
        {err ? <div className="mt-8"><ErrorLine>{err}</ErrorLine></div> : !d ? <Loading label="Gathering proofs…" /> : (
          <>
            {installed ? (
              <div className="mt-8 flex flex-wrap items-center gap-3 rounded-[2px] border px-4 py-3" style={{ borderColor: `${ESCROW_TONE[installed.state]}55` }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: ESCROW_TONE[installed.state] }} />
                <span className="text-[14px] font-light text-[#f3efe6]">The version you run, {installed.version}, is {installed.state === 'verified' ? 'in escrow and verified by the agent' : installed.state === 'deposited' ? 'in escrow' : installed.state === 'pending' ? `awaiting deposit (due ${fmtDate(installed.dueBy)})` : 'overdue for deposit'}.</span>
                {installed.deposit ? <span className="ml-auto font-mono text-[10.5px] text-white/45">{installed.deposit.id}</span> : null}
              </div>
            ) : null}
            <Section n="01" title="Escrow agreement" aside={d.agreement ? `${d.agreement.agreementRef} · placeholder terms` : undefined}>
              {d.agreement ? <Agreement a={d.agreement} /> : null}
            </Section>
            <Section n="02" title="Deposits by release" aside={`Deposited within ${d.agreement?.depositWithinDays ?? 30} days of release`}>
              <Deposits rows={d.status} q={q} />
            </Section>
            <Section n="03" title="Source-code audits" aside="Your auditors, under NDA">
              <Reviews d={d} link={link} onDone={load} />
            </Section>
            <Section n="04" title="Build provenance">
              <p className="max-w-[72ch] text-[13.5px] font-light leading-relaxed text-white/60">Each release page lists every artifact with its SLSA provenance: builder, source commit, build time, materials and digest, a downloadable attestation and the commands to verify it — <code className="font-mono text-[12px] text-[#f4e4bd]">cosign verify-attestation</code> for container images and charts, <code className="font-mono text-[12px] text-[#f4e4bd]">cosign verify-blob-attestation</code> or <code className="font-mono text-[12px] text-[#f4e4bd]">slsa-verifier</code> for files.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {d.status.slice(0, 4).map(r => <Link key={r.releaseId} href={`/updates/${r.releaseId}${q}#provenance`} className="text-[12.5px] underline underline-offset-4" style={{ color: CHAMPAGNE }}>{r.version} provenance →</Link>)}
              </div>
            </Section>
          </>
        )}
        <PoweredBy />
      </div>
    </OnboardingFrame>
  );
}

function Agreement({ a }: { a: NonNullable<EscrowData['agreement']> }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-2">
      <Panel className="px-4 py-4">
        <dl className="grid gap-2 text-[13px] font-light">
          {[['Escrow agent', a.agent], ['Agreement', a.agreementRef], ['In force since', fmtDate(a.effectiveFrom)], ['Covers', a.covers], ['Deposit deadline', `${a.depositWithinDays} days after each release`], ['Verification', a.verification]].map(([k, v]) => (
            <div key={k} className="grid gap-0.5 sm:grid-cols-[150px_minmax(0,1fr)]"><dt className="text-white/40">{k}</dt><dd className="text-white/75">{v}</dd></div>
          ))}
        </dl>
      </Panel>
      <div className="grid gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d9c398]/75">Release conditions</p>
          <ul className="mt-2 grid gap-2">{a.releaseConditions.map(c => (
            <li key={c.key} className="rounded-[2px] border px-3 py-2" style={{ borderColor: hair(0.12) }}><span className="text-[13.5px] text-[#f3efe6]">{c.label}</span><span className="block text-[12.5px] font-light text-white/55">{c.detail}</span></li>
          ))}</ul>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d9c398]/75">How to invoke</p>
          <ol className="mt-2 grid list-decimal gap-1 pl-5 text-[12.5px] font-light text-white/60">{a.invocation.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>
      </div>
    </div>
  );
}

function Deposits({ rows, q }: { rows: EscrowStatusRow[]; q: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-[12.5px] font-light">
        <thead><tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/65">
          <th className="py-2 pr-3 font-normal">Release</th><th className="py-2 pr-3 font-normal">Status</th><th className="py-2 pr-3 font-normal">Deposit</th><th className="py-2 pr-3 font-normal">Deposited</th><th className="py-2 pr-3 font-normal">Contents hash</th><th className="py-2 font-normal">Verified</th>
        </tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.releaseId} className="border-t align-middle" style={{ borderColor: hair(0.08) }}>
            <td className="py-2.5 pr-3"><Link href={`/updates/${r.releaseId}${q}`} className="font-mono text-[12px] text-[#f4e4bd] no-underline hover:underline">{r.version}</Link>{r.installed ? <span className="ml-2"><Chip tone={CHAMPAGNE}>Installed</Chip></span> : null}<span className="block text-[11.5px] text-white/45">{r.title}</span></td>
            <td className="py-2.5 pr-3"><Chip tone={ESCROW_TONE[r.state]} solid={r.state === 'overdue'}>{ESCROW_TEXT[r.state]}</Chip>{!r.deposit ? <span className="block font-mono text-[10px] text-white/40">due {fmtDate(r.dueBy)}</span> : null}</td>
            <td className="py-2.5 pr-3 font-mono text-[11px] text-white/60">{r.deposit?.id ?? '—'}</td>
            <td className="py-2.5 pr-3 font-mono text-[11px] text-white/60">{r.deposit ? fmtDate(r.deposit.depositedAt) : '—'}</td>
            <td className="py-2.5 pr-3">{r.deposit ? <CopyValue value={r.deposit.contentsHash} short label="contents hash" /> : <span className="text-white/35">—</span>}</td>
            <td className="py-2.5 font-mono text-[11px] text-white/60">{r.deposit?.verifiedAt ? fmtDate(r.deposit.verifiedAt) : '—'}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function Reviews({ d, link, onDone }: { d: EscrowData; link?: string; onDone: () => void }) {
  const [actor, setActor] = useActor();
  const [f, setF] = React.useState({ releaseId: d.status.find(r => r.installed)?.releaseId ?? d.status[0]?.releaseId ?? '', auditor: '', auditorKind: 'national-cert', scope: '', purpose: '', environment: 'escrow-agent', ndaAccepted: false });
  const [err, setErr] = React.useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    try { await api.updates.escrowAction({ action: 'request-review', by: actor, ...f, link }); setF(x => ({ ...x, auditor: '', scope: '', purpose: '', ndaAccepted: false })); onDone(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Could not send the request'); }
  }
  async function withdraw(id: string) {
    setErr(null);
    if (!actor.trim()) { setErr('Enter your name in the form first.'); return; }
    try { await api.updates.escrowAction({ action: 'withdraw-review', id, by: actor, link }); onDone(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Could not withdraw'); }
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {d.reviews.map(r => (
        <Panel key={r.id} className="min-w-0 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-mono text-[11px] text-white/45">{r.id}</span>
            <span className="min-w-0 flex-1 text-[14px] font-light text-[#f3efe6]">{r.auditor} · {r.version}</span>
            <Chip tone={REVIEW_TONE[r.stage]} solid={r.stage === 'completed'}>{REVIEW_TEXT[r.stage]}</Chip>
          </div>
          <p className="mt-1 text-[12.5px] font-light text-white/60">{r.scope}</p>
          <p className="mt-1 font-mono text-[10.5px] text-white/40">{KIND_TEXT[r.auditorKind]} · {d.environments[r.environment]} · requested {fmtDate(r.requestedAt)} by {r.requestedBy}{r.schedule ? ` · ${fmtDate(r.schedule.start)} – ${fmtDate(r.schedule.end)}` : ''}</p>
          {r.findings ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] font-light text-white/65">
              <Chip tone="#f1938f">{r.findings.critical} critical</Chip><Chip tone="#f1b36b">{r.findings.high} high</Chip><Chip tone="#f4d58d">{r.findings.medium} medium</Chip><Chip tone="#a5abb5">{r.findings.low} low</Chip>
              <span className="min-w-0 flex-1">{r.findings.summary}</span><span className="font-mono text-[10.5px] text-white/40">{r.findings.reportRef}</span>
            </div>
          ) : null}
          {r.history.length > 1 ? <p className="mt-1 text-[11.5px] text-white/40">Last step: {r.history[r.history.length - 1]!.by}, {fmtDateTime(r.history[r.history.length - 1]!.at)}{r.history[r.history.length - 1]!.note ? ` — ${r.history[r.history.length - 1]!.note}` : ''}</p> : null}
          {['requested', 'scoping', 'approved'].includes(r.stage) ? <button type="button" className="mt-2 text-[12px] text-white/45 hover:text-[#f1938f]" onClick={() => withdraw(r.id)}>Withdraw request</button> : null}
        </Panel>
      ))}
      {!d.reviews.length ? <p className="text-[13px] font-light text-white/50">No source-code audits requested yet.</p> : null}
      <form onSubmit={submit} className="grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[2px] border p-4 sm:grid-cols-2" style={{ borderColor: hair(0.14) }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d9c398]/75 sm:col-span-2">Request a source-code audit</p>
        <Field label="Your name"><input className={inputCls} value={actor} onChange={e => setActor(e.target.value)} placeholder="e.g. Chief Information Security Officer" /></Field>
        <Field label="Release"><Select value={f.releaseId} onChange={e => setF({ ...f, releaseId: e.target.value })}>{d.status.map(r => <option key={r.releaseId} value={r.releaseId}>{r.version} — {r.title}</option>)}</Select></Field>
        <Field label="Auditor"><input className={inputCls} value={f.auditor} onChange={e => setF({ ...f, auditor: e.target.value })} placeholder="Organisation carrying out the review" /></Field>
        <Field label="Kind of auditor"><Select value={f.auditorKind} onChange={e => setF({ ...f, auditorKind: e.target.value })}>{Object.entries(KIND_TEXT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Where"><Select value={f.environment} onChange={e => setF({ ...f, environment: e.target.value })}>{Object.entries(d.environments).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Purpose"><input className={inputCls} value={f.purpose} onChange={e => setF({ ...f, purpose: e.target.value })} placeholder="e.g. assurance before national rollout" /></Field>
        <div className="sm:col-span-2"><Field label="Scope" hint="Services, modules or concerns to review."><textarea className={`${inputCls} min-h-[72px]`} value={f.scope} onChange={e => setF({ ...f, scope: e.target.value })} /></Field></div>
        <label className="flex items-start gap-2 text-[12.5px] font-light text-white/65 sm:col-span-2">
          <input type="checkbox" className="mt-1" checked={f.ndaAccepted} onChange={e => setF({ ...f, ndaAccepted: e.target.checked })} />
          The auditor accepts the confidentiality terms: findings go to the nation and the publisher; vulnerabilities are disclosed through the advisory process.
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" className={`${goldBtn} px-5 py-2.5 text-[13px]`} style={goldStyle}>Send request</button>
          <ErrorLine>{err}</ErrorLine>
        </div>
      </form>
    </div>
  );
}

// ── Publisher console ─────────────────────────────────────────────────
export function PublisherEscrow() {
  const [actor] = useActor();
  const [d, setD] = React.useState<Awaited<ReturnType<typeof api.updates.publisher.escrow>> | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const load = React.useCallback(() => { api.updates.publisher.escrow().then(setD).catch(e => setErr(e instanceof Error ? e.message : 'Could not load')); }, []);
  React.useEffect(load, [load]);
  const [form, setForm] = React.useState<Record<string, { note: string; start: string; end: string; summary: string; critical: string; high: string; medium: string; low: string; reportRef: string }>>({});
  if (!d) return <div className="min-h-[200px]"><ErrorLine>{err}</ErrorLine></div>;
  const fv = (id: string) => form[id] ?? { note: '', start: '', end: '', summary: '', critical: '0', high: '0', medium: '0', low: '0', reportRef: '' };
  const setFv = (id: string, k: string, v: string) => setForm(s => ({ ...s, [id]: { ...fv(id), [k]: v } }));
  async function act(body: Record<string, unknown>) {
    setErr(null);
    if (!actor.trim()) { setErr('Enter your name above first.'); return; }
    try { await api.updates.publisher.escrowAction({ ...body, by: actor } as never); load(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'Action failed'); }
  }
  const review = (r: SourceReview, step: string) => {
    const v = fv(r.id);
    return act({ action: 'review', id: r.id, review: step, note: v.note || undefined,
      start: v.start ? new Date(v.start).toISOString() : undefined, end: v.end ? new Date(v.end).toISOString() : undefined,
      findings: step === 'complete' ? { summary: v.summary, critical: Number(v.critical), high: Number(v.high), medium: Number(v.medium), low: Number(v.low), reportRef: v.reportRef } : undefined });
  };
  const late = d.deposits.filter(x => x.state === 'overdue').length;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <p className="flex flex-wrap gap-2">
        <Chip tone="#9be7c4">{d.deposits.filter(x => x.state === 'verified').length} verified</Chip>
        <Chip tone="#a9c7e8">{d.deposits.filter(x => x.state === 'deposited').length} deposited</Chip>
        <Chip tone="#f4d58d">{d.deposits.filter(x => x.state === 'pending').length} pending</Chip>
        <Chip tone="#f1938f" solid={late > 0}>{late} overdue</Chip>
        <span className="text-[12px] font-light text-white/45">{d.agent} · within {d.depositWithinDays} days</span>
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[12.5px] font-light">
          <thead><tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/65"><th className="py-2 pr-3 font-normal">Release</th><th className="py-2 pr-3 font-normal">For</th><th className="py-2 pr-3 font-normal">Status</th><th className="py-2 pr-3 font-normal">Deposit</th><th className="py-2 font-normal" /></tr></thead>
          <tbody>{d.deposits.map(r => (
            <tr key={r.releaseId} className="border-t" style={{ borderColor: hair(0.08) }}>
              <td className="py-2 pr-3 font-mono text-[12px] text-[#f4e4bd]">{r.version}<span className="ml-2 text-white/40">{r.releaseId}</span></td>
              <td className="py-2 pr-3 text-white/60">{r.nationId ? d.nations[r.nationId] ?? r.nationId : 'All nations'}</td>
              <td className="py-2 pr-3"><Chip tone={ESCROW_TONE[r.state]} solid={r.state === 'overdue'}>{ESCROW_TEXT[r.state]}</Chip></td>
              <td className="py-2 pr-3 font-mono text-[11px] text-white/55">{r.deposit ? `${r.deposit.id} · ${fmtDate(r.deposit.depositedAt)}` : `due ${fmtDate(r.dueBy)}`}</td>
              <td className="py-2 text-right">
                {!r.deposit ? <button type="button" className={`${ghostBtn} py-1.5 text-[12px]`} onClick={() => act({ action: 'deposit', releaseId: r.releaseId })}>Record deposit</button>
                  : !r.deposit.verifiedAt ? <button type="button" className={`${ghostBtn} py-1.5 text-[12px]`} onClick={() => act({ action: 'verify', releaseId: r.releaseId })}>Agent verified</button> : null}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d9c398]/75">Source-code audit requests</p>
      {d.reviews.map(r => {
        const v = fv(r.id);
        return (
          <Panel key={r.id} className="min-w-0 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="font-mono text-[11px] text-white/45">{r.id}</span>
              <span className="text-[12px] text-[#d9c398]/80">{d.nations[r.nationId] ?? r.nationId}</span>
              <span className="min-w-0 flex-1 text-[14px] font-light text-[#f3efe6]">{r.auditor} · {r.version}</span>
              <Chip tone={REVIEW_TONE[r.stage]}>{REVIEW_TEXT[r.stage]}</Chip>
            </div>
            <p className="mt-1 text-[12.5px] font-light text-white/60">{r.scope}</p>
            {['requested', 'scoping', 'approved', 'in-progress'].includes(r.stage) ? (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <input aria-label="Note" className={`${inputCls} min-w-[200px] flex-1 py-2 text-[13px]`} value={v.note} onChange={e => setFv(r.id, 'note', e.target.value)} placeholder="Note (the reason, to decline)" />
                {r.stage === 'requested' ? <button type="button" className={`${ghostBtn} py-2 text-[12.5px]`} onClick={() => review(r, 'scope')}>Start scoping</button> : null}
                {r.stage === 'scoping' ? (
                  <>
                    <input aria-label="Start" type="date" className={`${inputCls} w-auto py-2 text-[13px]`} value={v.start} onChange={e => setFv(r.id, 'start', e.target.value)} />
                    <input aria-label="End" type="date" className={`${inputCls} w-auto py-2 text-[13px]`} value={v.end} onChange={e => setFv(r.id, 'end', e.target.value)} />
                    <button type="button" className={`${goldBtn} px-4 py-2 text-[12.5px]`} style={goldStyle} onClick={() => review(r, 'approve')}>Approve</button>
                  </>
                ) : null}
                {r.stage === 'requested' || r.stage === 'scoping' ? <button type="button" className="px-2 text-[12px] text-white/45 hover:text-[#f1938f]" onClick={() => review(r, 'decline')}>Decline</button> : null}
                {r.stage === 'approved' ? <button type="button" className={`${ghostBtn} py-2 text-[12.5px]`} onClick={() => review(r, 'start')}>Review started</button> : null}
              </div>
            ) : null}
            {r.stage === 'in-progress' ? (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <input aria-label="Findings summary" className={`${inputCls} min-w-[200px] flex-1 py-2 text-[13px]`} value={v.summary} onChange={e => setFv(r.id, 'summary', e.target.value)} placeholder="Findings summary" />
                {(['critical', 'high', 'medium', 'low'] as const).map(k => <input key={k} aria-label={k} type="number" min={0} className={`${inputCls} w-[72px] py-2 text-[13px]`} value={v[k]} onChange={e => setFv(r.id, k, e.target.value)} title={k} />)}
                <input aria-label="Report reference" className={`${inputCls} w-[160px] py-2 text-[13px]`} value={v.reportRef} onChange={e => setFv(r.id, 'reportRef', e.target.value)} placeholder="Report ref" />
                <button type="button" className={`${goldBtn} px-4 py-2 text-[12.5px]`} style={goldStyle} onClick={() => review(r, 'complete')}>Record findings</button>
              </div>
            ) : null}
            {r.findings ? <p className="mt-2 text-[12px] text-white/55">{r.findings.critical}C · {r.findings.high}H · {r.findings.medium}M · {r.findings.low}L — {r.findings.summary}</p> : null}
          </Panel>
        );
      })}
      <ErrorLine>{err}</ErrorLine>
    </div>
  );
}
