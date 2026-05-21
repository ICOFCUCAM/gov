import { describe, it, expect } from 'vitest';
import {
  TRADE_GROUPS, TRADE_DOMAINS, TRADE_LEGACY_KEYS,
  domainBySurface, resolveTradeSurface,
} from './domains';

describe('TRADE_DOMAINS', () => {
  it('every domain belongs to a declared group', () => {
    const gk = new Set(TRADE_GROUPS.map(g => g.key));
    for (const d of TRADE_DOMAINS) expect(gk.has(d.group)).toBe(true);
  });
  it('surface ids are unique', () => {
    const ids = TRADE_DOMAINS.map(d => d.surface);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('resolveTradeSurface', () => {
  it('passes through valid surfaces', () => {
    const s = TRADE_DOMAINS[0]!.surface;
    expect(resolveTradeSurface(s)).toBe(s);
  });
  it('migrates legacy keys', () => {
    const legacy = Object.keys(TRADE_LEGACY_KEYS)[0];
    if (!legacy) return;
    expect(resolveTradeSurface(legacy)).toBe(TRADE_LEGACY_KEYS[legacy]);
  });
  it('falls back deterministically', () => {
    const fallback = resolveTradeSurface(null);
    expect(resolveTradeSurface('totally-bogus')).toBe(fallback);
  });
});

describe('domainBySurface', () => {
  it('returns the matching domain', () => {
    const d = TRADE_DOMAINS[0]!;
    expect(domainBySurface(d.surface)).toBe(d);
  });
});
