# CivicOS — Phased Deployment Roadmap (Companion 159)

This is the operational execution plan. It is deliberately short. It supersedes "build everything at once" with "ship phase by phase, module by module, institution by institution." Every module below has an owner, a user, a reason, an operating model, a scaling path, and a governance hook. Anything that cannot answer those six questions does not ship.

The doctrine still binds (Companion 158: humans govern, institutions govern, constitutions govern, AI assists). This document is about *sequencing*, not new doctrine.

---

## Phase gate rule

A phase does not begin until the previous phase is **deployed, demoable, used by real users, and operationally coherent**. No skipping. No partial-phase expansion into the next.

| Phase | Scope | Gate to next |
|---|---|---|
| **1** | Foundational public platform | Citizens transacting; ≥1 municipality live; uptime + contestation SLAs met |
| **2** | Municipal operations | ≥3 municipalities live; officer workflows in daily use; audited |
| **3** | Ministry systems | ≥2 ministries live; inter-ministry handoff working; constitutional officers engaged |
| **4** | National coordination | NCCC drilled; manual fallback proven; parliament + civil society oversight active |
| **5** | Advanced future systems | All prior phases stable 12+ months; Future Generations review passed |

---

## Phase 1 — Foundational Public Platform (current focus)

**Goal**: a citizen can prove who they are, receive notifications, apply for and track a permit, pay a bill, verify a document, and sign something — on a phone, in their language, with receipts and contestation. A municipality can onboard.

| Module | Who uses it | Why | How it operates | Governance hook |
|---|---|---|---|---|
| Digital identity | Citizens | Prove identity without oversharing | Selective disclosure, per-RP UID | DPA; contestable |
| Citizen wallet | Citizens | One place for state interactions | Receipts-first, offline-tolerant | Audit Vault |
| Permits | Citizens + municipal officers | Apply, review, issue, track | Workflow with named officer signature | Contestation in 2 taps |
| Payments (CivicPay) | Citizens | Pay bills/fees, see history | ISO 20022 rails, receipts | Auditor General |
| Notifications | Citizens | Know what's happening | Wallet + SMS/USSD/IVR fallback | People's Editor (plain language) |
| Document verification | Citizens + third parties | Trust a credential | Signed verifiable credentials | Tamper-evident |
| Digital signatures | Citizens + officers | Sign forms/decisions | Token + biometric ceremony | Non-repudiation logged |
| Multilingual services | Everyone | No one excluded by language | SLIL scaffold (Companion 148) | Sovereign-validated terms |
| Municipal onboarding | Municipal admins | Stand up a city in days | Guided wizard, defaults, checks | Constitutional officer signoff |

**Phase 1 success metrics**: time-to-first-receipt < 1 day; permit median decision time published; contestation reachable in ≤2 taps; inclusion floor (USSD/IVR/agent/walk-in) verified; one municipality fully live.

**Phase 1 is what the codebase builds now.** Everything else is later.

---

## Phase 2 — Municipal Operations

City administration, local taxation, parking, utilities, local permits, public complaints, inspections, service coordination. Municipality dashboards, officer queues, analytics. Built only after Phase 1 is live in a real municipality.

## Phase 3 — Ministry Systems

Ministry administration, procurement (OCDS), treasury, compliance, workforce, education, health, infrastructure coordination. Enterprise workflows, role-based ops, inter-ministry handoff. Built only after Phase 2.

## Phase 4 — National Coordination

NCCC, infrastructure coordination, emergency management, sovereign analytics. Built only after Phase 3, with manual-fallback proven.

## Phase 5 — Advanced Future Systems

Digital twins, predictive simulation, advanced AI coordination, climate intelligence. Built only after Phase 4 is stable for 12+ months. The doctrine for these already exists (Companions 143, 149–151); implementation waits for the gate.

---

## Engineering discipline (all phases)

- Next.js + React + TypeScript (strict) + Tailwind.
- Modular: each module is a route group + API namespace + typed contract.
- API-first: every UI talks to a typed API; the API is swappable for the sovereign backend.
- Container-ready, Kubernetes-ready, sovereign-cloud portable. Vercel for preview only.
- No third-party tracking. No vendor lock-in. Open primitives.
- Every module ships with: typed API contract, mock data adapter, real UI, accessibility, multilingual scaffold, and a deployment note.

## Product discipline

Every feature answers: **who uses it, why it exists, how it operates, how it scales, how it is governed, how it deploys.** If it can't, it doesn't ship. Doctrine is not expanded unless a real module requires it.
