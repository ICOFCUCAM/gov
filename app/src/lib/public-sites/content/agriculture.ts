// Reference content for the Ministry of Agriculture & Food Security public site (/agriculture).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own.

import type { SiteContent } from '../types';

export const agriculture: SiteContent = {
  id: 'agriculture',
  institution: {
    name: 'Ministry of Agriculture & Food Security',
    tagline: 'Food sovereignty, smallholder dignity',
    role: 'Ministry',
    crest: '✻',
    emergencyButton: { label: 'Pest Report', icon: '⚠' },
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'Farmers', to: 'services' },
    { label: 'Programmes', to: 'programmes' },
    { label: 'Permits', to: 'services' },
    { label: 'Pests & Climate', to: 'services' },
    { label: 'News', to: 'news' },
    { label: 'About', to: 'about' },
  ],
  hero: {
    headline: ['From Field', 'To Table'],
    subhead: 'Smallholder protection, food security, cooperative autonomy.',
    primaryCta: { label: 'Subsidy Application', icon: '✚', to: '/wallet/permits/new' },
    secondaryCta: { label: 'Find Programmes', icon: '⌕', to: 'programmes' },
    sideNote: {
      icon: '✤',
      title: 'Cooperative grants',
      body: 'Form-up grants, climate-resilient varietals, irrigation support — smallholder-priority.',
      cta: 'Apply',
      to: '/wallet/permits/new',
    },
  },
  alert: {
    label: 'CLIMATE ADVISORY',
    text: 'Drought-watch issued for the northern district. Reservoirs at 62% — water-rationing guidance available.',
  },
  quickServices: [
    {
      title: 'Farm Registration',
      subtitle: 'Get your farm registered',
      color: 'primary',
      icon: '✻',
      to: '/wallet/permits/new',
    },
    {
      title: 'Subsidies',
      subtitle: 'Apply or check status',
      color: '#0f7a5f',
      icon: '✚',
      to: '/wallet/permits/new',
    },
    {
      title: 'Irrigation Request',
      subtitle: 'Water-rights application',
      color: '#3a82d0',
      icon: '⌭',
      to: '/wallet/permits/new',
    },
    { title: 'Pest Alerts', subtitle: 'Report or check', color: '#b81c3f', icon: '⚠', to: '/wallet/services' },
    {
      title: 'Extension Officer',
      subtitle: 'Get expert advice',
      color: '#7c4d8a',
      icon: '✦',
      to: '/wallet/services',
    },
    {
      title: 'Cooperative Grants',
      subtitle: 'Form a co-op',
      color: '#e08a2b',
      icon: '⬡',
      to: '/wallet/permits/new',
    },
  ],
  featured: [
    {
      kicker: 'SMALLHOLDER FIRST',
      title: 'Land Tenure Doctrine',
      body: 'Smallholders are the constitutional unit of agriculture. Forced consolidation is void.',
      cta: 'Read doctrine',
      tone: 'primary',
      to: 'services',
    },
    {
      kicker: 'FOOD SECURITY',
      title: 'Strategic Reserve',
      body: '90 days of national cover — wheat, rice, pulses. Drawdown requires Cabinet authorisation.',
      cta: 'View status',
      tone: 'subtle',
      to: 'services',
    },
    {
      kicker: 'SUPPORT',
      title: 'Climate-resilient Varietals',
      body: 'Free seed for drought-tolerant maize, rice, sorghum. Distribution begins this season.',
      cta: 'Find your district',
      tone: 'amber',
      to: 'contact',
    },
  ],
  statistics: [
    { value: '4.2 M', label: 'Registered farmers', sub: 'National total' },
    { value: '78', label: 'Food security index', sub: 'National composite' },
    { value: '6.8', label: 'Co-op membership (M)', sub: 'Active members' },
    { value: '92 d', label: 'Strategic reserve', sub: 'Days of cover' },
    { value: '38%', label: 'Irrigation coverage', sub: 'National average' },
    { value: '24%', label: 'Women in agri', sub: 'Workforce share' },
    { value: '0', label: 'Forced consolidations', sub: 'Constitutional contract' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'National Subsidy Round Opens', summary: 'Smallholder-priority seed & fertilizer.' },
    { title: 'Coastal Salinity Programme Launched', summary: 'Saline-tolerant rice trials.' },
    { title: 'Co-op Formation Grants Doubled', summary: 'Now covering 12 categories.' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'Smallholder Seed Programme', body: 'Free climate-resilient seed for smallholders.' },
    { title: 'Cooperative Formation Grants', body: 'Capital and training to form farming co-ops.' },
    { title: 'Youth-in-Agriculture', body: 'Stipends and training for next-generation farmers.' },
  ],
  locator: {
    title: 'Find Extension Office',
    placeholder: 'Enter your district',
    tabs: ['Extension', 'Co-ops', 'Markets', 'Stores'],
    pinLabel: '✻',
    pinCoords: [[18, 35], [55, 25], [42, 62], [70, 50], [30, 78], [82, 65]],
  },
  shortcuts: [
    { title: 'Crop Calendar', subtitle: 'Planting & harvest', to: 'services' },
    { title: 'Market Prices', subtitle: 'Daily quotes', to: 'services' },
    { title: 'Livestock Health', subtitle: 'Vet clinics', to: '/noc' },
    { title: 'Climate Tools', subtitle: 'Drought outlook', to: 'services' },
  ],
  footerSections: [
    {
      heading: 'Services',
      items: [
        { label: 'Subsidies', to: '/wallet/permits/new' },
        { label: 'Permits', to: '/wallet/permits/new' },
        { label: 'Irrigation', to: 'services' },
        { label: 'Extension', to: 'services' },
        { label: 'Cooperatives', to: 'services' },
      ],
    },
    {
      heading: 'Resources',
      items: [
        { label: 'Market Prices', to: 'services' },
        { label: 'Climate Data', to: 'statistics' },
        { label: 'Pest Library', to: 'services' },
        { label: 'Publications', to: '/public' },
        { label: 'Contact', to: 'contact' },
      ],
    },
    {
      heading: 'About',
      items: [
        { label: 'Mandate', to: 'about' },
        { label: 'Programmes', to: 'programmes' },
        { label: 'Careers', to: 'about' },
        { label: 'Audit', to: '/public' },
        { label: 'Transparency', to: '/public' },
      ],
    },
  ],
  newsletter: { heading: 'Agricultural updates', body: 'Subsidy openings, alerts, and prices.' },
  legalLine: '© {year} Ministry of Agriculture & Food Security.',
  legalLinks: [
    { label: 'Privacy', to: '/legal/privacy' },
    { label: 'Terms', to: '/legal/terms' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
