import { describe, it, expect } from 'vitest';
import { can, capabilities, checkAction, capabilityForAction, ROLES } from './rbac';

describe('sovereign RBAC', () => {
  it('role matrix is coherent and monotone-ish', () => {
    expect(can('observer', 'view')).toBe(true);
    expect(can('observer', 'act')).toBe(false);
    expect(can('officer', 'act')).toBe(true);
    expect(can('officer', 'approve')).toBe(false);
    expect(can('supervisor', 'approve')).toBe(true);
    expect(can('commander', 'configure')).toBe(true);
    expect(can('auditor', 'annotate')).toBe(true);
    expect(can('auditor', 'act')).toBe(false);
    for (const r of ROLES) expect(capabilities(r).length).toBeGreaterThan(0);
  });

  it('maps actions to capabilities and gates them', () => {
    expect(capabilityForAction('approve')).toBe('approve');
    expect(capabilityForAction('escalate')).toBe('escalate');
    expect(capabilityForAction('advance')).toBe('act');

    const denied = checkAction('observer', 'advance');
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toContain('observer');

    const ok = checkAction('supervisor', 'approve');
    expect(ok.allowed).toBe(true);
    expect(ok.capability).toBe('approve');
  });
});
