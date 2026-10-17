'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api/client';
import { resolveIdentity } from '@/lib/sovereign-identity';
import { locales } from '@/lib/i18n/config';
import { ACCENT } from '@/components/features/SituationRoom';
import { OnboardingFrame, Eyebrow, SealTile } from './Chrome';
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
    return <OnboardingFrame><div className="py-20"><Eyebrow>Welcome</Eyebrow><p className="mt-4 text-[15px] text-[#f1707a]">{error}</p></div></OnboardingFrame>;
  }
  if (!state) {
    return (
      <OnboardingFrame>
        <div className="grid flex-1 place-items-center py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#65748b]">Establishing secure session…</p>
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
        <span className="hidden items-center gap-2 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#34d39c]" />Signed in</span>
        <Link href="/" className="hover:text-white">Sign out</Link>
      </>
    }>
      <div dir={id.dir} className="flex-1 py-10 lg:py-16">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <SealTile seal={id.seal} accent={id.accent} size={72} />
          <div className="min-w-0">
            <Eyebrow>{hour === null ? 'Welcome' : greeting(hour)}, {profile.executiveTitle}</Eyebrow>
            <h1 className="mt-2 text-[2.3rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[3.3rem]">
              Welcome to {id.stateName}
            </h1>
            {id.motto ? <p className="mt-2 text-[15px] text-[#94a3b8]">{id.motto}</p> : null}
          </div>
        </div>

        <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-[#16202f] bg-[#16202f] lg:grid-cols-5">
          {[
            ['Form of state', FORM_LABEL[profile.stateForm] ?? profile.stateForm],
            ['Legislature', profile.legislatureName],
            ['Institutions live', `${live.length} of ${total}`],
            ['Language · currency', `${locales.find(l => l.code === profile.locale)?.name ?? profile.locale} · ${profile.currency}`],
            ['Configured', new Date(setup.completedAt).toLocaleDateString()],
          ].map(([k, v]) => (
            <div key={k} className="bg-[#0b111c] px-5 py-4 last:col-span-2 lg:last:col-span-1">
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#65748b]">{k}</dt>
              <dd className="mt-1.5 truncate text-[14.5px] font-medium text-[#e2e9f3]">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 grid gap-3 lg:grid-cols-[1.3fr_1fr]">
          <Link href={primary!.href}
            className="group relative flex min-h-[190px] flex-col justify-between overflow-hidden rounded-[12px] p-7 text-[#03141a] no-underline transition-[filter] hover:brightness-110"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, #2aa3b0)` }}>
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#03141a]/60">{primary!.k}</span>
            <span>
              <span className="block text-[1.7rem] font-semibold leading-tight tracking-[-0.02em]">{primary!.t}</span>
              <span className="mt-1 block text-[14px] text-[#03141a]/70">{primary!.s}</span>
            </span>
            <span aria-hidden className="absolute bottom-7 right-7 text-[22px] transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <ul className="grid gap-3">
            {rest.map(d => (
              <li key={d.href}>
                <Link href={d.href}
                  className="group flex items-center gap-4 rounded-[10px] border border-[#16202f] bg-[#0b111c]/90 px-5 py-4 no-underline transition-colors hover:border-[#2a3a52]">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-[#e2e9f3]">{d.t}</span>
                    <span className="block truncate text-[12.5px] text-[#7d8ba0]">{d.s}</span>
                  </span>
                  <span aria-hidden className="text-[#3a4759] transition-colors group-hover:text-[#37c7d4]">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-8 text-[13px] text-[#65748b]">
          Need to change the nation&rsquo;s profile or institutions?{' '}
          <Link href={institutionPath ? '/setup?path=institution' : '/setup'} className="underline underline-offset-4 hover:text-white" style={{ color: ACCENT }}>Review setup</Link>
        </p>
      </div>
    </OnboardingFrame>
  );
}
