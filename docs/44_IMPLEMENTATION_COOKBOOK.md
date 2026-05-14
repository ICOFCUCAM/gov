# CivicOS — Implementation Cookbook (Companion 44)

This companion is a practical recipe book for implementation teams. It collects concrete patterns, code-style snippets, configuration shapes, deployment recipes, and operational checklists that recur across CivicOS deployments. It complements the more conceptual companions by being the document an engineer or program manager keeps open while doing the work.

Patterns here are illustrative. Real deployments adapt to local context. The discipline is to follow the *intent* (sovereignty, contestability, inclusion, etc.) rather than the literal recipe.

---

## 1. How to bootstrap a new tenant

Recipe for standing up a tenant (e.g., a new ministry on the platform):

1. **Define tenant scope**: what ministry/agency, which modules, which user populations.
2. **Provision tenant in kernel**: tenant ID, KMS scope, authorization roles.
3. **Establish governance**: tenant owner, technical lead, security lead, accessibility lead.
4. **Create CivicBus services declarations**: which services tenant produces, which it consumes.
5. **Sign data sharing instruments**: per cross-tenant flow.
6. **Configure module instances**: each module chosen, version locked.
7. **Configure officer roles**: RBAC/ABAC role definitions.
8. **Onboard officers**: identity, training, certification.
9. **Pilot phase**: small region or sub-unit, shadow then active.
10. **Active phase**: full tenant operation with quarterly review.

Anti-patterns to avoid:
- Skipping pilot phase (Companion 26 §1).
- Excessive role complexity (right-size).
- Missing accessibility audit gate.

---

## 2. How to enroll citizens at scale

Recipe for an enrollment campaign reaching millions:

1. **Plan coverage**: target population, geographic distribution, vulnerable population mapping.
2. **Provision enrollment infrastructure**: registrar offices, mobile units, off-grid kits, agent network.
3. **Train registrars**: identity assurance, biometric capture, no-biometrics path, vulnerable population sensitivity.
4. **Provision provisional credentials**: for those without supporting documents.
5. **Establish appeals**: for enrollment denials, with quick resolution.
6. **Run campaign**: phased; with public communication; in all national languages.
7. **Monitor inclusion KPI**: exclusion error rate; remediation when above threshold.
8. **Sustain**: enrollment is continuous, not one-shot; new births, immigrants, edge cases.

Critical safeguards:
- Inclusion floor preserved.
- No-biometrics path always available.
- Witness attestation for those without documents.
- Registrar conduct monitored; anti-corruption discipline.

---

## 3. How to deploy a new AI capability

Per Companion 10 §3 and Companion 18:

1. **Define purpose**: what problem; what scope; what decision class.
2. **Source model**: per Tier 1 / 2 / 3 strategy.
3. **Curate data**: rights cleared; bias reviewed; lineage preserved.
4. **Train (if applicable)**: registered with AI Authority; reproducible; signed.
5. **Evaluate**: against suite for target decision class.
6. **Draft charter**: purpose, scope, principal, signing, budget, kill switch, evaluation gates, sunset.
7. **Approve**: per decision class authorities.
8. **AIBOM publication**.
9. **Shadow phase**: 4+ weeks for Class B; 8+ for Class C; compare to current decisions.
10. **Pilot phase**: 12+ weeks, geographically scoped, full reversibility.
11. **Active phase**: with continuous evaluation, sampled human review, citizen complaints monitored.
12. **Sunset planning**: from day one.

Anti-patterns:
- Skipping evaluation gates.
- Class C without reversibility window.
- AIBOM gaps.
- Persuasive design in deployment.

---

## 4. How to write a charter

Recipe for drafting a Class C+ AI capability charter:

```yaml
charter:
  id: "C-YYYY-DOMAIN-PURPOSE-vN"
  title: "Plain-language title"
  decision_class: C  # or D
  principal: "Minister or Authority responsible"
  signing_authority:
    - "Principal"
    - "AI Authority Head"
    - "Algorithmic Ombudsman (counter-sign for citizen-affecting)"
  purpose: |
    What this capability does, in plain language. Why it exists.
  scope:
    eligible_actions: [...]
    excluded_actions: [...]
    domain_constraints: ...
  budget:
    compute_units_per_month: ...
    money_movement_authority: 0  # or specified
    decisions_per_day: ...
    side_effects_per_decision: [...]
  reversibility:
    window_days: 30  # or longer for less consequential
    appeal_path: "Named ombudsperson or process"
    full_state_restoration: true
  human_review_triggers:
    - "decision_changes_amount_by_more_than_X_pct"
    - "complaint_lodged"
    - "ombudsman_request"
    - ...
  evaluation_gates:
    - "fairness_across_demographic_slices_within_X_pct"
    - "agreement_with_sampled_human_decisions_above_X_pct"
    - "no_systematic_bias_against_protected_groups"
  kill_switch:
    actors: ["Principal", "AI Authority Head", "Sovereign Trust Officer"]
    quorum: 2
    effect: "freeze; queue all in-flight decisions for human review"
  audit:
    emitter: "all_state_changes"
    retention_years: ...
    public_aggregate_report_cadence: "monthly"
  sunset:
    expires: "YYYY-MM-DD"
    review_deadline: "YYYY-MM-DD"
  version: N
  prior_versions: [...]
  changelog: |
    What changed and why.
```

Discipline:
- Plain language wherever possible.
- Conservative scope; expand only with re-approval.
- Reversibility window long enough for genuine remedy.
- Human review triggers honest about limitations.
- Sunset reasonable (not 100 years).

---

## 5. How to publish a standard

Per Companion 19 §3:

1. **Idea**: anyone may submit.
2. **Internet-Draft equivalent**: structured proposal with motivation, design, security considerations, plain-language summary.
3. **Working group review**: open mailing list; documented discussions.
4. **Last call**: formal review window (typically 4-8 weeks) with public input.
5. **Standards Body approval**: sign-off and publication.
6. **Conformance test suite**: published alongside.
7. **Implementation reports**: implementations document conformance.
8. **Versioning**: semver, with deprecation calendar from day one.
9. **Plain-language summary**: reviewed by People's Editor for citizen-facing.
10. **Translation**: into all national languages of customer sovereigns.

---

## 6. How to handle a data breach

Per Companion 30 §7:

1. **Detection**: through SOC, citizen report, civil society, or audit.
2. **Containment**: isolate affected systems; preserve forensic evidence.
3. **Communication**: initial within 1 hour to constitutional officers; within 24 hours to affected populations (if known); public communication promptly.
4. **Investigation**: independent technical investigation; root cause analysis.
5. **Remediation**: technical fix; affected citizen support.
6. **Reporting**: to DPA; to Algorithmic Ombudsman if AI-related; to Auditor General; to public within 30 days.
7. **Learning**: post-mortem; system improvement; lessons fed back.
8. **Accountability**: honest; no scapegoating; structural fix prioritized.

Anti-patterns:
- Cover-up.
- Blame the citizen (if their account compromised).
- Slow-walking notification.
- "Lessons learned" without structural change.

---

## 7. How to declare and end an emergency

Per Companion 30:

**Declaration**:
1. Per pre-positioned playbook.
2. Authority defined; evidence documented; scope defined; duration time-bound; communication signed multilingual multi-channel.

**Operations**:
3. War-room mode; cross-ministry coordination; service continuity preserved; vulnerable populations prioritized; communications discipline.

**Civil liberties**:
4. Mass surveillance forbidden; emergency authorities narrow; judicial review within 72h for exigent measures.

**Termination**:
5. Sunset automatic; emergency authorities expire; recovery support for affected citizens; independent inquiry for major emergencies.

**Reporting**:
6. Within 30 days: aggregate transparency report; within 90 days: detailed report; lessons fed back; playbooks updated.

---

## 8. How to plan a sovereign exit drill

Per Companion 20 §7.4:

1. **Define scope**: full national exit, single module, or external dependency.
2. **Schedule**: annually for full national; at least annually for critical dependencies.
3. **Prepare**: assemble exit playbook; verify source escrow; gather data export tools.
4. **Execute (test environment)**: export sample data; validate format; attempt re-import in test environment.
5. **Measure**: end-to-end time; gaps identified; service continuity verified.
6. **Report**: to Sovereign Trust Officer; remediation plan for any gaps; public summary.
7. **Improve**: gaps remediated before next drill.

Failure to drill or drill failure triggers Sovereign Trust Officer investigation.

---

## 9. How to onboard an integrator

Per Companion 19 and Volume I §40:

1. **Application**: integrator applies; KYB on company.
2. **Security review**: of integrator infrastructure and practices.
3. **Privacy review**.
4. **Functional certification**: per category.
5. **Civic Academy training**: required for all engineers working on platform.
6. **Code of conduct sign-off**.
7. **Contract**: with sovereign customer; sovereign exit clauses; no-coercion clauses; data formats documented.
8. **Continuous monitoring**: of installed apps and ongoing work.
9. **Recertification**: periodic.
10. **Suspension**: for material breach.

---

## 10. How to consult a Citizens' Assembly

Per Companion 13 §5:

1. **Define question**: clear, substantive, requiring deliberation.
2. **Sortition**: random selection stratified for representativeness; auditable.
3. **Compensation**: lost wages + per diem; childcare; access support.
4. **Information packet**: balanced expert input; multilingual; accessible.
5. **Facilitation**: independent; trauma-informed; culturally sensitive.
6. **Deliberation**: multi-week; iterative; with expert engagement.
7. **Recommendation**: by structured deliberation; published.
8. **Response**: legislative or executive response within statutory window.
9. **Implementation**: tracked; reported.
10. **Reflection**: lessons for future assemblies.

---

## 11. How to roll out a new module to a country

Per Companion 03 (country playbook):

1. **Pre-engagement**: qualification per Companion 03 §1.1.
2. **Foundational** (Phase 0): identity, payments, data exchange, wallet, trust.
3. **DPI live** (Phase 1): kernel operational; first three modules pilot.
4. **First modules** (Phase 2): tax, welfare, civil registration as wedge.
5. **Service expansion** (Phase 3): health, education, land, procurement.
6. **AI ubiquity** (Phase 4): from year 3+.
7. **Sovereign capability transfer** (Phase 5): year 5-7 handover.

Anti-patterns:
- Big-bang migration (Companion 26 §1).
- Skipping legal architecture.
- Over-reliance on expat consultants.
- Ignoring talent pipeline.
- Election-cycle disruption.

---

## 12. How to run an algorithmic audit

Per Algorithmic Ombudsman authority (Companion 13 §3.1):

1. **Identify capability**: in AI registry.
2. **Inspect AIBOM**: training data summary, model lineage, evaluation history.
3. **Inspect charter**: scope, budget, kill switch, reversibility.
4. **Sample decisions**: random sample stratified for demographic fairness analysis.
5. **Re-evaluate**: against current evaluation suite.
6. **Test for bias**: stratified outcome analysis.
7. **Citizen complaint review**: pattern analysis.
8. **Officer override pattern**: investigate divergences.
9. **Findings**: documented; severity classified.
10. **Action**: pause / amend / sunset / recommend reform.
11. **Public report**: with appropriate redaction.

---

## 13. How to write plain-language content for citizens

Per Companion 12 §11 and People's Editor practice:

1. **Audience**: typical citizen at 7th grade reading level (5th for emergency).
2. **Voice**: clear, calm, direct; no bureaucratese; no jargon without explanation.
3. **Structure**: front-load the action (what citizen needs to do); explain why; give next steps.
4. **Length**: as short as possible; never longer than needed.
5. **Format**: scannable; bulleted where appropriate.
6. **Translation**: by professional translator with native review; not just machine-translated.
7. **Accessibility**: tested with screen reader; plain-text alternative; sign language video for major announcements.
8. **Cultural appropriateness**: review by community representatives.
9. **Comprehension testing**: with citizen panels.
10. **People's Editor sign-off**: for citizen-facing content.

---

## 14. How to design an inclusive service

Per Companion 22 §2.2 and Companion 25:

Universal Service Standard checklist:

- [ ] Accessibility (WCAG 2.2 AA minimum).
- [ ] All national languages at parity.
- [ ] USSD/IVR/agent/walk-in equivalents for essential functions.
- [ ] Voice and screen reader tested.
- [ ] Sign language video for major announcements.
- [ ] Vulnerable population accommodations.
- [ ] Plain language reviewed.
- [ ] Cultural sensitivity reviewed.
- [ ] Time-bounded with published SLAs.
- [ ] Decisions explained in citizen-readable rationale.
- [ ] Appeal paths visible and time-bound.
- [ ] Right to a human at any consequential point.
- [ ] No dark patterns; symmetric opt-in/opt-out.
- [ ] Bias audited across demographic dimensions.

Failure on any element: don't ship.

---

## 15. How to handle a foreign data demand

Per Companion 24 §7.2:

1. **Receive demand**: from foreign authority or vendor pressured by foreign authority.
2. **Verify**: provenance; legal basis claimed.
3. **Refuse**: foreign demands without local court order.
4. **Notify**: Sovereign Trust Officer immediately; legal counsel; affected sovereign agency.
5. **Document**: full record for Audit Vault.
6. **Public**: aggregate reporting (per Companion 24 §13.2).
7. **Diplomatic response**: through foreign ministry where appropriate.
8. **Consequences for vendor**: if vendor pressured, contractual penalties; sovereign exit options activated.
9. **Constitutional officer review**: of pattern.
10. **Adjustment**: if pattern increasing, consider supply chain diversification.

---

## 16. How to budget a CivicOS deployment

Reference cost categories:

- **Capex (build)**: kernel licensing/setup; module licenses; integration; data migration; training; hardware.
- **Opex (run)**: subscription/license; hosting; bandwidth; energy; staff; vendor support; audit.
- **Workforce**: officers (likely largest line); engineers; constitutional officer staffing.
- **Civic Academy**: in-country training capacity.
- **Innovation grants**: civic-tech ecosystem seeding.
- **Multilateral co-financing**: typical 30-50% per Companion 03 §9.

Anti-patterns:
- Capex without sustainable opex.
- Underbudgeting maintenance (Companion 26 §15).
- Underbudgeting talent pipeline.
- Hidden subsidies that distort sustainability.

---

## 17. How to retire a module

Per Companion 20 §6:

1. **Trigger**: usage threshold breached, successor available, mandate fulfilled, etc.
2. **Document**: trigger evidence.
3. **Notify**: affected ministries, integrators, citizens.
4. **Public consultation**: comment period for citizen-facing capabilities.
5. **Migration plan**: tooling, transition support.
6. **Deprecation announcement**: formal date, public publication.
7. **Deprecation period**: 12+ months for active capabilities.
8. **End-of-life**: capability removed; data archived per retention rules.
9. **Post-EOL review**: lessons learned.
10. **Documentation preserved**: for institutional memory.

---

## 18. How to cooperate with a non-CivicOS sovereign

Per Companion 33 §8:

1. **Identify cooperation purpose**: specific scope.
2. **Bilateral protocol**: defined scope, exit, sunset.
3. **Adapter**: at the boundary translating between CivicOS protocols and partner protocols.
4. **Trust bridge**: between trust frameworks.
5. **Audit bridge**: every interaction logged.
6. **Sovereign opt-outs**: preserved on rights matters.
7. **Reciprocity**: where appropriate.
8. **Annual review**: of cooperation continued necessity.
9. **Sovereign exit**: tested.

---

## 19. How to build officer training

Per Companion 28 §10:

Foundational:
- Constitutional fluency (national + CivicOS commitments).
- Ethics and integrity.
- Plain-language communication.
- Cultural awareness.
- Domain expertise.

Contemporary:
- Decision-class governance.
- AI calibration and humility.
- Algorithmic decision review.
- Officer override responsibility.

Future-ready:
- Spatial environments operation (era-dependent).
- Twin navigation.
- Cross-sovereign cooperation.

Continuous:
- Embedded in employment.
- Time allocated, not stolen from off-hours.
- Certification renewable.
- Specialization paths.

---

## 20. How to write a citizen-facing decision rationale

For Class B+ AI-touched decisions (per Companion 10 §6.1, Companion 22 §10):

Required elements:
- The decision itself.
- The basis (rule, evidence, model output).
- The applicable charter ID.
- The reasoning summary in plain language.
- The reasoning trace available on request (machine-readable).
- The reversibility window and how to invoke.
- The appeal path with timeline.
- The contact for questions.

Discipline:
- Plain language.
- No jargon.
- Honest about uncertainty.
- Apology if state error.
- Links to recourse.

Anti-patterns:
- "The algorithm decided."
- Reference numbers without context.
- Threats or intimidation.
- Burden of proof inversion.

---

## 21. How to host a public deliberation forum

For policy consultation (per Companion 13 §5 and Vol II §2.4):

1. **Define question**: clear, scoped.
2. **Information packet**: balanced; multilingual; accessible.
3. **Inclusion**: vulnerable populations actively reached.
4. **Spatial environment** (post-2040): or web/in-person hybrid.
5. **Facilitation**: independent.
6. **Cryptographic participation receipts**: confirm without identifying.
7. **AI-summarized deliberation**: for legislators (with clear AI disclosure).
8. **Verifiable participation rates by demographic**.
9. **Response from authorities**: within statutory window.
10. **Follow-through tracking**: published.

---

## 22. How to register a charter sunset

When an AI capability charter sunsets:

1. **Sunset trigger**: charter expiry per registry.
2. **Decision**: renew, amend, or sunset.
3. **If sunset**: announcement; deprecation plan; affected citizens notified.
4. **Wind-down period**: typically months for complex.
5. **Final shutdown**: capability removed from production.
6. **Decision archive**: all decisions made under charter retained per retention rules.
7. **Model archive**: per Companion 18 §11.
8. **Lessons documented**.
9. **Charter Registrar updated**.
10. **Public report**.

---

## 23. How to run an annual sovereignty audit

Per Sovereign Trust Officer mandate (Companion 13 §3.2):

1. **Scope**: all seven invariants.
2. **Evidence collection**: from constitutional officers, ministries, civil society, technical audit.
3. **Each invariant assessed**: holding / strengthening / weakening / breached.
4. **Findings published**: with recommendations.
5. **Standing Question answered publicly**: "Are the seven invariants holding?"
6. **Recommendations actioned**: tracked through following year.
7. **Follow-up audit**: prior year recommendations status.

---

## 24. How to publish an annual transparency report

Per Foundation and Inc. commitments:

Required elements:
- Operational metrics (uptime, capacity).
- Service delivery metrics (cases handled, citizen satisfaction).
- Financial metrics (revenue, costs, transparently reported).
- AI governance (capabilities deployed, decisions made, complaints, evaluations).
- Civil liberties metrics (privacy compliance, security incidents, surveillance use).
- Anti-corruption metrics (procurement integrity, whistleblower channel use).
- Inclusion metrics.
- Cross-sovereign cooperation.
- Failures and lessons.
- Forward agenda.

Publish in plain language; multilingual; accessible.

---

## 25. The discipline summary

Across every recipe in this book, the discipline is:

- Sovereignty preserved.
- Contestability built in.
- Auditability automatic.
- Inclusion floor honored.
- Invariants reaffirmed.
- Failures acknowledged honestly.
- Citizens served as principals.

If a recipe ever appears to compromise these, it's wrong, and the recipe must be reformed before deployment. Capability without discipline is hazard. The cookbook serves the discipline; the discipline serves the people.

---

This is the work. Recipes evolve as the platform evolves; the discipline persists.
