# CivicOS — Spatial and Immersive Governance Interfaces (Companion 157)

This companion is the product specification of CivicOS's **spatial and immersive governance interfaces** — the post-screen surfaces (large-scale spatial displays, AR/MR overlays, voice and ambient AI, haptic and accessible alternatives, holographic remote presence, situated planning environments) that complement and progressively extend the desktop/mobile/USSD/IVR baselines specified in Companions 152–156. It complements Companion 142 (NCCC), Companion 143 (digital twins), Companion 149 (NDNS), Companion 154 (command center), and Companion 148 (SLIL) by specifying how these surfaces work, what they show, what they refuse to show, and how doctrine binds them.

The thesis: **moving beyond screens is a powerful capability and a powerful temptation. Spatial and immersive interfaces shape the perception of authority more than any prior governance technology — they make presence persuasive, make absence invisible, and make ambient AI persuasive at scale. CivicOS designs immersive surfaces under the same seven invariants as flat surfaces, the same restricted-domain prohibitions, the same constitutional officer supervision, the same civil society standing, and the same inclusion floor that ensures the citizen on a flip phone is never demoted by the citizen in spatial AR**. The immersive is an addition to the inclusion floor, not a replacement; an extension of the doctrine, not an exemption from it.

The discipline: spatial/immersive as accessibility layer not replacement; constitutional officer supervision; civil society standing; AI Class C/D/E under charter; no autonomous spatial agency; no surveillance via immersive sensors; multimodal accessibility; sovereign-controlled XR substrate; replaceability engineered; cultural sensitivity; intergenerational stewardship.

---

## 1. Principles

1. **Immersive is an addition.** The inclusion floor (USSD/IVR/agent/walk-in) is never demoted.
2. **No autonomous spatial agency.** Spatial AI advises; humans decide and sign.
3. **No immersive surveillance.** Sensors that perceive a room do so under consent, not by default.
4. **Constitutional officer supervision binds immersive too.** Algorithmic Ombudsman, Sovereign Trust Officer, etc.
5. **Civil society and indigenous nation standing.** In immersive spaces and on immersive content.
6. **Multimodal accessibility.** Every immersive surface has a flat-screen, audio, and tactile equivalent.
7. **Sovereign-controlled XR substrate.** No foreign-controlled VR/AR platforms running statecraft.
8. **AI Class discipline preserved.** Class A/B/C/D/E remains the framework.
9. **Cultural and sensory accommodation.** Per Companion 36 (indigenous), 51 (religious), 110 (accessibility).
10. **Replaceability engineered.** Immersive layer is replaceable; flat-screen always available.

---

## 2. Surface taxonomy

| Surface | Use case | Substrate | Inclusion floor present? |
|---|---|---|---|
| **Spatial planning environment** | NCCC deliberation table, digital-twin walkthrough | Sovereign large-format display + table; optional holographic projection | Yes — flat-screen and paper always available |
| **AR field overlay (on-site work)** | Inspector verifying a building; surveyor reviewing land; doctor reviewing a patient context (with consent) | Lightweight AR (phone or glasses); sovereign-controlled stack | Yes — paper checklist always available |
| **Ambient AI (deliberation rooms)** | Conference room "ambient" assistance for officials | Microphone + display; consent-of-all-present required | Yes — meetings always work without ambient |
| **Voice-first immersive (citizen-facing)** | Visually-impaired citizen interacting hands-free; older citizen preferring conversation | TTS/ASR per SLIL; on phone, in home, in agent-supported kiosks | Yes — voice is the inclusion floor |
| **Haptic/tactile** | Deaf-blind citizens; sensory accommodation | Refreshable braille; haptic vibration | Yes — first-class |
| **Holographic remote presence** | A constitutional officer remote-attending an NCCC; cross-sovereign liaison | Sovereign-controlled telepresence | Yes — flat video always available |
| **Citizens' Assembly immersive** | Participatory budgeting walkthrough; spatial deliberation on a public project | Large-format display + walkable model; optional AR | Yes — physical model and flat-screen always available |
| **Field commander view** | Disaster-response field commander | AR overlay on a hardened device | Yes — paper-radio fallback always |

---

## 3. Spatial planning environment (the deliberation table, extended)

In an NCCC or planning context, the deliberation table becomes a **spatial scenario environment** — a walk-around, scrub-time, multi-layer 3D model of the affected region. (Cross-referenced from Companion 154 §12.1.)

```
                        Spatial scenario environment (schematic)
        ╔══════════════════════════════════════════════════════════════════════╗
        ║                                                                      ║
        ║                  [3D topographic model — 4m × 3m]                    ║
        ║                                                                      ║
        ║      • topography     • infrastructure    • hazard cones             ║
        ║      • resource       • population        • indigenous land          ║
        ║        deployment        density            overlays (with consent)  ║
        ║        markers          (DP-protected,                                ║
        ║                          1km grid floor)                              ║
        ║                                                                      ║
        ║   Walk around; touch a feature to query; voice-query a layer;        ║
        ║   scrub-time to see 6h ago, now, 6h ahead, 24h ahead, 72h ahead.     ║
        ║                                                                      ║
        ║   Civil society liaison can leave a spatial annotation at a          ║
        ║   location ("evacuation route bypasses these communities").          ║
        ║   Indigenous nation representative can add a cultural-protocol       ║
        ║   note at sacred sites.                                              ║
        ║                                                                      ║
        ║   Remote participants appear as labeled markers at their viewpoint.  ║
        ║   Constitutional officers' annotations are tagged with their office. ║
        ║                                                                      ║
        ║   Flat-screen mirror always live (so any participant can join from   ║
        ║   a normal workstation or tablet).                                   ║
        ║                                                                      ║
        ╚══════════════════════════════════════════════════════════════════════╝
                                       │
                                       │ (also rendered on the wall;
                                       │  also rendered on tablets;
                                       │  also printable as static maps)
                                       ▼
                          Manual fallback: paper maps in the room
```

### 3.1 Privacy invariants in spatial

- **No citizen-individual layer**. Cannot be requested, cannot be enabled (Companion 143 §6).
- **Population density at 1km grid floor**, differential-privacy applied.
- **Indigenous overlays only with consent** of the nation.
- **Cross-border overlays only under active treaty**.

### 3.2 Class discipline

- The spatial scenario engine is Class D (recommendation only). It **never decides**; it surfaces.
- Annotations are signed by their author (officer, civil society liaison, indigenous representative, constitutional officer).
- Scenario AI surrogates carry their Class banner in the environment too.

### 3.3 Forbidden in spatial planning

- Citizen-individual layer.
- Surveillance overlay of dissidents or civil society.
- Predictive citizen-behavior visualization.
- Foreign-controlled spatial substrate.
- Persuasive lighting/sound design.
- Removal of paper-map fallback.

---

## 4. AR field overlay (officer in the field)

A building inspector verifying compliance; a land surveyor verifying a registry; a disaster-response field commander; a doctor reviewing a patient context (with patient consent).

```
        Field officer's view (through AR phone or sovereign-controlled glasses)

        ┌─────────────────────────────────────────────────────────────────┐
        │   real-world view                                                │
        │                                                                  │
        │      [the building in front of the inspector]                   │
        │                                                                  │
        │   ╔══════════════════════════════════════════════════════════╗   │
        │   ║  Plot 4423, Kiambu  •  Building permit 2026-04-A1        ║   │
        │   ║                                                            ║   │
        │   ║  Permit conditions:                                        ║   │
        │   ║  ● Fire safety annex required (verified)                   ║   │
        │   ║  ● Setback 5m from road (look ← →)                         ║   │
        │   ║  ● Accessibility per Companion 110                         ║   │
        │   ║                                                            ║   │
        │   ║  Copilot (Class B — advisory):                              ║   │
        │   ║  Issues I can see in the live view:                         ║   │
        │   ║  • Setback appears < 5m on south side — confirm with tape   ║   │
        │   ║  • Accessibility ramp missing                                ║   │
        │   ║                                                            ║   │
        │   ║  Decide:                                                    ║   │
        │   ║  ○ Pass                                                     ║   │
        │   ║  ● Conditional pass (note issues; revisit)                  ║   │
        │   ║  ○ Fail                                                     ║   │
        │   ║                                                            ║   │
        │   ║  [ Sign decision (Inspector M. Khumalo) ]                   ║   │
        │   ║  [ Discuss with citizen ]                                   ║   │
        │   ║  [ Switch to paper checklist ]                              ║   │
        │   ╚══════════════════════════════════════════════════════════╝   │
        │                                                                  │
        │   no faces of bystanders captured; no PII overlaid;              │
        │   record-only-with-consent mode                                  │
        └─────────────────────────────────────────────────────────────────┘
```

### 4.1 Privacy invariants in AR

- **No faces, no PII** overlaid in field view.
- **Camera recording with explicit consent** (citizen present) and logged to Audit Vault.
- **Inspector cannot capture imagery of bystanders** beyond the necessary subject.
- **No ML-driven gaze tracking** of bystanders.

### 4.2 Class discipline

- AR copilot is Class B — advisory. Inspector signs.
- The decision can also be made on the paper checklist; AR is augmentation, not replacement.
- Switch-to-paper button always available.

### 4.3 Forbidden in AR field overlay

- Facial recognition of bystanders.
- Surveillance of citizens through field AR.
- Capture of imagery without consent.
- AI auto-pass/auto-fail (Class D restricted-domain action).

---

## 5. Ambient AI (in deliberation rooms, with consent)

Ambient AI listens to a meeting and surfaces relevant policy clauses, prior cases, or scenario parameters when asked. Requires **consent of all present**.

```
        ┌─────────────────────────────────────────────────────────────────┐
        │   AMBIENT (Class B — advisory)                                   │
        │   Activated by all-present consent at meeting start.            │
        │   ⓘ Indicator visible to all participants throughout.            │
        │                                                                  │
        │   What ambient does:                                             │
        │   • Listens for explicit invocation: "Civic, can you…"           │
        │   • Surfaces relevant material on the wall on request            │
        │   • Drafts a meeting minute (review required before signing)    │
        │   • Tracks action items mentioned                                │
        │                                                                  │
        │   What ambient does NOT do:                                     │
        │   • Volunteer comments without invocation                       │
        │   • Express opinions                                             │
        │   • Decide anything                                              │
        │   • Surveil tone, sentiment, or attendance                       │
        │   • Identify speakers beyond what they explicitly attest         │
        │   • Persist a recording beyond the agreed window                 │
        │                                                                  │
        │   Sunset: this session ends at 12:30. Recording auto-deletes    │
        │   in 7 days unless a participant flags it for retention.        │
        │   Any flag is logged and reviewable.                            │
        │                                                                  │
        │   Anyone can press [ Stop listening ] at any moment.            │
        └─────────────────────────────────────────────────────────────────┘
```

### 5.1 Privacy invariants in ambient

- **All-present consent at session start**; opt-out is one button.
- **Indicator visible throughout** (a small constant glow / icon).
- **No sentiment analysis, no speaker identification beyond declared roles, no attendance tracking**.
- **Sunset retention** — clearly communicated.

### 5.2 Class discipline

- Class B advisory. The ambient AI **never decides**.
- Drafts (minutes, action items) require human review and sign-off.

### 5.3 Forbidden in ambient AI

- Listening without consent.
- Sentiment / emotion analysis of participants.
- Speaker identification beyond declared role.
- Persistent retention without retention flag.
- Unprompted commentary or opinion.
- Cross-room aggregation.
- Use of ambient for officer surveillance.

---

## 6. Voice-first immersive (citizen-facing)

For citizens who prefer or require voice — visually impaired, older adults, low-literacy, multitasking caregivers — the platform supports rich voice interaction beyond IVR menus.

```
                     Voice-first citizen interaction
       ──────────────────────────────────────────────────────────────────────
       Citizen: "Tell me about the school transfer I started."
       Civic Assistant (Class A — info): "Yes — you started a school
       transfer for Aisha on 12 May. The new school is Mukuvisi
       Primary. We're waiting on confirmation from the new school.
       I can read you the most recent message, or I can ask the school
       for an update — which would you like?"
       Citizen: "Ask the school."
       Civic Assistant: "I can prepare a follow-up message. I'll read
       it back to you before sending. Ready?"
       Citizen: "Yes."
       Civic Assistant: "Here it is in your words and theirs:
       'Hi Mukuvisi Primary, can you update on the transfer of Aisha
       Mwangi, application AM-2026-04? Sent by her parent on her
       behalf.' Should I send this?"
       Citizen: "Send it."
       Civic Assistant: "Sent. They have 5 working days to reply.
       I'll let you know."
       ──────────────────────────────────────────────────────────────────────
       Every voice turn is also rendered in text in the wallet, with
       receipts logged. Citizen can later read what the assistant said
       and contest if it misrepresented.
```

### 6.1 Privacy invariants in voice-first

- **Recording only of what the citizen consents to** (with default per Companion 11).
- **No voice biometric tracking** of the citizen for cross-service identification.
- **No emotion analysis** in citizen-facing voice.
- **Speaker confirmation** before binding actions — voice biometric used only as an additional factor when citizen opts in.

### 6.2 Class discipline

- Civic Assistant in voice is Class A (info) or Class B (advisory).
- Binding actions still require explicit citizen authorization (biometric, token, or verbal-with-replay confirmation).

### 6.3 Multilingual binding

Per Companion 148 SLIL §6:

- TTS and ASR per inventory language.
- Major dialects supported.
- Code-switching handled.
- Sign-language video alternative for Deaf citizens.

---

## 7. Haptic and tactile surfaces

Citizens who are blind, deaf-blind, or have other accessibility needs interact through tactile and haptic surfaces.

- **Refreshable braille displays** integrated with the wallet (Companion 110).
- **Haptic vibration** patterns for alerts (e.g., a distinct vibration for "decision-needs-your-attention" vs "informational").
- **Tactile maps** for spatial planning sessions (3D-printed; embossed; ensure indigenous nation representatives can engage with physical models when culture or accessibility prefers).
- **Air gestures and switch-control** for citizens with severe motor disabilities.

These are first-class, not afterthoughts. The wallet's component library ships haptic-aware, braille-aware components by default.

---

## 8. Holographic remote presence

When a constitutional officer cannot be physically present at an NCCC, a holographic remote-presence affordance lets them attend with full standing — clearly marked as remote.

```
        ┌──────────────────────────────────────────────────────────────────┐
        │                                                                  │
        │   Deliberation table                                             │
        │                                                                  │
        │      ●  STO (in person)                                          │
        │      ●  Ombudsman (in person)                                    │
        │      ◌  Inspector General (remote, holographic) ← labeled       │
        │      ●  People's Editor (in person)                              │
        │      ◌  Future Generations Commissioner (remote video) ← labeled │
        │                                                                  │
        │   Remote participants have full standing. Each is labeled as     │
        │   remote so the room knows. Their objection power and signing    │
        │   authority are equal.                                           │
        │                                                                  │
        │   The hologram is sovereign-controlled (no foreign telepresence  │
        │   platform). The audio/video link is encrypted with sovereign    │
        │   keys.                                                          │
        │                                                                  │
        │   If the link drops, the official is flagged "off" and the room  │
        │   pauses any sign-off requiring their concurrence.               │
        │                                                                  │
        └──────────────────────────────────────────────────────────────────┘
```

### 8.1 Forbidden in holographic presence

- Foreign-controlled telepresence substrate.
- Surreptitious recording of the room without all-participant consent.
- Replay of holographic presence as if "in person" (always labeled remote).
- Use of holographic presence to fake authority an official does not have.

---

## 9. Citizens' Assembly immersive (participatory deliberation)

A Citizens' Assembly (Companion 19) discussing a public project — say a new highway or a coastal-protection program — uses an immersive walk-around of the proposed project.

```
                  Citizens' Assembly spatial deliberation
       ──────────────────────────────────────────────────────────────────────
       Setting: assembly room with a physical 3D model on a low table.
       Optional: AR phones for assembly members to overlay scenarios.
       Standard: paper plans on the wall.
       Inclusion floor: voice and tactile descriptions for blind members;
       sign-language interpretation; multilingual narration.

       Assembly member: "If we build the new bypass here, what happens to
       the Kibarani neighborhood?"
       Facilitator: "Let me show you. Here's the bypass route." [model
       lights up the route] "These are the households affected — about
       180 households, anonymized. These are the existing schools and
       clinics. Civil society has noted that this route disadvantages
       these communities; here is the equity overlay."
       Indigenous representative: "I want to note the sacred site here.
       Any route must respect it."
       Assembly member: "What's the alternative?"
       Facilitator: "Here's an alternative — [lights up]. It's longer
       and more expensive, but avoids those communities. Trade-offs
       are summarized here."
       Assembly votes after deliberation.
       ──────────────────────────────────────────────────────────────────────
       No citizen-individual surveillance. No predictive citizen movement.
       Equity overlay, civil society note, and indigenous protocol present.
```

### 9.1 Discipline

- **No identifiable households** — aggregated to a privacy floor (typically 50+ households per visualized unit, DP-applied).
- **Equity overlays mandatory** when route or program affects communities differently.
- **Indigenous protocol observance**.
- **Multilingual facilitation**.
- **Accessibility primary**.

### 9.2 Forbidden in Citizens' Assembly immersive

- Identifiable household visualization.
- Predictive citizen visualization.
- Persuasive design (lighting, sound, framing biased toward outcome).
- Civil society excluded from the room.
- Indigenous protocol bypassed.

---

## 10. Field commander view (disaster response)

A field commander leading a flood response uses an AR-overlay on a hardened device with paper-radio fallback always available.

```
                 Field commander AR overlay
       ┌──────────────────────────────────────────────────────────────────┐
       │   real view of the flood scene                                   │
       │                                                                  │
       │   ╔══════════════════════════════════════════════════════════╗   │
       │   ║ Zone A • Tana District • t = 13:42                        ║   │
       │   ║                                                            ║   │
       │   ║  Water level: ▲ 0.3m in last 2h                            ║   │
       │   ║  Vulnerable: 3 households flagged (with consent — see     ║   │
       │   ║    note from civil society)                                 ║   │
       │   ║  Shelter capacity at Mukuvisi school: 240 of 500           ║   │
       │   ║  Mutual aid offered from Kilifi: 4 ambulances incoming    ║   │
       │   ║                                                            ║   │
       │   ║  Decision required:                                        ║   │
       │   ║  ● Move people in zone A-3 to high ground now              ║   │
       │   ║  ○ Wait 2h for additional resources                         ║   │
       │   ║                                                            ║   │
       │   ║  [ I sign this decision (Field Cdr S. Kiprotich) ]         ║   │
       │   ║  [ Confer with NCCC ]                                       ║   │
       │   ║  [ Switch to paper-radio mode ]                             ║   │
       │   ╚══════════════════════════════════════════════════════════╝   │
       │                                                                  │
       │   Battery: 78%  •  Backup radio: connected  •  Audit anchor: ok │
       └──────────────────────────────────────────────────────────────────┘
```

### 10.1 Discipline

- AR is augmentation. **Paper-radio mode** is one button. The commander can switch instantly to a paper checklist and radio voice protocol.
- Vulnerable-household flags come from civil society partners and citizen self-flagging, **with consent**.
- The decision is signed by the named commander.

### 10.2 Forbidden in field commander view

- Live surveillance feed of populations not consenting.
- Identification of bystanders.
- AI auto-evacuation (Class D restricted-domain action).
- Removal of paper-radio fallback.

---

## 11. Anti-persuasive design

Immersive environments are **persuasive by nature** — lighting, sound, scale, framing, and presence all shape decisions. CivicOS deliberately refuses persuasive design.

| Anti-pattern | Why forbidden |
|---|---|
| Red lighting on "danger" overlays beyond signal value | Manufactures urgency; biases decisions |
| Music or sound design in deliberation rooms | Mood shaping |
| Authority figures rendered taller/larger via AR | Power asymmetry built into the medium |
| Avatars representing AI as humanoid | Falsely implies agency/relationship |
| Subtle haptic "nudges" toward a recommended action | Coercive by design |
| Time-pressure visuals beyond actual deadlines | Manufactured urgency |
| Personalized framing of indicators based on inferred officer attributes | Surveillance + persuasion compounded |
| "Recommended" highlighted brighter than alternatives | Biases choice |

**Equal-weight design**: alternatives are rendered with equal visual weight; "discuss" and "decline-with-reason" are co-equal to "approve."

---

## 12. Multimodal accessibility — every immersive surface has a flat equivalent

For every immersive surface, the platform provides:

- **A flat-screen / tablet equivalent** that mirrors the immersive state.
- **A voice equivalent** narrating the surface (per SLIL).
- **A tactile equivalent** where applicable (refreshable braille, embossed map).
- **A printed equivalent** for any deliberation surface (maps, scenarios, summaries).

A citizen, officer, civil society representative, or constitutional officer who cannot use the immersive surface can participate fully through these equivalents — including remote, in real time.

---

## 13. Indigenous and cultural protocols

Per Companion 36 and 51:

- **Sacred sites are not rendered** in spatial models without the consenting nation's permission.
- **Cultural protocols around imagery, ancestor representation, language naming, ceremonial calendar overlays** are observed.
- **Indigenous representatives have spatial-annotation authority** equal to other authorities.
- **AR overlays in indigenous territories** require nation council permission.

---

## 14. Sovereign-controlled XR substrate

- VR/AR headsets and spatial displays used in NCCC and field contexts are **sovereign-procured under attested supply chain** (Companion 86, 137).
- **No foreign-controlled spatial platform** runs statecraft.
- **Source escrow** for closed-source XR components.
- **Open-source XR runtimes preferred** where capable.

### 14.1 Privacy of immersive data

- **Eye-tracking, gaze data, biometric data** captured by XR devices is **not retained** beyond session unless explicit citizen/officer consent.
- **No cross-session biometric profiling** of officials or citizens.
- **No commercial telemetry** to vendors.

---

## 15. Class discipline preserved in immersive

| Class | Spatial / immersive rendering rule |
|---|---|
| **A** (info) | Spatial overlays/voice that surface information; no decision affordances |
| **B** (advisory) | Spatial overlays that present recommendations + uncertainty + alternatives; human signs in immersive but the signing affordance is the same biometric+token ceremony as desktop |
| **C** (narrow automation) | Immersive shows what was automated and flags for human review; tripwire dashboards visible spatially |
| **D** (restricted recommendation) | Spatial pattern surfacing only; no decision affordance in immersive whatsoever |
| **E** (sovereign coordination) | NCCC convening; multiple authorities sign in immersive ceremony; constitutional officer presence required |

**Class banners persist in immersive.** They are not background — they are part of the spatial frame the user inhabits.

---

## 16. Performance and reliability

| Metric | Target |
|---|---|
| Spatial model render latency | <100ms on supported hardware |
| AR overlay register accuracy | <10cm offset, indoor field |
| Voice-assistant first-response | <800ms |
| Holographic presence link uptime during active session | ≥99.9% |
| Flat-screen mirror parity | live, <500ms behind immersive |
| Switch-to-paper fallback time | instant |
| Battery life, hardened AR device, field commander mode | ≥8h |
| All-present consent capture on ambient | <30s |

---

## 17. Cross-references

- Companion 19 (Citizens' Assemblies)
- Companion 22 (plain language)
- Companion 23 (sensors and IoT — but IoT for infrastructure, not surveillance)
- Companion 28 (constitutional officers)
- Companion 35 (contestability)
- Companion 36 (indigenous protocols)
- Companion 49 (sustainability — XR hardware footprint)
- Companion 51 (religious / cultural)
- Companion 60 (alerts / misinformation)
- Companion 67 (offline-first edge)
- Companion 74 (civil society)
- Companion 86 (supply chain attestation)
- Companion 110 (accessibility)
- Companion 134 (physical infrastructure)
- Companion 137 (sovereign cloud and compute)
- Companion 138 (constitutional AI)
- Companion 142 (NCCC)
- Companion 143 (digital twins)
- Companion 148 (SLIL)
- Companion 149 (NDNS)
- Companion 152–156 (UX baselines)

---

## 18. KPIs

| KPI | Indicator |
|---|---|
| Immersive surface availability with flat-screen parity | 100% |
| All-present consent capture for ambient sessions | 100% |
| Civil society standing access in immersive deliberation | Active |
| Constitutional officer presence in NCCC immersive | Per activation |
| AR field overlay privacy compliance audit | Annual |
| Voice-first multilingual coverage | Inventory languages 14/14 |
| Tactile/haptic accessibility coverage | Audit per cycle |
| Sovereign XR substrate share | 100% NCCC and field |
| Persuasive-design audit | Per cycle (anti-persuasive verified) |
| Eye-tracking/biometric retention compliance | Zero session-persistent without consent |

---

## 19. Forbidden in spatial and immersive governance interfaces

- Persuasive design (mood lighting/sound/scale beyond signal value).
- Citizen-individual rendering in spatial models.
- Surveillance overlay of dissidents or civil society.
- Facial recognition of bystanders in AR.
- Ambient AI listening without all-present consent.
- Sentiment / emotion analysis in any immersive surface.
- AI auto-decision in restricted domains via spatial affordance.
- Avatars representing AI as humanoid agent.
- Power-asymmetric rendering of authority figures.
- Removal of flat-screen / voice / paper alternatives.
- Foreign-controlled XR platform running statecraft.
- Eye-tracking or biometric retention beyond session without consent.
- Cross-session biometric profiling.
- Holographic presence misrepresented as physical presence.
- Sacred sites rendered without consenting nation's permission.
- Engagement gamification of immersive deliberation.
- Immersive surveillance of officers or citizens through XR sensors.

---

## 20. The Spatial and Immersive Governance Interfaces north star

Moving beyond screens is a powerful capability and a powerful temptation. Spatial and immersive interfaces shape the perception of authority more than any prior governance technology. CivicOS designs immersive surfaces under the same seven invariants, the same restricted-domain prohibitions, the same constitutional officer supervision, the same civil society standing, the same inclusion floor that ensures the citizen on a feature phone is never demoted by the citizen in spatial AR. The immersive is an addition to the inclusion floor, not a replacement; an extension of the doctrine, not an exemption.

When CivicOS becomes infrastructure where spatial planning subtly manufactures urgency, where AR overlays surveil bystanders, where ambient AI listens without consent, where holographic authority figures tower over citizens, where indigenous sacred sites are rendered without permission, where eye-tracking quietly profiles, where AI agents wear humanoid avatars that feel like deciders — it has failed at the immersive discipline. Capability without immersive-discipline is the institutionalization of persuasion as governance through the medium that shapes perception most powerfully.

When the platform supports immersive surfaces that augment without replacing, that preserve every accessibility alternative, that bind to Class discipline visibly, that observe indigenous protocols, that capture consent before listening, that name remote presence honestly, that surface equity overlays mandatory in deliberation, that render alternatives at equal weight, that switch to paper-and-radio instantly when needed — it earns the right to extend governance interfaces beyond the screen without surrendering the doctrine.

The discipline is daily. The inclusion floor is preserved. The civil society is present in spatial rooms too. The constitutional officers supervise immersive AI. The indigenous nations are co-authors of their territories. The persuasive design is refused. The privacy is invariant. The fallback is instant.

Immersive is the most powerful medium governance has ever had. The platform's job is to make sure the medium serves the doctrine, not the medium serves the persuasion that erodes it. Anything less builds rooms shaped like power, voices that feel like agency, presences that feel like authority — and those who design rooms have always shaped what happens in them more than they have admitted. The platform admits this, and refuses to let immersive design become the quiet seat of unaccountable governance.
