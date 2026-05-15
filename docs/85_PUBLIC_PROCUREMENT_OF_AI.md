# CivicOS — Public Procurement of AI Systems (Companion 85)

This companion specifies how CivicOS approaches public procurement of AI systems specifically — a domain that combines the disciplines of Companion 21 (anti-corruption), Companion 18 (sovereign LLM lifecycle), Companion 10 (AI maturity & safety), and Companion 34 §4 (procurement as market signal). Public procurement of AI deserves dedicated treatment because it sits at the intersection of vendor relationships, technical capability assessment, civil liberties safeguards, and long-term sustainability — all under heightened risk of capture or harm.

The thesis: **public procurement of AI is fundamentally different from procurement of other software**. AI systems can produce systematic harm at scale, evolve in unexpected ways, encode bias, depend on opaque training data, and lock sovereigns into vendor relationships difficult to exit. CivicOS supports public AI procurement through enhanced vendor scrutiny, mandatory AIBOM and evaluation results, decision-class-appropriate restrictions, sovereign exit guarantees, civil society engagement, and strict adherence to the forbidden list.

The discipline: enhanced vendor due diligence; AIBOM mandatory; charter required; constitutional officer review; civil society standing; sovereign exit tested; multi-vendor for critical AI; open weights preferred; foreign coercion-resistance clauses; ongoing oversight contractual.

---

## 1. Principles

1. **AI procurement is high-stakes.** Treat accordingly.
2. **Enhanced vendor due diligence.** Beyond standard procurement.
3. **AIBOM mandatory.** Per Companion 10 §9.
4. **Charter required.** Per Companion 10 §3 for Class B+ deployment.
5. **Constitutional officer review.** Algorithmic Ombudsman, Sovereign Trust Officer, others as relevant.
6. **Civil society standing.** Public consultation for major AI procurement.
7. **Sovereign exit tested.** Annual exit drills for AI capability.
8. **Multi-vendor for critical AI.** Anti-monopoly.
9. **Open weights preferred.** Where feasible.
10. **Forbidden list strict.** Procurement cannot circumvent forbidden capabilities.

---

## 2. AI procurement categories

| Category | Description | Procurement intensity |
|---|---|---|
| **Foundation models** | Sovereign Tier 1 / 2 / 3 deployments | Highest scrutiny |
| **Domain models** | Specialist AI for specific functions | High scrutiny |
| **Embedded AI** | AI components within larger systems | Module-appropriate scrutiny |
| **AI-as-a-service** | Hosted AI via API | Tier 3 partnership terms |
| **Agentic systems** | Multi-agent or orchestration platforms | Highest scrutiny |
| **Specialized AI** | Niche AI for specific use cases | Use-case-appropriate scrutiny |

Each category has procurement implications.

---

## 3. Pre-procurement assessment

Before any AI procurement, document:

### 3.1 Need

- What problem is being solved?
- Has the problem been addressed without AI?
- Why is AI the appropriate solution?
- What outcomes will define success?

### 3.2 Decision class

- What decision class will the AI operate at? (Companion 10 §2)
- Class D capabilities cannot be procured for forbidden uses.
- Class C requires reversibility window infrastructure.
- Class B requires advisory framing throughout.

### 3.3 Risk assessment

- What are foreseeable harms?
- What populations are at heightened risk?
- What civil liberties implications?
- What sovereignty implications?

### 3.4 Discipline

- Pre-procurement assessment is public.
- Civil society comment period.
- Algorithmic Ombudsman consultation.
- Sovereign Trust Officer review for major procurement.

---

## 4. Vendor due diligence

### 4.1 Baseline (per all government procurement)

- Beneficial ownership transparency (Companion 21 §3.4).
- Tax compliance.
- Past performance.
- Conflict of interest declarations.

### 4.2 AI-specific due diligence

- AIBOM disclosure pre-bid.
- Model provenance (sourcing, training, fine-tuning).
- Evaluation methodology and results.
- Bias auditing history.
- Incident history.
- Data governance practices.
- Foreign coercion-resistance attestations.
- Sovereign exit support commitments.
- Open weights policy.

### 4.3 Discipline

- Multi-source verification.
- Independent assessment.
- Civil society and academic input.
- Anti-vendor-marketing-claim acceptance without verification.

### 4.4 Forbidden vendors

- Vendors with documented patterns of building forbidden capabilities (per Companion 43 §4).
- Vendors with coercion-resistance failures.
- Vendors that refuse AIBOM disclosure.
- Vendors with disqualifying corruption findings.

---

## 5. Procurement process

### 5.1 Open competition default

Per Companion 21 §4:

- OCDS publication.
- Open competition default.
- Restricted procurement requires documented rationale.
- Direct awards only with multi-party approval and public disclosure.

### 5.2 Evaluation

- Published criteria.
- Committee scoring (rotated members).
- Algorithmic Ombudsman input on AI-specific criteria.
- Civil society observation where feasible.
- Anti-collusion AI applied to bid patterns.

### 5.3 Award

- Decision published with rationale.
- Contract structured with milestones.
- Performance accountability.
- Sovereign exit clauses.
- AIBOM update obligations.

### 5.4 Forbidden in process

- Procurement structured to favor specific vendors.
- Award without published rationale.
- Skipping AI-specific evaluation criteria.
- Hiding AIBOM gaps.

---

## 6. Contract terms

### 6.1 Required terms

- Sovereign keys for any sovereign-critical signing.
- Source escrow with sovereign custodians.
- AIBOM update obligations.
- Continuous evaluation cooperation.
- Algorithmic Ombudsman audit cooperation.
- Civil society inquiry cooperation.
- Foreign coercion-resistance attestation.
- Sovereign exit support including data export, model artifacts where applicable.
- Performance KPIs.
- Termination for cause including evaluation failure.

### 6.2 Forbidden terms

- Vendor lock-in through proprietary formats.
- Backdoors of any kind.
- Telemetry to non-sovereign endpoints from production.
- Foreign-jurisdiction-only dispute resolution for sovereign-critical contracts.
- Mandatory arbitration foreclosing sovereign remedies.
- Restrictions on civil society or academic engagement with deployed AI.

---

## 7. Foundation models procurement

### 7.1 Tier 1 (sovereign foundation models)

Per Companion 18 §3:
- Open weights preferred.
- Sovereign training where feasible.
- Sovereign fine-tuning.
- Sovereign hosting.

### 7.2 Tier 2 (sovereign domain models)

- Distilled from Tier 1 typically.
- Domain expertise integrated.
- Sovereign hosting.

### 7.3 Tier 3 (frontier partnerships)

Per Companion 18 §13:
- Zero retention contractual.
- Sovereign data residency.
- Audit rights.
- Coercion-resistance clauses.
- Service continuity guarantees.
- Exit transition.
- Independent security review.

### 7.4 Discipline

- Tier 1 capability prioritized for sovereign foundation needs.
- Tier 3 only where Tier 1/2 insufficient and risk acceptable.
- Hybrid approaches considered.

---

## 8. Embedded AI procurement

### 8.1 The pattern

Many software systems include AI components. Procurement must surface and assess these.

### 8.2 Mechanisms

- AIBOM at component level.
- Decision class assessment of embedded AI.
- Charter for any Class B+ embedded AI.
- Monitoring of embedded AI behavior.

### 8.3 Discipline

- Anti-stealth-AI in software procurement.
- Continuous AI surveillance audit.

### 8.4 Forbidden

- Hidden AI components in procured software.
- Embedded AI bypassing charter requirements.
- Embedded AI exfiltrating data.

---

## 9. AI-as-a-service procurement

### 9.1 The pattern

Hosted AI accessed via API. Common but raises specific risks.

### 9.2 Mechanisms

- Sovereign LLM gateway intermediation (per Companion 18 §14).
- Rate limiting and budget enforcement.
- Filtering and guardrails.
- Audit of all calls.
- Anti-data-retention contractual.

### 9.3 Discipline

- Vendor cannot retain sovereign data.
- Vendor cannot use sovereign data for training.
- Service continuity guaranteed.

### 9.4 Forbidden

- AI-as-a-service that retains data.
- AI-as-a-service that trains on sovereign data without explicit consent.
- AI-as-a-service without exit options.

---

## 10. Agentic systems procurement

### 10.1 Heightened scrutiny

Agentic systems (multi-agent or orchestration platforms) carry particularly high risk because they can take action, not just generate outputs.

### 10.2 Mechanisms

- Charter for agent class.
- Kill switches at multiple levels.
- Inter-agent protocol governance (Companion 18 §15).
- Multi-agent monitoring for emergent behavior.
- Reversibility for all agent actions.

### 10.3 Discipline

- Limited initial deployment.
- Extensive shadow phase.
- Continuous monitoring.
- Civil society and academic engagement.

### 10.4 Forbidden

- Agentic systems that cannot be paused.
- Agentic systems with Class D capabilities.
- Agentic systems that operate beyond their charter.
- Agentic systems with covert coordination capabilities.

---

## 11. Cross-sovereign AI procurement cooperation

### 11.1 Mechanisms

- Joint procurement for shared infrastructure.
- Shared evaluation suites.
- Cross-sovereign vendor due diligence sharing.
- Treaty-based AI safety cooperation (Companion 15 §11).

### 11.2 Discipline

- Sovereign authority over deployment decisions.
- Equitable participation.
- Sovereign exit options.

### 11.3 Forbidden

- Cross-sovereign procurement compromising sovereign authority.
- Coerced participation.

---

## 12. Civil society engagement

### 12.1 Mechanisms

- Pre-procurement public consultation.
- Civil society standing in procurement design.
- Algorithmic Ombudsman investigations of patterns.
- Citizens' Assembly review for major AI procurement.
- Whistleblower channels for procurement misconduct.

### 12.2 Discipline

- Genuine engagement, not performative.
- Capacity building support for civil society engagement.

### 12.3 Forbidden

- Suppression of civil society engagement.
- Discriminatory access to procurement information.

---

## 13. Ongoing oversight

### 13.1 The principle

AI procurement is not one-time event; ongoing oversight contractual.

### 13.2 Mechanisms

- Continuous evaluation per Companion 10 §4.
- Algorithmic Ombudsman audit rights.
- Annual sovereignty audit including AI procurement.
- Public reporting on AI capability performance.
- Civil society inquiries facilitated.

### 13.3 Discipline

- Anti-vendor-resistance to oversight.
- Honest performance reporting.
- Anti-cover-up of issues.

### 13.4 Forbidden

- Vendor resistance to constitutional officer access.
- Suppression of performance issues.
- Hidden capability changes post-procurement.

---

## 14. Sunset and exit

### 14.1 Sunset

Per Companion 20 §6.7:
- Sunset planning from day one.
- Capability sunset is normal lifecycle event.
- Successor in place before sunset.
- Data archived per retention rules.

### 14.2 Exit

Per Companion 20 §7:
- Annual exit drills for AI capability.
- Vendor cooperation in exit transition.
- Data export including model artifacts where applicable.
- Replacement vendor procurement processes ready.

### 14.3 Discipline

- Exit tested annually.
- Vendor exit clauses honored.
- Sovereign continuity assured.

### 14.4 Forbidden

- Vendor lock-in preventing exit.
- Vendor refusing exit support.
- Sovereign-critical AI without exit options.

---

## 15. Forbidden in AI procurement

CivicOS will not:

- Permit vendors with documented patterns of building forbidden capabilities.
- Allow vendors that refuse AIBOM disclosure.
- Permit vendors with disqualifying corruption findings.
- Allow procurement structured to favor specific vendors.
- Permit award without published rationale.
- Allow skipping AI-specific evaluation criteria.
- Permit vendor lock-in through proprietary formats.
- Allow backdoors of any kind.
- Permit telemetry to non-sovereign endpoints.
- Allow foreign-jurisdiction-only dispute resolution for sovereign-critical.
- Permit hidden AI components in procured software.
- Allow embedded AI bypassing charter requirements.
- Permit AI-as-a-service that retains data.
- Allow agentic systems that cannot be paused.
- Permit agentic systems with Class D capabilities.
- Allow vendor resistance to constitutional officer access.
- Permit cover-up of performance issues.
- Allow sovereign-critical AI without exit options.
- Permit cross-sovereign procurement compromising sovereign authority.
- Allow suppression of civil society engagement.

This list grows; it does not shrink.

---

## 16. KPIs

| KPI | Indicator |
|---|---|
| AI procurement OCDS publication | 100% above threshold |
| AIBOM disclosure | 100% of AI procurement |
| Sovereign keys in AI contracts | 100% of sovereign-critical |
| Source escrow coverage | 100% of sovereign-critical |
| Multi-vendor for critical AI | Coverage |
| Open weights share of foundation models | Trending up |
| Constitutional officer engagement | Active across procurement lifecycle |
| Civil society engagement | Standing access functioning |
| Annual exit drill success | 100% |
| Vendor coercion-resistance compliance | 100% attestation |

---

## 17. The AI procurement north star

Public procurement of AI is high-stakes. Errors can produce systematic harm at scale, lock sovereigns into vendor relationships difficult to exit, encode bias into long-term services, and undermine civil liberties through opaque automation.

CivicOS supports rigorous AI procurement through enhanced vendor due diligence, AIBOM mandatory, charter required for Class B+, constitutional officer review, civil society standing, sovereign exit tested, multi-vendor for critical AI, open weights preferred, forbidden list strict.

When CivicOS becomes a tool of poor AI procurement — vendor capture, hidden capabilities, foreign coercion vulnerabilities, civil society suppression in procurement, lock-in to forbidden capabilities — it has failed both procurement integrity and AI safety. Capability without procurement discipline is not progress; it is the institutionalization of vendor and capability risks at sovereign scale.

When the platform supports AI procurement with discipline — through enhanced scrutiny, transparency, constitutional officer engagement, civil society standing, sovereign exit testing, and forbidden list adherence — it earns the right to be infrastructure for sovereigns deploying AI responsibly.

The discipline is daily. The scrutiny is enhanced. The transparency is real. The exit is tested. The forbidden list is enforced. The civil society engagement is structural.

AI procurement is one of the highest-leverage decisions sovereigns make in the digital age. Get it right and the platform serves citizens. Get it wrong and the harm cascades for years. The discipline matters.
