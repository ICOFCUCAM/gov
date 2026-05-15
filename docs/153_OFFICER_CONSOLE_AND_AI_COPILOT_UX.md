# CivicOS — Officer Console and AI Copilot UX (Companion 153)

This companion is the product specification of the **Officer Console** — the daily workspace of every civil servant who serves citizens in CivicOS — and the **AI Copilot** that sits inside it as a Class A/B/C/D assistant. It complements Companion 138 (constitutional AI), Companion 150 (agent swarms), and Companion 152 (citizen wallet UX) by specifying what the officer actually sees, how decisions are made, and how AI assistance is rendered, controlled, and audited at the point of use.

---

## 1. Design north star

**The officer is accountable. The AI assists. The citizen is principal.** Every console pattern must:

1. Make the officer's decision visible and signed.
2. Render AI as visible advice, never as autonomous action.
3. Show the citizen's full context without turning the citizen into a profile.
4. Make contestation, escalation, and supervisor review one-click affordances.
5. Make the working day humane: queue load, breaks, rotation, no rubber-stamp metrics.

---

## 2. Console anatomy (desktop, 1440×900 reference; responsive down to 10" tablet)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ●●●  CivicOS Officer Console — K. Otieno  •  Social Protection, Nairobi  •  ⏱ 09:14 EAT      │
│ ─────────────────────────────────────────────────────────────────────────────────────────── │
│  [ Queue 12 ]  [ Today's work ]  [ Cases ]  [ Knowledge ]  [ My team ]      🔔 2   ⓘ Help    │
│ ─────────────────────────────────────────────────────────────────────────────────────────── │
│                                                                                              │
│  ┌────────────────────────────┐  ┌─────────────────────────────────────────────────┐        │
│  │  QUEUE                     │  │  CASE  C-7842  — Amina Hassan Mwangi             │        │
│  │                            │  │  Child grant renewal                             │        │
│  │ ● C-7842 Amina H. Mwangi   │  │  Submitted 14 May 09:02  •  SLA 17 May           │        │
│  │   Child grant renewal      │  │ ─────────────────────────────────────────────── │        │
│  │   ⚑ verified  ✓ AI draft   │  │                                                  │        │
│  │                            │  │  CITIZEN CONTEXT (only what's needed)            │        │
│  │ ○ C-7843 J. Wambui         │  │  • Mother of two children, both registered      │        │
│  │   Address change           │  │  • Household income band 3 (last verified 14 mo │        │
│  │   ⓘ standard               │  │    ago — see how)                                │        │
│  │                            │  │  • In drought-eligible region                    │        │
│  │ ○ C-7844 M. Kibet          │  │  • One previous renewal, on time                 │        │
│  │   Drought supplement       │  │                                                  │        │
│  │   ⚠ flagged for review     │  │  [ Show full record ]    [ Citizen contact ]    │        │
│  │                            │  │                                                  │        │
│  │ ○ C-7845 Anonymous         │  │ ┌─ COPILOT  (Class B — advisory)  ────────────┐ │        │
│  │   Complaint about agent    │  │ │                                              │ │        │
│  │                            │  │ │ ELIGIBILITY SUMMARY                          │ │        │
│  │ ○ ...8 more                │  │ │ Children verified (2) — civil registry link  │ │        │
│  │                            │  │ │ Income band confirmed — last verification    │ │        │
│  │ [ Show full queue ]        │  │ │   14 mo ago, slightly over policy refresh    │ │        │
│  │                            │  │ │   window of 12 mo. [Recommend re-verify]     │ │        │
│  │ Load: 12 cases             │  │ │ Drought supplement applies — Decree          │ │        │
│  │ Today's pace: on track     │  │ │   DRC-2026-04 [link]                         │ │        │
│  │ Next break: 11:00          │  │ │                                              │ │        │
│  │                            │  │ │ DRAFT DECISION                               │ │        │
│  │                            │  │ │ APPROVE renewal at base rate + drought       │ │        │
│  │                            │  │ │ supplement (KES 2,400/month).                │ │        │
│  │                            │  │ │ Re-verification recommended at next cycle.   │ │        │
│  │                            │  │ │                                              │ │        │
│  │                            │  │ │ How I reasoned:                              │ │        │
│  │                            │  │ │ • Policy §4.2(c) on drought supplement       │ │        │
│  │                            │  │ │ • Civil registry confirms 2 children         │ │        │
│  │                            │  │ │ • Geographic match for decree DRC-2026-04    │ │        │
│  │                            │  │ │                                              │ │        │
│  │                            │  │ │ Where I'm uncertain:                         │ │        │
│  │                            │  │ │ Income band verification is 14 months old,   │ │        │
│  │                            │  │ │ slightly past the 12 mo policy window. Two   │ │        │
│  │                            │  │ │ defensible paths: approve and flag for next  │ │        │
│  │                            │  │ │ cycle, or pause for fresh verification.      │ │        │
│  │                            │  │ │                                              │ │        │
│  │                            │  │ │ [ Use this draft ]  [ Edit ]  [ Reject ]    │ │        │
│  │                            │  │ │ [ Ask Copilot ]     [ See sources ]         │ │        │
│  │                            │  │ └──────────────────────────────────────────────┘ │        │
│  │                            │  │                                                  │        │
│  │                            │  │  YOUR DECISION                                   │        │
│  │                            │  │  ● Approve renewal at base + drought (default)  │        │
│  │                            │  │  ○ Approve at base only                          │        │
│  │                            │  │  ○ Request income re-verification first          │        │
│  │                            │  │  ○ Decline                                        │        │
│  │                            │  │  ○ Refer to specialist                            │        │
│  │                            │  │                                                  │        │
│  │                            │  │  Notes for the citizen (will be on receipt):     │        │
│  │                            │  │  [ ...                                       ]   │        │
│  │                            │  │                                                  │        │
│  │                            │  │  Internal notes (not on citizen receipt):        │        │
│  │                            │  │  [ ...                                       ]   │        │
│  │                            │  │                                                  │        │
│  │                            │  │  [ I sign this decision (K. Otieno) ]            │        │
│  │                            │  │  [ Save and return later ]                       │        │
│  │                            │  │  [ Ask supervisor ]                              │        │
│  │                            │  │  [ Refer to specialist ]                         │        │
│  └────────────────────────────┘  └─────────────────────────────────────────────────┘        │
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**:

- **Three-pane**: queue (left), case context (center), copilot+decision (right) — fixed layout for muscle memory.
- **Copilot is a panel, not a chat**. It surfaces a structured draft, sources, uncertainty, and discrete actions. Free-text Q&A is one button away (`Ask Copilot`).
- **Class label is permanent**: "COPILOT (Class B — advisory)" never leaves the panel. The officer cannot forget what mode they're in.
- **Where I'm uncertain** is a first-class field. The copilot must surface its uncertainty, not hide it. This is how rubber-stamping is engineered out.
- **Officer signature** is the only act that commits the decision. The button reads "I sign this decision (K. Otieno)" — naming the officer, not the system.
- **Anti-overload**: queue load shows "12 cases", "on track", "next break 11:00". Pace is humane; rubber-stamp metrics are absent.

---

## 3. Decision Class rendering rules

The console renders AI assistance differently per Class:

| Class | Panel label | Default action | Officer act |
|---|---|---|---|
| **A** (information) | "COPILOT (Class A — information)" pale blue band | Show information; no draft decision | Officer reads; no signing |
| **B** (advisory) | "COPILOT (Class B — advisory)" green band | Show structured draft + reasoning + uncertainty | Officer **signs** (the binding act) |
| **C** (conditional automation, narrow) | "AUTOMATED (Class C — narrow rule)" amber band | Show automated decision + flags for review | Officer **reviews flags**; can override |
| **D** (restricted-domain recommendation) | "COPILOT (Class D — recommendation only)" red band, prominent | Show pattern surfacing only; **never a draft decision** | Officer makes case from scratch; AI surface is reference |
| **E** (sovereign coordination assistance, declared) | "COORDINATION (Class E — sovereign-declared session)" purple band, with attestation badges | Show scenario/coordination support | Multi-officer concurrence (NCCC context, Companion 142) |

**Visual discipline**: the band color and label are non-removable, non-collapsible, and persist across every state. Cognitive load is real; the officer should never wonder which Class they're in.

---

## 4. Class D rendering (anti-corruption pattern surfacing, example)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  CASE C-7846 — Procurement audit                                          │
│  ──────────────────────────────────────────────────────────────────────── │
│                                                                            │
│  ┌─ COPILOT (Class D — recommendation only) ─────────────────────────────┐ │
│  │                                                                       │ │
│  │  This is a Class D case. The Copilot surfaces a pattern.             │ │
│  │  You as investigator decide what to do.                              │ │
│  │                                                                       │ │
│  │  PATTERN SURFACED                                                     │ │
│  │  Among 47 contracts awarded by Office X in Q1 2026:                  │ │
│  │  • 14 were sole-sourced                                              │ │
│  │  • 9 went to entities with overlapping beneficial owners             │ │
│  │  • 5 amendments increased value by >40% post-award                   │ │
│  │  • 2 BO chains terminate in opaque jurisdictions                     │ │
│  │                                                                       │ │
│  │  This pattern matches structural-corruption signal #SC-12. It does   │ │
│  │  not prove wrongdoing. Other explanations are possible.              │ │
│  │                                                                       │ │
│  │  WHAT THIS IS NOT                                                    │ │
│  │  • Not a determination that anyone is corrupt                        │ │
│  │  • Not a list of suspects                                            │ │
│  │  • Not a verdict                                                     │ │
│  │  • Not admissible as evidence on its own                             │ │
│  │                                                                       │ │
│  │  EVIDENCE LINKS                                                       │ │
│  │  • OCDS records for all 47 contracts                                 │ │
│  │  • Beneficial-ownership graph for the 9 overlaps                     │ │
│  │  • Amendment audit trail                                             │ │
│  │  • Jurisdictional analysis                                            │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  YOUR INVESTIGATIVE ACTION                                                 │
│  ○ Open formal investigation (will require court process for non-public)   │
│  ○ Refer to peer office for independent review                             │
│  ● Document and monitor — insufficient to investigate at this time         │
│  ○ Dismiss with reason                                                     │
│                                                                            │
│  Reasoning (recorded):  [ ...                                          ]   │
│                                                                            │
│  [ I sign this disposition (Investigator T. Nakamura) ]                   │
│  [ Consult Inspector General ]                                            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**:

- The "what this is not" panel is **part of the panel**, not a footnote. Class D especially must not be misread as a verdict.
- Investigator's reasoning is recorded for due process and supervisory review.
- Court process is named explicitly as required for non-public data access.
- "Dismiss with reason" is an equal-weight option; non-action is a valid investigative decision and should not be hard to choose.

---

## 5. Class C rendering (conditional automation, narrow rule)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  REVIEW QUEUE — Class C automated decisions (your review required)        │
│  ──────────────────────────────────────────────────────────────────────── │
│                                                                            │
│  AUTOMATED  Class C — narrow rule  •  Authority: Charter CH-014-WelfareRen │
│                                                                            │
│  Today's automated decisions: 1,247                                       │
│  • 1,231 approved (routine, in-bounds)                                    │
│  • 12 flagged for your review (out-of-bounds signal)  ←  YOU             │
│  • 4 declined automatically (clear ineligibility)  ← random re-audit: 1   │
│                                                                            │
│  FLAGGED FOR REVIEW                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ ⚠ C-7847  M. Adamou  •  Income just over band threshold             │  │
│  │ ⚠ C-7848  T. Coulibaly  •  Address recently changed                  │  │
│  │ ⚠ C-7849  S. Nyanchama  •  First-time applicant                      │  │
│  │ ... 9 more                                                           │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  TODAY'S RANDOM RE-AUDIT (your job: confirm or overturn)                  │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ ⓘ C-7821  A. Camara  •  Auto-approved 09:01                          │  │
│  │   Spot-check 1 of 5 today                                            │  │
│  │   [ Open ]                                                           │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  TRIPWIRES (Charter CH-014)                                               │
│  All green:                                                               │
│  ● Input distribution within bounds                                        │
│  ● Output distribution within bounds                                       │
│  ● Disparate-impact stratification within bounds                           │
│  ● Contestation rate within bounds                                         │
│  ● Reversal rate within bounds                                             │
│                                                                            │
│  [ Charter ]  [ Audit trail ]  [ Halt this automation (supervisor) ]      │
└────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**:

- Officer sees the **scale of automation, the flags, and the random re-audit selection** — not just the flagged cases. This is the anti-rubber-stamp design (Companion 78 §9, Companion 138 §3.4).
- **Tripwire dashboard inline** — if drift appears, the officer sees it; the halt is one click for a supervisor with authority.
- "Halt this automation" requires supervisor signature; it is a real button, not a theoretical one.

---

## 6. Ask Copilot (free-form query, when needed)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ASK COPILOT (Class A — information only)                          ✕      │
│                                                                            │
│  Working on C-7842 — Amina Hassan Mwangi                                  │
│                                                                            │
│  You: What does §4.2(c) of the drought decree say about household size?   │
│                                                                            │
│  Copilot: §4.2(c) of decree DRC-2026-04 provides a 20% supplement for     │
│  households of 4 or more, plus a 10% increment per additional dependent   │
│  beyond 4. Amina's household is 3 (mother + 2 children) — the base       │
│  drought supplement applies; the size increment does not.                 │
│                                                                            │
│  Sources:                                                                  │
│  • Decree DRC-2026-04 §4.2(c) (authoritative)                            │
│  • Ministry guidance v.4 §3 (interpretive)                                │
│                                                                            │
│  [ Open Decree ]  [ Open Guidance ]                                       │
│                                                                            │
│  ──────────────────────────────────────────────────────────────────────── │
│                                                                            │
│  Note: I'm answering at Class A (information only). I won't draft         │
│  decisions in this chat. To draft a decision, return to the case panel.   │
│                                                                            │
│  Ask another:  [ Type a follow-up...                                ▶ ]   │
└────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**:

- Even in chat, the Class is named.
- Sources cited inline with type ("authoritative" vs "interpretive").
- The Copilot **refuses to drift class** — the modal explicitly says it won't draft decisions in chat. Decision drafting is a panel action, not a chat action; this protects against accountability laundering.

---

## 7. Decision signature ceremony

The act of signing a decision is, deliberately, a small ceremony:

```
┌────────────────────────────────────────────────────────────────────────────┐
│  SIGN DECISION                                                             │
│  ──────────────────────────────────────────────────────────────────────── │
│                                                                            │
│  You are about to sign:                                                    │
│                                                                            │
│    Case C-7842 — Amina Hassan Mwangi                                       │
│    APPROVE child grant renewal                                             │
│    Base rate + drought supplement (KES 2,400/month)                        │
│                                                                            │
│  AI involvement: Class B (advisory). Your name will be on this decision   │
│  as the deciding officer.                                                 │
│                                                                            │
│  Confirm with your token + biometric:                                      │
│  ┌───────────────────────────────────────┐                                │
│  │   [👤  Look at the camera]            │                                │
│  │   [🔑  Tap your security key]         │                                │
│  └───────────────────────────────────────┘                                │
│                                                                            │
│  This will:                                                                │
│  • Issue Amina a receipt in her wallet                                     │
│  • Disburse via CivicPay tonight                                          │
│  • Log this decision to the Audit Vault                                   │
│  • Make this decision contestable for 30 days                             │
│                                                                            │
│  [ Sign ]    [ Cancel ]                                                   │
└────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**:

- The summary, the Class, the consequences, and the contestability window are all on one screen.
- Two-factor signing (biometric + hardware token) for binding decisions; the friction is intentional and small.
- Cancel is co-equal; nothing forces signing.

---

## 8. Supervisor view

Supervisors see their team's load, tripwires, contestation rates, and any escalations awaiting them:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  SUPERVISOR  —  Social Protection, Nairobi  —  J. Mbeki                                       │
│ ─────────────────────────────────────────────────────────────────────────────────────────── │
│                                                                                              │
│  YOUR TEAM (12)                              ESCALATIONS TO YOU (3)                          │
│  ┌────────────────────────────────────┐     ┌──────────────────────────────────────────┐    │
│  │ Officer        Cases  Today  Flags │     │ ⚑ C-7844 M.Kibet (Otieno asked)          │    │
│  │ K. Otieno      12     5      1     │     │ ⚑ C-7711 anon complaint about agent      │    │
│  │ R. Mutua       11     6      0     │     │ ⚑ C-7625 escalation per civil society    │    │
│  │ S. Achieng     14     4      2     │     └──────────────────────────────────────────┘    │
│  │ ... 9 more                         │                                                      │
│  └────────────────────────────────────┘     CHARTER TRIPWIRES (Class C automation, CH-014) │
│                                              All green.  Last fire: 11 days ago.            │
│  CONTESTATION RATES (last 30 days)                                                          │
│  Stratified by language: nominal                  CIVIL SOCIETY STANDING REQUESTS (1)        │
│  Stratified by region: nominal                    Open Society Foundation                    │
│  Stratified by age band: 65+ ▲ +12% — review     requested aggregate stats by district     │
│                                                   [ View request ]                           │
│  CITIZEN SATISFACTION  82% (n=341)                                                          │
│                                                   ALGORITHMIC OMBUDSMAN  no open findings    │
│  HUMAN PACE  on target; nobody at >14 cases/d                                                │
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**:

- **Anti-burnout metric**: "Human pace — nobody at >14 cases/day" is a first-class indicator.
- **Stratified contestation rates** — disparate impact surfaces here, before it becomes a tripwire.
- **Civil society standing requests** are a permanent surface; they are not buried in a separate tool.
- The supervisor's role is to **shield their team from rubber-stamp pressure and to surface disparate-impact patterns**, not to drive throughput.

---

## 9. Knowledge surface (sovereign-validated terminology and policy)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  KNOWLEDGE  —  Social Protection                              🔍 search    │
│ ─────────────────────────────────────────────────────────────────────────  │
│                                                                            │
│  POLICY  (most-referenced today)                                          │
│  • Child Grant Eligibility (Policy 2025-04, v3.2)                         │
│  • Drought Supplement Decree DRC-2026-04                                  │
│  • Income Band Definitions (Annex C)                                       │
│  • Re-verification Schedule (Policy 2024-09)                              │
│                                                                            │
│  TERMINOLOGY  (sovereign-validated)                                       │
│  Search:  [ ...                                                       ]   │
│  Recent: "household", "dependent", "primary caregiver", "drought zone"   │
│                                                                            │
│  CHARTERS  (AI in your domain)                                            │
│  • CH-014  Welfare Renewal Automation (Class C)                           │
│  • CH-017  Eligibility Copilot (Class B)                                  │
│  • CH-021  Drought Supplement Detection (Class B)                         │
│                                                                            │
│  GUIDANCE FROM CONSTITUTIONAL OFFICERS                                    │
│  • People's Editor: Plain-language template updated for renewal letters   │
│  • Algorithmic Ombudsman: Q1 review of CH-014 — no findings               │
│  • Auditor General: spot-check schedule for 2026                          │
│                                                                            │
│  ASK A QUESTION  →  Class A Copilot                                        │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**:

- Officer's authoritative reference is **sovereign-validated terminology and policy**, not whatever the Copilot models internally (Companion 148 §8).
- AI charters are a knowledge surface — officers should know which AI operates in their domain and at what Class.
- Constitutional officer guidance is presented inline; it's not in a separate compliance tool.

---

## 10. My day (humane workspace)

The console's home for an officer is a daily view, not an inbox-shaped firehose:

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Today — Tuesday 14 May 2026                                              │
│ ─────────────────────────────────────────────────────────────────────────  │
│                                                                            │
│  WORK FOR YOU                                                             │
│  • 12 cases in your queue (Class B reviews)                               │
│  • 12 Class C flags for review                                            │
│  • 5 random re-audits                                                     │
│  • 3 escalations from your team (you're acting supervisor today)          │
│                                                                            │
│  SHAPE OF YOUR DAY                                                        │
│  09:00 ─ start                                                            │
│  11:00 ─ break (15 min — protected)                                       │
│  13:00 ─ lunch (60 min)                                                   │
│  15:00 ─ break (15 min — protected)                                       │
│  16:30 ─ team standup                                                     │
│  17:00 ─ end                                                              │
│                                                                            │
│  THIS WEEK                                                                │
│  • Training: New plain-language template (30 min) — Thu                   │
│  • Civil society briefing: women's rights coalition — Fri                 │
│  • Tripwire calibration drill — Fri                                       │
│                                                                            │
│  YOUR WELLBEING                                                           │
│  Last anonymous wellbeing pulse: 4 days ago                               │
│  [ Take the pulse ]                                                       │
│                                                                            │
│  YOUR RIGHTS AS AN OFFICER                                                │
│  • You can refuse any inappropriate request. [How]                        │
│  • You can flag any AI behavior that concerns you. [How]                  │
│  • Whistleblower channels: [Open]                                         │
│  • Your supervisor: J. Mbeki  •  Inspector General: external [link]      │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**:

- "Shape of your day" is a humane operating surface. Breaks are **protected** (the queue does not feed cases during a protected break).
- "Your wellbeing" — anonymous pulse, no individualized tracking, supervisor sees aggregate only.
- "Your rights as an officer" is a permanent surface — anti-political-coercion (Companion 28 §11, Companion 133 §8). Whistleblower channels are one click.

---

## 11. AI behavior the officer can flag (inline)

Every Copilot surface has a small affordance to flag the AI:

```
        ┌─ COPILOT (Class B — advisory) ────── ⚐ Flag this AI ──┐
        │                                                       │
        │  ...                                                  │
        │                                                       │
        └───────────────────────────────────────────────────────┘
```

Clicking opens:

```
┌────────────────────────────────────────────────────────────────────────────┐
│  FLAG THIS AI BEHAVIOR                                                     │
│                                                                            │
│  Charter: CH-017 Eligibility Copilot (Class B)                            │
│  Case: C-7842                                                              │
│  What concerns you?                                                        │
│                                                                            │
│  ○ It contradicted policy I know                                          │
│  ○ It hallucinated a source                                               │
│  ● It seems biased (please specify)                                       │
│  ○ It pressured me toward a particular answer                             │
│  ○ Its uncertainty disclosure feels off                                   │
│  ○ Other                                                                  │
│                                                                            │
│  Describe (your words):                                                    │
│  [ ...                                                                ]   │
│                                                                            │
│  This goes to: Algorithmic Ombudsman, your supervisor (anonymously if    │
│  you choose), and the AI safety operations team.                          │
│                                                                            │
│  ☑ Submit anonymously                                                     │
│                                                                            │
│  [ Submit flag ]    [ Cancel ]                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**:

- The officer is **the AI's first line of audit**. Flag is one click; anonymous-by-default option; structured categories so flags are tractable.
- Flags feed Algorithmic Ombudsman dashboards and Companion 138 §7 tripwire calibration.

---

## 12. Cross-ministry case (handoffs visible)

When a citizen's case touches multiple ministries (e.g., refugee case touching MoI, Health, Education):

```
┌────────────────────────────────────────────────────────────────────────────┐
│  CASE  C-9001 — F. Hassan (refugee status applicant)                       │
│  ──────────────────────────────────────────────────────────────────────── │
│                                                                            │
│  HANDOFF TIMELINE                                                          │
│                                                                            │
│  ● Foreign Affairs (in)             received 12 May  •  closed             │
│  │ Verified arrival, initial intake                                        │
│  │ Officer: M. Tadesse                                                     │
│  │                                                                          │
│  ● Interior — refugee determination  received 13 May  •  in progress       │
│  │ You are here: assessing claim                                            │
│  │ Officer: K. Otieno (you)                                                 │
│  │                                                                          │
│  ○ Health — initial screening        scheduled 16 May                       │
│  ○ Education — child enrollment      scheduled 20 May (if granted)         │
│                                                                            │
│  CITIZEN CONSENT for cross-ministry handoff                                │
│  ✓ F. Hassan consented to handoff between MoI → Health → Education on     │
│    13 May. Consent is per-step and revocable.                              │
│  [ See consent record ]                                                    │
│                                                                            │
│  WHAT YOU SEE FROM PREVIOUS MINISTRIES                                    │
│  Only what's needed for your decision. Health/education won't see your    │
│  determination notes unless you mark fields shareable.                    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**:

- Cross-ministry handoffs are visible and consent-gated (Companion 146 §18).
- Officer sees only what they need for their decision (purpose limitation, Companion 11).
- Citizen consent record is one click away — accountability isn't theoretical.

---

## 13. Emergency mode (NCCC activated)

When an NCCC is active (Companion 142), the console shifts:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🟠 EMERGENCY — National Flood Operations Center activated                                     │
│    Affected districts: Tana River, Garissa, Kilifi                                            │
│    Your role: priority disbursement officer (drought→flood reclassification)                  │
│    Class E sovereign coordination session active until [sunset published]                     │
│ ─────────────────────────────────────────────────────────────────────────────────────────── │
│                                                                                              │
│  PRIORITY QUEUE  (auto-prioritized; you can rebalance)                                       │
│  ⚡ Households flagged as severely affected — 247                                            │
│  ⚡ Health-vulnerable households — 89                                                         │
│  ⚡ Reverification waivers under emergency rule §6 — 412                                      │
│                                                                                              │
│  COMMON OPERATING PICTURE (live) [ open NCCC view ]                                          │
│                                                                                              │
│  WHAT CHANGED FOR YOU                                                                        │
│  • Verification cadence relaxed per Emergency Rule EM-2026-04 §6                             │
│  • Disbursement SLA shortened to 24h                                                         │
│  • Supervisor: J. Mbeki + NCCC liaison W. Chebet                                             │
│  • Manual fallback always available — green button bottom-right                              │
│                                                                                              │
│  WHAT HAS NOT CHANGED                                                                        │
│  • Citizen contestability still applies                                                      │
│  • Decision Class discipline still binds                                                     │
│  • Restricted-domain prohibitions still absolute                                             │
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**:

- The emergency banner is unmissable; the sunset is published.
- "What changed" / "What has not changed" panels are explicit — emergency does not relax invariants.
- "Manual fallback always available" is shown as a button position, not a paragraph.

---

## 14. Console states

| State | Visual signal |
|---|---|
| Normal | white background; standard chrome |
| Emergency NCCC | orange banner; priority queue chip |
| Tripwire fire on a charter | red banner; affected automation halted; supervisor notified |
| Officer on break | console grayed; queue paused; "Resume work" button |
| Network degraded | yellow banner; offline-tolerant actions enabled; sync indicator |
| Maintenance window | scheduled banner; non-urgent actions queue |

---

## 15. Performance targets

| Metric | Target |
|---|---|
| First-screen load (warm) | <500ms |
| Open a case | <300ms |
| Copilot draft generation | <3s median, <8s p95 |
| Sign decision (after biometric) | <1s |
| Search knowledge | <800ms |
| Queue refresh on action | <500ms |
| Offline action queueing | instant |

---

## 16. Anti-patterns (forbidden in console design)

- **Throughput KPIs visible to the officer**. Officers are not paid by case count.
- **Gamification, streaks, badges, leaderboards** of any kind.
- **Recommended decision auto-selected by default** (the officer must deliberately choose).
- **Hidden AI** (Copilot panel invisible or collapsed by default).
- **Class drift** (Class A copy that looks like Class B advice; Class C automation that doesn't expose its flags).
- **Officer-as-bot UI** (forms designed for speed at the cost of comprehension).
- **Dark-launch automation** (Class C cases automated without operator-visible charter).
- **"AI says X — accept?"** single-button affordances that invite rubber-stamping.
- **Citizen profile dossiers** (the console shows only what's needed for the current case).
- **Cross-citizen comparison** ("similar cases were decided as…") without civil-rights review.

---

## 17. Officer-onboarding (first day)

```
   Day 1                          Day 2                          Day 5
┌────────────────────────────┐ ┌────────────────────────────┐ ┌────────────────────────────┐
│ Welcome, K. Otieno.        │ │ Civic Wallet from the      │ │ Your first live cases       │
│                            │ │ citizen's side             │ │                            │
│ You'll work with a system  │ │                            │ │ You'll work on three real  │
│ that helps you serve       │ │ Spend an hour walking      │ │ cases today with your      │
│ citizens — and that you    │ │ through what citizens      │ │ supervisor co-reviewing.   │
│ must keep accountable.     │ │ see.                       │ │                            │
│                            │ │                            │ │ Every decision you sign is │
│ Today:                     │ │ Then walk through the      │ │ yours. AI helps; you       │
│ • Your role and rights     │ │ contestation flow as if    │ │ decide.                    │
│ • Decision Classes A-E     │ │ you were contesting.       │ │                            │
│ • How AI helps, and when   │ │                            │ │ Your supervisor:           │
│   you must decide          │ │ Why? Because you will      │ │   J. Mbeki                 │
│ • Your right to refuse and │ │ make decisions that affect │ │ Your Algorithmic Ombudsman │
│   to flag                  │ │ what citizens experience.  │ │ contact: external [link]   │
│ • Whistleblower channels   │ │                            │ │                            │
│                            │ │ [Walk it through]          │ │ [Open today's queue]       │
│ [Continue]                 │ │                            │ │                            │
└────────────────────────────┘ └────────────────────────────┘ └────────────────────────────┘
```

**Design notes**:

- Day 1 names rights and refusal channels — anti-political-coercion (Companion 28 §11).
- Day 2 puts the officer **in the citizen's shoes**. Empathy is operationalized, not preached.
- Day 5 has a supervisor co-review — not throughput.

---

## 18. KPIs (officer UX)

| KPI | Target |
|---|---|
| Officer reports of AI overconfidence | Trending; tripwire-feeding |
| Officer reports of class drift | Zero tolerated |
| Officer-flag-to-Ombudsman conversion | Tracked |
| Officer wellbeing index | Stratified; supervisor-visible aggregate only |
| Officer training completion | Per cycle |
| Officer-led citizen-contestation outcomes | Stratified; investigated if disparate |
| Officer human-pace compliance | No officer above published case ceiling |
| Officer career path / rotation health | Per HR cycle |

---

## 19. Forbidden in officer console UX

- AI agents acting in officer's role without explicit charter.
- Decisions executed without officer signature.
- Class drift in panel rendering.
- Officer throughput metrics visible to officer or to citizens.
- Engagement gamification.
- Cross-citizen profile dossiers.
- "AI says X" single-button accept.
- Hidden Class C automation without officer-visible flags.
- Anti-coercion channels buried more than two clicks deep.
- Officer wellbeing data exposed individually.
- AI advice without source citations.
- Officer signature ceremony bypassed by automation.

---

## 20. The Officer Console north star

The officer is accountable. The AI assists. The citizen is principal. Every screen of the console makes those three sentences operational. The officer signs decisions, sees the AI's reasoning and uncertainty, sees citizen context in disciplined scope, can flag the AI in one click, has whistleblower channels on every surface, has a humane pace, has protected breaks, and has rights they can exercise without fear.

When the console becomes a throughput interface — cases per hour, AI-says-accept buttons, hidden automation, suppressed contestation, gamified officers, profiled citizens — it has failed at the discipline that distinguishes a civil servant from a button-presser. Capability without console-discipline is the institutionalization of administrative cruelty.

When the console makes officers feel: I can see what I'm doing, I can see what the AI is doing, I can decide what to sign, I can refuse what's wrong, I can flag what concerns me, I can take a break, I can grow in this work, I can serve this citizen well — the design has succeeded.

The doctrine made tangible at the officer's desk. Anything less is the doctrine surrendered where it matters most: in the daily act of deciding.
