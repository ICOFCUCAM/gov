// Public — Senate (Upper House) homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Senate — Upper House of the Legislature' };

const THEME = {
  ink: '#1a1326', inkSoft: '#2a2042', primary: '#7a4d8a', accent: '#c9a24a',
  surface: '#faf6f5', surfaceMute: '#f0e6e9', line: '#dccfd5',
  emergencyA: '#7a4d8a', emergencyB: '#5a3768',
};

export default function PublicSenatePage() {
  return (
    <PublicSiteShell
      theme={THEME}
      institution={{ name: 'Senate — Upper House', tagline: 'Deliberative chamber of the legislature', role: 'Chamber', href: '/senate', crest: '◈',
        emergencyButton: null }}
      nav={[
        { label: 'Home', href: '/senate', active: true },
        { label: 'Senators', href: '/senate' },
        { label: 'Sessions', href: '/senate' },
        { label: 'Bills & Treaties', href: '/senate' },
        { label: 'Committees', href: '/senate' },
        { label: 'Records', href: '/senate' },
        { label: 'About', href: '/senate' },
      ]}
      hero={{
        headline: <><span style={{ color: THEME.ink }}>Deliberation,</span><br /><span style={{ color: THEME.primary }}>Long Time</span></>,
        subhead: 'A second chamber of measured review — the long horizon of the polity.',
        primaryCta: { label: 'Watch Live', icon: '▶' },
        secondaryCta: { label: 'Find Your Senator', icon: '⌕' },
        illustration: <HeroIllustration kind="parliament" primary={THEME.primary} accent={THEME.accent} aria="Senate chamber" />,
        sideNote: { icon: '☷', title: 'Open records', body: 'Every plenary debate transcribed within 24 hours. Treaty ratifications published immediately.', cta: 'Browse records' },
      }}
      alert={{ label: 'SESSION NOTICE', text: 'Plenary Session #2025-018 — Treaty ratification debate. Public gallery open; livestream available.' }}
      quickServices={[
        { title: 'Find Your Senator', subtitle: 'By region', color: THEME.primary, icon: '⌕' },
        { title: 'Watch Live', subtitle: 'Plenary & committees', color: '#7c4d8a', icon: '▶' },
        { title: 'Bill Tracker', subtitle: 'All readings', color: '#3a82d0', icon: '✎' },
        { title: 'Treaty Ratifications', subtitle: 'Active & past', color: '#b48a3d', icon: '◯' },
        { title: 'Public Petitions', subtitle: 'Submit & track', color: '#0f7a5f', icon: '✚' },
        { title: 'Hansard / Records', subtitle: 'Full transcripts', color: '#e08a2b', icon: '☷' },
      ]}
      featured={[
        { kicker: 'CONSTITUTIONAL ROLE', title: 'Second Reading Chamber', body: 'The Senate reviews every bill from the Assembly with a long-horizon lens. Two-thirds may delay; never block in perpetuity.', cta: 'How bills move', tone: 'primary' },
        { kicker: 'TREATY POWER', title: 'Treaty Ratification', body: 'International treaties require Senate concurrence. Every ratification debated openly; full text published.', cta: 'Treaty register', tone: 'subtle' },
        { kicker: 'OVERSIGHT', title: 'Committee Scrutiny', body: 'Seven standing committees scrutinise the executive. Every report public; subpoena powers used sparingly.', cta: 'See committees', tone: 'amber' },
      ]}
      statistics={[
        { value: '84', label: 'Senators', sub: 'Two per region' },
        { value: '6 years', label: 'Term length', sub: 'Staggered thirds' },
        { value: '7', label: 'Standing committees', sub: 'Cross-cutting' },
        { value: '128', label: 'Sessions / year', sub: 'Plenary + committee' },
        { value: '100%', label: 'Hansard publication', sub: 'Within 24 hours' },
        { value: '0', label: 'Closed sessions', sub: 'Without published rationale' },
        { value: '0', label: 'Censorship orders', sub: 'Constitutional contract' },
      ]}
      news={[
        { title: 'Treaty Ratification Debate', date: 'May 16, 2025', summary: 'Climate cooperation framework.' },
        { title: 'Committee Report on Pensions', date: 'May 10, 2025', summary: 'Inter-generational solvency review.' },
        { title: 'New Code of Conduct Approved', date: 'May 03, 2025', summary: 'Strengthened ethics rules.' },
      ]}
      initiatives={[
        { title: 'Open Hansard Project', body: 'Every plenary transcribed within 24h.' },
        { title: 'Citizen Petitions', body: 'Direct citizen access to legislative agenda.' },
        { title: 'Inter-Chamber Coordination', body: 'Conference committees with the Assembly.' },
      ]}
      locator={{ title: 'Senators by Region', placeholder: 'Enter your region', tabs: ['Senators', 'Committees', 'Petitions', 'Sessions'], pinLabel: '◈', pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]] }}
      shortcuts={[
        { title: 'Bill Library', subtitle: 'All readings' },
        { title: 'Hansard Archive', subtitle: 'Full transcripts' },
        { title: 'Open Vote Data', subtitle: 'Roll-call records' },
        { title: 'Constitutional Library', subtitle: 'Full text' },
      ]}
      footerSections={[
        { heading: 'Senators & Sessions', items: ['Find Senator', 'Watch Live', 'Hansard', 'Bills', 'Treaties'] },
        { heading: 'Resources', items: ['Records', 'Open Data', 'Petitions', 'Publications', 'Contact'] },
        { heading: 'About', items: ['Role', 'Committees', 'Code of Conduct', 'Audit', 'Transparency'] },
      ]}
      newsletter={{ heading: 'Senate updates', body: 'Sessions, votes, and report releases.' }}
      legalLine="© 2025 Senate — Upper House of the Legislature."
      legalLinks={['Privacy', 'Terms', 'Accessibility', 'Sitemap']} />
  );
}
