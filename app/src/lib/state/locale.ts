// CivicOS — locale state primitives (client-side).
// Production uses URL-based locale segments + middleware; this prototype keeps
// the locale in localStorage for the wallet-only single-locale demo.

'use client';

import type { Locale } from '@/lib/types';
import { defaultLocale } from '@/lib/i18n/config';

const KEY = 'civicos:locale';

export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  try {
    const v = window.localStorage.getItem(KEY);
    if (v && (['en', 'sw', 'ar', 'fr', 'yo'] as Locale[]).includes(v as Locale)) {
      return v as Locale;
    }
  } catch {}
  return defaultLocale;
}

export function setStoredLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = ['ar'].includes(locale) ? 'rtl' : 'ltr';
  } catch {}
}
