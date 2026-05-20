// Public — Ministry of Labour homepage.

import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Labour & Social Protection — Official Portal' };

const THEME = {
  ink: '#11192b', inkSoft: '#1d2540', primary: '#3a6dac', accent: '#5fa8ff',
  surface: '#f4f6fa', surfaceMute: '#e3ebf7', line: '#d6dce9',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default function PublicLabourPage() {
  return (
    <PublicSiteShell
      theme={THEME}
      institution={{ name: 'Ministry of Labour & Social Protection', tagline: 'Dignitas operis — the dignity of work', role: 'Ministry', href: '/labour', crest: '⌬',
        emergencyButton: { label: 'Worker Hotline', icon: '☎' } }}
      nav={[
        { label: 'Home', href: '/labour', active: true },
        { label: 'Jobs', href: '/labour' },
        { label: 'Benefits', href: '/labour' },
        { label: 'Rights', href: '/labour' },
        { label: 'Pensions', href: '/labour' },
        { label: 'News', href: '/labour' },
        { label: 'About', href: '/labour' },
      ]}
      hero={{
        headline: <><span style={{ color: THEME.ink }}>Dignified Work,</span><br /><span style={{ color: THEME.primary }}>Lasting Security</span></>,
        subhead: 'Right to counsel, workplace safety, benefits continuity — non-negotiable.',
        primaryCta: { label: 'Find a Job', icon: '⌬' },
        secondaryCta: { label: 'Apply for Benefits', icon: '✚' },
        illustration: <HeroIllustration kind="wave" primary={THEME.primary} accent={THEME.accent} aria="Workforce flow" />,
        sideNote: { icon: '✚', title: 'Benefits within 14 days', body: 'Unemployment, disability, pension applications — constitutional 14-day disbursement window.', cta: 'Apply now' },
      }}
      alert={{ label: 'PROGRAMME NOTICE', text: 'Reskilling cohorts open for the digital-skills track. 12-week programmes start June 1.' }}
      quickServices={[
        { title: 'Find a Job', subtitle: 'National listing', color: THEME.primary, icon: '⌬' },
        { title: 'Apply Benefits', subtitle: 'Unemployment/welfare', color: '#0f7a5f', icon: '✚' },
        { title: 'Pension Status', subtitle: 'Check or apply', color: '#7c4d8a', icon: '◯' },
        { title: 'Report Workplace', subtitle: 'Safety concern', color: '#b81c3f', icon: '⚠' },
        { title: 'File a Complaint', subtitle: 'Wage/safety/discrimination', color: '#e08a2b', icon: '⚖' },
        { title: 'Vocational Training', subtitle: 'Apprenticeships', color: '#3a82d0', icon: '✦' },
      ]}
      featured={[
        { kicker: 'CONSTITUTIONAL CONTRACT', title: 'Right to Counsel', body: 'Every worker in any tribunal lane has the right to counsel. Legal-aid is offered at filing.', cta: 'Learn rights', tone: 'primary' },
        { kicker: 'SAFETY', title: 'Workplace Inspections', body: 'Mandatory inspections; retaliation against complainants is a sustained finding.', cta: 'View register', tone: 'subtle' },
        { kicker: 'SUPPORT', title: 'Transition Support', body: 'Displaced workers receive bridge benefits + reskilling within 14 days.', cta: 'Apply', tone: 'amber' },
      ]}
      statistics={[
        { value: '21.4 M', label: 'Workforce', sub: 'National labour force' },
        { value: '6.2%', label: 'Unemployment', sub: 'Current rate' },
        { value: '78%', label: 'Benefits payout on-time', sub: 'Within 14 days' },
        { value: '12,400', label: 'Inspections / quarter', sub: 'Workplace safety' },
        { value: '24%', label: 'Women in workforce', sub: 'Senior roles' },
        { value: '94%', label: 'Pension coverage', sub: 'Eligible population' },
        { value: '0', label: 'Retaliatory terminations', sub: 'Constitutional contract' },
      ]}
      news={[
        { title: 'Minimum-Wage Indexation', date: 'May 15, 2025', summary: 'Annual cost-of-living adjustment.' },
        { title: 'Digital-Skills Cohort Opens', date: 'May 10, 2025', summary: '12-week intensive programme.' },
        { title: 'New Workplace Safety Code', date: 'May 03, 2025', summary: 'Enhanced protections in heavy industry.' },
      ]}
      initiatives={[
        { title: 'Reskilling Pipeline', body: 'Bridge-and-reskill for displaced workers.' },
        { title: 'Youth Apprenticeship', body: 'Industry-sponsored apprenticeships nationwide.' },
        { title: 'Co-Determination Bench', body: 'Worker voice in industrial restructuring.' },
      ]}
      locator={{ title: 'Service Centres', placeholder: 'Enter your postcode', tabs: ['Jobs', 'Benefits', 'Inspectorate', 'Tribunals'], pinLabel: '⌬', pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]] }}
      shortcuts={[
        { title: 'Worker Rights', subtitle: 'Constitutional library' },
        { title: 'Wage Library', subtitle: 'Sector-by-sector' },
        { title: 'Open Labour Data', subtitle: 'Statistics & trends' },
        { title: 'Cooperative Register', subtitle: 'Workers cooperatives' },
      ]}
      footerSections={[
        { heading: 'Services', items: ['Jobs', 'Benefits', 'Pensions', 'Complaints', 'Vocational Training'] },
        { heading: 'Resources', items: ['Rights Library', 'Wage Library', 'Open Data', 'Publications', 'Contact'] },
        { heading: 'About', items: ['Mandate', 'Inspectorate', 'Careers', 'Audit', 'Transparency'] },
      ]}
      newsletter={{ heading: 'Labour updates', body: 'Programmes, benefits, rights — monthly digest.' }}
      legalLine="© 2025 Ministry of Labour & Social Protection."
      legalLinks={['Privacy', 'Terms', 'Accessibility', 'Sitemap']} />
  );
}
