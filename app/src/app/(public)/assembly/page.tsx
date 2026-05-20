// Public — National Assembly (Lower House) homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'National Assembly — Lower House of the Legislature' };

const THEME = {
  ink: '#0e1e26', inkSoft: '#163040', primary: '#0f6e6a', accent: '#1f9d63',
  surface: '#f4f9f7', surfaceMute: '#e3f0eb', line: '#cfe3da',
  emergencyA: '#0f6e6a', emergencyB: '#0a4f4c',
};

export default function PublicAssemblyPage() {
  return (
    <PublicSiteShell
      theme={THEME}
      institution={{ name: 'National Assembly — Lower House', tagline: 'Voice of the people, makers of law', role: 'Chamber', href: '/assembly', crest: '⌬',
        emergencyButton: null }}
      nav={[
        { label: 'Home', href: '/assembly', active: true },
        { label: 'Members', href: '/assembly' },
        { label: 'Sessions', href: '/assembly' },
        { label: 'Bills', href: '/assembly' },
        { label: 'Committees', href: '/assembly' },
        { label: 'Records', href: '/assembly' },
        { label: 'About', href: '/assembly' },
      ]}
      hero={{
        headline: <><span style={{ color: THEME.ink }}>Lawmaking,</span><br /><span style={{ color: THEME.primary }}>By the People</span></>,
        subhead: 'The first chamber — closest to the citizen, fastest to respond.',
        primaryCta: { label: 'Watch Live', icon: '▶' },
        secondaryCta: { label: 'Find Your Member', icon: '⌕' },
        illustration: <HeroIllustration kind="parliament" primary={THEME.primary} accent={THEME.accent} aria="Assembly chamber" />,
        sideNote: { icon: '✦', title: 'Citizen petitions', body: '5,000 signatures trigger an Assembly debate. Submit, track, and watch your petition heard.', cta: 'Start petition' },
      }}
      alert={{ label: 'SESSION NOTICE', text: 'Plenary Session #2025-198 — Budget Second Reading. Public gallery open; livestream available.' }}
      quickServices={[
        { title: 'Find Your Member', subtitle: 'By constituency', color: THEME.primary, icon: '⌕' },
        { title: 'Watch Live', subtitle: 'Plenary & committees', color: '#7c4d8a', icon: '▶' },
        { title: 'Bill Tracker', subtitle: 'All readings', color: '#3a82d0', icon: '✎' },
        { title: 'Budget Debate', subtitle: 'Annual appropriation', color: '#b48a3d', icon: '✦' },
        { title: 'Public Petitions', subtitle: 'Submit & sign', color: '#0f7a5f', icon: '✚' },
        { title: 'Hansard / Records', subtitle: 'Full transcripts', color: '#e08a2b', icon: '☷' },
      ]}
      featured={[
        { kicker: 'CONSTITUTIONAL ROLE', title: 'First Reading Chamber', body: 'Bills originate or are introduced here first. Three readings; full record of every speech and vote.', cta: 'How bills move', tone: 'primary' },
        { kicker: 'BUDGET POWER', title: 'Appropriations & Audit', body: 'The Assembly approves every public budget. Audit findings tabled here first — no exception.', cta: 'Budget portal', tone: 'subtle' },
        { kicker: 'OVERSIGHT', title: 'Question Time', body: 'Weekly Question Time — ministers answer to the chamber. Every answer Hansard-recorded.', cta: 'Watch Q-time', tone: 'amber' },
      ]}
      statistics={[
        { value: '420', label: 'Members', sub: 'One per constituency' },
        { value: '4 years', label: 'Term length', sub: 'Fixed-term' },
        { value: '14', label: 'Standing committees', sub: 'Cross-cutting' },
        { value: '240', label: 'Sessions / year', sub: 'Plenary + committee' },
        { value: '100%', label: 'Hansard publication', sub: 'Within 24 hours' },
        { value: '5,000', label: 'Citizen petition threshold', sub: 'Triggers debate' },
        { value: '0', label: 'Closed sessions', sub: 'Without published rationale' },
      ]}
      news={[
        { title: 'Budget Second Reading', date: 'May 16, 2025', summary: 'Annual appropriations.' },
        { title: 'Audit Findings Tabled', date: 'May 10, 2025', summary: 'Treasury & three ministries.' },
        { title: 'Petition Threshold Reached', date: 'May 03, 2025', summary: 'Citizens’ petition on climate to be debated.' },
      ]}
      initiatives={[
        { title: 'Citizen Petitions Platform', body: 'Direct citizen access to the legislative agenda.' },
        { title: 'Open Hansard Project', body: 'Every plenary transcribed within 24h.' },
        { title: 'Youth Parliament', body: 'Annual youth sittings; resolutions tabled to plenary.' },
      ]}
      locator={{ title: 'Members by Constituency', placeholder: 'Enter your constituency', tabs: ['Members', 'Committees', 'Petitions', 'Sessions'], pinLabel: '⌬', pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]] }}
      shortcuts={[
        { title: 'Bill Library', subtitle: 'All readings' },
        { title: 'Hansard Archive', subtitle: 'Full transcripts' },
        { title: 'Open Vote Data', subtitle: 'Roll-call records' },
        { title: 'Budget Library', subtitle: 'Appropriations & audit' },
      ]}
      footerSections={[
        { heading: 'Members & Sessions', items: ['Find Member', 'Watch Live', 'Hansard', 'Bills', 'Budget'] },
        { heading: 'Resources', items: ['Records', 'Open Data', 'Petitions', 'Publications', 'Contact'] },
        { heading: 'About', items: ['Role', 'Committees', 'Code of Conduct', 'Audit', 'Transparency'] },
      ]}
      newsletter={{ heading: 'Assembly updates', body: 'Sessions, votes, and petition outcomes.' }}
      legalLine="© 2025 National Assembly — Lower House of the Legislature."
      legalLinks={['Privacy', 'Terms', 'Accessibility', 'Sitemap']} />
  );
}
