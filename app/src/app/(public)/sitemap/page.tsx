// Public — sitemap of every public institution website, generated from the
// public-site content records so it never drifts from the sites themselves.

import Link from 'next/link';
import { PublicDocument, DocSection } from '@/apps/_shared/public/PublicDocument';
import { REFERENCE_SITES } from '@/lib/public-sites';
import { fillDeep, siteTokens } from '@/lib/public-sites/tokens';
import { siteHref } from '@/apps/_shared/public/site-props';
import type { SiteSection } from '@/lib/public-sites/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sitemap' };

const SECTIONS: { key: SiteSection; label: string }[] = [
  { key: 'services', label: 'Services' }, { key: 'statistics', label: 'Figures' }, { key: 'news', label: 'News' },
  { key: 'programmes', label: 'Programmes' }, { key: 'contact', label: 'Contact' }, { key: 'about', label: 'About' },
];

// Sites with their own design (not built from a content record yet).
const OTHER = [
  { href: '/government', name: 'Government directory' },
  { href: '/health', name: 'Ministry of Health' },
  { href: '/health/laboratory', name: 'Laboratory Services' },
  { href: '/treasury', name: 'Ministry of Treasury & Finance' },
  { href: '/public', name: 'Public Observatory' },
];

export default function SitemapPage() {
  const tokens = siteTokens(new Date().getFullYear());
  const sites = Object.values(REFERENCE_SITES).map(s => fillDeep(s, tokens)).sort((a, b) => a.institution.name.localeCompare(b.institution.name));
  return (
    <PublicDocument kicker="Public websites" title="Sitemap" intro="Every public institution website and its main sections.">
      <DocSection title="Institutions">
        <ul className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {sites.map(s => (
            <li key={s.id}>
              <Link href={`/${s.id}`} className="font-semibold text-[#1e63b8] hover:underline">{s.institution.name}</Link>
              <div className="mt-1 flex flex-wrap gap-x-3 text-[12px] text-slate-500">
                {SECTIONS.map(x => <Link key={x.key} href={siteHref(s.id, x.key)} className="hover:text-slate-900">{x.label}</Link>)}
              </div>
            </li>
          ))}
          {OTHER.map(s => (
            <li key={s.href}><Link href={s.href} className="font-semibold text-[#1e63b8] hover:underline">{s.name}</Link></li>
          ))}
        </ul>
      </DocSection>
      <DocSection title="Statements">
        <ul className="space-y-1">
          <li><Link href="/legal/privacy" className="text-[#1e63b8] hover:underline">Privacy notice</Link></li>
          <li><Link href="/legal/accessibility" className="text-[#1e63b8] hover:underline">Accessibility statement</Link></li>
          <li><Link href="/legal/terms" className="text-[#1e63b8] hover:underline">Terms of use</Link></li>
        </ul>
      </DocSection>
    </PublicDocument>
  );
}
