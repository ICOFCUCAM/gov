import { describe, it, expect } from 'vitest';
import { schoolNetwork, examOps, teacherOps, studentServices, educationInstability, higherEducation, curriculumOps, educationCommand } from './education-systems';

describe('education systems engine', () => {
  it('all worlds deterministic & bounded', () => {
    expect(schoolNetwork('E', 50)).toEqual(schoolNetwork('E', 50));
    const s = schoolNetwork('E', 50);
    expect(s.byRegion.length).toBe(6);
    expect(s.infrastructurePct).toBeLessThanOrEqual(100);
    expect(s.byRegion.every(r => ['ok', 'warn', 'alert'].includes(r.tone))).toBe(true);
    const x = examOps('E', 50);
    expect(x.pipeline.length).toBe(5);
    expect(teacherOps('E', 50).payrollOnTimePct).toBeLessThanOrEqual(100);
    expect(studentServices('E', 50).portalUptime).toBeLessThanOrEqual(100);
    for (const t of [10, 90, 300]) {
      const v = educationInstability('E', t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('higherEducation / curriculumOps / educationCommand are deterministic & bounded', () => {
    const h = higherEducation('E', 120);
    expect(h).toEqual(higherEducation('E', 120));
    expect(['healthy', 'pressured', 'underfunded']).toContain(h.posture);
    expect(h.tiers.length).toBe(5);
    for (let i = 1; i < h.tiers.length; i++) expect(h.tiers[i - 1]!.utilisationPct).toBeGreaterThanOrEqual(h.tiers[i]!.utilisationPct);

    const cu = curriculumOps('E', 120);
    expect(cu).toEqual(curriculumOps('E', 120));
    expect(['current', 'lagging', 'obsolete']).toContain(cu.posture);
    expect(cu.subjects.length).toBe(6);

    const c = educationCommand('E', 120);
    expect(c).toEqual(educationCommand('E', 120));
    expect(['steady', 'engaged', 'crisis']).toContain(c.posture);
    expect(c.postureIndex).toBeGreaterThanOrEqual(0);
    expect(c.postureIndex).toBeLessThanOrEqual(100);
    expect(c.domains.length).toBe(5);
    const rank = { critical: 0, priority: 1, advisory: 2 } as const;
    for (let i = 1; i < c.directives.length; i++) {
      expect(rank[c.directives[i - 1]!.priority]).toBeLessThanOrEqual(rank[c.directives[i]!.priority]);
    }
  });
});
