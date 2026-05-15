# CivicOS — Data Localization and Sovereign Residency (Companion 104)

This companion specifies how CivicOS handles data localization and sovereign data residency in operational and legal detail. It complements Volume I §32 (sovereign data governance), Companion 11 §1 (infrastructure evolution including residency), Companion 24 §7 (cross-border data), Companion 33 (inter-platform protocols), Companion 82 §8 (cross-border commercial flows), and Companion 87 §11 (LGBTQ+ cross-border) by going deep on a topic increasingly central to sovereign digital infrastructure.

The thesis: **data localization is sovereign authority over where citizens' data lives, who can access it, and under what conditions**. It is contested terrain where sovereign authority, citizen privacy, international cooperation, commercial interests, and cybersecurity intersect. CivicOS treats data localization as sovereign decision with structural support: cryptographically enforced where chosen, audited continuously, transparent to citizens.

The discipline: sovereign decides; cryptographic enforcement where chosen; transparent to citizens; audited; cross-border flows per consent or treaty; sealed compartments for highest-sensitivity; civil liberties preserved across; vendor commitments contractual; sovereign exit options.

---

## 1. Principles

1. **Sovereign decides.** Data localization is sovereign choice.
2. **Cryptographic enforcement.** Where sovereign chooses; not just policy.
3. **Transparent to citizens.** Citizens know where their data lives.
4. **Continuously audited.** Independent verification.
5. **Cross-border flows per consent or treaty.** Not unilateral.
6. **Sealed compartments for highest-sensitivity.** Health, mental health, neural, judicial.
7. **Civil liberties preserved.** Across residency choices.
8. **Vendor commitments contractual.** Per Companions 24, 94.
9. **Sovereign exit options.** Including from cloud arrangements.
10. **Anti-foreign-coercion.** Vigilance.

---

## 2. Data residency categories

| Category | Default location | Cross-border permission |
|---|---|---|
| **Identity (CivicID)** | Sovereign cloud | Treaty-based mutual recognition only |
| **Wallet (Civic Wallet)** | Citizen device + sovereign-controlled sync | Citizen-initiated only |
| **Payments ledger** | Sovereign cloud (TSA) | Per-transaction settlement only |
| **Audit Vault** | Sovereign-controlled | Cross-jurisdictional auditor general copies only |
| **Health records** | Sovereign cloud, sealed compartment | Citizen consent + healthcare provider only |
| **Mental health records** | Sealed compartment, strictest | Citizen consent only |
| **Neural data (BAI)** | Citizen-controlled, citizen keys | Citizen consent only |
| **Judicial records** | Judiciary-controlled | Treaty-based judicial cooperation only |
| **Election records** | Electoral commission-controlled | None typically |
| **Census/statistics aggregate** | Statistics office | Cross-sovereign cooperation per treaty |
| **Procurement records** | Sovereign cloud | OCDS publication standard |
| **Land titles** | Sovereign cloud | None typically |

Each category has distinct residency requirements within sovereign discretion.

---

## 3. Cryptographic residency enforcement

### 3.1 The principle

Where data must remain within sovereign jurisdiction, cryptographic enforcement is more reliable than policy enforcement.

### 3.2 Mechanisms

- Encryption at rest with sovereign-controlled keys (HSM-backed).
- Decryption only possible within sovereign infrastructure.
- Cross-border transfer detected and prevented.
- Confidential computing for processing sensitive data.
- Attestation of compute environment.

### 3.3 Discipline

- Anti-export of sovereign keys.
- Anti-decryption-outside-sovereign.
- Continuous verification.

### 3.4 Forbidden

- Sovereign keys outside sovereign control.
- Data export bypassing cryptographic controls.
- Cloud arrangements compromising key sovereignty.

---

## 4. Cloud arrangements

### 4.1 Sovereign cloud

- Sovereign-owned or sovereign-controlled infrastructure.
- Within sovereign jurisdiction physically.
- Sovereign keys sovereign.
- Sovereign exit options.

### 4.2 Hyperscaler in-country regions

- Foreign cloud provider with regions inside sovereign jurisdiction.
- Sovereign-acceptable contractual terms required (per Companion 24 §7, Companion 94).
- Anti-foreign-coercion clauses.
- Per-data-classification rules apply.

### 4.3 Foreign cloud (limited use)

- Only for non-sensitive workloads.
- Only with explicit sovereign approval.
- Always with sovereign exit options.

### 4.4 Discipline

- Sovereign-critical on sovereign cloud or equivalent.
- Anti-default-foreign-cloud for sensitive.
- Multi-vendor for critical infrastructure (per Companion 94).

### 4.5 Forbidden

- Sovereign-critical workloads on jurisdictions hostile to sovereignty.
- Identity registry on commercial cloud beyond sovereign-acceptable terms.
- Audit Vault on commercial cloud.
- Election infrastructure on shared CivicOS systems beyond constitutionally appropriate.

---

## 5. Cross-border data flows

### 5.1 Permitted patterns

- Citizen-consented (e.g., diaspora wallet to consular service).
- Treaty-based (e.g., mutual recognition of identity).
- Lawful authority (e.g., MLAT for criminal justice).
- Cross-sovereign cooperation per planetary protocols (Companion 15).
- Cross-jurisdictional travel (limited identity verification).

### 5.2 Discipline

- Anti-default-cross-border-flow.
- Per-flow audit.
- Citizen visibility of cross-border flows.
- Anti-coercion in cross-border arrangements.

### 5.3 Forbidden

- Cross-border flows without consent or lawful authority.
- Foreign government data demands without local court order.
- Cross-border flows exposing citizens to harm in destination jurisdiction.
- Trade arrangements compromising sovereign data residency.
- Cross-border surveillance through data flows.

---

## 6. Citizen visibility

### 6.1 The principle

Citizens know where their data lives.

### 6.2 Mechanisms

- Civic Wallet shows data residency.
- Per-service residency declared.
- Cross-border flow notifications.
- Audit log accessible to citizen.

### 6.3 Discipline

- Plain language residency information.
- Multilingual.
- Accessible.

### 6.4 Forbidden

- Hidden data residency.
- Cross-border flows without citizen visibility.
- Misleading residency claims.

---

## 7. Auditing data residency

### 7.1 Mechanisms

- Continuous monitoring of data locations.
- Cross-border flow audit logs.
- Independent audit annually.
- Algorithmic Ombudsman scrutiny of residency-related algorithmic decisions.
- Civil society standing for residency concerns.

### 7.2 Discipline

- Anti-coverup of residency violations.
- Honest reporting of incidents.
- Public quarterly reporting.

### 7.3 Forbidden

- Suppression of residency violations.
- Discriminatory enforcement of residency rules.
- Use of residency audit data for unrelated purposes.

---

## 8. Vendor commitments on residency

Per Companions 24 §8 and 94 §8:

### 8.1 Required commitments

- Data residency contractual per sovereign requirements.
- Cross-border transfers only with explicit sovereign approval.
- Foreign coercion-resistance attestations.
- Data export at sovereign exit.
- Sovereign keys with sovereign HSMs.

### 8.2 Discipline

- Annual attestation.
- Independent verification.
- Penalty for breach.

### 8.3 Forbidden

- Vendors unable or unwilling to commit to residency requirements.
- Vendors with track record of residency violations.
- Vendor practices preventing residency verification.

---

## 9. Sealed compartments

### 9.1 The principle

Highest-sensitivity data — health, mental health, neural, judicial, mass atrocity survivor — in sealed compartments with strictest residency.

### 9.2 Mechanisms

- Citizen-controlled keys for personal sealed data.
- Sovereign-controlled keys for institutional sealed data (audit vault, etc.).
- Strict access controls.
- Anti-aggregation across sealed compartments.
- Cross-border transfer of sealed data only with explicit citizen consent or strictest legal process.

### 9.3 Discipline

- Anti-cross-purpose access to sealed data.
- Anti-cross-border-flow of sealed data without highest-bar authority.

### 9.4 Forbidden

- Sealed data accessed for unrelated purposes.
- Sealed data crossing borders without citizen consent or strictest legal process.
- Sealed data aggregated across compartments without explicit consent.

---

## 10. Foreign coercion resistance

### 10.1 The principle

Foreign governments may attempt to access citizen data through legal demands on vendors, treaty interpretations, or other mechanisms. Resistance is structural.

### 10.2 Mechanisms

- Sovereign keys with sovereign.
- Cryptographic enforcement of residency.
- Vendor coercion-resistance clauses.
- Refusal to honor foreign demands without local court order.
- Sovereign Trust Officer notification of any attempts.
- Diplomatic channels engaged.

### 10.3 Discipline

- Anti-default-cooperation with foreign demands.
- Anti-vendor-cooperation with foreign coercion.
- Public reporting on foreign demand patterns.

### 10.4 Forbidden

- Foreign government data demands honored without local court order.
- Vendor cooperation with foreign coercion.
- Cross-border arrangements requiring foreign coercion compliance.

---

## 11. Citizen control over residency

### 11.1 The principle

Where citizen choice is feasible, citizens choose data residency for their personal data.

### 11.2 Mechanisms

- Wallet sync residency choice (where feasible).
- Cross-border consent granular.
- Diaspora data residency citizen-choice within constraints.
- Anti-default-export.

### 11.3 Discipline

- Citizen agency.
- Plain language explanation.
- Anti-cooptation of citizen choice.

### 11.4 Forbidden

- Forced data export against citizen choice (within reasonable constraints).
- Misleading citizen about residency choices.
- Algorithmic determination of citizen residency choice.

---

## 12. Trade and data localization

### 12.1 The principle

Trade agreements increasingly include data localization provisions. CivicOS commits to sovereign authority over residency.

### 12.2 Mechanisms

- Sovereign authority preserved in trade arrangements.
- Anti-trade-coercion of residency.
- Sovereign opt-outs in trade agreements.

### 12.3 Discipline

- Anti-treaties compromising sovereign data residency.
- Civil society engagement on trade-related residency.

### 12.4 Forbidden

- Trade agreements requiring data export against sovereign interest.
- Trade arrangements compromising sovereign data sovereignty.
- Use of trade pressure to undermine residency commitments.

---

## 13. Cross-sovereign data localization cooperation

### 13.1 The principle

Mutually-recognized data residency arrangements support cross-border cooperation while preserving sovereignty.

### 13.2 Mechanisms

- Adequacy assessments mutual.
- Treaty-based residency arrangements.
- Cross-sovereign auditing where treaty applies.

### 13.3 Discipline

- Sovereign authority preserved on each side.
- Sovereign opt-outs honored.
- Anti-coercion in mutual recognition.

### 13.4 Forbidden

- Cross-sovereign arrangements compromising sovereign authority on either side.
- Coerced harmonization on data residency.

---

## 14. Civil society engagement on residency

### 14.1 The principle

Data residency is policy choice with implications for citizens; civil society engagement appropriate.

### 14.2 Mechanisms

- Civil society standing on major residency decisions.
- Public consultation on cross-border data arrangements.
- Civil society challenges to residency violations.
- Whistleblower channels for residency misconduct.

### 14.3 Discipline

- Anti-cooptation of civil society engagement.
- Plurality of perspectives.

### 14.4 Forbidden

- Suppression of civil society engagement on residency.
- Discrimination among civil society organizations on residency engagement.

---

## 15. Forbidden in data localization and residency

CivicOS will not:

- Permit sovereign keys outside sovereign control.
- Allow data export bypassing cryptographic controls.
- Permit cloud arrangements compromising key sovereignty.
- Allow sovereign-critical workloads on jurisdictions hostile to sovereignty.
- Permit identity registry on commercial cloud beyond sovereign-acceptable terms.
- Allow Audit Vault on commercial cloud.
- Permit cross-border flows without consent or lawful authority.
- Allow foreign government data demands honored without local court order.
- Permit cross-border flows exposing citizens to harm.
- Allow trade arrangements compromising sovereign data residency.
- Permit cross-border surveillance through data flows.
- Allow hidden data residency.
- Permit cross-border flows without citizen visibility.
- Allow misleading residency claims.
- Permit suppression of residency violations.
- Allow vendors with track record of residency violations.
- Permit vendor practices preventing residency verification.
- Allow sealed data accessed for unrelated purposes.
- Permit sealed data crossing borders without citizen consent.
- Allow vendor cooperation with foreign coercion.
- Permit forced data export against citizen choice.
- Allow trade agreements requiring data export against sovereign interest.
- Permit cross-sovereign arrangements compromising sovereign authority.
- Allow suppression of civil society engagement on residency.

This list grows; it does not shrink.

---

## 16. KPIs

| KPI | Indicator |
|---|---|
| Sovereign keys with sovereign | 100% of sovereign-critical |
| Cryptographic residency enforcement | Coverage |
| Cross-border flow audit | 100% logged |
| Citizen residency visibility | Plain language |
| Independent residency audit | Annual |
| Vendor coercion-resistance compliance | 100% attestation |
| Foreign demand patterns | Decreasing or stable |
| Sealed compartment integrity | Audit |
| Civil society engagement on residency | Active |
| Trade-related residency negotiations | Sovereign authority preserved |

---

## 17. The data localization and residency north star

Data localization is sovereign authority over where citizens' data lives. CivicOS supports sovereign authority through cryptographic enforcement, transparent residency, continuous audit, cross-border flows per consent or treaty, sealed compartments for highest-sensitivity, civil liberties preserved, vendor commitments contractual, sovereign exit options, foreign coercion resistance.

When CivicOS becomes a tool of unauthorized cross-border data flows, foreign coercion, residency violations, or sovereign sovereignty erosion through data residency — it has failed at sovereign authority. Capability without residency discipline is not progress; it is the institutionalization of foreign data access at sovereign cost.

When the platform supports data localization with discipline, transparency, citizen visibility, vendor accountability, and foreign coercion resistance — it earns the right to be infrastructure for sovereigns preserving authority over citizen data in a world of intensifying digital pressure.

The discipline is daily. The enforcement is cryptographic. The transparency is real. The citizen visibility is structural. The foreign coercion resistance is vigilant.

Data localization is sovereign in the digital age. The platform's role is to support sovereign authority operationally. Anything less abandons citizens to foreign access of their data without sovereign say.
