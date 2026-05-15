import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CivicOS',
  description:
    'CivicOS — sovereign operational platform. Humans govern. Institutions govern. Constitutions govern. AI assists.',
  applicationName: 'CivicOS',
  robots: { index: false, follow: false }, // prototype default
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>{children}</body>
    </html>
  );
}
