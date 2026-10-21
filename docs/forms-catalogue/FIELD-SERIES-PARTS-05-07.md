# CivicOS — Complete Government Form System (ChatGPT), field-contract series, parts 5, 6 and 7 of 13, kept verbatim

**Provenance.** ChatGPT's continuation of the field-contract series (parts 1–4
in `FIELD-SERIES-PARTS-01-02.md` and `FIELD-SERIES-PARTS-03-04.md`), pasted by
the owner. Part 5: justice, courts, prosecution, corrections and legal aid.
Part 6: health, public health, hospitals, medicines and social care. Part 7:
education, research, universities, skills and workforce development.

**Status.** Binding, like `docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md`. Owner's
instruction: never summarised; every item measured against the work and its
gap closed stage by stage; forms may be built to a higher standard than this
text, never lower. Each item is a row of `docs/INSTITUTIONAL_REQUIREMENTS.md`.

**Where this text meets a stricter platform rule.** Nothing below is dropped.
Items that collide with a binding rule in `CLAUDE.md` are kept as register
rows marked *Platform rule stricter* (or *Legal review (I11)*), with the
reason, so the owner sees every one:

- Part 6 clinical and patient items (patient registration, clinical records,
  individual public-health case data, prescriptions to a person) meet "no
  patient or clinical field anywhere, no national patient record". The
  administrative and aggregate parts (facility, pharmacy, professional,
  medicine and product registration, licensing, inspection, returns) are built.
- Part 7 individual student records (enrolment, attendance, transcripts held
  centrally) meet "there is no student record system". Schools, qualifications
  (recorded, corrected and revoked through cases, checked through
  `qualification.verify`) and aggregate returns are built.
- Part 5 prosecution, custody and corrections items need the judiciary's and a
  country's legal review; police stays intake and referral only, and courts'
  records are the judiciary's alone.

**How the text was kept.** Every word is here in the order delivered. Removed
only the owner's one-word "next" prompts between parts.

---

CivicOS — Complete Government Form System
Part 5 of 13 — Justice, Courts, Prosecution, Corrections and Legal Aid
This part defines the form catalogue and workflows for courts, prosecution services, judicial administration, corrections, probation, legal aid, and authorized justice-sector exchanges.

The governing principle is judicial independence by architecture, not merely by policy. Courts and other independent justice institutions must not be configured as ordinary subordinate departments of the executive. CivicOS can provide shared sovereign infrastructure while preserving each institution's lawful authority, confidential records, independent decisions, and institutional boundaries.

As with earlier parts, form identifiers are CivicOS catalogue IDs. A country must configure its laws, jurisdictions, competent authorities, procedural rules, and deadlines before activating the corresponding workflows.
1. Justice-sector institutional model
CivicOS must distinguish institutions that may share technical services but must not share unrestricted decision-making authority.
Institutional domain	Primary responsibility	Boundary
Courts and tribunals	Adjudication, judicial orders, judgments, and court administration	Executive users cannot direct judicial outcomes
Judicial administration	Court scheduling, registry operations, records, and authorized administration	Administrative powers do not confer judicial decision powers
Prosecution service	Criminal prosecution and legally authorized prosecutorial decisions	Must not be treated as a court or general police command
Public defence and legal aid	Eligibility, assignment, funding, and assistance under applicable law	Confidential legal advice is protected
Corrections and detention	Lawful custody, detention administration, rehabilitation, and release execution	Custody actions must trace to valid legal authority
Probation and community supervision	Supervision under an applicable order or legal authority	Conditions and changes must be authorized and recorded
Independent oversight	Inspection, complaints, and lawful review	Must retain its configured independence and restricted access
Police and investigative bodies	Investigation and lawful enforcement functions	Must not gain unrestricted access to judicial deliberations or protected legal advice
A single person or case may appear in multiple institutional records, but each institution must maintain its own authority, record ownership, and permitted view. Shared references do not imply shared ownership of every underlying document.
2. Courts and judicial administration
2.1 Court form catalogue
Form ID	Form or workflow	Submitted by	Main outcome
JUS-CRT-001	New case filing	Authorized party or representative	Filing received
JUS-CRT-002	Case registration	Court registry officer	Case number and jurisdiction record
JUS-CRT-003	Jurisdiction and venue review	Authorized court officer or judge	Routing or judicial determination
JUS-CRT-004	Party and representative registration	Party or authorized representative	Party record established
JUS-CRT-005	Statement of claim or initiating pleading	Authorized filer	Pleading registered
JUS-CRT-006	Defence or response filing	Responding party	Response registered
JUS-CRT-007	Motion or interlocutory application	Authorized party	Application referred for determination
JUS-CRT-008	Supporting affidavit or declaration	Authorized declarant	Evidence statement registered
JUS-CRT-009	Evidence submission	Authorized party	Evidence item registered
JUS-CRT-010	Witness list submission	Authorized party	Witness list recorded
JUS-CRT-011	Expert evidence submission	Authorized party or appointed expert	Expert evidence registered
JUS-CRT-012	Service of process record	Authorized service officer or provider	Service event recorded
JUS-CRT-013	Hearing scheduling	Authorized court staff	Hearing event scheduled
JUS-CRT-014	Hearing attendance record	Authorized court staff	Attendance and procedural events recorded
JUS-CRT-015	Hearing adjournment request	Authorized party	Request referred for decision
JUS-CRT-016	Court order preparation	Authorized judicial staff under applicable procedure	Draft order prepared
JUS-CRT-017	Judicial order authentication	Authorized judicial authority	Authenticated order recorded
JUS-CRT-018	Judgment or decision registration	Authorized court registry	Decision record published or restricted as required
JUS-CRT-019	Judgment correction request	Entitled party or authorized court official	Correction procedure initiated
JUS-CRT-020	Appeal filing	Entitled party	Appeal registered and routed
JUS-CRT-021	Court fee or fee-waiver request	Entitled applicant	Payment or waiver decision recorded
JUS-CRT-022	Certified court record request	Entitled applicant	Access and certification decision
JUS-CRT-023	Case closure or disposition record	Authorized court staff	Closure status recorded
JUS-CRT-024	Reopening or restoration request	Entitled party	Request referred for determination
These workflows should support civil, criminal, administrative, family, commercial, constitutional, and specialist courts through configured procedure types. The system must not presume that every court handles all these categories.
2.2 Court filing data contract
A court filing should contain the following logical objects:
Object	Core fields
court_case	Stable case ID, court reference, case type, jurisdiction, status
filing_record	Filing ID, document type, filer reference, submission timestamp, version
party_record	Party reference, procedural role, representation status, service details where permitted
jurisdiction_record	Applicable jurisdiction rules, venue information, review status
representation_record	Representative identity, authority document, scope, validity
evidence_record	Evidence ID, description, source, integrity information, restricted-access classification
hearing_record	Hearing type, schedule, authorized participants, attendance and outcome
order_record	Order identifier, issuing authority, legal basis, signed document reference, effective date
decision_record	Decision identifier, judicial author, disposition, publication classification, review status
service_record	Recipient, authorized method, event timestamp, delivery or attempted-service evidence
deadline_record	Trigger event, governing rule version, calculation method, due date
audit_record_ref	References to filing, access, amendment, decision, and disclosure events
CivicOS must preserve the distinction between filed, accepted for processing, admitted by a court, and decided. Receipt of a pleading must not imply that the court has accepted its legal merits.
3. Judicial independence and confidential court records
Judicial independence must be reflected in both the permission model and the technical deployment structure.
3.1 Protected judicial workflows
Form ID	Form or workflow	Required safeguard
JUS-IND-001	Judicial assignment record	Follow the lawful allocation procedure
JUS-IND-002	Judicial recusal declaration	Restricted handling and authorized reassignment
JUS-IND-003	Conflict-of-interest declaration	Access limited to entitled authorities
JUS-IND-004	Judicial case reassignment	Record authority, reason where required, and full history
JUS-IND-005	Judicial deliberation access record	Strictly restricted access and audit
JUS-IND-006	Restricted judgment or order access	Apply configured publication and disclosure rules
JUS-IND-007	Court record sealing or restriction request	Decision by the competent authority
JUS-IND-008	Sealed record access request	Entitlement, purpose, and approval checked
JUS-IND-009	Judicial administrative complaint	Route to the competent independent body
JUS-IND-010	Judicial record integrity incident	Preserve evidence and refer for authorized investigation
Architectural requirements
- Court case files must be owned by the configured court or judicial institution, not by a generic executive ministry.
- Executive administrators must not have a hidden capability to change judgments, reassign judges, or inspect protected deliberations.
- Technical platform administrators may maintain infrastructure, but their privileges must not automatically grant access to decrypted case content.
- Restricted documents need separate authorization from ordinary case metadata.
- A court order must be authenticated and verifiable against its originating authority and version.
- Changes to judicial records must be recorded as new events, with prior versions preserved according to the lawful retention regime.
- Publication of a judgment must be distinct from its internal registration; redaction and restricted-publication rules must be configurable.
- Where the law requires independent judicial review, the review must not be routed through an executive official as a substitute.
4. Criminal prosecution and prosecutorial administration
Prosecution workflows require clear boundaries between receiving a referral, reviewing evidence, making a prosecutorial decision, and obtaining a judicial order.
4.1 Prosecution form catalogue
Form ID	Form or workflow	Main outcome
JUS-PRO-001	Investigation referral receipt	Referral registered
JUS-PRO-002	Evidence package intake	Evidence inventory created
JUS-PRO-003	Prosecutorial case registration	Case assigned to authorized unit
JUS-PRO-004	Evidence review record	Review findings recorded
JUS-PRO-005	Additional evidence request	Request issued to authorized body
JUS-PRO-006	Witness or expert coordination record	Contact and procedural coordination recorded
JUS-PRO-007	Charging decision preparation	Proposed decision prepared
JUS-PRO-008	Authorized charging decision	Decision recorded by competent prosecutor
JUS-PRO-009	Decision not to prosecute	Authorized disposition and reasons where required
JUS-PRO-010	Case discontinuance or withdrawal	Legally permitted discontinuance recorded
JUS-PRO-011	Charge amendment request	Amendment reviewed and authorized
JUS-PRO-012	Court filing package	Filing submitted to the competent court
JUS-PRO-013	Disclosure and evidence-sharing record	Permitted disclosure documented
JUS-PRO-014	Prosecutorial review request	Internal or statutory review initiated
JUS-PRO-015	Prosecutorial conflict declaration	Conflict managed under applicable rules
JUS-PRO-016	Case handover record	Authorized transfer and custody confirmed
JUS-PRO-017	Prosecutorial closure record	Disposition and outstanding obligations recorded
4.2 Evidence handling
Every evidence item should have:
- A stable evidence ID.
- Its source and the person or institution that supplied it.
- The date and method of acquisition, where known.
- A cryptographic integrity reference where technically appropriate.
- Original-file preservation and a documented chain of custody.
- Classification and access restrictions.
- Disclosure and transfer history.
- Any authenticity dispute or limitation.
- Links to relevant filings and decisions.
Evidence must not be silently replaced. A corrected or supplementary item should be recorded as a new version or linked item, with the relationship made explicit.

AI may assist with indexing, transcription, translation, or identifying inconsistencies, subject to approval and validation. It must not autonomously decide guilt, credibility, whether to prosecute, or whether a person should be detained.
4.3 Prosecutorial decision safeguards
The decision record should identify:
1. The competent prosecutor and delegated authority.
2. The applicable legal provision and version.
3. The evidence considered and material limitations.
4. The decision and effective date.
5. Reasons and notification requirements where applicable.
6. Any review route and deadline that the law provides.
The platform must distinguish prosecutorial decisions from judicial decisions. A prosecutor's filing or request for a warrant is not itself a judicial warrant.
5. Police, investigative referrals, and lawful enforcement interfaces
CivicOS should integrate only the exchanges that the relevant legal framework permits. Police and investigative systems may remain separately deployed while exchanging authenticated referrals, requests, and orders.
Form ID	Form or workflow	Control
JUS-INV-001	Investigation referral	Verify sender authority and referral basis
JUS-INV-002	Evidence transfer receipt	Record custody, integrity, and recipient
JUS-INV-003	Additional investigation request	Record issuer, authority, scope, and response
JUS-INV-004	Warrant application package	Submit to the competent judicial authority
JUS-INV-005	Authenticated warrant receipt	Verify issuing authority, validity, and scope
JUS-INV-006	Warrant execution report	Record execution details and exceptions
JUS-INV-007	Search or seizure inventory	Document items, custody, and legal authority
JUS-INV-008	Seized property custody transfer	Record each transfer and recipient
JUS-INV-009	Investigation closure referral	Route disposition for the competent decision
JUS-INV-010	Lawful request for restricted court records	Apply court authorization and access controls
An investigative body must not obtain blanket access to court deliberations, sealed documents, protected legal communications, or unrelated civil records simply because it is connected to CivicOS.

The exchange engine should reject unsigned, expired, revoked, incorrectly scoped, or unverifiable judicial orders where those checks are applicable. If verification is unavailable, the action should be referred through the configured emergency or manual-verification process rather than treating the order as automatically valid.
6. Corrections, detention, custody, and release
Corrections workflows have direct consequences for liberty and safety. Every custody-related action must trace to a valid legal basis and the authority competent to issue or execute it.
6.1 Custody and detention form catalogue
Form ID	Form or workflow	Main outcome
JUS-CUS-001	Admission authorization receipt	Legal authority received and checked
JUS-CUS-002	Person admission record	Admission and identity verification recorded
JUS-CUS-003	Legal custody status review	Current authority and expiry checked
JUS-CUS-004	Custody transfer request	Transfer submitted for authorization
JUS-CUS-005	Custody transfer record	Custody handover documented
JUS-CUS-006	Detention order verification	Order authenticity and scope verified
JUS-CUS-007	Detention deadline review	Deadline calculated from configured legal rules
JUS-CUS-008	Court appearance coordination	Authorized attendance arranged
JUS-CUS-009	Legal representative access request	Access checked under applicable law
JUS-CUS-010	Family or approved visitor access request	Entitlement and permitted conditions assessed
JUS-CUS-011	Restricted custody communication request	Legal and security rules applied
JUS-CUS-012	Health referral or accommodation request	Restricted health workflow initiated
JUS-CUS-013	Custody incident report	Incident documented and referred
JUS-CUS-014	Custody status discrepancy report	Conflicting records referred urgently
JUS-CUS-015	Release authorization receipt	Competent release authority verified
JUS-CUS-016	Release eligibility review	Review of applicable order and legal conditions
JUS-CUS-017	Release execution record	Release event and time documented
JUS-CUS-018	Release handover or supervision referral	Authorized transfer to receiving service
JUS-CUS-019	Custody record correction	Controlled correction workflow
JUS-CUS-020	Detention complaint or review request	Complaint routed to the competent body
6.2 Custody authorization contract
Each custody authorization should record:
- The issuing authority and its verified identity.
- The legal instrument type and unique reference.
- The legal basis and relevant version where required.
- The person or persons to whom the instrument applies.
- The authorized action and its scope.
- Issue date, effective date, expiry or review deadline, if applicable.
- Authentication and verification results.
- Any variation, suspension, replacement, or revocation.
- The official who received and acted on the authorization.
CivicOS must not calculate a person's release date from an assumed universal rule. It must use the configured legal calculation, applicable court orders, and authorized reviews. Ambiguous or conflicting legal instruments must be referred for urgent human resolution.
6.3 Release is a separately controlled event
A release workflow must distinguish:
1. A release order being issued.
2. The order being received and authenticated.
3. The competent institution verifying that it applies to the person and current custody.
4. Any lawful conditions or outstanding checks being resolved.
5. The release being physically executed and recorded.
The system must not leave a person in custody merely because a nonessential technical integration is unavailable. Countries must configure safe escalation and manual verification for urgent release cases. Conversely, CivicOS must not execute a release based solely on an unverified message or an order that does not authorize that action.
6.4 Corrections administration and rehabilitation
Form ID	Form or workflow	Main outcome
JUS-COR-001	Individual sentence administration record	Authorized sentence details recorded
JUS-COR-002	Sentence calculation review	Calculation checked against configured law and order
JUS-COR-003	Rehabilitation plan	Individual plan prepared and approved under policy
JUS-COR-004	Education or vocational programme enrolment	Programme participation recorded
JUS-COR-005	Programme completion record	Completion evidence recorded
JUS-COR-006	Disciplinary incident report	Incident review initiated
JUS-COR-007	Disciplinary decision	Authorized outcome recorded
JUS-COR-008	Disciplinary appeal or complaint	Review initiated
JUS-COR-009	Temporary leave or external activity request	Eligibility and authorization review
JUS-COR-010	Sentence variation or remission referral	Referral to the legally competent authority
JUS-COR-011	Release preparation checklist	Administrative readiness assessed
JUS-COR-012	Post-release service referral	Consent and lawful sharing conditions checked
Rehabilitation information should not be repurposed for unrelated eligibility decisions or generalized risk scoring without a specific lawful basis. Health, counselling, legal assistance, and other specially protected records require their own access controls.
7. Probation, parole, and community supervision
These procedures must remain distinct from prison administration and court adjudication. A supervision service records and administers only the conditions it is authorized to administer.
Form ID	Form or workflow	Main outcome
JUS-SUP-001	Supervision order receipt	Order registered and verified
JUS-SUP-002	Supervision intake	Assignment and contact arrangements recorded
JUS-SUP-003	Supervision plan	Plan prepared under the governing order
JUS-SUP-004	Appointment and attendance record	Attendance recorded
JUS-SUP-005	Approved condition variation request	Request routed to competent authority
JUS-SUP-006	Compliance observation record	Factual observation documented
JUS-SUP-007	Alleged condition breach report	Allegation recorded without presuming breach
JUS-SUP-008	Breach review referral	Referred for authorized determination
JUS-SUP-009	Parole eligibility referral	Eligibility materials submitted to competent authority
JUS-SUP-010	Parole decision record	Authorized decision registered
JUS-SUP-011	Supervision transfer	Receiving authority and lawful basis verified
JUS-SUP-012	Supervision completion record	Completion determined and recorded under applicable rules
JUS-SUP-013	Supervision complaint or review	Review workflow opened
A missed appointment or unverified observation must not automatically become a legally established breach. Any adverse consequence must follow the applicable process and authority.
8. Legal aid, public defence, and access to justice
Legal aid is a distinct service domain. Its records must not expose privileged legal advice to unrelated agencies or allow funding administrators to inspect more confidential material than necessary.
8.1 Legal assistance form catalogue
Form ID	Form or workflow	Main outcome
JUS-LGL-001	Legal aid application	Application registered
JUS-LGL-002	Legal aid eligibility assessment	Eligibility assessed under configured rules
JUS-LGL-003	Financial eligibility declaration	Required financial information collected
JUS-LGL-004	Urgent legal assistance request	Priority referral under approved rules
JUS-LGL-005	Lawyer or public defender assignment	Assignment recorded
JUS-LGL-006	Conflict-of-interest check	Conflict identified and managed
JUS-LGL-007	Legal aid grant decision	Authorized grant, refusal, or other outcome
JUS-LGL-008	Legal aid reconsideration or appeal	Review initiated
JUS-LGL-009	Representation change request	Change assessed and recorded
JUS-LGL-010	Interpreter or accessibility support request	Support arranged
JUS-LGL-011	Legal aid service record	Minimum administrative service data recorded
JUS-LGL-012	Legal aid invoice or payment claim	Funding claim processed
JUS-LGL-013	Legal aid reimbursement review	Claim reviewed under funding rules
JUS-LGL-014	Legal assistance complaint	Complaint routed to competent body
JUS-LGL-015	Legal aid case closure	Administrative closure recorded
8.2 Confidentiality design
Separate the legal aid record into two access domains:
- Administrative and funding record: eligibility, assignment, authorized funding, invoices, service dates, and administrative status.
- Protected legal case material: advice, privileged communications, strategy, confidential notes, and documents protected by law.
A funding officer should not automatically have access to legal advice because they can view the associated payment claim. An audit of public spending should be possible through appropriately scoped financial evidence without indiscriminate access to privileged case content.

The legal aid service must also support urgent assistance, interpreters, disability accommodations, and offline intake where required. Applicants should receive understandable explanations of eligibility decisions and any applicable review procedure.
9. Independent complaints, inspections, and justice oversight
Complaints involving detention, court administration, prosecution conduct, legal aid, or alleged misconduct must be routed according to the competent body's mandate. A general executive complaint queue must not become the default destination for every justice-sector concern.
Form ID	Form or workflow	Main outcome
JUS-OVS-001	Justice-sector complaint intake	Complaint registered
JUS-OVS-002	Confidential complaint submission	Restricted case created
JUS-OVS-003	Jurisdiction and mandate assessment	Competent destination identified
JUS-OVS-004	Complaint acknowledgment	Receipt and reference issued
JUS-OVS-005	Additional information request	Clarification requested
JUS-OVS-006	Independent investigation referral	Authorized referral made
JUS-OVS-007	Inspection plan	Scope and authority documented
JUS-OVS-008	Inspection finding	Evidence-backed finding recorded
JUS-OVS-009	Response to inspection finding	Institution response recorded
JUS-OVS-010	Corrective action plan	Action, owner, and due date recorded
JUS-OVS-011	Corrective action verification	Completion independently checked where required
JUS-OVS-012	Complaint determination	Authorized outcome recorded
JUS-OVS-013	Complaint review request	Review initiated
JUS-OVS-014	Protected whistleblower report	Restricted intake and disclosure controls applied
JUS-OVS-015	Oversight case closure	Closure basis and notification recorded
The platform must distinguish a complaint about administrative conduct from an appeal against a judicial decision. It must not provide an oversight officer with authority to reverse a judgment unless the law expressly establishes that power.

Sensitive complaints should have configurable protections for complainant identity, witnesses, evidence, and disclosure. Any retaliation-related report must be handled through the applicable protection process rather than exposed in a routine institutional dashboard.
10. Court orders, enforcement, and cross-institution exchange
Justice-sector interoperability is particularly sensitive because one institution's action may trigger another institution's legal obligations.
10.1 Exchange catalogue
Exchange ID	Sending institution	Receiving institution	Purpose
JX-001	Court	Corrections authority	Authenticated custody or release instrument
JX-002	Court	Prosecution service	Procedural notice or authorized order
JX-003	Prosecution service	Court	Filing, application, or evidence package
JX-004	Court	Authorized enforcement body	Execution of an order within its scope
JX-005	Court	Legal aid authority	Authorized appointment or funding-related notice
JX-006	Corrections authority	Court	Custody status or court appearance coordination
JX-007	Probation service	Court	Supervision report or legally required referral
JX-008	Court	Civil registry	Authenticated civil-status order or decision
JX-009	Court	Relevant licensing or public authority	Narrowly scoped decision or order where legally authorized
JX-010	Independent oversight body	Relevant institution	Inspection finding or formal request within mandate
These exchanges are templates. Each country must explicitly authorize each relationship, define the permissible data fields, and specify whether the exchange is mandatory, optional, or prohibited.
10.2 Standard exchange envelope
type JusticeExchangeEnvelope = {
  exchangeId: string;
  contractVersion: string;
  senderInstitutionId: string;
  recipientInstitutionId: string;
  issuingAuthorityRef: string;
  caseReference: string;
  instrumentType: string;
  instrumentReference: string;
  issuedAt: string;
  effectiveAt?: string;
  expiresAt?: string;
  legalBasisRuleId: string;
  purposeCode: string;
  authorizedActionScope: string[];
  documentIntegrityRef: string;
  authenticationRef: string;
  supersedesInstrumentRef?: string;
  auditEventRef: string;
};


This envelope identifies the instrument and its authority; it does not itself prove the instrument is legally valid. The receiving institution must perform the verification required by the applicable contract and law.
10.3 Mandatory exchange controls
- Verify the sender's institutional identity and permitted authority.
- Authenticate the instrument and its integrity.
- Check expiry, revocation, supersession, and authorized scope where applicable.
- Confirm that the receiving institution is entitled to perform the requested action.
- Record receipt, verification, acceptance, rejection, and execution as separate events.
- Use idempotency controls to prevent duplicate execution.
- Provide a controlled manual fallback for urgent cases.
- Preserve evidence of the exact instrument version acted upon.
- Never treat a message from an institution as a substitute for the required legal instrument.
11. Common case engine and legal decision record
Justice workflows should use the shared CivicOS case engine while retaining domain-specific state transitions and authority checks.
11.1 Generic case lifecycle
Received

Submission, referral, or instrument received.


Registered and validated

Authority, completeness, jurisdiction, and evidence checks.


Assigned and reviewed

Authorized case owner performs the required assessment.


Decision or procedural action

Competent authority records its act under the applicable procedure.


Notification, execution, review, or closure

Track the required downstream actions without overwriting prior events.


Not every case follows this exact lifecycle. A criminal filing, a civil claim, a custody release, and a legal aid application each need their own state machine. The diagram represents reusable concepts, not a universal legal procedure.
11.2 Legally material decision contract
Each legally material decision should capture:
Field	Purpose
decisionId	Stable decision identifier
decisionType	Configured decision category
caseId	Link to the relevant case
authorityId	Institution legally competent to decide
decisionMakerRef	Authorized official or judicial officer
delegationRuleRef	Applicable delegation, if any
legalBasisRuleId	Specific provision or authorized rule
legalBasisVersion	Exact version relied upon
evidenceRefs	Material evidence considered
outcome	Controlled outcome value
reasons	Reasons or findings where required
issuedAt	Decision timestamp
effectiveAt	Effective date, if applicable
notificationRefs	Relevant notices and delivery records
reviewRightsRef	Applicable review or appeal route
signatureRef	Required signature or authentication evidence
auditEventRef	Tamper-evident audit reference
A draft, unsigned order, approved order, and executed order must remain distinct states. A signature or authentication event must not be fabricated by the application or inferred from the fact that an official clicked “save.”
12. Country configuration and institutional authority
Before activation, the country must define which justice institutions exist, their legal standing, and the precise powers they hold. CivicOS must not derive powers from names, organizational charts, or technical access.
Configuration ID	Required configuration
CFG-JUS-001	Courts, tribunals, jurisdictions, and establishing legal instruments
CFG-JUS-002	Court registry powers and administrative delegations
CFG-JUS-003	Case types, procedural rules, filing requirements, and state transitions
CFG-JUS-004	Judicial assignment, recusal, reassignment, and restricted-record rules
CFG-JUS-005	Judgment authentication, publication, redaction, and sealing rules
CFG-JUS-006	Appeal routes, deadlines, extensions, and suspensive-effect rules
CFG-PRO-001	Prosecution authority, jurisdiction, and decision powers
CFG-PRO-002	Evidence intake, disclosure, custody, and retention rules
CFG-CUS-001	Lawful detention authorities and accepted custody instruments
CFG-CUS-002	Custody review, release, transfer, and emergency escalation procedures
CFG-CUS-003	Sentence administration, probation, parole, and supervision powers
CFG-LGL-001	Legal aid eligibility, covered services, and funding rules
CFG-LGL-002	Privilege, confidentiality, and administrative-financial access boundaries
CFG-OVS-001	Independent oversight mandates, complaint routes, and inspection powers
CFG-JEX-001	Authorized justice-sector exchange relationships and contract versions
CFG-JEX-002	Instrument authentication, revocation, expiry, and supersession checks
CFG-DAT-001	Record classification, retention, disclosure, and lawful archival rules
CFG-SEC-001	Privileged access, emergency access, logging, and independent audit requirements
Each configuration record should contain a stable identifier, the source of authority, its version, effective date, approval history, and activation status. Where two-person confirmation is required, the proposer and confirmer must be distinct individuals.

Changes to procedural rules must not silently alter already-issued decisions or rewrite the historical basis on which an earlier action was taken.
13. Security and operational acceptance gates
Part 5 should not enter production until these controls have been tested.
- [ ] Separation of powers: Courts and independent justice institutions retain their configured independence and cannot be administered as subordinate executive departments.
- [ ] Authority verification: Each decision and enforcement action checks the competent institution and authorized official.
- [ ] Order integrity: Orders can be authenticated, checked for scope and status, and traced to their issuing authority.
- [ ] Custody safeguards: Detention, transfer, and release actions are traceable to the relevant legal authority, with urgent escalation for unresolved conflicts.
- [ ] Evidence integrity: Original evidence, provenance, custody transfers, and subsequent versions remain auditable.
- [ ] Judicial confidentiality: Deliberations and sealed records are protected from unauthorized administrative and technical access.
- [ ] Legal privilege: Protected legal communications are separated from ordinary administrative and funding records.
- [ ] Procedural rights: Applicable notice, hearing, review, appeal, and deadline rules are implemented for each procedure.
- [ ] No automated adjudication: AI cannot independently determine guilt, issue judicial orders, decide legal aid eligibility where a human decision is required, or make legally material adverse decisions.
- [ ] No duplicate execution: Repeated or retried messages cannot execute the same order twice.
- [ ] Audit integrity: Material access, amendments, approvals, decisions, and exchanges are recorded in a tamper-evident chain.
- [ ] Independent oversight: Complaints and inspections are routed according to legal mandate without unauthorized access to protected cases.
- [ ] Recovery testing: Backup restoration preserves case versions, signatures, legal instrument references, and audit continuity.
- [ ] Accessibility: Public forms meet WCAG 2.2 AA, support mobile and keyboard operation, and provide understandable error messages and accessible alternatives.
- [ ] Production integrity: No fabricated court cases, judgments, warrants, custody records, or sample officials appear as real production data.
14. Implementation deliverables
The engineering team should implement Part 5 through these reusable deliverables:
1. Justice institution registry — institution standing, jurisdiction, independence, authority, and record ownership.
2. Procedure registry — versioned case types, state machines, validation rules, deadlines, and permitted transitions.
3. Court filing and evidence service — controlled intake, document integrity, case references, and evidence provenance.
4. Legal decision service — authority validation, law-version references, signatures, reasons, and review pathways.
5. Judicial records access service — restricted documents, sealed records, publication classifications, and logged access.
6. Prosecution workflow — referral intake, evidence review, authorized prosecutorial decisions, and court filing.
7. Custody and release service — order verification, deadline monitoring, custody transfers, release execution, and urgent escalation.
8. Legal aid service — eligibility, representation assignment, protected communications boundaries, and funding administration.
9. Justice exchange gateway — authenticated, versioned, purpose-limited inter-institution messages with duplicate-execution protection.
10. Independent oversight workspace — complaint intake, inspection evidence, findings, corrective actions, and protected reporting.
11. Audit and recovery controls — tamper-evident event records, backup restoration tests, and independent access reviews.
12. Country activation pack — legal authority mapping, institution configuration, approved rule versions, test cases, and sign-off evidence.
Part 5 is complete as a catalogue and architecture specification. It establishes the required justice-sector workflows without assuming that a single generic legal process applies to every country.

Next: Part 6 of 13 — Health, Public Health, Hospitals, Medicines and Social Care. This will cover health administration and service workflows, public-health reporting, hospitals, medicines regulation, professional licensing, health financing, and the strict separation between clinical records and general government systems.





























CivicOS — Complete Government Form System
Part 6 of 13 — Health, Public Health, Hospitals, Medicines and Social Care
This part defines the forms, records, and workflows for health ministries, public-health authorities, hospitals, health regulators, medicines agencies, health-financing institutions, and social-care services.

The central architectural rule is clinical confidentiality by design. CivicOS may provide common identity, case management, payments, notifications, and audit infrastructure, but clinical records must remain under the control of authorized health institutions. A government-wide platform must not become a universal medical-record browser.

As in earlier parts, all form IDs below are CivicOS catalogue identifiers. Countries must configure their own laws, competent authorities, health-service structures, clinical standards, reporting obligations, and retention policies before enabling the workflows.
1. Health-sector institutional model
Institution or domain	Primary responsibility	Required boundary
Ministry of Health	Health policy, planning, and authorized administration	Policy access does not automatically confer access to identifiable clinical records
Public-health authority	Disease surveillance, prevention, and legally authorized public-health response	Collect and disclose only information authorized for the specific purpose
Hospitals and clinics	Clinical care, patient administration, and medical records	Clinical record access is role- and care-purpose-based
Health professions regulator	Registration, licensing, and professional conduct	Licensing records are separate from confidential patient records
Medicines regulator	Medicines, medical devices, safety, and market authorization	Regulatory dossiers have their own access and disclosure rules
Health-financing or insurance authority	Eligibility, claims, reimbursement, and payment	Claims access does not automatically confer access to a complete clinical file
Social-care authority	Authorized care assessments and service delivery	Share only the information necessary for the relevant social-care purpose
Independent health oversight	Inspection, complaints, and patient-rights oversight	Must preserve its statutory independence and lawful access limits
A shared patient reference does not imply that every connected institution may view the patient's full history. The system must authorize each read, document the purpose, and retain an audit record.
2. Patient registration and hospital administration
CivicOS should distinguish the administrative registration of a patient from the creation and maintenance of a clinical record. A patient may receive care before all identity or insurance details are resolved.
2.1 Patient administration form catalogue
Form ID	Form or workflow	Main outcome
HLT-PAT-001	Patient registration	Administrative patient record opened
HLT-PAT-002	Identity verification for care	Verification result recorded
HLT-PAT-003	Patient demographic correction	Controlled correction workflow
HLT-PAT-004	Patient record-link review	Potential duplicate referred for human review
HLT-PAT-005	Emergency or unidentified patient intake	Temporary record established under local rules
HLT-PAT-006	Patient representative authorization	Authority and scope recorded
HLT-PAT-007	Patient contact preference	Permitted communication channel recorded
HLT-PAT-008	Patient access request	Access entitlement and disclosure decision
HLT-PAT-009	Patient record correction request	Correction request registered
HLT-PAT-010	Patient record disclosure request	Purpose and entitlement assessed
HLT-PAT-011	Patient record transfer request	Authorized transfer initiated
HLT-PAT-012	Patient complaint or service concern	Complaint routed for review
HLT-ADM-001	Appointment request	Appointment request registered
HLT-ADM-002	Appointment scheduling	Appointment confirmed
HLT-ADM-003	Referral intake	Referral received and validated
HLT-ADM-004	Admission record	Hospital admission documented
HLT-ADM-005	Transfer between care facilities	Authorized transfer recorded
HLT-ADM-006	Discharge administration	Discharge event and instructions recorded
HLT-ADM-007	Waiting-list registration	Eligibility and queue status recorded
HLT-ADM-008	Waiting-list priority review	Authorized clinical or administrative review
HLT-ADM-009	Missed appointment record	Attendance outcome recorded without unsupported inference
HLT-ADM-010	Medical certificate request	Entitlement and issuance workflow
2.2 Patient record data contract
Object	Core fields
patient_admin_record	Internal patient reference, authorized identifiers, demographic attributes required for care
identity_verification	Source, method, timestamp, result, limitations
care_episode	Episode ID, facility, responsible care team, start and end events
appointment_record	Appointment reference, service, schedule, attendance state
referral_record	Referring provider, destination, clinical purpose, required information
admission_record	Facility, admission time, source, responsible service
discharge_record	Discharge event, destination, authorized instructions and follow-up
representative_record	Representative identity, legal authority, scope, validity, and revocation
disclosure_record	Recipient, purpose, data categories, authority, approval, and transfer reference
audit_record_ref	Record access, amendment, transfer, and disclosure events
Clinical observations, diagnoses, medications, allergies, treatment plans, and clinician notes belong in the appropriate protected clinical record—not in a general-purpose government profile.

A duplicate warning must not automatically merge patient records. Merging can incorrectly associate diagnoses, prescriptions, or test results with the wrong person. An authorized reviewer must resolve the discrepancy using documented evidence.
3. Clinical care and medical records
Clinical workflows must support the actual care process while keeping decisions with qualified professionals. CivicOS may enforce completeness, identify missing documentation, and coordinate care, but it must not replace clinical judgment.
3.1 Clinical workflow catalogue
Form ID	Form or workflow	Main outcome
HLT-CLI-001	Clinical encounter record	Encounter documented by an authorized provider
HLT-CLI-002	Clinical assessment	Assessment recorded by a qualified professional
HLT-CLI-003	Diagnosis record	Diagnosis recorded with source and author
HLT-CLI-004	Medication reconciliation	Medication information reviewed and reconciled
HLT-CLI-005	Medication order	Authorized prescription or administration order
HLT-CLI-006	Allergy and adverse reaction record	Reaction recorded and verified status maintained
HLT-CLI-007	Laboratory or diagnostic test order	Authorized test requested
HLT-CLI-008	Laboratory result record	Result received, attributed, and reviewed
HLT-CLI-009	Imaging request	Imaging procedure requested
HLT-CLI-010	Imaging report	Report recorded and attributed to its author
HLT-CLI-011	Procedure consent record	Consent or other lawful authorization documented
HLT-CLI-012	Treatment plan	Plan recorded by the responsible clinician
HLT-CLI-013	Care plan review	Review and amendment recorded
HLT-CLI-014	Specialist referral	Referral and clinical purpose recorded
HLT-CLI-015	Discharge summary	Clinical discharge summary completed
HLT-CLI-016	Follow-up care plan	Follow-up actions and responsible providers recorded
HLT-CLI-017	Clinical incident report	Incident referred through the approved safety process
HLT-CLI-018	Clinical record amendment	Correction or addendum linked to the original entry
HLT-CLI-019	Clinical second-opinion request	Request and response recorded
HLT-CLI-020	Patient clinical-record access request	Entitlement, disclosure, and applicable exceptions assessed
These workflows are catalogue entries, not a mandatory list of separate screens. For example, medication reconciliation may be a section of an encounter rather than an independent page.
3.2 Clinical record requirements
Every clinically material record should identify:
- The patient or authorized temporary patient reference.
- The care episode and encounter.
- The author, professional role, and responsible facility.
- The observation, assessment, order, result, or instruction.
- The timestamp and relevant clinical context.
- The source of externally received information.
- Whether the entry is preliminary, verified, amended, or superseded.
- Any signature or authentication required by local rules.
- The audit event associated with creation or amendment.
Corrections must not silently erase clinical history. A clinician should be able to add an amendment or correction while preserving the original entry, author, timestamps, and reason for the change.

A result received from an external laboratory must remain distinguishable from a result reviewed by a treating clinician. Receipt and clinical acknowledgment are different events.
3.3 Clinical decision support and AI
AI-assisted features may include document summarization, transcription, coding suggestions, translation, and detection of potentially missing information. Each feature requires an explicit purpose, approved data access, and a defined validation process.

The system must not:
- Autonomously diagnose a patient or prescribe medication as a substitute for required clinical judgment.
- Make an unreviewed clinical recommendation appear as a clinician-authored decision.
- Turn a probabilistic model output into a verified fact.
- Rank people for unrelated government services using their medical records.
- Expose identifiable clinical data to an AI service that is not approved for the relevant data and purpose.
Where AI is enabled, record the feature used, the output's status, the reviewing professional when required, and the final action. Country and institutional policy determines which AI functions are permitted.
4. Public health, surveillance, and outbreak response
Public-health workflows may require data from hospitals, laboratories, clinicians, and other authorized sources. They must distinguish an initial report, a suspected case, a confirmed case, a statistical aggregate, and a public-health determination.
4.1 Public-health form catalogue
Form ID	Form or workflow	Main outcome
HLT-PH-001	Notifiable condition report	Report received
HLT-PH-002	Laboratory public-health notification	Test information received under configured rules
HLT-PH-003	Case investigation record	Authorized investigation opened
HLT-PH-004	Case classification review	Classification recorded by authorized personnel
HLT-PH-005	Contact investigation record	Authorized public-health follow-up documented
HLT-PH-006	Exposure assessment	Assessment recorded under the approved protocol
HLT-PH-007	Outbreak notification	Potential outbreak referred for assessment
HLT-PH-008	Outbreak investigation	Investigation and evidence tracked
HLT-PH-009	Public-health intervention authorization	Required legal approval recorded
HLT-PH-010	Public-health intervention review	Review and continuation decision recorded
HLT-PH-011	Vaccination programme administration	Eligible programme activity recorded
HLT-PH-012	Vaccination record submission	Vaccination event recorded from an authorized source
HLT-PH-013	Adverse event following immunization report	Safety report submitted
HLT-PH-014	Public-health risk communication approval	Authorized message approved for release
HLT-PH-015	Public-health aggregate data submission	Statistical dataset submitted
HLT-PH-016	Public-health data correction	Source correction and revised version recorded
HLT-PH-017	Public-health investigation closure	Authorized closure recorded
HLT-PH-018	Public-health disclosure authorization	Data sharing assessed and approved where permitted
4.2 Public-health data contract
A public-health case may include:
Field group	Required design
Case reference	Stable identifier and source system
Reporting source	Facility or authorized reporter, with receipt time
Condition classification	Configured code set and version
Case status	Reported, suspected, probable, confirmed, ruled out, or other locally defined status
Event dates	Onset, specimen, report, and other relevant dates when available
Evidence references	Laboratory result, clinical report, or authorized source
Investigation	Assigned officer, approved protocol, findings, and outstanding actions
Intervention	Type, legal authority, approval, effective dates, and review requirements
Data provenance	Origin, transformation history, verification status, and correction links
Disclosure history	Recipient, legal purpose, data scope, and transfer reference
The case classifications shown are examples; countries must configure the categories and criteria actually used by their public-health system.
4.3 Safeguards for public-health interventions
A public-health report is not itself authority to impose a restriction, order treatment, or disclose identifiable information.

Any legally consequential intervention must be supported by the relevant law, the competent authority, the applicable evidence and procedure, and a recorded decision. Required notice, review, expiry, and reassessment rules must be configurable.

For dashboards and national digital-twin analytics:
- Prefer aggregated or de-identified data where it meets the purpose.
- Label estimates, modelled values, and incomplete reports explicitly.
- Do not interpret a missing report as proof that no case exists.
- Apply small-cell disclosure protections where necessary.
- Restrict identifiable outbreak investigation data to authorized roles.
- Preserve the original submitted report when a correction is received.
5. Medicines, medical devices, and pharmaceutical regulation
The medicines regulator needs a separate workflow from clinical prescribing and hospital pharmacy operations. Product authorization, manufacturing oversight, import authorization, safety reporting, and enforcement decisions must be managed under configured national law.
5.1 Medicines regulatory form catalogue
Form ID	Form or workflow	Main outcome
HLT-MED-001	Marketing authorization application	Product application registered
HLT-MED-002	Authorization dossier submission	Dossier version recorded
HLT-MED-003	Technical assessment record	Assessment prepared
HLT-MED-004	Additional information request	Formal request issued
HLT-MED-005	Applicant response	Response linked to the request
HLT-MED-006	Marketing authorization decision	Authorized decision recorded
HLT-MED-007	Product authorization renewal	Renewal review
HLT-MED-008	Product variation application	Variation assessment
HLT-MED-009	Product suspension or withdrawal review	Authorized review initiated
HLT-MED-010	Manufacturing site registration	Site registration workflow
HLT-MED-011	Good-practice inspection	Inspection evidence and findings recorded
HLT-MED-012	Inspection corrective action plan	Corrective action tracked
HLT-MED-013	Medicine import authorization	Import application reviewed
HLT-MED-014	Controlled medicine authorization	Special authorization under applicable law
HLT-MED-015	Medicine safety report	Safety signal received
HLT-MED-016	Adverse drug reaction report	Report recorded and assessed
HLT-MED-017	Product recall notification	Recall workflow initiated
HLT-MED-018	Recall completion report	Corrective actions and reconciliation recorded
HLT-MED-019	Medical device registration	Device application registered
HLT-MED-020	Medical device safety incident	Incident investigation initiated
HLT-MED-021	Clinical trial authorization	Authorization workflow
HLT-MED-022	Clinical trial amendment or safety update	Updated submission reviewed
HLT-MED-023	Regulatory appeal or reconsideration	Review process opened
HLT-MED-024	Regulatory product-status verification	Authorized status response
5.2 Regulatory product record
Each regulated product should have:
- A stable product identifier and configured classification.
- The applicant and responsible authorization holder.
- Product name, ingredients or components where required, and presentation.
- Manufacturing sites and relevant certificates.
- Dossier references, versions, and submission history.
- Assessment records and material evidence.
- Authorization status, scope, conditions, effective date, and expiry where applicable.
- Variations, safety notices, recalls, suspensions, and withdrawal history.
- Legal basis and decision authority.
- Public information classification and permitted disclosures.
A marketing authorization must not be inferred from a product's appearance in an import record, hospital inventory, or procurement system. Each status must derive from the competent regulator's authoritative record.
5.3 Safety and recall workflow
A safety report should trigger assessment, not an automatic finding of causation. A recall may involve several distinct events: signal receipt, risk assessment, authorized decision, public notice, supply-chain notification, and completion verification.

AI may help group duplicate reports or identify emerging patterns. It must preserve the original reports and must not independently declare a medicine unsafe or authorize a recall.
6. Health professions licensing and facility regulation
Licensing services should maintain professional and facility records without unnecessarily exposing patient information.
6.1 Professional licensing catalogue
Form ID	Form or workflow	Main outcome
HLT-LIC-001	Initial professional registration	Application registered
HLT-LIC-002	Qualification verification	Verification evidence recorded
HLT-LIC-003	Professional licence issuance	Authorized decision recorded
HLT-LIC-004	Licence renewal	Renewal review
HLT-LIC-005	Licence scope or category amendment	Amendment assessed
HLT-LIC-006	Continuing education record	Approved evidence recorded
HLT-LIC-007	Good-standing certificate request	Entitlement and issuance assessed
HLT-LIC-008	Professional conduct complaint	Complaint registered and routed
HLT-LIC-009	Professional conduct investigation	Authorized investigation opened
HLT-LIC-010	Interim restriction review	Competent authority review
HLT-LIC-011	Disciplinary decision	Authorized outcome recorded
HLT-LIC-012	Licence suspension or revocation review	Legal process initiated
HLT-LIC-013	Licence restoration request	Restoration eligibility reviewed
HLT-LIC-014	Professional register verification	Permitted status response
6.2 Health facility licensing catalogue
Form ID	Form or workflow	Main outcome
HLT-FAC-001	Facility establishment application	Application registered
HLT-FAC-002	Facility licence application	Licensing review
HLT-FAC-003	Facility inspection	Findings recorded
HLT-FAC-004	Facility corrective action plan	Actions and deadlines assigned
HLT-FAC-005	Facility licence renewal	Renewal review
HLT-FAC-006	Service or capacity variation	Variation assessment
HLT-FAC-007	Facility closure notification	Closure process initiated
HLT-FAC-008	Facility suspension or revocation review	Authorized review
HLT-FAC-009	Facility complaint or safety concern	Complaint referred
HLT-FAC-010	Facility licence verification	Status response issued
Professional or facility status should be disclosed only at the level authorized by law. A public register might show that a licence is active, while investigation details or protected personal information remain restricted.
7. Health financing, insurance, and claims
Health-financing systems need to establish eligibility, assess claims, authorize reimbursements, and detect administrative errors. These functions must not create unrestricted access to clinical records.
7.1 Health-financing form catalogue
Form ID	Form or workflow	Main outcome
HLT-FIN-001	Health coverage registration	Coverage application registered
HLT-FIN-002	Coverage eligibility assessment	Eligibility determination recorded
HLT-FIN-003	Coverage amendment	Coverage information updated under authorized rules
HLT-FIN-004	Coverage renewal	Renewal assessed
HLT-FIN-005	Provider registration for reimbursement	Provider status established
HLT-FIN-006	Healthcare service claim	Claim submitted
HLT-FIN-007	Claim evidence submission	Required evidence received
HLT-FIN-008	Claim assessment	Assessment findings recorded
HLT-FIN-009	Claim payment authorization	Authorized payment decision
HLT-FIN-010	Claim correction or resubmission	Revised claim version received
HLT-FIN-011	Claim rejection review	Review or appeal initiated
HLT-FIN-012	Patient reimbursement request	Reimbursement assessed
HLT-FIN-013	Exemption or subsidy application	Eligibility review
HLT-FIN-014	Provider payment reconciliation	Claim and payment records reconciled
HLT-FIN-015	Suspected billing irregularity referral	Review case opened
HLT-FIN-016	Health-financing audit record	Authorized audit documented
HLT-FIN-017	Payment recovery or adjustment	Lawful recovery workflow
HLT-FIN-018	Coverage or claim appeal	Appeal registered
7.2 Minimum necessary claims data
Where possible, a claim should use:
- Patient and provider references.
- Service date and permitted service code.
- Claim amount and applicable tariff reference.
- Authorization or referral reference where required.
- Minimum necessary evidence for the claim.
- Assessment outcome and reasons where required.
- Payment, adjustment, and reconciliation references.
- Appeal and audit history.
The financing authority should not receive a complete clinical narrative when a service code and limited supporting evidence are legally sufficient. If a detailed record is required for a particular review, access must be explicitly authorized, scoped, and logged.

Claims analytics may identify unusual billing patterns for human review. A model-generated flag is not proof of fraud, and it must not automatically terminate coverage, withhold legally required care, or impose a penalty.
8. Social care, disability services, and long-term care
Social-care records can include health, family, financial, and disability-related information. They require purpose-specific access rules and should not be merged into a general government risk profile.
8.1 Social-care form catalogue
Form ID	Form or workflow	Main outcome
HLT-SOC-001	Social-care service application	Application registered
HLT-SOC-002	Care needs assessment	Assessment completed by authorized personnel
HLT-SOC-003	Disability support application	Eligibility review
HLT-SOC-004	Assistive equipment request	Request and funding assessment
HLT-SOC-005	Home-care service application	Service eligibility reviewed
HLT-SOC-006	Long-term care placement application	Placement assessment
HLT-SOC-007	Individual care plan	Plan prepared and authorized
HLT-SOC-008	Care plan review	Review and amendments recorded
HLT-SOC-009	Carer or representative authorization	Authority and scope recorded
HLT-SOC-010	Safeguarding concern report	Referral to the competent safeguarding authority
HLT-SOC-011	Care service complaint	Complaint registered
HLT-SOC-012	Service-provider referral	Authorized referral made
HLT-SOC-013	Service review or reassessment	Updated assessment
HLT-SOC-014	Support or placement decision	Authorized decision recorded
HLT-SOC-015	Service decision review or appeal	Review initiated
HLT-SOC-016	Service termination or transition	Lawful transition or closure recorded
Social-care workflows must support the person's participation, accessibility needs, and lawful representation. A representative's authority must be recorded with its scope and validity; it must not be assumed to permit access to every health or social-care record.

Where safeguarding requires urgent action, the country must configure the competent authority, applicable threshold, escalation route, and review process. An automated alert alone must not be treated as a conclusive safeguarding finding.
9. Privacy, consent, and lawful health-data exchange
CivicOS must distinguish patient consent from other lawful grounds for processing. Consent is important, but it is not the only possible legal basis for care, public-health reporting, or statutory oversight. The applicable rules depend on the country and the specific purpose.
9.1 Health-data access model
Every access policy must identify:
- The institution and role permitted to access the data.
- The care, administrative, regulatory, or public-health purpose.
- The legal basis and applicable rule version.
- The minimum necessary records and fields.
- Whether the operation permits viewing, amendment, export, or onward disclosure.
- Required patient consent or other authorization, where applicable.
- Any emergency-access conditions and subsequent review.
- Retention, audit, and disclosure requirements.
Emergency access must be narrowly scoped, justified, logged, and subject to retrospective review where required. It must not become a standing permission for unrestricted access.
9.2 Cross-institution exchange catalogue
Exchange ID	Sending institution	Receiving institution	Purpose
HX-001	Hospital or clinic	Authorized receiving provider	Continuity-of-care information
HX-002	Laboratory	Treating provider	Diagnostic result delivery
HX-003	Authorized health provider	Public-health authority	Statutory notification or approved reporting
HX-004	Health regulator	Licensed provider	Regulatory notice or decision
HX-005	Medicines regulator	Authorized health institution	Safety alert or recall notice
HX-006	Provider	Health-financing authority	Minimum necessary claim evidence
HX-007	Health-financing authority	Provider	Claim status and payment response
HX-008	Health authority	Social-care authority	Authorized care referral
HX-009	Health authority	Authorized statistics service	Aggregated or appropriately protected statistics
HX-010	Independent oversight body	Health institution	Lawful inspection, investigation, or records request
Each exchange must have a versioned contract, authenticated sender and recipient, documented purpose, permitted field list, and auditable receipt. A connection between two institutions does not automatically authorize every possible data exchange between them.
10. Common health form schema
All forms should use typed schemas, explicit validation rules, provenance, and field-level classifications. A shared structure can support patient administration, clinical records, public-health cases, licensing, and claims without treating them as one unrestricted data domain.
type HealthRecordMetadata = {
  recordId: string;
  recordType: string;
  schemaVersion: string;
  sourceInstitutionId: string;
  responsibleAuthorityId: string;
  createdAt: string;
  effectiveAt?: string;
  provenanceRef: string;
  legalBasisRuleId?: string;
  dataClassification:
    | "internal"
    | "confidential"
    | "restricted";
  retentionRuleId: string;
  auditEventRef: string;
};

type HealthAccessRequest = {
  requesterInstitutionId: string;
  requesterRoleId: string;
  purposeCode: string;
  legalBasisRuleId: string;
  requestedDataCategories: string[];
  patientReference?: string;
  careEpisodeReference?: string;
  consentReference?: string;
  authorizationReference?: string;
};


This is an illustrative starting contract. A production implementation must also define schema validation, identity-link resolution, access-policy enforcement, record retention, jurisdiction-specific legal rules, and secure data-transfer requirements.
Required validation categories
Category	Example	Expected behavior
Identity	Conflicting patient identifiers	Refer for authorized reconciliation
Clinical provenance	Missing author or source	Mark incomplete; prevent inappropriate reliance
Consent or authorization	Missing required authorization	Block the affected operation or route for review
Regulatory authority	Expired or invalid licence	Apply the configured rule and review path
Claims	Invalid service code or duplicate submission	Flag for correction or authorized review
Public health	Unverified report or incomplete case data	Preserve the source status and uncertainty
Privacy	Request exceeds permitted data scope	Deny or narrow access and log the event
Retention	Record reaches configured retention milestone	Apply the approved retention workflow
11. Country configuration and legal rule registry
The following configuration entries must be resolved before the relevant workflows are activated.
Configuration ID	Required decision
CFG-HLT-001	Health institutions, jurisdictions, and record ownership
CFG-HLT-002	Patient registration and identity-verification rules
CFG-HLT-003	Clinical record structure, signatures, and amendment procedures
CFG-HLT-004	Clinical access, disclosure, and emergency-access policies
CFG-PH-001	Notifiable conditions, reporting deadlines, and authorized sources
CFG-PH-002	Public-health case definitions and classification versions
CFG-PH-003	Intervention authority, review, and expiry requirements
CFG-MED-001	Medicines and medical-device classifications
CFG-MED-002	Marketing authorization and product variation procedures
CFG-MED-003	Inspection, safety reporting, and recall authority
CFG-LIC-001	Professional categories, qualifications, and licensing powers
CFG-LIC-002	Facility licensing, inspection, and enforcement procedures
CFG-FIN-001	Health coverage eligibility and financing rules
CFG-FIN-002	Claims, tariffs, exemptions, and payment procedures
CFG-SOC-001	Social-care eligibility, assessment, and service rules
CFG-DAT-001	Health-data classification, retention, and disclosure requirements
CFG-HX-001	Authorized health-sector exchange relationships
CFG-AI-001	Approved AI functions, data access, review, and validation requirements
Every active rule must reference its legal or formally approved source, version, effective date, and approval history. Material configuration changes must follow the required two-person confirmation process.
12. Implementation acceptance gates
- [ ] Clinical confidentiality: Clinical records cannot be accessed merely because a user belongs to a government institution.
- [ ] Purpose-bound access: Every restricted-data read has an authorized purpose and audit record.
- [ ] Record integrity: Clinical corrections preserve the original entry and link amendments to it.
- [ ] Patient identity safety: Potential duplicate records are resolved through controlled human review.
- [ ] Clinical authority: AI cannot silently replace required professional judgment or make unauthorized treatment decisions.
- [ ] Public-health integrity: Reported, suspected, confirmed, and modelled information remain distinguishable.
- [ ] Regulatory integrity: Product and professional status comes from the competent authority's authoritative record.
- [ ] Financing boundaries: Claims processing does not grant unrestricted clinical-record access.
- [ ] Social-care safeguards: Sensitive assessments and representative access follow configured legal permissions.
- [ ] Interoperability: Every cross-institution exchange has a versioned contract and explicit authority.
- [ ] Accessibility: Forms meet WCAG 2.2 AA, support mobile and keyboard use, and provide accessible alternatives.
- [ ] Production integrity: No fabricated patient records, clinical results, licences, or public-health statistics are presented as real.
- [ ] Recovery: Backup restoration preserves record versions, provenance, access logs, and audit continuity.
13. Engineering deliverables
The implementation team should build the following reusable capabilities:
1. Patient administration service — registration, identity reconciliation, appointments, admissions, transfers, and discharge administration.
2. Protected clinical record service — encounter records, results, medication records, referrals, and clinical amendments.
3. Public-health reporting service — notification intake, case investigation, classifications, outbreak workflows, and protected statistics.
4. Medicines and devices regulatory service — applications, assessments, authorizations, inspections, safety reporting, and recalls.
5. Health-professions and facility registry — licensing, renewals, inspections, complaints, and authorized status verification.
6. Health-financing service — coverage, claims, reimbursement, payment reconciliation, and review procedures.
7. Social-care service — eligibility, assessments, care plans, referrals, and appeals.
8. Health access-control service — purpose-based permissions, emergency access, consent or authorization references, and disclosure audit.
9. Health exchange gateway — authenticated, versioned, minimum-necessary data exchanges.
10. Health audit and recovery service — tamper-evident records, access reviews, retention controls, and tested recovery.
Part 6 is complete as a catalogue and architecture specification.

Next: Part 7 of 13 — Education, Research, Universities, Skills and Workforce Development. This will cover student registration, schools, examinations, qualifications, universities, research funding, accreditation, vocational training, and education-sector data exchanges, while protecting student records and institutional independence.





























CivicOS — Complete Government Form System
Part 7 of 13 — Education, Research, Universities, Skills and Workforce Development
This part defines the forms and workflows for early childhood education, schools, examinations, universities, research institutions, vocational training, qualifications, accreditation, scholarships, and workforce development.

The governing principle is education records must serve education, not become a general-purpose government surveillance profile. CivicOS can provide shared infrastructure for applications, payments, credentials, notifications, and audit, while preserving student privacy, academic independence, research confidentiality, and the lawful autonomy of education institutions.

All identifiers below are CivicOS catalogue IDs. The relevant country must configure its education laws, institutional powers, examination rules, qualification frameworks, and data-protection requirements before enabling each workflow.
1. Education-sector institutional model
Institution or domain	Primary responsibility	Required boundary
Ministry of Education	National policy, planning, and authorized administration	Policy access does not grant unrestricted access to student records
Early childhood and school authorities	School administration, enrolment, attendance, and student support	Child records receive enhanced protection
Examination and assessment authority	Examination administration and official results	Result changes require controlled authorization and audit
Universities and colleges	Admissions, academic records, research, and institutional governance	Academic decisions remain with the competent institution
Accreditation and quality authority	Programme and institutional accreditation	Accreditation decisions follow their own review procedures
Qualifications authority	Qualification frameworks, equivalence, and recognition	Recognition must use verified evidence and configured rules
Vocational training authority	Apprenticeships, skills assessment, and certification	Employer access is limited to the relevant training relationship
Scholarship and student-financing authority	Funding eligibility, grants, loans, and disbursement	Financial records do not grant access to all academic records
Research funding authority	Grant administration and research oversight	Confidential proposals and research data remain protected
Independent research and education oversight	Inspection, complaints, and lawful review	Must preserve statutory independence and confidentiality
CivicOS must distinguish an institution's legal standing, its administrative role, and its authority to decide. A university must not be treated as a subordinate ministry department merely because it receives public funding.
2. Early childhood education and school administration
2.1 School form catalogue
Form ID	Form or workflow	Submitted by	Main outcome
EDU-SCH-001	School establishment application	Authorized institution or sponsor	Establishment review
EDU-SCH-002	School registration	Authorized school representative	School record created
EDU-SCH-003	School licence or approval application	School operator	Approval workflow
EDU-SCH-004	School licence renewal	School operator	Renewal review
EDU-SCH-005	School inspection record	Authorized inspector	Findings recorded
EDU-SCH-006	School corrective action plan	School operator	Actions and deadlines assigned
EDU-SCH-007	School closure or suspension request	Authorized operator or authority	Closure or suspension review
EDU-SCH-008	School profile amendment	Authorized representative	Controlled profile update
EDU-STU-001	Student enrolment application	Parent, guardian, or eligible student	Application registered
EDU-STU-002	Student registration	Authorized school officer	Student record established
EDU-STU-003	School transfer request	Parent, guardian, or eligible student	Transfer workflow
EDU-STU-004	Transfer and records handover	Authorized school officers	Controlled record transfer
EDU-STU-005	Student withdrawal or departure	Authorized applicant or school	Departure recorded
EDU-STU-006	Attendance record	Authorized school staff	Attendance event recorded
EDU-STU-007	Absence explanation	Parent, guardian, or eligible student	Explanation registered
EDU-STU-008	Student particulars correction	Entitled applicant	Correction review
EDU-STU-009	Guardian or representative authorization	Entitled applicant	Authority and scope recorded
EDU-STU-010	Student record access request	Student or entitled representative	Access decision
EDU-STU-011	Student record disclosure request	Authorized requester	Purpose and entitlement assessed
EDU-STU-012	Student support referral	Authorized education professional	Referral opened
EDU-STU-013	Student safeguarding concern	Authorized reporter	Restricted referral
EDU-STU-014	Student complaint or grievance	Eligible student or representative	Complaint routed
EDU-STU-015	Student progression or completion record	Authorized institution	Progression or completion recorded
The system must support different enrolment rules for public, private, faith-based, specialist, and other legally recognized school types without assuming identical admission criteria.
2.2 Student record data contract
Object	Core fields
student_record	Stable student reference, institution, programme or grade, enrolment status
enrolment_application	Applicant, requested institution, submission date, required evidence
guardian_relationship	Representative reference, relationship type where required, authority scope, validity
attendance_event	Date, status, source, author, correction history
transfer_record	Sending and receiving institutions, authorization, effective date
student_support_record	Purpose, authorized participants, access classification, review dates
academic_record_ref	References to protected grades, assessments, and qualifications
disclosure_record	Recipient, lawful purpose, permitted fields, authorization
audit_event_ref	Record creation, access, amendment, and transfer events
Student support, disability accommodation, safeguarding, and counselling records must have stricter access controls than ordinary enrolment data. They must not be automatically visible to every teacher, school administrator, parent, or government analyst.
2.3 Children and guardian access
For records involving children, CivicOS must enforce country-configured rules for guardianship, consent, student rights, and authorized disclosure. It must not assume that a person claiming to be a parent automatically has unrestricted access to every record.

Where a safeguarding concern or court order changes access permissions, the system should apply the authorized restriction without deleting the historical record. Emergency safeguarding workflows must route to the legally competent service and preserve the relevant audit trail.
3. Examinations, assessments, and official results
Examination administration requires a clear distinction between registering a candidate, administering an assessment, marking work, approving results, publishing results, and issuing a certificate.
3.1 Examination form catalogue
Form ID	Form or workflow	Main outcome
EDU-EXM-001	Examination session setup	Session configured and approved
EDU-EXM-002	Candidate registration	Candidate registered
EDU-EXM-003	Examination eligibility review	Eligibility determined under configured rules
EDU-EXM-004	Examination accommodation request	Accommodation assessed and authorized
EDU-EXM-005	Examination centre registration	Centre approved or referred
EDU-EXM-006	Examination centre inspection	Findings recorded
EDU-EXM-007	Candidate attendance record	Attendance recorded
EDU-EXM-008	Examination incident report	Incident documented and referred
EDU-EXM-009	Assessment submission receipt	Submitted work registered
EDU-EXM-010	Marking record	Assessment marked by an authorized assessor
EDU-EXM-011	Moderation record	Marks or assessment standards reviewed
EDU-EXM-012	Results approval	Authorized approval recorded
EDU-EXM-013	Results publication	Approved results released through authorized channels
EDU-EXM-014	Results correction request	Correction case opened
EDU-EXM-015	Examination appeal	Appeal registered
EDU-EXM-016	Examination malpractice allegation	Restricted investigation opened
EDU-EXM-017	Examination misconduct determination	Authorized finding recorded
EDU-EXM-018	Examination resit application	Eligibility and scheduling reviewed
EDU-EXM-019	Examination cancellation or rescheduling	Authorized session change recorded
EDU-EXM-020	Examination record archival	Retention and archival workflow executed
3.2 Results integrity
Official results must have a versioned record of:
- Candidate reference and examination session.
- Subject, course, or assessment identifier.
- Mark, grade, or outcome under the configured grading scheme.
- Assessor and moderation references where applicable.
- Approval authority and timestamp.
- Publication status and release timestamp.
- Any correction, appeal, reassessment, or superseding result.
- The applicable assessment rules and version.
A mark entered by an assessor is not necessarily an approved result. Results must not become official until the required approval steps have been completed.

Changes to published results must create a new linked event. The system must preserve the earlier version, identify who authorized the change, and follow the rules governing notification and appeal.

AI may assist with administrative anomaly detection or marking support where expressly permitted, but its output must not silently replace the authorized assessment process. High-stakes examinations require the validation, human review, and appeal mechanisms specified by the responsible authority.
4. Qualifications, certificates, and credential verification
CivicOS should provide a reliable way to issue, validate, replace, and verify educational credentials without disclosing the holder's entire academic history.
4.1 Credential form catalogue
Form ID	Form or workflow	Main outcome
EDU-CRE-001	Qualification award record	Authorized qualification recorded
EDU-CRE-002	Certificate issuance	Certificate issued
EDU-CRE-003	Certificate replacement request	Replacement assessed
EDU-CRE-004	Lost certificate declaration	Loss report recorded
EDU-CRE-005	Qualification verification request	Verification request assessed
EDU-CRE-006	Qualification verification response	Authorized status response issued
EDU-CRE-007	Qualification correction request	Correction reviewed
EDU-CRE-008	Qualification revocation or invalidation review	Competent authority review
EDU-CRE-009	Foreign qualification recognition application	Recognition case opened
EDU-CRE-010	Qualification equivalence assessment	Assessment recorded
EDU-CRE-011	Credit transfer application	Credits assessed for transfer
EDU-CRE-012	Prior learning recognition application	Evidence-based assessment
EDU-CRE-013	Qualification appeal	Review process opened
EDU-CRE-014	Credential status correction	Status discrepancy reviewed
4.2 Credential record contract
Each credential should identify:
- A stable credential ID.
- The issuing institution and its authority to issue the qualification.
- The holder reference and minimum required identity attributes.
- The qualification name, level, subject or field, and award date.
- The applicable qualification framework and version, where used.
- The award decision and approval reference.
- The certificate identifier and verification method.
- Any correction, replacement, revocation, or superseding credential.
- The authorized public or restricted verification fields.
A verification service should return only the information necessary to answer the request. A basic verification might confirm that a credential is valid and was issued by a particular institution, without revealing grades, addresses, dates of birth, or unrelated qualifications.

A credential's authenticity and its equivalence are different questions. Verification establishes whether a credential matches an authoritative record; recognition or equivalence requires the applicable assessment by the competent authority.
5. Universities, colleges, and higher education
Higher education institutions require workflows for admissions, enrolment, programmes, academic progression, graduation, and institutional governance. CivicOS must support institutional autonomy where provided by law.
5.1 Higher education form catalogue
Form ID	Form or workflow	Main outcome
EDU-UNI-001	Higher education institution registration	Institution record established
EDU-UNI-002	Programme approval application	Programme review initiated
EDU-UNI-003	Programme amendment or renewal	Change reviewed
EDU-UNI-004	Student admission application	Application registered
EDU-UNI-005	Admission eligibility assessment	Assessment recorded
EDU-UNI-006	Admission decision	Authorized decision recorded
EDU-UNI-007	Student matriculation	Enrolment formally established
EDU-UNI-008	Course or module registration	Course registration recorded
EDU-UNI-009	Academic progression review	Progression decision recorded
EDU-UNI-010	Leave of absence request	Request assessed
EDU-UNI-011	Programme transfer request	Transfer assessed
EDU-UNI-012	Academic transcript request	Entitlement and issuance assessed
EDU-UNI-013	Graduation eligibility review	Eligibility assessed
EDU-UNI-014	Graduation and award approval	Authorized award decision recorded
EDU-UNI-015	Academic appeal	Appeal registered
EDU-UNI-016	Academic misconduct allegation	Restricted case opened
EDU-UNI-017	Academic misconduct determination	Authorized decision recorded
EDU-UNI-018	Student fee assessment	Fees calculated from approved rules
EDU-UNI-019	Fee waiver or hardship request	Application reviewed
EDU-UNI-020	Research student registration	Research enrolment recorded
EDU-UNI-021	Thesis submission	Submission version registered
EDU-UNI-022	Thesis examination or defence	Examination outcome recorded
EDU-UNI-023	Academic record correction	Controlled correction workflow
EDU-UNI-024	Student complaint or grievance	Complaint routed for review
Academic decisions must follow the institution's lawful rules and governance arrangements. The ministry's ability to view aggregate enrolment or completion statistics does not automatically authorize it to overturn an admission, grade, thesis examination, or graduation decision.
5.2 Academic record safeguards
- Separate student administration from restricted academic or disciplinary records.
- Keep research-supervision notes and protected communications access-limited.
- Preserve the source and version of transcripts and degree awards.
- Distinguish an application received from an admission decision.
- Record academic appeals as separate cases with their own deadlines and outcomes.
- Apply configured rules for student access, correction, and disclosure.
- Provide a documented process for handling disputed credentials and historical records.
6. Accreditation, quality assurance, and institutional oversight
Accreditation and quality assurance should be governed by transparent criteria, documented evidence, authorized decisions, and review mechanisms.
Form ID	Form or workflow	Main outcome
EDU-ACC-001	Institution accreditation application	Application registered
EDU-ACC-002	Programme accreditation application	Programme review opened
EDU-ACC-003	Accreditation evidence submission	Evidence package recorded
EDU-ACC-004	Accreditation assessment	Assessment findings recorded
EDU-ACC-005	External review or site visit	Review documented
EDU-ACC-006	Accreditation decision	Authorized decision recorded
EDU-ACC-007	Accreditation renewal	Renewal review
EDU-ACC-008	Accreditation condition monitoring	Conditions and evidence tracked
EDU-ACC-009	Corrective action plan	Actions and deadlines recorded
EDU-ACC-010	Corrective action verification	Completion assessed
EDU-ACC-011	Accreditation variation request	Variation reviewed
EDU-ACC-012	Accreditation suspension or withdrawal review	Authorized review
EDU-ACC-013	Accreditation appeal	Appeal registered
EDU-ACC-014	Accreditation status verification	Authorized public or restricted response
The system must distinguish the inspection report, assessor recommendation, committee decision, and final accreditation status. It must not automatically suspend a programme merely because an inspection is overdue or a document is missing unless an approved legal rule expressly provides that consequence.
7. Vocational education, apprenticeships, and skills certification
Vocational education connects learners, training institutions, employers, assessors, and qualification authorities. Each relationship should be recorded without giving employers unrestricted access to learner records.
7.1 Vocational and skills form catalogue
Form ID	Form or workflow	Main outcome
EDU-VOC-001	Vocational training provider registration	Provider registered
EDU-VOC-002	Training programme approval	Programme reviewed
EDU-VOC-003	Learner enrolment	Learner registered
EDU-VOC-004	Apprenticeship application	Application registered
EDU-VOC-005	Apprenticeship agreement	Authorized agreement recorded
EDU-VOC-006	Employer or training-site approval	Site assessed
EDU-VOC-007	Workplace training record	Training activity documented
EDU-VOC-008	Competency assessment	Assessment recorded by authorized assessor
EDU-VOC-009	Practical examination	Examination outcome recorded
EDU-VOC-010	Skills certificate issuance	Certificate issued
EDU-VOC-011	Prior learning assessment	Evidence reviewed
EDU-VOC-012	Training completion record	Completion recorded
EDU-VOC-013	Apprenticeship amendment or termination	Change assessed and recorded
EDU-VOC-014	Training provider inspection	Findings recorded
EDU-VOC-015	Training provider corrective action	Corrective action tracked
EDU-VOC-016	Skills assessment appeal	Appeal initiated
EDU-VOC-017	Qualification verification	Authorized status response
EDU-VOC-018	Training placement or employer referral	Authorized referral made
7.2 Skills and workforce data boundaries
CivicOS may support aggregate reporting on:
- Enrolment and completion by approved programme categories.
- Apprenticeship participation and completion.
- Skills assessments and qualification awards.
- Provider accreditation and training capacity.
- Funding utilization and programme outcomes.
It must not automatically infer a person's employability, competence, or entitlement to work from incomplete training records. Employers should receive only the qualification, competency, or placement information that the learner has authorized or the law permits them to receive.
8. Scholarships, student finance, and education grants
Funding workflows should use approved eligibility rules, transparent decisions, and traceable payments. Academic records may be required to establish eligibility, but finance officers should not receive full academic or safeguarding files by default.
8.1 Student finance form catalogue
Form ID	Form or workflow	Main outcome
EDU-FIN-001	Scholarship application	Application registered
EDU-FIN-002	Scholarship eligibility assessment	Eligibility assessed
EDU-FIN-003	Scholarship award decision	Authorized decision recorded
EDU-FIN-004	Scholarship renewal	Renewal assessed
EDU-FIN-005	Student grant application	Grant application registered
EDU-FIN-006	Student loan application	Loan application registered
EDU-FIN-007	Financial eligibility assessment	Financial evidence reviewed
EDU-FIN-008	Education funding payment authorization	Authorized payment approved
EDU-FIN-009	Disbursement and reconciliation	Payment tracked and reconciled
EDU-FIN-010	Change of study status notification	Funding impact assessed
EDU-FIN-011	Funding suspension or recovery review	Authorized review
EDU-FIN-012	Student hardship application	Support eligibility assessed
EDU-FIN-013	Scholarship or grant appeal	Appeal registered
EDU-FIN-014	Institutional funding application	Funding proposal submitted
EDU-FIN-015	Education grant expenditure report	Expenditure evidence recorded
EDU-FIN-016	Grant variation request	Variation assessed
EDU-FIN-017	Grant audit and closure	Authorized reconciliation and closure
8.2 Funding decision safeguards
Every award or refusal should identify the applicable funding scheme, eligibility criteria, rule version, evidence relied upon, authorized decision-maker, outcome, and review route where applicable.

If a student's enrolment status cannot be verified, the system should record the uncertainty and follow the approved process. It must not invent an enrolment status or automatically impose recovery without the required review.

Payments must link to approved award records and reconciled transactions. Production dashboards must use actual connected records or clearly disclose when a dataset is unavailable.
9. Research administration, grants, and research ethics
Research workflows need to protect unpublished work, commercially sensitive information, participant confidentiality, and institutional independence. Research administration must remain separate from clinical care and general government reporting, even when research uses health or other sensitive data.
9.1 Research and funding form catalogue
Form ID	Form or workflow	Main outcome
EDU-RES-001	Research project registration	Project record opened
EDU-RES-002	Research grant application	Proposal submitted
EDU-RES-003	Grant eligibility and assessment	Assessment recorded
EDU-RES-004	Research grant decision	Authorized award decision
EDU-RES-005	Grant agreement	Agreement version recorded
EDU-RES-006	Grant milestone report	Progress evidence submitted
EDU-RES-007	Research expenditure report	Expenditure recorded
EDU-RES-008	Budget variation request	Variation assessed
EDU-RES-009	Research ethics review application	Review initiated
EDU-RES-010	Ethics committee decision	Authorized decision recorded
EDU-RES-011	Ethics amendment request	Amendment reviewed
EDU-RES-012	Research participant information and consent record	Applicable authorization documented
EDU-RES-013	Research data access request	Purpose and authorization assessed
EDU-RES-014	Research data sharing agreement	Approved terms recorded
EDU-RES-015	Research incident or protocol deviation	Incident referred for review
EDU-RES-016	Research project extension request	Extension assessed
EDU-RES-017	Research project completion report	Results and deliverables recorded
EDU-RES-018	Grant audit or closure	Financial and administrative closure
EDU-RES-019	Research misconduct allegation	Restricted review opened
EDU-RES-020	Research misconduct determination	Authorized finding recorded
EDU-RES-021	Research record correction	Versioned correction recorded
EDU-RES-022	Research publication or output record	Output registered
9.2 Research data safeguards
The research record should distinguish:
- The proposal and its versions.
- The award decision and funding agreement.
- Ethics approvals and amendments.
- Research participant information and applicable consent or other authorization.
- The research dataset and its source.
- Access approvals and data-sharing agreements.
- Publications, deliverables, and financial reporting.
- Incidents, deviations, investigations, and closure decisions.
The grant administrator should not automatically have access to identifiable research participants. A research ethics committee's decision should not be substituted by a general software validation rule.

For research using sensitive or clinical data, the platform must enforce the separate legal basis, data-access approvals, retention rules, and disclosure conditions that apply to that dataset.
10. Research and education data exchanges
Cross-institution exchanges should support legitimate educational mobility, qualification verification, research collaboration, and funding administration without creating a central unrestricted student dossier.
Exchange ID	Sending institution	Receiving institution	Purpose
EX-EDU-001	School	Authorized examination authority	Candidate registration and required examination data
EX-EDU-002	Examination authority	School or entitled learner	Approved results and status
EX-EDU-003	Education institution	Qualifications authority	Award record or verification request
EX-EDU-004	Qualifications authority	Employer or licensing authority	Minimum necessary qualification verification
EX-EDU-005	Vocational provider	Qualifications authority	Approved competency or certificate record
EX-EDU-006	Higher education institution	Student-financing authority	Minimum necessary enrolment verification
EX-EDU-007	Grant authority	Research institution	Award, milestone, and funding status
EX-EDU-008	Research institution	Authorized ethics committee	Protocol submission and review status
EX-EDU-009	Accreditation authority	Education institution	Accreditation decision and conditions
EX-EDU-010	Education authority	National statistics service	Aggregated education statistics
Every exchange must define the sender, recipient, purpose, legal basis, data scope, contract version, and audit requirements. A connected employer, scholarship provider, or research funder must not gain general access to the learner's full educational history.
11. Shared education form schema
CivicOS should use common schema infrastructure while keeping student administration, protected support records, examination results, qualifications, and research records in separate access domains.

A representative form-field contract:
type EducationFieldDefinition = {
  id: string;
  type:
    | "string"
    | "date"
    | "enum"
    | "boolean"
    | "institution_reference"
    | "student_reference"
    | "credential_reference"
    | "document_reference";
  required: boolean;
  labelKey: string;
  hintKey?: string;
  errorKey?: string;
  validationRuleIds: string[];
  valueSource:
    | "applicant"
    | "authorized_officer"
    | "verified_source"
    | "system";
  dataClassification:
    | "public"
    | "internal"
    | "confidential"
    | "restricted";
  legalBasisRuleId?: string;
  evidenceRequirementIds?: string[];
};


A production schema must additionally define the country-specific rules, authorized record owners, retention periods, permitted disclosures, localization, accessibility labels, and version migration behavior.
Common validation categories
Category	Example	Failure behavior
Identity	Student or applicant identity mismatch	Route for authorized verification
Eligibility	Missing admission requirement	Apply the configured review procedure
Evidence	Unverified certificate	Mark as unverified and request appropriate review
Assessment	Missing required moderation	Prevent finalization where required
Award authority	Issuer lacks configured award authority	Block issuance or route for review
Funding	Conflicting enrolment or payment records	Flag for reconciliation
Privacy	Request exceeds the permitted scope	Deny or narrow access and record the event
Deadline	Appeal or renewal deadline	Calculate under the configured rule and calendar
12. Country configuration and legal rule registry
Before enabling any workflow, the country must configure the applicable institutions, laws, rules, and decision authorities.
Configuration ID	Required decision
CFG-EDU-001	Education institutions, jurisdictions, and record ownership
CFG-EDU-002	School establishment, registration, and inspection rules
CFG-EDU-003	Enrolment, transfer, attendance, and student representation rules
CFG-EDU-004	Student safeguarding, support-record access, and disclosure rules
CFG-EXM-001	Examination sessions, eligibility, grading, and moderation
CFG-EXM-002	Results approval, publication, correction, and appeals
CFG-CRE-001	Qualification framework, award authority, and credential format
CFG-CRE-002	Credential verification, replacement, correction, and recognition
CFG-UNI-001	Higher education governance, admission, and academic decision powers
CFG-UNI-002	Academic appeals, disciplinary procedures, and records retention
CFG-ACC-001	Accreditation criteria, assessment, decisions, and review
CFG-VOC-001	Vocational provider registration and competency standards
CFG-FIN-001	Scholarships, grants, loans, eligibility, and disbursement rules
CFG-RES-001	Research funding, milestones, expenditure, and closure
CFG-RES-002	Research ethics, participant authorization, and data-sharing rules
CFG-DAT-001	Student, child, academic, financial, and research data classifications
CFG-EX-001	Authorized education-sector exchanges and contract versions
Each rule must have a stable identifier, source of authority, version, effective date, approval history, and activation state. Material changes must follow the required two-person confirmation process and preserve the prior rule version.
13. Implementation acceptance gates
Part 7 should not enter production until the following checks pass.
- [ ] Student privacy: Student records are visible only to authorized roles and purposes.
- [ ] Child protection: Guardian permissions and safeguarding restrictions follow configured law.
- [ ] Academic integrity: Examination results and qualifications cannot be silently changed.
- [ ] Award authority: Only authorized institutions and officers can issue or revoke credentials.
- [ ] Appeal rights: Applicable admission, examination, accreditation, and funding review procedures are supported.
- [ ] Institutional autonomy: Universities and independent authorities retain their configured decision-making powers.
- [ ] Credential integrity: Verification distinguishes authentic credentials from qualification equivalence.
- [ ] Funding controls: Awards, payments, recoveries, and reconciliations trace to authorized decisions.
- [ ] Research confidentiality: Proposals, participant data, and unpublished findings have purpose-bound access.
- [ ] AI safeguards: AI-generated suggestions are identifiable as such and cannot bypass required human decisions.
- [ ] Interoperability: All exchanges use authenticated, versioned contracts and minimum necessary data.
- [ ] Audit integrity: Record access, amendments, approvals, decisions, and disclosures have tamper-evident audit references.
- [ ] Accessibility: Forms meet WCAG 2.2 AA and support mobile use, keyboard operation, localization, and accessible alternatives.
- [ ] Production integrity: No fabricated students, examination results, qualifications, or research grants appear as real records.
- [ ] Recovery: Backups preserve record versions, credential references, and audit continuity.
14. Engineering deliverables
The implementation team should build these reusable capabilities:
1. Education institution registry — school and university registration, jurisdiction, authority, and ownership.
2. Student administration service — enrolment, transfers, attendance, guardian authorization, and student support referrals.
3. Examination service — candidate registration, assessments, moderation, results approval, publication, and appeals.
4. Credential and qualifications service — issuance, verification, replacement, recognition, and controlled correction.
5. Higher education service — admissions, progression, academic records, thesis workflows, and graduation.
6. Accreditation service — applications, inspections, assessment findings, decisions, conditions, and reviews.
7. Vocational skills service — apprenticeships, training records, competency assessments, and certifications.
8. Education financing service — scholarships, grants, student loans, disbursement, and reconciliation.
9. Research administration service — grants, ethics approvals, milestones, research data authorization, and closure.
10. Education exchange gateway — authenticated, purpose-limited inter-institution exchanges.
11. Privacy and audit service — student data classification, record-access controls, disclosure logs, and retention.
12. Country activation pack — approved rules, institution configuration, validation contracts, test scenarios, and sign-off evidence.
Part 7 is complete as a catalogue and architecture specification.
