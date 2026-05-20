// Public — Ministry of Foreign Affairs homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Foreign Affairs — Official Portal' };

const THEME = {
  ink: '#0e1428', inkSoft: '#1a2240', primary: '#c9a24a', accent: '#3a6dac',
  surface: '#fbf9f1', surfaceMute: '#f1ebd2', line: '#e0d6b3',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default function PublicForeignAffairsPage() {
  return (
    <PublicSiteShell
      theme={THEME}
      institution={{ name: 'Ministry of Foreign Affairs', tagline: 'Pacta sunt servanda — agreements must be kept', role: 'Ministry', href: '/foreign-affairs', crest: '◯',
        emergencyButton: { label: 'Consular Hotline', icon: '☎' } }}
      nav={[
        { label: 'Home', href: '/foreign-affairs', active: true },
        { label: 'Travel', href: '/foreign-affairs' },
        { label: 'Visa', href: '/foreign-affairs' },
        { label: 'Passport', href: '/foreign-affairs' },
        { label: 'Treaties', href: '/foreign-affairs' },
        { label: 'News', href: '/foreign-affairs' },
        { label: 'About', href: '/foreign-affairs' },
      ]}
      hero={{
        headline: <><span style={{ color: THEME.ink }}>Pluralistic World,</span><br /><span style={{ color: THEME.primary }}>Sovereign Polity</span></>,
        subhead: 'Internationally lawful, defensively oriented, never imperial.',
        primaryCta: { label: 'Apply for Passport', icon: '✎' },
        secondaryCta: { label: 'Visa Information', icon: '◯' },
        illustration: <HeroIllustration kind="globe" primary={THEME.primary} accent={THEME.accent} aria="World globe" />,
        sideNote: { icon: '☎', title: 'Citizens abroad', body: 'Register your travel. Free consular assistance when overseas.', cta: 'Register travel' },
      }}
      alert={{ label: 'TRAVEL ADVISORY', text: 'Heightened caution for travel to the Coastal region. Consult the travel-advisory portal for current guidance.' }}
      quickServices={[
        { title: 'Passport', subtitle: 'Apply or renew', color: THEME.primary, icon: '✎' },
        { title: 'Visa Information', subtitle: 'Inbound visa', color: '#3a82d0', icon: '◯' },
        { title: 'Citizens Abroad', subtitle: 'Register travel', color: '#0f7a5f', icon: '✦' },
        { title: 'Document Attestation', subtitle: 'Apostille services', color: '#7c4d8a', icon: '✓' },
        { title: 'Travel Advisories', subtitle: 'By region', color: '#b81c3f', icon: '⚠' },
        { title: 'Consular Emergency', subtitle: '24/7 hotline', color: '#e08a2b', icon: '☎' },
      ]}
      featured={[
        { kicker: 'CONSTITUTIONAL DOCTRINE', title: 'Anti-Imperial Posture', body: 'Defensive, lawful, never imperial. Per-citizen foreign targeting is constitutionally void.', cta: 'Read doctrine', tone: 'primary' },
        { kicker: 'CITIZEN SAFETY', title: 'Consular Continuity', body: 'Citizens registered abroad receive consular protection within 6 hours of emergency.', cta: 'Register', tone: 'subtle' },
        { kicker: 'TRANSPARENCY', title: 'Treaty Atlas', body: 'Every treaty published in full with compliance status. Parliamentary ratification required.', cta: 'Browse treaties', tone: 'amber' },
      ]}
      statistics={[
        { value: '142', label: 'Diplomatic missions', sub: 'Worldwide' },
        { value: '2.8 M', label: 'Citizens abroad', sub: 'Registered' },
        { value: '480', label: 'Treaties in force', sub: 'Bilateral + multilateral' },
        { value: '14 d', label: 'Median passport', sub: 'Standard processing' },
        { value: '99.8%', label: 'Consular case closure', sub: 'Within 30 days' },
        { value: '6 h', label: 'Emergency response', sub: 'Median consular' },
        { value: '0', label: 'Imperial actions', sub: 'Constitutional contract' },
      ]}
      news={[
        { title: 'New Bilateral Treaty Ratified', date: 'May 15, 2025', summary: 'Climate cooperation framework.' },
        { title: 'Passport Online Renewal Live', date: 'May 11, 2025', summary: 'Same-day digital renewal.' },
        { title: 'Consular Capacity Expanded', date: 'May 04, 2025', summary: 'Five new diplomatic missions.' },
      ]}
      initiatives={[
        { title: 'Climate Cooperation', body: 'Multi-lateral climate-finance and adaptation.' },
        { title: 'Cyber Norms', body: 'International cyber-norms diplomatic track.' },
        { title: 'Consular Modernisation', body: 'Digital passport, biometric attestation.' },
      ]}
      locator={{ title: 'Embassies & Missions', placeholder: 'Country or city', tabs: ['Embassies', 'Consulates', 'Missions', 'Honorary'], pinLabel: '◯', pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]] }}
      shortcuts={[
        { title: 'Travel Advisories', subtitle: 'By country' },
        { title: 'Visa Categories', subtitle: 'All visa types' },
        { title: 'Treaty Library', subtitle: 'Full-text search' },
        { title: 'Diplomatic Calendar', subtitle: 'State visits' },
      ]}
      footerSections={[
        { heading: 'Services', items: ['Passport', 'Visa', 'Consular', 'Attestation', 'Travel Registration'] },
        { heading: 'Resources', items: ['Travel Advisories', 'Treaty Library', 'Publications', 'Open Data', 'Contact'] },
        { heading: 'About', items: ['Mandate', 'Foreign Service', 'Careers', 'Audit', 'Transparency'] },
      ]}
      newsletter={{ heading: 'Foreign affairs updates', body: 'Treaty news and consular advisories.' }}
      legalLine="© 2025 Ministry of Foreign Affairs."
      legalLinks={['Privacy', 'Terms', 'Accessibility', 'Sitemap']} />
  );
}
