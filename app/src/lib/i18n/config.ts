// CivicOS — i18n configuration.
// Per Companion 148 (Sovereign Language Infrastructure Layer):
// languages are first-class at the architecture level, not a frontend skin.

import type { Locale, LocaleSpec } from '@/lib/types';

export const locales: LocaleSpec[] = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'sw', name: 'Kiswahili', dir: 'ltr' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'yo', name: 'Yorùbá', dir: 'ltr' },
];

export const defaultLocale: Locale = 'en';

export function getLocaleSpec(code: Locale): LocaleSpec {
  return locales.find(l => l.code === code) ?? locales[0]!;
}

export function isRTL(code: Locale): boolean {
  return getLocaleSpec(code).dir === 'rtl';
}
