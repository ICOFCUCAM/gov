import { describe, it, expect } from 'vitest';
import { knowledgeBoard, KNOWLEDGE_SAFEGUARDS } from './knowledge-continuity';
import { ERA_COUNT } from './generational-intelligence';

describe('constitutional knowledge & cognitive continuity', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(knowledgeBoard(4000 * 220)))
      .toEqual(JSON.stringify(knowledgeBoard(4000 * 220 + 960)));
  });

  it('enforces ethical cognitive safeguards — no profiling/ideology/speech targeting', () => {
    expect(KNOWLEDGE_SAFEGUARDS.perCitizenData).toBe(false);
    expect(KNOWLEDGE_SAFEGUARDS.politicallyNeutral).toBe(true);
    for (const p of ['cognitive-profiling', 'ideological-classification', 'thought-control', 'opinion-engineering', 'predictive-speech-targeting', 'censorship-automation']) {
      expect(KNOWLEDGE_SAFEGUARDS.prohibited).toContain(p);
    }
    const { prohibited, ...rest } = knowledgeBoard(4000 * 150);
    expect(prohibited.length).toBeGreaterThan(0);
    const json = JSON.stringify(rest).toLowerCase();
    for (const forbidden of ['ideolog', 'belief', 'opinion', 'partisan', 'censor', 'speechtarget', 'cognitivescore', 'thoughtcontrol']) {
      expect(json.includes(forbidden)).toBe(false);
    }
  });

  it('models every region with bounded educational resilience', () => {
    const b = knowledgeBoard(4000 * 250);
    expect(b.regions.length).toBe(6);
    for (const r of b.regions) {
      for (const v of [r.literacyContinuity, r.constitutionalLiteracy, r.educationalResilience, r.specialistShortage]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
      expect(r.collapseZone).toBe(r.educationalResilience < 45 || r.specialistShortage > 45);
    }
    for (let i = 1; i < b.regions.length; i++) {
      expect(b.regions[i - 1]!.educationalResilience).toBeLessThanOrEqual(b.regions[i]!.educationalResilience);
    }
  });

  it('forecasts a full-horizon cognitive trajectory + valid mode', () => {
    const b = knowledgeBoard(4000 * 377);
    expect(b.continuityTrajectory.length).toBe(ERA_COUNT);
    for (const v of b.continuityTrajectory) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    expect(['continuous-learning', 'rising-knowledge-strain', 'regional-learning-imbalance', 'expertise-erosion', 'institutional-amnesia', 'innovation-stagnation', 'learning-mobilization', 'cognitive-recovery', 'restored-knowledge-continuity']).toContain(b.mode);
    expect(b.transfer.length).toBe(6);
  });

  it('stabilization is lawful, advisory, never a prohibited action', () => {
    const b = knowledgeBoard(4000 * 333);
    for (const s of b.stabilization) {
      expect(s.advisory).toBe(true);
      expect(KNOWLEDGE_SAFEGUARDS.prohibited as readonly string[]).not.toContain(s.kind);
    }
    for (const v of Object.values(b.innovation)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
