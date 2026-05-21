import { describe, it, expect } from 'vitest';
import { resolveIdentity, shellStrings } from './sovereign-identity';
import type { SovereignProfile } from '@/lib/api/types';

function profile(overrides: Partial<SovereignProfile> = {}): SovereignProfile {
  return {
    stateName: 'Republic of Civica',
    stateForm: 'republic',
    executiveTitle: 'President',
    legislatureName: 'National Assembly',
    seal: '',
    accent: '',
    motto: '',
    locale: 'en',
    ...overrides,
  } as SovereignProfile;
}

describe('resolveIdentity', () => {
  it('falls back to the default accent when no valid hex is provided', () => {
    expect(resolveIdentity(profile()).accent).toBe('#1f2630');
    expect(resolveIdentity(profile({ accent: 'not-a-color' })).accent).toBe('#1f2630');
  });

  it('keeps a well-formed hex accent', () => {
    expect(resolveIdentity(profile({ accent: '#abcdef' })).accent).toBe('#abcdef');
  });

  it('derives initials from the state name when no seal is set', () => {
    expect(resolveIdentity(profile({ stateName: 'Republic of Civica' })).seal).toBe('RC');
  });

  it('respects a provided seal', () => {
    expect(resolveIdentity(profile({ seal: 'RC' })).seal).toBe('RC');
  });

  it('marks RTL locales correctly', () => {
    expect(resolveIdentity(profile({ locale: 'ar' })).dir).toBe('rtl');
    expect(resolveIdentity(profile({ locale: 'he-IL' })).dir).toBe('rtl');
    expect(resolveIdentity(profile({ locale: 'en' })).dir).toBe('ltr');
  });

  it('emits a monarchy protocol order with the Sovereign first', () => {
    const id = resolveIdentity(profile({ stateForm: 'monarchy' }));
    expect(id.protocol[0]!.office).toBe('Head of State');
    expect(id.protocol).toHaveLength(4);
  });

  it('emits a union protocol order with Executive first', () => {
    const id = resolveIdentity(profile({ stateForm: 'union' }));
    expect(id.protocol[0]!.office).toBe('Executive');
    expect(id.protocol).toHaveLength(3);
  });
});

describe('shellStrings', () => {
  it('returns the English pack by default', () => {
    expect(shellStrings('en').state).toBe('State');
  });

  it('returns French strings for fr / fr-FR', () => {
    expect(shellStrings('fr').state).toBe('État');
    expect(shellStrings('fr-FR').state).toBe('État');
  });

  it('returns Arabic strings for ar', () => {
    expect(shellStrings('ar').state).toBe('الدولة');
  });

  it('falls back to English for unknown locales', () => {
    expect(shellStrings('xx').state).toBe('State');
  });

  it('pluralises active-incidents helper', () => {
    expect(shellStrings('en').activeIncidents(1)).toBe('1 active incident');
    expect(shellStrings('en').activeIncidents(3)).toBe('3 active incidents');
  });
});
