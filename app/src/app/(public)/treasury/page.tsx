// Public — Ministry of Treasury & Finance homepage. Official public-facing
// sovereign-finance portal (light, institutional: warm white, navy, gold,
// emerald). Distinct from the dark operational command app. Server
// component: SSR-safe, deterministic, responsive, accessible. Imagery =
// gradient + inline classical-architecture motif (no external asset).

import Link from 'next/link';
import { publicTreasurySite } from '@/lib/gov/treasury-systems';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry of Treasury & Finance — Official Portal' };

const NAVY = '#16233d';
const GOLD = '#b58a35';
const GOLD2 = '#c9a24a';
const GREEN = '#1f9d63';
const INK = '#23303f';
const SOFT = '#5b6b78';
const LINE = '#e8e3d6';
const SERIF = 'Georgia, "Times New Roman", ui-serif, serif';

const NAV = ['Home', 'About Us', 'Pillars', 'Services', 'Data & Reports', 'Legislation', 'Newsroom'];
const QUICK_L = ['Treasury Command', 'Central Bank', 'Tax & Revenue', 'Procurement Grid'];
const QUICK_R = ['Expenditure Control', 'Economic Intelligence', 'Taxpayer Portal', 'Public Budget'];

// Six-pillar map of the Ministry of Finance, mirroring the operational
// shell taxonomy.
const PILLARS: { ordinal: string; label: string; href: string; tagline: string; glyph: string }[] = [
  { ordinal: 'I',   label: 'National Treasury Command',    href: '/treasury', tagline: 'Sovereign fiscal posture · Single Account · Daily statement', glyph: '⌘' },
  { ordinal: 'II',  label: 'Central Bank Operations',      href: '/treasury', tagline: 'GovPay · CBDC · Settlement · FX reserves · Public debt', glyph: '◴' },
  { ordinal: 'III', label: 'Tax & Revenue Intelligence',   href: '/treasury', tagline: 'Tax · Customs · Taxpayer registry · e-Invoicing · Risk-based audit', glyph: '▤' },
  { ordinal: 'IV',  label: 'National Procurement Grid',    href: '/treasury', tagline: 'Tenders · Contracts · Vendors · Milestone escrow', glyph: '⊟' },
  { ordinal: 'V',   label: 'Public Expenditure Control',   href: '/treasury', tagline: 'Appropriation ledger · Funding chains · Cross-ministry allocation', glyph: '⊡' },
  { ordinal: 'VI',  label: 'Economic Intelligence Center', href: '/treasury', tagline: 'Macro stability · 25y forecast · Audit trail · Anti-fraud', glyph: '✦' },
];
const SEG_C = [GREEN, '#2bb377', GOLD2, GOLD, '#caa75a', '#cfd2cb'];

function Crest({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <circle cx="24" cy="24" r="22" fill="none" stroke={GOLD} strokeWidth="1.4" />
      <circle cx="24" cy="24" r="18" fill="none" stroke={GOLD} strokeWidth="0.7" opacity="0.5" />
      <line x1="24" y1="11" x2="24" y2="35" stroke={GOLD} strokeWidth="1.6" />
      <line x1="12" y1="16" x2="36" y2="16" stroke={GOLD} strokeWidth="1.6" />
      <circle cx="24" cy="11" r="2.2" fill={GOLD} />
      <path d="M12 16 L8 25 Q12 28.5 16 25 Z" fill="none" stroke={GOLD} strokeWidth="1.2" />
      <path d="M36 16 L32 25 Q36 28.5 40 25 Z" fill="none" stroke={GOLD} strokeWidth="1.2" />
      <path d="M18 35 H30 L32 39 H16 Z" fill={GOLD} />
    </svg>
  );
}

// Bright photographic-style classical treasury building (gradient + SVG).
function TreasuryBuilding() {
  return (
    <div className="absolute inset-0" aria-hidden
      style={{ background: 'linear-gradient(120deg,#ffffff 0%,#fbfaf5 38%,#eaeef3 60%,#dfe7ef 100%)' }}>
      <svg viewBox="0 0 520 400" preserveAspectRatio="xMaxYMid slice" className="h-full w-full">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d8e6f2" /><stop offset="1" stopColor="#eef3f7" />
          </linearGradient>
          <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4f1e8" /><stop offset="1" stopColor="#d8d2c2" />
          </linearGradient>
        </defs>
        <rect x="180" width="340" height="400" fill="url(#sky)" />
        <rect x="220" y="300" width="300" height="100" fill="#cfd8c9" opacity="0.6" />
        {/* dome */}
        <ellipse cx="360" cy="120" rx="34" ry="40" fill="url(#stone)" />
        <rect x="356" y="74" width="8" height="16" fill={GOLD} opacity="0.7" />
        {/* pediment */}
        <polygon points="360,150 446,196 274,196" fill="url(#stone)" />
        <polygon points="360,158 432,196 288,196" fill="none" stroke="#c3bba6" strokeWidth="1.2" />
        {/* entablature */}
        <rect x="266" y="196" width="188" height="14" fill="url(#stone)" />
        {/* colonnade */}
        {[280, 300, 320, 340, 360, 380, 400, 420, 440].map(x => (
          <rect key={x} x={x} y="210" width="11" height="120" fill="url(#stone)" stroke="#cfc7b2" strokeWidth="0.6" />
        ))}
        {/* steps + base */}
        <rect x="262" y="330" width="200" height="10" fill="#e3ddcd" />
        <rect x="252" y="340" width="220" height="10" fill="#d7d0bd" />
        <rect x="242" y="350" width="240" height="14" fill="#cbc4b0" />
      </svg>
    </div>
  );
}

function BudgetDonut({ segments, total, size = 188 }: {
  segments: { label: string; amount: string; pct: number }[]; total: string; size?: number;
}) {
  const sum = segments.reduce((s, x) => s + x.pct, 0) || 1;
  const r = size / 2 - 16, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eceae1" strokeWidth="20" />
        {segments.map((s, i) => {
          const frac = s.pct / sum;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={SEG_C[i % SEG_C.length]} strokeWidth="20"
              strokeDasharray={`${frac * circ} ${circ}`} strokeDashoffset={-acc * circ}
              transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          );
          acc += frac;
          return el;
        })}
        <circle cx={size / 2} cy={size / 2} r={r - 18} fill="#fff" />
        <text x="50%" y="46%" textAnchor="middle" fontSize="10" fill={SOFT}
          className="uppercase" style={{ letterSpacing: '0.14em' }}>Total Budget</text>
        <text x="50%" y="58%" textAnchor="middle" fontSize="21" fontWeight="700"
          fill={NAVY} style={{ fontFamily: SERIF }}>{total}</text>
      </svg>
      <div className="min-w-[210px] flex-1 space-y-2">
        {segments.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2 text-[12px]">
            <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: SEG_C[i % SEG_C.length] }} />
            <span style={{ color: INK }}>{s.label}</span>
            <span className="ml-auto font-semibold tabular-nums" style={{ color: NAVY }}>{s.amount}</span>
            <span className="w-9 text-right tabular-nums" style={{ color: SOFT }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PublicTreasuryHomepage() {
  const s = publicTreasurySite(100); // deterministic, SSR-stable

  return (
    <div className="min-h-screen" style={{ background: '#ffffff', color: INK }}>
      {/* 1. Header */}
      <header className="sticky top-0 z-20 border-b bg-white" style={{ borderColor: LINE }}>
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-8 gap-y-3 px-6 py-3">
          <Link href="/treasury" className="flex items-center gap-3">
            <Crest />
            <div className="leading-tight">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: GOLD }}>Ministry of</div>
              <div className="text-[22px] font-bold leading-none tracking-tight" style={{ color: NAVY, fontFamily: SERIF }}>Treasury &amp; Finance</div>
              <div className="mt-1 text-[8.5px] uppercase tracking-[0.18em]" style={{ color: GOLD }}>Fiscal Stewardship · Reserve Protection · Economic Continuity</div>
            </div>
          </Link>
          <nav className="ml-auto hidden items-center gap-6 text-[13px] font-medium lg:flex" style={{ color: SOFT }}>
            {['Careers', 'Publications', 'Transparency', 'Contact'].map(l => (
              <Link key={l} href="/treasury" className="hover:text-slate-900">{l}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-[12px]" style={{ borderColor: LINE, color: SOFT }}>
              <span aria-hidden>⌕</span>
              <input aria-label="Search" placeholder="Search…" className="w-28 bg-transparent outline-none placeholder:text-slate-400" />
            </label>
            <Link href="/gov/treasury" className="flex items-center gap-2 rounded-md px-4 py-2 text-[12px] font-semibold text-white"
              style={{ background: NAVY }}>
              <span aria-hidden>🔒</span> ACCESS PORTAL
            </Link>
          </div>
        </div>
        {/* primary nav */}
        <div className="border-t" style={{ borderColor: LINE }}>
          <div className="mx-auto flex max-w-[1280px] items-center gap-8 px-6">
            {NAV.map((n, i) => (
              <Link key={n} href="/treasury"
                className="relative py-3 text-[12px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: i === 0 ? NAVY : SOFT }}>
                {n}
                {i === 0 ? <span className="absolute inset-x-0 -bottom-px h-0.5" style={{ background: GOLD }} /> : null}
              </Link>
            ))}
            <span className="ml-auto text-[14px]" aria-hidden>⚑</span>
          </div>
        </div>
      </header>

      {/* 2. Hero */}
      <section className="relative overflow-hidden" style={{ borderBottom: `1px solid ${LINE}` }}>
        <TreasuryBuilding />
        <div className="relative mx-auto max-w-[1280px] px-6 py-16">
          <div className="max-w-xl">
            <div className="text-[12px] font-bold uppercase tracking-[0.28em]" style={{ color: GOLD }}>National Treasury Command</div>
            <h1 className="mt-3 text-[40px] font-bold uppercase leading-[1.12]" style={{ color: NAVY, fontFamily: SERIF }}>
              Stewarding National Wealth.<br />Securing Generational Prosperity.
            </h1>
            <p className="mt-4 max-w-md text-[14px] leading-relaxed" style={{ color: SOFT }}>
              We safeguard the Nation&rsquo;s financial foundation through disciplined
              stewardship, prudent allocation, and sustainable economic management.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/treasury" className="flex items-center gap-2 rounded-md px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-white" style={{ background: NAVY }}>
                Our Mandate <span aria-hidden>→</span>
              </Link>
              <Link href="/gov/treasury" className="flex items-center gap-2 rounded-md border bg-white/80 px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] backdrop-blur" style={{ borderColor: LINE, color: NAVY }}>
                View Fiscal Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] space-y-8 px-6 py-10">
        {/* 2b. Six pillars of sovereign finance */}
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[20px] font-bold" style={{ color: NAVY, fontFamily: SERIF }}>The Six Pillars of Sovereign Finance</h2>
            <span className="text-[11px]" style={{ color: SOFT }}>{PILLARS.length} pillars · 29 surfaces · 1 citizen portal</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map(p => (
              <Link key={p.ordinal} href={p.href}
                className="rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                style={{ borderColor: LINE }}>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded text-[16px] font-bold"
                    style={{ background: '#f6efde', color: GOLD }} aria-hidden>{p.glyph}</span>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: GOLD }}>Pillar {p.ordinal}</div>
                    <div className="text-[14px] font-bold" style={{ color: NAVY, fontFamily: SERIF }}>{p.label}</div>
                  </div>
                </div>
                <p className="mt-2 text-[11.5px] leading-relaxed" style={{ color: SOFT }}>{p.tagline}</p>
                <div className="mt-2 text-[11px] font-semibold" style={{ color: GREEN }}>Browse pillar →</div>
              </Link>
            ))}
          </div>
        </section>

        {/* 3. Three info cards */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Fiscal snapshot */}
          <section className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: LINE }}>
            <div className="flex items-baseline justify-between border-b pb-2" style={{ borderColor: LINE }}>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: NAVY }}>Fiscal Snapshot</h2>
              <span className="text-[10px]" style={{ color: SOFT }}>As of {s.asOf}</span>
            </div>
            <div className="mt-3 space-y-2.5">
              {s.snapshot.map(r => (
                <div key={r.label} className="flex items-center gap-2 text-[12px]">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded text-[10px]" style={{ background: '#f3efe2', color: GOLD }} aria-hidden>◆</span>
                  <span className="min-w-0 flex-1" style={{ color: SOFT }}>{r.label}</span>
                  <span className="font-semibold tabular-nums" style={{ color: NAVY }}>{r.value}</span>
                  {r.delta ? <span className="w-14 text-right font-semibold tabular-nums" style={{ color: GREEN }}>{r.delta}</span> : null}
                  {r.tag ? <span className="w-24 text-right text-[10px] font-bold uppercase tracking-wide" style={{ color: r.tag === 'SUSTAINABLE' || r.tag === 'ADEQUATE' || r.tag.includes('MONTHS') ? GREEN : GOLD }}>{r.tag}</span> : null}
                </div>
              ))}
            </div>
            <Link href="/gov/treasury" className="mt-3 block border-t pt-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ borderColor: LINE, color: GOLD }}>
              View Full Fiscal Dashboard →
            </Link>
          </section>

          {/* Budget allocation */}
          <section className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: LINE }}>
            <div className="flex items-baseline justify-between border-b pb-2" style={{ borderColor: LINE }}>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: NAVY }}>Budget Allocation Overview</h2>
              <span className="text-[10px]" style={{ color: SOFT }}>FY 2025</span>
            </div>
            <div className="mt-4">
              <BudgetDonut total={s.budget.total} segments={s.budget.segments} />
            </div>
            <Link href="/gov/treasury" className="mt-4 block border-t pt-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ borderColor: LINE, color: GOLD }}>
              View Budget Details →
            </Link>
          </section>

          {/* Market indicators */}
          <section className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: LINE }}>
            <div className="flex items-baseline justify-between border-b pb-2" style={{ borderColor: LINE }}>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: NAVY }}>Market &amp; Economic Indicators</h2>
              <span className="text-[10px]" style={{ color: SOFT }}>Live Updates</span>
            </div>
            <div className="mt-3 space-y-3">
              {s.indicators.map(r => (
                <div key={r.label} className="flex items-center justify-between gap-2 text-[12px]">
                  <span style={{ color: SOFT }}>{r.label}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums" style={{ color: NAVY }}>{r.value}</span>
                    <span className="w-16 text-right text-[11px] tabular-nums" style={{ color: r.flat ? SOFT : GREEN }}>
                      {r.flat ? '—' : `${r.delta > 0 ? '+' : ''}${r.delta.toFixed(2)}% ${r.delta > 0 ? '↑' : '↓'}`}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <Link href="/gov/treasury" className="mt-3 block border-t pt-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ borderColor: LINE, color: GOLD }}>
              View Economic Dashboard →
            </Link>
          </section>
        </div>

        {/* 4. Latest updates + quick links */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: LINE }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[14px] font-bold uppercase tracking-[0.14em]" style={{ color: NAVY }}>Latest Updates</h2>
              <Link href="/treasury" className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: GOLD }}>View All News →</Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {s.updates.map(u => (
                <article key={u.title} className="flex flex-col rounded-md border p-3" style={{ borderColor: LINE }}>
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: GOLD }}>{u.kind}</div>
                  <div className="mt-2 flex-1 text-[12.5px] font-semibold leading-snug" style={{ color: NAVY }}>{u.title}</div>
                  <div className="mt-3 border-t pt-2 text-[9.5px] uppercase tracking-[0.12em]" style={{ borderColor: LINE, color: SOFT }}>{u.date}</div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-lg border bg-white p-5 shadow-sm" style={{ borderColor: LINE }}>
            <h2 className="mb-4 text-[14px] font-bold uppercase tracking-[0.14em]" style={{ color: NAVY }}>Quick Links</h2>
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
              {[QUICK_L, QUICK_R].map((col, ci) => (
                <ul key={ci} className="space-y-1">
                  {col.map(l => (
                    <li key={l}>
                      <Link href="/gov/treasury" className="flex items-center justify-between gap-2 rounded px-2 py-2 text-[12px] hover:bg-[#faf8f1]" style={{ color: INK }}>
                        <span className="flex items-center gap-2"><span style={{ color: GOLD }} aria-hidden>▸</span>{l}</span>
                        <span style={{ color: GOLD }} aria-hidden>→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* 5. Footer */}
      <footer className="text-white/75" style={{ background: NAVY }}>
        <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-8 px-6 py-12 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2">
            <div className="flex items-center gap-3">
              <Crest size={38} />
              <div className="leading-tight">
                <div className="text-[15px] font-bold text-white" style={{ fontFamily: SERIF }}>MINISTRY OF TREASURY &amp; FINANCE</div>
                <div className="text-[9px] uppercase tracking-[0.22em]" style={{ color: GOLD2 }}>Sovereign Financial System</div>
              </div>
            </div>
            <div className="mt-4 text-[12px] font-semibold text-white">Follow Us</div>
            <div className="mt-2 flex gap-3 text-white/55">{['𝕏', 'in', '▶', '✉'].map(x => <span key={x} className="grid h-7 w-7 place-items-center rounded-full border border-white/15" aria-hidden>{x}</span>)}</div>
          </div>
          {[
            ['About', ['Our Mandate', 'Leadership', 'Organization']],
            ['Resources', ['Reports & Publications', 'Data Center', 'Legislation']],
            ['Help', ['FAQ', 'Contact Us', 'Feedback']],
          ].map(([h, items]) => (
            <div key={h as string}>
              <div className="text-[12px] font-semibold text-white">{h as string}</div>
              <ul className="mt-3 space-y-2 text-[12px] text-white/55">
                {(items as string[]).map(i => <li key={i}><Link href="/treasury" className="hover:text-white">{i}</Link></li>)}
              </ul>
            </div>
          ))}
          <div>
            <div className="text-[12px] font-semibold text-white">Subscribe</div>
            <p className="mt-2 text-[11px] text-white/55">Stay updated with our latest news and publications.</p>
            <div className="mt-3 flex">
              <input aria-label="Email" placeholder="Enter your email" className="min-w-0 flex-1 rounded-l-md px-2 py-1.5 text-[12px] text-slate-800 outline-none" />
              <button className="rounded-r-md px-3 py-1.5 text-[12px] font-semibold text-white" style={{ background: GOLD }} aria-hidden>→</button>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-6 py-4 text-[11px] text-white/55">
            <span>© 2025 Ministry of Treasury &amp; Finance. All rights reserved.</span>
            <span className="font-semibold uppercase tracking-[0.22em]" style={{ color: GOLD2 }}>Sovereignty · Stability · Prosperity</span>
            <div className="flex gap-4">{['Privacy Policy', 'Terms of Use', 'Accessibility'].map(l => <Link key={l} href="/treasury" className="hover:text-white">{l}</Link>)}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
