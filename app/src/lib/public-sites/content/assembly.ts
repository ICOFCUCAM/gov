// Reference content for the … — … public site (/assembly).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own.

import type { SiteContent } from '../types';

export const assembly: SiteContent = {
  id: 'assembly',
  institution: {
    name: '{primaryChamber} — {legislatureRole}',
    tagline: 'Voice of the people, makers of law',
    role: 'Chamber',
    crest: '⌬',
    emergencyButton: null,
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'Members', to: 'about' },
    { label: 'Sessions', to: 'services' },
    { label: 'Bills', to: 'services' },
    { label: 'Committees', to: 'services' },
    { label: 'Records', to: 'services' },
    { label: 'About', to: 'about' },
  ],
  hero: {
    headline: ['Lawmaking,', 'By the People'],
    subhead: 'The first chamber — closest to the citizen, fastest to respond.',
    primaryCta: { label: 'Watch Live', icon: '▶', to: '/noc' },
    secondaryCta: { label: 'Find Your Member', icon: '⌕', to: 'contact' },
    sideNote: {
      icon: '✦',
      title: 'Citizen petitions',
      body: '5,000 signatures trigger an Assembly debate. Submit, track, and watch your petition heard.',
      cta: 'Start petition',
      to: 'services',
    },
  },
  alert: {
    label: 'SESSION NOTICE',
    text: 'Plenary Session #{year}-198 — Budget Second Reading. Public gallery open; livestream available.',
  },
  quickServices: [
    { title: 'Find Your Member', subtitle: 'By constituency', color: 'primary', icon: '⌕', to: 'contact' },
    { title: 'Watch Live', subtitle: 'Plenary & committees', color: '#7c4d8a', icon: '▶', to: '/noc' },
    { title: 'Bill Tracker', subtitle: 'All readings', color: '#3a82d0', icon: '✎', to: '/public' },
    {
      title: 'Budget Debate',
      subtitle: 'Annual appropriation',
      color: '#b48a3d',
      icon: '✦',
      to: '/wallet/services',
    },
    { title: 'Public Petitions', subtitle: 'Submit & sign', color: '#0f7a5f', icon: '✚', to: '/wallet/services' },
    { title: 'Hansard / Records', subtitle: 'Full transcripts', color: '#e08a2b', icon: '☷', to: '/public' },
  ],
  featured: [
    {
      kicker: 'CONSTITUTIONAL ROLE',
      title: 'First Reading Chamber',
      body: 'Bills originate or are introduced here first. Three readings; full record of every speech and vote.',
      cta: 'How bills move',
      tone: 'primary',
      to: '/public',
    },
    {
      kicker: 'BUDGET POWER',
      title: 'Appropriations & Audit',
      body: 'The Assembly approves every public budget. Audit findings tabled here first — no exception.',
      cta: 'Budget portal',
      tone: 'subtle',
      to: '/public',
    },
    {
      kicker: 'OVERSIGHT',
      title: 'Question Time',
      body: 'Weekly Question Time — ministers answer to the chamber. Every answer Hansard-recorded.',
      cta: 'Watch Q-time',
      tone: 'amber',
      to: '/noc',
    },
  ],
  statistics: [
    { value: '420', label: 'Members', sub: 'One per constituency' },
    { value: '4 years', label: 'Term length', sub: 'Fixed-term' },
    { value: '14', label: 'Standing committees', sub: 'Cross-cutting' },
    { value: '240', label: 'Sessions / year', sub: 'Plenary + committee' },
    { value: '100%', label: 'Hansard publication', sub: 'Within 24 hours' },
    { value: '5,000', label: 'Citizen petition threshold', sub: 'Triggers debate' },
    { value: '0', label: 'Closed sessions', sub: 'Without published rationale' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'Budget Second Reading', summary: 'Annual appropriations.' },
    { title: 'Audit Findings Tabled', summary: 'Treasury & three ministries.' },
    { title: 'Petition Threshold Reached', summary: 'Citizens’ petition on climate to be debated.' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'Citizen Petitions Platform', body: 'Direct citizen access to the legislative agenda.' },
    { title: 'Open Hansard Project', body: 'Every plenary transcribed within 24h.' },
    { title: 'Youth Parliament', body: 'Annual youth sittings; resolutions tabled to plenary.' },
  ],
  locator: {
    title: 'Members by Constituency',
    placeholder: 'Enter your constituency',
    tabs: ['Members', 'Committees', 'Petitions', 'Sessions'],
    pinLabel: '⌬',
    pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]],
  },
  shortcuts: [
    { title: 'Bill Library', subtitle: 'All readings', to: '/public' },
    { title: 'Hansard Archive', subtitle: 'Full transcripts', to: '/public' },
    { title: 'Open Vote Data', subtitle: 'Roll-call records', to: '/public' },
    { title: 'Budget Library', subtitle: 'Appropriations & audit', to: '/public' },
  ],
  footerSections: [
    {
      heading: 'Members & Sessions',
      items: [
        { label: 'Find Member', to: 'contact' },
        { label: 'Watch Live', to: '/noc' },
        { label: 'Hansard', to: '/public' },
        { label: 'Bills', to: '/public' },
        { label: 'Budget', to: 'services' },
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
  newsletter: { heading: '{primaryChamberShort} updates', body: 'Sessions, votes, and petition outcomes.' },
  legalLine: '© {year} {primaryChamber} — {legislatureRoleLong}.',
  legalLinks: [
    { label: 'Privacy', to: '/legal/privacy' },
    { label: 'Terms', to: '/legal/terms' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
