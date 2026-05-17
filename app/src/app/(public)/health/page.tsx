// Public — Ministry of Health homepage. Official public-facing national
// healthcare portal (light, institutional, navy/blue/green). Distinct from
// the dark operational app. Server component: SSR-safe, deterministic,
// fully responsive, accessible. Imagery = clinical gradient placeholders.

import Link from 'next/link';
import { publicHealthSite } from '@/lib/gov/health-operations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Health — Official Portal' };

const NAVY = '#0b1f3a';
const BLUE = '#1f5fad';
const GREEN = '#0f9d6b';
const LINE = '#e5e7eb';

const NAV: { label: string; href: string }[] = [
  { label: 'Home', href: '/health' },
  { label: 'Health Topics', href: '/health' },
  { label: 'Services', href: '/health/laboratory' },
  { label: 'Find Facilities', href: '/health' },
  { label: 'Programs', href: '/health' },
  { label: 'News & Alerts', href: '/health' },
  { label: 'About Us', href: '/health' },
];
const QUICK = [
  { t: 'Book Appointment', s: 'Hospital or clinic', c: '#1f5fad' },
  { t: 'Consult a Doctor', s: 'Telemedicine', c: '#7c5cff' },
  { t: 'Vaccination', s: 'Schedule & info', c: '#0f9d6b' },
  { t: 'Find Health Facility', s: 'Hospitals, labs, more', c: '#e08a2b' },
  { t: 'Health Records', s: 'View your records', c: '#1f5fad' },
  { t: 'Health Programs', s: 'Explore initiatives', c: '#d62b67' },
];
const NEWS = [
  ['National Nutrition Month 2025', 'Join us in promoting healthy eating habits for all.', 'May 15, 2025'],
  ['New Telemedicine Services', 'Now available in rural districts.', 'May 12, 2025'],
  ['World Hypertension Day', 'Know your numbers and keep your heart healthy.', 'May 10, 2025'],
];
const INITIATIVES = [
  ['Mental Health Support', 'Resources and helplines for your well-being.'],
  ['Mother & Child Health', 'Care and support for a healthy start in life.'],
  ['Non-Communicable Diseases', 'Prevention and control of NCDs for a healthier future.'],
];
const SHORTCUTS = [
  ['Publications & Reports', 'Download health reports and publications.'],
  ['Health Education', 'Learn about health conditions, treatments and more.'],
  ['Media Center', 'Press releases, media kits and resources.'],
  ['AI Health Assistant', 'Ask questions. Get trusted health information.'],
];

export default function PublicHealthHomepage() {
  const s = publicHealthSite(100); // deterministic, SSR-stable

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#1a2332]">
      {/* 1. Top utility bar */}
      <div className="w-full text-[12px] text-white/85" style={{ background: `linear-gradient(90deg,${NAVY},#10325c)` }}>
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-2">
          <span>Official Website of the Ministry of Health</span>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline hover:text-white">Skip to Main Content</span>
            <span className="flex gap-1.5"><button className="hover:text-white">A+</button><button className="hover:text-white">A</button><button className="hover:text-white">A-</button></span>
            <span className="hover:text-white">English ▾</span>
          </div>
        </div>
      </div>

      {/* 2. Header / navbar */}
      <header className="sticky top-0 z-20 border-b bg-white" style={{ borderColor: LINE }}>
        <div className="mx-auto flex max-w-[1280px] items-center gap-6 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full text-[16px] font-bold text-white" style={{ background: NAVY }} aria-hidden>⚕</span>
            <div className="leading-tight">
              <div className="text-[18px] font-bold tracking-tight" style={{ color: NAVY }}>Ministry of Health</div>
              <div className="text-[11px] text-slate-500">For a Healthier Nation</div>
            </div>
          </div>
          <nav className="mx-auto hidden items-center gap-7 text-[14px] font-medium text-slate-600 lg:flex">
            {NAV.map(n => (
              <Link key={n.label} href={n.href} className={n.label === 'Home' ? 'relative font-semibold' : 'hover:text-slate-900'} style={n.label === 'Home' ? { color: BLUE } : undefined}>
                {n.label}{n.label === 'Home' ? <span className="absolute -bottom-[15px] left-0 h-0.5 w-full" style={{ background: BLUE }} /> : null}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <button aria-label="Search" className="text-slate-500 hover:text-slate-900">⌕</button>
            <button className="flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-semibold text-white" style={{ background: 'linear-gradient(90deg,#d62b34,#b81f27)' }}>
              <span aria-hidden>☎</span> Emergency
            </button>
          </div>
        </div>
      </header>

      {/* 3. Hero */}
      <section style={{ background: 'linear-gradient(110deg,#ffffff,#eef3fa 55%,#e3edf7)' }}>
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-6 px-6 py-12 lg:grid-cols-[1.05fr_1fr_0.7fr]">
          <div>
            <h1 className="text-[44px] font-extrabold leading-[1.08]">
              <span style={{ color: NAVY }}>Healthy People,</span><br />
              <span style={{ color: GREEN }}>Stronger Nation</span>
            </h1>
            <p className="mt-3 max-w-sm text-[15px] text-slate-600">Working together for a healthier and happier tomorrow.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-semibold text-white" style={{ background: BLUE }}><span aria-hidden>🗓</span> Book Appointment</button>
              <button className="flex items-center gap-2 rounded-lg border bg-white px-5 py-2.5 text-[13px] font-semibold" style={{ borderColor: LINE, color: NAVY }}><span aria-hidden>📍</span> Find Health Facility</button>
            </div>
          </div>
          <div className="h-[280px] w-full rounded-2xl shadow-xl" role="img" aria-label="A healthy family — father, mother, son and daughter — outdoors"
            style={{ background: 'linear-gradient(135deg,#9fc1e8,#1f5fad 70%)', boxShadow: '0 20px 50px rgba(11,31,58,0.22)' }} />
          <div className="rounded-2xl border bg-white p-5 shadow-lg" style={{ borderColor: LINE }}>
            <span className="grid h-12 w-12 place-items-center rounded-full text-[18px]" style={{ background: '#fdecec', color: '#d62b34' }} aria-hidden>♥</span>
            <div className="mt-3 text-[16px] font-bold leading-snug" style={{ color: NAVY }}>Good health begins with small steps</div>
            <p className="mt-1 text-[12px] text-slate-500">Learn how you and your family can stay healthy.</p>
            <span className="mt-3 inline-block text-[12px] font-semibold" style={{ color: BLUE }}>Learn More →</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] space-y-10 px-6 py-8">
        {/* 4. Health alert banner */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: '#f6c5c5', background: '#fdeeee' }}>
          <span className="flex items-center gap-2 text-[13px] font-bold" style={{ color: '#d62b34' }}><span aria-hidden>⚠</span> HEALTH ALERT</span>
          <span className="min-w-0 flex-1 text-[13px] text-slate-700">{s.emergencyBanner.active ? s.emergencyBanner.text : 'Dengue activity is rising in several districts. Follow prevention tips and stay informed.'}</span>
          <span className="text-[12px] font-semibold" style={{ color: '#d62b34' }}>View All Alerts →</span>
        </div>

        {/* 5. Citizen quick services */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[20px] font-bold" style={{ color: NAVY }}>I want to…</h2>
            <Link href="/health/laboratory" className="text-[12px] font-semibold" style={{ color: BLUE }}>View All Services →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {QUICK.map(q => (
              <div key={q.t} className="rounded-xl border bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md" style={{ borderColor: LINE }}>
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full text-[18px] text-white" style={{ background: q.c }} aria-hidden>＋</span>
                <div className="mt-2 text-[13px] font-semibold" style={{ color: NAVY }}>{q.t}</div>
                <div className="text-[11px] text-slate-500">{q.s}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Featured cards */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl p-5 text-white shadow-md" style={{ background: `linear-gradient(135deg,${GREEN},#0b6e8c)` }}>
            <div className="text-[11px] uppercase tracking-wide opacity-80">National Vaccination Campaign</div>
            <div className="mt-1 text-[18px] font-bold">Vaccines protect you and your family</div>
            <p className="mt-1 text-[12px] opacity-90">Stay up to date with routine vaccines. Safe. Effective. Free.</p>
            <button className="mt-3 rounded-md bg-white/15 px-3 py-1.5 text-[12px] font-semibold backdrop-blur">Check Your Vaccines →</button>
          </div>
          <div className="rounded-2xl border bg-[#eef4fb] p-5 shadow-sm" style={{ borderColor: LINE }}>
            <div className="text-[15px] font-bold" style={{ color: NAVY }}>COVID-19 Update</div>
            <div className="text-[11px] text-slate-500">As of 16 May 2025</div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[['New Cases', '248'], ['Active Cases', '1,286'], ['Recovered', '98,523'], ['Deaths', '1,235']].map(([l, n]) => (
                <div key={l}><div className="text-[16px] font-bold" style={{ color: NAVY }}>{n}</div><div className="text-[9px] text-slate-500">{l}</div></div>
              ))}
            </div>
            <span className="mt-3 inline-block text-[12px] font-semibold" style={{ color: BLUE }}>View Full Report →</span>
          </div>
          <div className="rounded-2xl border p-5 shadow-sm" style={{ borderColor: '#f0e2bf', background: '#fdf6e3' }}>
            <div className="text-[11px] uppercase tracking-wide text-amber-700">Seasonal Advisory</div>
            <div className="mt-1 text-[18px] font-bold" style={{ color: '#92600e' }}>Heat Advisory</div>
            <p className="mt-1 text-[12px] text-amber-800/80">High temperatures expected in multiple regions. Stay hydrated. Avoid direct sun exposure. Check more tips.</p>
            <span className="mt-3 inline-block text-[12px] font-semibold" style={{ color: '#b8740f' }}>Read More →</span>
          </div>
        </div>

        {/* 7. Health at a glance */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[20px] font-bold" style={{ color: NAVY }}>Health at a Glance</h2>
            <span className="text-[12px] font-semibold" style={{ color: BLUE }}>View All Statistics →</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[
              ['145M+', 'Population Covered', 'Across the country'], ['72.6', 'Life Expectancy', 'Years'],
              ['103', 'Maternal Mortality', 'Per 100,000 live births'], ['18', 'Under-5 Mortality', 'Per 1,000 live births'],
              ['92%', 'Immunization Coverage', 'Full immunization (2023)'], ['2,356', 'Health Facilities', 'Across the country'],
              ['231K+', 'Health Workforce', 'Doctors, nurses & more'],
            ].map(([n, l, sub]) => (
              <div key={l} className="rounded-xl border bg-white p-3 shadow-sm" style={{ borderColor: LINE }}>
                <span className="grid h-7 w-7 place-items-center rounded-lg text-[12px]" style={{ background: '#e8f0fb', color: BLUE }} aria-hidden>◆</span>
                <div className="mt-1.5 text-[18px] font-bold" style={{ color: NAVY }}>{n}</div>
                <div className="text-[11px] font-medium text-slate-600">{l}</div>
                <div className="text-[9px] text-slate-400">{sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 8. News + initiatives + facilities */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: LINE }}>
            <div className="mb-3 flex items-center justify-between"><h3 className="text-[15px] font-bold" style={{ color: NAVY }}>Latest News</h3><span className="text-[11px] font-semibold" style={{ color: BLUE }}>View All News →</span></div>
            <div className="space-y-3">
              {NEWS.map(([t, d, dt]) => (
                <div key={t} className="flex gap-3">
                  <div className="h-14 w-16 shrink-0 rounded-lg" style={{ background: 'linear-gradient(135deg,#cfe0f3,#1f5fad)' }} aria-hidden />
                  <div><div className="text-[12px] font-semibold" style={{ color: NAVY }}>{t}</div><div className="text-[10px] text-slate-500">{d}</div><div className="text-[9px] text-slate-400">{dt}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: LINE }}>
            <div className="mb-3 flex items-center justify-between"><h3 className="text-[15px] font-bold" style={{ color: NAVY }}>Our Initiatives</h3><span className="text-[11px] font-semibold" style={{ color: BLUE }}>View All Programs →</span></div>
            <div className="space-y-3">
              {INITIATIVES.map(([t, d]) => (
                <div key={t} className="flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px]" style={{ background: '#e8f0fb', color: BLUE }} aria-hidden>✚</span>
                  <div><div className="text-[12px] font-semibold" style={{ color: NAVY }}>{t}</div><div className="text-[10px] text-slate-500">{d}</div></div>
                </div>
              ))}
            </div>
            <button className="mt-3 w-full rounded-md border py-1.5 text-[11px] font-semibold" style={{ borderColor: BLUE, color: BLUE }}>All Programs &amp; Initiatives →</button>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: LINE }}>
            <div className="mb-3 flex items-center justify-between"><h3 className="text-[15px] font-bold" style={{ color: NAVY }}>Find Health Facilities Near You</h3><span className="text-[11px] font-semibold" style={{ color: BLUE }}>View Full Map →</span></div>
            <div className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-[11px] text-slate-400" style={{ borderColor: LINE }}><span>⌕</span> Enter your location</div>
            <div className="relative mt-2 h-36 overflow-hidden rounded-lg" style={{ background: 'linear-gradient(135deg,#dde6f0,#c3d4e6)' }} role="img" aria-label="Map showing nearby health facilities">
              {[[20, 30], [55, 25], [40, 60], [70, 55], [30, 75], [80, 70]].map(([x, y], i) => (
                <span key={i} className="absolute grid h-4 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[8px] font-bold text-white" style={{ left: `${x}%`, top: `${y}%`, background: BLUE }}>H</span>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['Hospitals', 'Clinics', 'Pharmacies', 'Labs', 'More'].map((tb, i) => (
                <span key={tb} className="rounded-full px-2.5 py-0.5 text-[10px] font-medium" style={i === 0 ? { background: BLUE, color: '#fff' } : { border: `1px solid ${LINE}`, color: '#64748b' }}>{tb}</span>
              ))}
            </div>
          </div>
        </div>

        {/* 9. Service shortcut strip */}
        <div className="grid grid-cols-2 gap-4 rounded-xl border bg-[#eef4fb] px-5 py-6 shadow-sm lg:grid-cols-4" style={{ borderColor: LINE }}>
          {SHORTCUTS.map(([t, sub]) => (
            <div key={t} className="flex gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[14px]" style={{ background: '#dbe8fb', color: BLUE }} aria-hidden>▣</span>
              <div><div className="text-[12px] font-bold" style={{ color: NAVY }}>{t}</div><div className="text-[10px] text-slate-500">{sub}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* 10. Large footer */}
      <footer className="text-white/80" style={{ background: NAVY }}>
        <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-8 px-6 py-12 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <div className="flex items-center gap-2 text-[15px] font-bold text-white"><span aria-hidden>⚕</span> Ministry of Health</div>
            <p className="mt-2 text-[11px] text-white/60">Building a healthier nation through accessible, affordable and quality healthcare for all.</p>
            <div className="mt-3 flex gap-3 text-white/60">{['f', '𝕏', '▶', '◎', 'in'].map(x => <span key={x} aria-hidden>{x}</span>)}</div>
          </div>
          {[
            ['Explore', ['Health Topics', 'Services', 'Programs', 'Data & Statistics', 'News & Alerts']],
            ['Resources', ['Publications', 'Forms & Downloads', 'Media Center', 'FAQs', 'Contact Us']],
            ['About Us', ['Ministry Overview', 'Leadership', 'Careers', 'Policies', 'Transparency']],
          ].map(([h, items]) => (
            <div key={h as string}>
              <div className="text-[13px] font-semibold text-white">{h as string}</div>
              <ul className="mt-2 space-y-1.5 text-[12px] text-white/60">{(items as string[]).map(i => <li key={i}><Link href={i === 'Services' ? '/health/laboratory' : '/health'} className="hover:text-white">{i}</Link></li>)}</ul>
            </div>
          ))}
          <div>
            <div className="text-[13px] font-semibold text-white">Subscribe to our newsletter</div>
            <p className="mt-1 text-[11px] text-white/60">Get the latest updates and health tips.</p>
            <div className="mt-3 flex">
              <input placeholder="Enter your email" className="min-w-0 flex-1 rounded-l-md px-2 py-1.5 text-[12px] text-slate-800" />
              <button className="rounded-r-md px-3 py-1.5 text-[12px] font-semibold text-white" style={{ background: BLUE }}>Subscribe</button>
            </div>
          </div>
        </div>
        {/* 11. Bottom legal */}
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-6 py-4 text-[12px] text-white/60">
            <span>© 2025 Ministry of Health. All rights reserved.</span>
            <div className="flex gap-4">{['Privacy Policy', 'Terms of Use', 'Accessibility', 'Sitemap'].map(l => <Link key={l} href="/health" className="hover:text-white">{l}</Link>)}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
