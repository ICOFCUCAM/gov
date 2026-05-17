import { describe, it, expect } from 'vitest';
import { propagateNationalEvent, type PropagationTrigger } from './national-propagation';

const TRIGGERS: PropagationTrigger[] = ['outbreak', 'mass-casualty', 'drug-shortage', 'capacity-collapse'];

describe('national propagation engine', () => {
  it('is deterministic and bounded for every trigger', () => {
    for (const trigger of TRIGGERS) {
      const a = propagateNationalEvent({ trigger, severity: 72, originRegion: 'Coastal' }, 120);
      expect(a).toEqual(propagateNationalEvent({ trigger, severity: 72, originRegion: 'Coastal' }, 120));
      expect(a.hops.length).toBeGreaterThanOrEqual(5);
      expect(a.hops[0]!.status).toBe('origin');
      expect(['monitor', 'coordinate', 'mobilise', 'cabinet']).toContain(a.escalation);
      for (let k = 1; k < a.hops.length; k++) {
        expect(a.hops[k]!.etaHrs).toBeGreaterThanOrEqual(a.hops[k - 1]!.etaHrs);
      }
      for (const h of a.hops) {
        expect(h.magnitude).toBeGreaterThanOrEqual(0);
        expect(h.magnitude).toBeLessThanOrEqual(100);
        expect(['origin', 'active', 'inbound', 'latent']).toContain(h.status);
        expect(['ok', 'warn', 'alert']).toContain(h.tone);
      }
      expect(a.recommended.length).toBeGreaterThan(0);
    }
  });

  it('every chain terminates at Cabinet (national escalation tier)', () => {
    for (const trigger of TRIGGERS) {
      const p = propagateNationalEvent({ trigger, severity: 90, originRegion: 'Capital District' }, 50);
      expect(p.hops.at(-1)!.institution).toBe('Cabinet');
    }
  });

  it('higher severity drives deeper reach and stronger escalation', () => {
    const low = propagateNationalEvent({ trigger: 'outbreak', severity: 10, originRegion: 'Northern' }, 80);
    const high = propagateNationalEvent({ trigger: 'outbreak', severity: 95, originRegion: 'Northern' }, 80);
    expect(high.reach).toBeGreaterThanOrEqual(low.reach);
    const rank = { monitor: 0, coordinate: 1, mobilise: 2, cabinet: 3 } as const;
    expect(rank[high.escalation]).toBeGreaterThanOrEqual(rank[low.escalation]);
  });

  it('amplifier nodes can raise magnitude above pure decay', () => {
    const p = propagateNationalEvent({ trigger: 'outbreak', severity: 60, originRegion: 'Eastern' }, 200);
    const di = p.hops.find(h => h.institution === 'Disease Intelligence')!;
    expect(di.amplified).toBe(true);
  });
});
