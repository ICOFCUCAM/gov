# CivicOS — Integration Register

Everything in the platform that is built but still runs on a placeholder,
a demo value or an in-memory stand-in, and what it takes to connect it for
real. Keep this file current: **any change that adds a stub, a placeholder,
a demo value, a new external dependency or an integration point adds or
updates an entry here in the same change** (see `CLAUDE.md`).

Status: **Ready** = works for real once configured · **Partial** = real for
some cases · **Placeholder** = shaped correctly, not connected.

Last reviewed: 17 Oct 2026.

---

## 1. Platform and data

| # | Area | Today | To integrate | Where |
|---|---|---|---|---|
| 1.1 | **Datastore** | Placeholder. In-memory store, reset on every restart: the nation profile, setup state, ministries, the audit chain, Update Center releases and decisions. | Replace with the sovereign datastore adapter (Postgres via the Supabase substrate already in the repo, or CockroachDB). API route handlers depend only on the store's exported functions, so the swap is contained. | `app/src/lib/data/store.ts`, `app/src/lib/data/updates.ts` |
| 1.2 | **Supabase substrate** | Ready when configured. Sign-in, receipts timeline and data export use it when the keys are present. | Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; apply migrations in `app/supabase/`. | `app/src/lib/db/`, `app/supabase/` |
| 1.3 | **Audit Vault (client side)** | Placeholder. Contestations and signatures made in the citizen wallet are kept in the browser. | Send them to the sovereign Audit Vault (the server audit chain in 1.1, then the vault service). | `app/src/lib/audit/localVault.ts` |
| 1.4 | **Access control** | Partial. The policy is in place. It is enforced only with `CIVICOS_AUTH=enforce`; otherwise all routes pass, for previews. | Set `CIVICOS_AUTH=enforce` in every real deployment. | `app/src/middleware.ts` |
| 1.5 | **Citizen sign-in** | Placeholder. `/login` signs anyone in as the demo citizen. `/sign-in` (substrate email and password) is real. | Connect the national identity provider (eID, OIDC or SAML) to `/login`. | `app/src/app/(public)/login/page.tsx` |
| 1.6 | **Officer signature ceremony** | Placeholder. The two factors (token and biometric) are stubbed. | Connect a hardware token / PKI and the biometric service. | `app/src/components/features/SignDialog.tsx` |
| 1.7 | **Contesting a decision** | Placeholder. The case is written to the local vault (1.3). | Open the case in the responsible office's queue. | `app/src/components/features/ContestDialog.tsx` |
| 1.8 | **Payments** | Placeholder. Bills are paid in the store, labelled with the nation's payment rail (`SovereignProfile.paymentRail`, e.g. Mobile Money). | Connect the national payment gateway or mobile-money API behind `api.payments.pay`; reconcile receipts. | `app/src/app/api/payments/`, `app/src/app/(citizen)/wallet/payments/PaymentsClient.tsx` |
| 1.9 | **Live telemetry** | Placeholder. Dashboards and maps use deterministic generated figures. | Feed each ministry's real systems into the engines through the interoperability fabric. | `app/src/lib/telemetry.ts`, `app/src/lib/gov/*` |
| 1.10 | **Charter registry** | Placeholder. Charters are typed in the app. | Move them to a sovereign-controlled registry signed by constitutional officers. | `app/src/lib/charters/registry.ts` |
| 1.11 | **Scheduled jobs** | Ready when configured. 11 Supabase `pg_cron` jobs call `/api/cron/*`. | Store `civicos_base_url` and `civicos_cron_secret` in Supabase Vault; set `CIVICOS_CRON_SECRET` in the app. | `app/supabase/cron/schedule.sql` |
| 1.12 | **Search indexing** | Off: the site sends `noindex` while in preview. | Allow indexing for the public sites at launch. | `app/src/app/layout.tsx` |

## 2. AI assistant (per-nation opt-in)

| # | Area | Today | To integrate | Where |
|---|---|---|---|---|
| 2.1 | **Advisory model** | Ready when configured. `/api/ai/advisory` calls the Anthropic API when the nation ticked the AI assistant in setup; otherwise it refuses, and panels show their rule-based advisories. | Set `ANTHROPIC_API_KEY` (read by the SDK); keep the per-nation opt-in. | `app/src/app/api/ai/advisory/route.ts` |
| 2.2 | **AI wording** | Done. Labels follow the opt-in through `aiLabel()`. | Any new AI-presenting label must use `aiLabel()`. | `app/src/lib/nation/registry.ts` |

## 3. Update Center (download centre)

| # | Area | Today | To integrate | Where |
|---|---|---|---|---|
| 3.1 | **Release artifacts** | Placeholder. Every artifact is metadata only (`placeholder: true`). The download link returns a labelled JSON manifest, not a file. | A build pipeline (CI) that produces the container images, Helm charts, tarballs, offline bundles, app builds and SBOMs. Upload them to object storage or a CDN, and make `/api/releases/download/[key]/[artifact]` serve or redirect to the signed file. | `app/src/lib/data/updates.ts`, `app/src/app/api/releases/download/` |
| 3.2 | **Checksums and signing** | Placeholder. The checksums are made up, and the signing key is a "Demonstration key". | Generate the publisher's real signing keys (GPG for files, Sigstore cosign for images). Publish the fingerprint through a trusted channel (contract pack). Compute real SHA-256 at publish time. | `app/src/lib/data/updates.ts`, `app/src/components/features/updates/ui.tsx` |
| 3.3 | **Hosted (SaaS) upgrades** | Partial. Scheduling and recording are real; the platform does not yet perform the upgrade. | Connect the scheduled window to the deployment system (e.g. Helm/Argo rollout per tenant). It must still run only when the nation has scheduled it. | `decide()` in `app/src/lib/data/updates.ts` |
| 3.4 | **Nation enrolment and link keys** | Partial. Nations are enrolled in the store, with a private link key. | Persist them (1.1), add key rotation and revocation, and tie each key to the nation's tenancy. | `app/src/lib/updates/access.ts` |
| 3.5 | **Publisher access** | Ready when enforced. The console requires a platform-tier session under `CIVICOS_AUTH=enforce` (1.4). | Assign the platform-tier role to the release team only. | `app/src/app/api/releases/publisher/` |

## 4. Nation conversion — geography

| # | Area | Today | To integrate | Where |
|---|---|---|---|---|
| 4.1 | **Official subdivisions** | Done. ISO 3166-2 from the iso-codes data in pycountry 26.2 (Feb 2026). | Rebuild when ISO publishes changes: `python3 scripts/build-divisions.py <pycountry databases dir>`. | `app/src/lib/geo/divisions.json` |
| 4.2 | **Map shapes still out of date (26)** | Natural Earth shapes kept: no better openly licensed data passed the checks. | Re-run `npm run build:boundaries -- --needed` (with `NODE_USE_ENV_PROXY=1` behind a proxy) as sources improve, or load a nation's own boundary file when it subscribes. | `app/scripts/build-boundaries.mjs` |
| 4.3 | **Names not yet matched (~600 shapes)** | Shapes whose name or code cannot be matched with certainty keep their current label, e.g. Iran's "West Azerbaijan". | Add an explicit name table per country, or new shapes (4.2), then run `node scripts/official-names.mjs`. | `app/scripts/official-names.mjs` |
| 4.4 | **Per-nation facility registry** | Not built. Engines use generic facility names. | Optional: real hospital and court names by role in the Nation Pack. | `docs/NATION_CONVERSION_MANIFEST.md` §7 step 3 |
| 4.5 | **Map layout for spread-out countries** | Done. The US uses its inset layout; Spain (Canary Islands), Portugal (Azores, Madeira), Ecuador (Galápagos) and France (Caribbean and Guiana; Indian Ocean) draw distant territories in inset boxes. | Add other countries to `INSETS` as needed. | `app/src/apps/_shared/GeoMap.tsx` |

Countries in 4.2: Kiribati, Tuvalu, Monaco, São Tomé and Príncipe, Kazakhstan, Norway, Somalia, Oman, Algeria, Cyprus, Netherlands, Turkmenistan, North Korea, Côte d'Ivoire, Indonesia, Equatorial Guinea, Kyrgyzstan, US Minor Outlying Islands, Serbia, Mali, China, Montenegro, Seychelles, Panama, Myanmar, Mauritania. Reasons are printed by the build:
- some sources would drop territory (Norway: Svalbard);
- some draw disputed areas differently (Somalia, Cyprus);
- some are GADM-derived (São Tomé, Oman, Equatorial Guinea, Panama), and GADM's licence forbids redistribution.

Network hosts the boundary build needs: `data.humdata.org`, `www.geoboundaries.org`, `media.githubusercontent.com`, `raw.githubusercontent.com`. `salb.un.org` (UN SALB) is not yet reachable from the build environment.

## 5. Nation conversion — language

| # | Area | Today | To integrate | Where |
|---|---|---|---|---|
| 5.1 | **Translations review** | Partial. English is the source. Kiswahili, Arabic, French and Yorùbá exist for the sections `common`, `wallet`, `receipt`, `contest`, `assistant`, `home`, `services`, `records`, `pages`, `more`, `detail`, `site`. Everything after the first skeleton was drafted without native-speaker review. | Native-speaker review by each nation's terminology committee (the dictionaries' own note). Yorùbá first. | `app/src/lib/i18n/locales/*.ts` |
| 5.2 | **Wallet: remaining English** | Nearly done. All wallet pages, the status badges, selective disclosure, support thread and detail pages follow the nation's language. Still English: the assistant's answers (`wallet/assistant/answer.ts`), the receipts timeline explanation, and demo record contents (6.2). | Add dictionary entries and wire them as for the other wallet pages. | `app/src/app/(citizen)/wallet/*`, `app/src/components/ui/*` |
| 5.3 | **Public websites and officer apps** | Partial. The shared public-site wording (utility bar, language label, search, section headings, "view all" links, contact and newsletter; `site` section) follows the nation's language on the 19 sites built on `PublicSiteShell` and on the Health and Treasury sites. Still English: each institution's own content (names, menus, news, services, statistics, footers, defined per page) and the officer apps, about 540 files. | Move each site's content into the Nation Pack or dictionary entries, then the officer apps, with the same pattern (`nationMessages()`). | `app/src/apps/_shared/public/PublicSiteShell.tsx`, `app/src/app/(public)/*`, manifest §7 step 10 |
| 5.4 | **Locale routing** | Placeholder. The nation's single language comes from setup; there is no per-user language switch. | URL locale segments plus middleware, for nations with several official languages. | `app/src/lib/state/locale.ts` |
| 5.5 | **Right-to-left** | Partial. Only the citizen wallet switches to RTL for Arabic; the public websites show Arabic wording but keep a left-to-right layout. | Audit the other surfaces for RTL before an RTL nation goes live. | `app/src/components/ui/PhoneShell.tsx`, `app/src/app/globals.css` |
| 5.6 | **Adding a language** | — | Add `locales/<code>.ts` implementing `Messages`, register it in `lib/i18n/index.ts` and `lib/i18n/config.ts`; setup lists it automatically. | `app/src/lib/i18n/` |

## 6. Demo content to replace at go-live

| # | Item | Where |
|---|---|---|
| 6.1 | Demo citizen and officers (Amina Hassan, K. Adamu, Dr. K. Mehta…). | `app/src/lib/nation/persona.ts` |
| 6.2 | Sample wallet records (credentials, health, access log, receipts). | `app/src/app/(citizen)/wallet/*` |
| 6.3 | Reference offices and constitution before setup ("Office of the President", "Executive Mansion"). | `app/src/lib/nation/offices.ts` |
| 6.4 | Update Center seed releases (1.3.0–1.4.1, the "Pre-production sandbox" tenant). | `app/src/lib/data/updates.ts` |

## 7. Known issues carried forward

| # | Issue | Where |
|---|---|---|
| 7.1 | Resolved: server/browser mismatches fixed (request-time clock via `lib/clock/render-now.tsx`, rounded telemetry and coordinates). A browser sweep of all 118 static routes reports no hydration warnings or page errors. | — |
| 7.2 | Resolved: the site icon is `app/src/app/icon.svg`. | — |
| 7.3 | Resolved: on the US map the density legend sits bottom right, clear of the Alaska inset. | — |
| 7.4 | Resolved with 7.1. | — |
