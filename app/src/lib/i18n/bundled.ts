// Every dictionary, for the server and tests (go-live review L-7). Browser
// bundles get ./bundled.client.ts instead (next.config.mjs replaces this
// module there), so pages ship English only; the root layout writes the
// nation's own languages into the page (MESSAGES_GLOBAL) and ./index.ts
// loads any other on request.
import type { Locale } from '@/lib/types';
import { en, type Messages } from './locales/en';
import { sw } from './locales/sw';
import { ar } from './locales/ar';
import { fr } from './locales/fr';
import { yo } from './locales/yo';

export const BUNDLED: Partial<Record<Locale, Messages>> = { en, sw, ar, fr, yo };
