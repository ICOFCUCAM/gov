# CivicOS — Reference Architecture (Companion 01)

This document zooms into the architecture sketched in §5 of the Master Blueprint. It is intended for principal engineers and architects building the platform.

---

## 1. Logical view

### 1.1 Bounded contexts

CivicOS decomposes into the following contexts (Eric Evans-style):

| Context | Owner | Aggregates | Primary store |
|---|---|---|---|
| Identity | Identity Authority | Person, Entity, Credential, AuthSession | Postgres + ABIS appliance |
| Wallet | Citizen | Wallet, Credential, Consent, Document | Encrypted device + sync cell |
| Consent | Identity Authority | ConsentArtefact, Purpose, Scope | Postgres + ledger anchor |
| Payments | Treasury | Account, Ledger, Settlement, Disbursement | Postgres (event-sourced) + RTGS |
| Trust | Trust Services Authority | Certificate, Signature, Timestamp, RevocationList | HSM + Postgres + transparency log |
| Workflow | Per-module | ProcessInstance, Task, Decision | Temporal store |
| Rules | AI Authority + module | Ruleset, Version, EvaluationResult | Git + Postgres |
| Documents | Document Authority | Document, Version, Classification | Object store + Postgres metadata |
| Notifications | Comms Authority | Campaign, Message, DeliveryReceipt | Postgres + queue |
| AuditVault | Auditor General | EventChain, MerkleRoot | Append-only log + ledger anchor |
| Search | Platform | IndexShard, QueryAuditEntry | OpenSearch |
| Registries (per-domain) | Each ministry | Title, Permit, License, Vehicle, etc. | Postgres + lineage |
| Modules | Each ministry | Domain aggregates | Postgres + per-module schemas |
| AI Plane | AI Authority | Model, Agent, EvalRun, Transcript | Model registry + inference fleet |

Each context owns its data. Cross-context reads happen through APIs or events on CivicBus, never via direct DB joins.

### 1.2 Component-to-context mapping

Each microservice belongs to exactly one bounded context. A module like `civic-tax` may contain 6–12 services, all within the Tax context, plus published consumer relationships to Identity, Payments, Documents, Notifications, and AuditVault.

### 1.3 Repository topology

- One mono-org per kernel and per module family.
- Inside each, services live in their own folders with shared libraries vendored explicitly.
- Cross-cutting `civic-spec/` repo holds OpenAPI/Protobuf schemas with semantic-version tags.
- `civic-deploy/` repo holds Helm charts and ArgoCD applications.
- `civic-policy/` repo holds OPA/Rego, Cedar, Kyverno policies.

### 1.4 Versioning

- Kernel uses calendar-versioned LTS branches (e.g., 2026.01-LTS, supported 5 years).
- Modules use semver with explicit kernel compatibility ranges.
- API contracts use a deprecation calendar with at minimum 12 months overlap.

---

## 2. Process view

### 2.1 A representative request: "Citizen pays property rates"

```
[Citizen on Civic Wallet]
   ├─ presents wallet credential (DID + VC) to CivicCity payment endpoint
   |    via API gateway; mTLS + OAuth-FAPI access token.
   ├─ CivicCity property service resolves citizen → property → outstanding bill
   |    (calls property registry locally; calls Identity for entity resolution
   |    only if needed, with consent token).
   ├─ Returns invoice payload, signed with municipality's signing cert.
   ├─ Wallet displays signed invoice; user confirms.
   ├─ Wallet calls CivicPay payment-init service
   |    with invoice reference, source wallet, biometric L3 auth claim.
   ├─ CivicPay validates, debits, credits municipality sub-account on TSA,
   |    publishes payment.settled event.
   ├─ CivicCity property service consumes event, marks invoice paid,
   |    emits property.bill.paid event, sends signed receipt to wallet.
   ├─ Audit Vault receives signed action records from each service.
   └─ Notifications service sends tax-receipt SMS fallback to alternate channel.
```

End-to-end target: <2.5 seconds at p95, including biometric.

### 2.2 Saga pattern

Cross-context workflows use Temporal-driven sagas with compensating actions:

- Disbursement saga: reserve funds → KYC check → AML screen → debit TSA → credit wallet → notify; compensation cancels reservation if any step fails.
- New business registration saga: name reservation → directors KYC → tax registration → social security registration → bank account opening offer → wallet provisioning.

### 2.3 Idempotency

Every public mutation accepts an `Idempotency-Key`. Event consumers are at-least-once with deterministic deduplication keyed on event ID + handler version.

---

## 3. Deployment view

### 3.1 Reference physical topology (mid-size country)

```
                        +---------------------------+
                        |  Sovereign Cloud Region A |
                        |  (capital, primary)       |
                        |                           |
                        |  - Kernel cluster (3 AZ)  |
                        |  - Registries primary     |
                        |  - HSM cluster            |
                        |  - Audit Vault A          |
                        +-----------+---------------+
                                    |
                          private fiber + IPsec
                                    |
   +----------------+   +-----------+-----------+   +----------------+
   | Region B       |   | Region C (DR)         |   | Air-gapped     |
   | (commercial    |   | (geographically       |   | secure enclave |
   |  capital)      |   |  diverse, warm)       |   | (defense, BC)  |
   |                |   |                       |   |                |
   | Module clusters|   | Replicated registries |   | Read-replica   |
   | per ministry   |   | Audit Vault B         |   | of selected    |
   +----------------+   +-----------+-----------+   | registries     |
                                    |               +----------------+
                                    |
                       +------------+------------+
                       |   Edge cells (per         |
                       |   province / city)         |
                       |   K3s, local registries,   |
                       |   sync to Region A         |
                       +----------------------------+
```

### 3.2 Cluster sizing reference

| Tier | Control plane | Workers | DB nodes | HSM |
|---|---|---|---|---|
| Edge cell | 3 nodes | 6 nodes (32 vCPU each) | 3 (Patroni) | virtual w/ rotation to central |
| City cell | 3 | 18 | 5 (Patroni) | physical (network-attached) |
| Ministry cell | 5 | 30+ | 6+ (CockroachDB cluster) | physical cluster |
| National region | 5 | 100+ | 9+ + analytics | physical cluster + enclave |

### 3.3 Data replication

- OLTP: synchronous in-region (Patroni), async cross-region.
- Object storage: multi-site erasure coding.
- Audit log: synchronous append to two AZs, async to third region; periodic Merkle root anchored to ledger.
- Backups: daily full + hourly incremental, immutable WORM bucket with separate KMS, 30-day point-in-time + 7-year cold archive.

### 3.4 Disaster recovery tiers

| Tier | Examples | RTO | RPO |
|---|---|---|---|
| 0 | CivicID auth, CivicPay rails | 15 min | 30 s |
| 1 | Kernel APIs, Registries | 1 hour | 5 min |
| 2 | Ministry modules | 4 hours | 15 min |
| 3 | Analytics, marketplace | 24 hours | 1 hour |

DR drills: monthly tier-0, quarterly tier-1, semi-annual tier-2, annual full.

---

## 4. Data view

### 4.1 Lake/warehouse architecture

```
events from CivicBus
    └─ raw bronze (Iceberg, append, immutable)
           └─ silver (cleaned domain models, SCD2)
                  └─ gold (KPI marts, semantic layer)
                         └─ analytics dashboards / federated queries
```

### 4.2 Query engines

- **OLTP**: Postgres / CockroachDB.
- **OLAP**: ClickHouse for ministry dashboards; Trino for cross-domain federation; DuckDB for officer ad-hoc.
- **Search**: OpenSearch.
- **Vector**: pgvector for small, Weaviate for large embeddings.

### 4.3 Privacy engineering

- Field-level encryption for all PII columns (envelope encryption, per-tenant DEK, KEK in HSM).
- Tokenization at the gateway for sensitive identifiers reaching analytics (PRPid per relying party).
- Row-level security via Postgres RLS + OPA-evaluated session context.
- Differential privacy noise on aggregate exports beyond a threshold.

---

## 5. Cross-cutting concerns

### 5.1 Authn & authz

- mTLS for every internal call.
- OAuth 2.1 + FAPI 2.0 for external.
- Cedar-based authorization policies, evaluated centrally with cached decisions.
- Officer access via WebAuthn + step-up biometric for privileged operations.
- Break-glass with two-person rule, time-limited, mandatory post-hoc review.

### 5.2 Observability

- All services instrument OpenTelemetry traces, metrics, logs.
- SLO catalog (see §SLO catalog companion doc).
- Trace sampling: 1% baseline, 100% on errors, 100% on Class B/C/D AI calls.
- Per-tenant observability isolation; auditors see their tenant.

### 5.3 Configuration & feature flags

- 12-factor; config in env + Vault + ConfigMaps.
- Feature flags via OpenFeature with audit trail; flag changes for citizen-facing flows go through change advisory board.

### 5.4 Internationalization

- ICU MessageFormat; translations stored in TMS (Weblate) with translator workflow.
- Right-to-left UI tested per release.
- Currency/date/number formatting per locale.
- Voice/IVR locale packs for top 5 national languages.

### 5.5 Accessibility

- WCAG 2.2 AA enforced via CI (axe).
- Keyboard-only flows tested.
- Screen reader compatibility (NVDA, VoiceOver, TalkBack).
- High-contrast and large-text themes.

---

## 6. Engineering process

- Trunk-based with small PRs.
- Mandatory code review by domain owner + security reviewer for sensitive paths.
- ADRs for architecturally significant decisions.
- Threat model per module, refreshed annually.
- Game days; chaos engineering from year 2.
- Blameless post-mortems published internally; redacted public summaries for tier-0 incidents.
