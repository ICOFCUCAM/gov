// Public — National Operations Centre homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'National Operations Centre — Public Briefing Portal' };

const THEME = {
  ink: '#0a0f14', inkSoft: '#121821', primary: '#2e7e8d', accent: '#5bbfd0',
  surface: '#f4f6f8', surfaceMute: '#e6edf2', line: '#cdd9e0',
  emergencyA: '#c1252f', emergencyB: '#7a161c',
};

export default function PublicNocPage() {
  return (
    <PublicSiteShell
      theme={THEME}
      institution={{ name: 'National Operations Centre', tagline: 'Civilian situation awareness · 24/7', role: 'Agency', href: '/noc', crest: '⌖',
        emergencyButton: { label: 'Live Briefing', icon: '◉' } }}
      nav={[
        { label: 'Home', href: '/noc', active: true },
        { label: 'Live Briefing', href: '/noc' },
        { label: 'National Posture', href: '/noc' },
        { label: 'Incidents', href: '/noc' },
        { label: 'Coordination', href: '/noc' },
        { label: 'Archive', href: '/noc' },
        { label: 'About', href: '/noc' },
      ]}
      hero={{
        headline: <><span style={{ color: THEME.ink }}>Aware,</span><br /><span style={{ color: THEME.primary }}>Together</span></>,
        subhead: 'The National Operations Centre is a civilian situation room — it observes, coordinates, and briefs the public every six hours.',
        primaryCta: { label: 'Latest Briefing', icon: '◉' },
        secondaryCta: { label: 'National Posture', icon: '⌖' },
        illustration: <HeroIllustration kind="parliament" primary={THEME.primary} accent={THEME.accent} aria="National operations centre" />,
        sideNote: { icon: '☷', title: 'Open by design', body: 'Every NOC decision publishes its rationale. The audit chain is public; sealed decisions without reasoning are void.', cta: 'How NOC decides' },
      }}
      alert={{ label: 'NATIONAL POSTURE', text: 'Posture: STEADY · National readiness 86/100 · 0 major incidents · next briefing in 03h 42m' }}
      quickServices={[
        { title: 'Live Briefing', subtitle: 'Citizen briefing', color: THEME.primary, icon: '◉' },
        { title: 'National Readiness', subtitle: 'Aggregate index', color: '#0f7a5f', icon: '⌖' },
        { title: 'Incident Floor', subtitle: 'Active incidents', color: '#b54a14', icon: '⚠' },
        { title: 'Coordination Decisions', subtitle: 'With public rationale', color: '#3a82d0', icon: '⌗' },
        { title: 'Cyber Posture', subtitle: 'National cyber status', color: '#7a4d8a', icon: '⌬' },
        { title: 'Briefing Archive', subtitle: 'Every past briefing', color: '#e08a2b', icon: '☷' },
      ]}
      featured={[
        { kicker: 'CIVILIAN COMMAND', title: 'Awareness, Not Command', body: 'The NOC observes and coordinates — it does not command ministries or substitute for Cabinet. Decisions remain constitutional.', cta: 'NOC doctrine', tone: 'primary' },
        { kicker: 'PUBLIC BRIEFING', title: 'Every Six Hours', body: 'Citizens learn from the NOC directly, in five sovereign languages and sign language. No event is too small; no event is concealed.', cta: 'Briefing cadence', tone: 'subtle' },
        { kicker: 'SAFEGUARDS', title: 'Reasoned, Audited, Open', body: 'Every NOC decision carries published reasoning. The chain of command stays civilian. Cabinet decides; NOC informs.', cta: 'Read safeguards', tone: 'amber' },
      ]}
      statistics={[
        { value: '24/7', label: 'Watch posture', sub: 'Never paused' },
        { value: 'every 6h', label: 'Public briefing cadence', sub: 'In 5 languages' },
        { value: '15', label: 'Ministries observed', sub: 'All sovereign' },
        { value: '0', label: 'Sealed decisions', sub: 'Constitutional contract' },
        { value: '100%', label: 'Decisions with rationale', sub: 'Publicly audited' },
        { value: '✓', label: 'Civilian command', sub: 'Senate-confirmed' },
        { value: 'open-source', label: 'Intel fusion', sub: 'Never classified' },
      ]}
      news={[
        { title: 'Briefing #2025-318 published', date: 'May 16, 2025', summary: 'National posture STEADY; energy & climate routine.' },
        { title: 'Continuity Exercise CX-2025-04', date: 'May 12, 2025', summary: 'Cross-branch CoG drill — all branches asserted continuity.' },
        { title: 'NOC Director Confirmed', date: 'May 02, 2025', summary: 'Senate confirms civilian Director, 7-year non-renewable term.' },
      ]}
      initiatives={[
        { title: 'Open Briefing Archive', body: 'Every briefing permanently searchable; RSS · ATOM · JSON.' },
        { title: 'Multi-Language Reach', body: 'Five sovereign languages plus sign-language interpretation, live.' },
        { title: 'Citizen Watch Subscriptions', body: 'Subscribe to specific briefings by topic, region or severity.' },
      ]}
      locator={{ title: 'Regional Watch', placeholder: 'Search a region or domain', tabs: ['Regions', 'Domains', 'Incidents', 'Briefings'], pinLabel: '⌖', pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]] }}
      shortcuts={[
        { title: 'Public Archive Stream', subtitle: 'RSS · ATOM · JSON' },
        { title: 'Translation Index', subtitle: 'All sovereign languages' },
        { title: 'Cyber Posture', subtitle: 'National cyber status' },
        { title: 'Continuity Exercises', subtitle: 'Drill calendar & results' },
      ]}
      footerSections={[
        { heading: 'Briefings', items: ['Live Briefing', 'Briefing Archive', 'Translations', 'Subscribe', 'RSS / JSON'] },
        { heading: 'Awareness', items: ['National Posture', 'Incident Floor', 'Ministry Posture', 'Cyber Posture', 'Continuity'] },
        { heading: 'Safeguards', items: ['Doctrine', 'Audit Chain', 'Civilian Command', 'Rationale Doctrine', 'Contact'] },
      ]}
      newsletter={{ heading: 'NOC briefings', body: 'Every six hours, in your inbox or feed reader.' }}
      legalLine="© 2025 National Operations Centre — Civilian situation awareness."
      legalLinks={['Privacy', 'Terms', 'Accessibility', 'Sitemap']} />
  );
}
