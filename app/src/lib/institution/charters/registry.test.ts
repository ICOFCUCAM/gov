import { describe, it, expect } from 'vitest';
import { CHARTERS, chartersById } from './registry';

describe('CHARTERS', () => {
  it('contains a non-empty ministry registry of typed entries', () => {
    expect(CHARTERS.length).toBeGreaterThan(10);
    for (const c of CHARTERS) {
      expect(c.id.length).toBeGreaterThan(0);
    }
  });

  it('every charter declares a non-empty label and mount', () => {
    for (const c of CHARTERS) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.mount).toBeDefined();
    }
  });

  it('charter ids are unique', () => {
    const ids = CHARTERS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every charter cites at least one blueprint section', () => {
    for (const c of CHARTERS) {
      expect(c.blueprint.length).toBeGreaterThan(0);
    }
  });

  it('every safeguardsConstant is either empty or an uppercase identifier', () => {
    for (const c of CHARTERS) {
      if (c.safeguardsConstant) {
        expect(c.safeguardsConstant).toMatch(/^[A-Z_]+$/);
      }
    }
  });

  it('every federation graph names at least one produces or consumes edge', () => {
    for (const c of CHARTERS) {
      const total = c.federation.produces.length + c.federation.consumes.length;
      expect(total, c.id).toBeGreaterThan(0);
    }
  });
});

describe('chartersById', () => {
  it('returns a Map keyed by charter id', () => {
    const m = chartersById();
    expect(m.size).toBe(CHARTERS.length);
    for (const c of CHARTERS) {
      expect(m.get(c.id)).toBe(c);
    }
  });
});
