// CivicOS — i18n entry.
// Returns the messages for a given locale; falls back to English.
// Per Companion 148: multilingualism is structural.
//
// Which dictionaries are at hand (go-live review L-7): the server and tests
// have every one (./bundled.ts). A browser bundle carries English only
// (./bundled.client.ts, swapped in by next.config.mjs); the root layout writes
// the nation's own languages into the page before any script runs
// (MESSAGES_GLOBAL), so the first render in the browser matches the server's,
// and loadMessages() fetches any other language as its own chunk (a language
// chosen in setup while the page is open). Callers keep using getMessages()
// through nationMessages() and siteMessages() (lib/nation/registry.ts).

import type { Locale } from '@/lib/types';
import type { Messages } from './locales/en';
import { BUNDLED } from './bundled';

/** The global the root layout's inline script fills with the nation's languages' dictionaries (app/layout.tsx). */
export const MESSAGES_GLOBAL = '__CIVICOS_MESSAGES__';

const dictionaries: Partial<Record<Locale, Messages>> = { ...BUNDLED };
if (typeof window !== 'undefined') {
  const early = (window as unknown as Record<string, Partial<Record<Locale, Messages>> | undefined>)[MESSAGES_GLOBAL];
  if (early) for (const [l, m] of Object.entries(early)) if (m && !dictionaries[l as Locale]) dictionaries[l as Locale] = m;
}

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale] ?? dictionaries.en!;
}

/** Whether a language's dictionary is at hand (always, on the server). */
export const hasMessages = (locale: Locale): boolean => !!dictionaries[locale];

const loaders: Record<Locale, () => Promise<Messages>> = {
  en: () => import('./locales/en').then(m => m.en),
  sw: () => import('./locales/sw').then(m => m.sw),
  ar: () => import('./locales/ar').then(m => m.ar),
  fr: () => import('./locales/fr').then(m => m.fr),
  yo: () => import('./locales/yo').then(m => m.yo),
};

/** Make a language's dictionary available (its own chunk in the browser); English for an unknown one. */
export async function loadMessages(locale: Locale): Promise<Messages> {
  const have = dictionaries[locale];
  if (have) return have;
  const load = loaders[locale];
  if (!load) return dictionaries.en!;
  return (dictionaries[locale] = await load());
}

// Naive template substitution: replaces {key} occurrences.
export function t(template: string, vars: Record<string, string | number> = {}): string {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    template,
  );
}

export { type Messages };
