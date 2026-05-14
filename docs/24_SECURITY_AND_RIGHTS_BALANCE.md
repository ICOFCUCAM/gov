# CivicOS — National Security and Rights Balance (Companion 24)

This companion specifies how CivicOS handles the most dangerous tension in any state platform: the legitimate needs of national security and law enforcement vs. the fundamental rights of citizens. It complements Volume I §19 (CivicGuard, public safety) and §30 (cybersecurity) by going deep on the *boundaries* — what the platform supports, what it refuses, and how the difference is enforced.

The thesis: **a platform that can be used for mass surveillance, regardless of intent, is a platform that will be used for mass surveillance**. Capability is policy. CivicOS therefore *structurally* refuses to build certain capabilities, *narrowly* permits others under judicial warrant and parliamentary oversight, and *transparently* reports on every use.

The discipline: surveillance powers are licensed, narrow, time-bound, judicially gated, technically constrained, and audited. There are no "trust us" capabilities. There are no untouchables.

---

## 1. Principles

1. **Mass surveillance forbidden, structurally.** The platform does not implement, and cannot easily be coerced to implement, mass surveillance of lawful private life.
2. **Targeted lawful intercept narrowly permitted.** Specific, judicially authorized, time-bound, technically constrained.
3. **Judicial gating is real.** Warrants are validated technically; expired warrants stop working.
4. **Two-person rule for invasive operations.** No single official can invoke surveillance powers.
5. **Hardware-enforced quotas.** Even with warrants, the volume of intercept is capped.
6. **Post-hoc oversight unavoidable.** Every invocation reviewed by Inspector General; aggregate publicly reported.
7. **Privacy floors are inviolate for ordinary citizens.** The default is no.
8. **Civil liberties safeguards survive technological change.** PQC, AI, quantum — none dilute these commitments.
9. **No platform support for offensive operations against citizens.** Sovereign deployments do not weaponize CivicOS against the people it serves.
10. **Cross-border data demands resisted by design.** Foreign court orders do not move citizen data; only local courts under local law.

---

## 2. The forbidden list (security context)

CivicOS will not build, and explicitly refuses to be modified to support:

- Mass interception of communications.
- Mass collection of metadata for surveillance.
- Predictive policing of individuals.
- Algorithmic determinism in arrest, detention, or prosecution.
- Biometric tracking of citizens in public space without targeted warrant.
- Persistent identification of citizens at protests, religious gatherings, political meetings.
- Citizen scoring systems.
- "Threat" classifications of individuals based on lawful association or speech.
- Autonomous use of force.
- Autonomous coercive interventions.
- Network-wide content surveillance.
- Backdoors in cryptography.
- Vendor obligations to assist surveillance.
- Cross-border transfer of citizen surveillance data to foreign agencies absent treaty + local court order.
- Surveillance of constitutional officers, journalists, lawyers, civil society in their lawful activities.

This list grows; it does not shrink. Statutory or executive attempts to build forbidden capabilities through CivicOS trigger Sovereign Trust Officer Invariant Violation Findings and may trigger sovereign exit clauses.

---

## 3. What is permitted, narrowly

### 3.1 Targeted lawful intercept

- Specific person; specific period; specific scope.
- Judicial warrant from a judge with technical assessor support.
- Time-bound (maximum durations per offense class).
- Technically constrained (only the data covered by warrant accessible).
- Two-person operational rule.
- Audit trail tamper-evident.
- Inspector General review of every invocation.

### 3.2 Targeted location data with warrant

- Specific person; specific period.
- Warrant required.
- Same constraints as intercept.

### 3.3 Targeted financial monitoring with warrant

- Specific person/entity; specific period.
- Warrant from financial crimes court.
- AML/CFT triggers under threshold rules permit retrospective investigation, not predictive surveillance.

### 3.4 Border control

- Identity verification at borders is permitted.
- Watch list integration permitted with strict criteria for inclusion and judicial oversight of long-term retention.
- Mass biometric capture at borders in routine travel is restricted to processes minimum necessary.

### 3.5 Targeted cyber defense response

- Defensive measures may operate against attackers without warrant when limited to attacker-side response and not targeting civilians.
- Offensive cyber operations are out of scope of CivicOS; if a sovereign chooses to operate them, they do so on separate, more restrictive instruments.

### 3.6 Public safety in genuine emergencies

- Emergency exigent circumstances permit limited expanded action with mandatory post-hoc judicial review (within 72 hours).
- Inspector General notified of every exigent invocation.
- Aggregate use publicly reported.

---

## 4. The Lawful Intercept module

A separately licensed, distinctly governed module not bundled with the standard distribution. Sovereigns who choose to operate intercept install this module under specific governance.

### 4.1 Architecture

- **Warrant Server** (judicial-controlled): warrants signed by judges with their HSM-protected keys; warrants include scope and expiration.
- **Intercept Gateway** (operations-controlled): receives warrants; authenticates them against judicial trust roots; only acts on valid, in-scope, unexpired warrants.
- **Quota Enforcer** (hardware-bound): enforces volumetric and temporal caps even with valid warrants.
- **Audit Vault** (Inspector General-controlled): receives all invocations and their evidence; tamper-evident; immutable.
- **Citizen-Notification Service**: notifies the subject of intercept after the fact, where lawful, within statutorily defined windows.

### 4.2 Workflow

1. Investigator drafts intercept application.
2. Application reviewed by prosecutor.
3. Submitted to court with technical assessor review.
4. Judge issues warrant signed with judicial HSM.
5. Warrant deposited at Warrant Server.
6. Intercept Gateway begins intercept within scope.
7. Audit Vault records every byte and metadata.
8. Quota Enforcer caps volume.
9. Warrant expires; intercept stops.
10. Inspector General reviews.
11. Subject notified per law.
12. Aggregate use reported quarterly.

### 4.3 Discipline

- No intercept without valid warrant.
- No expansion of warrant scope unilaterally.
- No retention beyond warrant retention period.
- No use beyond the criminal proceeding for which it was authorized.
- No sharing with other agencies absent additional authority.
- Any attempt to circumvent triggers immediate alarms, halts intercept, and is itself a crime.

### 4.4 Forbidden in the Lawful Intercept module

- Mass surveillance.
- Bulk metadata collection.
- Standing or pre-authorization warrants.
- Warrants without specific subject or scope.
- Warrants without expiration.
- Use of intercept for civil matters.
- Use of intercept for political opposition.
- Surveillance of constitutional officers, journalists, lawyers.

---

## 5. Watch lists and registries

### 5.1 Inclusion criteria

- Documented and judicially reviewed.
- Specific (no broad categories like "religion" or "national origin").
- Updated; periodic review.
- Subject of inclusion entitled to know (post-investigation, where lawful) and to challenge.

### 5.2 Use

- Border crossings: identity match against valid watch list entries.
- Financial transactions: AML/CFT triggers based on warranted lists or treaty obligations.
- Law enforcement queries: per-purpose, audited, judicially oversighted.

### 5.3 Discipline

- No "association-based" inclusion (you're not on a watch list because of who you know).
- No inclusion based on lawful speech, religion, association, or assembly.
- Periodic review with sunset by default.
- Independent oversight of inclusion criteria.

---

## 6. Public space, biometrics, and civil liberties

### 6.1 The default

- No persistent biometric tracking of citizens in public space.
- No general-purpose CCTV with face recognition operating on the population.
- No biometric capture at protests, religious gatherings, political meetings.

### 6.2 What's permitted

- Physical access control (e.g., government building entry) with consent and minimal retention.
- Targeted recognition under judicial warrant for specific persons.
- Counter-terror operations under tight statutory framework with judicial oversight.

### 6.3 What's forbidden

- General-purpose ANPR for population tracking.
- Live biometric identification of citizens in public absent warrant.
- Retention of biometric capture beyond strict necessity.
- Sharing of biometric capture across purposes without authority.
- Outsourcing of public-space biometric operations to commercial vendors.

### 6.4 Smart city safeguards

- Smart city sensor deployments reviewed by Algorithmic Ombudsman + Citizens' Assembly.
- Privacy impact assessments mandatory.
- Citizen visible representation of what is being sensed.
- Data minimization and short retention default.
- No commercial use of public-space sensing data.

---

## 7. Cross-border cooperation

### 7.1 What's permitted

- Mutual legal assistance treaties (MLATs) executed under both sides' legal frameworks.
- Treaty-based information exchange for specific crime classes.
- INTERPOL cooperation per IPSG procedures.
- Refugee status sharing per UNHCR guidelines.
- Threat intelligence sharing under Companion 15 §10 cyber protocols.

### 7.2 What's forbidden

- Foreign court orders honored without local court order.
- Cross-border data demands without treaty.
- Bulk data sharing.
- Sharing that would expose citizens to torture, persecution, or political prosecution.
- Sharing for political opposition surveillance.

### 7.3 Discipline

- Every cross-border data flow logged, attributed, justified.
- Annual reporting on cross-border requests received and responded to.
- Sovereign Trust Officer oversight of unusual patterns.

---

## 8. Vendor coercion resistance

A foreign vendor of CivicOS components may face foreign-government demands for data or backdoors. CivicOS architecture resists this:

### 8.1 Mechanisms

- Sovereign keys held in sovereign HSMs not accessible to vendor.
- Source code escrow ensures continuity if vendor is coerced.
- Reproducible builds and signed artifacts detect tampering.
- Multi-vendor for critical components prevents single points of coercion.
- Open kernel ensures sovereign forking option.

### 8.2 Vendor charter requirements

- Vendor attests to legal protections in their jurisdiction.
- Vendor commits to refuse foreign government data demands without sovereign court order.
- Vendor commits to disclose any compelled access attempt within 30 days.
- Vendor exit clauses triggered if jurisdiction changes weaken protections.

### 8.3 What sovereigns can do

- Conduct independent security review of vendor components.
- Require source escrow with sovereign-controlled custodians.
- Require multi-vendor for critical paths.
- Replace coerced vendors immediately.

---

## 9. Officer surveillance and accountability

### 9.1 Officers under audit

- Every officer access of citizen data is logged with attribution.
- Behavioral analytics on officer access (per Companion 21 §12).
- Citizens may request a record of who accessed their data.
- Unauthorized access is prosecutable.

### 9.2 Constitutional officers under audit

- Same standards as ordinary officers.
- Multi-party access for sensitive operations they conduct.
- Independent oversight of their oversight (e.g., Inspector General audits Algorithmic Ombudsman's data access).

### 9.3 No untouchables

- Heads of state, ministers, generals, judges, ombudspersons — all under access discipline.
- Political position does not exempt from access logging.
- Whistleblower protections apply to those reporting senior official misuse.

---

## 10. Election integrity (separate but interfacing)

CivicOS does not run elections. Elections are run by independent electoral commissions on dedicated infrastructure with separate governance. CivicOS interfaces:

### 10.1 Voter registry

- Maintained by electoral commission.
- Linked to civil registration for currency.
- Citizen-verifiable; correction processes accessible.
- Independent of executive control.

### 10.2 Election operations

- Tabulation runs on separately governed systems.
- AI assistance forbidden in tabulation.
- Election infrastructure tested and certified annually by electoral commission and independent technical bodies.
- Cyber defense coordinated with CivicShield but under electoral authority.

### 10.3 Forbidden

- Election outcome optimization.
- Voter suppression through identity friction.
- Algorithmic candidate ranking on official surfaces.
- Personalized political content generated by state.
- Use of platform data for electoral campaigning.

### 10.4 Inclusion safeguards

- Identity inclusion floor protects voting access.
- No-biometrics path for voting registration.
- Multiple voting methods including paper.
- Provisional ballots and reconciliation.

---

## 11. Civil society protection

Civil society — civil rights groups, journalists, lawyers, academics, religious communities, opposition political parties — must be safe from platform-enabled surveillance.

### 11.1 Special protections

- Communications with journalists, lawyers, religious counselors protected by privilege.
- Civil society organizations entitled to enhanced privacy in their operational accounts.
- Whistleblower channels with cryptographic anonymity.
- No platform feature that enables association graphing of civil society.

### 11.2 Forbidden

- Surveillance of civil society in their lawful work.
- "Threat" classifications based on civil society membership.
- Pressure on civil society through service withdrawal or scrutiny.
- Cooperation with foreign surveillance of national civil society.

---

## 12. Inspector General and Independent Oversight

### 12.1 Inspector General

- Powers: investigate any executive misconduct including surveillance abuse.
- Reports: parliament + public.
- Independence: fixed term, qualified-majority removal, independent budget.
- Standing access: lawful intercept logs, watch list registries, access logs.

### 12.2 Algorithmic Ombudsman intersection

- Investigates algorithmic harms in security context (e.g., biased facial recognition, discriminatory watch list inclusion).
- Cooperates with Inspector General.
- Joint investigations where mandates overlap.

### 12.3 Sovereign Trust Officer intersection

- Issues IVF for invariant violations including unconstitutional surveillance.
- Authority to pause surveillance capabilities pending investigation.
- Annual sovereignty audit covers civil-liberties posture.

### 12.4 Judicial oversight

- Independent judiciary reviews warrant applications.
- Special technical assessors for technical warrants.
- Appeals path through ordinary courts.

### 12.5 Parliamentary oversight

- Standing intelligence and security committee with cleared members.
- Quarterly classified briefings; annual unclassified summary.
- Authority to demand documents and testimony.

---

## 13. Public reporting

### 13.1 Annual surveillance transparency report

Includes (per Inspector General):

- Number of warrants issued, by category.
- Number of warrants denied.
- Average warrant duration.
- Number of subjects affected.
- Number of expired warrants properly terminated.
- Compliance violations and consequences.
- Inspector General findings and recommendations.

### 13.2 Annual civil liberties report

- Cross-border data requests received and responded to.
- Watch list inclusions and removals.
- Algorithmic capabilities deployed in security context.
- Officer misconduct findings.
- Citizen complaints about surveillance.

### 13.3 Independent assessments

- Civil society assessments invited.
- Academic assessments funded.
- International independent body reviews welcome.

---

## 14. Crisis and emergency operations

### 14.1 Genuine emergencies

- Defined narrowly: imminent threat to life or national security.
- Time-bound: emergency powers expire automatically.
- Subject to immediate judicial review (within 72 hours).
- Aggregate use reported publicly within 30 days.

### 14.2 Emergency protocol

- Pre-positioned playbooks per emergency class.
- Exigent surveillance powers expand only as authorized.
- Even in emergencies, mass surveillance forbidden.
- Emergency operations terminate when emergency ends.

### 14.3 Discipline against emergency creep

- Emergency powers do not become normal.
- Statutory sunset clauses on emergency authorities.
- Independent review of every emergency invocation.
- Public reporting on emergency use.

---

## 15. Technological neutrality

### 15.1 The principle

The civil liberties commitments do not weaken with technological change. PQC, quantum compute, AI orchestration, satellite sensing — none dilute the rights commitments.

### 15.2 Implementation

- Every new capability assessed for civil liberties impact before deployment.
- Algorithmic Ombudsman reviews capabilities that touch security domains.
- Citizens' Assemblies consulted on major surveillance-adjacent capabilities.
- Sunset clauses on novel capabilities until proven over time.

### 15.3 The forbidden list grows with capability

- New technologies enable new abuses; CivicOS adds them to the forbidden list as recognized.
- Reverse never permitted: removing items from the forbidden list requires constitutional process.

---

## 16. Forbidden in security operations

Per the master forbidden list, plus:

- Use of CivicOS data or capabilities for political opposition surveillance.
- Use of CivicOS in coup operations against constitutional government.
- Use of CivicOS for ethnic, religious, or other categorical persecution.
- Use of CivicOS to suppress journalism or civil society.
- Use of CivicOS to coerce judges, prosecutors, or election officials.
- Use of CivicOS to enable foreign aggression.

The Sovereign Trust Officer is empowered to halt any platform operation that begins to serve such ends. The Foundation has standing to support sovereigns in resisting such use. Foreign sovereigns observing such use have standing to invoke planetary protocol pause clauses.

---

## 17. The security north star

CivicOS exists to serve citizens through their state. The security capabilities the platform supports are narrow, judicially gated, technically constrained, audited, and reported. The capabilities the platform refuses to support are broad, declared, designed-against, and structurally enforced.

A platform that empowers the state at the cost of citizens has misunderstood its purpose. A platform that becomes a tool of repression has failed completely, regardless of capability.

The discipline is daily. The accountability is constitutional. The constraints are technical, not just policy. The transparency is real.

When CivicOS becomes a surveillance state in waiting — even unintentionally, even through capability creep — it must be reformed, paused, or replaced. Capability without civil liberties is not progress; it is the deepest failure.

This is the line. It does not move.
