# CivicOS — working rules

## Preservation doctrine (locked)

What has been built is locked. Work only upgrades it toward the vision in
`CIVICOS_MASTER_BLUEPRINT.md` and `CIVICOS_VOL_II_CIVILIZATION_INFRASTRUCTURE.md`.

- Never delete a page, route, feature, component, or capability. Extend or
  upgrade it in place.
- Moving a route is allowed only when the old path keeps working (redirect)
  and `app/src/app/route-lock.json` is updated in the same change.
- New pages are added to `app/src/app/route-lock.json`.
  `app/src/app/route-lock.test.ts` fails if a locked route loses its page or
  a new page is not recorded.
- Redesigns keep every link, data source, and action the previous version had.
- Build on what exists. Before adding a flow, API, or store field, search for
  the existing system that already does it (e.g. `/api/sovereign`, the
  ministry registry under `/api/org`, `/gov/configuration`,
  `/admin/onboarding`) and use or extend it. New backends only for genuinely
  missing capability.

## Government operating model

- Agreed directions for running a whole government (registers, casework,
  laws, identity, exchange, records, the twin's provenance, sequence and open
  decisions): `docs/GOVERNMENT_OPERATING_DIRECTIONS.md`. Read it before work
  on any agency, register, case, identity or exchange feature. Findings it
  rests on: `docs/GOVERNMENT_OPERATING_REVIEW.md`; external review in full:
  `docs/reviews/2026-10-external-architecture-review.md`.
- What the installation is: `CIVICOS_MODE` (production, training, demo), decided
  only in `lib/ops/mode.ts` (`installationMode()`, `samplesAllowed()`). A
  production installation creates no sample record (a seed that makes one asks
  `samplesAllowed()` first; `seed-mode.test.ts`), has no demo citizen, and
  agency apps show the Simulation notice; training and demo show a banner on
  every page. Unset in a production build it runs as production and warns.
- Progress is measured by legally valid services working end to end, not by
  screens. Each register and record type has one named owner; the twin
  derives from records and never creates authoritative facts.
- Every decision cites the law version that applied; a status change is an
  authorised action with evidence, time and reason. AI never makes a legally
  material decision.
- Who is legally responsible for a register or power comes from the deployment
  profile (`lib/nation/deployment.ts`, `authorityFor()`); never assume a
  ministry by name. A new register joins `lib/data/register-owners.ts` with its
  owner, its one changing API and its `legal` authority.
- Cases change only through `lib/casework/engine.ts` (`openCase`, `act`)
  under an approved procedure package (`packages.ts`: drafted by one official,
  tested, approved by another). Case permissions are `caseActRefusal()` /
  `caseReadRefusal()` in `roles.ts`: administrators have no domain authority,
  the judiciary is isolated, restricted cases go to their assignee and
  supervisors. Every read of personal data in a case, the civil register or a
  document goes to the access log (`lib/records/access-log.ts`).
- Registers such as the civil register change only through procedure effects
  (`lib/civil/procedures.ts`), never through a direct write route. Laws enter
  through `lib/law/register.ts` (recorded and confirmed by two officials);
  decisions cite a law version from it. Decision records are signed with the
  `decision` key, certificates are checked at `/verify`; reference procedures
  are drafts until a nation approves them. Status: register §18.
- Organisations (`lib/organisations/register.ts`) change only through the
  effects in `lib/organisations/procedures.ts`; a standing in a register is
  changed only by the authority that keeps that register type. Lists, the
  public check (`/registers`) and the twin carry `publicOrganisation()`;
  representatives only on the full record under `canReadOrganisation()`.
  Referrals between institutions are cases (`lib/casework/referral.ts`).
- Immigration (`lib/immigration/`) holds visas and residence permits only;
  read by the immigration authority (`canReadImmigration()`, every read in
  the access log). Other institutions learn status only through the
  `immigration.status` exchange service, never the file. Do not add asylum,
  border enforcement or any risk score without the safeguards of directions
  §15 and an independent legal review.
- Police (`lib/police/`) is intake and referral only: classification cites
  the law, no field records a suspect or a finding. Courts (`lib/courts/`)
  are worked only by the judiciary; the public cause list
  (`causeList()`) never carries parties or the subject of a case.
- Who holds a power over a permit or licence type comes from the permit
  authority registry (`lib/permits/authority.ts`, `powerRefusal()`): drafted
  by one administrator, approved by another, citing the law. Proposed
  mappings ship as unapproved drafts; a production installation refuses a
  power no approved mapping covers. Never hardcode a ministry for a permit.
- Rates, bands and tariffs come only from `lib/law/rules.ts` (approved,
  cited, tested versions; `calculate()` refuses without one). Never type a
  statutory rate, penalty or deadline into code or seed data.
- Tax (`lib/tax/`) is read by the tax authority only (`canReadTax()`, every
  read in the access log); others use the `taxpayer.status` exchange service.
  Liabilities are bills with a domain reference (`issueBill()`), reconciled
  from receipts once each.
- Exchange services (`callService()`) answer an outside caller only for a
  purpose approved for it and that service; an integration is approved (and
  its scopes or purposes changed) by two officials
  (`proposeIntegrationApproval()` / `confirmIntegrationApproval()`).
- Education (`lib/education/`): schools are organisations (a standing in the
  `schools` register), never a second identity. Qualifications are recorded,
  corrected and revoked only through education cases; anyone else checks one
  through `qualification.verify` (number and holder's name). Returns carry
  aggregate counts only; there is no student record system.
- Health (`lib/health/`, `lib/professions/`): facilities and pharmacies are
  organisations licensed in the health regulator's registers; professionals
  are on the professions register, each profession kept by its regulator.
  Public, administrative and clinical data stay apart: no patient or clinical
  field anywhere, no national patient record; returns are aggregates.
- Customs (`lib/customs/`): duty only from the approved `customs.tariff` rule
  or entered with reasons; the control channel is an officer's choice with
  reasons, never a score; no seizure, penalty or detention powers. Others
  learn only whether goods were released (`customs.release`).
- Every decision step is classified in `lib/permits/decisions.ts` (permit
  mapping, deployment-profile domain, or refused in production when
  unclassified); the case engine checks it when a decision is proposed and
  when it is made, and the sealed decision records the mapping and rule
  versions (`authority`, `rules`). A new procedure family joins the
  classification or names `authority.permitType` on its package.
- Case-governed registers (civil, organisations, professions, tax,
  education, immigration, customs, health, court hearings) change only in
  their procedure module's effects; `lib/casework/register-writes.test.ts`
  fails on any other file importing a changing function (listed exceptions
  carry their reason) or touching a register's store. Loading an existing
  organisations register (`lib/organisations/import.ts`) is proposed by one
  official of the keeping authority and confirmed by a different one who can
  sign, within the waiting period, under the approved mapping in production.
- An approved mapping can be suspended in an emergency
  (`suspendMapping()`): no new decision under it; confirmed, reviewed and
  lifted by a different official; periods and who may suspend from the
  country's policy.
- The country's own rule sets (dual-control rules, suspension rules) change
  only through `lib/law/policy-change.ts`: proposed by one administrator
  citing the laws register, confirmed by a different official, values left
  out kept, every version kept. A new country rule set uses it too.
- Two officials are needed for the platform minimum in
  `lib/casework/dual-control-policy.ts` whatever a procedure says; the
  country adds steps, never removes them. Dual control compares people
  (`personOf()`, identity-provider link) and records `independence`; a
  waiting proposal lapses and is kept (`lapsedProposals`).
- The public professional check takes one person by full name (the number
  only narrows it), shows the profession's `publicFields`, is rate-limited
  and watched for harvesting; bulk checks go through `professional.standing`.
  In postgres mode route rate limits and the harvest watch are shared by
  every instance (`lib/ops/shared-limits.ts`); new runtime tables like them
  join `SKIP_TABLES` in `lib/backup/state.ts` (never backed up).
- A data restore keeps the event outbox and cursors, voids events after the
  restored point and raises `restoreepoch`; consumers re-read on
  `backup.restore` (docs/DISASTER_RECOVERY.md).
- Audit administration stays apart from operations: administrators do not
  read the access log, reading it is itself logged, and shortening it needs
  the data-protection authority after two administrators
  (`confirmByOversight()`, which compares persons, never names). Unusual access is raised by
  `lib/records/access-watch.ts`; a finding is a prompt, never a conclusion.

## Constitutional architecture

- Branches, institutions, offices, powers and the relationships between them
  follow `docs/CONSTITUTIONAL_ARCHITECTURE.md` (external guidance kept verbatim;
  binding). How it applies to the code, phase by phase:
  `docs/CONSTITUTIONAL_ARCHITECTURE_PLAN.md`; the code as audited:
  `docs/reviews/2026-10-separation-of-powers-audit.md`.
- Ministries and institutions as complete, standalone-deployable systems
  follow `docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md` (external specification,
  six parts, kept verbatim; binding). Assessment, upgrades, lower-priority
  items, mapping to the code and build order:
  `docs/INSTITUTIONAL_ARCHITECTURE_PLAN.md`. Its implementation starts only
  after the constitutional phases are complete and integrated. CivicOS enforces the
  nation's configuration and never invents, transfers or assumes authority:
  no institution is a child of a universal executive administrator, a seniority
  or a role never grants a power its institution lacks, independence is
  recorded per dimension (decisions, appointment, dismissal, funding,
  instructions), and constitution-dependent powers ship as slots or unapproved
  drafts until the nation's legal process approves them.
- An institution's constitutional terms (standing, branch, establishing law,
  effective date, independence per dimension, prohibitions, records owned)
  live on the ministry registry record (`lib/data/store/institutions.ts`):
  recorded directly only during first-run setup, afterwards only through
  `policy-change.ts` (cite the law, a different official confirms; an
  independent institution with its own signers confirms itself). Never ship
  a standing or independence value for a nation; existing records read as
  an executive ministry.
- Who is independent is `institutionBounds()` (standing, and the bodies named
  for judiciary, data protection, legislature, head of state, constitutional
  court). `roles.ts` reads it from `Scope.bounds`, filled by
  `currentOfficial()` at each request (never signed into the session):
  whole-government scope and auditors stop at independent institutions
  (`reaches()`); only the public audit office reads an independent body's
  case, with a purpose, never a court's. A new rule about an institution's
  records uses `reaches()`/`isIndependent()`, never `wholeGovernment()` alone.
- Accounts of an independent institution are changed by its own
  administrators; a whole-government administrator's change waits for its
  confirmation (`accountChangeRule()`, `lib/auth/account-changes.ts`). After
  setup, presets are refused and who is responsible changes only through
  `/api/sovereign/authorities`. Directives from the whole government are
  issued by `executive-office`; an independent institution receives only a
  request, communication or referral, unless an approved `instruct`
  relationship covers the instruction.
- Relationships between institutions (appoint, fund, instruct, audit,
  request information …) live in the relationship register
  (`lib/data/store/relationships.ts`, part of the institution register),
  changed only through `policy-change.ts` (an administrator cites the law, a
  different official confirms, each independent end with its own signers
  confirms; every version kept). None ships, in any mode. `roles.ts` reads the
  approved ones in force from `Scope.bounds.relationships`: an instruction
  reaches an independent institution, or one institution instructs another,
  only under an `instruct` relationship (`directiveTargetRefusal()`); an
  `audit`/`request_information` relationship grants a read of the listed
  records for a listed purpose only (`readRelationship()`), logged with the
  relationship and version, never a change, decision, secret case or a
  court's case. A new cross-institution power reads this register.
- Offices are records (`lib/nation/office-register.ts`, `/api/offices`):
  recorded directly only during setup, afterwards through `policy-change.ts`
  (cite the law, a different official confirms; an independent institution's
  own signer confirms its offices). Head of state and head of government are
  separate offices; until one is recorded the head of government is derived
  from `executiveTitle`. Holders are linked by one official and confirmed by
  another, ended with a reason and kept. Holding an office grants no
  permission: `roles.ts` never reads offices. Never ship an office, title or
  power for a nation.
- Greetings name the signed-in official and their office (`lib/workspace/home.ts`),
  never the nation's executive title; `/welcome` routes by the institution's
  standing and the Command Center stays the executive's home. The shared
  workspace panels are `/gov/workspace` (`/api/workspace`), within `roles.ts`.
- Separation of powers is observed, never generated (`lib/gov/separation.ts`,
  `/api/constitution/separation`): each check reads a configuration fact and
  links to its record. The state's classification (`constitution.classification`,
  `lib/nation/classification.ts`) is lists with sources and dates beside the
  locked `stateForm`; `platformLabel` reads its `style`, else the old derivation.
  After setup it changes only through `/api/sovereign/classification`.
- The constitutional profile (`lib/constitution/`, `/api/constitution/profile`,
  National settings → Constitution) bundles the parts kept on their own
  (`parts.ts`: classification, institution terms, who is responsible, offices,
  relationships, dual-control and suspension rules) by version and SHA-256
  digest; never move a part's storage or change process into it. A new part of
  the constitutional configuration joins `parts.ts` and `PART_AUDIT`. Steps are
  events by named officials: legal review, validation and every approval by
  people other than the drafter, two approvers minimum, each naming the act
  that authorises it; the nation adds steps, never removes them. Never present
  the platform's approval as the constitutional process. No profile ships in
  any mode. A dispute freezes the parts it touches (`frozenRefusal()` in
  `policy-change.ts`) and keeps the status quo until a recorded decision.
- Consequential actions record the profile version in force (`profileRef()`):
  sealed decisions carry `profile`; access-log entries are format 2 with the
  office acted under (`accessBy()`) and the profile inside the hash. Never
  change a hashed field list in place: add a new entry format and keep the old
  one verifying.
- The legislature's record (`lib/legislature/register.ts`, `/api/legislature`)
  is kept by the institution named for the `legislature` slot and written only
  by its officials (`legislativeRecordRefusal()`; assent by the head of
  state's office, `assentRefusal()`); never by whole-government scope or a
  ministry, and no other file imports a changing function (`writes.test.ts`).
  Stages, vote rules, assent and publication come from the procedure two of
  its officials approve; the reference ships unapproved. A recorded vote or
  journal entry changes only by a correction a different official who can sign
  there confirms, the earlier version kept. Enacted texts enter the laws
  register from the certified record (`transmitToLaws()`, source
  `legislature`), confirmed by a different official; `/api/law` never takes a
  source from the request.
- A regional or local government (standing `subnational`) is outside
  whole-government reach (`Boundaries.subnational`); the centre reads or
  instructs there only under an approved relationship. The portability tests
  (`lib/nation/portability.test.ts`, three illustrative profiles built only
  through the platform's own functions) prove the mechanism, never a legal
  mapping; keep them passing and keep country-specific code out.

## Entry flow

- `/` is the cover page, Plaza (`app/src/components/features/cover/CoverPlaza.tsx`):
  everyone meets it first and chooses an entry path. It plays an opening
  sequence on every open (plaza reveal, seal assembly, live start-up checks
  from the registry and audit chain), skippable by click/Enter/Space/Esc and
  skipped under reduced motion. The earlier Stack cover (`CoverGate.tsx`)
  stays at `/cover/stack`.
- `/cover` compares cover designs under evaluation (Stack, Boot, Atlas, Doors, Plaza);
  all share `app/src/components/features/cover/entry.ts` for routing.
- Government and New institution entries go to `/welcome`. Until setup is
  complete (`GET /api/setup` returns null), `/welcome` hands over to `/setup`,
  the first-run onboarding (nation profile, identity, institutions). Launch
  records completion; every later sign-in lands on `/welcome` directly.
  `/setup` stays reachable afterwards to review and edit the live configuration.
- `/command` is the Sovereign Command Center (formerly `/`), unchanged.
- `/admin/onboarding` is the setup hub: `lib/onboarding/status.ts` reads each
  track (nation, who is responsible, officials, laws, mappings, country rules,
  procedures, rates, registers, data sharing, sites, maps, operations,
  updates; the demo track only where `samplesAllowed()`) from the systems that
  hold it, never a copy, and lists changes waiting for a second official
  (`GET /api/onboarding/status`, `canSeeOnboarding()`). A new register, rule
  set or two-official store adds its check or waiting item there. Refusals
  naming "Who is responsible" link to `/gov/configuration#who-is-responsible`
  through `RefusalText`.
- Sign-in surfaces: `/sign-in` (substrate email + password) and `/login`
  (citizen verification). The cover hands off to them; it does not replace them.

## Update Center

- `/updates` is each nation's update chamber (global releases + builds made
  for that nation from its feature requests, `/updates/requests`);
  `/admin/releases` is the publisher console. Store: `lib/data/updates.ts`,
  API: `/api/releases`.
- Its sample history (releases, the sandbox tenant, advisories, tickets,
  orders, officials, escrow reviews) exists only in demo and training
  installations; a production installation starts with its own nation on the
  version it runs (`runningVersion()`) and nothing else.
- Updates are never automatic: only `decide()` changes a nation's install
  state, each step names a person and is written to the audit chain.
  Security releases are highlighted, never forced.
- A nation sees only global releases and its own builds and requests; the
  server resolves the nation (installed nation or private link key), callers
  never name one.
- Resilience: every install needs a verified restore point and runs on
  probation (default 30 min; `/updates/settings`). A failed probation switches
  the *software* back to the last known good release — the only automatic
  step, never an upgrade and never data. Releases that are not backward
  compatible (`compatibleWithPrevious`) always ask first. Restoring the data
  snapshot is a separate decision with an explicit loss warning. One bad or
  missing health report only marks the release degraded; fallback needs 3 in
  a row or two independent critical failures.
- The watchdog `/api/cron/update-watchdog` (pg_cron, every minute) concludes
  probations and never installs. Health reports need the nation's agent
  credential (issued in `/updates/settings`, stored as a hash), never a
  session or link key.
- Security store (`/updates/security`, `lib/data/security-store.ts`):
  baseline protection is included free for every nation; paid tiers are
  certified third-party server-side tools (instant payment or procurement:
  quote → PO → invoice → bank transfer → licence). Nations may bring their
  own tooling. Security updates are never blocked by payment or licence
  status; coverage is advisory only.
- Hosting & deployment (`/updates/hosting`, `lib/data/hosting.ts`): four
  paths — own data centre, another cloud, our hosted cloud (yearly or
  5-year prepaid), perpetual licence operated alone. Estimates come from one
  parameterised cost model (`lib/updates/hosting-model.ts`, placeholder unit
  costs, every figure labelled an estimate); the publisher's engineering
  review issues versioned assessments. Switching paths is a new request with
  a migration plan, data export and no lock-in.
- Readiness (`lib/data/readiness.ts`): approval rescans the nation's
  customisations (preflight); unwaived blocking findings stop it, and only
  two named officials can waive one. A production install needs the release
  to have passed staging probation plus a named UAT sign-off (per-nation
  policy, on by default).
- Change control (`lib/data/change-control.ts`): production approve and
  install are four-eyes — one official proposes, a different one approves
  (`pending` on the install). Scheduling into a blackout is refused; a
  change freeze blocks installs except security/critical releases.
- Security advisories (`lib/data/advisories.ts`): CSAF 2.0-style records
  with a VEX status per nation computed from its installed version (publisher
  VEX statements override, with a justification, audited). Each nation sees
  only its own exposure and can download CSAF JSON; patch-time commitments
  (`PATCH_COMMITMENTS`) are tracked met / open / breached in the console.
- Support (`lib/data/support.ts`, `lib/data/status.ts`): tickets P1–P4 about
  a release or incident, with response and resolution targets from the
  nation's contract tier at opening (resolution pauses while waiting on the
  nation). Every fallback incident opens a P2 ticket automatically. Each
  nation has a status page (`/updates/status`) and a monthly SLA report;
  the publisher works the queue and declares service incidents in the console.
- Assurance (`lib/data/supply-chain.ts`, `/updates/assurance`): every
  artifact has SLSA v1 provenance (builder, source commit, build time,
  materials, digest) served as a DSSE attestation through the nation's own
  download link; every release is deposited in source-code escrow (contents
  hash, agent, release conditions) and nations can request source-code
  audits by their own auditors. Each nation sees only its own releases.
- Lifecycle (`lib/data/lifecycle.ts`): release lines (major.minor) are LTS or
  standard, each with active, security-only and end-of-life windows from the
  line's first release; the publisher sets the policy (audited). End-of-life
  notices go out once each at 12, 6 and 3 months; the chamber warns when the
  installed line nears its end.
- Evidence packs (`lib/data/evidence.ts`, `/updates/[id]/evidence`): per
  release and per nation, generated only from existing records (certification
  references, DPIA template, security tests, SBOM, provenance, escrow,
  advisories, the nation's install record and audit-chain entries), as a
  readable page and a JSON manifest with a SHA-256 digest.
- Mirror (`lib/data/mirror.ts`, `/updates/mirror`): self-hosted and
  air-gapped nations register a local registry mirror; the sync manifest
  lists what it lacks, with deltas from releases it holds and the bytes
  saved. Physical media move through sealed → handed over → received →
  seal verified, each step by a named person and audited; a seal mismatch
  marks the media unusable.
- Communication (`lib/data/comms.ts`): "what's new" in the nation's language
  (labels from `nationMessages().releaseNotes`), English marked "translation
  pending" until the publisher adds one; training and guide links per
  release. Named officials subscribe per channel to security, releases,
  incidents and end of life; `alert()` queues deliveries (no provider yet).
- Contracts (`lib/data/contracts.ts`, `/updates/contract`): one per nation,
  read from the systems that hold the facts — kind and fee from the hosting
  path and `HOSTING_MODEL`, currency from the security store's `pricing()`,
  security-store invoices beside platform invoices, support tier from
  `lib/data/support.ts`. Renewal is proposed by the publisher and accepted
  by a named official, never automatic.
- Data sovereignty (`lib/data/sovereignty.ts`): crash reports, usage metrics,
  health reports and support attachments are OFF unless an official enables
  them (named approver, reason, audited), each with a sample payload. All
  operational data leaves only through `transmit()`; health reports still
  drive probation locally when off, and attachments are refused. Never add
  another path that sends operational data to the publisher.

## Public websites

- Plan and decisions: `docs/PUBLIC_WEBSITES_PLAN.md`; status: register §14.
- Each public site's content is a record in `app/src/lib/public-sites/content/`
  (types in `types.ts`); the page passes it through `siteProps()`
  (`apps/_shared/public/site-props.tsx`) to its design. Put new wording in the
  record, not the page. Nation facts go in as placeholders (`{nation}`,
  `{upperChamber}`, `{emergency.police:999}`, `{ai:AI wording|plain}`,
  `{year}`), never typed in.
- Nothing invented is shown as fact: figures without a data source are
  labelled samples (`statisticsSource`), news is labelled sample and undated
  (`newsSource`), no fixed years. Every link (`to`) is a section of the site or
  a locked platform route (`public-sites.test.ts` checks).
- Every institution keeps a full CivicOS site whatever mode its ministry picks
  for its existing website (Link by default). Each ministry is to look like
  itself: shared foundations, sector layouts and presets (phase 2).
- Every page in the `(public)` route group is open without sign-in
  (`middleware.ts`, checked by `middleware.test.ts`).
- Designs are presets (`apps/_shared/public/design/presets.ts`): a sector's
  typefaces, shape, palette, header and an ordered list of blocks with
  variants, rendered by `PublicSite`. Shared foundations (official banner,
  accessibility and language controls, legal footer) stay the same in every
  preset. A new preset must show every item and link of the record
  (`PublicSite.test.ts` checks); Civic Standard (`PublicSiteShell`) stays.
  Health and Treasury keep their own designs as bespoke presets that read
  their records. Typefaces are self-hosted under `public/fonts` (OFL); never
  load fonts or scripts from an outside service.
- A ministry's existing website is a per-site setting (`lib/data/site-settings.ts`,
  `/api/public-sites`, setup section 3.4): Link (default), Embed, Migrate or
  Host. Feeds are fetched only by the server, only from the ministry's own
  registered website, through `fetchFeed()` (private addresses refused, size
  and time limits, plain text only); never fetch other external content on a
  public page. `/embed/*` may be framed only by the registered website.
- A site's own content and design are changed only through the Site editor
  (`/admin/sites`, `lib/data/site-editorial.ts`): proposed by one named
  official, published by a different one, never over a newer version, every
  version kept and restorable, all audited. Previews (`?preview=`) need a
  session. Do not add another path that changes a site's published content.
- Translations go through the same review. Each string is kept with the
  English it was made from (`lib/public-sites/translation.ts`), so an English
  change marks it out of date; translators exchange XLIFF 2.0. A site turns
  right to left only when every string is translated into a right-to-left
  language. Public sites use logical CSS (`ms-`, `ps-`, `start-`, `border-s`)
  and `<Fwd />` for arrows, never left/right.
- A nation may have further official languages (`SovereignProfile.languages`);
  public-site visitors choose among them (`visitorLocale()`, cookie set only
  by `/api/public-sites/language`). Shared site wording comes from
  `siteMessages(locale)`, never `nationMessages()` directly.
- A ministry's colours and logo (`lib/public-sites/brand.ts`) change only
  through the Site editor; logos are stored in the platform (PNG, JPEG, WebP,
  checked by bytes; never SVG, never hot-linked).
- Search (`/search`, `lib/public-sites/search.ts`) indexes only what the sites
  publish (`effectiveContent`); never an outside search service. Email
  updates (`lib/data/site-subscriptions.ts`) are double opt-in, answer the same
  whether or not an address subscribes, act on emailed links only after a
  button press, and delete the address on unsubscribe; audit entries never
  carry addresses, and the editor sees counts only.
- Quality gate: `npm run audit:sites` (in `app/`, against a running build;
  CI job *public sites audit*) fails on any WCAG A/AA violation (axe-core) on
  any site, design or viewport, any broken on-platform link or anchor, a page
  over its budget (`scripts/public-site-budgets.json`) or any request leaving
  the platform. Theme colours reach text only through `siteProps()`, which
  applies `accessibleTheme()` (4.5:1); new public pages get the skip link,
  named banner, one `<main id="main">` and one h1 (`PublicSite.test.ts`).

## Console design and the digital twin

- Decisions and rollout: `docs/CONSOLE_DESIGN.md`; status: register §15–16.
- Colours come from `lib/theme/tokens.ts` (`TONE`, `PALETTE` and
  `globals.css` follow it; `tokens.test.ts` holds every text colour at 4.5:1).
  Do not add new raw hex colours to console code; add a token.
- Console headers wear the nation through `ConsoleMark` (seal in the nation's
  colour via `sealTile()`, name, motto); crisis frames the seal, never
  repaints it. Status colours never take the nation's accent or champagne.
- Every figure a console shows says where it comes from (`lib/twin/signal.ts`):
  observed, reported, modelled, sample or not connected; anything not observed
  or reported carries a `SignalTag`. Never show a generated number as the
  nation's (population, budgets, counts) without the marker.
- The national twin (`lib/twin/register.ts`, `/gov/twin`): facts enter only as
  observations of a registered source's run (named official, audited, rows
  refused with reasons, never guessed); each keeps when it was true and when
  it was recorded, so screens can answer "as of". Outside data is fetched only
  by the server through `safeFetchText()` from the source's own host. A
  national figure is shown only when every region reports it.
- The twin has two time axes: when a value was true (`asOf`) and when it was
  recorded (`knownAt`). The territory map and history show what was true on a
  date as known now; "only what had been recorded by that date" is the strict
  view. Scenarios (`lib/twin/scenarios.ts`) apply stated assumptions to
  observed values and are modelled, never observations; every version is kept
  with its inputs and a SHA-256 evidence hash, and a directive drafted from
  one cites scenario, version and hash.
- The console menu is `lib/nav/console-nav.ts` (plain language, about 30
  entries; related pages are tabs of one item). A new console page joins an
  item as a tab (with `was` if it replaces an earlier name) instead of
  adding a menu entry; `console-nav.test.ts` checks every earlier menu page
  stays reachable and keeps technical words out of labels. Screens use the
  plain word; technical terms go in the glossary (`lib/nav/glossary.ts`).
- Real cases enter an institution's queue only through `lib/data/case-import.ts`
  (a checked CSV load, one typed-in case; refused rows with reasons, loads
  audited with the file's SHA-256 and withdrawable) or from the ministry's
  connected case system (`…/queue/feed`, its own `ccf_` key, stored as a hash;
  it updates only the cases it sent). Example cases carry
  `source: 'sample'` and show the Sample marker; never remove them except at
  an official's request. Agreed direction (`docs/GOVERNMENT_OPERATING_DIRECTIONS.md`
  10.3, 20.5): a production installation will start with no sample records,
  while demo and training installations keep them, labelled; until that is
  built, the rule above stands.
- The national facility register (`lib/data/facilities.ts`, `/gov/sites`,
  `docs/FACILITY_REGISTER_REVIEW.md`) is the only place physical sites enter:
  recorded by the owning institution with longitude/latitude and how they
  were captured, checked against the map (region and district derived, never
  typed), published by a second official, versions kept. The nation's policy
  (four-eyes, administrators) decides who certifies locations (institution,
  mapping agency, or both), which body sets each category's sensitivity under
  which law, and which capture methods count. Restricted sites reach viewers
  without need only through `viewFacility()` (generalised); confidential
  categories never enter. Never seed or invent sites; samples stay marked.
- Land parcels (`lib/data/parcels.ts`, `/gov/sites/parcels`,
  `docs/PARCEL_REGISTER.md`) enter only through the cadastre authority named
  in the nation's parcel policy: recorded by one official, published (or a
  change confirmed) by a different one, every version kept, changed only
  through `parcelRepo`. The area is computed from the outline, region and
  district come from the boundary version in force. Rights and holders are
  personal data: only a parcel's own record shows them (`canSeeParcelRights()`);
  lists, tiles, the OGC collection, exports and audit details carry only
  `publicParcel()` (`parcels-privacy.test.ts` checks). Never seed or invent parcels.
- An incident's place (`lib/data/incident-places.ts`) is a region from the
  nation's list, a point checked like a registered site (`placePoint()`,
  region and district derived) or a published registered site (restricted
  ones generalised); named official, audited, history kept. Maps draw
  incidents only from recorded places; never guess one from a name.
- The nation's own boundaries (`lib/data/boundaries.ts`, `/gov/sites/boundaries`)
  enter only as checked versions: loaded by the mapping agency or an
  administrator (`canManageBoundaries`), published by a different official,
  every version kept, in force from its date. Maps and position checks read
  shapes through `loadNationGeography()` / `loadDistricts()`, which apply the
  version in force; new map code does not read `lib/geo` shapes around them.
- Disputed territory is drawn through `DisputedLayer` (`lib/map/disputed.ts`):
  neutral (hatched, named as disputed) unless the nation chose a point of view
  in setup (`map.worldview`). The platform never chooses a side; never colour
  a disputed area as one country's without the nation's setting.
- Districts for a nation without bundled ones are installed by an
  administrator (`lib/data/map-pack.ts`, `/api/map-pack`): geoBoundaries only
  (its API and file host, through `safeFetchText`) or an uploaded file, with
  the rules in `lib/geo/admin2-convert.mjs` shared with `build-map-pack.mjs`
  (open licences, never GADM, region from the map). `loadDistricts()` reads
  them after a published version and before the bundled files.
- Engines must not read the nation's regions or offices into module-level
  constants; read them at use (`regionList()`, or a function). The root
  layout writes the nation's facts before scripts load, but data from setup
  can still change at runtime.

## Branding and AI

- Once setup is complete, every front-door surface wears the installed
  nation's identity (name, motto, insignia, colour) via `useNationBrand()` in
  `cover/entry.ts`; CivicOS appears only before setup and as "Powered by CivicOS".
- The Plaza seal's band reads "SOVEREIGN DIGITAL INSTITUTION" above and the
  platform label below ("OFFICIAL GOVERNMENT PLATFORM"; monarchies "OFFICIAL
  KINGDOM PLATFORM", emirates "OFFICIAL EMIRATE PLATFORM" via `platformLabel`).
  The nation's name and motto sit once each in the dark ring directly around
  the seal (part of the seal itself), name above, motto below. The plaza plan
  is sized from the seal radius (`--sr`) so that ring always clears the moat.
- AI is never part of the brand, logo, or landing copy. The AI assistant is a
  per-nation opt-in (`SovereignProfile.aiAssistant`, chosen in setup, off unless
  ticked). `/api/ai/advisory` refuses when it is off and callers fall back to
  their rule-based advisories.
- Inside the apps, any wording that presents a panel as AI goes through
  `aiLabel(aiWording, plainWording)` (`lib/nation/registry.ts`): AI wording
  while the nation has the assistant on (or has not chosen), plain wording once
  it is off. Panels that call `/api/ai/advisory` say "AI advisory" only when
  the model's answer arrived; rule-based fallbacks say "Advisory".

## Nation conversion

- `docs/NATION_CONVERSION_MANIFEST.md` records what ties the system to one
  nation and the plan to move it all into a Nation Pack. Do not add new
  hardcoded places, people, currencies, regions or office titles; read them
  from the nation profile. `npm run scan:nation` (in `app/`) re-counts them.
- Engines get the nation's regions, map country and currency from
  `app/src/lib/nation/registry.ts`: declare region lists as
  `regionList([...reference])` and format money with `formatMoney()`.
- A nation's regions default to its official subdivisions in their own order
  (ISO 3166-2, `app/src/lib/geo/divisions.ts`; e.g. all US states, Kenya's 47
  counties, Uganda's regions or districts). Rebuild the data with
  `scripts/build-divisions.py`.
- Map shapes are Natural Earth admin-1 (`app/src/lib/geo/admin1/`), upgraded
  per country where they disagree with the official list
  (`app/src/lib/geo/boundaries/`, from geoBoundaries or the national datasets
  OCHA publishes on HDX, credited on the map; never GADM-derived data).
  `npm run scan:boundaries` lists countries still disagreeing;
  `npm run build:boundaries -- --needed` upgrades them, and writes a country
  only when the new shapes cover more of its official list, the same
  territory and the same outline — a build never downgrades a map.
- Map labels and region names use each unit's official name in the nation's
  own spelling (ISO 3166-2, natural word order; romanised for non-Latin
  scripts), e.g. "Bayern", "Małopolskie" — not English exonyms. After new map
  data, run `node scripts/official-names.mjs` (matches by ISO code or exact name).

## Durable state

- Server stores keep their data on `globalThis` under a key starting with
  `__civicos` and initialise with `g.__civicosX ??= seed()`; that is how
  `lib/data/persist.ts` saves and restores them (`CIVICOS_STATE=file|supabase`,
  started from `src/instrumentation.ts`). A new store follows the same pattern
  and holds only JSON, Maps, Sets and Dates. When a store gains fields, give
  them defaults for snapshots saved before the change (`withDefaults()` in
  `lib/data/defaults.ts` fills them at any depth; name dictionaries of records
  as `opaque`).
- The audit chain, twin (entities, keys, sources, runs, observations),
  facility records and boundary versions change only through the persistence
  port (`lib/data/repo`: `auditRepo`, `twinRepo`, `facilityRepo`,
  `boundaryRepo`); under `CIVICOS_STATE=postgres` it writes them through to
  per-record tables (`lib/data/repo/postgres.ts`, migration
  `civicos_records`). Never push to those arrays directly. `lib/data/store.ts`
  is a barrel over `lib/data/store/*`; stores that only audit import
  `@/lib/data/store/audit`.
- Every other store is kept as per-record documents in postgres mode
  (`lib/data/repo/documents.ts`, table `civicos.record_doc`). A store's
  accessor passes its object through `touch()` (`lib/data/repo/track.ts`;
  `tracked()` for a store held at module level), so its changes are written
  with the audit entry they belong to; a new store does the same.
- A request finishes its own durable writes (register 18.37): every route
  handler is wrapped at build by `scripts/durable-route-loader.cjs` with
  `durableRoute()` (`lib/data/repo/settle.ts`), so a changing request commits
  before its response and a stale instance pulls before it answers. Export
  route methods only as `export (async) function METHOD` or `export const
  METHOD` (`durable-route.test.ts` checks); a serverless host never relies on
  a timer between requests.

## Backups and disaster recovery

- Backups, restore and the drill: `docs/DISASTER_RECOVERY.md`; status:
  register 3.7, 9.1–9.3. `lib/data/backups.ts` is the only place backups are
  taken, verified, pruned and restored; the Update Center's restore points and
  Platform Operations' backups are its backups (never simulate one for the
  installed nation; `CIVICOS_RESTORE_POINTS=simulated` only in tests).
- A backup is always encrypted (envelope encryption through key custody,
  `lib/backup/archive.ts`); never write state to a target in plaintext. The
  target goes through `lib/backup/target.ts` (S3 only through the safe fetch,
  to the configured host).
- Verified means read back, decrypted, every part's hash checked and a dry-run
  restore into a scratch store or schema succeeded; only verified backups
  protect an install.
- A data restore is never automatic: an administrator proposes it with the
  loss warning, a second official confirms, the current state is backed up
  first, and the audit chain gets one entry naming both and the replaced
  state's hash. A new store holding the backup system's or the running
  software's own records joins `KEPT_ON_RESTORE` (`lib/backup/state.ts`).
- Scheduled jobs (register 18.39): every `/api/cron/*` route exports its
  handler through `cronRoute()` (`lib/ops/cron-runs.ts`: run record, run key,
  overlap guard, retries, alert); a new job joins `scripts/cron-jobs.json`,
  `RETRY_POLICY` (`lib/ops/cron-jobs.ts`), the Helm values, `schedule.sql`
  and the pg_cron migration (`cron-jobs.test.ts`). On Vercel pg_cron drives
  them; a serverless server backs up only to S3.

## Who acted

- Officials sign in at `/sign-in` (platform accounts, `lib/auth/officials.ts`,
  or the substrate); the server sets a signed session (`lib/auth/session-token.ts`).
  A route that records who acted parses its body with `withOfficial()`
  (`lib/auth/official.ts`) or `chamberBody()`, so a signed-in official's
  verified name replaces any name in the request. Never trust a `by`,
  `actor` or `officerName` from the body when someone is signed in.
  Sign-in is enforced (`lib/auth/mode.ts`, the one place that decides) with
  `CIVICOS_AUTH=enforce`, and by default in a production build unless
  `CIVICOS_AUTH=open` is set (which warns at start and shows a banner on
  console pages); it refuses API changes without a verified official. The
  first administrator needs the one-time setup code (`lib/auth/setup-token.ts`).
- What an official may do is one rule set, `lib/auth/roles.ts` (Administrator,
  Can sign, Officer, Auditor; an institution or the whole government). The
  middleware applies `apiPermission()` to every API change, on the account as
  it stands now (it asks `GET /api/auth/official`, so a changed password, a
  disabled account or a new role applies at once); a route that needs
  the record to decide checks again with `refusal()` (`lib/auth/official.ts`).
  A new route that changes accounts, setup or the structure of government
  belongs in `ADMIN_ONLY`; never add a second place that decides permissions.
- Cases and registers are decided by the institution responsible for them:
  `caseActRefusal()` / `caseReadRefusal()` in `roles.ts` (a decision needs
  "Can sign" there; administrators and whole-government officials get no
  domain authority; courts' cases are closed to every other institution;
  restricted and secret cases to the assigned; step-up where the procedure asks).
- Every mutating API route must match a rule in `roles.ts` (`mutationRule()`;
  unmatched changes are refused, `api-permission-coverage.test.ts` checks), and
  an `Authorization` header skips the session gate only on routes listed in
  `SELF_AUTHENTICATED` / `BEARER_ROUTES` that verify it themselves. Under
  `enforce`, reads need the signed `civicos_official` session; the demo
  `civicos_session` cookie opens only `/wallet` and, in demo and training
  installations with no official session, the wallet's four actions
  (`CITIZEN_DEMO_WRITES` in `roles.ts`: apply for a permit, pay, sign, check a
  document; owner's decision 2026-10-21). Never widen that list.
- The demo data pack (`lib/casework/demo-pack.ts`, `POST /api/demo/pack`,
  administrators, demo and training only) runs through the real engine: the
  cast, the sample acts and procedures, one sample case per procedure opened by
  that institution's demo officer (`source: 'sample'`); it never decides a step
  and never names who is responsible.
- The second sign-in step (authenticator codes, `lib/auth/totp.ts`, `/api/auth/two-step`)
  is part of the same rules: a session records whether it passed it, and an
  official the policy requires it for makes no changes until it has.
- The demo cast (`lib/auth/demo-cast.ts`, `/api/demo/*`) exists only while
  `samplesAllowed()`: separate `demo` accounts per responsible institution,
  reached only by switching (`act-as`, audited, admin or cast member), refused
  at every sign-in path and in `currentOfficial()` in production.

## API description

- `/api/openapi` is generated from the route files. After adding or changing
  an API route, run `npm run build:openapi` (in `app/`); `openapi.test.ts`
  fails while the document is out of date.

## Integration register

- `docs/INTEGRATION_REGISTER.md` lists everything built on a placeholder,
  demo value or in-memory stand-in, and what connecting it for real takes.
  Any change that adds a stub, placeholder, demo value, external dependency or
  integration point adds or updates its entry there in the same change.

## Checks

From `app/`: `npm run typecheck`, `npm test`.
