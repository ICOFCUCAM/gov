# CivicOS — Threat Model (Companion 02)

This document covers the threat landscape that CivicOS must withstand. It uses STRIDE for service-level analysis and PASTA for strategic adversary modeling, layered with constitutional/civil-liberties threats unique to government platforms.

---

## 1. Adversary classes

| Class | Capability | Motivation | Examples |
|---|---|---|---|
| A1 — Nation-state | Tier-1 offensive cyber, supply chain, insider recruitment, physical access | Espionage, coercion, destabilization | Foreign intelligence services |
| A2 — Organized crime | Skilled, persistent, financially driven | Fraud, ransom, identity theft at scale | Cybercrime syndicates |
| A3 — Hacktivist | Skilled, ideological, opportunistic | Disruption, disclosure | Politically motivated groups |
| A4 — Insider, malicious | Authorized access | Money, ideology, coercion | Officer accepting bribe to alter title |
| A5 — Insider, negligent | Authorized access, no malice | Mistake | Officer emails registry export |
| A6 — Politically aligned actor | Lawful authority misused | Power retention, surveillance | Misuse of lawful intercept |
| A7 — Vendor / supply chain | Embedded access | Profit, coercion, foreign pressure | Compromised dependency, coerced backdoor |
| A8 — Citizen fraudster | Limited skill, scale via volume | Benefit fraud, identity theft | False welfare claims |
| A9 — Foreign vendor coercion | Lawful in their jurisdiction | Sanctions, court orders | Forced disclosure / shutdown |

---

## 2. Crown jewels

Loss or compromise of any of these is catastrophic:

1. CivicID enrollment database and biometric templates.
2. National PKI root and intermediate keys.
3. CivicPay TSA balances and disbursement authority.
4. Audit Vault integrity.
5. Election data (where supported).
6. Land titles.
7. Health records.
8. Lawful intercept system.

Each crown jewel has a dedicated risk register, separate threat model, and elevated controls.

---

## 3. STRIDE per kernel service (excerpt)

### 3.1 CivicID

| Threat | Vector | Mitigation |
|---|---|---|
| Spoofing | Stolen biometric template | Templates encrypted with per-citizen key in HSM; liveness on enrollment; revoke and re-enroll workflow |
| Tampering | Officer alters identity record | Immutable audit log; two-officer approval for sensitive edits; anomaly detection on edit patterns |
| Repudiation | Officer denies enrollment action | Cryptographically signed sessions; biometric officer auth |
| Information disclosure | Bulk export of identity DB | Field-level encryption; no full-DB read role; tokenized exports for analytics; DLP on egress |
| Denial of service | Flood enrollment endpoints | Rate limiting; CAPTCHA-equivalent for officers; queue-based enrollment |
| Elevation of privilege | Compromised admin account | Separation of duties; FIDO2 hardware tokens; just-in-time elevation; quorum approval for irreversible changes |

### 3.2 CivicPay

| Threat | Vector | Mitigation |
|---|---|---|
| Spoofing | Forged disbursement instruction | Disbursement orders signed by program owner key + treasury counter-signature; replay protection |
| Tampering | Modify ledger entries | Append-only event sourcing; daily Merkle anchoring; reconciliation against TSA |
| Repudiation | Vendor denies receipt | ISO 20022 message acknowledgement chain; bank statement reconciliation |
| Information disclosure | Transaction data leak | Tokenized analytics; restricted read scopes; per-tenant KMS |
| Denial of service | Volumetric attack on payments rail | Multi-AZ active-active; rate-limited at gateway; degraded mode preserves credit operations |
| Elevation of privilege | Unauthorized disbursement | Multi-party signing for above-threshold; circuit breakers; daily/weekly caps |

### 3.3 CivicBus

| Threat | Vector | Mitigation |
|---|---|---|
| Spoofing | Rogue security server | Trust anchored in central registry with revocation; mTLS chain validation |
| Tampering | Modified payload in transit | mTLS + payload signature; integrity hash logged |
| Repudiation | Consumer denies receipt | Non-repudiation receipts logged in central monitoring |
| Information disclosure | Unauthorized service consumer | Service-level access matrix; consent token verification |
| DoS | Flood neighbor's service | Per-consumer rate limits, backpressure |
| EoP | Misconfigured service exposing more than declared | Schema enforcement; static analysis on service definitions |

### 3.4 AI Plane

| Threat | Vector | Mitigation |
|---|---|---|
| Prompt injection | Citizen-submitted document | Structured input parsing; allow-listed instruction surfaces; output filtering; never auto-execute on untrusted text |
| Data poisoning | Manipulated fine-tune data | Curated datasets; provenance signing; canary evaluations |
| Model exfiltration | Adversarial query patterns | Rate limits; query similarity detection; legal terms |
| Hallucination causing harm | Confident-wrong output | Decision class governance (B/C/D); evaluation gates; human review for consequential |
| Bias drift | Population shift | Stratified continuous evaluation; deprecation triggers |
| Vendor coercion | Foreign provider revoking access | Tier 1 sovereign model fallback; degraded-mode operation |

---

## 4. Civil liberties threats

These are threats *from* the platform to its citizens. They must be designed against with equal seriousness.

| Threat | Description | Mitigation |
|---|---|---|
| Mass surveillance creep | Aggregated registries enable de-facto surveillance | Purpose limitation enforced in code; per-RP UID prevents correlation; consent-gated cross-domain access; independent oversight |
| Function creep | Features added without authority | All capabilities require gazetted authority; capability registry public |
| Discriminatory algorithms | AI causing disparate impact | Stratified evals; bias audits; right to human review |
| Voter suppression via ID friction | Identity barrier disenfranchises | No-biometrics path; offline verification; agent network |
| Chilling effects from logged interactions | Citizens self-censor | Minimal logging, especially for political/health/religious flows |
| Lawful intercept abuse | Officials surveil opponents | Hardware-enforced quotas; judicial warrant gating; Inspector General review of every use; tamper-evident logs |
| Deplatforming risk | Citizen locked out of essential services | Strong appeal rights; offline credentials valid X days; cross-channel access |
| Surveillance via metadata | Even without payloads, patterns reveal | Metadata minimization; aggregation thresholds for analytics |

---

## 5. Supply chain

- All container images signed (Sigstore).
- SBOMs published per release.
- SLSA L3+ provenance for kernel; L4 for crown-jewel services.
- Dependency review on PRs; license + vulnerability scanning.
- Reproducible builds for kernel.
- Hardware roots of trust (TPM/attestation) on production nodes.
- Vendor risk reviews; coercion-resistance plan for any single-source dependency.

---

## 6. Insider threat program

- Background checks for privileged roles.
- Just-in-time elevation; default-deny for sensitive actions.
- Two-person rule for irreversible operations on crown jewels.
- Behavioral analytics on officer activity (what's unusual?).
- Rotation policies for high-trust roles.
- Whistleblower channel with cryptographic anonymity.

---

## 7. Physical security

- Sovereign cloud DC requirements: Tier III+ minimum, biometric access, video, mantraps, multi-zone.
- Edge cells: locked rack, environmental monitors, anti-tamper alerts.
- HSM clusters: smartcard quorum, geographic separation for ceremony.
- Document destruction protocols.
- Visitor management for facilities.

---

## 8. Incident response

- 24/7 SOC.
- Documented playbooks for top 30 scenarios (ransomware, mass identity-theft, payment-rail disruption, etc.).
- Red/blue exercises quarterly; purple-team integration.
- Coordinated disclosure with national CERT.
- Public-facing status page and post-mortem policy.
- Cross-government incident comms tested annually.

---

## 9. Security KPIs

| KPI | Target |
|---|---|
| Critical patches applied | <72 hours |
| MTTD on tier-0 service incident | <15 minutes |
| MTTR on tier-0 service incident | <60 minutes |
| Phishing simulation failure rate | <3% |
| Privileged action review coverage | 100% sampled monthly |
| Independent pen-test findings of critical severity | 0 unresolved >30 days |
| Bug bounty median time to triage | <2 business days |
