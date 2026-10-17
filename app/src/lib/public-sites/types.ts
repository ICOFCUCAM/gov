// Public institution websites — content records.
//
// Each public site (police, health, the chambers …) is a design (its page and
// PublicSiteShell) filled from one of these records. Records are plain data so
// a nation can replace any of it without touching code: the reference records
// in ./content ship with the platform, and a nation's own wording, news and
// figures replace them field by field (see ./index.ts, `siteContent`).
//
// Text may carry placeholders, filled at render from the installed nation
// (./tokens.ts): {nation}, {year}, office names such as {headOfState} or
// {upperChamber}, emergency numbers such as {emergency.police:999} (the
// number after the colon is the reference until the nation sets its own),
// {ai:AI wording|plain wording}, which follows the nation's AI choice, and
// {money:28580000000}, an amount in the nation's currency (compact).
//
// Links (`to`) are either a section of the same site — 'home', 'services',
// 'statistics', 'news', 'programmes', 'contact', 'about' — or a platform route
// such as '/wallet/payments'. Every link must lead somewhere real.

export type SiteSection = 'home' | 'services' | 'statistics' | 'news' | 'programmes' | 'contact' | 'about';
export type SiteLink = SiteSection | `/${string}`;

export interface SiteContent {
  /** The site's route segment, e.g. 'police' for /police. */
  id: string;
  institution: {
    name: string;
    tagline: string;
    role: 'Ministry' | 'Agency' | 'Chamber' | 'Branch';
    /** Glyph shown before the nation's insignia is set. */
    crest: string;
    /** A sentence about the institution for the footer; the tagline when absent. */
    about?: string;
    emergencyButton: { label: string; icon: string } | null;
  };
  nav: { label: string; to: SiteLink }[];
  hero: {
    /** First line in ink, second in the site's primary colour. */
    headline: [string, string];
    subhead: string;
    primaryCta: { label: string; icon: string; to: SiteLink };
    secondaryCta: { label: string; icon: string; to: SiteLink };
    sideNote?: { icon: string; title: string; body: string; cta: string; to: SiteLink };
  };
  alert?: { label: string; text: string };
  /** The "I want to…" tasks; each opens a real service. Colour: a hex value or 'primary' / 'accent'. */
  quickServices: { title: string; subtitle: string; color: string; icon: string; to: SiteLink }[];
  featured: [SiteFeatured, SiteFeatured, SiteFeatured];
  statistics: { value: string; label: string; sub: string }[];
  /** Where the figures come from. Reference figures are samples until the institution supplies its own. */
  statisticsSource: 'sample' | 'nation';
  /** Announcements, newest first. Reference items are samples and carry no date. */
  news: { title: string; summary: string; date?: string }[];
  newsSource: 'sample' | 'nation';
  initiatives: { title: string; body: string }[];
  locator?: { title: string; placeholder: string; tabs: string[]; pinLabel: string; pinCoords: [number, number][] };
  shortcuts: { title: string; subtitle: string; to: SiteLink }[];
  footerSections: { heading: string; items: { label: string; to: SiteLink }[] }[];
  newsletter: { heading: string; body: string };
  legalLine: string;
  legalLinks: { label: string; to: SiteLink }[];
}

export interface SiteFeatured {
  kicker: string;
  title: string;
  body: string;
  cta: string;
  tone: 'primary' | 'subtle' | 'amber';
  to: SiteLink;
}

/** A nation's own content for a site: any field replaces the reference record's. */
export type SiteOverride = Partial<Omit<SiteContent, 'id'>>;
