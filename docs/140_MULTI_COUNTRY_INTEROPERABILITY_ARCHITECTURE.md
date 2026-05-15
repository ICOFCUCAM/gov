# CivicOS — Multi-Country Interoperability Architecture (Companion 140)

This companion specifies the technical architecture of cross-sovereign interoperability — how two or more CivicOS sovereign deployments exchange identity, credentials, payments, judicial requests, customs data, public health data, refugee records, education credentials, and other artifacts across borders without compromising the sovereign authority, citizen consent, or constitutional discipline of any participating sovereign. It complements Companion 15 (planetary cooperation protocols — the principles), Companion 12 (cross-border data), Companion 48 (refugees), Companion 113 (geopolitics), and Companion 139 (digital sovereignty doctrine) by being specifically the technical architecture: protocols, data formats, trust frameworks, federation patterns, dispute resolution, and runbook for cross-sovereign exchange.

The thesis: **cross-border interoperability that works is built on sovereign authority preserved, citizen consent honored, equivalence determined explicitly, and exit engineered**. Cross-border interoperability that fails — historically — has been built on dependency: shared identity providers controlled by one party, payment rails operated by a third party with extraterritorial reach, data-sharing agreements that overwrite sovereign privacy law. CivicOS rejects the dependency pattern and adopts a federation pattern: each sovereign keeps its own identity, its own keys, its own audit vault; cross-border exchange happens through inter-realm gateways with mutual trust frameworks; data flows under explicit treaty with explicit citizen consent; disputes go to bilateral resolution mechanisms; either party may withdraw on published notice.

The discipline: federation not unification; mutual trust frameworks with equivalence determinations; explicit treaty per use case; per-flow consent and receipt; sovereign-held keys at each end; inter-realm gateway with sovereign termination; standard formats from open bodies (W3C VC, OIDC4VP, ISO 18013, ISO 20022, HL7 FHIR, OCDS, EDXL, Schengen II equivalents); cross-border dispute resolution; sovereign exit window published.

---

## 1. Principles

1. **Federation, not unification.** Each sovereign keeps its own keys, identity, audit vault.
2. **Mutual trust framework.** Bilateral or multilateral; explicit; reviewable.
3. **Treaty per use case.** No single "everything" agreement. Identity, payment, customs, health, refugees, etc. are separate treaties.
4. **Citizen consent per flow.** The citizen decides whether their credential or data goes across the border, per purpose.
5. **Receipt per flow.** Citizens see cross-border exchange in their citizen wallet receipt log.
6. **Open standards.** W3C VC, OIDC4VP, ISO 18013-5 mDL, ISO 20022, HL7 FHIR, OCDS, EDXL, OGC standards.
7. **Equivalence explicit.** Equivalence of protection is determined per treaty; published; reviewable; revocable.
8. **Sovereign exit window.** Every treaty has a published exit window; exit is engineered.
9. **Anti-extraterritorial-creep.** Cross-border arrangements do not bring foreign extraterritorial law into the sovereign.
10. **Dispute resolution bilateral or multilateral.** Predictable; published; not arbitrary.

---

## 2. The federation pattern

```
   Sovereign A                         Sovereign B
   ┌────────────────────────┐          ┌────────────────────────┐
   │                        │          │                        │
   │   Citizens (A)         │          │   Citizens (B)         │
   │   Wallet (A)           │          │   Wallet (B)           │
   │   Identity root (A)    │          │   Identity root (B)    │
   │   KMS (A)              │          │   KMS (B)              │
   │   Audit Vault (A)      │          │   Audit Vault (B)      │
   │                        │          │                        │
   │   ┌────────────────┐   │          │   ┌────────────────┐   │
   │   │ CivicBus (A)   │   │          │   │ CivicBus (B)   │   │
   │   └────────┬───────┘   │          │   └────────┬───────┘   │
   │            │           │          │            │           │
   │   ┌────────▼───────┐   │          │   ┌────────▼───────┐   │
   │   │ Inter-realm    │   │          │   │ Inter-realm    │   │
   │   │ gateway (A)    │   │◀─────────┼──▶│ gateway (B)    │   │
   │   └────────────────┘   │          │   └────────────────┘   │
   │                        │          │                        │
   └────────────────────────┘          └────────────────────────┘

       │  Trust framework (treaty-derived) at the gateway:
       │  - mutual recognition determinations
       │  - per-use-case schemas (identity, credential, payment, health…)
       │  - per-flow citizen consent enforcement
       │  - mutual logging / per-flow receipt
       │  - dispute resolution clauses
       │  - sovereign termination clause
```

Each sovereign's identity, KMS, audit vault, and CivicBus stay inside its perimeter. The only point of contact is the inter-realm gateway, which enforces the treaty-derived trust framework. Either sovereign can disconnect the gateway and continue operating fully.

---

## 3. Trust framework (the inter-realm contract)

### 3.1 What it contains

A trust framework between two or more sovereigns specifies:

- **Identity equivalence**: which sovereign-issued identities are accepted in which contexts.
- **Credential equivalence**: which credentials (driver's license, education credential, professional license, vaccination record, etc.) are mutually recognized.
- **Payment rails interop**: which payment instruments and clearing standards are honored.
- **Data exchange schemas**: which schemas (HL7 FHIR profiles, ISO 20022 messages, OCDS contract data, etc.) are exchanged.
- **Trust signaling**: how each side cryptographically attests its issuance and revocation status.
- **Verification protocols**: how the receiving side verifies credentials presented by visitors or expatriates.
- **Consent protocols**: how citizen consent is captured, expressed, and verified per flow.
- **Receipt protocols**: how each flow is logged on each side and presented to the citizen.
- **Privacy protections**: equivalence of data minimization, purpose binding, retention limits.
- **Dispute mechanism**: how grievances are resolved.
- **Withdrawal terms**: notice period; cleanup obligations; data deletion obligations.
- **Review cadence**: when the framework is reviewed and possibly renewed.

### 3.2 Trust framework as a signed artifact

The trust framework is:

- Drafted by negotiators with sovereign authority.
- Signed by sovereign authorities per each sovereign's constitutional process.
- Registered with multilateral standards bodies where applicable (e.g., ICAO for travel documents).
- Published in machine-readable form (JSON-LD with W3C Verifiable Credentials data model) and human-readable form.
- Versioned, with a public diff history.
- Audited per cycle by constitutional officers in each sovereign.

### 3.3 Anti-trust-framework-erosion

- No silent amendment.
- Amendments require constitutional process equivalent to signing.
- Each sovereign can pause its participation pending review.
- Each sovereign can withdraw per the withdrawal terms.

---

## 4. Identity federation

### 4.1 The pattern

Citizens of Sovereign A may need to present identity to systems of Sovereign B (e.g., to enter B as a traveler, to receive medical care while visiting, to enroll a child in school during a posting, to claim a pension as a diaspora citizen, to vote in A's elections while abroad).

The federation pattern:

- A issues identity to its citizens; only A holds the root.
- A's citizen presents an identity credential (W3C VC + ISO 18013-5 mDL profile, signed by A) to a B-side relying party.
- B verifies the signature using A's published verification material.
- B does not contact A in real-time for ordinary verification (privacy); B uses cached published verification material with revocation registry pulled on a schedule.
- B's reliance is on the credential's cryptographic validity and on the trust framework's equivalence determination.

### 4.2 Selective disclosure

Per Companion 03:

- Citizen wallet uses selective disclosure (BBS+, AnonCreds, or W3C VC with BBS+ profiles) so that only the attributes required by the relying party are revealed.
- The citizen approves the disclosure per request.
- The citizen's per-RP UID is unique per relying party (no global identifier).
- Cross-border disclosure follows the same selective disclosure discipline.

### 4.3 Revocation

- A maintains a revocation registry for credentials it issued.
- The revocation registry is published in a standard format (W3C Status List 2021 / Bitstring Status List).
- B pulls the registry on a schedule defined by the treaty.
- Revocation is honored without identifying which credential is being checked (privacy-preserving status check).

### 4.4 Citizen consent and visibility

- The citizen sees in their wallet every cross-border identity presentation.
- The citizen can revoke consent for future presentations.
- The citizen can request audit logs from B-side relying party of past use of presented attributes.

### 4.5 Forbidden in identity federation

- Global identity identifier shared across sovereigns.
- Cross-border identity claims without citizen consent.
- Cross-border verification without selective disclosure where feasible.
- Cross-border data flows that retain biometrics on B side without citizen consent and treaty.
- Foreign access to A's identity root.

---

## 5. Credential federation

### 5.1 The pattern

Citizens hold many credentials beyond identity — driver's licenses, education credentials, professional licenses, vaccination records, marriage records, court orders, asylum determinations. Each may need to be presented across borders.

### 5.2 Per-credential treaty

Each credential type is the subject of a specific treaty section:

- Driver's license: ISO 18013-5 mDL, with country-specific extensions per the treaty.
- Education credential: W3C VC for European Learning Model or analogous; degree, transcript, accreditation status.
- Professional license: W3C VC; profession, jurisdiction, issuance authority, status.
- Vaccination record: ICAO VDS-NC or W3C VC vaccination profile.
- Marriage record: W3C VC with civil status profile.
- Asylum determination: W3C VC with UNHCR profile or per Companion 48.

### 5.3 Mutual recognition determinations

For each credential type, the treaty specifies whether the credential is fully recognized, conditionally recognized, or recognized only for limited purposes. Equivalence is explicit, per credential.

### 5.4 Conflict and dispute

Where a B-side relying party doubts an A-side credential, the treaty's dispute mechanism applies. The citizen does not bear the cost of bilateral disagreement; the sovereigns do.

### 5.5 Discipline

- Anti-arbitrary-rejection of mutually-recognized credentials.
- Anti-data-extraction beyond what the credential discloses.
- Honest disclosure of recognition limits.

### 5.6 Forbidden in credential federation

- Recognition without treaty.
- Credential acceptance with covert data extraction.
- Discrimination among citizens by credential origin in services that recognize the credential.

---

## 6. Payment interop

### 6.1 The pattern

Citizens and businesses across borders need to send and receive payments. The architecture supports cross-border payment without subordinating sovereign payment authority to a foreign clearing entity.

### 6.2 Mechanisms

- ISO 20022 messaging.
- Sovereign-controlled gateways at each end.
- Per-payment receipt with cross-border indicator.
- AML/CFT checks at each end per each sovereign's law.
- Foreign exchange transparency per Companion 46.
- Settlement through agreed mechanism (bilateral nostro/vostro, regional clearing, BIS-mediated settlement, or per-treaty mechanism).

### 6.3 Per Companion 71 (CivicPay)

- CivicPay supports cross-border payments where treaty exists.
- Sovereign payment authority remains; no subordination to private clearing.
- Citizen sees full cost transparency (FX rate, fees, settlement window).
- Anti-predatory-remittance discipline.

### 6.4 Discipline

- Anti-extraterritorial-payment-control.
- Anti-hidden-cost.
- Anti-discrimination-by-corridor.

### 6.5 Forbidden in payment interop

- Cross-border payment rails that require sovereign deference to foreign law.
- Foreign-controlled clearing entity with extraterritorial reach into sovereign rails.
- Hidden cost or hidden FX rate to citizens.
- Discrimination against specific corridors for political reasons.

---

## 7. Health and pandemic data exchange

### 7.1 The pattern

Cross-border health data exchange supports diaspora care, traveler care, public health response to outbreaks, vaccination record portability, and disease surveillance.

### 7.2 Mechanisms

- HL7 FHIR for clinical data exchange.
- IHE profiles for cross-border patient summary, immunization, electronic referral.
- ICAO VDS-NC for vaccination records that are travel-relevant.
- WHO ICD coding.
- Per-flow citizen consent for clinical data.
- Aggregate (de-identified) public health data per treaty.

### 7.3 Per Companion 52 (health systems)

- Cross-border patient summary: emergency-care-relevant subset, with citizen consent.
- Pandemic surveillance: aggregate per Companion 30; case-level only by treaty under public health emergency.
- Vaccination portability: per ICAO standards.

### 7.4 Discipline

- Anti-pandemic-data-misuse for non-health purposes.
- Anti-discrimination by national origin in cross-border medical access.
- Plain language to citizens.

### 7.5 Forbidden in health data exchange

- Cross-border clinical data without per-flow citizen consent (except per pandemic treaty in declared emergency).
- Re-identification of de-identified data.
- Use of health data for immigration enforcement.

---

## 8. Judicial and customs exchange

### 8.1 The pattern

Mutual Legal Assistance Treaties (MLAT), customs cooperation, extradition where applicable, evidence exchange for cross-border investigations.

### 8.2 Mechanisms

- MLAT request through sovereign-controlled gateway.
- Each request reviewed by sovereign judicial authority on receiving end (no automatic compliance).
- Standards for evidence preservation (chain of custody, hash-chained Audit Vault anchoring per Companion 06).
- Customs: WCO data model; per-shipment customs declaration; pre-arrival information exchange where treaty.

### 8.3 Discipline

- Anti-MLAT-bypass.
- Anti-political-persecution through MLAT.
- Anti-discriminatory-enforcement.
- Honest disclosure of MLAT scope.

### 8.4 Forbidden in judicial and customs exchange

- Compliance with foreign request that violates sovereign law.
- Compliance with foreign request without sovereign judicial review.
- Cooperation in political persecution.
- Mass data exchange beyond per-case scope.
- Refoulement of refugees (per Companion 48).

---

## 9. Refugee and migration data

### 9.1 The pattern

Refugees and migrants cross borders. Their records, asylum determinations, family reunification claims, vaccination records, education credentials, and protected status need to travel — without subjecting them to refoulement, surveillance, or arbitrary denial of protection.

### 9.2 Per Companion 48

- Asylum determinations exchanged only with refugee consent and only under treaty consistent with international refugee law.
- Anti-refoulement architecture: a refugee's data is not transmitted to a country from which they are protected.
- Protected categories: data on protected categories is segregated and exchanged only on stricter terms.

### 9.3 Mechanisms

- UNHCR PRIMES integration where applicable.
- Per-record refugee consent.
- Audit logging of every exchange with refugee visibility.
- Strict purpose binding.

### 9.4 Discipline

- Anti-refoulement architecture.
- Anti-surveillance of refugees through data exchange.
- Anti-discrimination by country of origin.

### 9.5 Forbidden in refugee data exchange

- Disclosure to country from which refugee is protected.
- Disclosure without refugee consent.
- Use of refugee data for non-protection purposes.
- Discriminatory enforcement.

---

## 10. Education credential federation

### 10.1 The pattern

A citizen with a degree from A wants it recognized in B for employment, further study, or professional licensure.

### 10.2 Mechanisms

- W3C VC for credentials; profile aligned with European Learning Model, OpenBadges, CLR Standard.
- Issuing institution signs; sovereign accreditation registry signs the institution's status.
- B verifies via cached A registry pull.
- Citizen presents selectively (degree only, full transcript, etc.).
- Mutual recognition determinations per treaty.

### 10.3 Discipline

- Anti-discrimination by credential origin.
- Honest disclosure of recognition limits.
- Plain language to citizens.

### 10.4 Forbidden in education credential federation

- Recognition refused without treaty basis.
- Mass credential data exchange beyond per-citizen presentation.
- Use of education credential for immigration enforcement.

---

## 11. Procurement and contract data (OCDS)

### 11.1 The pattern

Open Contracting Data Standard (OCDS) supports cross-border transparency in public procurement — corruption detection, supplier accountability, comparative analysis.

### 11.2 Mechanisms

- Each sovereign publishes its procurement data in OCDS per Companion 21 §10.
- Multilateral aggregation by civil society or multilateral bodies.
- Cross-border supplier verification.
- Beneficial ownership disclosure linked.

### 11.3 Discipline

- Anti-corruption emphasis.
- Cross-border accountability for multinational suppliers.
- Citizen and civil society standing.

### 11.4 Forbidden in procurement data sharing

- Suppression of OCDS data.
- Misleading OCDS publication.
- Discrimination in supplier disclosure.

---

## 12. Disaster and emergency coordination (EDXL)

### 12.1 The pattern

Cross-border emergencies — earthquakes, floods, pandemics, refugee flows — require rapid coordination across multiple sovereigns. EDXL (Emergency Data Exchange Language) provides standards.

### 12.2 Mechanisms

- EDXL-DE / EDXL-SitRep / EDXL-CAP for cross-border alerting and situational reporting.
- Pre-positioned mutual aid agreements.
- Treaty-based data exchange for emergency periods only.
- Strict sunset on emergency data sharing.

### 12.3 Discipline

- Anti-perpetual-emergency-extension.
- Anti-surveillance-creep via emergency.
- Honest sunset.

### 12.4 Forbidden in emergency coordination

- Continued emergency data sharing past sunset.
- Use of emergency data for non-emergency purposes.
- Discrimination in emergency response.

---

## 13. Inter-realm gateway architecture

### 13.1 The component

```
              ┌────────────────────────────────────────────┐
              │                                            │
              │   Inter-realm gateway (A)                  │
              │                                            │
              │   Inbound (from B):                        │
              │     - mTLS / signed message envelope       │
              │     - treaty-version check                 │
              │     - schema validation per use case       │
              │     - rate limit per flow / per peer       │
              │     - quarantine + AV scan                 │
              │     - sovereign policy engine (OPA-class)  │
              │     - per-flow consent check               │
              │     - receipt issuance + audit anchor      │
              │                                            │
              │   Outbound (to B):                         │
              │     - citizen consent verified             │
              │     - selective disclosure applied         │
              │     - signed envelope                      │
              │     - receipt to citizen                   │
              │     - audit anchor                         │
              │                                            │
              │   Operational:                             │
              │     - per-peer health and quota dashboard  │
              │     - tripwires for anomaly                │
              │     - sovereign termination switch         │
              │     - dual-control for treaty change       │
              │                                            │
              └────────────────────────────────────────────┘
```

### 13.2 Operations

- Operated by sovereign or sovereign-licensed operator.
- Per Companion 28: Sovereign Trust Officer custody of termination switch.
- Per Companion 56: KPIs published per gateway.
- Per Companion 136: SOC monitoring of gateway traffic.

### 13.3 Discipline

- Anti-bypass of gateway.
- Anti-shadow-inter-realm-connection.
- Anti-hidden-data-flow.

### 13.4 Forbidden in gateway operation

- Cross-border flows that bypass the gateway.
- Treaty changes without dual-control.
- Suppression of gateway logging.
- Use of gateway for surveillance.

---

## 14. Dispute resolution

### 14.1 The pattern

Disagreements arise: a credential not recognized, a payment refused, a data flow disputed, a citizen harmed.

### 14.2 Mechanisms

- Per-treaty bilateral resolution committee.
- Tiered escalation: technical → policy → diplomatic.
- Citizen-side avenue: each sovereign's domestic legal system available to its own citizens regardless of treaty.
- Multilateral arbitration where applicable.

### 14.3 Discipline

- Anti-citizen-burden.
- Honest engagement.
- Transparent outcomes (per Companion 31 §8 with sensitive data redaction).

### 14.4 Forbidden in dispute resolution

- Forcing citizens into foreign jurisdiction.
- Use of disputes for political reward.
- Suppression of dispute outcomes.

---

## 15. Multilateral standards engagement

### 15.1 The pattern

CivicOS sovereigns participate actively in:

- W3C (Verifiable Credentials, DIDs, identity standards).
- IETF (network protocols, security, privacy).
- ISO (data standards, security, biometrics).
- ITU (telecommunications, digital identity).
- IEEE (technical standards).
- WCO (customs).
- ICAO (travel documents).
- WHO (health standards).
- OASIS (e-government).
- OpenWallet Foundation.
- Civic society organizations (Open Knowledge Foundation, Article 19, EFF, etc.).

### 15.2 Discipline

- Anti-standards-capture.
- Engagement on terms favorable to sovereigns of all scales.
- Solidarity with smaller sovereigns in standards negotiation.

### 15.3 Forbidden in standards engagement

- Use of standards body for political coercion.
- Capture of standards by single sovereign or vendor.
- Discrimination against smaller sovereigns in standards bodies.

---

## 16. Cross-references

- Companion 12 (cross-border data).
- Companion 15 (planetary cooperation principles).
- Companion 30 (pandemic surveillance).
- Companion 46 (foreign exchange transparency).
- Companion 48 (refugees).
- Companion 52 (health systems).
- Companion 71 (CivicPay).
- Companion 113 (geopolitics).
- Companion 136 (nation-state threat model — gateway as target).
- Companion 137 (sovereign cloud).
- Companion 139 (digital sovereignty doctrine).

---

## 17. KPIs

| KPI | Indicator |
|---|---|
| Trust framework coverage | Per use case; published |
| Mutual recognition determinations | Per credential type; up-to-date |
| Per-flow citizen consent compliance | Audited |
| Per-flow receipt issuance | 100% |
| Gateway availability | Per-treaty SLO |
| Cross-border dispute resolution time | Median time |
| Refugee data exchange anti-refoulement | Zero incidents |
| MLAT process adherence | Audited |
| Standards body engagement | Active per body |
| Sovereign exit drills | Annual per treaty |

---

## 18. Forbidden in multi-country interoperability

CivicOS will not:

- Permit cross-border identity claims without citizen consent.
- Allow foreign access to sovereign identity root.
- Permit credential acceptance with covert data extraction.
- Allow payment rails that subordinate sovereign authority.
- Permit clinical data exchange without per-flow consent.
- Allow MLAT compliance without sovereign judicial review.
- Permit refoulement of refugees through data exchange.
- Allow education credential discrimination beyond treaty.
- Permit OCDS data suppression.
- Allow continued emergency data exchange past sunset.
- Permit gateway bypass.
- Allow treaty change without constitutional process.
- Permit dispute resolution that burdens citizens with foreign jurisdiction.
- Allow standards body capture.
- Permit silent inter-realm dependency that the sovereign cannot exit.

This list grows; it does not shrink.

---

## 19. The multi-country interoperability north star

Cross-border interoperability that works is built on sovereign authority preserved, citizen consent honored, equivalence explicit, and exit engineered. CivicOS implements federation, not unification — each sovereign keeps its keys, its identity root, its audit vault, its civic bus — and exposes a single point of contact at the inter-realm gateway, governed by a treaty-derived trust framework, with per-flow citizen consent and receipts, with bilateral or multilateral dispute resolution, and with a published sovereign exit window.

When CivicOS becomes infrastructure where cross-border flows are taken for granted, where citizen consent is implied rather than captured, where treaties accumulate beyond review, where dependencies pile up that no sovereign can exit, where extraterritorial law leaks across borders through architecture, where smaller sovereigns are pressured into terms they would not freely accept — it has failed at federation and slipped into capture. Capability without federation discipline is dependency wearing cooperation's costume.

When the platform supports cross-border interoperability with sovereign keys at each end, trust frameworks reviewed periodically, citizen consent per flow, receipts per flow, dispute resolution that doesn't burden citizens, standards body engagement on fair terms, and exit drills run annually — it earns the right to be infrastructure for plural sovereignties that cooperate without surrendering.

The discipline is daily. The federation is real. The treaties are explicit. The consents are captured. The receipts are visible. The exits are engineered. The standards are open.

Sovereigns cooperate. Citizens consent. Architecture preserves authority. Anything less is institutionalized dependency masquerading as interoperability — and the platform's job is to prevent precisely that.
