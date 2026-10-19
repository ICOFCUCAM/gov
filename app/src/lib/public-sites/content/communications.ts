// Reference content for the Communications & Digital Infrastructure public site (/communications).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own.

import type { SiteContent } from '../types';

export const communications: SiteContent = {
  id: 'communications',
  institution: {
    name: 'Communications & Digital Infrastructure',
    tagline: 'Civitas conexa — the connected polity',
    role: 'Agency',
    crest: '⌬',
    emergencyButton: { label: 'Cyber Hotline', icon: '☎' },
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'Services', to: 'services' },
    { label: 'Cyber', to: 'services' },
    { label: 'Spectrum', to: 'services' },
    { label: 'Identity', to: 'services' },
    { label: 'News', to: 'news' },
    { label: 'About', to: 'about' },
  ],
  hero: {
    headline: ['Connected Citizens,', 'Sovereign Networks'],
    subhead: 'Press independence, end-to-end integrity, spectrum as a public resource.',
    primaryCta: { label: 'Digital Identity', icon: '◈', to: '/wallet/identity' },
    secondaryCta: { label: 'Spectrum Licence', icon: '⌭', to: '/wallet/permits/new' },
    sideNote: {
      icon: '✦',
      title: 'Cyber resilience',
      body: 'National SOC operates 24/7 — citizen-incident reporting + identity protection.',
      cta: 'Report incident',
      to: '/wallet/services',
    },
  },
  alert: {
    label: 'CYBER ADVISORY',
    text: 'Phishing campaign impersonating Treasury detected. Never share credentials. Report to the SOC immediately.',
  },
  quickServices: [
    {
      title: 'Digital Identity',
      subtitle: 'CivicID enrol/manage',
      color: 'primary',
      icon: '◈',
      to: '/wallet/identity',
    },
    {
      title: 'Report Cyber Incident',
      subtitle: 'SOC intake',
      color: '#b81c3f',
      icon: '!',
      to: '/wallet/services',
    },
    {
      title: 'Spectrum Licence',
      subtitle: 'Apply or renew',
      color: '#7c4d8a',
      icon: '⌭',
      to: '/wallet/permits/new',
    },
    {
      title: 'Broadband Permit',
      subtitle: 'Domestic/business',
      color: '#0f7a5f',
      icon: '⌗',
      to: '/wallet/permits/new',
    },
    {
      title: 'Telecom Portability',
      subtitle: 'Keep your number',
      color: '#b48a3d',
      icon: '↻',
      to: '/wallet/services',
    },
    { title: 'Service Outage', subtitle: 'Report or check', color: '#e08a2b', icon: '⚠', to: '/wallet/services' },
  ],
  featured: [
    {
      kicker: 'CONSTITUTIONAL CONTRACT',
      title: 'Press Independence',
      body: 'Censorship without court order is constitutionally void. Public-service broadcasters at arm’s length.',
      cta: 'Read doctrine',
      tone: 'primary',
      to: 'news',
    },
    {
      kicker: 'PRIVACY',
      title: 'Consent-Based Authentication',
      body: 'CivicID never used for surveillance. Every authentication consent-logged.',
      cta: 'Learn more',
      tone: 'subtle',
      to: '/wallet/documents',
    },
    {
      kicker: 'TRANSPARENT TENDER',
      title: 'Spectrum as Public Resource',
      body: 'Every spectrum allocation tender-based and reviewable. Non-tender awards void.',
      cta: 'View tenders',
      tone: 'amber',
      to: 'services',
    },
  ],
  statistics: [
    { value: '99.97%', label: 'National uptime', sub: 'Past 12 months' },
    { value: '54 M', label: 'CivicID enrolled', sub: 'Citizens' },
    { value: '94%', label: 'Press-independence idx', sub: 'National media' },
    { value: '8.4 ms', label: 'Mean latency', sub: 'Urban average' },
    { value: '12 GHz', label: 'Spectrum managed', sub: 'Across bands' },
    { value: '0', label: 'Concealed incidents', sub: 'Constitutional contract' },
    { value: '0', label: 'Network shutdowns', sub: 'Without court order' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'Sovereign Cloud Capacity Doubled', summary: 'New data centres in two regions.' },
    { title: 'National SOC Drill Completed', summary: 'Tabletop exercise across 14 agencies.' },
    { title: 'Spectrum Auction Concluded', summary: '5G mid-band — transparent tender.' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'Sovereign Cloud Programme', body: 'Citizen data stored in sovereign data centres.' },
    { title: 'Digital Identity Programme', body: 'Privacy-preserving authentication for every citizen.' },
    { title: 'Cybersecurity Resilience', body: 'National SOC and threat-sharing fabric.' },
  ],
  locator: {
    title: 'Service Centres',
    placeholder: 'Enter your district',
    tabs: ['Identity', 'SOC', 'Spectrum', 'Telecom'],
    pinLabel: '⌬',
    pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]],
  },
  shortcuts: [
    { title: 'Cyber Library', subtitle: 'Citizen protection guides', to: 'services' },
    { title: 'Open Network Data', subtitle: 'Outages & uptime', to: 'statistics' },
    { title: 'Spectrum Database', subtitle: 'Tender & allocation', to: 'contact' },
    { title: 'Media Register', subtitle: 'Broadcaster directory', to: 'news' },
  ],
  footerSections: [
    {
      heading: 'Services',
      items: [
        { label: 'Digital Identity', to: '/wallet/identity' },
        { label: 'Cyber Reporting', to: 'services' },
        { label: 'Spectrum', to: 'services' },
        { label: 'Telecom Portability', to: 'services' },
        { label: 'Outages', to: 'services' },
      ],
    },
    {
      heading: 'Resources',
      items: [
        { label: 'Cyber Library', to: 'services' },
        { label: 'Open Data', to: '/public' },
        { label: 'Publications', to: '/public' },
        { label: 'Forms', to: 'services' },
        { label: 'Contact', to: 'contact' },
      ],
    },
    {
      heading: 'About',
      items: [
        { label: 'Mandate', to: 'about' },
        { label: 'SOC', to: 'services' },
        { label: 'Careers', to: 'about' },
        { label: 'Audit', to: '/public' },
        { label: 'Transparency', to: '/public' },
      ],
    },
  ],
  newsletter: { heading: 'Digital infrastructure updates', body: 'Cyber advisories and spectrum tenders.' },
  legalLine: '© {year} Communications & Digital Infrastructure.',
  legalLinks: [
    { label: 'Privacy', to: '/legal/privacy' },
    { label: 'Terms', to: '/legal/terms' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
