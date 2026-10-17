import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetUpdates, getChamber, getChamberRelease, decide, submitRequest, advanceRequest,
  publishRelease, enrolNation, publisherOverview, downloadManifest, upgradePath, resolveNation,
  HOME_NATION, type PublishInput,
} from './updates';
import { listAudit, verifyAuditChain } from './store';
import { resetSecurity, registerByo } from './security-store';
import { nationRecord } from './updates';
import type { UpdateChamber } from '@/lib/api/types';

const chamber = (id = HOME_NATION): UpdateChamber => {
  const c = getChamber(id);
  if ('error' in c) throw new Error(c.error);
  return c;
};
const stateOf = (nation: string, releaseId: string) => chamber(nation).releases.find(r => r.id === releaseId)?.install.state;
const lastAudit = () => listAudit()[0]!;
const future = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

const nationBuild = (over: Partial<PublishInput> = {}): PublishInput => ({
  channel: 'nation', nationId: HOME_NATION, baseVersion: '1.4.1', title: 'Offline permit intake',
  summary: 'Field offices take permits offline and sync later.', severity: 'feature', minCompatibleVersion: '1.4.0',
  changes: [{ kind: 'feature', text: 'Offline permit intake' }], delivery: ['saas', 'self-hosted'], by: 'Release engineering',
  ...over,
});

beforeEach(() => { resetUpdates(); resetSecurity(); });

/** Estate-wide BYO attestation: satisfies the security rule for platform releases. */
const coverHome = () => {
  const t = registerByo(nationRecord(HOME_NATION)!, { product: 'Own EDR', vendor: 'National CERT', version: '4.1', category: 'edr', servers: 48, endpoints: 1250, lastScanAt: new Date().toISOString(), attestation: 'Full estate scan, no critical findings outstanding.', scope: 'estate', by: 'Head of Cyber Security' });
  if ('error' in t) throw new Error(t.error);
};

describe('nation isolation', () => {
  it('each nation sees global releases plus only its own builds', () => {
    const home = chamber(HOME_NATION);
    const sandbox = chamber('sandbox');
    expect(home.releases.every(r => r.channel === 'global' || r.nationId === HOME_NATION)).toBe(true);
    expect(sandbox.releases.every(r => r.channel === 'global' || r.nationId === 'sandbox')).toBe(true);
    expect(home.releases.map(r => r.id)).toContain('DR-141-H1');
    expect(home.releases.map(r => r.id)).not.toContain('DR-141-S1');
    expect(sandbox.releases.map(r => r.id)).not.toContain('DR-141-H1');
  });

  it('requests are scoped to the nation that made them', () => {
    expect(chamber(HOME_NATION).requests.every(q => q.nationId === HOME_NATION)).toBe(true);
    expect(chamber('sandbox').requests.map(q => q.id)).toEqual(expect.arrayContaining(['FR-2001']));
    expect(chamber(HOME_NATION).requests.map(q => q.id)).not.toContain('FR-2001');
  });

  it('a nation cannot open, decide on or download another nation’s build', () => {
    expect(getChamberRelease(HOME_NATION, 'DR-141-S1')).toBeUndefined();
    const r = decide(HOME_NATION, 'DR-141-S1', { action: 'approve', by: 'CIO' });
    expect(r).toMatchObject({ status: 404 });
    const sandboxArtifact = getChamberRelease('sandbox', 'DR-141-S1')!.artifacts[0]!;
    expect(downloadManifest(HOME_NATION, sandboxArtifact.id)).toBeUndefined();
    expect(downloadManifest('sandbox', sandboxArtifact.id)).toMatchObject({ placeholder: true });
  });

  it('links resolve to exactly one nation; unknown links resolve to none', () => {
    const sandbox = chamber('sandbox').nation;
    expect(resolveNation(sandbox.channelKey)?.id).toBe('sandbox');
    expect(resolveNation('nk_not-a-real-key')).toBeNull();
    expect(resolveNation(null)?.id).toBe(HOME_NATION);
  });

  it('before setup the installed nation is described neutrally', () => {
    expect(chamber().nation.name).toBe('This installation');
  });
});

describe('installed version and upgrade path', () => {
  it('shows what is installed, what is newer, and the shortest compatible path', () => {
    const c = chamber();
    expect(c.installed).toBe('1.4.0');
    expect(c.latest).toBe('1.4.1+sov.1');
    expect(c.releases.filter(r => r.newer).map(r => r.version)).toEqual(['1.4.1+sov.1', '1.4.1']);
    // The nation build already contains 1.4.1, so one step reaches the latest.
    expect(c.upgradePath).toEqual(['DR-141-H1']);
    expect(c.releases.find(r => r.id === 'DR-130')!.superseded).toBe(true);
  });

  it('walks through intermediate versions when a release needs a newer minimum', () => {
    const rels = chamber().releases;
    expect(upgradePath('1.3.0', rels).map(id => rels.find(r => r.id === id)!.version)).toEqual(['1.4.0', '1.4.1+sov.1']);
    expect(upgradePath('1.2.0', rels).map(id => rels.find(r => r.id === id)!.version)).toEqual(['1.3.0', '1.4.0', '1.4.1+sov.1']);
  });

  it('leaves skipped releases out of the path', () => {
    decide(HOME_NATION, 'DR-141-H1', { action: 'skip', by: 'CIO', note: 'Waiting for the registry to sign off' });
    expect(chamber().upgradePath).toEqual(['DR-141']);
  });
});

describe('never automatic', () => {
  it('reading the chamber and publishing a release change no nation’s state', () => {
    const before = JSON.stringify(chamber().releases.map(r => [r.id, r.install.state]));
    chamber(); chamber('sandbox'); publisherOverview();
    const pub = publishRelease({ ...nationBuild(), channel: 'global', nationId: undefined, baseVersion: undefined, version: '1.4.2', severity: 'security', recommended: true });
    expect('error' in pub).toBe(false);
    const after = chamber();
    expect(JSON.stringify(after.releases.filter(r => r.version !== '1.4.2').map(r => [r.id, r.install.state]))).toBe(before);
    expect(after.installed).toBe('1.4.0');
    // Even a recommended security release arrives only as available.
    expect(after.releases.find(r => r.version === '1.4.2')!.install.state).toBe('available');
    expect(chamber('sandbox').releases.find(r => r.version === '1.4.2')!.install.state).toBe('available');
  });

  it('cannot install without an approval first', () => {
    const r = decide(HOME_NATION, 'DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true });
    expect(r).toMatchObject({ status: 409 });
    expect(stateOf(HOME_NATION, 'DR-141')).toBe('available');
  });

  it('review → approve → schedule → install, each written to the audit chain', () => {
    expect(decide(HOME_NATION, 'DR-141-H1', { action: 'approve', by: 'Chief Information Officer', note: 'Registry signed off' })).not.toHaveProperty('error');
    expect(lastAudit()).toMatchObject({ action: 'update.approve', actor: 'Chief Information Officer', resource: `UpdateChamber:${HOME_NATION}/1.4.1+sov.1` });

    const window = { start: future(24), end: future(26) };
    const s = decide(HOME_NATION, 'DR-141-H1', { action: 'schedule', by: 'CIO', window });
    if ('error' in s) throw new Error(s.error);
    expect(s.install.state).toBe('scheduled');
    expect(s.install.window).toEqual({ start: new Date(window.start).toISOString(), end: new Date(window.end).toISOString() });
    expect(lastAudit().action).toBe('update.schedule');
    // Scheduling installs nothing.
    expect(chamber().installed).toBe('1.4.0');

    coverHome();
    expect(decide(HOME_NATION, 'DR-141-H1', { action: 'prepare', by: 'Platform operations' })).not.toHaveProperty('error');
    const i = decide(HOME_NATION, 'DR-141-H1', { action: 'install', by: 'Platform operations' });
    if ('error' in i) throw new Error(i.error);
    expect(i.chamber.installed).toBe('1.4.1+sov.1');
    expect(i.install.state).toBe('probation');
    expect(i.install.events.map(e => e.action)).toEqual(['approve', 'schedule', 'prepare', 'install']);
    expect(i.install.events.every(e => typeof e.auditSeq === 'number')).toBe(true);
    expect(lastAudit().action).toBe('update.install');
    expect(verifyAuditChain().ok).toBe(true);
  });

  it('self-hosted installs require the team to confirm checksums and signatures', () => {
    decide(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' });
    decide(HOME_NATION, 'DR-141', { action: 'prepare', by: 'Ops' });
    expect(decide(HOME_NATION, 'DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted' })).toMatchObject({ status: 422 });
    const ok = decide(HOME_NATION, 'DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true });
    expect(ok).not.toHaveProperty('error');
    expect(chamber().installed).toBe('1.4.1');
  });

  it('rejects windows in the past, inverted or too long', () => {
    decide(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' });
    expect(decide(HOME_NATION, 'DR-141', { action: 'schedule', by: 'CIO', window: { start: future(-5), end: future(-3) } })).toMatchObject({ status: 422 });
    expect(decide(HOME_NATION, 'DR-141', { action: 'schedule', by: 'CIO', window: { start: future(5), end: future(3) } })).toMatchObject({ status: 422 });
    expect(decide(HOME_NATION, 'DR-141', { action: 'schedule', by: 'CIO', window: { start: future(5), end: future(200) } })).toMatchObject({ status: 422 });
    expect(stateOf(HOME_NATION, 'DR-141')).toBe('approved');
  });

  it('security releases can be skipped, but only with a recorded reason', () => {
    expect(decide(HOME_NATION, 'DR-141', { action: 'skip', by: 'CIO' })).toMatchObject({ status: 422 });
    const r = decide(HOME_NATION, 'DR-141', { action: 'skip', by: 'CIO', note: 'Taking the nation build instead, which contains it' });
    expect(r).not.toHaveProperty('error');
    expect(stateOf(HOME_NATION, 'DR-141')).toBe('skipped');
    expect(lastAudit()).toMatchObject({ action: 'update.skip' });
    expect(decide(HOME_NATION, 'DR-141', { action: 'reconsider', by: 'CIO' })).not.toHaveProperty('error');
    expect(stateOf(HOME_NATION, 'DR-141')).toBe('available');
  });

  it('refuses to install over an incompatible version', () => {
    const n = enrolNation({ name: 'Legacy deployment', deliveryMode: 'self-hosted', installedVersion: '1.2.0' });
    if ('error' in n) throw new Error(n.error);
    decide(n.id, 'DR-141', { action: 'approve', by: 'CIO' });
    const r = decide(n.id, 'DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true });
    expect(r).toMatchObject({ status: 409 });
    if ('error' in r) expect(r.error).toMatch(/1\.4\.0 or later/);
  });

  it('rolls back only the running release, to the version before it, with a reason', () => {
    expect(decide(HOME_NATION, 'DR-130', { action: 'rollback', by: 'Ops', note: 'Not the running release' })).toMatchObject({ status: 409 });
    expect(decide(HOME_NATION, 'DR-140', { action: 'rollback', by: 'Ops' })).toMatchObject({ status: 422 });
    // 1.4.0 ran an irreversible back-fill: the team must acknowledge it.
    expect(decide(HOME_NATION, 'DR-140', { action: 'rollback', by: 'Ops', note: 'Service-level clocks misfired' })).toMatchObject({ status: 422 });
    const r = decide(HOME_NATION, 'DR-140', { action: 'rollback', by: 'Ops', note: 'Service-level clocks misfired', acknowledge: true });
    if ('error' in r) throw new Error(r.error);
    expect(r.chamber.installed).toBe('1.3.0');
    expect(stateOf(HOME_NATION, 'DR-140')).toBe('rolled-back');
    expect(lastAudit()).toMatchObject({ action: 'update.rollback' });
    expect(lastAudit().detail).toMatch(/now=1\.3\.0/);
  });

  it('rejects unknown actions and anonymous decisions', () => {
    expect(decide(HOME_NATION, 'DR-141', { action: 'approve', by: '  ' })).toMatchObject({ status: 422 });
    expect(decide(HOME_NATION, 'DR-141', { action: 'auto' as never, by: 'CIO' })).toMatchObject({ status: 422 });
  });
});

describe('feature requests', () => {
  it('a nation submits a request that starts at requested and is audited', () => {
    const q = submitRequest(HOME_NATION, { title: 'Land titles API', description: 'Expose land titles to the courts registry.', priority: 'high', institution: 'Lands office', by: 'Registrar' });
    if ('error' in q) throw new Error(q.error);
    expect(q.stage).toBe('requested');
    expect(lastAudit()).toMatchObject({ action: 'update.request.submit' });
    expect(chamber().requests[0]!.id).toBe(q.id);
    expect(chamber('sandbox').requests.map(x => x.id)).not.toContain(q.id);
  });

  it('validates submissions', () => {
    expect(submitRequest(HOME_NATION, { title: 'x', description: 'Too short title', priority: 'high', institution: 'A', by: 'B' })).toHaveProperty('error');
    expect(submitRequest(HOME_NATION, { title: 'Valid title', description: 'Valid description here', priority: 'whenever', institution: 'A', by: 'B' })).toHaveProperty('error');
  });

  it('moves one stage at a time; delivered only by publishing a nation build', () => {
    expect(advanceRequest('FR-1003', { to: 'scoped' })).toHaveProperty('error');
    expect(advanceRequest('FR-1003', { to: 'under-review' })).toMatchObject({ stage: 'under-review' });
    expect(advanceRequest('FR-1003', { to: 'delivered' })).toHaveProperty('error');
    expect(advanceRequest('FR-1002', { to: 'ready', targetVersion: '1.4.1+sov.2' })).toMatchObject({ stage: 'ready' });

    const r = publishRelease(nationBuild({ deliversRequests: ['FR-1002'] }));
    if ('error' in r) throw new Error(r.error);
    expect(r.version).toBe('1.4.1+sov.2');
    const q = chamber().requests.find(x => x.id === 'FR-1002')!;
    expect(q.stage).toBe('delivered');
    expect(q.deliveredIn).toBe(r.id);
  });

  it('declining needs a reason', () => {
    expect(advanceRequest('FR-1003', { to: 'declined' })).toHaveProperty('error');
    expect(advanceRequest('FR-1003', { to: 'declined', note: 'Covered by the national ledger integration' })).toMatchObject({ stage: 'declined' });
  });
});

describe('publishing', () => {
  it('validates the release', () => {
    expect(publishRelease(nationBuild({ channel: 'beta' }))).toHaveProperty('error');
    expect(publishRelease(nationBuild({ nationId: 'nowhere' }))).toHaveProperty('error');
    expect(publishRelease(nationBuild({ baseVersion: '9.9.9' }))).toHaveProperty('error');
    expect(publishRelease(nationBuild({ minCompatibleVersion: '2.0.0' }))).toHaveProperty('error');
    expect(publishRelease(nationBuild({ delivery: [] }))).toHaveProperty('error');
    expect(publishRelease(nationBuild({ changes: [] }))).toHaveProperty('error');
    // Another nation's request cannot be closed by this nation's build.
    advanceRequest('FR-2001', { to: 'scoped' });
    expect(publishRelease(nationBuild({ deliversRequests: ['FR-2001'] }))).toHaveProperty('error');
    // A request that is not ready cannot be delivered.
    expect(publishRelease(nationBuild({ deliversRequests: ['FR-1003'] }))).toHaveProperty('error');
    // Global releases go to everyone, never carry a nation or a build suffix.
    expect(publishRelease(nationBuild({ channel: 'global', version: '1.4.2' }))).toHaveProperty('error');
    expect(publishRelease(nationBuild({ channel: 'global', nationId: undefined, version: '1.4.2+sov.1' }))).toHaveProperty('error');
    expect(publishRelease(nationBuild({ channel: 'global', nationId: undefined, version: '1.4.1' }))).toHaveProperty('error');
  });

  it('ships placeholder artifacts with checksums and signer fingerprints', () => {
    const r = publishRelease(nationBuild({ delivery: ['self-hosted', 'air-gapped'] }));
    if ('error' in r) throw new Error(r.error);
    expect(r.artifacts.length).toBeGreaterThan(5);
    for (const a of r.artifacts) {
      expect(a.placeholder).toBe(true);
      expect(a.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(a.signature.keyFingerprint).toMatch(/^[0-9A-F ]{49}$/);
    }
    expect(r.artifacts.some(a => a.kind === 'offline-bundle')).toBe(true);
    expect(r.artifacts.find(a => a.kind === 'container-image')!.ref).toMatch(/:1\.4\.1_sov\.2@sha256:/);
    expect(publisherOverview().releases.map(x => x.id)).toContain(r.id);
  });

  it('distributes only platform releases promoted to stable', () => {
    const over = publisherOverview();
    expect(over.promotable.every(p => p.id !== 'REL-140')).toBe(true); // already distributed as 1.4.0
    expect(publishRelease({ ...nationBuild(), channel: 'global', nationId: undefined, baseVersion: undefined, version: '1.5.0', platformReleaseId: 'REL-150' })).toHaveProperty('error');
  });

  it('enrols a nation with its own private link', () => {
    const n = enrolNation({ name: 'Island deployment', iso3: 'xyz', deliveryMode: 'air-gapped', installedVersion: '1.4.0' });
    if ('error' in n) throw new Error(n.error);
    expect(n.iso3).toBe('XYZ');
    expect(n.channelKey).toMatch(/^nk_[0-9a-f]{24}$/);
    expect(resolveNation(n.channelKey)?.id).toBe(n.id);
    expect(chamber(n.id).releases.every(r => r.channel === 'global')).toBe(true);
    expect(enrolNation({ name: 'Bad', deliveryMode: 'carrier-pigeon', installedVersion: '1.0.0' })).toHaveProperty('error');
  });
});
