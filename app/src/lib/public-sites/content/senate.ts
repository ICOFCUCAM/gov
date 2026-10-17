// Reference content for the … — Upper House public site (/senate).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own.

import type { SiteContent } from '../types';

export const senate: SiteContent = {
  id: 'senate',
  institution: {
    name: '{upperChamber} — Upper House',
    tagline: 'Deliberative chamber of the legislature',
    role: 'Chamber',
    crest: '◈',
    emergencyButton: null,
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'Senators', to: 'services' },
    { label: 'Sessions', to: 'services' },
    { label: 'Bills & Treaties', to: 'services' },
    { label: 'Committees', to: 'services' },
    { label: 'Records', to: 'services' },
    { label: 'About', to: 'about' },
  ],
  hero: {
    headline: ['Deliberation,', 'Long Time'],
    subhead: 'A second chamber of measured review — the long horizon of the polity.',
    primaryCta: { label: 'Watch Live', icon: '▶', to: '/noc' },
    secondaryCta: { label: 'Find Your Senator', icon: '⌕', to: 'contact' },
    sideNote: {
      icon: '☷',
      title: 'Open records',
      body: 'Every plenary debate transcribed within 24 hours. Treaty ratifications published immediately.',
      cta: 'Browse records',
      to: '/public',
    },
  },
  alert: {
    label: 'SESSION NOTICE',
    text: 'Plenary Session #{year}-018 — Treaty ratification debate. Public gallery open; livestream available.',
  },
  quickServices: [
    { title: 'Find Your Senator', subtitle: 'By region', color: 'primary', icon: '⌕', to: 'contact' },
    { title: 'Watch Live', subtitle: 'Plenary & committees', color: '#7c4d8a', icon: '▶', to: '/noc' },
    { title: 'Bill Tracker', subtitle: 'All readings', color: '#3a82d0', icon: '✎', to: '/public' },
    { title: 'Treaty Ratifications', subtitle: 'Active & past', color: '#b48a3d', icon: '◯', to: '/public' },
    {
      title: 'Public Petitions',
      subtitle: 'Submit & track',
      color: '#0f7a5f',
      icon: '✚',
      to: '/wallet/services',
    },
    { title: 'Hansard / Records', subtitle: 'Full transcripts', color: '#e08a2b', icon: '☷', to: '/public' },
  ],
  featured: [
    {
      kicker: 'CONSTITUTIONAL ROLE',
      title: 'Second Reading Chamber',
      body: 'The Senate reviews every bill from the Assembly with a long-horizon lens. Two-thirds may delay; never block in perpetuity.',
      cta: 'How bills move',
      tone: 'primary',
      to: '/public',
    },
    {
      kicker: 'TREATY POWER',
      title: 'Treaty Ratification',
      body: 'International treaties require Senate concurrence. Every ratification debated openly; full text published.',
      cta: 'Treaty register',
      tone: 'subtle',
      to: '/public',
    },
    {
      kicker: 'OVERSIGHT',
      title: 'Committee Scrutiny',
      body: 'Seven standing committees scrutinise the executive. Every report public; subpoena powers used sparingly.',
      cta: 'See committees',
      tone: 'amber',
      to: 'services',
    },
  ],
  statistics: [
    { value: '84', label: 'Senators', sub: 'Two per region' },
    { value: '6 years', label: 'Term length', sub: 'Staggered thirds' },
    { value: '7', label: 'Standing committees', sub: 'Cross-cutting' },
    { value: '128', label: 'Sessions / year', sub: 'Plenary + committee' },
    { value: '100%', label: 'Hansard publication', sub: 'Within 24 hours' },
    { value: '0', label: 'Closed sessions', sub: 'Without published rationale' },
    { value: '0', label: 'Censorship orders', sub: 'Constitutional contract' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'Treaty Ratification Debate', summary: 'Climate cooperation framework.' },
    { title: 'Committee Report on Pensions', summary: 'Inter-generational solvency review.' },
    { title: 'New Code of Conduct Approved', summary: 'Strengthened ethics rules.' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'Open Hansard Project', body: 'Every plenary transcribed within 24h.' },
    { title: 'Citizen Petitions', body: 'Direct citizen access to legislative agenda.' },
    { title: 'Inter-Chamber Coordination', body: 'Conference committees with the Assembly.' },
  ],
  locator: {
    title: 'Senators by Region',
    placeholder: 'Enter your region',
    tabs: ['Senators', 'Committees', 'Petitions', 'Sessions'],
    pinLabel: '◈',
    pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]],
  },
  shortcuts: [
    { title: 'Bill Library', subtitle: 'All readings', to: '/public' },
    { title: 'Hansard Archive', subtitle: 'Full transcripts', to: '/public' },
    { title: 'Open Vote Data', subtitle: 'Roll-call records', to: '/public' },
    { title: 'Constitutional Library', subtitle: 'Full text', to: '/public' },
  ],
  footerSections: [
    {
      heading: 'Senators & Sessions',
      items: [
        { label: 'Find Senator', to: 'contact' },
        { label: 'Watch Live', to: '/noc' },
        { label: 'Hansard', to: '/public' },
        { label: 'Bills', to: '/public' },
        { label: 'Treaties', to: '/public' },
      ],
    },
    {
      heading: 'Resources',
      items: [
        { label: 'Records', to: '/public' },
        { label: 'Open Data', to: '/public' },
        { label: 'Petitions', to: 'services' },
        { label: 'Publications', to: '/public' },
        { label: 'Contact', to: 'contact' },
      ],
    },
    {
      heading: 'About',
      items: [
        { label: 'Role', to: 'services' },
        { label: 'Committees', to: 'services' },
        { label: 'Code of Conduct', to: 'about' },
        { label: 'Audit', to: '/public' },
        { label: 'Transparency', to: '/public' },
      ],
    },
  ],
  newsletter: { heading: '{upperChamber} updates', body: 'Sessions, votes, and report releases.' },
  legalLine: '© {year} {upperChamber} — Upper House of the Legislature.',
  legalLinks: [
    { label: 'Privacy', to: '/legal/privacy' },
    { label: 'Terms', to: '/legal/terms' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
