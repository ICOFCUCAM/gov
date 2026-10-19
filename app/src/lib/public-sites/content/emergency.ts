// Reference content for the Emergency Management & National Resilience public site (/emergency).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own.

import type { SiteContent } from '../types';

export const emergency: SiteContent = {
  id: 'emergency',
  institution: {
    name: 'Emergency Management & National Resilience',
    tagline: 'Salus populi suprema lex — the welfare of the people is supreme law',
    role: 'Agency',
    crest: '◬',
    emergencyButton: { label: 'Emergency {emergency.general:112}', icon: '☎' },
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'Alerts', to: 'news' },
    { label: 'Prepare', to: 'services' },
    { label: 'Shelters', to: 'services' },
    { label: 'Programs', to: 'programmes' },
    { label: 'News', to: 'news' },
    { label: 'About', to: 'about' },
  ],
  hero: {
    headline: ['Prepared Nation,', 'Protected People'],
    subhead: 'Risk reduction, rapid response, humanitarian continuity.',
    primaryCta: { label: 'Sign Up for Alerts', icon: '⚠', to: 'news' },
    secondaryCta: { label: 'Find a Shelter', icon: '📍', to: 'contact' },
    sideNote: {
      icon: '☎',
      title: 'Emergency: {emergency.general:112}',
      body: 'Fire, medical, search & rescue — dial {emergency.general:112} nationally.',
      cta: 'Other helplines',
      to: 'contact',
    },
  },
  alert: {
    label: 'NATIONAL ADVISORY',
    text: 'Monsoon season prepared posture engaged. Citizens in flood-prone districts: review evacuation plans now.',
  },
  quickServices: [
    {
      title: 'Sign Up — Alerts',
      subtitle: 'SMS / app / email',
      color: 'primary',
      icon: '⚠',
      to: '/wallet/services',
    },
    { title: 'Find a Shelter', subtitle: 'By district', color: '#7c4d8a', icon: '⌂', to: 'contact' },
    {
      title: 'Preparedness Kit',
      subtitle: 'What to assemble',
      color: '#0f7a5f',
      icon: '✚',
      to: '/wallet/services',
    },
    {
      title: 'Volunteer',
      subtitle: 'Civic responder corps',
      color: '#3a82d0',
      icon: '✦',
      to: '/wallet/services',
    },
    {
      title: 'Report a Hazard',
      subtitle: 'Public-safety risk',
      color: '#b81c3f',
      icon: '!',
      to: '/wallet/services',
    },
    {
      title: 'Humanitarian Aid',
      subtitle: 'Relief distribution',
      color: '#e08a2b',
      icon: '✦',
      to: '/wallet/services',
    },
  ],
  featured: [
    {
      kicker: 'CONSTITUTIONAL CONTRACT',
      title: 'Civilian Priority',
      body: 'Civilian welfare is non-negotiable. Evacuation never discriminatory. Authoritarian extension constitutionally void.',
      cta: 'Read safeguards',
      tone: 'primary',
      to: 'services',
    },
    {
      kicker: 'NEOC LIVE',
      title: 'National Operations Centre',
      body: 'Real-time multi-hazard monitoring. 24/7 inter-ministry coordination.',
      cta: 'Live dashboard',
      tone: 'subtle',
      to: '/noc',
    },
    {
      kicker: 'PREPARE',
      title: 'Resilience Programmes',
      body: 'Drills, training, and community-resilience grants in every district.',
      cta: 'Get involved',
      tone: 'amber',
      to: 'programmes',
    },
  ],
  statistics: [
    { value: '24/7', label: 'NEOC posture', sub: 'National operations centre' },
    { value: '480', label: 'Shelters', sub: 'National network' },
    { value: '6.4 min', label: 'Median activation', sub: 'NEOC declaration' },
    { value: '12,000+', label: 'Trained responders', sub: 'Active roster' },
    { value: '78', label: 'Risks tracked', sub: 'National risk board' },
    { value: '92%', label: 'Reach (M)', sub: 'Cell broadcast' },
    { value: '0', label: 'Discriminatory evacuations', sub: 'Constitutional contract' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'Monsoon Readiness Drill', summary: 'National pre-positioning complete.' },
    { title: 'Coastal Surge Shelters Doubled', summary: 'New capacity in 22 districts.' },
    { title: 'Civic Responder Corps Recruitment', summary: 'Volunteers in every community.' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'Community Resilience', body: 'Grants and training to build neighbourhood resilience.' },
    { title: 'Civic Responder Corps', body: 'Trained volunteers in every district.' },
    { title: 'Multi-Hazard Foresight', body: 'Long-horizon risk-board for 25-year planning.' },
  ],
  locator: {
    title: 'Shelters Near You',
    placeholder: 'Enter your town or area',
    tabs: ['Shelters', 'Stations', 'Aid Hubs', 'Volunteers'],
    pinLabel: '◬',
    pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]],
  },
  shortcuts: [
    { title: 'Preparedness Library', subtitle: 'Family / community / industry', to: 'services' },
    { title: 'Volunteer Sign-up', subtitle: 'Civic responder corps', to: 'services' },
    { title: 'Open Risk Data', subtitle: 'National risk board', to: 'statistics' },
    { title: 'After-Action Reports', subtitle: 'Lessons learned', to: '/public' },
  ],
  footerSections: [
    {
      heading: 'Services',
      items: [
        { label: 'Alerts', to: 'news' },
        { label: 'Shelters', to: 'services' },
        { label: 'Volunteer', to: 'services' },
        { label: 'Aid', to: 'services' },
        { label: 'Hazard Report', to: 'services' },
      ],
    },
    {
      heading: 'Resources',
      items: [
        { label: 'Preparedness', to: 'services' },
        { label: 'Risk Data', to: 'statistics' },
        { label: 'Open Data', to: '/public' },
        { label: 'AAR Library', to: 'services' },
        { label: 'Contact', to: 'contact' },
      ],
    },
    {
      heading: 'About',
      items: [
        { label: 'Mandate', to: 'about' },
        { label: 'NEOC', to: 'services' },
        { label: 'Careers', to: 'about' },
        { label: 'Audit', to: '/public' },
        { label: 'Transparency', to: '/public' },
      ],
    },
  ],
  newsletter: { heading: 'Emergency updates', body: 'Advisories, drills and seasonal posture.' },
  legalLine: '© {year} Emergency Management & National Resilience.',
  legalLinks: [
    { label: 'Privacy', to: '/legal/privacy' },
    { label: 'Terms', to: '/legal/terms' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
