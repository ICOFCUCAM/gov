// Reference content for the Ministry of Energy public site (/energy).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own.

import type { SiteContent } from '../types';

export const energy: SiteContent = {
  id: 'energy',
  institution: {
    name: 'Ministry of Energy',
    tagline: 'Lumen civitatis — keeping the light on',
    role: 'Ministry',
    crest: '⚡',
    emergencyButton: { label: 'Outage 110', icon: '☎' },
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'Outages', to: 'services' },
    { label: 'Permits', to: 'services' },
    { label: 'Renewables', to: 'services' },
    { label: 'Tariffs', to: 'services' },
    { label: 'News', to: 'news' },
    { label: 'About', to: 'about' },
  ],
  hero: {
    headline: ['Reliable Power,', 'Sovereign Grid'],
    subhead: 'Equitable load-shedding, transparent outages, critical-services protected.',
    primaryCta: { label: 'Report an Outage', icon: '⚡', to: '/wallet/services' },
    secondaryCta: { label: 'Rooftop Solar Permit', icon: '☀', to: '/wallet/permits/new' },
    sideNote: {
      icon: '⌬',
      title: 'Live grid status',
      body: '50.0 Hz — stable. Reserve margin: 14%. Critical services: 100% protected.',
      cta: 'Live dashboard',
      to: '/noc',
    },
  },
  alert: {
    label: 'PLANNED MAINTENANCE',
    text: 'Coastal substation upgrade Tuesday 02:00-04:00. Outage affects 4,200 households — see detail.',
  },
  quickServices: [
    { title: 'Report Outage', subtitle: 'Or check status', color: 'primary', icon: '⚡', to: '/wallet/services' },
    {
      title: 'Rooftop Solar',
      subtitle: 'Permit & feed-in',
      color: '#0f7a5f',
      icon: '☀',
      to: '/wallet/permits/new',
    },
    {
      title: 'EV Charger Permit',
      subtitle: 'Domestic install',
      color: '#3a82d0',
      icon: '◧',
      to: '/wallet/permits/new',
    },
    { title: 'Microgrid', subtitle: 'Community projects', color: '#7c4d8a', icon: '⬢', to: '/wallet/services' },
    {
      title: 'Tariffs & Billing',
      subtitle: 'Check your rate',
      color: '#b48a3d',
      icon: '✦',
      to: '/wallet/services',
    },
    {
      title: 'Industrial Connection',
      subtitle: 'New connection',
      color: '#e08a2b',
      icon: '⌗',
      to: '/wallet/services',
    },
  ],
  featured: [
    {
      kicker: 'CLEAN ENERGY',
      title: 'Sovereign Renewables',
      body: 'Solar + wind + hydro produce 48% of national load. Target: 80% by 2035.',
      cta: 'See plan',
      tone: 'primary',
      to: 'services',
    },
    {
      kicker: 'EQUITY',
      title: 'Load-Shed Doctrine',
      body: 'Hospitals, water and ATC never shed. Equitable rotation across districts — transparent.',
      cta: 'Read doctrine',
      tone: 'subtle',
      to: 'services',
    },
    {
      kicker: 'STORM READINESS',
      title: 'Crew & Battery Mobilisation',
      body: 'Pre-positioned crews and mobile gensets respond to blackouts within 4 hours.',
      cta: 'How we respond',
      tone: 'amber',
      to: 'services',
    },
  ],
  statistics: [
    { value: '24 GW', label: 'Installed capacity', sub: 'Including reserve' },
    { value: '48%', label: 'Renewable share', sub: 'Current output' },
    { value: '99.97%', label: 'Critical-services uptime', sub: 'Last 12 months' },
    { value: '4 h', label: 'Median restoration', sub: 'Storm blackouts' },
    { value: '14%', label: 'Reserve margin', sub: 'Above peak demand' },
    { value: '6.8 GWh', label: 'Battery storage', sub: 'National capacity' },
    { value: '0', label: 'Concealed outages', sub: 'Constitutional contract' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'Highland Hydro Plant Commissioned', summary: '400 MW of new clean capacity.' },
    { title: 'Rooftop Solar Permit Streamlined', summary: '7-day decision target.' },
    { title: 'Storm-Readiness Drill Completed', summary: 'National crews on standby.' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'Rooftop Solar Initiative', body: 'Subsidies and fast-track permits for domestic solar.' },
    { title: 'Community Microgrids', body: 'Rural off-grid clusters, locally owned.' },
    { title: 'Battery Storage Programme', body: '12 GWh national storage target by 2030.' },
  ],
  locator: {
    title: 'Substation & Service Centres',
    placeholder: 'Enter your district',
    tabs: ['Substations', 'Service Centres', 'EV Chargers', 'Solar Installers'],
    pinLabel: '⚡',
    pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]],
  },
  shortcuts: [
    { title: 'Tariff Library', subtitle: 'All published rates', to: 'services' },
    { title: 'Grid Statistics', subtitle: 'Open data', to: 'statistics' },
    { title: 'Renewable Map', subtitle: 'National generators', to: 'contact' },
    { title: 'Energy Education', subtitle: 'Conservation tips', to: 'services' },
  ],
  footerSections: [
    {
      heading: 'Services',
      items: [
        { label: 'Outages', to: 'services' },
        { label: 'Solar Permits', to: '/wallet/permits/new' },
        { label: 'EV Chargers', to: 'services' },
        { label: 'Microgrids', to: 'services' },
        { label: 'Industrial Connections', to: 'services' },
      ],
    },
    {
      heading: 'Resources',
      items: [
        { label: 'Tariffs', to: 'services' },
        { label: 'Open Data', to: '/public' },
        { label: 'Publications', to: '/public' },
        { label: 'Forms', to: 'services' },
        { label: 'Contact', to: 'contact' },
      ],
    },
    {
      heading: 'About',
      items: [
        { label: 'Mandate', to: 'about' },
        { label: 'Strategy', to: 'services' },
        { label: 'Careers', to: 'about' },
        { label: 'Audit', to: '/public' },
        { label: 'Transparency', to: '/public' },
      ],
    },
  ],
  newsletter: { heading: 'Energy updates', body: 'Outage notices and tariff changes.' },
  legalLine: '© {year} Ministry of Energy.',
  legalLinks: [
    { label: 'Privacy', to: '/legal/privacy' },
    { label: 'Terms', to: '/legal/terms' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
