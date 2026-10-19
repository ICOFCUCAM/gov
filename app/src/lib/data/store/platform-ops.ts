// Platform operations: releases, deployments, tenant lifecycle, backups and configuration bundles.
import { createHash } from 'node:crypto';
import type {
  Release,
  ReleaseChannel,
  Deployment,
  DeployStrategy,
  DeployState,
  DeployGate,
  TenantLifecycle,
  TenantState,
  BackupRecord,
  BackupKind,
  ConfigBundle,
  ConfigDrift,
} from '@/lib/api/types';
import { db } from './state';
import { uid, canonicalJson } from './shared';
import { recordAudit } from './audit';

/** Content address of a configuration bundle: `sha256:<hex>` over its canonical JSON. Bundles published before keep their earlier 32-bit hash. */
export function configContentHash(payload: Record<string, unknown>): string {
  return `sha256:${createHash('sha256').update(canonicalJson(payload), 'utf8').digest('hex')}`;
}

// ── Platform operations & lifecycle (mirrors backend state machines) ──
const REL_NEXT: Record<ReleaseChannel, ReleaseChannel | null> = {
  dev: 'staging',
  staging: 'stable',
  stable: null,
};

export function listReleases(): Release[] {
  return [...db.releases].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}
export function createRelease(input: {
  version: string;
  notes: string;
  schemaMigration?: string;
}): Release | { error: string } {
  if (!/^\d+\.\d+\.\d+$/.test(input.version)) {
    return { error: 'version must be semver x.y.z' };
  }
  if (db.releases.some(r => r.version === input.version && r.channel === 'dev')) {
    return { error: 'Version already in DEV' };
  }
  const r: Release = {
    id: uid('REL'),
    version: input.version,
    channel: 'dev',
    notes: input.notes,
    schemaMigration: input.schemaMigration,
    createdAt: new Date().toISOString(),
  };
  db.releases.unshift(r);
  recordAudit('operator', 'release.create', `Release:${r.id}`, 'ok', input.version);
  return r;
}
export function promoteRelease(id: string, by: string): Release | { error: string } {
  const r = db.releases.find(x => x.id === id);
  if (!r) return { error: 'Release not found' };
  const next = REL_NEXT[r.channel];
  if (!next) return { error: 'Already at STABLE' };
  r.channel = next;
  if (next === 'stable') r.approvedBy = by;
  recordAudit(by, 'release.promote', `Release:${id}`, 'ok', `-> ${next}`);
  return r;
}

const DEP_NEXT: Record<DeployState, DeployState | null> = {
  pending: 'precheck',
  precheck: 'rollout',
  rollout: 'verify',
  verify: 'completed',
  completed: null,
  'rolled-back': null,
};

export function listDeployments(): Deployment[] {
  return [...db.deployments].sort(
    (a, b) => +new Date(b.startedAt) - +new Date(a.startedAt),
  );
}
export function startDeployment(
  releaseId: string,
  strategy: DeployStrategy,
): Deployment | { error: string } {
  const rel = db.releases.find(r => r.id === releaseId);
  if (!rel) return { error: 'Release not found' };
  const d: Deployment = {
    id: uid('DEP'),
    releaseId,
    releaseVersion: rel.version,
    strategy,
    state: 'pending',
    gates: [],
    startedAt: new Date().toISOString(),
  };
  db.deployments.unshift(d);
  recordAudit('operator', 'deployment.start', `Deployment:${d.id}`, 'ok', `${rel.version}/${strategy}`);
  return d;
}
export function advanceDeployment(
  id: string,
  by: string,
  gateResult: 'pass' | 'fail',
  note?: string,
): Deployment | { error: string } {
  const d = db.deployments.find(x => x.id === id);
  if (!d) return { error: 'Deployment not found' };
  if (d.state === 'completed' || d.state === 'rolled-back') {
    return { error: `Deployment is ${d.state}` };
  }
  const gate: DeployGate = {
    at: new Date().toISOString(),
    gate: d.state,
    result: gateResult,
    by,
    note,
  };
  d.gates.push(gate);
  if (gateResult === 'fail') {
    d.state = 'rolled-back';
    d.completedAt = new Date().toISOString();
    recordAudit(by, 'deployment.gate-fail', `Deployment:${id}`, 'ok', note);
    return d;
  }
  const next = DEP_NEXT[d.state];
  if (!next) return { error: 'No forward transition' };
  d.state = next;
  if (next === 'completed') d.completedAt = new Date().toISOString();
  recordAudit(by, 'deployment.advance', `Deployment:${id}`, 'ok', `-> ${next}`);
  return d;
}
export function rollbackDeployment(
  id: string,
  by: string,
  note: string,
): Deployment | { error: string } {
  const d = db.deployments.find(x => x.id === id);
  if (!d) return { error: 'Deployment not found' };
  if (d.state === 'completed' || d.state === 'rolled-back') {
    return { error: `Deployment is ${d.state}` };
  }
  d.gates.push({ at: new Date().toISOString(), gate: d.state, result: 'fail', by, note: `rollback: ${note}` });
  d.state = 'rolled-back';
  d.completedAt = new Date().toISOString();
  recordAudit(by, 'deployment.rollback', `Deployment:${id}`, 'ok', note);
  return d;
}

const LIFE_ALLOWED: Record<TenantState, TenantState[]> = {
  provisioning: ['active'],
  active: ['suspended', 'decommissioned'],
  suspended: ['active', 'decommissioned'],
  decommissioned: ['active'],
};
export function getLifecycle(): TenantLifecycle {
  return db.lifecycle;
}
export function transitionTenant(
  to: TenantState,
  reason: string,
  actor: string,
): TenantLifecycle | { error: string } {
  const from = db.lifecycle.state;
  if (from === to) return { error: `Tenant already ${to}` };
  if (!LIFE_ALLOWED[from].includes(to)) {
    return { error: `Illegal transition ${from} -> ${to}` };
  }
  db.lifecycle.state = to;
  db.lifecycle.events.unshift({
    at: new Date().toISOString(),
    from,
    to,
    reason,
    actor,
  });
  recordAudit(actor, 'tenant.transition', `Tenant:${db.lifecycle.tenant}`, 'ok', `${from} -> ${to}`);
  return db.lifecycle;
}

export function listBackups(): BackupRecord[] {
  return [...db.backups].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}
export function createBackup(kind: BackupKind): BackupRecord {
  const b: BackupRecord = {
    id: uid('BK'),
    kind,
    state: 'completed',
    location: `sov://backups/home/${kind}-${Date.now()}.enc`,
    encrypted: true,
    sizeBytes: Math.floor(1_000_000 + Math.random() * 9_000_000),
    createdAt: new Date().toISOString(),
  };
  db.backups.unshift(b);
  recordAudit('operator', 'backup.create', `Backup:${b.id}`, 'ok', kind);
  return b;
}
export function restoreBackup(id: string): BackupRecord | { error: string } {
  const b = db.backups.find(x => x.id === id);
  if (!b) return { error: 'Backup not found' };
  if (b.state !== 'completed') return { error: 'Only COMPLETED backups can be restored' };
  b.state = 'restoring';
  recordAudit('operator', 'backup.restore', `Backup:${id}`, 'ok');
  return b;
}

export function listConfigs(): ConfigBundle[] {
  return [...db.configs].sort((a, b) => b.version - a.version);
}
export function publishConfig(payload: Record<string, unknown>): ConfigBundle {
  const last = db.configs[0];
  const c: ConfigBundle = {
    id: uid('CFG'),
    scope: 'global',
    version: (last?.version ?? 0) + 1,
    contentHash: configContentHash(payload),
    state: 'draft',
    createdAt: new Date().toISOString(),
  };
  db.configs.unshift(c);
  recordAudit('operator', 'config.publish', `Config:${c.id}`, 'ok', `v${c.version}`);
  return c;
}
export function signConfig(id: string, by: string): ConfigBundle | { error: string } {
  const c = db.configs.find(x => x.id === id);
  if (!c) return { error: 'Config not found' };
  if (c.state !== 'draft') return { error: 'Only DRAFT can be signed' };
  c.state = 'signed';
  c.signedBy = by;
  recordAudit(by, 'config.sign', `Config:${id}`, 'ok');
  return c;
}
export function applyConfig(id: string): ConfigBundle | { error: string } {
  const c = db.configs.find(x => x.id === id);
  if (!c) return { error: 'Config not found' };
  if (c.state !== 'signed') return { error: 'Only SIGNED can be applied' };
  db.configs.forEach(x => {
    if (x.state === 'applied') x.state = 'superseded';
  });
  c.state = 'applied';
  recordAudit('operator', 'config.apply', `Config:${id}`, 'ok', `v${c.version}`);
  return c;
}
export function configDrift(): ConfigDrift {
  const applied = db.configs.find(c => c.state === 'applied');
  const signed = db.configs.find(c => c.state === 'signed');
  if (!signed) return { drift: false, reason: 'no newer signed config' };
  if (!applied) return { drift: true, reason: 'signed config never applied' };
  if (signed.version > applied.version) {
    return { drift: true, reason: `applied v${applied.version} != signed v${signed.version}` };
  }
  return { drift: false, reason: 'in sync' };
}
