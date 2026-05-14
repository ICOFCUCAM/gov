# CivicOS — Inter-Platform Protocols (Companion 33)

This companion specifies how CivicOS interoperates with non-CivicOS systems: legacy government platforms, foreign sovereign deployments running different stacks, commercial cloud and SaaS, banks and financial market infrastructure, telecoms and mobile money operators, multilaterals, NGOs, academic institutions, and private-sector partners. It complements the planetary protocols of Companion 15 (which assume both sides are CivicOS deployments) by addressing the general case.

The thesis: **CivicOS exists in a heterogeneous ecosystem and must operate well with what is, not just with what should be**. A sovereign cannot wait for the world to standardize; it must transact today with banks running 1980s mainframes, foreign governments running proprietary systems, multilaterals on their own platforms, and the private sector on a thousand bespoke stacks. CivicOS provides typed, governed, sovereignty-respecting interfaces to all of them — without surrendering its own commitments.

The discipline: every external system that touches CivicOS does so through documented protocols, with clear scope, audit trail, and exit paths. Adapters bridge legacy. Standards bridge peers. Treaties bridge sovereigns. Vendor contracts bridge commercial. The architecture absorbs heterogeneity without compromise.

---

## 1. Principles

1. **Interoperate with everyone CivicOS lawfully should.** Sovereignty is not isolation.
2. **Never compromise CivicOS commitments to interoperate.** Better friction than betrayal.
3. **Adapter pattern for legacy.** Wrap, don't rewrite, what isn't ready to change.
4. **Open standards over proprietary.** Where possible; where not, use the open standard plus a translator.
5. **Typed, audited, attributable.** Every external interaction is documented.
6. **Reciprocity where appropriate.** Mutual recognition for symmetric trust.
7. **Sovereign exit always.** External dependencies carry tested exit paths.
8. **Transparency about external dependencies.** Citizens see when their service uses external systems.
9. **Rights apply across boundaries.** A citizen's CivicOS rights do not stop at the integration point.
10. **Vendor coercion resistance built in.** External integrations don't open backdoors.

---

## 2. Categories of external systems

| Category | Examples | Interoperation pattern |
|---|---|---|
| Legacy domestic | Old finance system, paper-based registry | Adapter + migration plan |
| Sovereign peers (CivicOS) | Other CivicOS deployments | Planetary protocols (Companion 15) |
| Sovereign peers (non-CivicOS) | Foreign governments on different stacks | Bilateral protocols + adapters |
| Multilateral | World Bank, UN, AU, ASEAN | Standardized exchange + governance |
| Banks & financial market infrastructure | RTGS, ACH, SWIFT, mobile money switches | ISO 20022 + sovereign-controlled gateways |
| Telecoms | Mobile network operators | Carrier APIs + USSD/SMS gateways |
| Cloud & SaaS | AWS, Azure, GCP, Salesforce-class | Sovereign-acceptable contracts + sovereign keys |
| AI providers | Frontier model providers | Tier 3 contracts (Companion 18 §13) |
| Civil society | NGOs, journalists, academia | FOI + Civic Data Trust + public APIs |
| Private sector | Businesses, vendors, partners | Business Wallet + open APIs |
| International standards bodies | W3C, ISO, IETF, HL7 | Active participation; profile development |

Each category has its own pattern, governance, and discipline.

---

## 3. The integration layer

### 3.1 Architecture

```
                  CivicOS Core
                       |
              +--------+--------+
              | CivicBus +      |
              | Trust Services  |
              +--------+--------+
                       |
              +--------+--------+
              | Integration     |
              | Layer (typed,   |
              | audited,        |
              | attributable)   |
              +--------+--------+
                       |
       +-------+-------+-------+-------+
       |       |       |       |       |
   Legacy   Banks  Telecoms  Cloud  External
   adapters gateways  APIs   contracts agencies
       |       |       |       |       |
       +-------+-------+-------+-------+
                       |
          External systems / partners
```

### 3.2 Components

- **Adapter** — translates between CivicOS protocols and legacy/external protocols.
- **Gateway** — protocol-specific (banking gateway, telecom gateway, multilateral gateway).
- **Translator** — semantic translation between CivicOS data dictionary and external code lists.
- **Trust bridge** — translates between CivicOS trust services (PKI, signatures) and external trust frameworks.
- **Audit bridge** — emits audit records for every external interaction.
- **Rate limiter** — manages capacity and protects from external system instability.

### 3.3 Discipline

- Every adapter is registered, owned, and maintained.
- Every translator is versioned and lineage-tracked.
- Every external interaction emits to Audit Vault.
- Every integration is reviewed at least annually for continued necessity.

---

## 4. Legacy systems

### 4.1 The pattern

Many sovereigns adopt CivicOS while operating decades-old legacy systems. Forcing immediate replacement is risky (Companion 26 §1 — Big Bang Migration). Instead:

1. **Wrap** the legacy system with an adapter.
2. **Operate** in parallel during transition.
3. **Compare** outputs to detect drift.
4. **Migrate** module by module, with rollback ready.
5. **Retire** legacy when the new module is stable.

### 4.2 Adapter discipline

- Adapter exposes legacy data through CivicBus services using CivicOS schemas.
- Adapter does not allow CivicOS modules to write to legacy unless contracted.
- Adapter audits every interaction.
- Adapter preserves audit trail when records flow either way.

### 4.3 Migration discipline

- Per Companion 03 (country playbook): phased adoption.
- Shadow operation before pilot; pilot before active.
- Officer training on new and old.
- Roll-back tested before each module activation.

### 4.4 Decommission discipline

- Legacy data archived per retention rules.
- Legacy decommissioned only after successor stable and adoption complete.
- Documentation for legacy preserved for audit purposes.

---

## 5. Banking and financial market infrastructure

### 5.1 The pattern

CivicPay (Volume I §9) integrates with central banks, commercial banks, mobile money operators, card networks, and (where applicable) cross-border rails.

### 5.2 Protocols

- **ISO 20022** native messaging.
- **Legacy ISO 8583** supported through translation gateway.
- **Open Finance APIs** (FAPI 2.0 baseline) for AISP/PISP capabilities.
- **GSMA Mobile Money API** for mobile money operators.
- **SWIFT** for legacy international where regional rails not available.

### 5.3 Sovereign-controlled gateways

- Payment gateways operated by central bank or under central bank supervision.
- Sovereign keys for signing.
- No vendor backdoors.
- Multi-vendor for resilience.

### 5.4 Discipline

- AML/CFT obligations met with explainability (Companion 10 §2).
- Privacy floors preserved (no surveillance through payments aggregates).
- Cross-border data flow limited per local law.
- Foreign coercion resistance per Companion 24 §8.

---

## 6. Telecoms

### 6.1 The pattern

Mobile network operators are essential infrastructure for citizen-facing CivicOS — USSD, SMS, IVR, mobile data, Civic Wallet on mobile devices.

### 6.2 Protocols

- USSD gateway integration with operators.
- SMS bulk delivery for notifications.
- IVR routing for voice services.
- Number portability respected.
- Cell broadcast for emergencies.

### 6.3 Discipline

- Operators sign cooperation agreements.
- Citizens' communications privacy preserved (operators are pipes, not surveilles).
- No content interception by operators on behalf of state outside lawful intercept module (Companion 24 §4).
- Multi-operator coverage; no monopoly bottleneck.

### 6.4 Internet shutdown response

- CivicOS strongly opposes internet shutdowns affecting platform services.
- Where shutdowns occur, fallback channels (USSD, SMS, IVR) preserved.
- Civil society standing to challenge shutdowns.
- Constitutional officers monitor shutdown impacts.

---

## 7. Cloud and SaaS providers

### 7.1 The pattern

Some workloads run on commercial cloud (sovereign-acceptable terms) or use commercial SaaS for non-critical functions.

### 7.2 Discipline

- Sovereign cloud preferred for sensitive workloads.
- Hyperscaler regions in-country acceptable for non-sensitive under sovereign-acceptable contracts.
- SaaS for non-critical only.
- Sovereign keys for any sensitive data.
- Sovereign exit clauses.
- Regular sovereignty audits.

### 7.3 Cloud contracts

- Data residency clauses.
- Foreign coercion resistance clauses.
- Audit rights.
- Notice periods on changes.
- Documented exit transition.

### 7.4 What's never on commercial cloud

- Identity registry (CivicID).
- Audit Vault.
- Lawful intercept infrastructure.
- Election infrastructure.
- Sovereign keys.
- Strategic state secrets.
- Sensitive citizen records (medical, judicial, etc.) absent sovereign-acceptable terms.

---

## 8. Foreign sovereign integration (non-CivicOS)

### 8.1 The pattern

Many sovereigns will run non-CivicOS systems indefinitely. Bilateral and multilateral cooperation must work across this heterogeneity.

### 8.2 Protocols

- International standards: W3C VC for credentials, ISO 20022 for payments, ICAO for travel documents, FHIR for health.
- Bilateral profile agreements where international standards insufficient.
- Adapters at the border.

### 8.3 Discipline

- Mutual recognition reciprocity.
- Sovereign opt-outs preserved.
- Privacy floors apply on outbound data.
- Inbound data subject to local processing rules.
- Cross-border data flow per treaty + local law.

### 8.4 Forbidden

- Sharing citizen data with sovereigns not adhering to baseline rights commitments.
- Using foreign-system integration to circumvent CivicOS commitments.
- Honoring foreign demands without local court order.

---

## 9. Multilateral organizations

### 9.1 The pattern

World Bank, AfDB, EU, UNDP, WHO, etc. operate their own systems and require integration for funding flows, reporting, technical cooperation.

### 9.2 Protocols

- Funding flow tracking through CivicPay with multilateral attribution.
- Reporting through standardized formats (e.g., IATI for development assistance transparency).
- Technical cooperation through documented APIs.

### 9.3 Discipline

- Sovereign autonomy in policy decisions.
- Reporting transparency without compromising sovereign-sensitive matters.
- Citizens' Assembly visibility into multilateral cooperation.
- Civil society access to multilateral cooperation data.

### 9.4 Conditionality discipline

- Multilateral conditionality cannot require capabilities CivicOS forbids.
- Multilateral conditionality cannot require surveillance, discrimination, or rights violations.
- Sovereigns retain right to refuse conditionality and bear consequences.

---

## 10. Civil society, journalism, academia

### 10.1 The pattern

Civil society, media, and academia need access to platform data for accountability, journalism, and research.

### 10.2 Mechanisms

- Open data by default for non-sensitive aggregates.
- FOI infrastructure for inquiries.
- Civic Data Trusts for research access (Companion 13 §6).
- Public APIs with civic-tech free tier.
- Standing technical access for accredited civil society organizations to platform telemetry (privacy-respecting).

### 10.3 Discipline

- Journalist source protection enforced.
- Whistleblower channels for platform-related concerns.
- Plain-language summaries of complex data.
- Translation services for civil society to engage technical material.

### 10.4 Forbidden

- Restricting civil society access through technical opacity.
- Retaliation against journalists or civil society.
- Surveillance of civil society in their lawful work.

---

## 11. Private sector

### 11.1 The pattern

Private businesses interact with CivicOS for tax, licensing, employment, procurement, financial services, and access to citizens.

### 11.2 Mechanisms

- Business Wallet (Companion 17 §9) for entity interactions.
- Open Finance APIs for fintech.
- Marketplace for civic-tech products (Volume I §41).
- e-Invoicing for tax compliance.
- Procurement portals.

### 11.3 Discipline

- Businesses are entities, not principals over citizens.
- Citizen rights preserved when businesses interact with platform.
- Commercial use of citizen data tightly constrained.
- Anti-fraud and AML obligations met.

### 11.4 Forbidden

- Commercial exploitation of citizen data through business integrations.
- Business access to citizen data beyond consented scope.
- Use of CivicOS for commercial advantage to favored businesses.

---

## 12. International standards bodies

### 12.1 The pattern

CivicOS aligns with and contributes to international standards (per Companion 19 §3.5).

### 12.2 Active participation

- W3C: identity credentials, decentralized identifiers.
- ISO: payment messaging, security, privacy.
- IETF: protocols.
- HL7: health information exchange.
- OGC: geospatial.
- GS1: supply chain.
- OCDS: open contracting.
- OECD: AI principles.
- Digital Public Goods Alliance: public goods standards.
- GovStack: government building blocks.

### 12.3 Profile development

- CivicOS profiles published as open standards.
- Profiles maintained alongside source standards.
- Profile evolution coordinated with source bodies.

### 12.4 Reciprocity

- Standards work benefits all sovereigns, not just CivicOS deployments.
- CivicOS contributions are open and free.
- No CivicOS-specific lock-in through standards.

---

## 13. Inter-platform tripwires

- External system requesting access beyond agreed scope → access paused; investigation.
- External system telemetry detection → investigation; vendor accountability.
- Foreign coercion attempt through integration → activate sovereignty defenses.
- External system performance degrading citizen experience → fallback activated; vendor accountability.
- External system rights compliance gap discovered → remediation or termination.
- Detected use of external integration for unintended purposes → halt + investigation.

---

## 14. Rights across boundaries

A citizen's CivicOS rights don't stop at integration points.

### 14.1 Privacy

- Citizen data shared externally only with consent or lawful authority.
- External processing under privacy floors.
- Inbound data on citizen subject to local processing rules.

### 14.2 Recourse

- Citizens can appeal decisions even when external systems are involved.
- Algorithmic Ombudsman has scope over algorithmic harm regardless of system origin.
- Cross-border recourse where treaties exist.

### 14.3 Transparency

- Citizens see when their service uses external systems.
- Plain-language explanations of external dependencies.
- Aggregate reporting on cross-border data flows.

### 14.4 Sovereignty

- Sovereign exit from any external dependency tested.
- No external dependency irreplaceable.
- Multi-vendor for critical interactions.

---

## 15. Documentation and inventory

### 15.1 Integration registry

- Every external integration registered with: purpose, scope, owner, contract, audit cadence, exit plan.
- Public registry (with security redaction where appropriate).
- Annual review.

### 15.2 Dependency mapping

- Sovereign-critical dependencies mapped continuously.
- Single points of failure flagged.
- Multi-vendor coverage tracked.

### 15.3 Audit

- Every external interaction audited.
- Aggregate reporting per integration.
- Independent auditor access.

---

## 16. Inter-platform KPIs

| KPI | Indicator |
|---|---|
| Integration registry completeness | 100% of external integrations registered |
| Sovereign-critical dependency single-points | 0 |
| Annual integration review completion | 100% |
| Exit drill success per critical integration | 100% |
| Citizen-impact incidents from external systems | Decreasing |
| Cross-border data flow per treaty | All flows authorized |
| Foreign coercion attempts handled successfully | 100% (refused per protocol) |
| Civil society access to platform | Standing access functional |

---

## 17. The inter-platform north star

A sovereign that cannot interoperate with the world is isolated. A sovereign that interoperates without discipline is captured. CivicOS aims for the third path: interoperate widely, govern strictly, exit credibly.

External systems are partners and constraints, not principals. Sovereignty does not weaken through integration; it strengthens through documented, governed, exitable cooperation. Citizens' rights extend across boundaries. The platform's commitments do not stop at integration points.

The discipline is daily. The integrations are documented. The exits are tested. The sovereignty is preserved. The citizens are protected.

When external integration begins to compromise CivicOS commitments — even for efficiency, even for cooperation, even for cost — the integration must be reformed or terminated. Capability through compromise is not progress. Sovereignty through discipline is.

This is how CivicOS lives in the real heterogeneous world: with respect for what is, with insistence on what must remain, with humility about its own role, and with clarity about what it will not surrender.
