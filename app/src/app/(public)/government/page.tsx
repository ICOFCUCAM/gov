// Public — Government homepage / institution directory.
// Single canonical entry point to every sovereign institution's public
// website. Light, accessible, citizen-facing.

import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Government of the Republic — Official Directory' };

const NAVY = '#0a1326';
const GOLD = '#c9a24a';
const TEAL = '#0e7676';
const LINE = '#dccfb3';

interface Institution {
  href: string;
  name: string;
  branch: 'executive' | 'legislative' | 'judicial' | 'ministry' | 'agency' | 'citizen';
  tagline: string;
  crest: string;
}

const INSTITUTIONS: Institution[] = [
  // Executive
  { href: '/presidency', name: 'Office of the President', branch: 'executive', tagline: 'Executive Mansion · Cabinet Office', crest: '◈' },
  { href: '/noc', name: 'National Operations Centre', branch: 'agency', tagline: 'Civilian situation awareness · 24/7', crest: '⌖' },
  // Legislative
  { href: '/senate', name: 'Senate', branch: 'legislative', tagline: 'Upper House · deliberation, long time', crest: '◈' },
  { href: '/assembly', name: 'National Assembly', branch: 'legislative', tagline: 'Lower House · voice of the people', crest: '⌬' },
  // Judicial
  { href: '/judiciary', name: 'Judicial Branch', branch: 'judicial', tagline: 'Apex bench · constitutional rulings', crest: '⚖' },
  // Ministries
  { href: '/interior', name: 'Ministry of the Interior', branch: 'ministry', tagline: 'Identity · borders · civil registry', crest: '⌂' },
  { href: '/health', name: 'Ministry of Health', branch: 'ministry', tagline: 'For a healthier nation', crest: '⚕' },
  { href: '/treasury', name: 'Treasury & Finance', branch: 'ministry', tagline: 'Fiscal command · revenue · reserves', crest: '◈' },
  { href: '/justice', name: 'Ministry of Justice', branch: 'ministry', tagline: 'Open courts · constitutional records', crest: '⚖' },
  { href: '/education', name: 'Ministry of Education', branch: 'ministry', tagline: 'Knowledge · pluralism · futures', crest: '✎' },
  { href: '/energy', name: 'Ministry of Energy', branch: 'ministry', tagline: 'Grid · renewables · reserves', crest: '⌬' },
  { href: '/transport', name: 'Ministry of Transport', branch: 'ministry', tagline: 'Roads · rail · maritime · aviation', crest: '↬' },
  { href: '/trade', name: 'Ministry of Trade & Industry', branch: 'ministry', tagline: 'Industry · exports · strategic production', crest: '⌗' },
  { href: '/labour', name: 'Ministry of Labour', branch: 'ministry', tagline: 'Welfare · workplace · social protection', crest: '✚' },
  { href: '/environment', name: 'Ministry of Environment', branch: 'ministry', tagline: 'Climate resilience · biome', crest: '◯' },
  { href: '/agriculture', name: 'Ministry of Agriculture', branch: 'ministry', tagline: 'Food security · rural economy', crest: '☷' },
  // Agencies
  { href: '/police', name: 'Police Command', branch: 'agency', tagline: 'Incident command · investigation', crest: '⌖' },
  { href: '/emergency', name: 'Emergency Management', branch: 'agency', tagline: 'Crisis · resilience · recovery', crest: '⚠' },
  { href: '/communications', name: 'Communications & Digital', branch: 'agency', tagline: 'Connectivity · cyber · spectrum', crest: '⌬' },
  { href: '/foreign-affairs', name: 'Foreign Affairs', branch: 'agency', tagline: 'Diplomacy · treaties · consular', crest: '⌖' },
  // Citizen
  { href: '/portal', name: 'Citizen Super-Portal', branch: 'citizen', tagline: 'Every ministry · one wallet', crest: '◯' },
];

const BRANCH_LABEL: Record<Institution['branch'], string> = {
  executive: 'Executive Branch',
  legislative: 'Legislative Branch',
  judicial: 'Judicial Branch',
  ministry: 'Ministries',
  agency: 'Standing Agencies',
  citizen: 'Citizen Services',
};

const BRANCH_ORDER: Institution['branch'][] = ['executive', 'legislative', 'judicial', 'ministry', 'agency', 'citizen'];

export default function GovernmentDirectoryPage() {
  const byBranch = BRANCH_ORDER.map(b => ({ branch: b, items: INSTITUTIONS.filter(i => i.branch === b) }));

  return (
    <div className="min-h-screen" style={{ background: '#f7f5ee', color: '#1a2332' }}>
      {/* Utility ribbon */}
      <div className="w-full text-[12px] text-white/85" style={{ background: `linear-gradient(90deg,${NAVY},#142042)` }}>
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-2">
          <span>Official Government Portal · Directory of Sovereign Institutions</span>
          <div className="flex items-center gap-4">
            <span className="hover:text-white">A+ A A-</span>
            <span className="hover:text-white">English ▾</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-white" style={{ borderColor: LINE }}>
        <div className="mx-auto flex max-w-[1280px] items-center gap-6 px-6 py-4">
          <span className="grid h-12 w-12 place-items-center rounded-full text-[18px] font-bold text-white" style={{ background: NAVY }} aria-hidden>⛨</span>
          <div className="leading-tight">
            <div className="text-[20px] font-bold tracking-tight" style={{ color: NAVY }}>Government of the Republic</div>
            <div className="text-[12px] text-slate-500">Sovereign institutions · open by default</div>
          </div>
          <nav className="ml-auto hidden gap-7 text-[14px] font-medium text-slate-600 lg:flex">
            <Link href="/portal" className="hover:text-slate-900">Citizen Portal</Link>
            <Link href="/presidency" className="hover:text-slate-900">Presidency</Link>
            <Link href="/noc" className="hover:text-slate-900">Live Briefing</Link>
            <Link href="/login" className="rounded-md px-3 py-1.5 text-white" style={{ background: TEAL }}>Sign in</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b" style={{ borderColor: LINE, background: 'linear-gradient(135deg, #ffffff 0%, #f0ebe0 100%)' }}>
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-8 px-6 py-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: GOLD }}>Constitutional Federation</div>
            <h1 className="mt-3 text-[42px] font-bold leading-[1.05] tracking-tight" style={{ color: NAVY }}>
              Every Institution.<br /><span style={{ color: TEAL }}>One Doorway.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600">
              The Republic is composed of {INSTITUTIONS.length} sovereign institutions. Each operates its own portal,
              its own rules, its own records — coordinated by constitutional contract, never by single command.
              Every site below is the official surface of that institution.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/portal" className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-[14px] font-semibold text-white" style={{ background: TEAL }}>◯ Open Citizen Portal</Link>
              <Link href="/noc" className="inline-flex items-center gap-2 rounded-md border px-5 py-3 text-[14px] font-semibold" style={{ borderColor: NAVY, color: NAVY }}>⌖ Live National Briefing</Link>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm" style={{ borderColor: LINE }}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: GOLD }}>National Posture</div>
            <div className="mt-2 text-[28px] font-bold" style={{ color: TEAL }}>STEADY</div>
            <div className="text-[12px] text-slate-500">National readiness 86/100 · 0 major incidents</div>
            <hr className="my-3" style={{ borderColor: LINE }} />
            <div className="space-y-1.5 text-[12px]">
              {[
                ['Cabinet sitting', 'Wednesday — agenda public'],
                ['Public briefing', 'Every 6h · 5 languages'],
                ['Constitutional posture', '✓ separation intact'],
                ['Audit chain', '✓ intact across branches'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-slate-500">{k}</span><span className="text-slate-800">{v}</span></div>
              ))}
            </div>
            <Link href="/noc" className="mt-3 inline-block text-[12px] underline underline-offset-2" style={{ color: TEAL }}>View live briefing →</Link>
          </div>
        </div>
      </section>

      {/* Directory */}
      <main className="mx-auto max-w-[1280px] px-6 py-10">
        <h2 className="text-[18px] font-bold tracking-tight" style={{ color: NAVY }}>Sovereign Institutions</h2>
        <p className="mt-1 text-[13px] text-slate-600">Open the public site of any institution. Each is independently operated and accountable.</p>

        <div className="mt-6 space-y-8">
          {byBranch.filter(b => b.items.length > 0).map(b => (
            <section key={b.branch}>
              <div className="mb-3 flex items-baseline gap-3">
                <h3 className="text-[14px] font-semibold uppercase tracking-[0.18em]" style={{ color: TEAL }}>{BRANCH_LABEL[b.branch]}</h3>
                <span className="text-[11px] text-slate-500">{b.items.length} institution{b.items.length === 1 ? '' : 's'}</span>
                <div className="ml-3 h-px flex-1" style={{ background: LINE }} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {b.items.map(inst => (
                  <Link key={inst.href} href={inst.href} className="group flex items-start gap-3 rounded-md border bg-white p-3.5 no-underline transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: LINE }}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[16px] text-white" style={{ background: NAVY }} aria-hidden>{inst.crest}</span>
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-semibold" style={{ color: NAVY }}>{inst.name}</div>
                      <div className="truncate text-[11px] text-slate-500">{inst.tagline}</div>
                      <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] group-hover:underline" style={{ color: TEAL }}>{inst.href} →</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: LINE, background: '#ffffff' }}>
        <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-8 px-6 py-10 md:grid-cols-4">
          {[
            { h: 'Government', i: ['Presidency', 'Cabinet', 'Senate', 'Assembly', 'Judicial Branch'] },
            { h: 'For Citizens', i: ['Citizen Portal', 'Find a Service', 'File an Appeal', 'Sign a Petition', 'Help'] },
            { h: 'Transparency', i: ['Live Briefing', 'Executive Orders', 'Hansard', 'Asset Disclosures', 'Audit'] },
            { h: 'About', i: ['The Constitution', 'Open Data', 'Accessibility', 'Sitemap', 'Contact'] },
          ].map(s => (
            <div key={s.h}>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: GOLD }}>{s.h}</div>
              <ul className="space-y-1 text-[12.5px] text-slate-600">{s.i.map(x => <li key={x}><Link href="/government" className="hover:text-slate-900">{x}</Link></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="border-t px-6 py-4 text-center text-[11px] text-slate-500" style={{ borderColor: LINE }}>
          © 2025 Government of the Republic · Every institution operates within the constitutional contract.
        </div>
      </footer>
    </div>
  );
}
