# CivicOS — Long-term Sustainability, Sunsetting, and Exit Playbook (Companion 20)

This companion specifies the discipline that makes CivicOS sustainable over decades: sustainability of capability (operational, financial, environmental), sunsetting of features and modules that have outlived their usefulness, and exit pathways for sovereigns who choose to leave or replace the platform.

The thesis: **a platform that cannot end is a platform that cannot be trusted**. Sovereigns adopt CivicOS more readily because they can leave it. Modules are pruned more confidently because pruning is normal. Capabilities are added more carefully because adding implies eventually subtracting. Sustainability is the discipline of running infrastructure in deep time.

The hard discipline: every commitment has a sunset clause. Every feature has a usage threshold below which it is reviewed for removal. Every sovereign has a tested exit. Every long-running cost has a sustainability plan. Nothing is forever.

---

## 1. Sustainability principles

1. **Plan for ending from the beginning.** Every capability has a planned end-of-life process from its inception.
2. **Honest cost accounting.** Total cost of ownership is reported transparently, including externalities.
3. **Capability pruning is normal.** Removing capabilities that no longer serve is not failure; it is discipline.
4. **Sovereign exit is real.** Tested exit playbooks; documented data formats; institutional capacity transferred.
5. **Environmental sustainability is non-optional.** Energy, materials, e-waste accountability.
6. **Talent sustainability is non-optional.** Pipeline, retention, succession, knowledge preservation.
7. **Financial sustainability without rent extraction.** Steward economics that fund the work without capture.
8. **Cultural sustainability.** The values that make the platform legitimate must be transmitted to every cohort of operators, contributors, and citizens.
9. **Standing question.** Annual public asking: "Is what we have built still serving the people and the future?"
10. **Replaceability of the steward.** Even CivicOS Inc. and the Foundation are replaceable.

---

## 2. Operational sustainability

### 2.1 Run-cost discipline

- Per-service cost-of-goods-sold tracked monthly.
- Right-sizing recommendations from observability platform.
- Tiered storage with automated migration (hot → warm → cold).
- LLM call accounting per module; expensive Class B/C calls require budget approvals.
- Annual greenness review: PUE, carbon, refurbished hardware percentage.

### 2.2 Operational knowledge preservation

- Runbooks living, tested, and rehearsed.
- Architecture Decision Records preserved indefinitely.
- Post-mortem culture; blameless reviews; public summaries for tier-0 incidents.
- Mandatory rotation through key roles to prevent single-point-of-knowledge.
- Annual table-top exercises across all critical scenarios.

### 2.3 Capacity planning

- Continuous capacity forecasting against projected program demand.
- Quarterly capacity reviews with module owners.
- Surge capacity reservations for known peaks (tax filing, payday, school enrollment).
- Multi-year capacity roadmaps coupled to country adoption playbook.

### 2.4 Technical debt

- Technical debt visibly tracked per module.
- Debt-paydown sprints scheduled quarterly.
- Major rewrites planned; rewrite-as-emergency forbidden.
- Long-term support (LTS) branches with documented support windows.

---

## 3. Financial sustainability

### 3.1 Steward economics

CivicOS Inc.'s revenue must:
- Cover operations, R&D, and support sustainably.
- Not require capture of customers to be viable.
- Not depend on lock-in revenue.
- Be transparent and auditable.

### 3.2 Customer economics

Sovereign customer costs must:
- Be predictable across multi-year horizons.
- Have published price escalation caps.
- Have transparent unit economics (per-citizen, per-tenant, per-transaction).
- Decrease with scale and tenure.
- Not penalize sovereigns for using the open kernel.

### 3.3 Public-good carve-outs

- Civic Foundation tier free to LDCs and small municipalities.
- Open kernel free to anyone.
- Standards free to anyone.
- Civic Academy training accessible at sliding scale.
- Marketplace civic-tech grants.

### 3.4 Funding mix per country

Per Companion 03 §9:

| Source | Typical share |
|---|---|
| Domestic budget | 40–60% |
| Multilateral grants/loans | 30–50% |
| Bilateral cooperation | 5–15% |
| User fees / shared savings | 5–10% |

Insistence on transparent procurement and open-book accounting from CivicOS Inc. to maintain political legitimacy.

### 3.5 Multi-decade financial planning

- Each anchor sovereign has a 20-year financial plan for the platform.
- Revenue from automation and efficiency gains partially earmarked for ongoing platform investment.
- Sovereign fund options for sovereigns wishing to capitalize platform stewardship.

---

## 4. Environmental sustainability

### 4.1 Energy

- 2030: PUE reporting; renewable PPAs; carbon-aware workload placement piloted.
- 2035: Net-zero datacenter operations in anchor countries; carbon as a first-class scheduling constraint.
- 2040: Energy-positive sovereign datacenters (waste heat reuse).
- 2045: Climate-coupled workload migration (workloads follow renewable surplus).
- 2050+: Civilization-scale energy optimization integrated into national twin.

### 4.2 Hardware

- Long lifecycles (5+ years for general compute; longer where safe).
- Refurbishment programs.
- E-waste accountability with transparent reporting.
- Repairability requirements in procurement.
- Sovereign-region recycling and rare-earth recovery programs.

### 4.3 Software efficiency

- Continuous performance optimization.
- LLM call efficiency: caching, distillation, smaller-where-sufficient.
- Tiered model usage (Tier 1 for routine; Tier 3 for hard cases).
- Edge inference where it reduces backbone load.

### 4.4 Climate-positive policy automation

Programs that accelerate green transitions get prioritized engineering support. Climate-coupled capabilities are first-class.

### 4.5 Reporting

- Annual environmental impact report.
- Per-tenant carbon dashboards.
- Public per-service energy footprints.
- Independent environmental audit annually.

---

## 5. Talent sustainability

### 5.1 Pipeline

- Civic Academy in every customer country with multi-year cohorts.
- University partnerships; updated curricula.
- Apprenticeship programs inside ministries.
- Diaspora reintegration programs.
- High-school outreach for civic engineering as a career.

### 5.2 Retention

- Compensation competitive with tech sector for technical roles.
- Public service compensation reform for deliberative roles.
- Mission-driven work; transparent impact.
- Continuous learning embedded in employment terms.
- Career mobility within and across sovereigns under treaty arrangements.

### 5.3 Succession

- Every critical role has documented succession.
- Every critical knowledge area has at least 3 capable practitioners.
- Mentorship programs structured.
- Senior secondments rotate to prevent stagnation.

### 5.4 Knowledge preservation

- Documentation as a first-class artifact.
- Video and recorded explanations of complex systems.
- Decision records preserved indefinitely.
- Oral history programs for major program transitions.

### 5.5 Cultural sustainability of values

- Onboarding includes constitutional principles, invariants, ethics.
- Annual reaffirmation of professional commitments.
- Internal recognition for principled action (e.g., raising concerns).
- External recognition for civil society and academic contributors.

---

## 6. Sunsetting

### 6.1 Why sunsetting matters

Capabilities that no longer serve their purpose become liabilities:
- Run-cost without value.
- Attack surface without benefit.
- Cognitive load on operators.
- Confusion for citizens.
- Distraction from current work.

Pruning is discipline.

### 6.2 Sunset triggers

A capability is reviewed for sunset when:
- Usage falls below a threshold for a sustained period.
- A successor capability supersedes it.
- The original justification has expired (program ended, statute changed, mandate fulfilled).
- Charter has reached its sunset date and renewal is not justified.
- Cost-benefit no longer justifies continuation.
- Independent oversight recommends sunset.

### 6.3 Sunset process

1. **Trigger documentation**: which trigger fired, with evidence.
2. **Stakeholder notification**: affected ministries, integrators, citizens.
3. **Public consultation**: comment period for citizen-facing capabilities.
4. **Migration planning**: if successor exists, migration tooling and plan.
5. **Deprecation announcement**: formal date with public publication.
6. **Deprecation period**: typically 12+ months for active capabilities.
7. **End-of-life**: capability removed; data archived per retention rules.
8. **Post-EOL review**: lessons learned; cataloged for future capabilities.

### 6.4 What survives sunset

- Audit logs (per statutory retention).
- Citizen records of decisions made under the capability.
- Transparency reports archived.
- Documentation archived.
- Source code preserved (open kernel) or escrowed (modules).

### 6.5 Sunset of open standards

- Standards may be deprecated and eventually retired.
- Successor standards must exist before active retirement.
- Multi-version support during transitions.
- Standards Body manages with community input.

### 6.6 Sunset of modules

- A module that has not been used in production by any sovereign for 2+ years is reviewed.
- Pre-sunset, it may be moved to "community maintenance" tier.
- If no community emerges, formal sunset proceeds.
- Source code remains available; future revival possible.

### 6.7 Sunset of AI capabilities

Per Companion 10 §11:
- Charter sunset triggers automatic deprecation if not renewed.
- Capability paused → archived models retained for accountability → eventual decommissioning.
- Decisions made by sunset capabilities remain in citizen records and are reviewable.

---

## 7. Sovereign exit

### 7.1 The exit pledge

Every sovereign customer can leave CivicOS:
- With their data intact and exportable.
- With their citizens' wallets continuing to function during transition.
- With institutional capacity transferred.
- Within a documented timeframe.
- With CivicOS Inc.'s active cooperation.

This is contractual, not aspirational. Exit drills are run annually.

### 7.2 Exit scenarios

- **Vendor change**: sovereign chooses different commercial steward.
- **In-housing**: sovereign takes operations entirely in-house.
- **Sovereign fork**: sovereign forks the kernel and operates independently.
- **Multi-vendor consortium**: sovereign joins consortium-managed deployment.
- **Decommissioning**: sovereign decides to use a different platform entirely.

### 7.3 Exit infrastructure

- **Source escrow**: kernel and module source code escrowed with sovereign-controlled custodian; released to sovereign on exit trigger.
- **Documented data formats**: every module's data has a documented export format, maintained continuously.
- **Migration tooling**: scripts and tools for extracting data and importing to a successor.
- **Knowledge transfer**: documentation, training, transition assistance.
- **Continuity guarantees**: ongoing services do not interrupt during transition.

### 7.4 Annual exit drills

- Every anchor sovereign runs an exit drill annually.
- Drill exports a sample of each module's data, validates format, attempts re-import in a test environment.
- Drill measures end-to-end time and identifies gaps.
- Drill failures are reported to Sovereign Trust Officer with remediation plan.

### 7.5 Exit timing

- Notice period: typically 12 months for full national exit; shorter for partial (single module).
- Phased exit: critical services last to migrate; non-critical first to demonstrate process.
- Continuous service: no citizen sees an outage during exit.

### 7.6 What CivicOS Inc. cannot do

- Refuse exit assistance.
- Withhold data.
- Charge punitive exit fees.
- Slow-walk exit.
- Reveal sovereign data to others during transition.

Failure to honor the exit pledge triggers contractual penalties, reputational consequences, and loss of standing in the Foundation.

---

## 8. Steward replaceability

### 8.1 Why even the steward must be replaceable

If the steward is irreplaceable, the steward has captured the platform. The credible threat of replacement disciplines the steward to serve customers.

### 8.2 Mechanisms

- **Open kernel**: anyone can fork.
- **Foundation governance**: members can elect different leadership; structure not controlled by Inc.
- **Standards governance**: standards independent of Inc.
- **Source escrow**: continuity if Inc. fails or is replaced.
- **Multi-vendor marketplace**: alternative suppliers for many components.
- **Sovereign capability transfer**: per country playbook (Companion 03), sovereigns build internal capacity to operate the platform without Inc.

### 8.3 Steward succession scenarios

- **Inc. succeeded by a different commercial steward**: Foundation-mediated transition.
- **Inc. succeeded by a non-profit consortium**: members vote to transfer.
- **Inc. succeeded by a sovereign-led entity**: with appropriate structural protections.
- **Inc. dissolved with no successor**: kernel continues; modules become community-maintained or sunset; Foundation persists.

### 8.4 Foundation succession

- Foundation can be restructured by member vote.
- Foundation can be dissolved by qualified member majority with successor designation.
- In dissolution, kernel and standards transfer to successor; trademark transfers to successor or returns to public domain.

---

## 9. Standing question (sustainability frame)

Each year, leadership asks publicly:

> "Are we still affordable? Still environmentally responsible? Still attracting and retaining capable people? Still pruning what no longer serves? Still capable of being left? Still accountable to those we serve?"

The Sovereign Trust Officer publishes the answer; the Foundation publishes its assessment; the Auditor General audits; civil society assesses. The platform is responsive to outcomes — or it is reformed.

---

## 10. Sustainability KPIs

| KPI | Target |
|---|---|
| Per-citizen platform cost | Decreasing year-over-year per anchor sovereign |
| PUE (datacenter energy efficiency) | Below regional average; trending down |
| Renewable energy share | 70% by 2030; 95% by 2035; 100% by 2040 |
| Hardware refurbishment rate | 60% by 2030; 80% by 2035 |
| Critical role single-point-of-knowledge | 0 |
| Successor planning coverage | 100% of critical roles |
| Annual exit drill success | 100% |
| Capability sunset cadence | At least 1 sunset per major release |
| Documentation completeness | All public APIs, all standards, all kernel components |
| Knowledge transfer coverage | All anchor sovereigns trained to operate independently within 7 years |
| Steward financial transparency | Audited financials published annually |
| Foundation governance health | Multi-sovereign representation; rotation cadence honored |

---

## 11. Anti-patterns

The following patterns are forbidden:

- **Lock-in by undocumented data formats.** Every data has a documented format.
- **Lock-in by proprietary protocols.** Every protocol is open or has a documented exit.
- **Lock-in by exclusive talent.** Knowledge is documented and distributed.
- **Lock-in by exit complexity.** Exit drills test and reduce complexity.
- **Lock-in by punitive exit terms.** Contracts forbid them.
- **Lock-in by political dependency.** Sovereign capacity transfer is real.
- **Bloat from unwillingness to sunset.** Capability pruning is normal.
- **Hidden subsidies that distort sustainability.** Costs are honest and transparent.
- **Talent extraction from customer countries.** Sovereign capacity is the goal.
- **Infinite-life commitments without renewal.** Charters and standards sunset.
- **Stewards who cannot be replaced.** Foundation, kernel, escrow, marketplace ensure replaceability.

---

## 12. The sustainability north star

CivicOS is built to be replaceable, sunsetable, exitable, and inheritable. It is built to serve, not to depend on. Its longevity comes not from making itself indispensable but from continuously earning its place. Every year, every sovereign, every citizen has the practical option to walk away, fork, replace, or reform. That option is the foundation of trust.

A platform that fears its own sunset has stopped being legitimate. A steward that resists its own replaceability has stopped being trustworthy. A capability that cannot end has stopped being controlled.

The discipline is daily. The accountability is structural. The exit is real.

When any of these stop being true, the platform must be reformed — even at the cost of capability or continuity. Capability without sustainability, sustainability without sunset, sunset without exit — none are progress. The complete picture is.

This is the final companion. The platform is documented; the substrate is open; the standards are governed; the sovereigns are sovereign; the citizens are principal; the future is conditional on continued earned trust. The work is endless because the work is governance, and governance is endless. CivicOS is one generation's contribution to that work, designed to be inherited and improved by the next.
