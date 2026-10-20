import { describe, expect, it } from 'vitest';
import { applySovereignPreset, getSovereign, setSovereign, authorityFor } from './sovereign';
import { listMinistries } from './ministries';

describe('a sovereign preset', () => {
  it('keeps who is responsible for each register, the languages and the assistant choice', () => {
    const [court, dp] = listMinistries().filter(m => m.status === 'active').map(m => m.id);
    const set = setSovereign({ deployment: { authorities: { judiciary: court!, dataProtection: dp! } }, aiAssistant: false } as never, 'test');
    expect('error' in set).toBe(false);
    const r = applySovereignPreset('presidential-republic', 'test');
    expect('error' in r).toBe(false);
    expect(authorityFor('judiciary')).toBe(court);
    expect(authorityFor('dataProtection')).toBe(dp);
    expect(getSovereign().aiAssistant).toBe(false);
    expect(getSovereign().executiveTitle).toBe('President');
  });
});
