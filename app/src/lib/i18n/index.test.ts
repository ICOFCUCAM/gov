import { describe, it, expect } from 'vitest';
import { getMessages, t } from './index';
import { defaultLocale, locales, getLocaleSpec, isRTL } from './config';

describe('locales', () => {
  it('lists the five documented locales', () => {
    expect(locales.map(l => l.code)).toEqual(['en','sw','ar','fr','yo']);
  });

  it('defaults to English', () => {
    expect(defaultLocale).toBe('en');
  });

  it('flags Arabic as right-to-left', () => {
    expect(isRTL('ar')).toBe(true);
    expect(isRTL('en')).toBe(false);
    expect(isRTL('fr')).toBe(false);
  });

  it('getLocaleSpec returns the matching spec', () => {
    expect(getLocaleSpec('sw').name).toBe('Kiswahili');
  });

  it('getLocaleSpec falls back to the first entry for an unknown locale', () => {
    expect(getLocaleSpec('xx' as never).code).toBe('en');
  });
});

describe('getMessages', () => {
  it('returns each locale dictionary', () => {
    for (const l of locales) {
      const m = getMessages(l.code);
      expect(m).toBeDefined();
    }
  });

  it('falls back to English for unknown locales', () => {
    const en = getMessages('en');
    expect(getMessages('xx' as never)).toBe(en);
  });
});

describe('t (template substitution)', () => {
  it('replaces single placeholder', () => {
    expect(t('Hello, {name}!', { name: 'World' })).toBe('Hello, World!');
  });

  it('replaces multiple placeholders, repeats supported', () => {
    expect(t('{a} {b} {a}', { a: 'x', b: 'y' })).toBe('x y x');
  });

  it('coerces non-string vars to string', () => {
    expect(t('Count: {n}', { n: 42 })).toBe('Count: 42');
  });

  it('leaves unfilled placeholders intact', () => {
    expect(t('Hi {who}', {})).toBe('Hi {who}');
  });
});
