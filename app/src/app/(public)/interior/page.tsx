// Public — Ministry of Interior homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Interior — Official Portal' };

const THEME = {
  ink: '#15192a', inkSoft: '#222842', primary: '#5a6da6', accent: '#8a9bbe',
  surface: '#f4f6fa', surfaceMute: '#e6e9f3', line: '#d6dbe7',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default function PublicInteriorPage() {
  return (
    <PublicSiteShell
      theme={THEME}
      institution={{ name: 'Ministry of Interior', tagline: 'Civil stability, civic identity, regional coordination', role: 'Ministry', href: '/interior', crest: '◧',
        emergencyButton: { label: 'Civic Services', icon: '☎' } }}
      nav={[
        { label: 'Home', href: '/interior', active: true },
        { label: 'Civic ID', href: '/interior' },
        { label: 'Borders', href: '/interior' },
        { label: 'Customs', href: '/interior' },
        { label: 'Regional', href: '/interior' },
        { label: 'News', href: '/interior' },
        { label: 'About', href: '/interior' },
      ]}
      hero={{
        headline: <><span style={{ color: THEME.ink }}>One Nation,</span><br /><span style={{ color: THEME.primary }}>Many Regions</span></>,
        subhead: 'Civic identity, border continuity, regional coordination.',
        primaryCta: { label: 'CivicID', icon: '◈' },
        secondaryCta: { label: 'Border Status', icon: '⌗' },
        illustration: <HeroIllustration kind="shield" primary={THEME.primary} accent={THEME.accent} aria="Interior shield emblem" />,
        sideNote: { icon: '✚', title: 'Civic services', body: 'CivicID enrolment, civil registration, regional liaison — at 480 local offices.', cta: 'Find office' },
      }}
      alert={{ label: 'CIVIC NOTICE', text: 'CivicID renewal cycle 2025 has begun. Visit your local office or use the online portal.' }}
      quickServices={[
        { title: 'CivicID Enrol', subtitle: 'New or renewal', color: THEME.primary, icon: '◈' },
        { title: 'Civil Registration', subtitle: 'Birth / death / marriage', color: '#0f7a5f', icon: '✎' },
        { title: 'Border Permit', subtitle: 'Cross-border movement', color: '#7c4d8a', icon: '⌗' },
        { title: 'Customs Clearance', subtitle: 'Import/export goods', color: '#b48a3d', icon: '⌖' },
        { title: 'Regional Liaison', subtitle: 'Your local office', color: '#3a82d0', icon: '◧' },
        { title: 'Civic Services Hotline', subtitle: 'Citizen support', color: '#e08a2b', icon: '☎' },
      ]}
      featured={[
        { kicker: 'CONSTITUTIONAL CONTRACT', title: 'Civic Identity as Right', body: 'Every citizen has a right to enrol. CivicID consent-based, never used for surveillance.', cta: 'Read safeguards', tone: 'primary' },
        { kicker: 'COORDINATION', title: 'National-Regional Mesh', body: 'Interior coordinates 68 regional units. Equitable resource allocation; no district left behind.', cta: 'Regional dashboard', tone: 'subtle' },
        { kicker: 'BORDER CONTINUITY', title: 'Lawful Border Management', body: 'Borders managed lawfully; humanitarian protections honoured. Arbitrary detention void.', cta: 'Read doctrine', tone: 'amber' },
      ]}
      statistics={[
        { value: '142 M', label: 'CivicID enrolled', sub: 'Total citizens' },
        { value: '480', label: 'Local offices', sub: 'Regional coverage' },
        { value: '24/7', label: 'Border continuity', sub: 'All ports of entry' },
        { value: '68', label: 'Regional units', sub: 'National mesh' },
        { value: '92%', label: 'Civil reg same-day', sub: 'Birth registrations' },
        { value: '6.4 d', label: 'Median CivicID', sub: 'New enrolment' },
        { value: '0', label: 'Arbitrary detentions', sub: 'Constitutional contract' },
      ]}
      news={[
        { title: 'Online CivicID Renewal Live', date: 'May 15, 2025', summary: 'Renew without visiting an office.' },
        { title: 'Regional Liaison Network Expanded', date: 'May 11, 2025', summary: '64 new staff posted.' },
        { title: 'Border Management Modernised', date: 'May 04, 2025', summary: 'Digital pre-clearance at major ports.' },
      ]}
      initiatives={[
        { title: 'Universal CivicID', body: 'Free enrolment, biometric attestation.' },
        { title: 'Regional Mesh', body: 'Inter-regional coordination platform.' },
        { title: 'Civic Service Modernisation', body: 'Digital-first, paper as fallback.' },
      ]}
      locator={{ title: 'Local Offices', placeholder: 'Enter your district', tabs: ['CivicID', 'Civil Reg', 'Border', 'Customs'], pinLabel: '◧', pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]] }}
      shortcuts={[
        { title: 'Civic Library', subtitle: 'Identity & rights' },
        { title: 'Regional Statistics', subtitle: 'Open data' },
        { title: 'Border Procedures', subtitle: 'Cross-border guide' },
        { title: 'Civic Education', subtitle: 'Rights & obligations' },
      ]}
      footerSections={[
        { heading: 'Services', items: ['CivicID', 'Civil Registration', 'Border', 'Customs', 'Regional Liaison'] },
        { heading: 'Resources', items: ['Open Data', 'Publications', 'Civic Library', 'Forms', 'Contact'] },
        { heading: 'About', items: ['Mandate', 'Regional Mesh', 'Careers', 'Audit', 'Transparency'] },
      ]}
      newsletter={{ heading: 'Interior updates', body: 'CivicID, regional and border notices.' }}
      legalLine="© 2025 Ministry of Interior."
      legalLinks={['Privacy', 'Terms', 'Accessibility', 'Sitemap']} />
  );
}
