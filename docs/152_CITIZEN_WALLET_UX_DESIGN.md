# CivicOS — Civic Wallet UX Design (Companion 152)

This companion is the product specification of the **Civic Wallet** experience — the screens, flows, components, states, microcopy, and interaction patterns that citizens encounter on smartphone, feature phone (USSD), voice (IVR), agent kiosk, and walk-in counter. It transitions from doctrine into executable product design: wireframes, navigation maps, state machines, and component specs that a product team can implement.

---

## 1. Design north star

**Civic Wallet is a relationship, not an app.** Every interaction must feel: dignified, brief, contestable, reversible, multilingual, and accessible. The citizen is principal, never user-as-data-source.

Five product laws bind every screen:

1. **Plain language at first glance.** No legalese on a primary surface.
2. **Receipts are the page.** What the citizen did and what the state did is always visible.
3. **Contestation in two taps.** From any decision surface.
4. **Offline-resilient.** Every primary action queues if offline.
5. **No dark patterns.** No consent friction; no urgency manufactured; no buried opt-outs.

---

## 2. Information architecture

```
   Civic Wallet (top-level navigation, 5 surfaces)
   ┌──────────────────────────────────────────────────────────────┐
   │  Home    │  Services  │  Inbox  │  Records  │  Me            │
   └──────────────────────────────────────────────────────────────┘

   Home          → what's happening now; receipts, alerts, pending actions
   Services      → catalog of services; search; filter by life situation
   Inbox         → letters, decisions, notifications, agent messages
   Records       → identity, credentials, certificates, history
   Me            → preferences, language, accessibility, devices, exit
```

Sub-pages reachable from each:

- **Home** → Today / Receipts feed / Pending actions / Alerts
- **Services** → All services / By life situation / Saved / In progress
- **Inbox** → Unread / Decisions / Letters / Agent thread
- **Records** → Identity / Documents / Health / Education / Property / Tax / Family
- **Me** → Profile / Language / Accessibility / Notifications / Privacy / Devices / Help / Exit

---

## 3. Smartphone wireframes (vertical mobile, 390×844 reference)

### 3.1 Home (the most-seen surface)

```
┌─────────────────────────────────┐
│  ☰   Civic Wallet          🔔 3 │   ← header: nav, brand, alerts
│                                 │
│  Good morning, Amina.           │   ← named greeting, language-aware
│  Tuesday, 14 May 2026           │     date in preferred calendar
│                                 │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  YOU NEED TO                    │   ← pending actions, max 3
│  ┌─────────────────────────────┐│
│  │ ▸ Confirm your address      ││
│  │   for the school transfer   ││
│  │   — 2 minutes                ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ ▸ Review your tax draft     ││
│  │   — due in 12 days           ││
│  └─────────────────────────────┘│
│                                 │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  RECEIPTS                       │   ← reverse-chronological,
│  ┌─────────────────────────────┐│     receipts are first-class
│  │ ✓ Today, 09:14              ││
│  │   Child grant deposited      ││
│  │   2,400 KES → M-Pesa         ││
│  │   Receipt #R-3F9A2           ││
│  │   [View] [Question this]     ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ ✓ Yesterday, 16:02           ││
│  │   Health record updated      ││
│  │   Vaccination — pneumococcal ││
│  │   by Dr. K. Mwangi           ││
│  │   [View] [Question this]     ││
│  └─────────────────────────────┘│
│                                 │
│  [Show all receipts →]          │
│                                 │
└─────────────────────────────────┘
   Home  Services  Inbox  Records  Me   ← bottom tab bar (5 tabs)
```

**Design notes**:

- Greeting uses the citizen's name as recorded; honorific per cultural preference (Companion 38).
- Date uses preferred calendar (Companion 132); both calendar and locale-aware format.
- "You need to" surfaces ≤3 pending actions; each shows estimated time. Never more — overload is a failure.
- Receipts are the dominant home content because **the platform's job is to show what was done**.
- "Question this" is always present, two taps to contest (Companion 35).
- No promotional content. No upsell. No "engagement" mechanics.

### 3.2 Receipt detail

```
┌─────────────────────────────────┐
│  ←  Receipt R-3F9A2             │
│                                 │
│  CHILD GRANT — APRIL 2026       │
│  ┌─────────────────────────────┐│
│  │   2,400 KES                 ││
│  │   deposited to your wallet  ││
│  │   M-Pesa ending in 4421     ││
│  │   14 May 2026, 09:14        ││
│  └─────────────────────────────┘│
│                                 │
│  WHAT HAPPENED                  │
│  Ministry of Social Protection  │
│  approved your monthly child    │
│  grant. Eligibility verified    │
│  by Officer K. Otieno (ID 4423) │
│  on 12 May 2026.                │
│                                 │
│  WHY THIS AMOUNT                │
│  Base grant: 2,000 KES          │
│  + Drought supplement: 400 KES  │
│  Total: 2,400 KES               │
│                                 │
│  WAS AI INVOLVED?               │
│  ✓ AI helped Officer Otieno     │
│    by drafting the eligibility  │
│    summary. The officer signed  │
│    the decision. (Class B)      │
│    [How AI is used here]        │
│                                 │
│  IF SOMETHING'S WRONG           │
│  [ Question this decision  ]    │
│  [ Talk to an agent        ]    │
│  [ Submit a complaint      ]    │
│                                 │
│  PROOF                          │
│  This receipt is signed and     │
│  permanent. Receipt #R-3F9A2.   │
│  [Verify signature]             │
│                                 │
└─────────────────────────────────┘
```

**Design notes**:

- The receipt is the page. Every field is on-screen, not behind a "details" toggle.
- "What happened" in plain language; officer named when human signed; AI involvement disclosed with Decision Class (Companion 138 §3).
- "If something's wrong" is the contestation panel — always available, three escalation choices.
- "Proof" panel exposes cryptographic verification (Companion 06 hash-chain).

### 3.3 Question this decision (contestation flow)

```
   Step 1                          Step 2                          Step 3
┌────────────────────┐          ┌────────────────────┐          ┌────────────────────┐
│  ←  Question this  │          │  ←  Tell us more   │          │  ←  Submitted      │
│                    │          │                    │          │                    │
│  Receipt R-3F9A2   │          │  Pick one:         │          │  ✓ Submitted       │
│  Child grant       │          │  ○ The amount is   │          │                    │
│                    │          │    wrong           │          │  Case #C-7821      │
│  What do you want  │          │  ● I'm not sure    │          │  Routed to:        │
│  to do?            │   ──▶    │    why this was    │   ──▶    │  Social Protection │
│                    │          │    decided         │          │  — Nairobi office  │
│  ○ Ask a question  │          │  ○ I disagree with │          │                    │
│  ● Contest the     │          │    the decision    │          │  You'll hear back  │
│    decision        │          │                    │          │  by 20 May 2026.   │
│  ○ Submit a        │          │  Anything you want │          │                    │
│    complaint about │          │  to tell us?       │          │  Your child grant  │
│    how I was       │          │  [               ] │          │  payment stands    │
│    treated         │          │  [               ] │          │  while we review.  │
│                    │          │  [               ] │          │                    │
│  [Next]            │          │  [Submit]          │          │  [Go home]         │
│                    │          │                    │          │  [Track case]      │
└────────────────────┘          └────────────────────┘          └────────────────────┘
```

**Design notes**:

- Three-step contestation, maximum. Two if obvious.
- Step 1 distinguishes question / contest / complaint — different downstream routes.
- Step 2 surfaces common reasons (pre-categorized for triage) plus free text.
- Step 3 confirms with case ID, named office, named deadline, and **continuation guarantee** ("payment stands while we review") — citizens shouldn't be punished for contesting.

### 3.4 Services catalog

```
┌─────────────────────────────────┐
│  ☰   Services            🔍     │
│                                 │
│  WHAT DO YOU NEED?              │
│  [ Search services...        ] │
│                                 │
│  LIFE SITUATIONS                │
│  ┌─────────┐  ┌─────────┐       │
│  │ Having  │  │ Going   │       │
│  │ a child │  │ to      │       │
│  │         │  │ school  │       │
│  └─────────┘  └─────────┘       │
│  ┌─────────┐  ┌─────────┐       │
│  │ Lost a  │  │ Starting│       │
│  │ family  │  │ a       │       │
│  │ member  │  │ business│       │
│  └─────────┘  └─────────┘       │
│  ┌─────────┐  ┌─────────┐       │
│  │ Moving  │  │ Older   │       │
│  │ house   │  │ adult   │       │
│  │         │  │ support │       │
│  └─────────┘  └─────────┘       │
│                                 │
│  BY MINISTRY                    │
│  ▸ Health                       │
│  ▸ Education                    │
│  ▸ Social protection            │
│  ▸ Tax and revenue              │
│  ▸ Land and property            │
│  ▸ Justice and legal aid        │
│  ▸ All ministries (124)         │
│                                 │
│  IN PROGRESS                    │
│  • Child grant renewal          │
│  • School transfer              │
│                                 │
└─────────────────────────────────┘
```

**Design notes**:

- "Life situations" is the primary entry — citizens think in life situations, not in ministries.
- "By ministry" available for those who know what they want.
- "In progress" shows open cases the citizen has — never lose track.
- Search uses multilingual cross-language retrieval (Companion 148 §12).

### 3.5 Records (citizen-controlled identity and credentials)

```
┌─────────────────────────────────┐
│  ☰   Records            ⋯       │
│                                 │
│  IDENTITY                       │
│  ┌─────────────────────────────┐│
│  │  Amina Hassan Mwangi        ││
│  │  Born 14.03.1992 (Nairobi)  ││
│  │  CivicID active             ││
│  │  [Show selectively]         ││
│  └─────────────────────────────┘│
│                                 │
│  CREDENTIALS                    │
│  ▸ Driver's license             │
│  ▸ Education credentials (3)    │
│  ▸ Professional license (Nurse) │
│  ▸ Vaccination records (12)     │
│  ▸ Civil records (marriage)     │
│                                 │
│  HEALTH                         │
│  ▸ Conditions, allergies        │
│  ▸ Medications                  │
│  ▸ Visits and procedures        │
│  ▸ Share with a clinician       │
│                                 │
│  PROPERTY                       │
│  ▸ Plot 4423, Kiambu County     │
│                                 │
│  TAX                            │
│  ▸ Tax filing 2025 (assessed)   │
│  ▸ Pre-filled draft 2026        │
│                                 │
│  FAMILY                         │
│  ▸ 2 children registered        │
│                                 │
│  WHO HAS LOOKED AT MY RECORDS?  │
│  [Show access log →]            │
│                                 │
└─────────────────────────────────┘
```

**Design notes**:

- **"Who has looked at my records?"** is a permanent prominent surface (Companion 11). Citizens should know who, when, and why.
- "Show selectively" → selective disclosure (Companion 03 §3.7); citizen chooses which attributes to reveal.
- No global "share everything" toggle anywhere.

### 3.6 Selective disclosure flow (presenting a credential)

```
   Trigger: relying party requests credentials       Citizen reviews and consents
   ┌──────────────────────────────────────┐         ┌──────────────────────────────────────┐
   │  ←  Show your details                │         │  ←  Review what you'll share         │
   │                                      │         │                                      │
   │  Kiambu County Hospital              │         │  You're sharing with:                │
   │  is asking to verify:                │         │  Kiambu County Hospital              │
   │                                      │         │                                      │
   │  • Your name                         │         │  ✓ Name: Amina Hassan Mwangi         │
   │  • That you are over 18              │  ──▶    │  ✓ Over 18: Yes                      │
   │  • Your vaccination record for       │         │  ✓ Pneumococcal vaccination: 12/2024 │
   │    pneumococcal (only)               │         │                                      │
   │                                      │         │  NOT shared:                         │
   │  Purpose: scheduling vaccination     │         │  • Date of birth                     │
   │  follow-up                           │         │  • Address                           │
   │                                      │         │  • Other vaccinations                │
   │  How long: this visit only           │         │  • National ID number                │
   │                                      │         │                                      │
   │  [ See what you'll share ]           │         │  [ Share now ]    [ Cancel ]         │
   │  [ Cancel ]                          │         │                                      │
   │                                      │         │  You can revoke this later.          │
   └──────────────────────────────────────┘         └──────────────────────────────────────┘
```

**Design notes**:

- "NOT shared" panel is explicit — it teaches privacy by visibility.
- Purpose, scope, and duration all on first screen.
- Cancel always present, equal weight to Share.

---

## 4. USSD wireframes (`*civic#`)

The same surfaces, rendered as USSD menus, work for feature phones with no data plan. USSD is **first-class**, not legacy.

```
   Main menu                    Receipts menu               Receipt detail
   ┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
   │ Civic Wallet        │     │ Recent receipts     │     │ 14 May 09:14        │
   │ Hello Amina         │     │ 1. 14 May - 2400/=  │     │ Child grant         │
   │                     │     │    Child grant      │     │ 2400/= to M-Pesa    │
   │ 1. Receipts         │     │ 2. 13 May - Health  │     │ Approved by         │
   │ 2. Pending (2)      │     │    record update    │     │ Officer K. Otieno   │
   │ 3. Services         │     │ 3. 10 May - Tax     │     │ Eligibility OK      │
   │ 4. Records          │     │    pre-filled       │     │                     │
   │ 5. Question/Help    │     │ 4. 05 May - School  │     │ 1. Question this    │
   │ 6. Language         │     │    transfer logged  │     │ 2. Talk to agent    │
   │ 0. Exit             │     │ 5. More             │     │ 9. Back             │
   │                     │     │ 0. Back             │     │ 0. Main             │
   │ Reply with number   │     │                     │     │                     │
   └─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

**Design notes**:

- Numbered menus, ≤7 items per screen (USSD constraint).
- Same primary surfaces (receipts, pending, services, records, contestation).
- "Question this" reachable in ≤3 keypresses from anywhere.
- Multilingual menu rendering per inventory language (Companion 148).

---

## 5. IVR call flow

```
   *civic#  →  [system dials back the citizen, free]

   "Welcome to Civic Wallet. To continue in Swahili, press 1.
    For English, 2. For Kikuyu, 3. For Somali, 4. For more
    languages, press 5."

       ↓  citizen picks language

   "Hello Amina. You have:
      one new receipt — child grant payment,
      two pending actions,
      and one letter in your inbox.

    To hear receipts, press 1.
    To hear pending actions, press 2.
    To talk to an agent, press 0.
    To ask a question of the Civic Assistant, press 9."

       ↓
   citizen presses 1
       ↓
   "Receipt one of two. On 14 May at 9:14 a.m., the
    Ministry of Social Protection sent you 2,400 shillings
    as your monthly child grant. The officer who approved
    this was K. Otieno. To question this decision, press 1.
    To hear the next receipt, press 2."
```

**Design notes**:

- Voice flow is **the same content**, not a stripped-down version.
- TTS uses the citizen's preferred language and dialect (Companion 148 §6).
- Contestation reachable from every node.
- Press 0 always routes to a human agent.
- Press 9 always routes to the multilingual Civic Assistant (Class A/B AI, Companion 138 §3.2).

---

## 6. Agent kiosk (in-person agent assistance)

The agent kiosk is what an authorized agent uses when serving a citizen at a market, post office, mosque, church, school, or village hall. The citizen sees their own screen too (privacy-preserving co-presence).

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  AGENT TERMINAL — Agent: J. Wanjiku (ID 8821)            ⏱ Session 04:12      │
│                                                                               │
│  CITIZEN PRESENT                                                              │
│  Amina Hassan Mwangi  ←  authenticated with face + voice + token              │
│  CivicID verified                                                             │
│                                                                               │
│  WHAT IS AMINA HERE FOR?                                                      │
│  ☐ Receipt / question about a payment                                         │
│  ☐ Service application                                                        │
│  ☑ Document collection                                                        │
│  ☐ Complaint                                                                  │
│  ☐ Identity / record correction                                               │
│  ☐ Other (describe)                                                           │
│                                                                               │
│  CITIZEN SEES                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  [Mirrored screen — citizen sees what agent is doing on their behalf]    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  AGENT CONDUCT REMINDER                                                       │
│  Agent has read-only access except for actions Amina explicitly authorizes.   │
│  Every action Amina takes through you generates a receipt to her wallet.      │
│                                                                               │
│  [Continue]   [Pause session]   [Hand session to Amina's own device]          │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Design notes**:

- Agent ID, session timer, and "agent conduct reminder" always on screen.
- Citizen has a mirrored view; the agent is doing things **for** the citizen, **in view** of the citizen.
- Every action through agent generates the same receipt as a citizen-direct action; agent ID is on the receipt.
- "Hand session to Amina's own device" — graceful handoff if citizen wants to continue on phone.

---

## 7. Walk-in counter (officer workstation, citizen present)

Same principle as agent kiosk but with a sovereign officer and a counter screen.

```
┌──────────────────────────────────────────────┬───────────────────────────────┐
│  OFFICER WORKSPACE                           │  CITIZEN-FACING DISPLAY        │
│  Officer: K. Otieno (ID 4423)                │                                │
│                                              │                                │
│  CASE: child grant renewal                   │  Hello Amina.                  │
│  Citizen: Amina Hassan Mwangi                │                                │
│                                              │  Officer K. Otieno is helping  │
│  ┌────────────────────────────────────────┐  │  you with your child grant    │
│  │ AI COPILOT (Class B — advisory)        │  │  renewal.                      │
│  │                                        │  │                                │
│  │ Eligibility summary:                   │  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  │ • Children: 2 (verified)               │  │                                │
│  │ • Household income band: 3 (verified)  │  │  WHAT IS BEING REVIEWED        │
│  │ • Last verification: 14 mo ago         │  │                                │
│  │ • Recommended: APPROVE renewal         │  │  Your monthly child grant     │
│  │   at base rate + drought supplement    │  │  for 2 children.               │
│  │                                        │  │                                │
│  │ Supporting evidence:                   │  │  • Children verified           │
│  │ - Civil registry (link)                │  │  • Income band confirmed       │
│  │ - Drought decree #DRC-2026-04 (link)  │  │  • Drought supplement applies  │
│  │                                        │  │                                │
│  │ [ Use this draft ]                     │  │  The officer will explain      │
│  │ [ Edit ]                               │  │  the decision in a moment.     │
│  │ [ Reject and write fresh ]             │  │                                │
│  └────────────────────────────────────────┘  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                              │                                │
│  DECISION                                    │  Your rights:                  │
│  ☑ Approve renewal                           │  • You can question any        │
│  ☐ Request more information                  │    decision made today.        │
│  ☐ Refer for specialist review               │  • Your privacy is protected.  │
│  ☐ Decline                                   │  • You can pause this and      │
│                                              │    come back later.            │
│  [ I sign this decision (K. Otieno) ]        │                                │
│  [ Save and return later ]                   │                                │
└──────────────────────────────────────────────┴───────────────────────────────┘
```

**Design notes**:

- **Officer Copilot is always labeled with Class.** Here: Class B (advisory, officer signs).
- Officer sees the AI's summary and the supporting evidence; clicks through to verify; can edit, reject, or write fresh.
- Citizen sees a parallel, plain-language explanation of what's being reviewed and their rights.
- "I sign this decision (K. Otieno)" — the human signing is the operative act; it shows the officer's name and is logged to Audit Vault.
- **The decision is human, the assistance is AI** (Companion 138 §3.3).

---

## 8. Inbox

```
┌─────────────────────────────────┐
│  ☰   Inbox                ⋯     │
│                                 │
│  UNREAD                         │
│  ┌─────────────────────────────┐│
│  │ ● Ministry of Education     ││
│  │   School transfer approved  ││
│  │   Yesterday                 ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ ● Tax authority             ││
│  │   Your 2026 tax draft is    ││
│  │   ready — please review     ││
│  │   3 days ago                ││
│  └─────────────────────────────┘│
│                                 │
│  READ                           │
│  ┌─────────────────────────────┐│
│  │   Civic Assistant (Class A) ││
│  │   You asked about pension   ││
│  │   eligibility               ││
│  │   1 week ago                ││
│  └─────────────────────────────┘│
│                                 │
│  CONVERSATIONS                  │
│  ┌─────────────────────────────┐│
│  │   Agent J. Wanjiku           ││
│  │   "I'll get back to you      ││
│  │    by Friday."               ││
│  │   2 weeks ago                ││
│  └─────────────────────────────┘│
│                                 │
└─────────────────────────────────┘
```

**Design notes**:

- Letters and decisions from ministries land here, in plain language; the legally-binding original is one tap away.
- AI Assistant conversations are clearly labeled with Class.
- Agent conversations preserved for continuity.

---

## 9. Civic Assistant (AI chat) — citizen-facing

```
┌─────────────────────────────────┐
│  ←   Civic Assistant            │
│                                 │
│  [today, 14:32]                 │
│                                 │
│  ┌─ Amina ─────────────────────┐│
│  │ How do I transfer my child  ││
│  │ to a school in another      ││
│  │ county?                     ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─ Civic Assistant ───────────┐│
│  │ ⓘ I can help with this. I'm ││
│  │   answering at Class A      ││
│  │   (information only).       ││
│  │                             ││
│  │   To transfer a child:      ││
│  │   1. You'll need the        ││
│  │      child's current        ││
│  │      enrollment record.     ││
│  │   2. You apply to the new   ││
│  │      school directly, or    ││
│  │      through your wallet.   ││
│  │   3. The Ministry of        ││
│  │      Education confirms     ││
│  │      within 10 working days │ │
│  │                             ││
│  │   Want me to:               ││
│  │   [Start a transfer]        ││
│  │   [Find schools nearby]     ││
│  │   [Talk to a human officer] ││
│  │                             ││
│  │   Sources I used:           ││
│  │   • Education Act §12       ││
│  │   • Ministry guidance v.4   ││
│  └─────────────────────────────┘│
│                                 │
│  [ Type your question...     ▶] │
│  [🎙 voice]  [👤 talk to human] │
│                                 │
└─────────────────────────────────┘
```

**Design notes**:

- **Decision Class banner ("Class A — information only")** is always visible.
- The assistant cites sovereign-validated sources (Companion 148 §8 terminology registry) inline.
- Three follow-up actions surfaced — concrete next steps, not chat-as-loop.
- "Talk to human officer" is always one tap away (anti-cooptation of help).
- No persistent memory across sessions without explicit citizen consent (Companion 150 §6).

---

## 10. Onboarding (first-time use)

```
   Step 1                         Step 2                         Step 3
┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│  Welcome.               │    │  Choose your language.  │    │  How do you want this   │
│                         │    │                         │    │  to work for you?       │
│  Civic Wallet is how    │    │  ● Swahili              │    │                         │
│  you do business with   │    │  ○ English              │    │  Text size:             │
│  the government —       │    │  ○ Kikuyu               │    │  [Aa]  [Aa]  [Aa]      │
│  receipts, services,    │    │  ○ Somali               │    │   small  med   large    │
│  records, and contest-  │    │  ○ Luo                  │    │                         │
│  ing decisions.         │    │  ○ Kalenjin             │    │  Voice:                 │
│                         │    │  ○ Kamba                │    │  ☑ Read aloud           │
│  This wallet is yours.  │    │  ○ More (12 others)     │    │  ☐ Always voice         │
│  We don't sell it. You  │    │                         │    │                         │
│  can leave any time     │    │  Change later anytime.  │    │  Reminders:             │
│  and take your data.    │    │                         │    │  ☑ SMS                  │
│                         │    │                         │    │  ☐ USSD only            │
│  [Get started]          │    │  [Continue]             │    │  ☐ Email                │
│                         │    │                         │    │  ☐ None                 │
└─────────────────────────┘    └─────────────────────────┘    └─────────────────────────┘

   Step 4                         Step 5                         Step 6
┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│  Identity check         │    │  Your privacy           │    │  You're set.            │
│                         │    │                         │    │                         │
│  We need to confirm     │    │  Some things you should │    │  Your wallet is ready.  │
│  this is really you.    │    │  know:                  │    │                         │
│                         │    │                         │    │  Today you can:         │
│  Choose one:            │    │  ✓ We never share your  │    │  • See your records     │
│  ● Visit an agent       │    │    data without your    │    │  • Apply for services   │
│  ○ Visit an office      │    │    consent.             │    │  • Ask questions        │
│  ○ Verify with my       │    │  ✓ You can see who has  │    │                         │
│    biometrics here      │    │    looked at your       │    │  Need help?             │
│                         │    │    records, always.     │    │  • Press the agent icon │
│  Why? Because we want   │    │  ✓ You can leave any    │    │  • Dial *civic#         │
│  to make absolutely     │    │    time and take your   │    │  • Visit any office     │
│  sure no one else can   │    │    data.                │    │                         │
│  use your name.         │    │  ✓ We never sell your   │    │  [ Take me home ]       │
│                         │    │    data.                │    │                         │
│  [Continue]             │    │  [I understand]         │    │                         │
└─────────────────────────┘    └─────────────────────────┘    └─────────────────────────┘
```

**Design notes**:

- **No "Sign up with…" buttons. No social login. No marketing.**
- Step 1 names the wallet's purpose and the citizen's exit right in the very first sentence.
- Step 2 lists languages including indigenous and minority languages from the Sovereign Language Inventory (Companion 148 §3).
- Step 3 accessibility-first — text size, voice, channel preference all set before any identity check.
- Step 4 offers multiple identity verification paths; biometric-on-device is one option, not the only one (inclusion floor).
- Step 5 is the privacy contract, not a 40-page ToS dialog.
- Step 6 ends with three concrete things the citizen can do **today**, not a tutorial loop.

---

## 11. States and edge cases

### 11.1 Offline state

```
┌─────────────────────────────────┐
│  Civic Wallet              ⚠    │
│                                 │
│  You're offline.                │
│                                 │
│  You can still:                 │
│  • See your records             │
│  • Read your receipts           │
│  • Start applications (will     │
│    submit when you're back)     │
│                                 │
│  You can't right now:           │
│  • Make a payment               │
│  • Verify a new credential      │
│                                 │
│  We'll sync when you reconnect. │
│  Anything you do now is saved.  │
│                                 │
└─────────────────────────────────┘
```

### 11.2 Service degraded state (e.g., national NCCC activation, partial outage)

```
┌─────────────────────────────────┐
│  ⓘ  System notice               │
│                                 │
│  Some services are limited      │
│  right now because of the       │
│  flood response (declared       │
│  emergency #EM-2026-04).        │
│                                 │
│  Affected:                      │
│  • New tax filings delayed      │
│  • Land registry slowed         │
│                                 │
│  Working normally:              │
│  • All payments                 │
│  • Emergency services           │
│  • All identity functions       │
│  • All contestation channels    │
│                                 │
│  [Read the full notice]         │
│                                 │
└─────────────────────────────────┘
```

### 11.3 Contestation pending

After a citizen contests a decision, the affected surface shows the case in flight:

```
┌─────────────────────────────────┐
│  Child grant — April 2026       │
│                                 │
│  ⏳ Under review                │
│  Case #C-7821                   │
│                                 │
│  You questioned this on 14 May. │
│  We're reviewing.               │
│                                 │
│  Your payment continues.        │
│  We'll let you know by 20 May.  │
│                                 │
│  [Track this case]              │
│                                 │
└─────────────────────────────────┘
```

### 11.4 AI assistant uncertain

If the assistant doesn't know, it says so:

```
┌─ Civic Assistant ───────────────┐
│ ⓘ I'm not sure about this one.  │
│                                 │
│ This is a complex question      │
│ about cross-border pension      │
│ rights. I don't want to give    │
│ you a wrong answer.             │
│                                 │
│ Let me connect you to a human   │
│ officer who can answer this     │
│ properly. Is that OK?           │
│                                 │
│ [ Yes, connect me ]             │
│ [ Ask a different question ]    │
└─────────────────────────────────┘
```

---

## 12. Accessibility (binding, not optional)

Per Companion 110:

- **Text scaling** up to 200% without layout break.
- **Screen reader** support across all surfaces (semantic markup, ARIA, labels).
- **High contrast** mode and color-blind-safe palettes.
- **Voice control** for all primary actions.
- **Sign language video** interpretation available on demand for any decision flow.
- **Cognitive accessibility**: plain language, single-action-per-screen on critical flows, undo on every form, no time-limited inputs.
- **Motor accessibility**: large tap targets (≥44pt), no double-tap-required actions.

---

## 13. Microcopy principles

| Anti-pattern | What we write instead |
|---|---|
| "An error has occurred." | "We couldn't save that. The connection dropped. We've kept your draft — try again." |
| "Your application is under processing." | "We received your application on 14 May. We'll decide by 20 May. Officer K. Otieno is reviewing." |
| "Click here to learn more." | "How AI was used in this decision" |
| "By continuing you agree to…" | "You can stop any time. Your data stays yours." |
| "Are you sure you want to cancel?" | "Cancel this application? Your draft will be saved for 30 days." |
| "Action required." | "Two minutes: confirm your address for the school transfer." |
| "We value your privacy." | "Today, 3 people looked at your records — all for the medical visit you booked. [Show who]" |

---

## 14. Component library

The wallet ships a sovereign-controlled component library; ministries adopt it for consistency. Components include:

- **Receipt card** (with verify signature affordance)
- **Decision banner** (Class A/B/C/D/E)
- **Contestation panel**
- **Plain-language summary**
- **Officer-named signature**
- **Selective disclosure list** (sharing / not sharing)
- **Pending action card**
- **Access log entry**
- **Multi-step flow with breadcrumb**
- **Voice/visual toggle**
- **Language switcher**
- **Agent handoff control**

All components are RTL-aware, locale-aware, accessibility-tested, and shipped open-source under the sovereign component license.

---

## 15. KPIs (UX, citizen-facing)

| KPI | Target |
|---|---|
| Time to find a receipt from home | ≤2 taps |
| Time to contest a decision | ≤3 taps |
| Time to talk to a human agent | ≤2 taps from any service surface |
| First-screen-language matching citizen preference | 100% |
| Plain-language readability score (per People's Editor) | A grade across all primary copy |
| Accessibility audit | WCAG 2.2 AA minimum; AAA on critical flows |
| Offline action queue success rate on reconnection | ≥99.9% |
| Citizen satisfaction (per stratified survey) | Trending up, stratified by language/region/age/disability |
| Contestation outcome rate (in favor of citizen) | Stratified; investigated by Algorithmic Ombudsman if disparate |

---

## 16. Forbidden in citizen wallet UX

- Dark patterns of any kind.
- Hidden consent. Pre-checked opt-ins. Buried opt-outs.
- "Upsell" of services or third-party offerings.
- Manufactured urgency.
- Streaks, badges, gamification of civic participation.
- Notifications that aren't service-relevant.
- Engagement metrics as design targets.
- Behavioral nudging that benefits the state rather than the citizen.
- Targeted content based on inferred citizen attributes.
- Cross-service identity tracking beyond per-RP UIDs.
- Persistent AI assistant memory without explicit citizen consent.

---

## 17. The Civic Wallet design north star

The wallet is not a product to be optimized for engagement. It is a relationship interface between a citizen and the polity. Every screen should make the citizen feel: I am respected, I can see what was done, I can question what was decided, I can leave whenever I want, and I can use this in my language on the device I have.

When the wallet becomes a daily app the citizen would rather not open, the design has failed. When it becomes an app the citizen opens to be entertained or upsold, the design has failed worse. When it becomes the calm, reliable place where the citizen sees their records, their receipts, and their state — quick, clear, contestable, and dignified — the design has succeeded.

The design is the doctrine made tangible. The doctrine is the design's reason. Anything less in the design abandons the doctrine in the surface citizens actually touch.
