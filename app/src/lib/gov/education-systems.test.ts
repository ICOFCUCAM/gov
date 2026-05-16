import { describe, it, expect } from 'vitest';
import { schoolNetwork, examOps, teacherOps, studentServices, educationInstability } from './education-systems';

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
});
