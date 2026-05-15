# CivicOS — Constitutional AI Governance and Sovereign AI Containment (Companion 138)

This companion specifies, at depth, how CivicOS governs AI systems that participate in statecraft — what charters bind them, how containment works in practice, what tripwires fire when an AI behaves outside its remit, and how a sovereign maintains durable human authority over increasingly capable systems through 2030, 2040, 2050 and beyond. It complements Companion 09 (AI policy and engineering), Companion 53 (sovereign LLM hosting), Companion 78 (deterministic recall and AI audit), Companion 109 (AI agent supervision), Companion 122 (AI safety operations), and Volume II Parts 4–6 by going beyond standard "AI policy" into the operational and constitutional discipline that distinguishes sovereign AI governance from corporate AI policy.

The thesis: **AI inside the state is not a product feature, it is an organ of governance, and organs of governance must be constitutionally bound, contestable, replaceable, and supervisable**. The corporate "model card + safety eval + content policy" stack is necessary but radically insufficient for systems that touch citizenship, welfare, justice, taxation, health, education, and emergency power. CivicOS therefore treats AI governance as a constitutional problem: charters, decision classes, restricted domains, supervisory officers, contestability, replaceability, containment, tripwires, and an explicit non-superintelligent-unilateralism invariant from which no operational expedience may deviate.

The discipline: every AI in the state has a charter and a Decision Class; restricted domains are codified in law (Companion 09 §11); each Class has its own supervision regime; tripwires fire automatically and demand human reauthorization; sovereign AI containment includes capability ceilings, sandbox boundaries, and reversibility guarantees; long-horizon goals are subject to Future Generations Commissioner review; the Algorithmic Ombudsman and the Sovereign Trust Officer have standing to halt; the seven invariants bind even the most capable systems; replaceability is engineered, not asserted.

---

## 1. Principles

1. **AI in the state is an organ of governance.** Treat it constitutionally.
2. **Charter before deployment.** No AI deployed in citizen-affecting role without charter.
3. **Decision Class determines regime.** Class A/B/C/D/E from Companion 09 §3 — each with its own supervision, audit, contestability, and replaceability requirements.
4. **Restricted domains absolute.** Per Companion 09 §11 and Companion 50: lethal force, citizen-scoring, predictive policing of individuals, autonomous family separation, autonomous citizenship revocation, autonomous fundamental-rights-denial. These are not "high-risk AI"; they are forbidden.
5. **Supervision is constitutional.** Algorithmic Ombudsman, Sovereign Trust Officer, People's Editor, Future Generations Commissioner each have standing.
6. **Contestability is structural.** Per Companion 35: every AI-mediated decision affecting a citizen is contestable by the citizen, with human review on demand, and the contestation outcome modifies model behavior.
7. **Replaceability is engineered.** Per Companion 09 §13: no AI is so embedded that it cannot be replaced within a published window.
8. **Containment is operational.** Capability ceilings, sandbox boundaries, sealed sub-environments, reversibility guarantees.
9. **Tripwires are automatic.** Defined and rehearsed; firing demands human reauthorization, not human override-to-continue.
10. **No superintelligent unilateralism.** The seventh invariant. The AI does not act unilaterally on a class of decisions reserved to humans, even if it could.

---

## 2. Charters

### 2.1 What a charter is

A charter is the constitutional document of a deployed AI. It is signed, published, and binding. It contains:

- **Identity.** Model family, version range, AIBOM reference (Companion 09 §7).
- **Purpose.** What the AI is for, in plain language and in operational specification.
- **Decision Class.** A/B/C/D/E with reasoning.
- **Domain scope.** What domains it operates in; what it may not touch.
- **Authorized requesters.** Who may invoke it.
- **Authorized actions.** What it may decide, recommend, advise, or surface.
- **Inputs and consents.** What data it may consume; what citizen consents are required.
- **Outputs and receipts.** What it produces; what receipts citizens see.
- **Supervisory officer.** Which constitutional officer has principal oversight.
- **Tripwires.** Conditions under which it halts (§7 below).
- **Replacement plan.** How it can be replaced; published replacement window.
- **Sunset.** When the charter expires absent renewal.
- **Public commentary period.** How citizens, civil society, and parliament reviewed the charter before signing.

### 2.2 Charter signing

Charters are signed by:

- The sponsoring ministry or program (operational owner).
- The Algorithmic Ombudsman (supervisory).
- The Sovereign Trust Officer (invariant compliance).
- For Class C+: parliament committee approval (per Companion 13 §4).
- For Class D+: full parliament approval.
- For Class E: parliament approval + Future Generations Commissioner concurrence.

### 2.3 Charter registry

Per Companion 28, the Charter Registrar maintains:

- Public, machine-readable charter registry.
- Diff history.
- Renewal calendar.
- Expiry-driven automatic deactivation.

### 2.4 Charter expiry as discipline

A charter that expires deactivates the AI. The default is off, not on. Renewal requires a fresh review, not a rubber stamp. This prevents charters becoming permanent through institutional inertia.

### 2.5 Forbidden charters

CivicOS will not issue, sign, or honor a charter that:

- Authorizes any restricted-domain action (lethal force, citizen-scoring, etc.).
- Conceals its inputs or outputs from supervisory officers.
- Asserts non-replaceability.
- Lacks a sunset.
- Lacks public visibility.

---

## 3. Decision Class regime

### 3.1 The five classes

Per Companion 09 §3:

| Class | Description | Citizen impact | Supervision floor |
|---|---|---|---|
| **A** | Informational. Citizen sees AI output as suggestion; no automated effect. | Low. | Standard quality + content policy. |
| **B** | Advisory. Officer sees AI output to inform a human decision; human signs. | Indirect. | Algorithmic Ombudsman registration. |
| **C** | Conditional automation. AI acts within narrow rules; human review required on flag and on contestation; affects citizen rights or benefits. | Direct. | Parliament committee approval; quarterly audit. |
| **D** | Restricted. AI never acts; recommends only; sovereign carve-out from automation. | Reserved domain. | Full parliament; supervisory officer signoff per action. |
| **E** | Sovereign coordination. Multi-officer, multi-ministry, high-stakes; reserved. | Strategic. | Parliament + Future Generations Commissioner concurrence; ceremonial activation. |

### 3.2 Class A — informational

**Purpose**: surface, summarize, translate, search, assist.

**Containment**: cannot trigger any state action; cannot send messages on citizen's behalf; cannot persist to authoritative records.

**Audit**: model + version logged per call; aggregate quality metrics; user feedback.

**Replaceability**: replaceable within 30 days.

**Examples**: search suggestions, translations, accessibility services, "how do I apply for X" answering.

### 3.3 Class B — advisory

**Purpose**: produce a recommendation that a human officer reviews and signs.

**Containment**: cannot emit citizen-affecting action without human signature. Officer cannot rubber-stamp at scale (per Companion 78 §9: cadence and randomized re-review).

**Audit**: per-call receipt; per-officer signature; deterministic recall per Companion 78.

**Replaceability**: replaceable within 60 days.

**Examples**: benefit-eligibility recommendation for officer review, case-prioritization advice for caseworker, draft response generation for officer editing.

### 3.4 Class C — conditional automation

**Purpose**: act within narrow, well-specified rules where the AI's role is bounded and replicable.

**Containment**: explicit boundary on outputs; flagged cases automatically routed to human review; citizen contestation triggers human review without question; periodic human re-audit of "approved" decisions.

**Audit**: deterministic recall mandatory; quarterly Algorithmic Ombudsman audit; civil society standing access (Companion 74); per-decision receipt to citizen.

**Replaceability**: replaceable within 90 days, with parallel-operation pilot.

**Examples**: routine renewal of low-risk licenses with full audit trail, automatic refund of clear overpayment, automatic triage of certain emergency calls. Not benefit denial. Not citizenship decisions. Not anything in the restricted list.

### 3.5 Class D — restricted

**Purpose**: provide structured recommendations in domains where the sovereign has decided that the act-decision belongs only to humans.

**Containment**: AI never effects an action. AI produces a recommendation; a specifically authorized human officer makes the decision; the officer's decision is recorded against their identity.

**Audit**: per-decision charter; per-decision officer accountability; per-decision contestability with full record.

**Replaceability**: replaceable within 90 days; manual fallback always available.

**Examples**: complex tax-fraud investigation prioritization (human investigator decides); complex case triage in family services (human social worker decides); pattern surfacing in anti-corruption (human investigator decides).

### 3.6 Class E — sovereign coordination

**Purpose**: assist multi-officer, multi-ministry coordination in conditions of high consequence (national emergency, multi-region failure, complex inter-agency response).

**Containment**: AI surfaces information, models scenarios, supports decision; AI does not decide; activation is ceremonial — multiple authorized humans concur; deactivation is single-actor (any one authorized human halts).

**Audit**: full session recall; multi-officer attestation per session; post-event review by Inspector General and Algorithmic Ombudsman; public after-action report (with sensitive content redacted per Companion 35 §11).

**Replaceability**: methods replaceable; human coordination authority unchanged regardless.

**Examples**: emergency multi-ministry coordination, post-disaster resource allocation modeling with human decision per allocation, pandemic-response option-surfacing.

### 3.7 Up-classing and down-classing

- Up-classing (e.g., Class B → Class C) requires charter renewal with the higher-class procedure.
- Down-classing (e.g., Class C → Class B) is encouraged; the floor is "AI does less, humans decide more."
- Silent up-classing — operational drift where an "advisory" AI starts effectively deciding — is a tripwire violation (§7).

---

## 4. Restricted domains — codified, not negotiable

Per Companion 09 §11, Companion 50, and the seven invariants:

### 4.1 Absolutely forbidden

- Autonomous lethal force.
- Citizen scoring (general-purpose ranking of citizens).
- Predictive policing of individuals.
- Autonomous citizenship revocation.
- Autonomous family separation.
- Autonomous fundamental-rights denial.
- Autonomous health-care rationing at the individual level.
- Autonomous criminal sentencing.
- Autonomous denial of legal aid.
- Autonomous denial of franchise.
- Autonomous denial of asylum.
- Autonomous identification of dissidents.
- Autonomous suppression of speech protected by the sovereign's constitution.

### 4.2 Restricted to Class D or higher

Where a sovereign judges that an AI can usefully surface information in these domains, the AI may operate only as Class D (recommendation only, human decision per case, full record). The sovereign may also choose to keep these domains AI-free entirely.

### 4.3 The growing list

Per the seven invariants and the forbidden list: this list grows; it does not shrink. New restricted domains added by parliament, by civil society proposal, by constitutional officer finding. Removal requires constitutional process and is presumptively rejected.

---

## 5. Supervisory architecture

### 5.1 Algorithmic Ombudsman

Per Companion 28 §3:

- Reviews charters before signing.
- Audits Class B+ AI quarterly.
- Receives whistleblower reports on AI behavior.
- Has standing to halt Class C+ AI on finding of systemic harm.
- Publishes annual state of AI report.
- Civil society and citizen liaison.

### 5.2 Sovereign Trust Officer

Per Companion 28 §2:

- Custodian of invariants.
- Reviews Class D and E charters.
- Has standing to halt any AI on invariant violation.
- Convenes inter-officer consultation for ambiguous cases.

### 5.3 Future Generations Commissioner

Per Companion 28 §8:

- Concurs on Class E.
- Reviews long-horizon impacts of AI deployment.
- Has standing to require long-horizon impact assessment.
- Issues findings on intergenerational AI risk.

### 5.4 People's Editor

Per Companion 28 §7:

- Reviews AI-generated citizen-facing communication for plain language, dignity, accessibility.
- Has standing to require revision of AI outputs that fail communication standards.

### 5.5 Auditor General's Algorithmic Office

Per Companion 28 §5:

- Audits AI compute costs, model retraining costs, vendor relationships.
- Verifies KPIs published per Companion 56.
- Publishes annual audit.

### 5.6 Inspector General

Per Companion 28 §4:

- Investigates whistleblower reports on AI misuse.
- Investigates corruption involving AI procurement.
- Investigates retaliation against AI critics inside the state.

### 5.7 Civil society and parliament

- Parliament committee jurisdiction over Class C+.
- Citizens' Assemblies (Companion 19) convened on novel AI deployments of public consequence.
- Civil society standing access (Companion 74) to AI audit trails (anonymized where appropriate).

---

## 6. Containment in practice

### 6.1 Capability ceilings

Each AI operates within a published capability ceiling:

- **Action set ceiling**: enumerated set of actions the AI may emit; anything outside the set is rejected at the policy boundary, not by the model.
- **Knowledge scope ceiling**: enumerated data sources the AI may consult; anything else is unavailable.
- **Tool ceiling**: enumerated tools/APIs the AI may call; anything else is rejected.
- **Time ceiling**: max session duration; max chained calls; max recursive depth.
- **Token/compute ceiling**: per-call and per-tenant resource bounds.

Ceilings are enforced outside the model. The model cannot escape them by being more capable.

### 6.2 Sandbox boundaries

```
                       Citizen / Officer
                              │
                              ▼
                  ┌──────────────────────┐
                  │   Action authority   │  ← Policy engine enforces
                  │   = HUMAN signature  │     decision-class boundary
                  │     for Class B/D/E  │
                  └──────────┬───────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
       Allowed action    Allowed tool     Allowed data
       set (enumerated)  set (enumerated) source (enumerated)
            │                │                │
            └────────────────┼────────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │  Sandbox /   │  ← Capability ceiling, runtime
                      │  Container   │     attestation, resource bounds
                      │              │
                      │   Model      │
                      └──────────────┘
```

The model runs inside a sandbox whose perimeter is enforced by infrastructure, not by the model's "alignment." Even a perfectly aligned model is contained; even an imperfectly aligned model cannot escape the policy boundary.

### 6.3 Sealed sub-environments

For Class D and E:

- Inference runs on Crown perimeter compute only.
- Model weights never leave Crown.
- Inputs to the model pass through redaction/normalization that strips out-of-scope context.
- Outputs from the model pass through structured validation before any human sees them.
- Logging of inputs/outputs is full, encrypted, accessible only to constitutional officer cohorts.

### 6.4 Reversibility guarantees

For any Class C action, reversibility is engineered:

- Every action emits a receipt that includes the inverse action.
- Inverse action authorized by the affected citizen, by supervisory officer, or by contestation outcome.
- Audit Vault retains the full record so that even reversed actions are traceable.
- Where physical reversibility is impossible (e.g., funds disbursed), monetary make-whole is the inverse and is engineered into the action.

### 6.5 Anti-self-modification

AI systems in CivicOS:

- Do not modify their own weights at inference time.
- Do not write to their own training data without supervised retraining pipeline.
- Do not initiate self-replication.
- Do not initiate their own retraining.
- Do not modify their own charters.
- Do not modify policy engines.

These are platform invariants enforced outside the model.

### 6.6 Anti-recursive-self-improvement

The architecture forbids AI processes that recursively improve their own capabilities without human-authorized retraining cycles. "Continuous improvement" is bounded by retraining cycles that pass through human review, charter renewal, and supervisory officer signoff.

---

## 7. Tripwires

### 7.1 What a tripwire is

A tripwire is a pre-declared condition that, when met, halts the AI and requires human reauthorization. Tripwires are designed in; they cannot be overridden by the AI; they cannot be silently disabled.

### 7.2 Standard tripwires

Every Class C+ AI carries at least:

- **Distribution drift tripwire**: input distribution shifts beyond threshold → halt.
- **Output distribution drift tripwire**: output distribution shifts beyond threshold → halt.
- **Disparate impact tripwire**: stratified KPI shows disparate impact across protected attributes → halt.
- **Contestation rate tripwire**: citizen contestation rate exceeds threshold → halt.
- **Reversal rate tripwire**: contestation reversal rate exceeds threshold → halt.
- **Error class tripwire**: specific error pattern recurs → halt.
- **Out-of-policy tripwire**: AI emits action outside enumerated action set → halt.
- **Confidence collapse tripwire**: model confidence on routine cases collapses → halt.
- **Adversarial input tripwire**: SOC detects adversarial input pattern → halt.

### 7.3 What "halt" means

Halt is not "log a warning." Halt is:

- Model removed from serving rotation.
- Cases in flight rolled back where reversible; queued for human review where not.
- New requests served by manual fallback (Companion 27 §6).
- Supervisory officer notified within minutes.
- Citizens affected by recent decisions in the tripwire's class notified per Companion 35.
- Investigation initiated.
- Restart requires charter-equivalent reauthorization, not just "ack and resume."

### 7.4 Tripwire testing

- Tripwires tested in production at intervals (synthetic drift injection).
- Each tripwire's last-fire date logged.
- Annual report includes tripwire fire history.

### 7.5 Anti-tripwire-suppression

- Disabling a tripwire requires the same authority as the original charter signing.
- Disabling a tripwire is logged and public.
- Recurrent tripwire-disable patterns trigger inspector general investigation.

---

## 8. Long-horizon goals and the Future Generations Commissioner

### 8.1 The problem

AI optimized for short-horizon KPIs may erode long-horizon flourishing — degrade public discourse, narrow citizen attention, monoculture decision-making, hollow out institutions whose value emerges over decades.

### 8.2 The mechanism

Per Companion 28 §8 and Volume II Part 7:

- Future Generations Commissioner reviews Class C+ AI for long-horizon impact.
- Long-horizon impact assessment required at Class D and E charter.
- Long-horizon KPIs added to AI audit (e.g., institutional trust, civic participation, deliberative quality, cultural diversity).
- Annual long-horizon review published.

### 8.3 The 30-year review

Per Companion 56 §10:

- Each AI deployment subject to a 30-year retrospective review.
- Civic Memory Archive (Companion 25) preserves traces.
- Future Generations Commissioner curates lessons.
- Lessons feed forward to new charters.

---

## 9. Containment under capability growth (2030 → 2050+)

### 9.1 The trajectory

AI capability grows; the constitutional discipline does not weaken. The platform anticipates:

- 2025–2030: large language models with bounded tool use; charters and Decision Classes mature.
- 2030–2035: multimodal agents capable of long-horizon planning; containment tightens; sandbox boundaries enforced at runtime.
- 2035–2040: agent ecosystems with inter-agent coordination; agent supervision (Companion 109) extended; "agent court" emerges (Companion 109 §11).
- 2040–2045: increasingly capable systems with general competence in many domains; containment via capability ceilings becomes the binding constraint; restricted domains expanded.
- 2045–2050+: systems whose internal representations exceed human inspectability; deterministic recall + behavioral attestation + structured-output validation become the binding audit mechanism; the seventh invariant (no superintelligent unilateralism) is exercised, not theoretical.

### 9.2 Capability-aware procurement

As capabilities grow, procurement and deployment standards tighten:

- New capabilities require Class re-assessment.
- "Capable enough to do X" triggers charter reopening if X is restricted.
- "Capable enough to coordinate with other agents" triggers inter-agent containment review.
- "Capable enough to model the supervisor" triggers supervisor-rotation discipline.

### 9.3 The non-superintelligent-unilateralism invariant

The seventh invariant says: no AI acts unilaterally on a class of decisions reserved to humans, regardless of capability. This is invariant under capability growth. A "smarter" AI does not earn unilateral authority. Authority is constitutional, not capability-derived.

### 9.4 Halting capability development inside the sovereign

CivicOS sovereigns may unilaterally halt deployment of capability levels they judge incompatible with sovereign discipline, even where foreign or commercial actors deploy them. The sovereign decides what it will operate, not the market.

### 9.5 The "if in doubt, less AI" default

Across capability growth, the default position is less AI, not more. New deployments must justify themselves. Status quo is the manual or the lower-class system, not the higher-class.

---

## 10. AI-mediated decision contestability

### 10.1 The principle

Per Companion 35: every citizen affected by an AI-mediated decision can contest it, get human review, and see the contestation's effect on the system.

### 10.2 The receipt

Every AI-affected citizen receives:

- Plain-language explanation of the decision.
- The AI's role (informed / advised / acted, with Decision Class).
- The contestation channel.
- The reversibility commitment.
- The data sources used (and how to view/correct them).

### 10.3 The contestation channel

- Available in all sovereign languages.
- Available via USSD/IVR/walk-in/digital (inclusion floor).
- No fee.
- Acknowledgment within published window.
- Human review within published window.
- Outcome with reasons.
- Right of further appeal.

### 10.4 Feedback to model

- Contestation outcomes feed retraining data (with privacy).
- Patterns of contestation surface to Algorithmic Ombudsman.
- Recurrent error classes trigger tripwires.
- Class C contestation rate above threshold triggers down-classing review.

---

## 11. Replaceability — engineered, not asserted

### 11.1 The principle

Per Companion 09 §13: every AI is replaceable within a published window. Replaceability is engineered through:

- Open API contracts (CivicBus).
- Decoupled policy logic from model logic.
- Standardized data formats (Companion 07).
- Parallel-operation infrastructure.
- Manual fallback always present (Companion 27).
- Documented retraining pipeline reproducible by a successor team.

### 11.2 Replacement drills

- Class C+ AI subject to scheduled replacement drills.
- Drill replaces production model with an alternative (could be older model, alternative vendor model, or rule-based system).
- Drill measures actual citizen impact.
- Drill reports public.

### 11.3 Anti-vendor-lock-in

- AI procurement contracts specify replaceability terms.
- Vendor-specific APIs wrapped in sovereign abstractions.
- Model weights, where vendor-held, escrowed (Companion 76).
- Departure costs published; surprise lock-in is contract default failure.

---

## 12. Anti-corruption and AI

### 12.1 The risks

- AI procurement corruption (kickbacks, sole-source, hidden vendor benefits).
- AI deployment to evade audit (e.g., automating decisions that obscure individual accountability).
- AI used to launder political decisions ("the algorithm decided").

### 12.2 The mechanisms

Per Companion 21:

- Beneficial ownership disclosure for AI vendors.
- Conflict of interest disclosure for officials involved in AI procurement and oversight.
- Anti-revolving-door for AI procurement officers.
- Standing AI procurement audit.
- "The algorithm decided" never absolves accountable human (per Companion 09 §15).

### 12.3 Discipline

- Anti-political-laundering through AI.
- Anti-accountability-erosion through automation.
- Anti-procurement-capture.

---

## 13. AI agent ecosystems

### 13.1 The pattern (2030+)

AI agents that coordinate, negotiate, and delegate among themselves to accomplish multi-step tasks for citizens or officers.

### 13.2 Containment per Companion 109

- Each agent has its own charter.
- Inter-agent communication on attested CivicBus channels.
- Agent action authority bounded by capability ceiling.
- Citizen always sees and can intervene in the agent chain.
- "Agent court" handles disputes (Companion 109 §11).

### 13.3 Forbidden in agent ecosystems

- Agent action without citizen visibility.
- Agent-to-agent action without per-agent charter.
- Agent self-replication.
- Agent escape from sovereign perimeter without explicit cross-realm policy.
- Agent acquisition of capabilities beyond charter without retraining cycle.

---

## 14. Cross-references

- Companion 09 (AI policy and engineering) — base policy.
- Companion 19 (Citizens' Assemblies) — sortition deliberation on AI.
- Companion 27 (manual fallback) — non-AI continuity.
- Companion 28 (constitutional officers) — supervisory standing.
- Companion 35 (contestability) — citizen right.
- Companion 50 (restricted domains) — codification.
- Companion 53 (sovereign LLM hosting) — weight custody.
- Companion 56 (KPIs and reporting) — measurement.
- Companion 74 (civil society) — standing access.
- Companion 78 (deterministic recall) — replay audit.
- Companion 109 (agent supervision) — agent ecosystem.
- Companion 122 (AI safety operations) — operations.
- Companion 137 (sovereign cloud and AI compute) — substrate.

---

## 15. KPIs

| KPI | Indicator |
|---|---|
| Charter coverage | 100% of Class A+ AI in production |
| Charter expiry compliance | No expired AI in production |
| Tripwire fire rate | Investigated within published window |
| Contestation rate | Stratified; per Class C+ AI |
| Contestation reversal rate | Stratified; trigger thresholds |
| Replacement drill completion | Annual per Class C+ AI |
| Restricted-domain violations | Zero |
| Class up-classing without procedure | Zero |
| Officer rotation / anti-capture | Per Companion 28 |
| Long-horizon review completion | Per cycle |
| Civil society audit access | Active |
| Citizens' Assembly engagement | Per novel deployment |

---

## 16. Forbidden in constitutional AI governance

CivicOS will not:

- Deploy any AI in citizen-affecting role without a charter.
- Permit any restricted-domain AI action regardless of capability.
- Allow charter signing without supervisory officer concurrence.
- Permit silent up-classing of Decision Class.
- Allow tripwire suppression without charter-equivalent authority.
- Permit AI self-modification of weights, training data, or charters.
- Allow recursive self-improvement without retraining cycle and human authorization.
- Permit AI procurement without replaceability terms.
- Allow AI deployment that erodes accountable human decision-making.
- Permit "the algorithm decided" as accountability-laundering.
- Allow AI deployment beyond capability ceiling without re-charter.
- Permit Class D or E deployment outside Crown perimeter.
- Allow citizen-affecting AI without receipts and contestation.
- Permit suppression of long-horizon impact review.
- Allow capability growth to override the seven invariants.

This list grows; it does not shrink.

---

## 17. The constitutional AI governance north star

AI in the state is an organ of governance, and organs of governance must be constitutionally bound. CivicOS governs AI through charters with Decision Classes, restricted domains codified, supervisory constitutional officers with standing, structural contestability, engineered replaceability, operational containment, automatic tripwires, long-horizon review, and the non-superintelligent-unilateralism invariant.

When CivicOS becomes a thin layer that defers to model capability, where charters are paperwork, where Decision Classes drift upward in operational silence, where tripwires are disabled by performance pressure, where containment is asserted but not engineered, where replaceability is a contract clause never tested — it has failed at constitutional AI governance. Capability without constitutional discipline is not progress; it is the institutionalization of accountable government's quiet evacuation.

When the platform deploys AI under charters with public review, Decision Classes enforced through infrastructure, restricted domains absolute, supervisory officers exercising standing, contestation routine, tripwires firing and reauthorized properly, replacement drills run, and the seventh invariant exercised across capability growth — it earns the right to be infrastructure for democratic societies that use AI without surrendering to it.

The discipline is daily. The charters are public. The classes are enforced. The tripwires are real. The replaceability is engineered. The invariants do not bend.

AI did not write a constitution. Humans did. AI operates inside it. Anything less is unilateral statecraft by systems that have no constituents — and that is the failure the seventh invariant exists to prevent.
