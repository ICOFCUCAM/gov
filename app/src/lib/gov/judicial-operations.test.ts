import { describe, it, expect } from 'vitest';
import { evidenceRegistry, prisonCoordination, judicialOperations } from './judicial-operations';

describe('judicial operations engine', () => {
  it('deterministic & bounded', () => {
    expect(evidenceRegistry('J', 50)).toEqual(evidenceRegistry('J', 50));
    const ev = evidenceRegistry('J', 50);
    expect(ev.chainIntegrityPct).toBeLessThanOrEqual(100);
    const pc = prisonCoordination('J', 50);
    expect(pc.occupancyPct).toBeGreaterThanOrEqual(0);
    expect(pc.population).toBeGreaterThan(0);
    const jo = judicialOperations('J', 50);
    expect(jo.judgesAssigned).toBeGreaterThanOrEqual(200);
    expect(jo).toEqual(judicialOperations('J', 50));
  });
});
