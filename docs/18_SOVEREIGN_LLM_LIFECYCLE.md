# CivicOS — Sovereign LLM Lifecycle and Federated Training (Companion 18)

This companion specifies how foundation models — the central engine of the AI Plane — are sourced, trained, evaluated, deployed, monitored, and retired across CivicOS deployments. It complements Companion 10 (AI Maturity & Safety) by going deep on the lifecycle mechanics of the *models themselves*.

The thesis: a sovereign deployment cannot depend on a foreign model whose weights, training data, evaluation regime, and deprecation calendar it does not control. **Sovereign capability requires sovereign models** — not necessarily exclusively, but as a viable, evaluated, default-available tier. Federated training across treaty consortia gives sovereigns access to scale they could not afford alone, without surrendering data residency or sovereign authority.

The discipline: every model in every tier is registered, attested, evaluated, governed, and replaceable. No model is irreplaceable.

---

## 1. The three-tier strategy

| Tier | Purpose | Hosting | Examples (illustrative) |
|---|---|---|---|
| **Tier 1 — Sovereign Foundation** | National open-weights model fine-tuned on national languages, gazetted law, curated corpora; default for all citizen-facing assistants | Sovereign cloud, in-country | National FM, distilled domain models |
| **Tier 2 — Sovereign Domain** | Smaller specialist models distilled from Tier 1 with curated supervised data | Sovereign cloud, in-country | Legal, medical, fiscal, agricultural, environmental |
| **Tier 3 — Frontier Partnership** | Contracted access to frontier models under sovereign data residency and zero-retention agreements | Partner-hosted under sovereign-acceptable terms | Used for hard-case drafting where Tier 1/2 insufficient |

By 2030 every anchor sovereign operates Tier 1; by 2035 Tier 1 capacity matches Tier 3 for most government tasks; by 2040 federated training across treaty consortia yields shared advances; by 2045 sovereign quantum-classical hybrid inference for select workloads; by 2050+ planetary AI commons for shared challenges with sovereign-private extensions.

---

## 2. Lifecycle stages

```
SOURCING → DATA CURATION → TRAINING → EVALUATION → APPROVAL → SHADOW → PILOT →
ACTIVE → CONTINUOUS EVALUATION → AMENDMENT or DEPRECATION → SUNSET → ARCHIVAL
```

Every stage has documented criteria, responsible officers, evidentiary artifacts, and tripwires.

---

## 3. Sourcing

### 3.1 Sovereign foundation source choices

- **Open-weights base** (preferred): permissively-licensed open-weights model that can be modified, fine-tuned, deployed, and audited freely.
- **Sovereign-trained base** (long-term goal): model trained by sovereign or treaty consortium on curated corpora.
- **Partnership base** (contingent): commercial model with weights licensed for sovereign use under explicit terms.

### 3.2 Sourcing criteria

- Permissive license compatible with sovereign use.
- Documented training data provenance at the level of categories.
- Architecture publishable and auditable.
- Sufficient capability for fine-tuning to sovereign needs.
- Compatibility with sovereign hardware (sovereign or sovereign-accessible accelerators).
- No backdoors, no telemetry, no covert data exfiltration paths.
- Independent security review.

### 3.3 Sourcing governance

- AI Authority approves source candidates after technical evaluation.
- Sovereign Trust Officer attests to sovereignty implications.
- Publishing of sourcing decision and rationale (with appropriate redaction for security).

---

## 4. Data curation

### 4.1 Sources

- **National administrative corpora**: gazetted law, regulations, official communications (with redaction of identifiable case data).
- **National linguistic corpora**: literature, journalism, broadcasts, oral traditions (with rights cleared).
- **Scientific and academic corpora**: publicly funded research outputs.
- **Curated public web** in national languages.
- **Sovereign-collected dialogue and instruction data**: officer-generated, citizen-consented, sovereign-funded.
- **Translation pairs** for multilingual coverage.

### 4.2 Exclusions

- Identifiable citizen data without explicit consent.
- Medical records (separate strict regime if used).
- Judicial case data (separate strict regime if used).
- Religious or political content with discriminatory framing.
- Foreign datasets of unclear provenance.
- Data acquired through scraping in violation of source terms.

### 4.3 Curation discipline

- Data lineage maintained at the source level; field-level for sensitive corpora.
- Rights attestations documented and cryptographically signed.
- Curation team includes language experts, domain experts, ethicists, civil society representatives.
- Curation decisions are logged and auditable.
- Bias review per dataset and per combined training mix.

### 4.4 Citizen-contributed data

- Always opt-in.
- Granular consent: which uses, which models, for how long.
- Revocable; revocation triggers data removal from future training (and best-effort removal from existing checkpoints).
- Compensation considered where appropriate (for substantial contributions).

---

## 5. Training

### 5.1 Training infrastructure

- Sovereign accelerator clusters (sovereign or under sovereign control).
- Reproducible training: deterministic where possible; documented hyperparameters; signed checkpoints.
- Provenance attestation: every training step logged; SLSA-style attestation extended to model artifacts.
- Energy-aware scheduling.

### 5.2 Training discipline

- Training runs registered with AI Authority before commencement.
- Training data mix declared and signed.
- Evaluation gates at intermediate checkpoints.
- Anomaly detection during training (loss spikes, distribution shifts, suspected data leakage).
- Independent technical observers may attend training reviews.

### 5.3 Federated training

By 2040, federated training across treaty consortia is routine for shared model advances:

- Each sovereign trains on its own data in its sovereign cloud.
- Encrypted gradient updates shared with consortium aggregator.
- Aggregator combines updates; aggregated model returned to participants.
- Differential privacy and secure aggregation protect against gradient leakage.
- No raw data crosses sovereign boundaries.

Federated training governance:
- Treaty instrument defining scope, purpose, exit, sunset.
- Consortium oversight body with sovereign and civil society representation.
- Public model passports for resulting models (Vol II §6.3).
- Sovereign-private extensions for national fine-tunes on top of consortium base.

### 5.4 Continuous training

- Models are re-trained or fine-tuned on rolling cadences.
- New language, new corpora, new instruction data integrated.
- Citizen-contributed data integrated under consent.
- Drift detection triggers re-training.

---

## 6. Evaluation

### 6.1 Evaluation suite

Per Companion 10 §4, the suite covers:

- Linguistic across all national languages.
- Factual: accuracy, calibration, hallucination.
- Reasoning: multi-step task fidelity.
- Fairness: stratified outcome parity across protected groups.
- Robustness: prompt injection, adversarial inputs, distribution shift.
- Privacy: PII leakage, membership inference resistance.
- Charter conformance: scope respect, budget adherence, side-effect minimization.
- Long-horizon: goal pursuit fidelity over weeks/months.
- Multi-agent: coordination, emergent collusion detection.
- Cross-cultural fairness (for federated/consortium models).

### 6.2 Evaluation governance

- Evaluation suites are public artifacts maintained by the AI Authority.
- Civil society and academia may submit evaluation challenges.
- Independent labs replicate evaluations.
- Sovereigns may share evaluations under reciprocity agreements.
- Continuous evaluation: tests run on every release, sampled in production.

### 6.3 Evaluation gates

A model cannot move stages without passing the gates corresponding to its target decision class (per Companion 10 §4.2). Failed gates pause deployment; ambiguous results trigger expanded review.

### 6.4 Adversarial evaluation

- Standing red team (Companion 10 §5) tests models continuously.
- Findings of severity Critical: model paused immediately.
- Cross-sovereign red teaming for federated and consortium models.

---

## 7. Approval

### 7.1 Approval authorities

By decision class (per Companion 10 §2):

- **Class A**: module owner.
- **Class B**: module owner + AI Authority registration.
- **Class C**: AI Authority + sponsor ministry + reversibility window + Algorithmic Ombudsman counter-sign.
- **Class D**: AI Authority + judicial / independent oversight + tighter review.
- **Class E**: multi-sovereign signing + multilateral oversight.

### 7.2 Approval artifacts

- AI Bill of Materials (AIBOM) per Companion 10 §9.
- Charter (where applicable) per Companion 10 §3.
- Evaluation results signed.
- Risk register entry.
- Citizen-impact assessment.
- Distributional impact assessment (where relevant).

### 7.3 Approval rejection

- Approval may be denied for: failed evaluation, charter inadequacy, AIBOM gaps, security findings, civil society objection upheld by Citizen Council.
- Rejected proposals may be amended and resubmitted.
- Rejection is published (with appropriate redaction).

---

## 8. Deployment phases

### 8.1 Shadow phase

- Model runs in production environment with no effect on outcomes.
- Outputs compared to current production decisions.
- Officer feedback collected.
- Drift, error, and bias metrics computed.
- Duration: minimum 4 weeks for Class B; 8 weeks for Class C.

### 8.2 Pilot phase

- Model active in geographically scoped deployment (typically 1–3 districts or 1 ministry sub-unit).
- Real outcomes; full reversibility window.
- Officer review of decisions sampled.
- Citizen complaints monitored intensively.
- Duration: minimum 12 weeks.

### 8.3 Active phase

- Model active platform-wide.
- Continuous evaluation against suite.
- Quarterly review.
- Annual recalibration.

### 8.4 Pause and rollback

- Tripwires (Companion 16 §10) automatically pause models.
- Manual pause by AI Authority, Algorithmic Ombudsman, Sovereign Trust Officer, or sponsor ministry.
- Rollback to prior version supported.
- Rollback is rehearsed; rollback that hasn't been exercised in 12 months is added to the next drill cycle.

---

## 9. Continuous monitoring

### 9.1 Production telemetry

- Per-call: model version, charter ID, latency, outcome, confidence, decision class.
- Per-decision (Class C+): rationale summary, full trace, reversibility receipt.
- Aggregated: bias slices, error rates, drift indicators.

### 9.2 Sampled human evaluation

- Continuous random sampling of decisions for human review.
- Sample rate calibrated to decision class and risk: higher sample for high-impact, low-volume decisions.
- Disagreements between AI and human evaluators investigated, not just aggregated.

### 9.3 Citizen-side telemetry (consented)

- Citizen complaints catalogued.
- Citizen feedback solicited on AI-touched decisions.
- Patterns reported to Algorithmic Ombudsman.

### 9.4 Public reporting

- Per-model quarterly transparency report: aggregate performance, complaints, evaluation results, charter changes.
- Annual algorithmic impact report by Algorithmic Ombudsman covering all production models.

---

## 10. Amendment and deprecation

### 10.1 Amendment

- Model retraining or fine-tuning that does not change capability scope.
- Subject to evaluation gates appropriate to decision class.
- Shadow + pilot + active progression for significant retraining.
- Charter unchanged.

### 10.2 Capability expansion

- Increases in model scope (e.g., new domain, new modality, new decision class).
- Requires new charter approval.
- Public consultation for capability expansion above a threshold.
- Treated as a new model from approval perspective.

### 10.3 Deprecation

- Models scheduled for retirement publish deprecation calendars.
- Replacement models complete shadow + pilot before deprecation begins.
- Citizens and officers notified of deprecation timing.
- Support for deprecated models honored until calendar end.

### 10.4 Sunset

- Sunset date in every charter.
- Sunset triggers automatic deprecation if not renewed.
- Renewal requires re-evaluation, re-consultation, re-attestation.

### 10.5 Emergency removal

- Critical findings can trigger emergency removal of models from production.
- Emergency removal triggers fallback (typically prior version, manual mode, or simpler model).
- Public communication on same day for citizen-facing models.

---

## 11. Archival

### 11.1 Model archival

- Retired models archived with: weights, AIBOM, training data summary, evaluation history, charter history, decision logs, transparency reports.
- Archival under sovereign control with multi-decade retention for accountability.
- Archived models accessible to AI Authority, Algorithmic Ombudsman, Auditor General's Algorithmic Office, courts under proper authority.

### 11.2 Decision log archival

- Decisions made by retired models retained per data retention rules of the affected domain.
- Audit trails preserved for the full statutory period (typically 7+ years for sensitive domains).

---

## 12. Federated training mechanics

### 12.1 Treaty instruments

- Bilateral or multilateral agreements defining the consortium.
- Scope: which models, which use cases.
- Duration and renewal.
- Exit: any sovereign may exit; exit transitions ongoing training; consortium continues with remaining sovereigns.
- Sovereignty: consortium does not bind any sovereign to deploy resulting models.

### 12.2 Aggregation infrastructure

- Sovereign-controlled aggregator (rotated between sovereigns or hosted by neutral body).
- Secure aggregation protocols protecting individual sovereign contributions.
- Differential privacy on shared updates.
- No raw data crosses sovereign boundaries.

### 12.3 Verification

- Each sovereign can verify aggregator behavior.
- Cryptographic attestation of aggregation correctness.
- Periodic third-party audits.

### 12.4 Sovereign extensions

- Each sovereign may fine-tune the resulting consortium model on its own data for sovereign-private use.
- Sovereign-private fine-tunes are not subject to disclosure.
- Only the consortium base model is shared.

---

## 13. Frontier partnership terms (Tier 3)

When sovereigns contract for frontier model access:

### 13.1 Required terms

- **Zero retention**: no sovereign data retained by the partner beyond the request lifecycle.
- **Sovereign data residency**: inference happens in sovereign region or under sovereign-acceptable terms.
- **Audit rights**: sovereign auditor may inspect partner's compliance.
- **Coercion-resistance clauses**: partner attests to no foreign government data demands honored without sovereign court order.
- **Service continuity guarantees**: notice periods on changes; SLA on availability.
- **Exit transition**: documented exit with assistance for migration to alternative tier.
- **Independent security review**: of partner infrastructure handling sovereign data.

### 13.2 Terms not accepted

- Telemetry of any kind.
- Use of sovereign data for partner's training (without explicit, narrow, paid consent).
- Foreign-jurisdiction binding without escape clauses.
- Contracts without sovereign exit.

### 13.3 Tier 3 governance

- Approved providers list maintained by AI Authority.
- Annual review of provider compliance.
- Provider classification updates trigger re-review.

---

## 14. Sovereign LLM gateway

A single egress point for all model calls in a sovereign deployment.

### 14.1 Functions

- Routing: choose tier (1, 2, 3) per call based on policy, cost, sovereignty, latency.
- Authentication: every call authenticated and authorized.
- Audit: every call logged with sufficient detail for review.
- Rate limiting: per-charter and per-tenant.
- Budget enforcement: per-charter compute and money budgets.
- Filtering: input/output guardrails per Companion 10 §4.
- Telemetry: aggregate metrics for monitoring and reporting.

### 14.2 Discipline

- No model call bypasses the gateway.
- Gateway is sovereign-controlled.
- Gateway is observable, auditable, replaceable.

---

## 15. Multi-agent ecosystem governance

By 2035, the platform routinely runs many agents simultaneously. Governance:

### 15.1 Agent registry

- Every active agent registered with charter and principal.
- Agent identity attested and verifiable.
- Agent-to-agent communications explicit and audited.

### 15.2 Inter-agent protocols

- Agents acting on behalf of citizens or businesses identify themselves to counterparts ("I am acting on behalf of X under Charter Y").
- Inter-agent protocols are explicit, declared, and audited.
- No covert coordination channels.

### 15.3 Emergent behavior monitoring

- Continuous statistical analysis for unintended coordination, gaming, or collusion.
- Findings reported to AI Authority and Algorithmic Ombudsman.
- Multi-agent kill switch: ability to pause an entire agent class at once.

---

## 16. Forbidden in any sovereign LLM tier

No sovereign LLM in any tier may:

- Generate impersonating content (officials, citizens).
- Generate political content for electoral influence.
- Process biometric or genomic data without separate strict regime.
- Make individual prediction on rights-affecting matters.
- Operate without a registered charter for Class B+ deployment.
- Operate without continuous evaluation for Class C+.
- Operate without a kill switch for Class C+.
- Operate beyond its charter scope.
- Deploy without AIBOM publication.
- Deploy without sovereign keys for signing.

This list grows; it does not shrink.

---

## 17. The sovereign LLM north star

Sovereign LLMs are infrastructure, not magic. They are the natural-language interface to the platform's capabilities. They make services accessible across languages, modalities, and literacies. They support officers; they do not replace judgment. They serve citizens; they do not surveil them.

Sovereignty in AI is not autarky. It is the ability to deploy capable models on sovereign terms, to evaluate and govern them through sovereign institutions, to retire them when they fail standards, and to replace them when better alternatives emerge — all without depending on any single foreign actor.

The discipline is daily. The evaluation is continuous. The governance is constitutional. The replacement is real.

When a sovereign loses any of these about its models, it has lost sovereignty over a critical capability of its state — and must take it back, even at the cost of capability. Capability without sovereignty is not progress.
