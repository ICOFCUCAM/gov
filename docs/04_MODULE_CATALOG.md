# CivicOS — Module Catalog (Companion 04)

Reference catalog with one-page profiles per module. Each profile follows the standard module contract (purpose, users, workflows, permissions, data, AI, offline, integrations, SLO, evolution).

---

## M01 — CivicID (National Identity)

- **Purpose:** Single source of identity truth for natural persons; foundation for all other services.
- **Users:** Citizens, residents, refugees, registrars, officers across ministries, banks, telcos.
- **Workflows:** Enrollment, deduplication, credential issuance, authentication (L1–L4), revocation, lifecycle events (birth, marriage, death).
- **Permissions:** `id.enroll`, `id.read.basic`, `id.read.full` (scoped), `id.update`, `id.revoke`, `id.audit.read`.
- **Data:** Demographic, biometric (templates), credential references, authentication audit.
- **AI:** Liveness detection, deduplication assistance (ABIS), fraud anomaly. All Class B.
- **Offline:** Wallet credential supports offline verification; enrollment can be queued offline.
- **Integrations:** Civil registration, Civic Wallet, all consumers via CivicBus, banks via eKYC.
- **SLO:** 99.99% authentication availability; p99 < 800 ms.
- **Evolution:** Add post-quantum credential profile; expand to verifiable presentations across borders.

---

## M02 — Civic Wallet

- **Purpose:** Citizen-owned interface to identity, money, credentials, consents.
- **Users:** Citizens, businesses (Business Wallet variant).
- **Workflows:** Onboard, present credential, sign, pay, consent, receive document.
- **Permissions:** Wallet-scoped; user is principal; selective disclosure default.
- **Data:** Local encrypted vault; cloud sync optional with E2EE.
- **AI:** Personal civic assistant (Class A informational), Class B for filling forms.
- **Offline:** Full offline operation for credential presentation, signed documents, queued transactions.
- **Integrations:** Native iOS, Android; PWA; USSD twin; KYC providers.
- **SLO:** Backend 99.95%; on-device functionality 100% offline-capable.
- **Evolution:** Multi-device sync, social recovery, AI-mediated form filling with explicit consent.

---

## M03 — CivicPay

- **Purpose:** Sovereign payments and treasury rails.
- **Users:** Treasury, central bank, ministries, citizens, businesses, banks, mobile money operators.
- **Workflows:** Collect, disburse, reconcile, refund, escrow.
- **Permissions:** Per-account, per-program; multi-party signing for above-threshold.
- **Data:** Event-sourced ledger; ISO 20022 payment messages; reconciliation artifacts.
- **AI:** Fraud and AML scoring (Class B); anomaly detection (Class A informational).
- **Offline:** Queue-and-forward for low-value collections at agents.
- **Integrations:** RTGS, ACH, instant payments, mobile money, cards, CBDC.
- **SLO:** 99.99% rails; p99 settlement < 5 s for instant; batch < 1 hour for 10M.
- **Evolution:** Programmable money primitives, cross-border instant rails, conditional disbursements.

---

## M04 — CivicRev (Tax & Revenue)

- **Purpose:** Tax assessment, filing, collection, audit.
- **Users:** Revenue authority, taxpayers (PIT, CIT, VAT), customs brokers.
- **Workflows:** Register, file, pay, refund, audit, dispute.
- **Permissions:** Taxpayer self-service; officer scoped by region/segment; auditor read.
- **Data:** Returns, e-invoices, payment matches, audit trails.
- **AI:** Risk-based audit selection (Class C with explainability); pre-filled returns (Class B); chatbot help (Class A).
- **Offline:** Officer field audits with offline data capture.
- **Integrations:** Banks, e-invoicing platforms, payroll providers, customs.
- **SLO:** 99.95%; filing window peak handling 100x baseline.
- **Evolution:** Real-time withholding, micro-VAT for informal economy.

---

## M05 — CivicProcure

- **Purpose:** End-to-end public procurement with transparency by default.
- **Users:** Procurement officers, vendors, auditors, public.
- **Workflows:** Plan, tender, evaluate, award, contract, deliver, pay, audit.
- **Permissions:** Strict separation: requester ≠ approver ≠ payer; vendor self-service.
- **Data:** Plans, tenders, bids, contracts, evidence, payments.
- **AI:** Collusion detection, phantom-vendor detection (Class B).
- **Offline:** Field officer evidence capture.
- **Integrations:** Tax (vendor compliance), social security, beneficial ownership registry, payments, OCDS publication.
- **SLO:** 99.9%; tender deadline integrity guaranteed.
- **Evolution:** Smart-contract-anchored milestone payments where lawful; supplier diversity analytics.

---

## M06 — CivicPermit

- **Purpose:** Issue, renew, and inspect permits and licenses across sectors.
- **Users:** Regulators, applicants, inspectors.
- **Workflows:** Apply, evaluate, inspect, decide, issue, renew, revoke.
- **Permissions:** Sector-scoped; applicant self-service.
- **Data:** Application, evidence, inspection reports, decisions.
- **AI:** Application triage; inspection routing optimization (Class B).
- **Offline:** Inspector field app fully offline.
- **Integrations:** Land registry (location), tax (compliance), payments (fees).
- **SLO:** 99.9%.
- **Evolution:** Risk-based regulation with automated low-risk renewals.

---

## M07 — CivicLand

- **Purpose:** Cadastre and title registry; respect customary tenure.
- **Users:** Lands officers, surveyors, citizens, banks, courts.
- **Workflows:** Survey, title issuance, transfer, mortgage, subdivision, dispute.
- **Permissions:** Strict — title-affecting actions require multi-factor and notification.
- **Data:** Parcels, titles, surveys, encumbrances, transactions.
- **AI:** Drone/satellite ingestion; valuation models (Class B); fraud anomaly (Class B).
- **Offline:** Field surveys with later sync.
- **Integrations:** GIS, banks (mortgages), tax (property), courts.
- **SLO:** 99.95%; titled transactions audited daily.
- **Evolution:** Continuous parcel updates from EO data; tenure formalization workflows.

---

## M08 — CivicHealth

- **Purpose:** Longitudinal health record + facility + payer + public health.
- **Users:** Patients, clinicians, facility admins, payers, public health officers.
- **Workflows:** Encounter, prescribe, refer, claim, surveil, vaccinate.
- **Permissions:** Strict consent; break-glass with mandatory review.
- **Data:** FHIR resources, lab/imaging, claims.
- **AI:** Triage, imaging classification, drug interaction (Class A/B); outbreak prediction (Class A).
- **Offline:** Point-of-care apps offline; CHW apps offline-first.
- **Integrations:** CivicID (MPI), CivicPay (claims), supply chain.
- **SLO:** 99.95%; offline-first guarantees clinical continuity.
- **Evolution:** Genomic data layer, precision public health, climate-coupled disease modeling.

---

## M09 — CivicLearn

- **Purpose:** Education from ECD to lifelong learning.
- **Users:** Learners, teachers, school admins, ministry, employers.
- **Workflows:** Enroll, attend, assess, certify, finance.
- **Permissions:** Learner-centric for credentials; school-admin scoped.
- **Data:** Records, attendance, grades, credentials.
- **AI:** Adaptive teaching suggestions (Class B), dropout risk (Class B with mandatory follow-up).
- **Offline:** School operations offline.
- **Integrations:** CivicID, CivicPay (fees, bursaries), CivicWork (credentials).
- **SLO:** 99.9%.
- **Evolution:** AI tutors mediated through teachers; lifelong skill graph.

---

## M10 — CivicCare (Welfare)

- **Purpose:** Targeted social protection at scale.
- **Users:** Beneficiaries, social workers, program managers, auditors.
- **Workflows:** Register, assess, enroll, disburse, monitor, appeal.
- **Permissions:** Beneficiary-centric; case worker scoped; program-isolated.
- **Data:** Social registry, eligibility decisions, payments.
- **AI:** Targeting models (Class C with audit + appeal); fraud detection (Class B).
- **Offline:** Field enrollment offline; agent payouts offline-capable.
- **Integrations:** CivicID, CivicPay, civil registration.
- **SLO:** 99.95% during disbursement windows.
- **Evolution:** Shock-responsive surge; universal social ID for life-cycle benefits.

---

## M11 — CivicWork

- **Purpose:** Labor market, pensions, work permits.
- **Users:** Workers, employers, regulators.
- **Workflows:** Register employer, contract, payroll report, pension contribution, inspect, claim.
- **Permissions:** Worker self-service; employer admin; regulator oversight.
- **Data:** Contracts, payroll, contributions, inspections.
- **AI:** Job matching (Class B); inspection targeting (Class B).
- **Offline:** Inspector app offline.
- **Integrations:** Tax, social security, CivicLearn (skills), CivicID.
- **SLO:** 99.9%.
- **Evolution:** Portable benefits for gig economy; informal economy on-ramp.

---

## M12 — CivicJustice

- **Purpose:** Courts and justice administration.
- **Users:** Judges, lawyers, parties, police, prisons.
- **Workflows:** File, schedule, hear, decide, appeal, enforce.
- **Permissions:** Strict; judiciary controls own keys.
- **Data:** Cases, evidence, decisions.
- **AI:** Drafting assistance (Class D — assistive only).
- **Offline:** Limited; court rooms have offline fallback for proceedings recording.
- **Integrations:** CivicID, CivicPay (fees, fines), prisons.
- **SLO:** 99.9%.
- **Evolution:** Better access to justice via tele-hearings; explainable case-management AI.

---

## M13 — CivicGuard

- **Purpose:** Public safety and emergency response.
- **Users:** Dispatchers, first responders, citizens.
- **Workflows:** Receive call, dispatch, respond, investigate.
- **Permissions:** Strict; classified data tier-isolated.
- **Data:** Calls, incidents, units, evidence.
- **AI:** CAD optimization (Class B), public alert routing (Class A informational).
- **Offline:** First responder devices offline-capable.
- **Integrations:** CivicID, telephony, broadcast.
- **SLO:** 99.99% for emergency dispatch.
- **Evolution:** AI-assisted triage with strict guardrails; multi-agency interoperability.

---

## M14 — CivicMove

- **Purpose:** Transport ecosystem.
- **Users:** Drivers, vehicle owners, transit operators, regulators.
- **Workflows:** License, register, inspect, ticket, toll.
- **Permissions:** Owner-centric; regulator scoped.
- **Data:** Drivers, vehicles, infringements, transit ops.
- **AI:** Signal optimization (Class C with safe defaults); accident prediction (Class A).
- **Offline:** Roadside enforcement offline.
- **Integrations:** Insurance providers, banks (lien), CivicPay (tolls/fines).
- **SLO:** 99.9%.
- **Evolution:** EV/charging registry; autonomous vehicle data sharing.

---

## M15 — CivicGrow

- **Purpose:** Agriculture and food security.
- **Users:** Farmers, extension officers, cooperatives, ministry.
- **Workflows:** Register, advise, subsidize, insure, monitor.
- **Permissions:** Farmer self-service; coop admin; ministry oversight.
- **Data:** Farmers, plots, crops, weather, market prices.
- **AI:** Pest classification (Class A); yield forecasting (Class A); advisory chatbots (Class A).
- **Offline:** Farmer apps and extension officer apps fully offline.
- **Integrations:** CivicLand (plots), CivicPay (subsidies), satellite data, weather.
- **SLO:** 99.5%; offline-first for field.
- **Evolution:** Climate-resilient cropping advisory; carbon credit integration for smallholders.

---

## M16 — CivicGreen

- **Purpose:** Environment and climate.
- **Users:** Environmental regulators, industry, public, scientists.
- **Workflows:** EIA, permits, monitoring, compliance, carbon registry.
- **Permissions:** Regulator scoped; public transparency by default.
- **Data:** Permits, monitoring, carbon projects.
- **AI:** Pollution attribution (Class B); deforestation alerts (Class A).
- **Offline:** Field inspection offline.
- **Integrations:** CivicLand, satellite, IoT sensors.
- **SLO:** 99.5%; sensor pipelines tolerate intermittency.
- **Evolution:** National climate twin; cross-border carbon trade.

---

## M17 — CivicBorders

- **Purpose:** Immigration and border management.
- **Users:** Border officers, travelers, foreign affairs.
- **Workflows:** Visa, entry, exit, refugee, asylum.
- **Permissions:** Officer scoped; traveler self-service for e-visas.
- **Data:** Travelers, visas, movements, watch lists.
- **AI:** Risk scoring (Class B with explainability and appeal); biometric matching (Class B).
- **Offline:** Border posts can operate degraded mode.
- **Integrations:** CivicID, INTERPOL, airlines.
- **SLO:** 99.95%; border posts have 99.99% local availability.
- **Evolution:** Cross-border digital travel credentials; biometric corridors.

---

## M18 — CivicBuild

- **Purpose:** Public works and infrastructure asset management.
- **Users:** Works ministry, contractors, inspectors.
- **Workflows:** Inventory, assess, plan, contract, execute, maintain.
- **Permissions:** Asset-owner scoped.
- **Data:** Assets, conditions, projects, contracts.
- **AI:** Predictive maintenance (Class B); cost forecasting (Class A).
- **Offline:** Field condition surveys offline.
- **Integrations:** CivicProcure, CivicLand, GIS.
- **SLO:** 99.5%.
- **Evolution:** Digital twins of major infrastructure; BIM-integrated lifecycle.

---

## M19 — CivicCity

- **Purpose:** Municipal operating system.
- **Users:** City staff, residents, businesses.
- **Workflows:** Bill, collect, permit, complain, maintain, plan.
- **Permissions:** City scoped; resident self-service.
- **Data:** Properties, bills, complaints, assets.
- **AI:** Service ticket routing (Class B); revenue forecasting (Class A).
- **Offline:** Field officer apps offline.
- **Integrations:** CivicLand, CivicPay, CivicGreen, CivicMove.
- **SLO:** 99.9%.
- **Evolution:** Participatory budgeting at scale; smart-city sensor integration.

---

## M20 — CivicVoice

- **Purpose:** Government communications fabric.
- **Users:** Communications offices, all modules as event sources.
- **Workflows:** Author, segment, schedule, send, measure.
- **Permissions:** Per-campaign approval; emergency broadcast restricted.
- **Data:** Audiences (consented), templates, campaigns, deliveries.
- **AI:** Translation (Class A); audience suggestion under privacy constraints (Class B).
- **Offline:** Channel-specific.
- **Integrations:** SMS, USSD, IVR, push, social, print.
- **SLO:** 99.9% messaging; emergency cell broadcast 99.99%.
- **Evolution:** Multi-modal accessibility at scale.

---

## M21 — CivicStat

- **Purpose:** National statistics.
- **Users:** Statistics office, researchers, public.
- **Workflows:** Census, surveys, indicators, micro-data.
- **Permissions:** Disclosure control; researcher access via secure rooms.
- **Data:** Aggregate indicators; controlled micro-data.
- **AI:** Edit-and-imputation (Class B); small-area estimation (Class A).
- **Offline:** Enumerator apps offline.
- **Integrations:** All registries via consented anonymized exports.
- **SLO:** 99.5%.
- **Evolution:** Continuous statistics replacing decennial census.

---

## M22 — CivicLaw

- **Purpose:** Legislation and parliament operations.
- **Users:** Legislators, drafters, public.
- **Workflows:** Draft, consult, vote, gazette.
- **Permissions:** Drafter-scoped; public transparency.
- **Data:** Bills, amendments, votes, gazette.
- **AI:** Drafting assistance (Class D); cross-statute conflict detection (Class A).
- **Offline:** Limited.
- **Integrations:** Citizen consultation channels.
- **SLO:** 99.5%.
- **Evolution:** Computable law representations for executable policy.

---

## M23 — CivicForeign

- **Purpose:** Consular and diaspora services.
- **Users:** Consular officers, diaspora citizens.
- **Workflows:** Passport, consular registration, diaspora wallet, treaties registry.
- **Permissions:** Consular scoped; citizen self-service.
- **Data:** Passports, consular cases, treaties.
- **AI:** Translation (Class A); consular case triage (Class B).
- **Offline:** Consular kits operate offline.
- **Integrations:** CivicID, CivicBorders.
- **SLO:** 99.5%.
- **Evolution:** Mutual recognition with regional partners.

---

## M24 — CivicShield

- **Purpose:** Sovereign cyber defense.
- **Users:** National cyber agency, sector CERTs.
- **Workflows:** Detect, contain, eradicate, recover, share intel.
- **Permissions:** Highly restricted; classified.
- **Data:** Threat intel, incident records.
- **AI:** Detection (Class B); triage (Class B); auto-response (Class C with kill switch).
- **Offline:** SOC has offline fallback comms.
- **Integrations:** All modules via telemetry; international CERTs.
- **SLO:** 99.99%.
- **Evolution:** Post-quantum readiness; AI-driven adversary emulation.

---

## M25 — CivicMind

- **Purpose:** AI authority, model registry, agent runtime.
- **Users:** AI authority, ministries, vendors.
- **Workflows:** Register, evaluate, deploy, monitor, deprecate.
- **Permissions:** AI authority scoped.
- **Data:** Model registry, eval results, transcripts, AIBOMs.
- **AI:** Self-monitoring; auto-evals; bias scans.
- **Offline:** N/A — control plane.
- **Integrations:** All modules using AI.
- **SLO:** 99.95%.
- **Evolution:** Public model passports; cross-border AI passporting.

---

## Module evolution governance

- Each module has a roadmap maintained by its owner ministry, reviewed quarterly with the Sovereign Steering Committee.
- Backwards-incompatible changes require: 12-month notice, transition tooling, dual-running window, public consultation.
- Sunsetting a module requires: legal authority, data preservation plan, citizen communications, archive integration.
