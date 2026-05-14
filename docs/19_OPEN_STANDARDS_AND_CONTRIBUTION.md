# CivicOS — Open Standards and Contribution Policy (Companion 19)

This companion specifies how CivicOS standards are developed, published, evolved, and governed; how contributions from sovereigns, integrators, civil society, academia, and citizens are received and integrated; and how the open kernel pledge is operationalized.

The thesis: **standards and openness are sovereignty multipliers**. Standards prevent vendor lock-in, enable interoperability, lower the cost of new sovereigns adopting CivicOS, and discipline the steward through the credible threat of fork. Closed platforms, even sovereign-customer-owned ones, gradually become hostage to their suppliers.

The discipline: every protocol that crosses an organizational boundary is a published, governed standard. Every kernel artifact is open and forkable. Every contribution is welcomed under transparent rules. The steward is accountable to the community, not the other way around.

---

## 1. Principles

1. **Open kernel.** The substrate that runs CivicOS — kernel services, data exchange, identity, wallet, audit — is open source under a permissive license.
2. **Open standards for everything that crosses boundaries.** APIs, schemas, protocols, code lists, identifiers — all published, all versioned, all governed.
3. **Source-available for modules with sovereign carve-outs.** Modules may use a source-available license that protects sovereign interests while allowing inspection and modification.
4. **Reciprocal contribution.** Sovereigns who benefit from the open ecosystem contribute back: bug fixes, security findings, accessibility improvements, language packs.
5. **Standards govern themselves.** Standards have their own governance — RFC process, review boards, multi-stakeholder representation.
6. **Forkability is real.** A sovereign or community can fork the kernel and operate independently. The kernel's stewardship is contestable.
7. **Plain-language summaries of every standard.** Standards are inaccessible if only experts can read them.
8. **No standards-washing.** Open-by-name-only is forbidden. Standards published without governance, conformance testing, and contribution paths are not standards.

---

## 2. Standards taxonomy

### 2.1 Tier 1 — Core protocols

The protocols the platform cannot function without:

- **CivicID protocol**: identity issuance, authentication, attribute presentation, revocation.
- **CivicWallet protocol**: wallet credential format, presentation, sync, portability.
- **CivicBus protocol**: data exchange, mTLS, signing, consent token, schema registry.
- **CivicPay protocol**: payment messaging, programmable disbursement, reconciliation.
- **Trust Services protocol**: signature, timestamp, certificate, transparency log.
- **Audit Vault protocol**: append-only log format, hash chaining, anchoring, replay.
- **AIBOM and Charter formats**: machine-readable governance artifacts.

### 2.2 Tier 2 — Domain protocols

Per-module standards:

- Health: FHIR profiles, IHE patterns.
- Education: credential standards, learner record portability.
- Land: cadastral data exchange, customary tenure overlays.
- Procurement: OCDS profiles, beneficial ownership exchange.
- Tax: e-invoicing, withholding messages.
- Welfare: social registry exchange, eligibility predicate format.
- (and so on for each module)

### 2.3 Tier 3 — Reference data

- Code lists: gender, civil status, occupation, industry, currency, country, language.
- Identifier formats: CivicID, EntityID, RP-UID, ParcelID, etc.
- National data dictionary entries.

### 2.4 Tier 4 — Operational profiles

- Deployment topologies (edge cell, municipal cell, ministry cell, national region).
- Sovereign cloud profile.
- Africa-first profile (Companion 08).
- Air-gapped profile.
- Cell membership and federation profile.

### 2.5 Tier 5 — Planetary protocols

Per Companion 15:

- Identity & credentials.
- Payments & trade.
- Climate.
- Health.
- Cyber.
- AI safety.
- Refugees & migration.
- Knowledge commons.

---

## 3. Standards governance

### 3.1 The CivicOS Standards Body (CSB)

A multi-stakeholder body responsible for standards development:

- **Composition**: representatives of customer sovereigns; CivicOS Inc. technical leads; certified integrators; civil society; academia; citizen council members; standards body liaisons (W3C, ISO, IETF, HL7, OGC, GS1, etc.).
- **Powers**: approve standards proposals; certify conformance test suites; manage deprecation calendars; arbitrate disputes.
- **Limits**: cannot bind any sovereign to deploy a standard; cannot prevent forking; cannot expel members for fork.
- **Cadence**: monthly working group meetings; quarterly plenary; annual standards summit.

### 3.2 RFC process

Modeled on IETF/W3C processes:

1. **Idea**: anyone may submit an idea (citizens, integrators, sovereigns).
2. **Internet-Draft equivalent**: structured proposal with motivation, design, security considerations.
3. **Working group review**: open mailing lists; documented discussions.
4. **Last call**: formal review window with public input.
5. **Standards Body approval**: sign-off and publication.
6. **Conformance suite**: test suite published alongside standard.
7. **Implementation reports**: implementations document conformance.
8. **Standard track**: proposed → draft → standard → historic.

### 3.3 Versioning discipline

- Semantic versioning.
- Backwards-compatible additions are routine.
- Breaking changes require deprecation calendars (typically 12+ months overlap).
- Multiple versions may run concurrently during transitions.
- Sunset of a standard requires successor or explicit retirement decision with migration support.

### 3.4 Conformance

- Test suites published alongside standards.
- Conformance certification managed by Standards Body or delegated trusted parties.
- Implementations must pass conformance to claim compliance.
- Conformance status is public.

### 3.5 Multi-standards body alignment

- CivicOS standards align with international standards bodies where possible.
- Where CivicOS pioneers, contributions are made upstream.
- Profiles of international standards (e.g., FHIR profiles, OCDS extensions) are CivicOS-specific where needed.

---

## 4. Open kernel licensing

### 4.1 Kernel components and license

- Identity service: open source (permissive license, e.g., Apache 2.0).
- Data exchange: open source (permissive).
- Trust services: open source (permissive).
- Audit Vault: open source (permissive).
- Wallet reference implementation: open source (permissive).
- Workflow runtime: open source (permissive).
- Sovereign LLM gateway reference: open source (permissive).
- Charter Registrar reference: open source (permissive).
- Module catalog framework: open source (permissive).

### 4.2 Why permissive

- Maximum sovereign freedom.
- Maximum integrator freedom.
- Maximum forkability.
- Maximum credibility of the open pledge.

### 4.3 What this means

- Any sovereign or community can fork.
- Any commercial party can build on the kernel.
- Any sovereign can replace CivicOS Inc. as their kernel maintainer.
- The kernel's continuation does not depend on any single steward.

### 4.4 Trademark and certification

- "CivicOS" trademark held by CivicOS Foundation (governance body, not commercial).
- Use of "CivicOS Certified" requires conformance and adherence to community standards.
- Forks may exist but cannot use the certified mark.

---

## 5. Module licensing

### 5.1 Source-available with sovereign carve-outs

Modules under a source-available license that:
- Allows full inspection and audit.
- Allows sovereign customers to modify for their own use.
- Permits redistribution with conditions (e.g., field-of-use, attribution).
- Carves out sovereign interests (e.g., sovereigns can fork for their own use without redistribution).

### 5.2 Why not pure open

- Modules are productized, supported software with commercial economics.
- Pure open could undermine sustainability of the steward's commitment.
- Source-available preserves auditability and exit while sustaining the ecosystem.

### 5.3 What sovereigns get

- Full source access.
- Right to modify for own use.
- Right to fork (under license terms).
- Source escrow guarantee for continuity.
- Open data formats and APIs that enable replacement modules.

### 5.4 Marketplace modules

- Third-party modules license under their own terms (compliant with marketplace policy).
- Marketplace policy requires: open data formats for export, open APIs, security review, accessibility compliance.

---

## 6. Contribution policy

### 6.1 Who may contribute

- Any individual or organization may contribute to open standards and open kernel.
- Contributions evaluated on merit.
- No discrimination based on geography, employer, sovereign affiliation.

### 6.2 Contribution agreements

- Contributor License Agreement (CLA) for contributions to ensure clear IP.
- Developer Certificate of Origin acceptable in many cases.
- Sovereign contributors may sign on behalf of their sovereign.

### 6.3 Contribution channels

- GitHub-class platform for code (sovereign-acceptable hosting).
- Mailing lists for design discussions.
- Working group meetings for synchronous collaboration.
- RFC process for substantial proposals.
- Bug bounty for security findings.

### 6.4 Contribution review

- Code review by maintainers.
- Security review for sensitive paths.
- Accessibility review for citizen-facing changes.
- Multi-sovereign review for cross-sovereign-impacting changes.

### 6.5 Acceptance criteria

- Technical merit.
- Conformance with architectural principles.
- Test coverage.
- Documentation.
- Backwards compatibility (or proper deprecation).

### 6.6 Recognition

- Public credit for contributors.
- "Contributor" tier in CivicOS recognition program.
- Community awards annually.
- No proprietary advantage from contributions (level playing field).

---

## 7. Foundation governance

### 7.1 CivicOS Foundation

A non-profit governance entity for the open ecosystem:

- **Charter**: stewardship of standards, kernel, certification, community.
- **Members**: sovereign customers (voting); CivicOS Inc. (voting); integrators (non-voting observer); civil society (non-voting observer).
- **Board**: elected by members; rotating chair; multi-sovereign representation.
- **Funding**: dues from members; grants from multilaterals; donations.
- **Cannot be controlled by**: any single sovereign, any commercial entity, any foreign government.

### 7.2 Foundation roles

- Maintain trademark.
- Operate certification program.
- Convene Standards Body.
- Operate community programs (Civic Academy, hackathons, grants).
- Maintain sovereign exit infrastructure (source escrow, exit playbooks).
- Hold legal protections for the open ecosystem.

### 7.3 CivicOS Inc. and the Foundation

- CivicOS Inc. is the commercial steward; the Foundation is the governance steward.
- The Foundation is structurally independent of Inc.
- Inc. participates as one member among many.
- Inc. cannot capture the Foundation; structural separations enforced by founding documents.

---

## 8. Forkability and exit

### 8.1 The fork pledge

- The kernel is forkable. Always.
- A sovereign or community may fork at any time, for any reason.
- The Foundation cooperates with forks (transferring rights, attribution, technical support).
- Forks are not antagonized; they are recognized as legitimate exercise of open-source rights.

### 8.2 What forking means

- A sovereign with concerns about steward direction can fork and continue independently.
- A community with a different vision can fork and pursue it.
- Multiple forks may coexist; standards bodies may recognize multiple compliant implementations.

### 8.3 The exit infrastructure

- Source escrow with sovereign-controlled custodians.
- Documented exit playbooks tested annually.
- Sovereign continuity guarantees in commercial contracts.
- Pre-positioned migration tooling.

### 8.4 Why forkability disciplines the steward

- The threat of fork is a credible alternative; stewards cannot extract excessive rents or impose unwanted direction.
- Sovereigns negotiate from a position of real exit, not theoretical exit.
- The community's collective ability to fork keeps the steward honest.

---

## 9. Documentation discipline

### 9.1 Documentation as a first-class artifact

- Every standard has a specification, a tutorial, examples, and a plain-language summary.
- Every code repository has README, contributing guide, license, security policy, code of conduct.
- Documentation is versioned with the code/standard.
- Documentation is translated into all national languages of customer sovereigns.

### 9.2 Plain-language summaries

- Every standard has a one-page summary in plain language.
- Reviewed by the People's Editor for citizen-facing standards.
- Updated with every substantive standard change.

### 9.3 Architecture Decision Records (ADRs)

- Significant decisions documented as ADRs.
- Public for kernel and standards.
- Searchable; cross-referenced.

---

## 10. Code of conduct

### 10.1 Community standards

- Respectful, inclusive, professional conduct.
- Disagreement on technical merit; no ad hominem.
- Welcoming to newcomers; mentoring expected of senior contributors.
- Multilingual welcome; not English-only.
- Accessibility in community spaces (captions, transcripts, multiple time zones).

### 10.2 Enforcement

- Community moderators with documented authority.
- Reports handled confidentially.
- Sanctions proportional, transparent in process if not in detail.
- Appeals path.

### 10.3 No tolerance for

- Harassment.
- Discrimination.
- Sovereign-affiliation attacks.
- Impersonation.
- Coordinated inauthentic behavior.

---

## 11. Standards lifecycle examples

### 11.1 Example: CivicID attribute presentation v3 evolution

- v1 (2030): basic credential presentation; per-RP UID; selective disclosure.
- v2 (2032): zero-knowledge predicates; expanded attribute schema.
- v3 (2035): multi-modal presentation (mobile, USSD, kiosk); cross-border profile.
- v4 (2040): continuous attestation profile (opt-in).
- v5 (2045): privacy-preserving behavioral attestation.
- v6 (2050): planetary mutual recognition profile.

Each version: 12+ month deprecation overlap; conformance test suite; sovereign rollout coordinated.

### 11.2 Example: Charter format v2 evolution

- v1 (2032): basic charter schema.
- v2 (2035): standing authority extension.
- v3 (2040): goal-shaped charter extension.
- v4 (2045): nested charter / delegation graph extension.
- v5 (2050): cross-sovereign charter for planetary coordination.

Each version: backwards-compatible extensions where possible; breaking changes in major versions only with multi-sovereign coordination.

---

## 12. Anti-capture safeguards

### 12.1 Steward capture

- Foundation governance prevents single-steward control.
- Multi-sovereign voting prevents single-sovereign capture.
- Open contribution prevents commercial monopoly.
- Forkability backstops all of the above.

### 12.2 Vendor capture

- No vendor can dictate standard direction.
- Conformance testing is sovereign-controlled.
- Marketplace is open to multiple vendors.

### 12.3 Foreign capture

- Foundation legally domiciled to resist coercion.
- Multi-jurisdiction structure where appropriate.
- Sovereign keys remain with sovereigns, not Foundation.
- Critical infrastructure (escrow, conformance testing, kernel CI) distributed across jurisdictions.

---

## 13. Standards north star

CivicOS standards exist so that no sovereign is hostage to any vendor, including CivicOS Inc.; so that sovereigns can interoperate with each other on terms they choose; so that integrators, civil society, and academia can build on, audit, and improve the platform; and so that future generations inherit a substrate they can keep evolving.

The discipline is daily. The governance is multi-stakeholder. The kernel is forkable. The contribution path is real.

When a standard becomes a tool of capture, the standard has failed and must be reformed. When the kernel becomes unforked-able in practice, the open pledge has failed and must be restored. When the Foundation becomes captured, the Foundation must be restructured.

Open standards are not a marketing claim. They are a structural commitment that is testable, contestable, and replaceable. They are how sovereignty in software actually works.
