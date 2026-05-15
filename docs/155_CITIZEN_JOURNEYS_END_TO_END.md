# CivicOS — Citizen Journeys, End-to-End (Companion 155)

This companion is the **journey spec** of CivicOS — end-to-end life moments rendered as concrete user journeys across surfaces (smartphone, USSD, IVR, agent kiosk, walk-in), channels, ministries, and decision classes. Each journey shows what the citizen experiences, what officers do, what receipts are issued, and what manual fallback exists if the digital path fails. It complements Companion 152 (wallet UX), Companion 153 (officer console), Companion 154 (command center), Companion 146 (ministry onboarding), and Companion 67 (offline-first edge) by being specifically about lived citizen experience.

Each journey is annotated with:

- **Surfaces** the journey crosses
- **Decision Classes** (A/B/C/D) involved
- **Channels** (smartphone, USSD, IVR, agent, walk-in)
- **Manual fallback** present at every step
- **Doctrine notes** linking back to invariants and forbidden lists

---

## Journey 01 — A child is born

**Persona**: Fatma, 28, in a rural ward 90km from the nearest district hospital. Smartphone with intermittent data. Speaks Swahili and some Somali.

```
 Moment        Citizen experience                                Behind the scenes
 ───────────────────────────────────────────────────────────────────────────────
 Day 0         A traditional birth attendant is present.        No digital action.
 (delivery)    Fatma is supported by family. The baby is        Manual fallback
               born healthy at 03:14.                            is the default at
                                                                  delivery.
 ───────────────────────────────────────────────────────────────────────────────
 Day 1         A community health volunteer arrives mid-         CHV uses a USSD-
 (notification)morning and dials *civic# on her phone.          based health intake
               "Welcome. To register a birth, press 4."         (Class A info, no
               She enters the village code, the household ID,   binding action).
               and selects "new birth — at home, alive."         The system queues
               Fatma confirms verbally and gives her CivicID    a notification —
               token tap.                                        not a registration.
 ───────────────────────────────────────────────────────────────────────────────
 Day 3         A clinic-based nurse visits the ward (mobile     Officer console
 (vital signs) clinic). She measures, listens, weighs.          (Class B advisory)
               Fatma signs the visit on the nurse's tablet.     surfaces vaccination
               In her wallet (offline-cached when she gets      schedule + flags
               signal) a receipt appears: "Newborn visit by    follow-up.
               Nurse A. Hussein. Weight 3.4kg, all nominal."   Officer signs.
 ───────────────────────────────────────────────────────────────────────────────
 Day 7         A civil registrar visits the village hall on     Officer at the hall:
 (registration)visit day. Fatma walks 1.2km with her brother.   civil registrar console.
               She brings: her CivicID token, the CHV's        Officer reviews CHV
               birth notification ID, an elder's witness.       record, witnesses, and
               The registrar issues a signed birth record.     issues record (Class B).
               Fatma chooses the name in Swahili Arabic        Officer signs; record
               script and Latin script. A receipt arrives.     issued.
 ───────────────────────────────────────────────────────────────────────────────
 Day 10        In her wallet: "Eligibility check for child     Welfare module: Class C
 (entitlements)grant — based on your household band and        narrow rule applied
               this birth, you qualify. Apply?"                 (auto-eligibility test
               She presses "Apply." She is asked: "Do you      with charter CH-014).
               want this in your CivicPay wallet (M-Pesa) or   Officer K. Otieno
               another?" She chooses M-Pesa.                    co-reviews per
                                                                random re-audit.
 ───────────────────────────────────────────────────────────────────────────────
 Day 14        First disbursement: KES 2,400 to her M-Pesa.    CivicPay rails;
               Receipt with officer name and reasoning.        receipt to wallet
               She can question it in two taps.                  with Audit Vault anchor.
 ───────────────────────────────────────────────────────────────────────────────
 Week 6        Vaccination reminder via IVR (in Swahili,       Health module: per
 (immunization)her preferred language). She walks to the       schedule reminder.
               outreach point. The vaccination is recorded     Officer (vaccinator)
               into her child's record. She gets a W3C VC      issues credential.
               vaccination credential.                           Credential portable
                                                                  to clinics anywhere.
 ───────────────────────────────────────────────────────────────────────────────
 If Fatma had no signal at all, the CHV's USSD intake queued locally on the agent
 device and synced when signal returned. The registrar's hall visit is the manual
 binding step — it does not require the citizen to have a device. The whole
 journey works for a citizen with no smartphone, no electricity at home, and
 limited literacy. The platform meets her where she is.
```

**Surfaces**: USSD (CHV), agent device, wallet (cached), walk-in (registrar), IVR (reminders), CivicPay (M-Pesa)
**Classes**: A (info), B (officer-signed), C (narrow welfare rule under charter)
**Manual fallback**: registrar walk-in is the binding act; CHV notification is supportive
**Doctrine**: inclusion floor structural; selective disclosure; AI never decides citizenship/eligibility autonomously; receipts at every step

---

## Journey 02 — Contesting a benefit decision

**Persona**: Kwame, 47, day laborer in a coastal town. Smartphone with data, low literacy in English, fluent in Twi.

```
 Moment           Experience                                    Behind the scenes
 ───────────────────────────────────────────────────────────────────────────────
 Day 1            Wallet shows a receipt:                       Welfare module
 (denial)         "Drought supplement — DECLINED. Officer       Class B decision;
                  K. Otieno determined your district is not    officer signed.
                  in the current drought zone."                  Reason on receipt.
                  Kwame thinks: "But my well dried up two
                  weeks ago. What does this mean?"
 ───────────────────────────────────────────────────────────────────────────────
 Day 1, +5 min    Kwame taps "Question this decision."          Contestation flow
                  Step 1: "What do you want to do?"             (Companion 152 §3.3).
                  → Contest the decision.
                  Step 2: "Why? (pick one or write your own)"
                  → "I disagree" + writes (voice-to-text in    Speech-to-text in
                  Twi): "My well is dry. The drought decree    Twi (Companion 148).
                  was last month — they did not extend it      Voice note captured.
                  but the drought continues."
                  Step 3: confirmation. Case C-7901 opened.
                  Routed to Drought Authority's review desk.
 ───────────────────────────────────────────────────────────────────────────────
 Day 2            Wallet message: "An officer named            Officer M. Tetteh
 (acknowledged)   M. Tetteh has begun reviewing your case.     in console: case
                  Decision by Day 7 at latest."                  C-7901 routed.
 ───────────────────────────────────────────────────────────────────────────────
 Day 4            Officer Copilot (Class B) surfaces:           Officer reviews,
 (review)         "Decree DRC-2026-04 originally covered 18    sees Copilot
                  districts, expired April 30. Hydrological    flag re. ongoing
                  data shows continued drought in 7 of 18."    drought in 7 districts.
                  Officer Tetteh sees Kwame's district is in   Officer convenes
                  the 7. He convenes the Drought Authority.    discussion: should
                                                                  decree be extended?
 ───────────────────────────────────────────────────────────────────────────────
 Day 5            Drought Authority issues amended decree      Constitutional
 (structural fix) DRC-2026-04-A extending coverage in 7        process: amendment
                  districts. Per Companion 21, public           signed; OCDS-style
                  notice posted. People's Editor approves      public record.
                  citizen-facing language.
 ───────────────────────────────────────────────────────────────────────────────
 Day 6            Wallet message: "Your case was reviewed.    Reversal recorded;
 (reversal)       The Drought Authority extended the           reason on receipt;
                  decree. Your supplement is approved          structural-fix link
                  retroactively. KES 800 deposit incoming."   to amended decree.
                  Note (plain Twi): "Thank you for telling     People's Editor
                  us your well dried. It helped us see        approved phrasing.
                  what we had missed."
 ───────────────────────────────────────────────────────────────────────────────
 Day 7            Disbursement; receipt; case closed.          Pattern feeds:
 (closure)        Kwame is asked: "Did this go well? Any       Algorithmic Ombudsman
                  comment (optional)?"                         records pattern;
                                                                  drought authority's
                                                                  decree-renewal
                                                                  workflow flagged for
                                                                  improvement.
 ───────────────────────────────────────────────────────────────────────────────
 Doctrine in action: this is the contestability invariant operating end-to-end.
 The system did not just reverse Kwame's individual case — it reopened the
 structural decision that had affected many. The pattern feeds back into the
 platform's reform loop. Kwame is not a complainant who got placated; he is a
 principal whose voice changed policy.
```

**Surfaces**: wallet (smartphone)
**Classes**: B (officer-signed, with Copilot advisory)
**Manual fallback**: officer could have walked in to a regional office; voice note in Twi via Companion 148
**Doctrine**: contestability invariant; structural reform from individual case (Companion 141 §14); plain language (Companion 22)

---

## Journey 03 — Moving across a border (refugee)

**Persona**: Aisha, 34, with two children, fleeing armed conflict in a neighboring country. Reaches a border post on foot.

```
 Moment              Experience                                  Behind the scenes
 ───────────────────────────────────────────────────────────────────────────────
 Border arrival      Border officer at a kiosk. Aisha is        Cross-sovereign
                     exhausted; her children are with her.      protection mode active.
                     The officer greets her in Arabic and       Companion 48 doctrine
                     French (the languages of her origin        engaged.
                     country) — the SLIL detected her likely    UNHCR liaison
                     language from her ID. She speaks Arabic.    notified per treaty.
                     The officer types nothing about ethnicity
                     or religion (forbidden in routine intake
                     unless directly relevant to claim).
 ───────────────────────────────────────────────────────────────────────────────
 Initial intake      Aisha tells her story in Arabic. The      Class A speech-to-text
                     officer's console transcribes; a sworn     in Arabic. Officer
                     interpreter (human, on video) joins for    reads back to confirm.
                     legal precision. Aisha confirms each
                     sentence read back.
 ───────────────────────────────────────────────────────────────────────────────
 Identity            The officer offers identity options:       Aisha's choice of
                     - Issue an interim refugee CivicID         identity verification
                       (with biometric on consent)              respected. No coerced
                     - Or, if she has documents, scan them      biometric. Anti-
                                                                  refoulement protections
                     Aisha consents to biometric. Children     activated; data NOT
                     are enrolled per Companion 48 child       transmitted to origin
                     protection rules.                            sovereign.
 ───────────────────────────────────────────────────────────────────────────────
 Wallet issued       Aisha is handed a feature phone (or        Wallet runs USSD.
                     her own, if she has it works) with a       Interim refugee
                     SIM and a starter wallet. She can          credential issued.
                     dial *civic# and reach services.
                     The officer walks her through how to
                     use it, in Arabic. She gets an interim
                     refugee credential.
 ───────────────────────────────────────────────────────────────────────────────
 Health screen       Same day, a clinic worker performs basic   Health module under
                     screening. Aisha's children get a quick   refugee scope.
                     check-up. Vaccinations from her origin    Cross-border
                     country are imported via her presented    vaccination record
                     records (ICAO VDS-NC), with citizen        recognition per
                     consent.                                   treaty.
 ───────────────────────────────────────────────────────────────────────────────
 Shelter +           A civil society partner organization      Civil society
 immediate           operating at the border helps Aisha and    standing per
 support             her children find shelter at a reception   Companion 74.
                     center. The wallet receives a receipt of
                     intake.
 ───────────────────────────────────────────────────────────────────────────────
 Days 2–14           Aisha's claim is processed under            Refugee determination
 (determination)     refugee law. She is assigned legal aid    process (Class B
                     (a lawyer from a civil society network),  decisions by officer);
                     a caseworker, and an interpreter           Companion 48 binding;
                     wherever needed. She can see the          due process invariant.
                     status of her case in her wallet, in
                     Arabic.
 ───────────────────────────────────────────────────────────────────────────────
 Day 14              Determination issued. If granted: her     If granted: full
 (decision)          credential is upgraded; she is enrolled    refugee credential.
                     in the social protection floor; her       Children enrolled
                     children are enrolled in a local school   in school per
                     in their language where possible.          Companion 26.
 ───────────────────────────────────────────────────────────────────────────────
 Forbidden in this journey (Companion 48):
 - Sharing Aisha's data with the origin country (anti-refoulement)
 - Use of her ethnicity or religion in routine intake
 - Automated refusal of asylum
 - Coerced biometric
 - Family separation
 - Detention beyond legal narrow scope
 The platform's architecture enforces these prohibitions.
```

**Surfaces**: walk-in (border kiosk), feature phone (USSD), agent (civil society partner)
**Classes**: A (transcription, info), B (refugee determination, officer-signed)
**Manual fallback**: human interpreter, lawyer, caseworker — never AI alone for determination
**Doctrine**: anti-refoulement; due process; multilingual at first contact; civil society as partner; selective disclosure

---

## Journey 04 — Applying for a building permit (small business)

**Persona**: Lerato, 38, opening a small bakery in a township. Smartphone, fluent in Sesotho and English.

```
 Moment            Experience                                    Behind the scenes
 ───────────────────────────────────────────────────────────────────────────────
 Day 0             Lerato searches "open a bakery" in her       Services catalog
 (intent)          wallet (Sesotho). Civic Assistant            life-situation surface.
                   (Class A) explains the steps:                Knowledge surface
                   1. Land use / zoning check                   pulls authoritative
                   2. Building permit                            policy.
                   3. Food handling permit
                   4. Business registration
                   5. Tax registration
                   Each step shown with estimated time.
 ───────────────────────────────────────────────────────────────────────────────
 Day 1             She begins. Zoning check first.              Class A check; no
 (zoning)          She enters the address. The wallet           autonomous denial.
                   confirms: zone is mixed-use, bakery          If ambiguous, routed
                   permitted. Estimated time: instant.          to municipal planner.
 ───────────────────────────────────────────────────────────────────────────────
 Day 2             Building permit. She uploads a sketch        Permit module.
 (permit)          plan and photos.                              Officer at municipality:
                   She gets a receipt and a target              console Class B.
                   decision date (12 working days). She
                   sees the named officer (M. Khumalo).
 ───────────────────────────────────────────────────────────────────────────────
 Day 7             Wallet message: "M. Khumalo asks: 'Please   Officer raises a
 (question from    add a fire-safety annex to your plan. I've   question through
  officer)         attached a template; you can fill it on     copilot template.
                   your phone, on paper at our office, or       Multi-channel
                   ask an agent to help. Whichever works.'"     options.
                   Lerato chooses to do it on her phone;        Plain Sesotho.
                   it takes 12 minutes.
 ───────────────────────────────────────────────────────────────────────────────
 Day 10            Permit approved. Conditions explained in    Officer signs; receipt
 (decision)        plain Sesotho. Receipt with officer's        with conditions;
                   name and reasoning.                          People's Editor
                                                                  reviewed plain-language
                                                                  template.
 ───────────────────────────────────────────────────────────────────────────────
 Day 11            Food handling permit applied. Inspection    Health module.
 (food permit)     scheduled.
 ───────────────────────────────────────────────────────────────────────────────
 Day 14            Inspector arrives. Lerato gets a receipt   Officer console;
 (inspection)      with photos, recommendations, and the       inspection report
                   pass.                                        signed.
 ───────────────────────────────────────────────────────────────────────────────
 Day 16            Business registration. Tax ID auto-link.   Cross-ministry
 (registration)    She is asked: "Want help with your first   handoff (Companion 146
                   tax filing? An advisor can walk through."   §18).
                   She says yes.
 ───────────────────────────────────────────────────────────────────────────────
 Day 17            Bakery opens. The wallet shows: "All        Single coherent journey.
 (open)            permits valid until next renewal." She      No "lost in ministries."
                   sees her renewal schedule and her tax       Open Contracting visible
                   schedule, all in one place.                  for transparency in
                                                                  any subsequent
                                                                  procurement she does
                                                                  with the state.
 ───────────────────────────────────────────────────────────────────────────────
```

**Surfaces**: smartphone, agent (optional)
**Classes**: A (info, search), B (officer-signed permits and inspection)
**Manual fallback**: every step has agent or walk-in alternative; paper sketch plan accepted
**Doctrine**: cross-ministry handoff with consent; plain language; named officer; predictable timelines

---

## Journey 05 — Voting in a national election

**Persona**: Tendai, 22, university student in the capital, first-time voter. Smartphone.

```
 Moment           Experience                                     Behind the scenes
 ───────────────────────────────────────────────────────────────────────────────
 −60 days         Wallet message from the Independent Electoral Independent Electoral
 (announcement)   Commission (clearly branded as IEC, not the   Body (per Companion 32
                  executive): "Election on 25 May. You are     and Companion 142 NEOC).
                  registered. Your polling station is at the   IEC signs message.
                  Mukuvisi Primary School. Want help with
                  how to vote?"
                  Tendai opens the help: it is in his choice
                  of Shona, Ndebele, or English. Voice version
                  available.
 ───────────────────────────────────────────────────────────────────────────────
 −30 days         He receives plain-language candidate          Candidate registry
 (information)    information from the IEC, sourced from        from IEC; civil society
                  candidate filings. He sees civil society      analyses surfaced
                  fact-check links alongside each candidate.    (Companion 60, 74).
 ───────────────────────────────────────────────────────────────────────────────
 Election day     Tendai walks to Mukuvisi Primary.             Polling station with
 (08:14)          He shows his CivicID via selective            sovereign-controlled
                  disclosure on his phone (name + voter        equipment. Civil society
                  status only). Backup: paper ID accepted.     observers in the room.
                  The poll officer checks him in.
                  He casts a paper ballot (or, if jurisdiction
                  uses e-voting, an attested e-vote — both
                  with paper audit trail).
                  He gets a receipt — confirming he voted, but
                  NOT what he voted for.
 ───────────────────────────────────────────────────────────────────────────────
 Tabulation       Results from each polling station are        Audit Vault anchored;
                  tabulated and published transparently.       election-twin
                  Civil society observers cross-check.         visible to citizens
                  Tendai watches the count progress through    and observers per
                  the IEC's public dashboard.                   Companion 32 / 142.
 ───────────────────────────────────────────────────────────────────────────────
 Result           IEC announces result with detailed audit     Independent. No
                  trail. Disputes are routed to electoral      executive branch
                  court — independent from IEC and executive.  override.
 ───────────────────────────────────────────────────────────────────────────────
 Forbidden in this journey:
 - Executive branch viewing voter rolls beyond legal narrow scope
 - AI predicting Tendai's vote
 - Wallet showing personalized political ads
 - Targeting of voters by inferred attributes
 - Any "engagement" mechanic encouraging or discouraging voting beyond IEC neutral information
```

**Surfaces**: wallet (IEC-signed messages), polling station walk-in
**Classes**: A (information from IEC), B (poll-officer check-in)
**Manual fallback**: paper ballot always; paper ID accepted
**Doctrine**: electoral independence; selective disclosure; civil society observation; no political targeting via wallet

---

## Journey 06 — A flood happens (citizen experience inside an NCCC activation)

**Persona**: Maziwa, 56, lives in zone A of the Tana River basin. Owns one feature phone (no smartphone). Speaks Pokomo and Swahili.

```
 Moment             Experience                                   Behind the scenes
 ───────────────────────────────────────────────────────────────────────────────
 Day −1             SMS in Pokomo and Swahili from the          NCCC public comms
 (warning)          Disaster Authority (signed):                  pod (Companion 142,
                    "Heavy rains are coming. The river may       154). Multilingual
                    rise. If you live in zone A, B, or C,        message released
                    please be ready to move."                    after People's Editor
                                                                   review.
                    IVR call follows up in Pokomo with
                    detail and the help number.
 ───────────────────────────────────────────────────────────────────────────────
 Day 0              SMS: "Move to higher ground today. Buses    Inclusion floor
 (evacuation        leave the school at 14:00. If you cannot    structural. Multiple
  notice)           move, dial 199 or *help#."                   channels. Plain
                    Maziwa cannot move alone. He dials *help#.   language.
                    A community responder shows up within
                    90 minutes with a vehicle.
 ───────────────────────────────────────────────────────────────────────────────
 Day 0, evening     Maziwa is at the reception center. A         Officer registers
 (reception)        registrar takes his CivicID token (he       displacement;
                    has his card with him).                       household composition
                    "Where is your family?" — they are with     captured (with consent).
                    a relative in the next district.              Pokomo Council of
                                                                   Elders representative
                                                                   present at center.
 ───────────────────────────────────────────────────────────────────────────────
 Day 1              SMS: "Emergency disbursement issued —       Emergency rules under
 (relief)           KES 5,000 to your wallet (M-Pesa). For      Companion 142; sunset
                    food, shelter expenses."                     declared. Disbursement
                    Maziwa goes to the local agent who          per Companion 71. Officer
                    helps him withdraw cash in Pokomo.          K. Otieno signed.
 ───────────────────────────────────────────────────────────────────────────────
 Day 7              Water has receded. SMS: "Your district     Re-entry coordinated
 (return)           is now safe to return. Buses depart 09:00." across agencies (health,
                                                                   utilities, infrastructure).
                                                                   Civil society monitors
                                                                   equity of return.
 ───────────────────────────────────────────────────────────────────────────────
 Day 21             SMS: "Your house was damaged. Inspector    Cross-ministry case
 (recovery)         M. Sigana will visit tomorrow to assess.    (Companion 146 §18).
                    A recovery grant may be available."         Consent-gated. Re-entry
                                                                   not premature.
 ───────────────────────────────────────────────────────────────────────────────
 Day 30             Recovery grant disbursed. Pokomo Council    Civil society + cultural
 (long tail)        of Elders mentioned in the after-action     authority recognized
                    report (Companion 142 §10) as part of the   in record.
                    response.
 ───────────────────────────────────────────────────────────────────────────────
 Maziwa never owned a smartphone in this journey. He never authenticated to a
 website. His Pokomo language was honored from first SMS through final receipt.
 An agent helped him in person. A council representative was at the table.
 The platform was infrastructure, not intermediary.
```

**Surfaces**: SMS, IVR, walk-in, USSD, agent (community responder + cash agent), wallet receipts (via SMS proxy)
**Classes**: A (alerts), B (officer-signed disbursements and inspection), E (sovereign coordination active at NCCC)
**Manual fallback**: physical community responder, paper-equivalent everything, agent network
**Doctrine**: inclusion floor structural; indigenous/community partnership; sunset clock on emergency; multilingual at first SMS

---

## Journey 07 — Caring for an aging parent

**Persona**: Sara, 41, working full-time, helping her father Hassan (78) navigate health and pension. Sara has a smartphone; Hassan has a feature phone.

```
 Moment            Experience                                   Behind the scenes
 ───────────────────────────────────────────────────────────────────────────────
 Day 0             Hassan asks Sara to help with his pension   Sara needs explicit,
 (consent)         and health appointments. She visits him.    revocable consent from
                   They open Hassan's wallet on his phone via   Hassan to act on his
                   *civic#. Hassan: "I want my daughter to     behalf (Companion 26
                   help me with these things."                   intergenerational +
                   He goes through a consent flow: scope        Companion 51 family).
                   (health appointments, pension renewals,
                   not all records), duration (1 year,
                   renewable), revocable any time.
                   He confirms with a biometric (or, since
                   he has trouble, his elder-witness — a
                   neighbor — co-signs).
 ───────────────────────────────────────────────────────────────────────────────
 Day 1             Sara now has scoped access. She can         Per-RP UID isolated;
 (access)          schedule Hassan's appointments and renew    Sara sees only what
                   his pension. She cannot see his full         Hassan consented to.
                   medical history.                              All actions emit
                                                                   receipts to Hassan
                                                                   too.
 ───────────────────────────────────────────────────────────────────────────────
 Day 10            Hassan has a clinic visit. The nurse        Health record updated;
 (clinic)          updates his record. Hassan receives a       Sara receives summary
                   receipt; Sara receives a summary (per       per consent scope.
                   his consent).
 ───────────────────────────────────────────────────────────────────────────────
 Day 30            Pension renewal time. Sara handles it on    Welfare module; eligibility
 (pension)         her phone. Hassan still receives the         confirmed; officer signed.
                   receipt directly.                             Sara's helper status
                                                                   recorded on the receipt.
 ───────────────────────────────────────────────────────────────────────────────
 Day 60            Hassan recovers some mobility. He decides   Consent revocable;
 (revocation)      he wants to manage his own pension now.    revocation immediate.
                   He revokes that scope. He keeps Sara's     Sara informed; receipt
                   help on health appointments.                 to Hassan and Sara.
 ───────────────────────────────────────────────────────────────────────────────
 Doctrine: dignified caregiver pattern. Hassan is not made a ward of Sara —
 he grants, scopes, and revokes. The platform does not assume that elderly
 citizens cannot manage their own affairs.
```

**Surfaces**: smartphone (Sara), feature phone *civic# (Hassan), walk-in (clinic)
**Classes**: A (consent flow info), B (officer-signed renewals)
**Manual fallback**: elder-witness co-signing if biometric unreliable
**Doctrine**: consent scope and revocability; per-RP UID; intergenerational dignity

---

## Journey 08 — Losing someone

**Persona**: Bineta, 33, whose mother has just died at home. Bineta speaks Wolof and French.

```
 Moment            Experience                                   Behind the scenes
 ───────────────────────────────────────────────────────────────────────────────
 Hour 0            The family is grieving. There is no app to  Manual fallback is
 (death)           open in this hour. A family member calls a   the first response.
                   community elder, a religious leader, a
                   neighbor.
 ───────────────────────────────────────────────────────────────────────────────
 Hour 6            A family friend who works as a CHV comes    USSD intake (Class A
 (notification)    by. She dials *civic# on her phone. "I'd    notification, not
                   like to notify a death." She enters         binding registration).
                   minimal info. She tells Bineta: "A           Queue for civil
                   registrar will come, you don't have to do   registrar.
                   anything more right now."
 ───────────────────────────────────────────────────────────────────────────────
 Day 1             Civil registrar arrives in Wolof and        Officer signs death
 (registration)    French. She does the formal registration   record. Per Companion
                   in person — witnesses present per           51, family/religious
                   tradition. Religious/cultural protocols     considerations honored.
                   honored.                                      Multilingual receipt.
 ───────────────────────────────────────────────────────────────────────────────
 Day 3             Bineta receives a plain-language letter    Cross-ministry care
 (gentle           in her preferred language:                   pattern.
  cascade)         "We're sorry for your loss. Here are the
                   things you may want to do, when you're      No urgency-manufactured
                   ready. There is no rush.                    nudges.
                   • Inheritance and estate
                   • Pension or benefits affected
                   • Healthcare entitlements
                   • Bereavement support resources
                   None of these need to be done today."
                   No urgency. No deadlines that don't truly
                   apply.
 ───────────────────────────────────────────────────────────────────────────────
 Week 4            When Bineta is ready, she opens estate     Multi-ministry workflow
 (estate)          settlement. Cross-ministry case opens.     coordinated; consent at
                   She has a caseworker named.                   each handoff.
 ───────────────────────────────────────────────────────────────────────────────
 Doctrine: dignity. The platform does not press the bereaved to act. It does
 not flood with notifications. It surfaces what is needed, gently, on the
 citizen's timeline.
```

**Surfaces**: USSD, walk-in, wallet, letters
**Classes**: A (notifications, surfacing), B (officer-signed death record, estate)
**Manual fallback**: registrar walk-in is the binding act
**Doctrine**: dignity in grief; cultural and religious accommodation; no manufactured urgency

---

## Journey 09 — Whistleblowing

**Persona**: Anonymous, an officer at a procurement office who suspects collusion. Uses a personal device on home network; uses Tor.

```
 Moment           Experience                                     Behind the scenes
 ───────────────────────────────────────────────────────────────────────────────
 Pre-submit       Officer reads about whistleblower channels   Companion 131 channels:
 (research)       on the public Inspector General page.        cryptographic anonymity;
                                                                  civil society intermediary;
                                                                  designated official.
 ───────────────────────────────────────────────────────────────────────────────
 Day 0            Officer opens the Tor-routed submission      Two-key encryption;
 (submit)         portal. No identifying metadata logged.       no IP, no fingerprint.
                  Submits a structured report:                  Anti-fingerprinting.
                  • Office name
                  • Time period
                  • Pattern observed (sole-source, BO chains)
                  • Specific contract IDs
                  Attaches evidence. Generates a reply key.
                  No name, no badge, no real-world identifier.
 ───────────────────────────────────────────────────────────────────────────────
 Day 2            Anonymous reply via the portal: "Received.   Triage team routes
 (acknowledgment) Routing to Inspector General. Reply key      to IG; no de-anonymization
                  is yours to use to check in any time.        attempts.
                  We protect your anonymity by design."
 ───────────────────────────────────────────────────────────────────────────────
 Day 14           Reply: "Investigation opened. Case I-2026-   IG investigator opens
 (progress)       103. We are looking at the contracts you     formal investigation.
                  named and the BO chains."                     Class D pattern surfacing
                                                                  by anti-corruption agent;
                                                                  human investigator
                                                                  decides.
 ───────────────────────────────────────────────────────────────────────────────
 Day 90           Reply: "We found supporting evidence of      Findings to prosecutor;
 (outcome)        the pattern you described. Two officials    public aggregate report
                  have been suspended pending criminal         (anonymized).
                  process. Structural reforms initiated:
                  beneficial ownership disclosure tightened.
                  Thank you for your courage."
 ───────────────────────────────────────────────────────────────────────────────
 Throughout       The officer's identity is never deduced.    Anti-retaliation
                  Their workplace continues normally. They     architecture: no
                  cannot be retaliated against because no      retaliation possible
                  one knows they reported.                      if no identification.
 ───────────────────────────────────────────────────────────────────────────────
```

**Surfaces**: Tor-anonymous web portal
**Classes**: D (anti-corruption pattern surfacing supports investigation)
**Manual fallback**: civil society intermediary (NGO-mediated submission), designated official walk-in
**Doctrine**: cryptographic anonymity preserved by architecture; anti-retaliation; structural reform from individual report (Companion 131)

---

## Journey 10 — Indigenous community service

**Persona**: Nokomis, an elder of an indigenous nation whose lands overlap with a settler-colonial state's municipality. She works on land claims with her nation's council.

```
 Moment              Experience                                  Behind the scenes
 ───────────────────────────────────────────────────────────────────────────────
 Engagement          The nation's council has its own CivicOS    Per Companion 36,
                     instance with sovereign governance: the     indigenous nation runs
                     nation chose what modules to deploy,        sovereign instance.
                     in what languages, with what protocols.    Federation with
                                                                   settler-colonial state
                                                                   per nation's choice.
 ───────────────────────────────────────────────────────────────────────────────
 Service in own      Nokomis interacts with her own nation's    SLIL supports
 language            services in the nation's language and      indigenous language
                     calendar. Cultural protocols around       and calendar (Companion
                     elders are honored — voice-first, not       148, 132).
                     form-first. The nation's council
                     determines who is eligible for what.
 ───────────────────────────────────────────────────────────────────────────────
 Cross-jurisdiction  When something requires interaction with   FPIC protocol activated.
                     the settler-colonial state (e.g., a       Inter-realm gateway
                     land-use ruling), the nation's council    (Companion 140).
                     leads. FPIC (Free, Prior, Informed         No data extraction
                     Consent) is operationalized in the         beyond what the nation
                     interface: any data exchange requires       authorizes.
                     council authorization.
 ───────────────────────────────────────────────────────────────────────────────
 Cultural data       Knowledge about plants, places, and       Anti-extractive data
                     practices is council-controlled. Even      practice: council
                     when shared with researchers under         retains rights;
                     consent, the council retains the rights    benefits return to
                     and the right to revoke.                    community.
 ───────────────────────────────────────────────────────────────────────────────
 Doctrine: indigenous sovereignty is not a feature of the settler-colonial
 platform; it is a sovereign instance with its own governance. The federation
 model means the indigenous nation is principal, not subject, in every
 interaction.
```

**Surfaces**: nation-determined; may be wallet, voice, in-person — per cultural protocol
**Classes**: per nation's charter
**Manual fallback**: cultural protocols are the manual baseline
**Doctrine**: Companion 36 indigenous sovereignty; FPIC; anti-extractive data practice

---

## Cross-journey patterns

| Pattern | Manifestation across journeys |
|---|---|
| **Receipt at every step** | Every officer action emits a citizen-visible receipt. |
| **Plain language** | Every citizen-facing message reviewed by People's Editor. |
| **Multilingual at first contact** | SLIL detects language preference; citizen never starts in a language they don't speak. |
| **Manual fallback structural** | Every digital path has a USSD/IVR/agent/walk-in equivalent. |
| **Contestation in two taps** | Every decision can be questioned without bureaucratic friction. |
| **Named officer accountability** | Decisions are signed by humans with names. |
| **AI Class always visible** | When AI is involved, its Class is named, with reasoning shown. |
| **Civil society partnership** | At every consequential moment, civil society has standing. |
| **Sunset on emergencies** | Emergency rules are time-bound; citizens see the sunset. |
| **No urgency-manufacturing** | Notifications respect citizen time and grief. |
| **No engagement gamification** | Nothing optimizes for the citizen returning to the app. |
| **Cross-ministry handoff with consent** | The citizen does not retell their story; each handoff requires consent. |
| **Structural reform from individual case** | Cases that surface patterns feed back into policy. |

---

## Anti-journeys (forbidden patterns)

- A journey where the citizen is denied a benefit by an AI alone and cannot reach a human.
- A journey where the citizen is required to download a smartphone app to access a service.
- A journey where the citizen's data flows across ministries without per-step consent.
- A journey where contesting a decision requires more than three taps.
- A journey where the named officer is unknown or fictitious.
- A journey where the AI's Decision Class is hidden.
- A journey where a citizen's grief is met with manufactured urgency.
- A journey where emergency rules continue silently past sunset.
- A journey where an indigenous nation is treated as a subset of the settler state.
- A journey where a refugee's data flows to the country they fled.
- A journey where a whistleblower's identity is deduced.
- A journey where civil society is informed after the fact rather than present.
- A journey where the wallet shows political advertising.
- A journey where the citizen is treated as a data source rather than a principal.

---

## How journeys are validated

Per Companion 152 and Companion 153:

- **Pre-deployment**: every journey walked by a citizen-representative panel in pilot regions, in the inclusion-floor channels first (USSD/IVR/agent/walk-in), in the languages the inventory commits to.
- **Continuous**: contestation rates and stratified KPIs per Companion 56 surface journey failures.
- **Civil society audit**: standing access to journey records (anonymized) for civil society review.
- **Constitutional officer review**: People's Editor on citizen-facing language; Algorithmic Ombudsman on AI involvement; Sovereign Trust Officer on invariants.

---

## The journey design north star

A citizen journey through CivicOS is a relationship made operational. The citizen begins with a need — birth, loss, work, contestation, refuge, recovery, care, voice. The platform must meet them in their language, on the device they have, with dignity for their moment, with manual fallback structural at every step, with named human accountability for every decision, with civil society as partner, with constitutional officer watching invariants, with structural reform looped back from individual case, and with no urgency, gamification, or surveillance dressed in service's costume.

When the journeys feel like daily app loops — engagement metrics optimized, notifications manufactured, grief monetized, identity profiled, AI deciding while officers shield, manual fallback retired, indigenous nations subordinated, refugees exposed, whistleblowers identified — the platform has failed the doctrine where it matters most: in the life moment the citizen actually lives through.

When the journeys feel like a polity that respects the person at every moment of their life — including the moments when they have nothing, including the moments of greatest grief, including the moments of greatest power — the design has succeeded.

The journeys are the doctrine made daily. The daily is what counts.
