// CivicOS — Sovereign Update Center (release distribution), server-side.
//
// The platform pipeline in ./store (createRelease → promoteRelease →
// deployments) builds a version and promotes it to `stable`. This module is
// the distribution layer after it: the publisher publishes a promoted
// version to every nation (global channel), or makes a build for one nation
// from that nation's feature requests (nation channel). Each nation sees
// only global releases and its own builds, through its own private link.
//
// Never automatic: no newer version is ever installed except by an explicit
// decision of a named person (decide()). Publishing a release makes it
// *available* and nothing more. Every decision is written to the shared
// audit chain (recordAudit in ./store).
//
// Resilience: an install needs a verified restore point, then runs on
// probation while health is checked. If probation fails, the system switches
// the *software* back to the last known good (LKG) release — the one thing
// that may happen without a person, because it returns to a version that
// already worked, never a newer one. It never touches data: citizens'
// payments, applications and registrations made since the install stay.
// That is safe only for releases whose migrations are backward compatible
// (compatibleWithPrevious); any other release asks first, whatever the
// nation's setting. Restoring the data snapshot is a separate, last-resort
// decision by a named person (restoreData). A nation can also ask to decide
// before any fallback.
//
// No false fallbacks: one bad or missing report only marks the release
// "degraded — watching". Fallback needs consecutive bad or missing reports
// (default 3), or two independent critical checks failing in one report.
// superviseProbations() is the watchdog: it concludes probations and is
// called by the chamber, publisher and health routes.
//
// Same persistence note as ./store: in-memory for the life of the process,
// behind function signatures a durable datastore can replace.

import type {
  ChamberRelease,
  DeliveryMode,
  DistributionRelease,
  FeatureRequest,
  FeatureRequestPriority,
  FeatureRequestStage,
  InstallAction,
  InstallEvent,
  InstallState,
  MaintenanceWindow,
  NationInstall,
  PublisherKey,
  PublisherOverview,
  ReleaseArtifact,
  ReleaseChange,
  ReleaseMigration,
  ReleaseSeverity,
  SubscribedNation,
  UpdateChamber,
  ChangeKind,
  FallbackIncident,
  HealthCheck,
  HealthCheckKey,
  HealthReport,
  Probation,
  ReleaseHealthStats,
  ReleaseStatus,
  ResilienceSettings,
  RestorePoint,
  RolloutRing,
} from '@/lib/api/types';
import { createHash, timingSafeEqual } from 'node:crypto';
import { recordAudit, getSovereign, getSetup, listMinistries, listReleases, verifyAuditChain } from './store';
import { securityGate, posture as securityPosture } from './security-store';
import { preflightGate, stagingGate, superviseStaging } from './readiness';
import { blackoutOverlapping, freezeBlocks, changeControl } from './change-control';
import { openTicketForIncident } from './support';
import { issueDueNotices, lifecycleWarning, lineOf, onEolNotice } from './lifecycle';
import { alert } from './comms';
import { transmit } from './sovereignty';
import { touch } from '@/lib/data/repo/track';

/** Backward compatible with the previous release: every migration reversible and expand/contract, never in place. */
export function isBackwardCompatible(migrations: ReleaseMigration[]): boolean {
  return migrations.every(m => m.reversible && m.pattern !== 'in-place');
}
import { compareVersions, gt, gte, isVersion, parseVersion, baseOf } from '@/lib/updates/semver';

export const HOME_NATION = 'home';
export const DELIVERY_MODES: DeliveryMode[] = ['saas', 'self-hosted', 'air-gapped'];
export const SEVERITIES: ReleaseSeverity[] = ['security', 'critical', 'feature', 'maintenance'];
export const CHANGE_KINDS: ChangeKind[] = ['feature', 'fix', 'security', 'breaking', 'deprecation'];
export const PRIORITIES: FeatureRequestPriority[] = ['low', 'normal', 'high', 'urgent'];
/** The visible pipeline a feature request moves along. */
export const REQUEST_FLOW: FeatureRequestStage[] = ['requested', 'under-review', 'scoped', 'in-development', 'ready', 'delivered'];
export const INSTALL_ACTIONS: InstallAction[] = ['approve', 'schedule', 'unschedule', 'prepare', 'install', 'skip', 'reconsider', 'rollback', 'fallback', 'keep'];
export const HEALTH_CHECKS: { key: HealthCheckKey; label: string; critical: boolean }[] = [
  { key: 'readiness', label: 'Service readiness', critical: true },
  { key: 'liveness', label: 'Service liveness', critical: true },
  { key: 'error-rate', label: 'Error rate vs baseline', critical: false },
  { key: 'latency', label: 'Latency vs baseline', critical: false },
  { key: 'audit-chain', label: 'Audit-chain integrity', critical: true },
  { key: 'smoke-sign-in', label: 'Smoke test: sign-in', critical: true },
  { key: 'smoke-wallet', label: 'Smoke test: citizen wallet', critical: true },
  { key: 'smoke-payments', label: 'Smoke test: payments', critical: true },
  { key: 'smoke-registry', label: 'Smoke test: registry', critical: true },
];
export const DEFAULT_SETTINGS: ResilienceSettings = {
  probationMinutes: 30, fallback: 'automatic', healthSource: 'simulated', ring: 'general', definitionsPolicy: 'automatic', stagingRequired: true,
};
/** The system's name in the audit chain when it acts on its own (fallback, probation verdicts). */
export const SYSTEM_ACTOR = 'system (resilience watchdog)';

/** Registry the demo artifacts point at. `.example` is reserved: nothing real is served. */
const REGISTRY = 'registry.civicos.example';

// ── Deterministic placeholder digests ────────────────────────────────
// Artifacts are metadata only in this build. Checksums are derived from the
// artifact name so they are stable and well-formed, and every artifact is
// flagged `placeholder: true`.
function digest(seed: string, len = 64): string {
  let out = '';
  let h = 2166136261;
  for (let i = 0; out.length < len; i++) {
    for (const ch of `${seed}#${i}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    out += h.toString(16).padStart(8, '0');
  }
  return out.slice(0, len);
}

const FINGERPRINT = digest('civicos-release-signing-key', 40).toUpperCase().replace(/(.{4})(?!$)/g, '$1 ');
export const PUBLISHER_KEY: PublisherKey = {
  fingerprint: FINGERPRINT,
  cosignKey: 'civicos-release.pub',
  gpgKey: 'civicos-release-signing-key.asc',
  demo: true,
};

function sizeFor(seed: string, min: number, max: number): number {
  return min + (parseInt(digest(seed, 8), 16) % (max - min));
}

/** The standard artifact set a release ships for the delivery modes it supports. */
export function artifactsFor(version: string, delivery: DeliveryMode[], releaseId: string): ReleaseArtifact[] {
  const tag = version.replace(/\+/g, '_'); // OCI tags cannot carry '+'
  const out: ReleaseArtifact[] = [];
  const add = (a: Omit<ReleaseArtifact, 'id' | 'sha256' | 'signature' | 'placeholder'> & { cosign?: boolean }) => {
    const { cosign, ...rest } = a;
    // Salted with the release id: two nations' builds can share a version
    // string, never an artifact id or checksum.
    const sha256 = digest(`${releaseId}:${version}:${a.filename}`);
    out.push({
      ...rest,
      id: `AF-${digest(`${releaseId}:${version}:${a.kind}`, 10).toUpperCase()}`,
      sha256,
      ref: a.ref ? `${a.ref}@sha256:${sha256}` : undefined,
      signature: cosign
        ? { method: 'cosign', keyFingerprint: FINGERPRINT }
        : { method: 'gpg', keyFingerprint: FINGERPRINT, signatureFile: `${a.filename}.asc` },
      placeholder: true,
    });
  };
  if (delivery.includes('self-hosted')) {
    add({ kind: 'container-image', label: 'Platform container image', mode: 'self-hosted', filename: `civicos-platform-${tag}.oci`, ref: `${REGISTRY}/civicos/platform:${tag}`, platform: 'linux/amd64, linux/arm64', sizeBytes: sizeFor(`${version}img`, 380e6, 520e6), cosign: true });
    add({ kind: 'helm-chart', label: 'Helm chart', mode: 'self-hosted', filename: `civicos-${tag}.tgz`, ref: `oci://${REGISTRY}/charts/civicos:${tag}`, sizeBytes: sizeFor(`${version}helm`, 40e3, 90e3), cosign: true });
    add({ kind: 'binary-tarball', label: 'Server binaries', mode: 'self-hosted', filename: `civicos-${tag}-linux-amd64.tar.gz`, platform: 'linux/amd64', sizeBytes: sizeFor(`${version}bin`, 140e6, 190e6) });
    add({ kind: 'source-tarball', label: 'Source archive', mode: 'self-hosted', filename: `civicos-${tag}-src.tar.gz`, sizeBytes: sizeFor(`${version}src`, 28e6, 46e6) });
    add({ kind: 'migration-kit', label: 'Database migration kit', mode: 'self-hosted', filename: `civicos-${tag}-migrations.tar.gz`, sizeBytes: sizeFor(`${version}mig`, 200e3, 900e3) });
    add({ kind: 'install-kit', label: 'A/B install kit (install.sh, rollback.sh, health probes)', mode: 'self-hosted', filename: `civicos-${tag}-install-kit.tar.gz`, sizeBytes: sizeFor(`${version}kit`, 60e3, 140e3) });
  }
  if (delivery.includes('air-gapped')) {
    add({ kind: 'offline-bundle', label: 'Offline installation bundle', mode: 'air-gapped', filename: `civicos-${tag}-offline-bundle.tar`, platform: 'linux/amd64', sizeBytes: sizeFor(`${version}off`, 5.2e9, 7.4e9) });
    add({ kind: 'restore-kit', label: 'Restore kit (previous release images, restore scripts, health probes)', mode: 'air-gapped', filename: `civicos-${tag}-restore-kit.tar`, platform: 'linux/amd64', sizeBytes: sizeFor(`${version}rk`, 4.6e9, 6.2e9) });
  }
  add({ kind: 'mobile-android', label: 'Citizen app (Android App Bundle)', mode: 'any', filename: `civicos-citizen-${tag}.aab`, sizeBytes: sizeFor(`${version}aab`, 24e6, 38e6) });
  add({ kind: 'mobile-ios', label: 'Citizen app (iOS archive)', mode: 'any', filename: `civicos-citizen-${tag}.ipa`, sizeBytes: sizeFor(`${version}ipa`, 30e6, 48e6) });
  add({ kind: 'desktop-console', label: 'Officer desktop console (Windows, macOS, Linux)', mode: 'any', filename: `civicos-officer-console-${tag}.zip`, sizeBytes: sizeFor(`${version}desk`, 90e6, 140e6) });
  add({ kind: 'sbom-cyclonedx', label: 'SBOM — CycloneDX 1.5 (JSON)', mode: 'any', filename: `civicos-${tag}.cdx.json`, sizeBytes: sizeFor(`${version}cdx`, 600e3, 1.4e6) });
  add({ kind: 'sbom-spdx', label: 'SBOM — SPDX 2.3 (JSON)', mode: 'any', filename: `civicos-${tag}.spdx.json`, sizeBytes: sizeFor(`${version}spdx`, 700e3, 1.6e6) });
  add({ kind: 'documentation', label: 'Release notes and operator guide (PDF)', mode: 'any', filename: `civicos-${tag}-operator-guide.pdf`, sizeBytes: sizeFor(`${version}doc`, 2e6, 6e6) });
  return out;
}

// ── State ────────────────────────────────────────────────────────────
interface UpdatesDb {
  nations: SubscribedNation[];
  releases: DistributionRelease[];
  installs: Record<string, Record<string, NationInstall>>;
  requests: FeatureRequest[];
  requestSeq: number;
  incidents: FallbackIncident[];
  /** Deployment-agent credentials, per nation. Only a SHA-256 hash is kept. */
  agentKeys: Record<string, { hash: string; prefix: string; issuedAt: string; issuedBy: string; rotations: number }>;
}

function channelKey(): string {
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  return `nk_${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')}`;
}

function institution(archetype: string, fallback: string): string {
  try { return listMinistries().find(m => m.archetype === archetype)?.name ?? fallback; } catch { return fallback; }
}

function seedUpdates(): UpdatesDb {
  const now = Date.now();
  const days = (n: number) => new Date(now + n * 86400000).toISOString();
  const months = (iso: string, n: number) => { const d = new Date(iso); d.setMonth(d.getMonth() + n); return d.toISOString(); };
  const ALL: DeliveryMode[] = ['saas', 'self-hosted', 'air-gapped'];

  const rel = (r: Omit<DistributionRelease, 'artifacts' | 'supportUntil' | 'publishedBy' | 'rollout' | 'status' | 'compatibleWithPrevious'> & { supportMonths?: number; rollout?: RolloutRing }): DistributionRelease => {
    const { supportMonths, rollout, ...rest } = r;
    return { ...rest, supportUntil: months(r.releasedAt, supportMonths ?? 18), artifacts: artifactsFor(r.version, r.delivery, r.id), publishedBy: 'Release engineering', rollout: rollout ?? 'general', status: 'active', compatibleWithPrevious: isBackwardCompatible(r.migrations) };
  };

  const releases: DistributionRelease[] = [
    rel({
      id: 'DR-130', version: '1.3.0', channel: 'global', title: 'Municipal onboarding and audit export',
      summary: 'Stands up municipalities through a guided wizard with inclusion-floor checks, and adds signed export of the audit chain.',
      severity: 'feature', recommended: false, releasedAt: days(-150), minCompatibleVersion: '1.2.0',
      changes: [
        { kind: 'feature', text: 'Municipal onboarding wizard with inclusion-floor, language and officer sign-off checks' },
        { kind: 'feature', text: 'Signed export of the hash-chained audit log' },
        { kind: 'fix', text: 'Permit timeline kept its order when two officers acted in the same second' },
      ],
      migrations: [{ id: 'M-130-1', kind: 'database', description: 'Adds municipality onboarding tables', reversible: true, estimatedMinutes: 4, pattern: 'expand' }],
      breakingChanges: [],
      upgradeNotes: 'Run the migration kit before switching traffic. No configuration changes are required.',
      rollbackNotes: 'Reversible: restore the previous image and run the down-migration in the kit.',
      delivery: ALL, deliversRequests: [],
    }),
    rel({
      id: 'DR-140', version: '1.4.0', channel: 'global', title: 'Permit service levels and audit proofs',
      summary: 'Service-level clocks on every permit, verifiable audit proofs for any entry, and the operations centre.',
      severity: 'feature', recommended: false, releasedAt: days(-40), minCompatibleVersion: '1.3.0',
      platformReleaseId: 'REL-140',
      changes: [
        { kind: 'feature', text: 'Service-level clocks on permits, with breach alerts to the responsible office' },
        { kind: 'feature', text: 'Inclusion proofs for any audit entry (verifiable without database access)' },
        { kind: 'breaking', text: 'Audit export API v1 removed; use the v2 proof endpoint' },
        { kind: 'deprecation', text: 'Legacy CSV permit import will be removed in 1.6' },
        { kind: 'fix', text: 'Edge sync retried with back-off instead of a fixed interval' },
      ],
      migrations: [
        { id: 'M-140-1', kind: 'database', description: 'Adds service-level columns to permits and an index on the audit chain', reversible: true, estimatedMinutes: 12, pattern: 'expand' },
        { id: 'M-140-2', kind: 'data', description: 'Back-fills service-level start times for open permits', reversible: false, estimatedMinutes: 20, pattern: 'in-place' },
      ],
      breakingChanges: ['Audit export API v1 has been removed. Integrations must call the v2 proof endpoint.'],
      upgradeNotes: 'Requires 1.3.0 or later. Take a full backup, run both migrations in order, then switch traffic. Plan for about 35 minutes of read-only time.',
      rollbackNotes: 'The schema migration is reversible; the service-level back-fill is not. Rolling back keeps the back-filled values, which 1.3.x ignores.',
      delivery: ALL, deliversRequests: [],
    }),
    rel({
      id: 'DR-141', version: '1.4.1', channel: 'global', title: 'Security update: session hardening',
      summary: 'Fixes a session-fixation weakness and tightens cookie handling. Recommended for every nation.',
      severity: 'security', recommended: true, releasedAt: days(-5), minCompatibleVersion: '1.4.0',
      changes: [
        { kind: 'security', text: 'Session identifiers are rotated whenever privileges change (session fixation)', ref: 'CSA-2026-07' },
        { kind: 'security', text: 'Session cookies set SameSite=Lax and Secure on every response', ref: 'CSA-2026-07' },
        { kind: 'fix', text: 'Audit verification no longer times out on very long chains' },
      ],
      migrations: [],
      breakingChanges: [],
      upgradeNotes: 'Drop-in over 1.4.0. Officers are asked to sign in again once after the upgrade.',
      rollbackNotes: 'Fully reversible: redeploy the 1.4.0 image. Rolling back re-opens the fixed weakness.',
      delivery: ALL, deliversRequests: [],
    }),
    rel({
      id: 'DR-141-H1', version: '1.4.1+sov.1', channel: 'nation', nationId: HOME_NATION, baseVersion: '1.4.1',
      title: 'Bilingual civil-registry certificates',
      summary: 'Your nation build: everything in 1.4.1, plus the certificate templates your registry asked for.',
      severity: 'feature', recommended: true, releasedAt: days(-1), minCompatibleVersion: '1.4.0',
      changes: [
        { kind: 'feature', text: 'Civil-registry certificates print in both official languages side by side', ref: 'FR-1001' },
        { kind: 'feature', text: 'Template set can be edited by the registry without a new release' },
        { kind: 'security', text: 'Includes every security fix in global 1.4.1', ref: 'CSA-2026-07' },
      ],
      migrations: [{ id: 'M-141H-1', kind: 'configuration', description: 'Installs the bilingual certificate template set', reversible: true, estimatedMinutes: 2, pattern: 'expand' }],
      breakingChanges: [],
      upgradeNotes: 'Apply over 1.4.0 or 1.4.1. Contains global 1.4.1, so installing 1.4.1 first is not required.',
      rollbackNotes: 'Reversible: returns to the previous version and removes the template set.',
      delivery: ALL, deliversRequests: ['FR-1001'], supportMonths: 12,
    }),
    rel({
      id: 'DR-141-S1', version: '1.4.1+sov.1', channel: 'nation', nationId: 'sandbox', baseVersion: '1.4.1',
      title: 'Nightly sandbox data reset',
      summary: 'Sandbox build: resets demonstration data every night so training starts from a clean state.',
      severity: 'maintenance', recommended: false, releasedAt: days(-3), minCompatibleVersion: '1.4.1',
      changes: [{ kind: 'feature', text: 'Scheduled reset of demonstration data', ref: 'FR-2002' }],
      migrations: [],
      breakingChanges: [],
      upgradeNotes: 'Hosted: schedule into any window.',
      rollbackNotes: 'Reversible.',
      delivery: ['saas'], deliversRequests: ['FR-2002'], supportMonths: 6,
    }),
    rel({
      id: 'DR-150', version: '1.5.0', channel: 'global', title: 'Operations centre and interoperability',
      summary: 'Pilot ring: the cross-institution operations centre and the interoperability console. General availability follows a clean pilot.',
      severity: 'feature', recommended: false, releasedAt: days(-2), minCompatibleVersion: '1.4.0', rollout: 'pilot',
      changes: [
        { kind: 'feature', text: 'Cross-institution operations centre' },
        { kind: 'feature', text: 'Interoperability console: federation grants, webhooks and clients' },
        { kind: 'deprecation', text: 'Legacy CSV permit import removed (announced in 1.4.0)' },
      ],
      migrations: [
        { id: 'M-150-1', kind: 'database', description: 'Adds integration and webhook tables (expand: 1.4.x keeps working)', reversible: true, estimatedMinutes: 6, pattern: 'expand' },
      ],
      breakingChanges: [],
      upgradeNotes: 'Expand-only migration: the previous release runs unchanged on the new schema, so falling back is clean.',
      rollbackNotes: 'Reversible: fall back to 1.4.x; the new tables are ignored until the contract step in a later release.',
      delivery: ALL, deliversRequests: [],
    }),
  ];

  const ev = (at: string, by: string, action: InstallAction, from: InstallState, to: InstallState, extra: Partial<InstallEvent> = {}): InstallEvent =>
    ({ at, by, action, from, to, ...extra });

  const nations: SubscribedNation[] = [
    {
      id: HOME_NATION, name: '', deliveryMode: 'self-hosted', channelKey: channelKey(),
      installedVersion: '1.4.0', installedReleaseId: 'DR-140',
      history: [{ version: '1.3.0', releaseId: 'DR-130', at: days(-140) }],
      enrolledAt: days(-200), home: true,
      lkg: { version: '1.4.0', releaseId: 'DR-140' },
      settings: { ...DEFAULT_SETTINGS },
      estate: { servers: 48, endpoints: 1250 },
    },
    {
      id: 'sandbox', name: 'Pre-production sandbox', deliveryMode: 'saas', channelKey: channelKey(),
      installedVersion: '1.4.1', installedReleaseId: 'DR-141',
      history: [{ version: '1.4.0', releaseId: 'DR-140', at: days(-30) }],
      enrolledAt: days(-90),
      lkg: { version: '1.4.1', releaseId: 'DR-141' },
      settings: { ...DEFAULT_SETTINGS, ring: 'pilot', healthSource: 'agent' },
      currency: 'USD',
      estate: { servers: 6, endpoints: 40 },
    },
  ];

  const installs: UpdatesDb['installs'] = {
    [HOME_NATION]: {
      'DR-130': { releaseId: 'DR-130', state: 'installed', mode: 'self-hosted', events: [
        ev(days(-142), 'Chief Information Officer', 'approve', 'available', 'approved'),
        ev(days(-140), 'Platform operations', 'install', 'approved', 'installed', { mode: 'self-hosted', note: 'Checksums and signatures verified' }),
      ] },
      'DR-140': { releaseId: 'DR-140', state: 'installed', mode: 'self-hosted', events: [
        ev(days(-36), 'Chief Information Officer', 'approve', 'available', 'approved', { note: 'Tested in staging for a week' }),
        ev(days(-33), 'Platform operations', 'prepare', 'approved', 'approved', { note: 'Restore point RP-1300 verified' }),
        ev(days(-33), 'Platform operations', 'install', 'approved', 'probation', { mode: 'self-hosted', note: 'Checksums and signatures verified' }),
        ev(days(-33), SYSTEM_ACTOR, 'install', 'probation', 'installed', { note: 'Probation passed (30 min); 1.4.0 is now last known good' }),
      ],
      restorePoint: {
        id: 'RP-1300', version: '1.3.0', releaseId: 'DR-130', createdAt: days(-33), createdBy: 'Platform operations',
        sizeBytes: 18_400_000_000, verified: true,
        contents: ['Database snapshot (point-in-time, encrypted)', 'Configuration bundle and secret references', 'Release artifacts of 1.3.0'],
        restoreNotes: ['Data restore replaces the whole database with this snapshot: everything written after it is lost.', '1.4.0 back-fills service-level times in place, so it is not backward compatible: its fallback always asks first.'],
      } },
    },
    sandbox: {
      'DR-140': { releaseId: 'DR-140', state: 'installed', mode: 'saas', events: [ev(days(-31), 'Sandbox owner', 'install', 'approved', 'installed', { mode: 'saas' })] },
      'DR-141': { releaseId: 'DR-141', state: 'installed', mode: 'saas', events: [ev(days(-4), 'Sandbox owner', 'install', 'approved', 'installed', { mode: 'saas' })] },
      // A failed pilot: probation caught a broken payments path and the system fell back.
      'DR-141-S1': { releaseId: 'DR-141-S1', state: 'fallen-back', mode: 'saas', events: [
        ev(days(-2.2), 'Sandbox owner', 'approve', 'available', 'approved'),
        ev(days(-2.1), 'Sandbox owner', 'prepare', 'approved', 'approved', { note: 'Restore point RP-2141 verified' }),
        ev(days(-2), 'Sandbox owner', 'install', 'approved', 'probation', { mode: 'saas' }),
        ev(days(-1.99), SYSTEM_ACTOR, 'fallback', 'probation', 'fallen-back', { note: 'Probation failed: smoke-payments on 3 consecutive reports. Software switched back to 1.4.1 (blue-green); data untouched' }),
      ],
      restorePoint: {
        id: 'RP-2141', version: '1.4.1', releaseId: 'DR-141', createdAt: days(-2.1), createdBy: 'Sandbox owner', sizeBytes: 900_000_000, verified: true,
        contents: ['Database snapshot (point-in-time, encrypted)', 'Configuration bundle and secret references', 'Release artifacts of 1.4.1'],
        restoreNotes: ['Data restore replaces the whole database with this snapshot: everything written after it is lost.'],
      } },
    },
  };
  const incidents: FallbackIncident[] = [{
    id: 'INC-U-2001', nationId: 'sandbox', releaseId: 'DR-141-S1', fromVersion: '1.4.1+sov.1', toVersion: '1.4.1', restorePointId: 'RP-2141',
    trigger: 'automatic', state: 'restored', failedChecks: ['smoke-payments'], openedAt: days(-1.99),
    timeline: [
      { at: days(-2), text: '1.4.1+sov.1 installed by Sandbox owner; probation started (30 min)' },
      { at: days(-1.996), text: 'Smoke test: payments failed (HTTP 500 on receipt issue) — degraded, watching' },
      { at: days(-1.99), text: 'Payments failed on 3 consecutive reports: probation failed' },
      { at: days(-1.99), text: 'Automatic fallback: software switched back to 1.4.1 (blue-green); data untouched' },
      { at: days(-1.99), text: 'Health restored on 1.4.1' },
    ],
    acknowledgedAt: days(-1.9), acknowledgedBy: 'Sandbox owner',
  }];

  const stageTrail = (stages: FeatureRequestStage[], from: number, by: string) =>
    stages.map((to, i) => ({ at: days(from + i * 6), by: i === 0 ? by : 'Release engineering', from: i === 0 ? null : stages[i - 1]!, to }));

  const requests: FeatureRequest[] = [
    {
      id: 'FR-1001', nationId: HOME_NATION, title: 'Bilingual civil-registry certificates',
      description: 'Birth, marriage and death certificates must carry both official languages side by side, with the registry able to edit the wording.',
      priority: 'high', institution: institution('INTERIOR', 'Civil registry'), stage: 'delivered',
      submittedAt: days(-60), submittedBy: 'Registrar General', targetVersion: '1.4.1+sov.1', deliveredIn: 'DR-141-H1',
      history: stageTrail(['requested', 'under-review', 'scoped', 'in-development', 'ready', 'delivered'], -60, 'Registrar General'),
    },
    {
      id: 'FR-1002', nationId: HOME_NATION, title: 'Offline permit intake for field offices',
      description: 'Field offices with intermittent connectivity need to take permit applications offline and sync them when the link returns, without duplicates.',
      priority: 'high', institution: institution('TRADE', 'Licensing office'), stage: 'in-development',
      submittedAt: days(-24), submittedBy: 'Director of Licensing', targetVersion: '1.5.0+sov.1',
      history: stageTrail(['requested', 'under-review', 'scoped', 'in-development'], -24, 'Director of Licensing'),
    },
    {
      id: 'FR-1003', nationId: HOME_NATION, title: 'Ledger export in the national chart of accounts',
      description: 'Treasury needs receipts and reconciliations exported against the national chart of accounts so they load into the financial management system without manual mapping.',
      priority: 'normal', institution: institution('FINANCE', 'Treasury'), stage: 'requested',
      submittedAt: days(-2), submittedBy: 'Accountant General',
      history: stageTrail(['requested'], -2, 'Accountant General'),
    },
    {
      id: 'FR-2001', nationId: 'sandbox', title: 'Training accounts that expire after a course',
      description: 'Training officers get accounts that disable themselves when the course ends.',
      priority: 'low', institution: 'Training school', stage: 'under-review',
      submittedAt: days(-9), submittedBy: 'Sandbox owner',
      history: stageTrail(['requested', 'under-review'], -9, 'Sandbox owner'),
    },
    {
      id: 'FR-2002', nationId: 'sandbox', title: 'Nightly data reset',
      description: 'Reset demonstration data every night.',
      priority: 'normal', institution: 'Training school', stage: 'delivered',
      submittedAt: days(-40), submittedBy: 'Sandbox owner', deliveredIn: 'DR-141-S1',
      history: stageTrail(['requested', 'under-review', 'scoped', 'in-development', 'ready', 'delivered'], -40, 'Sandbox owner'),
    },
  ];

  return { nations, releases, installs, requests, requestSeq: 1003, incidents, agentKeys: {} };
}

const g = globalThis as unknown as { __civicosUpdates?: UpdatesDb };
// End-of-life notices reach the officials of every nation on that line who subscribed to them.
onEolNotice(e => {
  for (const n of udb().nations) {
    if (lineOf(n.installedVersion) === e.line) alert(n.id, 'eol', `Release line ${e.line} reaches end of life on ${e.endOfLife.slice(0, 10)} (${e.months}-month notice)`, `line:${e.line}`, Date.parse(e.at));
  }
});
function udb(): UpdatesDb {
  return touch('__civicosUpdates', g.__civicosUpdates ??= seedUpdates());
}

/** Test hook: start again from the seed. */
export function resetUpdates(): void {
  g.__civicosUpdates = seedUpdates();
}

// ── Nations and isolation ────────────────────────────────────────────
/** The installed nation wears its live identity; before setup it is neutral. */
function viewNation(n: SubscribedNation): SubscribedNation {
  const k = udb().agentKeys[n.id];
  const agentCredential = k ? { prefix: k.prefix, issuedAt: k.issuedAt, issuedBy: k.issuedBy, rotations: k.rotations } : undefined;
  if (!n.home) return { ...n, history: [...n.history], agentCredential };
  const s = getSovereign();
  const configured = !!getSetup();
  return { ...n, history: [...n.history], agentCredential, name: configured ? s.stateName : 'This installation', iso3: configured ? s.iso3 : undefined, currency: s.currency };
}

function nationById(id: string): SubscribedNation | undefined {
  const n = udb().nations.find(x => x.id === id);
  // The installed nation is invoiced in its own currency.
  if (n?.home) n.currency = getSovereign().currency;
  return n;
}

/** Resolve whose chamber a request is for: a private link key, or the installed nation. */
export function resolveNation(link?: string | null): SubscribedNation | null {
  if (link) return udb().nations.find(n => n.channelKey === link) ?? null;
  return nationById(HOME_NATION) ?? null;
}

/**
 * The isolation rule: global releases, plus builds made for this nation. A
 * global release still in its pilot ring is seen only by pilot nations (and
 * by any nation that already acted on it).
 */
export function visibleTo(r: DistributionRelease, nationId: string): boolean {
  if (r.channel !== 'global') return r.nationId === nationId;
  if (r.rollout === 'general') return true;
  const n = nationById(nationId);
  return n?.settings.ring === 'pilot' || !!udb().installs[nationId]?.[r.id];
}

function installOf(nationId: string, releaseId: string): NationInstall {
  return udb().installs[nationId]?.[releaseId] ?? { releaseId, state: 'available', events: [] };
}

function chamberRelease(n: SubscribedNation, r: DistributionRelease): ChamberRelease {
  const install = installOf(n.id, r.id);
  return {
    ...r,
    install: { ...install, events: [...install.events] },
    newer: gt(r.version, n.installedVersion),
    compatible: gte(n.installedVersion, r.minCompatibleVersion),
    superseded: install.state === 'installed' && r.id !== n.installedReleaseId,
    blocked: r.status !== 'active',
  };
}

/** Releases ordered newest first. */
function byVersionDesc(a: DistributionRelease, b: DistributionRelease) {
  return compareVersions(b.version, a.version) || b.releasedAt.localeCompare(a.releasedAt);
}

/**
 * The upgrade path from the installed version to the newest reachable one:
 * at each step take the newest release that can be applied directly over
 * the current version (its minimum compatible version is met). Skipped
 * releases are left out — a skip is the nation's decision.
 */
export function upgradePath(installed: string, releases: (DistributionRelease & { install?: NationInstall })[]): string[] {
  const path: string[] = [];
  let cur = installed;
  for (let guard = 0; guard < 50; guard++) {
    const next = releases
      .filter(r => gt(r.version, cur) && gte(cur, r.minCompatibleVersion) && r.install?.state !== 'skipped' && r.install?.state !== 'fallen-back' && r.status === 'active')
      .sort(byVersionDesc)[0];
    if (!next) break;
    path.push(next.id);
    cur = next.version;
  }
  return path;
}

export function getChamber(nationId: string): UpdateChamber | { error: string } {
  const raw = nationById(nationId);
  if (!raw) return { error: 'Nation not found' };
  const nation = viewNation(raw);
  const releases = udb().releases.filter(r => visibleTo(r, nationId)).sort(byVersionDesc).map(r => chamberRelease(raw, r));
  const latest = releases[0]?.version ?? raw.installedVersion;
  return {
    nation,
    installed: raw.installedVersion,
    latest: gt(latest, raw.installedVersion) ? latest : raw.installedVersion,
    releases,
    upgradePath: upgradePath(raw.installedVersion, releases),
    requests: udb().requests.filter(q => q.nationId === nationId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    publisherKey: PUBLISHER_KEY,
    probation: runningProbation(raw),
    incidents: udb().incidents.filter(i => i.nationId === nationId).sort((a, b) => b.openedAt.localeCompare(a.openedAt)),
    advisories: releases
      .filter(r => r.status !== 'active' && r.id === raw.installedReleaseId)
      .map(r => ({ releaseId: r.id, version: r.version, status: r.status, reason: r.statusReason })),
    security: securityGate(raw),
    changeControl: changeControl(nationId),
    lifecycle: lifecycleWarning(raw, udb().releases.filter(r => visibleTo(r, nationId))),
  };
}

/** Security releases newer than what the nation runs and not yet installed (for the posture panel). */
export function securityAdvisories(nationId: string): { releaseId: string; version: string; title: string }[] {
  const n = nationById(nationId);
  if (!n) return [];
  return udb().releases
    .filter(r => visibleTo(r, nationId) && r.status === 'active' && (r.severity === 'security' || r.severity === 'critical')
      && gt(r.version, n.installedVersion))
    .map(r => ({ releaseId: r.id, version: r.version, title: r.title }));
}

export function nationPosture(nationId: string) {
  const n = nationById(nationId);
  return n ? securityPosture(n, securityAdvisories(nationId)) : undefined;
}

/** The raw nation record for modules that act on it (security store routes). */
export function nationRecord(nationId: string): SubscribedNation | undefined {
  return nationById(nationId);
}

/** One release, only if this nation may see it. */
export function getChamberRelease(nationId: string, releaseId: string): ChamberRelease | undefined {
  const n = nationById(nationId);
  const r = udb().releases.find(x => x.id === releaseId || x.version === releaseId && visibleTo(x, nationId));
  if (!n || !r || !visibleTo(r, nationId)) return undefined;
  return chamberRelease(n, r);
}

// ── Decisions (never automatic) ──────────────────────────────────────
// action → states it may be taken from → state it leads to.
// 'same' keeps the state (taking a restore point changes nothing else).
const TRANSITIONS: Record<InstallAction, { from: InstallState[]; to: InstallState | 'same' }> = {
  approve: { from: ['available', 'rolled-back', 'fallen-back'], to: 'approved' },
  schedule: { from: ['approved', 'scheduled'], to: 'scheduled' },
  unschedule: { from: ['scheduled'], to: 'approved' },
  prepare: { from: ['approved', 'scheduled'], to: 'same' },
  install: { from: ['approved', 'scheduled'], to: 'probation' },
  skip: { from: ['available', 'approved', 'scheduled'], to: 'skipped' },
  reconsider: { from: ['skipped'], to: 'available' },
  rollback: { from: ['installed', 'probation'], to: 'rolled-back' },
  fallback: { from: ['probation'], to: 'fallen-back' },
  keep: { from: ['probation'], to: 'installed' },
  'cancel-proposal': { from: ['available', 'approved', 'scheduled', 'rolled-back', 'fallen-back'], to: 'same' },
};
/** Four-eyes: these production decisions need a proposal and a second, different official. */
const FOUR_EYES: InstallAction[] = ['approve', 'install'];
/** Actions that move a nation toward a release; refused while the publisher has halted it. */
const FORWARD: InstallAction[] = ['approve', 'schedule', 'prepare', 'install'];

export interface DecisionInput {
  action: InstallAction;
  by: string;
  note?: string;
  window?: MaintenanceWindow;
  mode?: DeliveryMode;
  /** Self-hosted and offline installs: the team confirms checksums and signatures were verified. */
  verified?: boolean;
  /** Rollback over an irreversible migration: the team acknowledges what stays. */
  acknowledge?: boolean;
}

export type DecisionResult = { install: NationInstall; chamber: UpdateChamber; pending?: boolean } | { error: string; status: number };

const MAX_WINDOW_HOURS = 72;

export function decide(nationId: string, releaseId: string, input: DecisionInput): DecisionResult {
  const n = nationById(nationId);
  if (!n) return { error: 'Nation not found', status: 404 };
  const r = udb().releases.find(x => x.id === releaseId);
  if (!r || !visibleTo(r, nationId)) return { error: 'Release not found', status: 404 };
  const rule = TRANSITIONS[input.action];
  if (!rule) return { error: `Unknown action. Use one of: ${INSTALL_ACTIONS.join(', ')}`, status: 422 };
  const by = (input.by ?? '').trim();
  if (!by || by.length > 80) return { error: 'Name the person taking this decision (up to 80 characters)', status: 422 };
  const note = input.note?.trim() || undefined;
  if (note && note.length > 1000) return { error: 'Note is too long (1000 characters at most)', status: 422 };

  const cur = installOf(nationId, releaseId);
  if (!rule.from.includes(cur.state)) {
    return { error: `Cannot ${input.action} a release that is ${cur.state}`, status: 409 };
  }
  if (FORWARD.includes(input.action) && r.status !== 'active') {
    return { error: `The publisher has ${r.status} ${r.version}${r.statusReason ? `: ${r.statusReason}` : ''}. It cannot be approved or installed`, status: 409 };
  }
  const to: InstallState = rule.to === 'same' ? cur.state : rule.to;

  const event: InstallEvent = { at: new Date().toISOString(), by, action: input.action, from: cur.state, to, note };
  const next: NationInstall = { ...cur, events: [...cur.events] };
  let incident: FallbackIncident | undefined;

  // Four-eyes: the first official proposes; a second, different official carries it out.
  const fourEyes = FOUR_EYES.includes(input.action);
  const proposal = fourEyes && cur.pending?.action === input.action ? cur.pending : undefined;
  if (proposal && proposal.by.toLowerCase() === by.toLowerCase()) {
    return { error: `${proposal.by} proposed this; a second, different official must approve it`, status: 409 };
  }
  const propose = (extra: { mode?: DeliveryMode; verified?: boolean } = {}): DecisionResult => {
    next.pending = { action: input.action as 'approve' | 'install', by, at: event.at, note, ...extra };
    const a = recordAudit(by, `update.${input.action}.propose`, `UpdateChamber:${nationId}/${r.version}`, 'ok', `awaiting a second official${note ? ` · ${note}` : ''}`);
    next.events.push({ at: event.at, by, action: input.action, from: cur.state, to: cur.state, note: `Proposed — awaiting a second official${event.note && event.note !== note ? ` · ${event.note}` : note ? ` · ${note}` : ''}`, auditSeq: a.seq, mode: extra.mode });
    (udb().installs[nationId] ??= {})[releaseId] = next;
    const chamber = getChamber(nationId);
    if ('error' in chamber) return { error: chamber.error, status: 500 };
    return { install: next, chamber, pending: true };
  };

  switch (input.action) {
    case 'approve': {
      if (!gt(r.version, n.installedVersion)) return { error: `Already running ${n.installedVersion}; ${r.version} is not newer`, status: 409 };
      // Preflight: customisations are scanned against the release; blocking findings stop approval.
      const pf = preflightGate(n, r, by);
      if (!pf.ok) return { error: pf.error, status: 409 };
      event.note = [`Preflight: ${pf.report.summary.compatible} compatible, ${pf.report.summary.needsChange} need change, ${pf.report.summary.blocking} blocking${pf.report.summary.waived ? ` (${pf.report.summary.waived} waived)` : ''}`, note].filter(Boolean).join(' · ');
      if (!proposal) return propose();
      event.note = [`Proposed by ${proposal.by}; approved by ${by}`, event.note].join(' · ');
      next.pending = undefined;
      break;
    }
    case 'schedule': {
      if (!r.delivery.includes('saas')) return { error: 'This release is not offered as a hosted upgrade; download it instead', status: 422 };
      const w = input.window;
      const start = w ? Date.parse(w.start) : NaN, end = w ? Date.parse(w.end) : NaN;
      if (!Number.isFinite(start) || !Number.isFinite(end)) return { error: 'Choose a maintenance window with a start and an end', status: 422 };
      if (start < Date.now() - 60_000) return { error: 'The maintenance window must start in the future', status: 422 };
      if (end <= start) return { error: 'The window must end after it starts', status: 422 };
      if (end - start > MAX_WINDOW_HOURS * 3600_000) return { error: `A maintenance window can be at most ${MAX_WINDOW_HOURS} hours`, status: 422 };
      const blackout = blackoutOverlapping(nationId, start, end);
      if (blackout) return { error: `The window falls in the blackout “${blackout.label}” (${blackout.start.slice(0, 10)} → ${blackout.end.slice(0, 10)}). Choose another window`, status: 409 };
      next.window = { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
      next.mode = 'saas';
      event.window = next.window;
      event.mode = 'saas';
      break;
    }
    case 'unschedule':
      next.window = undefined;
      break;
    case 'prepare': {
      const rp = takeRestorePoint(n, r, by, event.at);
      next.restorePoint = rp;
      event.note = [`Restore point ${rp.id} of ${rp.version} verified`, note].filter(Boolean).join(' · ');
      break;
    }
    case 'install': {
      const mode = proposal?.mode ?? input.mode ?? (cur.state === 'scheduled' ? 'saas' : n.deliveryMode);
      const verified = proposal ? proposal.verified === true : input.verified === true;
      if (!DELIVERY_MODES.includes(mode) || !r.delivery.includes(mode)) return { error: `This release is not offered for ${mode} delivery`, status: 422 };
      const frozen = freezeBlocks(nationId, r.severity);
      if (frozen) return { error: frozen, status: 409 };
      if (mode !== 'saas' && !verified) {
        return { error: 'Confirm that the checksums and signatures were verified before recording the install', status: 422 };
      }
      if (!gt(r.version, n.installedVersion)) return { error: `Already running ${n.installedVersion}; ${r.version} is not newer`, status: 409 };
      if (!gte(n.installedVersion, r.minCompatibleVersion)) {
        return { error: `${r.version} needs ${r.minCompatibleVersion} or later installed first; this nation runs ${n.installedVersion}`, status: 409 };
      }
      const busy = runningProbation(n);
      if (busy) return { error: `${busy.version} is still on probation; let it conclude before installing another release`, status: 409 };
      const staged = stagingGate(n, r);
      if (!staged.ok) return { error: staged.error, status: 409 };
      const rp = cur.restorePoint;
      if (!rp || !rp.verified || rp.version !== n.installedVersion) {
        return { error: `Take a verified restore point of ${n.installedVersion} before installing (it protects the version you fall back to)`, status: 409 };
      }
      if (!proposal) return propose({ mode, verified });
      next.pending = undefined;
      const lkg = n.lkg ?? { version: n.installedVersion, releaseId: n.installedReleaseId };
      n.history.push({ version: n.installedVersion, releaseId: n.installedReleaseId, at: event.at });
      n.installedVersion = r.version;
      n.installedReleaseId = r.id;
      next.mode = mode;
      next.window = undefined;
      next.probation = startProbation(n, r, lkg, rp, event.at);
      event.mode = mode;
      event.note = [`Proposed by ${proposal.by}; approved by ${by}`, `Probation ${next.probation.minutes} min; last known good ${lkg.version}`, note].filter(Boolean).join(' · ');
      break;
    }
    case 'skip':
      if ((r.severity === 'security' || r.severity === 'critical') && (!note || note.length < 10)) {
        return { error: `Skipping a ${r.severity} release needs a recorded reason (at least 10 characters)`, status: 422 };
      }
      next.window = undefined;
      next.pending = undefined;
      break;
    case 'reconsider':
      break;
    case 'cancel-proposal':
      if (!cur.pending) return { error: 'There is no proposal to cancel', status: 409 };
      event.note = [`Cancelled ${cur.pending.by}’s proposal to ${cur.pending.action}`, note].filter(Boolean).join(' · ');
      next.pending = undefined;
      break;
    case 'rollback': {
      if (n.installedReleaseId !== r.id) return { error: 'Only the release currently running can be rolled back', status: 409 };
      const prev = n.history[n.history.length - 1];
      if (!prev) return { error: 'There is no earlier version to return to', status: 409 };
      if (!note || note.length < 10) return { error: 'Record why you are rolling back (at least 10 characters)', status: 422 };
      if (r.migrations.some(m => !m.reversible) && input.acknowledge !== true) {
        return { error: 'This release ran a migration that cannot be reversed. Acknowledge what stays before rolling back', status: 422 };
      }
      n.history.pop();
      n.installedVersion = prev.version;
      n.installedReleaseId = prev.releaseId;
      n.lkg = { version: prev.version, releaseId: prev.releaseId };
      if (next.probation && (next.probation.state === 'running' || next.probation.state === 'awaiting-decision')) { next.probation.state = 'ended'; next.probation.concludedAt = event.at; }
      break;
    }
    case 'fallback':
    case 'keep': {
      const pr = next.probation;
      if (!pr || pr.state !== 'awaiting-decision') return { error: 'There is no failed probation waiting for your decision', status: 409 };
      if (input.action === 'keep' && (!note || note.length < 10)) return { error: 'Record why you keep a release that failed its health checks (at least 10 characters)', status: 422 };
      incident = udb().incidents.find(i => i.id === pr.incidentId);
      if (input.action === 'fallback') {
        const done = restoreLkg(n, r, next, 'approved', by, event.at, incident);
        if ('error' in done) return { error: done.error, status: 409 };
      } else {
        pr.state = 'kept';
        pr.concludedAt = event.at;
        if (incident) { incident.state = 'kept'; incident.timeline.push({ at: event.at, text: `${by} kept ${r.version} despite failed checks: ${note}` }); }
      }
      break;
    }
  }

  next.state = to;
  const detail = [
    event.mode && `mode=${event.mode}`,
    event.window && `window=${event.window.start}→${event.window.end}`,
    (input.action === 'rollback' || input.action === 'fallback') && `now=${n.installedVersion}`,
    note,
  ].filter(Boolean).join(' · ') || undefined;
  const audit = recordAudit(by, `update.${input.action}`, `UpdateChamber:${nationId}/${r.version}`, 'ok', detail);
  event.auditSeq = audit.seq;
  if (incident && !incident.auditSeq) incident.auditSeq = audit.seq;
  next.events.push(event);
  (udb().installs[nationId] ??= {})[releaseId] = next;

  const chamber = getChamber(nationId);
  if ('error' in chamber) return { error: chamber.error, status: 500 };
  return { install: next, chamber };
}

// ── Feature requests ─────────────────────────────────────────────────
export interface RequestInput {
  title?: string;
  description?: string;
  priority?: string;
  institution?: string;
  by?: string;
}

export function listRequests(nationId: string): FeatureRequest[] {
  return udb().requests.filter(q => q.nationId === nationId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function submitRequest(nationId: string, input: RequestInput): FeatureRequest | { error: string } {
  if (!nationById(nationId)) return { error: 'Nation not found' };
  const title = (input.title ?? '').trim();
  const description = (input.description ?? '').trim();
  const inst = (input.institution ?? '').trim();
  const by = (input.by ?? '').trim();
  if (title.length < 4 || title.length > 120) return { error: 'Title must be 4–120 characters' };
  if (description.length < 10 || description.length > 2000) return { error: 'Description must be 10–2000 characters' };
  if (!PRIORITIES.includes(input.priority as FeatureRequestPriority)) return { error: `Priority must be one of: ${PRIORITIES.join(', ')}` };
  if (!inst || inst.length > 120) return { error: 'Name the requesting institution' };
  if (!by || by.length > 80) return { error: 'Name the person submitting the request' };
  const db = udb();
  const id = `FR-${++db.requestSeq}`;
  const at = new Date().toISOString();
  const q: FeatureRequest = {
    id, nationId, title, description, priority: input.priority as FeatureRequestPriority, institution: inst,
    stage: 'requested', submittedAt: at, submittedBy: by,
    history: [{ at, by, from: null, to: 'requested' }],
  };
  db.requests.push(q);
  recordAudit(by, 'update.request.submit', `FeatureRequest:${id}@${nationId}`, 'ok', title);
  return q;
}

/** Publisher: move a request one step along the pipeline, or decline it. */
export function advanceRequest(
  id: string,
  input: { to?: string; by?: string; note?: string; targetVersion?: string },
): FeatureRequest | { error: string } {
  const q = udb().requests.find(x => x.id === id);
  if (!q) return { error: 'Request not found' };
  const by = (input.by ?? '').trim() || 'Release engineering';
  const to = input.to as FeatureRequestStage;
  const note = input.note?.trim() || undefined;
  if (q.stage === 'delivered' || q.stage === 'declined') return { error: `Request is already ${q.stage}` };
  if (to === 'delivered') return { error: 'A request is delivered only by publishing the nation build that contains it' };
  if (to === 'declined') {
    if (!note || note.length < 10) return { error: 'Give the nation a reason when declining (at least 10 characters)' };
  } else {
    const i = REQUEST_FLOW.indexOf(q.stage);
    if (REQUEST_FLOW[i + 1] !== to) return { error: `From ${q.stage} the next stage is ${REQUEST_FLOW[i + 1]}` };
  }
  if (input.targetVersion !== undefined && input.targetVersion !== '' && !isVersion(input.targetVersion)) {
    return { error: 'Target version must be a semantic version, e.g. 1.5.0+sov.1' };
  }
  if (input.targetVersion) q.targetVersion = input.targetVersion;
  q.history.push({ at: new Date().toISOString(), by, from: q.stage, to, note });
  q.stage = to;
  recordAudit(by, 'update.request.advance', `FeatureRequest:${id}@${q.nationId}`, 'ok', `${q.history[q.history.length - 1]!.from} → ${to}${note ? ` · ${note}` : ''}`);
  return q;
}

// ── Publisher ────────────────────────────────────────────────────────
export interface PublishInput {
  channel?: string;
  nationId?: string;
  version?: string;
  baseVersion?: string;
  title?: string;
  summary?: string;
  severity?: string;
  recommended?: boolean;
  minCompatibleVersion?: string;
  changes?: { kind?: string; text?: string; ref?: string }[];
  migrations?: { kind?: string; description?: string; reversible?: boolean; estimatedMinutes?: number; pattern?: string }[];
  /** Global releases may start in the pilot ring. */
  rollout?: string;
  /** The publisher's claim; checked against the migrations. */
  compatibleWithPrevious?: boolean;
  breakingChanges?: string[];
  upgradeNotes?: string;
  rollbackNotes?: string;
  supportMonths?: number;
  delivery?: string[];
  deliversRequests?: string[];
  platformReleaseId?: string;
  by?: string;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function publishRelease(input: PublishInput): DistributionRelease | { error: string } {
  const db = udb();
  const channel = input.channel;
  if (channel !== 'global' && channel !== 'nation') return { error: 'Channel must be global or nation' };
  const title = str(input.title, 200), summary = str(input.summary, 2000);
  if (title.length < 3 || title.length > 120) return { error: 'Title must be 3–120 characters' };
  if (summary.length < 10) return { error: 'Summary must be at least 10 characters' };
  if (!SEVERITIES.includes(input.severity as ReleaseSeverity)) return { error: `Severity must be one of: ${SEVERITIES.join(', ')}` };
  const delivery = Array.isArray(input.delivery) ? [...new Set(input.delivery)] : [];
  if (!delivery.length || delivery.some(d => !DELIVERY_MODES.includes(d as DeliveryMode))) {
    return { error: `Choose at least one delivery mode: ${DELIVERY_MODES.join(', ')}` };
  }
  const changes: ReleaseChange[] = [];
  for (const c of Array.isArray(input.changes) ? input.changes : []) {
    const text = str(c?.text, 400);
    if (!text) continue;
    if (!CHANGE_KINDS.includes(c.kind as ChangeKind)) return { error: `Change kind must be one of: ${CHANGE_KINDS.join(', ')}` };
    changes.push({ kind: c.kind as ChangeKind, text, ref: str(c.ref, 40) || undefined });
  }
  if (!changes.length) return { error: 'Add at least one changelog entry' };
  const migrations: ReleaseMigration[] = [];
  for (const [i, m] of (Array.isArray(input.migrations) ? input.migrations : []).entries()) {
    const description = str(m?.description, 400);
    if (!description) continue;
    if (!['database', 'configuration', 'data'].includes(m.kind ?? '')) return { error: 'Migration kind must be database, configuration or data' };
    const mins = Number(m.estimatedMinutes ?? 0);
    if (!Number.isFinite(mins) || mins < 0 || mins > 24 * 60) return { error: 'Migration estimate must be 0–1440 minutes' };
    const pattern = m.pattern === 'expand' || m.pattern === 'contract' || m.pattern === 'in-place' ? m.pattern : undefined;
    migrations.push({ id: `M-${i + 1}`, kind: m.kind as ReleaseMigration['kind'], description, reversible: m.reversible !== false, estimatedMinutes: Math.round(mins), pattern });
  }

  const compatible = isBackwardCompatible(migrations);
  if (input.compatibleWithPrevious === true && !compatible) {
    return { error: 'Marked backward compatible, but a migration is irreversible or in place. Split it into expand/contract steps, or publish it as not backward compatible' };
  }

  let version = str(input.version, 64);
  let nationId: string | undefined;
  let baseVersion: string | undefined;
  const deliversRequests = Array.isArray(input.deliversRequests) ? [...new Set(input.deliversRequests)] : [];

  if (channel === 'global') {
    if (input.nationId) return { error: 'A global release goes to every nation; leave the nation empty' };
    if (deliversRequests.length) return { error: 'Feature requests are delivered in nation builds, not global releases' };
    const v = parseVersion(version);
    if (!v) return { error: 'Version must be a semantic version, e.g. 1.5.0' };
    if (/\+/.test(version)) return { error: 'Global versions carry no build suffix' };
    if (db.releases.some(r => r.channel === 'global' && compareVersions(r.version, version) === 0)) return { error: `Global ${version} is already published` };
  } else {
    const n = input.nationId ? nationById(input.nationId) : undefined;
    if (!n) return { error: 'Choose the nation this build is for' };
    nationId = n.id;
    baseVersion = str(input.baseVersion, 64);
    if (!db.releases.some(r => r.channel === 'global' && r.version === baseVersion)) {
      return { error: 'A nation build is made on a published global version; choose its base' };
    }
    const taken = db.releases.filter(r => r.nationId === n.id && baseOf(r.version) === baseVersion).map(r => parseVersion(r.version)?.build ?? 0);
    const expectedNext = `${baseVersion}+sov.${Math.max(0, ...taken) + 1}`;
    if (!version) version = expectedNext;
    const pv = parseVersion(version);
    if (!pv || baseOf(version) !== baseVersion || pv.build < 1) return { error: `Nation build versions look like ${expectedNext}` };
    if (db.releases.some(r => r.nationId === n.id && r.version === version)) return { error: `${version} is already published for this nation` };
    for (const id of deliversRequests) {
      const q = db.requests.find(x => x.id === id);
      if (!q || q.nationId !== n.id) return { error: `Request ${id} does not belong to this nation` };
      if (q.stage !== 'ready') return { error: `Request ${id} is ${q.stage}; only requests marked ready can be delivered` };
    }
  }

  const minCompatibleVersion = str(input.minCompatibleVersion, 64);
  if (!isVersion(minCompatibleVersion)) return { error: 'Minimum compatible version must be a semantic version' };
  if (gt(minCompatibleVersion, version)) return { error: 'Minimum compatible version cannot be newer than the release' };

  if (input.platformReleaseId) {
    const p = listReleases().find(x => x.id === input.platformReleaseId);
    if (!p) return { error: 'Platform release not found' };
    if (p.channel !== 'stable') return { error: 'Only releases promoted to stable in the platform pipeline can be distributed' };
    if (compareVersions(p.version, baseOf(version)) !== 0) return { error: `Platform release ${p.version} does not match ${version}` };
  }

  const months = Number(input.supportMonths ?? 18);
  if (!Number.isFinite(months) || months < 1 || months > 120) return { error: 'Support window must be 1–120 months' };
  const by = str(input.by, 80) || 'Release engineering';
  const releasedAt = new Date().toISOString();
  const support = new Date(releasedAt);
  support.setMonth(support.getMonth() + Math.round(months));

  const id = `DR-${digest(`${channel}:${nationId ?? ''}:${version}:${releasedAt}`, 6).toUpperCase()}`;
  const r: DistributionRelease = {
    id,
    version, channel, nationId, baseVersion, title, summary,
    severity: input.severity as ReleaseSeverity,
    recommended: input.recommended === true,
    releasedAt, minCompatibleVersion, changes, migrations,
    breakingChanges: (Array.isArray(input.breakingChanges) ? input.breakingChanges : []).map(b => str(b, 400)).filter(Boolean),
    upgradeNotes: str(input.upgradeNotes, 2000) || 'No special steps.',
    rollbackNotes: str(input.rollbackNotes, 2000) || (migrations.every(m => m.reversible) ? 'Reversible: redeploy the previous version.' : 'Contains an irreversible migration; see the migration notes.'),
    supportUntil: support.toISOString(),
    delivery: delivery as DeliveryMode[],
    artifacts: artifactsFor(version, delivery as DeliveryMode[], id),
    deliversRequests,
    platformReleaseId: input.platformReleaseId || undefined,
    publishedBy: by,
    rollout: channel === 'global' && input.rollout === 'pilot' ? 'pilot' : 'general',
    status: 'active',
    compatibleWithPrevious: compatible,
  };
  db.releases.push(r);
  // Publishing only makes a release available. No nation's state changes.
  // Officials who subscribed hear about it (security or releases).
  for (const n of db.nations) if (visibleTo(r, n.id)) alert(n.id, r.severity === 'security' || r.severity === 'critical' ? 'security' : 'releases', `${r.version} is available: ${r.title}`, r.id);
  recordAudit(by, 'update.publish', `Release:${version}${nationId ? `@${nationId}` : ''}`, 'ok', `${channel} · ${r.severity}${r.recommended ? ' · recommended' : ''}${r.rollout === 'pilot' ? ' · pilot ring' : ''}${compatible ? '' : ' · not backward compatible'}`);
  for (const id of deliversRequests) {
    const q = db.requests.find(x => x.id === id)!;
    q.history.push({ at: releasedAt, by, from: q.stage, to: 'delivered', note: `Delivered in ${version}` });
    q.stage = 'delivered';
    q.deliveredIn = r.id;
    q.targetVersion = version;
    recordAudit(by, 'update.request.deliver', `FeatureRequest:${id}@${q.nationId}`, 'ok', version);
  }
  return r;
}

export function enrolNation(input: { name?: string; iso3?: string; deliveryMode?: string; installedVersion?: string; ring?: string; currency?: string; language?: string; by?: string }): SubscribedNation | { error: string } {
  const name = str(input.name, 120);
  if (name.length < 2) return { error: 'Name the nation or deployment' };
  const iso3 = str(input.iso3, 3).toUpperCase();
  if (iso3 && !/^[A-Z]{3}$/.test(iso3)) return { error: 'Country must be an ISO 3166-1 alpha-3 code' };
  if (!DELIVERY_MODES.includes(input.deliveryMode as DeliveryMode)) return { error: `Delivery mode must be one of: ${DELIVERY_MODES.join(', ')}` };
  const installedVersion = str(input.installedVersion, 64);
  if (!isVersion(installedVersion)) return { error: 'Installed version must be a semantic version' };
  const db = udb();
  if (db.nations.some(n => n.name.toLowerCase() === name.toLowerCase())) return { error: 'That nation is already enrolled' };
  const installedRelease = db.releases.find(r => r.channel === 'global' && r.version === installedVersion);
  const n: SubscribedNation = {
    id: `nat-${digest(`${name}:${Date.now()}`, 6)}`, name, iso3: iso3 || undefined,
    deliveryMode: input.deliveryMode as DeliveryMode, channelKey: channelKey(),
    installedVersion, installedReleaseId: installedRelease?.id, history: [],
    enrolledAt: new Date().toISOString(),
    lkg: { version: installedVersion, releaseId: installedRelease?.id },
    settings: { ...DEFAULT_SETTINGS, ring: input.ring === 'pilot' ? 'pilot' : 'general' },
    currency: /^[A-Z]{3}$/.test(str(input.currency, 3).toUpperCase()) ? str(input.currency, 3).toUpperCase() : undefined,
    estate: { servers: 0, endpoints: 0 },
    language: /^[a-z]{2,3}$/.test(str(input.language, 3).toLowerCase()) ? str(input.language, 3).toLowerCase() : undefined,
  };
  db.nations.push(n);
  recordAudit(str(input.by, 80) || 'Release engineering', 'update.nation.enrol', `UpdateChamber:${n.id}`, 'ok', `${name} · ${n.deliveryMode} · ${installedVersion}`);
  return viewNation(n);
}

export function publisherOverview(): PublisherOverview {
  const db = udb();
  const releases = [...db.releases].sort(byVersionDesc);
  const installs: PublisherOverview['installs'] = {};
  const nations = db.nations.map(raw => {
    const visible = releases.filter(r => visibleTo(r, raw.id));
    installs[raw.id] = Object.fromEntries(visible.map(r => [r.id, installOf(raw.id, r.id).state]));
    const pending = visible.filter(r => gt(r.version, raw.installedVersion) && !['installed', 'skipped'].includes(installOf(raw.id, r.id).state));
    return {
      ...viewNation(raw),
      openRequests: db.requests.filter(q => q.nationId === raw.id && q.stage !== 'delivered' && q.stage !== 'declined').length,
      available: pending.length,
      securityPending: pending.filter(r => r.severity === 'security' || r.severity === 'critical').length,
    };
  });
  const distributed = new Set(db.releases.map(r => r.platformReleaseId).filter(Boolean));
  const globals = new Set(db.releases.filter(r => r.channel === 'global').map(r => r.version));
  const promotable = listReleases()
    .filter(p => p.channel === 'stable' && !distributed.has(p.id) && !globals.has(p.version))
    .map(p => ({ id: p.id, version: p.version, notes: p.notes }));
  return {
    nations,
    releases: releases.map(r => ({ ...r, stats: releaseStats(r.id) })),
    incidents: [...db.incidents].sort((a, b) => b.openedAt.localeCompare(a.openedAt)).map(i => ({ ...i, nationName: viewNation(nationById(i.nationId)!).name })),
    requests: [...db.requests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    installs,
    promotable,
    publisherKey: PUBLISHER_KEY,
  };
}

// ── Downloads ────────────────────────────────────────────────────────
/**
 * The download behind a nation's link. In this build no binaries are
 * hosted: it returns an honest manifest describing the artifact, its
 * checksum and signature, flagged as a placeholder. A nation can only fetch
 * artifacts of releases it is allowed to see.
 */
export function downloadManifest(nationId: string, artifactId: string, by = 'download link'): Record<string, unknown> | undefined {
  const n = nationById(nationId);
  if (!n) return undefined;
  for (const r of udb().releases) {
    if (!visibleTo(r, nationId)) continue;
    const a = r.artifacts.find(x => x.id === artifactId);
    if (!a) continue;
    recordAudit(by, 'update.download', `UpdateChamber:${nationId}/${r.version}`, 'ok', a.filename);
    return {
      placeholder: true,
      notice: 'Placeholder manifest. This environment does not host release binaries; in production this link serves the signed file named below from the distribution store.',
      release: { id: r.id, version: r.version, channel: r.channel, title: r.title, releasedAt: r.releasedAt },
      artifact: {
        id: a.id, kind: a.kind, label: a.label, filename: a.filename, ref: a.ref, platform: a.platform,
        sizeBytes: a.sizeBytes, sha256: a.sha256, signature: a.signature,
      },
      verify: verifyCommands(a),
      publisherKey: PUBLISHER_KEY,
    };
  }
  return undefined;
}

/** Plain verification steps for government IT staff. */
export function verifyCommands(a: Pick<ReleaseArtifact, 'filename' | 'sha256' | 'ref' | 'signature'>): string[] {
  if (a.signature.method === 'cosign' && a.ref) {
    return [`cosign verify --key ${PUBLISHER_KEY.cosignKey} ${a.ref}`];
  }
  return [
    `echo "${a.sha256}  ${a.filename}" | sha256sum --check`,
    `gpg --import ${PUBLISHER_KEY.gpgKey}`,
    `gpg --verify ${a.signature.signatureFile ?? `${a.filename}.asc`} ${a.filename}`,
  ];
}

// ── Resilience: restore points, probation, fallback ─────────────────
function runningProbation(n: SubscribedNation): Probation | undefined {
  if (!n.installedReleaseId) return undefined;
  const i = udb().installs[n.id]?.[n.installedReleaseId];
  return i?.state === 'probation' && i.probation && (i.probation.state === 'running' || i.probation.state === 'awaiting-decision') ? i.probation : undefined;
}

function takeRestorePoint(n: SubscribedNation, target: DistributionRelease, by: string, at: string): RestorePoint {
  const irreversible = target.migrations.filter(m => !m.reversible || m.pattern === 'in-place');
  const notes = [
    `Data restore replaces the whole database with this snapshot (${at}): everything written after it — payments, applications, registrations — is lost.`,
    ...(irreversible.length
      ? irreversible.map(m => `“${m.description}” is not backward compatible: if ${target.version} fails, you decide whether to switch back; it is never automatic.`)
      : [`${target.version} is backward compatible (expand/contract): if it fails, the software switches back to ${n.installedVersion} automatically and data is untouched.`]),
  ];
  return {
    id: `RP-${digest(`${n.id}:${target.id}:${at}`, 6).toUpperCase()}`,
    version: n.installedVersion,
    releaseId: n.installedReleaseId,
    createdAt: at,
    createdBy: by,
    sizeBytes: sizeFor(`${n.id}:${at}`, 4e9, 24e9),
    // Simulated: the snapshot is re-read and its checksum compared before it counts.
    verified: true,
    contents: ['Database snapshot (point-in-time, encrypted)', 'Configuration bundle and secret references', `Release artifacts of ${n.installedVersion}`],
    restoreNotes: notes,
  };
}

function startProbation(n: SubscribedNation, r: DistributionRelease, lkg: { version: string; releaseId?: string }, rp: RestorePoint, at: string): Probation {
  const minutes = n.settings.probationMinutes;
  const baseline = { errorRatePct: 0.4, latencyMs: 240 };
  return {
    releaseId: r.id, version: r.version, lkgVersion: lkg.version, lkgReleaseId: lkg.releaseId, restorePointId: rp.id,
    startedAt: at, endsAt: new Date(Date.parse(at) + minutes * 60_000).toISOString(), minutes, state: 'running',
    baseline, thresholds: { errorRatePct: 2, latencyMs: Math.round(baseline.latencyMs * 1.5), consecutiveFailures: 3, silenceMinutes: 3 },
    reports: [], failedChecks: [], failStreak: 0, degraded: false,
  };
}

const CRITICAL = new Set(HEALTH_CHECKS.filter(c => c.critical).map(c => c.key));
const label = (k: HealthCheckKey) => HEALTH_CHECKS.find(c => c.key === k)?.label ?? k;

/**
 * Evaluate one report (or a missed one). Returns the checks that justify a
 * fallback, or [] to keep watching. One bad report marks the release
 * degraded; fallback needs `consecutiveFailures` bad reports in a row, or
 * two independent critical checks failing together (confirmed).
 */
function evaluate(p: Probation, report: HealthReport): HealthCheckKey[] {
  if (report.source === 'silence') {
    p.failStreak++;
    p.degraded = true;
    return p.failStreak >= p.thresholds.consecutiveFailures ? ['liveness'] : [];
  }
  const failedCritical = report.checks.filter(c => CRITICAL.has(c.key) && !c.ok).map(c => c.key);
  const breach = report.checks.filter(c =>
    (c.key === 'error-rate' && (!c.ok || (c.value ?? 0) > p.thresholds.errorRatePct)) ||
    (c.key === 'latency' && (!c.ok || (c.value ?? 0) > p.thresholds.latencyMs))).map(c => c.key);
  const bad = [...new Set([...failedCritical, ...breach])];
  if (!bad.length) { p.failStreak = 0; p.degraded = false; return []; }
  p.failStreak++;
  p.degraded = true;
  if (new Set(failedCritical).size >= 2) return bad; // confirmed by independent checks
  return p.failStreak >= p.thresholds.consecutiveFailures ? bad : [];
}

/**
 * evaluate(), and the first time a probation turns degraded (and is not
 * failing yet), alert the nation's officials named for incidents (register 3.10).
 */
function evaluateFor(nationId: string, p: Probation, report: HealthReport): HealthCheckKey[] {
  const failed = evaluate(p, report);
  if (p.degraded && !failed.length && !p.degradedAlertAt) {
    p.degradedAlertAt = report.at;
    const bad = report.source === 'silence' ? 'no report from the deployment agent' : report.checks.filter(c => !c.ok).map(c => label(c.key)).join(', ') || 'thresholds exceeded';
    alert(nationId, 'incidents', `${p.version} is degraded on probation (${bad}); watching, fallback after ${p.thresholds.consecutiveFailures} bad reports in a row`, `probation:${p.releaseId}`, Date.parse(report.at));
  }
  return failed;
}

function installRecord(n: SubscribedNation, releaseId: string): NationInstall | undefined {
  return udb().installs[n.id]?.[releaseId];
}

/**
 * Restore the last known good release. The target is always the LKG
 * recorded when the install started — never anything newer — and it must
 * match the nation's recorded LKG.
 */
function restoreLkg(n: SubscribedNation, r: DistributionRelease, inst: NationInstall, trigger: 'automatic' | 'approved', by: string, at: string, incident?: FallbackIncident): { ok: true } | { error: string } {
  const p = inst.probation;
  if (!p) return { error: 'No probation record' };
  if (n.installedReleaseId !== r.id) return { error: 'This release is no longer running' };
  if (!n.lkg || n.lkg.version !== p.lkgVersion) return { error: 'The recorded last known good release does not match; use break-glass restore' };
  if (!gt(r.version, p.lkgVersion)) return { error: 'Fallback only moves back to an older, known good version' };
  const top = n.history[n.history.length - 1];
  if (top && top.version === p.lkgVersion) n.history.pop();
  n.installedVersion = p.lkgVersion;
  n.installedReleaseId = p.lkgReleaseId;
  p.state = 'failed';
  p.concludedAt = at;
  // Software only. The data restore point stays untouched and available.
  const how = inst.mode === 'saas' ? 'traffic switched back (blue-green)' : inst.mode === 'air-gapped' ? 'previous release started from the restore kit' : 'switched back to the standby A/B slot';
  if (incident) {
    incident.state = 'restored';
    incident.trigger = trigger;
    incident.timeline.push({ at, text: `${trigger === 'automatic' ? 'Automatic fallback' : `Fallback approved by ${by}`}: software switched back to ${p.lkgVersion}; ${how}; data untouched (restore point ${p.restorePointId} kept for a separate decision)` });
  }
  return { ok: true };
}

function openIncident(n: SubscribedNation, r: DistributionRelease, p: Probation, failed: HealthCheckKey[], at: string, detail: string): FallbackIncident {
  const inc: FallbackIncident = {
    id: `INC-U-${digest(`${n.id}:${r.id}:${at}`, 5).toUpperCase()}`, nationId: n.id, releaseId: r.id,
    fromVersion: r.version, toVersion: p.lkgVersion, restorePointId: p.restorePointId, trigger: 'automatic',
    state: 'awaiting-decision', failedChecks: failed, openedAt: at,
    timeline: [
      { at: p.startedAt, text: `${r.version} installed; probation started (${p.minutes} min)` },
      { at, text: `Probation failed: ${failed.map(label).join(', ')}${detail ? ` — ${detail}` : ''}` },
    ],
  };
  udb().incidents.push(inc);
  p.incidentId = inc.id;
  // Every fallback incident opens a P2 support ticket automatically.
  const t = openTicketForIncident(inc, Date.parse(at));
  inc.timeline.push({ at, text: `Support ticket ${t.id} opened automatically (P2)` });
  alert(n.id, 'incidents', `Probation failed for ${r.version}: ${failed.map(label).join(', ')}`, inc.id, Date.parse(at));
  return inc;
}

/** Probation failed: fall back automatically, or wait for the nation if it asked to decide. */
function failProbation(n: SubscribedNation, r: DistributionRelease, inst: NationInstall, failed: HealthCheckKey[], at: string, detail: string): void {
  const p = inst.probation!;
  p.failedChecks = failed;
  const inc = openIncident(n, r, p, failed, at, detail);
  if (n.settings.fallback === 'automatic' && !r.compatibleWithPrevious) {
    inc.timeline.push({ at, text: `${r.version} is not backward compatible with ${p.lkgVersion}: no automatic switch back, whatever the setting` });
  }
  if (n.settings.fallback === 'automatic' && r.compatibleWithPrevious) {
    const res = restoreLkg(n, r, inst, 'automatic', SYSTEM_ACTOR, at, inc);
    if ('error' in res) { p.state = 'awaiting-decision'; inc.timeline.push({ at, text: `Automatic fallback refused: ${res.error}` }); return; }
    alert(n.id, 'incidents', `Automatic fallback: software switched back from ${r.version} to ${p.lkgVersion}; data untouched`, inc.id, Date.parse(at));
    const a = recordAudit(SYSTEM_ACTOR, 'update.fallback', `UpdateChamber:${n.id}/${r.version}`, 'ok',
      `automatic · failed=${failed.join(',')} · now=${n.installedVersion} · restore=${p.restorePointId} · incident=${inc.id}`);
    inc.auditSeq = a.seq;
    inst.events.push({ at, by: SYSTEM_ACTOR, action: 'fallback', from: 'probation', to: 'fallen-back', note: `Probation failed: ${failed.map(label).join(', ')}. Restored ${p.lkgVersion}`, auditSeq: a.seq });
    inst.state = 'fallen-back';
  } else {
    p.state = 'awaiting-decision';
    inc.timeline.push({ at, text: 'Waiting for the nation’s decision: fall back or keep (setting: ask before falling back)' });
    const a = recordAudit(SYSTEM_ACTOR, 'update.probation.fail', `UpdateChamber:${n.id}/${r.version}`, 'ok', `failed=${failed.join(',')} · awaiting decision · incident=${inc.id}`);
    inc.auditSeq = a.seq;
  }
}

function passProbation(n: SubscribedNation, r: DistributionRelease, inst: NationInstall, at: string): void {
  const p = inst.probation!;
  p.state = 'passed';
  p.concludedAt = at;
  inst.state = 'installed';
  n.lkg = { version: r.version, releaseId: r.id };
  const a = recordAudit(SYSTEM_ACTOR, 'update.probation.pass', `UpdateChamber:${n.id}/${r.version}`, 'ok', `${p.reports.length} reports · ${r.version} is last known good`);
  inst.events.push({ at, by: SYSTEM_ACTOR, action: 'install', from: 'probation', to: 'installed', note: `Probation passed (${p.minutes} min); ${r.version} is now last known good`, auditSeq: a.seq });
}

function simulatedReport(p: Probation, t: number): HealthReport {
  const u = (k: string) => parseInt(digest(`${p.releaseId}:${t}:${k}`, 6), 16) / 0xffffff;
  const checks: HealthCheck[] = HEALTH_CHECKS.map(c => {
    if (c.key === 'error-rate') return { key: c.key, ok: true, value: Math.round((p.baseline.errorRatePct * (0.6 + u('e') * 0.8)) * 100) / 100 };
    if (c.key === 'latency') return { key: c.key, ok: true, value: Math.round(p.baseline.latencyMs * (0.9 + u('l') * 0.25)) };
    if (c.key === 'audit-chain') return { key: c.key, ok: verifyAuditChain().ok };
    return { key: c.key, ok: true };
  });
  return { at: new Date(t).toISOString(), source: 'simulated', checks, ok: checks.every(c => c.ok) };
}

function pushReport(p: Probation, rep: HealthReport, nationId: string) {
  p.reports.push(rep);
  // Evaluation stays local; the report reaches the publisher only if the nation shares health reports.
  if (rep.source !== 'silence') {
    transmit(nationId, 'health-reports', `${p.version} · ${rep.ok ? 'healthy' : `failed: ${rep.checks.filter(c => !c.ok).map(c => c.key).join(', ')}`}`,
      { releaseId: p.releaseId, version: p.version, at: rep.at, ok: rep.ok, checks: rep.checks.map(c => ({ key: c.key, ok: c.ok, value: c.value })) }, Date.parse(rep.at));
  }
  if (p.reports.length > 120) p.reports.splice(0, p.reports.length - 120);
}

/**
 * The watchdog. For every probation still running: fill in simulated health
 * (prototype), treat a silent deployment agent as a failure, and pass the
 * release when its window ends healthy. Never installs anything newer.
 */
export interface WatchdogSummary {
  at: string;
  nations: number;
  /** Probations still running after this pass. */
  watching: { nationId: string; version: string; degraded: boolean }[];
  passed: { nationId: string; version: string }[];
  fellBack: { nationId: string; from: string; to: string }[];
  awaitingDecision: { nationId: string; version: string }[];
  /** Health reports recorded as missing in this pass. */
  missingReports: number;
}

export function superviseProbations(now = Date.now()): WatchdogSummary {
  superviseStaging(now);
  issueDueNotices(udb().releases, now);
  const out: WatchdogSummary = { at: new Date(now).toISOString(), nations: udb().nations.length, watching: [], passed: [], fellBack: [], awaitingDecision: [], missingReports: 0 };
  for (const n of udb().nations) {
    if (!n.installedReleaseId) continue;
    const inst = installRecord(n, n.installedReleaseId);
    const p = inst?.probation;
    if (!inst || inst.state !== 'probation' || !p || p.state !== 'running') continue;
    const r = udb().releases.find(x => x.id === p.releaseId)!;
    const conclude = () => {
      if (inst.state === 'fallen-back') out.fellBack.push({ nationId: n.id, from: r.version, to: n.installedVersion });
      else if (p.state === 'awaiting-decision') out.awaitingDecision.push({ nationId: n.id, version: r.version });
      else if (p.state === 'passed') out.passed.push({ nationId: n.id, version: r.version });
      else if (p.state === 'running') out.watching.push({ nationId: n.id, version: r.version, degraded: p.degraded });
    };
    const start = Date.parse(p.startedAt), end = Date.parse(p.endsAt);
    const horizon = Math.min(now, end);
    if (n.settings.healthSource === 'simulated') {
      const last = p.reports.length ? Date.parse(p.reports[p.reports.length - 1]!.at) : start;
      for (let t = last + 60_000; t <= horizon; t += 60_000) {
        const rep = simulatedReport(p, t);
        pushReport(p, rep, n.id);
        const failed = evaluateFor(n.id, p, rep);
        if (failed.length) { failProbation(n, r, inst, failed, rep.at, 'simulated health'); break; }
      }
      if (p.state !== 'running') { conclude(); continue; }
    } else {
      // Each silent interval since the last report (agent or recorded silence) counts as one missed report.
      const interval = p.thresholds.silenceMinutes * 60_000;
      let last = p.reports.length ? Date.parse(p.reports[p.reports.length - 1]!.at) : start;
      while (horizon - last >= interval && p.state === 'running') {
        last += interval;
        const at = new Date(last).toISOString();
        const rep: HealthReport = { at, source: 'silence', checks: [{ key: 'liveness', ok: false, detail: `No report from the deployment agent for ${p.thresholds.silenceMinutes} minutes` }], ok: false };
        pushReport(p, rep, n.id);
        out.missingReports++;
        const failed = evaluateFor(n.id, p, rep);
        if (failed.length) failProbation(n, r, inst, failed, at, `no report from the deployment agent for ${p.thresholds.silenceMinutes * p.thresholds.consecutiveFailures} minutes`);
      }
      if (p.state !== 'running') { conclude(); continue; }
    }
    if (now >= end) passProbation(n, r, inst, new Date(end).toISOString());
    conclude();
  }
  return out;
}

/** The nation's deployment agent reports health for the release on probation. */
export function reportHealth(nationId: string, input: { checks?: unknown; at?: string }, now = Date.now()): { probation: Probation; install: NationInstall } | { error: string; status: number } {
  const n = nationById(nationId);
  if (!n) return { error: 'Nation not found', status: 404 };
  superviseProbations(now);
  if (!Array.isArray(input.checks) || !input.checks.length) return { error: 'checks must be a non-empty list of { key, ok, value? }', status: 422 };
  const keys = new Set(HEALTH_CHECKS.map(c => c.key));
  const checks: HealthCheck[] = [];
  for (const c of input.checks as Record<string, unknown>[]) {
    if (!c || !keys.has(c.key as HealthCheckKey) || typeof c.ok !== 'boolean') return { error: `Each check needs a key (${[...keys].join(', ')}) and ok: true|false`, status: 422 };
    if (c.value !== undefined && !Number.isFinite(Number(c.value))) return { error: 'value must be a number', status: 422 };
    checks.push({ key: c.key as HealthCheckKey, ok: c.ok, value: c.value === undefined ? undefined : Number(c.value), detail: typeof c.detail === 'string' ? c.detail.slice(0, 200) : undefined });
  }
  const inst = n.installedReleaseId ? installRecord(n, n.installedReleaseId) : undefined;
  const p = inst?.probation;
  if (!inst || inst.state !== 'probation' || !p || p.state !== 'running') return { error: 'No release is on probation; health reports are accepted during probation only', status: 409 };
  const r = udb().releases.find(x => x.id === p.releaseId)!;
  const at = new Date(now).toISOString();
  const rep: HealthReport = { at, source: 'agent', checks, ok: checks.every(c => c.ok) };
  pushReport(p, rep, n.id);
  const failed = evaluateFor(n.id, p, rep);
  if (failed.length) failProbation(n, r, inst, failed, at, checks.filter(c => failed.includes(c.key)).map(c => c.detail).filter(Boolean).join('; '));
  return { probation: p, install: inst };
}

export function acknowledgeIncident(nationId: string, incidentId: string, by: string): FallbackIncident | { error: string; status: number } {
  const inc = udb().incidents.find(i => i.id === incidentId && i.nationId === nationId);
  if (!inc) return { error: 'Incident not found', status: 404 };
  if (!by.trim()) return { error: 'Name the person acknowledging', status: 422 };
  if (inc.acknowledgedAt) return { error: 'Already acknowledged', status: 409 };
  inc.acknowledgedAt = new Date().toISOString();
  inc.acknowledgedBy = by.trim();
  recordAudit(by.trim(), 'update.incident.acknowledge', `UpdateChamber:${nationId}/${inc.id}`, 'ok', `${inc.fromVersion} → ${inc.toVersion}`);
  return inc;
}

/**
 * Break-glass — the worst case: the running release is broken and probation
 * is over. Two named people switch the software back to the version the
 * restore point protects. Data is not touched here either; restoring the
 * snapshot remains restoreData(). Audited with both names.
 */
export function breakGlass(nationId: string, input: { by?: string; secondBy?: string; reason?: string }): { incident: FallbackIncident; chamber: UpdateChamber } | { error: string; status: number } {
  const n = nationById(nationId);
  if (!n) return { error: 'Nation not found', status: 404 };
  const by = (input.by ?? '').trim(), second = (input.secondBy ?? '').trim(), reason = (input.reason ?? '').trim();
  if (!by || !second) return { error: 'Break-glass needs two named people', status: 422 };
  if (by.toLowerCase() === second.toLowerCase()) return { error: 'The second person must be someone else (dual control)', status: 422 };
  if (reason.length < 20) return { error: 'Describe the failure (at least 20 characters)', status: 422 };
  const rid = n.installedReleaseId;
  const inst = rid ? installRecord(n, rid) : undefined;
  const rp = inst?.restorePoint;
  if (!rid || !inst || !rp || !rp.verified) return { error: 'No verified restore point protects the running release; restore from your own backups and record it with a rollback', status: 409 };
  const r = udb().releases.find(x => x.id === rid)!;
  const at = new Date().toISOString();
  const top = n.history[n.history.length - 1];
  if (top && top.version === rp.version) n.history.pop();
  n.installedVersion = rp.version;
  n.installedReleaseId = rp.releaseId;
  n.lkg = { version: rp.version, releaseId: rp.releaseId };
  if (inst.probation && (inst.probation.state === 'running' || inst.probation.state === 'awaiting-decision')) { inst.probation.state = 'ended'; inst.probation.concludedAt = at; }
  const from = inst.state;
  inst.state = 'rolled-back';
  const a = recordAudit(`${by} + ${second}`, 'update.break-glass', `UpdateChamber:${nationId}/${r.version}`, 'ok', `software now ${rp.version} · data untouched · ${reason}`);
  inst.events.push({ at, by: `${by} + ${second}`, action: 'rollback', from, to: 'rolled-back', note: `Break-glass: software switched back to ${rp.version}: ${reason}`, auditSeq: a.seq });
  const inc: FallbackIncident = {
    id: `INC-U-${digest(`${nationId}:bg:${at}`, 5).toUpperCase()}`, nationId, releaseId: r.id, fromVersion: r.version, toVersion: rp.version,
    restorePointId: rp.id, trigger: 'break-glass', state: 'restored', failedChecks: [], openedAt: at, auditSeq: a.seq,
    timeline: [
      { at, text: `Break-glass by ${by} and ${second}: software switched back to ${rp.version}. ${reason}` },
      { at, text: `Data untouched. Restore point ${rp.id} (${rp.createdAt}) remains available as a separate decision.` },
    ],
  };
  udb().incidents.push(inc);
  const t = openTicketForIncident(inc, Date.parse(at));
  inc.timeline.push({ at, text: `Support ticket ${t.id} opened automatically (P2)` });
  alert(nationId, 'incidents', `Break-glass: software switched back to ${rp.version}`, inc.id, Date.parse(at));
  const chamber = getChamber(nationId);
  if ('error' in chamber) return { error: chamber.error, status: 500 };
  return { incident: inc, chamber };
}

export function updateSettings(nationId: string, patch: Partial<ResilienceSettings> & { estate?: { servers?: number; endpoints?: number } }, by: string): SubscribedNation | { error: string } {
  const n = nationById(nationId);
  if (!n) return { error: 'Nation not found' };
  if (!by.trim()) return { error: 'Name the person changing the settings' };
  const next = { ...n.settings };
  if (patch.probationMinutes !== undefined) {
    const m = Number(patch.probationMinutes);
    if (!Number.isInteger(m) || m < 5 || m > 1440) return { error: 'Probation must be 5–1440 minutes' };
    next.probationMinutes = m;
  }
  if (patch.fallback !== undefined) { if (patch.fallback !== 'automatic' && patch.fallback !== 'ask') return { error: 'Fallback must be automatic or ask' }; next.fallback = patch.fallback; }
  if (patch.healthSource !== undefined) { if (patch.healthSource !== 'simulated' && patch.healthSource !== 'agent') return { error: 'Health source must be simulated or agent' }; next.healthSource = patch.healthSource; }
  if (patch.ring !== undefined) { if (patch.ring !== 'pilot' && patch.ring !== 'general') return { error: 'Ring must be pilot or general' }; next.ring = patch.ring; }
  if (patch.definitionsPolicy !== undefined) { if (patch.definitionsPolicy !== 'automatic' && patch.definitionsPolicy !== 'manual') return { error: 'Definitions policy must be automatic or manual' }; next.definitionsPolicy = patch.definitionsPolicy; }
  if (patch.stagingRequired !== undefined) { if (typeof patch.stagingRequired !== 'boolean') return { error: 'Staging policy must be on or off' }; next.stagingRequired = patch.stagingRequired; }
  let estate = n.estate;
  if (patch.estate) {
    const sv = Number(patch.estate.servers ?? n.estate.servers), ep = Number(patch.estate.endpoints ?? n.estate.endpoints);
    if (![sv, ep].every(v => Number.isInteger(v) && v >= 0 && v <= 1_000_000)) return { error: 'Estate sizes must be whole numbers' };
    estate = { servers: sv, endpoints: ep };
  }
  const changed = (Object.keys(next) as (keyof ResilienceSettings)[]).filter(k => next[k] !== n.settings[k]).map(k => `${k}=${next[k]}`);
  if (estate !== n.estate) changed.push(`estate=${estate.servers}/${estate.endpoints}`);
  n.settings = next;
  n.estate = estate;
  recordAudit(by.trim(), 'update.settings', `UpdateChamber:${nationId}`, 'ok', changed.join(' · ') || 'no change');
  return viewNation(n);
}

// ── Publisher safety: halt, resume, withdraw, promote ────────────────
export function setReleaseStatus(id: string, input: { action?: string; reason?: string; by?: string }): DistributionRelease | { error: string; status: number } {
  const r = udb().releases.find(x => x.id === id);
  if (!r) return { error: 'Release not found', status: 404 };
  const by = str(input.by, 80) || 'Release engineering';
  const reason = str(input.reason, 400);
  const at = new Date().toISOString();
  let status: ReleaseStatus = r.status;
  switch (input.action) {
    case 'halt':
      if (r.status !== 'active') return { error: `Release is ${r.status}`, status: 409 };
      if (reason.length < 10) return { error: 'Say why the release is halted (at least 10 characters)', status: 422 };
      status = 'halted'; break;
    case 'resume':
      if (r.status !== 'halted') return { error: 'Only a halted release can be resumed', status: 409 };
      status = 'active'; break;
    case 'withdraw':
      if (r.status === 'withdrawn') return { error: 'Already withdrawn', status: 409 };
      if (reason.length < 10) return { error: 'Say why the release is withdrawn (at least 10 characters)', status: 422 };
      status = 'withdrawn'; break;
    case 'promote':
      if (r.rollout !== 'pilot') return { error: 'Only a pilot-ring release can be promoted', status: 409 };
      if (r.status !== 'active') return { error: `Release is ${r.status}`, status: 409 };
      r.rollout = 'general';
      recordAudit(by, 'update.release.promote', `Release:${r.version}`, 'ok', 'pilot → general availability');
      return r;
    default:
      return { error: 'Action must be halt, resume, withdraw or promote', status: 422 };
  }
  r.status = status;
  r.statusReason = status === 'active' ? undefined : reason;
  r.statusAt = at;
  const running = udb().nations.filter(n => n.installedReleaseId === r.id).length;
  recordAudit(by, `update.release.${input.action}`, `Release:${r.version}`, 'ok', `${reason || 'resumed'}${running ? ` · ${running} nation(s) running it advised to fall back` : ''}`);
  return r;
}

export function releaseStats(releaseId: string): ReleaseHealthStats {
  let installs = 0, probations = 0, passed = 0, fallbacks = 0;
  for (const per of Object.values(udb().installs)) {
    const i = per[releaseId];
    if (!i || !i.events.some(e => e.action === 'install')) continue;
    installs++;
    if (i.probation || i.events.some(e => e.to === 'probation')) probations++;
    if (i.state === 'fallen-back' || i.events.some(e => e.action === 'fallback')) fallbacks++;
    else if (i.state === 'installed') passed++;
  }
  return { installs, probations, passed, fallbacks, failureRate: installs ? Math.round((fallbacks / installs) * 100) : 0 };
}

/**
 * Restore the data snapshot — the last resort, never automatic. Needs a
 * named person, the software already back on the snapshot's version, and
 * explicit acknowledgement that everything written since the snapshot is
 * lost.
 */
export function restoreData(nationId: string, releaseId: string, input: { by?: string; acknowledgeLoss?: boolean }): { restorePoint: RestorePoint; chamber: UpdateChamber } | { error: string; status: number } {
  const n = nationById(nationId);
  if (!n) return { error: 'Nation not found', status: 404 };
  const r = udb().releases.find(x => x.id === releaseId);
  if (!r || !visibleTo(r, nationId)) return { error: 'Release not found', status: 404 };
  const inst = installRecord(n, releaseId);
  const rp = inst?.restorePoint;
  if (!inst || !rp) return { error: 'No restore point was taken for this release', status: 404 };
  if (!rp.verified) return { error: 'The restore point is not verified', status: 409 };
  if (rp.restoredAt) return { error: `Already restored on ${rp.restoredAt}`, status: 409 };
  const by = (input.by ?? '').trim();
  if (!by || by.length > 80) return { error: 'Name the person restoring the data', status: 422 };
  if (n.installedVersion !== rp.version) {
    return { error: `The snapshot belongs to ${rp.version}; switch the software back to it first (fallback or rollback)`, status: 409 };
  }
  if (input.acknowledgeLoss !== true) {
    return { error: `Restoring discards everything written since ${rp.createdAt}. Acknowledge the loss to continue`, status: 422 };
  }
  const at = new Date().toISOString();
  rp.restoredAt = at;
  const a = recordAudit(by, 'update.restore-data', `UpdateChamber:${nationId}/${rp.id}`, 'ok', `database restored to snapshot of ${rp.createdAt} (${rp.version}); data written after it discarded`);
  inst.events.push({ at, by, action: 'rollback', from: inst.state, to: inst.state, note: `Data restored from ${rp.id} (snapshot ${rp.createdAt}); later data discarded`, auditSeq: a.seq });
  const inc = [...udb().incidents].reverse().find(i => i.nationId === nationId && i.releaseId === releaseId);
  if (inc) {
    inc.dataRestored = { at, by, snapshotAt: rp.createdAt };
    inc.timeline.push({ at, text: `${by} restored the data snapshot of ${rp.createdAt}; data written after it was discarded` });
  }
  const chamber = getChamber(nationId);
  if ('error' in chamber) return { error: chamber.error, status: 500 };
  return { restorePoint: rp, chamber };
}

// ── Deployment-agent credential ──────────────────────────────────────
// The agent that reports probation health authenticates with its own
// per-nation credential — never a user session or the distribution link.
// Issued (or rotated) from the nation's settings page and shown once; only
// its SHA-256 hash is stored. Format: cag_<prefix>_<secret>.
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

export function issueAgentCredential(nationId: string, by: string): { credential: string; prefix: string; issuedAt: string; rotated: boolean } | { error: string; status: number } {
  const n = nationById(nationId);
  if (!n) return { error: 'Nation not found', status: 404 };
  const who = by.trim();
  if (!who || who.length > 80) return { error: 'Name the person issuing the credential', status: 422 };
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  const prefix = hex.slice(0, 8);
  const credential = `cag_${prefix}_${hex.slice(8)}`;
  const prev = udb().agentKeys[nationId];
  const issuedAt = new Date().toISOString();
  udb().agentKeys[nationId] = { hash: sha256(credential), prefix, issuedAt, issuedBy: who, rotations: prev ? prev.rotations + 1 : 0 };
  recordAudit(who, prev ? 'update.agent.rotate' : 'update.agent.issue', `UpdateChamber:${nationId}/agent`, 'ok', prev ? `cag_${prev.prefix}… revoked; cag_${prefix}… issued` : `cag_${prefix}… issued`);
  return { credential, prefix, issuedAt, rotated: !!prev };
}

/** The nation a deployment-agent credential belongs to, or null. Constant-time comparison. */
export function nationForAgent(credential: string | null | undefined): SubscribedNation | null {
  const m = /^cag_([0-9a-f]{8})_[0-9a-f]{40}$/.exec((credential ?? '').trim());
  if (!m) return null;
  const want = Buffer.from(sha256(credential!.trim()), 'hex');
  for (const [nationId, k] of Object.entries(udb().agentKeys)) {
    if (k.prefix !== m[1]) continue;
    const have = Buffer.from(k.hash, 'hex');
    if (have.length === want.length && timingSafeEqual(have, want)) return nationById(nationId) ?? null;
  }
  return null;
}

/** A release this nation may see (for readiness, advisories and other per-release routes). */
/** Every release, global and nation builds (server-side callers only; never sent to a nation). */
export function allReleases(): DistributionRelease[] { return [...udb().releases]; }

export function releaseFor(nationId: string, releaseId: string): DistributionRelease | undefined {
  const r = udb().releases.find(x => x.id === releaseId);
  return r && visibleTo(r, nationId) ? r : undefined;
}
