// Public — Ministry of Justice homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Justice — Official Portal' };

const THEME = {
  ink: '#1b1a26', inkSoft: '#2b2a40', primary: '#7a1f2b', accent: '#b48a3d',
  surface: '#faf7f0', surfaceMute: '#f0ead8', line: '#e0d6c0',
  emergencyA: '#c1252f', emergencyB: '#7a1f2b',
};

export default function PublicJusticePage() {
  return (
    <PublicSiteShell
      theme={THEME}
      institution={{ name: 'Ministry of Justice & Constitutional Affairs', tagline: 'Equal protection under the law', role: 'Ministry', href: '/justice', crest: '⚖',
        emergencyButton: { label: 'Legal Aid', icon: '⚖' } }}
      nav={[
        { label: 'Home', href: '/justice', active: true },
        { label: 'Services', href: '/justice' },
        { label: 'Courts', href: '/justice' },
        { label: 'File a Case', href: '/justice' },
        { label: 'Programs', href: '/justice' },
        { label: 'Publications', href: '/justice' },
        { label: 'About', href: '/justice' },
      ]}
      hero={{
        headline: <><span style={{ color: THEME.ink }}>Equal Justice,</span><br /><span style={{ color: THEME.primary }}>Under Law</span></>,
        subhead: 'Independent courts, transparent records, accessible justice for every citizen.',
        primaryCta: { label: 'File a Case', icon: '⚖' },
        secondaryCta: { label: 'Find a Court', icon: '📍' },
        illustration: <HeroIllustration kind="scales" primary={THEME.primary} accent={THEME.accent} aria="Scales of justice" />,
        sideNote: { icon: '✚', title: 'Free legal aid', body: 'Every citizen has a constitutional right to counsel. Apply for legal aid.', cta: 'Apply now' },
      }}
      alert={{ label: 'CIVIC NOTICE', text: 'Bar examination sittings open for registration. Apply through the citizen portal before June 1.' }}
      quickServices={[
        { title: 'File a Case', subtitle: 'Civil or criminal', color: THEME.primary, icon: '⚖' },
        { title: 'Court Documents', subtitle: 'Request certified copies', color: '#5a4030', icon: '☷' },
        { title: 'Legal Aid', subtitle: 'Free counsel for eligible', color: '#0f7a5f', icon: '✚' },
        { title: 'Notary Services', subtitle: 'Sworn statements', color: '#b48a3d', icon: '✎' },
        { title: 'Prison Visiting', subtitle: 'Schedule a visit', color: '#7c4d8a', icon: '⏚' },
        { title: 'Mediation', subtitle: 'Alternative resolution', color: '#3a82d0', icon: '◯' },
      ]}
      featured={[
        { kicker: 'TRANSPARENCY', title: 'Open Court Records', body: 'Every public hearing is searchable. Constitutional decisions published within 24 hours of release.', cta: 'Search records', tone: 'primary' },
        { kicker: 'CIVIL LIBERTIES', title: 'Know Your Rights', body: 'Detention rights, fair-trial guarantees, equal protection clauses — explained for every citizen.', cta: 'Read the guide', tone: 'subtle' },
        { kicker: 'ACCESS', title: 'Legal Aid Network', body: '8,000+ pro-bono advocates available nationally. Income-tested eligibility, no application fee.', cta: 'Check eligibility', tone: 'amber' },
      ]}
      statistics={[
        { value: '420', label: 'Active courts', sub: 'Across the country' },
        { value: '76 days', label: 'Median case duration', sub: 'Civil cases' },
        { value: '14,800', label: 'Pro-bono advocates', sub: 'Legal aid network' },
        { value: '92%', label: 'Case access', sub: 'Citizens within 50km of a court' },
        { value: '320', label: 'Constitutional decisions', sub: 'Published YTD' },
        { value: '99.8%', label: 'Records integrity', sub: 'Audit-vault verified' },
        { value: '0', label: 'Sealed without warrant', sub: 'Constitutional contract' },
      ]}
      news={[
        { title: 'Constitutional Decision №412 Published', date: 'May 16, 2025', summary: 'Landmark privacy ruling.' },
        { title: 'Legal Aid Coverage Expanded', date: 'May 11, 2025', summary: 'Now covering family law disputes.' },
        { title: 'Bar Examination Registration Open', date: 'May 05, 2025', summary: 'July sittings nationwide.' },
      ]}
      initiatives={[
        { title: 'Open Records Project', body: 'Every public court record indexed and searchable.' },
        { title: 'Pro-Bono Network', body: 'Free legal counsel for income-tested citizens.' },
        { title: 'Restorative Justice', body: 'Mediation-led alternatives to incarceration.' },
      ]}
      locator={{ title: 'Find a Court', placeholder: 'Enter your district', tabs: ['Courts', 'Tribunals', 'Legal Aid', 'Mediators'], pinLabel: 'J', pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]] }}
      shortcuts={[
        { title: 'Constitutional Library', subtitle: 'Full text + commentary' },
        { title: 'Bar Council', subtitle: 'Practitioner directory' },
        { title: 'Judicial Conduct', subtitle: 'Complaints & ethics' },
        { title: 'Open Justice Data', subtitle: 'Case statistics' },
      ]}
      footerSections={[
        { heading: 'Services', items: ['File a Case', 'Legal Aid', 'Court Documents', 'Notary', 'Mediation'] },
        { heading: 'Resources', items: ['Constitution', 'Case Law', 'Forms & Filings', 'Publications', 'Contact'] },
        { heading: 'About', items: ['Independence', 'Judicial Council', 'Careers', 'Audit & Oversight', 'Transparency'] },
      ]}
      newsletter={{ heading: 'Justice updates', body: 'Constitutional decisions and reform notices.' }}
      legalLine="© 2025 Ministry of Justice & Constitutional Affairs."
      legalLinks={['Privacy Policy', 'Terms of Use', 'Accessibility', 'Sitemap']} />
  );
}
