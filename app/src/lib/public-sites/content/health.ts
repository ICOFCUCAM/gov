// Reference content for the Ministry of Health public site (/health).
// Shipped with the platform; the nation's own content replaces it field by field.
// News and figures are samples until the institution publishes its own; the
// health alert is live ({live.healthAlert}, from the health-operations engine).

import type { SiteContent } from '../types';

export const health: SiteContent = {
  id: 'health',
  institution: {
    name: 'Ministry of Health',
    tagline: 'For a Healthier Nation',
    role: 'Ministry',
    crest: '⚕',
    about: 'Building a healthier nation through accessible, affordable and quality healthcare for all.',
    emergencyButton: { label: 'Emergency', icon: '☎' },
  },
  nav: [
    { label: 'Home', to: 'home' },
    { label: 'Health Topics', to: 'programmes' },
    { label: 'Services', to: '/health/laboratory' },
    { label: 'Find Facilities', to: 'contact' },
    { label: 'Programs', to: 'programmes' },
    { label: 'News & Alerts', to: 'news' },
    { label: 'About Us', to: 'about' },
  ],
  hero: {
    headline: ['Healthy People,', 'Stronger Nation'],
    subhead: 'Working together for a healthier and happier tomorrow.',
    primaryCta: { label: 'Book Appointment', icon: '🗓', to: '/wallet/permits/new' },
    secondaryCta: { label: 'Find Health Facility', icon: '📍', to: 'contact' },
    sideNote: {
      icon: '♥',
      title: 'Good health begins with small steps',
      body: 'Learn how you and your family can stay healthy.',
      cta: 'Learn More',
      to: 'programmes',
    },
  },
  alert: { label: 'HEALTH ALERT', text: '{live.healthAlert}' },
  quickServices: [
    { title: 'Book Appointment', subtitle: 'Hospital or clinic', color: '#1f5fad', icon: '＋', to: '/wallet/permits/new' },
    { title: 'Consult a Doctor', subtitle: 'Telemedicine', color: '#7c5cff', icon: '＋', to: '/wallet/services' },
    { title: 'Vaccination', subtitle: 'Schedule & info', color: '#0f9d6b', icon: '＋', to: '/wallet/records' },
    { title: 'Find Health Facility', subtitle: 'Hospitals, labs, more', color: '#e08a2b', icon: '＋', to: 'contact' },
    { title: 'Health Records', subtitle: 'View your records', color: '#1f5fad', icon: '＋', to: '/wallet/records' },
    { title: 'Health Programs', subtitle: 'Explore initiatives', color: '#d62b67', icon: '＋', to: 'programmes' },
  ],
  featured: [
    {
      kicker: 'National Vaccination Campaign',
      title: 'Vaccines protect you and your family',
      body: 'Stay up to date with routine vaccines. Safe. Effective. Free.',
      cta: 'Check Your Vaccines',
      tone: 'primary',
      to: '/wallet/records',
    },
    {
      kicker: 'Surveillance',
      title: 'Disease Surveillance Update',
      body: 'New, active and recovered cases reported through the national surveillance network.',
      cta: 'View Full Report',
      tone: 'subtle',
      to: '/public',
    },
    {
      kicker: 'Seasonal Advisory',
      title: 'Heat Advisory',
      body: 'High temperatures expected in multiple regions. Stay hydrated. Avoid direct sun exposure. Check more tips.',
      cta: 'Read More',
      tone: 'amber',
      to: 'news',
    },
  ],
  statistics: [
    { value: '145M+', label: 'Population Covered', sub: 'Across the country' },
    { value: '72.6', label: 'Life Expectancy', sub: 'Years' },
    { value: '103', label: 'Maternal Mortality', sub: 'Per 100,000 live births' },
    { value: '18', label: 'Under-5 Mortality', sub: 'Per 1,000 live births' },
    { value: '92%', label: 'Immunization Coverage', sub: 'Full immunization' },
    { value: '2,356', label: 'Health Facilities', sub: 'Across the country' },
    { value: '231K+', label: 'Health Workforce', sub: 'Doctors, nurses & more' },
  ],
  statisticsSource: 'sample',
  news: [
    { title: 'National Nutrition Month', summary: 'Join us in promoting healthy eating habits for all.' },
    { title: 'New Telemedicine Services', summary: 'Now available in rural districts.' },
    { title: 'World Hypertension Day', summary: 'Know your numbers and keep your heart healthy.' },
  ],
  newsSource: 'sample',
  initiatives: [
    { title: 'Mental Health Support', body: 'Resources and helplines for your well-being.' },
    { title: 'Mother & Child Health', body: 'Care and support for a healthy start in life.' },
    { title: 'Non-Communicable Diseases', body: 'Prevention and control of NCDs for a healthier future.' },
  ],
  locator: {
    title: 'Find Health Facilities Near You',
    placeholder: 'Enter your location',
    tabs: ['Hospitals', 'Clinics', 'Pharmacies', 'Labs', 'More'],
    pinLabel: 'H',
    pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]],
  },
  shortcuts: [
    { title: 'Publications & Reports', subtitle: 'Download health reports and publications.', to: '/public' },
    { title: 'Health Education', subtitle: 'Learn about health conditions, treatments and more.', to: 'programmes' },
    { title: 'Media Center', subtitle: 'Press releases, media kits and resources.', to: 'news' },
    { title: '{ai:AI Health Assistant|Health Assistant}', subtitle: 'Ask questions. Get trusted health information.', to: '/wallet/assistant' },
  ],
  footerSections: [
    {
      heading: 'Explore',
      items: [
        { label: 'Health Topics', to: 'programmes' },
        { label: 'Services', to: '/health/laboratory' },
        { label: 'Programs', to: 'programmes' },
        { label: 'Data & Statistics', to: 'statistics' },
        { label: 'News & Alerts', to: 'news' },
      ],
    },
    {
      heading: 'Resources',
      items: [
        { label: 'Publications', to: '/public' },
        { label: 'Forms & Downloads', to: '/wallet/services' },
        { label: 'Media Center', to: 'news' },
        { label: 'FAQs', to: '/wallet/assistant' },
        { label: 'Contact Us', to: '/wallet/inbox' },
      ],
    },
    {
      heading: 'About Us',
      items: [
        { label: 'Ministry Overview', to: 'about' },
        { label: 'Leadership', to: 'about' },
        { label: 'Careers', to: 'about' },
        { label: 'Policies', to: '/public' },
        { label: 'Transparency', to: '/public' },
      ],
    },
  ],
  newsletter: { heading: 'Subscribe to our newsletter', body: 'Get the latest updates and health tips.' },
  legalLine: '© {year} Ministry of Health. All rights reserved.',
  legalLinks: [
    { label: 'Privacy Policy', to: '/legal/privacy' },
    { label: 'Terms of Use', to: '/legal/terms' },
    { label: 'Accessibility', to: '/legal/accessibility' },
    { label: 'Sitemap', to: '/sitemap' },
  ],
};
