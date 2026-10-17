// Reference content for the Ministry of Trade, Industry & Strategic Production public site (/trade).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own.

import type { SiteContent } from '../types';

export const trade: SiteContent = {
  id: 'trade',
  institution: {
    name: 'Ministry of Trade, Industry & Strategic Production',
    tagline: 'Commercium aequum — fair commerce',
    role: 'Ministry',
    crest: '⌬',
    emergencyButton: null,
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'Businesses', to: 'services' },
    { label: 'Exporters', to: 'services' },
    { label: 'Standards', to: 'services' },
    { label: 'Industrial Parks', to: 'services' },
    { label: 'News', to: 'news' },
    { label: 'About', to: 'about' },
  ],
  hero: {
    headline: ['Sovereign Industry,', 'Fair Commerce'],
    subhead: 'Non-discriminatory access, transparent tender, strategic-reserve protection.',
    primaryCta: { label: 'Register a Business', icon: '⌂', to: 'services' },
    secondaryCta: { label: 'Export Application', icon: '⌖', to: '/wallet/permits/new' },
    sideNote: {
      icon: '✦',
      title: 'Strategic industries',
      body: '21 strategic industries — protected reserves, priority allocation, transparent tender.',
      cta: 'View industries',
      to: 'services',
    },
  },
  alert: {
    label: 'TRADE NOTICE',
    text: 'New simplified exporter registration — 14-day decision, single-document. Effective June 1.',
  },
  quickServices: [
    {
      title: 'Register Business',
      subtitle: 'New or update',
      color: 'primary',
      icon: '⌂',
      to: '/wallet/services',
    },
    {
      title: 'Export Application',
      subtitle: 'Trade-corridor permit',
      color: '#0f7a5f',
      icon: '⌖',
      to: '/wallet/permits/new',
    },
    {
      title: 'Industrial Permit',
      subtitle: 'Manufacturing or warehouse',
      color: '#3a82d0',
      icon: '⌗',
      to: '/wallet/permits/new',
    },
    {
      title: 'Standards Certification',
      subtitle: 'Conformity testing',
      color: '#7c4d8a',
      icon: '✓',
      to: '/wallet/services',
    },
    {
      title: 'Industrial Park',
      subtitle: 'Lease application',
      color: '#b81c3f',
      icon: '◧',
      to: '/wallet/permits/new',
    },
    { title: 'Trade Statistics', subtitle: 'Public data', color: '#e08a2b', icon: '✦', to: 'statistics' },
  ],
  featured: [
    {
      kicker: 'CONSTITUTIONAL CONTRACT',
      title: 'Non-Discriminatory Access',
      body: 'Markets and tenders open to all citizens. Cartel toleration is void.',
      cta: 'Read doctrine',
      tone: 'primary',
      to: 'services',
    },
    {
      kicker: 'STRATEGIC RESERVE',
      title: 'Sovereign Industries',
      body: '21 industries with protected reserves and priority allocation — pharmaceuticals, semiconductors, food staples.',
      cta: 'View industries',
      tone: 'subtle',
      to: 'services',
    },
    {
      kicker: 'TRADE FLOWS',
      title: 'Open Trade Statistics',
      body: 'Monthly export, import, corridor utilisation — published as open data within 5 days.',
      cta: 'Browse data',
      tone: 'amber',
      to: 'statistics',
    },
  ],
  statistics: [
    { value: '1.4 M', label: 'Registered businesses', sub: 'Active' },
    { value: '6.4 d', label: 'Median registration', sub: 'New businesses' },
    { value: '21', label: 'Strategic industries', sub: 'Protected' },
    { value: '32', label: 'Industrial parks', sub: 'Operational' },
    { value: '78%', label: 'Conformity rate', sub: 'Standards lab' },
    { value: '92%', label: 'Trade-corridor uptime', sub: 'National average' },
    { value: '0', label: 'Non-tender awards', sub: 'Constitutional contract' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'Simplified Exporter Permit', summary: '14-day decision, single-document.' },
    { title: 'Coastal Industrial Park Expansion', summary: '60 new tenant slots.' },
    { title: 'Standards Lab Accreditation', summary: 'Three new accredited labs.' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'SME Acceleration', body: 'Capital, training, mentorship for small enterprises.' },
    { title: 'Standards Modernisation', body: 'Bringing national standards into global alignment.' },
    { title: 'Strategic Reserve Programme', body: 'Critical industries protected by reserves.' },
  ],
  locator: {
    title: 'Industrial Parks & Service Centres',
    placeholder: 'Enter your district',
    tabs: ['Parks', 'Service Centres', 'Standards Labs', 'Customs'],
    pinLabel: '⌗',
    pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]],
  },
  shortcuts: [
    { title: 'Trade Library', subtitle: 'Agreements & treaties', to: '/public' },
    { title: 'Standards Code', subtitle: 'Conformity criteria', to: 'services' },
    { title: 'Open Trade Data', subtitle: 'Monthly statistics', to: 'statistics' },
    { title: 'Customs Procedures', subtitle: 'Import / export', to: 'services' },
  ],
  footerSections: [
    {
      heading: 'Services',
      items: [
        { label: 'Business Registration', to: '/wallet/permits/new' },
        { label: 'Export Permits', to: '/wallet/permits/new' },
        { label: 'Standards', to: 'services' },
        { label: 'Industrial Parks', to: 'services' },
        { label: 'Trade Statistics', to: 'statistics' },
      ],
    },
    {
      heading: 'Resources',
      items: [
        { label: 'Trade Library', to: 'services' },
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
  newsletter: { heading: 'Trade & industry updates', body: 'Permit openings and corridor advisories.' },
  legalLine: '© {year} Ministry of Trade, Industry & Strategic Production.',
  legalLinks: [
    { label: 'Privacy', to: '/legal/privacy' },
    { label: 'Terms', to: '/legal/terms' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
