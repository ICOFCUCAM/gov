import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerApp, activateApp, deactivateApp, listApps, activatedApps,
  findApp, orchestrationStats,
} from './orchestration-engine';
import { eventLog } from './event-bus';

describe('orchestration engine (federation registry)', () => {
  it('registers, activates and deactivates apps emitting events', () => {
    const a = registerApp({ id: 'ministry-health', label: 'Ministry of Health', domain: 'health', kind: 'ministry', archetypeOrBranch: 'HEALTH', nav: [{ key: 'command', label: 'Command' }], instanceId: 'MIN-1' });
    expect(a.activated).toBe(false);
    // idempotent
    expect(registerApp({ ...a }).registeredAt).toBe(a.registeredAt);

    activateApp('ministry-health', 'MIN-1');
    expect(activatedApps().some(x => x.id === 'ministry-health')).toBe(true);
    expect(findApp('health')?.activated).toBe(true);

    const evs = eventLog(20).map(e => e.type);
    expect(evs).toContain('app.registered');
    expect(evs).toContain('app.activated');

    deactivateApp('ministry-health', 'MIN-1');
    expect(findApp('health')?.activated).toBe(false);
  });

  it('stats reflect registry state', () => {
    registerApp({ id: 'judiciary', label: 'Judiciary', domain: 'judiciary', kind: 'branch', archetypeOrBranch: 'judiciary', nav: [] });
    activateApp('judiciary');
    const s = orchestrationStats();
    expect(s.registered).toBeGreaterThan(0);
    expect(s.activated).toBeGreaterThan(0);
    expect(listApps().length).toBe(s.registered);
  });
});
