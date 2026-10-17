// Reference content for the Ministry of Foreign Affairs public site (/foreign-affairs).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own.

import type { SiteContent } from '../types';

export const foreignAffairs: SiteContent = {
  id: 'foreign-affairs',
  institution: {
    name: 'Ministry of Foreign Affairs',
    tagline: 'Pacta sunt servanda — agreements must be kept',
    role: 'Ministry',
    crest: '◯',
    emergencyButton: { label: 'Consular Hotline', icon: '☎' },
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'Travel', to: 'services' },
    { label: 'Visa', to: 'services' },
    { label: 'Passport', to: 'services' },
    { label: 'Treaties', to: 'services' },
    { label: 'News', to: 'news' },
    { label: 'About', to: 'about' },
  ],
  hero: {
    headline: ['Pluralistic World,', 'Sovereign Polity'],
    subhead: 'Internationally lawful, defensively oriented, never imperial.',
    primaryCta: { label: 'Apply for Passport', icon: '✎', to: '/wallet/permits/new' },
    secondaryCta: { label: 'Visa Information', icon: '◯', to: '/wallet/permits/new' },
    sideNote: {
      icon: '☎',
      title: 'Citizens abroad',
      body: 'Register your travel. Free consular assistance when overseas.',
      cta: 'Register travel',
      to: 'services',
    },
  },
  alert: {
    label: 'TRAVEL ADVISORY',
    text: 'Heightened caution for travel to the Coastal region. Consult the travel-advisory portal for current guidance.',
  },
  quickServices: [
    { title: 'Passport', subtitle: 'Apply or renew', color: 'primary', icon: '✎', to: '/wallet/permits/new' },
    {
      title: 'Visa Information',
      subtitle: 'Inbound visa',
      color: '#3a82d0',
      icon: '◯',
      to: '/wallet/permits/new',
    },
    {
      title: 'Citizens Abroad',
      subtitle: 'Register travel',
      color: '#0f7a5f',
      icon: '✦',
      to: '/wallet/services',
    },
    {
      title: 'Document Attestation',
      subtitle: 'Apostille services',
      color: '#7c4d8a',
      icon: '✓',
      to: '/wallet/services',
    },
    { title: 'Travel Advisories', subtitle: 'By region', color: '#b81c3f', icon: '⚠', to: '/wallet/services' },
    {
      title: 'Consular Emergency',
      subtitle: '24/7 hotline',
      color: '#e08a2b',
      icon: '☎',
      to: '/wallet/services',
    },
  ],
  featured: [
    {
      kicker: 'CONSTITUTIONAL DOCTRINE',
      title: 'Anti-Imperial Posture',
      body: 'Defensive, lawful, never imperial. Per-citizen foreign targeting is constitutionally void.',
      cta: 'Read doctrine',
      tone: 'primary',
      to: 'services',
    },
    {
      kicker: 'CITIZEN SAFETY',
      title: 'Consular Continuity',
      body: 'Citizens registered abroad receive consular protection within 6 hours of emergency.',
      cta: 'Register',
      tone: 'subtle',
      to: 'services',
    },
    {
      kicker: 'TRANSPARENCY',
      title: 'Treaty Atlas',
      body: 'Every treaty published in full with compliance status. Parliamentary ratification required.',
      cta: 'Browse treaties',
      tone: 'amber',
      to: '/public',
    },
  ],
  statistics: [
    { value: '142', label: 'Diplomatic missions', sub: 'Worldwide' },
    { value: '2.8 M', label: 'Citizens abroad', sub: 'Registered' },
    { value: '480', label: 'Treaties in force', sub: 'Bilateral + multilateral' },
    { value: '14 d', label: 'Median passport', sub: 'Standard processing' },
    { value: '99.8%', label: 'Consular case closure', sub: 'Within 30 days' },
    { value: '6 h', label: 'Emergency response', sub: 'Median consular' },
    { value: '0', label: 'Imperial actions', sub: 'Constitutional contract' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'New Bilateral Treaty Ratified', summary: 'Climate cooperation framework.' },
    { title: 'Passport Online Renewal Live', summary: 'Same-day digital renewal.' },
    { title: 'Consular Capacity Expanded', summary: 'Five new diplomatic missions.' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'Climate Cooperation', body: 'Multi-lateral climate-finance and adaptation.' },
    { title: 'Cyber Norms', body: 'International cyber-norms diplomatic track.' },
    { title: 'Consular Modernisation', body: 'Digital passport, biometric attestation.' },
  ],
  locator: {
    title: 'Embassies & Missions',
    placeholder: 'Country or city',
    tabs: ['Embassies', 'Consulates', 'Missions', 'Honorary'],
    pinLabel: '◯',
    pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]],
  },
  shortcuts: [
    { title: 'Travel Advisories', subtitle: 'By country', to: 'services' },
    { title: 'Visa Categories', subtitle: 'All visa types', to: '/wallet/permits/new' },
    { title: 'Treaty Library', subtitle: 'Full-text search', to: '/public' },
    { title: 'Diplomatic Calendar', subtitle: 'State visits', to: 'services' },
  ],
  footerSections: [
    {
      heading: 'Services',
      items: [
        { label: 'Passport', to: '/wallet/permits/new' },
        { label: 'Visa', to: '/wallet/permits/new' },
        { label: 'Consular', to: 'services' },
        { label: 'Attestation', to: 'contact' },
        { label: 'Travel Registration', to: '/wallet/permits/new' },
      ],
    },
    {
      heading: 'Resources',
      items: [
        { label: 'Travel Advisories', to: 'services' },
        { label: 'Treaty Library', to: '/public' },
        { label: 'Publications', to: '/public' },
        { label: 'Open Data', to: '/public' },
        { label: 'Contact', to: 'contact' },
      ],
    },
    {
      heading: 'About',
      items: [
        { label: 'Mandate', to: 'about' },
        { label: 'Foreign Service', to: 'services' },
        { label: 'Careers', to: 'about' },
        { label: 'Audit', to: '/public' },
        { label: 'Transparency', to: '/public' },
      ],
    },
  ],
  newsletter: { heading: 'Foreign affairs updates', body: 'Treaty news and consular advisories.' },
  legalLine: '© {year} Ministry of Foreign Affairs.',
  legalLinks: [
    { label: 'Privacy', to: '/legal/privacy' },
    { label: 'Terms', to: '/legal/terms' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
