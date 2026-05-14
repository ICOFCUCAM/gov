# CivicOS — Governance, Roles & RACI (Companion 06)

Sovereign infrastructure rises or falls on its governance. This document specifies who decides what, and who is accountable when things go right or wrong.

---

## 1. Governance bodies

### 1.1 Sovereign Steering Committee (SSC)

- Composition: Cabinet-level chair (typically Minister of Digital), heads of central bank, treasury, statistics, identity authority, AI authority, auditor general (observer), citizen council representative.
- Mandate: strategic direction, prioritization, budget allocation, risk acceptance.
- Cadence: quarterly.

### 1.2 Program Management Office (PMO)

- Composition: program director, technical director, security director, change director, integrator leads, vendor lead.
- Mandate: execution.
- Cadence: weekly status, monthly steering.

### 1.3 Architecture Review Board (ARB)

- Composition: chief architect, kernel leads, security architect, data architect, AI lead, accessibility lead.
- Mandate: ADR approval, cross-module standards, technology selection.
- Cadence: weekly.

### 1.4 Change Advisory Board (CAB)

- Composition: ops director, security lead, on-call engineering manager, business continuity rep.
- Mandate: change approval for T0/T1.
- Cadence: bi-weekly + on-demand.

### 1.5 Citizen Council

- Composition: civil society, media, academia, disability advocates, indigenous representatives, youth, elder.
- Mandate: independent voice on citizen impact, transparency commitments, AI deployments.
- Cadence: quarterly + ad-hoc on major capability changes.

### 1.6 AI Authority Board

- Composition: AI authority head, ethicist, legal scholar, technical specialist, citizen council rep.
- Mandate: model registration, decision class assignment, eval gates, incident reviews.
- Cadence: monthly + on-demand.

### 1.7 Independent Oversight (Auditor General + Inspector General + DPA)

- Mandate: standing access to audit logs, capability registry, lawful intercept records.
- Reports to legislature, not executive.

---

## 2. RACI for representative decisions

| Decision | Sponsor | Accountable | Responsible | Consulted | Informed |
|---|---|---|---|---|---|
| Adopt CivicOS | Head of state | Minister of Digital | PMO | Cabinet, parliament | Public |
| Choose sovereign cloud | Minister of Digital | SSC | Technical Director | National security, Treasury | Public |
| Activate new module | Minister of Digital | Module Owner Ministry | PMO | ARB, security, citizen council | Public |
| Promote AI capability to Class C | AI Authority Board | AI Authority head | Module owner | Citizen council, DPA | Public |
| Major release of T0 service | Technical Director | ARB | Eng team | CAB | Operators |
| Emergency change to T0 | Ops director | On-call EM | On-call eng | Security | CAB (post-hoc) |
| Open new region | Minister of Digital | SSC | PMO | Security, finance | Public |
| Sunset module | Sponsor ministry | SSC | PMO | Citizen council, DPA | Public |
| Lawful intercept activation | Court | Cyber agency | SOC | Inspector General | DPA (post-hoc) |
| Public capability registry update | AI Authority | Authority head | AI Authority team | Citizen council | Public |
| Procurement of marketplace partner | Procurement office | CivicOS Inc. (contract manager) | Procurement officer | Security, legal | Public |
| Data sharing instrument (cross-agency) | Sponsor ministry | DPA | Module owner | Receiving ministry, citizen council | Public |

---

## 3. Roles inside CivicOS Inc. (steward entity)

- **CEO** — accountable to board, sovereign customers, mission.
- **President of Sovereign Customers** — country relationships.
- **CTO** — platform technology.
- **Chief Architect** — system architecture, ADR shepherd.
- **Chief Information Security Officer** — security posture, incident response.
- **Chief Privacy Officer** — privacy by design, DPA liaison.
- **Chief AI Officer** — AI plane, evals, agent governance.
- **Chief Trust Officer** — independent function reporting to board on conformance to ethics and sovereignty commitments.
- **Heads of Module Lines** — owners of each module family.
- **Head of Marketplace** — third-party ecosystem.
- **Head of Civic Academy** — talent development.
- **Head of Public Affairs** — multilateral and government relations.
- **General Counsel** — legal across jurisdictions.

---

## 4. Decision-making style

- ADRs (Architecture Decision Records) for architectural choices, with template enforcing context, options, decision, consequences.
- Policy-as-code for operational decisions.
- Public RFCs for standards.
- Disagree-and-commit explicitly invoked when needed; recorded.
- Root-cause culture: post-incident reviews focus on systems, not individuals.

---

## 5. Conflict resolution

- Inside Inc.: chief of staff escalation path → CEO → board.
- Inside country: PMO escalation path → SSC → Cabinet.
- Between country and Inc.: contractual escalation matrix; arbitration in agreed-neutral venue.
- Between citizen and platform: appeals path documented per service; ombudsman for systemic issues; courts as ultimate recourse.

---

## 6. Transparency commitments

Public on a continuous basis:

- Capability registry of every government service running on CivicOS.
- Decision class assignment of every AI capability.
- Public dashboard of T0/T1 SLOs.
- Open contracting data (OCDS).
- Public AIBOMs for all production AI capabilities.
- Annual transparency report from CivicOS Inc.
- Annual sovereignty audit by independent auditor in each customer country.
