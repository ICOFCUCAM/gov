// Public — Ministry of Energy homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Energy — Official Portal' };

const THEME = {
  ink: '#1b1408', inkSoft: '#2a1f0e', primary: '#c97a1f', accent: '#e0a13a',
  surface: '#fbf6ee', surfaceMute: '#f3ead7', line: '#e0d6b3',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default function PublicEnergyPage() {
  return (
    <PublicSiteShell
      theme={THEME}
      institution={{ name: 'Ministry of Energy', tagline: 'Lumen civitatis — keeping the light on', role: 'Ministry', href: '/energy', crest: '⚡',
        emergencyButton: { label: 'Outage 110', icon: '☎' } }}
      nav={[
        { label: 'Home', href: '/energy', active: true },
        { label: 'Outages', href: '/energy' },
        { label: 'Permits', href: '/energy' },
        { label: 'Renewables', href: '/energy' },
        { label: 'Tariffs', href: '/energy' },
        { label: 'News', href: '/energy' },
        { label: 'About', href: '/energy' },
      ]}
      hero={{
        headline: <><span style={{ color: THEME.ink }}>Reliable Power,</span><br /><span style={{ color: THEME.primary }}>Sovereign Grid</span></>,
        subhead: 'Equitable load-shedding, transparent outages, critical-services protected.',
        primaryCta: { label: 'Report an Outage', icon: '⚡' },
        secondaryCta: { label: 'Rooftop Solar Permit', icon: '☀' },
        illustration: <HeroIllustration kind="bolt" primary={THEME.primary} accent={THEME.accent} aria="Lightning bolt of the grid" />,
        sideNote: { icon: '⌬', title: 'Live grid status', body: '50.0 Hz — stable. Reserve margin: 14%. Critical services: 100% protected.', cta: 'Live dashboard' },
      }}
      alert={{ label: 'PLANNED MAINTENANCE', text: 'Coastal substation upgrade Tuesday 02:00-04:00. Outage affects 4,200 households — see detail.' }}
      quickServices={[
        { title: 'Report Outage', subtitle: 'Or check status', color: THEME.primary, icon: '⚡' },
        { title: 'Rooftop Solar', subtitle: 'Permit & feed-in', color: '#0f7a5f', icon: '☀' },
        { title: 'EV Charger Permit', subtitle: 'Domestic install', color: '#3a82d0', icon: '◧' },
        { title: 'Microgrid', subtitle: 'Community projects', color: '#7c4d8a', icon: '⬢' },
        { title: 'Tariffs & Billing', subtitle: 'Check your rate', color: '#b48a3d', icon: '✦' },
        { title: 'Industrial Connection', subtitle: 'New connection', color: '#e08a2b', icon: '⌗' },
      ]}
      featured={[
        { kicker: 'CLEAN ENERGY', title: 'Sovereign Renewables', body: 'Solar + wind + hydro produce 48% of national load. Target: 80% by 2035.', cta: 'See plan', tone: 'primary' },
        { kicker: 'EQUITY', title: 'Load-Shed Doctrine', body: 'Hospitals, water and ATC never shed. Equitable rotation across districts — transparent.', cta: 'Read doctrine', tone: 'subtle' },
        { kicker: 'STORM READINESS', title: 'Crew & Battery Mobilisation', body: 'Pre-positioned crews and mobile gensets respond to blackouts within 4 hours.', cta: 'How we respond', tone: 'amber' },
      ]}
      statistics={[
        { value: '24 GW', label: 'Installed capacity', sub: 'Including reserve' },
        { value: '48%', label: 'Renewable share', sub: 'Current output' },
        { value: '99.97%', label: 'Critical-services uptime', sub: 'Last 12 months' },
        { value: '4 h', label: 'Median restoration', sub: 'Storm blackouts' },
        { value: '14%', label: 'Reserve margin', sub: 'Above peak demand' },
        { value: '6.8 GWh', label: 'Battery storage', sub: 'National capacity' },
        { value: '0', label: 'Concealed outages', sub: 'Constitutional contract' },
      ]}
      news={[
        { title: 'Highland Hydro Plant Commissioned', date: 'May 14, 2025', summary: '400 MW of new clean capacity.' },
        { title: 'Rooftop Solar Permit Streamlined', date: 'May 10, 2025', summary: '7-day decision target.' },
        { title: 'Storm-Readiness Drill Completed', date: 'May 03, 2025', summary: 'National crews on standby.' },
      ]}
      initiatives={[
        { title: 'Rooftop Solar Initiative', body: 'Subsidies and fast-track permits for domestic solar.' },
        { title: 'Community Microgrids', body: 'Rural off-grid clusters, locally owned.' },
        { title: 'Battery Storage Programme', body: '12 GWh national storage target by 2030.' },
      ]}
      locator={{ title: 'Substation & Service Centres', placeholder: 'Enter your district', tabs: ['Substations', 'Service Centres', 'EV Chargers', 'Solar Installers'], pinLabel: '⚡', pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]] }}
      shortcuts={[
        { title: 'Tariff Library', subtitle: 'All published rates' },
        { title: 'Grid Statistics', subtitle: 'Open data' },
        { title: 'Renewable Map', subtitle: 'National generators' },
        { title: 'Energy Education', subtitle: 'Conservation tips' },
      ]}
      footerSections={[
        { heading: 'Services', items: ['Outages', 'Solar Permits', 'EV Chargers', 'Microgrids', 'Industrial Connections'] },
        { heading: 'Resources', items: ['Tariffs', 'Open Data', 'Publications', 'Forms', 'Contact'] },
        { heading: 'About', items: ['Mandate', 'Strategy', 'Careers', 'Audit', 'Transparency'] },
      ]}
      newsletter={{ heading: 'Energy updates', body: 'Outage notices and tariff changes.' }}
      legalLine="© 2025 Ministry of Energy."
      legalLinks={['Privacy', 'Terms', 'Accessibility', 'Sitemap']} />
  );
}
