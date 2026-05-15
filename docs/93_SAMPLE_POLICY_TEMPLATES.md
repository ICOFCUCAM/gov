# CivicOS — Sample Policy Templates (Companion 93)

This companion provides illustrative policy templates that implementing teams can adapt. It complements Companion 44 (implementation cookbook), Companion 27 (constitutional integration), Companion 10 (charter mechanics), and Companion 86 (foundation operating model) by being concrete: what a charter actually looks like, what an FOI policy looks like, what a contract clause looks like.

The thesis: **abstraction without illustration produces theatre, not implementation**. Implementing teams need concrete templates to start from. These templates are illustrative, not prescriptive — they should be adapted to local legal, cultural, and operational context. They are offered to reduce the cost of starting the work.

The discipline: templates are starting points, not finished products; local adaptation essential; legal counsel required; community engagement before adoption; independent review where applicable; templates reflect the corpus's commitments.

---

## 1. Sample charter for AI capability

```yaml
charter:
  id: "C-2030-CIVICCARE-WELFARE-RECOMPUTE-v1"
  title: "Welfare Eligibility Recomputation on Income Change"
  decision_class: C
  principal: "Minister of Inclusion / Department of Social Protection"
  signing_authority:
    primary: "Minister of Inclusion"
    secondary: "AI Authority Head"
    counter_sign: "Algorithmic Ombudsman"
    quorum_for_modifications: 2 of 3

  purpose: |
    To automatically recompute welfare benefit eligibility when a beneficiary's
    declared income changes, based on verified data sources, ensuring continuous
    accuracy of benefits without unnecessary manual review of routine changes,
    while preserving citizen rights to appeal and reversibility.

  scope:
    program_id: "PROG-CHILD-GRANT, PROG-DISABILITY-GRANT, PROG-OLD-AGE-GRANT"
    eligible_actions:
      - "recompute_eligibility_from_verified_income_change"
      - "adjust_disbursement_amount_within_program_rules"
      - "issue_explanatory_notification_to_beneficiary"
    excluded_actions:
      - "terminate_benefit_entirely"
      - "refer_to_fraud_investigation"
      - "deny_appeal"
      - "modify_eligibility_predicate"

  budget:
    compute_units_per_month: 5e9
    decisions_per_day_max: 200000
    money_movement_authority: 0  # may not move money directly; instructs CivicPay
    side_effects_per_decision:
      - "wallet_notification_to_beneficiary"
      - "audit_emit"
      - "disbursement_instruction_to_civicpay"

  reversibility:
    window_days: 30
    appeal_path:
      first_level: "Caseworker review (any reason, no documentation required)"
      second_level: "Inclusion Ombudsperson"
      third_level: "Administrative court"
    full_state_restoration: true
    back_pay_on_reversal: true
    no_penalty_for_reversal: true

  human_review_triggers:
    - "decision_changes_amount_by_more_than_15_pct"
    - "third_change_within_90_days"
    - "complaint_lodged_by_beneficiary"
    - "ombudsman_request"
    - "pattern_anomaly_flagged_by_monitoring"
    - "vulnerable_population_flag_set"

  evaluation_gates:
    pre_deployment:
      - "fairness_across_demographic_slices_within_2_pct"
      - "agreement_with_sampled_human_recompute_above_98_pct"
      - "no_systematic_bias_against_protected_group"
      - "robustness_to_data_quality_variations"
    continuous:
      - "monthly_stratified_evaluation"
      - "quarterly_human_review_sampling"
      - "annual_independent_audit"

  kill_switch:
    actors: ["Minister of Inclusion", "AI Authority Head", "Sovereign Trust Officer"]
    quorum: 2
    effect: "freeze_capability; queue_all_in_flight_decisions_for_human_review"
    test_cadence: "quarterly"

  audit:
    emitter: "all_state_changes"
    retention_years: 10
    public_aggregate_report_cadence: "monthly"
    algorithmic_ombudsman_access: "standing"

  version: 1
  prior_versions: []
  changelog: |
    v1: Initial charter for welfare eligibility recomputation.

  consultation:
    citizens_assembly_review: "completed_2030-01-15"
    civil_society_consultation: "completed_2030-02-01"
    inclusion_ministry_review: "completed_2030-02-10"

  sunset:
    expires: "2033-12-31"
    review_deadline: "2033-06-30"
    renewal_requirements: "re-evaluation, re-consultation, re-attestation"
```

This is a starting template. Adapt to local context.

---

## 2. Sample standing authority (parliamentary instrument)

```yaml
standing_authority:
  id: "SA-2032-ADAPTIVE-WELFARE-DISBURSEMENT"
  enacting_instrument: "Welfare Adequacy Act 2032, Section 18"
  title: "Adaptive Welfare Disbursement Authority"

  scope:
    domains: ["welfare_eligibility_recomputation", "disbursement_adjustment_within_published_rules"]
    populations: ["all_welfare_beneficiaries"]

  bands:
    max_individual_change_per_month: "20_pct_of_baseline"
    max_aggregate_program_variation: "10_pct_of_appropriation"
    reversal_required_within_days: 30

  reporting:
    parliament_cadence: "quarterly"
    public_dashboard: true
    citizens_assembly_review: "annual"

  revocation:
    method: "parliamentary_resolution"
    immediate_effect_on_revocation: true
    transition_support: "available"

  expires: "2035-06-30"
  renewable: true
  renewal_requirements: "parliamentary_review_and_resolution"
```

---

## 3. Sample FOI policy

```markdown
# Freedom of Information Policy

## Purpose

This policy implements [citizens'] right to access information held by the state
under [Constitutional Article X / FOI Act Section Y].

## Coverage

This policy applies to:
- All ministry and agency records.
- Records held by contractors performing public functions.
- Datasets generated through public funding.

This policy excludes (with narrow interpretation of exemptions):
- Records subject to lawful classification (national security, etc.).
- Personal information of third parties (per data protection law).
- Commercial information under confidentiality agreements.
- Records subject to attorney-client privilege.

## Process

### Submission
- Online portal accessible (URL).
- In-person submission at any government office.
- Mail submission to designated address.
- Multilingual.
- Accessible per Companion 46.
- No fee for routine requests.

### Acknowledgment
- Within 5 business days.
- Reference number provided.

### Response
- Within 30 calendar days for routine requests.
- Within 60 calendar days for complex requests.
- Extensions require written justification.

### Format
- Records provided in usable electronic format where possible.
- Plain language explanation included.
- Accessible formats on request.

### Denial
- Written rationale required.
- Specific exemption cited.
- Appeals path explained.
- Contact for questions provided.

## Appeals
- First level: Information Commissioner.
- Second level: Administrative court.
- Free or low-cost.
- Time-bounded.

## Logging
- All requests logged (anonymized).
- Aggregate statistics published quarterly.
- Public log of denials with rationale (anonymized).

## Anti-pretextual-denial
- Independent review of denial patterns.
- Algorithmic Ombudsman scrutiny if AI used in decisions.
- Civil society engagement.

## Forbidden
- Pretextual denial of routine requests.
- Charging fees that exclude.
- Bureaucratic delay as denial.
- Discrimination in processing.
- Algorithmic FOI processing absent human judgment.
```

---

## 4. Sample contract clause: vendor coercion-resistance

```
SECTION X: Coercion-Resistance and Sovereign Cooperation

X.1 Vendor's Commitments

Vendor commits, throughout the term of this Contract, to:

(a) Refuse any request from any government other than [Sovereign Customer] for
    access to data or systems related to this Contract, unless such request is
    accompanied by a court order issued by a court within [Sovereign Customer's]
    jurisdiction.

(b) Disclose to [Sovereign Customer's Sovereign Trust Officer] within 30 days
    any attempt by any third party to compel access to data or systems related
    to this Contract.

(c) Not include in any product, service, or component delivered under this
    Contract any backdoor, hidden access mechanism, undisclosed telemetry, or
    other capability that would compromise [Sovereign Customer's] sovereign
    control of the systems.

(d) Cooperate in good faith with [Sovereign Customer's] annual sovereignty
    audit, including providing documentation and personnel as reasonably
    required.

(e) Notify [Sovereign Customer] immediately of any change in [Vendor's] home
    jurisdiction or ownership that could affect [Vendor's] ability to honor
    these commitments.

X.2 Source Escrow

[Vendor] shall deposit, within 60 days of contract execution, source code and
build documentation for all sovereign-critical components with [Sovereign-
Designated Escrow Agent], to be released to [Sovereign Customer] upon any of
the following triggers:

(a) [Vendor's] insolvency or business cessation.
(b) [Vendor's] failure to honor X.1(a) above.
(c) [Vendor's] material breach of this Contract uncured after notice.
(d) Other triggers as set forth in Schedule X.

X.3 Penalties for Breach

Breach of X.1 shall constitute material breach. Penalties include:
(a) Termination for cause.
(b) Liquidated damages of [amount].
(c) Public disclosure of breach.
(d) Disqualification from future [Sovereign Customer] contracts for [period].

X.4 Sovereign Exit Support

Upon [Sovereign Customer's] notice of intent to exit:
(a) [Vendor] shall provide all data in documented portable formats within
    [period].
(b) [Vendor] shall transfer [Sovereign Customer's] sovereign keys (if any
    remained with [Vendor]) immediately.
(c) [Vendor] shall provide knowledge transfer to [Sovereign Customer's]
    designated successor for [period].
(d) [Vendor] shall not impede or charge punitive fees for exit.

X.5 No-Coercion Attestation

[Vendor] attests that, to the best of its knowledge, no foreign government has
required or requested it to compromise the integrity of this Contract or the
[Sovereign Customer's] sovereignty in connection with it. [Vendor] shall update
this attestation annually.
```

---

## 5. Sample policy: anti-discrimination in algorithmic decisions

```markdown
# Algorithmic Decision Anti-Discrimination Policy

## Purpose

To ensure algorithmic decisions made by or on behalf of [Government Body] do not
discriminate against any person based on protected characteristics.

## Coverage

This policy applies to all algorithmic decisions affecting individual citizens
or entities, including:
- Class B (advisory) decisions.
- Class C (conditional automation) decisions.
- Embedded algorithmic decisions in software.

## Protected characteristics

Per [applicable anti-discrimination law], including (without limitation):
- Race, ethnicity, color, national origin.
- Religion or belief.
- Sex, gender, gender identity, sexual orientation.
- Disability.
- Age.
- Family status.
- Indigenous status.
- Political opinion.
- Other characteristics protected by [applicable law].

## Mandatory pre-deployment evaluation

Before any Class B+ algorithmic decision capability deploys:

1. Stratified outcome analysis across protected characteristics.
2. Disparate impact assessment.
3. False positive/negative rates by group.
4. Calibration assessment by group.
5. Independent review of methodology.
6. Public consultation period for high-stakes capabilities.

## Continuous monitoring

After deployment:

1. Monthly stratified evaluation.
2. Citizen complaint pattern analysis.
3. Algorithmic Ombudsman quarterly review.
4. Annual independent audit.

## Findings response

If discrimination is found:

1. Capability paused.
2. Investigation by Algorithmic Ombudsman.
3. Remediation plan with deadlines.
4. Affected citizens notified and remedied.
5. Lessons fed back into model and process.

## Appeal rights

Citizens affected by algorithmic decisions have:

1. Right to know the decision and basis.
2. Right to plain-language rationale.
3. Right to human review.
4. Right to appeal.
5. Right to remediation if discrimination found.

## Forbidden

- Algorithmic decisions discriminating based on protected characteristics.
- Use of proxies for protected characteristics to evade prohibition.
- Refusal to investigate complaints.
- Retaliation against complainants or whistleblowers.
- Suppression of evidence of discrimination.
```

---

## 6. Sample whistleblower policy

```markdown
# Whistleblower Protection Policy

## Purpose

To enable safe disclosure of suspected wrongdoing in [Organization] and to
protect those who disclose from retaliation.

## Coverage

Anyone — employees, contractors, vendors, citizens, civil society — who in good
faith discloses suspected:
- Corruption or fraud.
- Violations of law or policy.
- Algorithmic discrimination.
- Sovereignty compromise.
- Civil rights violations.
- Health, safety, or environmental hazards.
- Other significant wrongdoing.

## Channels

### Cryptographically anonymous channel (preferred)

- Onion-routed submission system at [URL].
- Two-key encryption (submission encrypted to investigator key).
- Reply channel through onion routing if submitter chooses.
- No metadata logging.

### Independent intermediary channel

- Accredited civil society organizations as intermediaries:
  - [List].
- Submitter anonymity preserved.

### Designated official channel

- Inspector General office at [contact].
- Direct submission with confidentiality protection.

### External channel

- Algorithmic Ombudsman, DPA, Auditor General as appropriate.

## Confidentiality

- Whistleblower identity protected by all reasonable means.
- Anonymous submissions cannot be traced through platform design.
- Disclosure of whistleblower identity prohibited absent legal compulsion (which
  itself triggers protective response).

## Anti-retaliation

Retaliation against any whistleblower is prohibited. Retaliation includes:
- Termination, demotion, or adverse action.
- Harassment.
- Discriminatory treatment.
- Surveillance.
- Threats.
- Discriminatory subsequent treatment.

Reverse burden of proof in retaliation claims (per applicable law).

## Material support

Whistleblowers may receive:
- Legal aid.
- Employment protection.
- Compensation for legitimate losses.
- Relocation if needed.
- Where appropriate and lawful, financial reward.

## Investigation

- Reports investigated promptly.
- Disposition reported back to whistleblower (through anonymous channel where
  applicable).
- Aggregate outcomes published quarterly (anonymized).

## Forbidden

- Retaliation in any form.
- Identification of anonymous whistleblowers.
- Pressure on whistleblowers to disclose more than they choose.
- Use of whistleblower disclosures for unrelated purposes.
- Settlement that suppresses information without independent review.
```

---

## 7. Sample policy: civil society standing access

```markdown
# Civil Society Standing Access Policy

## Purpose

To provide accredited civil society organizations with structural access to
[Government Body's] platform telemetry and deliberations, supporting accountability.

## Eligible organizations

Civil society organizations operating in [jurisdiction] for at least [period],
with documented mission relevant to [Government Body's] domain, registered and in
good standing.

Application and accreditation through [Civil Society Council Secretariat].

## Access provided

### Telemetry access

Aggregate (privacy-preserving):
- Service delivery metrics.
- Outcome indicators.
- Algorithmic decision aggregate statistics.
- Citizen complaint patterns.

Specific (per legitimate purpose):
- Anonymized incident logs.
- Algorithmic Ombudsman finding details.
- Public dashboards in deeper detail.

### Deliberation access

- Notice of major capability changes.
- Comment period participation.
- Civil Society Council seat (per Council process).
- Algorithmic Ombudsman regular briefings.
- Sovereign Trust Officer annual sovereignty audit briefings.

### Capacity building

- Training on platform operations.
- Technical support for engagement.
- Access to plain-language summaries.
- Translation support for engagement.

## Conditions

Civil society organizations using standing access:
- Maintain confidentiality of any personal data accessed.
- Use access only for accountability and advocacy purposes.
- Disclose conflicts of interest.
- Do not commercialize access.

## Anti-cooptation

- Standing access does not require policy alignment.
- Civil society organizations remain independent.
- Access cannot be withdrawn for unpopular but lawful advocacy.
- Discrimination among civil society organizations forbidden.

## Forbidden

- Surveillance of civil society organizations through standing access.
- Discrimination in accreditation.
- Use of accreditation to coopt civil society.
- Retaliation against civil society organizations using access.
```

---

## 8. Sample policy: data portability

```markdown
# Citizen Data Portability Policy

## Purpose

To enable citizens to obtain and transfer their personal data held by
[Government Body] in usable formats.

## Right

Citizens have the right to:
- Obtain a copy of all personal data held about them.
- Receive it in standardized portable formats.
- Transfer it to another wallet implementation, service, or recipient of their
  choice.
- Have it deleted (within statutory limits).

## Process

### Request

- Through Civic Wallet ("download my data" function).
- Through web portal.
- In person at [office].
- Multilingual.
- Accessible per Companion 46.
- No fee.

### Response

- Within 14 days for routine requests.
- Within 30 days for complex requests.
- Format: standard portable formats (JSON, CSV with documentation).
- Plain language explanation.

### Verification

- Identity verified through CivicID L3+ authentication.
- Anti-impersonation safeguards.

### Transfer

- Citizen designates recipient.
- Cryptographic verification of transfer.
- Audit log of transfer.

## Format

Standard format includes:
- Identity attributes.
- Service interaction history.
- Decisions affecting citizen.
- Documents.
- Consents.
- Other personal data.

Format documented at [URL].

## Forbidden

- Charging fees that exclude.
- Bureaucratic delay.
- Withholding data accessible to citizen.
- Use of portability requests for adverse decisions.
- Discrimination in processing.
```

---

## 9. Sample policy: AI vendor evaluation criteria

```markdown
# AI Vendor Evaluation Criteria

## Mandatory disclosures

Vendors bidding for AI contracts above [threshold] must disclose:

1. **AIBOM**: Complete AI Bill of Materials per Companion 10 §9.
2. **Provenance**: Training data sources at category level; consent basis.
3. **Evaluation**: Recent evaluation results across demographic slices.
4. **Bias auditing**: Methodology and findings.
5. **Hallucination rate**: Measured and reported.
6. **Refusal calibration**: Documented.
7. **Charter capability**: Vendor's experience operating under platform charter mechanics.
8. **Open weights**: Whether weights are open or proprietary.
9. **Sovereign hosting**: Capability for sovereign deployment.
10. **Coercion-resistance**: Attestations per Section 4 above.

## Evaluation criteria

Bids evaluated on:

| Criterion | Weight |
|---|---|
| Technical capability | 25% |
| AIBOM completeness | 10% |
| Bias auditing rigor | 15% |
| Sovereign deployment capability | 15% |
| Coercion-resistance | 10% |
| Open weights bonus | 10% |
| Cost (within reasonable range) | 10% |
| Vendor sustainability | 5% |

## Disqualifications

Vendors disqualified if:

- Refuse AIBOM disclosure.
- Documented pattern of building forbidden capabilities (per Companion 43 §4).
- Disqualifying corruption findings.
- Coercion-resistance failures documented.
- Incompatible with platform commitments.

## Forbidden

- Procurement structured to favor specific vendors.
- Award without published rationale.
- Skipping AI-specific evaluation criteria.
- Acceptance of vendor marketing claims without verification.
```

---

## 10. Sample policy: indigenous community engagement

```markdown
# Indigenous Community Engagement Policy

## Purpose

To engage indigenous communities affected by [Government Body's] platform
deployment with respect, free prior and informed consent (FPIC), and recognition
of community sovereignty.

## Principles

- FPIC for any deployment affecting indigenous communities.
- Communities lead in process and pace.
- Cultural and linguistic appropriateness.
- Anti-extraction.
- Reparative posture for past harms.

## Process

### Initial engagement

- Approach through community elder council or designated representatives.
- Explain proposal in plain language and community languages.
- No pressure to participate immediately.
- Provide time for community deliberation.

### Community deliberation

- Community-led process at community pace.
- Independent advice available to community.
- Information packet in community languages.
- Multiple deliberation sessions.

### Negotiation

- Community concerns addressed.
- Process modifications negotiated.
- Co-stewardship arrangements designed.
- Sacred site protections.
- Anti-displacement guarantees.

### Implementation

- Community sign-off required before implementation.
- Continuous community engagement.
- Veto rights preserved.
- Reversibility maintained.

## Anti-extraction

- No commercial use of community data.
- Traditional knowledge protections (CARE principles).
- Benefit-sharing where applicable.
- Community-stewarded data.

## Reparative posture

- Acknowledgment of past harms.
- Restitution where appropriate.
- Anti-recurrence safeguards.
- Long-term commitment.

## Forbidden

- Engagement absent FPIC.
- Time pressure precluding deliberation.
- Side deals with community members bypassing community process.
- Cooptation of community leaders.
- Commercial exploitation of community knowledge.
- Surveillance through community engagement.
```

---

## 11. The templates north star

Templates are starting points. They reduce the cost of beginning the work. They are not finished products and should not be adopted unmodified. Local legal, cultural, and operational context requires adaptation. Legal counsel is required. Community engagement is essential. Independent review is wise.

These templates reflect the corpus's commitments. If your local adaptation moves significantly away from these commitments, that's worth examining honestly — either the local context genuinely requires divergence, or the adaptation is moving toward problems the corpus warns against.

The templates will evolve. Future versions will incorporate lessons learned. They are offered to support implementing teams who do the actual work.

If you adapt these templates, share what you learn. The corpus benefits from real-world application. Future implementing teams will benefit from your adaptations.

The work is sometimes unglamorous template adaptation. It is also where the corpus's commitments become real in operational practice. Templates that work, adapted with care, save citizens significant harm and serve them significant value.

Adapt with care. Implement with discipline. Share what you learn.
