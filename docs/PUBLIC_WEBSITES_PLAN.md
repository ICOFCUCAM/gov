# CivicOS — Public Websites Plan

The public institution websites (`/police`, `/health`, `/senate` …) are each
nation's front door: a citizen should land on a site that looks like *that*
ministry of *that* nation, find the service they came for, and trust what it
says. This plan records the decisions taken with the platform owner and the
order of work. Status is kept current in `docs/INTEGRATION_REGISTER.md` §14.

## Decisions (agreed 17 Oct 2026)

1. **Tasks first.** The "I want to…" services lead every site, and each one
   opens a real service (wallet, permits, payments, appeals, records).
2. **Content is data, separate from design.** Each site's wording, services,
   programmes, figures and news live in a content record
   (`app/src/lib/public-sites/`). A nation's own content replaces the reference
   record field by field; designs only read records.
3. **Nothing invented is presented as fact.** Figures come from the platform's
   data (marked live) or are labelled *Sample figures*; news is labelled
   *Sample announcements* until the institution publishes its own. No fixed
   dates; the year follows the calendar.
4. **The nation's identity.** After setup the sites wear the nation's insignia
   and name; reference glyphs appear only before setup.
5. **Every link leads somewhere real** — a section of the same site, a platform
   service, the Public Observatory, or the shared statements (privacy,
   accessibility, terms) and sitemap.
6. **Every institution keeps a full site built in CivicOS**, whatever its
   ministry chooses below, so there is always a site to land on.
7. **Existing ministry websites — four modes, Link by default.**
   - *Link* (default): the ministry's existing site stays primary; the CivicOS
     site is its gateway (services on CivicOS, news from the existing site's
     feed, "visit the full site").
   - *Embed*: CivicOS supplies service widgets and data feeds to the existing
     site.
   - *Migrate*: pages move across one at a time with permanent redirects from
     the old addresses; reversible per page.
   - *Host*: the CivicOS site is the ministry's site.
   One owner per content item, one-way sync, server-side fetching with
   sanitising and a last-good-copy fallback, open standards (RSS/Atom,
   sitemaps, schema.org, OpenAPI, national login), no third-party tracking.
8. **Each ministry looks like itself.** Shared foundations (official banner,
   accessibility controls, language switch, legal footer, sign-in) stay common;
   everything else varies: nation and sector design tokens, a block library
   with several variants per section, sector layouts that follow what each
   ministry does, and two or three presets per sector that a ministry chooses
   and adjusts. The current shell stays as the "Civic Standard" preset.
9. **Presets are chosen per ministry.** Sectors and their presets live in
   `app/src/apps/_shared/public/design/presets.ts`; a site may use its
   sector's presets or Civic Standard. The nation's choice is published
   through the editor (phase 4); `?preset=` previews others.
10. **Publishing is governed.** Officials propose, a second named official
   publishes, every change goes on the audit chain (editor at `/admin/sites`).

## Phases

| # | Phase | Status |
|---|---|---|
| 1 | **Content out of the pages.** Content records for the 19 shell sites, placeholders for the nation's offices, numbers and AI choice; sample labels; no fixed dates; real links and section anchors; nation insignia; shared privacy, accessibility and terms statements and a generated sitemap; public sites open without sign-in under `CIVICOS_AUTH=enforce`. Health, Laboratory and Treasury got the same fixes in place. | Done |
| 2 | **Design system.** Six self-hosted open-licence typefaces (`app/public/fonts`), design tokens per preset (typefaces, heading style, shape, spacing, palette, header), a block library with several variants per section, 24 presets in 9 sectors (each of the 21 institutions starts with its own; Civic Standard stays selectable), Health and Treasury reading full content records with their designs kept as their sectors' own presets, a phone menu, and a test that every preset keeps every link, item and anchor. Compare designs with `?preset=<id>` on any site. | Done |
| 3 | **Existing-site integration.** Settings per site (website, mode, feed, design choice, redirects) with audit; setup section 3.4; safe feed import (RSS, Atom, JSON Feed) every 30 minutes with the last good copy kept; gateway bar and the ministry's news in Link, Embed and Migrate mode; services widget and JSON content for Embed; `/r/<site>/<path>` forwarding for Migrate; schema.org markup linking each site to the ministry's website. | Done |
| 4 | **Editorial workflow.** `/admin/sites`: an official proposes changes to a site's name, opening, notice, news, figures, programmes and design; a second, different official publishes them (never over a newer version); rejections need a reason; only the proposer withdraws; every version is kept and restorable (to the reference content too) through the same review; previews on the real site for signed-in officials (`?preview=`); all audited. | Done |
| 5 | **Languages and right-to-left.** Every content field per language; RTL layout once content is translated (register 5.5). | Next |
| 6 | **Quality.** Accessibility audit (WCAG 2.2 AA), performance budgets, schema.org markup, link checker in CI. | Planned |
