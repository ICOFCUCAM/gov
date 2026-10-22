import { describe, it, expect } from 'vitest';
import {
  createMinistry, activateMinistry, deactivateMinistry, mergeMinistry,
  endDepartment, addDepartment, setModule, getMinistry, listAudit,
} from './store';
import type { Ministry } from '@/lib/api/types';

const ok = (r: Ministry | { error: string }): Ministry => {
  if ('error' in r) throw new Error(`unexpected error: ${r.error}`);
  return r;
};

describe('activateMinistry (plan I0.2: the composite score no longer gates)', () => {
  it('archetype-composed institution is re-activatable', () => {
    const m = ok(createMinistry({ archetype: 'HEALTH', name: 'Health A', slug: 'health-a' }));
    // composed by archetype → already active
    expect(m.status).toBe('active');
    deactivateMinistry(m.id);
    expect(getMinistry(m.id)!.status).toBe('deactivated');
    const re = activateMinistry(m.id);
    expect('error' in re).toBe(false);
    expect(getMinistry(m.id)!.status).toBe('active');
  });

  it('activates even when the structure score is low; the score is recorded for information only', () => {
    const m = ok(createMinistry({ archetype: 'HEALTH', name: 'Health B', slug: 'health-b' }));
    deactivateMinistry(m.id, 'Ama Mensah, Registrar');
    for (const d of [...m.departments]) endDepartment(m.id, d.id, 'Reorganised', 'Ama Mensah, Registrar');
    for (const mod of m.modules) setModule(m.id, mod.moduleKey, false, 'Ama Mensah, Registrar');
    const res = activateMinistry(m.id, 'Kofi Boateng, Head of Service');
    expect('error' in res).toBe(false);
    expect(getMinistry(m.id)!.status).toBe('active');
    const e = listAudit().find(a => a.action === 'ministry.activate' && a.resource === `Ministry:${m.id}`)!;
    expect(e.outcome).toBe('ok');
    expect(e.actor).toBe('Kofi Boateng, Head of Service');
    expect(e.detail).toMatch(/information only, not a gate/);
  });

  it('rejects unknown institution', () => {
    const res = activateMinistry('NOPE');
    expect('error' in res).toBe(true);
  });
});

describe('departments are ended with a reason and kept (plan I0.2)', () => {
  it('an ended department stays on the record with who, when and why', () => {
    const m = ok(createMinistry({ archetype: 'GENERIC', name: 'Dept keep', slug: `dept-keep-${Math.random().toString(36).slice(2, 7)}` }));
    const n = m.departments.length;
    const d = m.departments[0]!;
    expect(endDepartment(m.id, d.id, '', 'A')).toMatchObject({ status: 422 });
    const r = ok(endDepartment(m.id, d.id, 'Functions moved to Planning', 'Ama Mensah, Registrar') as Ministry);
    expect(r.departments).toHaveLength(n);
    expect(r.departments.find(x => x.id === d.id)).toMatchObject({ status: 'ended', endedBy: 'Ama Mensah, Registrar', endReason: 'Functions moved to Planning' });
    expect(endDepartment(m.id, d.id, 'again', 'A')).toMatchObject({ status: 409 });
    // A new department may take the ended one's name; the ended one is still kept.
    ok(addDepartment(m.id, d.name, 'Ama Mensah, Registrar'));
    expect(getMinistry(m.id)!.departments.filter(x => x.name === d.name)).toHaveLength(2);
    const e = listAudit().find(a => a.action === 'department.end' && a.resource === `Ministry:${m.id}`)!;
    expect(e.actor).toBe('Ama Mensah, Registrar');
  });

  it('a merge ends the source\'s departments with the merge as the reason and keeps them', () => {
    const a = ok(createMinistry({ archetype: 'GENERIC', name: 'Merge A', slug: `merge-a-${Math.random().toString(36).slice(2, 7)}` }));
    const b = ok(createMinistry({ archetype: 'GENERIC', name: 'Merge B', slug: `merge-b-${Math.random().toString(36).slice(2, 7)}` }));
    ok(addDepartment(a.id, 'Only in A', 'X'));
    ok(mergeMinistry(a.id, b.id, 'Kofi Boateng, Head of Service'));
    const src = getMinistry(a.id)!;
    expect(src.departments.length).toBeGreaterThan(0);
    expect(src.departments.every(d => d.status === 'ended' && d.endReason === 'Merged into Merge B')).toBe(true);
    expect(getMinistry(b.id)!.departments.some(d => d.name === 'Only in A' && d.status === 'active')).toBe(true);
  });
});
