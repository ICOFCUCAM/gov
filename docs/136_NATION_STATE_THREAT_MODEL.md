# CivicOS — Nation-State Threat Model and Cyber Warfare Resilience (Companion 136)

This companion is the intelligence-grade threat model for CivicOS deployments under conditions of nation-state adversary engagement. It supersedes Companion 02's generic STRIDE treatment with formal adversary modeling, capability assessment, kill-chain disruption, and sovereign cyber warfare doctrine. It is written at the level expected of a national cyber doctrine document or a tier-1 sovereign cloud security review.

**Audience**: national cyber agencies, sovereign CISO offices, military cyber commands (defensive coordination only), intelligence community liaisons, sovereign cloud operators, Foundation security council, civil society security technologists with appropriate clearance for civilian elements.

**Scope**: civilian infrastructure defense under nation-state threat. Offensive cyber operations remain out of platform scope per Companion 24 §2.

---

## 1. Adversary taxonomy

### 1.1 Tier classification

| Tier | Designator | Capability | Typical actor |
|---|---|---|---|
| T0 | Strategic State | Persistent multi-vector, zero-day inventory, supply chain implants, signals intelligence, human intelligence, satellite reconnaissance, ten-year horizon operations | Major-power intelligence services, top-tier military cyber commands |
| T1 | Operational State | Sustained operations, custom toolchains, multi-stage campaigns, regional satellite access, limited zero-day | Mid-power state services, regional intelligence agencies |
| T2 | Strategic Non-State | State-aligned proxy, well-funded, persistent | Front organizations, mercenary cyber units, state-tolerated criminal syndicates |
| T3 | Sophisticated Criminal | Financial motivation, operational discipline, multi-stage | Ransomware syndicates, financial APTs |
| T4 | Ideological/Hacktivist | Skilled, episodic, motivated | Politically-motivated collectives |
| T5 | Insider, malicious | Authorized access, intent | Recruited or coerced officials |
| T6 | Insider, negligent | Authorized access, no intent | Process failure, fatigue, social engineering |
| T7 | Supply chain | Embedded access via dependency | Compromised vendor, hardware implant, foundation library |
| T8 | Foreign legal coercion | Lawful in adversary jurisdiction | Sealed court orders, gag-orders, sanctions-driven cooperation demands |
| T9 | Internal political | Sovereign-level capture attempt | Faction within deploying sovereign seeking platform repurposing |

Tier assignment per adversary is dynamic and combinable. Most consequential campaigns combine T0 capability with T5 insider access and T7 supply chain implants over multi-year horizon.

### 1.2 Crown jewels targeted

In order of intelligence value to most adversaries:

1. CivicID enrollment database (biometric templates + civic graph).
2. National PKI root and intermediate signing keys.
3. CivicPay TSA balances and disbursement authority paths.
4. Audit Vault integrity (capacity to alter history undetected).
5. Lawful Intercept warrant server (selector lists, target lists).
6. Election infrastructure interfaces (where they touch CivicOS).
7. CivicMind sovereign LLM weights and fine-tune corpora.
8. Constitutional officer communications (Algorithmic Ombudsman, Sovereign Trust Officer).
9. National Digital Twin (combined sectoral + economic + risk layers).
10. Civic Wallet master credential issuance authority.
11. Citizen-journalist source channels (cryptographic anonymous submission).
12. Refugee provisional credential issuance.

Each crown jewel has its own threat model, dedicated risk register, and elevated protective controls catalogued separately.

### 1.3 Adversary intent classes

- **Espionage**: collect on citizens, officials, foreign nationals transiting platform.
- **Coercion**: leverage compromise to influence sovereign decisions.
- **Disruption**: degrade or halt platform operations for strategic effect.
- **Manipulation**: alter records, decisions, models, or communications to shape outcomes.
- **Destruction**: irreversibly destroy data or capability.
- **Position**: establish persistent access for future exploitation.
- **Demonstration**: publicly compromise to signal capability.
- **Capture**: turn platform infrastructure into instrument of adversary.
- **Sanction-bypass**: use platform to circumvent international sanctions.
- **Conflict-preparation**: pre-position for kinetic or hybrid conflict.

Defensive posture varies by suspected intent. The same intrusion read as espionage requires different response than the same intrusion read as conflict-preparation.

---

## 2. Kill-chain disruption strategy

CivicOS adopts the Lockheed Martin / Mandiant adversary kill chain with sovereign-specific extensions and break-points at each stage. Defense aims to break the chain as early as possible while imposing forensic and attribution cost at every later stage.

```
Reconnaissance ─► Weaponization ─► Delivery ─► Exploitation ─► Installation ─► C2 ─► Actions on Objectives ─► Persistence / Exfil
       │              │             │            │              │              │            │                      │
   [Decoy &        [SBOM/        [Network    [Hardened       [App        [DNS sink-   [Per-RP         [Cryptographic
    Deception       AIBOM         Egress      Runtime,        Allow-      hole +       UID +           Audit Chain +
    Surface,        Provenance,   Filtering,  EBPF             Listing,    Behavioral    Sealed          Egress
    Identity        Reproducible  TLS         Hardening,       Code        Egress       Compartments +  Inspection +
    Probing         Builds,       Pinning,    Memory-safe      Signing,    Analysis,    Tamper-evident  Cold Storage
    Limits]         Sigstore]     Per-RP UID  Languages,       SLSA,       Anomaly      Audit Log,      Hashes]
                                              Sandboxing]      Attested    Detection,   Multi-party
                                                               Runtime]    Threshold    signing on
                                                                           Decryption]  consequential
                                                                                        ops]
```

### 2.1 Stage-by-stage controls

**Reconnaissance.** Public-facing surface deliberately minimized. Identity probing rate-limited per source ASN and per-RP UID. Internal directory structures not exposed. SSL fingerprints and TCP banners normalized. Honeyfiles and decoy infrastructure positioned to detect early probing. Disclosure of personnel rosters minimized; senior officials and constitutional officers protected from open-source intelligence (OSINT) buildup.

**Weaponization.** Defense at this stage operates outside platform — through cyber threat intelligence (CTI) sharing, vendor security research, sovereign intelligence cooperation under planetary cyber protocols. Platform contribution: published indicators of compromise (IOCs), shared YARA rules through sovereign CERT network.

**Delivery.** Email gateway hardened with cryptographic sender authentication (DKIM/DMARC enforced). Web gateway with TLS pinning and certificate transparency monitoring. SMS gateway authenticated to operator level. Per-RP UID ensures phishing campaigns cannot use leaked CivicID directly. USSD gateway authenticated to MNO origination.

**Exploitation.** Runtime hardening: memory-safe languages (Rust, Go) for kernel components, sandboxing (gVisor / Kata) for tenant workloads, eBPF-based runtime introspection, mandatory access control (SELinux/AppArmor), seccomp-bpf syscall filtering, address space layout randomization at all levels including kernel.

**Installation.** Application allow-listing enforced via signed binary verification (Sigstore-class). Container images pinned by content digest, never by tag. Reproducible builds for all kernel components — discrepancy with reproducible baseline triggers automatic quarantine. SLSA L4 provenance attestation required for sovereign-critical paths. Persistence mechanisms detected by eBPF-monitored kernel-level hooks; legitimate persistence is declared at deployment time and any undeclared persistence is alerted.

**Command and Control.** Egress filtering by default-deny per workload identity. DNS sinkhole for known malicious infrastructure. Per-workload egress allow-list with cryptographic identity attestation (SPIFFE/SPIRE). Behavioral egress analysis on volume, timing, periodicity, and destination entropy. Detection of low-and-slow exfiltration through cumulative anomaly scoring per identity over multi-week windows.

**Actions on Objectives.** Crown jewel access requires multi-party signing per Companion 24 §2. Sealed compartments isolate the most consequential data. Per-RP UID prevents broad correlation even if specific service is compromised. Audit Vault hash chain detects any retrospective alteration. Threshold decryption requires quorum of independently-held key shares for highest-sensitivity reads.

**Persistence/Exfil.** Tamper-evident append-only audit log with daily Merkle root anchoring to ledger and (where lawful) public chain. Cold storage of audit roots in air-gapped vault with diode-only ingress. Egress inspection includes DLP-style content classification, with cryptographic egress proof for legitimate data transfers (signed manifests). Long-horizon retrospective hunt: monthly retro-analysis of historical telemetry against newly-known IOCs.

### 2.2 Break-point philosophy

Defense aims to break the chain at multiple stages, not rely on a single perfect control. The defender's economics: imposing $10M cost per intrusion against an adversary with $50M annual cyber budget changes the calculus on which targets are worth pursuing. Defense in depth is not redundancy; it is layered cost imposition.

---

## 3. Threat modeling against specific TTPs

CivicOS maintains an internal threat library mapped to MITRE ATT&CK Enterprise and ATT&CK ICS, with sovereign-specific additions. The following are illustrative tactics with platform-specific countermeasures.

### 3.1 Supply chain compromise (T1195)

**Adversary path**: introduce malicious code into upstream open-source dependency or vendor build pipeline; await deployment to target.

**Counters**:
- SBOM mandatory for every released artifact (Companion 02 §5).
- AIBOM mandatory for every AI artifact (Companion 10 §9).
- Reproducible builds for kernel; any non-reproducible build is suspicious.
- SLSA L3+ provenance for tier-0/1; SLSA L4 for crown-jewel pipelines.
- Sigstore signing of every container, every binary, every model artifact.
- Dependency monitoring against CVE feeds and threat intel.
- Multi-vendor for critical paths reduces single-supply-chain blast radius.
- Source escrow with sovereign-controlled custodians enables independent rebuild from inspected sources.
- Annual third-party penetration tests against entire supply chain.

### 3.2 Living-off-the-land (T1059, T1218)

**Adversary path**: avoid bringing tools; use legitimate platform binaries (PowerShell, WMI, certutil equivalents).

**Counters**:
- Application allow-listing reduces legitimate binary inventory to minimum.
- eBPF-based behavioral analysis of legitimate binaries' actual usage patterns.
- Anomalous use of legitimate admin tools triggers high-confidence alert.
- Privileged action two-person rule for many crown-jewel adjacent actions.

### 3.3 Living-off-the-cloud / SaaS abuse

**Adversary path**: use legitimate cloud APIs and SaaS to stage operations.

**Counters**:
- Sovereign cloud preferred for sovereign-critical (Companion 11).
- Where hyperscaler regions used, egress to non-sovereign cloud destinations alerted.
- API token issuance with workload identity attestation (SPIFFE).
- No long-lived static credentials; everything just-in-time.

### 3.4 Hardware implant (T1542)

**Adversary path**: compromise hardware in supply chain; implant persists across OS reinstalls.

**Counters**:
- TPM-based hardware attestation at every boot.
- BIOS/UEFI integrity verified against known-good measurements.
- Network appliance and HSM hardware procured through diversified vendors with sovereign customs inspection at receipt.
- Critical hardware receives independent verification (X-ray, decapsulation, side-channel) where threat warrants.
- For most-sensitive crown jewels (audit vault, root PKI), sovereign or sovereign-consortium hardware preferred where feasible.

### 3.5 Insider compromise (T1078)

**Adversary path**: insider recruited, coerced, or planted obtains legitimate access and uses it.

**Counters**:
- Background checks for privileged roles, repeated periodically.
- Just-in-time elevation; default-deny for sensitive actions.
- Two-person rule for irreversible operations on crown jewels.
- Behavioral analytics on officer activity (cross-domain query patterns, off-hours access, volume anomalies).
- Cooperating threshold cryptography: no single insider holds enough key material to read crown-jewel data unilaterally.
- Whistleblower channels with cryptographic anonymity for colleagues reporting concerning behavior.
- Recruitment counter-intelligence: officers approached by foreign service report through designated channel; non-reporting itself is auditable misconduct.

### 3.6 Cryptographic harvest-now-decrypt-later

**Adversary path**: capture ciphertext today, decrypt when quantum capability arrives.

**Counters**:
- Hybrid post-quantum cryptography by 2030 (Companion 11 §6).
- PQC default by 2035 for all new artifacts.
- Crypto-period analysis: data sensitive beyond 10-year horizon already encrypted with PQC envelope.
- Forward secrecy on all session traffic (ephemeral keys per session).
- Threat-model exception: data destined for permanent public record (gazette, etc.) doesn't need long-horizon crypto-protection; data with long secrecy value does.

### 3.7 Adversarial AI

**Adversary path**: poison training data, craft adversarial inputs, prompt-inject through citizen-submitted documents, extract model through queries.

**Counters per Companion 10**:
- Curated training data with provenance.
- Stratified evaluation including adversarial test sets.
- Input sanitization and structured-extraction for citizen-submitted content (never auto-execute on untrusted text).
- Output filtering at sovereign LLM gateway.
- Query pattern analysis to detect model extraction attempts.
- Federated training architecture limits per-update influence.

### 3.8 Denial of service / availability

**Adversary path**: volumetric, application-layer, or protocol-exhaustion attack on tier-0 services.

**Counters**:
- Edge DDoS scrubbing with sovereign or sovereign-acceptable provider.
- Per-source ASN rate limits.
- Per-citizen-credential rate limits.
- Anycast for tier-0 services.
- Geographic load distribution.
- Graceful degradation: read-only mode preserves authentication and basic services even under load.
- Offline-first design (Civic Wallet credentials work for 90 days without sync) reduces availability dependency.

---

## 4. Sovereign cyber warfare resilience

Cyber warfare resilience is the platform's ability to maintain civilian service to citizens during periods of active state-on-state cyber conflict, regardless of whether the deploying sovereign is a belligerent, target, neutral party, or affected third party.

### 4.1 Strategic posture

CivicOS adopts an explicitly defensive posture (Companion 24 §2). The platform:

- Does not implement offensive cyber capabilities.
- Does not host offensive operations of its sovereign.
- Maintains civilian-focus throughout cyber conflict.
- Does not support cyber operations against civilian infrastructure of other sovereigns.
- Cooperates with multilateral norms-development on civilian infrastructure protection (Tallinn Manual, UN GGE/OEWG processes).

This is doctrinal commitment, not mere policy. The platform's architecture forbids weaponization (no offensive-action interfaces, no targeting capabilities, no command-and-control infrastructure for kinetic effects).

### 4.2 Continuity under attack

**Read continuity**: citizen-facing read operations (status check, balance inquiry, document presentation) must remain available throughout almost any attack. Read replicas in geographically diverse regions, with sovereign exit fallback to read-from-cached-state, ensure that citizens can still verify their identity, see their wallet balance, and present credentials offline even during major attacks.

**Write continuity**: state-changing operations may degrade. Order of degradation:

1. Tier-0 critical (identity authentication, emergency dispatch, public health surveillance) preserved.
2. Tier-1 essential (payments, civil registration) preserved at reduced throughput.
3. Tier-2 services degrade to scheduled batch.
4. Tier-3+ services pause until restoration.

Citizens see honest status communication. Affected services display "temporarily unavailable; restoration estimated [time]" rather than failing silently.

**Cryptographic continuity**: signing of consequential actions degrades to higher-assurance mode (more participants in multi-party signing, longer threshold approval windows) rather than to lower-assurance. If the platform cannot maintain its security commitments, it pauses the affected operation rather than weakening its cryptographic posture.

### 4.3 Cyber conflict roles

The platform operates differently depending on the deploying sovereign's role:

**Belligerent**: platform refuses to weaponize. Civilian-only operations continue. Sovereign Trust Officer authority to refuse capabilities being repurposed for offense.

**Target**: platform under attack from another state. Full defensive posture. International coordination through CERT networks. Multilateral support invoked where applicable. Civil liberties safeguards maintained despite emergency.

**Neutral**: platform refuses to host operations against either belligerent. Refuses to extradite citizen data of belligerents' nationals beyond local court order. Maintains neutral civilian service.

**Third-party affected**: cascading disruption from conflict elsewhere. Mutual aid through planetary cyber protocols. Sovereign exit options exercised if cascade compromises platform integrity.

### 4.4 Critical infrastructure protection

Civilian critical infrastructure includes platform components themselves. Defense includes:

- Geographic distribution: no critical mass of crown-jewel capability in single physical location.
- Cyber-physical separation: operational technology (OT) for power, water, etc. air-gapped or one-way-only connected from CivicOS information technology (IT).
- Manual fallback: tier-0 services have documented manual procedures that work without platform.
- Cross-sovereign mutual aid pre-positioned for civilian critical infrastructure protection.

### 4.5 Attribution and response

Attribution under cyber conflict is hard and consequential. Platform attribution discipline:

- Technical attribution by sovereign CERT and intelligence community, not by platform operations team.
- Public attribution decisions are political, made by sovereign leadership with intelligence input.
- Platform does not publish attribution claims unilaterally.
- Platform shares technical indicators with sovereign CERT for attribution and with allied CERTs under treaty for collective defense.

Response is sovereign decision. Platform's role is to maintain civilian service through whatever response posture sovereign chooses.

### 4.6 Norms cooperation

Platform participates in international civilian infrastructure norms processes:

- UN Open-Ended Working Group on cyber.
- Paris Call for Trust and Security in Cyberspace.
- Christchurch Call.
- Regional norms processes (AU, EU, OAS, ASEAN as applicable).
- Sovereign cyber doctrine published publicly where appropriate.

Norms work is slow and contested. Platform contributes the perspective of civilian infrastructure that must work for citizens regardless of state-on-state conflict.

---

## 5. Intelligence-grade compartmentalization

CivicOS adopts intelligence-grade compartmentalization for crown jewels, adapted to civilian context with civil liberties safeguards.

### 5.1 Classification levels

| Level | Equivalent | Examples | Access |
|---|---|---|---|
| Public | Unclassified | Gazette, statistics, OCDS | Anyone |
| Internal | For Official Use Only | Operational metrics | Authorized officers |
| Restricted | Confidential | Personal data | Purpose-bound officer access |
| Sensitive | Secret | Health, biometric, judicial | Sealed compartment, threshold quorum |
| Crown Jewel | Top Secret | Root keys, ABIS templates, lawful intercept selector lists | Air-gapped, multi-party signing, two-person rule |

These are platform-internal classifications. They map onto sovereign national classification schemes where they exist; they do not replace them.

### 5.2 Compartmentalization architecture

Compartments are cryptographically and administratively isolated. Access to compartment A does not imply access to compartment B even at the same classification level. Need-to-know is enforced through purpose tokens issued by purpose-specific authorities.

Example: an officer with access to "Health-Maternal-Region-East" compartment cannot access "Health-Mental-Region-East" without separate purpose-token issuance. The compartments share infrastructure but cryptographic separation prevents cross-compartment reads.

### 5.3 Cross-domain solutions

Where information must flow between compartments at different classifications, cross-domain solutions (CDS) operate with:

- One-way diodes for high-to-low (high-classification data can flow to lower-classification archive without return path).
- Content filtering for low-to-high (content from lower-classification environment must pass content inspection before entering higher-classification environment).
- Cryptographic attestation of CDS integrity itself, auditable independent of operator.

Crown-jewel zones are air-gapped from internet-connected zones with diode-only data flow for archive sync. Operational changes to crown-jewel zones require physical presence with two-person rule.

### 5.4 Civil liberties guard rails

Intelligence-grade compartmentalization in civilian platform requires civil liberties guard rails to prevent the apparatus from becoming a surveillance state in waiting:

- Compartments declared in public capability registry (their existence, not their contents).
- Compartment access patterns audited by Inspector General and Algorithmic Ombudsman.
- Anti-cross-compartment-correlation enforced cryptographically (per-RP UID extends to compartment level).
- Public aggregate reporting on compartment access.
- Citizens' Assembly review of compartment creation above certain sensitivity.
- Sunset clauses on compartments; renewal requires re-justification.

The discipline is that intelligence-grade architecture serves civilian purposes within civilian-rights frameworks, not that civilian platform becomes intelligence apparatus.

---

## 6. Specific high-confidence threats requiring named response

### 6.1 Hardware-implant supply chain

**Threat**: nation-state intercepts hardware shipment, implants persistent access, hardware deployed in sovereign-critical role.

**Response architecture**:

```
   [Vendor]
      │ shipped, sealed, signed packing manifest
      ▼
   [Sovereign customs cyber inspection]
      │ verifies tamper-evident seals + manifest cryptographic signature
      ▼
   [Independent receipt verification facility]
      │ optionally: X-ray, decap, side-channel analysis for tier-0 hardware
      ▼
   [Pre-deployment attestation]
      │ TPM measurement against known-good baseline
      ▼
   [Provisioning]
      │ workload identity bound to attested hardware
      ▼
   [Continuous attestation]
      │ runtime measurements verified against baseline at each boot and periodically
      ▼
   [Decommission]
      │ secure wipe with cryptographic destruction-of-evidence ceremony
```

For most-critical hardware (root HSMs, audit vault appliances), sovereign or treaty-consortium manufacturing where feasible; otherwise multi-vendor with independent verification.

### 6.2 Submarine cable interdiction

Per Companion 76, plus operational depth:

- Multi-cable diversity per region.
- Cross-orbit satellite backup (LEO + GEO) for non-bulk traffic.
- Per-cable real-time tap detection through optical time-domain reflectometry monitoring.
- Cable landing site physical security to defense-grade standards.
- Diplomatic protests on tap suspicion with technical evidence preserved cryptographically.
- Mutual aid with neighboring sovereigns for cable repair under treaty.

### 6.3 Election infrastructure (separate but proximate)

Per Companion 92, plus threat-specific depth:

- Election infrastructure physically and cryptographically separated from general CivicOS (separate keys, separate operators, separate audit).
- Election cyber defense coordinated with CivicShield under electoral authority command.
- Foreign interference detection: cross-border traffic to election infrastructure flagged.
- Disinformation: provenance-attested state communications differentiate genuine state speech from spoofs.
- Verifiability: paper trail, end-to-end verifiability mathematics where electronic voting chosen.
- Threat actor priority on election infrastructure during election windows; corresponding defensive surge.

### 6.4 Lawful intercept abuse

Per Companion 24 §4 plus operational depth:

- Lawful intercept hardware physically separate from general platform.
- Warrant verification cryptographic: warrant signed by judicial HSM, time-stamped by national TSA, expiration enforced by hardware quota enforcer.
- Quota enforcer is tamper-evident hardware that physically refuses to extract beyond statutory limits.
- Every extraction logged to audit vault with Inspector General real-time visibility.
- Subject notification automated post-warrant-expiry per statutory window unless judicial extension granted.
- Annual Inspector General review of every invocation; public aggregate report.
- Whistleblower channel inside lawful intercept system for officers concerned about misuse.

### 6.5 PKI compromise

If national PKI root keys are compromised, the platform's trust hierarchy collapses. Defense:

- Root keys offline; only intermediate CAs online.
- Multi-party signing for root operations (m-of-n with geographically distributed keyholders).
- Certificate transparency logs: every issued certificate published; rogue issuance detectable.
- Cross-signing with multiple roots reduces single-point-of-failure.
- Pre-positioned ceremony procedures and successor root infrastructure for rapid root rotation if compromise suspected.
- Time-bound certificates (90-day or shorter for most use cases) limit blast radius of any compromise.

### 6.6 Sovereign LLM weight exfiltration

National foundation models represent strategic capability. Their weights are crown jewels.

- Model weights at-rest encrypted with HSM-managed keys.
- Inference infrastructure attested: only attested infrastructure can decrypt weights for serving.
- Watermarking of model outputs to detect exfiltration via API extraction.
- Rate limits per consumer with anomaly detection for extraction patterns.
- Differential privacy on training data prevents membership inference.
- For most-sensitive sovereign LLMs, weights never leave sovereign-controlled compute fabric.

---

## 7. Cyber SOC operational architecture

The Security Operations Center (SOC) is the human-machine collaborative defense of CivicOS deployment.

### 7.1 Tiered SOC

- **Tier 1 (24/7 monitoring)**: alert triage, initial containment, escalation. Multiple geographic locations for resilience.
- **Tier 2 (specialized analysts)**: incident response, threat hunting, forensics.
- **Tier 3 (engineering)**: tool development, detection engineering, deep technical response.
- **Threat intelligence cell**: external threat intel integration, attribution work coordination.
- **Crisis cell**: activates for sev-0 incidents with cross-organizational coordination authority.

### 7.2 Detection stack

```
                              [Sovereign Threat Intel]
                                      │
   [Sigstore/SLSA  ─►   [SIEM]   ─►   [SOAR]   ─►   [Tier 1 Triage]
    attestation         (correlation,  (orchestration,
    verification]        retention)    automation)
        ▲                    ▲                        │
        │                    │                        ▼
   [EBPF runtime        [NetFlow/         [Tier 2/3 Response]
    introspection       PCAP/Zeek]              │
    (per-workload)]                             ▼
                                          [Forensic preservation
                                           + counter-attribution]
```

### 7.3 Threat hunting

Hypothesis-driven hunting on a continuous cadence:

- Weekly hunts against new threat intel.
- Monthly retro-hunts against historical telemetry with newly-known IOCs.
- Quarterly purple-team exercises with internal red team.
- Annual external red team engagement.

### 7.4 Detection engineering

Detection is code. Detection-as-code repository under version control with peer review. Detection rules attached to specific threat-model entries enable coverage reporting:

| ATT&CK Technique | Detection coverage | Last validated |
|---|---|---|
| T1059 (Command-and-scripting) | High (eBPF + behavioral) | 2030-Q3 |
| T1078 (Valid Accounts) | High (UEBA + JIT) | 2030-Q4 |
| T1195 (Supply Chain) | Medium (build attestation + dependency monitoring) | 2030-Q4 |
| ... | ... | ... |

Gaps in coverage are visible to leadership and prioritized in detection engineering roadmap.

### 7.5 Threat intelligence integration

Inbound:
- Sovereign intelligence community sharing (per appropriate clearance and legal framework).
- Multilateral CERT cooperation.
- Vendor threat intelligence subscriptions.
- Open-source intelligence (OSINT) from civil society research.

Outbound:
- IOCs shared with sovereign CERT.
- Sanitized indicators shared with multilateral CERTs.
- Vulnerability disclosures coordinated with affected vendors.
- Civil society engagement on civilian-impact threats.

---

## 8. Forensics and evidence preservation

Cyber forensics in CivicOS context must preserve evidence to standards suitable for sovereign judicial proceedings, multilateral attribution, and accountability investigations.

### 8.1 Evidence handling

- Chain of custody documented from collection.
- Cryptographic hash of evidence at collection.
- Multi-party witness for crown-jewel-related collections.
- Storage in tamper-evident container with audit logging.
- Independent verification capability preserved.

### 8.2 Memory forensics

- Live memory capture for active investigations (with appropriate authorization).
- Hibernation file and pagefile analysis for offline investigation.
- Volatility-class tooling on captured memory.

### 8.3 Network forensics

- Long-term flow data retention (NetFlow/IPFIX) per data retention policy.
- Full packet capture at strategic boundaries for tier-0 forensic window.
- Application-layer logs preserved per service.

### 8.4 Cloud forensics

- Cloud audit logs preserved in immutable storage.
- Cloud API call logs with workload identity attribution.
- Snapshot of affected workloads preserved in forensic-suitable format.

### 8.5 Cross-jurisdictional forensics

Cyber attacks span jurisdictions. Forensic cooperation under:
- Mutual Legal Assistance Treaties.
- Budapest Convention on Cybercrime where applicable.
- Bilateral cyber cooperation agreements.
- Planetary cyber protocols per Companion 15 §10.

Refusal patterns: foreign forensic requests honored only with local court order, and only for civilian/criminal matters not for political prosecution.

---

## 9. Sovereign red team

A sovereign-operated red team is essential. CivicOS supports its establishment.

### 9.1 Composition

- Civilian-cleared offensive security professionals.
- Rotation between defensive and offensive roles to prevent permanent specialization.
- Diversity of background (former military cyber, civilian security research, academic cryptography).
- Civil society advisory for civilian-impact considerations.

### 9.2 Operating model

- Scope authorized by sovereign cyber agency leadership.
- Targeting strictly defensive purpose (find vulnerabilities to fix, not to exploit).
- Civil liberties safeguards: red team cannot target civil society, journalists, or political opposition.
- Results reported through Inspector General review.
- Findings classified appropriately; remediation actioned with deadlines.

### 9.3 Engagement types

- Authorized assumed-breach scenarios (red team starts inside).
- Phishing campaigns (with appropriate legal framing).
- Physical access testing.
- Social engineering testing.
- Supply chain testing (within ethical bounds).
- Insider-threat scenario tests.

### 9.4 Cross-sovereign red team cooperation

By 2035 per Companion 10 §5: multilateral red teams under treaty for cross-border cooperation. Findings shared appropriately. Civilian focus maintained.

---

## 10. Anti-coercion architecture under cyber conflict

Companion 24 §8 (vendor coercion resistance) and Companion 94 §8 (procurement clauses) cover the policy framework. Architecture must enforce.

### 10.1 Cryptographic coercion-resistance

- Sovereign keys with sovereign HSMs that physically cannot export key material.
- Multi-party signing for crown-jewel operations: no single jurisdiction's keyholder can be coerced into unilateral action.
- Threshold cryptography for highest-sensitivity reads: multiple keyholders from independent legal jurisdictions must cooperate.
- Transparency logs: any unusual signing activity is publicly auditable, making secret coerced operations detectable.

### 10.2 Operational coercion-resistance

- Two-person rule for crown-jewel operations: coerced single operator cannot act alone.
- Geographic distribution of keyholders across jurisdictions with different coercive vulnerabilities.
- Sealed personal-protection procedures for keyholders to invoke if approached.
- Whistleblower channels with cryptographic anonymity allow coerced operators to report.

### 10.3 Legal coercion-resistance

- Vendor contracts include sovereign court order requirement.
- Foreign legal demands routed to Sovereign Trust Officer for review.
- Public reporting on coercion attempts (anonymized at appropriate level).
- Diplomatic response coordinated with sovereign foreign ministry.

### 10.4 Architectural coercion-resistance

- Key material distributed such that compromise of single jurisdiction cannot operate the platform.
- Source escrow with sovereign-controlled custodians enables continuation even if foreign-jurisdiction vendor is coerced into withdrawal.
- Open kernel pledge means fork is always available if commercial steward becomes compromised.

---

## 11. Cross-references to broader corpus

This companion intersects with:

- Companion 02 — generic threat model (this companion deepens it).
- Companion 24 — security/rights balance (this companion adds technical depth).
- Companion 78 — sovereign cybersecurity (this companion extends to nation-state threats).
- Companion 30 — crisis operations (this companion specifies cyber-specific operational response).
- Companion 11 — infrastructure evolution (architectural primitives this companion depends on).
- Companion 18 — sovereign LLM lifecycle (model-specific threats and protections).
- Companion 76 — submarine infrastructure (physical-layer threats).
- Companion 75 — sovereign space policy (orbital-layer redundancy).
- Companion 86 — Foundation operating model (Foundation security council coordination).
- Companion 122 — first hours after catastrophe (cyber-specific early response).

---

## 12. KPIs at intelligence-grade depth

| KPI | Target | Measurement |
|---|---|---|
| Mean time to detection (MTTD), nation-state actor | <24 hours from initial activity | SOC time-stamps validated by external audit |
| Mean time to containment (MTTC), tier-0 incident | <60 minutes | Incident records |
| Crown-jewel access without multi-party signature | 0 | Audit Vault hash chain verified daily |
| Supply chain attestation coverage, tier-0/1 | 100% SLSA L3+ | Build pipeline audit |
| Reproducible build coverage, kernel | 100% | Independent rebuild verification |
| Post-quantum cryptography coverage, new artifacts | 100% by 2035 | Cryptographic inventory |
| Detection coverage of MITRE ATT&CK tactics | >90% by 2030 | Coverage map |
| Time from CVE publication to patch deployment, tier-0 | <72 hours | Patch records |
| Insider behavioral anomaly false positive rate | <5% | Reviewed alerts |
| Annual external red team engagement | 1+ | Engagement records |
| Foreign coercion attempts refused | 100% (when without local court order) | Sovereign Trust Officer log |
| Lawful intercept warrant compliance | 100% | Inspector General audit |

These KPIs flow into the annual sovereignty audit per Companion 13 §3.2.

---

## 13. Forbidden in this domain (extends master forbidden list)

- Offensive cyber capabilities developed within CivicOS.
- Sovereign weaponization of platform for offensive operations.
- Civilian-targeting cyber operations using platform infrastructure.
- Foreign legal demands honored without local court order.
- Mass surveillance enabled through cyber defense apparatus.
- Targeting of journalists, civil society, opposition, judges, religious leaders, or constitutional officers through cyber means.
- Use of zero-day vulnerabilities offensively against any party.
- Sale or transfer of cyber capabilities to actors lacking compliance with civilian-protection norms.
- Foreign vendor coercion accommodated through architectural compromise.
- Sovereign red team operations targeting civilian infrastructure of other sovereigns.
- Use of attribution capabilities for political persecution.
- Suppression of civil-society security research.
- Criminalization of good-faith vulnerability disclosure.

This list grows with capability. It never shrinks.

---

## 14. The nation-state threat north star

A civilian platform under nation-state threat must serve citizens through whatever defensive posture protects them, while categorically refusing weaponization. CivicOS's threat model and defensive doctrine treat nation-state adversaries as serious, persistent, and capable — and treats civil liberties as equally serious, persistent, and non-negotiable. Both must hold together.

When a sovereign treats civilian infrastructure as instrument of national power against citizens or other states' citizens, the platform has been corrupted from its purpose. When a sovereign defends civilian infrastructure for citizens through disciplined defensive posture under genuine threat, the platform is doing what it was built to do.

The discipline at this depth is intelligence-grade. The civil liberties are constitutional. The civilian focus is doctrinal. The cooperation with multilateral norms is sustained. The refusal of weaponization is structural.

This is the highest-stakes threat domain CivicOS engages. Anything less than the deepest discipline abandons citizens to threats their platform was supposed to defend against — and to weaponization their platform was supposed to refuse.
