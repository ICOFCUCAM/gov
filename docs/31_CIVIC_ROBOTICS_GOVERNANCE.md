# CivicOS — Civic Robotics Governance (Companion 31)

This companion specifies how CivicOS governs the deployment of robotic agents in public service — inspectors, surveyors, first-responder support, public works, agriculture, logistics, healthcare assistance, accessibility support. It complements Volume II Parts 4–5 by going deep on the *governance* of physical-world AI agents.

The thesis: **a robot is an embodied agent under a charter, with all the discipline and constraints that implies, plus additional safeguards because it acts in the physical world**. Civic robots become routine through the 2040s. They extend the reach of officers, automate dangerous work, support inclusion, and increase productivity. They also create new risks: physical harm, surveillance through embodiment, displacement of workers, and erosion of human presence in public service.

The discipline: every civic robot operates under a registered charter, with explicit physical-world constraints, kill switches, citizen-visible identification, and dedicated oversight. No autonomous use of force. Ever. No coercive interventions. Ever. The robot is a tool of officers, not a replacement for them.

---

## 1. Principles

1. **A robot is an agent, not a principal.** It acts under signed charter from a human principal.
2. **No autonomous use of force.** Lethal force, coercive interventions, restraint — all human decisions, always.
3. **Identifiability is mandatory.** Every civic robot is visibly identifiable as a state-operated agent.
4. **Citizens may decline robotic interaction.** Right to a human applies in robotic encounters too.
5. **Privacy floors absolute.** Robotic sensing constrained to charter; no surveillance through embodiment.
6. **Human supervision required for consequential operations.** A human is responsible.
7. **Worker protection.** Robotic deployment does not displace workers without transition support; reskilling embedded.
8. **Inclusion floor preserved.** Robotic services do not replace human services for citizens who need them.
9. **Public deliberation on consequential deployments.** Major robotic deployments go through Citizens' Assemblies.
10. **Sovereign control of robotic supply chain.** Critical robotic capabilities not foreign-coercible.

---

## 2. Civic robot classes

| Class | Examples | Decision class | Force authority |
|---|---|---|---|
| **R-A — Sensing** | Environmental monitoring drones, infrastructure inspection robots | A/B | None |
| **R-B — Logistics** | Autonomous delivery (medical, supplies), warehouse robotics | B/C | None |
| **R-C — Maintenance** | Public works (roads, water, grids), cleaning, repair | C bounded | None |
| **R-D — Agricultural** | Planting, pest detection, harvesting in cooperatives | C bounded | None |
| **R-E — Accessibility** | Personal assistive robots for severe disability (citizen-controlled) | C citizen-delegated | None |
| **R-F — Healthcare assistive** | Surgical assistance, medication delivery, lift assistance | C with clinician supervision | None |
| **R-G — Search and rescue** | Disaster zone navigation, victim location | C with operator | None (medical only, no restraint) |
| **R-H — Inspection** | Regulatory inspection (food safety, occupational, environmental) | C with inspector | None |
| **R-I — Public-facing service** | Information kiosks, queue management, accessibility support | A/B | None |

Forbidden classes (never built or deployed under CivicOS):

- **Armed robots** — autonomous or remotely operated weaponized robots.
- **Coercive robots** — restraint, arrest, or detention robots.
- **Surveillance robots** — robots whose primary purpose is surveillance of citizens.
- **Crowd control robots** — robots for protest dispersal or force application.

---

## 3. Charter mechanics for robotic agents

Per Companion 10 §3, every robotic agent operates under a charter. Robotic charters add:

### 3.1 Physical-world constraints

```yaml
charter:
  id: "R-2044-WATER-MAINTENANCE-v2"
  agent_class: R-C
  physical_scope:
    geographic_area: "City Region 4 water network"
    operating_hours: "06:00-22:00 local"
    excluded_zones: ["schools during school hours", "places of worship during services", "residential areas after 20:00"]
  operational_envelope:
    speed_limit_kph: 8
    weight_kg: 220
    contact_force_max_n: 15
    autonomous_movement: true
    autonomous_repair: false  # repair tasks require operator authorization
  safety:
    emergency_stop_proximity_m: 1.5
    human_proximity_protocol: "yield and signal"
    obstacle_detection_redundancy: 3
  identifiability:
    visual_marking: "CivicOS robot R-2044-XXX, City Water Authority"
    audible_announcement_on_proximity: true
    digital_handshake: "wallet-presentable identity credential"
  citizen_interaction:
    citizen_decline_response: "withdraw to safe distance, log, dispatch human"
    citizen_question_response: "answer scope-of-work questions; refer other questions to operator"
  kill_switch:
    physical_button: "all sides; press requires no authorization"
    remote_kill: "operator + supervisor"
    automatic_kill_triggers: ["loss of operator contact >60s", "safety violation", "out-of-scope movement"]
```

### 3.2 Operational supervision

- Every R-C+ robot has an assigned operator and supervisor.
- Operator monitors during operation; supervisor reviews logs.
- Multi-robot operations have a coordination operator.

### 3.3 Insurance

- Civic robotics operations carry liability insurance (sovereign or pooled).
- Damages from robotic operations remediated promptly.
- Citizen recourse documented.

---

## 4. Citizen interaction with robots

### 4.1 The right to decline

- Citizens may decline interaction with a civic robot for any reason.
- Robot retreats to safe distance; logs the decline; dispatches human officer if needed.
- No penalty for declining.
- Service available in equivalent quality through human officer.

### 4.2 Identifiability

- Every robot displays:
  - Visual identification (markings, lights).
  - Robot ID (CivicOS-format).
  - Operating authority (which ministry/charter).
  - Kill switch (clearly marked, accessible from all sides).
- Every robot can present digitally to citizen wallet:
  - Verifiable credential of state operation.
  - Charter ID and scope.
  - Operator contact path.

### 4.3 Communication

- Robots communicate purposeful actions ("inspecting water meter," "delivering package").
- Multi-modal: voice (in citizen's likely language), visual cues, wallet notification.
- Robots do not engage in extended conversations beyond their scope.

### 4.4 Privacy

- Sensors active only as needed for the task.
- Recording limited to charter purposes; minimal retention.
- No facial recognition of citizens incidentally encountered.
- Cameras visible; sensor types declared on robot exterior.

### 4.5 Accommodation

- Vulnerable citizens (children, elderly, people with disabilities) accorded enhanced consideration.
- Cultural sensitivity (some interactions inappropriate in certain settings).
- Religious and personal-space norms respected.

---

## 5. Worker protection

### 5.1 Discipline

- Robotic deployment does not displace workers without transition support.
- Affected workers offered: reskilling, redeployment, retirement support, severance where applicable.
- Continuous reskilling per Companion 13 §7.3.
- Worker representatives consulted on major deployments.

### 5.2 Workforce roles

- Robot operators (skilled).
- Robot supervisors (highly skilled).
- Robot maintainers (technical).
- Customer-facing officers (judgment, empathy, citizen interaction).
- All these are dignified, well-paid public service careers.

### 5.3 Forbidden

- Cost-only deployment without distributional impact.
- Replacement of citizen-facing officers in domains where human presence matters (welfare casework, healthcare, education).
- Worker surveillance through robotic deployment.

---

## 6. Inclusion floor preservation

### 6.1 Robots do not replace human services for citizens who need them

- Walk-in offices preserve human officers.
- Phone access to human officers preserved.
- USSD and IVR remain human-staffed where needed.
- Field officers remain available for in-person interaction.

### 6.2 Robotic-only options are forbidden

- Every service has a human path.
- Robotic delivery of medication, for example, supplements but does not replace community health workers.
- Robotic accessibility support augments but does not substitute for caregiver networks.

### 6.3 Vulnerable populations

- Robotic interaction is opt-in for vulnerable populations.
- Officers trained on robotic-equity considerations.
- Citizens' Assembly review of deployments affecting vulnerable communities.

---

## 7. Robotic supply chain sovereignty

### 7.1 The discipline

- Critical robotic capabilities not foreign-coercible.
- Multi-vendor for critical robot classes.
- Sovereign maintenance capability built (per Civic Academy).
- Source escrow for robotic operating systems.
- Sovereign control of safety-critical components.

### 7.2 Foreign components

- Permissible for non-critical robots if foreign coercion would not impair sovereign capability.
- Continuous review of foreign supply chain.
- Sovereign exit options retained.

### 7.3 Open-source robotics

- Encouraged where it strengthens sovereignty.
- Standards-based interoperability required.
- Civic robotics SDK published (Companion 19).

---

## 8. Robotic operations governance

### 8.1 Robotics Authority

A statutory body responsible for civic robotics:

- Charter approval for R-C+ operations.
- Operational standards and safety certifications.
- Incident investigation.
- Worker impact assessments.
- Citizen complaint handling.
- Reports: parliament + public.

### 8.2 Robotic incident reporting

- Every safety incident reported.
- Analysis: root cause, charter compliance, mitigations.
- Public aggregate reporting.
- Constitutional officer oversight (Algorithmic Ombudsman + Inspector General as appropriate).

### 8.3 Public deliberation

- Major robotic deployments (city-wide, ministry-wide, sensitive contexts) reviewed by Citizens' Assembly.
- Pilot phases mandatory.
- Public consultation periods.
- Inclusion impact assessment.

---

## 9. Robotic AI governance

### 9.1 Models

- Robot perception, navigation, manipulation models registered per Companion 18.
- AIBOM mandatory.
- Continuous evaluation of safety-critical models.
- Sovereign LLM tier 1 for any natural-language interaction.

### 9.2 Decision class assignment

- Most robotic decisions are Class C bounded (within charter).
- Class D applies absolutely to: any use of force, restraint, coercive intervention.
- Class B for advisory operations (e.g., inspector AI suggesting follow-up).

### 9.3 Multi-robot coordination

- Inter-robot coordination governed by explicit protocols.
- No covert coordination channels.
- Emergent behavior monitored (Companion 10 §10).

### 9.4 Safety evaluations

- Standard evaluation suite plus physical-world tests:
  - Obstacle avoidance.
  - Human proximity behavior.
  - Edge cases (children, animals, unexpected objects).
  - Adversarial inputs (sensor spoofing).
- Continuous evaluation in operation.
- Critical findings pause capability.

---

## 10. Specific scenarios

### 10.1 Public works robot fixing a water main

- Authorized by works ministry charter.
- Operator + supervisor on duty.
- Visible identification.
- Citizens see notification in wallet about expected service interruption.
- Robot completes repair; updates asset twin; reports to operator.
- Officer reviews; service restored.

### 10.2 Agricultural robot in cooperative

- Authorized by agriculture cooperative charter.
- Cooperative operator on duty.
- Farmers consent to robotic operation on their plots.
- Robot operates within field boundaries; respects livestock.
- Yield and pest data shared with farmer through wallet.

### 10.3 Disaster zone search robot

- Authorized by disaster response charter (active emergency).
- Search-and-rescue operator on duty.
- Robot navigates rubble; locates victims; reports location.
- Medical first responders dispatched to located victims.
- No restraint or coercion authority; medical support only.

### 10.4 Personal accessibility robot

- Citizen-delegated charter.
- Robot operates in citizen's home or with citizen's consent in public.
- Citizen retains kill switch.
- Privacy floor: no recording outside charter purpose.
- Citizen owns the relationship; state-funded for those qualifying for support.

### 10.5 Inspection robot at industrial facility

- Authorized by environment / labor / safety regulator.
- Inspector on duty supervising robotic inspection.
- Industrial entity informed in advance for non-emergency inspections.
- Findings reported to inspector for human judgment on enforcement.

---

## 11. Forbidden in robotics

CivicOS will not build, deploy, or sanction:

- Armed robots (autonomous or remotely operated).
- Robots with coercive force authority (restraint, arrest, detention).
- Robots whose primary purpose is surveillance of citizens.
- Robots for crowd control or protest dispersal.
- Autonomous border enforcement robots.
- Robots that can autonomously open prison doors or move detained persons.
- Robots with covert identification or "incognito" modes.
- Robots that can record citizens without lawful purpose under charter.
- Robots that interact with children without enhanced safeguards and consent.
- Robotic deployments that displace citizen-facing officers without inclusion impact assessment.
- Robotic deployments dependent on foreign supply chains for critical safety components without alternative.

This list grows; it does not shrink.

---

## 12. Tripwires

- Robotic safety incident → operation pause + investigation.
- Charter scope violation → robot returned; charter review.
- Citizen complaint pattern → deployment review.
- Worker displacement above threshold without transition support → review.
- Inclusion floor breach → deployment suspended.
- Foreign supply chain coercion attempt → sovereign exit options activated.
- Detection of forbidden capability or modification → immediate halt; investigation.

---

## 13. Robotics KPIs

| KPI | Indicator |
|---|---|
| Safety incidents per 10,000 operating hours | Decreasing |
| Charter compliance rate | 100% |
| Citizen acceptance of robotic interaction | Survey index by service |
| Worker transition success rate | % retained, retrained, redeployed |
| Inclusion floor preservation | 100% during robotic deployment |
| Critical supply chain sovereignty | % sovereign-sourced or multi-vendor |
| Public deliberation coverage | All R-C+ deployments above threshold reviewed |
| Identifiability conformance | 100% of deployed robots |
| Robotic AI evaluation gate pass rate | 100% before deployment |

---

## 14. The robotics north star

Civic robots extend the reach of public service — making dangerous work safer, repetitive work less burdensome, accessibility support more available, and infrastructure better maintained. They are tools of officers, not replacements for them. They are agents under charters, not principals. They are identifiable, supervised, contestable, kill-switchable, and bounded.

The discipline is constitutional: no autonomous force, no coercion, no surveillance through embodiment, no displacement of citizens' right to a human, no foreign coercion of critical capability.

When civic robotics serves citizens — making services more reliable, more accessible, more humane — it earns its place. When it serves the institution at the cost of citizens — surveilling them, displacing officers who served them, replacing human dignity with algorithmic efficiency — it has failed and must be reformed.

Robots in CivicOS are public servants in mechanical form. They embody the platform's commitments. When they cease to embody those commitments, they cease to belong.

The kill switch is on every side. The charter is signed and sunset. The officer is in command. The citizen is the principal.

This is how civilization brings robots in — with discipline, with humility, with citizen primacy, with sovereign control. Anything else is just deployment of capability without governance, and capability without governance is hazard at scale.
