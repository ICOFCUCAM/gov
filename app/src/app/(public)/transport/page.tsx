// Public — Ministry of Transport homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Transport & Mobility — Official Portal' };

const THEME = {
  ink: '#0a1622', inkSoft: '#13243a', primary: '#1f6bcc', accent: '#5fc4f0',
  surface: '#f4f8fc', surfaceMute: '#e3eef9', line: '#d4e0ee',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default function PublicTransportPage() {
  return (
    <PublicSiteShell
      theme={THEME}
      institution={{ name: 'Ministry of Transport & National Logistics', tagline: 'Viae publicae — roads belong to the people', role: 'Ministry', href: '/transport', crest: '⌗',
        emergencyButton: { label: 'Traffic 144', icon: '☎' } }}
      nav={[
        { label: 'Home', href: '/transport', active: true },
        { label: 'Public Transit', href: '/transport' },
        { label: 'Permits', href: '/transport' },
        { label: 'Corridors', href: '/transport' },
        { label: 'Safety', href: '/transport' },
        { label: 'News', href: '/transport' },
        { label: 'About', href: '/transport' },
      ]}
      hero={{
        headline: <><span style={{ color: THEME.ink }}>Moving People,</span><br /><span style={{ color: THEME.primary }}>Connecting Polity</span></>,
        subhead: 'Safe roads, reliable transit, equitable access — for every citizen.',
        primaryCta: { label: 'Plan a Journey', icon: '⌗' },
        secondaryCta: { label: 'Vehicle Permits', icon: '✎' },
        illustration: <HeroIllustration kind="wheel" primary={THEME.primary} accent={THEME.accent} aria="Transport wheel" />,
        sideNote: { icon: '⌭', title: 'Live transit', body: 'Real-time bus, rail, ferry schedules. On-time performance: 91%.', cta: 'Live status' },
      }}
      alert={{ label: 'CORRIDOR ADVISORY', text: 'Eastern Trunk km 124 closure — detour via Coastal Highway. Bridge inspection underway.' }}
      quickServices={[
        { title: 'Plan a Journey', subtitle: 'Multi-modal', color: THEME.primary, icon: '⌗' },
        { title: 'Vehicle Registration', subtitle: 'New or renewal', color: '#0f7a5f', icon: '✎' },
        { title: 'Driver Licence', subtitle: 'Apply or renew', color: '#7c4d8a', icon: '◧' },
        { title: 'Freight Permit', subtitle: 'Commercial cargo', color: '#b48a3d', icon: '⌖' },
        { title: 'Report a Hazard', subtitle: 'Roads or rail', color: '#b81c3f', icon: '⚠' },
        { title: 'Public Transit', subtitle: 'Schedules & fares', color: '#3a82d0', icon: '═' },
      ]}
      featured={[
        { kicker: 'EQUITY', title: 'Evacuation Priority', body: 'Constitutional priority for evacuation — commercial freight yields. Logged and reviewable.', cta: 'Read doctrine', tone: 'primary' },
        { kicker: 'SAFETY', title: 'Bridge & Tunnel Audit', body: 'Every critical structure inspected on cadence. Integrity below 60% triggers mandatory restriction.', cta: 'View status', tone: 'subtle' },
        { kicker: 'GREEN MOBILITY', title: 'Electrification Plan', body: 'Major corridors electrified for rail and freight. 38% rail-mode share target by 2030.', cta: 'See plan', tone: 'amber' },
      ]}
      statistics={[
        { value: '24,800 km', label: 'National highways', sub: 'Including expressways' },
        { value: '6 hubs', label: 'Air hubs', sub: 'International + national' },
        { value: '8 ports', label: 'Maritime ports', sub: 'Container + bulk' },
        { value: '99.4%', label: 'Median on-time', sub: 'Urban transit' },
        { value: '11 min', label: 'Median wait', sub: 'Urban bus' },
        { value: '480', label: 'Repair crews', sub: 'National network' },
        { value: '0', label: 'Discriminatory closures', sub: 'Constitutional contract' },
      ]}
      news={[
        { title: 'New Coastal Rail Link Inaugurated', date: 'May 15, 2025', summary: 'Reduces freight time by 4 hours.' },
        { title: 'Freight Permit Online Application', date: 'May 11, 2025', summary: 'New 72-hour decision target.' },
        { title: 'Vision Zero Annual Report', date: 'May 04, 2025', summary: 'Road-fatality reduction milestones.' },
      ]}
      initiatives={[
        { title: 'Vision Zero', body: 'Zero road fatalities by 2040.' },
        { title: 'Rail Modal Shift', body: 'Bringing freight onto rail.' },
        { title: 'Rural Connectivity', body: 'Bus routes for every village > 500 residents.' },
      ]}
      locator={{ title: 'Transit & Service Centres', placeholder: 'Enter your district', tabs: ['Transit', 'Service Centres', 'Inspections', 'Ports'], pinLabel: '⌗', pinCoords: [[18, 30], [55, 25], [42, 60], [70, 55], [30, 75], [82, 70]] }}
      shortcuts={[
        { title: 'Transit Map', subtitle: 'National network' },
        { title: 'Highway Codes', subtitle: 'Rules of the road' },
        { title: 'Disabled Access', subtitle: 'Accessibility info' },
        { title: 'Open Data', subtitle: 'Corridors & flows' },
      ]}
      footerSections={[
        { heading: 'Services', items: ['Transit', 'Vehicle Registration', 'Driver Licences', 'Freight Permits', 'Hazard Reports'] },
        { heading: 'Resources', items: ['Schedules', 'Maps', 'Open Data', 'Publications', 'Contact'] },
        { heading: 'About', items: ['Mandate', 'Strategy', 'Careers', 'Audit', 'Transparency'] },
      ]}
      newsletter={{ heading: 'Mobility updates', body: 'Corridor advisories and schedule changes.' }}
      legalLine="© 2025 Ministry of Transport & National Logistics."
      legalLinks={['Privacy', 'Terms', 'Accessibility', 'Sitemap']} />
  );
}
