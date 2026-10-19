import { describe, it, expect } from 'vitest';
import { contrast, readableOn, accessibleTheme, AA } from './contrast';

describe('readable theme colours', () => {
  it('computes WCAG contrast ratios', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#ffffff', '#ffffff')).toBe(1);
    expect(contrast('#767676', '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('darkens a light brand colour just enough, and leaves passing ones alone', () => {
    const gold = readableOn('#c9a24a', ['#ffffff']);
    expect(contrast(gold, '#ffffff')).toBeGreaterThanOrEqual(AA);
    expect(contrast(gold, '#ffffff')).toBeLessThan(5.5);
    expect(readableOn('#0b1a2c', ['#ffffff'])).toBe('#0b1a2c');
    expect(readableOn('linear-gradient(red, blue)', ['#ffffff'])).toBe('linear-gradient(red, blue)');
  });

  it('makes every text colour of a theme readable on its own surfaces', () => {
    const t = accessibleTheme({ ink: '#1a1f30', inkSoft: '#262e44', primary: '#3a82d0', accent: '#c9a24a', surface: '#faf8f1', surfaceMute: '#eef2f9', line: '#dde3ee', emergencyA: '#e0414a', emergencyB: '#a01c25' });
    for (const k of ['primary', 'accent', 'emergencyA'] as const) {
      for (const bg of ['#ffffff', '#faf8f1', '#eef2f9']) expect(contrast(t[k], bg)).toBeGreaterThanOrEqual(AA);
    }
    expect(t.line).toBe('#dde3ee');
    expect(t.surface).toBe('#faf8f1');
  });
});
