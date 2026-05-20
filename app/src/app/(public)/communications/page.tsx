// Public — Communications & Digital Infrastructure homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Communications & Digital Infrastructure — Official Portal' };

const THEME = {
  ink: '#0a1424', inkSoft: '#15233f', primary: '#3a82d0', accent: '#5fc4f0',
  surface: '#f4f8fc', surfaceMute: '#e3eef9', line: '#d4e0ee',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default function PublicCommunicationsPage() {
  return (
    <PublicSiteShell
      theme={THEME}
      institution={{ name: 'Communications & Digital Infrastructure', tagline: 'Civitas conexa — the connected polity', role: 'Agency', href: '/communications', crest: '⌬',
        emergencyButton: { label: 'Cyber Hotline', icon: '☎' } }}
      nav={[
        { label: 'Home', href: '/communications', active: true },
        { label: 'Services', href: '/communications' },
        { label: 'Cyber', href: '/communications' },
        { label: 'Spectrum', href: '/communications' },
        { label: 'Identity', href: '/communications' },
        { label: 'News', href: '/communications' },
        { label: 'About', href: '/communications' },
      ]}
      hero={{
        headline: <><span style={{ color: THEME.ink }}>Connected Citizens,</span><br /><span style={{ color: THEME.primary }}>Sovereign Networks</span></>,
        subhead: 'Press independence, end-to-end integrity, spectrum as a public resource.',
        primaryCta: { label: 'Digital Identity', icon: '◈' },
        secondaryCta: { label: 'Spectrum Licence', icon: '⌭' },
        illustration: <HeroIllustration kind="satellite" primary={THEME.primary} accent={THEME.accent} aria="Satellite network" />,
        sideNote: { icon: '✦', title: 'Cyber resilience', body: 'National SOC operates 24/7 — citizen-incident reporting + identity protection.', cta: 'Report incident' },
      }}
      alert={{ label: 'CYBER ADVISORY', text: 'Phishing campaign impersonating Treasury detected. Never share credentials. Report to the SOC immediately.' }}
      quickServices={[
        { title: 'Digital Identity', subtitle: 'CivicID enrol/manage', color: THEME.primary, icon: '◈' },
        { title: 'Report Cyber Incident', subtitle: 'SOC intake', color: '#b81c3f', icon: '!' },
        { title: 'Spectrum Licence', subtitle: 'Apply or renew', color: '#7c4d8a', icon: '⌭' },
        { title: 'Broadband Permit', subtitle: 'Domestic/business', color: '#0f7a5f', icon: '⌗' },
        { title: 'Telecom Portability', subtitle: 'Keep your number', color: '#b48a3d', icon: '↻' },
        { title: 'Service Outage', subtitle: 'Report or check', color: '#e08a2b', icon: '⚠' },
      ]}
      featured={[
        { kicker: 'CONSTITUTIONAL CONTRACT', title: 'Press Independence', body: 'Censorship without court order is constitutionally void. Public-service broadcasters at arm’s length.', cta: 'Read doctrine', tone: 'primary' },
        { kicker: 'PRIVACY', title: 'Consent-Based Authentication', body: 'CivicID never used for surveillance. Every authentication consent-logged.', cta: 'Learn more', tone: 'subtle' },
        { kicker: 'TRANSPARENT TENDER', title: 'Spectrum as Public Resource', body: 'Every spectrum allocation tender-based and reviewable. Non-tender awards void.', cta: 'View tenders', tone: 'amber' },
      ]}
      statistics={[
        { value: '99.97%', label: 'National uptime', sub: 'Past 12 months' },
        { value: '54 M', label: 'CivicID enrolled', sub: 'Citizens' },
        { value: '94%', label: 'Press-independence idx', sub: 'National media' },
        { value: '8.4 ms', label: 'Mean latency', sub: 'Urban average' },
        { value: '12 GHz', label: 'Spectrum managed', sub: 'Across bands' },
        { value: '0', label: 'Concealed incidents', sub: 'Constitutional contract' },
        { value: '0', label: 'Network shutdowns', sub: 'Without court order' },
      ]}
      news={[
        { title: 'Sovereign Cloud Capacity Doubled', date: 'May 15, 2025', summary: 'New data centres in two regions.' },
        { title: 'National SOC Drill Completed', date: 'May 11, 2025', summary: 'Tabletop exercise across 14 agencies.' },
        { title: 'Spectrum Auction Concluded', date: 'May 04, 2025', summary: '5G mid-band — transparent tender.' },
      ]}
      initiatives={[
        { title: 'Sovereign Cloud Programme', body: 'Citizen data stored in sovereign data centres.' },
        { title: 'Digital Identity Programme', body: 'Privacy-preserving authentication for every citizen.' },
        { title: 'Cybersecurity Resilience', body: 'National SOC and threat-sharing fabric.' },
      ]}
      locator={{ title: 'Service Centres', placeholder: 'Enter your district', tabs: ['Identity', 'SOC', 'Spectrum', 'Telecom'], pinLabel: '⌬', pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]] }}
      shortcuts={[
        { title: 'Cyber Library', subtitle: 'Citizen protection guides' },
        { title: 'Open Network Data', subtitle: 'Outages & uptime' },
        { title: 'Spectrum Database', subtitle: 'Tender & allocation' },
        { title: 'Media Register', subtitle: 'Broadcaster directory' },
      ]}
      footerSections={[
        { heading: 'Services', items: ['Digital Identity', 'Cyber Reporting', 'Spectrum', 'Telecom Portability', 'Outages'] },
        { heading: 'Resources', items: ['Cyber Library', 'Open Data', 'Publications', 'Forms', 'Contact'] },
        { heading: 'About', items: ['Mandate', 'SOC', 'Careers', 'Audit', 'Transparency'] },
      ]}
      newsletter={{ heading: 'Digital infrastructure updates', body: 'Cyber advisories and spectrum tenders.' }}
      legalLine="© 2025 Communications & Digital Infrastructure."
      legalLinks={['Privacy', 'Terms', 'Accessibility', 'Sitemap']} />
  );
}
