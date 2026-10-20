// Reference content for the Judicial Branch public site (/judiciary).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own.

import type { SiteContent } from '../types';

export const judiciary: SiteContent = {
  id: 'judiciary',
  institution: {
    name: 'Judicial Branch',
    tagline: 'Justice without fear or favour',
    role: 'Branch',
    crest: '⚖',
    emergencyButton: null,
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'Courts', to: 'services' },
    { label: 'Justices', to: 'about' },
    { label: 'Cases & Decisions', to: 'services' },
    { label: 'Constitution', to: 'services' },
    { label: 'News', to: 'news' },
    { label: 'About', to: 'about' },
  ],
  hero: {
    headline: ['Independent Courts,', 'Equal Protection'],
    subhead: 'Constitutional review, fair trial, public reasoning — for every citizen.',
    primaryCta: { label: 'Search Decisions', icon: '⌕', to: 'services' },
    secondaryCta: { label: 'Find a Court', icon: '📍', to: 'contact' },
    sideNote: {
      icon: '☷',
      title: 'Open record',
      body: 'Every decision published in full reasoning. Every appeal pathway open.',
      cta: 'Read latest',
      to: 'services',
    },
  },
  alert: {
    label: 'JUDICIAL NOTICE',
    text: 'Constitutional Court — Special hearings on privacy & data sovereignty open for public observation.',
  },
  quickServices: [
    {
      title: 'Search Decisions',
      subtitle: 'Full-text + cases',
      color: 'primary',
      icon: '⌕',
      to: '/wallet/services',
    },
    {
      title: 'File an Appeal',
      subtitle: 'From lower court',
      color: '#0f7a5f',
      icon: '⚖',
      to: '/wallet/services',
    },
    {
      title: 'Court Calendar',
      subtitle: 'Hearings & sittings',
      color: '#3a82d0',
      icon: '☷',
      to: '/wallet/services',
    },
    { title: 'Find a Court', subtitle: 'By district', color: '#7c4d8a', icon: '📍', to: 'contact' },
    { title: 'Constitutional Library', subtitle: 'Full text', color: '#b48a3d', icon: '◯', to: '/public' },
    {
      title: 'Judicial Conduct',
      subtitle: 'File a complaint',
      color: '#e08a2b',
      icon: '✚',
      to: '/wallet/services',
    },
    {
      title: 'Cause list',
      subtitle: 'Hearings this week',
      color: '#2f6f8f',
      icon: '☰',
      to: '/courts/cause-list',
    },
  ],
  featured: [
    {
      kicker: 'CONSTITUTIONAL INDEPENDENCE',
      title: 'Separated, Lifetime, Reviewed',
      body: 'Justices appointed by Senate with two-thirds; lifetime tenure subject to misconduct review by an independent panel.',
      cta: 'Read appointment process',
      tone: 'primary',
      to: '/wallet/permits/new',
    },
    {
      kicker: 'OPEN REASONING',
      title: 'Every Decision Public',
      body: 'Constitutional Court rulings published in 24h. Lower-court decisions within seven days.',
      cta: 'Browse rulings',
      tone: 'subtle',
      to: 'services',
    },
    {
      kicker: 'FAIR TRIAL',
      title: 'Counsel & Translation',
      body: 'Every defendant has counsel, translation, and a public hearing. Closed sessions require published rationale.',
      cta: 'Read rights',
      tone: 'amber',
      to: '/public',
    },
  ],
  statistics: [
    { value: '11', label: 'Constitutional Court justices', sub: 'Two-thirds Senate appointment' },
    { value: '128', label: 'Supreme Court justices', sub: 'Across divisions' },
    { value: '420', label: 'Lower courts', sub: 'National network' },
    { value: '76 days', label: 'Median civil case', sub: 'Trial duration' },
    { value: '14 days', label: 'Median constitutional', sub: 'Decision publication' },
    { value: '92%', label: 'Court access', sub: 'Citizens within 50 km' },
    { value: '0', label: 'Sealed without rationale', sub: 'Constitutional contract' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'Privacy Doctrine Affirmed', summary: 'Constitutional Court decision №412.' },
    { title: 'New Supreme Justice Confirmed', summary: 'Senate two-thirds concurrence.' },
    { title: 'Judicial Conduct Panel Convened', summary: 'Independent review of complaints.' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'Open Judgement Project', body: 'Every decision searchable, in plain language.' },
    { title: 'Pro-Bono Network', body: 'Free counsel for income-tested citizens.' },
    { title: 'Court Modernisation', body: 'Digital filings, online hearings where appropriate.' },
  ],
  locator: {
    title: 'Find a Court',
    placeholder: 'Enter your district',
    tabs: ['Constitutional', 'Supreme', 'Lower', 'Tribunals'],
    pinLabel: '⚖',
    pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]],
  },
  shortcuts: [
    { title: 'Constitutional Library', subtitle: 'Full-text + commentary', to: '/public' },
    { title: 'Case Library', subtitle: 'All published decisions', to: 'services' },
    { title: 'Court Rules', subtitle: 'Procedure & filing', to: 'services' },
    { title: 'Civic Education', subtitle: 'Rights & guarantees', to: '/public' },
  ],
  footerSections: [
    {
      heading: 'Courts & Decisions',
      items: [
        { label: 'Constitutional Court', to: '/public' },
        { label: 'Supreme Court', to: 'services' },
        { label: 'Lower Courts', to: 'services' },
        { label: 'Tribunals', to: '/wallet/contest' },
        { label: 'Calendar', to: 'services' },
      ],
    },
    {
      heading: 'Resources',
      items: [
        { label: 'Constitution', to: '/public' },
        { label: 'Case Library', to: 'services' },
        { label: 'Court Rules', to: 'services' },
        { label: 'Forms', to: 'services' },
        { label: 'Contact', to: 'contact' },
      ],
    },
    {
      heading: 'About',
      items: [
        { label: 'Independence', to: 'services' },
        { label: 'Appointments', to: '/wallet/permits/new' },
        { label: 'Conduct', to: 'services' },
        { label: 'Audit', to: '/public' },
        { label: 'Transparency', to: '/public' },
      ],
    },
  ],
  newsletter: { heading: 'Judicial updates', body: 'Decisions, calendars and constitutional readings.' },
  legalLine: '© {year} Judicial Branch. Independent of the political branches.',
  legalLinks: [
    { label: 'Privacy', to: '/legal/privacy' },
    { label: 'Terms', to: '/legal/terms' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
