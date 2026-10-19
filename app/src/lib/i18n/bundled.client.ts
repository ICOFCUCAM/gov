// The browser's built-in dictionaries (go-live review L-7): English only, the
// fallback for any text a language lacks. next.config.mjs puts this module in
// place of ./bundled.ts in browser bundles. The nation's own languages arrive
// with the page (the root layout's MESSAGES_GLOBAL); others load on request
// (loadMessages in ./index.ts).
import type { Locale } from '@/lib/types';
import { en, type Messages } from './locales/en';

export const BUNDLED: Partial<Record<Locale, Messages>> = { en };
