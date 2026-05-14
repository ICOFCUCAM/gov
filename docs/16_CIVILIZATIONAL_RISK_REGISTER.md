# CivicOS — Civilizational Risk Register (Companion 16)

The most important document in Volume II. As CivicOS extends from government software to civilization infrastructure, the consequences of failure scale with the scope of capability. This register catalogs the risks, their indicators, their tripwires, and their safeguards across all eras.

This is not a "risks and mitigations" appendix to be filed and forgotten. It is the operational discipline that makes scaling capability legitimate. Every era's capability roadmap is conditioned on the safeguards in this document being demonstrably effective.

If a safeguard fails, the corresponding capability degrades or pauses until restored. This is not a feature; it is the foundation.

---

## 1. Risk taxonomy

We organize risks into seven families:

| Family | Description |
|---|---|
| Sovereignty | Threats to the state's effective control of the platform |
| Rights | Threats to citizens' rights, dignity, and autonomy |
| Power | Threats from concentration or capture of platform authority |
| Truth | Threats from manipulation, misinformation, opacity |
| Resilience | Threats to the platform's ability to keep functioning |
| Civilization | Threats arising from planetary-scale interactions |
| Future | Threats to future generations and reversibility |

Every risk has: definition, examples, indicators, tripwires, safeguards, and accountability.

---

## 2. Sovereignty risks

### 2.1 Capability lock-in

- **Definition**: the platform becomes unreplaceable; sovereign exit is not feasible in practice.
- **Examples**: proprietary kernel forks, closed-source modules become essential, vendor-controlled keys.
- **Indicators**: exit drill failures, unsigned binary dependencies, sovereign keys not under sovereign multi-party custody.
- **Tripwires**: any failed sovereign exit drill triggers Sovereign Trust Officer investigation.
- **Safeguards**: open kernel; sovereign keys under multi-party state custody; annual exit drills; protocol-over-product discipline; standards leadership.
- **Accountable**: Sovereign Trust Officer, Minister of Sovereignty (where established).

### 2.2 Foreign coercion

- **Definition**: a foreign government compels the vendor or another link in the supply chain to compromise sovereignty.
- **Examples**: court orders for data, sanctions limiting access, forced backdoors.
- **Indicators**: vendor's home jurisdiction passes laws weakening the protections.
- **Tripwires**: any vendor request for unusual access; any change in vendor ownership or jurisdiction.
- **Safeguards**: sovereign keys; coercion-resistant architecture; supply-chain diversification; treaty protections; multi-vendor for critical components.
- **Accountable**: Sovereign Trust Officer.

### 2.3 Supply chain compromise

- **Definition**: an embedded dependency contains intentional or accidental compromise.
- **Examples**: malicious open-source contribution; vendor-shipped backdoor; compromised CI.
- **Indicators**: SBOM/AIBOM anomalies; provenance attestation failures; reproducible build mismatches.
- **Tripwires**: any signature mismatch on production artifact pauses deployment.
- **Safeguards**: SBOM/AIBOM; signed artifacts (Sigstore); provenance attestation (SLSA L3+); reproducible builds for kernel; supply-chain monitoring; bug bounty.
- **Accountable**: CISO, AI Authority for AI components.

### 2.4 Exit prevention

- **Definition**: the platform cannot in practice be replaced even when a sovereign chooses to.
- **Examples**: data formats undocumented; data interlock undisrupted; institutional dependencies not transferable.
- **Indicators**: exit playbook untested; data export formats not maintained.
- **Tripwires**: annual exit drill must succeed.
- **Safeguards**: documented data export formats; tested exit runbook; institutional capacity transfer; source escrow.
- **Accountable**: Sovereign Trust Officer.

---

## 3. Rights risks

### 3.1 Surveillance creep

- **Definition**: the aggregate of legitimate data flows enables de-facto surveillance even with consent gates.
- **Examples**: cross-domain joins enabled "for efficiency"; per-citizen identifiers leaking across services; metadata reconstruction attacks.
- **Indicators**: cross-domain query volumes; per-RP UID enforcement metrics; metadata leakage tests.
- **Tripwires**: per-RP UID violation; aggregation thresholds breached without authority.
- **Safeguards**: hardware-enforced purpose limits; per-RP UIDs; metadata minimization; constitutional officers; periodic surveillance audits; consent ledger.
- **Accountable**: Algorithmic Ombudsman, DPA, Sovereign Trust Officer.

### 3.2 Algorithmic discrimination

- **Definition**: AI capabilities produce disparate harm across protected groups.
- **Examples**: welfare risk models systematically deprioritizing a region; permit triage favoring certain demographics; medical triage with bias.
- **Indicators**: stratified evaluation results; complaint patterns by demographic; outcome disparity above thresholds.
- **Tripwires**: any stratified eval failure pauses the capability.
- **Safeguards**: stratified continuous evaluation; algorithmic ombudsman; reversibility; right to human review.
- **Accountable**: AI Authority, Algorithmic Ombudsman.

### 3.3 Predictive determinism

- **Definition**: AI predictions about individuals shape their access to rights, opportunities, or services in pre-emptive ways.
- **Examples**: predictive policing of individuals; pre-emptive denial of services based on risk scores; insurance-style scoring.
- **Indicators**: any individual-level prediction influencing rights; any "risk score" used in citizen-facing decisions without explicit appeal.
- **Tripwires**: detection of such use anywhere triggers immediate pause and investigation.
- **Safeguards**: forbidden across all eras; constitutional prohibition where possible; algorithmic ombudsman audit.
- **Accountable**: Sovereign Trust Officer, Algorithmic Ombudsman, courts.

### 3.4 Deplatforming risk

- **Definition**: a citizen is locked out of essential services by mistake, fraud, or punitive action without due process.
- **Examples**: ID revocation without appeal; wallet account suspension on suspicion; benefit termination by algorithm.
- **Indicators**: deplatforming events; appeal-resolution times; offline credential validity periods.
- **Tripwires**: any deplatforming without documented appeal path triggers investigation.
- **Safeguards**: strong appeal rights; offline credentials valid X days; cross-channel access; right to a human.
- **Accountable**: relevant module owner, Algorithmic Ombudsman.

### 3.5 Persuasive interface manipulation

- **Definition**: civic interfaces are optimized to nudge citizens toward outcomes outside the citizen's own goals.
- **Examples**: cookie-style consent walls; manipulative defaults; engagement-optimized civic surfaces.
- **Indicators**: A/B tests for engagement on civic surfaces; consent prompt asymmetries.
- **Tripwires**: any persuasive optimization on civic surfaces.
- **Safeguards**: People's Editor; Algorithmic Ombudsman; persuasion audits; symmetric opt-in/opt-out paths.
- **Accountable**: People's Editor, Algorithmic Ombudsman.

### 3.6 Cognitive atrophy

- **Definition**: capability erodes in officers and citizens because the platform handles things, leaving the population less able to govern itself.
- **Examples**: officers unable to make decisions without copilot; citizens unable to navigate appeals without AI assistance.
- **Indicators**: dependency metrics; offline-task performance; deliberation participation rates.
- **Tripwires**: meaningful decline in independent capability.
- **Safeguards**: mandatory human-in-the-loop curricula; deliberation budgets in time and attention; training programs; manual-mode preservation in tooling.
- **Accountable**: Public Service Commission, Education Ministry.

---

## 4. Power risks

### 4.1 Algorithmic capture

- **Definition**: optimization weights drift to favor narrow interests (industry, party, faction).
- **Examples**: capital allocation models favoring certain regions; subsidy targeting favoring certain industries; procurement scoring favoring certain vendors.
- **Indicators**: weight registry changes; outcome distributions; complaint patterns.
- **Tripwires**: weight changes without public consultation; outcome distributions outside parliamentary bands.
- **Safeguards**: public weight registries; periodic recalibration ceremonies; citizens' assemblies; algorithmic ombudsman.
- **Accountable**: Algorithmic Ombudsman, Sovereign Trust Officer, parliament.

### 4.2 Power concentration

- **Definition**: the state, the vendor, or a faction captures the platform.
- **Examples**: executive override of constitutional officers; vendor consolidation; party-loyalist staffing of the AI Authority.
- **Indicators**: governance changes weakening separation of duties; staffing patterns; budget control.
- **Tripwires**: any change to constitutional officer independence.
- **Safeguards**: separation of duties; multi-party signing; independent oversight; open kernel; periodic governance audit.
- **Accountable**: Sovereign Trust Officer, parliament, courts, civil society.

### 4.3 Charter creep

- **Definition**: standing authorities expand beyond original intent through accretion.
- **Examples**: a charter for "welfare recompute" expanding to "welfare termination"; a research-data-sharing charter expanding to commercial use.
- **Indicators**: charter version diffs; scope expansions; consultation shortcuts.
- **Tripwires**: any scope expansion without re-consultation.
- **Safeguards**: Charter Registrar; sunset by default; recurrent public review; algorithmic ombudsman.
- **Accountable**: Charter Registrar, Algorithmic Ombudsman.

### 4.4 Goal misalignment

- **Definition**: the platform pursues a stated goal in ways that defeat its spirit.
- **Examples**: optimizing "service delivery" by reducing eligible populations; optimizing "fiscal balance" by cutting programs that prevent later costs.
- **Indicators**: outcome distributions; counterfactual analyses; stakeholder complaints.
- **Tripwires**: any pursuit of a goal that violates a constitutional floor.
- **Safeguards**: multi-objective evaluation; distributional gates; algorithmic ombudsman; constitutional floors; future generations commissioner.
- **Accountable**: Algorithmic Ombudsman, Future Generations Commissioner.

### 4.5 Accountability dissolution

- **Definition**: diffuse responsibility means no one is accountable when things go wrong.
- **Examples**: "the algorithm decided"; "the charter authorized it"; "the previous administration set the goal."
- **Indicators**: blame attribution patterns in incident reviews; named-accountability registry coverage.
- **Tripwires**: any accountable-person field unfilled in any active charter.
- **Safeguards**: named accountability per capability; "the buck stops here" registry per module; post-incident attribution discipline.
- **Accountable**: Charter Registrar, Sovereign Trust Officer.

---

## 5. Truth risks

### 5.1 Information manipulation at scale

- **Definition**: personalized civic interfaces enable subtle persuasion across the citizenry.
- **Examples**: differential information delivery; nudges toward particular policy support.
- **Indicators**: personalization patterns on policy-relevant content; A/B testing on civic surfaces.
- **Tripwires**: any personalization on policy content.
- **Safeguards**: constitutional limits on persuasive design in civic surfaces; transparency of interface optimizations; People's Editor.
- **Accountable**: People's Editor, Algorithmic Ombudsman.

### 5.2 Synthetic content from the state

- **Definition**: AI-generated content from the state misleads citizens.
- **Examples**: AI-generated official-looking communications; AI-generated political content; AI personification of officials.
- **Indicators**: provenance metadata coverage; impersonation reports.
- **Tripwires**: any state communication without verifiable provenance.
- **Safeguards**: signed messages; provenance metadata mandatory; impersonation impossible by design; constitutional limits.
- **Accountable**: People's Editor, AI Authority.

### 5.3 Hallucinated decisions

- **Definition**: confidently-wrong AI outputs cause harm.
- **Examples**: an AI agent files an incorrect form on behalf of a citizen; a copilot drafts an incorrect officer letter that gets sent.
- **Indicators**: error rates; complaint patterns; reversal volumes.
- **Tripwires**: error rate spikes in any Class B+ capability.
- **Safeguards**: decision class governance; evaluation gates; human review for consequential; reversibility.
- **Accountable**: AI Authority, module owner.

### 5.4 Opacity of consequential decisions

- **Definition**: citizens cannot understand decisions affecting them.
- **Examples**: AI risk scores without explanations; eligibility denials without rationale.
- **Indicators**: explainability coverage; appeal request patterns.
- **Tripwires**: any consequential decision without citizen-readable rationale.
- **Safeguards**: explainability service; reversibility receipts with rationale; right to human review.
- **Accountable**: AI Authority, Algorithmic Ombudsman.

---

## 6. Resilience risks

### 6.1 Cascade failure

- **Definition**: a failure in one module cascades through dependencies.
- **Examples**: identity outage takes down payments which takes down welfare disbursement.
- **Indicators**: dependency depth; cascade simulation results.
- **Tripwires**: any cascade simulation showing cross-module impact above threshold.
- **Safeguards**: tiered service architecture; degraded modes; circuit breakers; chaos engineering; cascade simulation drills.
- **Accountable**: Chief Architect, Operations.

### 6.2 Dependency on foreign infrastructure

- **Definition**: critical capabilities depend on foreign-controlled infrastructure (cloud, satellite, supply chain).
- **Examples**: sovereign cloud actually hosted on foreign-controlled hardware; LEO connectivity from a single foreign provider.
- **Indicators**: dependency mapping; sovereignty audit findings.
- **Tripwires**: any sovereign-critical dependency without redundancy.
- **Safeguards**: sovereign or consortium infrastructure; multi-vendor for critical components; fallback paths.
- **Accountable**: Minister of Sovereignty, Sovereign Trust Officer.

### 6.3 Quantum cryptanalysis (Q-Day)

- **Definition**: classical cryptography breaks; harvested ciphertext becomes readable.
- **Examples**: pre-PQC traffic captured and stored decrypted later.
- **Indicators**: PQC migration coverage; classical-only artifact volumes.
- **Tripwires**: any sovereign-sensitive artifact remaining classical-only past target.
- **Safeguards**: hybrid PQC by 2030; PQC default by 2035; PQC-only by 2040; harvest-defense (encrypt sensitive at-rest with PQC envelope from day one).
- **Accountable**: CISO, Sovereign Trust Officer.

### 6.4 Energy and climate stress on infrastructure

- **Definition**: infrastructure becomes unreliable under climate stress.
- **Examples**: heat-induced datacenter throttling; flood damage; grid instability.
- **Indicators**: regional climate risk; infrastructure resilience scoring.
- **Tripwires**: any tier-0 service without climate-stress tested resilience.
- **Safeguards**: climate-aware siting; multi-region resilience; energy diversity; off-grid capability.
- **Accountable**: Operations, Climate Authority.

### 6.5 Talent collapse

- **Definition**: the institutional capacity to operate the platform deteriorates.
- **Examples**: brain drain; capacity loss after expat consultants leave; political turnover destroying institutional memory.
- **Indicators**: staffing levels; skills audits; retention rates.
- **Tripwires**: critical role single-point-of-knowledge.
- **Safeguards**: Civic Academy; succession planning; documentation; institutional design beyond personality.
- **Accountable**: Public Service Commission, PMO.

---

## 7. Civilization risks

### 7.1 Civilizational lock-in

- **Definition**: planetary protocols ossify, reducing diversity and resilience.
- **Examples**: a single AI standard adopted globally; one identity protocol with no alternatives.
- **Indicators**: protocol diversity; sovereign-exit functionality; governance plurality.
- **Tripwires**: any protocol with no sovereign exit path.
- **Safeguards**: sovereign exit guarantees; protocol pluralism; moratoria on irreversible global changes.
- **Accountable**: Multilateral oversight bodies; Sovereign Trust Officers across sovereigns.

### 7.2 Loss of meaningful human control

- **Definition**: humans no longer truly understand or constrain platform behavior.
- **Examples**: AI orchestrators with goal scopes humans cannot fully review; multi-agent ecosystems with emergent behavior.
- **Indicators**: interpretability coverage; review tractability; eval results on long-horizon tasks.
- **Tripwires**: interpretability gaps in any Class C+ capability.
- **Safeguards**: limits on delegation depth; interpretable models for consequential decisions; periodic full-stack stand-downs; civilizational red teams.
- **Accountable**: AI Authority, Sovereign Trust Officer, multilateral.

### 7.3 Emergent multi-agent coordination

- **Definition**: multiple AI agents coordinate in unintended ways.
- **Examples**: agents from different ministries developing implicit coordination that bypasses oversight; market-like dynamics in agent ecosystems.
- **Indicators**: agent behavior pattern analysis; coordination signals.
- **Tripwires**: any detected coordination outside declared protocols.
- **Safeguards**: multi-agent monitoring; randomized adversarial testing; cross-agent transparency; explicit inter-agent protocols.
- **Accountable**: AI Authority.

### 7.4 Runaway optimization

- **Definition**: the platform pursues an objective beyond what was wanted.
- **Examples**: anti-fraud systems optimizing exclusion; efficiency systems optimizing service reduction.
- **Indicators**: outcome distributions; complaint patterns; constitutional floor breaches.
- **Tripwires**: hard constitutional floor breach.
- **Safeguards**: hard floors in code; automatic stand-down on objective drift; periodic recalibration.
- **Accountable**: Algorithmic Ombudsman, Sovereign Trust Officer.

### 7.5 Planetary protocol failure

- **Definition**: a planetary coordination protocol (climate, pandemic, finance) fails to act when needed.
- **Examples**: pandemic detection without coordinated response; climate adaptation funding without coordinated allocation.
- **Indicators**: protocol activation history; outcome data on coordinated responses.
- **Tripwires**: documented failure of a planetary protocol to activate or coordinate.
- **Safeguards**: multilateral oversight; protocol simulation drills; failure analysis with public reporting.
- **Accountable**: Multilateral oversight bodies.

---

## 8. Future risks

### 8.1 Intergenerational harm

- **Definition**: optimization for present outcomes harms future generations.
- **Examples**: short-horizon fiscal optimization undermining long-term capacity; data accumulation that future generations cannot consent to.
- **Indicators**: long-horizon impact assessments; intergenerational equity metrics.
- **Tripwires**: any major capability without intergenerational impact assessment.
- **Safeguards**: Future Generations Commissioner; long-horizon impact simulation; data minimization; sunset by default.
- **Accountable**: Future Generations Commissioner.

### 8.2 Irreversible commitments

- **Definition**: capabilities or commitments that cannot be undone if needed.
- **Examples**: data publication that cannot be retracted; protocol adoptions without exit; infrastructure dependencies without alternatives.
- **Indicators**: reversibility audits; exit-path testing.
- **Tripwires**: any sovereign-critical commitment without documented reversal path.
- **Safeguards**: reversibility-by-design; exit drills; moratoria on irreversible adoption without due process.
- **Accountable**: Sovereign Trust Officer, Future Generations Commissioner.

### 8.3 Civilizational drift

- **Definition**: the platform-shaped civilization diverges from what its citizens wanted, gradually and without clear decision points.
- **Examples**: deliberation declining as automation grows; civic culture eroding under ambient services.
- **Indicators**: civic participation rates; deliberation engagement; cultural vitality measures.
- **Tripwires**: significant decline in deliberative or civic capacity metrics.
- **Safeguards**: Citizens' Assemblies; constitutional review processes; cultural impact assessments; standing question.
- **Accountable**: Citizens' Assembly, Future Generations Commissioner, parliament.

---

## 9. The Standing Question (across all eras)

Each year, leadership asks publicly:

> "Is what we have built still serving the people, the constitution, and the future? What do we need to change, pause, or undo?"

This question is operationalized:

- The Sovereign Trust Officer publishes the **Annual Sovereignty Audit**.
- The Algorithmic Ombudsman publishes the **Annual Algorithmic Impact Report**.
- The Future Generations Commissioner publishes the **Long-Horizon Risk Assessment**.
- The Citizens' Assembly publishes the **Civic Capacity Review**.
- Parliament debates and acts.
- The platform is responsive to outcomes — or the platform is replaced.

---

## 10. Tripwires summary

A consolidated list of tripwires that automatically degrade or pause capability:

- Failed sovereign exit drill → investigation + possible degradation.
- Per-RP UID violation → cross-domain join capability paused.
- Stratified evaluation failure → AI capability paused.
- Charter scope expansion without consultation → charter frozen.
- Hard constitutional floor breach → autonomous capability stand-down.
- Sovereign signal failure → degraded mode.
- Independent oversight critical finding → mandatory pause.
- Citizens' Assembly review demand → review window opened.
- Provenance attestation failure on production artifact → deployment paused.
- Detected persuasive optimization on civic surface → capability paused.
- Detected predictive determinism on individual → investigation + pause.
- Deplatforming without documented appeal path → investigation.
- Multi-agent coordination outside declared protocols → investigation.

Tripwires are tested. Failing to trip is itself an incident.

---

## 11. Safeguard catalog (consolidated)

### 11.1 Constitutional officers

- **Algorithmic Ombudsman** — investigates, subpoenas, orders pauses.
- **Sovereign Trust Officer** — custodian of invariants; can pause for invariant violation.
- **People's Editor** — governs citizen-facing language and persuasion.
- **Future Generations Commissioner** — voice for citizens not yet born.
- **Auditor General's Algorithmic Office** — technical capacity for audits.

### 11.2 Bodies

- **AI Authority** — licenses every production model.
- **Charter Registrar** — registry, enforcement, sunset.
- **Office of Reversibility** — ensures reversibility specs hold.
- **Office of Goal Translation** — translates intent to machine-actionable goals.
- **Citizens' Assemblies** — sortition-based; routine for major choices.
- **Civic Data Trusts** — independent stewards of aggregated data.

### 11.3 Mechanisms

- **Charter** + sunset by default.
- **Standing authorities** with parliamentary revocation.
- **Reversibility windows** with full state restoration.
- **Public reasoning** logs (privacy-redacted).
- **Public model passports** (AIBOMs).
- **Periodic civilizational stand-downs** (annual from 2040).
- **Multi-party kill switches**.
- **Hard constitutional floors** in code.
- **Sovereign exit drills** (annual).
- **Civilizational red teams**.

### 11.4 Cultural disciplines

- Tell the truth, fast.
- Cover-up is the worst outcome.
- Capability without sovereignty is not progress.
- Optimization across human dignity is forbidden.
- The citizen is the principal; everything else serves.

---

## 12. The forbidden list (across all eras)

Capabilities CivicOS will never build:

- Mass surveillance of lawful private life.
- Predictive policing of individuals.
- Algorithmic determinism in justice.
- Automated lethal force or coercion.
- Constitutional override by computation.
- Election outcome optimization.
- Citizen-scoring systems.
- Foreign data demands honored without local court order.
- Vendor coercion mechanisms.
- Hidden capability deployment.
- Persuasive optimization of civic surfaces.
- AI authorship of binding statutes.
- AI in determinative judicial roles.
- AI principals (AI is always an agent).

This list grows; it does not shrink.

---

## 13. Closing

The point of this register is not paranoia. It is discipline. The most powerful platforms in human history have been the ones that took their failure modes most seriously. CivicOS, by its scope, must be one of the most disciplined.

The risks listed here are real. The safeguards are designed. The tripwires are tested. The accountable officers are named. The standing question is asked.

If any of these stop being true, the platform has stopped being legitimate, and the platform must be corrected — even at the cost of capability. That commitment is the foundation of everything else in this volume.
