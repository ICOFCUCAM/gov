// CivicOS — Sovereign Update Center (release distribution), server-side.
//
// The platform pipeline in ./store (createRelease → promoteRelease →
// deployments) builds a version and promotes it to `stable`. This module is
// the distribution layer after it: the publisher publishes a promoted
// version to every nation (global channel), or makes a build for one nation
// from that nation's feature requests (nation channel). Each nation sees
// only global releases and its own builds, through its own private link.
//
// Never automatic: nothing in this module changes a nation's install state
// except an explicit decision by a named person (decide()). There are no
// timers; reading the chamber never moves anything; publishing a release
// makes it *available* and nothing more. Every decision is written to the
// shared audit chain (recordAudit in ./store).
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
} from '@/lib/api/types';
import { recordAudit, getSovereign, getSetup, listMinistries, listReleases } from './store';
import { compareVersions, gt, gte, isVersion, parseVersion, baseOf } from '@/lib/updates/semver';

export const HOME_NATION = 'home';
export const DELIVERY_MODES: DeliveryMode[] = ['saas', 'self-hosted', 'air-gapped'];
export const SEVERITIES: ReleaseSeverity[] = ['security', 'critical', 'feature', 'maintenance'];
export const CHANGE_KINDS: ChangeKind[] = ['feature', 'fix', 'security', 'breaking', 'deprecation'];
export const PRIORITIES: FeatureRequestPriority[] = ['low', 'normal', 'high', 'urgent'];
/** The visible pipeline a feature request moves along. */
export const REQUEST_FLOW: FeatureRequestStage[] = ['requested', 'under-review', 'scoped', 'in-development', 'ready', 'delivered'];
export const INSTALL_ACTIONS: InstallAction[] = ['approve', 'schedule', 'unschedule', 'install', 'skip', 'reconsider', 'rollback'];

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
  }
  if (delivery.includes('air-gapped')) {
    add({ kind: 'offline-bundle', label: 'Offline installation bundle', mode: 'air-gapped', filename: `civicos-${tag}-offline-bundle.tar`, platform: 'linux/amd64', sizeBytes: sizeFor(`${version}off`, 5.2e9, 7.4e9) });
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

  const rel = (r: Omit<DistributionRelease, 'artifacts' | 'supportUntil' | 'publishedBy'> & { supportMonths?: number }): DistributionRelease => {
    const { supportMonths, ...rest } = r;
    return { ...rest, supportUntil: months(r.releasedAt, supportMonths ?? 18), artifacts: artifactsFor(r.version, r.delivery, r.id), publishedBy: 'Release engineering' };
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
      migrations: [{ id: 'M-130-1', kind: 'database', description: 'Adds municipality onboarding tables', reversible: true, estimatedMinutes: 4 }],
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
        { id: 'M-140-1', kind: 'database', description: 'Adds service-level columns to permits and an index on the audit chain', reversible: true, estimatedMinutes: 12 },
        { id: 'M-140-2', kind: 'data', description: 'Back-fills service-level start times for open permits', reversible: false, estimatedMinutes: 20 },
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
      migrations: [{ id: 'M-141H-1', kind: 'configuration', description: 'Installs the bilingual certificate template set', reversible: true, estimatedMinutes: 2 }],
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
  ];

  const ev = (at: string, by: string, action: InstallAction, from: InstallState, to: InstallState, extra: Partial<InstallEvent> = {}): InstallEvent =>
    ({ at, by, action, from, to, ...extra });

  const nations: SubscribedNation[] = [
    {
      id: HOME_NATION, name: '', deliveryMode: 'self-hosted', channelKey: channelKey(),
      installedVersion: '1.4.0', installedReleaseId: 'DR-140',
      history: [{ version: '1.3.0', releaseId: 'DR-130', at: days(-140) }],
      enrolledAt: days(-200), home: true,
    },
    {
      id: 'sandbox', name: 'Pre-production sandbox', deliveryMode: 'saas', channelKey: channelKey(),
      installedVersion: '1.4.1', installedReleaseId: 'DR-141',
      history: [{ version: '1.4.0', releaseId: 'DR-140', at: days(-30) }],
      enrolledAt: days(-90),
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
        ev(days(-33), 'Platform operations', 'install', 'approved', 'installed', { mode: 'self-hosted', note: 'Checksums and signatures verified' }),
      ] },
    },
    sandbox: {
      'DR-140': { releaseId: 'DR-140', state: 'installed', mode: 'saas', events: [ev(days(-31), 'Sandbox owner', 'install', 'approved', 'installed', { mode: 'saas' })] },
      'DR-141': { releaseId: 'DR-141', state: 'installed', mode: 'saas', events: [ev(days(-4), 'Sandbox owner', 'install', 'approved', 'installed', { mode: 'saas' })] },
    },
  };

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

  return { nations, releases, installs, requests, requestSeq: 1003 };
}

const g = globalThis as unknown as { __civicosUpdates?: UpdatesDb };
function udb(): UpdatesDb {
  return (g.__civicosUpdates ??= seedUpdates());
}

/** Test hook: start again from the seed. */
export function resetUpdates(): void {
  g.__civicosUpdates = seedUpdates();
}

// ── Nations and isolation ────────────────────────────────────────────
/** The installed nation wears its live identity; before setup it is neutral. */
function viewNation(n: SubscribedNation): SubscribedNation {
  if (!n.home) return { ...n, history: [...n.history] };
  const s = getSovereign();
  const configured = !!getSetup();
  return { ...n, history: [...n.history], name: configured ? s.stateName : 'This installation', iso3: configured ? s.iso3 : undefined };
}

function nationById(id: string): SubscribedNation | undefined {
  return udb().nations.find(n => n.id === id);
}

/** Resolve whose chamber a request is for: a private link key, or the installed nation. */
export function resolveNation(link?: string | null): SubscribedNation | null {
  if (link) return udb().nations.find(n => n.channelKey === link) ?? null;
  return nationById(HOME_NATION) ?? null;
}

/** The isolation rule: global releases, plus builds made for this nation. */
export function visibleTo(r: DistributionRelease, nationId: string): boolean {
  return r.channel === 'global' || r.nationId === nationId;
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
      .filter(r => gt(r.version, cur) && gte(cur, r.minCompatibleVersion) && r.install?.state !== 'skipped')
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
  };
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
const TRANSITIONS: Record<InstallAction, { from: InstallState[]; to: InstallState }> = {
  approve: { from: ['available', 'rolled-back'], to: 'approved' },
  schedule: { from: ['approved', 'scheduled'], to: 'scheduled' },
  unschedule: { from: ['scheduled'], to: 'approved' },
  install: { from: ['approved', 'scheduled'], to: 'installed' },
  skip: { from: ['available', 'approved', 'scheduled'], to: 'skipped' },
  reconsider: { from: ['skipped'], to: 'available' },
  rollback: { from: ['installed'], to: 'rolled-back' },
};

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

export type DecisionResult = { install: NationInstall; chamber: UpdateChamber } | { error: string; status: number };

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

  const event: InstallEvent = { at: new Date().toISOString(), by, action: input.action, from: cur.state, to: rule.to, note };
  const next: NationInstall = { ...cur, events: [...cur.events] };

  switch (input.action) {
    case 'approve':
      if (!gt(r.version, n.installedVersion)) return { error: `Already running ${n.installedVersion}; ${r.version} is not newer`, status: 409 };
      break;
    case 'schedule': {
      if (!r.delivery.includes('saas')) return { error: 'This release is not offered as a hosted upgrade; download it instead', status: 422 };
      const w = input.window;
      const start = w ? Date.parse(w.start) : NaN, end = w ? Date.parse(w.end) : NaN;
      if (!Number.isFinite(start) || !Number.isFinite(end)) return { error: 'Choose a maintenance window with a start and an end', status: 422 };
      if (start < Date.now() - 60_000) return { error: 'The maintenance window must start in the future', status: 422 };
      if (end <= start) return { error: 'The window must end after it starts', status: 422 };
      if (end - start > MAX_WINDOW_HOURS * 3600_000) return { error: `A maintenance window can be at most ${MAX_WINDOW_HOURS} hours`, status: 422 };
      next.window = { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
      next.mode = 'saas';
      event.window = next.window;
      event.mode = 'saas';
      break;
    }
    case 'unschedule':
      next.window = undefined;
      break;
    case 'install': {
      const mode = input.mode ?? (cur.state === 'scheduled' ? 'saas' : n.deliveryMode);
      if (!DELIVERY_MODES.includes(mode) || !r.delivery.includes(mode)) return { error: `This release is not offered for ${mode} delivery`, status: 422 };
      if (mode !== 'saas' && input.verified !== true) {
        return { error: 'Confirm that the checksums and signatures were verified before recording the install', status: 422 };
      }
      if (!gt(r.version, n.installedVersion)) return { error: `Already running ${n.installedVersion}; ${r.version} is not newer`, status: 409 };
      if (!gte(n.installedVersion, r.minCompatibleVersion)) {
        return { error: `${r.version} needs ${r.minCompatibleVersion} or later installed first; this nation runs ${n.installedVersion}`, status: 409 };
      }
      n.history.push({ version: n.installedVersion, releaseId: n.installedReleaseId, at: event.at });
      n.installedVersion = r.version;
      n.installedReleaseId = r.id;
      next.mode = mode;
      next.window = undefined;
      event.mode = mode;
      break;
    }
    case 'skip':
      if ((r.severity === 'security' || r.severity === 'critical') && (!note || note.length < 10)) {
        return { error: `Skipping a ${r.severity} release needs a recorded reason (at least 10 characters)`, status: 422 };
      }
      next.window = undefined;
      break;
    case 'reconsider':
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
      break;
    }
  }

  next.state = rule.to;
  const detail = [
    event.mode && `mode=${event.mode}`,
    event.window && `window=${event.window.start}→${event.window.end}`,
    input.action === 'rollback' && `now=${n.installedVersion}`,
    note,
  ].filter(Boolean).join(' · ') || undefined;
  const audit = recordAudit(by, `update.${input.action}`, `UpdateChamber:${nationId}/${r.version}`, 'ok', detail);
  event.auditSeq = audit.seq;
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
  migrations?: { kind?: string; description?: string; reversible?: boolean; estimatedMinutes?: number }[];
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
    migrations.push({ id: `M-${i + 1}`, kind: m.kind as ReleaseMigration['kind'], description, reversible: m.reversible !== false, estimatedMinutes: Math.round(mins) });
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
  };
  db.releases.push(r);
  // Publishing only makes a release available. No nation's state changes.
  recordAudit(by, 'update.publish', `Release:${version}${nationId ? `@${nationId}` : ''}`, 'ok', `${channel} · ${r.severity}${r.recommended ? ' · recommended' : ''}`);
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

export function enrolNation(input: { name?: string; iso3?: string; deliveryMode?: string; installedVersion?: string; by?: string }): SubscribedNation | { error: string } {
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
    releases,
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
