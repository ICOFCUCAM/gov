import { describe, it, expect } from 'vitest';
import {
  emergencyLifecycle,
  emergencyCheckStatus,
  EMERGENCY_SUNSET_HRS,
  type EmergencyDeclaration,
} from './emergency-powers';

const decl = (over: Partial<EmergencyDeclaration> = {}): EmergencyDeclaration => ({
  scope: 'police', authority: 'Cabinet emergency cell', assertedAtHrs: 0, ...over,
});

describe('emergency-power lifecycle', () => {
  it('no declaration is the legitimate none phase', () => {
    const l = emergencyLifecycle(null, 500);
    expect(l.phase).toBe('none');
    expect(l.legitimate).toBe(true);
    expect(l.sunsetAtHrs).toBe(0);
  });

  it('is deterministic for the same declaration and clock', () => {
    const d = decl({ assertedAtHrs: 10 });
    expect(emergencyLifecycle(d, 40)).toEqual(emergencyLifecycle(d, 40));
  });

  it('progresses active → renewal-due → lapsed against the sunset clock', () => {
    const d = decl();
    expect(emergencyLifecycle(d, 10).phase).toBe('active');
    // renewal-due band opens once the window is 70% elapsed
    expect(emergencyLifecycle(d, EMERGENCY_SUNSET_HRS - 5).phase).toBe('renewal-due');
    const lapsed = emergencyLifecycle(d, EMERGENCY_SUNSET_HRS + 12);
    expect(lapsed.phase).toBe('lapsed');
    expect(lapsed.legitimate).toBe(false);
    expect(lapsed.hrsToSunset).toBeLessThan(0);
  });

  it('a constituted renewal restarts the sunset clock', () => {
    const noRenew = emergencyLifecycle(decl(), EMERGENCY_SUNSET_HRS + 1);
    expect(noRenew.phase).toBe('lapsed');
    const renewed = emergencyLifecycle(
      decl({ renewals: [{ atHrs: EMERGENCY_SUNSET_HRS - 10, authority: 'Legislature' }] }),
      EMERGENCY_SUNSET_HRS + 1,
    );
    expect(renewed.phase).toBe('active');
    expect(renewed.renewalCount).toBe(1);
    expect(renewed.sunsetAtHrs).toBe(EMERGENCY_SUNSET_HRS - 10 + EMERGENCY_SUNSET_HRS);
  });

  it('ignores backdated/future renewals', () => {
    const l = emergencyLifecycle(
      decl({ assertedAtHrs: 20, renewals: [
        { atHrs: 5, authority: 'X' },      // before assertion — invalid
        { atHrs: 9999, authority: 'Y' },   // after now — not yet enacted
      ] }),
      30,
    );
    expect(l.renewalCount).toBe(0);
    expect(l.sunsetAtHrs).toBe(20 + EMERGENCY_SUNSET_HRS);
  });

  it('explicit revocation takes precedence and restores order', () => {
    const l = emergencyLifecycle(decl({ revokedAtHrs: 30 }), 40);
    expect(l.phase).toBe('revoked');
    expect(l.legitimate).toBe(true);
  });

  it('maps phases to constitutional check statuses', () => {
    expect(emergencyCheckStatus('lapsed')).toBe('breach');
    expect(emergencyCheckStatus('renewal-due')).toBe('watch');
    expect(emergencyCheckStatus('active')).toBe('ok');
    expect(emergencyCheckStatus('none')).toBe('ok');
    expect(emergencyCheckStatus('revoked')).toBe('ok');
  });
});
