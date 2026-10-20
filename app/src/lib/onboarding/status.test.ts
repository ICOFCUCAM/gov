import { describe, expect, it } from 'vitest';
import routeLock from '@/app/route-lock.json';
import { onboardingStatus } from './status';
import { canSeeOnboarding } from '@/lib/auth/roles';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { REFERENCE_PROFESSIONS } from '@/lib/professions/register';

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

  it('never claims scheduled jobs run while no run history is kept', () => {
    const ops = onboardingStatus({ ...env('demo'), CIVICOS_DATA_KEK: 'x' } as NodeJS.ProcessEnv).tracks.find(t => t.key === 'operations')!;
    expect(ops.checks.find(c => c.href === '/gov/crons')!.done).toBe(false);
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
