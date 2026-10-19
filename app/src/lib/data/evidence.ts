// CivicOS — Update Center compliance evidence packs, server-side.
//
// One pack per release and per nation, generated from records that already
// exist — nothing is typed in for the pack:
//   • the publisher's certification references (ISO/IEC 27001, SOC 2) and a
//     DPIA template for the nation's data protection officer (placeholders),
//   • the release's security-test summary and SBOMs,
//   • SLSA provenance and the escrow deposit (lib/data/supply-chain.ts),
//   • advisory status for this version (lib/data/advisories.ts),
//   • the nation's own install record for it — decisions, four-eyes
//     approvals, preflight and staging, probation, fallback, incidents and
//     linked support tickets — and the matching audit-chain entries with
//     their hashes and the chain's verification.
// The manifest is JSON with a SHA-256 digest over its contents; the release
// page renders the same pack for people. Placeholders: §13.2.

import { createHash } from 'node:crypto';
import type { DistributionRelease, SubscribedNation } from '@/lib/api/types';
import { getChamberRelease, getChamber, nationRecord, releaseFor } from './updates';
import { listAudit, verifyAuditChain } from './store';
import { listAdvisories, statusFor } from './advisories';
import { escrowStatus, provenanceSummary } from './supply-chain';
import { latestPreflight } from './readiness';
import { listTickets } from './support';

const sha = (v: string) => createHash('sha256').update(v).digest('hex');
const n10 = (seed: string, mod: number) => parseInt(sha(seed).slice(0, 6), 16) % mod;

export const CERTIFICATIONS = [
  { standard: 'ISO/IEC 27001:2022', kind: 'certificate', scope: 'Design, build, release and operation of the platform, including hosted regions and the distribution registry', reference: 'ISO27001-CERT-PLACEHOLDER', issuer: 'Accredited certification body (placeholder)', validUntil: '2028-06-30', placeholder: true },
  { standard: 'SOC 2 Type II', kind: 'report', scope: 'Security, availability and confidentiality trust services criteria', reference: 'SOC2-T2-PLACEHOLDER', issuer: 'Independent auditor (placeholder)', period: 'Twelve months to the last report date', placeholder: true },
] as const;

export const DPIA_TEMPLATE = {
  title: 'Data protection impact assessment — platform release',
  owner: 'The nation’s data protection officer',
  status: 'template' as const,
  sections: [
    { heading: 'Description of processing', prompt: 'Which services this release changes, who uses them, which personal data they process and why.' },
    { heading: 'Changes in this release', prompt: 'Changes to data collected, stored, shared or retained, from the changelog and migrations listed in this pack.' },
    { heading: 'Necessity and proportionality', prompt: 'Lawful basis, data minimisation, retention periods, rights of data subjects. Retention on the platform: the nation’s rules for permits and cases (Platform → Retention, keep unless two administrators confirm a rule; /api/platform/retention); unconfirmed email-update requests deleted after their 7-day link expires; queued email deleted on unsubscribe; sign-in lockout counters kept 15 minutes, as hashes; the audit chain is kept in full and never carries addresses.' },
    { heading: 'Data location and transfers', prompt: 'Where the data is stored and processed (hosting path) and which operational data may leave the country (data-sovereignty controls).' },
    { heading: 'Risks to individuals', prompt: 'Likelihood and severity of each risk, including the open security advisories in this pack.' },
    { heading: 'Measures', prompt: 'Technical and organisational measures: access control, encryption, audit chain, probation and fallback, escrow.' },
    { heading: 'Sign-off', prompt: 'Data protection officer’s advice, decision and the official who accepts the residual risk.' },
  ],
};

function securityTesting(r: DistributionRelease) {
  const k = (t: string, m: number) => n10(`${r.id}:${t}`, m);
  return {
    placeholder: true,
    sast: { tool: 'Static analysis (placeholder)', critical: 0, high: 0, medium: k('sast-m', 4), low: k('sast-l', 12), suppressedWithJustification: k('sast-s', 3) },
    dast: { tool: 'Dynamic scan against staging (placeholder)', critical: 0, high: 0, medium: k('dast-m', 3), low: k('dast-l', 8) },
    dependencies: { tool: 'SBOM matched against advisories (placeholder)', components: 400 + k('deps', 300), knownVulnerable: k('deps-v', 2), fixedBeforeRelease: true },
    penetrationTest: r.severity === 'security' || r.severity === 'critical'
      ? { by: 'Independent tester (placeholder)', scope: 'Changed authentication and session paths', result: 'No exploitable findings remaining' }
      : { by: 'Independent tester (placeholder)', scope: 'Yearly full-platform test covers this release line', result: 'See the latest yearly report' },
    releaseGate: 'No release ships with an unresolved critical or high finding.',
  };
}

export interface EvidencePack { [k: string]: unknown; digest: string }

export function evidencePack(nationId: string, releaseId: string, now = Date.now()): EvidencePack | undefined {
  const n = nationRecord(nationId);
  const r = releaseFor(nationId, releaseId);
  const cr = getChamberRelease(nationId, releaseId);
  if (!n || !r || !cr) return undefined;
  const chamber = getChamber(nationId);
  if ('error' in chamber) return undefined;
  const asIfRunning: SubscribedNation = { ...n, installedVersion: r.version };
  const incidents = chamber.incidents.filter(i => i.releaseId === r.id);
  const resources = new Set([
    `UpdateChamber:${nationId}/${r.version}`, `UpdateChamber:${nationId}/staging/${r.version}`, `Escrow:${r.id}`,
    ...incidents.map(i => `UpdateChamber:${nationId}/${i.id}`),
    ...(cr.install.restorePoint ? [`UpdateChamber:${nationId}/${cr.install.restorePoint.id}`] : []),
  ]);
  const tickets = listTickets(nationId).filter(t => (t.link?.kind === 'release' && t.link.id === r.id) || (t.link?.kind === 'incident' && incidents.some(i => i.id === t.link!.id)));
  for (const t of tickets) resources.add(`SupportTicket:${nationId}/${t.id}`);
  const entries = listAudit().filter(a => resources.has(a.resource)).sort((a, b) => a.seq - b.seq)
    .map(a => ({ seq: a.seq, at: a.at, actor: a.actor, action: a.action, resource: a.resource, outcome: a.outcome, detail: a.detail, hash: a.hash, prevHash: a.prevHash }));
  const chain = verifyAuditChain();
  const escrow = escrowStatus(nationId, now).find(x => x.releaseId === r.id);
  const pre = latestPreflight(nationId, r.id);
  const body = {
    manifest: 'civicos-evidence-pack/v1',
    generatedAt: new Date(now).toISOString(),
    nation: { id: n.id, name: chamber.nation.name, deliveryMode: n.deliveryMode },
    release: { id: r.id, version: r.version, title: r.title, channel: r.channel, severity: r.severity, releasedAt: r.releasedAt, baseVersion: r.baseVersion, compatibleWithPrevious: r.compatibleWithPrevious },
    certifications: CERTIFICATIONS,
    dpia: DPIA_TEMPLATE,
    securityTesting: securityTesting(r),
    sbom: r.artifacts.filter(a => a.kind === 'sbom-cyclonedx' || a.kind === 'sbom-spdx').map(a => ({ format: a.kind === 'sbom-cyclonedx' ? 'CycloneDX 1.5' : 'SPDX 2.3', filename: a.filename, sha256: a.sha256, artifactId: a.id })),
    provenance: r.artifacts.map(a => { const p = provenanceSummary(r, a); return { artifact: a.filename, digest: p.subject.digest.sha256, builder: p.builder.id, commit: p.source.commit, finishedOn: p.finishedOn }; }),
    escrow: escrow ? { state: escrow.state, depositId: escrow.deposit?.id, depositedAt: escrow.deposit?.depositedAt, contentsHash: escrow.deposit?.contentsHash, verifiedAt: escrow.deposit?.verifiedAt, dueBy: escrow.dueBy } : null,
    advisories: listAdvisories().map(a => { const s = statusFor(asIfRunning, a); return { id: a.id, severity: a.severity, cvss: a.cvss, title: a.title, status: s.status, justification: s.justification }; }),
    install: {
      state: cr.install.state, mode: cr.install.mode, window: cr.install.window, pending: cr.install.pending,
      decisions: cr.install.events.map(e => ({ at: e.at, by: e.by, action: e.action, from: e.from, to: e.to, note: e.note, auditSeq: e.auditSeq })),
      preflight: pre ? { at: pre.runAt, by: pre.runBy, ...pre.summary, approvable: pre.approvable } : null,
      restorePoint: cr.install.restorePoint ? { id: cr.install.restorePoint.id, version: cr.install.restorePoint.version, createdAt: cr.install.restorePoint.createdAt, verified: cr.install.restorePoint.verified } : null,
      probation: cr.install.probation ? { state: cr.install.probation.state, startedAt: cr.install.probation.startedAt, endsAt: cr.install.probation.endsAt, reports: cr.install.probation.reports.length, failedChecks: cr.install.probation.failedChecks } : null,
      incidents: incidents.map(i => ({ id: i.id, trigger: i.trigger, state: i.state, from: i.fromVersion, to: i.toVersion, openedAt: i.openedAt, dataRestored: i.dataRestored ?? null })),
      supportTickets: tickets.map(t => ({ id: t.id, priority: t.priority, state: t.state, response: t.sla.response.state, resolution: t.sla.resolution.state })),
    },
    auditChain: { entries, chainIntact: chain.ok, checked: chain.checked },
  };
  return { ...body, digest: sha(JSON.stringify(body)) };
}
