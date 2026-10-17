// Reference content for the Police Command public site (/police).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own.

import type { SiteContent } from '../types';

export const police: SiteContent = {
  id: 'police',
  institution: {
    name: 'Police Command',
    tagline: 'Civil stability under the rule of law',
    role: 'Agency',
    crest: '🛡',
    emergencyButton: { label: 'Emergency {emergency.police:999}', icon: '☎' },
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'Services', to: 'services' },
    { label: 'Report Crime', to: 'services' },
    { label: 'Stations', to: 'contact' },
    { label: 'Programs', to: 'programmes' },
    { label: 'News & Alerts', to: 'news' },
    { label: 'About', to: 'about' },
  ],
  hero: {
    headline: ['Safe Citizens,', 'Sovereign Order'],
    subhead: 'Under the constitution, under the law, in service of every citizen.',
    primaryCta: { label: 'Report a Crime', icon: '⚠', to: '/wallet/services' },
    secondaryCta: { label: 'Find a Station', icon: '📍', to: 'contact' },
    sideNote: {
      icon: '☎',
      title: 'Emergency: {emergency.police:999}',
      body: 'For life-threatening emergencies, dial immediately.',
      cta: 'Other helplines',
      to: 'contact',
    },
  },
  alert: {
    label: 'PUBLIC ADVISORY',
    text: 'Phishing fraud targeting digital identity is rising. Verify any sovereign request before sharing credentials.',
  },
  quickServices: [
    {
      title: 'Report a Crime',
      subtitle: 'Online or in-person',
      color: 'primary',
      icon: '!',
      to: '/wallet/services',
    },
    { title: 'Lost / Found', subtitle: 'File or look up', color: '#3a82d0', icon: '⌕', to: '/wallet/services' },
    {
      title: 'Police Clearance',
      subtitle: 'Apply or renew',
      color: '#7c5cff',
      icon: '✓',
      to: '/wallet/permits/new',
    },
    { title: 'Traffic Ticket', subtitle: 'Pay or contest', color: '#e08a2b', icon: '⚑', to: '/wallet/payments' },
    {
      title: 'Missing Person',
      subtitle: 'Report or search',
      color: '#d62b67',
      icon: '?',
      to: '/wallet/services',
    },
    {
      title: 'Community Liaison',
      subtitle: 'Engage with us',
      color: '#0f9d6b',
      icon: '⬡',
      to: '/wallet/services',
    },
  ],
  featured: [
    {
      kicker: 'COMMUNITY PROGRAMME',
      title: 'Safer Neighbourhoods',
      body: 'Every district has a community liaison officer. Meet yours, share concerns, build trust.',
      cta: 'Find your liaison',
      tone: 'primary',
      to: 'contact',
    },
    {
      kicker: 'TRANSPARENCY',
      title: 'Use-of-Force Reports',
      body: 'Quarterly reports on every use-of-force incident — proportionality reviewed, civilian-panel oversight.',
      cta: 'Read latest report',
      tone: 'subtle',
      to: '/public',
    },
    {
      kicker: 'CIVIL RIGHTS',
      title: 'Your Rights Matter',
      body: 'Every detainee has the right to counsel, to family notification, and to humane treatment. Know them.',
      cta: 'Read your rights',
      tone: 'amber',
      to: '/public',
    },
  ],
  statistics: [
    { value: '4,820', label: 'Active officers', sub: 'Sworn personnel' },
    { value: '8 min', label: 'Median response', sub: 'P1 emergencies' },
    { value: '74%', label: 'Clearance rate', sub: 'Major-case clearance' },
    { value: '124', label: 'Community liaisons', sub: 'Districts covered' },
    { value: '12', label: 'Tribunal hearings', sub: 'Civilian-panel oversight' },
    { value: '99.4%', label: 'Bodyworn coverage', sub: 'Use-of-force incidents' },
    { value: '0', label: 'Concealed incidents', sub: 'Constitutional contract' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'New Anti-Fraud Unit Launched', summary: 'A specialist team to tackle digital identity theft.' },
    { title: 'Quarterly Force Report Published', summary: 'Use-of-force, complaints and clearance figures.' },
    { title: 'Youth Diversion Programme Expanded', summary: 'Now active in 16 districts.' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'Safer Schools Liaison', body: 'School-resource officers trained in trauma-informed care.' },
    { title: 'Domestic Safety Network', body: 'Safety plans, protective orders, and trauma support — 24/7.' },
    {
      title: 'Open Forensics Doctrine',
      body: 'Every case sealed by independent custodian; chain-of-custody public.',
    },
  ],
  locator: {
    title: 'Find Your Nearest Station',
    placeholder: 'Enter your town or area',
    tabs: ['Stations', 'Liaisons', 'Tribunals', 'Online'],
    pinLabel: 'P',
    pinCoords: [[22, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]],
  },
  shortcuts: [
    { title: 'Crime Statistics', subtitle: 'District & national', to: 'statistics' },
    { title: 'Open Data', subtitle: 'Incidents, clearances, complaints', to: '/public' },
    { title: 'Career & Recruitment', subtitle: 'Become an officer', to: 'contact' },
    { title: 'Complaints Tribunal', subtitle: 'Civilian oversight', to: '/wallet/contest' },
  ],
  footerSections: [
    {
      heading: 'Services',
      items: [
        { label: 'Report Crime', to: '/wallet/services' },
        { label: 'Police Clearance', to: '/wallet/permits/new' },
        { label: 'Traffic Tickets', to: '/wallet/payments' },
        { label: 'Missing Persons', to: '/wallet/services' },
        { label: 'Community Liaison', to: 'services' },
      ],
    },
    {
      heading: 'Resources',
      items: [
        { label: 'Publications', to: '/public' },
        { label: 'Open Data', to: '/public' },
        { label: 'Media Centre', to: 'news' },
        { label: 'Constitution & Rights', to: '/public' },
        { label: 'Contact', to: 'contact' },
      ],
    },
    {
      heading: 'About',
      items: [
        { label: 'Command Structure', to: 'about' },
        { label: 'Code of Conduct', to: 'about' },
        { label: 'Careers', to: 'about' },
        { label: 'Civilian Oversight', to: 'about' },
        { label: 'Transparency', to: '/public' },
      ],
    },
  ],
  newsletter: { heading: 'Citizen safety updates', body: 'Monthly digest of advisories and reports.' },
  legalLine: '© {year} Police Command. All rights reserved.',
  legalLinks: [
    { label: 'Privacy Policy', to: '/legal/privacy' },
    { label: 'Code of Conduct', to: 'about' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
