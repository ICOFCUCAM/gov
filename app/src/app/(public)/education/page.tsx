// Public — Ministry of Education homepage. Futuristic education system
// with public-branch index counting per-institution public sites.

import Link from 'next/link';
import { PublicSite } from '@/apps/_shared/public/PublicSite';
import { HeroIllustration } from '@/apps/_shared/public/illustrations';
import { educationPublicInstitutions } from '@/lib/gov/education-public-institutions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Education — Official Portal' };

const THEME = {
  ink: '#1a1f30', inkSoft: '#262e44', primary: '#3a82d0', accent: '#c9a24a',
  surface: '#faf8f1', surfaceMute: '#eef2f9', line: '#dde3ee',
  emergencyA: '#c1252f', emergencyB: '#a01c25',
};

export default function PublicEducationPage({ searchParams }: { searchParams?: { preset?: string } }) {
  const institutions = educationPublicInstitutions();
  const totalSites = institutions.reduce((s, b) => s + b.publicSites, 0);

  return (
    <PublicSite id="education" theme={THEME} preset={searchParams?.preset}
      live={{ totalSites: totalSites.toLocaleString('en-US') }}
      illustration={<HeroIllustration kind="lecture" primary={THEME.primary} accent={THEME.accent} aria="Lecture hall" />}
      extra={<>
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
      </>} />
  );
}
