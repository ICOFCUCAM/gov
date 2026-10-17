// How a public site shows its relation to the ministry's existing website
// (lib/data/site-settings.ts): the gateway bar in Link, Embed and Migrate mode,
// the source label on news taken from that website, and schema.org markup
// linking the CivicOS site to it. Shared by every design.

import * as React from 'react';
import { nationMessages } from '@/lib/nation/registry';
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

/** schema.org markup: the institution, its CivicOS site and (sameAs) its existing website. */
export function SiteSchema({ name, description, gateway }: { name: string; description: string; gateway?: SiteGateway }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentOrganization',
    name,
    description,
    ...(gateway ? { sameAs: [gateway.website] } : {}),
  };
  // JSON in a script element: escape "<" so no text can close the element.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
