# CivicOS — How to Fork (Companion 61)

This companion operationalizes the fork pledge of Companion 19 §8. It tells you how to fork CivicOS — kernel, standards, governance — when you need to.

The thesis: **the fork pledge is meaningless if forking is theoretical**. CivicOS commits that the kernel is open, standards are governed multi-sovereign, the Foundation is structurally independent, sovereign exit is real. This companion makes the fork actually achievable. If a sovereign or community decides to fork, this document is what they read first.

The discipline: forking is normal, not adversarial; well-designed forking strengthens the ecosystem; the Foundation supports forks rather than fights them; forks make the original honest.

---

## 1. When to fork

Reasons that justify forking:

- **Steward direction disagreement.** You believe CivicOS Inc. or Foundation has gone in directions you cannot follow.
- **Sovereign needs unmet.** Your sovereign requires substantial customization the standard distribution does not address.
- **Community vision.** A community has a different vision worth pursuing.
- **Risk diversification.** You want a parallel substrate to reduce single-stewardship risk.
- **Innovation.** You want to experiment with substantially different approaches.
- **Failure of original.** The original has lost legitimacy and someone needs to continue the work differently.

Reasons not to fork:

- **Disagreement with one specific decision.** Try the standards process or RFC first.
- **Frustration with vendor.** Try multi-vendor selection within standard CivicOS.
- **Political reasons that compromise commitments.** A fork that abandons the seven invariants is not CivicOS in spirit; you are free to do so but cannot use the certification mark.

---

## 2. What you can fork

### 2.1 Kernel

The kernel is permissively licensed (Companion 19 §4). You can:

- Fork all kernel code repositories.
- Modify any component.
- Distribute your fork.
- Build commercial products on it.
- Maintain independently.

Repositories you'll need (illustrative; actual organization in `civicos-foundation`):

- `kernel/identity` — CivicID core
- `kernel/wallet` — Civic Wallet reference
- `kernel/payments` — CivicPay
- `kernel/data-exchange` — CivicBus
- `kernel/trust-services` — PKI, signatures, timestamps
- `kernel/audit-vault` — append-only audit log
- `kernel/workflow` — Temporal-based workflow
- `kernel/llm-gateway` — sovereign LLM gateway
- `kernel/charter-registrar` — charter management
- `civicos-spec` — protocols, schemas
- `civicos-deploy` — Helm charts, ArgoCD configs
- `civicos-policy` — OPA/Rego, Cedar policies
- `civic-studio` — IDE plugin and scaffolding

### 2.2 Standards

Standards are open (Companion 19 §3). You can:

- Implement any standard in your fork.
- Propose extensions through standards body process.
- Develop your own standards if the standards body doesn't accept your proposal.
- Maintain conformance to standards even while forking implementation.

### 2.3 Modules

Modules are source-available (Companion 19 §5). You can:

- Inspect all module source.
- Modify modules for your sovereign use.
- Fork modules under their license terms.
- Build replacement modules implementing the same standards.

### 2.4 Governance

You can fork governance:

- Establish your own foundation or governance body.
- Apply your own conformance certification.
- Develop your own constitutional officer frameworks.

You cannot:

- Use the "CivicOS Certified" trademark for your fork (without licensing from Foundation).
- Claim official endorsement.

---

## 3. The fork process

### 3.1 Decide deliberately

- Document your reasons for forking.
- Convene affected stakeholders.
- Consider standards process or RFC first.
- Engage the Foundation in dialogue if appropriate.
- Understand what you commit to maintaining.

### 3.2 Notify the Foundation

- Courtesy notification (not approval).
- Helps Foundation support the fork.
- Helps community understand landscape.
- Helps users make informed choices.

### 3.3 Establish your fork's governance

- Steward entity (commercial, foundation, sovereign body).
- Standards governance.
- Conformance testing.
- Contribution process.
- License terms.

### 3.4 Initial fork

- Mirror or branch source repositories.
- Preserve attribution.
- Maintain license compatibility.
- Document divergence clearly.

### 3.5 Ongoing maintenance

- Upstream contributions back where mutually beneficial.
- Track upstream changes; integrate where consistent with your vision.
- Maintain security updates.
- Support your users.

### 3.6 Conformance and interoperability

- If you intend to interoperate with other CivicOS deployments, maintain standards conformance.
- If you intend to fully diverge, document explicitly.

---

## 4. What the Foundation commits to

Per Companion 19 §8.1 (the fork pledge):

- The kernel is forkable. Always.
- A sovereign or community may fork at any time, for any reason.
- The Foundation cooperates with forks (transferring rights, attribution, technical support).
- Forks are not antagonized; they are recognized as legitimate exercise of open-source rights.

Concretely, the Foundation will:

- Provide initial source escrow access.
- Allow continued participation in standards body (within community standards).
- Recognize forks as legitimate choices.
- Refrain from antagonistic action against forks.
- Support your fork's users in transition where appropriate.

The Foundation will not:

- Block your fork through legal or technical means.
- Sanction stewards or sovereigns for forking.
- Withdraw support during transition.
- Treat forks as failures.

---

## 5. What you commit to

If you fork, you commit to:

- Maintain your fork (or sunset it explicitly).
- Be honest with users about your fork's relationship to original.
- Respect license terms.
- Participate in standards bodies in good faith if you choose to remain interoperable.
- Treat your own users with the dignity CivicOS commitments require.

You don't commit to:

- Maintain compatibility with original.
- Adopt standards you don't accept.
- Use the "CivicOS Certified" mark (requires Foundation licensing).
- Continue forever (sunset is honest if needed).

---

## 6. What about the seven invariants?

The seven invariants reflect substantive moral commitments. If your fork:

- Maintains the invariants — you are within the broader CivicOS spirit; cooperation with Foundation likely; users may consider this still CivicOS-class.
- Modifies but maintains the spirit — your fork is a sibling, with its own evolution.
- Abandons the invariants (e.g., fork that builds mass surveillance) — you are free to do so, but you are no longer doing what CivicOS is for. Foundation, civil society, and likely most users will distinguish your fork from CivicOS spirit.

The invariants are not legally enforceable through licensing; they are a community commitment. A fork that abandons them is a fork that has chosen something else.

---

## 7. Sovereign fork patterns

### 7.1 Sovereign-led fork

A sovereign decides to operate independently of CivicOS Inc. as commercial steward:

- Take source escrow contents.
- Establish in-country operating capacity (Civic Academy graduates).
- Negotiate vendor relationships independently.
- Continue with kernel as substrate.
- Maintain standards conformance for interoperability.

This is sovereign capability transfer per Companion 03 reaching its full conclusion.

### 7.2 Regional consortium fork

Multiple sovereigns decide to operate jointly:

- Establish consortium governance.
- Maintain shared kernel.
- Develop region-specific modules.
- Maintain standards alignment with broader CivicOS.

### 7.3 Civic-tech community fork

Civil society or civic-tech community develops a fork for specific civic-tech use cases:

- Smaller scope than sovereign deployment.
- Open development.
- Possibly with experimental capabilities.
- Standards alignment likely.

### 7.4 Vendor fork

A commercial vendor decides to compete with CivicOS Inc. directly:

- Permissive license allows.
- Marketplace and certification not transferable without Foundation arrangement.
- Sovereign customers can choose.

---

## 8. Ongoing relationship after fork

### 8.1 Standards body participation

- Forks may continue participating in standards body within community norms.
- Their proposals receive same consideration as any.
- Their sovereign customers retain standards body voting if applicable.

### 8.2 Civic Academy

- Forks may use Civic Academy curricula under license terms.
- Forks may develop their own training; talent flows are voluntary.

### 8.3 Marketplace

- Forks may maintain own marketplace.
- Cross-marketplace coordination possible.
- Original Foundation marketplace continues.

### 8.4 Civil society and academia

- Civil society and academic engagement spans forks.
- Comparative analysis welcomed.
- Shared learning encouraged.

---

## 9. When forks should reunify

Sometimes forks reunify because divergence reasons no longer apply. Mechanisms:

- Standards convergence first.
- Implementation reunification through gradual integration.
- Governance reunification per stakeholder agreement.
- Transition support for users.

This is normal and welcomed.

---

## 10. The forking north star

The fork pledge is one of CivicOS's deepest commitments. It exists because no platform — however well designed — should be unreplaceable. The credible threat of fork disciplines the steward to serve customers.

When forking actually happens — and it will — it is not a failure. It is the open ecosystem working as intended. The original may improve in response to fork pressure. The fork may serve users the original couldn't. The community may benefit from plurality.

CivicOS Foundation commits to: support forks, refrain from antagonism, transfer rights as needed, maintain standards body openness, recognize forks as legitimate exercise of open-source freedom.

If you fork: you are exercising a right CivicOS exists to preserve. Do so with care for your users, honesty about what you commit to maintain, respect for license terms, and continued engagement with the broader community where mutually beneficial.

If you don't fork but you have the right: the very existence of that right makes the platform you use trustworthy.

The discipline is daily. The forkability is real. The plurality is preserved.

This is how open infrastructure stays open.
