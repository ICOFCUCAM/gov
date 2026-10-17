// Reference content for the Ministry of Transport & National Logistics public site (/transport).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own.

import type { SiteContent } from '../types';

export const transport: SiteContent = {
  id: 'transport',
  institution: {
    name: 'Ministry of Transport & National Logistics',
    tagline: 'Viae publicae — roads belong to the people',
    role: 'Ministry',
    crest: '⌗',
    emergencyButton: { label: 'Traffic 144', icon: '☎' },
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'Public Transit', to: 'services' },
    { label: 'Permits', to: 'services' },
    { label: 'Corridors', to: 'services' },
    { label: 'Safety', to: 'services' },
    { label: 'News', to: 'news' },
    { label: 'About', to: 'about' },
  ],
  hero: {
    headline: ['Moving People,', 'Connecting Polity'],
    subhead: 'Safe roads, reliable transit, equitable access — for every citizen.',
    primaryCta: { label: 'Plan a Journey', icon: '⌗', to: 'services' },
    secondaryCta: { label: 'Vehicle Permits', icon: '✎', to: '/wallet/permits/new' },
    sideNote: {
      icon: '⌭',
      title: 'Live transit',
      body: 'Real-time bus, rail, ferry schedules. On-time performance: 91%.',
      cta: 'Live status',
      to: '/noc',
    },
  },
  alert: {
    label: 'CORRIDOR ADVISORY',
    text: 'Eastern Trunk km 124 closure — detour via Coastal Highway. Bridge inspection underway.',
  },
  quickServices: [
    { title: 'Plan a Journey', subtitle: 'Multi-modal', color: 'primary', icon: '⌗', to: '/wallet/services' },
    {
      title: 'Vehicle Registration',
      subtitle: 'New or renewal',
      color: '#0f7a5f',
      icon: '✎',
      to: '/wallet/permits/new',
    },
    {
      title: 'Driver Licence',
      subtitle: 'Apply or renew',
      color: '#7c4d8a',
      icon: '◧',
      to: '/wallet/permits/new',
    },
    {
      title: 'Freight Permit',
      subtitle: 'Commercial cargo',
      color: '#b48a3d',
      icon: '⌖',
      to: '/wallet/permits/new',
    },
    { title: 'Report a Hazard', subtitle: 'Roads or rail', color: '#b81c3f', icon: '⚠', to: '/wallet/services' },
    {
      title: 'Public Transit',
      subtitle: 'Schedules & fares',
      color: '#3a82d0',
      icon: '═',
      to: '/wallet/services',
    },
  ],
  featured: [
    {
      kicker: 'EQUITY',
      title: 'Evacuation Priority',
      body: 'Constitutional priority for evacuation — commercial freight yields. Logged and reviewable.',
      cta: 'Read doctrine',
      tone: 'primary',
      to: 'services',
    },
    {
      kicker: 'SAFETY',
      title: 'Bridge & Tunnel Audit',
      body: 'Every critical structure inspected on cadence. Integrity below 60% triggers mandatory restriction.',
      cta: 'View status',
      tone: 'subtle',
      to: '/public',
    },
    {
      kicker: 'GREEN MOBILITY',
      title: 'Electrification Plan',
      body: 'Major corridors electrified for rail and freight. 38% rail-mode share target by 2030.',
      cta: 'See plan',
      tone: 'amber',
      to: 'services',
    },
  ],
  statistics: [
    { value: '24,800 km', label: 'National highways', sub: 'Including expressways' },
    { value: '6 hubs', label: 'Air hubs', sub: 'International + national' },
    { value: '8 ports', label: 'Maritime ports', sub: 'Container + bulk' },
    { value: '99.4%', label: 'Median on-time', sub: 'Urban transit' },
    { value: '11 min', label: 'Median wait', sub: 'Urban bus' },
    { value: '480', label: 'Repair crews', sub: 'National network' },
    { value: '0', label: 'Discriminatory closures', sub: 'Constitutional contract' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'New Coastal Rail Link Inaugurated', summary: 'Reduces freight time by 4 hours.' },
    { title: 'Freight Permit Online Application', summary: 'New 72-hour decision target.' },
    { title: 'Vision Zero Annual Report', summary: 'Road-fatality reduction milestones.' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'Vision Zero', body: 'Zero road fatalities by 2040.' },
    { title: 'Rail Modal Shift', body: 'Bringing freight onto rail.' },
    { title: 'Rural Connectivity', body: 'Bus routes for every village > 500 residents.' },
  ],
  locator: {
    title: 'Transit & Service Centres',
    placeholder: 'Enter your district',
    tabs: ['Transit', 'Service Centres', 'Inspections', 'Ports'],
    pinLabel: '⌗',
    pinCoords: [[18, 30], [55, 25], [42, 60], [70, 55], [30, 75], [82, 70]],
  },
  shortcuts: [
    { title: 'Transit Map', subtitle: 'National network', to: 'contact' },
    { title: 'Highway Codes', subtitle: 'Rules of the road', to: 'services' },
    { title: 'Disabled Access', subtitle: 'Accessibility info', to: 'services' },
    { title: 'Open Data', subtitle: 'Corridors & flows', to: '/public' },
  ],
  footerSections: [
    {
      heading: 'Services',
      items: [
        { label: 'Transit', to: 'services' },
        { label: 'Vehicle Registration', to: '/wallet/permits/new' },
        { label: 'Driver Licences', to: '/wallet/permits/new' },
        { label: 'Freight Permits', to: '/wallet/permits/new' },
        { label: 'Hazard Reports', to: '/public' },
      ],
    },
    {
      heading: 'Resources',
      items: [
        { label: 'Schedules', to: 'services' },
        { label: 'Maps', to: 'contact' },
        { label: 'Open Data', to: '/public' },
        { label: 'Publications', to: '/public' },
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
  newsletter: { heading: 'Mobility updates', body: 'Corridor advisories and schedule changes.' },
  legalLine: '© {year} Ministry of Transport & National Logistics.',
  legalLinks: [
    { label: 'Privacy', to: '/legal/privacy' },
    { label: 'Terms', to: '/legal/terms' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
