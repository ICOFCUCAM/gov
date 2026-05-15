// CivicOS — i18n entry.
// Returns the messages for a given locale; falls back to English.
// Per Companion 148: multilingualism is structural.

import type { Locale } from '@/lib/types';
import { en, type Messages } from './locales/en';
import { sw } from './locales/sw';
import { ar } from './locales/ar';
import { fr } from './locales/fr';
import { yo } from './locales/yo';

const dictionaries: Record<Locale, Messages> = {
  en,
  sw,
  ar,
  fr,
  yo,
};

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale] ?? en;
}

// Naive template substitution: replaces {key} occurrences.
export function t(template: string, vars: Record<string, string | number> = {}): string {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    template,
  );
}

export { type Messages };
