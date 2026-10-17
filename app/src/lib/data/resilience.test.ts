import { describe, it, expect, beforeEach } from 'vitest';
import { resetReadiness } from '@/lib/data/readiness';
import { stagingOff, cosign } from '@/lib/data/testkit';
import {
  resetUpdates, getChamber, decide, reportHealth, superviseProbations, updateSettings, breakGlass, restoreData,
  setReleaseStatus, releaseStats, acknowledgeIncident, publishRelease, nationRecord, HOME_NATION, SYSTEM_ACTOR, HEALTH_CHECKS,
} from './updates';
import { resetSecurity } from './security-store';
import { listAudit, verifyAuditChain } from './store';
import type { HealthCheck, UpdateChamber } from '@/lib/api/types';

const MIN = 60_000;
/** Audit entries written since a mark (the chain is shared across tests). */
const auditSince = (mark: number) => listAudit().filter(a => a.seq > mark);
const mark = () => listAudit()[0]?.seq ?? 0;
const chamber = (id = HOME_NATION): UpdateChamber => { const c = getChamber(id); if ('error' in c) throw new Error(c.error); return c; };
const stateOf = (releaseId: string, id = HOME_NATION) => chamber(id).releases.find(r => r.id === releaseId)!.install;
const healthy = (): HealthCheck[] => HEALTH_CHECKS.map(c => c.key === 'error-rate' ? { key: c.key, ok: true, value: 0.3 } : c.key === 'latency' ? { key: c.key, ok: true, value: 230 } : { key: c.key, ok: true });
const failing = (...keys: HealthCheck['key'][]): HealthCheck[] => healthy().map(c => keys.includes(c.key) ? { ...c, ok: false, detail: `${c.key} failed` } : c);
/** Two independent critical checks failing together: a confirmed failure. */
const confirmed = () => failing('smoke-sign-in', 'smoke-payments');
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };

/** Approve, take a restore point and install the security release 1.4.1 (backward compatible). */
function installSecurity(settings: Parameters<typeof updateSettings>[1] = {}) {
  ok(updateSettings(HOME_NATION, settings, 'CIO'));
  ok(cosign(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' }));
  ok(decide(HOME_NATION, 'DR-141', { action: 'prepare', by: 'Ops' }));
  const r = ok(cosign(HOME_NATION, 'DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true }));
  return r.install.probation!;
}

beforeEach(() => { resetUpdates(); resetReadiness(); stagingOff(); resetSecurity(); });

describe('restore point before every install', () => {
  it('refuses to install without a verified restore point of the running version', () => {
    ok(cosign(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' }));
    const r = cosign(HOME_NATION, 'DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true });
    expect(r).toMatchObject({ status: 409 });
    if ('error' in r) expect(r.error).toMatch(/restore point/);
  });

  it('records the restore point on the install: id, time, size, verified, contents', () => {
    ok(cosign(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' }));
    const r = ok(decide(HOME_NATION, 'DR-141', { action: 'prepare', by: 'Ops' }));
    const rp = r.install.restorePoint!;
    expect(rp).toMatchObject({ version: '1.4.0', releaseId: 'DR-140', verified: true, createdBy: 'Ops' });
    expect(rp.id).toMatch(/^RP-/);
    expect(rp.sizeBytes).toBeGreaterThan(0);
    expect(rp.contents.join(' ')).toMatch(/Database snapshot/);
    expect(rp.restoreNotes[0]).toMatch(/everything written after it/);
    expect(r.install.state).toBe('approved'); // taking a restore point changes nothing else
  });
});

describe('backward compatibility', () => {
  it('is derived from the migrations and checked at publish', () => {
    expect(chamber().releases.find(r => r.id === 'DR-140')!.compatibleWithPrevious).toBe(false); // in-place back-fill
    expect(chamber().releases.find(r => r.id === 'DR-141')!.compatibleWithPrevious).toBe(true);
    const base = { channel: 'global', version: '1.4.5', title: 'Ledger codes', summary: 'Adds ledger codes to receipts.', severity: 'maintenance', minCompatibleVersion: '1.4.0', changes: [{ kind: 'fix', text: 'x' }], delivery: ['saas'] };
    const bad = publishRelease({ ...base, compatibleWithPrevious: true, migrations: [{ kind: 'data', description: 'Rewrites ledger codes', reversible: false, estimatedMinutes: 5, pattern: 'in-place' }] });
    expect(bad).toHaveProperty('error');
    const good = ok(publishRelease({ ...base, migrations: [{ kind: 'database', description: 'Adds a ledger column', reversible: true, estimatedMinutes: 2, pattern: 'expand' }] }));
    expect(good.compatibleWithPrevious).toBe(true);
  });
});

describe('probation', () => {
  it('starts on install, with the previous release recorded as last known good', () => {
    const p = installSecurity();
    expect(p).toMatchObject({ state: 'running', version: '1.4.1', lkgVersion: '1.4.0', lkgReleaseId: 'DR-140', minutes: 30, degraded: false });
    expect(chamber().probation?.releaseId).toBe('DR-141');
    expect(stateOf('DR-141').state).toBe('probation');
  });

  it('uses the nation’s configured probation length', () => {
    expect(installSecurity({ probationMinutes: 90 }).minutes).toBe(90);
  });

  it('passes at the end of a healthy window and promotes the release to last known good', () => {
    const p = installSecurity();
    superviseProbations(Date.parse(p.endsAt) + MIN);
    expect(stateOf('DR-141').state).toBe('installed');
    expect(stateOf('DR-141').probation!.state).toBe('passed');
    expect(nationRecord(HOME_NATION)!.lkg).toEqual({ version: '1.4.1', releaseId: 'DR-141' });
    expect(listAudit()[0]).toMatchObject({ action: 'update.probation.pass', actor: SYSTEM_ACTOR });
  });

  it('does not pass before the window ends', () => {
    const p = installSecurity();
    superviseProbations(Date.parse(p.startedAt) + 10 * MIN);
    expect(stateOf('DR-141').state).toBe('probation');
    expect(stateOf('DR-141').probation!.reports.length).toBe(10); // simulated health, one per minute
  });
});

describe('no false fallbacks', () => {
  it('one failed critical check marks the release degraded and keeps watching', () => {
    installSecurity({ healthSource: 'agent' });
    const r = ok(reportHealth(HOME_NATION, { checks: failing('smoke-payments') }));
    expect(r.install.state).toBe('probation');
    expect(r.probation).toMatchObject({ state: 'running', degraded: true, failStreak: 1 });
    // Recovery clears the degraded flag.
    const back = ok(reportHealth(HOME_NATION, { checks: healthy() }));
    expect(back.probation).toMatchObject({ degraded: false, failStreak: 0 });
  });

  it('three consecutive failed reports fail probation', () => {
    installSecurity({ healthSource: 'agent' });
    ok(reportHealth(HOME_NATION, { checks: failing('smoke-payments') }));
    ok(reportHealth(HOME_NATION, { checks: failing('smoke-payments') }));
    expect(stateOf('DR-141').state).toBe('probation');
    const r = ok(reportHealth(HOME_NATION, { checks: failing('smoke-payments') }));
    expect(r.probation.failedChecks).toEqual(['smoke-payments']);
    expect(r.install.state).toBe('fallen-back');
  });

  it('two independent critical checks failing together are a confirmed failure', () => {
    installSecurity({ healthSource: 'agent' });
    const r = ok(reportHealth(HOME_NATION, { checks: confirmed() }));
    expect(r.install.state).toBe('fallen-back');
  });

  it('a latency spike is tolerated; a sustained breach fails', () => {
    installSecurity({ healthSource: 'agent' });
    const slow = healthy().map(c => c.key === 'latency' ? { ...c, value: 900 } : c);
    ok(reportHealth(HOME_NATION, { checks: slow }));
    ok(reportHealth(HOME_NATION, { checks: healthy() }));
    ok(reportHealth(HOME_NATION, { checks: slow }));
    ok(reportHealth(HOME_NATION, { checks: slow }));
    expect(stateOf('DR-141').state).toBe('probation');
    const last = ok(reportHealth(HOME_NATION, { checks: slow }));
    expect(last.probation.failedChecks).toEqual(['latency']);
    expect(last.install.state).toBe('fallen-back');
  });

  it('one missing report does not trigger fallback; three in a row do', () => {
    const p = installSecurity({ healthSource: 'agent' });
    superviseProbations(Date.parse(p.startedAt) + 4 * MIN); // one 3-minute interval missed
    expect(stateOf('DR-141').state).toBe('probation');
    expect(stateOf('DR-141').probation).toMatchObject({ degraded: true, failStreak: 1 });
    // The agent comes back: watching ends.
    ok(reportHealth(HOME_NATION, { checks: healthy() }, Date.parse(p.startedAt) + 5 * MIN));
    expect(stateOf('DR-141').probation!.degraded).toBe(false);
    superviseProbations(Date.parse(p.startedAt) + 5 * MIN + 10 * MIN); // three intervals missed
    expect(stateOf('DR-141').state).toBe('fallen-back');
    expect(stateOf('DR-141').probation!.reports.at(-1)!.source).toBe('silence');
  });

  it('health reports are refused when nothing is on probation, and validated', () => {
    expect(reportHealth(HOME_NATION, { checks: healthy() })).toMatchObject({ status: 409 });
    installSecurity({ healthSource: 'agent' });
    expect(reportHealth(HOME_NATION, { checks: [{ key: 'nonsense', ok: true }] })).toMatchObject({ status: 422 });
  });

  it('only one release can be on probation at a time', () => {
    installSecurity();
    ok(cosign(HOME_NATION, 'DR-141-H1', { action: 'approve', by: 'CIO' }));
    ok(decide(HOME_NATION, 'DR-141-H1', { action: 'prepare', by: 'Ops' }));
    expect(cosign(HOME_NATION, 'DR-141-H1', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true })).toMatchObject({ status: 409 });
  });
});

describe('automatic fallback switches software only', () => {
  it('restores the recorded LKG software, leaves data alone, audits and opens an incident', () => {
    const m = mark();
    const p = installSecurity({ healthSource: 'agent' });
    ok(reportHealth(HOME_NATION, { checks: confirmed() }));
    const c = chamber();
    expect(c.installed).toBe('1.4.0');
    expect(c.nation.installedReleaseId).toBe('DR-140');
    const inst = stateOf('DR-141');
    expect(inst.state).toBe('fallen-back');
    // Data untouched: the snapshot was not restored.
    expect(inst.restorePoint!.restoredAt).toBeUndefined();
    const inc = c.incidents[0]!;
    expect(inc).toMatchObject({ trigger: 'automatic', state: 'restored', fromVersion: '1.4.1', toVersion: '1.4.0', restorePointId: p.restorePointId });
    expect(inc.dataRestored).toBeUndefined();
    expect(inc.timeline.map(t => t.text).join(' ')).toMatch(/data untouched/);
    expect(inc.acknowledgedAt).toBeUndefined(); // shown prominently until acknowledged
    const a = listAudit()[0]!;
    expect(a).toMatchObject({ action: 'update.fallback', actor: SYSTEM_ACTOR });
    expect(a.detail).toMatch(/now=1\.4\.0/);
    expect(inc.auditSeq).toBe(a.seq);
    expect(auditSince(m).some(x => x.action === 'update.restore-data')).toBe(false);
    expect(verifyAuditChain().ok).toBe(true);
    // The sandbox installed 1.4.1 cleanly; this nation fell back: one failure in two installs.
    expect(releaseStats('DR-141')).toMatchObject({ installs: 2, fallbacks: 1, failureRate: 50 });
  });

  it('fallback only ever moves to the recorded LKG, never to anything newer', () => {
    const p = installSecurity({ healthSource: 'agent' });
    const before = nationRecord(HOME_NATION)!.lkg!;
    ok(reportHealth(HOME_NATION, { checks: confirmed() }));
    const n = nationRecord(HOME_NATION)!;
    expect(n.installedVersion).toBe(before.version);
    expect(n.installedVersion).toBe(p.lkgVersion);
    for (const r of chamber().releases.filter(x => x.id !== 'DR-141' && x.newer)) expect(['available', 'skipped']).toContain(r.install.state);
  });

  it('refuses an automatic fallback when the recorded LKG does not match, and waits for people', () => {
    installSecurity({ healthSource: 'agent' });
    nationRecord(HOME_NATION)!.lkg = { version: '1.3.0', releaseId: 'DR-130' };
    ok(reportHealth(HOME_NATION, { checks: confirmed() }));
    expect(chamber().installed).toBe('1.4.1');
    expect(stateOf('DR-141').probation!.state).toBe('awaiting-decision');
  });

  it('a fallen-back release is left out of the upgrade path but can be approved again', () => {
    installSecurity({ healthSource: 'agent' });
    ok(reportHealth(HOME_NATION, { checks: confirmed() }));
    expect(chamber().upgradePath).not.toContain('DR-141');
    expect(cosign(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO', note: 'Vendor confirmed fix in our config' })).not.toHaveProperty('error');
  });

  it('incidents are acknowledged by a named person', () => {
    installSecurity({ healthSource: 'agent' });
    ok(reportHealth(HOME_NATION, { checks: confirmed() }));
    const inc = chamber().incidents[0]!;
    expect(acknowledgeIncident(HOME_NATION, inc.id, '')).toMatchObject({ status: 422 });
    expect(acknowledgeIncident(HOME_NATION, inc.id, 'CIO')).toMatchObject({ acknowledgedBy: 'CIO' });
    expect(acknowledgeIncident('sandbox', inc.id, 'CIO')).toMatchObject({ status: 404 });
  });
});

describe('a release that is not backward compatible never falls back automatically', () => {
  it('asks first even when the nation chose automatic fallback', () => {
    // A nation on 1.3.0 installs 1.4.0, which back-fills data in place.
    const n = nationRecord(HOME_NATION)!;
    n.installedVersion = '1.3.0'; n.installedReleaseId = 'DR-130'; n.lkg = { version: '1.3.0', releaseId: 'DR-130' };
    const fresh = ok(publishRelease({ channel: 'global', version: '1.3.9', title: 'In-place back-fill', summary: 'Back-fills data in place.', severity: 'feature', minCompatibleVersion: '1.3.0', changes: [{ kind: 'feature', text: 'x' }], delivery: ['self-hosted'], migrations: [{ kind: 'data', description: 'Back-fills receipts', reversible: false, estimatedMinutes: 9, pattern: 'in-place' }] }));
    expect(fresh.compatibleWithPrevious).toBe(false);
    const m = mark();
    ok(updateSettings(HOME_NATION, { healthSource: 'agent', fallback: 'automatic' }, 'CIO'));
    ok(cosign(HOME_NATION, fresh.id, { action: 'approve', by: 'CIO' }));
    ok(decide(HOME_NATION, fresh.id, { action: 'prepare', by: 'Ops' }));
    ok(cosign(HOME_NATION, fresh.id, { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true }));
    ok(reportHealth(HOME_NATION, { checks: confirmed() }));
    const c = chamber();
    expect(c.installed).toBe('1.3.9');
    expect(c.probation!.state).toBe('awaiting-decision');
    expect(c.incidents[0]!.timeline.map(t => t.text).join(' ')).toMatch(/not backward compatible/);
    expect(auditSince(m).some(a => a.action === 'update.fallback')).toBe(false);
  });
});

describe('restoring data is a separate decision', () => {
  it('needs a named person, the software back on the snapshot version, and acknowledged loss', () => {
    installSecurity({ healthSource: 'agent' });
    // While 1.4.1 runs, the snapshot of 1.4.0 cannot be restored.
    expect(restoreData(HOME_NATION, 'DR-141', { by: 'CIO', acknowledgeLoss: true })).toMatchObject({ status: 409 });
    ok(reportHealth(HOME_NATION, { checks: confirmed() })); // software back on 1.4.0, data untouched
    expect(restoreData(HOME_NATION, 'DR-141', { by: '', acknowledgeLoss: true })).toMatchObject({ status: 422 });
    const noAck = restoreData(HOME_NATION, 'DR-141', { by: 'CIO' });
    expect(noAck).toMatchObject({ status: 422 });
    if ('error' in noAck) expect(noAck.error).toMatch(/discards everything written since/);
    const r = ok(restoreData(HOME_NATION, 'DR-141', { by: 'CIO', acknowledgeLoss: true }));
    expect(r.restorePoint.restoredAt).toBeTruthy();
    expect(r.chamber.incidents[0]!.dataRestored).toMatchObject({ by: 'CIO' });
    expect(listAudit()[0]).toMatchObject({ action: 'update.restore-data', actor: 'CIO' });
    expect(restoreData(HOME_NATION, 'DR-141', { by: 'CIO', acknowledgeLoss: true })).toMatchObject({ status: 409 }); // once
  });
});

describe('ask before falling back', () => {
  it('waits for a decision and does not restore on its own', () => {
    const p = installSecurity({ healthSource: 'agent', fallback: 'ask' });
    ok(reportHealth(HOME_NATION, { checks: confirmed() }));
    superviseProbations(Date.parse(p.endsAt) + 60 * MIN); // time passing changes nothing
    const c = chamber();
    expect(c.installed).toBe('1.4.1');
    expect(c.probation!.state).toBe('awaiting-decision');
    expect(c.incidents[0]!.state).toBe('awaiting-decision');
    expect(listAudit().find(a => a.action.startsWith('update.probation'))!.action).toBe('update.probation.fail');
  });

  it('a person approves the fallback (software only)', () => {
    installSecurity({ healthSource: 'agent', fallback: 'ask' });
    ok(reportHealth(HOME_NATION, { checks: confirmed() }));
    const r = ok(decide(HOME_NATION, 'DR-141', { action: 'fallback', by: 'CIO' }));
    expect(r.chamber.installed).toBe('1.4.0');
    expect(r.install.state).toBe('fallen-back');
    expect(r.install.restorePoint!.restoredAt).toBeUndefined();
    expect(r.chamber.incidents[0]).toMatchObject({ trigger: 'approved', state: 'restored' });
  });

  it('or keeps the release, with a reason, without promoting it to LKG', () => {
    installSecurity({ healthSource: 'agent', fallback: 'ask' });
    ok(reportHealth(HOME_NATION, { checks: confirmed() }));
    expect(decide(HOME_NATION, 'DR-141', { action: 'keep', by: 'CIO' })).toMatchObject({ status: 422 });
    const r = ok(decide(HOME_NATION, 'DR-141', { action: 'keep', by: 'CIO', note: 'Wallet is behind a feature flag; fix tomorrow' }));
    expect(r.install.state).toBe('installed');
    expect(r.chamber.installed).toBe('1.4.1');
    expect(nationRecord(HOME_NATION)!.lkg!.version).toBe('1.4.0');
    expect(r.chamber.incidents[0]!.state).toBe('kept');
  });

  it('fallback/keep are refused when no failed probation is waiting', () => {
    installSecurity();
    expect(decide(HOME_NATION, 'DR-141', { action: 'fallback', by: 'CIO' })).toMatchObject({ status: 409 });
  });
});

describe('never automatic upgrades', () => {
  it('no watchdog run, health report or time passing ever installs a newer version', () => {
    const before = chamber();
    const newer = before.releases.filter(r => r.newer).map(r => [r.id, r.install.state]);
    for (let h = 0; h < 48; h++) superviseProbations(Date.now() + h * 3600_000);
    expect(reportHealth(HOME_NATION, { checks: healthy() })).toMatchObject({ status: 409 });
    const after = chamber();
    expect(after.installed).toBe(before.installed);
    expect(after.releases.filter(r => r.newer).map(r => [r.id, r.install.state])).toEqual(newer);
  });

  it('every install event comes from a named person, never the system', () => {
    const p = installSecurity();
    superviseProbations(Date.parse(p.endsAt) + MIN);
    const installs = stateOf('DR-141').events.filter(e => e.action === 'install' && e.from !== 'probation');
    // Four-eyes: proposed by Ops, carried out by a second official. Never the system.
    expect(installs.map(e => e.by)).toEqual(['Ops', 'Second official']);
  });
});

describe('halt and recall', () => {
  it('a halted release cannot be approved, prepared or installed', () => {
    ok(cosign(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' }));
    ok(setReleaseStatus('DR-141', { action: 'halt', reason: 'Failures reported in pilot nations', by: 'Release engineering' }));
    expect(decide(HOME_NATION, 'DR-141', { action: 'prepare', by: 'Ops' })).toMatchObject({ status: 409 });
    expect(cosign(HOME_NATION, 'DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true })).toMatchObject({ status: 409 });
    expect(cosign(HOME_NATION, 'DR-141-H1', { action: 'approve', by: 'CIO' })).not.toHaveProperty('error');
    expect(chamber().releases.find(r => r.id === 'DR-141')!.blocked).toBe(true);
    expect(chamber().upgradePath).not.toContain('DR-141');
  });

  it('nations already running a halted release are advised to fall back', () => {
    ok(setReleaseStatus('DR-141', { action: 'halt', reason: 'Session rotation breaks SSO for some IdPs', by: 'Release engineering' }));
    expect(chamber('sandbox').advisories).toEqual([expect.objectContaining({ releaseId: 'DR-141', status: 'halted' })]);
    expect(chamber('sandbox').installed).toBe('1.4.1'); // advice, not an action
  });

  it('halt needs a reason; resume and withdraw follow the rules', () => {
    expect(setReleaseStatus('DR-141', { action: 'halt' })).toMatchObject({ status: 422 });
    ok(setReleaseStatus('DR-141', { action: 'halt', reason: 'Investigating reports' }));
    ok(setReleaseStatus('DR-141', { action: 'resume' }));
    expect(setReleaseStatus('DR-141', { action: 'resume' })).toMatchObject({ status: 409 });
    ok(setReleaseStatus('DR-141', { action: 'withdraw', reason: 'Superseded by 1.4.2' }));
    expect(setReleaseStatus('DR-141', { action: 'resume' })).toMatchObject({ status: 409 });
    expect(listAudit()[0]!.action).toBe('update.release.withdraw');
  });
});

describe('rollout rings', () => {
  it('pilot releases reach pilot-ring nations only, until promoted', () => {
    expect(chamber(HOME_NATION).releases.map(r => r.id)).not.toContain('DR-150');
    expect(chamber('sandbox').releases.map(r => r.id)).toContain('DR-150');
    ok(updateSettings(HOME_NATION, { ring: 'pilot' }, 'CIO'));
    expect(chamber(HOME_NATION).releases.map(r => r.id)).toContain('DR-150');
    ok(updateSettings(HOME_NATION, { ring: 'general' }, 'CIO'));
    ok(setReleaseStatus('DR-150', { action: 'promote' }));
    expect(chamber(HOME_NATION).releases.map(r => r.id)).toContain('DR-150');
  });
});

describe('break-glass', () => {
  it('needs two different named people and a reason; switches software back, never data', () => {
    expect(breakGlass(HOME_NATION, { by: 'CIO', secondBy: 'cio', reason: 'Database corrupted after upgrade' })).toMatchObject({ status: 422 });
    expect(breakGlass(HOME_NATION, { by: 'CIO', secondBy: 'CISO', reason: 'short' })).toMatchObject({ status: 422 });
    const r = breakGlass(HOME_NATION, { by: 'CIO', secondBy: 'CISO', reason: 'Services down after the upgrade; probation long over' });
    if ('error' in r) throw new Error(r.error);
    expect(r.chamber.installed).toBe('1.3.0'); // RP-1300 protected 1.3.0 when 1.4.0 was installed
    expect(r.incident.trigger).toBe('break-glass');
    expect(r.chamber.releases.find(x => x.id === 'DR-140')!.install.restorePoint!.restoredAt).toBeUndefined();
    expect(listAudit().find(a => a.action === 'update.break-glass')).toMatchObject({ action: 'update.break-glass', actor: 'CIO + CISO' });
  });
});

describe('settings', () => {
  it('validates and audits', () => {
    expect(updateSettings(HOME_NATION, { probationMinutes: 2 }, 'CIO')).toHaveProperty('error');
    expect(updateSettings(HOME_NATION, { fallback: 'never' as never }, 'CIO')).toHaveProperty('error');
    expect(updateSettings(HOME_NATION, { probationMinutes: 45 }, '')).toHaveProperty('error');
    const n = ok(updateSettings(HOME_NATION, { probationMinutes: 45, fallback: 'ask', estate: { servers: 50 } }, 'CIO'));
    expect(n.settings).toMatchObject({ probationMinutes: 45, fallback: 'ask' });
    expect(n.estate.servers).toBe(50);
    expect(listAudit()[0]).toMatchObject({ action: 'update.settings' });
  });
});
