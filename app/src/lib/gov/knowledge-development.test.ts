import { describe, it, expect } from 'vitest';
import { knowledgeDevelopmentBoard } from './knowledge-development';

describe('knowledge & development sovereign engine', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(knowledgeDevelopmentBoard(4000 * 240)))
      .toEqual(JSON.stringify(knowledgeDevelopmentBoard(4000 * 240 + 990)));
  });

  it('every region has continuity-risk consistent with literacy', () => {
    for (const r of knowledgeDevelopmentBoard(4000 * 333).command.regions) {
      const exp = r.literacyPct < 70 ? 'fracture' : r.literacyPct < 82 ? 'monitor' : 'none';
      expect(r.continuityRisk).toBe(exp);
    }
  });

  it('institutional inventory carries valid accreditation states', () => {
    for (const inst of knowledgeDevelopmentBoard(4000 * 401).institutions) {
      expect(['pending', 'accredited', 'probation', 'revoked']).toContain(inst.accreditation);
      expect(inst.enrolment).toBeGreaterThan(0);
      expect(inst.establishedYearsAgo).toBeGreaterThan(0);
    }
  });

  it('research programmes sorted capability-first with valid priority', () => {
    const arr = knowledgeDevelopmentBoard(4000 * 412).research;
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i - 1]!.capabilityIdx).toBeGreaterThanOrEqual(arr[i]!.capabilityIdx);
    }
    for (const r of arr) {
      expect(['core', 'advisory', 'sunset']).toContain(r.strategicPriority);
    }
  });

  it('cohorts span all 5 generational bands', () => {
    expect(knowledgeDevelopmentBoard(4000 * 270).cohorts.length).toBe(5);
  });

  it('every incident propagates to at least one ministry', () => {
    for (const i of knowledgeDevelopmentBoard(4000 * 377).incidents) {
      expect(i.ministryCascade.length).toBeGreaterThan(0);
      expect(['advisory', 'elevated', 'critical', 'national']).toContain(i.severity);
      expect(['remote-continuity', 'temporary-relocation', 'curriculum-acceleration', 'examination-deferral']).toContain(i.recoveryPathway);
    }
  });

  it('forecast horizon arrays aligned at 5 years', () => {
    const f = knowledgeDevelopmentBoard(4000 * 333).forecast;
    expect(f.horizonYears.length).toBe(5);
    expect(f.literacyTrajectory.length).toBe(5);
    expect(f.workforceReadinessTrajectory.length).toBe(5);
    expect(f.researchCapabilityTrajectory.length).toBe(5);
  });
});
