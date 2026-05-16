import { describe, it, expect } from 'vitest';
import {
  createMinistry, activateMinistry, deactivateMinistry,
  removeDepartment, setModule, getMinistry,
} from './store';
import type { Ministry } from '@/lib/api/types';

const ok = (r: Ministry | { error: string }): Ministry => {
  if ('error' in r) throw new Error(`unexpected error: ${r.error}`);
  return r;
};

describe('activateMinistry gate (data-layer enforcement)', () => {
  it('archetype-composed institution is deployment-complete and re-activatable', () => {
    const m = ok(createMinistry({ archetype: 'HEALTH', name: 'Health A', slug: 'health-a' }));
    // composed by archetype → already active
    expect(m.status).toBe('active');
    deactivateMinistry(m.id);
    expect(getMinistry(m.id)!.status).toBe('deactivated');
    const re = activateMinistry(m.id);
    expect('error' in re).toBe(false);
    expect(getMinistry(m.id)!.status).toBe('active');
  });

  it('refuses activation when structure is stripped below the spec', () => {
    const m = ok(createMinistry({ archetype: 'HEALTH', name: 'Health B', slug: 'health-b' }));
    deactivateMinistry(m.id);
    // strip governance + operational below the HEALTH contract
    for (const d of [...m.departments]) removeDepartment(m.id, d.id);
    for (const mod of m.modules) setModule(m.id, mod.moduleKey, false);
    const res = activateMinistry(m.id);
    expect('error' in res).toBe(true);
    if ('error' in res) expect(res.error).toMatch(/Activation gate failed/i);
    expect(getMinistry(m.id)!.status).toBe('deactivated'); // gate held
  });

  it('rejects unknown institution', () => {
    const res = activateMinistry('NOPE');
    expect('error' in res).toBe(true);
  });
});
