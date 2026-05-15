# CivicOS — General Technology Procurement Standards (Companion 94)

This companion specifies general technology procurement standards beyond AI-specific procurement (Companion 85). It complements Volume I §11 (CivicProcure), Companion 21 (anti-corruption), Companion 19 (open standards), Companion 33 (inter-platform protocols), Companion 20 (sustainability/exit), and Companion 86 (Foundation operating model) by going deep on the operational and ethical design of platform-related technology procurement.

The thesis: **technology procurement decisions made today bind sovereigns for decades**. Platform components, vendor relationships, integration standards, support contracts — all shape what's possible later. CivicOS supports rigorous technology procurement through enhanced vendor due diligence, open standards preference, multi-vendor for critical paths, sovereign exit guarantees, source escrow, anti-coercion clauses, supply chain integrity, and ongoing oversight contractual.

The discipline: open standards preference; multi-vendor for critical paths; sovereign keys preserved; source escrow with sovereign custodians; anti-coercion clauses; supply chain integrity (SBOM, signed artifacts, SLSA L3+); reproducible builds for sovereign-critical; sovereign exit tested annually; civil society standing on major procurement; transparent through OCDS.

---

## 1. Principles

1. **Open standards preference.** Where standards exist, use them.
2. **Multi-vendor for critical paths.** Anti-single-point-of-failure.
3. **Sovereign keys preserved.** With sovereign HSMs.
4. **Source escrow.** With sovereign custodians.
5. **Anti-coercion clauses.** Per Companion 24 §8.
6. **Supply chain integrity.** SBOM, signed, SLSA L3+.
7. **Reproducible builds.** For sovereign-critical components.
8. **Sovereign exit tested.** Annually.
9. **Civil society standing.** On major procurement.
10. **OCDS transparency.** Open contracting publication.

---

## 2. Pre-procurement assessment

Before any technology procurement above threshold:

### 2.1 Need

- What problem is being solved?
- Has it been addressed without new procurement?
- What outcomes will define success?

### 2.2 Sovereign criticality

- Is this sovereign-critical (identity, payments, audit, etc.)?
- What's the impact of vendor failure or coercion?
- What exit options will be needed?

### 2.3 Standards alignment

- What relevant standards exist?
- Does the procurement align with open standards?
- What deviations will be needed?

### 2.4 Security posture

- What threat model applies?
- What security requirements are essential?

### 2.5 Discipline

- Pre-procurement assessment public.
- Civil society comment period for major procurement.
- Independent review.

---

## 3. Vendor due diligence

### 3.1 Baseline

Per Companion 21 §3.4:
- Beneficial ownership transparency.
- Tax compliance.
- Past performance.
- Conflict of interest declarations.

### 3.2 Technology-specific

- Open source vs proprietary disclosure.
- SBOM disclosure pre-bid.
- Provenance attestation.
- Reproducible build capability.
- Security history (CVE response, etc.).
- Incident history.
- Sovereign deployment experience.
- Foreign coercion-resistance attestations.

### 3.3 Discipline

- Multi-source verification.
- Independent assessment.
- Civil society and academic input where appropriate.

### 3.4 Disqualifications

- Refusal of SBOM disclosure.
- Documented patterns of building forbidden capabilities.
- Coercion-resistance failures.
- Disqualifying corruption findings.

---

## 4. Open standards preference

### 4.1 The principle

Open standards prevent vendor lock-in, enable interoperability, lower long-term cost, and discipline vendors.

### 4.2 Mechanisms

- RFP requires standards alignment statement.
- Bonus weighting for open standards adoption.
- Penalty for proprietary protocols where open standards exist.
- Cross-procurement consistency in standards.

### 4.3 Discipline

- Anti-vendor-specific-protocols where open exists.
- Standards body engagement encouraged.
- Reporting on standards conformance.

### 4.4 Forbidden

- Procurement that creates vendor lock-in.
- Proprietary protocols where open standards available.
- Anti-interoperability features.

---

## 5. Multi-vendor for critical paths

### 5.1 The principle

Sovereign-critical paths should not depend on single vendor.

### 5.2 Mechanisms

- Multi-vendor procurement for critical components.
- Standards-based interoperability between vendor implementations.
- Failover capability across vendors.
- Anti-monopoly discipline.

### 5.3 Critical paths

- Identity infrastructure.
- Payment rails.
- Audit Vault.
- Election infrastructure (separately governed).
- Sovereign keys and HSMs.
- Critical telecommunications.
- Critical hosting.

### 5.4 Discipline

- Anti-single-vendor-dependency for critical paths.
- Continuous vendor diversity assessment.

### 5.5 Forbidden

- Sovereign-critical dependencies on single vendor.
- Procurement structured to consolidate critical paths to single vendor.
- Vendor practices preventing multi-vendor capability.

---

## 6. Sovereign keys

### 6.1 The principle

Sovereign keys remain with sovereign — in sovereign-controlled HSMs, with multi-party ceremony for issuance.

### 6.2 Mechanisms

- HSM specifications meeting sovereign requirements.
- Multi-party key ceremony per Companion 11 §4.
- Anti-vendor-key-control for sovereign signing.
- Backup and recovery procedures.

### 6.3 Discipline

- Anti-vendor-coercion for key access.
- Independent audit of key management.
- Anti-shared-keys across services where inappropriate.

### 6.4 Forbidden

- Vendor retention of sovereign signing keys.
- Sovereign keys outside sovereign control.
- Anti-recovery-prevention by vendor.

---

## 7. Source escrow

### 7.1 The principle

Source code for sovereign-critical components escrowed with sovereign-controlled custodians.

### 7.2 Mechanisms

- Source code deposited within 60 days of contract execution.
- Build documentation included.
- Test data included.
- Sovereign-designated escrow agent (not vendor-affiliated).
- Periodic verification of escrow contents.

### 7.3 Triggers for release

- Vendor insolvency or business cessation.
- Vendor failure to honor coercion-resistance commitments.
- Material breach uncured after notice.
- Other triggers per Schedule.

### 7.4 Discipline

- Anti-symbolic-escrow (escrow that doesn't enable continuation).
- Periodic test of release process.
- Sovereign capability to operate from escrowed materials.

### 7.5 Forbidden

- Escrow without continuation capability.
- Vendor-controlled escrow.
- Refusal to deposit critical materials.

---

## 8. Anti-coercion clauses

Per Companion 24 §8 and Companion 93 §4:

### 8.1 Required

- Vendor refuses foreign government data demands without local court order.
- Vendor discloses coercion attempts within 30 days.
- Vendor commits to no backdoors or hidden access.
- Vendor cooperates with sovereignty audits.
- Vendor notifies of jurisdiction or ownership changes.

### 8.2 Discipline

- Annual attestation.
- Independent verification.
- Penalty for breach.

### 8.3 Forbidden

- Vendors unable or unwilling to attest coercion-resistance.
- Vendors with track record of coercion compliance.

---

## 9. Supply chain integrity

### 9.1 Mechanisms

- SBOM (Software Bill of Materials) for all components.
- Signed artifacts (Sigstore-class).
- SLSA L3+ provenance attestation for sovereign-critical.
- Reproducible builds for kernel and critical components.
- Dependency monitoring.
- Vulnerability disclosure cooperation.

### 9.2 Discipline

- Anti-undisclosed-dependencies.
- Continuous monitoring.
- Anti-typosquatting and supply chain attacks.

### 9.3 Forbidden

- Components without SBOM.
- Unsigned production artifacts.
- Proprietary supply chains preventing audit.

---

## 10. Service contracts

### 10.1 Mechanisms

- Service Level Agreements per Companion 05 catalog.
- Performance KPIs.
- Termination for cause provisions.
- Sovereign exit support.
- Vendor cooperation in transitions.

### 10.2 Discipline

- Anti-punitive-exit-fees.
- Anti-symbolic-SLAs.
- Anti-mandatory-arbitration foreclosing sovereign remedies.

### 10.3 Forbidden

- Mandatory arbitration foreclosing sovereign court access.
- Foreign-jurisdiction-only dispute resolution for sovereign-critical contracts.
- Punitive exit fees.

---

## 11. Cloud and infrastructure procurement

### 11.1 Sovereign-critical workloads

- Sovereign cloud preferred.
- In-country hyperscaler regions acceptable for non-sensitive under sovereign-acceptable terms.
- SaaS for non-critical only.
- Sovereign keys for any sensitive data.

### 11.2 Discipline

- Multi-region for resilience.
- Multi-vendor for critical components.
- Annual sovereignty audits.
- Regular exit drills.

### 11.3 Forbidden

- Sovereign-critical infrastructure on jurisdictions hostile to sovereignty.
- Identity registry on commercial cloud beyond sovereign-acceptable terms.
- Audit Vault on commercial cloud.
- Election infrastructure on shared CivicOS systems.

---

## 12. Hardware procurement

### 12.1 Mechanisms

- Hardware sourcing diversity.
- Anti-single-foreign-source for sovereign-critical hardware.
- Tamper-detection capabilities.
- End-of-life and refurbishment planning.

### 12.2 Discipline

- Supply chain diversification.
- Anti-coercion through hardware dependencies.
- Refurbishment and recycling per Companion 20 §4.2.

### 12.3 Forbidden

- Sovereign-critical hardware single-sourced from coercion-prone jurisdictions.
- Hardware with undisclosed access mechanisms.

---

## 13. Civil society engagement in procurement

Per Companion 74:

### 13.1 Mechanisms

- Civil society standing on major procurement.
- Public consultation for sovereign-critical procurement.
- Civil society observation of evaluation where feasible.
- Whistleblower channels for procurement misconduct.

### 13.2 Discipline

- Genuine engagement.
- Anti-discrimination in civil society participation.

### 13.3 Forbidden

- Suppression of civil society procurement engagement.
- Discrimination against civil society in procurement.

---

## 14. Cross-sovereign technology procurement cooperation

### 14.1 Mechanisms

- Joint procurement for shared infrastructure.
- Cross-sovereign vendor due diligence sharing.
- Standards body cooperation.
- Treaty-based cooperation on critical infrastructure.

### 14.2 Discipline

- Sovereign authority over deployment decisions preserved.
- Equitable participation.
- Sovereign exit options preserved.

### 14.3 Forbidden

- Cross-sovereign procurement compromising sovereign authority.
- Coerced participation.

---

## 15. Forbidden in technology procurement

CivicOS will not:

- Permit vendors with documented patterns of building forbidden capabilities.
- Allow vendors that refuse SBOM disclosure.
- Permit vendors with disqualifying corruption findings.
- Allow procurement structured to favor specific vendors.
- Permit award without published rationale.
- Allow vendor lock-in through proprietary protocols where open standards exist.
- Permit sovereign-critical dependencies on single vendor.
- Allow vendor retention of sovereign signing keys.
- Permit sovereign keys outside sovereign control.
- Allow escrow without continuation capability.
- Permit vendors unable to attest coercion-resistance.
- Allow components without SBOM.
- Permit unsigned production artifacts.
- Allow mandatory arbitration foreclosing sovereign court access.
- Permit foreign-jurisdiction-only dispute resolution for sovereign-critical.
- Allow punitive exit fees.
- Permit sovereign-critical infrastructure on jurisdictions hostile to sovereignty.
- Allow identity registry on commercial cloud beyond sovereign-acceptable terms.
- Permit Audit Vault on commercial cloud.
- Allow election infrastructure on shared CivicOS systems.
- Permit sovereign-critical hardware single-sourced from coercion-prone jurisdictions.
- Allow hardware with undisclosed access mechanisms.
- Permit cross-sovereign procurement compromising sovereign authority.

This list grows; it does not shrink.

---

## 16. KPIs

| KPI | Indicator |
|---|---|
| OCDS publication coverage | 100% above threshold |
| SBOM disclosure | 100% of technology procurement |
| Multi-vendor for critical paths | Coverage |
| Sovereign keys with sovereign | 100% of sovereign-critical |
| Source escrow | 100% of sovereign-critical |
| Annual exit drill success | 100% |
| Vendor coercion-resistance compliance | 100% attestation |
| Open standards adoption | Trending up |
| Reproducible builds for kernel | 100% |
| Civil society procurement engagement | Standing access functioning |

---

## 17. The technology procurement north star

Technology procurement decisions made today bind sovereigns for decades. CivicOS supports rigorous procurement through enhanced vendor due diligence, open standards preference, multi-vendor for critical paths, sovereign keys preserved, source escrow, anti-coercion clauses, supply chain integrity, sovereign exit tested, civil society engagement, OCDS transparency.

When CivicOS becomes a tool of poor technology procurement — vendor capture, hidden capabilities, foreign coercion vulnerabilities, civil society suppression in procurement, lock-in to forbidden capabilities — it has failed both procurement integrity and sovereign continuity. Capability without procurement discipline is not progress; it is the institutionalization of vendor and supply chain risks at sovereign scale.

When the platform supports rigorous technology procurement — through enhanced scrutiny, transparency, multi-vendor diversity, sovereign keys, source escrow, anti-coercion, supply chain integrity, civil society engagement, exit testing — it earns the right to be infrastructure for sovereigns deploying technology responsibly across decades.

The discipline is daily. The scrutiny is enhanced. The transparency is real. The exit is tested. The sovereignty is preserved. The civil society engagement is structural.

Technology procurement is among the highest-leverage decisions sovereigns make. Get it right and the platform serves citizens for decades. Get it wrong and the cascading lock-in, dependency, and risk persist for years. The discipline matters.
