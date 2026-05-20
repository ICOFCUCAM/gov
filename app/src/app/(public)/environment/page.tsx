// Public — Ministry of Environment homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Environment — Official Portal' };

const THEME = {
  ink: '#0e2a1e', inkSoft: '#173a2a', primary: '#1f8a5a', accent: '#6fcf6a',
  surface: '#f4f9f5', surfaceMute: '#e3f0e7', line: '#cfe3d5',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default function PublicEnvironmentPage() {
  return (
    <PublicSiteShell
      theme={THEME}
      institution={{ name: 'Ministry of Environment & Climate Resilience', tagline: 'Stewards of land, water and biosphere', role: 'Ministry', href: '/environment', crest: '◬',
        emergencyButton: { label: 'Report Pollution', icon: '⚠' } }}
      nav={[
        { label: 'Home', href: '/environment', active: true },
        { label: 'Air & Water', href: '/environment' },
        { label: 'Protected Areas', href: '/environment' },
        { label: 'Climate', href: '/environment' },
        { label: 'Permits', href: '/environment' },
        { label: 'News', href: '/environment' },
        { label: 'About', href: '/environment' },
      ]}
      hero={{
        headline: <><span style={{ color: THEME.ink }}>Living Earth,</span><br /><span style={{ color: THEME.primary }}>Living Polity</span></>,
        subhead: 'The earth held in trust — for every generation.',
        primaryCta: { label: 'Report an Incident', icon: '⚠' },
        secondaryCta: { label: 'Find Protected Areas', icon: '📍' },
        illustration: <HeroIllustration kind="leaf" primary={THEME.primary} accent={THEME.accent} aria="Leaf of biosphere" />,
        sideNote: { icon: '✦', title: 'Citizen science', body: 'Submit observations — pollution, wildlife, water quality. Help protect the commons.', cta: 'Get started' },
      }}
      alert={{ label: 'AIR-QUALITY ADVISORY', text: 'Elevated particulate matter in the eastern district. Sensitive groups should limit outdoor exposure.' }}
      quickServices={[
        { title: 'Report Pollution', subtitle: 'Air / water / dumping', color: THEME.primary, icon: '⚠' },
        { title: 'EIA Application', subtitle: 'Environmental impact', color: '#0f7a5f', icon: '✎' },
        { title: 'Water Rights', subtitle: 'Allocation requests', color: '#3a82d0', icon: '⌭' },
        { title: 'Protected Areas', subtitle: 'Visit or research', color: '#b48a3d', icon: '◬' },
        { title: 'Citizen Science', subtitle: 'Submit observations', color: '#7c4d8a', icon: '✦' },
        { title: 'Climate Advisories', subtitle: 'Forecast & alerts', color: '#e08a2b', icon: '☀' },
      ]}
      featured={[
        { kicker: 'CONSTITUTIONAL TRUST', title: 'The Commons Doctrine', body: 'The natural world is intergenerational property. Every extraction permit must serve every generation.', cta: 'Read the doctrine', tone: 'primary' },
        { kicker: 'SCIENCE FIRST', title: 'Open Climate Data', body: 'Every sensor reading published. Air quality, water levels, biodiversity — all transparent.', cta: 'Browse data', tone: 'subtle' },
        { kicker: 'CITIZEN VOICE', title: 'Pollution Reports Matter', body: 'Every citizen report receives a triage decision within 72 hours. Silencing is constitutionally void.', cta: 'Report now', tone: 'amber' },
      ]}
      statistics={[
        { value: '420,000 ha', label: 'Protected area', sub: 'National parks & reserves' },
        { value: '38%', label: 'Forest cover', sub: 'National average' },
        { value: '12', label: 'Climate sensors', sub: 'Per district average' },
        { value: '76%', label: 'Air-quality compliance', sub: 'National monitoring' },
        { value: '94%', label: 'Citizen-report triage', sub: 'Within 72 hours' },
        { value: '4,800', label: 'Restoration corridors', sub: 'Active hectares' },
        { value: '0', label: 'Concealed pollution', sub: 'Constitutional contract' },
      ]}
      news={[
        { title: 'New Climate Adaptation Plan Published', date: 'May 15, 2025', summary: '25-year national plan.' },
        { title: 'Coastal Mangrove Programme Expanded', date: 'May 10, 2025', summary: 'Now covering 14,000 hectares.' },
        { title: 'Sensor Network Doubled in Rural Districts', date: 'May 03, 2025', summary: 'Air-quality coverage milestone.' },
      ]}
      initiatives={[
        { title: 'Watershed Restoration', body: 'Rebuilding river systems across 18 basins.' },
        { title: 'Endangered-Species Protection', body: 'Habitat protection for 132 listed species.' },
        { title: 'Citizen Science Programme', body: '40,000+ citizens submitting field observations.' },
      ]}
      locator={{ title: 'Protected Areas Near You', placeholder: 'Enter your location', tabs: ['Parks', 'Reserves', 'Wetlands', 'Marine'], pinLabel: '◬', pinCoords: [[18, 35], [55, 25], [42, 62], [70, 50], [30, 78], [82, 65]] }}
      shortcuts={[
        { title: 'Climate Reports', subtitle: 'Quarterly publications' },
        { title: 'EIA Database', subtitle: 'Public consultation' },
        { title: 'Wildlife Permits', subtitle: 'Hunting & research' },
        { title: 'Conservation Careers', subtitle: 'Rangers & scientists' },
      ]}
      footerSections={[
        { heading: 'Services', items: ['Report Pollution', 'EIA Applications', 'Water Rights', 'Protected Areas', 'Citizen Science'] },
        { heading: 'Resources', items: ['Climate Data', 'Publications', 'Forms', 'Open Data', 'Contact'] },
        { heading: 'About', items: ['Mandate', 'Leadership', 'Careers', 'Audit & Oversight', 'Transparency'] },
      ]}
      newsletter={{ heading: 'Climate & nature updates', body: 'Monthly digest of advisories and reports.' }}
      legalLine="© 2025 Ministry of Environment & Climate Resilience."
      legalLinks={['Privacy', 'Terms', 'Accessibility', 'Sitemap']} />
  );
}
