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
9. **Publishing is governed.** Officials propose, a second named official
   publishes, every change goes on the audit chain (editor at `/admin/sites`).

## Phases

| # | Phase | Status |
|---|---|---|
| 1 | **Content out of the pages.** Content records for the 19 shell sites, placeholders for the nation's offices, numbers and AI choice; sample labels; no fixed dates; real links and section anchors; nation insignia; shared privacy, accessibility and terms statements and a generated sitemap; public sites open without sign-in under `CIVICOS_AUTH=enforce`. Health, Laboratory and Treasury got the same fixes in place. | Done |
| 2 | **Design system.** Tokens, block library with variants, a sector layout for each of the 21 institutions (Health and Treasury become the first two, reading full content records), ministry presets; before/after screenshots per site. | Next |
| 3 | **Existing-site integration.** Ministry registry fields (website, mode, feed, content owner), setup question, the four modes, feed import with cache and fallback, redirect map for Migrate. | Planned |
| 4 | **Editorial workflow.** `/admin/sites`: propose, second-official publish, audit; content overrides stored with the nation. | Planned |
| 5 | **Languages and right-to-left.** Every content field per language; RTL layout once content is translated (register 5.5). | Planned |
| 6 | **Quality.** Accessibility audit (WCAG 2.2 AA), performance budgets, schema.org markup, link checker in CI. | Planned |
