import { describe, it, expect } from 'vitest';
import {
  BRANCHES, separationIntact, canAccess, authorizeSovereignAction,
  pendingSovereignActions, citizenView, colorState,
} from './constitutional-governance';
import { observabilityLedger } from './sovereign-observability';

describe('constitutional governance', () => {
  it('separation of powers is structurally intact', () => {
    expect(separationIntact()).toBe(true);
    const ops = BRANCHES.find(b => b.key === 'OPERATIONS')!;
    expect(ops.powers).toEqual(['execute']);
    expect(BRANCHES.every(b => b.powers.length < 5)).toBe(true);
    const jud = BRANCHES.find(b => b.key === 'JUDICIAL')!;
    expect(jud.powers).not.toContain('execute');
  });

  it('multi-key authority refuses unless all sovereign keys + judicial token present', () => {
    expect(authorizeSovereignAction('record-deletion', ['MINISTRY']).permitted).toBe(false);
    expect(authorizeSovereignAction('record-deletion', ['MINISTRY', 'JUDICIAL', 'OVERSIGHT']).permitted).toBe(true);
    // surveillance needs a live judicial token even with all keys
    expect(authorizeSovereignAction('national-surveillance', ['MINISTRY', 'JUDICIAL', 'OVERSIGHT'],
      { present: true, expired: true }).permitted).toBe(false);
    expect(authorizeSovereignAction('national-surveillance', ['MINISTRY', 'JUDICIAL', 'OVERSIGHT'],
      { present: true, expired: false }).permitted).toBe(true);
    const r = authorizeSovereignAction('national-lockdown', ['MINISTRY']);
    expect(r.verdict).toBe('REFUSED');
    expect(r.missing).toEqual(['JUDICIAL', 'OVERSIGHT']);
  });

  it('jurisdiction visibility denies out-of-mandate access', () => {
    expect(canAccess('officer', 'POLICE', 'intelligence').allowed).toBe(false);
    expect(canAccess('officer', 'CIVIL_REGISTRY', 'operational').allowed).toBe(true);
    expect(canAccess('commander', 'POLICE', 'investigation').allowed).toBe(true);
    expect(canAccess('supervisor', 'POLICE', 'citizen-confidential').allowed).toBe(false);
    expect(canAccess('auditor', 'POLICE', 'citizen-confidential').allowed).toBe(true);
  });

  it('citizen projection never exposes officer, risk or confidential internals', () => {
    const v = citizenView(4000 * 140);
    const json = JSON.stringify(v);
    expect(json).not.toContain('corruptionRisk');
    expect(json).not.toContain('officer');
    expect(json).not.toContain('riskFlags');
    for (const f of v) {
      if (f.protected) {
        expect(f.stage).toBeUndefined();
        expect(f.ageHrs).toBeUndefined();
        expect(f.ref).toContain('••••');
      } else {
        expect(f.escalationPath && f.escalationPath.length).toBeGreaterThan(0);
      }
    }
  });

  it('color state maps constitutional severity and is deterministic', () => {
    const a = observabilityLedger(4000 * 200).map(colorState);
    const b = observabilityLedger(4000 * 200).map(colorState);
    expect(a).toEqual(b);
    for (const t of observabilityLedger(4000 * 200)) {
      if (t.constitutional === 'breach' && !t.riskFlags.includes('unlawful-pause')) {
        expect(colorState(t)).toBe('red');
      }
    }
    expect(pendingSovereignActions(4000 * 200)).toEqual(pendingSovereignActions(4000 * 200));
  });
});
