// A plain, readable page for the public sites' shared statements (privacy,
// accessibility, terms) and the sitemap. Light and institutional like the
// sites themselves; wears the nation's name once setup is complete.

import * as React from 'react';
import Link from 'next/link';
import { currentOffices, siteMessages } from '@/lib/nation/registry';
import { SkipLink } from './integration';

const INK = '#0b1a2c';
const LINE = '#dde3ec';

export function PublicDocument({ kicker, title, intro, template, children }: {
  kicker: string;
  title: string;
  intro: string;
  /** True for wording the nation adopts under its own law before go-live. */
  template?: boolean;
  children: React.ReactNode;
}) {
  const o = currentOffices();
  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#1a2332]">
      <SkipLink label={siteMessages().skipMain} />
      <header aria-label={o.government} className="w-full text-[12px] text-white/85" style={{ background: `linear-gradient(90deg, ${INK}, #13294b)` }}>
        <div className="mx-auto flex max-w-[960px] flex-wrap items-center justify-between gap-3 px-6 py-2">
          <span>{o.government}</span>
          <nav className="flex gap-4">
            <Link href="/government" className="hover:text-white">All institutions</Link>
            <Link href="/sitemap" className="hover:text-white">Sitemap</Link>
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[960px] px-6 py-12">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">{kicker}</div>
        <h1 className="mt-2 text-[34px] font-bold leading-tight" style={{ color: INK, fontFamily: 'Georgia, ui-serif, serif' }}>{title}</h1>
        <p className="mt-3 max-w-2xl text-[15px] text-slate-600">{intro}</p>
        {template ? (
          <p className="mt-5 rounded-lg border px-4 py-3 text-[12px]" style={{ borderColor: '#e7c879', background: '#fdf6e3', color: '#92600e' }}>
            Template statement shipped with the platform. The responsible office adopts it under national law, with its own contact
            details, before the sites go live.
          </p>
        ) : null}
        <div className="mt-8 space-y-8">{children}</div>
      </main>
      <footer className="border-t" style={{ borderColor: LINE }}>
        <div className="mx-auto flex max-w-[960px] flex-wrap gap-4 px-6 py-6 text-[12px] text-slate-600">
          <Link href="/legal/privacy" className="hover:text-slate-900">Privacy</Link>
          <Link href="/legal/accessibility" className="hover:text-slate-900">Accessibility</Link>
          <Link href="/legal/terms" className="hover:text-slate-900">Terms of use</Link>
          <Link href="/sitemap" className="hover:text-slate-900">Sitemap</Link>
        </div>
      </footer>
    </div>
  );
}

export function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[18px] font-bold" style={{ color: INK }}>{title}</h2>
      <div className="mt-2 space-y-2 text-[14px] leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}
