# CivicOS — Multi-Tenant Government Operations (Companion 103)

This companion specifies the operational reality of running CivicOS across many ministries, agencies, municipalities, and public bodies as multi-tenant infrastructure. It complements Companion 01 (reference architecture, especially §1.1 bounded contexts), Companion 06 (governance and RACI), Companion 33 (inter-platform protocols), and Companion 11 (infrastructure evolution) by going deep on the practical operational considerations of multi-tenancy.

The thesis: **CivicOS serves many government tenants with different mandates, data, rules, and authorities — and the multi-tenant operational design determines whether the platform serves all tenants well or favors some over others**. Multi-tenancy is not just a technical pattern; it's an operational and political reality that requires careful design across data isolation, governance, conflict resolution, cost allocation, capacity sharing, and inter-tenant cooperation.

The discipline: data isolation by default; consent-gated cross-tenant data sharing; equitable resource allocation; transparent cost allocation; independent governance per tenant; cross-tenant cooperation through documented protocols; anti-tenant-favoritism; civil society standing across tenants; sovereign-level oversight of multi-tenant operations.

---

## 1. Principles

1. **Data isolation by default.** Each tenant's data is theirs; cross-tenant access requires consent.
2. **Consent-gated cross-tenant sharing.** Per-purpose, per-data-type, per-time.
3. **Equitable resource allocation.** Across tenants per fair criteria.
4. **Transparent cost allocation.** Each tenant knows what it pays.
5. **Independent governance per tenant.** Tenant-specific accountability.
6. **Cross-tenant cooperation through documented protocols.** Not ad-hoc.
7. **Anti-tenant-favoritism.** Platform serves all equitably.
8. **Civil society standing across tenants.** Oversight at platform level.
9. **Sovereign oversight of multi-tenant operations.** Through constitutional officers.
10. **Tenant exit possible.** Within sovereign exit framework.

---

## 2. Tenant types

| Tenant | Examples | Operational considerations |
|---|---|---|
| **National ministry** | Ministry of Health, Tax Authority | Substantial data; cross-ministry coordination |
| **National agency** | Statistics office, Registrar of Companies | Specific mandate; cross-agency cooperation |
| **Municipality** | City government | CivicCity profile; local autonomy |
| **Sub-national government** | Provincial, state, regional | Federal/devolved governance |
| **Public corporation** | State-owned utility | Commercial-public hybrid |
| **Constitutional officer office** | Algorithmic Ombudsman, Auditor General | Independence safeguards strict |
| **Judiciary** | Courts | Independence absolute |
| **Legislature** | Parliament | Independence absolute |
| **Indigenous government** | Where applicable | Per Companion 36 |

Each tenant type has distinct operational considerations within shared multi-tenant principles.

---

## 3. Data isolation

### 3.1 The principle

Each tenant's data is logically and (where applicable) physically isolated. Default is no cross-tenant access.

### 3.2 Mechanisms

- Per-tenant database schemas / namespaces.
- Per-tenant encryption keys.
- Row-level security where applicable.
- Sealed compartments for sensitive data.
- Per-RP UID prevents cross-tenant correlation.

### 3.3 Cross-tenant access

- Explicit consent (per Companion 13 §3 consent regime).
- Per-purpose, per-data-type, per-time scope.
- Audited.
- Reversible.

### 3.4 Discipline

- Anti-implicit-cross-tenant-access.
- Anti-aggregation across tenants without consent.
- Anti-shadow-IT enabling cross-tenant flow.

### 3.5 Forbidden

- Cross-tenant data flows without consent or lawful authority.
- Aggregation patterns enabling cross-tenant surveillance.
- Algorithmic decisions using cross-tenant data without consent.

---

## 4. Resource allocation

### 4.1 The principle

Compute, storage, network, support resources allocated equitably across tenants.

### 4.2 Mechanisms

- Per-tenant SLA tiers per Companion 05.
- Resource quotas per tenant.
- Capacity planning across tenants.
- Surge capacity for known peaks (per tenant operational reality).
- Anti-noisy-neighbor protections.

### 4.3 Discipline

- Anti-favoritism in resource allocation.
- Transparent allocation criteria.
- Equity considerations in allocation.

### 4.4 Forbidden

- Resource favoritism for politically powerful tenants.
- Resource starvation of vulnerable populations' service tenants.
- Hidden resource allocation decisions.

---

## 5. Cost allocation

### 5.1 The principle

Each tenant knows what it costs to operate on the platform; allocation transparent.

### 5.2 Mechanisms

- Per-tenant cost accounting.
- Direct vs shared cost allocation methodology.
- Civic Foundation tier subsidies for civic-tech and underserved.
- Cross-subsidization patterns explicit.

### 5.3 Discipline

- Anti-hidden-cost-allocation.
- Anti-favoritism in cost allocation.
- Sustainable per Companion 20.

### 5.4 Forbidden

- Cost allocation that systematically disadvantages specific tenants.
- Hidden cross-subsidization.
- Vendor capture of cost allocation.

---

## 6. Governance per tenant

### 6.1 The principle

Each tenant has its own governance — owner, accountability, oversight — within platform multi-tenant framework.

### 6.2 Mechanisms

- Tenant owner identified.
- Tenant-specific accountability per Companion 06.
- Tenant-specific module configuration.
- Tenant-specific user management.
- Tenant-specific reporting.

### 6.3 Cross-tenant governance

- Sovereign Steering Committee (Companion 06).
- Cross-tenant standards committee.
- Constitutional officer oversight across tenants.

### 6.4 Discipline

- Anti-platform-mediated-cross-tenant-interference.
- Tenant autonomy within platform commitments.
- Anti-cooptation of tenant governance.

### 6.5 Forbidden

- Tenant governance decisions overridden by platform without authority.
- Cross-tenant interference through platform.
- Tenant governance captured by platform vendor.

---

## 7. Cross-tenant cooperation

### 7.1 The principle

Many citizen interactions involve multiple tenants (e.g., a citizen's tax records relevant to welfare eligibility). Cross-tenant cooperation through documented protocols.

### 7.2 Mechanisms

- CivicBus for inter-tenant API calls.
- Consent tokens for citizen-mediated cooperation.
- Per-service interoperability profiles.
- Audit of cross-tenant flows.

### 7.3 Discipline

- Anti-ad-hoc-cooperation.
- Anti-cross-tenant-aggregation without consent.
- Per-RP UID preserves citizen privacy.

### 7.4 Forbidden

- Cross-tenant flows bypassing CivicBus.
- Cross-tenant aggregation without consent.
- Use of cross-tenant cooperation for surveillance.

---

## 8. Inter-tenant disputes

### 8.1 The pattern

Tenants may disagree — about data sharing, about service overlap, about resource allocation, about cross-tenant impact.

### 8.2 Mechanisms

- Cross-tenant coordination forums.
- Mediation through sovereign-level governance.
- Constitutional officer involvement where applicable.
- Independent arbitration for unresolved disputes.

### 8.3 Discipline

- Anti-political-favoritism in dispute resolution.
- Transparent process.
- Anti-cooptation by powerful tenants.

### 8.4 Forbidden

- Disputes resolved by political alliance over merit.
- Suppression of weaker tenant's voice.
- Use of platform mediation for political reward.

---

## 9. Tenant onboarding

### 9.1 Mechanisms

- Tenant scope defined.
- Tenant governance established.
- Module selection and configuration.
- User management setup.
- Cross-tenant interoperability assessed.
- Data migration planned.

### 9.2 Discipline

- Pilot phase before active.
- Anti-Big-Bang-Migration (per Companion 26 §1).
- Inclusion floor preserved from day one.

### 9.3 Forbidden

- Onboarding without governance establishment.
- Onboarding compromising other tenants' commitments.
- Onboarding skipping pilot phase for sovereign-critical functions.

---

## 10. Tenant exit

### 10.1 The principle

Tenants can exit the platform within sovereign exit framework.

### 10.2 Mechanisms

- Tenant-level data export per Companion 20 §7.
- Tenant-level continuity planning.
- Cross-tenant cooperation maintained during exit.
- Civil society and citizen impact considered.

### 10.3 Discipline

- Anti-vendor-coercion of tenant exit.
- Anti-political-pressure preventing legitimate tenant exit.
- Sovereign-level approval for full sovereign exit.

### 10.4 Forbidden

- Vendor practices preventing tenant exit.
- Political pressure preventing legitimate tenant exit.
- Tenant exit that abandons citizens without continuity.

---

## 11. Constitutional officer access across tenants

### 11.1 The principle

Constitutional officers have access across tenants for their mandates.

### 11.2 Mechanisms

- Algorithmic Ombudsman investigates AI capabilities across tenants.
- Sovereign Trust Officer monitors invariant compliance across tenants.
- Auditor General audits across tenants.
- People's Editor reviews citizen-facing language across tenants.
- Inspector General investigates misconduct across tenants.

### 11.3 Discipline

- Cross-tenant access subject to mandate.
- Anti-political-targeting across tenants.
- Tenant cooperation expected.

### 11.4 Forbidden

- Constitutional officer access denied or impeded.
- Tenant resistance to constitutional officer audits.
- Use of constitutional officer access for political purposes across tenants.

---

## 12. Civil society standing across tenants

Per Companion 74:

### 12.1 The principle

Civil society has platform-level standing access; can engage across tenants.

### 12.2 Mechanisms

- Civic Council platform-level.
- Civil society organizations engaging across tenants.
- Cross-tenant civil society advocacy supported.

### 12.3 Discipline

- Anti-tenant-suppression of civil society.
- Plurality of civil society engagement.

### 12.4 Forbidden

- Tenant-level suppression of civil society.
- Discrimination in civil society engagement across tenants.

---

## 13. Tenant-vendor relationships

### 13.1 Mechanisms

- Tenant procurement within platform standards.
- Multi-vendor for critical components per Companion 94.
- Tenant-specific vendor relationships within sovereign framework.

### 13.2 Discipline

- Anti-vendor-favoritism within tenant.
- Anti-corruption discipline strict.
- Cross-tenant vendor pattern monitoring.

### 13.3 Forbidden

- Tenant-vendor relationships bypassing platform standards.
- Vendor capture of tenant decisions.
- Cross-tenant vendor monopoly without competition.

---

## 14. Cross-sovereign multi-tenant patterns

### 14.1 The pattern

Cross-sovereign cooperation may involve multi-tenant patterns (per Companion 15 planetary protocols).

### 14.2 Mechanisms

- Federation across sovereigns through CivicBus.
- Cross-sovereign tenant cooperation under treaty.
- Sovereign authority per sovereign tenant.

### 14.3 Discipline

- Sovereign authority preserved.
- Cross-sovereign flows per consent and treaty.
- Anti-coercion in cross-sovereign tenant patterns.

### 14.4 Forbidden

- Cross-sovereign tenant arrangements compromising sovereign authority.
- Cross-sovereign flows bypassing consent.
- Cross-sovereign tenant patterns enabling civilian surveillance.

---

## 15. Multi-tenant operational team

### 15.1 Roles

- Platform operations (cross-tenant infrastructure).
- Tenant relations (managing tenant relationships).
- Cross-tenant coordination.
- Multi-tenant support (cross-tenant issue resolution).
- Standards body coordination across tenants.

### 15.2 Discipline

- Anti-tenant-favoritism in operations team.
- Equity in support across tenants.
- Cross-tenant pattern recognition.

### 15.3 Forbidden

- Operations team political alignment with specific tenants.
- Discriminatory support quality across tenants.

---

## 16. Forbidden in multi-tenant operations

CivicOS will not:

- Permit cross-tenant data flows without consent or lawful authority.
- Allow aggregation patterns enabling cross-tenant surveillance.
- Permit algorithmic decisions using cross-tenant data without consent.
- Allow resource favoritism for politically powerful tenants.
- Permit hidden cost allocation.
- Allow tenant governance decisions overridden by platform without authority.
- Permit cross-tenant interference through platform.
- Allow tenant governance captured by platform vendor.
- Permit cross-tenant flows bypassing CivicBus.
- Allow disputes resolved by political alliance over merit.
- Permit suppression of weaker tenant's voice.
- Allow onboarding compromising other tenants' commitments.
- Permit vendor practices preventing tenant exit.
- Allow political pressure preventing legitimate tenant exit.
- Permit constitutional officer access denied or impeded.
- Allow tenant-level suppression of civil society.
- Permit tenant-vendor relationships bypassing platform standards.
- Allow cross-sovereign tenant arrangements compromising sovereign authority.
- Permit cross-sovereign tenant patterns enabling civilian surveillance.
- Allow operations team political alignment with specific tenants.

This list grows; it does not shrink.

---

## 17. KPIs

| KPI | Indicator |
|---|---|
| Data isolation compliance | Audit |
| Resource allocation equity | Per tenant satisfaction |
| Cost allocation transparency | Per tenant clarity |
| Cross-tenant cooperation effectiveness | Active programs |
| Constitutional officer cross-tenant access | Mandate effectiveness |
| Civil society standing across tenants | Engagement |
| Tenant exit options preserved | Annual drills |
| Anti-tenant-favoritism | Independent assessment |
| Multi-tenant operational support quality | Per tenant satisfaction |
| Cross-sovereign tenant cooperation | Sovereign authority preserved |

---

## 18. The multi-tenant operations north star

CivicOS serves many government tenants with different mandates, data, rules, and authorities. The multi-tenant operational design determines whether the platform serves all tenants well or favors some over others. CivicOS supports multi-tenancy through data isolation, consent-gated cross-tenant sharing, equitable resource allocation, transparent cost allocation, independent governance per tenant, cross-tenant cooperation through documented protocols, anti-tenant-favoritism, civil society standing across tenants, sovereign-level oversight, tenant exit options.

When CivicOS becomes a tool of cross-tenant data flow circumvention, tenant favoritism, vendor capture of tenant decisions, suppression of weaker tenants, or disputes resolved by political alliance — it has failed multi-tenant integrity. Capability without multi-tenant discipline is not progress; it is the institutionalization of platform politics over service to all tenants and their citizens.

When the platform supports multi-tenant operations with discipline, equity, transparency, and constitutional officer oversight — it earns the right to be infrastructure for diverse government landscapes serving diverse citizens.

The discipline is daily. The data isolation is structural. The equity is real. The constitutional officer access is preserved. The civil society standing crosses tenants. The exit options are tested.

Multi-tenant operations are where the platform's commitments translate into service to many ministries serving many citizens. Get it right and the platform serves the state across its diverse functions. Get it wrong and the platform becomes tool of political consolidation rather than service to citizens.

The discipline is in the operational details. The principles are in how those details are designed. The accountability is across all tenants and their citizens.
