'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api/client';
import { resolveIdentity } from '@/lib/sovereign-identity';
import { locales } from '@/lib/i18n/config';
import { OnboardingFrame, Eyebrow, SealTile, Rule, Corners, hair, CHAMPAGNE, CHAMPAGNE_HI, GOLD } from './Chrome';
import type { SovereignProfile, Ministry, PlatformSetup } from '@/lib/api/types';

const FORM_LABEL: Record<string, string> = {
  republic: 'Presidential republic', parliamentary: 'Parliamentary republic', federation: 'Federation',
  monarchy: 'Monarchy', 'city-state': 'City-state', union: 'Supranational union',
};

function greeting(h: number) {
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/**
 * Welcome — every sign-in after setup lands here. If the platform has not
 * been set up yet, it hands over to /setup first.
 */
export function Welcome() {
  const router = useRouter();
  const params = useSearchParams();
  const institutionPath = params.get('path') === 'institution';

  const [state, setState] = React.useState<{ setup: PlatformSetup; profile: SovereignProfile; ministries: Ministry[] } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [hour, setHour] = React.useState<number | null>(null);

  React.useEffect(() => {
    setHour(new Date().getHours());
    Promise.all([api.setup.get(), api.sovereign.get(), api.org.ministries()])
      .then(([st, s, m]) => {
        if (!st.setup) { router.replace(institutionPath ? '/setup?path=institution' : '/setup'); return; }
        setState({ setup: st.setup, profile: s.sovereign, ministries: m.ministries });
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Could not reach the platform'));
  }, [router, institutionPath]);

  if (error) {
    return <OnboardingFrame><div className="py-20"><Eyebrow>Welcome</Eyebrow><p className="mt-4 text-[15px] font-light text-[#f1938f]">{error}</p></div></OnboardingFrame>;
  }
  if (!state) {
    return (
      <OnboardingFrame>
        <div className="grid flex-1 place-items-center py-20">
          <p className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.3em] text-[#d9c398]/70">
            <span aria-hidden className="h-px w-10 animate-pulse bg-[#d9c398]/60" />Establishing secure session…<span aria-hidden className="h-px w-10 animate-pulse bg-[#d9c398]/60" />
          </p>
        </div>
      </OnboardingFrame>
    );
  }

  const { setup, profile, ministries } = state;
  const id = resolveIdentity(profile);
  const live = ministries.filter(m => m.status === 'active');
  const total = ministries.filter(m => m.status !== 'merged').length;

  const destinations = [
    { href: '/command', t: 'Sovereign Command Center', s: 'Whole-of-government posture, surfaces and directory', k: 'Enter' },
    { href: '/gov/situation-room', t: 'National Situation Room', s: 'Real-time command and coordination', k: 'Live' },
    { href: '/gov', t: 'Cabinet Intelligence', s: 'Cabinet session, directives and briefings', k: 'Cabinet' },
    { href: '/ministries', t: 'Institutions Admin', s: 'Compose, charter and govern institutions', k: 'Admin' },
  ];
  if (institutionPath) {
    const i = destinations.findIndex(d => d.href === '/ministries');
    const [inst] = destinations.splice(i, 1);
    destinations.unshift({ ...inst!, t: 'Charter a new institution', k: 'Start' });
  }
  const [primary, ...rest] = destinations;

  return (
    <OnboardingFrame right={
      <>
        <span className="hidden items-center gap-2 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#9be7c4] shadow-[0_0_8px_#9be7c4]" />SIGNED IN</span>
        <Link href="/" className="transition-colors hover:text-[#f4e4bd]">SIGN OUT</Link>
      </>
    }>
      <div dir={id.dir} className="flex-1 py-10 lg:py-16">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:gap-9">
          <SealTile seal={id.seal} accent={id.accent} size={132} inscription={id.stateName} />
          <div className="min-w-0">
            <Eyebrow>{hour === null ? 'Welcome' : greeting(hour)}, {profile.executiveTitle}</Eyebrow>
            <h1 className="mt-4 text-[2.3rem] font-extralight leading-[1.04] tracking-[-0.035em] text-[#f3efe6] sm:text-[3.6rem]">
              Welcome to{' '}
              <span className="bg-clip-text font-light text-transparent" style={{ backgroundImage: `linear-gradient(180deg, ${CHAMPAGNE_HI}, #b8955a)` }}>{id.stateName}</span>
            </h1>
            {id.motto ? <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.32em] text-white/50">{id.motto}</p> : null}
          </div>
        </div>

        <Rule className="mt-12" strong />
        <dl className="grid grid-cols-2 gap-px lg:grid-cols-5" style={{ background: hair(0.1) }}>
          {[
            ['Form of state', FORM_LABEL[profile.stateForm] ?? profile.stateForm],
            ['Legislature', profile.legislatureName],
            ['Institutions live', `${live.length} of ${total}`],
            ['Language · currency', `${locales.find(l => l.code === profile.locale)?.name ?? profile.locale} · ${profile.currency}`],
            ['Configured', new Date(setup.completedAt).toLocaleDateString()],
          ].map(([k, v], i) => (
            <div key={k} className="bg-[#05070b] px-5 py-5 last:col-span-2 lg:last:col-span-1">
              <dt className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#d9c398]/70">
                <span className="tabular-nums text-white/30">{String(i + 1).padStart(2, '0')}</span>{k}
              </dt>
              <dd className="mt-2 truncate text-[15px] font-light text-[#f3efe6]">{v}</dd>
            </div>
          ))}
        </dl>
        <Rule flip />

        <div className="mt-10 grid gap-3 lg:grid-cols-[1.3fr_1fr]">
          <Link href={primary!.href}
            className="group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-[4px] border p-7 no-underline transition-[border-color,box-shadow] duration-300 hover:border-[#d9c398]/70 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#f4e4bd] sm:p-9"
            style={{ borderColor: hair(0.4), background: `radial-gradient(ellipse 80% 90% at 100% 100%, ${hair(0.16)}, transparent 60%), linear-gradient(160deg, rgba(24,24,26,0.9), rgba(8,10,14,0.95))`, boxShadow: '0 40px 90px -40px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,240,210,0.08)' }}>
            <Corners size={14} />
            <span aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${CHAMPAGNE_HI}, transparent)` }} />
            <span className="font-mono text-[10px] uppercase tracking-[0.34em]" style={{ color: CHAMPAGNE }}>{primary!.k}</span>
            <span className="pr-16">
              <span className="block text-[1.9rem] font-extralight leading-tight tracking-[-0.025em] text-[#f3efe6]">{primary!.t}</span>
              <span className="mt-2 block text-[14px] font-light text-white/55">{primary!.s}</span>
            </span>
            <span aria-hidden className="absolute bottom-7 right-7 grid h-12 w-12 place-items-center rounded-full text-[18px] text-[#17120a] transition-transform duration-300 group-hover:translate-x-1 sm:bottom-9 sm:right-9"
              style={{ background: GOLD, boxShadow: `0 10px 30px -10px ${CHAMPAGNE}99, inset 0 1px 0 rgba(255,255,255,0.6)` }}>→</span>
          </Link>
          <ul className="grid gap-3">
            {rest.map((d, i) => (
              <li key={d.href}>
                <Link href={d.href}
                  className="group relative flex h-full items-center gap-4 rounded-[3px] border px-5 py-4 no-underline transition-colors duration-300 hover:border-[#d9c398]/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#f4e4bd]"
                  style={{ borderColor: hair(0.14), background: 'linear-gradient(160deg, rgba(255,248,230,0.03), rgba(255,248,230,0.005))' }}>
                  <span className="w-6 shrink-0 font-mono text-[10px] tabular-nums text-[#d9c398]/60">{String(i + 2).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-light text-[#f3efe6]">{d.t}</span>
                    <span className="mt-0.5 block truncate text-[12.5px] font-light text-white/45">{d.s}</span>
                  </span>
                  <span className="hidden font-mono text-[9.5px] uppercase tracking-[0.24em] text-white/30 sm:inline">{d.k}</span>
                  <span aria-hidden className="text-[#d9c398]/50 transition-[color,transform] duration-300 group-hover:translate-x-0.5 group-hover:text-[#f4e4bd]">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <nav aria-label="Configuration" className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] font-light text-white/45">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.3em] text-white/35">Configuration</span>
          {[
            { href: institutionPath ? '/setup?path=institution' : '/setup', l: 'Review setup' },
            { href: '/gov/configuration', l: 'Sovereign configuration' },
            { href: '/admin/onboarding', l: 'Municipal onboarding' },
            { href: '/updates', l: 'Update Center' },
          ].map(x => (
            <Link key={x.href} href={x.href} className="underline decoration-[#d9c398]/35 underline-offset-4 transition-colors hover:text-[#f4e4bd] hover:decoration-[#f4e4bd]" style={{ color: CHAMPAGNE }}>{x.l}</Link>
          ))}
        </nav>
      </div>
    </OnboardingFrame>
  );
}
