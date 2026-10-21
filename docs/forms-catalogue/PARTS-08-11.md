# CivicOS — Complete Government Form System (ChatGPT), parts 8 to 11 of 13, kept verbatim

**Provenance.** ChatGPT's answer to the forms catalogue request of 21 October
2026, pasted by the owner. Parts 1–7, 12 and 13 have not been received yet.

**Status.** Binding, like `docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md`. Owner's
instruction: never summarised; every item measured against the work and its
gap closed stage by stage; forms may be raised to a higher standard than this
text, never lowered. Each catalogue item is a row of
`docs/INSTITUTIONAL_REQUIREMENTS.md`.

**How the text was kept.** Every word is here in the order delivered. Removed
only: 2 lines of diagram styling code that the chat window copied along with
two state diagrams (CSS, not content; each is marked where it stood, and the
diagram's state names copied with it are kept as they were), and the owner's one-word
"next" prompts between parts.

---

CivicOS — Complete Government Form System
Part 8 of 13 — Agriculture, Land, Environment, Water, Energy and Natural Resources
This part defines the forms, registers, and workflows for agriculture, land administration, environmental protection, water resources, energy, mining, forestry, fisheries, and other natural resources.

The central principle is rights and resource decisions must be traceable to lawful authority and verified evidence. A land application is not proof of ownership; a permit application is not permission to operate; a satellite image is not, by itself, proof of a legal violation. CivicOS must distinguish reported information, verified observations, technical assessments, and legally authorized decisions.

All identifiers below are CivicOS catalogue IDs. The applicable country must configure its laws, land tenure systems, customary rights, resource ownership, licensing powers, environmental standards, and appeal procedures before activating the workflows.
1. Institutional and records architecture
Domain	Primary responsibility	Critical boundary
Agriculture authority	Agricultural policy, extension services, grants, and farm registration	Farm registration does not establish land ownership
Land registry and cadastre	Parcels, boundaries, recorded interests, and authorized changes	Registry entries change only through lawful procedures
Survey and mapping authority	Survey standards, cadastral mapping, and geospatial records	Map evidence does not independently determine legal title
Environment authority	Environmental permits, impact assessment, compliance, and protection	A technical finding and an enforcement decision are distinct
Water authority	Water allocation, abstraction, discharge, and water infrastructure	Permits must reflect the relevant basin, source, and legal allocation
Energy regulator	Energy licensing, tariff oversight, and compliance	Licensing and commercial operations follow configured authority
Mining and geological authority	Mineral rights, exploration, extraction, and rehabilitation	Surface rights and mineral rights must not be assumed identical
Forestry and fisheries authorities	Forest use, harvesting, fishing, and habitat protection	Resource rights must follow the applicable tenure and allocation rules
Natural-resource oversight	Inspections, complaints, and enforcement review	Independent oversight retains its configured mandate
National statistics and digital twin	Aggregated resource, land-use, and environmental indicators	Estimates must remain distinguishable from verified records
Each domain must have an explicit record owner, competent decision authority, permitted exchange relationships, and data classification. An institution's name or position in an organizational chart does not establish its legal powers.
2. Agriculture and farm administration
2.1 Agricultural form catalogue
Form ID	Form or workflow	Submitted by	Main outcome
AGR-FRM-001	Farm registration application	Farmer or authorized representative	Application registered
AGR-FRM-002	Farm profile amendment	Registered farmer or authorized officer	Controlled update
AGR-FRM-003	Farm activity declaration	Farmer or authorized operator	Activity record submitted
AGR-FRM-004	Agricultural land-use declaration	Farmer or entitled applicant	Declared land use recorded
AGR-FRM-005	Farm inspection record	Authorized inspector	Findings documented
AGR-FRM-006	Agricultural production report	Farmer or authorized source	Production data received
AGR-FRM-007	Crop planting or harvest declaration	Farmer or authorized source	Seasonal record registered
AGR-FRM-008	Livestock registration	Livestock owner or authorized operator	Livestock record established
AGR-FRM-009	Livestock movement record	Authorized owner, transporter, or official	Movement recorded
AGR-FRM-010	Animal health event report	Farmer, veterinarian, or authorized source	Event referred for assessment
AGR-FRM-011	Plant health or pest report	Farmer or authorized inspector	Report registered
AGR-FRM-012	Agricultural input registration	Supplier or authorized applicant	Input or supplier record reviewed
AGR-FRM-013	Agricultural grant application	Eligible farmer or organization	Funding application registered
AGR-FRM-014	Agricultural grant assessment	Authorized officer	Assessment recorded
AGR-FRM-015	Agricultural grant decision	Competent authority	Award or other authorized outcome
AGR-FRM-016	Agricultural subsidy payment	Authorized recipient and finance service	Payment processed and reconciled
AGR-FRM-017	Agricultural insurance claim	Insured farmer or representative	Claim assessment initiated
AGR-FRM-018	Agricultural extension service request	Farmer or authorized organization	Advisory service scheduled
AGR-FRM-019	Irrigation support request	Farmer or authorized group	Eligibility and technical review
AGR-FRM-020	Agricultural complaint or appeal	Entitled applicant	Review initiated
2.2 Farm record data contract
A farm record should contain:
- Stable farm reference and registered operator.
- Declared activities and relevant production categories.
- Parcel references, where known and lawfully linked.
- Livestock or crop records where applicable.
- Registration evidence, source, and verification status.
- Applicable permits or subsidy eligibility references.
- Inspection history and controlled amendments.
- Data provenance and audit references.
A farm registration must not be presented as proof that the operator owns or lawfully occupies the land. The platform must represent land ownership, leasehold, customary use, licences, and other tenure interests as separate, explicitly typed records.

Agricultural production figures must be labelled according to their source: reported by the operator, observed by an inspector, derived from an approved administrative source, or estimated through a model. The national digital twin must not present estimated production as verified output.
2.3 Agricultural disease and biosecurity workflows
Form ID	Form or workflow	Main outcome
AGR-BIO-001	Animal disease notification	Report received
AGR-BIO-002	Plant pest or disease notification	Report received
AGR-BIO-003	Sample collection and laboratory referral	Sample chain documented
AGR-BIO-004	Biosecurity investigation	Investigation opened
AGR-BIO-005	Movement restriction assessment	Authorized assessment initiated
AGR-BIO-006	Biosecurity intervention decision	Decision recorded by competent authority
AGR-BIO-007	Treatment or containment record	Intervention documented
AGR-BIO-008	Biosecurity review or appeal	Review initiated
AGR-BIO-009	Incident closure	Authorized closure recorded
A disease report does not automatically establish a confirmed outbreak. Any quarantine, movement restriction, destruction order, or other consequential intervention must follow the applicable legal authority and evidence requirements. Urgent procedures must have a defined human authorization and review path.
3. Land administration, cadastre, and property rights
Land administration is one of the highest-risk parts of a national government platform. A mistaken or unauthorized change can affect ownership, housing, inheritance, investment, customary rights, and access to natural resources.

CivicOS must never treat a map feature, tax payment, occupancy declaration, or application receipt as conclusive proof of land ownership.
3.1 Land and cadastral form catalogue
Form ID	Form or workflow	Main outcome
LND-REG-001	Land parcel registration application	Application registered
LND-REG-002	Parcel identification request	Parcel search or identification initiated
LND-REG-003	Cadastral survey submission	Survey evidence received
LND-REG-004	Boundary verification request	Boundary review opened
LND-REG-005	Boundary dispute referral	Dispute routed to competent authority
LND-REG-006	Land title registration application	Title application assessed
LND-REG-007	Transfer of registered interest	Transfer reviewed
LND-REG-008	Lease registration or amendment	Lease record updated through authorized procedure
LND-REG-009	Mortgage or encumbrance registration	Interest recorded where authorized
LND-REG-010	Mortgage discharge request	Discharge reviewed and recorded
LND-REG-011	Easement or right-of-way registration	Interest reviewed
LND-REG-012	Inheritance-based land registration	Succession evidence reviewed
LND-REG-013	Subdivision application	Parcel subdivision assessed
LND-REG-014	Parcel consolidation application	Consolidation assessed
LND-REG-015	Cadastral map correction	Map correction reviewed
LND-REG-016	Land record correction	Controlled legal correction
LND-REG-017	Duplicate or conflicting title investigation	Restricted investigation opened
LND-REG-018	Land record search request	Entitlement and disclosure assessed
LND-REG-019	Certified land record extract	Certified extract issued or refused
LND-REG-020	Land transaction restriction record	Authorized restriction registered
LND-REG-021	Restriction discharge request	Discharge reviewed
LND-REG-022	Land registration objection	Objection registered
LND-REG-023	Land registration appeal	Review or appeal opened
LND-REG-024	Historical land record reconstruction	Historical evidence assessed
Not every country uses a title-registration system. Some jurisdictions recognize deeds registration, customary tenure, community land, state land, or other forms of landholding. CivicOS must represent the country's actual legal model rather than forcing every interest into a single ownership field.
3.2 Land parcel data contract
Object	Required content
parcel_record	Stable parcel ID, jurisdiction, geometry reference, record status
survey_record	Surveyor, authority, survey method, date, coordinates, precision, evidence
land_interest	Interest type, holder reference, effective dates, source instrument
registration_instrument	Instrument type, issuing authority, reference, legal basis
boundary_record	Boundary definition, source, precision, dispute status
encumbrance_record	Encumbrance type, beneficiary reference, priority where applicable, status
transaction_record	Transaction type, parties, submitted instrument, verification, decision
objection_record	Objector, grounds, affected interest, evidence, review status
decision_record	Competent authority, rule version, outcome, reasons where required
parcel_version	Previous version, new version, effective date, authorized change reference
audit_event_ref	Access, submission, approval, amendment, and disclosure events
Parcel geometry and legal interests must be linked without being conflated. A geometry correction does not automatically change the registered holder of an interest, and a transfer of ownership does not automatically validate a disputed boundary.
3.3 Land registration safeguards
Every legally material change must have:
1. An authenticated application or legally authorized initiating event.
2. Evidence appropriate to the specific transaction.
3. Verification of the parties' authority and the instrument's validity.
4. A check for applicable objections, restrictions, competing claims, or required approvals.
5. A decision by the competent authority.
6. A recorded effective date and new record version.
7. Notification and review procedures where required.
Where law requires independent confirmation, two-person approval must involve distinct authorized individuals. The system must not allow a single operator to initiate and silently finalize a high-impact change.

Suspected fraud, competing claims, missing historical records, or inconsistent instruments must trigger the appropriate review workflow. They must not be resolved by automatically selecting the newest document or the record with the most recent timestamp.
4. Customary land, community rights, and resettlement
CivicOS must support legally recognized customary, communal, Indigenous, pastoral, seasonal, and other collective or non-individual land interests where applicable. These rights must not be omitted merely because they do not fit a conventional private-title form.
4.1 Community land form catalogue
Form ID	Form or workflow	Main outcome
LND-COM-001	Community land registration	Application registered
LND-COM-002	Community or customary interest declaration	Interest submitted for assessment
LND-COM-003	Community boundary mapping submission	Mapping evidence recorded
LND-COM-004	Community representation authorization	Authorized representative recorded
LND-COM-005	Collective land-use agreement	Agreement recorded under applicable rules
LND-COM-006	Shared resource access application	Rights and access assessed
LND-COM-007	Community land dispute referral	Dispute routed
LND-COM-008	Land acquisition or compulsory acquisition notice	Formal process initiated
LND-COM-009	Impact assessment and consultation record	Consultation and evidence recorded
LND-COM-010	Compensation assessment	Authorized assessment documented
LND-COM-011	Resettlement plan submission	Plan reviewed
LND-COM-012	Resettlement implementation record	Actions and commitments tracked
LND-COM-013	Community objection or appeal	Review initiated
LND-COM-014	Restoration or rehabilitation verification	Completion assessed
4.2 Community-rights protections
- Record the legal form of the right and the source of authority.
- Distinguish an individual representative from the community or collective interest they represent.
- Record consultation and consent where the applicable law requires them.
- Preserve evidence of objections, decisions, and appeal rights.
- Do not infer consent from silence, meeting attendance, or the submission of an unrelated form.
- Do not convert a customary interest into state ownership simply because the interest has not yet been digitized.
- Protect sensitive community maps and resource information where disclosure could create legal, cultural, or safety risks.
- Keep compensation decisions, payment records, and land-rights changes as separate, linked workflows.
Any compulsory acquisition, relocation, or resettlement process must use the country's applicable legal authority, procedural safeguards, compensation rules, and review mechanisms. A digital map or proposed infrastructure project must never independently extinguish an existing right.
5. Environmental permits and environmental impact assessment
Environmental workflows must separate application intake, technical assessment, public participation, permit decisions, operational compliance, and enforcement. A proposed development shown on the national digital twin does not constitute environmental approval.
5.1 Environmental form catalogue
Form ID	Form or workflow	Main outcome
ENV-PER-001	Environmental permit application	Application registered
ENV-PER-002	Project screening request	Screening initiated
ENV-PER-003	Environmental impact assessment submission	Assessment dossier received
ENV-PER-004	Environmental assessment completeness review	Completeness determination
ENV-PER-005	Additional information request	Formal request issued
ENV-PER-006	Applicant response to assessment request	Response received
ENV-PER-007	Public consultation notice	Consultation opened
ENV-PER-008	Public consultation submission	Submission registered
ENV-PER-009	Environmental technical review	Findings and recommendations recorded
ENV-PER-010	Environmental permit decision	Authorized decision recorded
ENV-PER-011	Environmental permit amendment	Amendment assessed
ENV-PER-012	Environmental permit renewal	Renewal reviewed
ENV-PER-013	Environmental permit transfer	Transfer assessed
ENV-PER-014	Permit suspension or revocation review	Authorized review initiated
ENV-PER-015	Environmental monitoring report	Monitoring evidence submitted
ENV-PER-016	Environmental inspection	Findings recorded
ENV-PER-017	Environmental noncompliance notice	Notice issued under applicable authority
ENV-PER-018	Corrective action plan	Remediation actions and deadlines recorded
ENV-PER-019	Environmental remediation verification	Completion assessed
ENV-PER-020	Environmental permit objection or appeal	Review initiated
5.2 Environmental assessment data contract
An assessment record should contain:
- Project and applicant references.
- Project location and affected parcel or resource references.
- Project description and proposed activities.
- Applicable screening rules and their versions.
- Assessment scope and methodology.
- Baseline observations and their sources.
- Predicted impacts, assumptions, and uncertainties.
- Alternatives considered where required.
- Consultation submissions and responses.
- Proposed mitigation and monitoring commitments.
- Technical assessment findings.
- Decision authority, legal basis, decision, and effective date.
- Permit conditions, expiry, monitoring obligations, and review pathway.
The platform must distinguish observed conditions from modelled impacts and applicant-reported information. A modelled pollution concentration, predicted habitat impact, or projected water demand must carry its methodology and uncertainty metadata.
5.3 Environmental enforcement
Environmental enforcement should use a separate, auditable chain:
1. Report or inspection observation received.
2. Evidence and source integrity recorded.
3. Authorized inspection or investigation conducted.
4. Findings and uncertainty documented.
5. Responsible authority determines whether a legal violation is established.
6. An authorized notice, remediation order, penalty, or other permitted action is issued.
7. The recipient receives applicable notice and review rights.
8. Remediation and closure are verified.
An automated satellite alert or sensor threshold crossing may trigger an inspection. It must not, by itself, establish liability or issue a legally consequential penalty.
6. Water resources, sanitation, and water infrastructure
Water administration must support both the physical resource and the legal rights to access, abstract, allocate, treat, discharge, and distribute it. Water permits and infrastructure records must not be treated as interchangeable.
6.1 Water form catalogue
Form ID	Form or workflow	Main outcome
WAT-RES-001	Water source registration	Source record established
WAT-RES-002	Water abstraction permit application	Application registered
WAT-RES-003	Water allocation assessment	Allocation reviewed
WAT-RES-004	Water abstraction permit decision	Authorized decision recorded
WAT-RES-005	Abstraction volume report	Metered or reported usage recorded
WAT-RES-006	Water-use permit amendment	Amendment assessed
WAT-RES-007	Water-use permit renewal	Renewal reviewed
WAT-RES-008	Groundwater drilling authorization	Application assessed
WAT-RES-009	Groundwater well registration	Well record established
WAT-RES-010	Water quality sample submission	Sample and provenance registered
WAT-RES-011	Water quality result	Result recorded and reviewed
WAT-RES-012	Water contamination incident	Incident investigation initiated
WAT-RES-013	Wastewater discharge permit	Discharge application assessed
WAT-RES-014	Wastewater treatment facility registration	Facility record established
WAT-RES-015	Water infrastructure project application	Project review initiated
WAT-RES-016	Water infrastructure inspection	Findings recorded
WAT-RES-017	Water service connection request	Connection application assessed
WAT-RES-018	Water service complaint	Complaint routed
WAT-RES-019	Drought or scarcity response assessment	Authorized assessment initiated
WAT-RES-020	Water allocation restriction decision	Decision recorded under applicable law
WAT-RES-021	Water permit dispute or appeal	Review initiated
6.2 Water-resource data contract
Object	Core fields
water_source	Source ID, source type, geographic reference, data provenance
water_right	Holder, authorized use, quantity or limits, source, effective period
abstraction_record	Meter or reporting source, quantity, measurement period, verification status
quality_sample	Sample ID, location, collection method, collector, timestamp, custody
quality_result	Laboratory, method, measured parameters, units, quality status
discharge_permit	Facility, permitted substances or parameters, limits, monitoring obligations
water_infrastructure	Asset ID, operator, location, operational status, inspection history
allocation_decision	Authority, rule version, allocated amount, conditions, review requirements
Water measurements must preserve units, collection methods, instrument calibration where applicable, and the distinction between observed measurements and modelled estimates.

A sensor outage must not be interpreted as zero consumption or clean water. A modelled water shortage must be labelled as a forecast and must not automatically cancel existing rights.
7. Energy licensing, electricity, and renewable energy
Energy administration includes market licensing, generation, transmission, distribution, tariffs, safety, and renewable-energy projects. Technical system status and legal authorization must be maintained as separate records.
7.1 Energy form catalogue
Form ID	Form or workflow	Main outcome
NRG-LIC-001	Energy operator registration	Operator record established
NRG-LIC-002	Electricity generation licence application	Application registered
NRG-LIC-003	Transmission or distribution licence application	Application registered
NRG-LIC-004	Electricity supply or trading licence	Licence review
NRG-LIC-005	Energy licence decision	Authorized decision recorded
NRG-LIC-006	Energy licence renewal	Renewal assessed
NRG-LIC-007	Licence scope amendment	Amendment reviewed
NRG-LIC-008	Energy licence transfer	Transfer assessed
NRG-LIC-009	Licence suspension or revocation review	Authorized review
NRG-LIC-010	Energy infrastructure project registration	Project registered
NRG-LIC-011	Renewable-energy project application	Project review initiated
NRG-LIC-012	Grid connection application	Technical and regulatory review
NRG-LIC-013	Grid connection decision	Authorized decision recorded
NRG-LIC-014	Generation and supply reporting	Report submitted
NRG-LIC-015	Energy safety inspection	Findings recorded
NRG-LIC-016	Energy incident notification	Incident referred
NRG-LIC-017	Energy tariff proposal	Tariff submission registered
NRG-LIC-018	Tariff technical assessment	Assessment prepared
NRG-LIC-019	Tariff approval decision	Authorized tariff decision
NRG-LIC-020	Energy consumer complaint	Complaint registered
NRG-LIC-021	Energy service interruption report	Outage or interruption recorded
NRG-LIC-022	Energy restoration report	Restoration event recorded
NRG-LIC-023	Energy licence appeal	Review initiated
7.2 Energy licence and tariff controls
Each licence should identify the operator, authorized activity, geographic or technical scope, effective dates, conditions, reporting requirements, and competent authority.

Tariffs must come from approved, versioned rules or decisions. A dashboard calculation must not silently become a legally applicable tariff. Every material tariff change should record the approving authority, legal basis, effective date, and publication status.

Grid telemetry and outage information may inform operational monitoring, but a technical alarm does not independently establish legal noncompliance. Safety interventions and enforcement actions must follow the applicable authority and procedure.
7.3 Renewable energy and decentralized systems
Where countries regulate solar, wind, hydro, biogas, storage, mini-grids, or off-grid generation, CivicOS can support separate configured workflows for:
- Project registration and permits.
- Land-use and environmental approval references.
- Grid connection and technical inspection.
- Equipment and operator certification where required.
- Subsidy or incentive applications.
- Metering, generation reporting, and commissioning.
- Safety incidents and corrective actions.
- Decommissioning and site restoration.
These workflows must link to the relevant land and environmental cases without treating approval in one domain as automatic approval in another.
8. Mining, minerals, and geological resources
Mining rights can affect landholders, communities, water, ecosystems, and public revenue. CivicOS must maintain distinct records for exploration rights, extraction licences, land access, environmental approvals, production reporting, royalties, and rehabilitation obligations.
8.1 Mining form catalogue
Form ID	Form or workflow	Main outcome
MIN-LIC-001	Mineral rights application	Application registered
MIN-LIC-002	Exploration licence application	Exploration review
MIN-LIC-003	Exploration work programme	Programme submitted
MIN-LIC-004	Exploration licence decision	Authorized decision recorded
MIN-LIC-005	Mining lease application	Lease assessment
MIN-LIC-006	Extraction licence application	Application reviewed
MIN-LIC-007	Mining licence decision	Authorized decision recorded
MIN-LIC-008	Mineral rights renewal	Renewal reviewed
MIN-LIC-009	Mineral rights transfer	Transfer assessed
MIN-LIC-010	Licence boundary amendment	Boundary change reviewed
MIN-LIC-011	Geological survey submission	Survey record registered
MIN-LIC-012	Mineral production declaration	Production data submitted
MIN-LIC-013	Mineral export authorization	Export review
MIN-LIC-014	Mining safety inspection	Findings recorded
MIN-LIC-015	Mining incident report	Incident referred
MIN-LIC-016	Mine closure plan	Closure plan assessed
MIN-LIC-017	Rehabilitation and restoration plan	Plan reviewed
MIN-LIC-018	Rehabilitation progress report	Progress evidence submitted
MIN-LIC-019	Mine closure verification	Completion assessed
MIN-LIC-020	Mining royalty assessment	Assessment recorded under approved rules
MIN-LIC-021	Royalty reconciliation	Reported production and payments reconciled
MIN-LIC-022	Mining licence suspension or revocation review	Authorized review
MIN-LIC-023	Mining rights dispute or appeal	Review initiated
8.2 Mining rights and obligations
A mineral rights record should include:
- Stable licence reference and holder.
- Mineral category and authorized activity.
- Spatial boundary, coordinate reference system, and source survey.
- Effective period and licence conditions.
- Linked land-access and environmental approval references.
- Authorized production and reporting obligations.
- Royalty rule and version, where applicable.
- Safety, closure, and rehabilitation requirements.
- Transfers, amendments, disputes, suspensions, and revocations.
- Decision authority and audit history.
A mineral licence must not be treated as proof of land ownership. Likewise, a surface landholder must not automatically be treated as the holder of subsurface mineral rights. The country’s law determines the relationship.

Spatial overlap detection may identify competing applications or affected parcels. It must not automatically grant priority, cancel a licence, or decide a dispute.
9. Forestry, fisheries, and biodiversity
Forestry, fisheries, and biodiversity workflows need to support sustainable use, conservation, lawful harvesting, protected areas, and community access rights.
9.1 Forestry form catalogue
Form ID	Form or workflow	Main outcome
FOR-LIC-001	Forest operator registration	Operator registered
FOR-LIC-002	Forest harvesting permit application	Application registered
FOR-LIC-003	Harvesting plan submission	Plan assessed
FOR-LIC-004	Harvesting permit decision	Authorized decision recorded
FOR-LIC-005	Timber transport authorization	Transport request reviewed
FOR-LIC-006	Timber origin and traceability declaration	Origin record submitted
FOR-LIC-007	Forest inspection	Findings recorded
FOR-LIC-008	Illegal harvesting report	Report referred
FOR-LIC-009	Reforestation plan	Plan reviewed
FOR-LIC-010	Reforestation progress report	Progress recorded
FOR-LIC-011	Protected forest activity request	Eligibility and legal review
FOR-LIC-012	Forestry permit appeal	Review initiated
9.2 Fisheries and aquatic resources form catalogue
Form ID	Form or workflow	Main outcome
FIS-LIC-001	Fishing operator registration	Operator record established
FIS-LIC-002	Fishing vessel registration	Vessel record established
FIS-LIC-003	Fishing licence application	Application registered
FIS-LIC-004	Catch quota or allocation application	Allocation assessed
FIS-LIC-005	Catch declaration	Catch data submitted
FIS-LIC-006	Landing or landing-site report	Landing event recorded
FIS-LIC-007	Aquaculture facility application	Facility reviewed
FIS-LIC-008	Aquaculture environmental assessment	Assessment recorded
FIS-LIC-009	Fisheries inspection	Findings recorded
FIS-LIC-010	Illegal fishing or bycatch report	Report referred
FIS-LIC-011	Aquatic disease incident	Investigation initiated
FIS-LIC-012	Fisheries licence renewal or amendment	Amendment reviewed
FIS-LIC-013	Fisheries enforcement review	Authorized review
FIS-LIC-014	Fisheries licence appeal	Appeal registered
9.3 Biodiversity and protected-area catalogue
Form ID	Form or workflow	Main outcome
BIO-ENV-001	Protected area registration	Protected area record established
BIO-ENV-002	Protected area boundary amendment	Amendment reviewed
BIO-ENV-003	Biodiversity survey submission	Survey data registered
BIO-ENV-004	Wildlife incident report	Incident referred
BIO-ENV-005	Conservation management plan	Plan reviewed
BIO-ENV-006	Protected area activity permit	Application assessed
BIO-ENV-007	Habitat restoration project	Project registered
BIO-ENV-008	Conservation monitoring report	Monitoring evidence submitted
BIO-ENV-009	Biodiversity compliance inspection	Findings recorded
BIO-ENV-010	Conservation complaint or appeal	Review initiated
Protected-species locations, sensitive habitat information, and community resource knowledge may require restricted geographic disclosure. The national digital twin must not expose every precise coordinate simply because a feature exists in the authoritative dataset.
10. Spatial records, inspections, and evidence
Land and natural-resource workflows rely heavily on geographic information. CivicOS should use a consistent geospatial evidence model while preserving the difference between a map feature and a legal record.
10.1 Spatial evidence contract
Each spatial record should include:
- A stable feature or parcel reference.
- Geometry and coordinate reference system.
- Source dataset and originating institution.
- Survey or observation method.
- Capture or survey date.
- Positional accuracy and known limitations.
- Whether the feature is observed, reported, modelled, or legally registered.
- Relevant licence, parcel, permit, or inspection references.
- Version and transformation history.
- Classification and permitted disclosure scope.
10.2 Inspection and field evidence
Form ID	Form or workflow	Main outcome
NRE-INS-001	Inspection assignment	Authorized assignment recorded
NRE-INS-002	Field inspection report	Observations documented
NRE-INS-003	Sample or material collection	Collection and custody recorded
NRE-INS-004	Evidence transfer record	Custody transfer documented
NRE-INS-005	Technical analysis result	Analysis result registered
NRE-INS-006	Inspection finding review	Finding assessed
NRE-INS-007	Notice of suspected noncompliance	Formal notice issued where authorized
NRE-INS-008	Corrective action plan	Actions and deadlines recorded
NRE-INS-009	Corrective action verification	Completion assessed
NRE-INS-010	Enforcement decision	Authorized decision recorded
NRE-INS-011	Inspection objection or appeal	Review initiated
NRE-INS-012	Inspection case closure	Closure basis recorded
An inspection report must distinguish direct observations, statements by the inspected party, third-party information, laboratory results, and model-generated alerts. A photograph or satellite image must retain its source, capture date, and integrity metadata where available.
11. Cross-institution resource and land exchanges
Exchange ID	Sending institution	Receiving institution	Purpose
EX-NRE-001	Land registry	Agriculture authority	Authorized parcel-interest verification
EX-NRE-002	Land registry	Environmental authority	Parcel and recorded-interest references for an authorized assessment
EX-NRE-003	Environmental authority	Mining or energy regulator	Environmental decision and conditions
EX-NRE-004	Water authority	Agriculture or energy authority	Authorized allocation or permit verification
EX-NRE-005	Mining authority	Revenue authority	Production and royalty reporting under configured law
EX-NRE-006	Forestry authority	Customs authority	Timber permit or origin verification
EX-NRE-007	Fisheries authority	Customs authority	Authorized catch or export documentation verification
EX-NRE-008	Energy regulator	Environmental authority	Relevant licence and environmental conditions
EX-NRE-009	Survey authority	Land registry	Survey evidence for a controlled cadastral procedure
EX-NRE-010	Resource authority	National statistics or digital-twin service	Approved aggregated indicators
Each exchange must define the lawful purpose, sender and recipient authority, data scope, contract version, and audit requirements. A resource regulator must not receive unrestricted access to every landholder's personal details merely because a licence intersects a parcel.
12. Country configuration and legal rule registry
Before activation, the country must define its land tenure, environmental procedures, water rights, resource ownership, licensing regimes, and institutional responsibilities.
Configuration ID	Required decision
CFG-AGR-001	Farm registration, agricultural support, and inspection rules
CFG-AGR-002	Livestock, plant health, biosecurity, and movement-control authority
CFG-LND-001	Land tenure types, authoritative registers, and record ownership
CFG-LND-002	Parcel identifiers, cadastral standards, and survey requirements
CFG-LND-003	Transfers, encumbrances, objections, corrections, and appeals
CFG-LND-004	Customary, communal, and collective rights recognition
CFG-LND-005	Compulsory acquisition, consultation, compensation, and resettlement
CFG-ENV-001	Environmental screening and impact assessment procedures
CFG-ENV-002	Permit categories, conditions, renewal, and enforcement powers
CFG-WAT-001	Water source registration, abstraction rights, and allocations
CFG-WAT-002	Water quality standards and discharge requirements
CFG-NRG-001	Energy operator and infrastructure licensing
CFG-NRG-002	Tariff approval, grid connection, and energy safety rules
CFG-MIN-001	Mineral rights, exploration, extraction, and transfer rules
CFG-MIN-002	Royalties, production reporting, closure, and rehabilitation
CFG-FOR-001	Forestry permits, timber traceability, and restoration requirements
CFG-FIS-001	Fishing rights, quotas, vessel registration, and catch reporting
CFG-BIO-001	Protected areas, biodiversity protections, and sensitive geospatial disclosure
CFG-INS-001	Inspection powers, evidence handling, notices, and enforcement procedures
CFG-NRE-001	Authorized cross-institution exchanges and contract versions
CFG-DAT-001	Personal data, commercial confidentiality, community information, and retention rules
Every active configuration must have a stable identifier, legal or approved source, version, effective date, and approval history. Material changes must follow the required two-person confirmation procedure.
13. Implementation acceptance gates
- [ ] Land-rights integrity: No ownership or other registered interest can be silently overwritten.
- [ ] Tenure inclusion: Customary and collective rights can be represented where recognized by law.
- [ ] Spatial provenance: Geospatial records preserve source, coordinate system, precision, and version.
- [ ] Environmental integrity: Modelled impacts remain distinguishable from observations and legal findings.
- [ ] Water-resource integrity: Measurements, allocations, permits, and forecasts remain separate data types.
- [ ] Resource licensing: Every licence decision links to the competent authority and applicable rule version.
- [ ] Inspection integrity: Evidence provenance and custody transfers are recorded.
- [ ] Human authorization: Automated alerts do not independently determine liability or impose adverse legal decisions.
- [ ] Community safeguards: Consultation, objections, compensation, and resettlement processes follow configured law.
- [ ] Financial integrity: Royalties, subsidies, tariffs, and fees derive from approved rules and traceable records.
- [ ] Data minimization: Cross-institution exchanges disclose only authorized fields.
- [ ] Auditability: Material changes, access events, decisions, and disclosures are recorded in a tamper-evident audit chain.
- [ ] Accessibility: Forms meet WCAG 2.2 AA, support mobile use, and provide accessible alternatives.
- [ ] Production integrity: Sample parcels, permits, inspections, and resource estimates are not presented as verified production records.
- [ ] Recovery: Backups preserve legal record versions, geospatial references, and audit continuity.
14. Engineering deliverables
The implementation team should build:
1. Agriculture registry and support service — farm registration, production reporting, grants, livestock, and biosecurity.
2. Land rights and cadastre service — parcels, interests, transfers, encumbrances, disputes, and controlled corrections.
3. Community land service — customary and collective interests, representation, consultation, and resettlement workflows.
4. Environmental permitting service — screening, assessments, consultations, permits, inspections, and remediation.
5. Water resource service — source registration, abstraction, allocation, quality, discharge, and infrastructure.
6. Energy regulatory service — operator licensing, grid connection, tariffs, safety, and renewable-energy approvals.
7. Mining and mineral rights service — exploration, extraction, production reporting, royalties, and rehabilitation.
8. Forestry and fisheries service — harvesting, catch reporting, traceability, licensing, and conservation.
9. Geospatial evidence service — source provenance, geometry versions, survey precision, and controlled spatial disclosure.
10. Field inspection service — assignments, evidence, custody, findings, corrective actions, and appeals.
11. Resource exchange gateway — authenticated, versioned, purpose-limited inter-institution exchanges.
12. Country activation pack — legal authority mappings, approved rules, data classifications, test cases, and sign-off evidence.
Part 8 is complete as a catalogue and architecture specification.

Next: Part 9 of 13 — Transport, Roads, Vehicles, Maritime, Aviation, Public Infrastructure and Urban Development. This will cover vehicle and driver licensing, transport operators, road infrastructure, public transit, ports, aviation, construction permits, planning approvals, inspections, and infrastructure asset management.


CivicOS — Complete Government Form System
Part 9 of 13 — Transport, Roads, Vehicles, Maritime, Aviation, Public Infrastructure and Urban Development
This part defines the government forms, registers, applications, permits, inspections, operational workflows and decision records required to administer transport systems and public infrastructure through CivicOS.

The objective is to make transport and infrastructure administration legally accountable, interoperable, auditable and operationally complete—from a citizen applying for a driving licence to a national authority managing roads, ports, airports, public transport, construction permits and infrastructure assets.

The catalogue IDs below are stable CivicOS identifiers. They do not imply that a form is legally mandatory in every country. Each nation must configure the relevant legislation, competent authority, delegated powers, fees, deadlines, evidence requirements, review rights and retention rules before activating a workflow.
1. Scope and institutional architecture

A. Road transport and vehicle administration

Driver licensing, vehicle registration, ownership transfers, roadworthiness, commercial operators, passenger transport, freight, traffic permits and vehicle inspections.


B. Roads and public transit

Road construction, maintenance, closures, public transport routes, terminals, accessibility, traffic management and transport service contracts.


C. Maritime and aviation

Vessel registration, port operations, maritime permits, airport operations, aviation operators, aerodrome approvals and applicable safety inspections.


D. Public infrastructure and urban development

Development applications, building and engineering approvals, public works, contractor registration, infrastructure asset management, inspections and completion certificates.


Institutional boundaries
CivicOS must represent each competent authority as an explicitly configured institution or office, rather than infer its legal powers from its name.
Authority archetype	Typical responsibility
Transport ministry or department	National policy and delegated programme administration
Road authority	Public road network, works, maintenance and access controls
Vehicle and driver licensing authority	Driver and vehicle records, subject to law
Transport safety regulator	Safety standards, inspections and enforcement
Municipal or regional planning authority	Land-use planning, development and local permits
Port or maritime authority	Port operations and jurisdiction-specific maritime functions
Civil aviation authority	Aviation oversight and approvals within its statutory remit
Public procurement authority	Procurement oversight and applicable review processes
Independent appeals body or court	Reviews and appeals under its own legal authority
These are archetypes, not mandatory government structures. One authority may hold multiple lawful powers, and a country may distribute them among separate institutions.
2. Master form catalogue
The following IDs establish the baseline forms for the transport and infrastructure domain.
2.1 Road transport, driving licences and vehicle registration
Form ID	Form or workflow	Primary outcome
TRN-DRV-001	Driving licence application	New application and eligibility review
TRN-DRV-002	Learner or provisional licence	Learner authorization, where applicable
TRN-DRV-003	Driving test booking	Examination appointment and result
TRN-DRV-004	Licence renewal	Renewal decision and updated validity
TRN-DRV-005	Foreign licence exchange	Verification and exchange decision
TRN-DRV-006	Licence replacement or correction	Replacement document or corrected record
TRN-DRV-007	Licence category endorsement	Addition or amendment of an authorized category
TRN-DRV-008	Licence suspension or revocation review	Legally authorized restriction and review
TRN-VEH-001	Vehicle registration	Vehicle record and registration status
TRN-VEH-002	Change of vehicle ownership	Linked transfer and ownership-history event
TRN-VEH-003	Vehicle import declaration	Import compliance assessment
TRN-VEH-004	Vehicle export or deregistration	Export or deregistration record
TRN-VEH-005	Vehicle inspection	Inspection findings and outcome
TRN-VEH-006	Roadworthiness certificate	Certificate issuance, expiry or refusal
TRN-VEH-007	Vehicle modification approval	Authorization for regulated modifications
TRN-VEH-008	Commercial or special-use vehicle permit	Permit for an applicable vehicle class or use
TRN-VEH-009	Lost, stolen or recovered vehicle report	Report and linked status changes
TRN-VEH-010	Vehicle record correction	Audited correction of a registration record
2.2 Public transport, commercial operators and freight
Form ID	Form or workflow	Primary outcome
TRN-OPS-001	Transport operator registration	Operator registration decision
TRN-OPS-002	Passenger transport licence	Authorized passenger transport activity
TRN-OPS-003	Taxi or ride-service permit	Local or national operating authorization
TRN-OPS-004	Bus route application	Route and service authorization
TRN-OPS-005	Freight operator licence	Commercial freight authorization
TRN-OPS-006	Oversized or overweight load permit	Route-specific movement authorization
TRN-OPS-007	Dangerous goods transport permit	Applicable hazardous-cargo authorization
TRN-OPS-008	Transport operator renewal	Continued authorization assessment
TRN-OPS-009	Operator compliance inspection	Findings, corrective actions and follow-up
TRN-OPS-010	Public transport fare proposal	Review and approval under applicable rules
TRN-OPS-011	Public transport service complaint	Complaint handling and resolution
TRN-OPS-012	Transport subsidy claim	Eligibility assessment and payment workflow
2.3 Roads, bridges and traffic management
Form ID	Form or workflow	Primary outcome
TRN-ROAD-001	Road opening or access application	Access authorization or refusal
TRN-ROAD-002	Road excavation permit	Time- and location-limited works permit
TRN-ROAD-003	Road closure request	Approved closure and public notice
TRN-ROAD-004	Temporary traffic management plan	Reviewed traffic-control arrangement
TRN-ROAD-005	Road defect report	Verified maintenance case
TRN-ROAD-006	Bridge or road inspection	Condition assessment and follow-up
TRN-ROAD-007	Road maintenance work order	Authorized maintenance activity
TRN-ROAD-008	Traffic signal or signage request	Engineering review and decision
TRN-ROAD-009	Road safety audit	Findings, risk treatment and sign-off
TRN-ROAD-010	Public right-of-way occupation permit	Temporary or conditional occupation authorization
TRN-ROAD-011	Road asset handover	Accepted asset and maintenance responsibility
TRN-ROAD-012	Road incident damage claim	Liability assessment and claim disposition
2.4 Maritime, ports and inland waterways
Form ID	Form or workflow	Primary outcome
TRN-MAR-001	Vessel registration	Vessel record and registration decision
TRN-MAR-002	Vessel ownership transfer	Linked transfer record
TRN-MAR-003	Vessel inspection	Findings and safety status
TRN-MAR-004	Maritime operator authorization	Operating authorization where required
TRN-MAR-005	Port facility registration	Facility record and approval
TRN-MAR-006	Port access or operating permit	Authorized access or activity
TRN-MAR-007	Inland waterway transport permit	Route or activity authorization
TRN-MAR-008	Marine works or dredging application	Technical and environmental review
TRN-MAR-009	Vessel incident report	Incident record and investigation referral
TRN-MAR-010	Port environmental incident report	Containment, response and regulatory workflow
2.5 Aviation and aerodromes
Form ID	Form or workflow	Primary outcome
TRN-AVI-001	Aviation operator application	Operator approval assessment
TRN-AVI-002	Aircraft registration	Aircraft record and registration decision
TRN-AVI-003	Aircraft inspection record	Technical findings and status
TRN-AVI-004	Aerodrome registration or approval	Facility authorization
TRN-AVI-005	Aviation safety occurrence report	Occurrence record and safety referral
TRN-AVI-006	Aviation operating authorization	Approval for a regulated operation
TRN-AVI-007	Airport infrastructure works application	Engineering and operational review
TRN-AVI-008	Restricted aviation activity request	Authorization assessment under applicable rules
TRN-AVI-009	Aviation safety corrective action	Remediation plan and verification
TRN-AVI-010	Aviation certificate renewal	Renewal decision and validity record
These workflows must integrate with the applicable specialist authorities and safety-management systems. CivicOS must not imply that a general government permit replaces a separate aviation or maritime certification.
2.6 Infrastructure, construction and urban development
Form ID	Form or workflow	Primary outcome
TRN-INF-001	Development planning application	Planning decision
TRN-INF-002	Building or construction permit	Construction authorization or refusal
TRN-INF-003	Engineering design submission	Technical review and approval
TRN-INF-004	Public infrastructure project proposal	Project appraisal and authorization
TRN-INF-005	Infrastructure funding request	Funding assessment and decision
TRN-INF-006	Contractor registration or prequalification	Eligibility record for relevant procurement
TRN-INF-007	Construction commencement notice	Commencement record and required checks
TRN-INF-008	Construction inspection	Inspection findings and corrective actions
TRN-INF-009	Change order or scope variation	Controlled amendment approval
TRN-INF-010	Practical completion inspection	Defect list and completion decision
TRN-INF-011	Occupancy or use certificate	Authorization to occupy or use, where required
TRN-INF-012	Infrastructure asset handover	Ownership, maintenance and operating responsibility
TRN-INF-013	Public building safety inspection	Safety findings and follow-up
TRN-INF-014	Demolition permit	Controlled demolition authorization
TRN-INF-015	Planning appeal or review	Review record and reasoned disposition
Infrastructure funding, procurement, environmental permits, land rights and construction approvals must remain distinct legal decisions, even when CivicOS presents them in a unified project workspace.
3. Common application data contract
Every form in this catalogue should use a shared schema framework. Sector-specific forms add their own fields rather than inventing incompatible submission structures.
Schema section	Required design
Identity	Immutable application ID, form ID, schema version and applicant reference
Authority	Competent institution, responsible office, statutory power and delegated authority
Subject	Person, company, vehicle, vessel, aircraft, road segment, building, facility or project
Location	Country-defined geographic reference, geometry where relevant, coordinate reference system and precision
Request	Requested action, scope, dates, operating conditions and declarations
Evidence	Document type, issuer, issue date, expiry, verification status and provenance
Compliance	Applicable rules, validation rule IDs, prerequisites and outstanding checks
Financials	Approved fee schedule version, assessment, invoice, payment reference and refund status
Decision	Outcome, authorized decision-maker, legal basis, reasons, conditions and effective dates
Notice	Delivery method, recipient, notice timestamp, accessible copy and delivery status
Review	Objection, appeal, reconsideration, deadline and reviewing authority
Audit	Creation, changes, submissions, access, decisions, notifications and linked events
Example typed form schema
This illustrates the minimum metadata pattern for a driving licence application. It is an architectural example, not a claim that these exact fields or rules are mandated by every country.
type CivicFormField = {
  id: string;
  type:
    | "text"
    | "date"
    | "select"
    | "boolean"
    | "document"
    | "address"
    | "reference";
  required: boolean;
  labelKey: string;
  helpKey?: string;
  validationRuleIds: string[];
  dataClassification:
    | "public"
    | "internal"
    | "confidential"
    | "restricted";
  legalBasisId?: string;
};

type CivicFormDefinition = {
  formId: string;
  schemaVersion: string;
  jurisdictionId: string;
  authorityId: string;
  legalRuleSetVersion: string;
  fields: CivicFormField[];
  workflowId: string;
  active: boolean;
};


Implementation requirements:
- Store form schemas and validation rules as versioned configuration.
- Preserve the exact schema and rule versions used when a submission was made.
- Use translated labels, hints, validation messages and accessible error summaries.
- Do not treat a completed form, uploaded document or successful payment as proof that a legal requirement has been satisfied.
- Never activate a legally consequential rule until its source, version, applicability and authorized approval have been confirmed.
4. End-to-end workflow contracts
4.1 Driving licence and vehicle registration
1. Draft application
   
   Applicant selects the service, licence category or vehicle transaction, and responsible jurisdiction.
2. Identity and evidence checks
   
   Validate required evidence and authorized verification responses. An inconclusive check must not automatically become a rejection.
3. Eligibility assessment
   
   Apply the configured requirements for the relevant licence category or registration transaction. Record missing prerequisites and their sources.
4. Examination or inspection
   
   Schedule and record any required test, inspection, technical certificate or specialist assessment.
5. Authorized decision
   
   An appropriately empowered officer or system-authorized process records the decision within the legally permitted scope. Adverse decisions follow required human-review and reasoning safeguards.
6. Issue and notify
   
   Issue the relevant credential or registration evidence only after required approvals. Record effective date, expiry, restrictions and delivery.
7. Renew, correct or appeal
   
   Preserve prior events and route changes through the applicable renewal, correction, suspension-review or appeal workflow.

4.2 Construction and infrastructure approvals
1. Project intake: Record applicant, site, proposed use, scope and requested authorization.
2. Prerequisite checks: Identify applicable planning, land, environmental, engineering, utility and public-safety requirements.
3. Technical review: Assign qualified reviewers; capture reports, comments, conflicts and requested revisions.
4. Consultation: Collect legally required notices, public submissions and responses, with appropriate privacy controls.
5. Decision: Issue a reasoned approval, conditional approval, request for information or refusal under the relevant authority.
6. Construction controls: Track commencement, inspections, nonconformities, approved variations and corrective actions.
7. Completion and handover: Record final inspection, outstanding defects, applicable completion certificates and asset-management responsibility.

A permit must specify the approved scope and conditions. A material design or use change must trigger a configured reassessment rather than silently extending the original approval.
4.3 Transport operator licensing
The operator workflow must support:
- Initial registration and beneficial ownership information where legally required.
- Authorized checks of insurance, vehicle fleets, qualifications, safety-management procedures and financial standing where applicable.
- Route, service-area, vehicle-class and operating-hour restrictions.
- Periodic inspections and renewals.
- Complaints, incidents, corrective action plans and enforcement referrals.
- Suspension, variation, surrender, expiry and revocation under defined legal procedures.
Important: an operator's registration, operating licence, vehicle registration and individual driver's licence are different records. CivicOS must not combine them into a single undifferentiated “approved” status.
5. Workflow state machine and decision integrity
Use the shared case engine rather than implementing a different state machine for every form.
[Diagram styling from the chat window removed here. The diagram's state names, exactly as copied:]

DraftSubmittedValidationInformationRequiredAssessmentInspectionDecisionPendingApprovedRefusedActiveRenewalDueSuspendedExpiredRevokedReviewRequestedReviewDecisionSurrendered


The shared engine must additionally support withdrawn applications, cancelled permits, superseded decisions, deferred cases, reopened inspections and jurisdiction-specific statuses. Not every form uses every state.
Mandatory transition controls
1. A state transition must identify its actor, timestamp, triggering event and applicable rule.
2. The system must reject transitions for which the actor lacks the required permission or delegated authority.
3. Required evidence and checks must be satisfied before the relevant transition.
4. Legally material decisions must record the legal basis and applicable rule-set version.
5. Where dual control is required, the proposer and confirmer must be different authorized people.
6. A review or appeal must preserve the original decision and create a linked review record.
7. Expiry and renewal reminders must not silently renew a credential or revoke a legal right.
8. Emergency restrictions must follow a separately configured legal pathway, with prompt review where required.
9. Manual overrides require a reason, authorized actor and tamper-evident audit entry.
10. External agency responses must record source, timestamp, verification method and any unresolved discrepancy.
6. National transport and infrastructure registers
CivicOS should operate shared, authoritative registers only where a nation has explicitly assigned the relevant record-keeping responsibility.
Register ID	Register	Minimum record relationships
REG-TRN-001	Driver and licence register	Person, licence categories, restrictions, validity and decision history
REG-TRN-002	Vehicle register	Vehicle identifier, registration, recorded keepers or owners as defined by law, inspections and status
REG-TRN-003	Transport operator register	Operator, licences, fleet, routes, conditions and compliance events
REG-TRN-004	Public road asset register	Road segments, structures, ownership or stewardship, condition and maintenance
REG-TRN-005	Public transport service register	Routes, stops, operators, timetables, permits and service obligations
REG-TRN-006	Vessel register	Vessel identity, registration, ownership interests and applicable certifications
REG-TRN-007	Aviation asset and operator register	Aircraft or facility identity, responsible entity and applicable approvals
REG-INF-001	Infrastructure project register	Project scope, funding, approvals, contracts, progress and handover
REG-INF-002	Construction permit register	Site, authorized scope, conditions, inspection events and validity
REG-INF-003	Public infrastructure asset register	Asset identity, location, lifecycle, responsible institution and maintenance history
REG-INF-004	Planning decisions register	Application, site, decision, conditions, appeal and supersession history
REG-INF-005	Inspection and defect register	Asset, inspection, finding, severity, corrective action and closure evidence
Register integrity rules
- Distinguish legal ownership, registered keeper, operator, custodian, asset owner and maintenance authority. Their meanings depend on jurisdiction.
- Never silently overwrite a historic registration, permit or decision.
- Model corrections, transfers and revocations as linked, time-stamped events.
- Enforce unique identifiers within their defined namespaces, without assuming a single universal identifier exists in every country.
- Record geospatial geometry separately from legal boundaries and interests. A mapped line does not itself establish a legal boundary.
- Maintain source provenance for imported data, including the importing institution, source record, import timestamp and verification status.
- Record when information is verified, reported, provisional, disputed, expired or no longer current.
7. Infrastructure digital twin integration
CivicOS's national digital twin should provide a spatial and operational view of transport networks and public infrastructure without becoming an alternative source of legal authority.


Road network and structures

Roads, bridges, tunnels, junctions, drainage, traffic-control assets and maintenance segments. Link each feature to its authoritative record and responsible institution.


Mobility and public transit

Routes, stops, terminals, service coverage, accessibility information and planned disruptions, with update timestamps and source provenance.


Infrastructure delivery

Project sites, approved works, milestones, inspection history, defect status, asset handover and maintenance planning.


Digital twin rules
- Every map layer has an owner, update schedule, coordinate reference system, data classification and provenance.
- Distinguish observed measurements, agency reports, modelled estimates and simulated training data.
- Show the last-updated timestamp and stale-data warnings.
- Do not expose sensitive infrastructure details or restricted facility information to public users without an authorized disclosure basis.
- Sensor anomalies and satellite imagery may initiate inspections, but must not independently establish a legal violation or trigger a legally consequential penalty.
- Public dashboards must use authorized aggregate or appropriately redacted data.
- Planned works, approved projects and completed assets must have separate lifecycle states.
8. Fees, payments, contracts and procurement
Transport and infrastructure forms may generate fees or connect to procurement and payment services. These are related workflows, not interchangeable legal decisions.
Fee and payment contract
Every charge must reference:
- An approved tariff or fee schedule and version.
- The competent authority and legal basis for charging.
- The calculation inputs, exemptions and any applicable tax.
- An invoice or assessment ID and payment provider reference.
- Payment, partial payment, refund, waiver or dispute events.
- The rule that determines whether payment is a prerequisite for the next step.
Payment confirmation does not itself prove eligibility, compliance, ownership or authorization.
Public infrastructure project contract
A project record should link, as applicable:
1. Project proposal and appraisal.
2. Budget allocation and funding approval.
3. Land rights and site-access permissions.
4. Environmental and planning decisions.
5. Procurement process and contract award.
6. Approved contract, milestones and payment certificates.
7. Inspection findings and change orders.
8. Completion acceptance and outstanding defects.
9. Asset handover, maintenance ownership and lifecycle budget.
CivicOS must preserve separation of duties between project sponsors, procurement officers, evaluators, contract managers, inspectors and payment approvers where required by law or policy. Conflicts of interest and authorized exceptions must be recorded.
9. Inspection, enforcement and safety case management
Inspections must be structured records rather than free-text notes attached to a permit.
Required inspection record
Field	Requirement
Inspection ID	Unique, immutable identifier
Inspection type	Roadworthiness, engineering, safety, construction, operator or other configured type
Authority	Authorized institution, inspector and delegated powers
Target	Vehicle, operator, structure, site, vessel, aircraft or facility
Basis	Scheduled inspection, complaint, incident, statutory requirement or approved referral
Checklist	Versioned criteria applicable to the inspection
Findings	Individual observations with evidence and severity classifications
Evidence	Photographs, measurements, documents and witness statements, with provenance
Response	Operator or responsible party's explanation and submitted evidence
Outcome	Pass, conditional pass, remediation required, referral or other lawful result
Corrective action	Required action, responsible party, deadline and verification method
Closure	Authorized closure decision, evidence and timestamp
Enforcement safeguards
- An inspection finding is not automatically a final legal determination.
- Distinguish a reported concern, observed condition, technical finding and confirmed legal breach.
- A safety-critical defect may trigger an immediate restriction only when the applicable law authorizes it and required safeguards are followed.
- Record the precise legal basis, scope, start time, expiry or review requirements for any restriction.
- Provide required notices, response opportunities and appeal routes.
- Ensure inspectors cannot silently erase findings after a dispute or failed inspection.
- Preserve the original evidence and link any corrected report to the original version.
- Never use a model-generated risk score alone to impose a fine, revoke a licence, deny a permit or restrict movement.
10. Public portal and institutional workspaces
CivicOS should separate the citizen-facing experience from the authority's operational interface.
Citizen and business portal
Apply

Submit applications, renewals and permit requests.


My records

View authorized licences, applications and notices.


Appointments

Book available tests and inspections.


Report and appeal

Report defects, submit responses and initiate available reviews.


Institutional workspace
- Application queues and statutory deadlines.
- Assignment and workload management.
- Evidence review and authorized verification.
- Inspection scheduling, findings and corrective actions.
- Decision preparation, approval and notification.
- Register maintenance and record correction.
- Permit expiry, renewal and compliance monitoring.
- Audit history, service performance and operational reporting.

Accessibility and usability requirements
- WCAG 2.2 AA target, keyboard operation and screen-reader support.
- Mobile-first forms with save-and-resume for lengthy submissions.
- Plain-language instructions and specific error messages.
- Support for the nation's configured languages, including right-to-left layouts where needed.
- Accessible alternatives to online-only procedures where required.
- No reliance on color alone to indicate status.
- Clear explanations of required evidence, processing stages, applicable fees and review options.
- No external fonts, scripts or third-party resources that violate the sovereign deployment's security policy.
11. Security, privacy and AI governance
Access-control model
Access should be enforced through institution, role, record scope, purpose and action—not merely a broad “transport administrator” role.

Suggested permissions include:
- transport.application.read
- transport.application.submit
- transport.application.assess
- transport.licence.issue
- transport.register.correct
- transport.inspection.record
- transport.enforcement.recommend
- transport.enforcement.approve
- infrastructure.permit.assess
- infrastructure.permit.approve
- infrastructure.asset.manage
- transport.audit.read
These are permission identifiers for the proposed CivicOS implementation. Each country must map them to authorized offices, statutory roles and separation-of-duties rules.
Personal and sensitive data
- Restrict access to identity evidence, driving history, incident records and other protected information.
- Log restricted record access, including the actor, purpose and timestamp.
- Limit data exchanged between agencies to the authorized fields and purpose.
- Provide appropriate access, correction and review mechanisms.
- Configure retention and deletion schedules under applicable law, preserving records that must legally be retained.
- Keep public register disclosures separate from internal operational records.
- Apply emergency access controls where lawful, with enhanced audit and subsequent review.
AI assistance
AI may help with document extraction, application completeness, translation, routing, duplicate detection suggestions, maintenance planning and summarization.

AI must not independently:
- Grant or revoke a licence or permit.
- Make a final adverse eligibility decision.
- Determine guilt, liability or a legal breach.
- Authorize a dangerous vehicle, structure, vessel or aircraft to operate.
- Override a statutory decision-maker or an independent authority.
- Convert an uncertain prediction into a verified fact.
AI-generated outputs must be labelled, traceable to their source material and reviewable by an authorized person. Each country controls whether a given AI feature is enabled.
12. Country configuration and legal activation
Before any form can be activated in production, CivicOS must resolve the following configuration.
Configuration ID	Required country-specific decision
CFG-TRN-001	Competent authorities and statutory responsibilities
CFG-TRN-002	Licence classes, eligibility criteria and required examinations
CFG-TRN-003	Vehicle classifications, registration rules and inspection intervals
CFG-TRN-004	Transport operator classes, routes and operating conditions
CFG-TRN-005	Road jurisdiction, closure powers and excavation procedures
CFG-TRN-006	Maritime jurisdiction and vessel registration rules
CFG-TRN-007	Aviation jurisdiction and specialist approval interfaces
CFG-INF-001	Planning, construction and building-control requirements
CFG-INF-002	Environmental, land and utility prerequisite interfaces
CFG-INF-003	Approved fees, exemptions, deadlines and refund rules
CFG-INF-004	Inspection standards, enforcement powers and appeal routes
CFG-INF-005	Register ownership, disclosure rules and retention schedules
CFG-INF-006	Authorized signatures, seals, credentials and document verification
CFG-INF-007	Public notices, languages, accessibility and alternative service channels
CFG-INF-008	Emergency powers, temporary restrictions and mandatory review procedures
Each configured rule must include its source instrument, exact provision where applicable, jurisdiction, effective dates, rule version, confirming officials and approval history.

If a legal provision or delegated power is uncertain, the workflow must remain inactive or restricted to a clearly labelled non-binding preparation stage until the authorized officials resolve the uncertainty.
13. Engineering implementation plan
Implement the domain in layers, reusing the existing CivicOS architecture rather than creating isolated mini-applications.
01

Shared form and workflow engine

Implement typed form schemas, validation rules, draft persistence, evidence uploads, submission, workflow transitions and version history.


02

Authority and legal rules

Connect the institution registry, delegated authority, legal rule sets, approval requirements and separation-of-duties controls.


03

Sector registers and case management

Build driver, vehicle, operator, road asset, permit, inspection and infrastructure project records with stable identifiers and linked event histories.


04

Integration services

Connect approved identity verification, payment, document signing, notification, geospatial and specialist transport systems through versioned, permission-controlled interfaces.


05

Operational dashboards and national digital twin

Provide role-scoped work queues, inspections, project progress, asset conditions and approved public-service indicators.


Minimum engineering deliverables
1. Versioned form definitions for every activated catalogue entry.
2. A legal authority and country configuration registry.
3. Reusable workflow definitions and validated transition guards.
4. Authoritative register schemas and event-history rules.
5. A document and evidence service with access controls and provenance.
6. A permission matrix with separation-of-duties tests.
7. Audit events for all important reads, changes, approvals and decisions.
8. API contracts for authorized cross-institution exchange.
9. A geospatial data contract for infrastructure features and their authoritative records.
10. Automated tests, migration plans, operational monitoring, backup and recovery procedures.
11. Accessibility and localization test suites.
12. A production activation checklist that blocks unresolved legal configuration.
14. Acceptance gates
Part 9 is ready for controlled production activation only when the relevant tests pass.
- [ ] Legal authority: Every active workflow has a confirmed legal basis and responsible authority.
- [ ] Form integrity: Schema versions, required fields, validation rules and evidence requirements are reproducible.
- [ ] Workflow integrity: Invalid transitions and unauthorized decisions are rejected.
- [ ] Dual control: Where required, no individual can propose and confirm the same protected change.
- [ ] Register integrity: Transfers, corrections, expiry, suspension and revocation preserve history.
- [ ] Safety: Inspection findings, restrictions, corrective actions and appeals follow configured legal processes.
- [ ] Privacy: Unauthorized cross-institution access is blocked and restricted reads are auditable.
- [ ] Payments: Fees use approved tariffs, and payment status cannot substitute for legal approval.
- [ ] Geospatial accuracy: Data provenance, coordinate systems, timestamps and stale-data warnings are visible.
- [ ] AI governance: AI recommendations cannot independently execute prohibited legal or safety decisions.
- [ ] Accessibility: Forms and workflows meet the configured accessibility standard, targeting WCAG 2.2 AA.
- [ ] Production readiness: Sample records are excluded, integrations are verified and rollback/recovery procedures are tested.
A passing test suite alone does not establish legal readiness. Production activation also requires authorized institutional sign-off.
15. Definition of done for Part 9
Part 9 is complete when CivicOS can administer the configured transport and infrastructure services from application through decision, issuance, inspection, ongoing compliance, renewal, appeal and archival—while preserving the legal and operational history of each record.

The implementation must extend the existing shared architecture, not introduce a parallel permissions model, an independent case engine or a second source of truth for national records. Any existing sector panels that currently show generated sample data must be connected to real authorized workflows before being presented as operational government services.

Next: Part 10 of 13 — Public Safety, Police, Civil Protection, Emergency Management, Fire and Disaster Response. This will cover incident reporting, police case administration, emergency dispatch, fire safety, disaster declarations, evacuation coordination, rescue operations, emergency shelters and post-disaster recovery—with safeguards for civil liberties, evidence integrity and emergency powers.


CivicOS — Complete Government Form System
Part 10 of 13 — Public Safety, Police, Civil Protection, Emergency Management, Fire and Disaster Response
This part defines the forms, registers, case workflows, operational records and legal safeguards CivicOS needs to support public safety and emergency management.

The objective is to enable authorized institutions to coordinate incident response, record police cases, manage fire and rescue operations, issue lawful emergency measures, coordinate evacuations and shelters, and support recovery after disasters—without compromising civil liberties, evidence integrity, institutional independence or accountability.

The catalogue IDs are stable CivicOS identifiers, not claims that every form is legally mandatory. Each country must configure its own legislation, competent authorities, emergency powers, evidence rules, retention schedules, notification requirements and review procedures before activating the relevant workflows.
1. Scope and institutional architecture

A. Police and public safety

Incident reports, case registration, evidence handling, complaints against officers, property custody, lawful enforcement records and referrals to prosecution or independent oversight.


B. Emergency dispatch, fire and rescue

Emergency calls, dispatch, incident command, fire investigations, rescue coordination, hazardous-material response and after-action reviews.


C. Civil protection and disaster management

Risk assessments, emergency plans, alerts, evacuation orders, shelters, resource mobilization, disaster declarations and inter-agency coordination.


D. Recovery and public accountability

Damage assessments, relief distribution, recovery assistance, complaints, independent investigations and public reporting.


Institutional boundaries
Authority archetype	Typical responsibility
Police service	Public safety, incident response and investigations within lawful powers
Prosecution service	Independent prosecutorial decisions where assigned by law
Courts	Warrants, judicial review and other judicial decisions
Fire and rescue service	Fire suppression, rescue, technical response and applicable investigations
Civil protection agency	Preparedness, national coordination and disaster management
Emergency communications centre	Receiving emergency calls and coordinating dispatch
Public health authority	Public-health emergency assessment and response within its remit
Local government	Local emergency plans, shelters, evacuation support and recovery
Independent oversight body	Complaints, misconduct reviews or investigations under its mandate
Disaster coordination authority	Cross-agency coordination under an established legal framework
These are archetypes, not a prescribed constitutional structure. CivicOS must represent each institution's legal status, independence, powers and relationships explicitly. Police, prosecutors, courts, executive authorities and independent oversight bodies must not be collapsed into a single command hierarchy.
2. Master form catalogue
2.1 Police incidents and case administration
Form ID	Form or workflow	Primary outcome
SAFE-POL-001	Public incident report	Registered incident and triage
SAFE-POL-002	Police case registration	Formal case record and assigned unit
SAFE-POL-003	Witness statement record	Authenticated statement and provenance
SAFE-POL-004	Victim or affected-person statement	Restricted case record and support referrals
SAFE-POL-005	Suspected offence referral	Lawful assessment and referral
SAFE-POL-006	Missing person report	Missing-person case and authorized response
SAFE-POL-007	Found person or unidentified person report	Identification workflow with privacy safeguards
SAFE-POL-008	Lost or found property report	Property record and custody history
SAFE-POL-009	Police incident follow-up	Linked actions, updates and outcomes
SAFE-POL-010	Case transfer or jurisdiction referral	Authorized transfer with complete provenance
SAFE-POL-011	Case closure recommendation	Proposed disposition for authorized review
SAFE-POL-012	Case reopening request	Recorded basis and authorized decision
SAFE-POL-013	Public complaint against police	Complaint and independent or designated review
SAFE-POL-014	Police use-of-force report	Restricted incident record and mandatory review
SAFE-POL-015	Police property seizure record	Legal basis, inventory and custody history
SAFE-POL-016	Warrant or court-order execution record	Authenticated instrument and execution record
SAFE-POL-017	Arrest or detention event record	Legal basis, time, location and procedural safeguards
SAFE-POL-018	Release or transfer from custody	Authorized release or transfer record
SAFE-POL-019	Evidence submission to prosecution	Indexed evidence package and receipt
SAFE-POL-020	Police case disclosure request	Purpose- and authority-checked disclosure decision
A public incident report is not automatically a criminal case. A complaint is not proof of wrongdoing, an allegation is not a finding of guilt, and case closure is not necessarily a determination that no offence occurred.
2.2 Emergency calls, dispatch, fire and rescue
Form ID	Form or workflow	Primary outcome
SAFE-EMS-001	Emergency call record	Time-stamped call and triage record
SAFE-EMS-002	Emergency dispatch record	Unit assignment and dispatch history
SAFE-EMS-003	Multi-agency incident activation	Authorized shared incident workspace
SAFE-EMS-004	Incident command establishment	Recorded command structure and scope
SAFE-EMS-005	Fire incident report	Fire event, response and outcome
SAFE-EMS-006	Rescue operation record	Rescue actions and operational handover
SAFE-EMS-007	Hazardous-material incident report	Hazard classification, response and referrals
SAFE-EMS-008	Building evacuation report	Evacuation coordination and accountability
SAFE-EMS-009	Emergency medical response referral	Authorized referral to emergency medical services
SAFE-EMS-010	Emergency resource request	Requested personnel, equipment or supplies
SAFE-EMS-011	Fire investigation record	Findings, evidence and authorized conclusions
SAFE-EMS-012	Emergency scene handover	Responsibility transfer and outstanding risks
SAFE-EMS-013	Emergency service equipment inspection	Readiness findings and corrective actions
SAFE-EMS-014	Emergency service personnel availability	Operational availability and duty assignment
SAFE-EMS-015	Incident stand-down record	Authorized termination of operational response
SAFE-EMS-016	Emergency response after-action review	Lessons, assigned actions and completion tracking
2.3 Civil protection, disaster preparedness and response
Form ID	Form or workflow	Primary outcome
SAFE-DIS-001	National or regional hazard assessment	Risk register entry and mitigation actions
SAFE-DIS-002	Emergency preparedness plan	Approved, versioned response plan
SAFE-DIS-003	Emergency exercise plan	Exercise authorization and objectives
SAFE-DIS-004	Emergency exercise evaluation	Findings and improvement plan
SAFE-DIS-005	Disaster incident activation request	Assessment for activation under applicable rules
SAFE-DIS-006	Emergency declaration proposal	Decision package for the legally competent authority
SAFE-DIS-007	Emergency declaration decision	Authorized declaration, scope and validity
SAFE-DIS-008	Evacuation recommendation	Risk assessment and recommendation record
SAFE-DIS-009	Evacuation order or direction	Lawful, scoped and time-stamped order
SAFE-DIS-010	Emergency shelter activation	Shelter opening and responsible operator
SAFE-DIS-011	Shelter capacity and needs report	Capacity, service needs and resource requests
SAFE-DIS-012	Emergency supply request	Requirement, priority and fulfilment record
SAFE-DIS-013	Emergency logistics movement	Shipment, destination, custody and delivery
SAFE-DIS-014	Inter-agency assistance request	Assistance agreement and task assignment
SAFE-DIS-015	Disaster situation report	Verified status and unresolved information gaps
SAFE-DIS-016	Emergency alert authorization	Approved message, target area and distribution
SAFE-DIS-017	Emergency alert correction or cancellation	Corrected or withdrawn alert with audit trail
SAFE-DIS-018	Disaster declaration extension or termination	Review, extension or termination decision
SAFE-DIS-019	Emergency powers review	Legal review, compliance findings and required actions
SAFE-DIS-020	Disaster recovery transition	Handover from response to recovery operations
2.4 Recovery, relief and accountability
Form ID	Form or workflow	Primary outcome
SAFE-REC-001	Disaster damage assessment	Verified damage record and evidence
SAFE-REC-002	Affected household assistance application	Eligibility assessment for relief
SAFE-REC-003	Business recovery assistance application	Business impact and assistance decision
SAFE-REC-004	Emergency relief distribution record	Recipient, item, quantity and delivery evidence
SAFE-REC-005	Emergency expenditure record	Cost, authority, supplier and supporting evidence
SAFE-REC-006	Recovery project proposal	Project appraisal and authorization
SAFE-REC-007	Recovery project inspection	Delivery, quality and compliance findings
SAFE-REC-008	Disaster compensation claim	Claim assessment and authorized disposition
SAFE-REC-009	Emergency assistance reconsideration	Review of the original assistance decision
SAFE-REC-010	Disaster response complaint	Complaint, referral and resolution
SAFE-REC-011	Independent incident investigation referral	Evidence-preserving referral to the competent body
SAFE-REC-012	Post-disaster public accountability report	Approved expenditure and outcome reporting
2.5 Fire safety and community risk reduction
Form ID	Form or workflow	Primary outcome
SAFE-FIR-001	Fire safety inspection request	Scheduled inspection
SAFE-FIR-002	Fire safety inspection report	Findings and corrective actions
SAFE-FIR-003	Fire safety compliance certificate	Authorized certificate or refusal
SAFE-FIR-004	Fire safety improvement notice	Lawful notice with scope and deadline
SAFE-FIR-005	Fire safety restriction or closure order	Authorized, proportionate restriction
SAFE-FIR-006	Fire system maintenance record	Inspection, maintenance and test history
SAFE-FIR-007	Public assembly safety assessment	Event-specific safety review
SAFE-FIR-008	Community fire risk reduction proposal	Mitigation plan and responsible institution
All emergency and public safety forms must be connected to the applicable legal authority, records classification, review mechanism and audit policy before production activation.
3. Common emergency and public safety data contract
Every record must use a common case framework with domain-specific extensions. The system must support urgent reporting without requiring a caller or responder to complete a lengthy administrative form before action can begin.
Schema section	Required design
Identity	Immutable incident ID, case ID where applicable, record type and schema version
Time	Reported time, occurrence time if known, dispatch time, arrival time and time zone
Location	Reported location, verified location, coordinates where available, precision and source
Classification	Incident type, urgency, operational status and classification source
People	Caller, affected people, witnesses, responders and other roles, with appropriate privacy restrictions
Authority	Responsible institution, legal basis, jurisdiction and delegated powers
Actions	Dispatches, tasks, decisions, transfers, warnings, restrictions and follow-up
Evidence	Item identifier, source, collection time, collector, integrity checks and custody history
Resources	Personnel, vehicles, equipment, supplies, facilities and allocation records
Decision	Decision-maker, applicable rule, reasons, scope, conditions and effective period
Communication	Alerts, notices, recipients, channels, delivery status and corrections
Review	Supervisory review, independent oversight, complaints and appeal or reconsideration paths
Audit	Access, creation, modification, disclosure, approval and transfer events
Data integrity rules
- Preserve the difference between an allegation, an observation, a verified fact, an assessment and a legal finding.
- Do not require an exact address or verified identity before recording a credible emergency report.
- Represent unknown values explicitly; do not substitute invented names, locations or times.
- Record both the time an event reportedly occurred and the time CivicOS received the information.
- Keep corrections as new linked events, with the original preserved under the applicable retention policy.
- Restrict sensitive witness, victim, child, medical and operational information to authorized users.
- Support multiple incidents linked to one larger disaster without merging their individual histories.
- Permit urgent records to be created through an approved offline or manual fallback, with controlled synchronization and reconciliation.
Example typed incident schema
type IncidentStatus =
  | "reported"
  | "triaged"
  | "dispatched"
  | "responding"
  | "contained"
  | "resolved"
  | "closed"
  | "reopened";

type EvidenceConfidence =
  | "unverified"
  | "reported"
  | "corroborated"
  | "verified"
  | "disputed";

type SafetyIncident = {
  incidentId: string;
  schemaVersion: string;
  jurisdictionId: string;
  responsibleAuthorityId: string;
  incidentTypeId: string;
  status: IncidentStatus;
  reportedAt: string;
  occurredAt?: string;
  location?: {
    description?: string;
    latitude?: number;
    longitude?: number;
    precision?: string;
    source: "caller" | "responder" | "sensor" | "agency";
  };
  legalBasisId?: string;
  evidenceConfidence: EvidenceConfidence;
  linkedIncidentIds: string[];
  auditEventIds: string[];
};


This is a starting contract. Production implementation must add jurisdiction-specific validation, access classifications, retention policies and event-specific fields.
4. Emergency dispatch and incident command
4.1 End-to-end emergency response
1. Receive and record
   
   Capture the report, call-back details where available, reported location, incident description and uncertainty. Begin urgent triage without waiting for full identity verification.
2. Triage and classify
   
   Apply the country's approved dispatch protocol. Record the rule or protocol version and the human operator's actions.
3. Dispatch
   
   Assign authorized units, record acknowledgements, dispatch times and any declined or unavailable resources.
4. Respond and coordinate
   
   Track arrival, operational tasks, scene hazards, inter-agency requests and command arrangements.
5. Contain and hand over
   
   Record hazard controls, rescue completion, transfers to specialist services and outstanding risks.
6. Stand down and review
   
   Close or transfer the operational incident only when the required conditions are met. Trigger mandatory reviews, reports and follow-up actions.

4.2 Incident command record
The incident command workspace must capture:
- Incident objectives and operational priorities.
- The authorized incident commander and the scope of their role.
- Participating agencies and their designated liaison officers.
- Task assignments, acknowledgements, deadlines and completion evidence.
- Hazard assessments and changes in operational conditions.
- Resource requests, allocations and outstanding shortages.
- Public information approvals and the identity of the releasing authority.
- Command transfers, including the exact time and explicit acceptance by the incoming commander.
- Stand-down criteria and the final handover to the responsible institution.
Command is not a universal power. A fire commander, police supervisor, public-health official and civil protection coordinator retain only the powers granted by the applicable legal framework. CivicOS must not turn an incident coordination role into authority over independent institutions or powers that have not been delegated.
4.3 Resilience during outages
Emergency response cannot depend entirely on internet connectivity or the availability of the national digital twin.

The implementation must provide:
- A tested manual dispatch and incident-number fallback.
- Local operational continuity where required by the service.
- Controlled offline event capture and later synchronization.
- Conflict detection instead of silent overwriting of offline records.
- Explicit timestamps for both the original event and synchronization.
- A reconciliation queue for duplicate, conflicting or incomplete events.
- A documented procedure for restoring service and validating record integrity.
Life-critical dispatch functions must not be blocked because an optional external service, AI provider, identity system or map layer is unavailable.
5. Police cases, custody and evidence integrity
5.1 Case lifecycle
[Diagram styling from the chat window removed here. The diagram's state names, exactly as copied:]

ReportedTriageInformationGatheringReferredInvestigationSupervisoryReviewReferredToProsecutionClosedFurtherInformationRequestedProsecutorialDecisionReopeningReview


The state machine must be configurable. Police investigations, prosecutorial decisions and court proceedings are separate processes, even when linked by a common reference.

A police case must not be marked as a conviction merely because an arrest occurred, evidence was submitted or a prosecutor accepted a referral.
5.2 Evidence chain of custody
Every physical or digital evidence item should have:
Field	Purpose
Evidence ID	Stable identifier linked to the relevant case
Description and type	Identifies the item without presuming its evidential meaning
Source	Person, location, device, system or other origin
Collection details	Collector, method, date, time and legal authority where required
Integrity information	Hash, seal number or other appropriate integrity control
Custody events	Every transfer, receipt, opening, examination and return
Access restrictions	Authorized personnel and permitted purposes
Examination record	Method, examiner, tools and results
Dispute or limitation	Missing context, contamination concerns or disputed authenticity
Final disposition	Return, retention, transfer or destruction under applicable authority
For digital evidence, CivicOS must preserve original files or authorized forensic copies, relevant metadata, integrity hashes and tool or process provenance. A matching hash supports integrity verification but does not by itself establish authenticity, truth or admissibility.
5.3 Arrest and detention safeguards
Where CivicOS records arrest or detention, the workflow must capture the lawful basis, time, location, responsible officer, required notices, access to counsel where applicable, required medical or welfare checks, custody transfers and review deadlines.

The system must:
- Calculate applicable deadlines from the correct legal event and jurisdictional rules.
- Alert responsible officers and supervisors before deadlines expire.
- Escalate overdue events through authorized channels.
- Record release orders and other binding legal directions promptly.
- Support manual execution and later reconciliation during outages.
- Never delay a legally required release solely because a dashboard, integration or automated workflow is unavailable.
Warrants and court orders must be authenticated, checked for scope and validity, and linked to the relevant execution record. A message claiming that an order exists is not a substitute for the order itself.
5.4 Complaints and independent oversight
Complaints against police must have a dedicated pathway with appropriate separation from the subject of the complaint. The workflow should capture acknowledgement, conflict checks, jurisdiction, referral, evidence preservation, review milestones, outcome and any permitted reconsideration.

An officer or institution implicated in a complaint must not be able to erase it, silently reassign it to defeat oversight, or access restricted complainant information without authorization.
6. Disaster declarations, emergency powers and evacuation
6.1 Emergency declaration workflow
1. Situation assessment
   
   Assemble verified observations, reported impacts, uncertainty, affected areas and available resources.
2. Legal authority check
   
   Confirm the authorized declaring institution, triggering conditions, geographic scope, permitted measures and applicable time limits.
3. Prepare the declaration
   
   Record the proposed measures, rationale, evidence, affected population and consultation requirements where applicable.
4. Authorize and publish
   
   Obtain the required approval and publish or distribute the declaration through authorized channels.
5. Monitor and review
   
   Track the declaration's effective period, measures taken, rights impacts, exceptions and mandatory reviews.
6. Extend, amend or terminate
   
   Require a new authorized event for changes, preserve previous versions and notify affected parties as required.

6.2 Emergency powers register
CivicOS should maintain an explicit register of emergency powers rather than infer them from the existence of a declared disaster.

Each entry must identify:
- Legal instrument and exact provision.
- Authority empowered to invoke the measure.
- Required trigger and supporting evidence.
- Geographic and subject-matter scope.
- Permitted actions and prohibited actions.
- Commencement and expiry rules.
- Required legislative, judicial, administrative or independent oversight.
- Notification and publication obligations.
- Appeal, complaint and compensation pathways where applicable.
- Rules governing extension, termination and post-event review.
An emergency declaration does not automatically authorize every possible restriction. Each measure must be tied to a valid power and remain within its scope.
6.3 Evacuation workflow
The system must distinguish a risk assessment, a recommendation, a voluntary evacuation request and a legally binding evacuation order.

For a binding order, capture the issuing authority, legal basis, affected area, persons or premises covered, start time, review or expiry conditions, communication record and arrangements for people who require assistance.

The operational workflow should support:
- Accessible multilingual warnings.
- Evacuation zones and route updates.
- Transport assistance and designated reception points.
- Shelter capacity and accessible accommodation.
- Reunification and missing-person referrals with appropriate safeguards.
- Exceptions or special arrangements authorized under applicable law.
- Updates, cancellations and corrections to previous instructions.
Geospatial boundaries must have a version and source. If a mapped evacuation zone is uncertain or revised, CivicOS must make the uncertainty visible rather than silently replacing the original order's scope.
7. Emergency alerts and public communications
The alerting subsystem must support multiple communication channels while preserving authorization, message integrity and a record of what was sent.
Alert record contract
Field	Requirement
Alert ID	Immutable identifier
Issuing authority	Institution and authorized approving official
Alert category	Country-configured hazard or emergency category
Geographic scope	Versioned target area and source
Message	Approved text, translations and accessible variants
Effective period	Issue time, validity and update conditions
Approval	Required approvals and separation of duties
Distribution	Channels, transmission times and provider responses
Status	Draft, approved, issued, updated, cancelled or expired
Correction history	Links to previous versions and correction reasons
Audit	Author, approver, dispatcher and all material changes
Mandatory alert safeguards
1. Use an approved alert protocol appropriate to the hazard and jurisdiction.
2. Require authorized approval except where a specifically configured lawful emergency procedure permits immediate issuance.
3. Record the exact version of the message sent.
4. Distinguish successful transmission from confirmed receipt by a recipient.
5. Preserve the previous alert when issuing a correction or cancellation.
6. Avoid publishing personal details, sensitive shelter locations or operational information without authorization.
7. Provide accessible, concise instructions and identify the issuing authority.
8. Test the alerting system with clearly labelled exercises and prevent training messages from reaching the public accidentally.
No AI-generated message should be published automatically as an official emergency instruction unless a specific, lawful, tightly bounded automation has been explicitly approved and validated. The default design requires authorized human approval.
8. Emergency shelters, relief and logistics
8.1 Shelter operations
Each shelter record should include its responsible operator, location, operational status, usable capacity, accessibility, available services, safety conditions, supplies and last-updated timestamp.

The shelter workflow should track:
- Activation and authorized closure.
- Capacity and occupancy estimates with source and timestamp.
- Availability of accessible accommodation.
- Food, water, sanitation, electricity and essential supplies.
- Appropriate safeguarding and privacy arrangements.
- Authorized referrals to health and social care.
- Requests for additional staff or equipment.
- Transfers and reunification support.
- Incident reports, complaints and corrective actions.
Avoid collecting sensitive personal information from every shelter occupant by default. Record only what is needed for lawful service delivery, safeguarding and operational accountability.
8.2 Relief distribution
Every distribution event must connect the authorized relief programme, inventory source, delivery location, quantities, distribution time, responsible staff and delivery evidence.

For individual assistance, the eligibility decision must be distinct from the physical distribution event. Where identity documents are unavailable during an emergency, CivicOS should support a legally approved alternative verification procedure rather than automatically excluding affected people.
8.3 Emergency procurement and expenditure
Emergency procurement must remain traceable even when normal procurement timelines cannot be followed.

Record:
- The legal basis for using the emergency procurement procedure.
- The emergency need and decision-maker.
- Suppliers considered and the selection rationale.
- Conflicts of interest and approved exceptions.
- Purchase orders, contracts, deliveries and inspection records.
- Payments, adjustments, refunds and outstanding liabilities.
- Subsequent review or audit requirements.
Emergency status must not remove audit obligations or permit unrestricted spending. The applicable law determines the permitted exceptions and any retrospective approvals.
9. Recovery, compensation and public accountability
Disaster recovery needs a distinct case and project lifecycle. Closing an emergency incident does not mean recovery has been completed.
Recovery lifecycle
1. Damage assessment
   
   Record affected assets, households, businesses and public services, along with evidence, source and confidence.
2. Needs prioritization
   
   Assess urgent needs using approved criteria, with an accessible process for correcting incomplete or disputed information.
3. Assistance decision
   
   Apply the relevant legal eligibility rules and record the authorized decision, amount or support, conditions and review route.
4. Delivery and reconciliation
   
   Link payments, supplies, contractors and completed work to their authorized programme records.
5. Verification and audit
   
   Confirm delivery, inspect recovery work and identify duplicate claims or irregularities for review rather than automatic accusation.
6. Closure and lessons learned
   
   Record completion, unresolved claims, outstanding obligations and changes required in future preparedness plans.

Recovery integrity requirements
- Separate damage estimates from verified losses and approved compensation.
- Record whether each figure is observed, reported, estimated or independently verified.
- Avoid using disaster imagery or an address match alone as proof that an individual qualifies for assistance.
- Provide a review path for denied, reduced or delayed assistance where required.
- Preserve records needed for financial accountability and lawful claims.
- Ensure assistance records are not automatically shared with police or unrelated authorities without a valid legal basis.
- Publish only approved, appropriately aggregated public expenditure and recovery statistics.
10. National safety and disaster registers
Each register must have an explicitly assigned record owner and a defined source of authority.
Register ID	Register	Core relationships
REG-SAFE-001	Public incident register	Incident, location, response, classification and disposition
REG-SAFE-002	Police case register	Case, parties, evidence, referrals and case events
REG-SAFE-003	Evidence and custody register	Evidence item, collection, transfer, examination and disposition
REG-SAFE-004	Emergency dispatch register	Call, triage, unit, dispatch and response events
REG-SAFE-005	Fire and rescue incident register	Incident, command, actions, findings and review
REG-SAFE-006	Hazard and risk register	Hazard, affected area, likelihood or impact assessment, source and mitigation
REG-SAFE-007	Emergency plan register	Plan, version, approving authority, scope and exercise history
REG-SAFE-008	Emergency declaration register	Instrument, legal basis, geographic scope, validity and review events
REG-SAFE-009	Emergency alert register	Alert versions, approvals, distribution and corrections
REG-SAFE-010	Shelter and relief register	Facilities, capacity, inventory, distribution and operating status
REG-SAFE-011	Emergency resource register	Personnel, vehicles, equipment, availability and allocation
REG-SAFE-012	Disaster recovery register	Damage, assistance, projects, expenditure and completion
REG-SAFE-013	Public safety complaint register	Complaint, conflicts, assigned reviewer and outcome
REG-SAFE-014	Emergency powers and review register	Legal provision, authorized measures, review deadlines and closure
Register safeguards
- Restricted police and evidence records must not be exposed through general government-wide search.
- A public-facing incident map must not disclose victim identities, sensitive witness details or restricted operational information.
- Case identifiers must be stable and scoped to their issuing authority.
- Changes to evidence, declarations, alerts and custody records must create linked audit events.
- Transfers between institutions must record the sending authority, receiving authority, legal basis, transferred data scope and acknowledgement.
- Records from different countries or legal jurisdictions must not be merged solely because their names or identifiers appear similar.
11. Cross-institution coordination and lawful information sharing
CivicOS should provide a shared coordination workspace for authorized participants while keeping each institution's underlying records under its assigned authority.

For each cross-institution exchange, require:
1. A defined operational purpose.
2. An authorized sender and recipient.
3. A legal basis or approved information-sharing agreement.
4. A defined set of permitted data fields.
5. Classification and handling requirements.
6. A timestamped transfer record and acknowledgement.
7. Retention and onward-disclosure conditions.
8. A correction process when information is inaccurate.
9. An audit trail for access and subsequent disclosure.
A shared incident ID may link participating records, but it does not grant every participant unrestricted access to all information associated with the incident.

For example, a disaster coordination centre may need a fire service's incident status and resource request without needing confidential witness statements from a related police investigation.
12. Security, privacy, civil liberties and AI governance
12.1 Access control
Access should be based on institution, role, record scope, purpose and permitted action.

Proposed permission identifiers include:
- safety.incident.create
- safety.incident.triage
- safety.dispatch.assign
- safety.command.manage
- police.case.read
- police.case.update
- police.evidence.register
- police.evidence.transfer
- police.custody.record
- police.force.report
- safety.alert.prepare
- safety.alert.approve
- safety.declaration.propose
- safety.declaration.approve
- safety.emergency_power.review
- safety.relief.assess
- safety.recovery.audit
These are proposed technical permissions, not statutory powers. Country configuration must map them to authorized institutions, roles and legal provisions.
12.2 Civil liberties safeguards
- No general-purpose surveillance of the population should be enabled merely because CivicOS supports incident management.
- Surveillance, location tracking, interception and biometric identification require their own explicit legal authorization and strict purpose limitations.
- Political affiliation, lawful protest participation, religion or other protected characteristics must not be treated as evidence of criminality.
- Facial recognition or other biometric matching must not be used to make automatic adverse legal decisions.
- Police complaints, allegations and unproven intelligence must remain distinguishable from established findings.
- Emergency restrictions must be proportionate to the applicable authority, scope and duration.
- Provide appropriate correction, complaint, judicial review and independent oversight mechanisms.
12.3 AI assistance
AI may assist with call transcription, translation, incident summarization, duplicate report suggestions, resource-demand forecasting and drafting situation reports.

AI must not independently:
- Decide whom to arrest, detain, investigate or prosecute.
- Determine guilt or establish that a legal violation occurred.
- Authorize force, searches, detention or emergency restrictions.
- Issue an emergency declaration or binding evacuation order.
- Determine a person's credibility solely from language, emotion, accent or inferred characteristics.
- Deny disaster relief or compensation without the required lawful assessment and review.
- Override a competent incident commander, statutory decision-maker, prosecutor, court or independent oversight body.
AI-generated summaries must link to source records and preserve uncertainty, conflicting accounts and missing information. AI recommendations must be identifiable as recommendations, not silently inserted as verified facts.
13. Country configuration and legal activation
No emergency power, police procedure or compulsory measure should be activated based on a generic global template alone.
Configuration ID	Country-specific decision
CFG-SAFE-001	Police, fire, rescue and civil protection mandates
CFG-SAFE-002	Emergency call triage and dispatch protocols
CFG-SAFE-003	Incident classifications and reporting obligations
CFG-SAFE-004	Arrest, detention, custody, release and review requirements
CFG-SAFE-005	Warrants, court orders and their verification procedures
CFG-SAFE-006	Evidence collection, chain of custody and retention
CFG-SAFE-007	Police complaints, misconduct investigations and oversight
CFG-SAFE-008	Emergency declaration authority, triggers and limits
CFG-SAFE-009	Evacuation powers, notice procedures and review rights
CFG-SAFE-010	Emergency alert authorization and distribution rules
CFG-SAFE-011	Shelter operations, safeguarding and relief eligibility
CFG-SAFE-012	Emergency procurement and expenditure exceptions
CFG-SAFE-013	Cross-agency information-sharing agreements
CFG-SAFE-014	Privacy, surveillance, disclosure and retention rules
CFG-SAFE-015	Emergency powers review and termination procedures
CFG-SAFE-016	AI permissions, prohibited uses and human oversight
Each active rule must record the legal instrument, applicable provision, jurisdiction, effective period, authorized confirming officials and approval history. Where the law or delegated authority remains uncertain, the workflow must remain inactive for binding decisions.
14. Engineering implementation plan
Build Part 10 on the existing CivicOS institution registry, shared case engine, identity and access controls, audit chain, notification services and national digital twin.
01

Incident and case engine

Implement incident creation, triage, dispatch, assignments, linked cases, escalation, closure and reopening.


02

Evidence and custody service

Build evidence identifiers, integrity verification, controlled transfers, access logging and retention enforcement.


03

Emergency operations

Implement dispatch, command structures, resource requests, shelter operations, emergency alerts and multi-agency coordination.


04

Legal powers and decision controls

Connect declarations, evacuation orders, detention records, review deadlines and authorization checks to versioned legal rules.


05

Recovery and accountability

Connect damage assessments, relief applications, emergency spending, recovery projects, inspections and public reporting.


Required engineering deliverables
1. Versioned form definitions for every activated catalogue entry.
2. A country-specific emergency powers and legal authority registry.
3. Configurable dispatch and incident state machines.
4. Evidence and chain-of-custody schemas with integrity controls.
5. A role and permission matrix with separation-of-duties enforcement.
6. Secure cross-institution exchange contracts and access audit events.
7. Alert approval, correction, cancellation and delivery records.
8. Shelter, logistics, resource and relief-distribution workflows.
9. Tested offline and manual continuity procedures.
10. AI governance controls and tests for prohibited actions.
11. Data retention, disaster recovery, backup and restoration procedures.
12. Accessibility, localization and operational training environments.
13. Production activation gates and a documented rollback plan.
15. Acceptance gates
- [ ] Authority: Every active workflow is linked to a confirmed legal basis and competent institution.
- [ ] Emergency continuity: Dispatch and critical response remain usable during network or external-service outages.
- [ ] Evidence integrity: Every evidence transfer is attributable and auditable.
- [ ] Custody safeguards: Applicable deadlines, release instructions and required reviews are tracked and escalated.
- [ ] Independent oversight: Police complaints and other designated oversight cases cannot be silently suppressed by the institution under review.
- [ ] Emergency powers: Declarations and binding orders have defined authority, scope, duration and review requirements.
- [ ] Alert integrity: Only authorized messages can be issued through the production alerting service.
- [ ] Privacy: Restricted case and victim information is not exposed through general government search or public maps.
- [ ] Cross-agency exchange: Every transfer has a lawful purpose, defined scope and auditable recipient.
- [ ] Relief integrity: Assistance decisions, distribution events and payments remain distinct and traceable.
- [ ] AI safeguards: AI cannot independently perform prohibited police, judicial or emergency powers.
- [ ] Auditability: Material changes, approvals, access events and overrides are recorded in a tamper-evident audit chain.
- [ ] Production readiness: No simulated incidents, fictitious officials or invented operational statistics appear as live government data.
A passing software test suite does not establish legal readiness. The competent institutions must also approve the relevant procedures, legal mappings, operational fallback arrangements and oversight mechanisms.
16. Definition of done
Part 10 is complete when authorized institutions can coordinate the full lifecycle of public safety incidents and disasters—from initial report to response, evidence preservation, lawful decision-making, recovery and independent review—without losing institutional boundaries or the historical record.

The implementation must extend CivicOS's shared sovereign services rather than introduce a separate permissions system, duplicate institutional hierarchy or unrestricted national surveillance layer. Public dashboards must display only authorized information, and all operational figures must carry clear provenance.

Next: Part 11 of 13 — Defence, National Security, Intelligence Governance, Cybersecurity and Critical Infrastructure Protection. This will address institutional mandates, classified-information controls, security clearances, cyber incidents, threat assessments, critical infrastructure risk, protected reporting and oversight of national security powers—with strict separation of civilian government, independent oversight and classified operational systems.


CivicOS — Complete Government Form System
Part 11 of 13 — Defence, National Security, Intelligence Governance, Cybersecurity and Critical Infrastructure Protection
This part defines the forms, registers, approval workflows and governance controls CivicOS needs to support lawful national security administration, defence oversight, intelligence governance, cybersecurity coordination and critical infrastructure protection.

The objective is to enable authorized institutions to manage security mandates, assess strategic risks, coordinate cyber incidents, oversee classified programmes, protect essential services and document national security decisions—while preserving constitutional limits, civilian oversight, institutional independence and the confidentiality of sensitive information.

Architectural principle: CivicOS should govern the administrative and accountability layer around national security, not automatically become the operational command platform for intelligence collection, military targeting, covert operations or weapons systems. Classified operational systems may remain separate and exchange only specifically authorized information.

The catalogue IDs below are stable CivicOS identifiers. They do not imply that a particular institution or power exists in every country. Each jurisdiction must confirm its legal authorities, security classifications, disclosure rules and oversight arrangements before activation.
1. Scope and institutional architecture

A. Defence administration and civilian oversight

Defence policy, authorized programmes, readiness reporting, procurement oversight, expenditure accountability, personnel administration and legislative or independent review.


B. Intelligence governance and national security

Institutional mandates, authorization registers, classified assessments, information-sharing agreements, security clearances and oversight of sensitive powers.


C. Cybersecurity and digital resilience

Cyber incident reporting, vulnerability coordination, incident response, security assessments, recovery, supplier assurance and national cyber-risk reporting.


D. Critical infrastructure protection

Essential-service dependency mapping, risk assessments, resilience plans, continuity exercises, incident coordination and recovery assurance.


Institutional boundaries
Authority archetype	Typical responsibility
Defence ministry or department	Civilian defence policy, administration and authorized programme oversight
Armed forces	Military command and operations within constitutional and statutory authority
Intelligence service	Intelligence functions within its legally established mandate
National cybersecurity authority	Cybersecurity policy, technical coordination and applicable incident response
National security council or equivalent	Coordination within its legally defined mandate
Critical infrastructure regulator	Sector-specific resilience and compliance oversight
Data protection authority	Independent oversight of personal-data processing
Inspector general or independent inspectorate	Investigation and review within its mandate
Legislative oversight committee	Authorized scrutiny of security policy and expenditure
Court or judicial authorization body	Judicial authorization or review where required by law
These institutions must not be placed in one undifferentiated executive hierarchy. Judicial bodies, independent regulators, legislative oversight and other constitutionally independent institutions retain their own authority and access boundaries.
2. Master form catalogue
2.1 Defence policy, administration and oversight
Form ID	Form or workflow	Primary outcome
SEC-DEF-001	Defence policy proposal	Policy submission and authorized decision
SEC-DEF-002	Defence strategy review	Versioned strategy and approval history
SEC-DEF-003	Defence programme proposal	Programme appraisal and authorization
SEC-DEF-004	Defence readiness report	Restricted readiness assessment
SEC-DEF-005	Defence capability gap assessment	Documented gap and mitigation proposal
SEC-DEF-006	Defence expenditure authorization	Approved expenditure under applicable controls
SEC-DEF-007	Defence procurement oversight review	Compliance findings and required actions
SEC-DEF-008	Defence contract performance report	Contract milestone and performance record
SEC-DEF-009	Defence asset accountability record	Custody, lifecycle and stewardship record
SEC-DEF-010	Defence personnel administration request	Authorized administrative decision
SEC-DEF-011	Defence training programme approval	Approved training plan and resources
SEC-DEF-012	Defence exercise authorization	Exercise approval, scope and review
SEC-DEF-013	Defence cooperation agreement review	Legal, security and policy review
SEC-DEF-014	Defence incident administrative report	Restricted incident record and referrals
SEC-DEF-015	Defence programme audit referral	Authorized independent or internal review
SEC-DEF-016	Defence oversight recommendation	Finding, responsible authority and follow-up
These workflows cover governance and administration. They do not themselves authorize military action, weapons use or operational deployments unless a separate legally authorized system and process explicitly provides for that function.
2.2 Intelligence governance and classified information
Form ID	Form or workflow	Primary outcome
SEC-INT-001	Intelligence mandate register entry	Confirmed mandate and legal scope
SEC-INT-002	Intelligence activity authorization record	Record of required lawful authorization
SEC-INT-003	Intelligence assessment submission	Restricted assessment with provenance
SEC-INT-004	Intelligence product release review	Authorized disclosure or refusal
SEC-INT-005	Intelligence-sharing agreement	Approved scope, recipients and safeguards
SEC-INT-006	Classified information access request	Access decision under clearance and need-to-know rules
SEC-INT-007	Security clearance application	Vetting workflow and authorized outcome
SEC-INT-008	Security clearance review or renewal	Continued, varied or withdrawn authorization
SEC-INT-009	Classified information incident report	Restricted incident and containment workflow
SEC-INT-010	Intelligence record correction request	Controlled correction or linked annotation
SEC-INT-011	Sensitive authority expiry review	Review of an expiring or time-limited authorization
SEC-INT-012	Intelligence oversight inspection	Independent or designated compliance findings
SEC-INT-013	Intelligence complaint or protected disclosure	Restricted complaint and appropriate referral
SEC-INT-014	Intelligence retention review	Lawful retention, archival or disposition decision
SEC-INT-015	Declassification review request	Authorized review and release decision
SEC-INT-016	Intelligence information access audit	Review of access and handling compliance
CivicOS should record authorization metadata and accountability events where appropriate, without necessarily storing operational source identities, collection methods or sensitive raw intelligence.
2.3 National cybersecurity and incident response
Form ID	Form or workflow	Primary outcome
SEC-CYB-001	Cybersecurity incident report	Registered incident and triage
SEC-CYB-002	National cyber incident escalation	Authorized coordination and escalation
SEC-CYB-003	Vulnerability disclosure report	Restricted vulnerability case
SEC-CYB-004	Vulnerability remediation plan	Assigned corrective actions and deadlines
SEC-CYB-005	Security assessment request	Authorized technical assessment
SEC-CYB-006	Security assessment report	Findings, evidence and remediation recommendations
SEC-CYB-007	Data breach notification	Compliance assessment and notification workflow
SEC-CYB-008	Cyber incident containment record	Approved containment actions and impact
SEC-CYB-009	Cyber recovery and restoration record	Recovery verification and service status
SEC-CYB-010	Cyber incident evidence preservation record	Preserved evidence and custody information
SEC-CYB-011	Supplier security assessment	Supplier risk and remediation decision
SEC-CYB-012	Security exception request	Time-limited exception and compensating controls
SEC-CYB-013	Security exception renewal or revocation	Review and authorized disposition
SEC-CYB-014	Security incident postmortem	Root-cause analysis and follow-up actions
SEC-CYB-015	National cyber exercise plan	Approved exercise scope and safeguards
SEC-CYB-016	Cyber exercise findings	Lessons, owners and completion tracking
SEC-CYB-017	Security patch or remediation attestation	Verified remediation status
SEC-CYB-018	Cybersecurity compliance declaration	Authorized compliance submission
A vulnerability report must be restricted to appropriate recipients. The public or broadly accessible government portal must not expose exploitable details simply because an incident has been registered.
2.4 Critical infrastructure resilience
Form ID	Form or workflow	Primary outcome
SEC-INF-001	Critical infrastructure designation proposal	Designation assessment under applicable law
SEC-INF-002	Essential service dependency record	Documented service and dependency relationships
SEC-INF-003	Critical infrastructure risk assessment	Risk register entry and mitigation plan
SEC-INF-004	Infrastructure resilience plan	Approved continuity and recovery plan
SEC-INF-005	Continuity exercise authorization	Exercise scope and approval
SEC-INF-006	Continuity exercise evaluation	Findings and corrective actions
SEC-INF-007	Critical infrastructure incident notification	Restricted incident record
SEC-INF-008	Cross-sector infrastructure incident coordination	Authorized coordination record
SEC-INF-009	Essential service disruption report	Service impact, duration and restoration status
SEC-INF-010	Infrastructure recovery assurance	Verified recovery and residual risk
SEC-INF-011	Critical supplier dependency assessment	Supplier and concentration risk record
SEC-INF-012	Infrastructure security inspection	Findings, remediation and follow-up
SEC-INF-013	Resilience exception request	Approved exception and compensating measures
SEC-INF-014	Infrastructure risk acceptance	Authorized, scoped risk acceptance
SEC-INF-015	Infrastructure risk acceptance review	Reassessment and closure or renewal
SEC-INF-016	Critical infrastructure information release review	Controlled disclosure decision
The designation of an asset as critical infrastructure must be based on applicable law and approved criteria. A label in a national digital twin does not by itself create a legal designation.
3. Classified information and security classification
CivicOS must support a configurable classification system for each country. It must not assume that security labels, clearance levels or handling rules are identical across jurisdictions.
3.1 Classification and handling contract
Every classified or restricted record should define:
Field	Requirement
Classification scheme	Country-approved classification framework and version
Classification level	Authorized label from that framework
Originating authority	Institution responsible for the original record
Handling caveats	Approved distribution, dissemination or handling restrictions
Access requirements	Clearance, role, purpose and need-to-know conditions
Legal basis	Applicable authority for collecting, holding or sharing the information
Review date	Required classification or access review
Declassification rule	Applicable review criteria and authorized decision-maker
Retention	Approved retention and archival policy
Audit	Access, export, transfer, reclassification and disposition events
Classification must not be used as a substitute for defining the actual access policy. A record may also contain personal, legally privileged, commercially confidential or operationally sensitive information requiring additional controls.
3.2 Classification lifecycle
1. Create or receive: Record the origin, source, authority and handling restrictions.
2. Classify: Apply the approved classification scheme and record the authorized classifier or source designation.
3. Authorize access: Evaluate clearance where required, need to know, institution, purpose and the applicable legal restrictions.
4. Share securely: Transfer only the approved information to authorized recipients using approved channels.
5. Review: Reassess classification, access and retention when required by policy or a triggering event.
6. Declassify or dispose: Require the authorized decision, preserve the audit history and follow applicable archival or destruction rules.

3.3 Mandatory safeguards
- Deny access by default when the classification policy or recipient authorization cannot be verified.
- Do not assume that a government employee's general account grants access to classified information.
- Record both successful and denied access attempts where appropriate.
- Prevent unauthorized exports, bulk downloads and cross-classification transfers.
- Apply approved encryption, key management, identity assurance and endpoint controls.
- Prevent logs from exposing classified content or sensitive credentials.
- Preserve provenance when a classified report is summarized or redacted for a lower classification level.
- Treat declassification and downgrading as authorized decisions, not automatic consequences of age or inactivity.
- Maintain separate operational environments where required by national security policy.
Important architecture decision: If CivicOS's hosting environment is not accredited for a classification level, it must not store that class of information. It may hold approved metadata or a reference to a record in an accredited external system, provided even that metadata is permitted to reside in CivicOS.
4. Security clearances and personnel access
4.1 Clearance workflow
A clearance workflow should support:
1. Application or authorized sponsorship.
2. Identity verification and applicable consent or notice.
3. Legally permitted vetting checks.
4. Assessment by the competent security authority.
5. Decision, scope, restrictions and validity period.
6. Periodic review and event-triggered reassessment where lawful.
7. Renewal, variation, suspension or withdrawal.
8. Notification and applicable review or appeal procedures.
The clearance decision and the actual authorization to access a specific record are separate controls. A valid clearance alone must not grant access to every record at that level.
4.2 Access decision contract
An access request should be evaluated against the following dimensions:
- Is the user authenticated to the required assurance level?
- Is the user's clearance valid for the relevant classification?
- Is the user acting for an authorized institution?
- Does the user have a legitimate need to know this specific information?
- Is the intended purpose permitted?
- Are there additional compartment, source, jurisdiction or dissemination restrictions?
- Is the proposed action—read, edit, export, share or approve—authorized?
If any required condition fails, deny the operation and record an appropriate audit event without exposing protected information to the requester.
4.3 Personnel privacy and fairness
Security vetting is legally sensitive. CivicOS should not invent universal vetting criteria or treat automated flags as proof of untrustworthiness.
- Only authorized personnel may access vetting information.
- Separate raw checks from an assessor's conclusions and the final decision.
- Record the source, date and permitted use of each check.
- Provide correction and review procedures where required.
- Prevent protected characteristics or lawful political activity from being used as unauthorized decision criteria.
- Apply retention and deletion rules to vetting records.
- Do not allow a general HR administrator to access an entire security investigation merely because the person is an employee.
5. Cybersecurity incident management
5.1 End-to-end workflow
1. Receive and register
   
   Capture the reporting organization, affected service, discovery time, incident time if known, initial impact and evidence source.
2. Triage and classify
   
   Apply the approved incident taxonomy and determine whether notification or escalation thresholds may apply.
3. Contain
   
   Assign authorized responders and record containment actions, operational risks and approvals.
4. Investigate
   
   Preserve evidence, establish timelines, document uncertainty and link technical findings to their source.
5. Recover
   
   Restore affected services under approved procedures and verify integrity before declaring them operational.
6. Notify and coordinate
   
   Notify authorized regulators, affected institutions or other parties when required by law or approved incident procedures.
7. Review and improve
   
   Record root-cause findings, corrective actions, responsible owners and verification of closure.

5.2 Cyber incident record
Field	Requirement
Incident ID	Stable, unique identifier
Reporting organization	Authorized organization and reporting contact
Affected services	Identified systems, services and dependencies
Timeline	Discovery, report, containment, recovery and notification times
Severity	Result of the configured assessment methodology
Impact	Availability, integrity, confidentiality and service consequences
Evidence	Source, acquisition method, integrity and access restrictions
Actions	Containment, remediation, recovery and approvals
Notifications	Required recipient, legal basis, deadline and delivery status
Attribution	Unconfirmed, assessed or independently supported; never assumed
Closure	Residual risks, recovery verification and authorized closure
5.3 Cybersecurity safeguards
- Do not automatically attribute an attack to a state, person or organization based on an IP address, tool signature or model output.
- Separate technical indicators from confirmed incident facts and attribution assessments.
- Limit the visibility of exploitable vulnerabilities and detailed defensive configurations.
- Preserve original logs and relevant forensic evidence under an approved retention policy.
- Ensure containment actions cannot be initiated by an untrusted reporter without the required authorization.
- Record exceptions to standard security controls, their justification, expiry and compensating measures.
- Support confidential vulnerability disclosure and controlled coordination with affected suppliers.
- Prevent a public dashboard from disclosing information that would materially increase the risk of exploitation.
6. Critical infrastructure risk and resilience
CivicOS's national digital twin can help institutions understand dependencies among electricity, water, telecommunications, transport, health, finance and government services. This should be a controlled resilience model, not a public map of exploitable vulnerabilities.
6.1 Infrastructure dependency model
Each dependency record should capture:
- Service or asset identifier.
- Responsible institution or operator.
- Upstream dependencies and downstream services.
- Geographic coverage at an authorized level of detail.
- Service criticality and the approved basis for that classification.
- Failure scenarios and potential consequences.
- Existing safeguards and recovery options.
- Data source, last verification time and confidence.
- Access classification and disclosure restrictions.
- Recovery objectives where formally established.
6.2 Risk assessment
Risk records should distinguish:
- A hazard or threat hypothesis.
- An identified vulnerability.
- An observed incident.
- An estimated likelihood or impact.
- A verified consequence.
- An accepted residual risk.
- A corrective action and its completion evidence.
Risk scoring must use a documented methodology and version. A score is an analytical aid, not a legal finding or a substitute for the responsible authority's decision.
6.3 Resilience plan requirements
A resilience plan should identify:
1. Essential services and responsible operators.
2. Dependencies and single points of failure.
3. Prevention and detection measures.
4. Continuity arrangements and fallback procedures.
5. Recovery priorities and responsible decision-makers.
6. Required resources, supplier arrangements and communication channels.
7. Exercise schedule and evaluation criteria.
8. Residual risks and the official authorized to accept them.
9. Review triggers, such as significant system changes or incidents.
10. Corrective actions, deadlines and verification evidence.
Access to detailed dependency maps, security weaknesses and recovery procedures must be restricted to authorized users. Public reporting should disclose approved resilience indicators without exposing sensitive operational details.
7. Defence procurement, expenditure and programme accountability
CivicOS should provide a transparent administrative record of authorized defence spending without exposing classified operational details through ordinary financial dashboards.
7.1 Programme lifecycle
1. Programme proposal: Record objectives, strategic justification, responsible institution and expected outcomes.
2. Legal and financial review: Verify delegated authority, approved budget, procurement rules and any applicable security restrictions.
3. Authorization: Record the authorized decision, conditions, budget ceiling and approval history.
4. Procurement and contract award: Link the procurement record, supplier assessment, contract, conflicts-of-interest declarations and permitted exceptions.
5. Delivery and payment: Record milestones, acceptance evidence, invoices, authorized payments and contract variations.
6. Oversight: Provide appropriately cleared or legally authorized reviewers with the records needed for audit.
7. Closure: Record completion, outstanding obligations, asset accountability and required post-completion review.

7.2 Financial controls
- Separate budget authorization, procurement evaluation, contract management, delivery acceptance and payment approval where required.
- Use approved budget and tariff versions rather than hardcoded amounts.
- Link every material financial commitment to its authorization.
- Record contract variations, emergency exceptions and their approving authority.
- Preserve financial auditability when contract or supplier details must remain classified.
- Support authorized auditors' access to the necessary evidence without making the information publicly accessible.
- Distinguish a budget allocation, commitment, invoice, payment and accepted deliverable.
7.3 Restricted audit access
CivicOS should support an audited release or review process through which an authorized oversight body receives the information required by its mandate. The process must not allow the audited institution to unilaterally remove records from the oversight scope.

Where an oversight body's access is legally limited, those restrictions must be explicitly configured and attributable to the applicable law—not silently imposed by the system being audited.
8. National security directives and sensitive authorizations
Directives that affect national security, public institutions or protected information must be treated as controlled legal or administrative instruments, not informal messages.
Required directive record
Field	Requirement
Directive ID	Immutable identifier
Issuing institution	Authorized institution and office
Authority	Legal instrument, provision and delegated power
Scope	Institutions, subjects, actions and jurisdictions covered
Classification	Approved classification and handling rules
Approval	Required authorizations and confirmation records
Effective period	Commencement, expiry and review conditions
Recipients	Authorized recipients and distribution restrictions
Compliance	Required response, implementation record and exceptions
Review	Challenge, oversight or appeal mechanism where applicable
Audit	Issue, amendment, receipt, acknowledgement and termination events
Directive safeguards
- Verify the issuer's authority and the instrument's integrity.
- Distinguish a policy directive from a legally binding order.
- Do not assume that a directive from one institution binds an independent institution.
- Preserve the original version when issuing amendments.
- Record acknowledgement separately from agreement or compliance.
- Prevent expired or superseded directives from appearing current.
- Require a defined legal basis before creating a cross-institution obligation.
- Provide an authorized route to challenge, review or report an unlawful directive.
9. National security and cybersecurity registers
Registers must have explicit owners, permitted uses, retention rules and classification policies.
Register ID	Register	Core relationships
REG-SEC-001	Defence programme register	Programme, authority, budget, contract and oversight
REG-SEC-002	Defence asset accountability register	Asset, custodian, lifecycle and audit
REG-SEC-003	Intelligence mandate register	Institution, legal mandate, scope and review
REG-SEC-004	Sensitive authorization register	Authorization, approving authority, scope and validity
REG-SEC-005	Security clearance register	Person reference, clearance status, scope and expiry
REG-SEC-006	Classified record metadata register	Classification, origin, access policy and review
REG-SEC-007	Security exception register	Exception, rationale, compensating controls and expiry
REG-SEC-008	National cyber incident register	Incident, affected services, response and recovery
REG-SEC-009	Vulnerability coordination register	Vulnerability case, authorized recipients and remediation
REG-SEC-010	Supplier security register	Supplier, assessment, findings and corrective actions
REG-SEC-011	Critical infrastructure register	Designated service or asset, owner and legal basis
REG-SEC-012	Infrastructure dependency register	Dependencies, affected services and provenance
REG-SEC-013	Resilience plan register	Plan, owner, version, exercise and review
REG-SEC-014	Oversight findings register	Finding, independent reviewer, response and closure
REG-SEC-015	Protected disclosure register	Disclosure, restricted handler, conflict checks and outcome
REG-SEC-016	National security directive register	Instrument, authority, recipients and validity
Register integrity requirements
- Avoid creating a single unrestricted database of intelligence sources, personnel vetting details and operational vulnerabilities.
- Store only the metadata required for the register's authorized purpose.
- Use references to external accredited systems when the underlying record cannot lawfully or securely reside in CivicOS.
- Preserve stable identifiers and versioned events without exposing sensitive identifiers in public interfaces.
- Record classification changes, access decisions and disclosures.
- Ensure an audit log does not itself become a source of sensitive operational intelligence.
- Use cryptographic integrity controls and protected audit storage; a hash alone is not proof that the original entry was truthful or lawfully created.
10. Security architecture and technical controls
National security functions require stronger isolation and verification than ordinary administrative forms.
10.1 Identity and authorization
Implement:
- Strong authentication appropriate to the information classification.
- Role-based permissions combined with record, purpose and context restrictions.
- Explicit clearance and need-to-know checks where required.
- Separation of duties for sensitive approvals and protected changes.
- Short-lived, scoped service credentials and managed secrets.
- Controlled privileged-access workflows.
- Prompt access revocation when authorization expires or is withdrawn.
- Independent logging and review of privileged access.
10.2 Data protection and system boundaries
- Encrypt sensitive data in transit and at rest using approved cryptographic configurations.
- Keep keys under the required national or organizational control.
- Separate production, testing, training and development environments.
- Prevent classified production data from entering ordinary development tools, AI services, analytics exports or test fixtures.
- Apply data minimization to logs, telemetry, support tickets and crash reports.
- Use approved transfer gateways for cross-domain information exchange.
- Enforce schema validation and content inspection on imported records.
- Make the accreditation level and permitted data classes of each service explicit.
- Test backup restoration and incident recovery without relaxing classification controls.
10.3 Cross-domain information exchange
Where information must move between differently classified environments, use an approved cross-domain solution or other authorized transfer mechanism. Do not treat ordinary API authentication as sufficient authorization for a classification-boundary crossing.

Any transfer should record:
- Source and destination security domains.
- Approved transfer purpose and policy.
- Permitted fields and data classes.
- Required redaction or sanitization.
- Validation results and release authority.
- Transfer timestamp and receipt.
- Rejection or quarantine outcome.
- Audit reference and applicable policy version.
10.4 Cybersecurity incident resilience
CivicOS should have a security incident process for its own infrastructure, independent of the national cyber incident register it provides to other institutions.

That internal process should support credential compromise, unauthorized access, data exposure, integrity failures, service disruption, supply-chain incidents and recovery verification. It should include evidence preservation, incident communications, key rotation, containment, restoration and post-incident corrective actions.
11. AI governance and prohibited automation
AI can assist with analysis and administration, but national security decisions require explicit authority, careful evidence handling and human accountability.
Permitted assistance, subject to approval
- Summarizing approved reports and highlighting missing evidence.
- Translating and classifying documents for human review.
- Identifying duplicate incident submissions.
- Producing cyber incident timelines from authorized logs.
- Suggesting remediation tasks from approved findings.
- Forecasting infrastructure resilience needs using documented assumptions.
- Checking whether required fields and approval records are present.
- Preparing redacted summaries for an authorized reviewer.
Prohibited default behavior
AI must not independently:
- Authorize military operations or weapons use.
- Approve surveillance, interception, detention or other coercive measures.
- Grant, revoke or deny a security clearance as the final decision.
- Attribute a cyberattack to a specific actor as an established fact without the required assessment.
- Declassify sensitive records or release classified material.
- Issue binding national security directives.
- Accept material national security risks on behalf of an institution.
- Deny protected reporting, suppress oversight findings or determine that a complaint is unfounded without the authorized process.
- Transfer classified data to an external model that is not approved for that data class.
Each enabled AI capability must have a documented owner, permitted inputs, output classification, approved deployment environment, evaluation criteria, human-review requirements and audit policy.
12. Country configuration and legal activation
Before enabling Part 11 in production, each country must complete its own legal and security configuration.
Configuration ID	Required country-specific decision
CFG-SEC-001	Defence institutions, constitutional mandates and civilian oversight
CFG-SEC-002	Intelligence mandates and legally permitted activities
CFG-SEC-003	Classification levels and handling restrictions
CFG-SEC-004	Security clearance requirements and authorized vetting bodies
CFG-SEC-005	Sensitive authorization, expiry and review procedures
CFG-SEC-006	Intelligence-sharing agreements and permitted recipients
CFG-SEC-007	Independent, legislative and judicial oversight arrangements
CFG-SEC-008	Defence expenditure and procurement control requirements
CFG-SEC-009	Cyber incident reporting thresholds and notification deadlines
CFG-SEC-010	Vulnerability disclosure and coordination procedures
CFG-SEC-011	Critical infrastructure designation criteria
CFG-SEC-012	Essential service resilience and continuity requirements
CFG-SEC-013	National cryptographic and hosting accreditation requirements
CFG-SEC-014	Cross-domain transfer and information release rules
CFG-SEC-015	Protected disclosure, whistleblower and complaint protections
CFG-SEC-016	Data retention, archival, disclosure and destruction rules
CFG-SEC-017	AI permissions, prohibited uses and approved deployment environments
CFG-SEC-018	National security incident response and recovery responsibilities
Every rule must identify its legal source, relevant provision, jurisdiction, effective period, authorized approving institution and review history.

Where a mandate or authorization is uncertain, CivicOS must not infer permission from an institution's name, rank, classification label or possession of a user account. The relevant workflow must remain inactive for the disputed action until the competent authority resolves the issue.
13. Engineering implementation plan
Build Part 11 on CivicOS's existing institution registry, shared case engine, permission system, audit services and integration framework. Add specialized security controls rather than duplicating the platform's foundational architecture.
01

Security authority and policy engine

Implement explicit mandates, classification policies, access rules, clearance checks, time-limited authorizations and approval requirements.


02

Protected records and exchange gateways

Integrate appropriately accredited repositories, metadata registers, document verification and approved cross-domain transfer services.


03

Cybersecurity and resilience workflows

Implement cyber incident registration, vulnerability coordination, supplier assessment, continuity plans and recovery verification.


04

Defence financial and programme accountability

Connect authorized programmes, budgets, contracts, assets, expenditure and oversight findings while enforcing disclosure restrictions.


05

Independent oversight and audit

Provide legally authorized reviewers with protected access, immutable finding histories, conflict checks and tracked corrective actions.


Required engineering deliverables
1. Versioned schemas for every activated form and register.
2. A national security mandate and legal authorization registry.
3. A configurable classification and handling policy engine.
4. Clearance, need-to-know and privileged-access controls.
5. Auditable cross-domain information exchange.
6. Cyber incident, vulnerability and recovery workflows.
7. Critical infrastructure risk and continuity records.
8. Defence programme, procurement and expenditure audit relationships.
9. Independent oversight and protected disclosure workflows.
10. Approved hosting, cryptographic and key-management configurations.
11. Data retention, backup, restoration and secure-disposal procedures.
12. AI policy enforcement and tests for prohibited actions.
13. Security testing, incident exercises and production accreditation evidence.
14. A documented migration and rollback plan for each activated service.
14. Acceptance gates
- [ ] Legal authority: Every active workflow has a confirmed legal basis and responsible authority.
- [ ] Institutional independence: Courts, legislative oversight and independent regulators retain their configured independence and access boundaries.
- [ ] Classification: Records cannot be stored or processed in environments unauthorized for their classification.
- [ ] Access control: Clearance, need-to-know, purpose and action permissions are independently enforced.
- [ ] Cross-domain security: Transfers use approved controls and preserve release decisions and provenance.
- [ ] Audit integrity: Sensitive approvals, disclosures, privileged actions and policy changes are attributable and tamper-evident.
- [ ] Cyber resilience: Incident response, restoration and evidence preservation are tested.
- [ ] Critical infrastructure protection: Public interfaces do not reveal restricted vulnerabilities or sensitive dependencies.
- [ ] Financial accountability: Programmes, contracts, assets and payments remain traceable to approved authority.
- [ ] Independent oversight: Authorized reviewers can access the records needed for their mandate without the reviewed institution silently suppressing findings.
- [ ] AI governance: AI cannot independently execute prohibited military, intelligence, coercive or classification decisions.
- [ ] Production readiness: Security accreditation, recovery testing, retention controls and incident response arrangements are approved.
A software test passing does not establish that a national security system is accredited or legally authorized. Those approvals must come from the competent national authorities and relevant independent oversight bodies.
15. Definition of done
Part 11 is complete when CivicOS can support lawful security administration, cybersecurity coordination, infrastructure resilience and accountable defence governance without turning the platform into an unrestricted intelligence repository or a universal operational command system.

The architecture must preserve the distinction between:
- Administrative metadata and classified operational content.
- A security assessment and an established fact.
- A clearance and authorization to access a specific record.
- A national security policy and a binding legal instrument.
- A cyber incident report and verified attribution.
- Executive coordination and the independent authority of other constitutional institutions.
The production environment must contain no invented security clearances, fictitious threat intelligence or simulated incidents presented as live national records.
