# CivicOS — Developer Onboarding Guide (Companion 84)

This companion is a practical onboarding guide for engineers, designers, integrators, and civic-tech builders new to CivicOS. It complements Companion 19 (open standards), Companion 44 (implementation cookbook), and Companion 28 (officers' field guide) by being specifically for the technical audience that will build on, operate, and extend the platform.

The thesis: **the platform succeeds or fails in the hands of engineers who carry its discipline daily**. Architecture documents and governance frameworks only matter if engineering teams understand them, internalize them, and bring them to bear in practice. This guide helps new developers — whether at sovereign customer organizations, integrator firms, civic-tech startups, or civil society — get oriented to the platform's principles, structure, and operational discipline.

The discipline: principles before patterns; security and privacy by design; accessibility from day one; multilingual baseline; constitutional officers as reviewers; honest documentation; sustainable practice; respect for civil society and citizens.

---

## 1. Welcome — what kind of engineer CivicOS asks you to be

You are joining work on infrastructure that serves citizens across decades. The work is serious. The standards are high. The audience includes your future self and engineers who will inherit your code.

You are asked to be:

- **Principled**. Understand the seven invariants and the forbidden list. They constrain decisions you'll make every day.
- **Disciplined**. Tests, documentation, plain language, accessibility, security, privacy — not optional.
- **Curious**. Engage with the broader corpus. Understand why decisions were made before changing them.
- **Honest**. Tell the truth about failures. Document trade-offs. Leave clear ADRs.
- **Patient**. Multi-decade systems require patience with legacy, with sustainability, with the slow work of governance.
- **Respectful**. Of users (especially the most vulnerable). Of officers. Of constitutional officers. Of civil society. Of indigenous communities and their sovereignty.
- **Sovereign-respecting**. Sovereign customers' choices matter. The platform serves their citizens, not your preferences.

If this work calls to you, welcome. If it doesn't, that's honest too.

---

## 2. Reading order for new engineers

### 2.1 First week

- This guide (Companion 84).
- [`docs/43_WHAT_CIVICOS_IS.md`](./43_WHAT_CIVICOS_IS.md) — synthesis.
- Volume II Part 0 — the seven invariants.
- [`docs/45_PHILOSOPHICAL_FOUNDATIONS.md`](./45_PHILOSOPHICAL_FOUNDATIONS.md) — why these commitments.
- Master Blueprint §1–10 — overview through identity.
- [`docs/29_CITIZENS_FIELD_GUIDE.md`](./29_CITIZENS_FIELD_GUIDE.md) — what we owe citizens.

### 2.2 First month

- [`docs/01_REFERENCE_ARCHITECTURE.md`](./01_REFERENCE_ARCHITECTURE.md) — architecture views.
- [`docs/04_MODULE_CATALOG.md`](./04_MODULE_CATALOG.md) — module landscape.
- [`docs/07_DATA_DICTIONARY_AND_INTEROP.md`](./07_DATA_DICTIONARY_AND_INTEROP.md) — schemas and identifiers.
- [`docs/19_OPEN_STANDARDS_AND_CONTRIBUTION.md`](./19_OPEN_STANDARDS_AND_CONTRIBUTION.md) — standards and contribution.
- [`docs/02_THREAT_MODEL.md`](./02_THREAT_MODEL.md) — what we defend against.
- [`docs/05_SLO_AND_DR_CATALOG.md`](./05_SLO_AND_DR_CATALOG.md) — service tier obligations.
- The module(s) you'll be working on, in depth.

### 2.3 First quarter

- [`docs/16_CIVILIZATIONAL_RISK_REGISTER.md`](./16_CIVILIZATIONAL_RISK_REGISTER.md) — risks at scale.
- [`docs/26_FAILURE_CASE_STUDIES.md`](./26_FAILURE_CASE_STUDIES.md) — historical patterns to avoid.
- [`docs/10_AI_MATURITY_AND_SAFETY.md`](./10_AI_MATURITY_AND_SAFETY.md) — if working with AI.
- [`docs/18_SOVEREIGN_LLM_LIFECYCLE.md`](./18_SOVEREIGN_LLM_LIFECYCLE.md) — if working with LLMs.
- [`docs/22_DIGNITY_AND_RIGHTS_OPERATIONALIZATION.md`](./22_DIGNITY_AND_RIGHTS_OPERATIONALIZATION.md) — UX standards.
- [`docs/46_DISABILITY_AND_ACCESSIBILITY.md`](./46_DISABILITY_AND_ACCESSIBILITY.md) — accessibility discipline.
- [`docs/25_MULTILINGUAL_AND_CULTURAL.md`](./25_MULTILINGUAL_AND_CULTURAL.md) — multilingual discipline.

### 2.4 Ongoing

- [`docs/57_INDEX_AND_CONCORDANCE.md`](./57_INDEX_AND_CONCORDANCE.md) — find topics across the corpus.
- [`docs/42_GLOSSARY.md`](./42_GLOSSARY.md) — terminology.
- [`docs/44_IMPLEMENTATION_COOKBOOK.md`](./44_IMPLEMENTATION_COOKBOOK.md) — practical recipes.
- [`docs/58_LIMITATIONS_AND_HUMILITY.md`](./58_LIMITATIONS_AND_HUMILITY.md) — what the corpus doesn't solve.

---

## 3. Setup

### 3.1 Development environment

- Civic Studio (IDE plugin and scaffolding).
- Sovereign-acceptable hosting for development (no foreign-jurisdiction-only data exposure).
- Sample data only (synthetic, never real citizen data in dev).
- Local kernel mock for development.

### 3.2 Repositories

Per Companion 19 §4:

- `kernel/*` — open-source kernel components.
- `civicos-spec` — protocols, schemas.
- `civicos-deploy` — Helm charts, GitOps configs.
- `civicos-policy` — OPA/Rego, Cedar policies.
- Module-specific repositories.

### 3.3 Tooling

- Standard CI/CD with Sigstore signing.
- SBOM generation per build.
- AIBOM if AI components.
- Reproducible builds for kernel components.
- Accessibility CI (axe-class).
- Security scanning (SAST, DAST, dependency).
- Linting and formatting.

### 3.4 Sample data

- Synthetic data only.
- Generated with appropriate distributions.
- No real citizen data in dev/test.
- Clear separation between dev/test and production.

---

## 4. Code style

### 4.1 General

- Languages and primary stack per Master Blueprint Appendix B.
- Follow language-specific style guides.
- Code review required for all changes.
- Tests required for behavior changes.

### 4.2 Specific to CivicOS

- Plain-language strings externalized.
- No hard-coded English in user-facing paths.
- No hard-coded identifiers (use sovereign-configurable).
- Per-RP UID enforced by default (no global identifiers exposed).
- Sealed compartments for sensitive data flagged with annotations.
- Audit emission required for state-mutating actions.

### 4.3 Forbidden patterns

- Hard-coded API keys.
- SSH-into-production for changes.
- Commercial dependencies for sovereign-critical paths without escrow.
- Backdoors of any kind.
- Telemetry to non-sovereign-controlled endpoints from production.
- Citizen data in logs or non-sealed storage.

---

## 5. Architecture decisions

### 5.1 ADR (Architecture Decision Record)

For any architectural decision, write an ADR per template (Companion 11 §1.4 / Companion 41 §3.1):

- Context.
- Options considered.
- Decision.
- Rationale.
- Consequences.
- Assumptions.
- Review trigger.
- Authors and approvers.

### 5.2 Discipline

- ADRs honest about uncertainty.
- ADRs honest about trade-offs.
- ADRs preserved indefinitely.
- ADRs reviewed by domain owner and security reviewer.

### 5.3 Forbidden in ADRs

- Boilerplate justification.
- Hidden alternatives.
- Skipped review.

---

## 6. Working with AI

If working with AI components:

### 6.1 Discipline

- Decision class governance applies (Companion 10 §2).
- Charter required for Class B+ deployment (Companion 10 §3).
- AIBOM mandatory (Companion 10 §9).
- Continuous evaluation (Companion 10 §4).
- Kill switches tested (Companion 10 §12).
- Reversibility for Class C+ (Companion 10 §6).

### 6.2 Forbidden

- Class D capabilities (per forbidden list).
- AI making determinative decisions without human judgment.
- Persuasive optimization on civic surfaces.
- AI principals (AI is always agent).

### 6.3 Engagement with AI Authority

- Register models before deployment.
- Submit to evaluation gates.
- Cooperate with audits.
- Honest reporting of failures.

---

## 7. Privacy by design

### 7.1 Defaults

- Per-RP UID by default.
- Sealed compartments for sensitive data.
- Default-private settings (Companion 82 §5).
- Symmetric opt-in/opt-out.
- Plain language consent.

### 7.2 Discipline

- Privacy review for any new data flow.
- DPA consultation for sensitive data.
- Per Companion 23 §6 privacy mechanisms applied.
- Cross-border data flows audited.

### 7.3 Forbidden

- Cross-RP correlation without consent.
- Children's data commercial use.
- Health/mental health data outside sealed compartments.
- Surveillance dressed as service.

---

## 8. Security by design

### 8.1 Defaults

- mTLS internally.
- OAuth 2.1 / FAPI 2 externally.
- Cedar/OPA-based authorization.
- HSM-backed signing for sovereign-critical operations.
- Just-in-time elevation for privileged actions.

### 8.2 Discipline

- Threat model per significant feature.
- Security review for sensitive paths.
- Vulnerability disclosure process for findings.
- Patching SLAs.
- Cryptographic agility (anticipate algorithm rotation).

### 8.3 Forbidden

- Backdoors.
- Vulnerability hoarding.
- Insecure defaults.
- Surveillance capabilities not justified by lawful purpose.

---

## 9. Accessibility from day one

### 9.1 Defaults

- WCAG 2.2 AA minimum.
- Multi-modal interaction.
- Keyboard-only flows tested.
- Screen reader compatibility tested.
- Multilingual at parity.

### 9.2 Discipline

- Accessibility audit per release.
- User testing with disabled users.
- People's Editor review for citizen-facing.
- Continuous improvement.

### 9.3 Forbidden

- Inaccessible features shipped.
- Accessibility as afterthought.
- Discrimination in design.

---

## 10. Multilingual baseline

### 10.1 Defaults

- All user-facing strings externalized.
- All Tier 1 languages at parity (Companion 25 §2).
- Right-to-left tested.
- Cultural appropriateness reviewed.

### 10.2 Discipline

- Translation by professional translators.
- Native speaker review.
- Continuous quality monitoring.
- People's Editor review for plain language.

### 10.3 Forbidden

- English-only services.
- Machine translation in production without human verification.
- Cultural insensitivity uncorrected.

---

## 11. Sustainability

### 11.1 Defaults

- Energy-efficient code.
- Carbon-aware scheduling where applicable.
- Resource-efficient algorithms.
- Cache appropriately.

### 11.2 Discipline

- Performance budgets per release.
- Cost monitoring.
- LLM call accounting.
- Tiered storage for old data.

### 11.3 Forbidden

- Wasteful resource use.
- Hidden cost.
- Climate-incompatible long-horizon investments.

---

## 12. Testing

### 12.1 Coverage

- Unit tests per behavior change.
- Integration tests for API surfaces.
- End-to-end tests for citizen journeys.
- Accessibility tests in CI.
- Security tests routine.
- Performance tests for tier-0/1 services.
- Localization tests for multilingual.
- Chaos engineering for production readiness.

### 12.2 Discipline

- Tests fail loudly.
- Anti-flaky-test culture.
- Test-driven development encouraged.
- Test maintenance as part of feature work.

### 12.3 Forbidden

- Disabling tests to ship.
- Skipping security tests.
- Skipping accessibility tests.

---

## 13. Documentation

### 13.1 What documentation to write

- Code: docstrings for public APIs; minimal for internal (code should be self-explanatory).
- Architecture: ADRs.
- Standards: per Companion 19 §3.
- Operations: runbooks.
- Citizen-facing: plain-language documentation.
- Multilingual: translations of citizen-facing.

### 13.2 Discipline

- Documentation as first-class artifact.
- Plain language for citizen-facing.
- Native speaker review for multilingual.
- Versioned with code.

### 13.3 Forbidden

- Undocumented public APIs.
- Citizen-facing documentation in only one language.
- Out-of-date documentation.

---

## 14. Civil society and constitutional officer engagement

### 14.1 Discipline

- Algorithmic Ombudsman has review authority on AI capabilities affecting citizens.
- People's Editor reviews citizen-facing language.
- Sovereign Trust Officer monitors invariant compliance.
- Civil society has standing access to platform telemetry.

### 14.2 Engagement patterns

- Cooperate with audits.
- Respond to investigations promptly.
- Implement remediation.
- Engage civil society constructively.

### 14.3 Forbidden

- Blocking constitutional officer access.
- Suppressing civil society engagement.
- Cover-up of issues identified by oversight.

---

## 15. Sustainability of practice

### 15.1 Discipline

- Sustainable workload (avoid burnout).
- Code review without ego.
- Mentorship (you'll mentor, you've been mentored).
- Continuous learning.
- Civic Academy partnership.

### 15.2 Career growth

- Start with implementation; grow into architecture, governance.
- Specialize in a domain (security, AI, accessibility, infrastructure).
- Contribute to standards.
- Mentor newer engineers.
- Engage with civil society and academic perspectives.

### 15.3 Forbidden

- Toxic engineering culture.
- Brilliant-jerk tolerance.
- Burnout-as-virtue.

---

## 16. Common patterns in CivicOS development

### 16.1 Adding a new module capability

1. Read relevant module documents (Companion 04, Companion 09, module-specific).
2. ADR for design decisions.
3. Threat model.
4. Privacy review.
5. Implementation with tests.
6. Accessibility audit.
7. Multilingual review.
8. Code review.
9. Shadow deployment.
10. Pilot deployment.
11. Active deployment.
12. Continuous monitoring.

### 16.2 Adding a new AI capability

Per Companion 10 §3 and §11:

1. Determine decision class.
2. Source model (Tier 1/2/3).
3. Curate data.
4. Train (if applicable).
5. Evaluate.
6. Draft charter.
7. Get charter approved.
8. Publish AIBOM.
9. Shadow phase.
10. Pilot phase.
11. Active phase.
12. Continuous evaluation.
13. Sunset planning from day one.

### 16.3 Responding to a security incident

Per Companion 30 §7:

1. Detect.
2. Contain.
3. Communicate (initial within 1 hour to constitutional officers).
4. Investigate.
5. Remediate.
6. Report (DPA, Algorithmic Ombudsman as applicable, public).
7. Learn (post-mortem).
8. Prevent recurrence.

---

## 17. When to escalate

Escalate to your manager, security team, or constitutional officers when:

- Security vulnerability discovered.
- Forbidden capability proposed by anyone.
- Pressure to circumvent invariants.
- Foreign coercion attempt.
- Algorithmic discrimination signals.
- Civil society complaint pattern.
- Privacy violation.
- Constitutional officer concern.
- Vendor coercion attempt.
- Anything that violates the discipline.

You won't be punished for raising concerns. Whistleblower protections apply.

---

## 18. The developer's compact

If you commit to this work, you commit to:

- Build with discipline.
- Test rigorously.
- Document honestly.
- Respect users especially the most vulnerable.
- Engage with constitutional officers and civil society respectfully.
- Tell the truth about failures.
- Leave the platform stronger than you found it.
- Mentor those who come after.

In return, the platform commits to:

- Provide tools that work.
- Provide training and support.
- Provide protection for principled engineering.
- Respect your judgment.
- Pay fairly.
- Support sustainability of practice.
- Honor your contributions.

---

## 19. The developer's north star

Engineering CivicOS is engineering in service of millions of citizens across decades. The standards are high because the stakes are high. The discipline is daily because the consequences accumulate.

You inherit a substrate built by engineers before you. You will pass it to engineers after you. Build for them. Document for them. Test for them. Honor the work they did and the work they will do.

The platform's commitments live in your hands when you're at the keyboard. The seven invariants are not slogans; they are constraints on every decision. The forbidden list is not advisory; it is binding. The standing question applies to your work too.

Welcome to the work. It's hard. It matters. Future generations will judge whether you did it well.

Build well.
