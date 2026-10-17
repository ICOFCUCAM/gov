// Reference content for the National Operations Centre public site (/noc).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own.

import type { SiteContent } from '../types';

export const noc: SiteContent = {
  id: 'noc',
  institution: {
    name: 'National Operations Centre',
    tagline: 'Civilian situation awareness · 24/7',
    role: 'Agency',
    crest: '⌖',
    emergencyButton: { label: 'Live Briefing', icon: '◉' },
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'Live Briefing', to: 'news' },
    { label: 'National Posture', to: 'services' },
    { label: 'Incidents', to: 'services' },
    { label: 'Coordination', to: 'services' },
    { label: 'Archive', to: 'services' },
    { label: 'About', to: 'about' },
  ],
  hero: {
    headline: ['Aware,', 'Together'],
    subhead: 'The National Operations Centre is a civilian situation room — it observes, coordinates, and briefs the public every six hours.',
    primaryCta: { label: 'Latest Briefing', icon: '◉', to: 'news' },
    secondaryCta: { label: 'National Posture', icon: '⌖', to: 'services' },
    sideNote: {
      icon: '☷',
      title: 'Open by design',
      body: 'Every NOC decision publishes its rationale. The audit chain is public; sealed decisions without reasoning are void.',
      cta: 'How NOC decides',
      to: 'services',
    },
  },
  alert: {
    label: 'NATIONAL POSTURE',
    text: 'Posture: STEADY · National readiness 86/100 · 0 major incidents · next briefing in 03h 42m',
  },
  quickServices: [
    { title: 'Live Briefing', subtitle: 'Citizen briefing', color: 'primary', icon: '◉', to: '/noc' },
    {
      title: 'National Readiness',
      subtitle: 'Aggregate index',
      color: '#0f7a5f',
      icon: '⌖',
      to: '/wallet/services',
    },
    {
      title: 'Incident Floor',
      subtitle: 'Active incidents',
      color: '#b54a14',
      icon: '⚠',
      to: '/wallet/services',
    },
    {
      title: 'Coordination Decisions',
      subtitle: 'With public rationale',
      color: '#3a82d0',
      icon: '⌗',
      to: '/wallet/services',
    },
    {
      title: 'Cyber Posture',
      subtitle: 'National cyber status',
      color: '#7a4d8a',
      icon: '⌬',
      to: '/wallet/services',
    },
    { title: 'Briefing Archive', subtitle: 'Every past briefing', color: '#e08a2b', icon: '☷', to: '/public' },
  ],
  featured: [
    {
      kicker: 'CIVILIAN COMMAND',
      title: 'Awareness, Not Command',
      body: 'The NOC observes and coordinates — it does not command ministries or substitute for Cabinet. Decisions remain constitutional.',
      cta: 'NOC doctrine',
      tone: 'primary',
      to: 'services',
    },
    {
      kicker: 'PUBLIC BRIEFING',
      title: 'Every Six Hours',
      body: 'Citizens learn from the NOC directly, in five sovereign languages and sign language. No event is too small; no event is concealed.',
      cta: 'Briefing cadence',
      tone: 'subtle',
      to: 'news',
    },
    {
      kicker: 'SAFEGUARDS',
      title: 'Reasoned, Audited, Open',
      body: 'Every NOC decision carries published reasoning. The chain of command stays civilian. Cabinet decides; NOC informs.',
      cta: 'Read safeguards',
      tone: 'amber',
      to: '/public',
    },
  ],
  statistics: [
    { value: '24/7', label: 'Watch posture', sub: 'Never paused' },
    { value: 'every 6h', label: 'Public briefing cadence', sub: 'In 5 languages' },
    { value: '15', label: 'Ministries observed', sub: 'All sovereign' },
    { value: '0', label: 'Sealed decisions', sub: 'Constitutional contract' },
    { value: '100%', label: 'Decisions with rationale', sub: 'Publicly audited' },
    { value: '✓', label: 'Civilian command', sub: 'Senate-confirmed' },
    { value: 'open-source', label: 'Intel fusion', sub: 'Never classified' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'Briefing #{year}-318 published', summary: 'National posture STEADY; energy & climate routine.' },
    {
      title: 'Continuity Exercise CX-{year}-04',
      summary: 'Cross-branch CoG drill — all branches asserted continuity.',
    },
    { title: 'NOC Director Confirmed', summary: 'Senate confirms civilian Director, 7-year non-renewable term.' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'Open Briefing Archive', body: 'Every briefing permanently searchable; RSS · ATOM · JSON.' },
    { title: 'Multi-Language Reach', body: 'Five sovereign languages plus sign-language interpretation, live.' },
    {
      title: 'Citizen Watch Subscriptions',
      body: 'Subscribe to specific briefings by topic, region or severity.',
    },
  ],
  locator: {
    title: 'Regional Watch',
    placeholder: 'Search a region or domain',
    tabs: ['Regions', 'Domains', 'Incidents', 'Briefings'],
    pinLabel: '⌖',
    pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]],
  },
  shortcuts: [
    { title: 'Public Archive Stream', subtitle: 'RSS · ATOM · JSON', to: '/public' },
    { title: 'Translation Index', subtitle: 'All sovereign languages', to: 'services' },
    { title: 'Cyber Posture', subtitle: 'National cyber status', to: 'services' },
    { title: 'Continuity Exercises', subtitle: 'Drill calendar & results', to: 'services' },
  ],
  footerSections: [
    {
      heading: 'Briefings',
      items: [
        { label: 'Live Briefing', to: '/noc' },
        { label: 'Briefing Archive', to: '/public' },
        { label: 'Translations', to: 'services' },
        { label: 'Subscribe', to: 'services' },
        { label: 'RSS / JSON', to: 'services' },
      ],
    },
    {
      heading: 'Awareness',
      items: [
        { label: 'National Posture', to: 'services' },
        { label: 'Incident Floor', to: 'services' },
        { label: 'Ministry Posture', to: '/government' },
        { label: 'Cyber Posture', to: 'services' },
        { label: 'Continuity', to: 'services' },
      ],
    },
    {
      heading: 'Safeguards',
      items: [
        { label: 'Doctrine', to: 'services' },
        { label: 'Audit Chain', to: '/public' },
        { label: 'Civilian Command', to: 'services' },
        { label: 'Rationale Doctrine', to: 'services' },
        { label: 'Contact', to: 'contact' },
      ],
    },
  ],
  newsletter: { heading: 'NOC briefings', body: 'Every six hours, in your inbox or feed reader.' },
  legalLine: '© {year} National Operations Centre — Civilian situation awareness.',
  legalLinks: [
    { label: 'Privacy', to: '/legal/privacy' },
    { label: 'Terms', to: '/legal/terms' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
