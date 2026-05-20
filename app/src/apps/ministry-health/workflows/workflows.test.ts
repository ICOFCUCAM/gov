import { describe, it, expect } from 'vitest';
import { HEALTH_WORKFLOWS, PATIENT_ADMISSION, BREAK_GLASS_ACCESS } from './health-workflows';

describe('health workflows', () => {
  it('declares at least two executable workflows', () => {
    expect(HEALTH_WORKFLOWS.length).toBeGreaterThanOrEqual(2);
  });

  it('every step carries a health.* audit tag', () => {
    for (const w of HEALTH_WORKFLOWS) {
      for (const s of w.steps) {
        expect(s.auditTag.startsWith('health.')).toBe(true);
      }
    }
  });

  it('patient admission requires patient consent before bed assignment', () => {
    const consent = PATIENT_ADMISSION.steps.find(s => s.kind === 'consent');
    const admit = PATIENT_ADMISSION.steps.find(s => s.kind === 'admission');
    expect(consent).toBeDefined();
    expect(consent!.requiresSignature).toBe(true);
    expect(PATIENT_ADMISSION.steps.indexOf(consent!)).toBeLessThan(PATIENT_ADMISSION.steps.indexOf(admit!));
  });

  it('break-glass access mandates patient notification and post-hoc review', () => {
    const notify = BREAK_GLASS_ACCESS.steps.find(s => s.id === 'notify');
    const review = BREAK_GLASS_ACCESS.steps.find(s => s.id === 'review');
    const attest = BREAK_GLASS_ACCESS.steps.find(s => s.id === 'attest');
    expect(notify).toBeDefined();
    expect(review).toBeDefined();
    expect(attest).toBeDefined();
    expect(review!.requiresSignature).toBe(true);
    expect(attest!.requiresSignature).toBe(true);
  });

  it('every workflow cites blueprint section §13', () => {
    for (const w of HEALTH_WORKFLOWS) {
      expect(w.blueprintCitation).toMatch(/§13/);
    }
  });
});
