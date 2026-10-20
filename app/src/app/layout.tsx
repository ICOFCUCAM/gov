import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { getSovereign, getSetup } from '@/lib/data/store';
import { NationRegistry } from '@/components/features/NationRegistry';
import { NATION_GLOBAL } from '@/lib/nation/registry';
import { RenderNowProvider } from '@/lib/clock/render-now';
import { StackTables } from '@/components/ui/StackTables';
import { OpenModeBanner } from '@/components/ui/OpenModeBanner';
import { openInProduction } from '@/lib/auth/mode';
import { InstallationBanner } from '@/components/ui/InstallationBanner';
import { installationMode, modeUnset } from '@/lib/ops/mode';
import { getMessages, MESSAGES_GLOBAL } from '@/lib/i18n';
import { locales as LOCALES } from '@/lib/i18n/config';
import type { Locale } from '@/lib/types';

// The installed nation is read per request so every page reflects it.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    default: 'CivicOS — Sovereign Operating System',
    template: '%s · CivicOS',
  },
  description:
    'CivicOS — sovereign operational platform. Humans govern. Institutions govern. Constitutions govern.',
  applicationName: 'CivicOS',
  robots: { index: false, follow: false }, // prototype default
};

/**
 * The nation's languages' dictionaries, for the browser (go-live review L-7):
 * its bundles carry English only (lib/i18n/bundled.client.ts), so the
 * languages this page can show, the nation's main one and its further official
 * ones (public-site visitors choose among them), come with the page, the same
 * text the server rendered with. English needs nothing.
 */
function messagesScript(langs: (string | undefined)[]): string {
  const known = new Set(LOCALES.map(l => l.code as string));
  const wanted = [...new Set(langs.filter((l): l is Locale => !!l && l !== 'en' && known.has(l)))];
  if (!wanted.length) return '';
  const dicts = Object.fromEntries(wanted.map(l => [l, getMessages(l)]));
  return `window.${MESSAGES_GLOBAL}=${JSON.stringify(dicts).replace(/</g, '\\u003c')};`;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { iso3, regions, currency, locale, languages, stateForm, constitution, stateName, executiveTitle, legislatureName, paymentRail, timeZone, emergency, foreignAffairs, aiAssistant, seal, accent, map } = getSovereign();
  const configured = !!getSetup();
  const facts = { iso3, regions, currency, locale, languages, stateForm, constitution, stateName, executiveTitle, legislatureName, configured, paymentRail, timeZone, emergency, foreignAffairs, aiAssistant, seal, accent, map };
  // The request's script nonce (src/middleware.ts): the Content-Security-Policy runs no inline script without it.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="en" dir="ltr">
      <head>
        {/* The nation's facts before any page code loads, so modules that read regions or offices when
            they load see the nation's, as the server did (lib/nation/registry.ts). */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: `window.${NATION_GLOBAL}=${JSON.stringify(facts).replace(/</g, '\\u003c')};${messagesScript([locale, ...(languages ?? [])])}` }} />
      </head>
      <body>
        <NationRegistry facts={facts} />
        {/* A production server left open on purpose says so on every console page (lib/auth/mode.ts, review L-2). */}
        {openInProduction() ? <OpenModeBanner /> : null}
        {/* A training or demonstration installation, or a production build without CIVICOS_MODE, says so on every page (lib/ops/mode.ts). */}
        <InstallationBanner mode={installationMode()} unset={modeUnset()} />
        <StackTables />
        <RenderNowProvider value={Date.now()}>{children}</RenderNowProvider>
      </body>
    </html>
  );
}
