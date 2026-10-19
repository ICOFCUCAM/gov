// Reference content for the Ministry of Environment & Climate Resilience public site (/environment).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own.

import type { SiteContent } from '../types';

export const environment: SiteContent = {
  id: 'environment',
  institution: {
    name: 'Ministry of Environment & Climate Resilience',
    tagline: 'Stewards of land, water and biosphere',
    role: 'Ministry',
    crest: '◬',
    emergencyButton: { label: 'Report Pollution', icon: '⚠' },
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'Air & Water', to: 'services' },
    { label: 'Protected Areas', to: 'services' },
    { label: 'Climate', to: 'services' },
    { label: 'Permits', to: 'services' },
    { label: 'News', to: 'news' },
    { label: 'About', to: 'about' },
  ],
  hero: {
    headline: ['Living Earth,', 'Living Polity'],
    subhead: 'The earth held in trust — for every generation.',
    primaryCta: { label: 'Report an Incident', icon: '⚠', to: '/wallet/services' },
    secondaryCta: { label: 'Find Protected Areas', icon: '📍', to: 'contact' },
    sideNote: {
      icon: '✦',
      title: 'Citizen science',
      body: 'Submit observations — pollution, wildlife, water quality. Help protect the commons.',
      cta: 'Get started',
      to: 'services',
    },
  },
  alert: {
    label: 'AIR-QUALITY ADVISORY',
    text: 'Elevated particulate matter in the eastern district. Sensitive groups should limit outdoor exposure.',
  },
  quickServices: [
    {
      title: 'Report Pollution',
      subtitle: 'Air / water / dumping',
      color: 'primary',
      icon: '⚠',
      to: '/wallet/services',
    },
    {
      title: 'EIA Application',
      subtitle: 'Environmental impact',
      color: '#0f7a5f',
      icon: '✎',
      to: '/wallet/permits/new',
    },
    { title: 'Water Rights', subtitle: 'Allocation requests', color: '#3a82d0', icon: '⌭', to: '/public' },
    {
      title: 'Protected Areas',
      subtitle: 'Visit or research',
      color: '#b48a3d',
      icon: '◬',
      to: '/wallet/services',
    },
    {
      title: 'Citizen Science',
      subtitle: 'Submit observations',
      color: '#7c4d8a',
      icon: '✦',
      to: '/wallet/services',
    },
    {
      title: 'Climate Advisories',
      subtitle: 'Forecast & alerts',
      color: '#e08a2b',
      icon: '☀',
      to: '/wallet/services',
    },
  ],
  featured: [
    {
      kicker: 'CONSTITUTIONAL TRUST',
      title: 'The Commons Doctrine',
      body: 'The natural world is intergenerational property. Every extraction permit must serve every generation.',
      cta: 'Read the doctrine',
      tone: 'primary',
      to: 'services',
    },
    {
      kicker: 'SCIENCE FIRST',
      title: 'Open Climate Data',
      body: 'Every sensor reading published. Air quality, water levels, biodiversity — all transparent.',
      cta: 'Browse data',
      tone: 'subtle',
      to: 'statistics',
    },
    {
      kicker: 'CITIZEN VOICE',
      title: 'Pollution Reports Matter',
      body: 'Every citizen report receives a triage decision within 72 hours. Silencing is constitutionally void.',
      cta: 'Report now',
      tone: 'amber',
      to: '/public',
    },
  ],
  statistics: [
    { value: '420,000 ha', label: 'Protected area', sub: 'National parks & reserves' },
    { value: '38%', label: 'Forest cover', sub: 'National average' },
    { value: '12', label: 'Climate sensors', sub: 'Per district average' },
    { value: '76%', label: 'Air-quality compliance', sub: 'National monitoring' },
    { value: '94%', label: 'Citizen-report triage', sub: 'Within 72 hours' },
    { value: '4,800', label: 'Restoration corridors', sub: 'Active hectares' },
    { value: '0', label: 'Concealed pollution', sub: 'Constitutional contract' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'New Climate Adaptation Plan Published', summary: '25-year national plan.' },
    { title: 'Coastal Mangrove Programme Expanded', summary: 'Now covering 14,000 hectares.' },
    { title: 'Sensor Network Doubled in Rural Districts', summary: 'Air-quality coverage milestone.' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'Watershed Restoration', body: 'Rebuilding river systems across 18 basins.' },
    { title: 'Endangered-Species Protection', body: 'Habitat protection for 132 listed species.' },
    { title: 'Citizen Science Programme', body: '40,000+ citizens submitting field observations.' },
  ],
  locator: {
    title: 'Protected Areas Near You',
    placeholder: 'Enter your location',
    tabs: ['Parks', 'Reserves', 'Wetlands', 'Marine'],
    pinLabel: '◬',
    pinCoords: [[18, 35], [55, 25], [42, 62], [70, 50], [30, 78], [82, 65]],
  },
  shortcuts: [
    { title: 'Climate Reports', subtitle: 'Quarterly publications', to: '/public' },
    { title: 'EIA Database', subtitle: 'Public consultation', to: 'services' },
    { title: 'Wildlife Permits', subtitle: 'Hunting & research', to: '/wallet/permits/new' },
    { title: 'Conservation Careers', subtitle: 'Rangers & scientists', to: 'about' },
  ],
  footerSections: [
    {
      heading: 'Services',
      items: [
        { label: 'Report Pollution', to: 'services' },
        { label: 'EIA Applications', to: '/wallet/permits/new' },
        { label: 'Water Rights', to: '/public' },
        { label: 'Protected Areas', to: 'services' },
        { label: 'Citizen Science', to: 'services' },
      ],
    },
    {
      heading: 'Resources',
      items: [
        { label: 'Climate Data', to: 'statistics' },
        { label: 'Publications', to: '/public' },
        { label: 'Forms', to: 'services' },
        { label: 'Open Data', to: '/public' },
        { label: 'Contact', to: 'contact' },
      ],
    },
    {
      heading: 'About',
      items: [
        { label: 'Mandate', to: 'about' },
        { label: 'Leadership', to: 'about' },
        { label: 'Careers', to: 'about' },
        { label: 'Audit & Oversight', to: '/public' },
        { label: 'Transparency', to: '/public' },
      ],
    },
  ],
  newsletter: { heading: 'Climate & nature updates', body: 'Monthly digest of advisories and reports.' },
  legalLine: '© {year} Ministry of Environment & Climate Resilience.',
  legalLinks: [
    { label: 'Privacy', to: '/legal/privacy' },
    { label: 'Terms', to: '/legal/terms' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
