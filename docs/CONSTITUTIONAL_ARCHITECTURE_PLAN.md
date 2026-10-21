# Constitutional architecture — how it is applied

The binding guidance is `docs/CONSTITUTIONAL_ARCHITECTURE.md` (kept verbatim). The code as it
stands is measured in `docs/reviews/2026-10-separation-of-powers-audit.md` (file and line
evidence, proposals A–M). This page maps the guidance onto the code, part by part. Nothing here
replaces the guidance; where they differ, the guidance wins and this page is corrected.

Labels from the guidance: **U** universal platform rule (always built), **C** constitution-dependent
(a slot the nation fills, enforced once filled), **L** legal review required (ships disabled or as
an unapproved draft; a production installation refuses it until approved).

## Where the code stands

| Guidance | Today in CivicOS | Gap |
|---|---|---|
| Composable classification (§1.2) | One `stateForm` enum with presets; constitution templates per form (`lib/gov/constitution.ts`); since phase 4 `constitution.classification` (lists per axis, sources, effective date, style; derived from `stateForm` until recorded) | No presets for further forms; since phase 5 the classification changes after setup through its own change process |
| Institution identity (§2.1) | Ministry registry (`/api/org`): name, archetype, status, departments; since phase 1 standing, branch, establishing law, effective date, independence per dimension, prohibitions, records owned, changed through the change process | Appointment, dismissal and funding are recorded facts, not enforced relationships (phase 3); powers and jurisdiction per institution |
| Offices (§7.1 `offices`) | Since phase 4 records (`lib/nation/office-register.ts`): title per language, institution, kind, power references, term, acting and succession rules, legal basis, dates; head of state separate from head of government; holders linked by two officials | Delegations and acting appointments as events (phase 6); powers are references, enforced where recorded |
| Powers and relationships (§3) | Who is responsible (`deployment.authorities`, 15 slots); permit authority mappings (`lib/permits/authority.ts`, two officials, cite law); procedures; since phase 3 the relationship register (`lib/data/store/relationships.ts`), enforced for instructions and purpose-bound reads | Appointment, dismissal, funding and the other kinds are recorded, not yet enforced (phases 4, 6) |
| Authorization (§5.2) | `roles.ts` (role and institution scope), `caseActRefusal`/`caseReadRefusal`, access log; since phase 2 whole-government scope stops at independent institutions, their accounts are their own, who is responsible changes by two officials citing the law | Office, purpose and relationship versions are not yet part of each decision (phases 3–4) |
| Three kinds of administration (§5.3) | Administrator role; Update Center installation administrator | Platform operator, national commissioning authority and institution administrator are not distinct |
| Workspaces per branch (§6) | Command Center for the executive; ministry workspaces; courts' cause list; since phase 4 greetings name the official, `/welcome` routes by standing, *My workspace* (§6.6 panels) | Public service panel; per-office pages for a speaker, clerk or chief justice beyond the institution workspace |
| Configuration lifecycle (§7.4) | Country rule sets through `lib/law/policy-change.ts` (propose, confirm, cite, history); since phase 5 the constitutional profile as versions with the full lifecycle, disputes and freezing | The approval path is not modelled on a nation's amendment procedure beyond the named act; permit mappings, procedures and rules are not bundled |
| Transitions and emergencies (§4) | Emergency suspension of mappings; crisis mode on screens; since phase 6 terms, acting offices, delegations, caretaker periods, dissolution, impeachment stages, courts' rulings, emergencies, succession, transfers of powers and recusal as recorded legal events (`lib/transitions/`) | Elections, coalitions, no-confidence votes and disputes between branches are not modelled; transferred powers are not yet applied to who is responsible |
| Read access logged across branches (§5.4) | Access log, oversight confirmation, access watch; since phase 5 entries record the office acted under and the profile version | The relationship version that authorised a read is in the rule text, not a field |

## Phases

Each phase extends what exists (preservation doctrine): the ministry registry becomes the
institution register, `roles.ts` stays the one place permissions are decided, `policy-change.ts`
carries every change to the constitutional profile, the laws register supplies every legal basis.

**Phase 0 — fixes already found (U).** Done: a preset no longer erases who is responsible
(audit A). Done: once setup is complete a preset is refused (409, audited) with a reason that
points to editing the profile field by field and to the change process; presets stay in the
first-run setup.

**Phase 1 — institution register (§2.1, §7.1; audit B, I) (mechanism U, values C/L).**
Each institution gains `standing` (executive ministry, executive agency, independent statutory,
independent constitutional, legislature, judiciary, head of state, subnational, customary or
religious), `branch`, establishing legal basis (laws-register citation), effective dates,
multidimensional independence (decisions, appointment, dismissal, funding, instructions — each
its own rule, §7.2.1–2), record ownership, prohibitions (§7.2.5). Defaults for existing records:
executive ministry. Changed only through `policy-change.ts` citing the law, confirmed by a
different official, and by the institution itself when it is independent. New authority slots
(legislature, supreme audit, electoral, central bank, ombudsman, anti-corruption, human rights,
head of state, constitutional court) are offered empty: which bodies exist is the nation's.

*Built (mechanism only, no values):* `Ministry` carries optional `standing`, `branch` (branch keys of
`lib/gov/constitution.ts`), `basis` (laws-register citations), `effectiveFrom`, `independence` (one rule
per dimension: protected or not, who acts, note, its own citations), `prohibitions` (direction, data
access, non-delegable), `records` and `terms` (the change history, `PolicyChanges`). Existing records
read as an executive ministry with no independence claims (`withDefaults()` at load; `termsOf()`).
`lib/data/store/institutions.ts`: recorded directly during first-run setup only; afterwards proposed by
an administrator (whole government or the institution's own) citing the laws register and confirmed by a
different official — by an official who can sign at the institution when its current or proposed standing
is independent and it has such officials; adopted versions apply from their date; renaming, merging or
deactivating an independent institution goes the same way (the registry's own actions refuse it, and
nothing is merged into an independent institution). API `/api/org/ministries/{id}/standing`; screen:
the constitutional standing panel on Ministries & agencies. Who is independent: standing legislature,
judiciary, independent-constitutional or head-of-state; independent-statutory when its decisions are
recorded as protected; and the bodies named for the judiciary, data protection, legislature, head of
state and constitutional court (`INDEPENDENT_SLOTS`). The nine slots are optional (`AUTHORITIES[].optional`):
onboarding counts only the fifteen registers every installation fills and lists named bodies separately.
Not yet: a register for each new body (none is kept until phases 4 and 7), pre-filling proposed
institutions from the constitution template in setup, display on `/gov/branches`.

**Phase 2 — authorization boundaries (§5.1, §5.3; audit C, D, L) (U).**
`roles.ts` reads standing: whole-government scope stops at independent institutions (queues,
site archives, cases, documents); several judicial institutions; accounts of an independent
institution are managed by its own administrators, or by a whole-government administrator
confirmed by that institution; changing who is responsible, merging or deactivating an
independent institution goes through the profile's change process. Negative-authorization tests
(§8.4 test 2): no executive scope reaches a legislature's, court's or independent body's records.

*Built:* `roles.ts` reads `Boundaries` (independent and judicial institutions, the public audit office,
every registered id) carried on the signed-in official from `institutionBounds()` at each request (never
signed into the session; also sent to the middleware through `GET /api/auth/official`). `reaches()`:
own institution, or whole government when the institution is not independent. `ministryPermission`,
`canReadInstitution` (auditors too), `canDownloadSiteArchive`, `canActForSite`, `canSeeDraft` stop at
independent institutions; executive institutions are unchanged. Cases: `CaseFacts.independent` beside
`judicial`, both derived from the register (several courts possible); an independent institution's cases
and documents are read and worked only by its own officials, except the public audit office (named
`supremeAudit` and recorded as independent-constitutional) reading an independent body's case with a
stated purpose — never a court's; the government's own auditors stay out (refusals logged by the case
routes and the queue route). Accounts: `accountChangeRule()` — an independent institution's own
administrators act directly; a whole-government administrator's create, re-role, move, reset, reset-code,
disable or substrate assignment waits in `lib/auth/account-changes.ts` for an official who can sign there
(`canConfirmAccountChange()`, a different person by `dualControlRefusal()`/`personOf()`; a new account is
created without a usable password and its reset code goes to the confirmer); other institutions'
administrators are refused; the identity-provider screen refuses linking, creating or mapping groups into
an independent institution. Who is responsible: after setup only through `/api/sovereign/authorities`
(whole-government administrator proposes citing the law, a different administrator confirms; `PUT
/api/sovereign` refuses a changed `authorities` with 409); during setup as before. Directives: whole
government issues as `executive-office`; signing needs an account of the issuing institution; kinds
`request`, `communication`, `referral` added, and an independent target is refused any other kind.
`confirmByOversight()` compares persons. Tests: `lib/auth/negative-authorization.test.ts`,
`lib/data/store/institutions.test.ts`, `lib/data/retention-oversight.test.ts`.
Not yet: the three kinds of administration as separate roles (§5.3); the institution's own confirmation
when who is responsible changes away from it; independence gates on substrate officer registry and bulk
onboarding routes.

**Phase 3 — relationships (§3.3; audit E) (mechanism U, values C/L).**
A versioned relationship register: from, to, type (appoint, dismiss, fund, instruct, review,
veto, audit, investigate, dissolve, impeach, refer, request information, receive reports),
scope, conditions, legal basis version, effective dates, approval rule, status. Directives to an
independent body are refused unless an approved `instruct` relationship covers them; otherwise
they become requests or referrals. A `request_information` relationship never implies reading
all records or changing them.

*Built (mechanism only, no values):* `lib/data/store/relationships.ts` (`__civicosRelationships`,
register `relationships`, part of the institution register): each relationship has an id, from
(a registered institution, or the executive office for an instruction), to, kind (the thirteen
above), scope (record types — `cases`, `queue` or a procedure's key — or, for an instruction, the
kinds of directive covered; purposes; territory), conditions, legal basis (laws-register citations
resolved by `citeBasis()`), effective from/to and status (draft, approved, suspended, ended); every
version is kept through `policy-change.ts` (adopted, lapsed, withdrawn; earlier adopted versions
superseded). Proposed by an administrator of the whole government or of either end, citing the law;
confirmed by a different official (`dualControlRefusal()`); when an end is independent and has
officials who can sign, by one of them for each such end (the last adopts it), as for standing; an
instruction to an independent institution is confirmed by that institution in every case. Suspending,
ending and reinstating are new versions confirmed the same way. A relationship grants only while
approved, within its dates, with both ends active and its cited provisions in force
(`relationshipGrants()`, carried on `Boundaries.relationships` by `institutionBounds()`).
Enforced in `roles.ts`: `directiveTargetRefusal()` — an instruction reaches an independent
institution, or goes from one registered institution to another, only under an `instruct`
relationship from the issuer covering its kind (checked at draft and at signing, so ending it stops
a waiting draft); the executive office still instructs executive institutions (Phase 2 reach).
`readRelationship()` — an `audit` or `request_information` relationship lets officials of the
actor read the listed records of the target for a listed purpose (`caseReadRefusal()`,
`canReadInstitution()` with `?purpose=`), never a court's case or a secret case, never a change or
a decision (`caseActRefusal()`, `ministryPermission()` ignore it); the case, document and queue
routes write each such read to the access log naming the relationship and version. The public audit
office rule from Phase 2 is unchanged. API `/api/org/relationships` (ops propose, suspend, end,
confirm, withdraw); screen National settings · Relationships (both directions per institution, the
waiting proposals); onboarding lists waiting proposals and an optional check. No relationship ships
in any mode. Tests: `lib/data/store/relationships.test.ts`, `lib/auth/negative-authorization.test.ts`.
Not yet: appoint, dismiss, fund and the other kinds are recorded, not enforced (offices, phase 4;
transitions, phase 6); territory and conditions are recorded, not checked; the access log names the
relationship in its rule text, not yet with the office (§5.4, phase 4).

**Phase 4 — offices and workspaces (§6; audit F, G, H) (U for the shell, C for titles and powers).**
Offices as records (title per language, institution, powers, term, acting and succession rules);
head of state separate from head of government. `/welcome` and the console home are chosen by
the official's office and institution: My authority, My work, Awaiting my action, Institution
status, Legal changes, Oversight, Exceptions, Public service (§6.6). The Command Center stays as
the executive's home. The separation-of-powers panel is built from the register and the
boundaries above, observed, not generated.

*Built (mechanism only, no office, title or power chosen for a nation):* offices are records
(`lib/nation/office-register.ts`, store `__civicosOffices`, API `/api/offices`, screen National settings →
*Offices* `/gov/configuration/offices`): institution, title and titles per language, kind (an open list:
head of state, head of government, presiding officer, clerk, chief justice, court president, registrar, head
of an independent body, minister, permanent secretary, agency director, governor, traditional leader …),
power references (enforced where they are recorded, never by the office), term, acting rule, succession rule,
`heldWith`, legal basis and effective dates. Head of state and head of government are separate offices.
Recorded directly during first-run setup; afterwards proposed by an administrator (whole government or the
office's institution) citing the laws register through `policy-change.ts`, confirmed by a different official —
an official who can sign at the institution when it is independent and has such officials; every version
kept, future dates honoured. Until a nation records a head of government it is derived from `executiveTitle`
(`derivedHeadOfGovernment()`), so nothing changes visibly; recorded head-of-state and head-of-government
titles flow into `nationOffices()` (`HeadOffices`, root layout facts). Holding an office: an administrator of
the office's institution (whole government only where it reaches) links an account, a different official
whose scope reaches the institution confirms (never the holder), ending needs a reason and keeps the
holding with its end date; all audited. **Holding an office grants no permission**: `roles.ts` reads role and
institution only (its one change is the `/api/offices` path rule; `office-register.test.ts` checks).
Home per branch (`lib/workspace/home.ts`): greetings name the signed-in official and the office they hold
(`/welcome`, `/command`, `ExecutiveMenu`, `CommandShell`, Situation Room, Cabinet, National overview), never
the executive title; `/welcome`'s primary destination follows standing — legislature → its workspace,
the branch and the chamber; courts → workspace and cause list; head of state's office and independent bodies
→ their workspace; executive → Command Center. The shared shell (§6.6) is *My workspace* (`/gov/workspace`,
a tab of My work; `GET /api/workspace`, `lib/workspace/panels.ts`): My authority, My work (`/api/work`),
Awaiting my action, Institution status, Legal changes, Oversight, Exceptions, within `roles.ts`.
Separation of powers (audit G): `lib/gov/separation.ts` + `lib/nation/separation-facts.ts`
(`GET /api/constitution/separation`): each constitutional branch has a registered institution; courts
isolated; no whole-government account holding an independent institution's office; independent institutions
have their own administrator; data-protection authority named; access-log shortening confirmed by oversight
(and none adopted without it); no directive instructing an independent body — each observed with a link.
The Command Center panel, Branches, branch pages and National shell read it (`separationIntegrity()` is
gone); the branch readiness percentages stay only where samples are allowed, marked Sample.
Classification (§1.2; audit H): `NationalConstitution.classification` (state forms, government forms,
territorial arrangements, legal traditions, authority types — lists — with sources, effective date and a
`style`), derived from `stateForm` until recorded (`lib/nation/classification.ts`); `stateForm` stays.
`platformLabel` reads the recorded style, else derives the old labels (unchanged for existing nations).
Onboarding: an *Offices of state* track (optional beyond the head of government) and waiting items.
Not yet: delegations (phase 6), presets for further forms, head-of-state acts as draft procedures, a per-office
public page. (The office in the access log and the classification's own change process came with phase 5.)

**Phase 5 — constitutional profile lifecycle (§7.4) (U).**
The profile is a versioned package: draft → legal review → institutional consultation →
security validation → authorised approval → scheduled activation → active → superseded, with
`disputed` / `suspended pending review`. Every consequential action records the profile version
it ran under. Two-person technical approval is never presented as the constitutional process.

*Built (mechanism only, no profile ships):* `lib/constitution/` (store `__civicosConstitutionProfile`, register
`constitutional-profile`). A version bundles by reference and digest the parts kept on their own
(`parts.ts`: classification, institutions' terms in force, who is responsible, offices in force, relationships'
adopted versions, the dual-control and suspension rules); each part's version is the count of its adopted changes and
its digest is SHA-256 over its values in force; the profile's digest covers the parts. Storage and change processes are
unchanged. Each version records the profile in force before it, the parts it touches, its effective date, legal basis
(laws register, required to leave the draft), migration and rollback constraints, the institutions consulted, and every
step as an event with the named official (audited `constitution.profile.*`). Steps (`profile.ts`): drafted by a
whole-government administrator after setup; legal review by a different person (of the institution the nation names
for it, when it does); consultation answered by each consulted institution's own official (required by the nation's
rules, or when the drafter names institutions; objections recorded, not blocking); security validation by an
administrator other than the drafter (parts unchanged since the draft, audit chain and access log intact, nothing
frozen, the law cited in force; waiting changes noted); approval by at least two officials, each different from the
drafter and from each other, each naming the act of the body the nation's law empowers (`authorisedBy`); then
scheduled and activated at its date by the case-deadlines job or the next read (`activateDue()`), superseding the one
before (kept). A profile approved and due counts as in force for every action even before that write. Parts changed
since the draft refuse approval until the draft is captured again (its steps start over); parts changed after
activation show as drift. Disputes (§4.11, §8.3): a profile on its way becomes *disputed* (never activates), the
active one *suspended pending review* (stays in force); the parts it touches are frozen in `policy-change.ts`
(proposals and confirmations refused, withdrawal open; relationships' endorsements too); resolved only by a recorded
decision naming its reference, by a different person — upheld returns it where it was, set aside ends it (an active
one's predecessor is reinstated by that decision; parts are never reverted automatically). The nation's own steps
(`consultation` optional or required, `approvals` 2–9, `legalReviewInstitution`) are a country rule set through
`policy-change.ts`. Screens (National settings → *Constitution*) and the API say the legal process is the nation's.
Consequential actions: sealed decisions carry `profile` (id, version, digest) inside the seal; access-log entries are
now format 2 (`v: 2`) with the office the official acted under (`accessBy()`, from the offices they hold) and the
profile version inside the hash; earlier entries verify with their original field list. The classification has its own
change process after setup (`/api/sovereign/classification`; `PUT /api/sovereign` refuses a changed one with 409 and
keeps it when a constitution is sent without it). Onboarding: *Constitutional profile* (approved and active —
recommended in production, optional in demo and training; no drift; nothing frozen) and waiting items for each step.
Tests: `lib/constitution/profile.test.ts`.
Not yet: the approval path modelled on a nation's amendment procedure (votes, assent) beyond the named act; bundling
permit authority mappings, procedures and operational rules (they carry their own versions on decisions); a required
confirmation by an independent institution whose terms a profile touches (today a consultation); the relationship
version as an access-log field; offices for substrate officers.

**Phase 6 — transitions and emergencies (§4) (L).**
Terms and office assumption, acting offices, caretaker authority profiles, dissolution, the
seven separate stages of impeachment, judicial-review effects that flag (never delete) affected
records, emergency declarations as time-limited legal statuses that never lift audit or privacy
controls, succession as a determined legal event, devolution and recentralisation as versioned
competence allocations, conflict-of-interest declarations and recusal. Each ships as an
unapproved draft procedure.

*Built (mechanism only, nothing ships):* `lib/transitions/` (store `__civicosTransitions`, register `transitions`,
`/api/constitution/transitions`, National settings → *Transitions*). Eleven kinds of recorded legal event: taking up
office, acting appointment, delegation, succession, caretaker period, dissolution, impeachment (the seven stages of
§4.6 as versions of one proceeding), a court's ruling on a law or decision, state of emergency, transfer of a power
(devolution, recentralisation), declaration of interest. Each is recorded by one official citing the laws register and
confirmed by a different person (`policy-change.ts`; never the person the record names); ending one early, a later
impeachment stage and lifting a recusal are new versions confirmed the same way; every version kept, audited. Who
records: the office's institution (acting, succession, taking up office), the delegator, the institution in a caretaker
period, the dissolving institution under an approved `dissolve` relationship (the platform never assumes who may
dissolve), the institution the nation names for each impeachment stage, a court's own officials, the declaring
institutions the nation names, the declarant. The country's rules (caretaker restrictions as procedure, decision and
directive keys; the institution per impeachment stage; who declares an emergency and its longest period) are a rule set
through `policy-change.ts`; none ships, the guidance's caretaker list is shown as an unapproved reference draft.
Enforced: recusal in `caseActRefusal()` (`CaseFacts.recused`, from the declaration on, lifted by two people); caretaker
restrictions and courts' rulings in one place (`lib/transitions/restrictions.ts`) read by a case-engine decision guard
(at proposal and confirmation; guards now receive the citations) and by directives (draft and signing) — only the kinds
the nation listed, a warning while it listed none (the whole government's caretaker period does not reach independent
or subnational institutions); a ruling that a provision is invalid or suspended refuses new
decisions and directives citing it (a stayed one, read-down, interpretation or remittal does not), and decisions it
touches are flagged for legal assessment, never changed; impeachment stages in order, none skipped, no outcome changes an
account or holding; emergencies lapse at their expiry (computed), renewal is a new confirmed declaration, and nothing in
the permission rules reads them (test: bounds, case rules, dual control and the access log are identical with one in
force). Acting appointments and successions create their office holding once confirmed (ended with the event); a holding
past its recorded term (years from its start) is no longer in force and is flagged on Offices, onboarding and the tab.
Two profile parts: `competences` (allocations in force) and `transitionRules`; a dispute freezing offices, institutions,
relationships, authorities or these parts freezes the transitions that touch them (a court's ruling, an emergency and a
declaration of interest touch none). Onboarding: an optional *Transitions and emergencies* track and waiting items.
Tests: `lib/transitions/transitions.test.ts`.
Not yet: elections and certification (§4.1), coalitions and no-confidence votes (§4.3–4.4), disputes between branches
as cases (§4.11), suspension of an independent body as its own procedure (§4.10); a transfer of a power is recorded, not
yet applied to who is responsible or permit mappings; delegations grant no platform permission.

**Phase 7 — legislative records and portability tests (§2.3, §8.4) (L for procedure).**
The legislature's own bills and votes register (clerk as custodian) feeding the laws register
on assent and publication. The three portability tests run in CI against illustrative UK, US and
UAE profiles (structural portability, negative authorization, transition safety); passing them
proves the mechanism, never the legal mapping.

*Built (mechanism only; the procedure ships as an unapproved reference):* the legislature's own record
(`lib/legislature/register.ts`, store `__civicosLegislature`, register `legislature` owned by the institution
named for the `legislature` slot; API `/api/legislature/...`; console Branches of government → *Bills and
votes* `/gov/legislature`, a bill's page, *Legislative procedure*; public `/assembly/bills`). The nation's
legislative procedure — stages (kind, chamber, vote, optional), whether names are recorded with votes, the
majority and quorum, seats, whether assent is needed, what the public sees — is drafted by one official of the
legislature (from the shipped reference, which is never approved as it stands) and approved by a different one
who can sign there, citing the standing orders where the laws register holds them; every version kept; no bill is
introduced without one, in any mode. A bill keeps every text version, moves forward through the stages of the
procedure it was introduced under (past a vote only once carried), and records amendments, votes (result from the
procedure's rules; names only where it says, matching the counts), committee referrals and reports, passage, assent
(the head of state's office; the clerk as communicated where none is named), commencement, publication and the
clerk's certification (SHA-256 of the record, stale after any change). A recorded vote or journal entry is never
rewritten: a correction is proposed by an official of the legislature and confirmed by a different one who can sign
there, the earlier version kept, and never reverses a result the bill has moved on from. Only the legislature's
officials write it (`legislativeRecordRefusal()`, `assentRefusal()`, path rule `legislature` in `roles.ts`;
`lib/legislature/writes.test.ts`); whole-government scope and ministries are refused. On publication the certified
enacted text enters the laws register from the record (`source.kind = 'legislature'`: bill, text version, votes,
assent, publication, certification), recorded by the clerk and confirmed by a different official of the
law-register authority as every law is; `/api/law` no longer takes a source from the request body. Akoma Ntoso
`bill` export with lifecycle events. The public sees bills, texts, proceedings, amendments, reports and votes (names
or counts) as the procedure in force allows, never the staff who recorded a step. Onboarding: the *Legislative
record* track only when a legislature is named, and waiting items. Audit proposal K (minimal): a regional or local
government (standing `subnational`) stands outside whole-government reach (`Boundaries.subnational`); the centre
reads or instructs there only under an approved relationship covering it.
The portability tests (`lib/nation/portability.test.ts`, CI): three illustrative profiles — presidential federal
republic (US-like), parliamentary constitutional monarchy with devolution (UK-like), federation of emirates with
constituent rulers (UAE-like) — built only through the platform's own setup, registry, relationship, office, laws
and legislative-record functions; test 1 structural portability, test 2 negative authorization (legislature, courts,
independent bodies without an approved relationship, constituent units), test 3 transition safety (officeholder,
standing, relationship, law version enacted through the legislature: history kept, old decisions keep their
version, no power moves before two officials and its date). Every test name says it proves the mechanism, never the
legal mapping.
Not yet: a second chamber as its own institution with its own record, joint committees and messages between
chambers (recorded as stages and chamber names); a register of members; sittings, order papers and the full
journal of debates; committee evidence and parliamentary privilege; head-of-state acts beyond assent (phase 6);
reserved competences per subject and checked territory; a regional government's own confirmation of a relationship
that touches it.

## Rules that already hold and stay

AI never makes a legally material decision; every decision cites the law version; two different
people for the platform minimum; registers change only through procedure effects; every personal
read is logged; administrators do not read the access log. The guidance adds to these and
removes none.
