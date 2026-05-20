// Public — Ministry of Agriculture homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Agriculture & Food Security — Official Portal' };

const THEME = {
  ink: '#2a1d0e', inkSoft: '#3d2a14', primary: '#7a5a18', accent: '#d9b76a',
  surface: '#fbf8ef', surfaceMute: '#f3eccf', line: '#e0d6b3',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default function PublicAgriculturePage() {
  return (
    <PublicSiteShell
      theme={THEME}
      institution={{ name: 'Ministry of Agriculture & Food Security', tagline: 'Food sovereignty, smallholder dignity', role: 'Ministry', href: '/agriculture', crest: '✻',
        emergencyButton: { label: 'Pest Report', icon: '⚠' } }}
      nav={[
        { label: 'Home', href: '/agriculture', active: true },
        { label: 'Farmers', href: '/agriculture' },
        { label: 'Programmes', href: '/agriculture' },
        { label: 'Permits', href: '/agriculture' },
        { label: 'Pests & Climate', href: '/agriculture' },
        { label: 'News', href: '/agriculture' },
        { label: 'About', href: '/agriculture' },
      ]}
      hero={{
        headline: <><span style={{ color: THEME.ink }}>From Field</span><br /><span style={{ color: THEME.primary }}>To Table</span></>,
        subhead: 'Smallholder protection, food security, cooperative autonomy.',
        primaryCta: { label: 'Subsidy Application', icon: '✚' },
        secondaryCta: { label: 'Find Programmes', icon: '⌕' },
        illustration: <HeroIllustration kind="wheat" primary={THEME.primary} accent={THEME.accent} aria="Wheat stalks" />,
        sideNote: { icon: '✤', title: 'Cooperative grants', body: 'Form-up grants, climate-resilient varietals, irrigation support — smallholder-priority.', cta: 'Apply' },
      }}
      alert={{ label: 'CLIMATE ADVISORY', text: 'Drought-watch issued for the northern district. Reservoirs at 62% — water-rationing guidance available.' }}
      quickServices={[
        { title: 'Farm Registration', subtitle: 'Get your farm registered', color: THEME.primary, icon: '✻' },
        { title: 'Subsidies', subtitle: 'Apply or check status', color: '#0f7a5f', icon: '✚' },
        { title: 'Irrigation Request', subtitle: 'Water-rights application', color: '#3a82d0', icon: '⌭' },
        { title: 'Pest Alerts', subtitle: 'Report or check', color: '#b81c3f', icon: '⚠' },
        { title: 'Extension Officer', subtitle: 'Get expert advice', color: '#7c4d8a', icon: '✦' },
        { title: 'Cooperative Grants', subtitle: 'Form a co-op', color: '#e08a2b', icon: '⬡' },
      ]}
      featured={[
        { kicker: 'SMALLHOLDER FIRST', title: 'Land Tenure Doctrine', body: 'Smallholders are the constitutional unit of agriculture. Forced consolidation is void.', cta: 'Read doctrine', tone: 'primary' },
        { kicker: 'FOOD SECURITY', title: 'Strategic Reserve', body: '90 days of national cover — wheat, rice, pulses. Drawdown requires Cabinet authorisation.', cta: 'View status', tone: 'subtle' },
        { kicker: 'SUPPORT', title: 'Climate-resilient Varietals', body: 'Free seed for drought-tolerant maize, rice, sorghum. Distribution begins this season.', cta: 'Find your district', tone: 'amber' },
      ]}
      statistics={[
        { value: '4.2 M', label: 'Registered farmers', sub: 'National total' },
        { value: '78', label: 'Food security index', sub: 'National composite' },
        { value: '6.8', label: 'Co-op membership (M)', sub: 'Active members' },
        { value: '92 d', label: 'Strategic reserve', sub: 'Days of cover' },
        { value: '38%', label: 'Irrigation coverage', sub: 'National average' },
        { value: '24%', label: 'Women in agri', sub: 'Workforce share' },
        { value: '0', label: 'Forced consolidations', sub: 'Constitutional contract' },
      ]}
      news={[
        { title: 'National Subsidy Round Opens', date: 'May 15, 2025', summary: 'Smallholder-priority seed & fertilizer.' },
        { title: 'Coastal Salinity Programme Launched', date: 'May 11, 2025', summary: 'Saline-tolerant rice trials.' },
        { title: 'Co-op Formation Grants Doubled', date: 'May 04, 2025', summary: 'Now covering 12 categories.' },
      ]}
      initiatives={[
        { title: 'Smallholder Seed Programme', body: 'Free climate-resilient seed for smallholders.' },
        { title: 'Cooperative Formation Grants', body: 'Capital and training to form farming co-ops.' },
        { title: 'Youth-in-Agriculture', body: 'Stipends and training for next-generation farmers.' },
      ]}
      locator={{ title: 'Find Extension Office', placeholder: 'Enter your district', tabs: ['Extension', 'Co-ops', 'Markets', 'Stores'], pinLabel: '✻', pinCoords: [[18, 35], [55, 25], [42, 62], [70, 50], [30, 78], [82, 65]] }}
      shortcuts={[
        { title: 'Crop Calendar', subtitle: 'Planting & harvest' },
        { title: 'Market Prices', subtitle: 'Daily quotes' },
        { title: 'Livestock Health', subtitle: 'Vet clinics' },
        { title: 'Climate Tools', subtitle: 'Drought outlook' },
      ]}
      footerSections={[
        { heading: 'Services', items: ['Subsidies', 'Permits', 'Irrigation', 'Extension', 'Cooperatives'] },
        { heading: 'Resources', items: ['Market Prices', 'Climate Data', 'Pest Library', 'Publications', 'Contact'] },
        { heading: 'About', items: ['Mandate', 'Programmes', 'Careers', 'Audit', 'Transparency'] },
      ]}
      newsletter={{ heading: 'Agricultural updates', body: 'Subsidy openings, alerts, and prices.' }}
      legalLine="© 2025 Ministry of Agriculture & Food Security."
      legalLinks={['Privacy', 'Terms', 'Accessibility', 'Sitemap']} />
  );
}
