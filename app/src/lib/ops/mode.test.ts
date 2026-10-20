import { describe, it, expect } from 'vitest';
import { modeDecision, installationMode, samplesAllowed, modeUnset } from './mode';

describe('installation mode', () => {
  it('takes the mode CIVICOS_MODE sets, in any case', () => {
    expect(modeDecision({ CIVICOS_MODE: 'Production', NODE_ENV: 'development' })).toEqual({ mode: 'production', why: 'set' });
    expect(installationMode({ CIVICOS_MODE: 'training', NODE_ENV: 'production' })).toBe('training');
    expect(installationMode({ CIVICOS_MODE: ' demo ', NODE_ENV: 'production' })).toBe('demo');
  });

  it('fails closed in a production build without a mode: production, and says it is unset', () => {
    expect(modeDecision({ NODE_ENV: 'production' })).toEqual({ mode: 'production', why: 'not set (production build)' });
    expect(modeUnset({ NODE_ENV: 'production' })).toBe(true);
    expect(samplesAllowed({ NODE_ENV: 'production' })).toBe(false);
    // An unknown value is not a mode.
    expect(modeUnset({ CIVICOS_MODE: 'live', NODE_ENV: 'production' })).toBe(true);
  });

  it('is a demonstration in development and tests unless set', () => {
    expect(modeDecision({ NODE_ENV: 'test' })).toEqual({ mode: 'demo', why: 'development default' });
    expect(modeUnset({ NODE_ENV: 'development' })).toBe(false);
    expect(samplesAllowed({ NODE_ENV: 'development' })).toBe(true);
  });

  it('allows sample records only outside production', () => {
    expect(samplesAllowed({ CIVICOS_MODE: 'production' })).toBe(false);
    expect(samplesAllowed({ CIVICOS_MODE: 'training' })).toBe(true);
    expect(samplesAllowed({ CIVICOS_MODE: 'demo' })).toBe(true);
  });
});
