import type { Metadata } from 'next';
import './globals.css';
import { getSovereign, getSetup } from '@/lib/data/store';
import { NationRegistry } from '@/components/features/NationRegistry';

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
  const { iso3, regions, currency, locale, stateForm, constitution, stateName, executiveTitle, legislatureName, paymentRail, timeZone, emergency, foreignAffairs } = getSovereign();
  const configured = !!getSetup();
  return (
    <html lang="en" dir="ltr">
      <body>
        <NationRegistry facts={{ iso3, regions, currency, locale, stateForm, constitution, stateName, executiveTitle, legislatureName, configured, paymentRail, timeZone, emergency, foreignAffairs }} />
        {children}
      </body>
    </html>
  );
}
