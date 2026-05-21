import { describe, it, expect } from 'vitest';
import {
  NOC_WORKFLOWS,
  CROSS_MINISTRY_COORDINATION, INCIDENT_FUSION, PUBLIC_BRIEFING,
} from './noc-workflows';

describe('NOC_WORKFLOWS', () => {
  it('includes the three documented workflows', () => {
    expect(NOC_WORKFLOWS).toEqual(expect.arrayContaining([
      CROSS_MINISTRY_COORDINATION, INCIDENT_FUSION, PUBLIC_BRIEFING,
    ]));
  });

  it('workflow ids are unique', () => {
    const ids = NOC_WORKFLOWS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every step audit tag is namespaced under noc.', () => {
    for (const w of NOC_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('noc.')).toBe(true);
      }
    }
  });

  it('CROSS_MINISTRY_COORDINATION explicitly never commands ministries (per safeguard)', () => {
    const coord = CROSS_MINISTRY_COORDINATION.steps.find(s => s.id === 'coordinate');
    expect(coord?.title.toLowerCase()).toContain('no command');
  });
});
