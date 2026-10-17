// Reference content for the Ministry of Treasury & Finance public site (/treasury).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own. The
// Treasury design shows its fiscal panels from the treasury engine; these
// figures serve the other designs. Amounts use the nation's currency.

import type { SiteContent } from '../types';

export const treasury: SiteContent = {
  id: 'treasury',
  institution: {
    name: 'Ministry of Treasury & Finance',
    tagline: 'Fiscal Stewardship · Reserve Protection · Economic Continuity',
    role: 'Ministry',
    crest: '⚖',
    about: 'Sovereign Financial System',
    emergencyButton: null,
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'About Us', to: 'about' },
    { label: 'Pillars', to: 'programmes' },
    { label: 'Services', to: '/wallet/services' },
    { label: 'Data & Reports', to: '/public' },
    { label: 'Legislation', to: '/public' },
    { label: 'Newsroom', to: 'news' },
  ],
  hero: {
    headline: ['Stewarding National Wealth.', 'Securing Generational Prosperity.'],
    subhead: 'We safeguard the nation’s financial foundation through disciplined stewardship, prudent allocation, and sustainable economic management.',
    primaryCta: { label: 'Our Mandate', icon: '→', to: 'about' },
    secondaryCta: { label: 'View Fiscal Dashboard', icon: '▤', to: '/gov/treasury' },
  },
  quickServices: [
    { title: 'Pay Taxes', subtitle: 'Returns and payments', color: 'primary', icon: '▤', to: '/wallet/payments' },
    { title: 'Taxpayer Portal', subtitle: 'Your filings and receipts', color: '#1f9d63', icon: '◈', to: '/wallet' },
    { title: 'Public Budget', subtitle: 'Where the money goes', color: '#b58a35', icon: '◴', to: '/public' },
    { title: 'Supplier Tenders', subtitle: 'Bid and track contracts', color: '#16233d', icon: '⊟', to: '/wallet/permits/new' },
    { title: 'Appeal a Decision', subtitle: 'Tax or procurement', color: '#c9a24a', icon: '⚖', to: '/wallet/contest' },
    { title: 'Verify a Receipt', subtitle: 'Payments and refunds', color: '#2bb377', icon: '✓', to: '/wallet/documents' },
  ],
  featured: [
    {
      kicker: 'Daily statement',
      title: 'Fiscal Snapshot',
      body: 'Fiscal balance, revenue, expenditure, debt, liquidity and reserves from the single treasury account.',
      cta: 'View Full Fiscal Dashboard',
      tone: 'primary',
      to: '/gov/treasury',
    },
    {
      kicker: 'Appropriation',
      title: 'Budget Allocation Overview',
      body: 'How the approved budget is shared across sectors, published in open form.',
      cta: 'View Budget Details',
      tone: 'subtle',
      to: '/public',
    },
    {
      kicker: 'Markets',
      title: 'Market & Economic Indicators',
      body: 'Inflation, growth, policy rate, exchange rate and bond yields.',
      cta: 'View Economic Dashboard',
      tone: 'amber',
      to: '/gov/treasury',
    },
  ],
  statistics: [
    { value: '{money:28580000000}', label: 'Fiscal Balance', sub: 'Year to date' },
    { value: '{money:27980000000}', label: 'Total Revenue', sub: 'Year to date' },
    { value: '{money:23770000000}', label: 'Total Expenditure', sub: 'Year to date' },
    { value: '58.0%', label: 'Debt to GDP', sub: 'Watch' },
    { value: '{money:27600000000}', label: 'Foreign Reserves', sub: 'Adequate' },
    { value: '4.1%', label: 'Inflation', sub: 'Year on year' },
    { value: '3.25%', label: 'Policy Rate', sub: 'Central bank' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'Treasury Reports Strong Fiscal Performance in Q1', summary: 'Press release' },
    { title: 'Government Securities Auction Results', summary: 'Announcement' },
    { title: 'Monthly Economic Review', summary: 'Report' },
    { title: 'New Fiscal Responsibility Framework Launched', summary: 'News' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'National Treasury Command', body: 'Sovereign fiscal posture · Single Account · Daily statement' },
    { title: 'Central Bank Operations', body: 'GovPay · CBDC · Settlement · FX reserves · Public debt' },
    { title: 'Tax & Revenue Intelligence', body: 'Tax · Customs · Taxpayer registry · e-Invoicing · Risk-based audit' },
    { title: 'National Procurement Grid', body: 'Tenders · Contracts · Vendors · Milestone escrow' },
    { title: 'Public Expenditure Control', body: 'Appropriation ledger · Funding chains · Cross-ministry allocation' },
    { title: 'Economic Intelligence Center', body: 'Macro stability · 25y forecast · Audit trail · Anti-fraud' },
  ],
  shortcuts: [
    { title: 'Treasury Command', subtitle: 'Fiscal posture', to: '/gov/treasury' },
    { title: 'Central Bank', subtitle: 'Settlement and reserves', to: '/gov/treasury' },
    { title: 'Tax & Revenue', subtitle: 'Collection and audit', to: '/gov/treasury' },
    { title: 'Procurement Grid', subtitle: 'Tenders and contracts', to: '/gov/treasury' },
    { title: 'Expenditure Control', subtitle: 'Appropriation ledger', to: '/gov/treasury' },
    { title: 'Economic Intelligence', subtitle: 'Forecasts', to: '/gov/treasury' },
    { title: 'Taxpayer Portal', subtitle: 'Filings and receipts', to: '/gov/treasury' },
    { title: 'Public Budget', subtitle: 'Open budget', to: '/gov/treasury' },
  ],
  footerSections: [
    {
      heading: 'About',
      items: [
        { label: 'Our Mandate', to: 'about' },
        { label: 'Leadership', to: 'about' },
        { label: 'Organization', to: 'about' },
      ],
    },
    {
      heading: 'Resources',
      items: [
        { label: 'Reports & Publications', to: '/public' },
        { label: 'Data Center', to: '/public' },
        { label: 'Legislation', to: '/public' },
      ],
    },
    {
      heading: 'Help',
      items: [
        { label: 'FAQ', to: '/wallet/assistant' },
        { label: 'Contact Us', to: '/wallet/inbox' },
        { label: 'Feedback', to: '/wallet/inbox' },
      ],
    },
  ],
  newsletter: { heading: 'Subscribe', body: 'Stay updated with our latest news and publications.' },
  legalLine: '© {year} Ministry of Treasury & Finance. All rights reserved.',
  legalLinks: [
    { label: 'Privacy Policy', to: '/legal/privacy' },
    { label: 'Terms of Use', to: '/legal/terms' },
    { label: 'Accessibility', to: '/legal/accessibility' },
  ],
};
