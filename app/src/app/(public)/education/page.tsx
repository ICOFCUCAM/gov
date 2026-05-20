// Public — Ministry of Education homepage. Futuristic education system
// with public-branch index counting per-institution public sites.

import Link from 'next/link';
import { PublicSiteShell } from '@/apps/_shared/public/PublicSiteShell';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';
import { educationPublicInstitutions } from '@/lib/gov/education-public-institutions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Education — Official Portal' };

const THEME = {
  ink: '#1a1f30', inkSoft: '#262e44', primary: '#3a82d0', accent: '#c9a24a',
  surface: '#faf8f1', surfaceMute: '#eef2f9', line: '#dde3ee',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default function PublicEducationPage() {
  const institutions = educationPublicInstitutions();
  const totalSites = institutions.reduce((s, b) => s + b.publicSites, 0);

  return (
    <div>
      <PublicSiteShell
        theme={THEME}
        institution={{ name: 'Ministry of Education', tagline: 'Mens sana civitatis — the cultivated mind of the polity', role: 'Ministry', href: '/education', crest: '◈',
          emergencyButton: null }}
        nav={[
          { label: 'Home', href: '/education', active: true },
          { label: 'Learners', href: '/education' },
          { label: 'Institutions', href: '/education' },
          { label: 'AI Tutor Mesh', href: '/education' },
          { label: 'Research', href: '/education' },
          { label: 'News', href: '/education' },
          { label: 'About', href: '/education' },
        ]}
        hero={{
          headline: <><span style={{ color: THEME.ink }}>Learning Without Limit,</span><br /><span style={{ color: THEME.primary }}>Plural, Sovereign</span></>,
          subhead: 'AI-augmented, pluralistic, intergenerational — every learner with a sovereign learner-twin.',
          primaryCta: { label: 'My Learner Twin', icon: '◈' },
          secondaryCta: { label: 'Find an Institution', icon: '⌕' },
          illustration: <HeroIllustration kind="lecture" primary={THEME.primary} accent={THEME.accent} aria="Lecture hall" />,
          sideNote: { icon: '✦', title: 'AI Tutor Mesh', body: 'Every learner has a privacy-preserving AI tutor. Cognitive profiling is constitutionally void.', cta: 'How it works' },
        }}
        alert={{ label: 'ADMISSION NOTICE', text: 'Tertiary admissions cycle 2026 open. Free scholarship applications via Learner Twin portal.' }}
        quickServices={[
          { title: 'My Learner Twin', subtitle: 'Personal portal', color: THEME.primary, icon: '◈' },
          { title: 'Apply Scholarship', subtitle: 'Need + merit', color: '#0f7a5f', icon: '✚' },
          { title: 'Find Institution', subtitle: 'School / college / Uni', color: '#7c4d8a', icon: '⌕' },
          { title: 'AI Tutor Mesh', subtitle: 'Augmented learning', color: '#b48a3d', icon: '✦' },
          { title: 'Open Curriculum', subtitle: 'Browse standards', color: '#3a82d0', icon: '☷' },
          { title: 'Research Portal', subtitle: 'Grants & papers', color: '#e08a2b', icon: '⌬' },
        ]}
        featured={[
          { kicker: 'FUTURISTIC SYSTEM', title: 'Sovereign Learner Twin', body: 'Every learner has a privacy-preserving AI companion. Adaptive curriculum without conformity scoring.', cta: 'How it works', tone: 'primary' },
          { kicker: 'PLURALISM', title: 'Civic Curriculum Open Source', body: 'Every framework public; multiple traditions honoured. Educational-conformity scoring is void.', cta: 'Read curriculum', tone: 'subtle' },
          { kicker: 'GENERATIONAL', title: 'Civilizational Memory', body: 'National archives, constitutional literacy, civic education — intergenerational property.', cta: 'Browse archive', tone: 'amber' },
        ]}
        statistics={[
          { value: `${totalSites}`, label: 'Public institution sites', sub: 'Independent portals' },
          { value: '8,400+', label: 'Schools', sub: 'Primary + secondary' },
          { value: '420', label: 'Higher ed institutions', sub: 'Universities + colleges' },
          { value: '24', label: 'Research universities', sub: 'PhD-granting' },
          { value: '13.4 M', label: 'Active learners', sub: 'All levels' },
          { value: '94%', label: 'Literacy rate', sub: 'National' },
          { value: '0', label: 'Cognitive profiling', sub: 'Constitutional contract' },
        ]}
        news={[
          { title: 'AI Tutor Mesh Phase 2 Rollout', date: 'May 16, 2025', summary: 'Privacy-preserving tutor coverage doubled.' },
          { title: 'New Constitutional Literacy Module', date: 'May 11, 2025', summary: 'Now in every secondary curriculum.' },
          { title: 'Research Lineage Programme', date: 'May 04, 2025', summary: '25-year funding stability for core research.' },
        ]}
        initiatives={[
          { title: 'Sovereign Learner Twin', body: 'Privacy-preserving AI tutor for every learner.' },
          { title: 'Neural Curriculum Graph', body: 'Adaptive curriculum that respects pluralism.' },
          { title: 'Civilizational Memory', body: 'National archive, constitutional literacy, civic education.' },
        ]}
        locator={{ title: 'Find an Institution', placeholder: 'Subject, region, level', tabs: ['Universities', 'Schools', 'Colleges', 'Research'], pinLabel: '◈', pinCoords: [[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]] }}
        shortcuts={[
          { title: 'Open Curriculum', subtitle: 'Full framework library' },
          { title: 'Examination Board', subtitle: 'Schedules & integrity' },
          { title: 'Scholarship Portal', subtitle: 'All schemes' },
          { title: 'Civic Library', subtitle: 'Constitutional & civic' },
        ]}
        footerSections={[
          { heading: 'Learners', items: ['Learner Twin', 'Scholarships', 'Curriculum', 'Examinations', 'AI Tutor Mesh'] },
          { heading: 'Institutions', items: ['Universities', 'Schools', 'Teacher Colleges', 'Research', 'Public Library'] },
          { heading: 'About', items: ['Mandate', 'Pluralism Doctrine', 'Careers', 'Audit', 'Transparency'] },
        ]}
        newsletter={{ heading: 'Education updates', body: 'Curriculum, scholarships, research news.' }}
        legalLine="© 2025 Ministry of Education."
        legalLinks={['Privacy', 'Pluralism Doctrine', 'Accessibility', 'Sitemap']} />

      {/* Education sub-branch public-website index — a unique feature of the Education portal. */}
      <section className="border-t" style={{ background: THEME.surface, borderColor: THEME.line }}>
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[24px] font-bold" style={{ color: THEME.ink, fontFamily: 'Georgia, ui-serif, serif' }}>Public Websites by Branch</h2>
            <div className="text-[13px] text-slate-500">
              <span className="font-bold tabular-nums" style={{ color: THEME.primary }}>{institutions.length}</span> branches ·{' '}
              <span className="font-bold tabular-nums" style={{ color: THEME.primary }}>{totalSites.toLocaleString()}</span> independent public sites
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {institutions.map(b => (
              <Link key={b.branch} href={b.href}
                className="rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                style={{ borderColor: THEME.line }}>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg text-[16px]"
                    style={{ background: THEME.surfaceMute, color: THEME.primary }} aria-hidden>{b.glyph}</span>
                  <div>
                    <div className="text-[14px] font-bold" style={{ color: THEME.ink }}>{b.branch}</div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">{b.tier}</div>
                  </div>
                  <span className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{ background: THEME.surfaceMute, color: THEME.primary }}>{b.publicSites.toLocaleString()} sites</span>
                </div>
                <p className="mt-3 text-[12px] text-slate-600">{b.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {b.flagshipExamples.map(f => (
                    <span key={f} className="rounded-full px-2 py-0.5 text-[10.5px]"
                      style={{ background: THEME.surface, color: THEME.inkSoft, border: `1px solid ${THEME.line}` }}>{f}</span>
                  ))}
                </div>
                <div className="mt-3 text-[11px] font-semibold" style={{ color: THEME.primary }}>Browse branch →</div>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-[11px] italic text-slate-500">
            Every public-facing institution carries its own portal — universities, school networks, exam boards, civic
            literacy centres and research consortia. The Ministry coordinates standards and protects pluralism without
            consolidating their voices.
          </p>
        </div>
      </section>
    </div>
  );
}
