# Cycle 3 report: tax, education, health, customs and permit authorities

This report covers the owner's Cycle 3 Implementation Directive. The
assessment made before the work started is in `docs/CYCLE_3_ASSESSMENT.md`.
The integration register (§18.19–18.26) records what each part needs before
it is connected for real. The pull request is not merged, and no legal
configuration has been approved.

## What was built

Each domain uses the existing foundation:

- the workflow engine and its approved procedures;
- documents, sealed decisions and certificates;
- the access log;
- the exchange and its events;
- the twin;
- the payments store;
- the organisations register;
- the laws register.

No domain adds a parallel implementation of any of these.

| Part | What it is | Where |
|---|---|---|
| Permit authority registry | Versioned mappings per permit type: lead and consulted authorities, legal basis, effective dates, allowed procedures, and who may issue, renew, suspend, revoke or hear appeals. One official drafts a mapping and a second approves it; a change of lead needs a handover plan. 16 proposed mappings ship as **unapproved drafts**. `powerRefusal()` is read by the organisation, sector, profession and legacy permit decisions. In production, a power that no approved mapping covers is refused. | `lib/permits/authority.ts`, Laws → Permit authorities |
| Rates and tariffs | Flat rates, rate bands and tariffs by code. Each version cites the law and must pass worked tests before a second official approves it. `calculate()` refuses when no approved version is in force. **None ship.** | `lib/law/rules.ts`, Laws → Rates and tariffs |
| Liabilities and payments | Bills carry a domain reference. A transfer is recorded once per rail reference. Each domain reconciles every receipt once. | `lib/data/store/payments.ts` |
| Tax | Taxpayers (TIN), returns with amendment versions, and assessments made by an approved rule or entered with reasons (four-eyes). Notices go out as bills. Each tax account has a ledger reconciled from receipts, and objections vary assessments. Reads are limited to the tax authority, and every read is logged. Other institutions use `taxpayer.status`. | `lib/tax/`, Public finances → Tax |
| Education | Schools are organisations; registration is a standing in `schools`, run by the shared licence family under the education authority. Inspections are recorded. Qualifications cite the awarding body's accreditation; corrections and revocations are four-eyes, and the certificate carries no name. Others check a qualification with `qualification.verify`. Returns hold aggregates only and feed the twin. | `lib/education/`, Registers → Education |
| Health | Facility and pharmacy licences are standings, with premises linked to registered sites. Capacity returns hold aggregates only and feed the twin. Regulated professionals are registered per regulator, with qualifications checked against the education register. Renewal, fitness to practise and lapse are covered. Anyone can check a professional on `/registers` (all five languages); institutions use `professional.standing`. There is no patient field anywhere. | `lib/health/`, `lib/professions/`, Registers → Health regulation |
| Customs | Declarations hold goods lines read strictly, with amendment versions. An officer chooses the control channel and gives reasons; there is no risk score. Inspections are recorded. Duty comes per line from the approved tariff or is entered with reasons (four-eyes). The bill is reconciled from receipts. Goods are released only once assessed, inspected as chosen and paid. Refusal of release is four-eyes. Others use `customs.release`. | `lib/customs/`, Public finances → Customs |

Changes to the engine:

- **Repeated four-eyes confirmations.** A repeated confirmation is now recognised by the confirming official's own idempotency key. A repeated proposal while the case is pending returns the case.
- **Sector procedure families.** `sectorProcedures()` gives a sector authority the shared licence, renewal, suspension and revocation procedures under its own keys and register.

## Modified files

96 files changed between `9119716` and the end of the cycle: 61 added and 35 modified.

New modules:

- `lib/permits/authority.ts`, `lib/law/rules.ts`;
- `lib/tax/`, `lib/education/`, `lib/professions/`, `lib/health/`, `lib/customs/`.

New APIs:

- `/api/permit-authorities`, `/api/rules`, `/api/tax`, `/api/education`, `/api/professions`;
- `/api/professions/types`, `/api/health-regulation`, `/api/customs`;
- `/api/registers/professionals` (public).

New console pages:

- `/gov/tax`, `/gov/customs`, `/gov/education`, `/gov/health-regulation`;
- `/gov/law/permit-authorities`, `/gov/law/rules`.

Shared files extended:

- the deployment profile;
- the organisations register and its procedures;
- the payments store;
- `roles.ts`, `register-owners.ts`, `modules.ts`, the demonstration set and the exchange services;
- the event outbox and `docs/ASYNCAPI.yaml`;
- the twin metrics and the cron jobs;
- the public `/registers` page and its five languages;
- route-lock, the console menu and the OpenAPI document;
- `CLAUDE.md` and `docs/INTEGRATION_REGISTER.md`.

## Migrations

None. The new registers are platform stores and follow the durable-state rule. They are on `globalThis` and saved and restored by `lib/data/persist.ts`. Under `CIVICOS_STATE=postgres` they are kept as per-record documents in the existing `civicos.record_doc` table, registered in `lib/data/register-owners.ts`.

## Tests

New tests, one or more per part:

- **Permit authority registry and rules:** drafting, approval and refusal. The production guard covers both: proposals govern nothing, and school, facility and professional decisions are refused until a mapping is approved. No rate exists until one is approved.
- **Tax:** registration, assessment entered and by rule, the bill, reconciliation and objection.
- **Education:** school registration on the one organisation record, inspection, and a qualification with a nameless certificate, correction and revocation. The API's authorisation and access log are tested, along with the twin.
- **Health:** facility licensing with registered premises, capacity returns that refuse patient fields, the API and the twin.
- **Professions:** registration with a cross-checked qualification, the public check, fitness to practise, lapse, the API scoped by profession, and the exchange service.
- **Customs:** strict goods lines, release conditions, the procedure with a partial tariff and entered duty, four-eyes refusal, the API and the exchange service.
- **Cross-cutting**, as the directive asks:
  - **Isolation:** `casework/cycle3-isolation.test.ts`.
  - **Idempotency:** `customs/idempotency.test.ts`.
  - **Audit evidence:** `casework/cycle3-audit.test.ts`. Sealed decisions verify, the chain holds, and audit entries and events carry no names or trade data.
  - **Corrections:** each domain's versioned amendments are covered in its own tests.
  - **Recovery:** `data/cycle3-recovery.test.ts`.

The cycle adds 24 test files and extends existing ones. Results of the full run at the end of the cycle are in **Checks** below.

## Checks

| Check | Result |
|---|---|
| Typecheck (`tsc --noEmit`) | Passes, no errors |
| Lint | 0 errors (204 warnings, all older than this cycle) |
| Unit and integration tests (`vitest run`) | 3,347 passed and 39 skipped across 550 test files (skipped tests need external services); 0 failed |
| Nation scan (`npm run scan:nation`) | Ran clean. This cycle adds no hardcoded place, person, currency, region or office title: regions, currency and authorities are read from the nation profile. |
| OpenAPI document | Regenerated after each API change; `openapi.test.ts` passes |
| Database | Run on a throwaway Postgres 16: every migration applies, the 32 substrate SQL suites pass, and the 46 persistence repository tests pass (including per-record documents). |
| Deployment | The push at commit 25 (`b0e9f29`) deployed as a Vercel preview (Ready), with every CI check green. The final push is covered by the PR's CI. |
| Accessibility and security | The public sites audit (axe-core WCAG A/AA, links, budgets, no outside requests) and the security scans run as CI jobs on the PR. The one public page changed this cycle (`/registers`) uses the existing frame, one h1 and labelled forms. |

## Acceptance review (after the cycle)

A read-only review against the owner's five acceptance questions found four
blocking defects that CI did not catch. Each was proven with a test, then
fixed in its own commit with a regression test.

| # | Defect | Fix |
|---|---|---|
| A | A repeated request (same idempotency key) returned the whole case before the case rules ran: an official of another institution could read a tax case, personal fields included, unlogged. Opening keys were shared across institutions. Present since Cycle 2. | The case rules run first; an opening key finds only a case of the same procedure and institution, an action key only its own action (`casework/replay-isolation.test.ts`). |
| B | Any signed-in official could list every bill (tax and customs payers and amounts) and mark any bill paid through the stand-in payment; reconciliation counted it, clearing tax balances and unblocking customs release. The audit named "citizen". | Bills of a named payer are seen only by the issuing institution (the wallet and the mirror carry general bills only). The stand-in is refused in production and for every tax or customs bill; its receipts are marked `simulated` and never posted in production; the audit names who acted. |
| C | After a physical inspection found a discrepancy, the channel could be re-chosen as release on documents and the goods released; the earlier choice was overwritten. | Every channel choice is kept; a channel can only be raised once an inspection is recorded; release needs the last inspection to be clean whatever the channel. |
| D | Record numbers (taxpayer, assessment, qualification, professional, declaration, duty, organisation) came from per-year maps the postgres backend does not reserve, and a restore took them back: a number could be given twice. | Numeric `…Seq` counters reserved by the backend (`lib/data/numbering.ts`), continuing from the old maps; a restore keeps every store's counters at their highest value. |

Still to decide (not fixed; for the owner and each country):

- Gaps in the authority check:
  - A register type a nation adds without naming its permit type is not checked against the authority registry, even in production.
  - Tax and customs decisions are not checked against an authority mapping at all.
- A decision does not record which authority mapping version authorised it.
- An approved mapping cannot be suspended in an emergency; only a newer approved version replaces it.
- Two-official approval:
  - It is a property of each approved procedure, and the platform sets no minimum.
  - In the reference drafts one official decides tax registration, recording a qualification, customs release and every refusal.
  - One person holding two accounts with different emails is prevented only when sign-in through the national identity provider is required.
  - Mapping and rule approvals use a weaker same-person check than cases, which matters only when sign-in is not enforced.
- A four-eyes proposal on a case never lapses.
- Professional registration numbers run in sequence, so the public register can be listed number by number.
- Event delivery after a restore: the default storage settings roll back both the audit trail's numbering and the delivery position. Consumers that track progress by audit number could skip new events; this is not yet tested.

## Legal decisions still open (for each country)

Nothing below is decided by the platform. Each item is a draft or a blank until the country's officials record it.

1. **Permit authorities.** For each of the 16 proposed permit types, the country decides:
   - the lead and consulted authorities;
   - the legal basis;
   - the powers to issue, renew, suspend, revoke and hear appeals;
   - the effective date.

   Building permits, land title, environmental permits, vehicle registration and transport operator licences have no proposed lead at all.
2. **Tax.**
   - The tax types and the TIN format.
   - Filing periods and due dates.
   - Rate tables for each tax.
   - Penalties and interest (not modelled).
   - Disclosure rules for `taxpayer.status` callers.
3. **Customs.**
   - The tariff nomenclature and duty schedule.
   - Valuation rules.
   - Release deadlines.
   - Which agencies may call `customs.release`.
   - Enforcement powers (seizure, penalties, detention). These are not built, and need their own legal review.
4. **Education.**
   - Whether school registration, inspection and accreditation are separate powers.
   - The national qualifications framework (levels).
   - The validity of registrations.
   - Who may verify qualifications.
5. **Health.**
   - The health regulator or regulators: one, or a council per profession.
   - Inspection standards for facilities and pharmacies.
   - Validity and renewal requirements for professionals.
   - Which professions are regulated.
6. **Procedures.** Every reference procedure is a draft. Each must be adapted, cited to the country's law and approved by the responsible institution before production use.
7. **Data sharing.** The legal basis and approved callers for each new exchange service:
   - `taxpayer.status`
   - `qualification.verify`
   - `professional.standing`
   - `customs.release`

## Still out of scope (unchanged decisions)

- Asylum, border-crossing enforcement, police investigations and evidence, and judgment publication.
- Migration of the real permit register.
- National patient and student record systems.
- Automated risk scoring.
