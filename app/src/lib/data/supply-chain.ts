// CivicOS — Update Center supply-chain proof and source-code escrow, server-side.
//
// Provenance: every release artifact has an SLSA v1 provenance statement
// (in-toto Statement v1) naming its builder, source repository, tag and
// commit, build start and finish, and every build input pinned by digest.
// It is served as a DSSE envelope through the nation's own download link
// and can be checked with `cosign verify-attestation` (images) or
// `cosign verify-blob-attestation` / `slsa-verifier` (files).
//
// Escrow: each release (global, and every build made for one nation) is
// deposited with an independent escrow agent within the agreed number of
// days, with a hash of the deposit's contents. Each nation sees its escrow
// agreement — agent, release conditions (vendor insolvency, end of support,
// material breach) and how to invoke it — and the deposit status of every
// release it can see.
//
// Source-code audits: a nation can ask for its chosen auditor to review the
// source of a release, in the escrow agent's premises, a reading room or on
// an offline copy, under NDA. The publisher scopes, approves and schedules
// it; findings are recorded at the end. Every step names a person and is
// written to the audit chain.
//
// Builder, signing and escrow agent are placeholders
// (docs/INTEGRATION_REGISTER.md §12).

import { createHash } from 'node:crypto';
import type {
  DistributionRelease, EscrowAgreement, EscrowDeposit, EscrowStatusRow, ProvenanceSummary, ReleaseArtifact,
  SourceReview, SourceReviewEnvironment, SourceReviewStage,
} from '@/lib/api/types';
import { recordAudit } from './store';
import { PUBLISHER_KEY, allReleases, nationRecord, releaseFor, visibleTo } from './updates';

const DAY = 86_400_000;
const sha = (v: string) => createHash('sha256').update(v).digest('hex');
const iso = (t: number) => new Date(t).toISOString();
const ms = (s: string) => new Date(s).getTime();

export const SOURCE_REPO = 'https://source.civicos.example/civicos/platform';
export const BUILDER = { id: 'https://builder.civicos.example/isolated-runner/v1', version: '1.0.0-placeholder' };
export const BUILD_TYPE = 'https://civicos.example/build-types/release/v1';
export const ESCROW_AGENT = 'Escrow agent (placeholder)';
export const DEPOSIT_WITHIN_DAYS = 30;

// ── Provenance ───────────────────────────────────────────────────────
const tagOf = (r: DistributionRelease) => `v${r.version}`;
export const sourceCommit = (r: DistributionRelease) => sha(`${r.id}:${r.version}:commit`).slice(0, 40);

function subjectOf(a: ReleaseArtifact) {
  return { name: a.ref ? a.ref.split('@')[0]! : a.filename, digest: { sha256: a.sha256 } };
}

export function provenanceSummary(r: DistributionRelease, a: ReleaseArtifact): ProvenanceSummary {
  const finished = ms(r.releasedAt) - 6 * 3_600_000;
  const started = finished - (18 + (parseInt(a.sha256.slice(0, 2), 16) % 30)) * 60_000;
  const materials: ProvenanceSummary['materials'] = [
    { uri: `git+${SOURCE_REPO}@refs/tags/${tagOf(r)}`, digest: { gitCommit: sourceCommit(r) } },
    ...(r.baseVersion ? [{ uri: `git+${SOURCE_REPO}@refs/tags/v${r.baseVersion}`, digest: { gitCommit: sha(`${r.baseVersion}:base`).slice(0, 40) } }] : []),
    { uri: 'pkg:oci/distroless-base@sha256', digest: { sha256: sha(`${r.id}:base-image`) } },
    { uri: 'pkg:generic/toolchain-lockfile', digest: { sha256: sha(`${r.id}:lockfile`) } },
    { uri: 'pkg:generic/build-scripts', digest: { sha256: sha(`${r.id}:build-scripts`) } },
  ];
  const verify = a.ref
    ? [`cosign verify-attestation --key ${PUBLISHER_KEY.cosignKey} --type slsaprovenance1 ${a.ref}`]
    : [
      `cosign verify-blob-attestation --key ${PUBLISHER_KEY.cosignKey} --bundle ${a.filename}.intoto.jsonl --type slsaprovenance1 ${a.filename}`,
      `slsa-verifier verify-artifact ${a.filename} --provenance-path ${a.filename}.intoto.jsonl --source-uri ${SOURCE_REPO.replace(/^https:\/\//, '')} --source-tag ${tagOf(r)} --builder-id ${BUILDER.id}`,
    ];
  return {
    artifactId: a.id, filename: a.filename, kind: a.kind, label: a.label, subject: subjectOf(a), builder: BUILDER, buildType: BUILD_TYPE,
    source: { uri: SOURCE_REPO, tag: tagOf(r), commit: sourceCommit(r) },
    startedOn: iso(started), finishedOn: iso(finished), materials,
    slsaLevel: 'SLSA Build L3 (claimed; isolated builder and signing are placeholders)', verify,
  };
}

/** The in-toto Statement v1 with an SLSA v1 provenance predicate. */
export function provenanceStatement(r: DistributionRelease, a: ReleaseArtifact): Record<string, unknown> {
  const p = provenanceSummary(r, a);
  return {
    _type: 'https://in-toto.io/Statement/v1',
    subject: [p.subject],
    predicateType: 'https://slsa.dev/provenance/v1',
    predicate: {
      buildDefinition: {
        buildType: BUILD_TYPE,
        externalParameters: { source: { uri: `git+${SOURCE_REPO}@refs/tags/${p.source.tag}`, digest: { gitCommit: p.source.commit } }, version: r.version, artifact: { kind: a.kind, filename: a.filename, platform: a.platform } },
        internalParameters: { releaseId: r.id, channel: r.channel, reproducible: true },
        resolvedDependencies: p.materials,
      },
      runDetails: {
        builder: { id: BUILDER.id, version: { runner: BUILDER.version } },
        metadata: { invocationId: `${BUILDER.id}/runs/${sha(`${r.id}:${a.id}:run`).slice(0, 12)}`, startedOn: p.startedOn, finishedOn: p.finishedOn },
      },
    },
  };
}

/** DSSE envelope, as `cosign attest` writes it. The signature is a placeholder. */
export function provenanceEnvelope(r: DistributionRelease, a: ReleaseArtifact): Record<string, unknown> {
  const payload = JSON.stringify(provenanceStatement(r, a));
  return {
    placeholder: true,
    notice: 'Placeholder attestation: the statement is complete, but it is signed with a demonstration key. In production the isolated builder signs it with the publisher key.',
    payloadType: 'application/vnd.in-toto+json',
    payload: Buffer.from(payload).toString('base64'),
    signatures: [{ keyid: PUBLISHER_KEY.fingerprint.replace(/\s/g, ''), sig: Buffer.from(sha(`sig:${payload}`)).toString('base64') }],
  };
}

/** Provenance for every artifact of a release the nation can see. */
export function releaseProvenance(nationId: string, releaseId: string): ProvenanceSummary[] | undefined {
  const r = releaseFor(nationId, releaseId);
  return r ? r.artifacts.map(a => provenanceSummary(r, a)) : undefined;
}

/** The attestation behind a nation's download link (audited like the download). */
export function attestationFor(nationId: string, artifactId: string, by = 'download link'): { filename: string; envelope: Record<string, unknown> } | undefined {
  for (const r of allReleases()) {
    if (!visibleTo(r, nationId)) continue;
    const a = r.artifacts.find(x => x.id === artifactId);
    if (!a) continue;
    recordAudit(by, 'update.provenance.download', `UpdateChamber:${nationId}/${r.version}`, 'ok', `${a.filename}.intoto.jsonl`);
    return { filename: `${a.filename}.intoto.jsonl`, envelope: provenanceEnvelope(r, a) };
  }
  return undefined;
}

// ── Escrow ───────────────────────────────────────────────────────────
interface ScDb { deposits: Record<string, EscrowDeposit>; seeded: boolean; reviews: SourceReview[]; reviewSeq: number }
const g = globalThis as unknown as { __civicosSupply?: ScDb };
function sdb(): ScDb {
  const db = (g.__civicosSupply ??= { deposits: {}, seeded: false, reviews: [], reviewSeq: 101 });
  if (!db.seeded) { db.seeded = true; seed(db); }
  return db;
}
export function resetSupplyChain(): void { g.__civicosSupply = undefined; }

function depositContents(r: DistributionRelease): string[] {
  const src = r.artifacts.find(a => a.kind === 'source-tarball');
  return [
    `Source repository snapshot at ${tagOf(r)} (commit ${sourceCommit(r).slice(0, 12)})${src ? `, as ${src.filename}` : ''}`,
    'Build scripts, pinned toolchain and reproducible-build instructions',
    'Dependency lockfiles and vendored third-party source',
    'Database migrations and rollback scripts',
    'Operator, build and deployment documentation',
    'Publisher public signing keys (never private keys)',
    ...(r.nationId ? ['The nation’s own modules and configuration delivered in this build'] : []),
  ];
}
function makeDeposit(r: DistributionRelease, at: number, by: string): EscrowDeposit {
  const contents = depositContents(r);
  const manifest = JSON.stringify({ release: r.id, version: r.version, commit: sourceCommit(r), contents, artifacts: r.artifacts.map(a => [a.filename, a.sha256]) });
  return {
    id: `ESC-${sha(`${r.id}:escrow`).slice(0, 8).toUpperCase()}`, releaseId: r.id, version: r.version, nationId: r.nationId,
    agent: ESCROW_AGENT, depositedAt: iso(at), depositedBy: by, contentsHash: sha(manifest), contents, sourceCommit: sourceCommit(r),
  };
}
function seed(db: ScDb) {
  const now = Date.now();
  for (const r of allReleases()) {
    const age = (now - ms(r.releasedAt)) / DAY;
    if (age < 3) continue; // the newest releases are still awaiting deposit
    const d = makeDeposit(r, ms(r.releasedAt) + 2 * DAY, 'Release engineering');
    if (age > 10) { d.verifiedAt = iso(ms(r.releasedAt) + 7 * DAY); d.verifiedBy = ESCROW_AGENT; }
    db.deposits[r.id] = d;
  }
  db.reviews.push({
    id: 'SR-100', nationId: 'home', releaseId: 'DR-140', version: '1.4.0', auditor: 'National CERT code review team', auditorKind: 'national-cert',
    scope: 'Identity, sign-in and permit decision services: authorisation checks and session handling.',
    purpose: 'Independent assurance before national rollout of online permits.', environment: 'escrow-agent', ndaAccepted: true,
    stage: 'completed', requestedAt: iso(now - 60 * DAY), requestedBy: 'Chief Information Security Officer',
    schedule: { start: iso(now - 40 * DAY), end: iso(now - 30 * DAY) },
    findings: { summary: 'No critical issues. Two high findings (both fixed in 1.4.1 as CSA-2026-05 and CSA-2026-07) and four medium.', critical: 0, high: 2, medium: 4, low: 7, reportRef: 'CERT-SR-100 (held by the nation)' },
    history: [
      { at: iso(now - 60 * DAY), by: 'Chief Information Security Officer', from: null, to: 'requested' },
      { at: iso(now - 55 * DAY), by: 'Publisher security', from: 'requested', to: 'scoping', note: 'Scope agreed: identity, sessions, permit decisions' },
      { at: iso(now - 50 * DAY), by: 'Publisher security', from: 'scoping', to: 'approved', note: 'At the escrow agent, 10 days' },
      { at: iso(now - 40 * DAY), by: 'Publisher security', from: 'approved', to: 'in-progress' },
      { at: iso(now - 30 * DAY), by: 'National CERT code review team', from: 'in-progress', to: 'completed', note: 'Report delivered to the nation' },
    ],
  });
}

export function escrowAgreement(nationId: string): EscrowAgreement | undefined {
  const n = nationRecord(nationId);
  if (!n) return undefined;
  return {
    nationId, agent: ESCROW_AGENT, agreementRef: `EA-${sha(`${nationId}:escrow-agreement`).slice(0, 6).toUpperCase()}`, effectiveFrom: n.enrolledAt,
    covers: 'Every global release this nation is entitled to, and every build made for it',
    depositWithinDays: DEPOSIT_WITHIN_DAYS,
    verification: 'The agent verifies each deposit (contents complete, hash matches) and rebuilds one release a year from the deposit to prove it builds.',
    releaseConditions: [
      { key: 'insolvency', label: 'Vendor insolvency', detail: 'The publisher becomes insolvent, enters administration or ceases to trade.' },
      { key: 'end-of-support', label: 'End of support', detail: 'The publisher stops supporting the product line the nation runs without a supported upgrade path, before the contract term ends.' },
      { key: 'material-breach', label: 'Material breach', detail: 'The publisher fails to fix a material breach of the support obligations (including patch-time commitments) within the cure period.' },
    ],
    invocation: [
      'The nation notifies the escrow agent in writing, citing the release condition and evidence.',
      'The agent notifies the publisher, who may dispute within the agreed period (typically 15 working days).',
      'Undisputed (or after dispute resolution), the agent releases the latest verified deposit to the nation under a perpetual licence to maintain and modify the software for its own government use.',
    ],
    placeholder: true,
  };
}

export function escrowStatus(nationId: string, now = Date.now()): EscrowStatusRow[] {
  const n = nationRecord(nationId);
  if (!n) return [];
  const db = sdb();
  return allReleases().filter(r => visibleTo(r, nationId)).sort((a, b) => b.releasedAt.localeCompare(a.releasedAt)).map(r => {
    const d = db.deposits[r.id];
    const dueBy = iso(ms(r.releasedAt) + DEPOSIT_WITHIN_DAYS * DAY);
    const state: EscrowStatusRow['state'] = d ? (d.verifiedAt ? 'verified' : 'deposited') : now > ms(dueBy) ? 'overdue' : 'pending';
    return { releaseId: r.id, version: r.version, title: r.title, releasedAt: r.releasedAt, state, dueBy, installed: r.id === n.installedReleaseId || r.version === n.installedVersion, deposit: d };
  });
}

export function allDeposits(now = Date.now()): (EscrowStatusRow & { nationId?: string })[] {
  const db = sdb();
  return allReleases().sort((a, b) => b.releasedAt.localeCompare(a.releasedAt)).map(r => {
    const d = db.deposits[r.id];
    const dueBy = iso(ms(r.releasedAt) + DEPOSIT_WITHIN_DAYS * DAY);
    return { releaseId: r.id, version: r.version, title: r.title, releasedAt: r.releasedAt, nationId: r.nationId, installed: false, dueBy, deposit: d,
      state: d ? (d.verifiedAt ? 'verified' : 'deposited') : now > ms(dueBy) ? 'overdue' : 'pending' };
  });
}

export function recordDeposit(releaseId: string, by: string, now = Date.now()): EscrowDeposit | { error: string; status: number } {
  const r = allReleases().find(x => x.id === releaseId);
  if (!r) return { error: 'Release not found', status: 404 };
  if (!by.trim()) return { error: 'Name who made the deposit', status: 422 };
  const db = sdb();
  if (db.deposits[releaseId]) return { error: 'Already deposited', status: 409 };
  const d = makeDeposit(r, now, by.trim());
  db.deposits[releaseId] = d;
  recordAudit(by.trim(), 'escrow.deposit', `Escrow:${releaseId}`, 'ok', `${d.id} · ${r.version} · contents ${d.contentsHash.slice(0, 16)}…`);
  return d;
}

export function verifyDeposit(releaseId: string, by: string, now = Date.now()): EscrowDeposit | { error: string; status: number } {
  const d = sdb().deposits[releaseId];
  if (!d) return { error: 'Nothing deposited for this release', status: 404 };
  if (d.verifiedAt) return { error: 'Already verified', status: 409 };
  if (!by.trim()) return { error: 'Name who verified the deposit', status: 422 };
  d.verifiedAt = iso(now); d.verifiedBy = by.trim();
  recordAudit(by.trim(), 'escrow.verify', `Escrow:${releaseId}`, 'ok', `${d.id} verified by the agent`);
  return d;
}

// ── Source-code audits ───────────────────────────────────────────────
const KINDS: SourceReview['auditorKind'][] = ['national-cert', 'independent-firm', 'academic', 'government-team'];
export const ENVIRONMENTS: Record<SourceReviewEnvironment, string> = {
  'escrow-agent': 'At the escrow agent’s premises',
  'reading-room': 'In the publisher’s secure reading room',
  'offline-copy': 'On an offline copy in the nation’s own secure facility',
};
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function listReviews(nationId: string): SourceReview[] {
  return sdb().reviews.filter(r => r.nationId === nationId).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}
export function allReviews(): SourceReview[] {
  return [...sdb().reviews].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export function requestReview(nationId: string, input: { releaseId?: string; auditor?: string; auditorKind?: string; scope?: string; purpose?: string; environment?: string; ndaAccepted?: boolean; by?: string }, now = Date.now()): SourceReview | { error: string; status: number } {
  const r = releaseFor(nationId, String(input.releaseId ?? ''));
  if (!r) return { error: 'Choose one of your releases', status: 422 };
  const auditor = str(input.auditor, 160), scope = str(input.scope, 2000), purpose = str(input.purpose, 1000), by = str(input.by, 120);
  if (!auditor) return { error: 'Name the auditor', status: 422 };
  if (!KINDS.includes(input.auditorKind as SourceReview['auditorKind'])) return { error: 'Say what kind of auditor this is', status: 422 };
  if (scope.length < 15) return { error: 'Describe the scope — at least 15 characters', status: 422 };
  if (!(input.environment && input.environment in ENVIRONMENTS)) return { error: 'Choose where the review takes place', status: 422 };
  if (input.ndaAccepted !== true) return { error: 'The auditor must accept the confidentiality terms', status: 422 };
  if (!by) return { error: 'Name who is requesting the review', status: 422 };
  const db = sdb();
  const rev: SourceReview = {
    id: `SR-${db.reviewSeq++}`, nationId, releaseId: r.id, version: r.version, auditor, auditorKind: input.auditorKind as SourceReview['auditorKind'],
    scope, purpose, environment: input.environment as SourceReviewEnvironment, ndaAccepted: true, stage: 'requested',
    requestedAt: iso(now), requestedBy: by, history: [{ at: iso(now), by, from: null, to: 'requested' }],
  };
  db.reviews.push(rev);
  recordAudit(by, 'escrow.source-review.request', `SourceReview:${nationId}/${rev.id}`, 'ok', `${r.version} · ${auditor} · ${rev.environment}`);
  return rev;
}

const FLOW: Record<string, { side: 'nation' | 'publisher'; from: SourceReviewStage[]; to: SourceReviewStage }> = {
  scope: { side: 'publisher', from: ['requested'], to: 'scoping' },
  approve: { side: 'publisher', from: ['scoping'], to: 'approved' },
  decline: { side: 'publisher', from: ['requested', 'scoping'], to: 'declined' },
  start: { side: 'publisher', from: ['approved'], to: 'in-progress' },
  complete: { side: 'publisher', from: ['in-progress'], to: 'completed' },
  withdraw: { side: 'nation', from: ['requested', 'scoping', 'approved'], to: 'withdrawn' },
};

export function advanceReview(side: 'nation' | 'publisher', nationId: string | null, id: string,
  input: { action?: string; by?: string; note?: string; start?: string; end?: string; findings?: { summary?: string; critical?: number; high?: number; medium?: number; low?: number; reportRef?: string } }, now = Date.now()): SourceReview | { error: string; status: number } {
  const rev = sdb().reviews.find(r => r.id === id && (nationId === null || r.nationId === nationId));
  if (!rev) return { error: 'Review not found', status: 404 };
  const step = FLOW[String(input.action)];
  if (!step || step.side !== side) return { error: `Unknown action for the ${side}`, status: 422 };
  const by = str(input.by, 120), note = str(input.note, 1000);
  if (!by) return { error: 'Name who is acting', status: 422 };
  if (!step.from.includes(rev.stage)) return { error: `Cannot ${input.action} a review that is ${rev.stage}`, status: 409 };
  if (input.action === 'decline' && note.length < 15) return { error: 'Give the reason for declining — at least 15 characters', status: 422 };
  if (input.action === 'approve') {
    const s = Date.parse(input.start ?? ''), e = Date.parse(input.end ?? '');
    if (!(e > s)) return { error: 'Approval needs the review dates (start and end)', status: 422 };
    rev.schedule = { start: iso(s), end: iso(e) };
  }
  if (input.action === 'complete') {
    const f = input.findings ?? {};
    const n = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : NaN);
    const counts = [n(f.critical), n(f.high), n(f.medium), n(f.low)];
    if (counts.some(Number.isNaN) || str(f.summary, 2000).length < 10 || !str(f.reportRef, 120)) return { error: 'Record the findings: a summary, counts by severity and the report reference', status: 422 };
    rev.findings = { summary: str(f.summary, 2000), critical: counts[0]!, high: counts[1]!, medium: counts[2]!, low: counts[3]!, reportRef: str(f.reportRef, 120) };
  }
  const from = rev.stage;
  rev.stage = step.to;
  rev.history.push({ at: iso(now), by, from, to: step.to, note: note || undefined });
  recordAudit(by, `escrow.source-review.${input.action}`, `SourceReview:${rev.nationId}/${rev.id}`, 'ok', `${from} → ${step.to}`);
  return rev;
}
