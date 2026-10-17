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
- Sign-in surfaces: `/sign-in` (substrate email + password) and `/login`
  (citizen verification). The cover hands off to them; it does not replace them.

## Update Center

- `/updates` is each nation's update chamber (global releases + builds made
  for that nation from its feature requests, `/updates/requests`);
  `/admin/releases` is the publisher console. Store: `lib/data/updates.ts`,
  API: `/api/releases`.
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

## Integration register

- `docs/INTEGRATION_REGISTER.md` lists everything built on a placeholder,
  demo value or in-memory stand-in, and what connecting it for real takes.
  Any change that adds a stub, placeholder, demo value, external dependency or
  integration point adds or updates its entry there in the same change.

## Checks

From `app/`: `npm run typecheck`, `npm test`.
