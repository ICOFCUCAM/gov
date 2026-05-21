// Public — Presidency / Cabinet Office homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Office of the President & Cabinet — Official Portal' };

const THEME = {
  ink: '#0a1326', inkSoft: '#142042', primary: '#1f3a7a', accent: '#c9a24a',
  surface: '#f7f5ee', surfaceMute: '#ede6d2', line: '#dcd2b6',
  emergencyA: '#1f3a7a', emergencyB: '#0a1326',
};

export default function PublicPresidencyPage() {
  return (
    <PublicSiteShell
      theme={THEME}
      institution={{ name: 'Office of the President', tagline: 'Executive Mansion · Cabinet Office', role: 'Branch', href: '/presidency', crest: '◈',
        emergencyButton: { label: 'Cabinet Statement', icon: '✎' } }}
      nav={[
        { label: 'Home', href: '/presidency', active: true },
        { label: 'The President', href: '/presidency' },
        { label: 'Cabinet', href: '/presidency' },
        { label: 'Executive Orders', href: '/presidency' },
        { label: 'State Engagements', href: '/presidency' },
        { label: 'Transparency', href: '/presidency' },
        { label: 'About', href: '/presidency' },
      ]}
      hero={{
        headline: <><span style={{ color: THEME.ink }}>Authority,</span><br /><span style={{ color: THEME.primary }}>In Trust</span></>,
        subhead: 'The Office of the President exists in service of the polity — temporary, accountable, transparent.',
        primaryCta: { label: 'Read Executive Orders', icon: '✎' },
        secondaryCta: { label: 'Watch Citizen Address', icon: '▶' },
        illustration: <HeroIllustration kind="parliament" primary={THEME.primary} accent={THEME.accent} aria="Executive mansion" />,
        sideNote: { icon: '☷', title: 'Open by default', body: 'Every executive order publishes its rationale, fiscal impact and constitutional citation. Sealed orders without reasoning are void.', cta: 'Browse orders' },
      }}
      alert={{ label: 'CABINET NOTICE', text: 'Cabinet Sitting #2025-104 — Quarterly economic posture and inter-ministry continuity drill on the agenda.' }}
      quickServices={[
        { title: 'Executive Orders', subtitle: 'Active & archived', color: THEME.primary, icon: '✎' },
        { title: 'Cabinet Resolutions', subtitle: 'In debate & adopted', color: '#7a4d8a', icon: '☷' },
        { title: 'State Engagements', subtitle: 'Visits & summits', color: '#0f7a5f', icon: '◯' },
        { title: 'Citizen Address', subtitle: 'Watch & archive', color: '#e08a2b', icon: '▶' },
        { title: 'Asset Disclosures', subtitle: 'Cabinet transparency', color: '#3a82d0', icon: '✚' },
        { title: 'Succession Line', subtitle: 'Constitutional order', color: '#b48a3d', icon: '⌖' },
      ]}
      featured={[
        { kicker: 'CONSTITUTIONAL ROLE', title: 'Govern Through Cabinet', body: 'The President governs *with* Cabinet, not above it. Collective responsibility binds every minister to every adopted resolution.', cta: 'How Cabinet decides', tone: 'primary' },
        { kicker: 'TRANSPARENCY', title: 'Records You Can Read', body: 'Every order, resolution and engagement is published in open form within seven days. The Records Auditor reports to the Senate.', cta: 'Records publication', tone: 'subtle' },
        { kicker: 'SAFEGUARDS', title: 'A Temporary Office', body: 'The Presidency is term-limited. Rule by decree, sealed orders, civil-military fusion and concealment of foreign engagements are constitutionally void.', cta: 'Read safeguards', tone: 'amber' },
      ]}
      statistics={[
        { value: '15', label: 'Ministers', sub: 'Collective cabinet' },
        { value: '4 years', label: 'Term length', sub: 'Renewable once' },
        { value: '52', label: 'Cabinet sittings / year', sub: 'Weekly cadence' },
        { value: '4', label: 'Transparency reports / yr', sub: 'Quarterly, public' },
        { value: '100%', label: 'Orders with rationale', sub: 'No sealed orders' },
        { value: '0', label: 'Concealed engagements', sub: 'Constitutional contract' },
        { value: '✓', label: 'Civilian command', sub: 'Over the military' },
      ]}
      news={[
        { title: 'EO 2024-142 — Climate Adaptation', date: 'May 16, 2025', summary: 'Inter-ministry implementation directive.' },
        { title: 'Cabinet Resolution CR-58134', date: 'May 11, 2025', summary: 'Inter-ministry continuity drill ordered.' },
        { title: 'State Visit Concluded', date: 'May 04, 2025', summary: 'Continental Compact partnership renewed.' },
      ]}
      initiatives={[
        { title: 'Open Records Initiative', body: 'Every presidential record machine-readable within 14 days.' },
        { title: 'Public Engagement Tour', body: 'Quarterly town halls across all regions.' },
        { title: 'Cabinet Transparency Pact', body: 'Asset & conflict disclosures published annually.' },
      ]}
      locator={{ title: 'Cabinet by Ministry', placeholder: 'Search a ministry or minister', tabs: ['Ministers', 'Orders', 'Engagements', 'Records'], pinLabel: '◈', pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]] }}
      shortcuts={[
        { title: 'Executive Order Library', subtitle: 'All orders, all years' },
        { title: 'Asset Disclosures', subtitle: 'Cabinet transparency' },
        { title: 'Public Addresses', subtitle: 'Captioned & translated' },
        { title: 'Constitutional Library', subtitle: 'Full text' },
      ]}
      footerSections={[
        { heading: 'The Presidency', items: ['The President', 'The Cabinet', 'Executive Orders', 'Resolutions', 'Succession'] },
        { heading: 'Engagement', items: ['Citizen Address', 'State Visits', 'Public Engagements', 'Foreign Affairs', 'Contact'] },
        { heading: 'Transparency', items: ['Transparency Reports', 'Asset Disclosures', 'Records', 'Audit', 'Safeguards'] },
      ]}
      newsletter={{ heading: 'Presidential briefings', body: 'Weekly cabinet read-out and order publication notices.' }}
      legalLine="© 2025 Office of the President — Executive Mansion."
      legalLinks={['Privacy', 'Terms', 'Accessibility', 'Sitemap']} />
  );
}
