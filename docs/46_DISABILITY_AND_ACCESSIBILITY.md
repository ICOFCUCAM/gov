# CivicOS — Disability, Accessibility, and Universal Design (Companion 46)

This companion specifies how CivicOS serves people with disabilities — physical, sensory, cognitive, psychosocial, intellectual, developmental, episodic, multiple — across all eras. It complements Companion 22 (dignity & rights), Companion 12 (interaction evolution), and Companion 32 (brain-adjacent interfaces) by going deep on the *operational* design of accessibility as a constitutional commitment.

The thesis: **a platform that does not work for the most disabled citizen has not yet succeeded for any citizen**. Accessibility is not a feature added late; it is universal design from the start. People with disabilities are 15-20% of every population — the largest minority on Earth — and their participation is constitutional, not charitable. CivicOS is built for everyone, and that "everyone" is real, tested, and continually improved.

The discipline: WCAG conformance is the floor, not the ceiling. Universal design is the goal. People with disabilities lead in design and review. Accommodations are available without bureaucratic friction. Brain-adjacent assistive interfaces are supported (Companion 32). Cross-disability solidarity informs every design choice. Outcomes — not just compliance — are measured.

---

## 1. Principles

1. **Disability is universal experience.** Everyone is, was, will be, or knows someone affected. Design accordingly.
2. **Universal design from the start.** Accessibility is not retrofitted; it is built in.
3. **People with disabilities lead.** "Nothing about us without us" is operational, not slogan.
4. **Multiple modalities mandatory.** Visual, auditory, tactile, cognitive paths all supported.
5. **Accommodations without friction.** No long forms, repeat justifications, or shaming.
6. **Outcomes measured.** Compliance is means; participation and equality are ends.
7. **Cross-disability solidarity.** What works for one disability often improves access for all.
8. **Accessibility as inclusion floor.** USSD, IVR, agent, walk-in alternatives ensure no one excluded.
9. **AI augments accessibility.** Where appropriate; never replaces human attendance for those who need it.
10. **Plain language as accessibility.** Cognitive accessibility is real; plain language helps everyone.

---

## 2. Disability spectrum considered

### 2.1 Physical disabilities

- Mobility impairments (wheelchair, mobility aid, limited dexterity).
- Limb differences and amputations.
- Chronic pain and fatigue conditions.

Design implications: physical accessibility of in-person services; voice and switch alternatives to mouse/touch; gesture alternatives.

### 2.2 Sensory disabilities

- Blind, low vision.
- Deaf, hard of hearing.
- Deafblind.

Design implications: screen reader compatibility; tactile sign for deafblind; sign language video for major announcements; audio descriptions; high-contrast and large-text modes.

### 2.3 Cognitive and intellectual disabilities

- Learning disabilities (dyslexia, dyscalculia, etc.).
- Intellectual disabilities (developmental, acquired).
- Memory and attention conditions.

Design implications: plain language; symbol-supported text; easy-read versions; consistent navigation; predictable interactions; supported decision-making.

### 2.4 Psychosocial disabilities

- Mental health conditions affecting daily functioning.
- Trauma-related conditions.

Design implications: trauma-informed service; quiet alternatives to noisy environments; predictable processes; protections against re-traumatization; flexible deadlines.

### 2.5 Developmental disabilities

- Autism spectrum.
- ADHD.
- Other neurodevelopmental conditions.

Design implications: low sensory environments; predictable processes; multiple modality choice; accommodation of stimming and self-regulation; respect for direct communication styles.

### 2.6 Episodic and chronic conditions

- MS, lupus, fibromyalgia, etc., with fluctuating capacity.

Design implications: flexible deadlines; pause and resume; not requiring re-establishment of disability for each interaction.

### 2.7 Multiple and intersecting

Many people experience multiple disabilities and/or disability intersecting with other identities (gender, race, class, indigeneity, age, language). Design must work across intersections.

---

## 3. Standards and conformance

### 3.1 Floor standards

- **WCAG 2.2 AA** (or current latest) as minimum.
- **WCAG 3.0 AAA** targets where feasible (post-2035).
- **EN 301 549** equivalent for ICT procurement.
- **ISO/IEC 21500-class** project management for accessibility.

### 3.2 Procurement gates

- Accessibility conformance required for all procurement above thresholds.
- Vendors demonstrate conformance through testing, not just claims.
- Non-conformance grounds for rejection or amendment.

### 3.3 Continuous testing

- Automated testing in CI (axe-class).
- Manual testing per release.
- User testing with disabled users (compensated, repeated).
- Production monitoring of accessibility issues.

### 3.4 Anti-tokenization

- One-time accessibility audit insufficient.
- Continuous improvement, not "achieved" status.
- Disability community input ongoing.

---

## 4. Universal design patterns

### 4.1 Multiple modalities

Every essential function available in:
- Visual + text.
- Audio (voice).
- Tactile (where applicable).
- Cognitive simplification.
- Multiple input methods (touch, keyboard, switch, voice, eye gaze).

### 4.2 Predictability

- Consistent navigation patterns.
- Stable URLs and endpoints across sessions.
- Predictable error handling.
- Clear progress indicators.
- No unexpected modal interruptions.

### 4.3 Forgiveness

- Easy undo.
- Clear confirmations for irreversible actions.
- Auto-save where appropriate.
- Resume interrupted interactions.
- Tolerance for variant input (typos, alternative phrasings).

### 4.4 Plain language

Per Companion 12 §3.3 and Companion 22 §2.2:
- 7th-grade reading level by default.
- 5th-grade for emergency content.
- Easy-read versions for cognitive accessibility.
- Multilingual at parity (Companion 25).

### 4.5 Time

- Adequate time for tasks.
- Pause and resume.
- No arbitrary timeouts that disadvantage cognitive or physical disability.
- Where time limits required, generous defaults with extensions available.

---

## 5. Disability-informed AI design

### 5.1 Decision-class application

AI affecting disabled people is subject to enhanced scrutiny:
- Bias auditing across disability dimensions stratified.
- Disabled people in evaluation panels.
- Class B/C decisions with reversibility windows tested for disability impact.
- Class D for any decision determining disability status, eligibility, or access in consequential ways.

### 5.2 Forbidden algorithmic uses

- Algorithmic determination of disability status (without disabled-person involvement and human judgment).
- Algorithmic eligibility decisions for disability benefits without enhanced human review.
- Algorithmic life-expectancy or capability predictions used in decisions.
- Use of disability data outside narrowly authorized purposes.

### 5.3 Brain-adjacent interfaces

Per Companion 32:
- Assistive use unconditionally supported.
- Cognitive liberty constitutional.
- Citizen-owned neural data.
- No surveillance through BAI.
- Access through CivicCare for those who need it.

---

## 6. Brain-adjacent assistive interfaces

### 6.1 The right

A citizen with profound communication disability has the right to BAI assistive technology on equal terms to a citizen with hearing aid or wheelchair access. See Companion 32 §3.

### 6.2 Provision

- Through CivicCare or CivicHealth depending on jurisdiction.
- Cost not a barrier.
- Multiple vendor choices.
- Independent advice on selection (not vendor-driven).
- Family and carer support included where citizen consents.

### 6.3 Integration with Civic Wallet

- Full participation in civic life through assistive interface.
- Identity, payments, voting, civic participation accessible.
- Privacy protections per Companion 32.

---

## 7. Workplace accessibility

### 7.1 Public service workplace

- Accessible workplaces for officers with disabilities.
- Accommodations available without bureaucratic friction.
- Career paths not blocked by disability.
- Workplace accessibility audited.

### 7.2 Private sector

- Anti-discrimination law enforcement.
- Reasonable accommodation requirements.
- Employer registration includes accessibility commitments.
- Government procurement favors accessible employers.

### 7.3 Forbidden

- Algorithmic hiring decisions disadvantaging disabled applicants.
- Workplace surveillance of disabled employees.
- Pressure to disclose disability beyond accommodation needs.

---

## 8. Education accessibility

Per Companion 39 §14.2:
- Universal design from start in education systems.
- Assistive technology compatibility tested.
- BAI assistive interfaces available where appropriate.
- Teacher training on inclusive education.
- Anti-discrimination strict.
- Continuing education accessible to disabled adults.

---

## 9. Health accessibility

Per Companion 38:
- Healthcare access for disabled people on equal terms.
- Accessible facilities and services.
- Disability-aware clinical training.
- Mental health parity.
- No discrimination in care quality.
- Disability-informed long-term care.

---

## 10. Housing and physical environment

### 10.1 The pattern

Cities and built environment must work for people with disabilities. CivicCity (Volume I §12) and CivicBuild (Volume I §21) integrate accessibility:

- Public infrastructure designed for universal access.
- Accessible transit (CivicMove).
- Accessible public buildings.
- Public spaces (parks, markets, sidewalks) accessible.
- Anti-displacement of disabled residents from accessible housing.

### 10.2 Discipline

- Accessibility audits in capital project planning.
- Retrofitting prioritized in capital plans.
- Cross-domain coordination.

---

## 11. Justice accessibility

Per Volume I §20 (CivicJustice):
- Court facilities accessible.
- Communication supports (sign language, plain language, easy-read).
- Cognitive accommodations in legal proceedings.
- Accessible legal aid.
- Anti-discrimination remedies accessible.
- Constitutional rights enforceable by people with disabilities.

---

## 12. Voting accessibility

Per Volume I §10.5 and Companion 24 §10:
- Voting accessible to people with all disabilities.
- Multiple voting methods including paper, in-person with assistance, accessible electronic where chosen.
- Polling places physically accessible.
- Communication accessible (sign language, plain language, easy-read).
- No disability discrimination in voter registration or voting.

---

## 13. Crisis and emergency accessibility

Per Companion 30:
- Emergency communications accessible (audio, visual, tactile, plain language).
- Cell broadcast accommodates accessibility.
- Evacuation and shelter planning includes disability needs.
- Anticipatory action triggers consider disability-vulnerability.
- Post-emergency support inclusive.

---

## 14. Robotics and disability

Per Companion 31 §2 (R-E class — accessibility):
- Personal accessibility robots supported.
- Citizen-controlled.
- State-funded for those qualifying.
- Citizen-owned neural data integration where assistive (Companion 32).
- No surveillance through assistive robotics.

---

## 15. Cross-cutting design discipline

### 15.1 People with disabilities lead

- Disability community involvement in design from start.
- Disabled designers, engineers, ethicists in teams.
- Compensated user testing with disabled users.
- Disabled people in Citizens' Assemblies (sortition stratified for disability).
- Disability advocacy organizations have standing in major decisions.

### 15.2 Cross-disability solidarity

- Designs tested across disability spectrum.
- What helps one often helps many (curb cuts effect).
- Trade-offs between disability needs surfaced and resolved through dialogue.

### 15.3 Continuous improvement

- Accessibility issues prioritized.
- Disability community feedback channels active.
- Algorithmic Ombudsman has scope over algorithmic disability discrimination.
- People's Editor includes disability-informed plain language reviewers.

---

## 16. Forbidden in disability and accessibility

CivicOS will not:

- Permit any service to be inaccessible to people with disabilities (the inclusion floor includes accessibility).
- Allow algorithmic determinations of disability status without human judgment and disabled-person involvement.
- Permit commercial use of disability data.
- Allow algorithmic discrimination based on disability.
- Permit surveillance through assistive technology.
- Force digital-only modalities on people who need other channels.
- Use accessibility as cover for surveillance.
- Permit dark patterns affecting people with cognitive or sensory disabilities.
- Allow workplace surveillance of disabled employees.
- Permit denial of services based on disability.

This list grows; it does not shrink.

---

## 17. KPIs

| KPI | Indicator |
|---|---|
| WCAG conformance | Pass rate per release |
| User testing with disabled users | Coverage; results |
| Disability community input | Active engagement; substantive influence |
| Accommodation request fulfillment | Time and rate |
| Accessibility-related complaints | Decreasing trend |
| Disabled people in public service | Representation |
| Disabled people in major civic decisions | Citizens' Assembly representation |
| Inclusion floor for disability | All essential services accessible |
| Cross-disability accessibility | Coverage across disability types |
| BAI assistive provision | Coverage of eligible population |

---

## 18. The disability and accessibility north star

A platform that excludes any disability has excluded too many. A platform that includes all disabilities has built infrastructure that works better for everyone. Accessibility is not charity, not afterthought, not optional flourish — it is the foundation of universal civic participation.

The discipline is universal design from the start. The leadership is by people with disabilities themselves. The standards are continuous, not "achieved." The accommodations are friction-free. The cross-disability solidarity informs every choice.

When CivicOS becomes inaccessible — even unintentionally, even efficiently, even temporarily — it has failed the largest minority on Earth. Capability without accessibility is not progress; it is the institutionalization of exclusion.

When the platform serves people with disabilities with dignity, equity, and joy of full participation — it earns the right to call itself civic infrastructure. The citizen using assistive technology, the citizen who needs plain language, the citizen who navigates differently — they are not edge cases. They are citizens. The platform exists for them, in their full diversity, on their own terms, with their own voice.

This is what universal access actually means. Anything less is unfinished work.
