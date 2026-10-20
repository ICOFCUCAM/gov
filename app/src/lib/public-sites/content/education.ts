// Reference content for the Ministry of Education public site (/education).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own.

import type { SiteContent } from '../types';

export const education: SiteContent = {
  id: 'education',
  institution: {
    name: 'Ministry of Education',
    tagline: 'Mens sana civitatis — the cultivated mind of the polity',
    role: 'Ministry',
    crest: '◈',
    emergencyButton: null,
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'Learners', to: 'services' },
    { label: 'Institutions', to: 'services' },
    { label: '{ai:AI Tutor Mesh|Tutor Mesh}', to: 'services' },
    { label: 'Research', to: 'services' },
    { label: 'News', to: 'news' },
    { label: 'About', to: 'about' },
  ],
  hero: {
    headline: ['Learning Without Limit,', 'Plural, Sovereign'],
    subhead: '{ai:AI-augmented, pluralistic, intergenerational — every learner with a sovereign learner-twin.|Augmented, pluralistic, intergenerational — every learner with a sovereign learner-twin.}',
    primaryCta: { label: 'My Learner Twin', icon: '◈', to: '/wallet' },
    secondaryCta: { label: 'Find an Institution', icon: '⌕', to: '/government' },
    sideNote: {
      icon: '✦',
      title: '{ai:AI Tutor Mesh|Tutor Mesh}',
      body: '{ai:Every learner has a privacy-preserving AI tutor. Cognitive profiling is constitutionally void.|Every learner has a privacy-preserving tutor. Cognitive profiling is constitutionally void.}',
      cta: 'How it works',
      to: 'services',
    },
  },
  alert: {
    label: 'ADMISSION NOTICE',
    text: 'Tertiary admissions cycle {year} open. Free scholarship applications via Learner Twin portal.',
  },
  quickServices: [
    { title: 'My Learner Twin', subtitle: 'Personal portal', color: 'primary', icon: '◈', to: '/wallet' },
    {
      title: 'Apply Scholarship',
      subtitle: 'Need + merit',
      color: '#0f7a5f',
      icon: '✚',
      to: '/wallet/permits/new',
    },
    {
      title: 'Find Institution',
      subtitle: 'School / college / Uni',
      color: '#7c4d8a',
      icon: '⌕',
      to: '/government',
    },
    {
      title: '{ai:AI Tutor Mesh|Tutor Mesh}',
      subtitle: 'Augmented learning',
      color: '#b48a3d',
      icon: '✦',
      to: '/wallet/services',
    },
    {
      title: 'Open Curriculum',
      subtitle: 'Browse standards',
      color: '#3a82d0',
      icon: '☷',
      to: '/wallet/services',
    },
    {
      title: 'Research Portal',
      subtitle: 'Grants & papers',
      color: '#e08a2b',
      icon: '⌬',
      to: '/wallet/permits/new',
    },
    {
      title: 'Check an accreditation',
      subtitle: 'Is this university accredited?',
      color: '#2f6f8f',
      icon: '✓',
      to: '/registers',
    },
  ],
  featured: [
    {
      kicker: 'FUTURISTIC SYSTEM',
      title: 'Sovereign Learner Twin',
      body: '{ai:Every learner has a privacy-preserving AI companion. Adaptive curriculum without conformity scoring.|Every learner has a privacy-preserving learning companion. Adaptive curriculum without conformity scoring.}',
      cta: 'How it works',
      tone: 'primary',
      to: '/wallet',
    },
    {
      kicker: 'PLURALISM',
      title: 'Civic Curriculum Open Source',
      body: 'Every framework public; multiple traditions honoured. Educational-conformity scoring is void.',
      cta: 'Read curriculum',
      tone: 'subtle',
      to: 'services',
    },
    {
      kicker: 'GENERATIONAL',
      title: 'Civilizational Memory',
      body: 'National archives, constitutional literacy, civic education — intergenerational property.',
      cta: 'Browse archive',
      tone: 'amber',
      to: '/public',
    },
  ],
  statistics: [
    { value: '{live.totalSites}', label: 'Public institution sites', sub: 'Independent portals' },
    { value: '8,400+', label: 'Schools', sub: 'Primary + secondary' },
    { value: '420', label: 'Higher ed institutions', sub: 'Universities + colleges' },
    { value: '24', label: 'Research universities', sub: 'PhD-granting' },
    { value: '13.4 M', label: 'Active learners', sub: 'All levels' },
    { value: '94%', label: 'Literacy rate', sub: 'National' },
    { value: '0', label: 'Cognitive profiling', sub: 'Constitutional contract' },
  ],
  statisticsSource: 'sample',
  news: [
    {
      title: '{ai:AI Tutor Mesh Phase 2 Rollout|Tutor Mesh Phase 2 Rollout}',
      summary: 'Privacy-preserving tutor coverage doubled.',
    },
    { title: 'New Constitutional Literacy Module', summary: 'Now in every secondary curriculum.' },
    { title: 'Research Lineage Programme', summary: '25-year funding stability for core research.' },
  ],
  newsSource: 'sample',
  initiatives: [
    {
      title: 'Sovereign Learner Twin',
      body: '{ai:Privacy-preserving AI tutor for every learner.|Privacy-preserving tutor for every learner.}',
    },
    { title: 'Neural Curriculum Graph', body: 'Adaptive curriculum that respects pluralism.' },
    { title: 'Civilizational Memory', body: 'National archive, constitutional literacy, civic education.' },
  ],
  locator: {
    title: 'Find an Institution',
    placeholder: 'Subject, region, level',
    tabs: ['Universities', 'Schools', 'Colleges', 'Research'],
    pinLabel: '◈',
    pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]],
  },
  shortcuts: [
    { title: 'Open Curriculum', subtitle: 'Full framework library', to: 'services' },
    { title: 'Examination Board', subtitle: 'Schedules & integrity', to: 'services' },
    { title: 'Scholarship Portal', subtitle: 'All schemes', to: '/wallet/permits/new' },
    { title: 'Civic Library', subtitle: 'Constitutional & civic', to: '/public' },
  ],
  footerSections: [
    {
      heading: 'Learners',
      items: [
        { label: 'Learner Twin', to: '/wallet' },
        { label: 'Scholarships', to: '/wallet/permits/new' },
        { label: 'Curriculum', to: 'services' },
        { label: 'Examinations', to: 'services' },
        { label: '{ai:AI Tutor Mesh|Tutor Mesh}', to: 'services' },
      ],
    },
    {
      heading: 'Institutions',
      items: [
        { label: 'Universities', to: 'services' },
        { label: 'Schools', to: 'services' },
        { label: 'Teacher Colleges', to: 'services' },
        { label: 'Research', to: 'services' },
        { label: 'Public Library', to: 'services' },
      ],
    },
    {
      heading: 'About',
      items: [
        { label: 'Mandate', to: 'about' },
        { label: 'Pluralism Doctrine', to: 'services' },
        { label: 'Careers', to: 'about' },
        { label: 'Audit', to: '/public' },
        { label: 'Transparency', to: '/public' },
      ],
    },
  ],
  newsletter: { heading: 'Education updates', body: 'Curriculum, scholarships, research news.' },
  legalLine: '© {year} Ministry of Education.',
  legalLinks: [
    { label: 'Privacy', to: '/legal/privacy' },
    { label: 'Pluralism Doctrine', to: 'services' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
