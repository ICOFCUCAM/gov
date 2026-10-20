import { describe, expect, it } from 'vitest';
import routeLock from '@/app/route-lock.json';
import { onboardingStatus } from './status';
import { canSeeOnboarding } from '@/lib/auth/roles';

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
});
