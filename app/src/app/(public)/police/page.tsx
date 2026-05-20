// Public — Police Command homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Police Command — Official Portal' };

const THEME = {
  ink: '#0b1a2c', inkSoft: '#13294b', primary: '#1e63b8', accent: '#3a82d0',
  surface: '#f4f6f9', surfaceMute: '#e8eef6', line: '#dde3ec',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default function PublicPolicePage() {
  return (
    <PublicSiteShell
      theme={THEME}
      institution={{ name: 'Police Command', tagline: 'Civil stability under the rule of law', role: 'Agency', href: '/police', crest: '🛡',
        emergencyButton: { label: 'Emergency 999', icon: '☎' } }}
      nav={[
        { label: 'Home', href: '/police', active: true },
        { label: 'Services', href: '/police' },
        { label: 'Report Crime', href: '/police' },
        { label: 'Stations', href: '/police' },
        { label: 'Programs', href: '/police' },
        { label: 'News & Alerts', href: '/police' },
        { label: 'About', href: '/police' },
      ]}
      hero={{
        headline: <><span style={{ color: THEME.ink }}>Safe Citizens,</span><br /><span style={{ color: THEME.primary }}>Sovereign Order</span></>,
        subhead: 'Under the constitution, under the law, in service of every citizen.',
        primaryCta: { label: 'Report a Crime', icon: '⚠' },
        secondaryCta: { label: 'Find a Station', icon: '📍' },
        illustration: <HeroIllustration kind="shield" primary={THEME.primary} accent={THEME.accent} aria="Shield emblem of civil order" />,
        sideNote: { icon: '☎', title: 'Emergency: 999', body: 'For life-threatening emergencies, dial immediately.', cta: 'Other helplines' },
      }}
      alert={{ label: 'PUBLIC ADVISORY', text: 'Phishing fraud targeting digital identity is rising. Verify any sovereign request before sharing credentials.' }}
      quickServices={[
        { title: 'Report a Crime', subtitle: 'Online or in-person', color: THEME.primary, icon: '!' },
        { title: 'Lost / Found', subtitle: 'File or look up', color: '#3a82d0', icon: '⌕' },
        { title: 'Police Clearance', subtitle: 'Apply or renew', color: '#7c5cff', icon: '✓' },
        { title: 'Traffic Ticket', subtitle: 'Pay or contest', color: '#e08a2b', icon: '⚑' },
        { title: 'Missing Person', subtitle: 'Report or search', color: '#d62b67', icon: '?' },
        { title: 'Community Liaison', subtitle: 'Engage with us', color: '#0f9d6b', icon: '⬡' },
      ]}
      featured={[
        { kicker: 'COMMUNITY PROGRAMME', title: 'Safer Neighbourhoods', body: 'Every district has a community liaison officer. Meet yours, share concerns, build trust.', cta: 'Find your liaison', tone: 'primary' },
        { kicker: 'TRANSPARENCY', title: 'Use-of-Force Reports', body: 'Quarterly reports on every use-of-force incident — proportionality reviewed, civilian-panel oversight.', cta: 'Read latest report', tone: 'subtle' },
        { kicker: 'CIVIL RIGHTS', title: 'Your Rights Matter', body: 'Every detainee has the right to counsel, to family notification, and to humane treatment. Know them.', cta: 'Read your rights', tone: 'amber' },
      ]}
      statistics={[
        { value: '4,820', label: 'Active officers', sub: 'Sworn personnel' },
        { value: '8 min', label: 'Median response', sub: 'P1 emergencies' },
        { value: '74%', label: 'Clearance rate', sub: 'Major-case clearance' },
        { value: '124', label: 'Community liaisons', sub: 'Districts covered' },
        { value: '12', label: 'Tribunal hearings', sub: 'Civilian-panel oversight' },
        { value: '99.4%', label: 'Bodyworn coverage', sub: 'Use-of-force incidents' },
        { value: '0', label: 'Concealed incidents', sub: 'Constitutional contract' },
      ]}
      news={[
        { title: 'New Anti-Fraud Unit Launched', date: 'May 14, 2025', summary: 'A specialist team to tackle digital identity theft.' },
        { title: 'Quarterly Force Report Published', date: 'May 10, 2025', summary: 'Use-of-force, complaints and clearance figures.' },
        { title: 'Youth Diversion Programme Expanded', date: 'May 04, 2025', summary: 'Now active in 16 districts.' },
      ]}
      initiatives={[
        { title: 'Safer Schools Liaison', body: 'School-resource officers trained in trauma-informed care.' },
        { title: 'Domestic Safety Network', body: 'Safety plans, protective orders, and trauma support — 24/7.' },
        { title: 'Open Forensics Doctrine', body: 'Every case sealed by independent custodian; chain-of-custody public.' },
      ]}
      locator={{ title: 'Find Your Nearest Station', placeholder: 'Enter your postcode', tabs: ['Stations', 'Liaisons', 'Tribunals', 'Online'], pinLabel: 'P', pinCoords: [[22, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]] }}
      shortcuts={[
        { title: 'Crime Statistics', subtitle: 'District & national' },
        { title: 'Open Data', subtitle: 'Incidents, clearances, complaints' },
        { title: 'Career & Recruitment', subtitle: 'Become an officer' },
        { title: 'Complaints Tribunal', subtitle: 'Civilian oversight' },
      ]}
      footerSections={[
        { heading: 'Services', items: ['Report Crime', 'Police Clearance', 'Traffic Tickets', 'Missing Persons', 'Community Liaison'] },
        { heading: 'Resources', items: ['Publications', 'Open Data', 'Media Centre', 'Constitution & Rights', 'Contact'] },
        { heading: 'About', items: ['Command Structure', 'Code of Conduct', 'Careers', 'Civilian Oversight', 'Transparency'] },
      ]}
      newsletter={{ heading: 'Citizen safety updates', body: 'Monthly digest of advisories and reports.' }}
      legalLine="© 2025 Police Command. All rights reserved."
      legalLinks={['Privacy Policy', 'Code of Conduct', 'Accessibility', 'Sitemap']} />
  );
}
