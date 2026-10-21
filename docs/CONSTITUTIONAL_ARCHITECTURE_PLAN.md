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
| Institution identity (§2.1) | Ministry registry (`/api/org`): name, archetype, status, departments | No branch or standing, establishing law, independence, appointment, funding, record ownership or effective dates |
| Offices (§7.1 `offices`) | `lib/nation/offices.ts` titles; head of government from `executiveTitle` | Offices are titles, not records with powers, terms, acting and succession rules |
| Powers and relationships (§3) | Who is responsible (`deployment.authorities`, 15 slots); permit authority mappings (`lib/permits/authority.ts`, two officials, cite law); procedures | Relationships between institutions are not records; directives are never checked against the target's independence |
| Authorization (§5.2) | `roles.ts` (role and institution scope), `caseActRefusal`/`caseReadRefusal`, judiciary isolated inside casework, access log | Whole-government scope reaches the courts' queue; one administrator can manage any institution's accounts and change who is responsible alone (audit §2) |
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
(audit A). Next: refuse presets after setup except through the profile's change process.

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

**Phase 2 — authorization boundaries (§5.1, §5.3; audit C, D, L) (U).**
`roles.ts` reads standing: whole-government scope stops at independent institutions (queues,
site archives, cases, documents); several judicial institutions; accounts of an independent
institution are managed by its own administrators, or by a whole-government administrator
confirmed by that institution; changing who is responsible, merging or deactivating an
independent institution goes through the profile's change process. Negative-authorization tests
(§8.4 test 2): no executive scope reaches a legislature's, court's or independent body's records.

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
