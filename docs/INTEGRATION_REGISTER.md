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
| 3.6 | **Health agent** | Partial. `POST /api/releases/health` accepts only the nation's deployment-agent credential (`Authorization: Bearer cag_…`); a user session or the distribution link key is refused, and a credential speaks only for its own nation. The credential is issued and rotated from `/updates/settings`, shown once, stored only as a SHA-256 hash, and both steps are audited. No agent ships yet; the prototype default is simulated health (`healthSource: 'simulated'`). | Ship the agent with the install kit and Helm chart: readiness/liveness probes, error rate and latency against the pre-upgrade baseline, audit-chain verification, smoke tests (sign-in, wallet, payments, registry), one report a minute. In production, add mTLS for the agent (client certificate per nation, pinned to the credential), keep the hashes in the durable datastore (1.1) rather than memory, and alert on credential age. | `issueAgentCredential()` / `nationForAgent()` / `reportHealth()` in `app/src/lib/data/updates.ts`, `app/src/app/api/releases/health/`, `app/src/app/api/releases/settings/agent-credential/` |
| 3.7 | **Restore points (real backups)** | Placeholder. "Take restore point" records a snapshot id, size and contents and marks it verified; no database, configuration or artifacts are copied. "Restore data" records the decision; nothing is restored. | Snapshot the database (point-in-time), configuration and the previous release's artifacts through the backup system; verify by restoring to a scratch instance and comparing checksums before the install may proceed. Data restore must replay the snapshot and report what was discarded. | `takeRestorePoint()`, `restoreData()` in `app/src/lib/data/updates.ts` |
| 3.8 | **Software switch-back** | Placeholder. Automatic fallback, approved fallback, rollback and break-glass record the version change; nothing is redeployed. | Hosted: blue-green per tenant (switch traffic back). Self-hosted: A/B slots via `install.sh` / `rollback.sh` in the install kit. Air-gapped: the restore kit in the offline bundle. Fallback must only switch software, never data. | `restoreLkg()`, `breakGlass()` in `app/src/lib/data/updates.ts` |
| 3.9 | **Probation watchdog** | Ready when scheduled. `/api/cron/update-watchdog` (CIVICOS_CRON_SECRET) runs every minute from `supabase/cron/schedule.sql` (pg_cron + pg_net, same Vault URL and secret as the other jobs). It concludes due probations for every nation — pass, switch back to the last known good release, or wait for the nation — and records overdue health reports as missing. It never installs anything. The same evaluation also runs whenever the chamber, a release, the publisher console or the health endpoint is read, as a fallback if the schedule stops. | Apply `schedule.sql` in each deployment and seed `civicos_cron_secret` / `civicos_base_url` in Vault. Once the store is durable (1.1), run the watchdog against it with a lock so two runs never conclude the same probation twice. | `superviseProbations()` in `app/src/lib/data/updates.ts`, `app/src/app/api/cron/update-watchdog/`, `app/supabase/cron/schedule.sql` |
| 3.10 | **Fallback notifications** | Partial. Incidents show prominently in the chamber until acknowledged; nothing is sent. | Notify the nation's on-call officers (email, SMS, pager) when a probation degrades, fails, or falls back. | `failProbation()` in `app/src/lib/data/updates.ts`, `app/src/lib/api/` notifications |

## 4. Nation conversion — geography

| # | Area | Today | To integrate | Where |
|---|---|---|---|---|
| 4.1 | **Official subdivisions** | Done. ISO 3166-2 from the iso-codes data in pycountry 26.2 (Feb 2026). | Rebuild when ISO publishes changes: `python3 scripts/build-divisions.py <pycountry databases dir>`. | `app/src/lib/geo/divisions.json` |
| 4.2 | **Map shapes still out of date (26)** | Natural Earth shapes kept: no better openly licensed data passed the checks. | Re-run `npm run build:boundaries -- --needed` (with `NODE_USE_ENV_PROXY=1` behind a proxy) as sources improve, or load a nation's own boundary file when it subscribes. | `app/scripts/build-boundaries.mjs` |
| 4.3 | **Names not yet matched (~600 shapes)** | Shapes whose name or code cannot be matched with certainty keep their current label, e.g. Iran's "West Azerbaijan". | Add an explicit name table per country, or new shapes (4.2), then run `node scripts/official-names.mjs`. | `app/scripts/official-names.mjs` |
| 4.4 | **Per-nation facility registry** | Not built. Engines use generic facility names. | Optional: real hospital and court names by role in the Nation Pack. | `docs/NATION_CONVERSION_MANIFEST.md` §7 step 3 |
| 4.5 | **Map layout for spread-out countries** | Partial. The US uses an inset layout. Spain (Canary Islands) and France (overseas departments) are drawn at full extent, so the mainland is small. | Add inset layouts for those countries, as for the US. | `app/src/apps/_shared/GeoMap.tsx` |

Countries in 4.2: Kiribati, Tuvalu, Monaco, São Tomé and Príncipe, Kazakhstan, Norway, Somalia, Oman, Algeria, Cyprus, Netherlands, Turkmenistan, North Korea, Côte d'Ivoire, Indonesia, Equatorial Guinea, Kyrgyzstan, US Minor Outlying Islands, Serbia, Mali, China, Montenegro, Seychelles, Panama, Myanmar, Mauritania. Reasons are printed by the build:
- some sources would drop territory (Norway: Svalbard);
- some draw disputed areas differently (Somalia, Cyprus);
- some are GADM-derived (São Tomé, Oman, Equatorial Guinea, Panama), and GADM's licence forbids redistribution.

Network hosts the boundary build needs: `data.humdata.org`, `www.geoboundaries.org`, `media.githubusercontent.com`, `raw.githubusercontent.com`. `salb.un.org` (UN SALB) is not yet reachable from the build environment.

## 5. Nation conversion — language

| # | Area | Today | To integrate | Where |
|---|---|---|---|---|
| 5.1 | **Translations review** | Partial. English is the source. Kiswahili, Arabic, French and Yorùbá exist for the sections `common`, `wallet`, `receipt`, `contest`, `assistant`, `home`, `services`, `records`, `pages`, `more`, `detail`. Everything after the first skeleton was drafted without native-speaker review. | Native-speaker review by each nation's terminology committee (the dictionaries' own note). Yorùbá first. | `app/src/lib/i18n/locales/*.ts` |
| 5.2 | **Wallet: remaining English** | Nearly done. All wallet pages, the status badges, selective disclosure, support thread and detail pages follow the nation's language. Still English: the assistant's answers (`wallet/assistant/answer.ts`), the receipts timeline explanation, and demo record contents (6.2). | Add dictionary entries and wire them as for the other wallet pages. | `app/src/app/(citizen)/wallet/*`, `app/src/components/ui/*` |
| 5.3 | **Public websites and officer apps** | English only. About 560 files. | Phase after the wallet, following the same pattern (`nationMessages()`). | manifest §7 step 10 |
| 5.4 | **Locale routing** | Placeholder. The nation's single language comes from setup; there is no per-user language switch. | URL locale segments plus middleware, for nations with several official languages. | `app/src/lib/state/locale.ts` |
| 5.5 | **Right-to-left** | Partial. Only the citizen wallet switches to RTL for Arabic. | Audit the other surfaces for RTL before an RTL nation goes live. | `app/src/components/ui/PhoneShell.tsx`, `app/src/app/globals.css` |
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
| 7.1 | The browser reports server/client text mismatches ("hydration") from live clocks. It predates this work and the pages still work. | `/command`, `/gov/branches`, `/health-ecosystem` |
| 7.2 | No `favicon.ico`, so the browser logs a 404. | `app/public/` |
| 7.3 | On the small map, the Alaska inset sits partly under the density legend. | `app/src/apps/_shared/GeoMap.tsx` |
| 7.4 | The inbox support thread shows a clock that can differ by a minute between server and browser, causing a hydration warning. It predates this work. | `app/src/apps/_shared/InstitutionChain.tsx` (`EncounterThread`) |
| 7.5 | Under `CIVICOS_AUTH=enforce`, the middleware's session gate sits in front of the other eleven `/api/cron/*` routes, so pg_cron calls (which carry no session cookie) are redirected to `/login` before the route can check `CIVICOS_CRON_SECRET`. Only `/api/cron/update-watchdog` and `/api/releases/health` are exempted, because they authenticate themselves. Every cron route already checks the secret, so the fix is to exempt `/api/cron/*` the same way. | `app/src/middleware.ts` |

## 8. Update Center — security store

Owner decisions (held as configuration in `STORE_POLICY`): the baseline is included free for every nation; the catalogue lists certified third-party vendors only; instant payment and government procurement are both offered. Security updates are never blocked by payment or licence status.

| # | Area | Today | To integrate | Where |
|---|---|---|---|---|
| 8.1 | **Certified security vendors** | Placeholder. Seven products from fictional vendors ("Vendor Alder … Vendor Fir — certified partner (placeholder)") with sample certification notes. | Contract real vendors for host EDR, container/image security, WAF, SIEM connector, managed detection and response, and ransomware-resilient backup. Record what was actually tested and against which platform versions. | `CATALOGUE` in `app/src/lib/data/security-store.ts` |
| 8.2 | **Baseline scanning** | Placeholder. "Baseline host & image scanning" is shown as always on, with a weekly scan date derived from the clock. | Ship a real host and image scanner with every release (including the air-gapped bundle), and report its findings against platform advisories. | `baselineActive()`, `BASELINE_COVERS` in `app/src/lib/data/security-store.ts` |
| 8.3 | **Payment gateway** | Placeholder. "Pay now" records a receipt on the nation's payment rail label (`nationPaymentRail()`). No money moves. | Connect an instant-payment gateway per nation (card, mobile money, instant credit transfer) and confirm settlement before issuing the licence. | `orderAction('pay-now')` in `app/src/lib/data/security-store.ts` |
| 8.4 | **Procurement and invoicing** | Placeholder. A purchase order number raises an invoice at once; a typed bank-transfer reference marks it paid. | Issue invoices from the billing system, reconcile bank transfers against the reference (ISO 20022 camt.054), and support partial payments and credit notes. | `orderAction('order' / 'pay')` |
| 8.5 | **Licence server** | Placeholder. Licence keys are derived from the order id; expiry and seats are tracked in the store. | Issue signed licences from a licence server, enforce seats in the vendor agents, and send renewal reminders. | `issueLicence()` in `app/src/lib/data/security-store.ts` |
| 8.6 | **Security software downloads** | Placeholder. The licensed download returns a labelled JSON manifest. | Serve the vendor's signed agent installers once the licence is active. | `app/src/app/api/releases/security/download/` |
| 8.7 | **Definitions feed** | Placeholder. Definition versions are derived from the clock (one every 6 hours). | Pull signed definition updates from each vendor (or the publisher's mirror for air-gapped nations) and record the applied version per nation. | `definitions()` in `app/src/lib/data/security-store.ts` |
| 8.8 | **Contract pricing** | Partial. Prices are in a reference currency (USD). A nation is quoted in its own currency only once a contract rate is set, and no rate can be set yet. | Let the publisher set each nation's contract currency and rate. | `pricing()` in `app/src/lib/data/security-store.ts`, `SubscribedNation.contractRate` |
| 8.9 | **BYO attestations** | Partial. Attestations are typed statements with a scan date. | Accept the scanner's signed report (e.g. SARIF or CycloneDX VEX) as evidence, not only a statement. | `registerByo()` |

## 9. Out of scope: disaster recovery

| # | Area | Today | To integrate | Where |
|---|---|---|---|---|
| 9.1 | **Disaster recovery** | **Not built.** Update fallback covers bad updates only: it switches software back to the last known good release. It does not cover hardware failure, loss of a data centre or site, regional outages, or corrupted storage. | A separate capability: multi-site redundancy (active/standby or active/active), off-site and offline (immutable) backups, documented RTO/RPO targets per service, regular failover and restore drills, and a DR runbook. Restore points taken before updates are not a substitute for backups. | — (new capability) |
