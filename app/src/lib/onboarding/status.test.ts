import { describe, expect, it } from 'vitest';
import routeLock from '@/app/route-lock.json';
import { onboardingStatus } from './status';
import { canSeeOnboarding } from '@/lib/auth/roles';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { REFERENCE_PROFESSIONS } from '@/lib/professions/register';
import { beginRun, finishRun, resetCronRuns } from '@/lib/ops/cron-runs';
import { CRON_JOBS, intervalMinutes } from '@/lib/ops/cron-jobs';

const env = (mode: string) => ({ NODE_ENV: 'test', CIVICOS_MODE: mode } as unknown as NodeJS.ProcessEnv);
const locked = new Set<string>(routeLock as string[]);

describe('where setup stands', () => {
  it('reads every track and gives each a state', () => {
    const s = onboardingStatus(env('demo'));
    expect(s.total).toBe(s.tracks.length);
    expect(s.done).toBe(s.tracks.filter(t => t.state === 'done').length);
    for (const t of s.tracks) {
      expect(t.checks.length).toBeGreaterThan(0);
      expect(['done', 'in-progress', 'not-started', 'blocked']).toContain(t.state);
    }
  });

  it('offers the demonstration track only where samples are allowed', () => {
    expect(onboardingStatus(env('demo')).tracks.some(t => t.key === 'demo')).toBe(true);
    expect(onboardingStatus(env('training')).tracks.some(t => t.key === 'demo')).toBe(true);
    expect(onboardingStatus(env('production')).tracks.some(t => t.key === 'demo')).toBe(false);
  });

  it('links only to pages that exist', () => {
    const s = onboardingStatus(env('demo'));
    const hrefs = [...s.tracks.flatMap(t => [t.href, ...t.checks.map(c => c.href)]), ...s.waiting.map(w => w.href)];
    for (const h of hrefs) expect(locked.has(h.split('#')[0]!), h).toBe(true);
  });

  it('is blocked when backups cannot be encrypted', () => {
    const ops = onboardingStatus(env('demo')).tracks.find(t => t.key === 'operations')!;
    expect(ops.state).toBe('blocked');
    const withKey = onboardingStatus({ ...env('demo'), CIVICOS_DATA_KEK: 'x' } as NodeJS.ProcessEnv).tracks.find(t => t.key === 'operations')!;
    expect(withKey.state).not.toBe('blocked');
  });

  it('is read by administrators and auditors only', () => {
    expect(canSeeOnboarding({ role: 'administrator' } as never)).toBeNull();
    expect(canSeeOnboarding({ role: 'auditor' } as never)).toBeNull();
    expect(canSeeOnboarding({ role: 'officer' } as never)).toMatch(/administrators and auditors/);
    expect(canSeeOnboarding({ role: 'signatory' } as never)).toMatch(/administrators and auditors/);
  });

  it('does not count the platform\'s reference registers or professions as the nation\'s', () => {
    expect(REFERENCE_PROFESSIONS.length).toBeGreaterThan(0);
    const reg = onboardingStatus(env('production')).tracks.find(t => t.key === 'registers')!;
    expect(reg.checks.find(c => c.label.startsWith('Professions'))!.done).toBe(false);
    expect(reg.checks.find(c => c.label.startsWith('Register types'))!.done).toBe(false);
  });

  it('shows scheduled jobs as running only when every job has a successful recorded run within twice its interval', () => {
    resetCronRuns();
    const e = { ...env('demo'), CIVICOS_DATA_KEK: 'x' } as NodeJS.ProcessEnv;
    const check = () => onboardingStatus(e).tracks.find(t => t.key === 'operations')!.checks.find(c => c.href === '/gov/crons')!;
    expect(check().done).toBe(false);
    // Without the substrate the substrate-only jobs are not this installation's.
    const local = CRON_JOBS.filter(j => !j.substrate);
    const now = Date.now();
    const runOk = (name: string, at: number) => { const b = beginRun(name, `test:${name}:${at}`, { trigger: 'manual', now: at }); if (b.kind === 'run') finishRun(name, b.run.id, { outcome: 'ok', status: 200 }, at); };
    for (const j of local.slice(1)) runOk(j.name, now);
    expect(check().done).toBe(false);
    expect(check().detail).toContain(local[0]!.name);
    // A run older than twice the job's interval does not count.
    runOk(local[0]!.name, now - 3 * intervalMinutes(local[0]!) * 60_000);
    expect(check().done).toBe(false);
    runOk(local[0]!.name, now);
    expect(check().done).toBe(true);
    // A failed run does not make a job recorded running.
    resetCronRuns();
    for (const j of local) { const b = beginRun(j.name, `f:${j.name}`, { trigger: 'manual', now }); if (b.kind === 'run') finishRun(j.name, b.run.id, { outcome: 'failed', status: 500, error: 'x' }, now); }
    expect(check().done).toBe(false);
    resetCronRuns();
  });

  // A nation without a legislature, audit office or central bank in the platform is not "missing" them (plan phase 1).
  it('counts only the registers every installation fills; constitutional bodies count once named', async () => {
    const { setSovereign } = await import('@/lib/data/store/sovereign');
    const { listMinistries } = await import('@/lib/data/store/ministries');
    const { REQUIRED_AUTHORITIES, AUTHORITIES } = await import('@/lib/nation/deployment');
    const id = listMinistries().find(m => m.status === 'active')!.id;
    setSovereign({ deployment: { authorities: Object.fromEntries(REQUIRED_AUTHORITIES.map(a => [a.key, id])) } }, 'test');
    const checks = () => onboardingStatus(env('demo')).tracks.find(t => t.key === 'institutions')!.checks;
    expect(AUTHORITIES.length).toBeGreaterThan(REQUIRED_AUTHORITIES.length);
    expect(checks().find(c => c.label.startsWith('Every responsibility'))).toMatchObject({ done: true });
    expect(checks().find(c => c.label.startsWith('Constitutional bodies'))).toMatchObject({ done: true, detail: expect.stringMatching(/None named/) });
    setSovereign({ deployment: { authorities: {} } }, 'test');
  });

  // Independent oversight (plan I8): optional bodies, a track only once one is named; its links exist.
  it('shows the independent oversight track only once the nation names an oversight body', async () => {
    const { setSovereign } = await import('@/lib/data/store/sovereign');
    const { listMinistries } = await import('@/lib/data/store/ministries');
    expect(onboardingStatus(env('demo')).tracks.some(t => t.key === 'oversight')).toBe(false);
    const id = listMinistries().find(m => m.status === 'active')!.id;
    setSovereign({ deployment: { authorities: { ombudsman: id } } }, 'test');
    const t = onboardingStatus(env('demo')).tracks.find(x => x.key === 'oversight')!;
    expect(t.checks.map(c => c.label)).toEqual(expect.arrayContaining([expect.stringMatching(/procedures approved/), expect.stringMatching(/permit authorities/), expect.stringMatching(/Relationships/)]));
    expect(t.checks.find(c => /procedures approved/.test(c.label))).toMatchObject({ done: false, detail: '0 of 1 approved' });
    for (const h of [t.href, ...t.checks.map(c => c.href)]) expect(locked.has(h.split('#')[0]!), h).toBe(true);
    setSovereign({ deployment: { authorities: {} } }, 'test');
  });

  // Territory and infrastructure (plan I7): a track only once a body is named or a local government recorded; its links exist.
  it('shows the territory track only once the nation names a land, building, housing or transport body', async () => {
    const { setSovereign } = await import('@/lib/data/store/sovereign');
    const { listMinistries } = await import('@/lib/data/store/ministries');
    expect(onboardingStatus(env('demo')).tracks.some(t => t.key === 'territory')).toBe(false);
    const id = listMinistries().find(m => m.status === 'active')!.id;
    setSovereign({ deployment: { authorities: { landRegistry: id, buildingControl: id } } }, 'test');
    const t = onboardingStatus(env('demo')).tracks.find(x => x.key === 'territory')!;
    expect(t.checks.map(c => c.label)).toEqual(expect.arrayContaining([expect.stringMatching(/procedures approved/), expect.stringMatching(/permit authorities/), expect.stringMatching(/parcel policy/), expect.stringMatching(/Building control rules/)]));
    for (const h of [t.href, ...t.checks.map(c => c.href)]) expect(locked.has(h.split('#')[0]!), h).toBe(true);
    setSovereign({ deployment: { authorities: {} } }, 'test');
  });

  it('says which tracks may be done only because of samples', () => {
    expect(onboardingStatus(env('demo')).tracks.find(t => t.key === 'exchange')!.samplesCounted).toBe(true);
  });

  // The page guides officials to the real screens; it is never a second way to change anything.
  it('changes nothing: the status route only reads and the hub only fetches', () => {
    const route = readFileSync(path.join(__dirname, '../../app/api/onboarding/status/route.ts'), 'utf8');
    expect(route).not.toMatch(/export (async )?function (POST|PUT|PATCH|DELETE)/);
    const hub = readFileSync(path.join(__dirname, '../../app/(admin)/admin/onboarding/OnboardingHub.tsx'), 'utf8');
    expect(hub).not.toMatch(/method:/);
    expect(hub).not.toMatch(/api\./);
    const reader = readFileSync(path.join(__dirname, 'status.ts'), 'utf8');
    expect(reader).not.toMatch(/\b(propose|confirm|approve|draft|record|set|create|update|withdraw|publish)[A-Z]\w*\(/);
  });
});
