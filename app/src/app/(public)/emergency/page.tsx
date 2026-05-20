// Public — Emergency Response homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Emergency Response — Official Portal' };

const THEME = {
  ink: '#1a0f0f', inkSoft: '#2a1a1a', primary: '#c1252f', accent: '#e08a2b',
  surface: '#fdf6f6', surfaceMute: '#fae4e4', line: '#f3cccc',
  emergencyA: '#c1252f', emergencyB: '#7a1518',
};

export default function PublicEmergencyPage() {
  return (
    <PublicSiteShell
      theme={THEME}
      institution={{ name: 'Emergency Management & National Resilience', tagline: 'Salus populi suprema lex — the welfare of the people is supreme law', role: 'Agency', href: '/emergency', crest: '◬',
        emergencyButton: { label: 'Emergency 112', icon: '☎' } }}
      nav={[
        { label: 'Home', href: '/emergency', active: true },
        { label: 'Alerts', href: '/emergency' },
        { label: 'Prepare', href: '/emergency' },
        { label: 'Shelters', href: '/emergency' },
        { label: 'Programs', href: '/emergency' },
        { label: 'News', href: '/emergency' },
        { label: 'About', href: '/emergency' },
      ]}
      hero={{
        headline: <><span style={{ color: THEME.ink }}>Prepared Nation,</span><br /><span style={{ color: THEME.primary }}>Protected People</span></>,
        subhead: 'Risk reduction, rapid response, humanitarian continuity.',
        primaryCta: { label: 'Sign Up for Alerts', icon: '⚠' },
        secondaryCta: { label: 'Find a Shelter', icon: '📍' },
        illustration: <HeroIllustration kind="siren" primary={THEME.primary} accent={THEME.accent} aria="Emergency siren" />,
        sideNote: { icon: '☎', title: 'Emergency: 112', body: 'Fire, medical, search & rescue — dial 112 nationally.', cta: 'Other helplines' },
      }}
      alert={{ label: 'NATIONAL ADVISORY', text: 'Monsoon season prepared posture engaged. Citizens in flood-prone districts: review evacuation plans now.' }}
      quickServices={[
        { title: 'Sign Up — Alerts', subtitle: 'SMS / app / email', color: THEME.primary, icon: '⚠' },
        { title: 'Find a Shelter', subtitle: 'By district', color: '#7c4d8a', icon: '⌂' },
        { title: 'Preparedness Kit', subtitle: 'What to assemble', color: '#0f7a5f', icon: '✚' },
        { title: 'Volunteer', subtitle: 'Civic responder corps', color: '#3a82d0', icon: '✦' },
        { title: 'Report a Hazard', subtitle: 'Public-safety risk', color: '#b81c3f', icon: '!' },
        { title: 'Humanitarian Aid', subtitle: 'Relief distribution', color: '#e08a2b', icon: '✦' },
      ]}
      featured={[
        { kicker: 'CONSTITUTIONAL CONTRACT', title: 'Civilian Priority', body: 'Civilian welfare is non-negotiable. Evacuation never discriminatory. Authoritarian extension constitutionally void.', cta: 'Read safeguards', tone: 'primary' },
        { kicker: 'NEOC LIVE', title: 'National Operations Centre', body: 'Real-time multi-hazard monitoring. 24/7 inter-ministry coordination.', cta: 'Live dashboard', tone: 'subtle' },
        { kicker: 'PREPARE', title: 'Resilience Programmes', body: 'Drills, training, and community-resilience grants in every district.', cta: 'Get involved', tone: 'amber' },
      ]}
      statistics={[
        { value: '24/7', label: 'NEOC posture', sub: 'National operations centre' },
        { value: '480', label: 'Shelters', sub: 'National network' },
        { value: '6.4 min', label: 'Median activation', sub: 'NEOC declaration' },
        { value: '12,000+', label: 'Trained responders', sub: 'Active roster' },
        { value: '78', label: 'Risks tracked', sub: 'National risk board' },
        { value: '92%', label: 'Reach (M)', sub: 'Cell broadcast' },
        { value: '0', label: 'Discriminatory evacuations', sub: 'Constitutional contract' },
      ]}
      news={[
        { title: 'Monsoon Readiness Drill', date: 'May 15, 2025', summary: 'National pre-positioning complete.' },
        { title: 'Coastal Surge Shelters Doubled', date: 'May 10, 2025', summary: 'New capacity in 22 districts.' },
        { title: 'Civic Responder Corps Recruitment', date: 'May 03, 2025', summary: 'Volunteers in every community.' },
      ]}
      initiatives={[
        { title: 'Community Resilience', body: 'Grants and training to build neighbourhood resilience.' },
        { title: 'Civic Responder Corps', body: 'Trained volunteers in every district.' },
        { title: 'Multi-Hazard Foresight', body: 'Long-horizon risk-board for 25-year planning.' },
      ]}
      locator={{ title: 'Shelters Near You', placeholder: 'Enter your postcode', tabs: ['Shelters', 'Stations', 'Aid Hubs', 'Volunteers'], pinLabel: '◬', pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]] }}
      shortcuts={[
        { title: 'Preparedness Library', subtitle: 'Family / community / industry' },
        { title: 'Volunteer Sign-up', subtitle: 'Civic responder corps' },
        { title: 'Open Risk Data', subtitle: 'National risk board' },
        { title: 'After-Action Reports', subtitle: 'Lessons learned' },
      ]}
      footerSections={[
        { heading: 'Services', items: ['Alerts', 'Shelters', 'Volunteer', 'Aid', 'Hazard Report'] },
        { heading: 'Resources', items: ['Preparedness', 'Risk Data', 'Open Data', 'AAR Library', 'Contact'] },
        { heading: 'About', items: ['Mandate', 'NEOC', 'Careers', 'Audit', 'Transparency'] },
      ]}
      newsletter={{ heading: 'Emergency updates', body: 'Advisories, drills and seasonal posture.' }}
      legalLine="© 2025 Emergency Management & National Resilience."
      legalLinks={['Privacy', 'Terms', 'Accessibility', 'Sitemap']} />
  );
}
