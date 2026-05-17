// Public — Ministry of Health · Laboratory Services.
// A public government healthcare portal page (light, institutional, navy
// header/footer, blue accent). Distinct from the dark operational
// /app/health/lab subsystem. Server component: SSR-safe, deterministic,
// fully responsive. Imagery is rendered as clinical gradient placeholders.

import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Laboratory Services — Ministry of Health' };

const NAVY = '#0b1f3a';
const NAVY2 = '#0e2748';
const BLUE = '#1f5fad';
const LINE = '#e5e7eb';

const SIDEBAR = [
  'Laboratory Services', 'Tests & Packages', 'Find a Lab', 'Book a Test',
  'Sample Collection', 'Reports & Results', 'Quality & Safety',
  'Rules & Guidelines', 'Training & Resources', 'FAQs',
];
const QUICK = [
  { t: 'Book a Test', s: 'Schedule your lab test', c: '#1f5fad' },
  { t: 'Find a Lab', s: 'Locate labs near you', c: '#0f9d6b' },
  { t: 'View Packages', s: 'Explore health packages', c: '#7c5cff' },
  { t: 'Sample Collection', s: 'Book home collection', c: '#e08a2b' },
  { t: 'Reports & Results', s: 'View your reports', c: '#1f5fad' },
];
const TESTS = [
  { n: 'Complete Blood Count', d: 'Measures different components of your blood.', cat: 'Blood Test', p: '8.50' },
  { n: 'Lipid Profile', d: 'Measures cholesterol and triglyceride levels.', cat: 'Blood Test', p: '12.00' },
  { n: 'Thyroid Profile (T3, T4, TSH)', d: 'Evaluates thyroid gland function.', cat: 'Blood Test', p: '15.00' },
  { n: 'Urinalysis', d: 'Checks for infections, kidney problems and more.', cat: 'Urine Test', p: '6.00' },
];
const WHY = [
  { t: 'NABL Accredited Labs', s: 'High quality and reliable results' },
  { t: 'Trained Professionals', s: 'Experienced and certified staff' },
  { t: 'Advanced Technology', s: 'State-of-the-art equipment' },
  { t: 'Timely Reports', s: 'Accurate results on time' },
  { t: 'Safe & Hygienic', s: 'Strict safety and hygiene protocols' },
];
const STATS = [
  ['2,356+', 'Accredited Laboratories'], ['12 Cr+', 'Tests Conducted'],
  ['98.6%', 'Accuracy Rate'], ['24 – 48 hrs', 'Report Turnaround Time'], ['500+', 'Cities Covered'],
];

export default function LaboratoryServicesPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#1a2332]">
      {/* 1. Top utility bar */}
      <div className="w-full text-[12px] text-white/85" style={{ background: NAVY }}>
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-2">
          <span className="flex items-center gap-2"><span aria-hidden>⌂</span> Official Website of the Ministry of Health</span>
          <div className="flex items-center gap-4">
            <span className="hidden gap-1.5 sm:flex"><button className="hover:text-white">A+</button><button className="hover:text-white">A</button><button className="hover:text-white">A-</button></span>
            <span className="opacity-40">|</span>
            <span className="hover:text-white">English ▾</span>
            <span className="hidden sm:inline hover:text-white">Accessibility</span>
            <span className="hover:text-white">Contact Us</span>
            <span className="hidden sm:inline hover:text-white">Help</span>
          </div>
        </div>
      </div>

      {/* 2. Main header */}
      <header className="border-b bg-white" style={{ borderColor: LINE }}>
        <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full text-[16px] font-bold text-white" style={{ background: NAVY }} aria-hidden>⚕</span>
            <div className="leading-tight">
              <div className="text-[18px] font-bold tracking-tight" style={{ color: NAVY }}>Ministry of Health</div>
              <div className="text-[11px] text-slate-500">For a Healthier Nation</div>
            </div>
          </div>
          <nav className="mx-auto hidden items-center gap-7 text-[14px] font-medium text-slate-600 lg:flex">
            {['Home', 'Health Topics', 'Services', 'Find Facilities', 'Programs', 'News & Alerts', 'About Us'].map(n => (
              <Link key={n} href={n === 'Services' ? '/health/laboratory' : '/health'} className={n === 'Services' ? 'relative font-semibold' : 'hover:text-slate-900'} style={n === 'Services' ? { color: BLUE } : undefined}>
                {n}{n === 'Services' ? <span className="absolute -bottom-[18px] left-0 h-0.5 w-full" style={{ background: BLUE }} /> : null}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <button aria-label="Search" className="text-slate-500 hover:text-slate-900">⌕</button>
            <button className="flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-semibold text-white" style={{ background: '#d62b34' }}>
              <span aria-hidden>☎</span> Emergency
            </button>
          </div>
        </div>
      </header>

      {/* 3. Hero */}
      <section className="relative" style={{ background: 'linear-gradient(105deg,#eaf1fb,#dfeaf8 55%,#cfe0f3)' }}>
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-6 px-6 py-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <nav className="mb-3 flex items-center gap-2 text-[12px] text-slate-500">
              <Link href="/health" className="hover:underline">Home</Link><span>›</span><span>Services</span><span>›</span><span className="font-medium text-slate-700">Laboratory Services</span>
            </nav>
            <h1 className="text-[40px] font-bold leading-tight" style={{ color: NAVY }}>Laboratory Services</h1>
            <p className="mt-2 text-[16px] text-slate-600">Accurate testing. Reliable results. Better health outcomes.</p>
          </div>
          <div className="relative">
            <div className="h-[220px] w-full rounded-2xl shadow-lg" role="img" aria-label="Laboratory scientist at a microscope in a clinical environment"
              style={{ background: 'linear-gradient(135deg,#1f5fad,#0b1f3a 70%)', boxShadow: '0 16px 40px rgba(11,31,58,0.25)' }} />
            <div className="mt-4 rounded-xl border bg-white p-4 shadow-md lg:absolute lg:-right-2 lg:top-2 lg:mt-0 lg:w-[230px]" style={{ borderColor: LINE }}>
              <div className="text-[15px] font-semibold" style={{ color: NAVY }}>Need help?</div>
              <p className="mt-1 text-[12px] text-slate-500">Talk to our support team for lab-related queries.</p>
              <button className="mt-3 w-full rounded-md border px-3 py-2 text-[12px] font-semibold" style={{ borderColor: BLUE, color: BLUE }}>◔ Contact Support</button>
            </div>
          </div>
        </div>
      </section>

      {/* 4 + 5. Sidebar + main content */}
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-4">
          <nav className="rounded-xl border bg-white p-2 shadow-sm" style={{ borderColor: LINE }}>
            {SIDEBAR.map((s, i) => (
              <div key={s} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px]"
                style={i === 0 ? { background: BLUE, color: '#fff', fontWeight: 600 } : { color: '#475569' }}>
                <span aria-hidden className="opacity-70">▣</span>{s}
              </div>
            ))}
          </nav>
          <div className="rounded-xl border bg-white p-3 shadow-sm" style={{ borderColor: LINE }}>
            <div className="px-1 pb-2 text-[13px] font-semibold" style={{ color: NAVY }}>Shortcuts</div>
            {['Download Test Catalog', 'Laboratory Network', 'Feedback & Complaints'].map(s => (
              <div key={s} className="flex items-center justify-between px-1 py-2 text-[12px] text-slate-600">
                <span className="flex items-center gap-2"><span aria-hidden className="opacity-60">⤓</span>{s}</span><span style={{ color: BLUE }}>→</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main className="space-y-6">
          {/* 5A notice */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm" style={{ borderColor: LINE }}>
            <span className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: BLUE }}><span aria-hidden>ⓘ</span> Important Notice</span>
            <span className="min-w-0 flex-1 text-[13px] text-slate-600">Fasting is recommended for certain tests. Please check test instructions or consult our support.</span>
            <span className="text-[12px] font-medium" style={{ color: BLUE }}>View All Notices →</span>
          </div>

          {/* 5B quick tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {QUICK.map(q => (
              <div key={q.t} className="rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md" style={{ borderColor: LINE }}>
                <span className="grid h-9 w-9 place-items-center rounded-lg text-[15px] text-white" style={{ background: q.c }} aria-hidden>▦</span>
                <div className="mt-2 text-[13px] font-semibold" style={{ color: NAVY }}>{q.t}</div>
                <div className="text-[11px] text-slate-500">{q.s}</div>
              </div>
            ))}
          </div>

          {/* 5C + 5D */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_280px]">
            <div className="rounded-xl border bg-white p-5 shadow-sm" style={{ borderColor: LINE }}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[17px] font-bold" style={{ color: NAVY }}>Popular Tests &amp; Packages</h2>
                <span className="text-[12px] font-medium" style={{ color: BLUE }}>View All Tests →</span>
              </div>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {TESTS.map(tst => (
                  <div key={tst.n} className="overflow-hidden rounded-xl border shadow-sm" style={{ borderColor: LINE }}>
                    <div className="h-24 w-full" role="img" aria-label={`${tst.n} sample`} style={{ background: 'linear-gradient(135deg,#cfe0f3,#1f5fad)' }} />
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-1">
                        <div className="text-[12px] font-semibold leading-tight" style={{ color: NAVY }}>{tst.n}</div>
                      </div>
                      <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide" style={{ background: '#e8f0fb', color: BLUE }}>{tst.cat}</span>
                      <p className="mt-1 text-[10px] text-slate-500">{tst.d}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[14px] font-bold" style={{ color: NAVY }}>$ {tst.p}</span>
                        <button className="rounded-md border px-2.5 py-1 text-[10px] font-semibold" style={{ borderColor: BLUE, color: BLUE }}>Book Now</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm" style={{ borderColor: LINE }}>
              <h2 className="mb-3 text-[15px] font-bold" style={{ color: NAVY }}>Why Choose Our Labs?</h2>
              <div className="space-y-3">
                {WHY.map(w => (
                  <div key={w.t} className="flex gap-2.5">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px]" style={{ background: '#e8f0fb', color: BLUE }} aria-hidden>✦</span>
                    <div><div className="text-[12px] font-semibold" style={{ color: NAVY }}>{w.t}</div><div className="text-[10px] text-slate-500">{w.s}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 5E stats strip */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border bg-white px-5 py-6 shadow-sm sm:grid-cols-3 lg:grid-cols-5" style={{ borderColor: LINE }}>
            {STATS.map(([n, l]) => (
              <div key={l} className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg text-[14px]" style={{ background: '#e8f0fb', color: BLUE }} aria-hidden>◆</span>
                <div><div className="text-[18px] font-bold" style={{ color: NAVY }}>{n}</div><div className="text-[10px] text-slate-500">{l}</div></div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* 6. Footer */}
      <footer className="border-t bg-[#eef1f5]" style={{ borderColor: LINE }}>
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-8 px-6 py-10 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <div className="text-[14px] font-bold" style={{ color: NAVY }}>Stay Updated</div>
            <p className="mt-1 text-[12px] text-slate-500">Subscribe to our newsletter for latest health updates.</p>
            <div className="mt-3 flex">
              <input placeholder="Enter your email" className="min-w-0 flex-1 rounded-l-md border px-2 py-1.5 text-[12px]" style={{ borderColor: LINE }} />
              <button className="rounded-r-md px-3 py-1.5 text-[12px] font-semibold text-white" style={{ background: BLUE }}>Subscribe</button>
            </div>
          </div>
          {[
            ['Health Resources', ['Health Library', 'Health Calculators', 'Wellness Tips', 'Health Videos']],
            ['Support', ['Help Center', 'Contact Us', 'Feedback', 'Report an Issue']],
            ['Other Links', ['Health Education', 'Careers', 'Tenders', 'RTI & Transparency']],
          ].map(([h, items]) => (
            <div key={h as string}>
              <div className="text-[13px] font-semibold" style={{ color: NAVY }}>{h as string}</div>
              <ul className="mt-2 space-y-1.5 text-[12px] text-slate-500">
                {(items as string[]).map(it => <li key={it} className="hover:text-slate-800">{it}</li>)}
              </ul>
            </div>
          ))}
          <div>
            <div className="text-[13px] font-semibold" style={{ color: NAVY }}>Connect with us</div>
            <div className="mt-2 flex gap-3 text-slate-500">{['f', '𝕏', '▶', '◎', 'in'].map(s => <span key={s} aria-hidden>{s}</span>)}</div>
            <div className="mt-3 text-[12px] font-semibold" style={{ color: NAVY }}>Download Our App</div>
            <div className="mt-1.5 flex gap-2">
              <span className="rounded-md px-3 py-1.5 text-[10px] text-white" style={{ background: NAVY }}>Google Play</span>
              <span className="rounded-md px-3 py-1.5 text-[10px] text-white" style={{ background: NAVY }}>App Store</span>
            </div>
          </div>
        </div>
      </footer>

      {/* 7. Bottom footer */}
      <div className="text-white/80" style={{ background: NAVY }}>
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-6 py-4 text-[12px]">
          <span className="flex items-center gap-2 font-semibold text-white"><span aria-hidden>⚕</span> Ministry of Health</span>
          <span>© 2025 Ministry of Health. All rights reserved.</span>
          <div className="flex gap-4">{['Privacy Policy', 'Terms of Use', 'Accessibility', 'Sitemap'].map(l => <span key={l} className="hover:text-white">{l}</span>)}</div>
        </div>
      </div>
    </div>
  );
}
