import { describe, it, expect, afterEach, vi } from 'vitest';
import { executivePosture } from './executive-posture';
import { nationalCoordination, nationalSnapshot } from '@/lib/data/store';
import { db } from '@/lib/data/store/state';
import type { MinistryIncident, NationalCoordination, NationalSnapshot } from '@/lib/api/types';

// A production installation shows no invented posture on the Command Center,
// the console header strip or its crisis banner (CLAUDE.md, lib/ops/mode.ts).
describe('executive posture by installation mode', () => {
  const saved = { inc: db.ministryIncidents, q: db.ministryQueues };
  afterEach(() => {
    vi.unstubAllEnvs();
    db.ministryIncidents = saved.inc;
    db.ministryQueues = saved.q;
  });

  /** As a production installation starts: every incident type known, none active, no queue items. */
  function emptyProduction() {
    vi.stubEnv('CIVICOS_MODE', 'production');
    const inc: Record<string, MinistryIncident[]> = {};
    const q: typeof db.ministryQueues = {};
    for (const m of db.ministries) { inc[m.id] = []; q[m.id] = []; }
    db.ministryIncidents = inc;
    db.ministryQueues = q;
  }

  it('production with nothing recorded: no generated pressure, no crisis, no readiness, no separation figures', () => {
    emptyProduction();
    const coord = nationalCoordination();
    const nat = nationalSnapshot();
    expect(nat.samples).toBe(false);
    expect(coord.posture.basis).toBe('records');
    expect(coord.fabric).toEqual([]);
    expect(coord.chronology).toEqual([]);
    expect(coord.posture.nationalRisk).toBe(0);
    expect(coord.posture.label).toBe('NONE RECORDED');
    expect(coord.posture.level).toBe('ok');

    const v = executivePosture(nat, coord);
    expect(v.risk.v).not.toMatch(/CRITICAL|STRAINED/);
    expect(v.risk.kind).toBe('record');
    expect(v.banner.show).toBe(false);
    expect(v.readiness.v).toBe('Not connected');
    expect(v.readiness.kind).toBe('unavailable');
    expect(v.generated.show).toBe(false);
    expect(v.incidents).toMatchObject({ v: '0', kind: 'record' });
  });

  it('production counts a recorded serious incident and raises the banner from it', () => {
    emptyProduction();
    const m = db.ministries.find(x => x.status === 'active')!;
    db.ministryIncidents[m.id] = [{ key: 'k', label: 'Flooding', severity: 'sev1', detail: 'd', active: true, tierIndex: 0 }];
    const coord = nationalCoordination();
    const nat = nationalSnapshot();
    expect(coord.posture.label).toBe('CRITICAL');
    const v = executivePosture(nat, coord);
    expect(v.banner.show).toBe(true);
    expect(v.banner.text).toMatch(/^1 serious incident recorded/);
    expect(v.banner.kind).toBe('record');
    // The incident has no recorded time, so the timeline does not invent one.
    expect(coord.timeline.some(e => e.kind === 'incident' && e.title.includes('Flooding'))).toBe(false);
  });

  it('production ignores example queue items left from a demonstration', () => {
    emptyProduction();
    const m = db.ministries.find(x => x.status === 'active')!;
    db.ministryQueues[m.id] = Array.from({ length: 9 }, (_, i) => ({
      id: `Q${i}`, ref: `R${i}`, subject: 's', region: 'r', ageHours: 1, priority: 'routine' as const, state: 'open' as const, source: 'sample' as const,
    }));
    expect(nationalSnapshot().totals.queuesBreaching).toBe(0);
    expect(nationalCoordination().posture.label).toBe('NONE RECORDED');
  });

  it('a production screen never shows a generated posture, even from a server that sent one', () => {
    const nat = { samples: false, crossMinistryIncidents: [], totals: { queuesBreaching: 0 } } as unknown as NationalSnapshot;
    const coord = { posture: { level: 'alert', label: 'CRITICAL', nationalRisk: 80 } } as unknown as NationalCoordination;
    const v = executivePosture(nat, coord);
    expect(v.risk.v).toBe('Not connected');
    expect(v.banner.show).toBe(false);
  });

  it('demo and training keep the generated posture, marked Sample', () => {
    for (const mode of ['demo', 'training']) {
      vi.stubEnv('CIVICOS_MODE', mode);
      const coord = nationalCoordination();
      const nat = nationalSnapshot();
      expect(nat.samples, mode).toBe(true);
      expect(coord.posture.basis, mode).toBe('sample');
      expect(coord.fabric.length, mode).toBeGreaterThan(0);
      const v = executivePosture(nat, coord);
      expect(v.risk.kind, mode).toBe('sample');
      expect(v.readiness.kind, mode).toBe('sample');
      expect(v.generated.show, mode).toBe(true);
    }
  });

  it('a sample posture that reads critical with no serious incident says it is the pressure model', () => {
    const nat = { samples: true, crossMinistryIncidents: [], totals: { queuesBreaching: 0 } } as unknown as NationalSnapshot;
    const coord = { posture: { level: 'alert', label: 'CRITICAL', nationalRisk: 80, basis: 'sample', source: 'model' } } as unknown as NationalCoordination;
    const v = executivePosture(nat, coord);
    expect(v.banner.show).toBe(true);
    expect(v.banner.text).not.toMatch(/^0 serious/);
    expect(v.banner.text).toMatch(/Sample pressure model/);
    expect(v.banner.kind).toBe('sample');
  });

  it('shows nothing generated before the snapshot has loaded', () => {
    const v = executivePosture(null, null);
    expect(v.loaded).toBe(false);
    expect(v.generated.show).toBe(false);
    expect(v.banner.show).toBe(false);
    expect(v.risk.v).toBe('—');
  });
});
