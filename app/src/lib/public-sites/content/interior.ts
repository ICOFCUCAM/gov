// Reference content for the Ministry of Interior public site (/interior).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own.

import type { SiteContent } from '../types';

export const interior: SiteContent = {
  id: 'interior',
  institution: {
    name: 'Ministry of Interior',
    tagline: 'Civil stability, civic identity, regional coordination',
    role: 'Ministry',
    crest: '◧',
    emergencyButton: { label: 'Civic Services', icon: '☎' },
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'Civic ID', to: 'services' },
    { label: 'Borders', to: 'services' },
    { label: 'Customs', to: 'services' },
    { label: 'Regional', to: 'services' },
    { label: 'News', to: 'news' },
    { label: 'About', to: 'about' },
  ],
  hero: {
    headline: ['One Nation,', 'Many Regions'],
    subhead: 'Civic identity, border continuity, regional coordination.',
    primaryCta: { label: 'CivicID', icon: '◈', to: '/wallet/identity' },
    secondaryCta: { label: 'Border Status', icon: '⌗', to: 'services' },
    sideNote: {
      icon: '✚',
      title: 'Civic services',
      body: 'CivicID enrolment, civil registration, regional liaison — at 480 local offices.',
      cta: 'Find office',
      to: 'contact',
    },
  },
  alert: {
    label: 'CIVIC NOTICE',
    text: 'CivicID renewal cycle {year} has begun. Visit your local office or use the online portal.',
  },
  quickServices: [
    {
      title: 'CivicID Enrol',
      subtitle: 'New or renewal',
      color: 'primary',
      icon: '◈',
      to: '/wallet/permits/new',
    },
    {
      title: 'Civil Registration',
      subtitle: 'Birth / death / marriage',
      color: '#0f7a5f',
      icon: '✎',
      to: '/wallet/permits/new',
    },
    {
      title: 'Border Permit',
      subtitle: 'Cross-border movement',
      color: '#7c4d8a',
      icon: '⌗',
      to: '/wallet/permits/new',
    },
    {
      title: 'Customs Clearance',
      subtitle: 'Import/export goods',
      color: '#b48a3d',
      icon: '⌖',
      to: '/wallet/permits/new',
    },
    {
      title: 'Regional Liaison',
      subtitle: 'Your local office',
      color: '#3a82d0',
      icon: '◧',
      to: '/wallet/services',
    },
    {
      title: 'Civic Services Hotline',
      subtitle: 'Citizen support',
      color: '#e08a2b',
      icon: '☎',
      to: '/wallet/services',
    },
  ],
  featured: [
    {
      kicker: 'CONSTITUTIONAL CONTRACT',
      title: 'Civic Identity as Right',
      body: 'Every citizen has a right to enrol. CivicID consent-based, never used for surveillance.',
      cta: 'Read safeguards',
      tone: 'primary',
      to: '/wallet/identity',
    },
    {
      kicker: 'COORDINATION',
      title: 'National-Regional Mesh',
      body: 'Interior coordinates 68 regional units. Equitable resource allocation; no district left behind.',
      cta: 'Regional dashboard',
      tone: 'subtle',
      to: 'statistics',
    },
    {
      kicker: 'BORDER CONTINUITY',
      title: 'Lawful Border Management',
      body: 'Borders managed lawfully; humanitarian protections honoured. Arbitrary detention void.',
      cta: 'Read doctrine',
      tone: 'amber',
      to: 'services',
    },
  ],
  statistics: [
    { value: '142 M', label: 'CivicID enrolled', sub: 'Total citizens' },
    { value: '480', label: 'Local offices', sub: 'Regional coverage' },
    { value: '24/7', label: 'Border continuity', sub: 'All ports of entry' },
    { value: '68', label: 'Regional units', sub: 'National mesh' },
    { value: '92%', label: 'Civil reg same-day', sub: 'Birth registrations' },
    { value: '6.4 d', label: 'Median CivicID', sub: 'New enrolment' },
    { value: '0', label: 'Arbitrary detentions', sub: 'Constitutional contract' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'Online CivicID Renewal Live', summary: 'Renew without visiting an office.' },
    { title: 'Regional Liaison Network Expanded', summary: '64 new staff posted.' },
    { title: 'Border Management Modernised', summary: 'Digital pre-clearance at major ports.' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'Universal CivicID', body: 'Free enrolment, biometric attestation.' },
    { title: 'Regional Mesh', body: 'Inter-regional coordination platform.' },
    { title: 'Civic Service Modernisation', body: 'Digital-first, paper as fallback.' },
  ],
  locator: {
    title: 'Local Offices',
    placeholder: 'Enter your district',
    tabs: ['CivicID', 'Civil Reg', 'Border', 'Customs'],
    pinLabel: '◧',
    pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]],
  },
  shortcuts: [
    { title: 'Civic Library', subtitle: 'Identity & rights', to: '/public' },
    { title: 'Regional Statistics', subtitle: 'Open data', to: 'statistics' },
    { title: 'Border Procedures', subtitle: 'Cross-border guide', to: 'services' },
    { title: 'Civic Education', subtitle: 'Rights & obligations', to: '/public' },
  ],
  footerSections: [
    {
      heading: 'Services',
      items: [
        { label: 'CivicID', to: '/wallet/identity' },
        { label: 'Civil Registration', to: '/wallet/permits/new' },
        { label: 'Border', to: 'services' },
        { label: 'Customs', to: 'services' },
        { label: 'Regional Liaison', to: 'services' },
      ],
    },
    {
      heading: 'Resources',
      items: [
        { label: 'Open Data', to: '/public' },
        { label: 'Publications', to: '/public' },
        { label: 'Civic Library', to: 'services' },
        { label: 'Forms', to: 'services' },
        { label: 'Contact', to: 'contact' },
      ],
    },
    {
      heading: 'About',
      items: [
        { label: 'Mandate', to: 'about' },
        { label: 'Regional Mesh', to: 'services' },
        { label: 'Careers', to: 'about' },
        { label: 'Audit', to: '/public' },
        { label: 'Transparency', to: '/public' },
      ],
    },
  ],
  newsletter: { heading: 'Interior updates', body: 'CivicID, regional and border notices.' },
  legalLine: '© {year} Ministry of Interior.',
  legalLinks: [
    { label: 'Privacy', to: '/legal/privacy' },
    { label: 'Terms', to: '/legal/terms' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
