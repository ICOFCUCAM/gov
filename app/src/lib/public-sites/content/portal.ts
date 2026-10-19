// Reference content for the Citizen Super-Portal public site (/portal).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own.

import type { SiteContent } from '../types';

export const portal: SiteContent = {
  id: 'portal',
  institution: {
    name: 'Citizen Super-Portal',
    tagline: 'Every ministry · one wallet · one identity',
    role: 'Agency',
    crest: '◯',
    emergencyButton: { label: 'Open Wallet', icon: '◯' },
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'Identity', to: 'services' },
    { label: 'Health', to: 'services' },
    { label: 'Education', to: 'services' },
    { label: 'Taxation', to: 'services' },
    { label: 'Justice', to: 'services' },
    { label: 'Civic Voice', to: 'services' },
    { label: 'Safeguards', to: 'services' },
  ],
  hero: {
    headline: ['Citizen first.', 'Always.'],
    subhead: 'Your identity, records, and consents are yours. The Citizen Super-Portal unifies every government service in one wallet — never scored, never sold, never sealed.',
    primaryCta: { label: 'Open Your Wallet', icon: '◯', to: '/wallet' },
    secondaryCta: { label: 'How It Works', icon: '✎', to: 'services' },
    sideNote: {
      icon: '✓',
      title: 'Universal right of appeal',
      body: 'Every administrative decision is appealable to an independent tribunal at no cost. Reasoning is always published.',
      cta: 'How to appeal',
      to: '/wallet/contest',
    },
  },
  alert: {
    label: 'CITIZEN DOCTRINE',
    text: 'No civic-credit. No behavioural profiling. No silent data sharing. Your data, your choice — always revocable.',
  },
  quickServices: [
    {
      title: 'File a Tax Return',
      subtitle: 'Treasury · pre-filled',
      color: 'primary',
      icon: '◈',
      to: '/wallet/services',
    },
    {
      title: 'Book Health Visit',
      subtitle: 'Health · same-day options',
      color: '#0f7a5f',
      icon: '✚',
      to: '/wallet/permits/new',
    },
    {
      title: 'Apply for a Permit',
      subtitle: 'Interior · 24h median',
      color: '#3a82d0',
      icon: '⌗',
      to: '/wallet/permits/new',
    },
    {
      title: 'File an Appeal',
      subtitle: 'Justice · free, independent',
      color: '#7a4d8a',
      icon: '⚖',
      to: '/wallet/services',
    },
    {
      title: 'Sign a Petition',
      subtitle: 'Assembly · 5,000 triggers debate',
      color: '#b48a3d',
      icon: '✎',
      to: '/wallet/services',
    },
    {
      title: 'Renew Passport',
      subtitle: 'Foreign Affairs · consular',
      color: '#e08a2b',
      icon: '⌖',
      to: '/wallet/permits/new',
    },
  ],
  featured: [
    {
      kicker: 'CITIZEN-OWNED',
      title: 'Your Identity, Your Records',
      body: 'Identity, EHR, credentials and tax history belong to you. Ministries see only what you consent to share — and you may revoke at any time.',
      cta: 'Identity doctrine',
      tone: 'primary',
      to: '/wallet/identity',
    },
    {
      kicker: 'OPEN BY DEFAULT',
      title: 'Every Decision Reasoned',
      body: 'Administrative decisions cite the rule, explain the formula, and may be appealed for free. Reasoning-free decisions are void.',
      cta: 'Appeal Centre',
      tone: 'subtle',
      to: '/wallet/contest',
    },
    {
      kicker: 'SAFEGUARDS',
      title: 'Never Scored',
      body: 'Civic-credit, behavioural profiling, biometric coercion and cross-ministry tracking are constitutionally prohibited.',
      cta: 'Read safeguards',
      tone: 'amber',
      to: 'services',
    },
  ],
  statistics: [
    { value: '45M+', label: 'Citizens enrolled', sub: 'Voluntary, lifelong' },
    { value: '15', label: 'Ministries unified', sub: 'One wallet' },
    { value: '99.9%', label: 'Services uptime', sub: 'Sovereign hosting' },
    { value: '0', label: 'Civic-credit systems', sub: 'Constitutional contract' },
    { value: '100%', label: 'Decisions appealable', sub: 'No exceptions' },
    { value: '0', label: 'Silent data transfers', sub: 'Consent-bound' },
    { value: 'open', label: 'Data formats', sub: 'FHIR · JSON · PDF' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'Universal Tax Pre-Fill Live', summary: 'Your return arrives pre-filled; you amend, sign, submit.' },
    {
      title: 'Cross-Ministry Consent Tokens',
      summary: 'Revocable consents now portable across all 15 ministries.',
    },
    { title: 'Appeals Now Free in All Domains', summary: 'Universal right of appeal — no filing fee, ever.' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'Sovereign Identity', body: 'Citizen-owned, federated, never state-scored.' },
    { title: 'Universal Appeal', body: 'Every decision appealable at no cost.' },
    { title: 'Consent Ledger', body: 'See and revoke what each ministry knows about you.' },
  ],
  locator: {
    title: 'Find a Service',
    placeholder: 'Search "renew passport", "book doctor", "file taxes"…',
    tabs: ['Services', 'Ministries', 'Appeals', 'Consents'],
    pinLabel: '◯',
    pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]],
  },
  shortcuts: [
    { title: 'Consents Ledger', subtitle: 'What ministries may see', to: '/wallet' },
    { title: 'Personal Records', subtitle: 'Every sovereign record', to: '/wallet/records' },
    { title: 'Mobility Wallet', subtitle: 'Tracking off by default', to: '/wallet' },
    { title: 'Voter Wallet', subtitle: 'Ballot privacy guaranteed', to: '/wallet' },
  ],
  footerSections: [
    {
      heading: 'Wallet',
      items: [
        { label: 'Identity', to: '/wallet/identity' },
        { label: 'Records', to: '/wallet/records' },
        { label: 'Consents', to: 'services' },
        { label: 'Notifications', to: 'services' },
        { label: 'Settings', to: 'services' },
      ],
    },
    {
      heading: 'Services',
      items: [
        { label: 'Health', to: 'services' },
        { label: 'Education', to: 'services' },
        { label: 'Taxation', to: '/wallet/payments' },
        { label: 'Justice', to: 'services' },
        { label: 'Permits', to: '/wallet/permits/new' },
      ],
    },
    {
      heading: 'Rights',
      items: [
        { label: 'Appeal Centre', to: '/wallet/contest' },
        { label: 'Data Doctrine', to: 'statistics' },
        { label: 'Citizen Safeguards', to: 'services' },
        { label: 'Contact', to: 'contact' },
        { label: 'Help', to: 'services' },
      ],
    },
  ],
  newsletter: { heading: 'Citizen updates', body: 'Service changes, new appeals processes, rights updates.' },
  legalLine: '© {year} Citizen Super-Portal — Citizen-owned, sovereignly hosted.',
  legalLinks: [
    { label: 'Privacy', to: '/legal/privacy' },
    { label: 'Terms', to: '/legal/terms' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
