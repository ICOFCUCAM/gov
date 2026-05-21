// Public — Citizen Super-Portal homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Citizen Super-Portal — Every Ministry, One Wallet' };

const THEME = {
  ink: '#0d1820', inkSoft: '#283645', primary: '#0e7676', accent: '#b8460e',
  surface: '#f7f4ee', surfaceMute: '#f0ebe0', line: '#e0d6c4',
  emergencyA: '#b8460e', emergencyB: '#7a2e08',
};

export default function PublicPortalPage() {
  return (
    <PublicSiteShell
      theme={THEME}
      institution={{ name: 'Citizen Super-Portal', tagline: 'Every ministry · one wallet · one identity', role: 'Agency', href: '/portal', crest: '◯',
        emergencyButton: { label: 'Open Wallet', icon: '◯' } }}
      nav={[
        { label: 'Home', href: '/portal', active: true },
        { label: 'Identity', href: '/portal' },
        { label: 'Health', href: '/portal' },
        { label: 'Education', href: '/portal' },
        { label: 'Taxation', href: '/portal' },
        { label: 'Justice', href: '/portal' },
        { label: 'Civic Voice', href: '/portal' },
        { label: 'Safeguards', href: '/portal' },
      ]}
      hero={{
        headline: <><span style={{ color: THEME.ink }}>Citizen first.</span><br /><span style={{ color: THEME.primary }}>Always.</span></>,
        subhead: 'Your identity, records, and consents are yours. The Citizen Super-Portal unifies every government service in one wallet — never scored, never sold, never sealed.',
        primaryCta: { label: 'Open Your Wallet', icon: '◯' },
        secondaryCta: { label: 'How It Works', icon: '✎' },
        illustration: <HeroIllustration kind="parliament" primary={THEME.primary} accent={THEME.accent} aria="Citizen wallet" />,
        sideNote: { icon: '✓', title: 'Universal right of appeal', body: 'Every administrative decision is appealable to an independent tribunal at no cost. Reasoning is always published.', cta: 'How to appeal' },
      }}
      alert={{ label: 'CITIZEN DOCTRINE', text: 'No civic-credit. No behavioural profiling. No silent data sharing. Your data, your choice — always revocable.' }}
      quickServices={[
        { title: 'File a Tax Return', subtitle: 'Treasury · pre-filled', color: THEME.primary, icon: '◈' },
        { title: 'Book Health Visit', subtitle: 'Health · same-day options', color: '#0f7a5f', icon: '✚' },
        { title: 'Apply for a Permit', subtitle: 'Interior · 24h median', color: '#3a82d0', icon: '⌗' },
        { title: 'File an Appeal', subtitle: 'Justice · free, independent', color: '#7a4d8a', icon: '⚖' },
        { title: 'Sign a Petition', subtitle: 'Assembly · 5,000 triggers debate', color: '#b48a3d', icon: '✎' },
        { title: 'Renew Passport', subtitle: 'Foreign Affairs · consular', color: '#e08a2b', icon: '⌖' },
      ]}
      featured={[
        { kicker: 'CITIZEN-OWNED', title: 'Your Identity, Your Records', body: 'Identity, EHR, credentials and tax history belong to you. Ministries see only what you consent to share — and you may revoke at any time.', cta: 'Identity doctrine', tone: 'primary' },
        { kicker: 'OPEN BY DEFAULT', title: 'Every Decision Reasoned', body: 'Administrative decisions cite the rule, explain the formula, and may be appealed for free. Reasoning-free decisions are void.', cta: 'Appeal Centre', tone: 'subtle' },
        { kicker: 'SAFEGUARDS', title: 'Never Scored', body: 'Civic-credit, behavioural profiling, biometric coercion and cross-ministry tracking are constitutionally prohibited.', cta: 'Read safeguards', tone: 'amber' },
      ]}
      statistics={[
        { value: '45M+', label: 'Citizens enrolled', sub: 'Voluntary, lifelong' },
        { value: '15', label: 'Ministries unified', sub: 'One wallet' },
        { value: '99.9%', label: 'Services uptime', sub: 'Sovereign hosting' },
        { value: '0', label: 'Civic-credit systems', sub: 'Constitutional contract' },
        { value: '100%', label: 'Decisions appealable', sub: 'No exceptions' },
        { value: '0', label: 'Silent data transfers', sub: 'Consent-bound' },
        { value: 'open', label: 'Data formats', sub: 'FHIR · JSON · PDF' },
      ]}
      news={[
        { title: 'Universal Tax Pre-Fill Live', date: 'May 16, 2025', summary: 'Your return arrives pre-filled; you amend, sign, submit.' },
        { title: 'Cross-Ministry Consent Tokens', date: 'May 12, 2025', summary: 'Revocable consents now portable across all 15 ministries.' },
        { title: 'Appeals Now Free in All Domains', date: 'May 04, 2025', summary: 'Universal right of appeal — no filing fee, ever.' },
      ]}
      initiatives={[
        { title: 'Sovereign Identity', body: 'Citizen-owned, federated, never state-scored.' },
        { title: 'Universal Appeal', body: 'Every decision appealable at no cost.' },
        { title: 'Consent Ledger', body: 'See and revoke what each ministry knows about you.' },
      ]}
      locator={{ title: 'Find a Service', placeholder: 'Search "renew passport", "book doctor", "file taxes"…', tabs: ['Services', 'Ministries', 'Appeals', 'Consents'], pinLabel: '◯', pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]] }}
      shortcuts={[
        { title: 'Consents Ledger', subtitle: 'What ministries may see' },
        { title: 'Personal Records', subtitle: 'Every sovereign record' },
        { title: 'Mobility Wallet', subtitle: 'Tracking off by default' },
        { title: 'Voter Wallet', subtitle: 'Ballot privacy guaranteed' },
      ]}
      footerSections={[
        { heading: 'Wallet', items: ['Identity', 'Records', 'Consents', 'Notifications', 'Settings'] },
        { heading: 'Services', items: ['Health', 'Education', 'Taxation', 'Justice', 'Permits'] },
        { heading: 'Rights', items: ['Appeal Centre', 'Data Doctrine', 'Citizen Safeguards', 'Contact', 'Help'] },
      ]}
      newsletter={{ heading: 'Citizen updates', body: 'Service changes, new appeals processes, rights updates.' }}
      legalLine="© 2025 Citizen Super-Portal — Citizen-owned, sovereignly hosted."
      legalLinks={['Privacy', 'Terms', 'Accessibility', 'Sitemap']} />
  );
}
