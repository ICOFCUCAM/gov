// Reference content for the Ministry of Justice & Constitutional Affairs public site (/justice).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own.

import type { SiteContent } from '../types';

export const justice: SiteContent = {
  id: 'justice',
  institution: {
    name: 'Ministry of Justice & Constitutional Affairs',
    tagline: 'Equal protection under the law',
    role: 'Ministry',
    crest: '⚖',
    emergencyButton: { label: 'Legal Aid', icon: '⚖' },
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'Services', to: 'services' },
    { label: 'Courts', to: 'services' },
    { label: 'File a Case', to: 'services' },
    { label: 'Programs', to: 'programmes' },
    { label: 'Publications', to: 'services' },
    { label: 'About', to: 'about' },
  ],
  hero: {
    headline: ['Equal Justice,', 'Under Law'],
    subhead: 'Independent courts, transparent records, accessible justice for every citizen.',
    primaryCta: { label: 'File a Case', icon: '⚖', to: '/wallet/services' },
    secondaryCta: { label: 'Find a Court', icon: '📍', to: 'contact' },
    sideNote: {
      icon: '✚',
      title: 'Free legal aid',
      body: 'Every citizen has a constitutional right to counsel. Apply for legal aid.',
      cta: 'Apply now',
      to: '/wallet/permits/new',
    },
  },
  alert: {
    label: 'CIVIC NOTICE',
    text: 'Bar examination sittings open for registration. Apply through the citizen portal before June 1.',
  },
  quickServices: [
    { title: 'File a Case', subtitle: 'Civil or criminal', color: 'primary', icon: '⚖', to: '/wallet/services' },
    {
      title: 'Court Documents',
      subtitle: 'Request certified copies',
      color: '#5a4030',
      icon: '☷',
      to: '/wallet/permits/new',
    },
    {
      title: 'Legal Aid',
      subtitle: 'Free counsel for eligible',
      color: '#0f7a5f',
      icon: '✚',
      to: '/wallet/services',
    },
    {
      title: 'Notary Services',
      subtitle: 'Sworn statements',
      color: '#b48a3d',
      icon: '✎',
      to: '/wallet/services',
    },
    {
      title: 'Prison Visiting',
      subtitle: 'Schedule a visit',
      color: '#7c4d8a',
      icon: '⏚',
      to: '/wallet/services',
    },
    {
      title: 'Mediation',
      subtitle: 'Alternative resolution',
      color: '#3a82d0',
      icon: '◯',
      to: '/wallet/services',
    },
  ],
  featured: [
    {
      kicker: 'TRANSPARENCY',
      title: 'Open Court Records',
      body: 'Every public hearing is searchable. Constitutional decisions published within 24 hours of release.',
      cta: 'Search records',
      tone: 'primary',
      to: '/public',
    },
    {
      kicker: 'CIVIL LIBERTIES',
      title: 'Know Your Rights',
      body: 'Detention rights, fair-trial guarantees, equal protection clauses — explained for every citizen.',
      cta: 'Read the guide',
      tone: 'subtle',
      to: '/public',
    },
    {
      kicker: 'ACCESS',
      title: 'Legal Aid Network',
      body: '8,000+ pro-bono advocates available nationally. Income-tested eligibility, no application fee.',
      cta: 'Check eligibility',
      tone: 'amber',
      to: 'services',
    },
  ],
  statistics: [
    { value: '420', label: 'Active courts', sub: 'Across the country' },
    { value: '76 days', label: 'Median case duration', sub: 'Civil cases' },
    { value: '14,800', label: 'Pro-bono advocates', sub: 'Legal aid network' },
    { value: '92%', label: 'Case access', sub: 'Citizens within 50km of a court' },
    { value: '320', label: 'Constitutional decisions', sub: 'Published YTD' },
    { value: '99.8%', label: 'Records integrity', sub: 'Audit-vault verified' },
    { value: '0', label: 'Sealed without warrant', sub: 'Constitutional contract' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'Constitutional Decision №412 Published', summary: 'Landmark privacy ruling.' },
    { title: 'Legal Aid Coverage Expanded', summary: 'Now covering family law disputes.' },
    { title: 'Bar Examination Registration Open', summary: 'July sittings nationwide.' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'Open Records Project', body: 'Every public court record indexed and searchable.' },
    { title: 'Pro-Bono Network', body: 'Free legal counsel for income-tested citizens.' },
    { title: 'Restorative Justice', body: 'Mediation-led alternatives to incarceration.' },
  ],
  locator: {
    title: 'Find a Court',
    placeholder: 'Enter your district',
    tabs: ['Courts', 'Tribunals', 'Legal Aid', 'Mediators'],
    pinLabel: 'J',
    pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]],
  },
  shortcuts: [
    { title: 'Constitutional Library', subtitle: 'Full text + commentary', to: '/public' },
    { title: 'Bar Council', subtitle: 'Practitioner directory', to: 'contact' },
    { title: 'Judicial Conduct', subtitle: 'Complaints & ethics', to: '/wallet/contest' },
    { title: 'Open Justice Data', subtitle: 'Case statistics', to: 'statistics' },
  ],
  footerSections: [
    {
      heading: 'Services',
      items: [
        { label: 'File a Case', to: '/wallet/services' },
        { label: 'Legal Aid', to: 'services' },
        { label: 'Court Documents', to: 'services' },
        { label: 'Notary', to: 'services' },
        { label: 'Mediation', to: 'news' },
      ],
    },
    {
      heading: 'Resources',
      items: [
        { label: 'Constitution', to: '/public' },
        { label: 'Case Law', to: '/public' },
        { label: 'Forms & Filings', to: 'services' },
        { label: 'Publications', to: '/public' },
        { label: 'Contact', to: 'contact' },
      ],
    },
    {
      heading: 'About',
      items: [
        { label: 'Independence', to: 'services' },
        { label: 'Judicial Council', to: 'services' },
        { label: 'Careers', to: 'about' },
        { label: 'Audit & Oversight', to: '/public' },
        { label: 'Transparency', to: '/public' },
      ],
    },
  ],
  newsletter: { heading: 'Justice updates', body: 'Constitutional decisions and reform notices.' },
  legalLine: '© {year} Ministry of Justice & Constitutional Affairs.',
  legalLinks: [
    { label: 'Privacy Policy', to: '/legal/privacy' },
    { label: 'Terms of Use', to: '/legal/terms' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
