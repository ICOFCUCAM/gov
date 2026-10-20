# Government operating model: agreed directions

Status: agreed record, October 2026. This is the reference every piece of
work on registers, casework, identity, exchange, records and the twin starts
from, so that no direction is lost between sessions. Nothing here is a
summary of something stated elsewhere in full: each direction is written out.

Sources it brings together:
- the owner's questions and decisions in this conversation;
- the code review recorded in `docs/GOVERNMENT_OPERATING_REVIEW.md`;
- the external architecture review (ChatGPT), kept in full in
  `docs/reviews/2026-10-external-architecture-review.md`, weighed against the
  code, the owner's decisions and `CLAUDE.md`.

Order of precedence when two directions meet: the rules in `CLAUDE.md`, then
the owner's decisions (§2), then this document, then the external review.
A change to any of them is recorded here in the same change.

Status words used below:
- **Agreed**: decided by the owner, or put to the owner and accepted.
- **Adopted**: recommended by the review, checked against the code and the
  rules, and taken on; the owner may still overrule it.
- **Qualified**: taken on with a stated change (§19 gives the reasons).
- **Open**: needs the owner's decision (§20).
- **Exists**: already built; the direction is to keep and extend it.

---

## 1. What CivicOS is

1.1 **Agreed.** CivicOS is meant to run the entire government of a country,
not only to observe it. Every plan is judged by that measure.

1.2 **Adopted.** Central proposition: CivicOS is the *sovereign operating and
oversight environment for government*, with shared national infrastructure and
independently governed agency systems; not one enormous application that
attempts to own every government transaction.

1.3 **Adopted.** The strongest version has five characteristics:
1. one coherent national experience for citizens, officials and institutions;
2. one reusable infrastructure foundation for identity integration, legal
   rules, records, workflow, signatures, payments, exchange and audit;
3. multiple authoritative domain systems with explicit ownership and
   specialised procedural logic;
4. a trustworthy national twin that derives its figures from traceable records
   and clearly identified estimates;
5. a country-controlled deployment in which the vendor provides software, not
   sovereign authority.

1.4 **Agreed.** Government runs on four layers and every design names which
layer it serves: (1) registers, who and what exists; (2) cases, what is being
done, decided by a named official under a cited law, documented, appealable;
(3) exchange, agencies asking each other; (4) oversight, dashboards, twin and
command centres computed from layers 1 to 3.

1.5 **Agreed.** The next stage is building a national transaction and records
infrastructure, not adding agency screens. The biggest risk is that the
product becomes visually complete before it becomes institutionally and
legally complete.

1.6 **Adopted.** Progress is measured by how many legally valid services work
end to end, not by how many ministries have a screen. One real, legally valid,
end-to-end service with excellent provenance, security and recovery is worth
more than ten simulated agency packs.

## 2. Owner decisions that remain binding

2.1 **Agreed.** Preservation doctrine (`CLAUDE.md`): nothing built is
deleted; every page, route, feature and screen is kept and upgraded in place;
redesigns keep every link, data source and action.

2.2 **Agreed (D8).** Each register has one owner. The platform owns records;
the Supabase substrate holds mirrors fed by the platform; `services/civic-api`
forwards writes to the platform and is kept fed (`lib/data/register-owners.ts`).

2.3 **Agreed (H-4).** Each nation's deployment has its own authorised national
administrator. Installation-level decisions (data export, agent credentials,
break-glass access, retention and waiver settings) are not available to
ordinary institutional officers. No central CivicOS operator or another
nation's administrator approves routine administration.

2.4 **Agreed.** Dual control means two different signed-in officials. Reads
are scoped to the official's institution. The first administrator needs the
one-time setup code.

2.5 **Agreed.** Sign-in is required on hosted deployments (Vercel). The
software must also run fully on one computer without any cloud
(`npm run self-host`, `docs/SELF_HOSTING.md`).

2.6 **Agreed.** AI is a per-nation opt-in, never part of the brand, and panels
say "AI" only when the model's answer arrived (`CLAUDE.md`, Branding and AI).

2.7 **Agreed.** Nothing invented is shown as fact; every figure says where it
comes from (`lib/twin/signal.ts`).

2.8 **Agreed.** Before outside advice is used, every point is checked against
this record, the code and the cited standards; what holds up is adopted and
disagreements are stated with reasons (`docs/GOVERNMENT_OPERATING_REVIEW.md` §7).

## 3. System of record: who owns what

3.1 **Adopted.** Every authoritative entity and record type has a named owner.
The twin, the shared workflow foundation and the agency modules must never
become competing sources of truth.

| Data or function | Authoritative owner |
|---|---|
| Birth and death registrations | Civil registration authority |
| National identity credentials | Designated identity authority |
| Company registration | Business register authority |
| Police investigation and evidence | Police authority under applicable law |
| Court proceedings and judgments | Judiciary or designated court authority |
| Immigration status | Legally designated immigration authority |
| Clinical records | Authorised healthcare provider or health-record authority |
| National indicators and estimates | Relevant statistical authority or designated data owner |
| National twin | Derived spatial and analytical representation, never a replacement for the source records |

3.2 **Adopted.** A source system may delegate hosting or technical operation;
legal ownership and responsibility remain with the named authority.

3.3 **Qualified.** Implementation: extend `lib/data/register-owners.ts` so
each register names both its *storage owner* (platform, substrate, external
system) and its *legal owner* (the authority, read from the nation's
deployment profile, §14). `register-owners.test.ts` keeps failing when a store
appears without an owner.

3.4 **Adopted.** CivicOS owns the shared governance and oversight capabilities
it actually operates. It does not claim ownership of external records merely
because it displays them; a record held in an external system (OpenCRVS,
DHIS2...) is shown with that system as its source.

3.5 **Agreed.** Today there are four separate casework mechanisms: permits
(`lib/data/store/permits.ts`), ministry task lists (`QueueItem`,
`lib/data/store/ministries.ts`, `lib/data/case-import.ts`), substrate work
items (`civicos.work_items`, Supabase only) and the browser-only
`RuntimeQueue` (`lib/gov/runtime-store.ts`). They are brought onto one
platform-owned workflow foundation (§5) with the substrate as a mirror; each
existing screen stays and becomes a view of it. **Open (§20.1)** for the
owner's final approval.

## 4. Shared core versus domain modules

4.1 **Adopted.** Shared core, built once: identity integration, legal register
and legal rules, documents and records, signatures, workflow primitives,
payments, exchange, audit, oversight.

4.2 **Adopted.** A common workflow *foundation*, not one universal case
application. Sharing workflow capabilities does not mean sharing one database,
one state machine or one authorisation policy.

4.3 **Adopted.** Domains and their treatment:

| Domain | Treatment | Why |
|---|---|---|
| Civil registration | Dedicated CRVS module on shared infrastructure (or OpenCRVS, §12) | Vital events, corrections, late registration, duplicate identities, legally significant certificates |
| Police | Dedicated incident, investigation and evidence module | Confidential informants, intelligence, evidence provenance, custody, investigative restrictions |
| Immigration | Dedicated border and immigration case module | Travel events, watchlists, identity matching, visa conditions, asylum safeguards, appeals |
| Courts | Dedicated court case management | Judicial independence, filings, hearings, procedural deadlines, judgments, appeals, enforcement |
| Tax | Dedicated tax domain module | Returns, assessments, liabilities, payments, reconciliation, penalties, statutory accounting |
| Customs | Dedicated customs module | Declarations, tariff classification, inspections, transit, seizures, duties, trade facilitation |
| Health | Dedicated clinical and public-health systems (DHIS2 and others, §12) | Clinical workflows, longitudinal records, confidentiality, health data standards |
| Education | Dedicated student and education management | Enrolment, attendance, grades, qualifications, school administration, academic histories |
| Licensing and accreditation | Shared workflow foundation, at least at first | Forms, evidence checks, fees, reviews, decisions, renewals, appeals |

4.4 **Adopted.** The shared foundation provides deadlines, assignment,
document references, notifications, approvals and appeal initiation. Each
domain module owns its own transitions and rules: the police module owns
investigative transitions and evidence rules; the court module owns judicial
proceedings and judgments.

4.5 **Qualified.** Modular first, not microservices: domain modules live in
the one application with enforced boundaries (each module owns its records and
store; other modules reach them only through its functions or the exchange
layer; a boundary test fails on direct access, as `federation-boundary.test.ts`
does for apps). A module is deployed separately only when risk, workload or
sovereignty demands it. This keeps one-computer self-hosting (2.5) working.

4.6 **Adopted.** Judicial independence: an executive ministry, and an
administrator of the installation, cannot alter a judge's case, judgment or
access rights because the ministry operates CivicOS. The judiciary controls
its case records, decisions and access rights. Executive dashboards do not
expose confidential pleadings or unredacted judgments because a case exists.
Implementation builds on the branch model already in `lib/gov/constitution.ts`
and `lib/gov/branches.ts`.

4.7 **Adopted.** Records are never forced into one universal schema, even when
a small country runs several domain modules on one workflow runtime.

## 5. Workflow foundation

5.1 **Adopted.** A status label is not a record of a real-world event. Every
status transition is an authorised action carrying the required evidence,
timestamps and an auditable reason.

5.2 **Agreed.** Each case has: the applicant or subject (person or
organisation reference), documents, notes, a written decision with reasons,
legal deadlines, an appeal path, and the legal basis cited on the decision.
Today a `QueueItem` has none of these (`lib/api/types.ts`), and the ministry
task-list actions are only assign, escalate and clear.

5.3 **Adopted.** Every production workflow is bound to a versioned *legal and
policy package* (§7) defining: permitted actions; the responsible authority;
required evidence; decision criteria and discretionary steps; mandatory
approvals; legal deadlines and how they are calculated; notifications and
service requirements; appeal rights and their effects; retention and
disclosure restrictions; effective dates and migration rules.

5.4 **Adopted.** A new legally consequential workflow version cannot be
activated until the designated legal authority approves it (named official,
audited). A configuration file never silently changes the meaning of a
statutory rule.

5.5 **Adopted.** A case keeps its citation of the law version that applied on
the decision date, even after the legislation changes.

5.6 **Agreed.** Four-eyes approval wherever the law requires it, by two
different signed-in officials (2.4), recorded immutably.

5.7 **Exists.** Building blocks to reuse: the substrate's stage validation and
signed step history (`civicos.work_item_steps`, `transition_work_item`), dual
control (`lib/data/dual-control.ts`), the four-eyes patterns of the facility,
parcel and site-editorial registers, case import and connected case systems
(`lib/data/case-import.ts`), the messaging outbox for notifications.

5.8 **Adopted.** Replay and duplicate protection: a repeated request never
creates a duplicate registration, payment or decision (idempotency keys on
every create).

5.9 **Adopted.** Concurrent changes to an authoritative record are detected
and refused or surfaced (version check on write), never silently overwritten.

## 6. Registers

6.1 **Agreed.** Base registers to build: people (civil registration),
organisations (companies, NGOs, universities and other regulated bodies),
vehicles, laws and regulations. Places, land parcels, boundaries and physical
sites already exist (**Exists**) and are kept.

6.2 **Adopted.** Three different functions, linked but never interchangeable,
each with its own records and permissions:
1. civil registration: legally registered vital events and relationships;
2. population register: the person records national law requires;
3. electronic identity and authentication: how a person proves control of an
   identity or credential.

6.3 **Adopted.** Not every person has a national ID at birth; birth
registration and national identity issuance may be separate legal processes.

6.4 **Adopted.** Identifiers: internal, jurisdiction-specific person
identifiers; domain-specific identifiers for agencies; minimal identity claims
in tokens; a protected identity-resolution service for authorised linkage. No
universal identifier copied into every store.

6.5 **Adopted.** Identity risks designed against: treating a biometric match
as conclusive legal identity; merging two different people; duplicates from
spelling variants or weak source data; one identity provider authorising every
action; a universal identifier exposing cross-agency links; credentials that
cannot be replaced, revoked or recovered; biometric enrolment where unlawful,
inaccessible or disproportionate; a platform unusable without a smartphone or
stable internet.

6.6 **Agreed.** Organisations register: each regulated organisation is a
record with its standing (applied, granted, renewed, suspended, revoked),
every version kept, four-eyes on grants, suspensions and revocations,
following the facility register's pattern (`lib/data/facilities.ts`).
Organisations link to the facility register (a university's campuses are
registered sites) and become twin entities.

6.7 **Agreed.** Each ministry's public site can show its own register (for
example "Is this university accredited?") through the public-sites record
system, never typed into a page (`CLAUDE.md`, Public websites).

6.8 **Adopted.** Duplicate or conflicting registries are prevented by domain
ownership, identifiers, matching procedures, correction workflows and
authoritative-source rules.

## 7. Laws register and legal rules

7.1 **Agreed.** Every legally significant decision cites the precise
provisions that authorised it, as they applied at the time. Directives today
have no legal-basis field (`lib/data/directives.ts`); they gain one.

7.2 **Adopted.** The laws register is a versioned, jurisdiction-aware legal
information system, not a folder of PDFs or a list of titles. Minimum model:

| Entity | Minimum fields |
|---|---|
| Legal instrument | Stable ID, official title, instrument type, jurisdiction, issuing authority, official source |
| Version | Version ID, text, language, publication reference, amendment history, cryptographic digest |
| Provision | Stable provision ID, article/section/paragraph numbering, text, hierarchy, version relationship |
| Legal dates | Adoption, assent or promulgation, publication, commencement, expiry and repeal dates |
| Applicability | Territorial, personal, subject-matter and transitional scope |
| Relationships | Amends, repeals, replaces, implements, cites, depends on |
| Decision citation | Instrument and provision IDs, exact version, relevant date, decision context, interpretation used |
| Legal interpretation | Author, authority, date, status, relationship to judgments, regulations or guidance |

7.3 **Adopted.** The register distinguishes: date enacted or adopted; date
officially published; date in force; date it ceased to apply; the version in
force on the date of an event or decision; the version in force now. A
`current = true` flag is insufficient. This matches the twin's two time axes
(when true, when known) and reuses the same as-of thinking.

7.4 **Adopted.** Standards: Akoma Ntoso / LegalDocML for structured texts; ELI
as the model for identifiers and metadata where a jurisdiction adopts it;
W3C PROV-O for provenance (already used by the twin, `lib/twin/prov.ts`);
ISO 8601 dates; digests and trusted signatures. The internal model is
independent of any one serialisation; import and export in those formats.

7.5 **Adopted.** A separate *legal rules registry*: versioned, human-approved
operational rules with their legal references, the date they apply from, the
tests validating them and the official who authorised publication. Workflow
packages (5.3) cite these rules.

7.6 **Agreed with 2.6.** AI may help extract articles, find amendments and
suggest citations; it never decides that a law is authoritative or produces a
binding interpretation. Legal officers validate content and applicability.

7.7 **Agreed.** Laws are entered by the nation, never invented or seeded as
fact (2.7).

## 8. Identity, authority, delegation and access

8.1 **Adopted.** Every request answers four separate questions, enforced in
the backend: identity (who), authority (what they may do, legally and
organisationally), record (which data they may read or change), execution
(which validated operation, producing what evidence).

8.2 **Adopted, changes current behaviour.** An administrator does not
automatically gain the authority to issue a visa, alter a judgment or view
every police file. Today `roles.ts` says an administrator "can do everything
an official can". Domain decisions will require the domain authority (the
institution and an assignment or appointment), not the administrator role.
Installation-level decisions stay with the national administrator (2.3).

8.3 **Qualified.** Role-based plus attribute-based authorisation (agency,
unit, role, case assignment, record sensitivity and legal classification, the
action: view, search, export, amend, disclose, delete; legal purpose; special
or emergency approval), kept in the one rule set `lib/auth/roles.ts` as
`CLAUDE.md` requires. No second permission system and no XACML engine (§19).
The unused `shared/permissions/rbac.ts` is folded into it or marked retired.

8.4 **Adopted.** Access is enforced at the API and data layer, never by hiding
buttons.

8.5 **Adopted.** Sensitive actions require step-up authentication (the second
sign-in step exists, `lib/auth/totp.ts`, passkeys), dual control where the law
requires it, and an immutable record of the approval.

8.6 **Adopted.** Representation: explicit, revocable delegation records (a
director authorises an employee to file for a company). Authentication proves
who the person is; the delegation decides whether they may act.

8.7 **Adopted.** Identity integration by situation:

| Existing situation | Approach |
|---|---|
| Mature national eID and reliable population register | Integrate both through documented APIs and legal agreements |
| Population register exists, eID weak | Integrate the register; improve authentication and credential issuance separately |
| Civil registration exists, population register incomplete | Improve registration and identity resolution; offer accessible interim authentication |
| Neither exists reliably | Establish legally grounded civil registration and identity governance first, then phase in eID |
| Weak connectivity or large unregistered populations | Assisted registration, offline-capable workflows, alternative lawful identity evidence |

8.8 **Adopted.** Lack of a digital identity is never an automatic barrier to
birth registration, emergency services, asylum access or other essential
rights.

8.9 **Adopted.** How the pieces fit: MOSIP (or the country's own system) as
identity infrastructure; an OIDC identity provider for authentication
(officials already sign in through OIDC, `lib/auth/oidc.ts`; citizens will
too); CivicOS decides authorisation and delegation; W3C Verifiable Credentials
2.0 optionally for verifiable licences, qualifications and attributes.

8.10 **Agreed.** Citizen sign-in today is a demo (`/login` sets
`civicos_session=demo`, a hard-coded citizen). It is replaced by real
sign-in through the nation's identity provider; the demo stays only in demo
and training installations (§10).

## 9. Records, documents, signatures and evidence

9.1 **Adopted.** The audit log is necessary but is not records management. A
tamper-evident log shows what the system recorded and whether that history
was altered; it cannot show that the original entry was true.

9.2 **Adopted.** To add: append-only decision and event histories; versioned
documents and signed document manifests; records classification and
access-control metadata; retention schedules, legal holds and disposition
workflows; trusted timestamps and signature-validation evidence; evidence
provenance and chain of custody; controlled correction and supersession;
archival export and long-term preservation; independent audit verification
(audit witnesses exist).

9.3 **Adopted.** Signatures and audit logs are different things and both are
needed. Decisions, certificates and directives get real cryptographic
signatures under the nation's signature law and trust framework. Today
`/api/signatures` returns a plain hash, `/api/documents/verify` accepts any
code starting `VC-`, directive "sign" is a status change, and substrate step
signatures use a browser key with a hash fallback; all are upgraded in place.

9.4 **Agreed.** Certificates (registration, licence, accreditation) can be
verified by anyone: a public check page and a code on the certificate, served
through the public sites under the existing rules.

9.5 **Adopted.** Retention: a legally approved schedule per record class;
legal holds suspend disposal; expired records do not stay accessible because
storage is cheap; deletion never destroys records under hold or required
evidence; an auditable record of each authorised disposition is kept without
keeping the sensitive content forever. Extends `lib/data/retention.ts` (today
personal data of permits and cases only).

9.6 **Exists.** Backups are encrypted, verified and restored only under
`lib/data/backups.ts` and the rules in `CLAUDE.md`.

## 10. Real records versus samples and simulation

10.1 **Agreed.** Most agency screens today show simulated data from seeded
engines (`lib/gov/*`, `seed()`/`wave()`). Every screen is kept (2.1); each
switches to real records when its module exists, and until then is clearly
marked as simulation.

10.2 **Adopted.** Demo and training installations carry a persistent
environment label visible on every screen.

10.3 **Adopted.** Synthetic seed data cannot enter a production installation's
records. **Open (§20.5)**: this changes the current rule in `CLAUDE.md` that
example cases are kept "except at an official's request"; proposed: a
production installation starts with no sample records at all, demo and
training installations keep them, marked.

10.4 **Adopted.** A simulation never generates an official case, certificate
or government decision.

10.5 **Agreed.** The browser-only stores (`runtime-store`, `records-store`,
`enrollment-store`, `referral-store`, `encounter-store`, `dispatch-store`)
are demo mechanisms; their real counterparts are platform records.

## 11. The twin and provenance

11.1 **Agreed.** The twin is the oversight layer. It derives its picture from
registers and cases; it does not hold the government's business and does not
create authoritative facts by interpreting dashboards, estimates or AI output.

11.2 **Agreed.** The twin today holds numbers only (entities: nation, place,
institution, facility). It gains: registered organisations as entities; status
facts (standing of a licence or accreditation) on the same two time axes;
relationships (campus of, accredited by).

11.3 **Adopted.** Provenance contract. Each observation or indicator carries,
directly or through linked metadata:

| Field | In the twin today |
|---|---|
| value and unit | yes (UCUM units) |
| metric definition version | partly (registered metrics, `lib/twin/metrics.ts`); version to add |
| geographic and institution scope | yes (entity, parent) |
| source system and source record or event references | source and run; record references to add |
| observed at (when true) | yes, `validFrom`/`validTo` |
| recorded at (by the source system) | to add |
| ingested at (by CivicOS) | yes, `recordedAt` (to be named as such in the contract) |
| method (direct observation, administrative count, statistical estimate, model output, simulation) | partly (`SignalKind`); to add per observation |
| coverage | partly (`regionCoverage`); to add per figure |
| quality status and limitations | yes (`quality`: provisional/final/revised, standard error, interval) |
| transformation version and calculation lineage | partly (derived metrics, PROV); version to add |
| scenario id and model version | yes for scenarios (`lib/twin/scenarios.ts`, versions with SHA-256) |
| supersedes or correction reference | partly (withdrawn runs, `supersededAt`) |

11.4 **Adopted.** Evidence classes shown to every viewer: (1) authoritative
administrative record, (2) observed or reported measurement, (3) estimate or
forecast, (4) simulation or scenario. Today's `SignalKind` (observed,
reported, modelled, sample, unavailable) gains *authoritative record* and
separates *estimate* from *simulation*; the existing markers (`SignalTag`)
carry them. Authoritative does not mean infallible: corrections keep history.

11.5 **Adopted.** For every significant figure a minister sees: the number and
unit, its evidence class, reporting period and freshness, source and coverage,
quality warnings, and a way for authorised users to inspect the lineage.
Figures of different classes are never merged into one unlabelled total.

11.6 **Adopted.** Technical rules: every aggregate keeps its calculation
definition and source lineage; dashboards show stale-data and
incomplete-coverage warnings; missing data stays missing, never zero (a
national figure is shown only when every region reports it, **Exists**);
corrected source records trigger controlled recomputation and traceable
revisions; historical dashboards reproduce the methodology and source versions
used at the time; conflicting records are exposed as conflicts, not resolved by
"last write wins".

11.7 **Qualified.** The twin's same-timestamp rule (later import wins,
`stateAsOf`) stays for statistical revisions from one source, where a later
release is the publisher's correction. For authoritative records and for two
different sources reporting the same fact, conflicts are surfaced and resolved
by a named official, never by timestamp ordering.

11.7a **Adopted.** Evidence classes and quality thresholds are set with the
national statistics office and the relevant agencies.

## 12. External systems: integrate rather than rebuild

12.1 **Adopted.** CivicOS is also an integration and orchestration platform
that can adopt existing domain systems; it does not rewrite every public-sector
application. One trusted entry point for citizens; behind it, a record may
live in another system.

12.2 **Qualified.** Each domain has one interface (a port) with two kinds of
implementation: CivicOS's own module, and connectors to external systems. A
nation without an external system, a small nation or a one-computer
installation still has a working module; a nation with one connects it. The
nation's deployment profile names which is authoritative.

12.3 **Adopted.** Systems to evaluate first, against the country's needs:
- civil registration: OpenCRVS (high priority);
- digital identity: MOSIP;
- exchange: X-Road (deploy directly or implement compatible patterns; do not
  build a proprietary gateway before showing why X-Road is insufficient);
- health information: DHIS2 (not a replacement for hospital clinical systems);
- social protection: OpenG2P or OpenSPP, compared, not both by default.

12.4 **Adopted.** Police, courts, tax, customs and immigration: no system is
chosen only because it is open source. Assess existing national systems first,
then specialist products, against: legal and procedural coverage; evidence
handling and auditability; data ownership and exportability; national hosting
and key control; localisation, language and offline capability; integration
APIs and standards; security maintenance, release governance and support;
total cost of implementation and operation. Courts: no system is chosen before
judicial governance, record ownership and independence are reviewed.

12.5 **Adopted.** Before choosing any product: verify release maturity,
interfaces, security posture, licence, deployment requirements and local
support. The reviewer did not audit them.

12.6 **Agreed with `CLAUDE.md`.** Every connector fetches only through the
server's safe fetch, to the configured host, and adds or updates its entry in
`docs/INTEGRATION_REGISTER.md` in the same change.

## 13. Exchange between agencies

13.1 **Adopted.** A federated, policy-enforcing exchange layer. No national
data lake and no central API copying every ministry's records.

13.2 **Adopted.** Minimum components: institutional registry and trust (agency
legal identity, permitted services, owners, certificates, contacts); agency
gateway (authenticate the caller, validate credentials, transport security,
service policy, record each request and response); authorisation and
legal-purpose policy; service directory and versioned contracts (schemas, data
classifications, allowed callers, owners, availability, deprecation);
tamper-evident transaction evidence (requester, provider, service, purpose,
time, result, policy outcome, correlation ID; sensitive payloads protected
separately); reliability (timeouts, idempotent retries, rate limits,
revocation, health monitoring, queueing, recovery).

13.3 **Adopted.** Never skipped: legal authority per service; provider-side
authorisation (the source agency enforces its own rules, the gateway is not the
only check); a human official, an agency, a service account and an automated
process are distinguished; purpose limitation and data minimisation; replay
and duplicate protection; schema and contract versioning; key and certificate
lifecycle (issue, rotate, expire, revoke, emergency recovery); denials audited
as well as successes; independent operational monitoring; a safe failure mode
(an outage never authorises an action or fabricates a record).

13.4 **Adopted.** Three kinds of exchange: synchronous query to the
authoritative provider; asynchronous events (event ID, source, subject
reference, event time, publication time, schema version, correction and
supersession); signed document exchange for legal or evidentiary packages.

13.5 **Adopted.** The event bus is never the source of truth; consumers
reconcile their projections against the authoritative record; delivery may be
duplicated, delayed or reordered.

13.6 **Adopted.** First services: verify a person reference, verify a company
registration, notify an authorised subscriber that a birth was registered.
More only after authorisation, audit, failure and recovery controls pass tests.

13.7 **Exists.** To build on: integration keys, mutual TLS, ODRL usage policy
and signed exchange receipts (`/api/federation/exchange`, `lib/exchange/*`);
feed signing keys with HTTP message signatures; the CloudEvents outbox and
signed webhooks (`lib/events/*`, `docs/ASYNCAPI.yaml`); federation grants. The
gap: the exchange returns allow or deny and carries no data.

13.8 **Adopted.** No cross-country data exchange unless expressly authorised
by the participating countries (federation grants already require it).

## 14. Country deployment profile

14.1 **Adopted.** The deployment profile is a first-class object defining:
jurisdiction and legal framework; terminology, languages and calendars;
enabled agencies and modules; authoritative registries and their owners;
identity and trust providers; data residency and key-management policy; legal
workflow and retention configurations; authorised exchange relationships;
national reporting definitions; operational and disaster-recovery requirements.

14.2 **Exists.** Parts already present to extend, not duplicate:
`SovereignProfile` (`lib/api/types.ts`: state form, languages, regions,
currency, AI choice, domain, map, constitution), the nation registry
(`lib/nation/registry.ts`), setup (`/setup`, `/gov/configuration`), the Nation
Pack plan (`docs/NATION_CONVERSION_MANIFEST.md`), the Update Center's
per-nation customisations and readiness preflight.

14.3 **Adopted.** Upgrading the common software never overwrites a country's
legal rules, data or institutional configuration (the Update Center's
preflight and probation already guard installs).

14.4 **Adopted.** One codebase for every country; no assumption that one
tenant configuration safely separates countries with different legal and
security requirements (each nation runs its own installation, **Exists**).

## 15. Privacy and legal safeguards for police and immigration

These are production prerequisites, not enhancements. **Adopted** in full.

15.1 Access control: role plus attributes (8.3); a police officer reaches an
assigned investigation without searching every police record; a border
official verifies a travel document without seeing a claimant's confidential
asylum interview; enforced at API and data layer.

15.2 Access logging: authenticated person and agency; service identity when a
system calls; record or case ID; action and purpose; time and result; legal
authority or policy reference; approval and delegation; correlation ID to the
exchange transaction. Log refused access, bulk searches, exports, privileged
operations and permission changes. **Reads of sensitive records are logged**,
not only changes.

15.3 Logs protected against ordinary administrators; audit administration
separate from operational administration; monitoring for suspicious access
patterns; sensitive payloads not copied into general logs (minimum evidence,
encrypted, restricted, with retention).

15.4 Retention per record class (police intelligence, incident reports,
evidence and convictions differ; immigration applications, border events,
visas and asylum claims differ), legal holds, disposition records (9.5).

15.5 Independent oversight designated by law: data protection authority;
judicial review of intrusive measures; police complaints oversight;
immigration appeal and protection review; prosecutorial and judicial access to
evidence; public audit and inspection. Oversight access is itself logged and
bounded by legal authority.

15.6 Procedural safeguards. Police: presumption of innocence, evidence
provenance, disclosure obligations, access to counsel, custody deadlines,
detention reviews, correction of inaccurate records. Immigration: right to
challenge decisions, interpretation and representation, confidentiality of
asylum claims, lawful detention review, non-refoulement where applicable. No
internal risk score becomes a conclusive legal finding.

15.7 AI never independently issues an arrest warrant, establishes guilt,
denies asylum or revokes a residence permit. AI may assist (extraction,
translation, duplicate detection, triage, summaries) under validation and
oversight. Material decisions have an accountable legal decision-maker, a
traceable basis and meaningful review; the screen shows the actual evidence
and never pressures acceptance of an opaque recommendation.

15.8 Before deployment each country completes a legal mapping: data
protection, police powers, criminal procedure, immigration and asylum law,
records retention, archives, evidence, electronic signatures, judicial
independence. CivicOS provides configurable enforcement; the country's legal
institutions set the policy.

## 16. Domain record models (baseline requirements)

Starting models, configurable to each country's law, never one country's
process shipped as the universal default. **Adopted** as requirements for the
modules; the full lists are in the external review §3 and are binding here.

16.1 Civil registration. Records: person identity reference (identifiers,
names, lawful aliases, identity-matching history); birth, death and marriage
events and applications; parent, spouse and other legal relationships;
informant, registrar, witness and supporting documents; certificate, versions
and issuance history; amendment, correction, annulment and late registration;
duplicate-match alerts, adjudication and linking history; notification and
exchange records.
- Birth: Draft → Submitted → Completeness check → Verification → Pending
  approval → Registered → Certificate issued; also Returned for correction,
  Rejected with reasons, Referred for adjudication, Correction requested,
  Registration amended.
- Death: Reported → Evidence verified → Registration approved → Registered →
  Certificate issued; referral for disputed identity, conflicting records or
  legally required investigation. A death certificate is not a medical
  cause-of-death record.
- Marriage: Application submitted → Eligibility checked → Required
  notice/consent completed → Ceremony/event verified → Registered →
  Certificate issued; civil, customary, religious or other forms as the law
  recognises them.
- National ID: Enrolment started → Identity evidence checked →
  Duplicate/biometric checks if lawful → Identity adjudicated → Credential
  issued → Active → Suspended/revoked/replaced; separate records and
  permissions from civil registration and authentication.

16.2 Police. Records: incident report and reporting party; location, time,
source, classification; offence record with legal classification and version;
associated persons, organisations, vehicles, property; witness, victim and
suspect records with role restrictions; investigation, officers, tasks,
actions, supervisory reviews; evidence item, collection, collector, seal,
storage, transfer, examination, disposition; arrest (legal grounds, time,
officer, notifications); custody (authority, location, review deadlines,
transfers, release); search, seizure, warrant, use of force; prosecutorial
referral, evidence index, disclosure record, handover receipt; closure,
reopening, retention review, audit trail.
- Incident: Received → Triage → Classified → Assigned → Referred or converted
  to investigation → Closed / reopened.
- Investigation: Opened → Assigned → Active → Review → Referred to prosecution
  / No further action → Closed.
- Evidence: Collected → Sealed/identified → Stored → Transferred → Received →
  Examined → Returned / Retained / Disposed.
- Arrest: Proposed or authorised where required → Executed → Recorded →
  Custody review → Released / Transferred / Other lawful disposition.
- Custody: Admitted → Rights and notifications completed → Reviewed →
  Transferred / Released / Lawfully continued.
- Prosecution handover: Prepared → Supervisor review → Securely transmitted →
  Receipt confirmed → Accepted / Returned for completion.
An incident is distinct from an allegation, an investigation and a person's
legal status; an arrest from a charge, a charge from a prosecution, a
prosecution from a conviction. Closed never means evidence destroyed, guilt,
or that the matter cannot be reopened.

16.3 Immigration. Records: applicant identity and evidence (including
uncertain or conflicting identities); visa application, category, sponsor,
invitation; residence-permit application, legal basis, eligibility evidence,
conditions; passports and travel documents; border-crossing event (port, time,
checks, decision); admission, refusal, departure, overstay; asylum claim,
statements, evidence, procedural history; interviews, interpreters,
representation, notices; decisions, reasons, legal citations, service records,
appeal deadlines; revocation, renewal, extension, status change; referrals and
handovers between immigration, border authorities and courts.
- Visa: Draft → Submitted → Completeness check → Verification → Assessment →
  Decision → Issued / Refused → Expired / Revoked.
- Residence permit: Submitted → Verified → Assessed → Decision → Granted /
  Refused → Active → Renewal / Expiry / Revocation.
- Border crossing: Encounter recorded → Identity/document verification →
  Admissibility assessment → Admitted / Refused / Referred → Event finalised.
- Asylum: Claim lodged → Registration → Documentation and procedural
  safeguards → Interview/evidence collection → Assessment → Decision → Appeal
  / Final disposition; with vulnerability screening, interpreter and
  representation needs, access to the claim record, confidentiality of
  country-of-origin information, safeguards against disclosure to those who
  could endanger the claimant.
A border crossing is an event, not a visa; a visa is not a residence permit;
neither alone proves current lawful status.

16.4 Courts. Records: case and court/jurisdiction; filing, originating
application or indictment, parties, representatives; pleadings, submissions,
exhibits; service and notification; judicial assignment, conflicts, recusal;
hearings, scheduling, attendance, transcript and recording references; interim
orders, directions, procedural rulings; judgment, reasons, signature,
publication/redaction status, issuance date; sentence, warrant, enforcement
orders; appeal, grounds, transmission of the record, appellate judgment;
costs, fees, payments; enforcement, execution, closure, archive.
- Filed → Registry review → Accepted / Rejected for procedural reasons →
  Served → Pending hearing → Hearing(s) → Judgment reserved → Judgment issued
  → Appeal period → Appealed / Final under applicable rules → Enforcement /
  Archived. Not linear: stays, consolidation, remittal, reopening, appeal
  while orders remain enforceable. Judgment, sentence, appeal and enforcement
  are distinct records; an appeal does not always suspend a judgment.

16.5 Business registration and licensing (Agreed scope, from this
conversation and the review): organisation records, company representatives,
applications, document verification, fees, decisions, renewals, public
verification; register types configured per authority (for example licensed
pharmacies, registered companies, licensed doctors).

16.6 Accreditation (Agreed scope): register type per accrediting authority
(for example accredited universities by the Ministry of Education); required
documents, checks, inspections, expert reviews, committee decisions,
conditions, validity period, fees, renewals, suspensions, revocations,
appeals; four-eyes on grants, suspensions and revocations; a verifiable
certificate; link to registered campuses; standing feeds the twin.

16.7 **Agreed.** Cross-ministry referral is a case linked to the original one
(for example Education asks Health for a fire and health inspection before
accrediting a campus), with a deadline, tracked and audited; today referrals
exist only in the browser (`lib/gov/referral-store.ts`).

## 17. Sequence: six gates

**Adopted**, replacing the four phases in `docs/GOVERNMENT_OPERATING_REVIEW.md`
§4. A recommendation, not a calendar; a country with a mature eID or business
register may reorder.

Gate 1. Architecture and governance foundation: freeze system-of-record
ownership (§3), country isolation, the authorisation model (§8), the legal
source model (§7), data classification, deployment profiles (§14). Written as
`docs/GOVERNMENT_OPERATING_MODEL.md` (design) before code.

Gate 2. First real vertical slice: civil registration (own module or OpenCRVS,
§20.3). Real record creation, review, approval, signed certificate,
authorised exchange, reconciled dashboard.

Gate 3. Shared exchange and identity: integrate the country's identity
provider; minimum secure exchange (§13); test legal authorisation,
delegation, revocation and audit reconstruction.

Gate 4. Administrative packs: business registration or licensing, and
accreditation, on the shared workflow foundation; measure what is really
reused.

Gate 5. Sensitive domains: immigration (ordinary visa or permit first, not
asylum or enforcement automation), police (limited incident intake and
referral early; full investigation later), courts; dedicated domain logic,
independently reviewed legal safeguards, restricted access.

Gate 6. Scale and national rollout: tax, customs, health, education and the
rest; migration, service continuity, national reporting, capacity, disaster
recovery; dashboards and the twin switched from simulation to records.

17.1 **Adopted.** First four packs, in order: (1) civil registration, (2)
business registration or licensing, (3) university accreditation, (4)
immigration visa with constrained scope. Police: a limited incident intake and
referral demonstration early, not a full investigation system in the first
production milestone. **Open (§20.2)** for the owner's confirmation; this
replaces the earlier proposal that put police incident-to-case in the first
four.

17.2 **Adopted.** The end-to-end proof, using a birth registration:
1. a citizen or authorised registrar submits a birth notification;
2. the system creates a traceable application and validates required evidence;
3. an authorised official reviews it and a second official approves where law requires;
4. the decision cites the exact applicable law and version;
5. the civil registry issues a signed certificate and records the decision;
6. a permitted identity service receives only the necessary event or reference;
7. the event reaches the oversight layer;
8. the dashboard updates a real, timestamped count and records its provenance;
9. an auditor reconstructs the whole sequence without altering the original record.
Then the same for a company licence and an accreditation decision; then an
immigration application with tighter access controls.

17.3 **Adopted.** Four packs prove the reusable foundation, not the whole
national system; police, courts, tax, customs, health and education each need
their own validation before being called production-ready.

17.4 **Adopted.** Acceptance evidence for every production service: real
records created and retrieved; officials complete the process under their
actual legal permissions; decisions cite the correct law; data exchanged
safely; failed operations recovered without corrupting records; citizens
notified and able to challenge decisions where applicable; oversight
statistics reconcile with the underlying records; the country can restore the
service after a disaster.

## 18. Production readiness and sovereign operation

18.1 **Adopted.** Production readiness is a separate milestone; a working
interface or complete-looking dashboards never make a system production-ready.
Independent tests for: cross-agency authorisation and isolation; privilege
escalation and insider threats; key compromise, revocation and recovery;
backup restoration and disaster recovery; duplicate and out-of-order messages;
concurrent changes and conflict resolution; record correction and legal holds;
data export and migration; network outages and offline operation; capacity
under national workloads; audit integrity and evidence reconstruction;
accessibility, language support and frontline usability. Existing work on
geospatial scale, source ownership and conflicting updates becomes explicit
release gates.

18.2 **Adopted.** Sovereign operation, demonstrable. Status:

| Requirement | Status |
|---|---|
| Country-controlled keys and credentials | Exists (key custody, `CIVICOS_DATA_KEK`, per-nation agent credentials) |
| Reproducible deployment artefacts, documented dependencies | Exists (Dockerfile, Helm chart, SLSA provenance, SBOM) |
| Offline-capable administration and recovery | Partly (self-host, air-gapped mirror); to complete |
| Independent backup ownership, tested restoration | Exists (`lib/data/backups.ts`, drill in `docs/DISASTER_RECOVERY.md`) |
| Complete data and configuration export | Partly; to complete and test |
| SBOM and supply-chain controls | Exists (Update Center assurance, escrow) |
| Security-update and vulnerability-response process | Exists (advisories, patch commitments) |
| Tested exit plan from the supplier | To add |
| No cross-country exchange without authorisation | Exists (federation grants) |
| No central vendor approval of national decisions | Agreed (2.3) |

18.3 **Adopted.** For single-server and limited-hardware installations, state
plainly which high-availability and security guarantees they cannot provide
(to add to `docs/SELF_HOSTING.md`).

18.4 **Adopted.** Sovereignty is control of keys, software, legal rules,
operational authority and the ability to keep running, not only the server's
location.

18.5 **Adopted.** Implementation includes a country-specific governance and
operations team, not only technical delivery (documented in the country
playbook, `docs/03_COUNTRY_PLAYBOOK.md`).

## 18A. Failure modes and their guards

**Adopted.** Each is checked at every gate.

| Failure mode | Guard |
|---|---|
| Dashboards before operational systems | Complete workflows and authoritative records first (1.5, 1.6) |
| Replacing everything at once | Incremental, by domain, legacy kept, explicit cutover criteria; connectors (12.2) |
| Weak legal foundations | Legal mapping, approved sharing authority and signed-off procedures before production (15.8, 5.4) |
| Duplicate or conflicting registries | Ownership, identifiers, matching, correction workflows, authoritative-source rules (§3, 6.8) |
| Poor data quality | Validate at capture, provenance, conflicts flagged, completeness and timeliness measured (§11) |
| Over-ambitious customisation | Common core, versioned country configurations, controlled extensions (§14) |
| Vendor lock-in | Open standards, exportable data, documented APIs (OpenAPI exists), reproducible deployments, tested exit (§18) |
| Inadequate connectivity | Assisted service, resilient queues, safe offline capture, conflict-aware sync (8.7) |
| Security as a final step | Threat model early (`docs/02_THREAT_MODEL.md`), authorisation tests, key rotation, penetration tests, incident rehearsal |
| Weak adoption by civil servants | Co-design with frontline staff, training, task-completion measures, support |
| Lack of maintenance funding | Budget for upgrades, monitoring, backups, incidents, patches, stewardship (Update Center contracts) |
| Political interference or misuse | Operational authority separate from oversight, protected audit evidence, independent review (15.5, 4.6) |
| Unclear accountability | Named service owner, data owner, legal authority and accountable official per production workflow (5.3) |
| Over-centralisation | Agency-owned authoritative records, country-controlled deployments, least-privilege exchange (§3, §13) |
| Metrics rewarding the wrong behaviour | Measure service quality, errors, appeal outcomes and rights protection, not only speed or enforcement totals |

## 19. Where the external review is qualified, and why

19.1 *Independently deployable domain systems.* Qualified to modular first
(4.5): the reviewer also advised against microservices from day one, and the
owner requires one-computer self-hosting (2.5).

19.2 *XACML 3.0 for authorisation.* Not adopted: `CLAUDE.md` requires one rule
set (`lib/auth/roles.ts`) and forbids a second place that decides permissions.
Attribute-based rules are added there (8.3). XACML stays an export format to
consider only if a nation needs policy interchange.

19.3 *OpenCRVS rather than building civil registration.* Qualified (12.2):
CivicOS keeps its own module behind the same interface because many target
installations (single computer, small nations, air-gapped) cannot depend on a
separate system, and the preservation doctrine keeps the existing civil
registry screens. OpenCRVS is evaluated first as a connector. **Open (§20.3)**.

19.4 *Platform-owned workflow foundation.* The reviewer did not know about the
Supabase substrate; the owner's decision (2.2) that the platform owns and the
substrate mirrors applies to casework too (3.5).

19.5 *Last-write-wins.* Qualified (11.7): kept only for one source's
statistical revisions.

19.6 *Standards editions.* The standards profile (external review §6) is
adopted as a proposal; current editions, licences and local applicability are
verified before it is frozen in Gate 1.

19.7 Points already built are recorded as **Exists** above (OGC API Features
and Tiles, SensorThings, SDMX, CloudEvents and AsyncAPI, OpenAPI, OIDC,
WebAuthn passkeys, PROV, provenance and escrow, backups and DR, key custody,
self-hosting, federation grants).

## 20. Open decisions for the owner

20.1 Approve the platform as the one owner of casework, with the substrate as
a mirror, bringing permits, ministry task lists, substrate work items and the
browser queue onto one foundation (3.5). Recommended: yes.

20.2 Confirm the first four packs in the order of 17.1 (civil registration,
business registration or licensing, university accreditation, immigration
visa), with police as an early limited intake and referral demonstration.
Recommended: yes.

20.3 Civil registration: build CivicOS's own module with an OpenCRVS
connector, or require OpenCRVS. Recommended: own module plus connector (19.3).

20.4 Citizen identity for the first slice: connect the nation's identity
provider through OIDC (MOSIP-compatible or the country's own), with assisted
registration where none exists (8.7). Recommended: OIDC connection plus
assisted registration.

20.5 Sample data in production installations: a production installation
starts with no sample records; demo and training installations keep them,
labelled (10.3). Changes the current `CLAUDE.md` rule on example cases.
Recommended: yes.

20.6 Administrators lose automatic domain authority (8.2): domain decisions
(issue a visa, register a birth, accredit a university) need the domain's own
officials. Recommended: yes.

20.7 Gate 1 starts with the design document `docs/GOVERNMENT_OPERATING_MODEL.md`
for the owner's review before code. Recommended: yes.

## 21. Changes to the earlier record

`docs/GOVERNMENT_OPERATING_REVIEW.md` stays as the findings of the code
review. Where it differs, this document governs:
- "one casework engine" (§4 A there) becomes a shared workflow foundation with
  domain-owned records and transitions (§4, §5 here);
- the four phases (§4 there) become the six gates (§17 here);
- the first four packs change (17.1 here);
- the open decisions (§6 there) are superseded by §20 here.
