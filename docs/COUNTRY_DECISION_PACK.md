# Country decision pack

This pack lists the decisions a country makes before CivicOS is switched on for
real work (a production installation). The platform enforces these decisions.
It does not make them.

Each section says:

- what must be decided, as questions;
- what the platform does today if nobody decides;
- who in government usually decides;
- where the answer is entered, and by how many officials;
- the legal evidence to attach;
- a blank form to fill in.

Source: `docs/ACCEPTANCE_HARDENING_REPORT.md` ("Depends on country approval")
and `docs/GOVERNMENT_OPERATING_DIRECTIONS.md`. Every screen, function and
default named here was checked against the code. The pack gives no rates,
penalties or deadlines from any law. Those come from the country.

## Before you start: two things every section needs

1. **The laws are in the Laws register.** A legal basis is cited from the
   register. It is not typed in as free text. One official records each law
   version and a different official confirms it. A citation works only if a
   confirmed version is in force on the date the citation is used.
   *Where it is entered:* screen `/gov/law` (Laws); API `POST /api/law`, then
   `POST /api/law/confirm` (`recordVersion()`, `confirmVersion()` in
   `app/src/lib/law/register.ts`). Each law gets an ID shaped like
   `/eli/{jurisdiction}/{type}/{year}/{number}`, and each provision gets an ID
   such as `sec_3`.
2. **The government names who is responsible for each register.** Authority
   mappings and rules name a role such as "the tax authority". The platform
   finds the institution through the list of responsible authorities (see
   7.1). If that role has no institution, every decision under it is refused.

## One-page checklist

| # | Decision | Default today | Blocks production? | Where it is entered |
|---|---|---|---|---|
| 1 | Which body holds each permit, licence, registration or liability power, under which law, from when | Proposed drafts only. No body named, no law cited | **Yes.** Every decision of that type is refused | Permit authorities screen |
| 2 | Emergency suspension: who may suspend, how fast it is confirmed, how often it is reviewed | 72 hours to confirm, 30 days to review. Marked "not adopted" | No. The defaults apply | Permit authorities (API only) |
| 3 | Which further steps need two officials; does customs release need two; how long a proposal waits; must officials be linked to the national identity system | No extra steps. Proposals wait 24 hours. No linking required. Marked "not adopted" | No. The defaults apply | Two-official rules (API only) |
| 4 | What the public sees when checking a professional, profession by profession | Name, number, profession, standing, valid until. Conditions hidden | No. The default applies | Professions (API only) |
| 5 | Who may ask other institutions' data services, and for what purposes | No outside system may call | **Yes, for outside systems.** Internal modules still work | Interoperability screen |
| 6 | Tax rates, bands and the customs tariff | None. CivicOS ships no rates | No. Officials enter each amount with written reasons | Rates and tariffs screen |
| 7.1 | Which institution is responsible for each register | Nothing named | **Yes.** Decisions resting on an unnamed role are refused | Configuration, "Who is responsible" |
| 7.2 | Approving each procedure | Reference procedures stay drafts | **Yes.** A procedure that is not approved cannot start | Procedures screen |
| 7.3 | Register types and professions: who keeps each, which permit type governs it, how long a standing is valid | Reference types with proposed keepers and validity periods | No, but item 1 must cover their permit types | Organisations screen; professions (API only) |
| 7.4 | Which institution is the land registry (cadastre) | None named | **Yes, for land parcels.** No parcel can be recorded | Sites, parcel policy |
| 7.5 | Who certifies the location of registered sites, and who sets each category's sensitivity | The owning institution certifies. No sensitivity rules set | No. The defaults apply | Sites, policy panel |
| 7.6 | Must officials use a second sign-in step | Not required | No | Officials screen |

"Blocks production" means the platform refuses the work in a production
installation until the decision is entered. Demonstration and training
installations allow it and label it (`samplesAllowed()` in
`app/src/lib/ops/mode.ts`).

---

## 1. Authority mappings for each permit, licence, registration and liability type

**What it is.** For each type of permit, licence, registration or liability,
the law names a body that may issue it, renew, suspend and revoke it, and hear
appeals. CivicOS writes this down as an *authority mapping*. Every decision in
a case checks that mapping. In production, a decision of a type with no
approved mapping is refused.

### What must be decided

For each type in the table below:

1. Does this type exist in our law? If not, leave it unapproved.
2. Which body does the law name to issue it (the *lead authority*)?
3. Which bodies must be consulted first? Is their opinion mandatory or only
   advisory? (They advise. They never decide the permit.)
4. Who renews, suspends and revokes it, if not the lead authority?
5. Who hears appeals?
6. Does it apply to the whole country, or only to some regions or localities?
7. What is the legal basis: which law, and which provision?
8. From what date does it apply? Is there an end date?
9. If the issuing body changes from an earlier approved version: what is the
   handover plan for records, open cases and appeals?
10. May the public check a holder's standing?
11. Which procedures may be used for this type?

### The types to decide

CivicOS proposes these drafts (`PROPOSED_DEFAULTS` in
`app/src/lib/permits/authority.ts`). A proposed draft has **no legal basis**,
so it can never be approved as it stands. The country records its own version
with its legal basis and approves that version. The proposal can then be
withdrawn.

| Permit type key | Name | Proposed lead role | Used by decisions today |
|---|---|---|---|
| `business-registration` | Business registration | business register | register type `companies` |
| `trading-licence` | General trading licence | business register | register type `business-licences`; earlier permit type `business` |
| `university-accreditation` | University accreditation | higher education accreditation | register type `higher-education` |
| `school-registration` | School registration | education | register type `schools` |
| `health-facility-licence` | Health facility licence | health regulation | register type `health-facilities` |
| `pharmacy-licence` | Pharmacy licence | health regulation | register type `pharmacies` |
| `health-professional-licence` | Health professional licence | professional regulation | the four reference professions (doctors, nurses, midwives, pharmacists) |
| `building-permit` | Construction or building permit | *to be designated* | earlier permit type `building` |
| `land-title` | Land title registration | *to be designated* | not yet used by a decision |
| `environmental-permit` | Environmental permit | *to be designated* | not yet used by a decision |
| `work-permit` | Work permit | immigration (labour consulted, advisory) | not yet used by a decision |
| `visa-residence` | Visa and residence permit | immigration | not used: immigration decisions rest on the responsible-authority list (7.1) |
| `customs-authorisation` | Customs import or export authorisation | customs | not yet used by a decision |
| `vehicle-registration` | Vehicle registration | *to be designated* | earlier permit type `vehicle` |
| `transport-operator-licence` | Transport operator licence | *to be designated* | not yet used by a decision |
| `tax-registration` | Tax registration | tax | tax registration procedure |
| `tax-assessment` | Tax assessment and its variation | tax | tax return and objection procedures |
| `customs-clearance` | Customs duty assessment and release of goods | customs | goods declaration procedure |
| `qualification-record` | Record of qualifications | education | qualification procedures |

Three types used by the earlier permit workflow have **no proposed draft**.
The country records them from scratch if it uses them (`LEGACY_PERMIT_TYPES`):

| Permit type key | Earlier permit type |
|---|---|
| `market-stall-permit` | `market-stall` |
| `event-permit` | `event` |
| `food-handling-permit` | `food-handling` |

A register type or profession the country adds names its own permit type (see
7.3). That permit type needs a mapping here too.

### Default today, and what production does without a decision

- Default: drafts only, marked "proposed default". Five have no lead
  ("to be designated").
- Production: every decision of an unmapped type is **refused** ("No approved
  authority mapping governs …"). This is checked by `checkDecision()` in
  `app/src/lib/permits/decisions.ts` and `powerRefusal()` in `authority.ts`.
  A decision step the platform cannot place under any type is also refused.

### Who typically decides

The authority the law designates for each type, confirmed by the legal
adviser to government (or the office that drafts and interprets legislation).
Where the law is silent or split, it is a decision for whoever allocates
functions between institutions under the constitution.

### Where it is entered

- Screen: `/gov/law/permit-authorities` (Permit authorities). The button "Add
  the proposed defaults as drafts" loads the table above. "Record a version"
  takes the key, name, lead, start date, one law and provision, the bodies
  consulted, the appeal body and the handover plan.
- API: `POST /api/permit-authorities` with `op: 'draft'` (`draftMapping()`),
  `op: 'approve'` (`approveMapping()`), `op: 'withdraw'`, and
  `op: 'install-proposals'` (`installProposedDefaults()`). The API also takes
  things the screen does not: an end date (`effectiveTo`), regional or local
  scope with regions, separate renew/suspend/revoke holders (`powers`),
  several legal citations, the allowed `procedures`, and `publicCheck`.
- Officials: **drafted by one administrator, approved by a different one.**
  The platform compares the two people, not only the two accounts. Approval
  is refused if:
  - the lead is "to be designated";
  - there is no legal basis;
  - the lead changes from the version in force and there is no handover
    plan.

### Legal evidence to attach

- The law and provision that designate the authority, already recorded and
  confirmed in the Laws register and in force on the start date.
- The commencement date of that provision.
- If functions move between bodies: the transfer instrument and the handover
  plan.

### Answer form (one row per type; copy as needed)

| Permit type key | Lead authority | Consulted (mandatory / advisory) | Renews / suspends / revokes | Appeals heard by | Scope (national / regions) | Law ID and provision | Effective from | Effective to | Handover plan | Public check (yes/no) | Drafted by | Approved by |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |
| | | | | | | | | | | | | |

---

## 2. Emergency suspension of an authority mapping

**What it is.** In an emergency, an approved mapping can be suspended. From
that moment no new decision rests on it, and earlier decisions stand. A
different official confirms the suspension within a set number of hours and
reviews it by a set date. A different official from the one who suspended it
lifts it. A suspension that is not confirmed or reviewed in time stays in
force and is flagged.

### What must be decided

1. Who may suspend a mapping in an emergency?
2. Within how many hours must a second official confirm it?
3. Within how many days must it be reviewed (and at most how far ahead can
   each review set the next review)?
4. Which instrument or decision gives these periods?

### Default today, and what production does without a decision

- Default: confirm within **72 hours**, review within **30 days**. Both are
  marked **not adopted** (`DEFAULT_SUSPENSION_POLICY` in `authority.ts`).
  These are platform safety defaults. They are not taken from any law.
- Who may suspend: **any administrator**. The route is limited to
  administrators (`ADMIN_ONLY` in `app/src/lib/auth/roles.ts`). There is no
  setting to narrow this to named officials. If the law names a narrower
  group, record it on the form below and raise it with the publisher.
- Production: works with the defaults. The policy shows as not adopted until
  the country sets it.

### Who typically decides

The body the law gives emergency powers over licensing, or the government's
legal adviser if the law says nothing. Many countries set these periods in a
regulation or a cabinet decision.

### Where it is entered

- No screen yet. The Permit authorities screen has suspend, confirm, review
  and lift buttons, but no form for the periods.
- API: `POST /api/permit-authorities` with
  `{ op: 'suspension-policy', confirmWithinHours, reviewWithinDays, basis }`
  (`setSuspensionPolicy()`). Hours: 1 to 720. Days: 1 to 365. `basis` is
  free text naming the instrument; it is not checked against the Laws
  register.
- Officials: **one administrator**, recorded in the audit chain. No second
  official is needed to change the periods.
- Using the power: `op: 'suspend'` (`suspendMapping()`), then a different
  official does `confirm-suspension`, `review-suspension` or
  `lift-suspension`.

### Legal evidence to attach

The instrument that gives the emergency power and sets (or lets the
government set) the confirmation and review periods, with its provision and
commencement date.

### Answer form

| Question | Answer |
|---|---|
| Who may suspend (role or office) | |
| Confirmation period (hours) | |
| Review period (days) | |
| Instrument and provision | |
| Effective from | |
| Entered by (administrator) | |
| Date entered | |

---

## 3. Dual control: when two officials must decide

**What it is.** Some decisions need two officials: one proposes and a
different person confirms. The platform has a fixed minimum that a country
can add to but never lower:

- a tax assessment or its variation;
- a customs duty assessment;
- issuing, renewing, suspending, reinstating, revoking or correcting a
  regulated credential or register standing;
- approving an authority mapping or a rule; confirming, reviewing or lifting
  an emergency suspension; approving a procedure; confirming a law; restoring
  data.

### What must be decided

1. Does our law need two officials for further steps (for example above a
   value threshold, or for a particular refusal)? List each one as a
   procedure step.
2. Does releasing goods from customs need two officials? Today it needs one
   official who can sign. Refusing release already needs two.
3. How long may a proposal wait for its second official before it lapses?
   A lapsed proposal is kept on the case. Only a new proposal starts again.
4. Must both officials' accounts be linked to the national identity system
   before a two-official decision? Without linking, the platform can only
   prove that two different accounts acted. It records that weaker proof on
   the decision.

### Default today, and what production does without a decision

- Default (`DEFAULT_DUAL_CONTROL` in
  `app/src/lib/casework/dual-control-policy.ts`): no further steps; customs
  release by one official; proposals lapse after **24 hours**
  (`DUAL_CONTROL_HOURS` in `app/src/lib/data/dual-control.ts`); linking not
  required. Marked **not adopted**.
- Production: works with the defaults and the platform minimum. In
  production both officials must be signed in, each in their own request.

### Who typically decides

The authority that owns each procedure, for its own thresholds. The body
responsible for public financial control or internal audit, for value
thresholds. The government's identity or security authority, for whether
linking is mandatory.

### Where it is entered

- No screen yet.
- API: `GET /api/dual-control` shows the minimum and the current rules.
  `POST /api/dual-control` with
  `{ extra, requireIdentityBinding, pendingHours, basis }`
  (`setDualControlPolicy()`).
  - `extra` lists steps as `packageKey:actionKey`. For customs release this
    is `customs.declaration:release`.
  - `pendingHours` is 1 to 720.
  - `basis` is free text naming the instrument.
- Each submission **replaces the whole policy**. Send all three answers every
  time. A list left out clears the further steps. Linking is off unless sent
  as `true`.
- Officials: **one administrator**, recorded in the audit chain.
- If linking becomes mandatory, each official's account must be linked first
  (administrators, `POST /api/auth/officials/identity-provider`, action
  `decide`; screen `/admin/officials`).

### Legal evidence to attach

The financial regulations, procedure rules or administrative instrument that
set each threshold or two-person rule, with provision and commencement date.
For identity linking: the decision of the identity authority.

### Answer form

| Further step (`packageKey:actionKey`) | Why (threshold or rule, in words) | Instrument and provision | Effective from |
|---|---|---|---|
| `customs.declaration:release` (yes / no) | | | |
| | | | |
| | | | |

| Question | Answer |
|---|---|
| Waiting period before a proposal lapses (hours) | |
| Identity-system linking mandatory (yes / no) | |
| Basis (instrument or decision) | |
| Entered by (administrator) | |
| Date entered | |

---

## 4. What the public professional check shows

**What it is.** Anyone can check whether a person is registered in a regulated
profession. They search by full name, optionally narrowed by registration
number. The check is rate-limited and watched for bulk harvesting. Each
profession has a disclosure list that sets which fields are shown.

### What must be decided

For each profession:

1. May the public check it at all?
2. Should the registration number be shown?
3. Should the "valid until" date be shown?
4. Should conditions on practice be shown? Conditions can reveal a
   disciplinary history, so they are **hidden by default**. Show them only
   if the law makes them public.

The name and the standing are always shown. The person's identity reference,
qualifications and history are never shown.

### Default today, and what production does without a decision

- Default (`DEFAULT_PUBLIC_FIELDS` in
  `app/src/lib/professions/register.ts`): name, number, profession, standing,
  valid until. Conditions hidden. The four reference professions (doctors,
  nurses, midwives, pharmacists) are open to public checking.
- Production: works with the default.

### Who typically decides

The regulator that keeps each profession's register, under the law that sets
up that register. The data-protection authority should be consulted on
showing conditions.

### Where it is entered

- No screen for the disclosure list yet. The public check itself is at
  `/registers`.
- API: `POST /api/professions/types` with `{ key, title, authority,
  permitType, publicCheck, publicFields }` (`defineProfession()`).
  - `publicFields` is chosen from `name`, `number`, `profession`, `state`,
    `validUntil`, `conditions`, and must include `name` and `state`.
  - To change a reference profession, send its own key (for example
    `medical-practitioner`). The country's version then replaces it.
- Officials: **one administrator**, recorded in the audit chain.

### Legal evidence to attach

The provision of each profession's law on what the public register contains,
and any data-protection decision on publishing conditions.

### Answer form

| Profession key | Public check (yes/no) | Show number | Show valid until | Show conditions | Regulator | Instrument and provision | Entered by |
|---|---|---|---|---|---|---|---|
| `medical-practitioner` | | | | | | | |
| `nurse` | | | | | | | |
| `midwife` | | | | | | | |
| `pharmacist` | | | | | | | |
| | | | | | | | |

---

## 5. Data sharing between institutions: purposes and approved callers

**What it is.** One institution can ask another a narrow question through a
data service ("Is this person registered for tax?"). It never gets the file
itself. Each service returns only its own fields. Every call, allowed or
refused, gets a signed receipt with the stated purpose. The services are
listed in `SERVICES` in `app/src/lib/exchange/services.ts`.

| Service | Kept by (role) | What it answers | Class |
|---|---|---|---|
| `person.verify` | civil registration | Does this birth registration match these facts? | personal |
| `organisation.standing` | business register | Is this organisation registered, licensed or accredited? | public |
| `taxpayer.status` | tax | Is this person or organisation registered for tax, and for which taxes? | personal |
| `qualification.verify` | education | Is this qualification, held by this named person, valid? | personal |
| `professional.standing` | professional regulation | Is this person registered in a profession, and in what standing? Includes conditions on practice: the **authorised bulk path** | public |
| `customs.release` | customs | Have the goods on this declaration been released? | restricted |
| `immigration.status` | immigration | Does this travel document hold a valid visa or residence permit? | personal |
| `civil.birth.registered` (event) | civil registration | A birth was registered (number, month, region; no names) | restricted |

### What must be decided

For each service:

1. For which purposes may it be used? Name each purpose.
2. Which institutions or outside systems may call it?
3. What is the legal basis for disclosure?
4. For `professional.standing`: who may use the bulk path? It returns
   conditions on practice even where the public check hides them.
5. For the birth event: who may subscribe to it?

### Default today, and what production does without a decision

- Default: no outside system holds a key. Modules inside the installation
  call services directly.
- Production: an outside system is **refused** until two officials approve
  its integration with the scope `service:<service id>` and the purposes it
  may use for that service. For the birth event the scope is
  `events:civil`.
- What the platform checks: that the caller holds the scope, and that the
  purpose it states is one approved **for that caller and that service**.
  Any other purpose is refused with the approved ones named, and the
  refusal gets a signed receipt like every other call. Purposes are short
  words ("identity-card-enrolment"); a stated "Identity card enrolment"
  matches it.
- Modules inside the installation still only state a purpose. Their
  purposes are fixed in the code.
- An integration approved before purposes were recorded has no approved
  purposes. In production its service calls are refused until two officials
  approve them. Demonstration and training installations allow the call and
  mark the receipt "purposes not yet approved".

### Who typically decides

The authority that keeps each register (the data owner) approves each caller
and purpose. The data-protection authority is consulted for personal and
restricted services.

### Where it is entered

- Service list: `GET /api/exchange/services`. The exchange log is at
  `/api/exchange/log`.
- Callers: screen `/integrations` (Interoperability). Register the caller
  with its scopes. Then one official proposes the approval with its scopes
  and the purposes for each service ("person.verify: identity-card-enrolment"),
  and a different official confirms it.
  - API: `POST /api/integrations` (`registerIntegration()`), then
    `POST /api/integrations/{id}/approve` with `op: "propose"`, `scopes`
    and `purposes` (`proposeIntegrationApproval()`), then the same address
    with `op: "confirm"` from a different official
    (`confirmIntegrationApproval()`). `op: "withdraw"` withdraws a waiting
    proposal.
  - The key is shown once.
- Officials: **one administrator** registers and proposes; **a different
  administrator** confirms (compared by sign-in, and as a person where
  accounts are linked to the identity provider). A proposal not confirmed
  within the two-official waiting period (section 3) lapses. Every
  proposal, confirmation, lapse and withdrawal is kept on the integration
  and in the audit chain. Changing an approved caller's scopes or purposes
  takes the same two steps; until then its approved terms stay in force.
  Suspending or revoking a caller takes one administrator.
- Event subscribers: `/api/webhooks` (administrators).

### Legal evidence to attach

For each service and caller: the disclosure provision in the owning
authority's law (tax secrecy, customs confidentiality, the education or
immigration law, the profession's register law), any data-sharing agreement,
and the data-protection authority's opinion where one is required.

### Answer form (one row per caller and service)

| Service | Caller (institution or system) | Approved purposes | Legal basis (instrument and provision) | Data-protection opinion (ref.) | Approved by (owning authority) | Integration ID | Effective from | Review date |
|---|---|---|---|---|---|---|---|---|
| `taxpayer.status` | | | | | | | | |
| `immigration.status` | | | | | | | | |
| `customs.release` | | | | | | | | |
| `qualification.verify` | | | | | | | | |
| `professional.standing` (bulk) | | | | | | | | |
| `person.verify` | | | | | | | | |
| `organisation.standing` | | | | | | | | |
| `civil.birth.registered` | | | | | | | | |

---

## 6. Rates, bands and tariffs

**What it is.** Tax and customs amounts are calculated only from approved,
cited, tested rules. A rule is a flat rate, a set of rate bands, or a tariff
by goods code. CivicOS ships **no rates, bands or tariffs**.

### What must be decided

1. Which taxes does the tax authority calculate on the platform?
   - Each tax type needs a rule with the key `tax.<tax type>`. For example,
     `tax.income` if the tax type is recorded as `income`. The tax type is
     the one used when the taxpayer is registered.
2. Will the customs tariff be calculated on the platform? Its rule key is
   `customs.tariff` (`TARIFF_RULE` in `app/src/lib/customs/procedures.ts`).
3. For each rule:
   - which kind it is (flat rate, bands or tariff);
   - its rates;
   - the provisions of law it implements;
   - the date it applies from.
4. Which test cases prove each rule? A test is a base amount (and, for a
   tariff, a goods code) and the exact amount it must give.

### Default today, and what production does without a decision

- Default: no rules. `calculate()` in `app/src/lib/law/rules.ts` refuses.
- Production: does **not** stop. The assessing official must enter the
  amount and written reasons. The assessment is recorded as "entered", not
  "calculated". This applies to each tax assessment and each customs line.

### Who typically decides

The owning authority (the tax authority or the customs authority) prepares
each rule from the law. The finance ministry or legislature sets the rates in
law. The platform only records them.

### Where it is entered

- Screen: `/gov/law/rules` (Rates and tariffs). A draft is entered as JSON.
- API: `POST /api/rules` with `op: 'draft'` (`draftRule()`), then
  `op: 'approve'` (`approveRule()`). `GET /api/rules?key=…&amount=…`
  previews what the rule in force would give.
- Officials: **drafted by an official of the owning authority, approved by a
  different official who can sign there** (`canManageRule()` in `roles.ts`).
  - The tests run when the rule is drafted and must all pass.
  - Approval needs at least one citation from the Laws register.
  - Administrators of the whole government cannot draft or approve rules.

### Legal evidence to attach

The finance act, tariff schedule or regulation that sets each rate, with its
provision IDs from the Laws register and the date it applies from. Attach the
worked examples used as tests, signed off by the owning authority.

### Answer form (one row per rule)

| Rule key | Kind (flat / bands / tariff) | Owning authority | Law ID and provisions | Applies from | Applies to | Number of tests | Drafted by | Approved by |
|---|---|---|---|---|---|---|---|---|
| `tax.` | | | | | | | | |
| `tax.` | | | | | | | | |
| `customs.tariff` | tariff | | | | | | | |

---

## 7. Other country decisions found in the code

These were found by searching the code for production refusals, "not
adopted" defaults and policy settings. Each was checked in the code.

### 7.1 Who is responsible for each register

**What must be decided.** For each role below, which institution does the law
make responsible?

- laws register;
- civil registration;
- national identity;
- business register;
- higher education accreditation;
- immigration;
- police;
- judiciary;
- official statistics;
- data protection;
- tax;
- customs;
- education;
- health regulation;
- professional regulation.

The roles are listed in `AUTHORITIES` in `app/src/lib/nation/deployment.ts`.

**Default and production.** Nothing is named, and the platform never names an
institution itself. Mappings, rules and procedures name a role. If a mapping
gives a power to a role that has no institution, decisions under that
mapping are **refused**. Rules cannot be drafted for a role with no
institution. Civil registration, immigration, court and police decisions
rest directly on this list.

**Who decides.** Whoever allocates functions between institutions under the
constitution: usually the head of government's office or the cabinet,
following each sector law.

**Where it is entered.**

- Screen: `/gov/configuration`, section "Who is responsible", also part of
  setup at `/setup`. Saved through `/api/sovereign`.
- Officials: **one administrator**, recorded in the audit chain.
- The institutions must already exist in the ministry registry
  (`/api/org/ministries`).

**Evidence.** The law or decree that establishes or designates each
institution.

| Role | Institution | Instrument and provision | Effective from |
|---|---|---|---|
| | | | |
| | | | |

### 7.2 Approving each procedure

**What must be decided.** For each procedure: does it match our law? Which
version applies, and from what date?

**Default and production.** CivicOS reference procedures arrive as drafts. A
procedure with no approved version **cannot start** ("No approved version of
the procedure … applies today", `openCase()` in
`app/src/lib/casework/engine.ts`).

**Who decides.** The institution responsible for the procedure.

**Where it is entered.**

- Screen: `/gov/law/procedures`. API: `POST /api/case-packages` with
  `op: 'install-references'` (administrators; drafts only), `op: 'draft'`
  and `op: 'approve'` (`approvePackage()` in
  `app/src/lib/casework/packages.ts`).
- Officials: **an official who can sign at the responsible institution
  approves.** The procedure's own tests must pass first.
  - For a procedure the country wrote, the approver must be a different
    person from its author.
  - For a CivicOS reference procedure there is no national author, so one
    official who can sign approves it.

**Evidence.** The provisions each procedure cites, recorded in the Laws
register.

| Procedure key | Version | Applies from | Approved by | Notes |
|---|---|---|---|---|
| | | | | |

### 7.3 Register types and professions

**What must be decided.** For each register of organisations (companies,
business licences, accredited universities, schools, health facilities,
pharmacies, and any the country adds) and each regulated profession:

- which authority keeps it;
- which permit type governs its decisions (and so which mapping in
  section 1);
- how long a standing is valid, if the law sets a period.

**Default and production.** Reference types ship with proposed keepers and
permit types (`REFERENCE_TYPES` in `app/src/lib/organisations/register.ts`,
`REFERENCE_PROFESSIONS` in `app/src/lib/professions/register.ts`).

- Two reference register types carry a platform validity period: business
  licences and accredited universities. These are proposals, not the
  country's law. The country confirms or replaces them.
- Production does not stop on these settings. Decisions are still refused
  until the permit type's mapping is approved (section 1).

**Who decides.** The authority the sector law designates for each register or
profession.

**Where it is entered.**

- Register types: screen `/gov/organisations`; API
  `POST /api/organisations/types` (`defineRegisterType()`).
- Professions: API `POST /api/professions/types` (`defineProfession()`).
- Officials: **one administrator** for each, recorded in the audit chain.

**Evidence.** The sector law that sets up each register or profession, and
any provision on validity periods.

| Register or profession key | Kept by | Permit type | Validity (from law) | Instrument and provision |
|---|---|---|---|---|
| | | | | |

### 7.4 Land parcels: which institution is the land registry

**What must be decided.**

- Which institution is the cadastre authority?
- What is the parcel ID format?
- Are overlapping parcels refused or flagged, and with what tolerance?
- Which survey methods are accepted?

**Default and production.** No cadastre authority is named. Recording a
parcel is **refused** until one is named ("The nation has not named its
cadastre authority", `app/src/lib/data/parcels.ts`). The other settings have
platform defaults.

**Who decides.** The authority the land registration or survey law
designates.

**Where it is entered.**

- Screen: `/gov/sites/parcels` (parcel policy). API:
  `/api/parcels/policy` (`proposeParcelPolicyChange()`,
  `decideParcelPolicyChange()`).
- Officials: **proposed by one administrator, confirmed by a different
  administrator.**

**Evidence.** The land registration or cadastral survey law, with the
provision that designates the authority.

| Question | Answer |
|---|---|
| Cadastre authority (institution) | |
| Parcel ID format and example | |
| Overlaps: refuse or flag; tolerance | |
| Accepted survey methods | |
| Instrument and provision | |
| Proposed by / confirmed by | |

### 7.5 Registered sites: who certifies locations, and how sensitive each category is

**What must be decided.**

- Who certifies a site's location: the owning institution, the national
  mapping agency, or both?
- Which institution is the mapping agency?
- Which capture methods count?
- For each category of site: is it public, restricted or confidential? Which
  body decides that, under which law?

**Default and production.** The owning institution certifies. No mapping
agency is named. No category has a sensitivity rule, so categories use the
platform's suggestion, decided by the owning institution (`DEFAULT_POLICY` in
`app/src/lib/data/facilities.ts`). Production works with these defaults. A
category marked restricted or confidential must cite its law.

**Who decides.** The national mapping or survey authority for certification.
For sensitivity, the bodies the law names (for example security or critical
infrastructure law).

**Where it is entered.**

- Screen: `/gov/sites` (policy panel). API: `/api/facilities/policy`
  (`proposePolicyChange()`, `decidePolicyChange()`).
- Officials: **proposed by one administrator, confirmed by a different
  administrator.**

**Evidence.** The survey or mapping law; for each restricted or confidential
category, the provision that makes it so.

| Question or category | Answer | Deciding body | Instrument and provision |
|---|---|---|---|
| Certification (institution / mapping agency / both) | | | |
| Mapping agency | | | |
| Accepted capture methods | | | |
| Category: | | | |

### 7.6 Second sign-in step for officials

**What must be decided.** Must officials use an authenticator code when they
sign in? The choices are: nobody required, those who can sign plus
administrators, or everyone.

**Default and production.** Nobody is required (`twoStepPolicy()` returns
`none`, `app/src/lib/auth/officials.ts`). Production works with this default.
Once a policy applies to an official, that official can make no changes until
they have passed the second step.

**Who decides.** The government's information security authority.

**Where it is entered.**

- Screen: `/admin/officials`. API: `POST /api/auth/two-step` with
  `{ action: 'policy', policy: 'none' | 'signers' | 'all' }`
  (`setTwoStepPolicy()`).
- Officials: **one administrator.**

**Evidence.** The government's information security policy or directive.

| Question | Answer |
|---|---|
| Policy (none / signers / all) | |
| Instrument or directive | |
| Entered by / date | |

---

## Gaps found while checking (for the publisher, not the country)

These are facts about the platform today, noted so officials are not
surprised:

- Suspension periods, dual-control rules, profession disclosure lists and
  two-step policy have **no screen**. They are entered through the API.
- The suspension periods and dual-control rules are changed by **one**
  administrator. Their `basis` is free text, not a citation checked against
  the Laws register.
- "Who may suspend" is not a setting. Any administrator may.
- Data services check an outside caller's purpose against the purposes
  approved for that caller and service, and approving a caller takes two
  officials. But the two officials are any two administrators: the platform
  does not require one of them to belong to the authority that keeps the
  register. The legal basis for each caller is a free-text note, not a
  citation from the Laws register. Internal modules still only state a
  purpose.
- The `visa-residence`, `work-permit`, `land-title`, `environmental-permit`,
  `customs-authorisation` and `transport-operator-licence` mappings are not
  yet consulted by any decision. Immigration decisions rest on the
  responsible-authority list (7.1).
- The earlier permit types `market-stall`, `event` and `food-handling` need
  mappings in production. CivicOS does not propose drafts for them.
