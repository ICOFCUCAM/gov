# CivicOS — Ministry Control Rooms and Inter-Ministry Orchestration UX (Companion 156)

This companion is the product specification of the **Ministry Control Room** — the daily operational environment of a ministry's senior leadership — and the **Inter-Ministry Orchestration** surfaces that let multiple ministries coordinate on cross-cutting cases, programs, and reforms without overriding each other's statutory authority. It complements Companion 146 (ministry onboarding), Companion 153 (officer console), Companion 154 (NCCC), and Volume II Parts 5–9 by being specifically the **mid-tier executive UX** — what a permanent secretary, director general, ministry chief of staff, or program owner sees and does daily.

---

## 1. Design north star

**A ministry control room is for stewardship, not surveillance.** It shows the minister and their senior staff how the ministry is serving citizens, where it is failing, where it is improving, and what to do about it. It does **not** show the political-loyalty of officers, the personal-attributes of citizens, the daily-clicks of staff, or anything that turns the ministry into a panopticon.

Five product laws bind every surface:

1. **Service outcomes first, throughput last.** Citizens-served, time-to-decision, contestation outcomes, equity stratification — before any "cases per day."
2. **Stratification is mandatory.** Per region, per language, per protected attribute (in privacy-preserving form). Aggregates without stratification hide harm.
3. **Officer wellbeing is a leadership indicator.** Burnout is the silent failure.
4. **Civil society and constitutional officer findings on the wall.** Not as exhibits — as live indicators.
5. **Every panel has a "drill to people" affordance and a "drill to system" affordance — but neither drills to a citizen-individual surveillance view.**

---

## 2. Ministry control room — desktop layout (1920×1080 reference)

Example: **Ministry of Social Protection — Daily Control Room.**

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Ministry of Social Protection — Director General L. Mwakio  •  Tuesday 14 May 2026  •  📌 Daily standup │
│ ─────────────────────────────────────────────────────────────────────────────────────────────────────── │
│                                                                                                          │
│  ╭─ TODAY'S SERVICE ───────────────────────╮  ╭─ EQUITY STRATIFICATION (last 30 days) ──────────────╮   │
│  │ Citizens served (rolling 7d):  ~98,400   │  │ Approval rate by language: nominal across 11 lang  │   │
│  │ Median time to decision:        2.3 days │  │ Approval rate by district: AMBER in 2 of 47        │   │
│  │ Contestation rate (Class B):       1.4%  │  │   → Tana Delta (▼9%) — investigation open          │   │
│  │ Contestation reversal rate:        6.1%  │  │   → Garbatulla (▼7%) — root cause: data freshness  │   │
│  │ Disbursements yesterday:    KES 412M     │  │ Approval rate by age band 65+: AMBER (▼12%)        │   │
│  │   → all reconciled to Audit Vault        │  │   → root cause analysis in flight                  │   │
│  ╰──────────────────────────────────────────╯  ╰─────────────────────────────────────────────────────╯  │
│                                                                                                          │
│  ╭─ OPEN PROGRAMS ─────────────────────────╮  ╭─ CONSTITUTIONAL OFFICER FINDINGS (live) ────────────╮   │
│  │ • Child grant (steady)                   │  │ Algorithmic Ombudsman:                              │   │
│  │ • Drought supplement (active)            │  │   • CH-014 tripwire fire (water pressure context)  │   │
│  │ • Pension uplift Q3 (pilot ongoing)      │  │     → automation halted; manual review in flight   │   │
│  │ • Emergency disbursement (Tana NCCC)     │  │   • Q2 audit of CH-017 — no findings               │   │
│  │ • Disability accommodation review         │  │ Auditor General:                                    │   │
│  │ • School-feeding alignment                │  │   • spot-check scheduled 15 May                    │   │
│  ╰──────────────────────────────────────────╯  │ Inspector General:                                  │   │
│                                                  │   • 1 anonymous complaint about an agent —         │   │
│  ╭─ OFFICER WELLBEING (aggregate) ─────────╮   │     investigation routine                          │   │
│  │ Pace: 96% of officers within ceiling     │   │ People's Editor:                                    │   │
│  │ Voluntary pulse: 78% participation       │   │   • Plain-language template revised — review        │   │
│  │ Pulse sentiment: nominal                 │   │     before deploy                                    │   │
│  │ 4 officers above ceiling for 3+ days —  │   │ Future Generations Commissioner:                    │   │
│  │   ⚐ supervisor action needed              │   │   • 30-year review of child welfare in progress    │   │
│  │ Rotation health: green                   │   ╰─────────────────────────────────────────────────────╯  │
│  ╰──────────────────────────────────────────╯                                                            │
│                                                                                                          │
│  ╭─ CIVIL SOCIETY ENGAGEMENT ─────────────────────────────────────────────────────────────────────────╮  │
│  │ Active standing-access partners (12): Kenya Red Cross, Disability Alliance, Children's Rights      │  │
│  │   Coalition, Pokomo Council of Elders, Sisters of Mercy, ...                                       │  │
│  │ Open civil society requests: 3                                                                      │  │
│  │   • Disability Alliance: stratification by disability category for child grant — fulfillable      │  │
│  │   • Kenya Red Cross: emergency disbursement audit access — fulfillable                            │  │
│  │   • Children's Rights Coalition: school-feeding review — needs alignment with Education           │  │
│  │ Next regular partnership meeting: 22 May                                                            │  │
│  ╰────────────────────────────────────────────────────────────────────────────────────────────────────╯  │
│                                                                                                          │
│  ╭─ AI CHARTERS IN YOUR MINISTRY ─────────────────────────────────────────────────────────────────────╮ │
│  │ Active:                                                                                              │ │
│  │  ● CH-014 Welfare Renewal Automation (Class C) — currently HALTED (tripwire fire)                   │ │
│  │  ● CH-017 Eligibility Copilot (Class B) — green                                                     │ │
│  │  ● CH-021 Drought Supplement Detection (Class B) — green                                            │ │
│  │  ● CH-029 Plain-Language Editor Assistant (Class A) — green                                         │ │
│  │  ● CH-033 Multilingual Citizen Assistant (Class A/B) — green                                        │ │
│  │ Charter renewals due Q3: 2                                                                            │ │
│  │ Charter replacement drill scheduled: 30 May (CH-017)                                                  │ │
│  ╰─────────────────────────────────────────────────────────────────────────────────────────────────────╯ │
│                                                                                                          │
│  ╭─ INTER-MINISTRY COORDINATION ───────────────────────────────────────────────────────────────────────╮ │
│  │ With Education: school-feeding alignment — joint case open                                            │ │
│  │ With Health: disability accommodation in clinic access — joint case open                              │ │
│  │ With Finance: Q3 budget reconciliation                                                                │ │
│  │ With Foreign Affairs: refugee social protection — joint protocol active                              │ │
│  │ With Disaster: NCCC Tana flood — emergency rules in effect, sunset 21 May                            │ │
│  ╰─────────────────────────────────────────────────────────────────────────────────────────────────────╯ │
│                                                                                                          │
│  ╭─ CITIZEN VOICE (aggregated, plain-language) ──────────────────────────────────────────────────────────╮│
│  │ "It came on time this month, thank you." — Citizen, Mombasa district                                  ││
│  │ "Why is it less than last month?" — Citizen, Garissa (5 similar today)                                ││
│  │ "The Pokomo-language reminder helped my mother." — Citizen, Tana                                       ││
│  │ Sample of 12 citizen comments today. [Open civic voice]                                               ││
│  ╰────────────────────────────────────────────────────────────────────────────────────────────────────────╯│
│                                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**:

- **Service outcomes panel sits at top-left** — the most-glanced position. It is **not** "applications processed." It is "citizens served / time-to-decision / contestation rate / reversal rate."
- **Equity stratification is co-equal with service outcomes**, not in a subsection. AMBER on disparate impact surfaces immediately; the panel surfaces root cause where known.
- **Constitutional officer findings live on the dashboard**. They are not in a separate compliance tool buried elsewhere.
- **Civil society engagement panel** is a permanent surface; open requests are listed, not buried.
- **AI charters in this ministry** — including the one currently halted. Leadership knows what's live and what's not.
- **Officer wellbeing aggregate** — pace, pulse, rotation. Burnout is a leadership indicator. Individual officer wellbeing data is **not** drillable from here.
- **Citizen voice** — actual sampled comments, plain language, anonymized. Leadership hears citizens, not just metrics.
- **No throughput "scoreboard"**. No officer leaderboard. No KPI page measuring "applications closed per officer."

---

## 3. The "drill to people / drill to system" rule

Every panel offers two affordances:

```
       Panel: "Approval rate by district — Tana Delta AMBER (▼9%)"

       [ Drill to people ]                [ Drill to system ]
        ↓                                   ↓
       Who is responsible for              What is the system doing here?
       this district?                      • What charters apply
       • Named DG / regional director      • What officer count
       • Named team supervisors            • What policy
       • Civil society liaison             • What data freshness
       • Constitutional officer            • What known root causes
         contact for this district         • Open investigations

       Neither path drills to a list of citizens.
       Neither path drills to officer-individual click-data.
```

This rule shapes every panel. **The control room is not a panopticon over citizens or staff**; it is a tool for leadership to find the right human conversation and the right systemic fix.

---

## 4. Director General's "today" view (focused workspace)

When the DG needs to act, the room collapses into a focused view:

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  Today, DG  •  L. Mwakio                                                            │
│ ─────────────────────────────────────────────────────────────────────────────────── │
│                                                                                     │
│  WHAT NEEDS YOU                                                                     │
│                                                                                     │
│  ① CH-014 halted — restart decision needed                                          │
│     The tripwire fired on disparate-impact stratification. Investigation found     │
│     data freshness issue in Tana Delta. Remediation drafted by SP-DEV-12 team.     │
│     Algorithmic Ombudsman recommends: restart with data refresh + 30-day re-audit. │
│     [ Open decision ]    [ Talk to Ombudsman ]    [ Ask the team ]                  │
│                                                                                     │
│  ② Disability Alliance request — stratification by disability category               │
│     They ask for breakdowns of child grant by disability category, anonymized.     │
│     Privacy-engineering team confirms differential privacy can support this.       │
│     Recommended: approve with public release.                                       │
│     [ Approve ]    [ Discuss ]    [ Decline with reason ]                          │
│                                                                                     │
│  ③ Officer J. K. has been above ceiling for 5 days                                  │
│     Supervisor has not acted. Anti-burnout escalation triggered.                   │
│     Recommended: contact supervisor; reassign caseload; ensure protected break.    │
│     [ Open the case ]    [ Message supervisor ]    [ Confidential HR escalation ]   │
│                                                                                     │
│  ④ Q3 charter renewals — 2 charters due                                              │
│     CH-021 and CH-033. Renewal procedure detailed below.                            │
│     [ Open renewal ]                                                                │
│                                                                                     │
│  ⑤ NCCC Tana — your liaison W. Chebet asks: confirm extension of relaxed            │
│     reverification rule until 21 May? (Per Companion 142 sunset.)                  │
│     [ Confirm ]    [ Decline ]    [ Discuss ]                                       │
│                                                                                     │
│  YOUR DAY                                                                           │
│  09:00 daily standup                                                                │
│  10:30 Algorithmic Ombudsman briefing                                              │
│  12:30 lunch                                                                        │
│  14:00 civil society partnership meeting (Disability Alliance)                     │
│  16:00 cabinet brief preparation                                                    │
│  17:00 protected break                                                              │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**:

- **Five things needing decisions**, prioritized by impact. Not a hundred.
- **Each decision has named affordances** — never a single "approve" button. Discuss / Decline-with-reason / Talk-to-officer are co-equal.
- **Officer wellbeing escalation has the same surface weight as a policy decision**. The DG is responsible for the people delivering the service.
- **The DG's own day shows protected breaks**. Leadership pace models institutional pace.

---

## 5. Program control room (deeper view)

A specific program (e.g., child grant) has its own control room. Program owners — usually directors at the next tier down — live here.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Program: Child Grant  •  Owner: Director D. Nyaboke  •  Cycle: monthly, 14th                       │
│ ─────────────────────────────────────────────────────────────────────────────────────────────────── │
│                                                                                                     │
│  ╭─ COVERAGE ───────────────────────╮  ╭─ TIMELINESS ────────────────╮  ╭─ EQUITY ────────────────╮│
│  │ Eligible children:    ~1.84M     │  │ Median disbursement:        │  │ Per district: 2 amber   ││
│  │ Currently enrolled:   ~1.79M  ▲   │  │   on the 14th               │  │ Per language: nominal   ││
│  │ Enrollment gap:        50,300    │  │ p95 latency:                │  │ Per age band: 65+ ▼12%  ││
│  │   ↳ root: rural reach,           │  │   the 15th                  │  │ Per disability: under   ││
│  │     re-verification cadence      │  │ Failure rate:               │  │   investigation         ││
│  │                                  │  │   0.04% — all reconciled    │  │                         ││
│  ╰──────────────────────────────────╯  ╰─────────────────────────────╯  ╰─────────────────────────╯│
│                                                                                                     │
│  ╭─ CITIZEN EXPERIENCE ──────────────────────────────────────────────────────────────────────────╮ │
│  │ Plain-language quality (People's Editor): A                                                    │ │
│  │ Wallet receipt completeness:                100%                                                │ │
│  │ Contestation channel availability:          100%                                                │ │
│  │ Multilingual coverage:                      all 11 inventory languages                          │ │
│  │ USSD/IVR/agent reach:                       confirmed across 47 districts                       │ │
│  │ Citizen satisfaction (stratified survey):   82% (n=2,400)                                       │ │
│  │   ↳ lowest: 65+ band — investigation in progress                                                │ │
│  ╰────────────────────────────────────────────────────────────────────────────────────────────────╯ │
│                                                                                                     │
│  ╭─ OPERATIONAL ────────────────────────────────────────────────────────────────────────────────────╮│
│  │ Disbursement rails: CivicPay → M-Pesa, MTN MoMo, Cooperative Bank, post-office cash              ││
│  │ Reconciliation: 100% to Audit Vault; 0 anomalies last cycle                                       ││
│  │ Officer count assigned to program: 184 (across 47 districts)                                      ││
│  │ Officer pace compliance: 97%                                                                       ││
│  │ Charter footprint: CH-014 (halted), CH-017 (active)                                                ││
│  │ Last replacement drill: 14 Mar — passed                                                            ││
│  ╰─────────────────────────────────────────────────────────────────────────────────────────────────╯ │
│                                                                                                     │
│  ╭─ STRUCTURAL REFORMS FROM CONTESTATION (last 6 months) ──────────────────────────────────────────╮│
│  │ • Drought decree DRC-2026-04-A — extension prompted by contestation pattern (Kwame case +      ││
│  │   327 similar) — reform issued                                                                  ││
│  │ • Re-verification window changed from 12 mo to 18 mo for stable cases (per Audit Gen finding)   ││
│  │ • Sesotho-language outreach materials added to inclusion floor (per civil society request)      ││
│  ╰─────────────────────────────────────────────────────────────────────────────────────────────────╯│
│                                                                                                     │
│  ╭─ CIVIL SOCIETY STANDING ACCESS ───────────────────────────────────────────────────────────────────╮│
│  │ • Children's Rights Coalition — full standing                                                     ││
│  │ • Disability Alliance — standing on disability stratification                                     ││
│  │ • Anti-Poverty Network — full standing                                                            ││
│  │ • UNICEF country office — observer access                                                          ││
│  │ Last partner meeting: 4 days ago                                                                    ││
│  │ Open joint reviews: 2                                                                                ││
│  ╰─────────────────────────────────────────────────────────────────────────────────────────────────────╯│
│                                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**:

- **Coverage panel is the moral metric**: not just "enrolled" but "gap" with root cause.
- **Citizen experience panel** lists People's Editor grade, contestation channel uptime, multilingual coverage, USSD/IVR/agent reach — the inclusion floor as a live indicator.
- **Operational rails** include reconciliation; if you can't reconcile to the Audit Vault, the program has lost the auditability invariant.
- **Structural reforms from contestation** is a first-class panel — the program is measured on whether contestation feeds reform, not just on whether the program "ran."

---

## 6. Inter-ministry orchestration: the joint case

When a citizen-facing case touches multiple ministries (refugee, disaster, child welfare, disability, cross-border worker), an **inter-ministry joint case** is opened in a shared workspace.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Joint case J-2026-204 — Cross-ministry refugee child welfare protocol                              │
│  Lead: Foreign Affairs (initial intake)  •  Participants: Interior, Health, Education, Social Prot.│
│ ─────────────────────────────────────────────────────────────────────────────────────────────────── │
│                                                                                                     │
│  Citizens served (last 30 days): 1,247 refugee children + families                                 │
│                                                                                                     │
│  ╭─ CASE FLOW (across ministries) ──────────────────────────────────────────────────────────────╮  │
│  │                                                                                                 │  │
│  │   Border intake (Foreign Affairs)                                                              │  │
│  │     ↓                                                                                          │  │
│  │   Refugee determination (Interior)                                                             │  │
│  │     ↓                                                                                          │  │
│  │   Health screening (Health)                                                                    │  │
│  │     ↓                                                                                          │  │
│  │   School placement (Education)                                                                 │  │
│  │     ↓                                                                                          │  │
│  │   Child welfare grant (Social Protection)                                                      │  │
│  │                                                                                                 │  │
│  │   Each ministry signs its own remit. Handoffs require citizen consent.                        │  │
│  ╰──────────────────────────────────────────────────────────────────────────────────────────────╯  │
│                                                                                                     │
│  ╭─ JOINT METRICS ──────────────────────────────────────────────────────────────────────────────╮  │
│  │ Median time intake → school placement:    18 days                                              │  │
│  │ Refugee child contestation rate:           1.1%                                                │  │
│  │ Family unification rate (where applicable): 92%                                                │  │
│  │ Civil society partner standing:            UNHCR + 4 local NGOs                                │  │
│  │ Per-ministry SLA adherence:                                                                    │  │
│  │   Foreign Affairs:    100% within 2 days                                                       │  │
│  │   Interior:           94% within 14 days                                                       │  │
│  │   Health:             97% within 7 days                                                        │  │
│  │   Education:          88% within 21 days  ← target 95%; investigation in flight                │  │
│  │   Social Protection:  100% within 30 days                                                      │  │
│  ╰──────────────────────────────────────────────────────────────────────────────────────────────╯  │
│                                                                                                     │
│  ╭─ JOINT DECISIONS PENDING ────────────────────────────────────────────────────────────────────╮  │
│  │ • Update protocol §6: vaccination cross-recognition with two new origin countries             │  │
│  │   Requires sign-off: Foreign Affairs, Interior, Health                                         │  │
│  │   [ Open the joint sign-off ]                                                                  │  │
│  │                                                                                                 │  │
│  │ • Education SLA gap: investigate root cause                                                    │  │
│  │   Owner: Education. Joint review by 21 May.                                                    │  │
│  ╰──────────────────────────────────────────────────────────────────────────────────────────────╯  │
│                                                                                                     │
│  ╭─ INVARIANT WATCH ────────────────────────────────────────────────────────────────────────────╮  │
│  │ ✓ Anti-refoulement: no data flow to origin countries from which refugees are protected         │  │
│  │ ✓ Children's rights: no automated separation; no commercial use of children's data             │  │
│  │ ✓ Cross-ministry consent at every handoff                                                      │  │
│  │ ✓ Multilingual at first contact                                                                │  │
│  │ Constitutional officer present (UNHCR + Sovereign Trust Officer observer)                      │  │
│  ╰──────────────────────────────────────────────────────────────────────────────────────────────╯  │
│                                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**:

- **No single "joint approve" button.** Each ministry signs its own remit. The joint workspace coordinates.
- **Joint metrics** include per-ministry SLA adherence — calling out which ministry is behind. This is **not** competitive ranking; it surfaces where the joint flow is bottlenecked.
- **Invariant watch is permanent** — the joint case's most sensitive feature is the anti-refoulement and children's-rights protections; they are on screen, not in footnotes.
- **Constitutional officer observer named** for high-stakes joint cases.

---

## 7. Joint sign-off ceremony

When a multi-ministry decision is required (e.g., a cross-recognition protocol update), the joint sign-off is a deliberate ceremony — like the deliberation table (Companion 154) but in a shared workspace.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  JOINT SIGN-OFF — Protocol §6 update                                                │
│                                                                                     │
│  Summary (plain language, reviewed by People's Editor):                            │
│  "We update protocol §6 to cross-recognize vaccinations from two additional        │
│  origin countries (Sudan, Eritrea), per ICAO VDS-NC. Refugee children will          │
│  no longer need to re-vaccinate when records are valid."                            │
│                                                                                     │
│  Each ministry signs their own remit:                                              │
│  ☐ Foreign Affairs   (DG to sign)  — recognition of origin country records         │
│  ☐ Interior          (DG to sign)  — alignment with refugee status procedures     │
│  ☐ Health            (DG to sign)  — clinical adequacy of cross-recognition       │
│                                                                                     │
│  Constitutional officer concurrence:                                               │
│  ● Sovereign Trust Officer: no invariant concern                                   │
│  ● UNHCR observer: aligned with refugee protection principles                      │
│                                                                                     │
│  Civil society note (UNHCR + Doctors Without Borders + Refugee Council):           │
│  "Supported, with recommendation to monitor coverage at first six months."          │
│                                                                                     │
│  Effect on citizens:                                                                │
│  ~480 refugee children/year will skip redundant vaccinations.                      │
│  Receipts will note cross-recognition; contestation channel preserved.             │
│                                                                                     │
│  When signed:                                                                       │
│  • Receipts in 11 languages prepared                                               │
│  • Inter-realm gateway terminology aligned (Companion 140)                          │
│  • Health Officer Copilot charter updated (CH-073)                                  │
│  • Public record published                                                          │
│                                                                                     │
│  [ Open sign-off (each DG signs individually) ]    [ Discuss before signing ]      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Minister's strategic board (a board for the political head)

Ministers are political appointees. They are not the operational owners (that is the DG), but they are accountable to parliament and citizens. Their dashboard is **strategic, not operational** — it does not let them micromanage cases or surveil officers.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Minister of Social Protection — Hon. T. Khalfani                                                   │
│ ─────────────────────────────────────────────────────────────────────────────────────────────────── │
│                                                                                                     │
│  ╭─ HOW WE'RE SERVING CITIZENS ────────────────────────────────────────────────────────────────╮   │
│  │ Citizens reached:        ~98% of estimated eligible                                            │   │
│  │ Citizens satisfied:      82% (stratified)                                                      │   │
│  │ Citizens contesting:     1.4% — 6% reversed                                                    │   │
│  │ Disbursements on time:   p95 within 1 day of cycle                                             │   │
│  │ Equity stratification:   2 amber districts; 1 amber age band — root causes under investigation │   │
│  ╰────────────────────────────────────────────────────────────────────────────────────────────────╯   │
│                                                                                                     │
│  ╭─ PARLIAMENTARY OBLIGATIONS ───────────────────────────────────────────────────────────────────╮  │
│  │ • Q2 oversight hearing: 28 May                                                                  │  │
│  │ • Open written questions: 14 (responses prepared in plain language)                            │  │
│  │ • Pending bills with this ministry: 2                                                          │  │
│  │ • Civil society standing access — public on the parliament site                                │  │
│  ╰─────────────────────────────────────────────────────────────────────────────────────────────╯  │
│                                                                                                     │
│  ╭─ CONSTITUTIONAL OFFICER FINDINGS ───────────────────────────────────────────────────────────╮  │
│  │ Algorithmic Ombudsman:  CH-014 halt explained; structural fix in flight                        │  │
│  │ Auditor General:        Q1 audit completed, public on the AG site                              │  │
│  │ Inspector General:      1 complaint about agent (routine)                                      │  │
│  │ People's Editor:        revised plain-language template approved                               │  │
│  │ Future Generations:     30-year review of child welfare in flight                              │  │
│  ╰────────────────────────────────────────────────────────────────────────────────────────────╯  │
│                                                                                                     │
│  ╭─ MEDIA AND PUBLIC COMMUNICATION ───────────────────────────────────────────────────────────╮  │
│  │ Press queries pending:   3                                                                    │  │
│  │ Civil society events:    2 this week                                                          │  │
│  │ Public messages drafted: 1 (under People's Editor review)                                     │  │
│  ╰────────────────────────────────────────────────────────────────────────────────────────────╯  │
│                                                                                                     │
│  ╭─ STRATEGIC PRIORITIES (your political program, transparent to citizens) ───────────────────╮  │
│  │ • Expand drought-supplement reach                                                              │  │
│  │ • Reduce 65+ approval gap                                                                       │  │
│  │ • Improve indigenous-language outreach                                                          │  │
│  │ • Pension reform alignment                                                                      │  │
│  │ Status of each: public on the ministry site                                                    │  │
│  ╰─────────────────────────────────────────────────────────────────────────────────────────────╯  │
│                                                                                                     │
│  ╭─ WHAT YOU CANNOT SEE FROM THIS BOARD ─────────────────────────────────────────────────────────╮  │
│  │ • Individual citizen records                                                                    │  │
│  │ • Individual officer click data                                                                 │  │
│  │ • Citizen political affiliations                                                                │  │
│  │ • Officer political affiliations                                                                │  │
│  │ • Any per-individual surveillance view                                                          │  │
│  │ This is by design (Companion 28, 131, 138, 141). Your political program serves citizens;       │  │
│  │ it does not surveil them or your civil servants.                                               │  │
│  ╰─────────────────────────────────────────────────────────────────────────────────────────────╯  │
│                                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**:

- **The minister's board makes their accountability the dominant frame**: parliamentary obligations, constitutional officer findings, media engagement, strategic priorities published.
- **The "what you cannot see" panel is permanent**. The political head is reminded, on their own dashboard, that the platform refuses to surveil citizens or staff under their direction.
- **Strategic priorities are public**. The political program is transparent to citizens, not a private dashboard.

---

## 9. Cabinet view (cross-ministry, head-of-government)

The cabinet view is for the head of government and cabinet office to see whole-of-government service quality without seeing any individual citizen or officer.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Whole-of-government service quality — Cabinet view                                                  │
│ ─────────────────────────────────────────────────────────────────────────────────────────────────── │
│                                                                                                     │
│  Ministries reporting (24 of 24):                                                                  │
│  Health • Education • Justice • Interior • Foreign Affairs • Defense • Finance • Trade • Labor    │
│  Energy • Transport • Communications • Agriculture • Environment • Water • Disaster • ...          │
│                                                                                                     │
│  ╭─ SERVICE QUALITY HEATMAP ────────────────────────────────────────────────────────────────────╮  │
│  │ Ministry     │ Citizens │ Time    │ Contest │ Equity │ AI charter │ Civil   │ Officer       │  │
│  │              │ served   │ to dec. │ rate    │ flags  │ status      │ society │ wellbeing      │  │
│  ├──────────────┼──────────┼─────────┼─────────┼────────┼─────────────┼─────────┼────────────────┤  │
│  │ Soc. Prot.   │ 98k/d    │ 2.3d    │ 1.4%    │ 3      │ 1 halted    │ active  │ 96% in band    │  │
│  │ Health       │ 142k/d   │ same-d  │ 0.6%    │ 1      │ all green   │ active  │ 91% in band    │  │
│  │ Education    │ 67k/d    │ 5.1d    │ 2.1%    │ 4      │ all green   │ active  │ 88% — review   │  │
│  │ Justice      │ 12k/d    │ var     │ 4.2%    │ 2      │ all green   │ active  │ 94%            │  │
│  │ ...                                                                                              │  │
│  ╰────────────────────────────────────────────────────────────────────────────────────────────────╯  │
│                                                                                                     │
│  ╭─ INVARIANTS WATCH (live, whole-of-government) ──────────────────────────────────────────────╮   │
│  │ ✓ Sovereignty of principal       ✓ Contestability      ✓ Auditability                         │   │
│  │ ✓ Replaceability / exit           ✓ Constitutional supremacy                                  │   │
│  │ ✓ Inclusion floor                 ✓ No superintelligent unilateralism                         │   │
│  │ Charter halts last 30 days: 2 (both resolved or in flight)                                    │   │
│  │ Tripwire fires last 30 days: 7 (all investigated)                                             │   │
│  ╰──────────────────────────────────────────────────────────────────────────────────────────────╯   │
│                                                                                                     │
│  ╭─ CROSS-CUTTING INDICATORS ───────────────────────────────────────────────────────────────────╮  │
│  │ Multilingual coverage (SLIL):  Inventory languages 14 / 14 served across ministries           │  │
│  │ Inclusion floor:              USSD + IVR + agent + walk-in confirmed in all 47 districts      │  │
│  │ Cross-ministry handoff consent rate: 99.7%                                                     │  │
│  │ Whistleblower channels:        operational, anonymous, audited                                  │  │
│  │ Constitutional officer engagement: weekly briefing cadence held                                │  │
│  │ Civil society standing access: active across all ministries                                    │  │
│  │ Sovereignty Index (annual): published; trending +                                              │  │
│  ╰──────────────────────────────────────────────────────────────────────────────────────────────╯  │
│                                                                                                     │
│  ╭─ STRATEGIC PROGRAMS CROSS-CUTTING ──────────────────────────────────────────────────────────╮   │
│  │ • Climate adaptation (Environment + Disaster + Health + Agriculture)                          │   │
│  │ • National AI compute plan (Comms + Defense + Finance) — Q3 update                            │   │
│  │ • Refugee protocol (Foreign + Interior + Health + Education + Soc. Prot.)                     │   │
│  │ • Indigenous nations framework (per Companion 36)                                             │   │
│  │ • SLIL low-resource-language uplift (Comms + Communities)                                     │   │
│  │ • 30-year intergenerational reviews (Future Generations Commissioner)                          │   │
│  ╰────────────────────────────────────────────────────────────────────────────────────────────╯   │
│                                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**:

- **The heatmap shows aggregate ministry quality**. No drilldown to citizens. No drilldown to individual officers.
- **Invariants watch is on the cabinet view too** — the head of government sees the doctrine's status daily.
- **Cross-cutting indicators** capture what whole-of-government service requires: multilingual, inclusion floor, consent, whistleblower channels, civil society, sovereignty.
- **Strategic programs cross-cutting** lists what spans ministries; each has named participants.

---

## 10. Cross-sovereign coordination room

For ministries with cross-border programs (Foreign Affairs, Disaster, Health, Trade, Refugee), a **cross-sovereign coordination room** exists. It pulls from the inter-realm gateway (Companion 140).

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Cross-sovereign coordination — Health                                                              │
│  Active treaties:  WHO IHR  •  EAC Health Pact  •  bilateral (3)                                    │
│ ─────────────────────────────────────────────────────────────────────────────────────────────────── │
│                                                                                                     │
│  ╭─ ACTIVE CROSS-BORDER FLOWS (today) ──────────────────────────────────────────────────────────╮   │
│  │ EAC region pathogen surveillance:       nominal                                                │   │
│  │ Cross-recognition vaccinations:         480 records cross-recognized last 7d                   │   │
│  │ Cross-border patient summaries (FHIR):  44 patients shared today, per consent                  │   │
│  │ Joint health emergency exercises:       1 scheduled (drought-related, 30 May)                  │   │
│  ╰────────────────────────────────────────────────────────────────────────────────────────────────╯   │
│                                                                                                     │
│  ╭─ INTER-REALM GATEWAY HEALTH ─────────────────────────────────────────────────────────────────╮   │
│  │ Up across all 8 treaty peers                                                                   │   │
│  │ Sovereign-controlled keys: confirmed                                                            │   │
│  │ Per-flow citizen consent compliance: 100%                                                       │   │
│  │ Sovereign termination switch tested: 18 days ago                                                │   │
│  ╰────────────────────────────────────────────────────────────────────────────────────────────────╯   │
│                                                                                                     │
│  ╭─ JOINT WORK WITH PEER SOVEREIGNS ─────────────────────────────────────────────────────────────╮  │
│  │ Tanzania (Health Ministry): cross-border tuberculosis program — joint case J-T-2026-12         │  │
│  │ Uganda (Health Ministry):  EAC vaccination cross-recognition update — pending sign-off          │  │
│  │ Rwanda (Health Ministry):  joint pandemic exercise — co-design                                  │  │
│  │ Mozambique (cross-southern):  cyclone health coordination — protocol active                     │  │
│  ╰─────────────────────────────────────────────────────────────────────────────────────────────────╯  │
│                                                                                                     │
│  ╭─ INVARIANT WATCH ───────────────────────────────────────────────────────────────────────────╮  │
│  │ ✓ Citizen consent at every cross-border flow                                                   │  │
│  │ ✓ Anti-refoulement preserved                                                                    │  │
│  │ ✓ Sovereign authority preserved                                                                 │  │
│  │ ✓ Exit drill last completed: 22 days ago                                                       │  │
│  ╰─────────────────────────────────────────────────────────────────────────────────────────────────╯  │
│                                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Drilling, but with limits

A leader can drill from a panel to the source. Some drills are allowed; some are forbidden by design. Here is the rule table:

| Drill from | To | Allowed | Forbidden |
|---|---|---|---|
| AMBER district | District program team | ✓ named team and supervisor | ✗ list of citizens in that district |
| AMBER age band | Investigation case file | ✓ stratification with privacy | ✗ identifiable citizens in that band |
| Officer pace | Anonymous wellbeing aggregate | ✓ pace, rotation, pulse summary | ✗ identifiable officer click streams |
| Charter halt | Charter docs + tripwire data | ✓ technical and policy | ✗ individual officer who flagged |
| Civil society request | Engagement record | ✓ active request workflow | ✗ records about the civil society organization beyond engagement |
| Whistleblower indicator | Inspector General | ✓ aggregate; investigation status | ✗ any attempt to identify reporter |
| Citizen voice sample | Anonymized comment + region | ✓ aggregated and stratified | ✗ identifiable citizen |

**The control room enforces these rules at the data plane, not just the UI.** No "power-user" drill bypasses them.

---

## 12. AI in the control room

The control room has a Class B Copilot scoped to operational support — drafting briefings, surfacing patterns, summarizing civil society engagements, preparing parliamentary answers.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  COPILOT (Class B — advisory)                                                       │
│                                                                                     │
│  Helpful drafts I have ready (you can review, edit, or discard):                   │
│                                                                                     │
│  • A 5-minute briefing on the CH-014 halt for your standup                          │
│  • A response to PQ-2026-114 (parliamentary question about disability access)       │
│  • A summary of last quarter's civil society partnership activity                   │
│  • A non-misleading citizen-facing FAQ about the drought decree extension           │
│                                                                                     │
│  None of these are sent until you sign them. None of these decide anything.        │
│                                                                                     │
│  [ Open drafts ]  [ Ask a question ]  [ Configure scope ]                          │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**:

- Class B banner permanent.
- Drafts are inert until signed by the leader.
- Copilot does **not** have access to identifiable citizen data or identifiable officer data; it sees only what the control room shows.
- Copilot output is reviewable by People's Editor before any public release.

---

## 13. Wellbeing surfaces for leaders

Leaders are not exempt from the operational rules they apply to others.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  Your wellbeing, DG Mwakio                                                          │
│                                                                                     │
│  This week:                                                                         │
│  • Hours in control room: within band                                              │
│  • Protected breaks taken: 4/5                                                     │
│  • Anonymous wellbeing pulse:  ●●●○○ — last week                                     │
│                                                                                     │
│  Your peer DG circle is meeting Thursday — confidential support.                   │
│  Civic Academy short course: "Leading civil servants under stress" — 30 min.        │
│                                                                                     │
│  We track this aggregate for you, not against you.                                 │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 14. KPIs visible vs. KPIs forbidden

| Visible in ministry control room | Forbidden |
|---|---|
| Citizens served (rolling) | Officer applications-per-hour leaderboards |
| Time-to-decision (median, p95) | Officer "speed" KPIs |
| Contestation rate, reversal rate | Citizen complaint suppression metrics |
| Equity stratification flags | Officer demographic tracking |
| Officer pace ceiling compliance (aggregate) | Officer click streams |
| Charter compliance | Hidden charter changes |
| Constitutional officer findings | Suppression of those findings |
| Civil society engagement health | Civil society "compliance" with state line |
| Inclusion floor reach | Engagement metrics (DAU/MAU, retention) |
| Wellbeing pulse aggregate | Individual wellbeing data |
| Multilingual coverage | Language-of-citizen-as-attribute |
| Whistleblower channel health | Whistleblower identification |
| Cross-ministry SLA adherence | Cross-ministry blame metrics |
| Sovereignty Index | Vendor-positive vanity metrics |

---

## 15. Forbidden in ministry control rooms

- Officer leaderboards or competitive throughput visualization.
- Surveillance of individual officers' click data.
- Citizen-level surveillance views.
- Citizen profiling by political affiliation, religion, ethnicity (beyond what's strictly required for narrowly-scoped lawful purposes per Companion 21 anti-discrimination).
- Hiding of constitutional officer findings.
- Hiding of civil society engagement.
- AI auto-decision masquerading as Copilot draft.
- Class drift in Copilot panels.
- Cross-sovereign data flows without consent indicators.
- Charter halts hidden from leadership.
- Whistleblower identification through aggregate-look-alike querying.
- Engagement-gamification of the leadership dashboard itself.

---

## 16. Anti-patterns the design refuses

- **The minister scoreboard**: making service "look good" through metric selection. Equity stratification and contestation rates are mandatory and unhide-able.
- **The DG firefighting console**: leadership reduced to clearing tickets. The DG dashboard surfaces what needs them, not everything.
- **The cabinet panopticon**: head of government surveilling whole-of-government at citizen-individual or officer-individual granularity. The cabinet view is aggregate; doctrine is enforced at the data plane.

---

## 17. The Ministry Control Room north star

A ministry control room is for stewardship, not surveillance. It shows leadership how the ministry is serving citizens, where it is failing, where it is improving, and what to do about it. It refuses to surveil citizens or staff under the cover of "operational visibility." It makes equity stratification, civil society engagement, constitutional officer findings, and officer wellbeing first-class surfaces — alongside service outcomes — because these are how a public-service ministry is actually accountable.

When the control room becomes a metrics scoreboard for political theater, a panopticon over civil servants, a profile generator over citizens, a place where AI charters silently drift, a place where constitutional officer findings are hidden — it has failed the discipline that distinguishes stewardship from administration. Capability without ministry-control-room discipline is the institutionalization of management as surveillance.

When the control room makes leaders feel: I can see how we're serving citizens, I can see where we're failing whom, I can see what my civil servants need, I can hear civil society and constitutional officers continuously, my political program is transparent to citizens, my AI is supervised, my decisions are signed, my officers are protected, my equity flags fire honestly — the design has succeeded.

The doctrine made executive. Anything less abandons the doctrine at the level where it most easily corrodes — the level where decisions about people are made by people who have stopped seeing the people.
