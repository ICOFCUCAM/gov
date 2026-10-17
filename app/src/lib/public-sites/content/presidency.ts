// Reference content for the … public site (/presidency).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own.

import type { SiteContent } from '../types';

export const presidency: SiteContent = {
  id: 'presidency',
  institution: {
    name: '{executiveOffice}',
    tagline: '{executiveSeat} · Cabinet Office',
    role: 'Branch',
    crest: '◈',
    emergencyButton: { label: 'Cabinet Statement', icon: '✎' },
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'The {headOfGovernment}', to: 'services' },
    { label: 'Cabinet', to: 'services' },
    { label: 'Executive Orders', to: 'services' },
    { label: 'State Engagements', to: 'services' },
    { label: 'Transparency', to: 'services' },
    { label: 'About', to: 'about' },
  ],
  hero: {
    headline: ['Authority,', 'In Trust'],
    subhead: 'The {executiveOffice} exists in service of the polity — temporary, accountable, transparent.',
    primaryCta: { label: 'Read Executive Orders', icon: '✎', to: 'services' },
    secondaryCta: { label: 'Watch Citizen Address', icon: '▶', to: '/noc' },
    sideNote: {
      icon: '☷',
      title: 'Open by default',
      body: 'Every executive order publishes its rationale, fiscal impact and constitutional citation. Sealed orders without reasoning are void.',
      cta: 'Browse orders',
      to: 'services',
    },
  },
  alert: {
    label: 'CABINET NOTICE',
    text: 'Cabinet Sitting #{year}-104 — Quarterly economic posture and inter-ministry continuity drill on the agenda.',
  },
  quickServices: [
    { title: 'Executive Orders', subtitle: 'Active & archived', color: 'primary', icon: '✎', to: '/public' },
    {
      title: 'Cabinet Resolutions',
      subtitle: 'In debate & adopted',
      color: '#7a4d8a',
      icon: '☷',
      to: '/wallet/services',
    },
    {
      title: 'State Engagements',
      subtitle: 'Visits & summits',
      color: '#0f7a5f',
      icon: '◯',
      to: '/wallet/services',
    },
    { title: 'Citizen Address', subtitle: 'Watch & archive', color: '#e08a2b', icon: '▶', to: '/public' },
    { title: 'Asset Disclosures', subtitle: 'Cabinet transparency', color: '#3a82d0', icon: '✚', to: '/public' },
    { title: 'Succession Line', subtitle: 'Constitutional order', color: '#b48a3d', icon: '⌖', to: '/public' },
  ],
  featured: [
    {
      kicker: 'CONSTITUTIONAL ROLE',
      title: 'Govern Through Cabinet',
      body: 'The {headOfGovernment} governs *with* Cabinet, not above it. Collective responsibility binds every minister to every adopted resolution.',
      cta: 'How Cabinet decides',
      tone: 'primary',
      to: 'services',
    },
    {
      kicker: 'TRANSPARENCY',
      title: 'Records You Can Read',
      body: 'Every order, resolution and engagement is published in open form within seven days. The Records Auditor reports to the {upperChamber}.',
      cta: 'Records publication',
      tone: 'subtle',
      to: '/public',
    },
    {
      kicker: 'SAFEGUARDS',
      title: 'A Temporary Office',
      body: '{executiveBody} is term-limited. Rule by decree, sealed orders, civil-military fusion and concealment of foreign engagements are constitutionally void.',
      cta: 'Read safeguards',
      tone: 'amber',
      to: 'contact',
    },
  ],
  statistics: [
    { value: '15', label: 'Ministers', sub: 'Collective cabinet' },
    { value: '4 years', label: 'Term length', sub: 'Renewable once' },
    { value: '52', label: 'Cabinet sittings / year', sub: 'Weekly cadence' },
    { value: '4', label: 'Transparency reports / yr', sub: 'Quarterly, public' },
    { value: '100%', label: 'Orders with rationale', sub: 'No sealed orders' },
    { value: '0', label: 'Concealed engagements', sub: 'Constitutional contract' },
    { value: '✓', label: 'Civilian command', sub: 'Over the military' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'EO {year}-142 — Climate Adaptation', summary: 'Inter-ministry implementation directive.' },
    { title: 'Cabinet Resolution CR-58134', summary: 'Inter-ministry continuity drill ordered.' },
    { title: 'State Visit Concluded', summary: 'Continental Compact partnership renewed.' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'Open Records Initiative', body: 'Every presidential record machine-readable within 14 days.' },
    { title: 'Public Engagement Tour', body: 'Quarterly town halls across all regions.' },
    { title: 'Cabinet Transparency Pact', body: 'Asset & conflict disclosures published annually.' },
  ],
  locator: {
    title: 'Cabinet by Ministry',
    placeholder: 'Search a ministry or minister',
    tabs: ['Ministers', 'Orders', 'Engagements', 'Records'],
    pinLabel: '◈',
    pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]],
  },
  shortcuts: [
    { title: 'Executive Order Library', subtitle: 'All orders, all years', to: 'services' },
    { title: 'Asset Disclosures', subtitle: 'Cabinet transparency', to: '/public' },
    { title: 'Public Addresses', subtitle: 'Captioned & translated', to: 'services' },
    { title: 'Constitutional Library', subtitle: 'Full text', to: '/public' },
  ],
  footerSections: [
    {
      heading: '{executiveBody}',
      items: [
        { label: 'The {headOfGovernment}', to: '/government' },
        { label: 'The Cabinet', to: 'services' },
        { label: 'Executive Orders', to: 'services' },
        { label: 'Resolutions', to: 'services' },
        { label: 'Succession', to: 'services' },
      ],
    },
    {
      heading: 'Engagement',
      items: [
        { label: 'Citizen Address', to: 'services' },
        { label: 'State Visits', to: 'services' },
        { label: 'Public Engagements', to: 'services' },
        { label: 'Foreign Affairs', to: 'services' },
        { label: 'Contact', to: 'contact' },
      ],
    },
    {
      heading: 'Transparency',
      items: [
        { label: 'Transparency Reports', to: '/public' },
        { label: 'Asset Disclosures', to: 'services' },
        { label: 'Records', to: '/public' },
        { label: 'Audit', to: '/public' },
        { label: 'Safeguards', to: 'services' },
      ],
    },
  ],
  newsletter: {
    heading: '{headOfGovernment}\'s briefings',
    body: 'Weekly cabinet read-out and order publication notices.',
  },
  legalLine: '© {year} {executiveOffice} — {executiveSeat}.',
  legalLinks: [
    { label: 'Privacy', to: '/legal/privacy' },
    { label: 'Terms', to: '/legal/terms' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
