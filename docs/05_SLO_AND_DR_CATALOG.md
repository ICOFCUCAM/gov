# CivicOS — SLO, Capacity & DR Catalog (Companion 05)

A platform that promises sovereignty must also promise reliability. This catalog enumerates service level objectives, error budgets, capacity targets, and disaster recovery commitments. These are contractual.

---

## 1. Service tiers

| Tier | Examples | Availability | Latency p99 | Error budget / quarter |
|---|---|---|---|---|
| T0 — National critical | CivicID auth, CivicPay rails, Cell Broadcast emergency alerts | 99.99% | 800 ms | 13 minutes |
| T1 — Kernel & registries | CivicBus, Wallet sync, Trust Services, Audit Vault writes | 99.95% | 1.2 s | 65 minutes |
| T2 — Ministry modules | Tax filing, Welfare disbursement, Health EHR | 99.9% | 2.0 s | 2 hours 10 min |
| T3 — Analytics & marketplace | National dashboard, marketplace catalog | 99.5% | 5.0 s | 11 hours |
| T4 — Internal back-office | Reporting jobs, batch reconciliation | 99.0% | n/a | 21 hours |

Error budget consumed beyond threshold halts feature releases for that service until restored, automatically.

---

## 2. Latency budgets (p99)

| Operation | Budget |
|---|---|
| Identity authentication, L2 | 600 ms |
| Identity authentication, L4 (biometric server match) | 1.5 s |
| Wallet credential presentation (offline-capable) | 0 ms (local) |
| Property rates payment end-to-end | 2.5 s |
| Tax return submission (typed return) | 1.2 s |
| Welfare batch disbursement of 10M payments | 60 min |
| Cross-agency consent retrieval | 400 ms |
| Officer console initial render (low-bandwidth profile) | 2.5 s |
| Citizen portal initial render (slow 3G) | 3.5 s |
| Search across own records | 600 ms |

---

## 3. Capacity targets (per anchor country, ~50M population reference)

| Workload | Steady state | Peak (multiplier) |
|---|---|---|
| Identity authentications / day | 30M | 5x during national event |
| Wallet active monthly | 25M | — |
| Payments / day | 15M | 10x at month-end |
| Tax filings / day during filing month | 200K | 50x in last 48 hours |
| Welfare disbursement event | 10M wallets in 1 hour | — |
| EHR encounters / day | 800K | 5x during outbreak |
| CivicBus calls / day | 1B | 3x |
| Audit Vault writes / day | 5B | 3x |

System designed for peak; cost optimized via scale-to-zero in non-critical workloads, scheduled scaling for known peaks (tax window, payday, school enrollment).

---

## 4. Disaster recovery

### 4.1 RTO / RPO targets

| Service | RTO | RPO |
|---|---|---|
| CivicID auth | 15 min | 30 s |
| CivicPay rails | 15 min | 30 s |
| Audit Vault writes | 1 min | 0 s |
| Wallet sync | 1 hour | 5 min |
| CivicBus core | 30 min | 1 min |
| Tax filing | 4 hours | 5 min |
| Welfare module | 4 hours | 5 min |
| Health EHR | 1 hour | 1 min |
| Land registry | 4 hours | 5 min |
| Analytics warehouse | 24 hours | 1 hour |
| Marketplace | 24 hours | 1 hour |

### 4.2 DR strategies

- **Multi-region active-active** for stateless and read-heavy workloads.
- **Active-warm** for stateful with synchronous in-region replication, async cross-region.
- **Pilot light** for analytics: warm metadata, cold compute.
- **Air-gapped vault** for crown jewels: immutable, per-day signed bundles transferred via diode.

### 4.3 DR drill calendar

| Drill | Frequency |
|---|---|
| T0 service failover | monthly |
| Region failover | quarterly |
| Restore-from-backup integrity | quarterly |
| Air-gapped vault restoration | semi-annual |
| Full national tabletop with ministers | annual |
| Adversarial chaos engineering (in non-prod replicating prod) | continuous |

### 4.4 Backup policy

- 3-2-1: three copies, two media classes, one offsite.
- Daily full + hourly incremental for T0/T1.
- Immutable WORM bucket with separate KMS for ransomware protection.
- Backup integrity checked nightly; restore tested monthly with a randomly selected service.
- 7-year cold archive for fiscal and identity data; per statute for others.

---

## 5. Change management

- **Standard changes** — pre-approved, fully automated.
- **Normal changes** — Change Advisory Board review, scheduled.
- **Emergency changes** — break-glass with two-person approval and post-hoc review.

Release windows:
- T0/T1 services: change windows announced 7 days ahead; never during national events (elections, exams, payday).
- Frozen periods around tax-filing peaks, election windows.

Progressive delivery:
- Canary 1% → 10% → 50% → 100% with auto-rollback on SLO regression.
- Shadow traffic for risky changes.
- Feature flags for citizen-visible changes; flag changes audited.

---

## 6. Observability commitments

- 100% of T0/T1 errors traced.
- Per-tenant SLO dashboards in observability portal.
- Per-citizen "service status" page in Civic Wallet (showing the user the health of services they depend on).
- Public status page with weekly transparency report.
- Incident communications: initial within 15 minutes for T0, 30 minutes for T1.

---

## 7. Cost discipline

- Per-service cost-of-goods-sold tracked monthly.
- Right-sizing recommendations from observability platform.
- Tiered storage (hot → warm → cold) for old records, automated.
- LLM call accounting per module; expensive Class B/C calls require budget approvals.
- Annual greenness review: PUE, carbon, reused hardware percentage.

---

## 8. Operational runbooks (catalog excerpt)

- RB-001: Identity service failover.
- RB-002: Payments rail failover with central bank coordination.
- RB-003: Audit Vault corruption recovery.
- RB-004: Mass-enrollment surge management.
- RB-005: Welfare disbursement window operations.
- RB-006: Cell-Broadcast emergency activation.
- RB-007: Privileged access break-glass.
- RB-008: Suspected supply-chain compromise (Sigstore mismatch).
- RB-009: Lawful intercept activation and audit.
- RB-010: Public status page incident lifecycle.

Each runbook is a living document; rehearsed; outcomes feed back into platform design.
