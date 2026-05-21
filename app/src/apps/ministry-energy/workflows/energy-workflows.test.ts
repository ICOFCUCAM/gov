import { describe, it, expect } from 'vitest';
import {
  ENERGY_WORKFLOWS,
  BLACKOUT_RESTORATION, GENERATION_DISPATCH, RENEWABLE_GRID_CONNECTION,
} from './energy-workflows';

describe('ENERGY_WORKFLOWS', () => {
  it('includes the three documented workflows', () => {
    expect(ENERGY_WORKFLOWS).toContain(BLACKOUT_RESTORATION);
    expect(ENERGY_WORKFLOWS).toContain(GENERATION_DISPATCH);
    expect(ENERGY_WORKFLOWS).toContain(RENEWABLE_GRID_CONNECTION);
    expect(ENERGY_WORKFLOWS).toHaveLength(3);
  });

  it('workflow ids are unique', () => {
    const ids = ENERGY_WORKFLOWS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every workflow has at least one step and every step audit tag is namespaced under energy.', () => {
    for (const w of ENERGY_WORKFLOWS) {
      expect(w.steps.length).toBeGreaterThan(0);
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('energy.')).toBe(true);
      }
    }
  });

  it('every workflow cites a blueprint section', () => {
    for (const w of ENERGY_WORKFLOWS) {
      expect(w.blueprintCitation.length).toBeGreaterThan(0);
    }
  });

  it('BLACKOUT_RESTORATION has at least one signature-required step', () => {
    expect(BLACKOUT_RESTORATION.steps.some(s => s.requiresSignature)).toBe(true);
  });

  it('RENEWABLE_GRID_CONNECTION emits explicit interop events', () => {
    expect(RENEWABLE_GRID_CONNECTION.emits.length).toBeGreaterThan(0);
  });
});
