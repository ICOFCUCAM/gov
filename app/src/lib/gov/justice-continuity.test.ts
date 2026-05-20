import { describe, it, expect } from 'vitest';
import { justiceContinuityBoard } from './justice-continuity';

describe('justice & constitutional continuity engine', () => {
  it('is deterministic per operational epoch', () => {
    expect(JSON.stringify(justiceContinuityBoard(4000 * 250)))
      .toEqual(JSON.stringify(justiceContinuityBoard(4000 * 250 + 1230)));
  });

  it('constitutional posture is consistent with integrity index and articles under review', () => {
    const b = justiceContinuityBoard(4000 * 311);
    const { posture, integrityIdx, articlesUnderReview } = b.review;
    if (articlesUnderReview >= 4 || integrityIdx < 60) {
      expect(posture).toBe('breach-watch');
    } else if (articlesUnderReview >= 2 || integrityIdx < 72) {
      expect(posture).toBe('pressure');
    } else if (articlesUnderReview >= 1) {
      expect(posture).toBe('under-review');
    } else {
      expect(['engaged', 'sound']).toContain(posture);
    }
  });

  it('court roster spans every tier with valid backlog classification', () => {
    const courts = justiceContinuityBoard(4000 * 401).courts;
    const tiers = new Set(courts.map(c => c.tier));
    expect(tiers.has('Constitutional')).toBe(true);
    expect(tiers.has('Supreme')).toBe(true);
    for (const c of courts) {
      expect(['cleared', 'monitored', 'congested', 'overdue']).toContain(c.backlogClass);
      expect(c.pendingCases).toBeGreaterThan(0);
    }
  });

  it('every incident propagates to at least one ministry with valid status', () => {
    for (const i of justiceContinuityBoard(4000 * 488).incidents) {
      expect(i.ministryCascade.length).toBeGreaterThan(0);
      expect(['advisory', 'elevated', 'critical', 'national']).toContain(i.severity);
      for (const c of i.ministryCascade) {
        expect(['pending', 'engaged', 'cleared']).toContain(c.status);
      }
    }
  });

  it('rights protection covers all 7 rights with consistent escalation states', () => {
    const rights = justiceContinuityBoard(4000 * 522).rights;
    expect(rights.length).toBe(7);
    for (const r of rights) {
      expect(['preserved', 'watch', 'escalation']).toContain(r.status);
      if (r.monitoringIdx < 70 || r.alertsRaised >= 4) {
        expect(r.status).toBe('escalation');
      }
    }
  });

  it('administrative review is sorted by compliance index ascending (lowest-first)', () => {
    const admin = justiceContinuityBoard(4000 * 277).administrative;
    for (let i = 1; i < admin.length; i++) {
      expect(admin[i - 1]!.complianceIdx).toBeLessThanOrEqual(admin[i]!.complianceIdx);
    }
  });

  it('forecast horizon arrays align at 4 horizon points', () => {
    const f = justiceContinuityBoard(4000 * 333).forecast;
    expect(f.horizonYears.length).toBe(4);
    expect(f.constitutionalIntegrityTrajectory.length).toBe(4);
    expect(f.judicialIndependenceTrajectory.length).toBe(4);
    expect(f.rightsConfidenceTrajectory.length).toBe(4);
    expect(f.caseBacklogProjection.length).toBe(4);
    expect(f.constitutionalCrisisRisk).toBeGreaterThanOrEqual(0);
    expect(f.constitutionalCrisisRisk).toBeLessThanOrEqual(100);
  });

  it('banner line reflects current constitutional posture', () => {
    const b = justiceContinuityBoard(4000 * 199);
    if (b.review.posture === 'sound') expect(b.bannerLine).toMatch(/SOUND/);
    if (b.review.posture === 'breach-watch') expect(b.bannerLine).toMatch(/BREACH/);
  });
});
