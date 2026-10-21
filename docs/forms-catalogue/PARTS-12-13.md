# CivicOS — Complete Government Form System (ChatGPT), parts 12 and 13 of 13, kept verbatim

**Provenance.** ChatGPT's answer to the forms catalogue request of 21 October
2026, pasted by the owner. Received so far: parts 8–11
(`PARTS-08-11.md`) and 12–13 (this file); parts 1–7 not yet received.

**Status.** Binding, like `docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md`. Owner's
instruction: never summarised; every item measured against the work and its
gap closed stage by stage; forms may be built to a higher standard than this
text, never lower. Each catalogue item is a row of
`docs/INSTITUTIONAL_REQUIREMENTS.md`.

**How the text was kept.** Every word is here in the order delivered. Removed
only: 1 line of diagram styling code the chat window copied along with a state
diagram (CSS, not content; marked where it stood, and the diagram's state names
copied with it are kept as they were), and the owner's one-word "next" prompts
between parts.

---

CivicOS — Complete Government Form System
Part 12 of 13 — Legislature, Elections, Political Parties, Constitutional Offices, Independent Institutions and Public Accountability
This part defines the forms, registers, decision workflows and institutional safeguards CivicOS needs to support democratic governance, legislative administration, election management, political party regulation, constitutional appointments, independent commissions and public accountability.

The objective is to enable transparent, accessible and legally accountable democratic institutions while preserving the separation of powers. CivicOS must support these institutions as independent constitutional actors—not as subordinate departments of the executive.

The catalogue IDs below are stable CivicOS identifiers. They do not imply that every form is legally required in every country. National constitutions, electoral laws, parliamentary rules, political finance laws and the mandates of independent bodies must be configured and approved before the relevant workflows are activated.
1. Scope and institutional architecture

A. Legislature and parliamentary administration

Bills, motions, committee work, hearings, petitions, voting records, parliamentary questions and legislative publication.


B. Electoral administration

Voter registration, electoral boundaries, candidate nominations, polling stations, ballot administration, results, recounts, complaints and appeals.


C. Political parties and campaign finance

Party registration, internal governance disclosures where required, candidate lists, donations, campaign expenditure and financial compliance.


D. Constitutional offices and independent institutions

Appointments, declarations of interest, independent investigations, public complaints, audit findings, ombudsman cases and constitutional oversight.


Institutional boundaries
Institution archetype	Typical responsibility
Legislature or parliament	Legislative proceedings, committees and parliamentary oversight
Electoral management body	Elections, voter administration and official results within its mandate
Electoral dispute tribunal or court	Electoral disputes and remedies under law
Political party regulator	Party registration and applicable regulatory functions
Public audit institution	Independent audit and public financial accountability
Ombudsman	Complaints and investigations within its jurisdiction
Human rights commission	Rights monitoring and complaint handling under its mandate
Anti-corruption commission	Independent investigation and enforcement within statutory powers
Constitutional court or judicial body	Constitutional review and judicial decisions
Constitutional appointments commission	Candidate assessment or appointment recommendations where established by law
Information or data protection commissioner	Independent oversight of information access or personal-data protection
Public consultation authority or designated office	Administration of legally required consultations and submissions
These are archetypes, not mandatory institutional arrangements. The system must represent each institution's establishing law, constitutional standing, independence, powers, record ownership and authorized relationships explicitly.

Non-negotiable principle: Executive administrators must not be able to modify legislative votes, change certified election results, suppress independent findings or access confidential constitutional-office records merely because they hold a national government administrator account.
2. Master form catalogue
2.1 Legislature and parliamentary business
Form ID	Form or workflow	Primary outcome
DEM-LEG-001	Bill introduction	Registered legislative proposal
DEM-LEG-002	Bill text submission	Versioned bill and supporting documents
DEM-LEG-003	Bill amendment proposal	Linked amendment and sponsor record
DEM-LEG-004	Committee referral	Authorized committee assignment
DEM-LEG-005	Committee inquiry initiation	Inquiry mandate, scope and timetable
DEM-LEG-006	Committee evidence submission	Indexed evidence and source provenance
DEM-LEG-007	Public hearing registration	Hearing record and participant arrangements
DEM-LEG-008	Parliamentary motion	Motion submission and decision tracking
DEM-LEG-009	Parliamentary question	Question to the designated office or minister
DEM-LEG-010	Government response to parliament	Official response and supporting record
DEM-LEG-011	Parliamentary debate record	Agenda, transcript and proceedings record
DEM-LEG-012	Legislative vote record	Authenticated vote and result
DEM-LEG-013	Legislative division or roll-call record	Individual vote records where published or required
DEM-LEG-014	Legislative passage certification	Certified stage or passage record
DEM-LEG-015	Assent or promulgation referral	Referral to the legally designated authority
DEM-LEG-016	Parliamentary petition	Registered petition and admissibility review
DEM-LEG-017	Parliamentary committee report	Report, recommendations and adoption history
DEM-LEG-018	Parliamentary oversight recommendation	Finding, recipient and response tracking
DEM-LEG-019	Parliamentary ethics disclosure	Declaration and authorized review
DEM-LEG-020	Parliamentary record correction	Linked correction with preserved original
Legislative stages vary by country. The workflow must not assume that passage by one chamber automatically enacts a law, or that an executive office has the power to approve, amend or block a bill.
2.2 Elections and electoral administration
Form ID	Form or workflow	Primary outcome
DEM-ELC-001	Electoral event establishment	Authorized election record
DEM-ELC-002	Election timetable approval	Versioned timetable and deadlines
DEM-ELC-003	Voter registration application	Voter eligibility assessment
DEM-ELC-004	Voter record correction	Controlled correction and history
DEM-ELC-005	Voter registration transfer	Authorized constituency or address transfer
DEM-ELC-006	Voter register review request	Inclusion, exclusion or correction review
DEM-ELC-007	Electoral boundary change proposal	Boundary review and lawful decision
DEM-ELC-008	Candidate nomination	Candidate application and eligibility assessment
DEM-ELC-009	Candidate list submission	Party or list nomination record
DEM-ELC-010	Candidate withdrawal	Authenticated withdrawal and updated status
DEM-ELC-011	Election agent or representative registration	Authorized representative record
DEM-ELC-012	Polling station designation	Approved polling location and operational plan
DEM-ELC-013	Polling station accessibility assessment	Accessibility findings and remediation
DEM-ELC-014	Poll worker appointment	Authorized appointment and training record
DEM-ELC-015	Ballot production and custody record	Controlled production, distribution and reconciliation
DEM-ELC-016	Poll opening record	Opening checklist and authorized sign-off
DEM-ELC-017	Poll closing and ballot reconciliation	Reconciliation and exception record
DEM-ELC-018	Polling-station result submission	Signed or authenticated result record
DEM-ELC-019	Results aggregation and certification	Authorized aggregate result and certification
DEM-ELC-020	Recount or verification request	Review authorization and recount outcome
DEM-ELC-021	Electoral complaint	Complaint, evidence and decision workflow
DEM-ELC-022	Electoral appeal	Appeal record and competent review authority
DEM-ELC-023	Election incident report	Incident and response record
DEM-ELC-024	Election observation accreditation	Authorized observer accreditation
DEM-ELC-025	Election observation report	Findings and source-labelled observations
DEM-ELC-026	Election final report	Official report, limitations and lessons learned
Voter eligibility, identification requirements, nomination rules, election timetables and recount procedures must come from the applicable law. CivicOS must not invent universal requirements or silently impose them on a country's voters.
2.3 Political parties and campaign finance
Form ID	Form or workflow	Primary outcome
DEM-POL-001	Political party registration	Registration decision
DEM-POL-002	Party constitutional documents submission	Versioned governing documents
DEM-POL-003	Party officer or authorized representative update	Verified representation change
DEM-POL-004	Party registration renewal or confirmation	Continued registration status where applicable
DEM-POL-005	Party merger or dissolution notice	Authorized status and successor records
DEM-POL-006	Candidate endorsement submission	Candidate endorsement record
DEM-POL-007	Campaign finance account registration	Designated account and authorized signatories
DEM-POL-008	Political donation disclosure	Donation record under applicable disclosure rules
DEM-POL-009	In-kind contribution declaration	Valuation, source and compliance review
DEM-POL-010	Campaign expenditure report	Itemized expenditure and reporting period
DEM-POL-011	Campaign funding source declaration	Required source disclosure and verification
DEM-POL-012	Political finance annual return	Party or campaign financial return
DEM-POL-013	Campaign finance audit submission	Audit report and findings
DEM-POL-014	Political finance compliance inquiry	Review and evidence record
DEM-POL-015	Political finance correction or amendment	Versioned corrected filing
DEM-POL-016	Political finance enforcement referral	Authorized referral and disposition tracking
Disclosure rules must be configured carefully. Not every donor's identity, party membership record or campaign transaction should be public in every jurisdiction. Public disclosure must follow the applicable law, privacy rules and electoral transparency obligations.
2.4 Constitutional offices and independent institutions
Form ID	Form or workflow	Primary outcome
DEM-CON-001	Constitutional appointment nomination	Candidate nomination record
DEM-CON-002	Appointment eligibility assessment	Evidence-based eligibility review
DEM-CON-003	Conflict-of-interest declaration	Declaration and review record
DEM-CON-004	Appointment hearing record	Hearing and authorized findings
DEM-CON-005	Appointment recommendation	Recommendation to the competent authority
DEM-CON-006	Constitutional appointment decision	Authorized appointment or refusal
DEM-CON-007	Office commencement declaration	Commencement and term record
DEM-CON-008	Term extension or renewal review	Authorized renewal decision where permitted
DEM-CON-009	Resignation or vacancy notice	Vacancy and succession workflow
DEM-CON-010	Removal or suspension proceeding	Lawful procedure and review record
DEM-CON-011	Independent commission inquiry	Inquiry mandate and findings
DEM-CON-012	Ombudsman complaint	Complaint, jurisdiction and remedy workflow
DEM-CON-013	Human rights complaint	Restricted complaint and review
DEM-CON-014	Public audit finding	Finding, recommendation and response
DEM-CON-015	Independent regulator decision	Authorized regulatory decision
DEM-CON-016	Independent institution annual report	Approved report and publication record
DEM-CON-017	Public information request	Access assessment and disclosure decision
DEM-CON-018	Personal data rights request	Authorized access, correction or other rights workflow
DEM-CON-019	Protected disclosure to an independent body	Restricted disclosure and follow-up
DEM-CON-020	Independent institution oversight response	Official response and corrective-action record
CivicOS must not assume that a constitutional appointment is made by the executive, that a commission reports to a ministry, or that a public audit body can be instructed to change its findings. Those powers must follow the nation's constitutional and statutory framework.
2.5 Public consultation, petitions and accountability
Form ID	Form or workflow	Primary outcome
DEM-PUB-001	Public consultation initiation	Approved consultation plan
DEM-PUB-002	Public consultation submission	Registered public contribution
DEM-PUB-003	Consultation accessibility request	Accessible participation arrangement
DEM-PUB-004	Public hearing submission	Evidence or statement for a hearing
DEM-PUB-005	Citizen petition submission	Petition and admissibility assessment
DEM-PUB-006	Petition signature verification	Verified count or status under applicable rules
DEM-PUB-007	Government response to petition	Official response and publication
DEM-PUB-008	Public service complaint	Complaint, referral and resolution
DEM-PUB-009	Public integrity complaint	Restricted review and authorized referral
DEM-PUB-010	Public institution performance report	Approved indicators and explanatory notes
DEM-PUB-011	Freedom of information appeal	Independent or designated review
DEM-PUB-012	Open data publication request	Disclosure review and release record
Public participation must not be restricted to users with a national digital identity where the law requires alternative ways to participate. CivicOS should support appropriate anonymous or pseudonymous submissions, with identity verification only when necessary and lawful.
3. Common democratic governance data contract
Every form must use the shared CivicOS form framework while preserving the specific procedural rules of legislatures, electoral authorities, courts and independent institutions.
Schema section	Required design
Identity	Immutable record ID, form ID, schema version and jurisdiction
Institution	Record-owning authority, constitutional standing and authorized office
Legal basis	Applicable instrument, provision, rule version and effective date
Subject	Bill, election, voter record, party, appointment, petition, complaint or public decision
Submission	Applicant or submitting organization, submission time and authentication method
Evidence	Source, issuer, verification status, provenance and access classification
Procedure	Required stages, deadlines, quorum or eligibility rules where applicable
Decision	Authorized decision-maker, outcome, legal basis, reasons and effective date
Publication	Public, restricted or confidential status, approved disclosure version and release date
Review	Objection, recount, appeal, judicial review or reconsideration route
Audit	Creation, amendment, access, approval, publication and transfer events
Essential integrity rules
- Preserve the distinction between a proposal, a submitted filing, an approved decision and a legally effective instrument.
- Never overwrite a legislative text, electoral result, appointment decision or independent finding without preserving the earlier version and its status.
- Apply legal deadlines using the correct jurisdiction, calendar and triggering event.
- Distinguish a missing document from a failed eligibility requirement.
- Record the authority responsible for certifying each result or decision.
- Support corrections through linked, attributable events.
- Separate the authoritative record from public summaries and derived dashboards.
- Prevent training and demonstration data from appearing in production elections or official government records.
- Make every published figure traceable to an approved source and reporting methodology.
Example typed form schema
type DemocraticRecord = {
  recordId: string;
  formId: string;
  schemaVersion: string;
  jurisdictionId: string;
  owningInstitutionId: string;
  legalRuleSetVersion: string;
  status: string;
  submittedAt?: string;
  decisionId?: string;
  publicationStatus:
    | "not_public"
    | "pending_review"
    | "approved_for_publication"
    | "published";
  auditEventIds: string[];
};


The shared type must be extended with form-specific validation, privacy classification, evidence requirements, legal deadlines and authorized state transitions.
4. Legislative workflow and legal publication
4.1 Bill lifecycle
1. Draft and introduction
   
   Register the sponsor, bill text, explanatory materials and required supporting documents.
2. Admissibility review
   
   Apply the legislature's configured submission and procedural rules. Record deficiencies and the lawful remedy.
3. Committee and consultation
   
   Track referrals, evidence, hearings, amendments, consultation submissions and committee reports.
4. Debate and voting
   
   Record the applicable motion, voting procedure, quorum where required, authenticated result and procedural challenges.
5. Further legislative stages
   
   Route the bill through any additional chamber, reading, amendment or approval stage required by the country's constitutional framework.
6. Assent, promulgation or other enactment process
   
   Refer the approved instrument to the legally designated authority and record the resulting action.
7. Publication and commencement
   
   Publish the authenticated final instrument through the authorized legal publication channel and record its commencement provisions.

4.2 Legislative record requirements
Each bill must maintain:
- A stable bill identifier.
- Sponsor and authorized submitting institution.
- Immutable text versions and a comparison between versions.
- Amendment proposals and their disposition.
- Committee referrals and reports.
- Debate and voting records.
- Required approvals and procedural certifications.
- Assent, promulgation or other enactment events where applicable.
- Publication reference and effective date.
- Links to subsequent amendments, repeal or judicial review.
A draft bill must never appear in the legal register as enacted law. A parliamentary vote must not be interpreted as enactment until all constitutionally required steps have been completed.
4.3 Legislative voting controls
The voting workflow must use the legislature's legally approved voting method and procedural rules.
- Verify the authorized voting session and voting eligibility.
- Apply quorum and voting thresholds only where required by the relevant rule.
- Preserve the authenticated vote result and required supporting records.
- Record corrections and challenges without silently altering the original result.
- Support secret voting where constitutionally or procedurally required.
- Restrict access to confidential deliberations where law requires it.
- Publish individual voting records only when authorized or required.
- Prevent executive administrators from editing or certifying legislative votes.
5. Election administration and electoral integrity
Election workflows must prioritize verifiable procedures, transparent rules, equal treatment and a credible chain of custody.
5.1 Election lifecycle
1. Establish the election
   
   Record the lawful trigger, election type, responsible authority, election timetable and applicable electoral rules.
2. Prepare the register
   
   Apply the country's voter eligibility rules, handle authorized corrections and maintain a traceable history of register changes.
3. Register candidates and parties
   
   Assess nominations against published legal criteria, provide required notices and record objections or appeals.
4. Prepare polling operations
   
   Designate polling locations, appoint authorized staff, prepare accessible arrangements and track ballot materials.
5. Conduct polling
   
   Record opening, operational incidents, closing, ballot reconciliation and the authorized counting procedure.
6. Tabulate and verify
   
   Aggregate authenticated results, identify discrepancies and apply the legally required verification and recount process.
7. Certify and resolve disputes
   
   Record certification by the competent authority and route challenges to the designated tribunal or court.
8. Publish and archive
   
   Release authorized results, preserve supporting records and document post-election reviews.

5.2 Voter register safeguards
- Collect only information authorized for voter registration.
- Keep the legal voter register separate from general population and identity records.
- Require an explicit legal basis and authorized procedure for matching identity data.
- Preserve additions, removals and corrections as attributable events.
- Support challenges to erroneous inclusion or exclusion.
- Restrict voter data from political campaign use unless the law explicitly permits a defined disclosure.
- Do not expose individual voting choices. In a secret-ballot election, CivicOS must not create a link between a named voter and their marked ballot.
- Provide alternative registration and participation pathways where legally required for people who cannot use digital services.
- Treat an unsuccessful identity match as an unresolved verification case, not automatic proof of ineligibility.
5.3 Ballot custody and result integrity
Every ballot-material movement must record the issuing authority, batch or seal identifier where applicable, quantity, sender, recipient, time, location and acknowledgement.

The result workflow must distinguish:
1. Polling-station count.
2. Reconciliation and exception review.
3. Authorized local or regional aggregation.
4. National tabulation where applicable.
5. Official certification.
6. Recount, challenge or judicial disposition.
7. Final publication.
Corrections must be linked to the original result with the reason, supporting evidence, authorized decision and updated certification status.
5.4 Digital systems and the secret ballot
CivicOS may administer voter registration, candidate filing, polling operations and result reporting without becoming an electronic voting system.

If a country proposes online voting or electronic ballot counting, that requires a separate, explicitly approved system design and legal assessment. Identity verification, voting authorization and ballot secrecy must be architecturally separated so that authenticating a voter does not reveal the voter's selection.

A blockchain, hash or signed receipt does not by itself prove that an election was fair, that every eligible person could participate, or that a reported result is correct. End-to-end procedures, independent observation, physical or electronic evidence and legally defined dispute mechanisms remain essential.
6. Political parties, donations and campaign finance
6.1 Party registration workflow
The party registration workflow should support:
- Submission of the required governing documents.
- Verification of authorized officers and representatives.
- Assessment against published legal criteria.
- Requests for missing information and the right to respond.
- A reasoned registration decision.
- Publication of information legally required to be public.
- Appeals or judicial review where available.
- Amendments, mergers, dissolution and historical record preservation.
CivicOS must not assess parties based on political ideology, popularity or alignment with the incumbent government unless a specific legal criterion is validly applicable and constitutionally permissible.
6.2 Campaign finance workflow
1. Register the reporting entity
   
   Establish the party, campaign or candidate account and the applicable reporting obligations.
2. Record contributions
   
   Capture required contribution details, permitted sources, in-kind contributions and applicable disclosure thresholds.
3. Record expenditure
   
   Track reported spending, supporting documents, applicable limits and the reporting period.
4. Submit and verify returns
   
   Run configured completeness and arithmetic checks and record missing or disputed evidence.
5. Audit and review
   
   Refer cases for authorized examination and preserve the evidence, response and findings.
6. Publish and enforce
   
   Publish legally required disclosures and route confirmed noncompliance through the appropriate due-process procedure.

6.3 Finance controls
- Apply the correct reporting period, currency and approved threshold versions.
- Separate declared amounts from independently verified amounts.
- Keep a correction history for amended returns.
- Record the legal basis for disclosure or withholding of donor information.
- Support lawful exemptions and confidential information handling.
- Avoid automatically treating a late or incomplete filing as proven fraud.
- Separate automated anomaly detection from the regulator's final findings.
- Provide a response and review mechanism before adverse determinations where required.
Political finance dashboards must not present estimates as audited figures or allegations as confirmed violations.
7. Constitutional appointments and independent institutions
7.1 Appointment lifecycle
1. Establish the vacancy
   
   Record the office, constitutional or statutory basis, term, appointing authority and applicable eligibility requirements.
2. Receive nominations
   
   Record the nominating authority, required declarations and supporting evidence, with appropriate confidentiality controls.
3. Assess eligibility
   
   Apply the published legal criteria and document each material finding and its source.
4. Conduct hearings or consultation
   
   Record any required hearings, public submissions, disclosures and responses.
5. Make the authorized recommendation or decision
   
   Preserve the recommendation separately from the final decision, especially where different institutions hold those powers.
6. Publish and commence
   
   Issue the required appointment instrument, publish authorized information and record the commencement date and term.
7. Manage the term
   
   Track declarations, renewals, vacancies, resignation or removal proceedings, while protecting the independence of the office.

7.2 Institutional independence controls
For each independent institution, CivicOS must configure:
- Establishing law and constitutional standing.
- Appointment, tenure, removal and succession rules.
- Budget and administrative arrangements where legally relevant.
- Authority over its own records and internal case assignments.
- Reporting obligations and authorized recipients.
- Confidentiality, disclosure and publication rules.
- Applicable judicial or other review mechanisms.
- Prohibitions on unauthorized executive instruction or intervention.
An independent institution's record owner must not be reassigned by a general government administrator without a lawful, explicitly authorized process.
7.3 Independent investigations and findings
The investigation workflow should record the mandate, investigator, conflicts of interest, evidence, procedural steps, findings, recommendations, response from the institution concerned and closure status.

A recommendation is not automatically a binding order. A finding should not be silently rewritten by the institution under investigation. If an independent body's decision is appealed or judicially reviewed, the new proceeding must link to the original record and preserve the original outcome.
8. Public petitions, consultations and information access
8.1 Public consultation lifecycle
1. Record the sponsoring institution, legal basis, consultation purpose and scope.
2. Publish the proposal and the authorized consultation timetable.
3. Provide accessible submission methods and explain how contributions will be used.
4. Register submissions with privacy settings appropriate to the contributor's choice and applicable law.
5. Verify signatures or eligibility only when required for the specific process.
6. Record how submissions were considered, including material themes and unresolved objections.
7. Publish an authorized response or consultation report.
8. Preserve the submission record and decision history under the applicable retention rules.
8.2 Petition integrity
The petition workflow must distinguish the text of the petition, the identity or eligibility checks for signatories where applicable, the verified signature count, admissibility decision and the institution's response.

CivicOS must not expose signatories' personal information merely because the petition itself is public. It should also support lawful alternative signature verification when people cannot use a national digital identity system.
8.3 Public information requests
The information-access workflow should record the requested material, responsible record-holding institution, applicable legal deadline, searches performed, exemption analysis, redactions, decision, disclosure delivery and appeal rights.

The executive must not decide an information request belonging to an independent legislature, court or commission unless the law explicitly grants that power. The record-holding institution or legally designated review authority must retain responsibility for its decision.
9. Official registers and publication architecture
CivicOS should maintain separate authoritative registers for the different legal functions. A single search interface may connect them where lawful, but must not erase their ownership and access boundaries.
Register ID	Register	Core relationships
REG-DEM-001	Legislative instrument register	Bill, amendments, passage, enactment, publication and commencement
REG-DEM-002	Parliamentary proceedings register	Sessions, motions, debates, votes and committee work
REG-DEM-003	Committee inquiry register	Mandate, evidence, hearings, findings and recommendations
REG-DEM-004	Election event register	Election type, authority, timetable and procedural rules
REG-DEM-005	Electoral register	Voter eligibility record, authorized corrections and jurisdiction
REG-DEM-006	Candidate and nomination register	Candidates, lists, nominations and appeal status
REG-DEM-007	Polling and results register	Polling locations, result submissions, reconciliation and certification
REG-DEM-008	Electoral complaints register	Complaint, evidence, competent reviewer and disposition
REG-DEM-009	Political party register	Registration, governing documents and authorized representatives
REG-DEM-010	Campaign finance register	Returns, contributions, expenditures and audit outcomes
REG-DEM-011	Constitutional appointments register	Office, nomination, recommendation, appointment and term
REG-DEM-012	Independent institution register	Establishing law, mandate, independence and reporting obligations
REG-DEM-013	Public petition register	Petition text, admissibility, verification and official response
REG-DEM-014	Consultation register	Proposal, submissions, response and publication
REG-DEM-015	Public accountability findings register	Finding, responsible institution, response and follow-up
REG-DEM-016	Public information access register	Request, disclosure decision, delivery and appeal
Register integrity requirements
- Keep the authoritative record separate from public summaries and derived analytics.
- Preserve the exact legal and procedural versions used for every decision.
- Apply role- and purpose-based access to voter, candidate, donor and complainant data.
- Maintain an immutable history of result certification, legislative voting and appointment decisions.
- Record the source and authorization of every public data release.
- Support corrections without erasing original events.
- Provide machine-readable exports only where the applicable disclosure rules permit them.
- Keep independent institutions' records under their own configured authority.
10. Security, privacy and democratic neutrality
10.1 Political neutrality
CivicOS must provide the same configured legal process to parties, candidates and political participants who meet the applicable criteria.

The system must not:
- Rank political parties by ideological alignment with the government.
- Suppress a petition or consultation submission because of its viewpoint.
- Use political opinions or lawful political participation as a proxy for criminality or eligibility.
- Allow an executive administrator to alter election results or a legislative vote.
- Automatically reject a candidate or party based solely on an AI-generated risk score.
- Use a public consultation to infer political profiles for unrelated government purposes.
10.2 Privacy and access control
Proposed permission identifiers include:
- legislature.bill.submit
- legislature.bill.amend
- legislature.vote.record
- legislature.proceedings.publish
- election.voter.register
- election.voter.correct
- election.candidate.assess
- election.result.submit
- election.result.certify
- election.complaint.review
- political_party.registration.assess
- political_finance.return.review
- constitutional_appointment.assess
- independent_body.case.manage
- public_consultation.publish
- public_information_request.decide
These are proposed technical permissions, not statutory powers. Each country must map them to its authorized offices and procedures.

Additional safeguards:
- Restrict access to individual voter records to authorized electoral functions.
- Separate confidential ballot systems from identifiable voter records.
- Protect whistleblower and complainant identities.
- Apply legally required redactions to public documents.
- Log access to restricted records and audit bulk exports.
- Keep independent review cases inaccessible to unauthorized staff of the institution under review.
- Support retention, archival and deletion under applicable legal requirements.
10.3 AI governance
AI may assist with legislative document comparison, accessibility translation, consultation summarization, administrative completeness checks and financial return arithmetic.

AI must not independently:
- Certify election results.
- Determine a person's right to vote or stand for office.
- Make final political party registration or deregistration decisions.
- Alter a parliamentary vote or enacted instrument.
- Decide a constitutional appointment.
- Suppress, rewrite or reclassify an independent finding.
- Publish confidential submissions or donor information.
- Make final adverse decisions about a person's political rights.
AI-generated summaries must link to the source records, preserve material disagreements and disclose uncertainty. An authorized person must verify outputs before they are used for legally consequential decisions.
11. Country configuration and legal activation
Each country must complete the following configuration before enabling legally consequential workflows.
Configuration ID	Required country-specific decision
CFG-DEM-001	Constitutional structure and legislative powers
CFG-DEM-002	Parliamentary procedure, quorum and voting rules
CFG-DEM-003	Legislative enactment, assent, promulgation and publication
CFG-DEM-004	Electoral authority and its independence
CFG-DEM-005	Voter eligibility, registration and correction procedures
CFG-DEM-006	Candidate nomination and eligibility criteria
CFG-DEM-007	Ballot custody, counting, aggregation and certification
CFG-DEM-008	Recount, electoral complaints and appeal procedures
CFG-DEM-009	Political party registration and deregistration rules
CFG-DEM-010	Campaign donations, expenditure, limits and disclosure thresholds
CFG-DEM-011	Constitutional appointment, tenure and removal procedures
CFG-DEM-012	Independent institution mandates and protected access boundaries
CFG-DEM-013	Public consultation and petition requirements
CFG-DEM-014	Freedom of information and disclosure exemptions
CFG-DEM-015	Personal data protection and electoral data retention
CFG-DEM-016	Publication, correction, archival and records-management rules
CFG-DEM-017	Judicial review and independent dispute-resolution pathways
CFG-DEM-018	Digital accessibility and non-digital participation alternatives
CFG-DEM-019	Electronic signatures and official document authentication
CFG-DEM-020	AI permissions, prohibitions and human-review requirements
Every rule must have a legal source, applicable provision, jurisdiction, effective date, version, authorized confirmation and change history.

Where the governing law is uncertain, the relevant binding workflow must remain inactive until the competent institution confirms the legal position. CivicOS must not infer constitutional powers from an institution's name or administrative location.
12. Engineering implementation plan
Implement Part 12 using the existing CivicOS institution registry, shared form and case engines, legal rule service, identity and access controls, audit chain and document publication services.
01

Legislative records and legal publication

Build versioned bills, amendment history, proceedings, authenticated votes, enactment workflow and the official legal publication interface.


02

Electoral administration

Implement voter register workflows, candidate nominations, polling logistics, ballot reconciliation, results certification and electoral complaints.


03

Party and campaign finance regulation

Implement party registration, authorized representatives, finance returns, audit referrals, disclosure controls and correction histories.


04

Constitutional offices and independent institutions

Configure independent record ownership, appointments, complaints, protected disclosures, oversight findings and response tracking.


05

Public participation and disclosure

Implement petitions, consultations, public information requests, accessible submission channels and authorized publication.


Required engineering deliverables
1. Versioned form definitions for every activated catalogue entry.
2. A country-specific constitutional and legal authority registry.
3. Immutable legislative text, vote and enactment histories.
4. Electoral register and results integrity controls.
5. A controlled ballot-material custody and reconciliation workflow.
6. Party registration and campaign finance reporting services.
7. Independent institution ownership and access-control policies.
8. Appointment and tenure management with lawful review procedures.
9. Public consultation, petition and information-access workflows.
10. Public and restricted document publication pipelines.
11. Tamper-evident audit events for material decisions and disclosures.
12. AI governance rules and automated tests for prohibited decisions.
13. Accessibility, localization and non-digital participation testing.
14. Security, recovery and production activation procedures.
13. Acceptance gates
- [ ] Constitutional authority: Every activated workflow has a confirmed legal basis and responsible institution.
- [ ] Separation of powers: Independent institutions retain their configured authority, record ownership and access boundaries.
- [ ] Legislative integrity: Bill versions, votes, enactment stages and publication events are preserved and authenticated.
- [ ] Electoral integrity: Voter corrections, ballot custody, result aggregation and certification are auditable.
- [ ] Ballot secrecy: No prohibited link is created between an identified voter and their vote.
- [ ] Equal treatment: The same lawful criteria apply consistently to eligible parties and candidates.
- [ ] Finance transparency: Public disclosures follow approved rules and distinguish declared, verified and audited amounts.
- [ ] Independent oversight: Findings cannot be silently changed or suppressed by the institution under review.
- [ ] Privacy: Voter, donor, whistleblower and complainant information is disclosed only when authorized.
- [ ] Public participation: Required accessible and alternative participation channels are available.
- [ ] AI governance: AI cannot independently certify results or make prohibited decisions affecting political rights.
- [ ] Production readiness: No simulated elections, invented votes, fictitious officials or sample results appear as live official records.
A passing technical test suite does not establish electoral legitimacy or constitutional compliance. The competent institutions must approve their legal mappings, operational procedures and safeguards.
14. Definition of done
Part 12 is complete when CivicOS can support the configured legislative, electoral, political finance, constitutional appointment and public accountability workflows while preserving institutional independence and the integrity of official records.

The platform must distinguish proposals from enacted laws, nominations from appointments, reported results from certified results, allegations from findings, and public information from restricted personal or institutional records.

No government-wide administrator should possess a universal override capable of silently changing these records.

Next: Part 13 of 13 — Digital Government, Public Services, Citizen Engagement, National Statistics, Records Management, Interoperability and Whole-of-Government Integration.

The final part will bring the entire CivicOS catalogue together: citizen and business service portals, cross-institution workflows, national registries, government correspondence, digital signatures, payments, notifications, records retention, national statistics, open data, service performance, interoperability standards and the final production-readiness framework.

It will also define how the 13 parts operate as one sovereign government platform, with shared infrastructure, legally distinct institutions, explicit authority, auditable decisions and country-configurable services.


CivicOS — Complete Government Form System
Part 13 of 13 — Digital Government, Public Services, National Statistics, Records Management, Interoperability and Whole-of-Government Integration
This is the final part of the CivicOS Complete Government Form System. It defines the shared digital infrastructure that connects the previous 12 domains into one sovereign government platform without collapsing their legal authority, institutional independence or record ownership.

The objective is to enable citizens and businesses to access public services through a coherent digital front door while institutions retain control over their own decisions, records and statutory responsibilities.

The central architecture principle: one shared platform, many legally distinct institutions, explicit authority, interoperable records and auditable decisions.

CivicOS must not become a single unrestricted government database. It should provide shared infrastructure, identity and access services, workflow orchestration, document exchange, notifications, payments, records management, statistics and digital-twin integration—with access enforced by law, institution, purpose and role.

The catalogue IDs below are stable CivicOS identifiers. They do not establish that a service or legal power exists in every country. National law, institutional mandates, retention requirements, accessibility rules and data-sharing permissions must be configured before activation.
1. Scope and shared service architecture

A. Citizen and business services

A unified service directory, applications, appointments, correspondence, payments, certificates, status tracking, complaints and appeals.


B. Whole-of-government workflow orchestration

Cross-institution referrals, delegated tasks, approvals, inter-agency requests, service-level deadlines and accountable handovers.


C. Records, documents and digital trust

Government correspondence, official documents, signatures, verification, retention, archival, disclosure and evidence provenance.


D. National statistics and open data

Statistical submissions, data quality, approved indicators, national reporting, public datasets and privacy-preserving analysis.


2. Master form catalogue
2.1 Citizen and business digital services
Form ID	Form or workflow	Primary outcome
GOV-SVC-001	Government service discovery	Service information and eligibility guidance
GOV-SVC-002	Citizen service account request	Account setup under approved identity rules
GOV-SVC-003	Business service account request	Business account and authorized representation
GOV-SVC-004	Public service application	Application routed to the competent institution
GOV-SVC-005	Multi-service application	Linked applications with separate legal decisions
GOV-SVC-006	Application status inquiry	Authorized status disclosure
GOV-SVC-007	Appointment booking	Confirmed appointment or wait-list record
GOV-SVC-008	Appointment rescheduling or cancellation	Updated appointment history
GOV-SVC-009	Government correspondence submission	Registered incoming correspondence
GOV-SVC-010	Additional information submission	Evidence or clarification linked to a case
GOV-SVC-011	Government service complaint	Complaint and resolution workflow
GOV-SVC-012	Administrative reconsideration request	Review request linked to the original decision
GOV-SVC-013	Accessible service assistance request	Approved alternative service arrangement
GOV-SVC-014	Representative or agent authorization	Verified delegation of permitted actions
GOV-SVC-015	Change of contact details	Authorized contact record update
GOV-SVC-016	Certificate or official document request	Issuance workflow or reasoned refusal
GOV-SVC-017	Certificate verification request	Authenticity and current-status verification
GOV-SVC-018	Service fee refund request	Refund assessment and disposition
GOV-SVC-019	Service access or account recovery	Verified recovery under approved procedures
GOV-SVC-020	Public service feedback	Feedback record and aggregate service insights
A unified portal must not imply that a single application creates a single legal decision. If a citizen applies for several services, each competent institution retains its own decision-making authority and applicable review process.
2.2 Whole-of-government correspondence and workflow
Form ID	Form or workflow	Primary outcome
GOV-WF-001	Inter-institution referral	Authorized referral and receiving acknowledgement
GOV-WF-002	Inter-institution information request	Scoped, lawful information request
GOV-WF-003	Cross-institution service handover	Accepted transfer of responsibility
GOV-WF-004	Inter-agency task assignment	Authorized task, owner and deadline
GOV-WF-005	Inter-agency decision request	Request for a decision by the competent authority
GOV-WF-006	Inter-institution consultation request	Request for input within a defined scope
GOV-WF-007	Government directive registration	Authenticated directive and authority check
GOV-WF-008	Directive implementation response	Recorded response and outstanding actions
GOV-WF-009	Inter-agency service dependency declaration	Defined dependency and responsible parties
GOV-WF-010	Cross-institution dispute referral	Referral to an authorized resolving body
GOV-WF-011	Inter-agency agreement registration	Agreement, scope, signatories and validity
GOV-WF-012	Inter-agency agreement review	Review, amendment or termination
GOV-WF-013	Shared service onboarding	Institutional integration and acceptance
GOV-WF-014	Shared service access request	Approved service access and scope
GOV-WF-015	Cross-institution workflow exception	Authorized exception with justification and expiry
Cross-institution tasks must not silently become binding orders. Every workflow must distinguish a request, a consultation, a referral, an agreement, a directive and a legally binding decision.
2.3 Records, correspondence and digital documents
Form ID	Form or workflow	Primary outcome
GOV-REC-001	Official incoming document registration	Registered document and provenance
GOV-REC-002	Official outgoing document approval	Authorized outgoing communication
GOV-REC-003	Official document signature request	Signature workflow and verification evidence
GOV-REC-004	Digital seal application	Authorized institutional seal record
GOV-REC-005	Document authenticity verification	Verification result and source
GOV-REC-006	Document correction or reissue	Linked corrected version
GOV-REC-007	Official record classification	Classification and access policy
GOV-REC-008	Records retention schedule approval	Approved retention policy
GOV-REC-009	Records retention exception request	Authorized exception and review date
GOV-REC-010	Records archival transfer	Transfer to authorized archive
GOV-REC-011	Records disposal authorization	Authorized disposition and evidence
GOV-REC-012	Legal hold or preservation request	Preservation instruction and scope
GOV-REC-013	Public disclosure review	Release, redaction or refusal decision
GOV-REC-014	Record access request	Authorized access decision
GOV-REC-015	Record correction request	Correction assessment and linked event
GOV-REC-016	Record provenance inquiry	Source, transformation and custody history
GOV-REC-017	Records migration approval	Migration plan, validation and sign-off
GOV-REC-018	Records migration reconciliation	Discrepancies, corrective actions and closure
2.4 National statistics and official reporting
Form ID	Form or workflow	Primary outcome
GOV-STA-001	Statistical reporting programme registration	Defined programme, scope and owner
GOV-STA-002	Statistical data submission	Registered dataset and provenance
GOV-STA-003	Statistical methodology approval	Approved methodology and version
GOV-STA-004	Data quality assessment	Quality findings and remediation
GOV-STA-005	Statistical revision request	Revised dataset and publication history
GOV-STA-006	Official indicator definition	Versioned indicator methodology
GOV-STA-007	Official statistics release approval	Authorized publication decision
GOV-STA-008	Statistical disclosure review	Privacy and confidentiality assessment
GOV-STA-009	Public dataset publication request	Authorized open-data release
GOV-STA-010	Data access agreement	Approved access, purpose and restrictions
GOV-STA-011	Statistical data correction notice	Correction and revision notification
GOV-STA-012	Statistical confidentiality incident	Restricted incident and response
GOV-STA-013	National reporting return	Consolidated, validated institutional submission
GOV-STA-014	Official statistics quality declaration	Documented quality and limitations
GOV-STA-015	Statistical series discontinuation	Approved end-of-series record
Official statistics must distinguish observed, reported, estimated, modelled, provisional, revised and simulated values. National dashboards must never present fabricated values or unverified estimates as actual government results.
2.5 Government service governance and performance
Form ID	Form or workflow	Primary outcome
GOV-GOV-001	Public service catalogue registration	Approved service definition
GOV-GOV-002	Service owner assignment	Accountable institutional owner
GOV-GOV-003	Service-level objective approval	Approved service target and methodology
GOV-GOV-004	Service performance report	Validated performance measures
GOV-GOV-005	Service outage or disruption report	Incident, impact and recovery tracking
GOV-GOV-006	Service change request	Reviewed and authorized change
GOV-GOV-007	Government system integration request	Integration assessment and approval
GOV-GOV-008	New data exchange approval	Legal and technical exchange authorization
GOV-GOV-009	Data quality incident	Defect, affected records and remediation
GOV-GOV-010	Government service retirement	Authorized closure and migration plan
GOV-GOV-011	Shared platform release approval	Release decision and rollback readiness
GOV-GOV-012	Production readiness declaration	Signed readiness assessment
GOV-GOV-013	Disaster recovery exercise report	Recovery evidence and corrective actions
GOV-GOV-014	Government architecture exception	Scoped, time-limited exception
GOV-GOV-015	Service compliance review	Findings, remediation and follow-up
3. The CivicOS unified service model
The citizen portal should provide a consistent entry point to government services without creating a new centralized authority over all government records.
3.1 Citizen and business service journey
1. Discover
   
   Browse services by life event, business need, institution or service category. Show eligibility, evidence requirements, fees, deadlines and available alternatives.
2. Authenticate or choose an alternative
   
   Use the country's approved identity mechanism when necessary. Provide legally permitted alternatives for people who cannot authenticate digitally.
3. Apply
   
   Complete a versioned form, save a draft, upload evidence and review the intended submission before sending it.
4. Route
   
   Deliver the submission to the institution legally responsible for the requested service. Record the receiving institution and acknowledgement.
5. Track
   
   Display authorized status information, requests for further evidence, applicable deadlines and the next required action.
6. Receive a decision
   
   Deliver the authenticated decision, reasons where required, conditions, effective date and review rights.
7. Complete or challenge
   
   Provide the relevant payment, appointment, certificate, correction, complaint or appeal workflow.

3.2 Service catalogue contract
Every government service published in CivicOS should have a structured service definition containing:
- Stable service ID and version.
- Service name, description and owning institution.
- Legal basis and responsible authority.
- Eligible applicants and permitted representatives.
- Required forms, evidence and prerequisites.
- Processing stages and applicable deadlines.
- Fees, exemptions and approved payment methods.
- Expected outcomes and available review procedures.
- Accessibility, language and alternative submission channels.
- Privacy classification and data-sharing conditions.
- Service owner, operational contact and support arrangements.
- Publication status and last verification date.
The service directory must distinguish an active, operational service from a planned, unavailable, pilot or informational-only service. A published service description must not imply that a backend integration is operational when it has not been verified.
4. Whole-of-government workflow orchestration
4.1 Shared workflow contract
The workflow engine should coordinate tasks between institutions while keeping each institution's legal decisions under its own control.

A cross-institution workflow must define:
Field	Purpose
Workflow ID	Unique process identifier
Initiating institution	Authorized originator
Participating institutions	Explicitly authorized participants
Legal basis	Authority for the exchange and each required decision
Scope	Tasks, data and decisions included
Dependencies	Required inputs and prerequisite outcomes
Task ownership	Responsible institution and assigned office
Deadlines	Source rule, start event and applicable calendar
Handover	Sender, recipient, payload and acceptance
Exception handling	Delays, refusals, outages and unresolved disputes
Closure	Completion conditions and responsible authority
Audit	Full history of actions, transfers and decisions
4.2 Cross-institution state machine
[Diagram styling from the chat window removed here. The diagram's state names, exactly as copied:]

DraftSubmittedAuthorityCheckRejectedAcceptedInProgressAwaitingExternalDecisionInformationRequiredExceptionReviewEscalatedCompletedWithdrawn


The state machine is a shared template, not a universal legal procedure. Country-specific workflows may require additional states, and each transition must be authorized by the relevant institution.
4.3 Separation-of-powers safeguards
- A workflow request cannot override the receiving institution's legal mandate.
- An institution must be able to reject a request that lacks a valid basis or required information.
- A judicial order must be authenticated and checked for scope before being treated as binding.
- Executive workflow administrators must not assign work to an independent body in a way that overrides its lawful procedures.
- Cross-institution escalation must use the authorized relationship or dispute-resolution mechanism.
- Completion of an administrative task must not be mistaken for a legal decision by another institution.
5. National identity, authentication and representation
CivicOS should consume the nation's approved identity infrastructure rather than automatically create a competing national identity database.
5.1 Identity and access services
The shared identity layer should support:
- Authentication of citizens, residents, businesses and government personnel.
- Institutional identities and service accounts.
- Business representation and authorized agents.
- Role and delegated-authority assignments.
- Authentication assurance levels appropriate to each service.
- Session expiry, revocation and account recovery.
- Step-up authentication for sensitive actions.
- Audit of privileged operations.
- Federated identity where legally and technically approved.
5.2 Identity is not authorization
A successful identity check establishes only what the verification method is authorized to establish. It does not automatically establish citizenship, eligibility for a benefit, legal ownership, entitlement to a licence or authority to act for a company.

CivicOS must separately evaluate the relevant legal requirements and permitted evidence.
5.3 Representative authorization
The representation workflow should record:
- The person or entity granting authority.
- The representative's identity.
- The permitted actions and service scope.
- Start and expiry dates where applicable.
- Restrictions and any required supporting instrument.
- Revocation and amendment history.
- The verification method and legal basis.
A representative's authorization for one service must not automatically grant access to every record belonging to the person or business.
6. Government correspondence and digital document trust
6.1 Official document lifecycle
1. Create or receive
   
   Register the document's source, issuing institution, document type and applicable classification.
2. Validate
   
   Check required fields, provenance, attachments and any required signature or seal.
3. Review and authorize
   
   Apply the institution's approval workflow and verify the authority of the signatory.
4. Sign or seal
   
   Apply the country's approved electronic signature or seal mechanism where appropriate.
5. Deliver or publish
   
   Use an authorized channel and record the released version, recipient or publication reference and delivery status.
6. Preserve and verify
   
   Retain the document and verification evidence according to applicable rules. Support later authenticity checks.

6.2 Digital signature requirements
CivicOS must distinguish:
- The identity of the signer.
- The signer's authority to act for the institution.
- The integrity of the signed content.
- The validity of the certificate or signature mechanism.
- The legal effect of the signature under the applicable law.
- The document's current status, including supersession, revocation or correction.
A cryptographically valid signature does not, by itself, prove that the signer possessed the necessary legal authority or that the document remains in force.
6.3 Verification and public access
A document verification service should expose only the information authorized for disclosure, such as a document identifier, issuer, issue date, verification status and current validity status.

It must not expose the full underlying record, personal data or restricted attachments simply because someone possesses a verification code or link.
7. Records management, retention and archival
7.1 Records lifecycle
Every official record must have a configured lifecycle covering:
1. Creation or receipt.
2. Classification and record ownership.
3. Active use and authorized access.
4. Retention under the approved schedule.
5. Review for legal holds, appeals or investigations.
6. Archival transfer or continued retention.
7. Authorized destruction or other lawful disposition.
8. Preservation of the disposition event and required metadata.
7.2 Records retention contract
Field	Requirement
Record class	Country-configured records classification
Owning institution	Institution responsible for the official record
Retention rule	Approved rule and version
Trigger event	Event from which the retention period is calculated
Hold status	Applicable legal, audit or investigation hold
Disposition	Archive, continued retention or authorized destruction
Approval	Required record-management authorization
Evidence	Disposition certificate or archival receipt
Audit	Decision, execution and verification history
Retention must not be based solely on a generic age threshold. Different records may have different legal obligations, including permanent archival requirements.
7.3 Correction, deletion and legal holds
- Correct factual errors through an authorized, auditable process.
- Preserve original versions when required by law or records policy.
- Distinguish correction of personal data from alteration of a historical decision.
- Suspend routine disposal when a valid legal hold applies.
- Prevent ordinary users from destroying records they are not authorized to dispose of.
- Require additional approval for high-impact archival or destruction operations.
- Record when a hold begins, who authorized it, its scope and when it is released.
A tamper-evident audit trail does not mean every personal datum must be retained forever. CivicOS must balance integrity with the applicable rights, archival requirements and lawful retention limits.
8. National statistics, data quality and open data
CivicOS should enable the government to produce reliable national indicators without treating every operational record as suitable for statistical use or public release.
8.1 Statistical data lifecycle
1. Define the indicator
   
   Specify its meaning, calculation, unit, population, reporting period and responsible statistical authority.
2. Identify approved sources
   
   Register the source institution, data lineage, legal basis and authorized access method.
3. Collect and validate
   
   Apply versioned validation rules, identify missing data and distinguish errors from legitimate unusual observations.
4. Reconcile and assess quality
   
   Document discrepancies, coverage limitations, revisions and known biases.
5. Approve publication
   
   Verify the methodology, confidentiality safeguards and release authorization.
6. Publish and preserve
   
   Release the approved dataset or indicator with provenance, methodology, revision history and last-updated date.

8.2 Official indicator definition
Each indicator should contain:
- Stable indicator ID and version.
- Name, definition and intended use.
- Numerator, denominator and calculation methodology where applicable.
- Unit, population, geographic scope and reporting period.
- Source dataset references and source owners.
- Data transformation and quality rules.
- Coverage limitations and missing-data treatment.
- Publication status and release schedule.
- Responsible statistical authority.
- Revision policy and historical series relationships.
8.3 Provenance labels
Every material figure displayed in CivicOS should be identifiable as one of the following, where applicable:
- Observed: directly measured or recorded.
- Reported: submitted by an institution or respondent but not independently verified.
- Verified: checked using a documented validation process.
- Estimated: calculated to address incomplete or unavailable observations.
- Modelled: produced by a statistical or analytical model.
- Provisional: released before all required checks or revisions are complete.
- Revised: updated from a previously released figure.
- Simulated: generated for testing or training.
A verified input does not automatically make a modelled output a verified fact.
8.4 Open data release safeguards
Before publication, the release workflow must assess:
- Legal authority to disclose the dataset.
- Personal-data and confidentiality risks.
- Risks of re-identification from combining datasets.
- National security and critical infrastructure restrictions.
- Commercial confidentiality and applicable statutory exemptions.
- Dataset completeness, accuracy and limitations.
- Metadata, licensing and update commitments.
- Required aggregation, redaction or suppression.
CivicOS must not publish sensitive records simply because they are accessible to an internal government account.
9. Government analytics and performance dashboards
9.1 Dashboard governance
Every government dashboard should have a named owner, defined purpose, approved data sources, update schedule and access classification.

The dashboard registry should record:
Field	Requirement
Dashboard ID	Stable identifier
Purpose	Explicit decision or public-information use
Owner	Authorized institution and responsible office
Data sources	Approved sources and version references
Metric definitions	Versioned indicator IDs and calculation rules
Refresh policy	Schedule, trigger and last successful update
Access	Public, internal, restricted or other approved class
Limitations	Missing coverage, uncertainty and known biases
Publication	Approval, publication time and correction history
Audit	Changes to definitions, sources and permissions
9.2 Government performance measures
CivicOS may track:
- Application processing time.
- Backlog and overdue cases.
- Service availability and outage duration.
- Application completion and abandonment rates.
- Appeal and correction volumes.
- Procurement and project milestones.
- Public expenditure against approved budgets.
- Infrastructure maintenance and service restoration.
- Public complaint resolution.
- Accessibility and service-channel usage.
These measures must use consistent definitions. A low appeal rate, for example, does not automatically indicate high decision quality; it may also reflect barriers to challenging decisions.
9.3 Executive and public dashboards
Internal operational dashboards and public accountability dashboards should be separate views with their own authorization rules.
- Internal dashboards may show restricted operational details only to authorized users.
- Public dashboards should show approved, appropriately aggregated indicators.
- Independent institutions control the publication of their own records within their legal mandate.
- Every number must retain a traceable source and methodology.
- Missing or stale data must be visible.
- Modelled forecasts must not be displayed as observed outcomes.
- No dashboard should grant an officer a legal power merely because the officer can see a metric.
10. Interoperability and sovereign data exchange
10.1 Integration principles
CivicOS should use versioned interfaces and explicit data contracts rather than uncontrolled database-to-database access.

Every integration must define:
1. Source and destination institutions.
2. Legal basis and authorized purpose.
3. Data fields and record classes permitted to cross the boundary.
4. Stable identifiers and namespace ownership.
5. Schema and API versions.
6. Authentication and authorization requirements.
7. Data validation and provenance.
8. Error handling, retry and reconciliation behavior.
9. Audit, monitoring and incident responsibilities.
10. Version retirement and migration procedures.
10.2 Integration catalogue
Integration ID	Shared capability	Primary purpose
INT-GOV-001	National identity service	Approved identity verification
INT-GOV-002	Organization and business registry	Business identity and authorized representation
INT-GOV-003	Payment service	Fees, refunds and transaction reconciliation
INT-GOV-004	Digital signature and seal service	Document signing and verification
INT-GOV-005	Notification service	Authorized email, SMS, postal or in-app notices
INT-GOV-006	Official document service	Document generation, validation and retrieval
INT-GOV-007	National address service	Approved address validation
INT-GOV-008	Geospatial service	Authorized maps, boundaries and spatial references
INT-GOV-009	Records and archival service	Records preservation and disposition
INT-GOV-010	Statistical data service	Approved data submission and reporting
INT-GOV-011	External institutional API gateway	Controlled cross-institution exchange
INT-GOV-012	Government event service	Versioned, authorized event distribution
INT-GOV-013	Audit and security monitoring	Central monitoring of authorized audit metadata
INT-GOV-014	Service availability monitoring	Health checks and operational status
INT-GOV-015	Backup and recovery services	Protected backup, restoration and continuity
These are logical service categories, not claims that a particular external provider or integration is already connected.
10.3 Event-driven interoperability
Use events for meaningful state changes such as an application submission, decision issuance, permit expiry or approved record correction.

Each event should contain:
- Immutable event ID.
- Event type and schema version.
- Source institution and record identifier.
- Event timestamp and processing timestamp.
- Authorized data payload or reference.
- Correlation ID and causation reference where applicable.
- Provenance and applicable access policy.
- Delivery status and reconciliation information.
Consumers must handle duplicate delivery, delayed events, out-of-order events and replay safely. A notification event must not itself be treated as a legal decision unless the receiving workflow explicitly verifies the authoritative decision record.
10.4 Stable identifiers and data contracts
Use stable identifiers with explicit namespaces. Do not rely on names, email addresses or mutable database row positions as cross-institution identity keys.

The architecture should support:
- Versioned schemas.
- Backward-compatible changes where feasible.
- Explicit migration plans for breaking changes.
- Idempotency keys for retried requests.
- Correlation IDs across authorized workflows.
- Data minimization at every interface.
- Contract testing and integration monitoring.
- Documented deprecation and retirement of interfaces.
11. Security, privacy and AI governance
11.1 Shared access-control model
The shared platform should evaluate access using the combination of:
- Authenticated identity.
- Institution and organizational scope.
- Role and delegated authority.
- Requested action.
- Record classification.
- Purpose and legal basis.
- Applicable jurisdiction.
- Required approval or separation of duties.
Proposed permission identifiers include:
- government.service.publish
- government.application.route
- government.workflow.manage
- government.document.issue
- government.document.verify
- government.record.access
- government.record.correct
- government.record.dispose
- government.data_exchange.approve
- government.statistics.publish
- government.open_data.approve
- government.dashboard.manage
- government.integration.manage
- government.audit.read
- government.production.activate
These identifiers are technical permissions. Country configuration determines which authorized institutions and offices may exercise them.
11.2 Privacy and data minimization
- Collect only information necessary for the service's lawful purpose.
- Avoid duplicating authoritative personal records in every institution.
- Use controlled references to source records where appropriate.
- Log access to restricted records.
- Restrict secondary use and cross-institution disclosure.
- Apply appropriate retention and deletion rules.
- Support access and correction rights where applicable.
- Separate operational data from analytical datasets.
- Assess re-identification risks before public release.
- Do not allow general government analytics to become unrestricted person-level profiling.
11.3 AI assistance
AI may assist with service discovery, form guidance, document extraction, translation, workflow routing, data quality suggestions, statistical analysis and drafting.

AI must not independently:
- Issue legally consequential government decisions.
- Invent legal authority or fabricate an official record.
- Override institutional permissions or independent review.
- Change authoritative registry data without an authorized process.
- Publish unapproved statistics or confidential documents.
- Decide eligibility for a service solely through a model-generated score.
- Transfer restricted data to an unapproved external provider.
- Conceal uncertainty or present modelled data as verified fact.
Every AI feature must have a defined owner, approved data scope, output classification, evaluation method, human-review requirement and audit policy. AI deployment remains optional and must be explicitly configured for each country and service.
12. The complete CivicOS sovereign platform architecture
The 13 parts should operate as connected domains built on shared sovereign services. They should not become 13 separate platforms with incompatible identity systems, duplicated legal rules or competing sources of truth.
12.1 Reference architecture
Public and institutional access
Citizen portal · Business portal · Government workspaces · Authorized public APIs


Shared service layer
Forms · Workflow engine · Case management · Documents · Signatures · Payments · Notifications


13 government domains
1. Executive and public finance


2. Tax, audit and inspection


3. Trade and procurement


4. Civil registration and immigration


5. Justice and corrections


6. Health and social care


7. Education and research


8. Land and natural resources


9. Transport and infrastructure


10. Public safety and disaster response


11. Defence and national security


12. Legislature and democratic institutions


13. Digital government and integration


Sovereign trust and control plane
Institution registry · Legal rules · Identity and access · Audit · Classification · Data exchange · Policy configuration


Protected data and infrastructure
Authoritative registers · Document storage · Event processing · Analytics · National digital twin · Backup and recovery


This is a logical architecture. It does not require every component to run in one process, database or security domain.
12.2 The shared sovereign control plane
The control plane should manage the rules that govern how CivicOS operates:
- Institution registry and constitutional standing.
- Explicit statutory powers and delegated authority.
- Country configuration and legal rule versions.
- Roles, permissions and institutional boundaries.
- Workflow definitions and approval policies.
- Data classification and exchange authorization.
- Service registration and deployment status.
- Audit policy and security monitoring.
- Schema versions, migration approvals and platform updates.
The control plane must not be an unrestricted mechanism for changing every institution's records. Changes to its own configuration must also be authorized, versioned, reviewed and auditable.
12.3 Institution deployment roots
Each institution should have a clearly defined administrative boundary with:
- Its institutional identity and establishing authority.
- Authorized offices, roles and delegated powers.
- Its own records and service ownership.
- Applicable procedures, deadlines and retention rules.
- Approved integrations and information-sharing relationships.
- Its operational dashboards and work queues.
- Its own decision and publication responsibilities.
- Access to shared services only within authorized scope.
A ministry may administer its own records and workflows without becoming the owner of a court, legislature, independent regulator or another institution's decisions.
12.4 Authoritative data and record ownership
For every register, define one of the following explicitly:
- Authoritative: maintained by the institution legally responsible for the record.
- Replicated: a controlled copy from an authoritative source.
- Derived: calculated or transformed from approved source records.
- Reported: submitted by another institution but not independently verified.
- Modelled: generated through an analytical method.
- Simulated: created for testing or training.
Where legal authority is shared or disputed, the configuration must record the resolution rather than silently appointing a technical database as the legal authority.
13. Shared technical services and operational requirements
Service	Minimum responsibility
Form engine	Typed, versioned forms and validation
Case engine	States, transitions, assignments, deadlines and linked records
Legal rules service	Approved rules, authority checks and effective dates
Identity service	Authentication, federation and authorized representation
Authorization service	Institution, role, purpose and record-scope checks
Document service	Secure storage, rendering, signatures and verification
Payment service	Approved fees, transaction status and reconciliation
Notification service	Authorized delivery, acknowledgements and correction notices
Event service	Versioned events, retries, idempotency and reconciliation
Audit service	Attributable, tamper-evident event records
Records service	Classification, retention, legal holds and archival
Integration gateway	Validated and authorized cross-institution exchange
Geospatial service	Approved spatial references and geographic data
Analytics service	Provenance-aware statistics and dashboards
National digital twin	Authorized spatial and operational views
Security monitoring	Access monitoring, alerts and incident management
Backup and recovery	Protected backups, restoration and continuity testing
Configuration service	Country settings, institutional rules and version history
Update service	Signed releases, migration controls and rollback readiness
Technical contract requirements
- Use explicit schemas and validation at system boundaries.
- Keep secrets out of source code, logs and client-side bundles.
- Make retries safe through idempotency and reconciliation.
- Prevent a failed downstream integration from silently marking a legal process complete.
- Record both successful and failed material operations.
- Ensure background workers respect authorization, retry and cancellation rules.
- Keep service health separate from legal or operational status.
- Use a tested migration strategy for every authoritative data change.
- Ensure disaster recovery can restore data and audit relationships consistently.
- Monitor stale data and failed integrations instead of silently displaying old values as current.
14. Country onboarding and production activation
A new country should not need to redesign CivicOS from scratch. It should configure the legal, institutional, linguistic, technical and operational elements needed to activate the shared platform safely.
14.1 National onboarding workflow
1. Establish the national configuration
   
   Define the jurisdiction, constitutional structure, official languages, legal hierarchy and authorized national governance process.
2. Register institutions
   
   Record each institution's establishing law, branch, independence, authority, record ownership and lawful relationships.
3. Configure legal rules
   
   Register the applicable provisions, procedures, deadlines, fees, evidence requirements and review mechanisms.
4. Map authoritative registers
   
   Identify record owners, existing source systems, data quality, migration requirements and permitted exchanges.
5. Configure identity and trust
   
   Integrate approved identity, authentication, signing, notification and payment capabilities.
6. Activate selected services
   
   Complete technical, legal, accessibility, privacy and operational tests for each service before activation.
7. Validate and operate
   
   Run controlled acceptance testing, train users, confirm recovery procedures and monitor service performance.

14.2 Country configuration catalogue
Configuration ID	Required decision
CFG-GOV-001	Jurisdiction, official languages and national settings
CFG-GOV-002	Constitutional structure and institution registry
CFG-GOV-003	Legal hierarchy, rule versions and authority validation
CFG-GOV-004	Official identity and authentication services
CFG-GOV-005	Digital signature, seal and document verification rules
CFG-GOV-006	Official calendars, deadlines and time-zone rules
CFG-GOV-007	Government fees, payments, refunds and exemptions
CFG-GOV-008	Data classification and permitted hosting environments
CFG-GOV-009	Personal-data protection and lawful disclosure
CFG-GOV-010	Records retention, archival and destruction
CFG-GOV-011	Approved data exchange and interoperability standards
CFG-GOV-012	Official statistics and publication policy
CFG-GOV-013	Accessibility and alternative service channels
CFG-GOV-014	Incident response, backup and disaster recovery
CFG-GOV-015	AI permissions, data restrictions and human oversight
CFG-GOV-016	Public service catalogue and institutional service ownership
CFG-GOV-017	Integration and production activation approvals
CFG-GOV-018	Audit, monitoring and independent oversight arrangements
Country onboarding must support phased adoption. A nation can activate selected services while other domains remain informational, under development or disconnected—provided their status is clearly labelled.
15. Production-readiness framework for all 13 parts
CivicOS should use one common activation framework across every domain. Passing a technical test is necessary but does not, by itself, authorize a legally consequential service.
Gate 1 — Legal readiness
- [ ] The competent institution and its authority are explicitly configured.
- [ ] The applicable legal provisions and versions are confirmed.
- [ ] Required approvals, deadlines, fees, evidence and review rights are defined.
- [ ] Separation-of-powers constraints and independent oversight are enforced.
- [ ] Any unresolved legal questions block the relevant binding action.
Gate 2 — Data readiness
- [ ] Authoritative record owners are identified.
- [ ] Data sources, provenance and quality limitations are documented.
- [ ] Migrations preserve identifiers, history and required relationships.
- [ ] Sensitive data is classified and access-restricted.
- [ ] Sample data is excluded from production.
- [ ] Statistics and dashboards distinguish verified, reported, estimated and modelled values.
Gate 3 — Workflow readiness
- [ ] Every active form has a versioned schema and validation rules.
- [ ] Every material transition checks authority and prerequisites.
- [ ] Approvals, rejections, corrections and overrides are attributable.
- [ ] Required dual control prevents prohibited self-approval.
- [ ] Notifications and external integrations are verified.
- [ ] Failed tasks, retries and handovers are safely reconciled.
Gate 4 — Security and privacy readiness
- [ ] Authentication and authorization are tested.
- [ ] Cross-institution access is limited to approved purposes and data.
- [ ] Restricted reads and material changes are auditable.
- [ ] Retention, legal holds and deletion rules are enforced.
- [ ] Security incident and breach response procedures are tested.
- [ ] AI features respect approved data boundaries and prohibited-use rules.
Gate 5 — Operational readiness
- [ ] Named service owners and support responsibilities are assigned.
- [ ] Service-level objectives and monitoring are configured.
- [ ] Accessibility and localization checks pass.
- [ ] Backup restoration and disaster recovery are tested.
- [ ] Manual fallback and outage procedures are documented.
- [ ] Staff training and operating procedures are complete.
Gate 6 — Release and accountability readiness
- [ ] Institutional acceptance is recorded.
- [ ] Required independent or specialist reviews are complete.
- [ ] The release and database migration are versioned.
- [ ] Rollback and recovery procedures are verified.
- [ ] Production activation is approved by the authorized institution.
- [ ] Post-launch monitoring and corrective-action ownership are established.
16. Recommended implementation sequence
The catalogue describes the complete target capability. It should not be interpreted as a requirement to launch hundreds of forms simultaneously.

A safer implementation sequence is to establish shared foundations, prove them in a small number of end-to-end services, then expand the catalogue.
01

Foundation

Institution registry, explicit legal authority, identity and access control, form engine, case engine, audit, document service and country configuration.


02

Prove complete workflows

Select a small set of services with clear legal authority. Demonstrate application, evidence, decision, notification, appeal or correction, and record preservation end to end.


03

Expand institutional coverage

Add the remaining domain forms by reusing proven schemas, permissions, workflow patterns and shared services.


04

Connect authoritative registers

Integrate existing national and institutional systems through approved, versioned interfaces and controlled migrations.


05

Activate analytics and the national digital twin

Introduce provenance-aware indicators, approved public dashboards, spatial layers and cross-domain analysis after data quality and access controls are validated.


06

Scale under continuous assurance

Expand services through controlled releases, security monitoring, accessibility testing, audits, recovery exercises and ongoing legal review.


17. Definition of done for the complete CivicOS form system
The 13-part catalogue is complete as a target specification when it provides:
1. A stable catalogue of forms, registers, workflows and country configurations.
2. A shared typed form framework with versioned validation rules.
3. A reusable case engine with authorized transitions and review paths.
4. Explicit institutional mandates, record ownership and separation of powers.
5. A common identity, authorization, document, signature, payment and notification architecture.
6. Controlled cross-institution exchange and event-driven interoperability.
7. Authoritative register relationships and traceable data provenance.
8. Records retention, archival, disclosure and correction procedures.
9. National statistics and dashboards that distinguish facts from estimates and models.
10. A national digital twin connected to approved, provenance-labelled spatial and operational data.
11. AI governance that prevents unauthorized decisions and disclosures.
12. A country onboarding process and production activation framework.
13. Operational resilience, security, accessibility, audit and recovery requirements.
The catalogue's completion does not mean that every form has already been implemented, every national legal rule has been verified or every external system has been connected. Those are implementation and country-activation tasks.
18. Final architectural rule
CivicOS should be built as a sovereign government platform with shared infrastructure and constitutionally distinct institutions.

Every legally consequential action must have an identifiable authority. Every authoritative record must have a defined owner. Every cross-institution exchange must have an approved purpose. Every material decision must be traceable. Every public statistic must have provenance. Every independent institution must retain its lawful independence.

That is the foundation that makes CivicOS more than a collection of government dashboards: it becomes an accountable operating platform for the country's public institutions.

The 13-part catalogue is now complete.

The logical next step is to turn this specification into a single CivicOS Master Implementation Blueprint containing the consolidated form registry, shared database model, institution and permission architecture, workflow contracts, API specifications, implementation phases and acceptance tests—so development can proceed systematically without duplicating or contradicting the 13 parts.
