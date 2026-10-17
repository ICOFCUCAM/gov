'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { substrateAvailable } from '@/lib/db/client';

const GOLD = '#c9a85c';
const GOLD_SOFT = '#e3cc8f';
const NAVY = '#070b14';

type Path = 'officer' | 'citizen' | 'institution';

const PATHS: { k: Path; icon: React.ReactNode; title: string; sub: string }[] = [
  { k: 'officer', title: 'I serve in government', sub: 'Officers, ministries and the executive — sign in with your work email.', icon: <IconPerson /> },
  { k: 'citizen', title: 'I am a citizen', sub: 'Open your Civic Wallet — services, records and receipts.', icon: <IconWallet /> },
  { k: 'institution', title: 'Set up a new institution', sub: 'Compose a ministry or agency from a sovereign archetype.', icon: <IconBuilding /> },
];

const PUBLIC_LINKS = [
  { l: 'Government Directory', href: '/government' },
  { l: 'Citizen Portal', href: '/portal' },
  { l: 'Verify a Document', href: '/wallet/documents' },
  { l: 'National Briefing', href: '/noc' },
  { l: 'Developers', href: '/developers' },
];

/** Demo session — the same cookie /login sets and middleware checks under
 *  CIVICOS_AUTH=enforce. Used only when no identity substrate is configured. */
function setDemoSession() {
  document.cookie = `civicos_session=demo; path=/; max-age=${60 * 60 * 8}; samesite=lax`;
}

/**
 * Cover gate — the first thing anyone meets. Chooses an entry path and hands
 * off to the existing sign-in surfaces (/sign-in, /login); never replaces them.
 */
export function CoverGate() {
  const router = useRouter();
  const [path, setPath] = React.useState<Path>('officer');
  const [email, setEmail] = React.useState('');
  const [live, setLive] = React.useState<boolean | null>(null);
  React.useEffect(() => { setLive(substrateAvailable()); }, []);

  function enter(e: React.FormEvent) {
    e.preventDefault();
    if (path === 'citizen') { router.push('/login?from=/wallet'); return; }
    const dest = path === 'officer' ? '/command' : '/ministries';
    if (live) {
      const q = new URLSearchParams({ from: dest });
      if (email.trim()) q.set('email', email.trim().toLowerCase());
      if (path === 'institution') q.set('mode', 'sign-up');
      router.push(`/sign-in?${q.toString()}`);
      return;
    }
    setDemoSession();
    router.push(dest);
  }

  const cta = path === 'citizen' ? 'Open Civic Wallet' : path === 'institution' ? 'Begin setup' : 'Continue';

  return (
    <main className="relative min-h-screen overflow-hidden font-sans text-[#e8ebf2]" style={{ background: NAVY }}>
      <Backdrop />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[460px] flex-col items-center px-4 pb-10 pt-10 sm:pt-14">
        <Seal />
        <p className="mt-5 text-[11px] font-semibold tracking-[0.42em]" style={{ color: GOLD }}>CIVICOS</p>
        <div aria-hidden className="mt-3 flex items-center gap-2" style={{ color: GOLD }}>
          <span className="h-px w-12" style={{ background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
          <span className="text-[8px]">◆</span>
          <span className="h-px w-12" style={{ background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
        </div>

        <h1 className="mt-5 text-center font-serif text-[2.1rem] font-semibold leading-[1.12] tracking-tight sm:text-[2.5rem]">
          One nation,<br />
          <em className="font-serif italic" style={{ color: GOLD_SOFT }}>one operating system</em>
        </h1>
        <p className="mt-3 text-center text-[15px] text-[#aab3c5]">
          Sign in to the sovereign platform for government, institutions and citizens.
        </p>

        <form onSubmit={enter} className="mt-8 w-full space-y-3">
          <fieldset className="space-y-3">
            <legend className="sr-only">How are you entering?</legend>
            {PATHS.map(p => {
              const on = p.k === path;
              return (
                <label key={p.k}
                  className="flex cursor-pointer items-center gap-4 rounded-xl border px-4 py-3.5 transition-colors focus-within:ring-2"
                  style={{
                    borderColor: on ? `${GOLD}aa` : '#1e2638',
                    background: on ? 'linear-gradient(180deg, rgba(201,168,92,0.10), rgba(201,168,92,0.03))' : 'rgba(14,20,34,0.75)',
                    ['--tw-ring-color' as string]: `${GOLD}66`,
                  }}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border"
                    style={{ borderColor: on ? `${GOLD}88` : '#2a3348', color: on ? GOLD_SOFT : '#8d97ab' }}>
                    {p.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-[#eef1f7]">{p.title}</span>
                    <span className="block text-[13px] leading-snug text-[#8d97ab]">{p.sub}</span>
                  </span>
                  <input type="radio" name="path" value={p.k} checked={on} onChange={() => setPath(p.k)} className="sr-only" />
                  <span aria-hidden className="grid h-4 w-4 shrink-0 place-items-center rounded-full border"
                    style={{ borderColor: on ? GOLD : '#3a4459' }}>
                    {on ? <span className="h-2 w-2 rounded-full" style={{ background: GOLD }} /> : null}
                  </span>
                </label>
              );
            })}
          </fieldset>

          <div className="mt-5 rounded-xl border px-5 py-5 sm:px-7 sm:py-6"
            style={{ borderColor: '#1e2638', background: 'rgba(12,18,31,0.85)', boxShadow: '0 20px 50px -20px rgba(0,0,0,0.7)' }}>
            {path === 'citizen' ? (
              <p className="text-[13px] leading-relaxed text-[#aab3c5]">
                Verify on this device, with an authorised agent, or at any government office.
                No social login. No password to steal.
              </p>
            ) : (
              <>
                <label htmlFor="cover-email" className="block text-[13px] font-medium text-[#d5dbe6]">Work email</label>
                <input id="cover-email" type="email" autoComplete="email" value={email}
                  onChange={e => setEmail(e.currentTarget.value)}
                  placeholder="name@institution.gov"
                  className="mt-2 w-full rounded-lg border bg-[#0a0f1b] px-4 py-3 text-[15px] text-[#eef1f7] placeholder:text-[#5d667a] focus:outline-none focus:ring-2"
                  style={{ borderColor: '#28314a', ['--tw-ring-color' as string]: `${GOLD}66` }} />
              </>
            )}

            <button type="submit"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-[15px] font-semibold text-[#1a1406] transition-[filter] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0c121f]"
              style={{ background: `linear-gradient(180deg, ${GOLD_SOFT}, ${GOLD})`, ['--tw-ring-color' as string]: GOLD }}>
              {cta} <span aria-hidden>→</span>
            </button>

            <p className="mt-4 text-[12px] leading-relaxed text-[#7f899d]">
              {live === false
                ? 'Prototype mode — no identity substrate is configured, so you enter with a demo session.'
                : path === 'citizen'
                  ? 'You choose how to verify on the next step.'
                  : 'You will confirm with the password set from your invitation. Your institution’s own sign-in is honoured where configured.'}
            </p>
          </div>
        </form>

        <nav aria-label="Public services" className="mt-8 w-full">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-[#6c7589]">Public services — no sign-in</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
            {PUBLIC_LINKS.map(l => (
              <li key={l.href}>
                <Link href={l.href} className="text-[13px] text-[#aab3c5] underline-offset-4 hover:text-[#eef1f7] hover:underline">{l.l}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <footer className="mt-auto pt-10 text-center text-[11px] leading-relaxed text-[#5d667a]">
          Humans govern · Institutions govern · Constitutions govern · AI assists
          <br />© {new Date().getFullYear()} CivicOS · Sovereign Operating System
        </footer>
      </div>
    </main>
  );
}

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 12%, rgba(201,168,92,0.10), transparent 70%), radial-gradient(ellipse 90% 70% at 50% 110%, rgba(40,70,130,0.18), transparent 70%)' }} />
      {/* Guilloche rosette behind the seal */}
      <svg viewBox="-300 -300 600 600" className="absolute left-1/2 top-[-170px] h-[640px] w-[640px] -translate-x-1/2 opacity-[0.22] sm:top-[-150px]">
        {Array.from({ length: 36 }).map((_, i) => (
          <ellipse key={i} cx="0" cy="0" rx="250" ry="120" fill="none" stroke={GOLD} strokeWidth="0.45" transform={`rotate(${i * 5})`} />
        ))}
        {[280, 230, 190].map(r => <circle key={r} cx="0" cy="0" r={r} fill="none" stroke={GOLD} strokeWidth="0.6" strokeOpacity="0.6" />)}
      </svg>
    </div>
  );
}

function Seal() {
  return (
    <div className="relative grid h-[132px] w-[132px] place-items-center rounded-full"
      style={{ background: 'radial-gradient(circle, #141c2e 0%, #0b111e 70%)', boxShadow: `0 0 0 1px ${GOLD}33, 0 0 60px -10px ${GOLD}55` }}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
        <defs><path id="seal-ring" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" /></defs>
        <circle cx="60" cy="60" r="54" fill="none" stroke={GOLD} strokeWidth="0.8" strokeOpacity="0.7" />
        <circle cx="60" cy="60" r="36" fill="none" stroke={GOLD} strokeWidth="0.8" />
        <text fill={GOLD} fontSize="7" letterSpacing="2.2" fontWeight="600">
          <textPath href="#seal-ring">SOVEREIGN OPERATING SYSTEM · CIVICOS · </textPath>
        </text>
      </svg>
      <span className="relative grid h-[62px] w-[62px] place-items-center rounded-full border font-serif text-lg font-bold tracking-wide"
        style={{ borderColor: `${GOLD}99`, color: '#f3f5fa', background: '#0d1424' }}>CO</span>
    </div>
  );
}

function IconPerson() {
  return <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" strokeLinecap="round" /></svg>;
}
function IconWallet() {
  return <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3.5" y="6" width="17" height="13" rx="2" /><path d="M3.5 10h17M15.5 14.5h2" strokeLinecap="round" /></svg>;
}
function IconBuilding() {
  return <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3.5 20.5h17M5 10h14M12 3.5 4.5 8h15L12 3.5ZM7 10v8M10.3 10v8M13.7 10v8M17 10v8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
