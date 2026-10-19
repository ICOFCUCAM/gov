// Reference content for the Ministry of Labour & Social Protection public site (/labour).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own.

import type { SiteContent } from '../types';

export const labour: SiteContent = {
  id: 'labour',
  institution: {
    name: 'Ministry of Labour & Social Protection',
    tagline: 'Dignitas operis — the dignity of work',
    role: 'Ministry',
    crest: '⌬',
    emergencyButton: { label: 'Worker Hotline', icon: '☎' },
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'Jobs', to: 'services' },
    { label: 'Benefits', to: 'services' },
    { label: 'Rights', to: 'services' },
    { label: 'Pensions', to: 'services' },
    { label: 'News', to: 'news' },
    { label: 'About', to: 'about' },
  ],
  hero: {
    headline: ['Dignified Work,', 'Lasting Security'],
    subhead: 'Right to counsel, workplace safety, benefits continuity — non-negotiable.',
    primaryCta: { label: 'Find a Job', icon: '⌬', to: 'contact' },
    secondaryCta: { label: 'Apply for Benefits', icon: '✚', to: '/wallet/permits/new' },
    sideNote: {
      icon: '✚',
      title: 'Benefits within 14 days',
      body: 'Unemployment, disability, pension applications — constitutional 14-day disbursement window.',
      cta: 'Apply now',
      to: '/wallet/permits/new',
    },
  },
  alert: {
    label: 'PROGRAMME NOTICE',
    text: 'Reskilling cohorts open for the digital-skills track. 12-week programmes start June 1.',
  },
  quickServices: [
    { title: 'Find a Job', subtitle: 'National listing', color: 'primary', icon: '⌬', to: '/wallet/services' },
    {
      title: 'Apply Benefits',
      subtitle: 'Unemployment/welfare',
      color: '#0f7a5f',
      icon: '✚',
      to: '/wallet/permits/new',
    },
    {
      title: 'Pension Status',
      subtitle: 'Check or apply',
      color: '#7c4d8a',
      icon: '◯',
      to: '/wallet/permits/new',
    },
    {
      title: 'Report Workplace',
      subtitle: 'Safety concern',
      color: '#b81c3f',
      icon: '⚠',
      to: '/wallet/services',
    },
    {
      title: 'File a Complaint',
      subtitle: 'Wage/safety/discrimination',
      color: '#e08a2b',
      icon: '⚖',
      to: '/wallet/services',
    },
    {
      title: 'Vocational Training',
      subtitle: 'Apprenticeships',
      color: '#3a82d0',
      icon: '✦',
      to: '/wallet/services',
    },
  ],
  featured: [
    {
      kicker: 'CONSTITUTIONAL CONTRACT',
      title: 'Right to Counsel',
      body: 'Every worker in any tribunal lane has the right to counsel. Legal-aid is offered at filing.',
      cta: 'Learn rights',
      tone: 'primary',
      to: '/public',
    },
    {
      kicker: 'SAFETY',
      title: 'Workplace Inspections',
      body: 'Mandatory inspections; retaliation against complainants is a sustained finding.',
      cta: 'View register',
      tone: 'subtle',
      to: 'services',
    },
    {
      kicker: 'SUPPORT',
      title: 'Transition Support',
      body: 'Displaced workers receive bridge benefits + reskilling within 14 days.',
      cta: 'Apply',
      tone: 'amber',
      to: '/wallet/permits/new',
    },
  ],
  statistics: [
    { value: '21.4 M', label: 'Workforce', sub: 'National labour force' },
    { value: '6.2%', label: 'Unemployment', sub: 'Current rate' },
    { value: '78%', label: 'Benefits payout on-time', sub: 'Within 14 days' },
    { value: '12,400', label: 'Inspections / quarter', sub: 'Workplace safety' },
    { value: '24%', label: 'Women in workforce', sub: 'Senior roles' },
    { value: '94%', label: 'Pension coverage', sub: 'Eligible population' },
    { value: '0', label: 'Retaliatory terminations', sub: 'Constitutional contract' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'Minimum-Wage Indexation', summary: 'Annual cost-of-living adjustment.' },
    { title: 'Digital-Skills Cohort Opens', summary: '12-week intensive programme.' },
    { title: 'New Workplace Safety Code', summary: 'Enhanced protections in heavy industry.' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'Reskilling Pipeline', body: 'Bridge-and-reskill for displaced workers.' },
    { title: 'Youth Apprenticeship', body: 'Industry-sponsored apprenticeships nationwide.' },
    { title: 'Co-Determination Bench', body: 'Worker voice in industrial restructuring.' },
  ],
  locator: {
    title: 'Service Centres',
    placeholder: 'Enter your town or area',
    tabs: ['Jobs', 'Benefits', 'Inspectorate', 'Tribunals'],
    pinLabel: '⌬',
    pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]],
  },
  shortcuts: [
    { title: 'Worker Rights', subtitle: 'Constitutional library', to: '/public' },
    { title: 'Wage Library', subtitle: 'Sector-by-sector', to: 'services' },
    { title: 'Open Labour Data', subtitle: 'Statistics & trends', to: 'statistics' },
    { title: 'Cooperative Register', subtitle: 'Workers cooperatives', to: 'services' },
  ],
  footerSections: [
    {
      heading: 'Services',
      items: [
        { label: 'Jobs', to: 'services' },
        { label: 'Benefits', to: '/wallet/permits/new' },
        { label: 'Pensions', to: 'services' },
        { label: 'Complaints', to: '/wallet/contest' },
        { label: 'Vocational Training', to: 'services' },
      ],
    },
    {
      heading: 'Resources',
      items: [
        { label: 'Rights Library', to: '/public' },
        { label: 'Wage Library', to: 'services' },
        { label: 'Open Data', to: '/public' },
        { label: 'Publications', to: '/public' },
        { label: 'Contact', to: 'contact' },
      ],
    },
    {
      heading: 'About',
      items: [
        { label: 'Mandate', to: 'about' },
        { label: 'Inspectorate', to: 'services' },
        { label: 'Careers', to: 'about' },
        { label: 'Audit', to: '/public' },
        { label: 'Transparency', to: '/public' },
      ],
    },
  ],
  newsletter: { heading: 'Labour updates', body: 'Programmes, benefits, rights — monthly digest.' },
  legalLine: '© {year} Ministry of Labour & Social Protection.',
  legalLinks: [
    { label: 'Privacy', to: '/legal/privacy' },
    { label: 'Terms', to: '/legal/terms' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
