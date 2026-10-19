import { describe, it, expect } from 'vitest';
import { createPermit, getPermit, listPermits, publishConfig, listConfigs, configContentHash, recordAudit } from './store';

describe('record ids and configuration content addresses', () => {
  it('makes ids from a CSPRNG (10 hex digits after the prefix), and old ids still resolve', () => {
    const p = createPermit({ type: 'building', title: 'Shed', applicantName: 'A', municipality: 'M', fields: {} } as never);
    expect(p.id).toMatch(/^PM-[0-9A-F]{10}$/);
    expect(recordAudit('A', 'x', 'y', 'ok').id).toMatch(/^AU-[0-9A-F]{10}$/);
    const ids = new Set(Array.from({ length: 200 }, () => recordAudit('A', 'x', 'y', 'ok').id));
    expect(ids.size).toBe(200);
    const seeded = listPermits().find(x => /^PM-[0-9A-Z]{4,6}$/.test(x.id));
    expect(seeded && getPermit(seeded.id)).toBeTruthy();
  });

  it('addresses configuration bundles by SHA-256 over canonical JSON; earlier bundles keep their hash', () => {
    const before = listConfigs().find(c => c.id === 'CFG-1');
    const c = publishConfig({ b: 2, a: { y: 1, x: [1, 2] } });
    expect(c.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(configContentHash({ a: { x: [1, 2], y: 1 }, b: 2 })).toBe(c.contentHash);
    expect(configContentHash({ a: { x: [2, 1], y: 1 }, b: 2 })).not.toBe(c.contentHash);
    if (before) expect(listConfigs().find(x => x.id === 'CFG-1')!.contentHash).toBe(before.contentHash);
  });
});
