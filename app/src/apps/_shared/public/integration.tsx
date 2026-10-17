// How a public site shows its relation to the ministry's existing website
// (lib/data/site-settings.ts): the gateway bar in Link, Embed and Migrate mode,
// the source label on news taken from that website, and schema.org markup
// describing the institution, its website and its place in the government.
// Shared by every design.

import * as React from 'react';
import { nationMessages, nationInsignia, currentOffices } from '@/lib/nation/registry';
import { t as fill } from '@/lib/i18n';

export interface SiteGateway {
  mode: 'link' | 'embed' | 'migrate';
  /** The ministry's existing website. */
  website: string;
  /** Its host without "www.", for display. */
  host: string;
}

/** A forward arrow that points the way of reading: right in left-to-right pages, left in right-to-left ones. */
export function Fwd() {
  return <span className="inline-block rtl:-scale-x-100" aria-hidden>→</span>;
}

/** The first thing a keyboard or screen-reader user reaches: a link past the banner and header to the page's main content. Hidden until focused. */
export function SkipLink({ label, href = '#main' }: { label: string; href?: string }) {
  return (
    <a href={href} className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-[14px] focus:font-semibold focus:text-[#0b1a2c] focus:shadow-lg focus:outline focus:outline-2 focus:outline-[#0b1a2c]">
      {label}
    </a>
  );
}

/** Shown on a pending proposal's preview (officials only): nothing here is published yet. */
export function PreviewBanner({ on }: { on?: boolean }) {
  if (!on) return null;
  return (
    <div className="sticky top-0 z-30 w-full bg-[#92600e] text-white">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2 px-4 py-2 text-[12.5px] font-semibold sm:px-6">
        <span>Preview — this proposal is not published. Citizens see the current version.</span>
        <a href="/admin/sites" className="underline underline-offset-2">Back to the editor</a>
      </div>
    </div>
  );
}

/** A thin bar under the header pointing to the ministry's main website. */
export function GatewayBar({ gateway, name, accent }: { gateway?: SiteGateway; name: string; accent: string }) {
  if (!gateway) return null;
  const t = nationMessages().site;
  const text = gateway.mode === 'migrate' ? t.gatewayMigrate : t.gatewayLink;
  return (
    <div className="border-b bg-white" style={{ borderColor: '#e5e7eb' }}>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-[12.5px] text-slate-600 sm:px-6">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent }} aria-hidden />
          {fill(text, { name, host: gateway.host })}
        </span>
        <a href={gateway.website} rel="noopener" className="font-semibold underline-offset-2 hover:underline" style={{ color: accent }}>
          {fill(t.visitSite, { host: gateway.host })}
        </a>
      </div>
    </div>
  );
}

export interface SiteSchemaInput {
  name: string;
  description: string;
  gateway?: SiteGateway;
  /** Absolute URL of the site (from the request, see siteProps); left out when unknown. */
  url?: string;
  /** The language the page is in (BCP 47). */
  lang?: string;
  /** The emergency button's label, e.g. "Emergency 999": its number becomes an emergency contact point. */
  emergency?: string;
}

/**
 * schema.org JSON-LD for a public site: the institution (GovernmentOrganization)
 * within the nation's government, the country it serves, its existing website
 * (sameAs) and emergency number, and the website itself (WebSite) in the
 * page's language. Facts come from the nation profile; nothing is invented.
 */
export function siteSchemaData({ name, description, gateway, url, lang, emergency }: SiteSchemaInput): Record<string, unknown> {
  const insignia = nationInsignia();
  const government = insignia ? currentOffices().government : undefined;
  const tel = emergency ? /(\+?\d[\d\s-]{1,14}\d|\d{2,})/.exec(emergency)?.[0]?.replace(/[\s-]/g, '') : undefined;
  const id = url ? { org: `${url}#organization`, site: `${url}#website` } : undefined;
  const org = {
    '@type': 'GovernmentOrganization',
    ...(id ? { '@id': id.org, url } : {}),
    name,
    description,
    ...(gateway ? { sameAs: [gateway.website] } : {}),
    ...(insignia ? { areaServed: { '@type': 'Country', name: insignia.name } } : {}),
    ...(government && government !== name ? { parentOrganization: { '@type': 'GovernmentOrganization', name: government } } : {}),
    ...(tel ? { contactPoint: [{ '@type': 'ContactPoint', telephone: tel, contactType: 'emergency' }] } : {}),
  };
  const website = {
    '@type': 'WebSite',
    ...(id ? { '@id': id.site, url } : {}),
    name,
    ...(lang ? { inLanguage: lang } : {}),
    publisher: id ? { '@id': id.org } : { '@type': 'GovernmentOrganization', name },
  };
  return { '@context': 'https://schema.org', '@graph': [org, website] };
}

/** schema.org markup for the site (see siteSchemaData). */
export function SiteSchema(props: SiteSchemaInput) {
  const data = siteSchemaData(props);
  // JSON in a script element: escape "<" so no text can close the element.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
