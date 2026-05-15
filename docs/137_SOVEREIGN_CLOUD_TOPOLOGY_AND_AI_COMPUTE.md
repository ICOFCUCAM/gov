# CivicOS — Sovereign Cloud Topology and AI Compute Sovereignty (Companion 137)

This companion specifies the physical, network, and compute topology that supports CivicOS at sovereign scale, with particular attention to AI compute sovereignty — national GPU/accelerator infrastructure, model-serving fabric, and the operational discipline that prevents foreign compute dependency from becoming foreign decision dependency. It complements Companion 04 (deployment and infrastructure), Companion 09 (AI policy and engineering), Companion 53 (sovereign LLM hosting), Companion 76 (cloud architecture for sovereign deployments), and Companion 86 (hardware supply chain) by going beyond standard cloud architecture into the specific topology, accelerator economics, and operational doctrine required for civilization-scale public infrastructure.

The thesis: **compute is sovereignty when decisions ride on it**. A nation that runs its identity, payments, courts, health, education, taxation, and emergency coordination on AI inference fabric owned, scheduled, and updated by foreign actors has not preserved sovereignty by writing a data residency clause — it has rented its statecraft. CivicOS therefore designs cloud and compute topology assuming: (a) the sovereign must be able to operate baseline services with zero foreign compute reachable; (b) AI accelerator capacity must be domestically planned, partially domestically built, and operationally segregated; (c) burst capacity into trusted partners is acceptable for non-critical workloads only; (d) the model weights, the inference scheduler, the runtime, and the supply chain attestation must all be controllable from inside the sovereign perimeter.

The discipline: sovereign topology in three concentric perimeters (Crown / National / Edge); national AI compute plan with multi-year accelerator procurement; segregated AI fabric per Decision Class (A/B/C/D/E from Companion 09); hardware root of trust on every accelerator; supply chain attestation at silicon → board → server → rack → cluster; sovereign model registry; cross-border burst only for declassified-A/B workloads; full operational degradation runbook for "all foreign compute lost" scenario.

---

## 1. Principles

1. **Compute is statecraft.** Treat accelerator inventory the way ministries treat strategic reserves.
2. **Three perimeters, hard boundaries.** Crown / National / Edge. Each with its own supply chain, classification, network plane, attestation regime.
3. **Decision Class drives placement.** Class D and E never leave Crown. Class C inside National. Class A/B may use trusted burst.
4. **Domestic capacity floor.** Per Companion 53, a published floor of accelerator FLOPS the sovereign maintains under its own control, even when cheaper foreign capacity is available.
5. **Diversity over optimization.** Multi-vendor silicon, multi-architecture, multi-foundry where possible. Optimization that produces single-vendor dependency is rejected.
6. **Attest everything.** From silicon serial number to running inference container, the chain is signed and verifiable.
7. **Replaceability of substrate.** Models, runtimes, schedulers, and orchestration designed so any layer can be replaced within a published window.
8. **Graceful degradation, not collapse.** If foreign compute disappears, services degrade along a published gradient — they do not stop.
9. **Anti-lock-in at the procurement level.** Contracts forbid telemetry-out-by-default, forbid remote disable, require source escrow for control-plane firmware where feasible.
10. **Compute equity inside the sovereign.** Cities and rural regions get latency-appropriate compute. AI services are not a capital-city luxury.

---

## 2. The three perimeters

```
                          PLANETARY (untrusted by default)
                     ┌──────────────────────────────────────┐
                     │                                      │
                     │   Hyperscaler / Foreign Cloud        │
                     │   (burst only, Class A/B only,       │
                     │    encrypted, key-escrowed locally)  │
                     │                                      │
                     └─────────────────┬────────────────────┘
                                       │
                                  [DIODE / CDS]
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        │  NATIONAL PERIMETER          │                              │
        │  (Class A, B, C workloads)   │                              │
        │  - 2-4 sovereign regions     │                              │
        │  - Multi-AZ per region       │                              │
        │  - Domestic operator         │                              │
        │  - Citizen-facing services   │                              │
        │  - Standard cloud stack      │                              │
        │                              │                              │
        │   ┌──────────────────────────┴────────────────────────┐     │
        │   │                                                   │     │
        │   │  CROWN PERIMETER                                  │     │
        │   │  (Class D + E, crown jewels)                      │     │
        │   │  - Identity root, KMS root, Audit Vault root      │     │
        │   │  - Sovereign LLM weights for Class D/E            │     │
        │   │  - Election infrastructure (sealed windows)       │     │
        │   │  - Threshold ceremonies and recovery quorum       │     │
        │   │  - Air-gappable, geographically dispersed,        │     │
        │   │    operated by constitutional officer oversight   │     │
        │   │                                                   │     │
        │   └───────────────────────────────────────────────────┘     │
        │                                                              │
        └──────────────────────────────────────────────────────────────┘

                          EDGE PERIMETER
                          (Civic Cells, kiosks, agent devices, IVR/USSD POPs,
                           rural micro-DCs, mobile field units)
                          - 4G/5G/satellite/mesh
                          - CRDT sync, offline-tolerant
                          - Limited compute, no Class D/E
```

### 2.1 Crown perimeter

**Workload**: invariant-bearing systems — identity root signing, KMS root, Audit Vault root anchors, sovereign LLM weights for Class D/E, election ceremonies, threshold cryptography.

**Topology**: minimum two geographically dispersed sites, each with independent power, independent uplink, independent operational staff. Each site air-gappable on a switch operated by Sovereign Trust Officer custody.

**Compute**: domestically procured where feasible. Where not feasible, dual-sourced across geopolitically diverse vendors. Hardware Security Modules (HSM) physically held by constitutional officer custody, not by cloud operator.

**Network**: traffic into Crown traverses a cross-domain solution (CDS) with diode-class controls. Diode lets attestation and audit out; lets policy and signed model weights in; blocks everything else.

**Operations**: per Companion 28 §11, dual-control for any Crown-perimeter change. Per Companion 13 §3, constitutional officer signoff on Crown topology changes.

### 2.2 National perimeter

**Workload**: citizen-facing services, AI Decision Class A/B/C, payments rails, public health, public education, taxation, judicial case management.

**Topology**: 2–4 sovereign regions, multi-AZ. Each region operated under sovereign jurisdiction by a domestic operator or a sovereign-licensed cloud. Each region is a full failover peer of every other region.

**Compute**: standard sovereign cloud stack (Companion 76). GPU/accelerator pools sized per the national AI plan (§4 below). Inference and training segregated.

**Network**: domestic backbone with peering at sovereign-controlled IXPs. International transit only through sovereign-licensed cable landings with attested operators.

**Operations**: standard cloud ops. CI/CD with Sigstore+SLSA L3+. Multi-tenant with hard tenancy at namespace+network policy+VPC boundary.

### 2.3 Edge perimeter

**Workload**: Civic Cells per Companion 04 §6, agent-network devices, kiosks, IVR/USSD POPs, rural micro-data-centers, mobile field units (mobile court, mobile clinic, mobile registry).

**Topology**: physically dispersed, intermittently connected. CRDT-based local state per Companion 07 §9. Solar + battery edge kits where grid unreliable.

**Compute**: small CPU + occasional GPU/NPU for local-only Class A inference (e.g., on-device speech recognition for IVR, OCR for document capture, signature verification). Never Class D/E. Never holds master keys.

**Network**: 4G/5G/satellite/long-range mesh. Intermittent acceptable; design assumes hours-to-days disconnection.

**Operations**: zero-touch provisioning with hardware-rooted identity. Remote attestation before workload assignment. Fleet management with rollback-by-default.

---

## 3. Cross-perimeter data and control flows

```
   Crown                    National                   Edge                   Planetary
   ┌───┐                    ┌───┐                      ┌───┐                  ┌───┐
   │ K │ ─signed-policy─▶   │ N │  ─signed-policy─▶    │ E │                  │ P │
   │ R │                    │ A │                       │ D │                  │ L │
   │ O │ ◀─attest-out─       │ T │  ◀─attest-out─       │ G │                  │ A │
   │ W │                    │ I │                       │ E │                  │ N │
   │ N │                    │ O │  ─AI inference req─▶  │   │  ◀─burst class─  │   │
   └───┘                    │ N │  ◀─AI inference resp─ │   │   A/B only       │   │
     ▲                      │ A │                       │   │                  │   │
     │                      │ L │  ─receipts───────────▶│   │                  │   │
   threshold                └───┘                       └───┘                  └───┘
   ceremonies                                            │                       ▲
   (in person)                  ◀──CRDT sync───────────  │                       │
                                                                              hard
                                                                            airgap
                                                                          for D/E
```

**Rules of flow**:

- **Crown→National**: signed policy, signed model weights, signed firmware. Out-of-band attestation of artifacts.
- **National→Crown**: attestation telemetry, audit anchors, custody events. No bulk data into Crown.
- **National→Edge**: signed configuration, signed model weights (Class A/B small models only), receipt envelopes.
- **Edge→National**: telemetry, receipts, CRDT deltas.
- **National↔Planetary**: only for Class A/B burst; only via sovereign-licensed gateway; only with key escrow held in Crown; only with per-call attestation.
- **Edge↔Planetary**: forbidden by default.
- **Crown↔Planetary**: forbidden absolutely.

---

## 4. National AI compute plan

### 4.1 The plan as a public artifact

Every sovereign deployment publishes (and updates annually) a **National AI Compute Plan**: a multi-year accelerator inventory and procurement schedule that names:

- Current installed FLOPS by precision (FP32, FP16, BF16, FP8, INT8).
- Memory bandwidth and HBM capacity by class.
- Interconnect topology (NVLink/CXL/InfiniBand/Ethernet) at each cluster.
- Power envelope and cooling envelope per site, with sustainability disclosure per Companion 49.
- Procurement roadmap with quantities, vendors, and delivery windows.
- Domestic capacity floor (the FLOPS the sovereign commits to maintain regardless of foreign supply).
- Sovereign workload mix (training, fine-tuning, inference, embedding, batch, real-time).

The plan is public so that citizens, parliament, civil society, and constitutional officers can debate whether the sovereign is over- or under-investing.

### 4.2 Capacity sizing

```
                                Sovereign AI Compute Stack
        ┌──────────────────────────────────────────────────────────────┐
        │                                                              │
        │   ┌──────────────────────────┐                               │
        │   │  Training (large)        │  ← strategic, infrequent      │
        │   │  Multi-rack, multi-week  │     domestic or trusted-multi │
        │   └──────────────────────────┘                               │
        │   ┌──────────────────────────┐                               │
        │   │  Fine-tuning             │  ← per-domain models          │
        │   │  Rack-scale, hours-days  │     ministry-funded           │
        │   └──────────────────────────┘                               │
        │   ┌──────────────────────────┐                               │
        │   │  Inference (large)       │  ← Class B/C citizen services │
        │   │  Multi-GPU, sub-second   │     near user                  │
        │   └──────────────────────────┘                               │
        │   ┌──────────────────────────┐                               │
        │   │  Inference (small)       │  ← Class A on-device or edge  │
        │   │  Single GPU/NPU          │     low-latency                │
        │   └──────────────────────────┘                               │
        │   ┌──────────────────────────┐                               │
        │   │  Embedding / retrieval   │  ← search, classification     │
        │   │  CPU + small accelerator │     bulk                      │
        │   └──────────────────────────┘                               │
        │                                                              │
        └──────────────────────────────────────────────────────────────┘
```

Capacity is planned per layer, not as a single FLOPS number. A nation might have abundant inference but limited training; that is acceptable and explicit, not hidden.

### 4.3 Domestic capacity floor

The floor is the published commitment that, regardless of foreign supply, the sovereign retains at least:

- Sufficient inference capacity to serve Class A and B citizen services at degraded-but-functional throughput.
- Sufficient training capacity to retrain Class C policy-affecting models on a published refresh interval.
- Sufficient HSM and KMS root capacity to operate identity and payments under siege.
- Sufficient batch capacity to run quarterly constitutional officer audits.

The floor is sized so that loss of foreign cloud, foreign GPU, foreign software vendor, and foreign network transit simultaneously still leaves the sovereign able to operate baseline services within a published degradation envelope.

### 4.4 Burst capacity (carefully)

Where capacity beyond the floor is needed, sovereigns may burst into trusted partner capacity:

- Only Class A and Class B workloads.
- Only with end-to-end encryption, sovereign-held keys.
- Only with per-call attestation.
- Only to operators under sovereign-licensed terms (cf. Companion 76 §9).
- Burst capacity tracked as a public number; reduction commitments published.

Burst capacity is a convenience, not a foundation. Citizen services that ride on burst must be reclassifiable down to floor capacity within minutes.

---

## 5. Accelerator topology

### 5.1 Cluster layout

```
                Sovereign Training/Inference Cluster (one example pod)
        ┌──────────────────────────────────────────────────────────────────┐
        │                                                                  │
        │   Spine ────────────┬──────────────┬──────────────┬─────────     │
        │   (400/800GbE       │              │              │              │
        │    or IB-NDR/XDR)   │              │              │              │
        │                     │              │              │              │
        │   Leaf [L1]       Leaf [L2]      Leaf [L3]      Leaf [L4]        │
        │     │                │              │              │             │
        │   ─┴──┐            ─┴──┐          ─┴──┐          ─┴──┐           │
        │   Rack 1            Rack 2         Rack 3         Rack 4         │
        │   ┌────┐            ┌────┐         ┌────┐         ┌────┐         │
        │   │S1  │            │S5  │         │S9  │         │S13 │         │
        │   │ ⋯  │            │ ⋯  │         │ ⋯  │         │ ⋯  │         │
        │   │S4  │            │S8  │         │S12 │         │S16 │         │
        │   └────┘            └────┘         └────┘         └────┘         │
        │   each server = 8x accelerator, dual-NIC, NVMe local,            │
        │   TPM 2.0 / sovereign HRoT, BMC on isolated mgmt VLAN            │
        │                                                                  │
        │   Storage tier: parallel filesystem (Lustre/GPFS/Weka/Ceph),     │
        │                 staged through quarantine on ingest              │
        │   Control plane: scheduler (Slurm / Kubernetes+Volcano /         │
        │                  Run:AI-equivalent) with sovereign mods          │
        │   Observability: per-rack power, per-GPU thermals, per-job       │
        │                  energy, per-tenant fairness                     │
        │                                                                  │
        └──────────────────────────────────────────────────────────────────┘
```

### 5.2 Tenancy

- **Strict tenant isolation**. Per-tenant queues, per-tenant network policy, per-tenant filesystem quota.
- **Per-job confidential compute** where supported (e.g., confidential VMs / TEE accelerators for Class C+ workloads).
- **No multi-tenant on Crown clusters**. Crown clusters host only one logical tenant: the sovereign itself.

### 5.3 Scheduling

The sovereign scheduler enforces:

- Decision-Class-aware placement (D/E → Crown only; C → National only; A/B → any).
- Fair-share across ministries and civic programs.
- Pre-emption rules published; emergencies (per Companion 27) preempt routine.
- Energy budget per tenant (Companion 49); over-budget tenants throttle, not bill-pay through.
- No silent placement on foreign hardware. If a job lands on burst capacity, the receipt records that and the user sees it.

### 5.4 Diversity targets

Each sovereign deployment publishes accelerator diversity targets — e.g., "no single vendor exceeds 60% of national FLOPS by year N." Diversity preserves negotiating leverage and reduces blast radius of any single vendor's coercion or compromise.

---

## 6. Hardware root of trust and attestation

### 6.1 The chain

```
      Silicon
        │
        │  (vendor attestation key, embedded at fab; verified at receipt)
        ▼
      Board
        │
        │  (BMC firmware signed; PCR measurements at boot)
        ▼
      Server
        │
        │  (TPM 2.0 / DICE / sovereign HRoT; secure boot enforced)
        ▼
      Cluster node
        │
        │  (remote attestation to sovereign attestation service before
        │   workload assignment; node enrolled in SPIFFE/SPIRE)
        ▼
      Workload (container/VM)
        │
        │  (image signed with Sigstore; SLSA L3+ provenance; runtime
        │   policy applied; per-workload SPIFFE SVID)
        ▼
      Inference call
                (per-call receipt anchored to Audit Vault)
```

### 6.2 Sovereign-controlled keys

Per Companion 86:

- Sovereign holds attestation roots for its own fleet.
- Vendor attestation accepted as one signal, not the only signal.
- Sovereign HRoT (e.g., open-source Caliptra-class, sovereign-modified) deployed where feasible.
- Crown clusters use sovereign HRoT exclusively.

### 6.3 Continuous attestation

- Boot-time attestation, then re-attestation on a schedule (e.g., hourly).
- Drift in PCR measurements triggers quarantine and forensic capture.
- Attestation events stream to SOC (Companion 136 §7).

---

## 7. Model serving fabric

### 7.1 Sovereign model registry

Every model that runs in CivicOS is registered in the **Sovereign Model Registry**:

- Model ID, version, base weights hash, fine-tune dataset attestation.
- AIBOM per Companion 09 §7.
- Decision Class assignment (A/B/C/D/E) with charter reference.
- Authorized deployment perimeters (Crown / National / Edge).
- Authorized requesters and authorized purposes.
- Refresh and retirement schedule.
- Constitutional officer signoff for Class C+ deployments.

### 7.2 Serving architecture

```
        Citizen / Officer / System
                │
                ▼
        ┌──────────────────┐
        │  CivicBus API GW │  ← OIDC/FAPI 2.0 auth, decision-class router
        └────────┬─────────┘
                 │
        ┌────────▼─────────┐
        │  Policy engine   │  ← OPA-class; Decision Class enforcement,
        │                  │     purpose binding, consent check, rate limit
        └────────┬─────────┘
                 │
        ┌────────▼─────────┐
        │  Model Registry  │  ← which model is authoritative for this
        │  + dispatcher    │     request, in this perimeter, right now
        └────────┬─────────┘
                 │
        ┌────────▼──────────────────────────────────────┐
        │  Inference fabric                             │
        │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │
        │  │ Crown    │ │ National │ │ Edge     │       │
        │  │ cluster  │ │ cluster  │ │ accel.   │       │
        │  └──────────┘ └──────────┘ └──────────┘       │
        └────────┬──────────────────────────────────────┘
                 │
        ┌────────▼─────────┐
        │  Receipts + Audit│  ← per-call receipt: model, version, inputs
        │  Vault           │     hash, output hash, perimeter, decision
        │                  │     class, citizen-visible flag
        └──────────────────┘
```

### 7.3 Deterministic recall

Per Companion 78, every Class C+ inference call must be deterministically replayable for audit. This requires:

- Exact model weights hash recorded.
- Exact runtime version recorded.
- Exact input hash recorded.
- Deterministic decoding settings (temperature, top-k, etc.) recorded.
- Anchored to Audit Vault.

For Class A/B, deterministic recall not strictly required but model-version + input-hash are still logged.

### 7.4 Model retirement

- Retired models remain in registry with retirement reason.
- Inference traffic against retired model rejected at policy engine.
- Audit replay against retired model still possible (weights archived).

---

## 8. AI compute sovereignty: the procurement doctrine

### 8.1 Procurement principles

- **Multi-vendor mandate.** No single accelerator vendor exceeds published share threshold (typical: 60%; sensitive sovereigns may set lower).
- **Open instruction sets where feasible.** Prefer architectures with open documentation; treat closed-ISA as risk to manage.
- **Source escrow.** For driver, firmware, and microcode where feasible; held in sovereign-controlled escrow with right to use under defined trigger events.
- **No remote disable.** Contracts forbid vendor remote disable of capability. If a "remote disable" feature exists, it must be operable only by sovereign personnel.
- **Telemetry-out by exception, not default.** No vendor telemetry exits sovereign perimeter without sovereign approval and content review.
- **Supply chain attestation.** Per Companion 86, attestation required at silicon serial number, board, server, rack levels.

### 8.2 The "no remote kill" clause

The procurement standard forbids capabilities that allow a vendor to disable, throttle, or alter accelerator behavior remotely without sovereign authorization. Where the silicon physically contains such a capability, contracts require disclosure, mitigations require attestation that the capability is disabled, and Crown procurement excludes the silicon.

### 8.3 The "no model-weight phone-home" clause

Inference runtimes used in CivicOS must not phone home model usage, prompts, or outputs to vendor cloud. Vendor "improvement telemetry" defaults disabled and forbidden in CivicOS deployment.

### 8.4 Foundry diversity

Where possible, accelerator inventory should include parts manufactured at multiple foundries. This is a long-cycle goal (foundry capacity is global oligopoly); the doctrine names it as a target so that procurement is steered, even if not always achievable, away from single-foundry dependence.

### 8.5 Domestic fabrication participation

For nations with industrial capacity to participate in fabrication or packaging, CivicOS recommends accelerator procurement coupled with domestic packaging, testing, and at-the-very-least final-assembly capability. The point is not autarky; it is operational presence in the supply chain such that the sovereign can verify what arrived.

---

## 9. Compute equity inside the sovereign

### 9.1 The principle

AI services that improve citizen life should not concentrate in the capital. Latency-appropriate compute belongs in every region the sovereign serves.

### 9.2 Mechanisms

- **Regional inference points of presence (POPs).** Inference fabric distributed across regions so latency-sensitive citizen services (IVR, real-time translation, accessibility services) work in rural areas.
- **Edge accelerators for offline-first.** Per Companion 67 §4.3, Civic Cells include small accelerators for on-device speech and OCR, sized for off-grid operation.
- **Bandwidth subsidization for civic AI.** Where bandwidth cost would otherwise deny rural citizens access to AI-mediated services, sovereign subsidizes the bandwidth or moves inference closer.
- **Rural pre-deployment.** New AI-mediated services pilot in rural and underserved regions first, not last. If a service doesn't work for a rural citizen on a flip phone via USSD, it isn't ready for capital deployment.

### 9.3 Discipline

- Anti-capital-centric design.
- Per-region performance reporting per Companion 56 §6.
- Civil society engagement on regional AI access (Companion 74).

### 9.4 Forbidden

- AI services available only in capital.
- AI services priced beyond rural citizen reach.
- Discrimination in AI service quality by region.

---

## 10. Cooling, power, and sustainability

### 10.1 The constraint

AI compute is power-hungry. Per Companion 49, sustainability is not optional. CivicOS sovereign cloud must publish:

- Power Usage Effectiveness (PUE) per site.
- Carbon intensity of compute per kWh.
- Water usage for cooling.
- Heat re-use programs where applicable (district heating in cold climates, etc.).
- Roadmap to lower carbon intensity year over year.

### 10.2 Climate-appropriate siting

Compute siting respects local climate:

- Hot climates favor immersion cooling, dry coolers, evaporative cooling with water-use disclosure.
- Cold climates exploit free cooling and heat re-use.
- Coastal sites consider sea-water cooling with environmental impact assessment.

### 10.3 Renewable matching

Where grid permits, compute scheduling can match renewable availability — large batch training scheduled when renewable supply is high. This is a research-grade scheduling feature; it does not compromise citizen-service latency.

### 10.4 Discipline

- Per Companion 49: ecological honesty in compute footprint.
- Per Companion 134: physical infrastructure resilience.
- Anti-greenwashing.

---

## 11. Operational doctrine: "all foreign compute lost" exercise

### 11.1 The exercise

Annually, every sovereign deployment runs a **Foreign Compute Lost** exercise: a tabletop simulation that posits sudden loss of access to:

- All hyperscaler cloud capacity.
- All foreign-vendor cloud-hosted SaaS services CivicOS depends on.
- All vendor-mediated firmware updates.
- All vendor licensing servers.
- All foreign accelerator support and replacement parts.

### 11.2 The criteria

Citizen-facing services must continue at the published degradation envelope:

- Identity, payments, vital records, emergency services: 100% (within domestic capacity).
- Routine ministry services: ≥80% (delays acceptable; loss-of-service not).
- AI-mediated services (Class A/B): ≥60% (degraded model quality acceptable).
- AI-mediated services (Class C): manual fallback ready (per Companion 27 §6).
- AI-mediated services (Class D/E): unaffected (these were never on foreign compute).

### 11.3 Outputs

The exercise produces:

- Gap analysis: which services degraded below threshold; why.
- Procurement priorities: where domestic capacity needs to grow.
- Runbook updates: per Companion 27.
- Public report: per Companion 31 §8.

### 11.4 The point

The exercise is not a prediction. It is a discipline. The sovereign that runs it annually keeps the option of independence; the sovereign that does not loses the option silently over years.

---

## 12. Inter-cluster federation

### 12.1 Within sovereign

Multi-region clusters federate via:

- Sovereign-controlled DNS and service discovery (no foreign managed DNS for citizen-facing services).
- SPIFFE/SPIRE federation across clusters.
- Cross-cluster scheduler aware of decision-class placement constraints.
- Audit Vault replication with quorum across regions.

### 12.2 Across sovereigns

Per Companion 15 and 76, cross-sovereign federation:

- Voluntary, per-treaty.
- Each sovereign keeps its own keys.
- Federation surface is the CivicBus inter-realm gateway; not the cluster.
- No shared scheduler across sovereigns. Each sovereign schedules its own.

### 12.3 Discipline

- Anti-supranational-scheduler.
- Anti-hidden-dependency.
- Honest about federation surface.

---

## 13. Model lifecycle and weight custody

### 13.1 Weights as classified assets

Model weights for Class C+ are treated as classified assets:

- Stored encrypted at rest in sovereign-controlled KMS.
- Replicated across Crown sites under threshold cryptography (e.g., k-of-n shares).
- Loaded into accelerator memory only on attested nodes.
- Never written to disk in plaintext outside Crown.

### 13.2 Training data provenance

Per Companion 09 §6:

- Training data provenance recorded per source.
- Consent regime for citizen-derived data recorded.
- Deletion propagation: if a citizen's data is deleted under data-rights, downstream model retraining schedule includes removal.

### 13.3 Sovereign LLM weight loss scenario

Loss of sovereign LLM weights to adversary is a Crown-perimeter incident (Companion 136 §6.6). Response includes:

- Immediate notification to constitutional officers.
- Threshold ceremony to revoke compromised key material.
- Retrain on attested clusters with rotated keys.
- Public disclosure within published window.

---

## 14. Cross-references

- Companion 04 (deployment and infrastructure) — base topology.
- Companion 09 (AI policy and engineering) — Decision Class definitions, AIBOM.
- Companion 49 (sustainability) — energy and ecology.
- Companion 53 (sovereign LLM hosting) — weight custody.
- Companion 67 (offline-first edge) — edge perimeter detail.
- Companion 76 (cloud architecture) — base cloud doctrine.
- Companion 78 (deterministic recall) — replayable inference.
- Companion 86 (hardware supply chain) — attestation.
- Companion 134 (physical infrastructure loss and recovery) — siting.
- Companion 136 (nation-state threat model) — adversary alignment.

---

## 15. KPIs

| KPI | Indicator |
|---|---|
| Crown perimeter attested | 100% of nodes, continuous |
| Decision Class placement violation rate | Zero |
| Domestic accelerator FLOPS floor | At or above published commitment |
| Single-vendor accelerator share | Below published threshold |
| Foreign-compute-lost exercise | Annual; gaps closed within published window |
| Burst-capacity workloads | Only Class A/B; ratio published |
| Continuous attestation coverage | All compute, all sites |
| Model registry coverage | 100% of running models |
| Deterministic recall (Class C+) | 100% replayable |
| Regional compute equity | Latency target met in all regions |
| PUE / carbon / water | Published quarterly, trending right |
| Source escrow coverage | For control-plane firmware where feasible |

---

## 16. Forbidden in sovereign cloud and AI compute

CivicOS will not:

- Permit Class D or E workloads outside Crown perimeter.
- Permit any workload on foreign compute without sovereign-held keys and attestation.
- Allow vendor remote-disable of accelerator capability without sovereign authorization.
- Permit vendor telemetry exfiltration by default.
- Allow single-vendor dependency beyond published threshold.
- Permit inference fabric without per-call receipts and audit anchoring.
- Allow model deployment outside the sovereign model registry.
- Permit Class C+ models without deterministic recall.
- Allow burst into untrusted partner capacity for any workload.
- Permit Crown perimeter operation without dual-control.
- Allow capital-centric AI service distribution.
- Permit accelerator procurement without supply chain attestation.
- Allow training-data provenance gaps for Class C+ models.
- Permit model weight handling without classified-asset discipline.
- Allow sovereign cloud operation without the annual "all foreign compute lost" exercise.

This list grows; it does not shrink.

---

## 17. The sovereign cloud and AI compute north star

Compute is statecraft. CivicOS designs cloud topology in three perimeters — Crown, National, Edge — and AI compute as a strategic national resource under a published, public plan. Decision Class drives placement. Domestic capacity floor is published and defended. Multi-vendor diversity is doctrine, not preference. Attestation runs from silicon to inference call. Burst into foreign capacity is bounded and visible. The annual "all foreign compute lost" exercise keeps the option of independence alive.

When CivicOS becomes a thin client on foreign accelerator fabric, scheduled by foreign software, attested by foreign keys, with model weights held by foreign vendors — it has surrendered the substrate on which all other invariants ride. Capability without sovereign compute is rented statecraft, and rented statecraft is statecraft on someone else's calendar.

When the platform runs on sovereign-planned compute, with attested supply chain, segregated by Decision Class, distributed across regions with equity, and capable of degraded-but-functional operation under maximal foreign loss — it earns the right to be called sovereign infrastructure.

The discipline is daily. The perimeters are real. The plan is public. The floor is defended. The diversity is enforced. The exercises are run.

Compute is sovereignty when decisions ride on it. The platform's compute posture is the platform's sovereignty posture. Anything less surrenders the substrate while keeping the ceremony.
