'use client';

// The readable form of a release's compliance evidence pack for this nation.
// The same pack downloads as JSON (manifest with a digest).

import * as React from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { OnboardingFrame, Eyebrow, Section, hair, CHAMPAGNE, CHAMPAGNE_HI } from '@/components/features/onboarding/Chrome';
import { ChamberNav, ChamberTabs, Chip, CopyValue, ErrorLine, Loading, Panel, PoweredBy, fmtDate, fmtDateTime, useCenterTitle, useLink } from './ui';
import { NSTATUS_TEXT, NSTATUS_TONE, SEV_TONE } from './AdvisoriesPanel';
import { ESCROW_TEXT, ESCROW_TONE } from './Assurance';
import type { AdvisoryNationStatus, AdvisorySeverity, EscrowStatusRow } from '@/lib/api/types';

export interface Pack {
  manifest: string; generatedAt: string; digest: string;
  nation: { id: string; name: string; deliveryMode: string };
  release: { id: string; version: string; title: string; channel: string; severity: string; releasedAt: string };
  certifications: { standard: string; kind: string; scope: string; reference: string; issuer: string; validUntil?: string; period?: string }[];
  dpia: { title: string; owner: string; sections: { heading: string; prompt: string }[] };
  securityTesting: { sast: Record<string, number | string>; dast: Record<string, number | string>; dependencies: { tool: string; components: number; knownVulnerable: number }; penetrationTest: { by: string; scope: string; result: string }; releaseGate: string };
  sbom: { format: string; filename: string; sha256: string; artifactId: string }[];
  provenance: { artifact: string; digest: string; builder: string; commit: string; finishedOn: string }[];
  escrow: { state: EscrowStatusRow['state']; depositId?: string; depositedAt?: string; contentsHash?: string; verifiedAt?: string; dueBy: string } | null;
  advisories: { id: string; severity: AdvisorySeverity; cvss: number; title: string; status: AdvisoryNationStatus; justification?: string }[];
  install: {
    state: string; decisions: { at: string; by: string; action: string; from: string; to: string; note?: string; auditSeq?: number }[];
    preflight: { at: string; by: string; compatible: number; needsChange: number; blocking: number; waived: number; approvable: boolean } | null;
    restorePoint: { id: string; version: string; createdAt: string; verified: boolean } | null;
    probation: { state: string; startedAt: string; endsAt: string; reports: number; failedChecks: string[] } | null;
    incidents: { id: string; trigger: string; state: string; from: string; to: string; openedAt: string }[];
    supportTickets: { id: string; priority: string; state: string; response: string; resolution: string }[];
  };
  auditChain: { entries: { seq: number; at: string; actor: string; action: string; resource: string; outcome: string; detail?: string; hash: string }[]; chainIntact: boolean; checked: number };
}

const th = 'py-2 pr-3 font-normal';
const Head = ({ cols }: { cols: string[] }) => <thead><tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#d9c398]/65">{cols.map(c => <th key={c} className={th}>{c}</th>)}</tr></thead>;

export function EvidencePage({ id }: { id: string }) {
  const { link, q } = useLink();
  const [p, setP] = React.useState<Pack | null>(null);
  const [channelKey, setChannelKey] = React.useState<string>('');
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => {
    api.updates.evidence(id, link).then(r => setP(r.pack as unknown as Pack)).catch(e => setErr(e instanceof Error ? e.message : 'Could not build the evidence pack'));
    api.updates.release(id, link).then(r => setChannelKey(r.chamber.nation.channelKey)).catch(() => undefined);
  }, [id, link]);
  const { nation } = useCenterTitle(p?.nation.name, true);
  const dl = `/api/releases/${encodeURIComponent(id)}/evidence?download=1${link ? `&link=${encodeURIComponent(link)}` : ''}`;
  return (
    <OnboardingFrame right={<ChamberNav q={q} active="release" />}>
      <div className="flex-1 py-10 lg:py-14">
        <ChamberTabs q={q} active="release" />
        <Link href={`/updates/${id}${q}`} className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-white/45 no-underline transition-colors hover:text-[#f4e4bd]">← Release</Link>
        {err ? <div className="mt-6"><ErrorLine>{err}</ErrorLine></div> : !p ? <Loading label="Assembling evidence…" /> : (
          <>
            <div className="mt-6"><Eyebrow>Compliance evidence pack</Eyebrow></div>
            <h1 className="mt-4 text-[2.1rem] font-extralight leading-[1.05] tracking-[-0.035em] text-[#f3efe6] sm:text-[3rem]">
              {p.release.version} <span className="bg-clip-text font-light text-transparent" style={{ backgroundImage: `linear-gradient(180deg, ${CHAMPAGNE_HI}, #b8955a)` }}>for {nation || p.nation.name}</span>
            </h1>
            <p className="mt-3 max-w-[72ch] text-[14.5px] font-light leading-relaxed text-white/55">{p.release.title}. Generated from the platform’s own records on {fmtDateTime(p.generatedAt)} — nothing in it is typed in by hand. Hand it to your auditors with the JSON manifest; its digest lets them check nothing was changed.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[2px] border px-4 py-3" style={{ borderColor: hair(0.18) }}>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#d9c398]/70">Manifest digest (sha256)</span>
              <CopyValue value={p.digest} short label="digest" />
              <a href={dl} download className="ml-auto text-[13px] underline underline-offset-4" style={{ color: CHAMPAGNE }}>Download JSON manifest ↓</a>
            </div>

            <Section n="01" title="Certifications and reports" aside="References — placeholders until issued">
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                {p.certifications.map(c => (
                  <Panel key={c.standard} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2"><span className="text-[15px] font-light text-[#f3efe6]">{c.standard}</span><Chip tone="#a5abb5">Placeholder</Chip></div>
                    <p className="mt-1 text-[12.5px] font-light text-white/55">{c.scope}</p>
                    <p className="mt-2 font-mono text-[10.5px] text-white/45">{c.reference} · {c.issuer} · {c.validUntil ? `valid until ${fmtDate(c.validUntil)}` : c.period}</p>
                  </Panel>
                ))}
              </div>
            </Section>

            <Section n="02" title="Security testing" aside="Release gate: no unresolved critical or high finding">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[12.5px] font-light">
                  <Head cols={['Test', 'Critical', 'High', 'Medium', 'Low']} />
                  <tbody>
                    {[['Static analysis', p.securityTesting.sast], ['Dynamic scan (staging)', p.securityTesting.dast]].map(([l, t]) => { const r = t as Record<string, number | string>; return (
                      <tr key={l as string} className="border-t" style={{ borderColor: hair(0.08) }}><td className="py-2 pr-3 text-white/70">{l as string}</td>{(['critical', 'high', 'medium', 'low'] as const).map(k => <td key={k} className="py-2 pr-3 font-mono text-[12px] text-white/65">{r[k]}</td>)}</tr>
                    ); })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[12.5px] font-light text-white/60">Dependencies: {p.securityTesting.dependencies.components} components checked against advisories, {p.securityTesting.dependencies.knownVulnerable} known-vulnerable fixed before release. Penetration test: {p.securityTesting.penetrationTest.scope} — {p.securityTesting.penetrationTest.result} ({p.securityTesting.penetrationTest.by}).</p>
            </Section>

            <Section n="03" title="Software bill of materials and provenance">
              <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
                {p.sbom.map(s => (
                  <div key={s.filename} className="flex min-w-0 flex-wrap items-center gap-3 text-[12.5px] font-light text-white/65">
                    <Chip tone="#a9c7e8">{s.format}</Chip><span className="min-w-0 truncate font-mono text-[11.5px]">{s.filename}</span><CopyValue value={s.sha256} short label="SBOM checksum" />
                    {channelKey ? <a href={api.updates.downloadUrl(channelKey, s.artifactId)} download className="text-[12px] underline underline-offset-4" style={{ color: CHAMPAGNE }}>Download ↓</a> : null}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[12.5px] font-light text-white/55">{p.provenance.length} artifacts with SLSA provenance, built by <span className="font-mono text-[11.5px]">{p.provenance[0]?.builder}</span> from commit <span className="font-mono text-[11.5px]">{p.provenance[0]?.commit.slice(0, 12)}</span>. <Link href={`/updates/${id}${q}#provenance`} className="underline underline-offset-4" style={{ color: CHAMPAGNE }}>Attestations →</Link></p>
              {p.escrow ? <p className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] font-light text-white/60">Source-code escrow: <Chip tone={ESCROW_TONE[p.escrow.state]}>{ESCROW_TEXT[p.escrow.state]}</Chip>{p.escrow.depositId ? <span className="font-mono text-[11px]">{p.escrow.depositId} · {fmtDate(p.escrow.depositedAt)}</span> : <span>due {fmtDate(p.escrow.dueBy)}</span>}</p> : null}
            </Section>

            <Section n="04" title="Security advisories for this version">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[12.5px] font-light">
                  <Head cols={['Advisory', 'Severity', 'Status for this version']} />
                  <tbody>{p.advisories.map(a => (
                    <tr key={a.id} className="border-t" style={{ borderColor: hair(0.08) }}>
                      <td className="py-2 pr-3"><span className="font-mono text-[11px] text-[#f4e4bd]">{a.id}</span> <span className="text-white/60">{a.title}</span></td>
                      <td className="py-2 pr-3"><Chip tone={SEV_TONE[a.severity]}>{a.severity} {a.cvss.toFixed(1)}</Chip></td>
                      <td className="py-2 pr-3"><Chip tone={NSTATUS_TONE[a.status]}>{NSTATUS_TEXT[a.status]}</Chip></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Section>

            <Section n="05" title="Your install record" aside={`State: ${p.install.state}`}>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-2 text-[12.5px] font-light text-white/60">
                {p.install.preflight ? <p>Preflight {fmtDateTime(p.install.preflight.at)} by {p.install.preflight.by}: {p.install.preflight.compatible} compatible, {p.install.preflight.needsChange} need change, {p.install.preflight.blocking} blocking ({p.install.preflight.waived} waived).</p> : null}
                {p.install.restorePoint ? <p>Restore point {p.install.restorePoint.id} of {p.install.restorePoint.version}, {fmtDateTime(p.install.restorePoint.createdAt)}{p.install.restorePoint.verified ? ', verified' : ''}.</p> : null}
                {p.install.probation ? <p>Probation {p.install.probation.state}: {fmtDateTime(p.install.probation.startedAt)} → {fmtDateTime(p.install.probation.endsAt)}, {p.install.probation.reports} health reports{p.install.probation.failedChecks.length ? `, failed: ${p.install.probation.failedChecks.join(', ')}` : ''}.</p> : null}
                {p.install.incidents.map(i => <p key={i.id}>Incident {i.id}: {i.trigger} fallback {i.from} → {i.to}, {i.state}, {fmtDateTime(i.openedAt)}.</p>)}
                {p.install.supportTickets.map(t => <p key={t.id}>Ticket {t.id} ({t.priority}): {t.state}; response {t.response}, resolution {t.resolution}.</p>)}
              </div>
              <ol className="mt-4 grid gap-1.5">
                {p.install.decisions.map((e, i) => (
                  <li key={i} className="grid grid-cols-[minmax(0,1fr)] gap-x-3 text-[12.5px] font-light text-white/70 sm:grid-cols-[170px_minmax(0,1fr)]">
                    <span className="font-mono text-[10.5px] text-white/40">{fmtDateTime(e.at)}</span>
                    <span><span className="text-[#f4e4bd]">{e.action}</span> by {e.by} ({e.from} → {e.to}){e.note ? ` — ${e.note}` : ''}{e.auditSeq ? <span className="font-mono text-[10px] text-white/35"> audit #{e.auditSeq}</span> : null}</span>
                  </li>
                ))}
                {!p.install.decisions.length ? <li className="text-[12.5px] text-white/45">No decisions recorded for this release yet.</li> : null}
              </ol>
            </Section>

            <Section n="06" title="Audit-chain export" aside={p.auditChain.chainIntact ? `Chain intact · ${p.auditChain.checked} entries verified` : 'Chain verification FAILED'}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-[12px] font-light">
                  <Head cols={['#', 'When', 'Who', 'Action', 'Detail', 'Hash']} />
                  <tbody>{p.auditChain.entries.map(e => (
                    <tr key={e.seq} className="border-t align-top" style={{ borderColor: hair(0.08) }}>
                      <td className="py-2 pr-3 font-mono text-[11px] text-white/45">{e.seq}</td>
                      <td className="py-2 pr-3 font-mono text-[11px] text-white/55">{fmtDateTime(e.at)}</td>
                      <td className="py-2 pr-3 text-white/70">{e.actor}</td>
                      <td className="py-2 pr-3 font-mono text-[11px] text-[#f4e4bd]">{e.action}</td>
                      <td className="py-2 pr-3 text-white/55">{e.detail}</td>
                      <td className="py-2 font-mono text-[10.5px] text-white/40">{e.hash.slice(0, 12)}…</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {!p.auditChain.entries.length ? <p className="mt-2 text-[12.5px] text-white/45">No audit entries for this release yet.</p> : null}
            </Section>

            <Section n="07" title="Data protection impact assessment" aside="Template for your data protection officer">
              <ol className="grid list-decimal gap-2 pl-5 text-[13px] font-light text-white/65">
                {p.dpia.sections.map(s => <li key={s.heading}><span className="text-[#f3efe6]">{s.heading}.</span> {s.prompt}</li>)}
              </ol>
            </Section>
          </>
        )}
        <PoweredBy />
      </div>
    </OnboardingFrame>
  );
}
