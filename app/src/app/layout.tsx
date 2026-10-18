import type { Metadata } from 'next';
import './globals.css';
import { getSovereign, getSetup } from '@/lib/data/store';
import { NationRegistry } from '@/components/features/NationRegistry';
import { NATION_GLOBAL } from '@/lib/nation/registry';
import { RenderNowProvider } from '@/lib/clock/render-now';
import { StackTables } from '@/components/ui/StackTables';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { iso3, regions, currency, locale, languages, stateForm, constitution, stateName, executiveTitle, legislatureName, paymentRail, timeZone, emergency, foreignAffairs, aiAssistant, seal, accent, map } = getSovereign();
  const configured = !!getSetup();
  const facts = { iso3, regions, currency, locale, languages, stateForm, constitution, stateName, executiveTitle, legislatureName, configured, paymentRail, timeZone, emergency, foreignAffairs, aiAssistant, seal, accent, map };
  return (
    <html lang="en" dir="ltr">
      <head>
        {/* The nation's facts before any page code loads, so modules that read regions or offices when
            they load see the nation's, as the server did (lib/nation/registry.ts). */}
        <script dangerouslySetInnerHTML={{ __html: `window.${NATION_GLOBAL}=${JSON.stringify(facts).replace(/</g, '\\u003c')};` }} />
      </head>
      <body>
        <NationRegistry facts={facts} />
        <StackTables />
        <RenderNowProvider value={Date.now()}>{children}</RenderNowProvider>
      </body>
    </html>
  );
}
