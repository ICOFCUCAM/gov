// Public — Judicial Branch (Supreme & Constitutional Courts) homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Judicial Branch — Sovereign Courts' };

const THEME = {
  ink: '#1a1820', inkSoft: '#252330', primary: '#5a3768', accent: '#c9a24a',
  surface: '#faf8f5', surfaceMute: '#f1ecdd', line: '#e0d6c0',
  emergencyA: '#5a3768', emergencyB: '#3e2548',
};

export default function PublicJudiciaryPage() {
  return (
    <PublicSiteShell
      theme={THEME}
      institution={{ name: 'Judicial Branch', tagline: 'Justice without fear or favour', role: 'Branch', href: '/judiciary', crest: '⚖',
        emergencyButton: null }}
      nav={[
        { label: 'Home', href: '/judiciary', active: true },
        { label: 'Courts', href: '/judiciary' },
        { label: 'Justices', href: '/judiciary' },
        { label: 'Cases & Decisions', href: '/judiciary' },
        { label: 'Constitution', href: '/judiciary' },
        { label: 'News', href: '/judiciary' },
        { label: 'About', href: '/judiciary' },
      ]}
      hero={{
        headline: <><span style={{ color: THEME.ink }}>Independent Courts,</span><br /><span style={{ color: THEME.primary }}>Equal Protection</span></>,
        subhead: 'Constitutional review, fair trial, public reasoning — for every citizen.',
        primaryCta: { label: 'Search Decisions', icon: '⌕' },
        secondaryCta: { label: 'Find a Court', icon: '📍' },
        illustration: <HeroIllustration kind="gavel" primary={THEME.primary} accent={THEME.accent} aria="Gavel of the courts" />,
        sideNote: { icon: '☷', title: 'Open record', body: 'Every decision published in full reasoning. Every appeal pathway open.', cta: 'Read latest' },
      }}
      alert={{ label: 'JUDICIAL NOTICE', text: 'Constitutional Court — Special hearings on privacy & data sovereignty open for public observation.' }}
      quickServices={[
        { title: 'Search Decisions', subtitle: 'Full-text + cases', color: THEME.primary, icon: '⌕' },
        { title: 'File an Appeal', subtitle: 'From lower court', color: '#0f7a5f', icon: '⚖' },
        { title: 'Court Calendar', subtitle: 'Hearings & sittings', color: '#3a82d0', icon: '☷' },
        { title: 'Find a Court', subtitle: 'By district', color: '#7c4d8a', icon: '📍' },
        { title: 'Constitutional Library', subtitle: 'Full text', color: '#b48a3d', icon: '◯' },
        { title: 'Judicial Conduct', subtitle: 'File a complaint', color: '#e08a2b', icon: '✚' },
      ]}
      featured={[
        { kicker: 'CONSTITUTIONAL INDEPENDENCE', title: 'Separated, Lifetime, Reviewed', body: 'Justices appointed by Senate with two-thirds; lifetime tenure subject to misconduct review by an independent panel.', cta: 'Read appointment process', tone: 'primary' },
        { kicker: 'OPEN REASONING', title: 'Every Decision Public', body: 'Constitutional Court rulings published in 24h. Lower-court decisions within seven days.', cta: 'Browse rulings', tone: 'subtle' },
        { kicker: 'FAIR TRIAL', title: 'Counsel & Translation', body: 'Every defendant has counsel, translation, and a public hearing. Closed sessions require published rationale.', cta: 'Read rights', tone: 'amber' },
      ]}
      statistics={[
        { value: '11', label: 'Constitutional Court justices', sub: 'Two-thirds Senate appointment' },
        { value: '128', label: 'Supreme Court justices', sub: 'Across divisions' },
        { value: '420', label: 'Lower courts', sub: 'National network' },
        { value: '76 days', label: 'Median civil case', sub: 'Trial duration' },
        { value: '14 days', label: 'Median constitutional', sub: 'Decision publication' },
        { value: '92%', label: 'Court access', sub: 'Citizens within 50 km' },
        { value: '0', label: 'Sealed without rationale', sub: 'Constitutional contract' },
      ]}
      news={[
        { title: 'Privacy Doctrine Affirmed', date: 'May 16, 2025', summary: 'Constitutional Court decision №412.' },
        { title: 'New Supreme Justice Confirmed', date: 'May 10, 2025', summary: 'Senate two-thirds concurrence.' },
        { title: 'Judicial Conduct Panel Convened', date: 'May 03, 2025', summary: 'Independent review of complaints.' },
      ]}
      initiatives={[
        { title: 'Open Judgement Project', body: 'Every decision searchable, in plain language.' },
        { title: 'Pro-Bono Network', body: 'Free counsel for income-tested citizens.' },
        { title: 'Court Modernisation', body: 'Digital filings, online hearings where appropriate.' },
      ]}
      locator={{ title: 'Find a Court', placeholder: 'Enter your district', tabs: ['Constitutional', 'Supreme', 'Lower', 'Tribunals'], pinLabel: '⚖', pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]] }}
      shortcuts={[
        { title: 'Constitutional Library', subtitle: 'Full-text + commentary' },
        { title: 'Case Library', subtitle: 'All published decisions' },
        { title: 'Court Rules', subtitle: 'Procedure & filing' },
        { title: 'Civic Education', subtitle: 'Rights & guarantees' },
      ]}
      footerSections={[
        { heading: 'Courts & Decisions', items: ['Constitutional Court', 'Supreme Court', 'Lower Courts', 'Tribunals', 'Calendar'] },
        { heading: 'Resources', items: ['Constitution', 'Case Library', 'Court Rules', 'Forms', 'Contact'] },
        { heading: 'About', items: ['Independence', 'Appointments', 'Conduct', 'Audit', 'Transparency'] },
      ]}
      newsletter={{ heading: 'Judicial updates', body: 'Decisions, calendars and constitutional readings.' }}
      legalLine="© 2025 Judicial Branch. Independent of the political branches."
      legalLinks={['Privacy', 'Terms', 'Accessibility', 'Sitemap']} />
  );
}
