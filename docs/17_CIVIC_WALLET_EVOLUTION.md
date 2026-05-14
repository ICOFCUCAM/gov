# CivicOS — Civic Wallet Evolution Spec (Companion 17)

This companion specifies the **Civic Wallet** across eras, from a 2030 mobile + USSD app to a 2050+ ambient civic environment. The wallet is the citizen's primary surface to the state. More than any other component, it determines whether the platform feels empowering or oppressive, whether it includes or excludes, whether it serves the citizen or the institution.

The wallet is the citizen's instrument. It is owned by the citizen, hosted under their control, and bound to the state only through cryptographic credentials and consents the citizen has chosen to extend. The state may not unilaterally read, write, or revoke wallet contents. The wallet is the embodiment of "sovereignty of the principal" — Invariant 1.

---

## 1. Wallet principles (across all eras)

1. **The citizen is the principal.** The wallet acts under the citizen's authority. The platform does not write to the wallet without consent.
2. **The lowest-equipped citizen retains full access.** USSD/IVR/agent equivalents always work for every essential capability.
3. **Privacy by default.** Selective disclosure, zero-knowledge proofs, per-RP UIDs.
4. **No surveillance through the wallet.** The wallet is a citizen's instrument, not a state probe.
5. **Cryptographically attested communication.** Every state communication is signed; impersonation is impossible.
6. **Reversibility and contestability surfaced.** Every consequential interaction shows its appeal path.
7. **Multi-modal, multilingual, accessible.** Voice, text, visual, spatial; every national language; every accessibility need.
8. **Forensically auditable for the citizen, opaque to others.** The citizen sees everything the wallet has done; nobody else does without consent.
9. **Forever portable.** Citizens may move between wallet implementations; data export is a right.
10. **Constitutional limits on persuasion.** No dark patterns, no engagement optimization, no nudges outside citizen goals.

---

## 2. 2030 Civic Wallet

### 2.1 Form

- Native iOS and Android apps; <30 MB Android APK; works on Android 7+.
- PWA fallback for desktop and unsupported devices.
- USSD twin (`*civic#`) mirrors essential service flows for feature phones.
- IVR for voice-first or visually impaired users.
- Agent network for in-person service with biometric authentication.

### 2.2 Capabilities

- **Identity**: CivicID credential; selective disclosure presentations.
- **Money**: bank, mobile money, CBDC accounts addressable by alias (mobile number).
- **Credentials**: VC issuance, storage, presentation (educational, health, professional, etc.).
- **Consents**: active, history, revoke; consent ledger view.
- **Documents**: signed PDFs, government letters, certificates with QR verification.
- **Service interactions**: apply, pay, sign, receive across all modules.
- **Notifications**: signed by sender; verifiable; impersonation impossible.
- **Personal civic agent**: voice-first, multilingual, Class A/B; cannot act without explicit citizen confirmation for consequential actions.
- **Appeal paths**: every consequential interaction has a visible appeal path.

### 2.3 Architecture

- Local encrypted vault on device; cloud sync optional, end-to-end encrypted (citizen-held key).
- Hardware-backed keys where available; software fallback otherwise.
- Multi-device with social/biometric recovery.
- Offline-first: most operations work offline; sync when connectivity returns.
- mDL profile for offline credential presentation.

### 2.4 Privacy mechanics

- Per-RP UID: each relying party gets a different pseudonymous identifier.
- Selective disclosure: only the attributes needed are shared.
- Zero-knowledge proofs for predicates ("over 18", "resident of region X") without revealing values.
- Consent ledger: every consent recorded with purpose, scope, expiry, revocation status.

### 2.5 Inclusion floor

- USSD essential service flows: payment, balance, simple permits, emergency.
- IVR voices in all national languages.
- Agent network with biometric authentication for cash-out and in-person service.
- Walk-in offices with empowered officers in every district.

### 2.6 Forbidden in 2030 wallet

- Dark patterns or engagement optimization.
- State-initiated reads of wallet contents.
- Personal civic agent acting without confirmation on consequential matters.
- Any commercial use of wallet data.
- Cross-RP correlation by default.

---

## 3. 2035 Wallet — Proactive personal civic agent

### 3.1 What's new

- **Proactive personal civic agent** under signed delegations: "Your child becomes eligible for the science scholarship next month; would you like me to apply?"
- **Class C operations with reversibility windows** under explicit citizen delegation (e.g., automatic license renewal under stated conditions).
- **Push entitlements**: many benefits arrive without application; citizen confirms or appeals.
- **Structured deliberation forums**: citizen-input on policy proposals, AI-summarized for legislators, with verifiable participation receipts.
- **Cross-border identity recognition**: the wallet works at airports, police stops, and services across the regional bloc.

### 3.2 Delegation mechanics

- Each delegation is a citizen-signed charter (analogous to Vol II §10.3): purpose, scope, budget, kill switch, sunset.
- Delegations are visible, enumerable, revocable.
- Delegations have caps: per-delegation, per-day, per-month.
- Citizens see a "what my agent did this week" summary.

### 3.3 Architecture

- On-device small models for privacy-sensitive interactions; cloud escalation only with consent.
- Personal vector store on device for retrieval-augmented agent.
- Federated learning opt-in for personal civic agent improvement.

### 3.4 Forbidden

- Delegation defaults that nudge toward broader scope.
- Cross-citizen data sharing without explicit consent (no implicit social graph).
- Persuasive design in delegation prompts.

---

## 4. 2040 Wallet — Ambient civic environment

### 4.1 What's new

- **Voice-first ambient civic environment**: most interactions conversational; text and visual alternatives present.
- **Intent-aware bundling**: the right thing at the right time, never noise.
- **Right to disconnect**: citizens can request lower-frequency interactions, opt out of optional notifications, configure an AI-mediated mode that consolidates everything into a weekly digest.
- **Right to a human**: for any consequential matter, citizens may request an in-person human officer within a guaranteed window.
- **Personal civic environment**: pending obligations, suggested actions, current entitlements, public deliberation invitations, all in language and modality preference.

### 4.2 Ambient ≠ invisible

- Citizens always know when they're interacting with the platform and what it's doing.
- A discreet but persistent "platform presence" indicator across modalities.
- Plain-language explanations of any ongoing background activity.
- Quiet consent surfacing: granular, revocable, easy to find.

### 4.3 Architecture

- Multi-modal input: voice, text, gesture (where supported), gaze (accessibility).
- Continuous on-device inference; cloud escalation only for hard cases.
- Privacy floors: certain interactions never leave the device (mental health, religion, political views).

### 4.4 Constitutional limits

- People's Editor reviews all citizen-facing language, including ambient prompts.
- Algorithmic Ombudsman audits ambient interactions for persuasion.
- No personalization of policy-relevant content (Vol II §11.5.1).

---

## 5. 2045 Wallet — Spatial and deliberative

### 5.1 What's new

- **Spatial deliberative environments**: participatory budgeting, urban planning, public consultation in shared spatial spaces accessible from the wallet.
- **Spatial wallet**: a place rather than a screen; navigable by voice and gesture.
- **Inclusive spatial design**: spatial environments work for visually impaired (audio-spatial), motor impaired (gaze + voice), cognitively diverse (simplified spatial modes).
- **Spatial accessibility floor**: every spatial environment has a screen-and-keyboard equivalent.
- **Continuous reskilling entitlement** integrated into wallet (Vol II §11.5).

### 5.2 Spatial deliberation mechanics

- Citizens enter a deliberative space (alone or with others).
- Information and options presented spatially with linear text fallback.
- Deliberation is recorded structurally for audit and review.
- Cryptographic participation receipts confirm participation without identifying.
- Outputs feed structured citizen input to legislators and Citizens' Assemblies.

### 5.3 Forbidden

- Spatial environments that exclude any user class.
- Spatial design that exploits cognitive vulnerabilities.
- Recording of deliberation content tied to identifiable individuals (structural pattern data only).

---

## 6. 2050+ Wallet — Presence-based civic computing

### 6.1 What's new

- **Wallet as presence**: the wallet is wherever the citizen is, in their preferred modality.
- **Public spaces have ambient civic affordances**: query, request, report, consent at a kiosk, a bus stop, a clinic.
- **Universal accessibility**: the same service works for the deafblind elder, the rural farmer, the urban professional, the child, the refugee.
- **Brain-adjacent interfaces** for accessibility (assistive interfaces for severe disability are common; broader BCI is regulated tightly and remains opt-in).
- **Cross-sovereign identity recognition** across most of the planet under planetary protocols (Companion 15).

### 6.2 Presence and consent

- Ambient affordances activate only on explicit user invocation; no passive sensing of citizens by default.
- Public-space ambient surfaces are signed and verifiable; impersonation impossible.
- Privacy-respecting design: no continuous biometric attestation without opt-in.

### 6.3 Brain-adjacent interfaces

- Used routinely for severe-disability accessibility (paralysis, locked-in syndrome, profound communication disability).
- Tightly regulated for general use: opt-in only, sovereign control, no commercial pathway, no surveillance use.
- Citizen owns their neural data absolutely; cannot be subpoenaed except under judicial process.

### 6.4 Forbidden in 2050+

- Continuous biometric attestation by default.
- Public-space tracking of identifiable individuals.
- Commercial brain-adjacent interfaces in civic surfaces.
- Mandatory presence-based interaction (citizens can always choose lower-tier modalities).

---

## 7. Wallet security across all eras

### 7.1 Key management

- Hardware-backed keys where supported; software keys with secure-enclave fallback.
- Multi-device key distribution with social and/or biometric recovery.
- Threshold signatures for high-value operations.
- Per-purpose key derivation for unlinkable presentations.

### 7.2 Authentication tiers

- L1 (PIN + CivicID alias): browse, view, low-risk actions.
- L2 (PIN + OTP to registered mobile): routine actions.
- L3 (PIN + biometric local match): consequential actions.
- L4 (PIN + biometric server match + device attestation): high-value transactions.

### 7.3 Recovery

- Social recovery: trusted contacts (set by citizen) can collectively initiate recovery.
- Biometric recovery: at registrar with verified identity.
- Custodial recovery: citizen may opt in to a custodian; never default.
- Lost wallet: provisional credentials issued; full restoration through verified identity.

### 7.4 Threat model considerations

- **Coerced unlock**: distress patterns (silent alarm) and decoy modes.
- **Lost device**: rapid revocation; cross-device sync of revocation; offline credential expiry on the order of days, not months.
- **Compromised cloud sync**: end-to-end encryption with citizen-held key; cloud provider sees ciphertext only.
- **Government attempt to compel disclosure**: citizen-held keys; no vendor backdoor; judicial process required for forensic analysis of seized device.

---

## 8. Wallet portability

A citizen may move between wallet implementations.

### 8.1 Export

- Standardized export format for: identity, credentials, consents, documents, transaction history.
- Cryptographically attested by the originating wallet.
- Verifiable on import.

### 8.2 Import

- New wallet validates export, re-issues credentials with new keys, transfers consents (with citizen confirmation), restores documents.
- Old wallet may be deactivated or retained.

### 8.3 Open implementations

- Reference open-source implementation maintained.
- Multiple implementations welcome under conformance testing.
- Commercial implementations subject to certification by trust services authority.
- No vendor monopoly on wallet implementation.

### 8.4 Sovereign discipline

- Conformance testing is sovereign-controlled.
- Wallet implementations must pass accessibility, security, privacy, language coverage, inclusion floor.
- Failed conformance: implementation cannot serve official credentials.

---

## 9. Business Wallet variant

A complementary product for legal entities: SMEs, NGOs, corporations, government bodies.

### 9.1 Capabilities

- Entity identity and credentials.
- Multi-officer authority with role-based scopes.
- e-Invoicing, contract management, tax filings.
- Payroll integration.
- Government communications and notifications.
- Procurement bid submission and contract management.
- Compliance attestations.

### 9.2 Differences from Civic Wallet

- Multi-user with delegation graphs (board → officers → staff).
- Audit logs with internal accountability.
- Integration with accounting and ERP systems.
- Compliance reporting cadences.

### 9.3 Same principles

- Entity is the principal.
- Privacy and consent norms scaled to entity context.
- No state probes without authority.
- Cryptographically attested communication.
- Constitutional limits on persuasion.

---

## 10. Wallet governance

### 10.1 Wallet Authority

A constitutional or statutory body responsible for:
- Wallet conformance certification.
- Approval of wallet implementations.
- Monitoring of wallet ecosystem health.
- Citizen complaints about wallet behavior.
- Coordination with the Trust Services Authority.

### 10.2 Citizen recourse

- Algorithmic Ombudsman handles complaints about wallet algorithms.
- People's Editor handles complaints about wallet language.
- DPA handles complaints about wallet data practices.
- Wallet Authority handles complaints about wallet implementations.

### 10.3 Public reporting

- Annual transparency report on wallet ecosystem.
- Public dashboard of wallet implementation conformance.
- Public registry of wallet versions and deprecation calendars.

---

## 11. Wallet evolution discipline

For each era, the following gates apply before deployment:

- **Inclusion floor preserved**: USSD/IVR/agent equivalents work for every essential capability.
- **Accessibility audit passed**: WCAG-current AAA where applicable; spatial accessibility primitives validated; brain-adjacent only with sovereign-approved use cases.
- **Persuasion audit passed**: People's Editor sign-off.
- **Security audit passed**: independent penetration testing and threat modeling.
- **Privacy audit passed**: DPA sign-off; per-RP UID enforcement validated.
- **Algorithmic audit passed**: Algorithmic Ombudsman sign-off on agent behavior.
- **Sovereign portability validated**: export/import tested.

A wallet release that fails any gate does not ship.

---

## 12. Wallet north star

The wallet is the most personal interface a citizen has with their state. Its design carries the platform's principles in tactile, visible form. A citizen who feels respected, served, included, and in control by their wallet feels respected, served, included, and in control by their state.

The discipline is daily. The accessibility is universal. The privacy is intrinsic. The contestability is visible. The sovereignty is the citizen's.

When the wallet stops being all of these — at any era — the wallet has failed and must be corrected. Capability is the means; trust is the end.
