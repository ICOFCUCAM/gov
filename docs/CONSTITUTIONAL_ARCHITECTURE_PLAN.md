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
| Composable classification (§1.2) | One `stateForm` enum with presets; constitution templates per form (`lib/gov/constitution.ts`) | Form of state, form of government, territorial arrangement, legal traditions and recognised authority types are one value; no effective dates or legal sources on them |
| Institution identity (§2.1) | Ministry registry (`/api/org`): name, archetype, status, departments; since phase 1 standing, branch, establishing law, effective date, independence per dimension, prohibitions, records owned, changed through the change process | Appointment, dismissal and funding are recorded facts, not enforced relationships (phase 3); powers and jurisdiction per institution |
| Offices (§7.1 `offices`) | `lib/nation/offices.ts` titles; head of government from `executiveTitle` | Offices are titles, not records with powers, terms, acting and succession rules |
| Powers and relationships (§3) | Who is responsible (`deployment.authorities`, 15 slots); permit authority mappings (`lib/permits/authority.ts`, two officials, cite law); procedures | Relationships between institutions are not records; directives are never checked against the target's independence |
| Authorization (§5.2) | `roles.ts` (role and institution scope), `caseActRefusal`/`caseReadRefusal`, access log; since phase 2 whole-government scope stops at independent institutions, their accounts are their own, who is responsible changes by two officials citing the law | Office, purpose and relationship versions are not yet part of each decision (phases 3–4) |
| Three kinds of administration (§5.3) | Administrator role; Update Center installation administrator | Platform operator, national commissioning authority and institution administrator are not distinct |
| Workspaces per branch (§6) | Command Center for the executive; ministry workspaces; courts' cause list | Everyone is greeted as the head of government; no home for a speaker, clerk, chief justice, head of state or independent body |
| Configuration lifecycle (§7.4) | Country rule sets through `lib/law/policy-change.ts` (propose, confirm, cite, history) | The constitutional profile itself has no draft → review → approval → scheduled activation → superseded lifecycle |
| Transitions and emergencies (§4) | Emergency suspension of mappings; crisis mode on screens | Elections, terms, acting offices, caretaker profiles, dissolution, impeachment stages, judicial-review effects, succession, devolution are not modelled |
| Read access logged across branches (§5.4) | Access log, oversight confirmation, access watch | Log entries do not record the office and relationship version that authorised a read |

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

**Phase 4 — offices and workspaces (§6; audit F, G, H) (U for the shell, C for titles and powers).**
Offices as records (title per language, institution, powers, term, acting and succession rules);
head of state separate from head of government. `/welcome` and the console home are chosen by
the official's office and institution: My authority, My work, Awaiting my action, Institution
status, Legal changes, Oversight, Exceptions, Public service (§6.6). The Command Center stays as
the executive's home. The separation-of-powers panel is built from the register and the
boundaries above, observed, not generated.

**Phase 5 — constitutional profile lifecycle (§7.4) (U).**
The profile is a versioned package: draft → legal review → institutional consultation →
security validation → authorised approval → scheduled activation → active → superseded, with
`disputed` / `suspended pending review`. Every consequential action records the profile version
it ran under. Two-person technical approval is never presented as the constitutional process.

**Phase 6 — transitions and emergencies (§4) (L).**
Terms and office assumption, acting offices, caretaker authority profiles, dissolution, the
seven separate stages of impeachment, judicial-review effects that flag (never delete) affected
records, emergency declarations as time-limited legal statuses that never lift audit or privacy
controls, succession as a determined legal event, devolution and recentralisation as versioned
competence allocations, conflict-of-interest declarations and recusal. Each ships as an
unapproved draft procedure.

**Phase 7 — legislative records and portability tests (§2.3, §8.4) (L for procedure).**
The legislature's own bills and votes register (clerk as custodian) feeding the laws register
on assent and publication. The three portability tests run in CI against illustrative UK, US and
UAE profiles (structural portability, negative authorization, transition safety); passing them
proves the mechanism, never the legal mapping.

## Rules that already hold and stay

AI never makes a legally material decision; every decision cites the law version; two different
people for the platform minimum; registers change only through procedure effects; every personal
read is logged; administrators do not read the access log. The guidance adds to these and
removes none.
