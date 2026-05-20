// Public — Ministry of Trade homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Trade & Industry — Official Portal' };

const THEME = {
  ink: '#1a1c25', inkSoft: '#272a36', primary: '#b58a35', accent: '#e07a3a',
  surface: '#faf8f1', surfaceMute: '#f1ead4', line: '#dfd5b7',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default function PublicTradePage() {
  return (
    <PublicSiteShell
      theme={THEME}
      institution={{ name: 'Ministry of Trade, Industry & Strategic Production', tagline: 'Commercium aequum — fair commerce', role: 'Ministry', href: '/trade', crest: '⌬',
        emergencyButton: null }}
      nav={[
        { label: 'Home', href: '/trade', active: true },
        { label: 'Businesses', href: '/trade' },
        { label: 'Exporters', href: '/trade' },
        { label: 'Standards', href: '/trade' },
        { label: 'Industrial Parks', href: '/trade' },
        { label: 'News', href: '/trade' },
        { label: 'About', href: '/trade' },
      ]}
      hero={{
        headline: <><span style={{ color: THEME.ink }}>Sovereign Industry,</span><br /><span style={{ color: THEME.primary }}>Fair Commerce</span></>,
        subhead: 'Non-discriminatory access, transparent tender, strategic-reserve protection.',
        primaryCta: { label: 'Register a Business', icon: '⌂' },
        secondaryCta: { label: 'Export Application', icon: '⌖' },
        illustration: <HeroIllustration kind="tower" primary={THEME.primary} accent={THEME.accent} aria="Industrial corridor" />,
        sideNote: { icon: '✦', title: 'Strategic industries', body: '21 strategic industries — protected reserves, priority allocation, transparent tender.', cta: 'View industries' },
      }}
      alert={{ label: 'TRADE NOTICE', text: 'New simplified exporter registration — 14-day decision, single-document. Effective June 1.' }}
      quickServices={[
        { title: 'Register Business', subtitle: 'New or update', color: THEME.primary, icon: '⌂' },
        { title: 'Export Application', subtitle: 'Trade-corridor permit', color: '#0f7a5f', icon: '⌖' },
        { title: 'Industrial Permit', subtitle: 'Manufacturing or warehouse', color: '#3a82d0', icon: '⌗' },
        { title: 'Standards Certification', subtitle: 'Conformity testing', color: '#7c4d8a', icon: '✓' },
        { title: 'Industrial Park', subtitle: 'Lease application', color: '#b81c3f', icon: '◧' },
        { title: 'Trade Statistics', subtitle: 'Public data', color: '#e08a2b', icon: '✦' },
      ]}
      featured={[
        { kicker: 'CONSTITUTIONAL CONTRACT', title: 'Non-Discriminatory Access', body: 'Markets and tenders open to all citizens. Cartel toleration is void.', cta: 'Read doctrine', tone: 'primary' },
        { kicker: 'STRATEGIC RESERVE', title: 'Sovereign Industries', body: '21 industries with protected reserves and priority allocation — pharmaceuticals, semiconductors, food staples.', cta: 'View industries', tone: 'subtle' },
        { kicker: 'TRADE FLOWS', title: 'Open Trade Statistics', body: 'Monthly export, import, corridor utilisation — published as open data within 5 days.', cta: 'Browse data', tone: 'amber' },
      ]}
      statistics={[
        { value: '1.4 M', label: 'Registered businesses', sub: 'Active' },
        { value: '6.4 d', label: 'Median registration', sub: 'New businesses' },
        { value: '21', label: 'Strategic industries', sub: 'Protected' },
        { value: '32', label: 'Industrial parks', sub: 'Operational' },
        { value: '78%', label: 'Conformity rate', sub: 'Standards lab' },
        { value: '92%', label: 'Trade-corridor uptime', sub: 'National average' },
        { value: '0', label: 'Non-tender awards', sub: 'Constitutional contract' },
      ]}
      news={[
        { title: 'Simplified Exporter Permit', date: 'May 15, 2025', summary: '14-day decision, single-document.' },
        { title: 'Coastal Industrial Park Expansion', date: 'May 10, 2025', summary: '60 new tenant slots.' },
        { title: 'Standards Lab Accreditation', date: 'May 03, 2025', summary: 'Three new accredited labs.' },
      ]}
      initiatives={[
        { title: 'SME Acceleration', body: 'Capital, training, mentorship for small enterprises.' },
        { title: 'Standards Modernisation', body: 'Bringing national standards into global alignment.' },
        { title: 'Strategic Reserve Programme', body: 'Critical industries protected by reserves.' },
      ]}
      locator={{ title: 'Industrial Parks & Service Centres', placeholder: 'Enter your district', tabs: ['Parks', 'Service Centres', 'Standards Labs', 'Customs'], pinLabel: '⌗', pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]] }}
      shortcuts={[
        { title: 'Trade Library', subtitle: 'Agreements & treaties' },
        { title: 'Standards Code', subtitle: 'Conformity criteria' },
        { title: 'Open Trade Data', subtitle: 'Monthly statistics' },
        { title: 'Customs Procedures', subtitle: 'Import / export' },
      ]}
      footerSections={[
        { heading: 'Services', items: ['Business Registration', 'Export Permits', 'Standards', 'Industrial Parks', 'Trade Statistics'] },
        { heading: 'Resources', items: ['Trade Library', 'Open Data', 'Publications', 'Forms', 'Contact'] },
        { heading: 'About', items: ['Mandate', 'Strategy', 'Careers', 'Audit', 'Transparency'] },
      ]}
      newsletter={{ heading: 'Trade & industry updates', body: 'Permit openings and corridor advisories.' }}
      legalLine="© 2025 Ministry of Trade, Industry & Strategic Production."
      legalLinks={['Privacy', 'Terms', 'Accessibility', 'Sitemap']} />
  );
}
