# Government operating model: design (Gate 1)

Status: design for the owner's review, October 2026. No code is written for
Gates 2 to 6 until this is reviewed (`docs/GOVERNMENT_OPERATING_DIRECTIONS.md`
20.7). Every section names the directions it implements (D-numbers refer to
the directions document) and the existing code it builds on, so nothing is
built twice.

Gate 1 freezes six things: who owns each record (§2), how the installation
says what it is (§3), the authorisation model (§4), the legal source model
(§5), the workflow foundation (§6) and records and signatures (§7). The rest
of the document designs the first vertical slice (§8 to §11) and the order of
work (§13).

---

## 1. Principles the design obeys

1. Platform stores, persisted the existing way: `globalThis.__civicos*`
   initialised with `??=`, accessors pass through `touch()`, JSON, Maps, Sets
   and Dates only, `withDefaults()` for later fields, per-record documents in
   postgres mode, backed up and restored by `lib/data/backups.ts` (CLAUDE.md,
   Durable state).
2. Every change records the signed-in official through `withOfficial()` or
   `chamberBody()`; every route matches a rule in `lib/auth/roles.ts`; no
   second permission system (CLAUDE.md, Who acted; D 8.3).
3. Every change goes to the audit chain with the official; four-eyes uses
   `dualControlRefusal()` (`lib/data/dual-control.ts`).
4. Nothing is deleted; history is append-only; corrections supersede
   (D 2.1, 9.2).
5. Domain modules own their records; others reach them only through the
   module's functions or the exchange layer; a boundary test enforces it
   (D 4.4, 4.5).
6. The twin reads records; it never writes them (D 11.1).
7. New pages join `route-lock.json` and a console menu item as a tab; new
   routes are in the OpenAPI document; new stand-ins are in
   `docs/INTEGRATION_REGISTER.md` (CLAUDE.md).

## 2. System of record (D §3)

### 2.1 Legal owner and storage owner

`lib/data/register-owners.ts` gains, for each register, a `legalOwner`: the
authority that is legally responsible, named by the nation in its deployment
profile (§3.2), not by the software. Storage owner stays as today (platform,
substrate or an external system).

| Register | Storage owner | Legal owner (profile key) |
|---|---|---|
| Laws and legal rules | platform `__civicosLaw` | `authorities.lawRegister` (gazette office or ministry of justice) |
| Case packages (workflow definitions) | platform `__civicosCasePackages` | the authority each package names |
| Cases | platform `__civicosCases` | the institution owning each case's package |
| Documents and signatures | platform `__civicosRecords` | the institution of the case or register it belongs to |
| Civil registration (people, vital events, certificates) | platform `__civicosCivil`, or an external CRVS (§11) | `authorities.civilRegistration` |
| Organisations | platform `__civicosOrganisations` | `authorities.businessRegister` and each accrediting or licensing authority for its standings |
| Access log of sensitive reads | platform `__civicosAccessLog` | `authorities.dataProtection` (oversight) |
| Delegations (acting for another person or an organisation) | platform `__civicosDelegations` | `authorities.businessRegister` (organisations), `authorities.civilRegistration` (persons) |

`register-owners.test.ts` gains: every store key has a legal-owner key; a
register whose legal owner is not named in the installation's profile shows
"no legal owner named" on its pages and in `/api/health` (not an error: the
nation decides).

### 2.2 The four existing casework mechanisms

They become views of the casework foundation (§6), in this order and without
removing any route or page (D 3.5, 2.1):

| Today | Becomes | When |
|---|---|---|
| Permits (`lib/data/store/permits.ts`, `/api/permits`, `/wallet/permits/new`, `/console`) | Cases of the package `permit.<type>`; `/api/permits` keeps its request and response shapes through an adapter | Gate 4 |
| Ministry task lists (`QueueItem`, `/gov/ministry/[id]`, case import, `ccf_` feeds) | The queue shows cases of the ministry's packages beside imported and fed items; imported items keep their `source` and actions | Gate 2 (cases appear), Gate 4 (imports may open cases) |
| Substrate work items (`civicos.work_items`, `/gov/workbench`, `/gov/intake`) | Mirrors of cases, written by `lib/db/mirror.ts` after each change, as directives are today | Gate 3 |
| Browser queue (`RuntimeQueue`, `lib/gov/runtime-store.ts`) | In production installations it reads `/api/cases` for the app's institution; in demo and training installations it keeps its local sample items, labelled | Gate 2 |

## 3. The installation says what it is (D §10, §14)

### 3.1 Installation mode

`CIVICOS_MODE=production | training | demo` (environment), readable through
one function `installationMode()` in a new `lib/ops/mode.ts`, next to
`lib/auth/mode.ts` and following its pattern (one place decides, warns at
start).

- **production**: no sample record is created by any seed; stores start
  empty; the demo citizen session is refused; simulated figures show the
  Simulation marker everywhere they appear; a sample record found in a store
  (a production installation converted from demo) is listed on
  `/gov/configuration` for an administrator to remove, four-eyes, audited
  (keeps the "only at an official's request" rule for records that exist).
- **training**: like demo, with a permanent banner "Training installation:
  nothing here is real" on every console and public page.
- **demo**: today's behaviour, with a permanent banner.
- Unset: `demo` in development; in a production build it fails closed: it runs
  as production, warns at every start, shows a banner on every page and
  reports it in `/api/health` until set (so no government runs in demo mode by
  accident). Built so instead of refusing to start, which would take an
  already-running deployment offline the moment it is upgraded. The self-host script
  writes `CIVICOS_MODE=production` into a new `civicos.env`, never changing an
  existing value.

Seeds become mode-aware: every `seed()` that creates records (ministry queues,
bills, notifications, the demo citizen, example permits) asks
`installationMode()` first. A test walks the seeds and fails when a seeded
record is created in production mode.

### 3.2 Deployment profile

`SovereignProfile` (`lib/api/types.ts`) is extended, not replaced (D 14.2):

```ts
interface DeploymentProfile {          // SovereignProfile.deployment
  jurisdiction: { iso3: string; legalSystem?: 'civil' | 'common' | 'mixed' | 'religious' | 'customary' | 'other' };
  calendars?: { workingDays: number[]; holidays: { date: string; name: string }[] }; // legal deadlines in working days
  authorities: Partial<Record<AuthorityKey, string>>;   // institution ids from /api/org
  modules: Partial<Record<ModuleKey, { enabled: boolean; source: 'civicos' | 'external'; system?: string }>>;
  identity: { citizens?: { issuer: string; clientId: string; assurance?: string }; assisted: boolean };
  signature: { framework: 'platform' | 'national'; trustList?: string };
  residency?: { region?: string; keyProvider?: string };
}
type AuthorityKey = 'lawRegister' | 'civilRegistration' | 'identity' | 'businessRegister'
  | 'higherEducationAccreditation' | 'immigration' | 'police' | 'judiciary' | 'statistics' | 'dataProtection';
type ModuleKey = 'law' | 'civil' | 'organisations' | 'accreditation' | 'licensing' | 'immigration' | 'police' | 'courts';
```

Edited in setup (a new section 3.5, "Who is responsible") and in
`/gov/configuration`, through the existing `/api/sovereign` and `/api/setup`
routes (ADMIN_ONLY), each change audited. Upgrades never overwrite it: the
Update Center's preflight already rescans nation customisations; the profile
joins that scan (D 14.3).

## 4. Authorisation model (D §8, §15)

### 4.1 Four questions, one rule set

Every casework, register and document route answers, in this order:

1. **Identity**: `currentOfficial()` (officials) or the citizen session
   (§10); machine callers by their own key.
2. **Authority**: `lib/auth/roles.ts`, extended with record-level rules that
   take facts about the record (no imports, as today):

```ts
interface CaseFacts {
  ownerInstitution: string;        // the package's owning institution
  sensitivity: 'normal' | 'restricted' | 'secret';
  assignedTo?: string;             // official id
  decision?: boolean;              // the action is a legal decision
  fourEyes?: boolean;
}
export function caseActRefusal(s: Scope & { id?: string }, c: CaseFacts): string | null;
export function caseReadRefusal(s: Scope & { id?: string }, c: CaseFacts, purpose?: string): string | null;
```

3. **Record**: the module's own function decides which fields the caller may
   see (`viewCase()`, like `viewFacility()` and `publicParcel()`).
4. **Execution**: the module's validated operation, which returns the evidence
   it produced (the history step, the decision document, the audit entry).

### 4.2 Rules

- A case is worked by officials of its owner institution (any role but
  auditor). A **decision** (grant, refuse, register, revoke) needs the role
  "Can sign" of that institution. The package may require four-eyes: the
  decision is proposed by one official and confirmed by a different one.
- **Administrators get no automatic domain authority** (D 8.2, 20.6): an
  administrator acts on a case only if the account belongs to the owner
  institution with the needed role. A whole-government administrator cannot
  decide any case. Installation decisions stay theirs (D 2.3).
  `ROLES[0].means` changes to "Manages official accounts, setup and the
  structure of government. Does not decide cases unless appointed to the
  institution that owns them."
- **Restricted** cases: read only by officials of the owner institution who
  are assigned to the case or are "Can sign" there, and by auditors with a
  stated purpose. **Secret** (reserved for police and immigration later):
  assigned officials and named supervisors only; auditors by purpose with a
  second confirmation.
- **Judiciary**: cases owned by an institution whose kind is a court are
  never readable or actionable by officials of another branch, administrators
  included; their auditors are the judiciary's own (D 4.6). The branch comes
  from `lib/gov/branches.ts`.
- Decisions and other actions marked `stepUp` in the package need a session
  that passed the second sign-in step within the last 15 minutes (the session
  token records when; `lib/auth/session-token.ts` gains `twoStepAt`).

The existing permit and queue routes keep their current rules until they move
onto cases (§2.2). `api-permission-coverage.test.ts` covers the new routes;
a new test proves a whole-government administrator is refused a case decision.

### 4.3 Access log (D 15.2, 15.3)

Reads of restricted and secret records, every search over them, every export,
refused access and permission changes are written to `__civicosAccessLog`: a
hash-chained log (same SHA-256 chaining as the audit chain, its own heads,
signed with the audit key), separate from the audit chain so that its volume
and retention differ. Each entry: official id and name, institution, record
id, action (view, search, export, refused), purpose, time, result, rule
reference, correlation id. It holds no record content. Readable by auditors
and by the data-protection authority's officials; administrators cannot edit
or prune it (pruned only by the retention schedule, §7.4, after the nation's
retention period). A daily check reports unusual patterns (many records, out
of hours, no assignment) to the data-protection authority's officials.

## 5. Laws register and legal rules (D §7)

### 5.1 Model

```ts
interface LegalInstrument {
  id: string;                      // stable, ELI-shaped path: /eli/{iso3}/{type}/{year}/{number}
  title: string; type: 'constitution' | 'act' | 'regulation' | 'decree' | 'order' | 'treaty' | 'bylaw' | 'other';
  jurisdiction: string;            // nation, or a region code
  issuingAuthority: string;
  officialSource?: string;         // gazette reference or URL of the official publication
  versions: LegalVersion[];        // append-only
  relations: { kind: 'amends' | 'repeals' | 'replaces' | 'implements' | 'cites' | 'depends-on'; target: string; at?: string }[];
}
interface LegalVersion {
  id: string; language: string;
  dates: { adopted?: string; published?: string; inForce: string; ceased?: string };
  publicationRef?: string;
  provisions: Provision[];         // the structure: articles, sections, paragraphs
  digest: string;                  // SHA-256 of the canonical text
  state: 'recorded' | 'confirmed' | 'withdrawn';
  recordedBy: string; confirmedBy?: string; at: string;
  applicability?: { territorial?: string[]; personal?: string; subject?: string; transitional?: string };
}
interface Provision { eId: string; num: string; heading?: string; text: string; parent?: string } // eId as in Akoma Ntoso
interface Citation { instrument: string; eId: string; version: string; on: string; context?: string }
```

### 5.2 Rules

- Recorded by an official of the law-register authority (or a
  whole-government administrator while none is named), confirmed by a
  different official; only confirmed versions can be cited. Every step
  audited. Withdrawal of a mistaken version keeps it, marked (D 2.1).
- `provisionOn(instrument, eId, date)` returns the confirmed version in force
  on that date, or an explicit "none in force" (never the current one by
  default). Cases resolve and store full citations (with version and digest)
  at the moment of the decision (D 5.5).
- Import: Akoma Ntoso XML (structure and `eId`s) and a plain structured CSV;
  export: Akoma Ntoso, JSON. The internal model does not depend on either
  format (D 7.4). Akoma Ntoso needs an XML parser: **decision for review**
  (§14.1).
- Nothing is seeded, in any mode except demo, where a clearly marked sample
  act ("Sample Civil Registration Act") lets the demo cite something
  (D 7.7, 10.3).
- AI never records, confirms or interprets (D 7.6). Directives gain an
  optional `legalBasis: Citation[]` (D 7.1).

### 5.3 Legal rules registry

Rules are part of case packages (§6.2): each package version lists its
citations, and each rule inside it (a required document, a deadline, an
eligibility condition) carries the citation it implements. A package version
is activated only after the authority's legal officer approves it (§6.3);
that approval is the "rule publication" D 7.5 asks for, with the tests that
validate it (§6.6).

### 5.4 Screens

`/gov/law` (new console item "Laws", plain words; glossary: "legal
instrument", "provision", "in force"): list, search, an instrument's versions
on a time line, provisions, what cites it (cases and directives), record and
confirm. Public read at `/laws` through the public sites rules (only confirmed
versions; the nation decides whether to publish).

## 6. Workflow foundation (D §5)

### 6.1 Records

```ts
interface Case {
  id: string;                      // uuid7
  ref: string;                     // human reference: {PREFIX}-{year}-{seq}, per package
  package: { key: string; version: number };   // pinned at opening
  owner: string;                   // institution id
  stage: string;
  subject: Party[];                // who or what the case is about
  applicant?: Party; onBehalfOf?: Party; delegation?: string;
  fields: Record<string, unknown>; // validated against the package version's field schema
  documents: string[];             // record ids (§7)
  assignee?: { id: string; name: string };
  priority: 'routine' | 'priority' | 'urgent';
  deadlines: { key: string; due: string; citation?: Citation; met?: string; lapsed?: string }[];
  decisions: Decision[];
  links: { kind: 'referral' | 'appeal' | 'related' | 'supersedes'; case: string }[];
  sensitivity: 'normal' | 'restricted' | 'secret';
  legalHold?: { by: string; at: string; reason: string };
  history: Step[];                 // append-only
  pending?: Proposal;              // a four-eyes step waiting for its second official
  source: 'entered' | 'citizen' | 'imported' | 'feed' | 'exchange' | 'sample';
  version: number;                 // for concurrency checks
  openedAt: string; closedAt?: string;
}
interface Party { kind: 'person' | 'organisation' | 'institution' | 'unregistered'; id?: string; name: string }
interface Step {
  seq: number; action: string; from: string; to: string;
  by: { id?: string; name: string; institution?: string }; confirmedBy?: { id?: string; name: string };
  at: string; reason?: string; evidence?: string[]; citations?: Citation[];
  idempotencyKey?: string; auditSeq?: number;
}
interface Decision {
  kind: string;                    // e.g. 'register', 'refuse', 'grant', 'revoke'
  reasons: string; citations: Citation[];
  document: string;                // the signed decision record (§7)
  appeal?: { until: string; body: string; suspensive: boolean };
  at: string; by: Step['by']; confirmedBy?: Step['by'];
}
```

### 6.2 Case packages

```ts
interface CasePackage {
  key: string;                     // e.g. 'civil.birth'
  version: number;
  owner: AuthorityKey | string;    // resolved through the profile to an institution
  title: string; refPrefix: string;
  citations: Citation[];           // the law the procedure rests on
  fields: FieldSpec[];             // typed, with validation and which are personal data
  documents: { class: string; label: string; required: boolean | { when: string }; citation?: Citation }[];
  stages: { key: string; label: string; terminal?: boolean }[];
  actions: ActionSpec[];
  deadlines: { key: string; from: string; days: number; calendar: 'calendar' | 'working'; citation?: Citation; onLapse: 'escalate' | 'notify' | 'deemed-refusal' | 'deemed-approval' }[];
  notifications: { on: string; to: 'applicant' | 'assignee' | 'owner' | 'subscribers'; template: string }[];
  appeal?: { days: number; body: string; suspensive: boolean; citation?: Citation };
  retention: string;               // retention class (§7.4)
  sensitivity: Case['sensitivity'];
  migration?: { from: number; stageMap: Record<string, string> };
  state: 'draft' | 'approved' | 'active' | 'superseded';
  activeFrom?: string; approvedBy?: string; author: string;
  tests: { name: string; steps: { action: string; fields?: Record<string, unknown>; expect: string }[] }[];
}
interface ActionSpec {
  key: string; label: string; from: string[]; to: string;
  decision?: string;               // makes it a legal decision of this kind
  needs: { role: 'officer' | 'signatory'; assigned?: boolean; fourEyes?: boolean; stepUp?: boolean };
  requires?: { documents?: string[]; fields?: string[]; reasons?: boolean; citations?: boolean };
  effects?: Effect[];              // what the module does on success (issue certificate, create person, publish event)
}
```

`Effect` names a function the owning module registers (for example
`civil.registerBirth`); the foundation calls it inside the same step, so the
domain logic stays in the module (D 4.4). A package cannot name an effect its
module does not register.

### 6.3 Package life cycle (D 5.3, 5.4)

draft (written by a domain official, or shipped by CivicOS as a reference
package) → approved (by an official of the owner authority holding "Can sign",
different from the author, after the package's tests pass) → active from a
date → superseded by the next version. Cases keep the version they opened
with; a new version's `migration` maps open cases' stages, applied only when
the approver chooses, audited. Reference packages shipped with CivicOS arrive
as **draft** in every nation: a nation never runs a procedure it has not
approved (D 5.4).

### 6.4 Engine

`lib/casework/engine.ts`: `openCase`, `act`, `confirm` (second official of a
four-eyes step; `dualControlRefusal`), `attach`, `assign`, `link`, `appeal`,
`refer` (opens a case of another package at another institution, linked both
ways, D 16.7), `hold`, `release`. Each:
- checks authority (§4) and the package (stage, required documents, fields,
  reasons, citations);
- refuses a stale `version` (D 5.9) and repeats an earlier result for a
  repeated `idempotencyKey` (D 5.8);
- appends one step and one audit entry, and queues the case's CloudEvent
  (`lib/events/outbox.ts`, types `civicos.case.opened`, `.stage-changed`,
  `.decided`, `.appealed`), with only the case id, package and stage, never
  personal fields;
- recomputes deadlines (working days from the profile's calendar); the
  scheduled job `/api/cron/case-deadlines` (every 15 minutes) applies lapse
  effects and notifies.

### 6.5 Routes and screens

- `/api/cases` (list for the caller's institution, open), `/api/cases/[id]`
  (read, act), `/api/cases/[id]/documents`, `/api/case-packages` (list,
  draft, approve). Rules: OFFICIAL_WORK with `caseActRefusal` /
  `caseReadRefusal` in the route; packages: officials of the owner authority.
- Console: a tab "Cases" under the existing "My work" item (`/gov/work/cases`
  already exists for case loads; the new list is `/gov/work/cases/open` with
  case pages at `/gov/cases/[id]`), and a tab "Procedures" under the
  institution item for packages. Each case page shows the evidence, the
  citations and the history, never only a recommendation (D 15.7).

### 6.6 Tests every package must pass

The package's own `tests` run at approval and in CI for reference packages;
plus engine tests: four-eyes by two officials, idempotency, concurrency,
lapse effects, citation version on the decision date, appeal window, legal
hold blocks disposal, administrators refused decisions, judiciary isolation.

## 7. Records, documents and signatures (D §9)

### 7.1 Documents

`lib/records/store.ts`: each document is a record with: id, class, title,
media type, size, SHA-256, the institution, the case or register record it
belongs to, sensitivity, retention class, version (append-only, a new
version supersedes), uploaded by, at. Content is stored sealed with the
envelope key (`lib/crypto/envelope.ts` `seal`/`open`), in the platform state
for small files (limit 5 MB each, 50 MB per case) and, later, in the backup
target's object store for larger ones (**decision for review**, §14.2). Types
are checked by their bytes (PDF, PNG, JPEG, WebP; never SVG or HTML), as
logos are.

### 7.2 Decision records and signatures

A decision produces a canonical JSON record (case, package version, decision,
reasons, citations with digests, officials, time) and its SHA-256. The
platform signs it:
- **platform framework** (default): an Ed25519 signature by the institution's
  decision key, held in key custody (`lib/keys/custody.ts`), with an RFC 3161
  time-stamp from the nation's time-stamp authority when configured (the
  audit chain already does this, `lib/audit/tsa.ts`). The official's
  identity is in the signed record; the key is the institution's seal.
- **national framework**: an adapter for the nation's qualified signature
  service (PAdES/XAdES under its signature law) when the profile says so;
  until connected, decisions are platform-signed and labelled as such
  (integration register entry).

The existing hash-only endpoints are upgraded in place (D 9.3):
`/api/signatures` signs with the institution key; `/api/documents/verify`
checks a certificate code against the register (§7.3) instead of accepting
any `VC-` code; directives gain a decision signature when signed.

### 7.3 Certificates and public verification (D 9.4)

A certificate is a document generated from a decision (HTML, printable; PDF
later, §14.3) carrying a verification code (12 characters, unguessable) and
a QR code. `/verify/[code]` (public, `(public)` group, open without sign-in)
shows only: kind of certificate, issuing authority, date, status (valid,
superseded, revoked) and whether the signature verifies; never personal data
beyond what the law requires the certificate to state, which the package
names. Optionally a W3C Verifiable Credential 2.0 export of the same facts
(Gate 4).

### 7.4 Retention, holds and disposition (D 9.5, 15.4)

`lib/data/retention.ts` gains retention classes: each with a period, the
event it runs from (closed, decided, last activity), the action at the end
(review, anonymise, destroy, transfer to archive), and its legal basis. Set
by the nation (four-eyes by administrators, as today). Legal holds on a case
or document stop disposal. Disposal leaves a disposition record (what class,
which ids, when, who confirmed, the replaced content's hash) and destroys the
content. Archival export: a package of records, documents and their manifests
with hashes (OAIS-style submission package) for the national archive.

## 8. Civil registration module (Gate 2, D 16.1)

### 8.1 Records (`lib/civil/`, store `__civicosCivil`)

- `Person`: internal id (uuid7), names (given, family, other names and
  scripts), sex as registered, date and place of birth, parents (person ids or
  unregistered parties), status (alive, deceased), identifiers by scheme
  (birth registration number, national ID when issued), matching history
  (links and splits with who and why), versions append-only.
- `VitalEvent`: birth, death, marriage; the event facts (date, place: a
  region, district or registered facility through `placePoint()` and the
  facility register), informant, registrar, witnesses, supporting documents,
  the case that registered it, registration number and date, late
  registration flag, corrections and amendments (each a new version with its
  case).
- `Certificate`: kind, event, version, issued at, verification code, signed
  decision, status, reissues.
- `MatchAlert`: possible duplicate person (score, reasons), adjudication case.

### 8.2 Packages (reference, arriving as draft)

`civil.birth`, `civil.death`, `civil.marriage`, `civil.correction`,
`civil.late-birth`, each with the stages of D 16.1. Birth:

| Stage | Action to next | Needs |
|---|---|---|
| draft → submitted | submit | applicant or registrar; required fields |
| submitted → completeness | check | officer of civil registration |
| completeness → verification | complete (or return for correction) | required documents per package |
| verification → pending-approval | verify (or refer for adjudication when a match alert is open) | officer; match alerts resolved |
| pending-approval → registered | register (decision) | "Can sign"; four-eyes if the package says; citation; step-up |
| registered → certificate-issued | issue | effect `civil.issueCertificate` |

Effects of `register`: create or link the child's `Person` (never merge
without adjudication), record the `VitalEvent`, assign the registration
number, publish `civicos.civil.birth.registered` (event id, registration
number, region, date; no names), and the twin count (§9).

### 8.3 Identity and the national ID (D 6.2, 6.3)

Birth registration does not create a national ID. National ID issuance is a
separate package `civil.national-id`, enabled only where the nation's law
gives it to the civil registry; otherwise the identity authority's own system
receives the registration event through the exchange (§10.3).

### 8.4 Screens

Console item "Civil registry" (existing interior screens keep their place;
`CivilRegistryCommand` shows real counts from the register in production and
its simulation, labelled, in demo): register search (by registration number,
name and date of birth; restricted reads logged), a person's record, a
case page per application, certificates. Citizen: `/wallet/applications`
(new) to notify a birth and follow it; assisted registration by a registrar
at an office for people without a sign-in (D 8.7, 8.8).

### 8.5 External CRVS (D 12.2, 20.3)

The module's functions form a port (`CivilRegistry` interface: find person,
get event, register event, get certificate status, subscribe). `source:
'civicos'` uses the module; `source: 'external', system: 'opencrvs'` uses a
connector that reads OpenCRVS records and events (FHIR-based in OpenCRVS)
through `safeFetchText` to the configured host, shows them with OpenCRVS as
their source and never claims ownership (D 3.4). The connector is evaluated
and built after the module (Gate 3 or 4); an integration register entry
records it.

## 9. Twin: provenance and records (D §11)

9.1 `SignalKind` gains `record` (authoritative administrative record) and
`simulated`; `modelled` stays for estimates and model outputs (D 11.4). The
`SignalTag` shows "Simulation", "Sample", "Modelled" and "Not connected" in
plain words (glossary entries); records, observations and official statements
carry no warning marker, and their class ("Record", "Observed", "Reported")
shows where a figure's lineage is opened. (Built in step 1.)

9.2 `Observation` gains optional fields, defaulted for old snapshots
(`withDefaults()`): `method` ('direct' | 'administrative-count' | 'estimate' |
'model' | 'simulation'), `sourceRecordedAt`, `coverage` ({ of: number;
have: number; note?: string }), `metricVersion`, `records?` ({ query: string;
count: number; snapshot: string /* SHA-256 of the ids counted */ }).
`recordedAt` is documented as "ingested by CivicOS" (D 11.3).

9.3 A new source kind `register`: the platform computes administrative counts
from its own registers on a schedule (for example registered births per
region per month), as observations of method `administrative-count`, kind
`record`, with the query and the hash of the counted ids, so an auditor can
reconcile the figure with the records (D 17.2 step 8, 17.4).

9.4 Conflicts (D 11.6, 11.7): when two sources give different values for the
same entity, metric and date, `stateAsOf` keeps returning the rule in force
(later import of the same source wins) but `conflicts()` lists cross-source
disagreements, and screens mark the figure "In conflict" until a named
official chooses, audited.

9.5 Organisations and standing become twin entities (`kind: 'organisation'`)
and status facts in Gate 4 (D 11.2).

## 10. Identity and exchange for the slice (D §8, §13)

### 10.1 Citizens

Citizens sign in through the nation's identity provider (OpenID Connect,
MOSIP-compatible or the country's own), configured in the deployment profile
(§3.2), reusing `lib/auth/oidc.ts` with a separate client and a signed
citizen session (`civicos_citizen`). The demo session (`civicos_session=demo`)
works only in demo and training mode. Until the provider is connected,
citizens are served by assisted registration at an office (D 8.7, 8.8).

### 10.2 Delegations

`__civicosDelegations`: who may act for whom (a parent for a child, a director
for a company), granted, revoked, expiring, each audited; the case records the
delegation it relied on (D 8.6). Gate 4 adds organisation representatives.

### 10.3 Exchange that carries data

`lib/exchange/services.ts`: a service directory (service id, version, owner
institution, schema, data classification, allowed callers, purpose, legal
basis citation). One function `callService(caller, service, input, purpose)`
used both inside the installation (between modules, so the boundary holds)
and over `/api/exchange/services/[service]` for other systems (integration
key, mTLS, usage policy, signed receipt, all existing, `lib/exchange/*`). The
provider module applies its own rule (D 13.3), returns only the fields the
service defines, and every call (allowed or refused) gets a receipt with a
correlation id. First services (D 13.6): `person.verify` (does this
registration number match these facts: yes, no, unknown; never the record),
`organisation.verify` (Gate 4), `civil.birth.registered` (event subscription
for permitted subscribers, through signed webhooks).

## 11. Simulated screens (D §10)

In production mode every figure from `lib/gov/*` engines carries the
Simulation marker (most panels already go through `SignalTag`; a test walks
the agency apps and fails on an engine figure shown without one). A screen
switches to records module by module (civil registry first). Nothing is
removed (D 2.1).

## 12. Proof of the slice (D 17.2, 17.4)

An end-to-end test (and a scripted walk-through for the owner on the preview)
runs the nine steps: a registrar notifies a birth; completeness and documents
checked; officer verifies; a second official registers it (four-eyes), citing
the confirmed provision in force on that date; the certificate is issued and
signed; `person.verify` answers a permitted caller; the event reaches
subscribers; the twin's births count rises with method `administrative-count`
and a snapshot hash equal to the hash of the registered ids; and the audit
chain plus case history reconstruct every step. The same run is repeated
after a backup and restore (`lib/data/backups.ts`) to prove the new stores
are covered.

## 13. Order of work (Gate 2 and the start of Gate 3)

Each step is one reviewed change with its tests, register entries, route-lock
and OpenAPI updates:

1. Installation mode and labels (§3.1, §11).
2. Deployment profile authorities and modules (§3.2).
3. Authority rules and access log (§4), including administrators' domain
   authority change.
4. Laws register and `/gov/law` (§5).
5. Documents, decision records, signatures, certificates and `/verify` (§7).
6. Workflow foundation: packages, engine, routes, case pages (§6).
7. Civil registration module and birth package; then death, marriage,
   correction, late birth (§8).
8. Twin provenance fields, `register` sources, conflicts (§9).
9. Citizen sign-in through OIDC, delegations, `/wallet/applications` (§10.1, 10.2).
10. Exchange services and the birth event subscription (§10.3).
11. The nine-step proof (§12).
12. Substrate mirror of cases; browser queue reading cases (§2.2).

Status (2026-10-20): steps 1 to 12 are built and tested (the proof is
`app/src/lib/proof/birth-registration.test.ts`; step 12 put cases in My work
and mirrors their progress to the substrate, `civicos.case_mirror`, rather
than into the citizen runtime's `work_items`, which keep one owner). What each
step built and what connecting it for real takes: `docs/INTEGRATION_REGISTER.md`
§18 (and 1.5, 6.5).

Gate 4 status: built (register §18.11–18.13): the organisations register
with register types per authority, licensing and accreditation procedures,
the public check, twin entities and counts, referrals as cases. Open: loading
existing registers, permits onto cases.

Gate 5 status: first slices built (register §18.14–18.16): visas and
residence permits with a status-check exchange service, police incident
intake and referral, court cases with hearings and the public cause list.
Open by design: asylum, border crossings, investigations and evidence,
judgment publication, each with its own safeguards and legal review.

Then Gate 4 (organisations, business registration or licensing,
accreditation with the facility link and the twin's organisation entities,
permits onto cases), Gate 5 and Gate 6 as in the directions (§17).

## 14. Decisions for review

14.1 **XML parser for Akoma Ntoso import.** Add one small, maintained
dependency (for example `fast-xml-parser`, checked through the usual supply
chain rules and the 24-hour release age), or write a minimal parser for the
subset used. Recommended: the dependency.

14.2 **Large documents.** Keep documents up to 5 MB in platform state (sealed)
and add an object store (the same S3-compatible target backups use, through
the safe fetch) for larger files in Gate 3. Recommended.

14.3 **PDF certificates.** Printable HTML certificates first (signed record
and QR code are what make them valid); PDF/A generation later with a
dependency chosen then. Recommended.

14.4 **Encryption of personal fields at rest.** Records of the civil register
and cases marked restricted or secret are sealed per record with the envelope
key in the persisted state (not only in backups). Recommended: yes, from the
start, since a government's civil register is among its most sensitive data.

14.5 **Production mode by default for self-hosting.** `npm run self-host`
writes `CIVICOS_MODE=production`; a demo needs `--demo`. Recommended.
