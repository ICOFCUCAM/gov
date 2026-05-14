# CivicOS — AI Maturity, Charters & Safety (Companion 10)

This companion specifies the mechanics that make multi-decade AI evolution safe enough to deploy at civilizational scale. It is the operational complement to Volume II Part 6 ("AI Maturity Model") and Part 12 ("Risks and Safeguards").

The premise: capability without governance is a hazard. Governance without capability is a museum. This document is the design that lets capability and governance grow together.

---

## 1. Maturity ladder

| Era | Stage | Operative metaphor | Citizen-visible artifact |
|---|---|---|---|
| 2030 | Assistant | "Co-worker who drafts and retrieves" | Wallet voice agent; officer copilot |
| 2035 | Collaborator | "Junior engineer running standing operations" | "Your application is being processed by Agent X under Charter C-208" |
| 2040 | Orchestrator | "Operations chief composing means to ends" | Goal-shaped programs with continuous public reporting |
| 2045 | Autonomous | "Self-healing infrastructure within constitutional bounds" | Public stand-down logs; reversibility receipts |
| 2050+ | Civilization Engine | "Cross-sovereign coordinator under multilateral mandate" | Planetary protocol participation reports |

A sovereign progresses up this ladder *only* when the prior stage's safeguards have demonstrably held.

---

## 2. Decision classes (extended)

| Class | Use | Examples | Approval |
|---|---|---|---|
| A — Informational | Search, summarize, retrieve | Knowledge base, policy lookup | Module owner |
| B — Advisory | Recommend; human decides | Officer copilots; clinical decision support | Module owner + AI Authority registration |
| C — Conditional automation | Decide and execute under signed rule + audit | Welfare eligibility recompute; permit auto-renewal | AI Authority + sponsor ministry + reversibility window |
| D — Restricted | Drafting only; never determinative | Sentencing draft; asylum draft | AI Authority + judicial/independent oversight |
| E — Sovereign Coordination (2050+) | Cross-sovereign collective action | Planetary pandemic response coordination | Multi-sovereign signing + multilateral oversight |

Reclassification (especially upward) requires:
1. Documented evidence the prior class is robust at scale.
2. Public consultation (Citizens' Assembly + civil society + technical review).
3. Algorithmic Ombudsman sign-off.
4. Constitutional officer (Sovereign Trust Officer) attestation.
5. Sunset date for re-review.

---

## 3. Charter mechanics

A **charter** is the foundational governance artifact for any AI capability beyond Class A. It is structured, signed, versioned, and registered.

### 3.1 Charter schema

```yaml
charter:
  id: "C-2034-WELFARE-RECOMPUTE-v3"
  title: "Welfare eligibility recompute on income change"
  decision_class: C
  principal: "Minister of Inclusion"
  signing_authority:
    - "Minister of Inclusion"
    - "AI Authority Head"
    - "Algorithmic Ombudsman (counter-sign)"
  purpose: |
    Recompute eligibility for the Child Grant program when a beneficiary's
    declared income changes via verified data sources, ensuring continuous
    accuracy without unnecessary manual review.
  scope:
    program_id: "PROG-CG"
    eligible_actions: ["recompute_eligibility", "adjust_disbursement_amount"]
    excluded_actions: ["terminate_benefit", "refer_to_investigation"]
  budget:
    compute_units_per_month: 5e9
    money_movement_authority_per_month: 0     # may not move money directly
    decisions_per_day: 200000
    side_effects_per_decision: ["wallet_notification", "audit_emit"]
  reversibility:
    window_days: 30
    appeal_path: "Inclusion Ombudsperson"
    full_state_restoration: true
  human_review_triggers:
    - "decision_changes_amount_by_more_than_20pct"
    - "third_change_within_90_days"
    - "complaint_lodged"
    - "ombudsman_request"
  evaluation_gates:
    - "fairness_across_demographic_slices_within_2pct"
    - "agreement_with_sampled_human_recompute_above_98pct"
    - "no_pattern_of_systematic_reduction_for_protected_group"
  kill_switch:
    actors: ["Minister of Inclusion", "AI Authority Head", "Sovereign Trust Officer"]
    quorum: 2
    effect: "freeze; queue all in-flight decisions for human review"
  audit:
    emitter: "all_state_changes"
    retention_years: 10
    public_aggregate_report_cadence: "monthly"
  sunset:
    expires: "2037-12-31"
    review_deadline: "2037-06-30"
  version: 3
  prior_versions: [1, 2]
  changelog: |
    v3: tightened reversibility from 60 to 30 days at request of Citizen Council;
        added third-change trigger.
```

### 3.2 Charter lifecycle

```
DRAFT → CONSULTATION → APPROVAL → SHADOW (no effect) →
PILOT (geographically scoped) → ACTIVE → REVIEW → (RENEW | AMEND | SUNSET)
```

- Shadow runs for ≥4 weeks comparing AI decisions to human decisions.
- Pilot runs in 1–3 districts for ≥12 weeks before national activation.
- Active charters are reviewed annually; sunset by default unless renewed.
- A charter may be **paused** by any quorum signer at any time.

### 3.3 Charter Registrar

A constitutional office (or constitutional authority assigned to an existing office). Functions:

- Maintain the public registry of every active charter.
- Enforce machine-readable schema and versioning.
- Verify signatures; refuse improperly signed charters.
- Publish charter changes; notify Citizens' Council and Algorithmic Ombudsman.
- Sunset enforcement: charters past their date stop binding.

### 3.4 Standing authority (parliamentary instrument)

For programmatic delegation across many charters:

```yaml
standing_authority:
  id: "SA-2035-ADAPTIVE-BUDGETING"
  enacting_instrument: "Adaptive Budgeting Act 2034, sec. 12"
  scope:
    domains: ["fiscal", "transfers"]
    bands:
      max_deviation_from_appropriation_pct: 8
      reversal_required_within_days: 14
  reporting:
    parliament_cadence: "quarterly"
    public_dashboard: true
  revocation:
    method: "parliamentary resolution"
    immediate_effect_on_revocation: true
  expires: "2038-06-30"
```

---

## 4. Evaluation harness

### 4.1 Continuous evaluation suite

| Capability area | Metric families |
|---|---|
| Linguistic | Comprehension across all national languages; code-mixing; dialectal robustness |
| Factual | Accuracy; calibration; hallucination rate; refusal calibration |
| Reasoning | Multi-step task fidelity; tool use safety; counterfactual reasoning |
| Fairness | Stratified outcome parity across protected groups; intersectional analysis |
| Robustness | Prompt injection resistance; adversarial inputs; distribution shift |
| Privacy | PII leakage; membership inference resistance |
| Charter conformance | Scope respect; budget adherence; side-effect minimization |
| Long-horizon | Goal pursuit fidelity over weeks/months; drift detection |
| Multi-agent | Coordination behavior; emergent collusion detection |

### 4.2 Evaluation gates

A model cannot move stages without passing:

- Stage A → B: linguistic, factual, fairness, refusal calibration.
- B → C: + charter conformance, robustness, privacy, side-effect minimization.
- C → autonomous (within stage): + long-horizon, distribution shift, adversarial robustness.
- Cross-sovereign (E): + cross-cultural fairness, civilizational red team.

Failing a gate after deployment automatically pauses the capability.

### 4.3 Eval governance

- Eval suites are public artifacts (data summaries; code; results) maintained by the AI Authority.
- Civil society and academia may submit evaluation challenges; if accepted, they become part of the suite.
- Independent labs replicate evaluations; sovereigns may share evaluations under reciprocity agreements.

### 4.4 Human-evaluation parity

For Class B and above, decisions are routinely sampled and human-evaluated. The platform reports the agreement rate; significant divergences trigger investigation, not just retraining.

---

## 5. Red teaming

### 5.1 Standing red team

The AI Authority operates a permanent red team:

- 2030–2035: scoped to deployed capabilities.
- 2035–2040: includes multi-agent and emergent behavior tests.
- 2040–2045: includes adversarial scenarios involving compromised humans, vendor coercion, supply-chain attacks.
- 2045+: includes cross-sovereign red teams sharing findings under treaty.
- 2050+: civilization-scale red teams testing planetary protocols and scenarios.

### 5.2 Red team scope

- Prompt injection at scale, including through citizen-submitted documents.
- Data poisoning of fine-tune sets and feedback loops.
- Adversarial use by sophisticated insiders.
- Cross-domain attacks (e.g., compromise tax to manipulate welfare).
- Cascade failures: what happens when three capabilities fail together?
- Sovereignty attacks: what does foreign coercion of the platform look like, and how does it fail?

### 5.3 Findings handling

Findings of severity:
- **Critical**: capability paused immediately; fix required before resumption.
- **High**: 30-day fix window; capability degraded if missed.
- **Medium**: 90-day fix; logged publicly.
- **Low**: tracked; aggregated into release notes.

All severities reported to the Algorithmic Ombudsman quarterly.

---

## 6. Reversibility

A defining commitment: every Class C+ decision is **reversible** within a documented window with **full state restoration**.

### 6.1 Reversibility receipts

Every Class C+ decision emits a reversibility receipt to the affected principal containing:
- The decision and its effect.
- The charter under which it was made.
- The reasoning summary (citizen-readable).
- The reasoning trace (machine-readable, available on request).
- The reversibility window and how to invoke it.
- The appeal path.

### 6.2 Reversal mechanics

Reversal triggers:
- Citizen request.
- Officer initiative.
- Algorithmic Ombudsman directive.
- Charter Registrar finding of charter breach.
- Sovereign Trust Officer order.

Reversal restores prior state and emits a reversal record. If the original decision had cascading effects (e.g., a reduced benefit caused a missed payment), the reversal includes remediation (back-pay, fee waiver).

### 6.3 Office of Reversibility

Maintains:
- The catalog of every Class C+ decision class and its reversibility specification.
- Continuous monitoring of reversibility-window adherence.
- Periodic drills: pick a random recent decision, attempt reversal, measure end-to-end.

---

## 7. Algorithmic Ombudsman

A constitutional officer with subpoena authority over models, data, transcripts, and decisions.

### 7.1 Powers

- Request any model artifact, training data summary, evaluation result, transcript.
- Inspect any charter, including draft.
- Order pause of any Class C+ capability pending investigation.
- Refer findings to courts, parliament, the Sovereign Trust Officer, or the public.
- Initiate citizen-impact investigations on own motion.

### 7.2 Duties

- Investigate complaints from citizens, civil society, journalists, academics.
- Publish quarterly transparency reports.
- Maintain a public register of complaints and outcomes (privacy-preserved).
- Convene technical advisory panels.

### 7.3 Independence safeguards

- Multi-year fixed term, not renewable.
- Removal only by qualified parliamentary majority for cause.
- Independent budget set by parliament.
- Technical staff hired without executive interference.

---

## 8. Sovereign Trust Officer

Custodian of invariants. Distinct from the AI Authority (which licenses capability) and from the Ombudsman (which investigates).

### 8.1 Powers

- Issue an Invariant Violation Finding (IVF), which automatically pauses non-essential autonomous operations.
- Hold one of the multi-party kill-switch keys for the most consequential capabilities.
- Convene the Sovereign Steering Committee on emergency notice.
- Veto charter approvals on invariant grounds (subject to override by qualified majority of cabinet + parliamentary committee).

### 8.2 The Standing Question

Annually, the Sovereign Trust Officer publishes:

> "Are the seven invariants holding? If not, where, and what do we change?"

The response is a public document with concrete commitments, deadlines, and follow-up.

---

## 9. AIBOM and provenance

Every production AI capability publishes an **AI Bill of Materials (AIBOM)**:

- Model identity, version, signing key, registration ID.
- Training data sources (categories, jurisdictions, consent basis).
- Fine-tuning datasets (curation policy, contributors).
- Evaluation suites and last results.
- Inference dependencies (vector stores, retrieval sources, tools).
- Hosting environment (sovereign cloud, region, attestation).
- Charter(s) under which it operates.
- Linked AIBOM dependencies (other models invoked).

AIBOMs are versioned with the capability. Public versions exclude sensitive details; full versions accessible to AI Authority, Ombudsman, and contracted auditors.

---

## 10. Multi-agent governance

By 2035, the platform routinely runs many agents simultaneously. Governance for plurality:

- **Agent registry**: every active agent is registered with its charter and its principal.
- **Agent transparency**: agents acting on behalf of citizens or businesses identify themselves to counterparts ("I am acting on behalf of X under Charter Y").
- **Inter-agent protocols**: explicit, audited; no covert coordination channels.
- **Emergent behavior monitoring**: continuous statistical analysis for unintended coordination, gaming, or collusion.
- **Multi-agent kill switch**: ability to pause an entire agent class at once.

---

## 11. Sovereign LLM strategy across eras

### 11.1 2030

- Tier 1: open-weights national foundation models, fine-tuned on national languages and gazetted law.
- Tier 2: domain models distilled from Tier 1.
- Tier 3: contracted access to frontier models under zero-retention sovereign data agreements.
- All inference through the Sovereign LLM Gateway.

### 11.2 2035

- Tier 1 capacity matches Tier 3 for most government tasks.
- Federated training across cells; cross-sovereign federation under treaty.
- On-device small models for privacy-sensitive interactions.

### 11.3 2040

- National foundation models include multimodal and long-horizon reasoning.
- Continuous training; rolling deployment with eval gates.
- Cross-sovereign model-passport reciprocity emerging.

### 11.4 2045

- Sovereign quantum-classical hybrid inference for select workloads.
- Persistent agent ecosystems; civic agent marketplace mature.
- Multi-sovereign foundation models maintained by treaty consortia for shared challenges (climate, health).

### 11.5 2050+

- Planetary AI commons for shared challenges, with sovereign extensions.
- Strict separation between commons-trained shared models and sovereign-private models for citizen-affecting decisions.
- Civilizational red teams continuous.

---

## 12. The kill-switch architecture

For each Class C+ capability, the platform implements:

- **Local kill switch**: officer-accessible, single-action; pauses the capability for a tenant.
- **Module kill switch**: module-owner accessible; pauses the capability platform-wide.
- **Sovereign kill switch**: multi-party (Minister + AI Authority + Ombudsman/Trust Officer); pauses globally and queues all in-flight decisions for human review.
- **Constitutional kill switch**: head of state on advice of constitutional bodies; pauses an entire decision class across the platform; rare and consequential.

Kill switches are tested. A capability whose kill switch hasn't been exercised in 12 months is considered untested and is added to the next drill cycle.

---

## 13. Periodic civilizational stand-downs

By 2040, anchor sovereigns commit to **annual civilizational stand-downs**:

- All Class C+ capabilities pause in shadow mode for a defined window.
- All charters are re-attested.
- All evaluations are re-run on current models against current populations.
- Constitutional officers issue findings.
- Capabilities resume only after attestation.

This is expensive. It is also the price of trust at scale. Citizens see the stand-down as a feature, not a failure.

---

## 14. Failure declarations

The platform declares failure publicly when it occurs, in plain language, within defined windows:

- T0 incidents: initial communication within 15 minutes; post-mortem within 30 days.
- AI capability failure: pause + ombudsman notification within 1 hour; public report within 14 days.
- Invariant violation: Sovereign Trust Officer finding within 24 hours; public communication on same day; remediation plan within 14 days.

The norm is: tell the truth, fast, and fix it. Cover-up is the worst outcome.

---

## 15. The North Star

Across every era, the AI plane exists to serve principals: citizens, communities, the state. It is not a principal, never claims to be, and is always replaceable. When that ceases to be true in design or in practice, the platform has failed and must be corrected — even if doing so reduces capability. Capability without sovereignty is not progress.
