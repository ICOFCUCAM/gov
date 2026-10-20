# Acceptance hardening report

This report answers the owner's Acceptance Hardening Directive, which covers:

- items E–I from the Cycle 3 review;
- the public professional register;
- event delivery across a data restore;
- test reliability.

No agency features were added. The work is on branch `claude/festive-meitner-ivhxsn`, starting from the merged Cycle 3 head `48bcb88`. PR #4 was merged before the directive arrived. This work therefore goes into a new pull request, which stays unmerged pending review.

The principle tested throughout: the platform must be unable to make an unauthorised decision, even when an official retries a request, a configuration changes, a service is restored from backup, or an administrator bypasses the interface.

## What changed

| Item | Commit | Where |
|---|---|---|
| E, F: authority for every decision, mapping and rule versions on decisions | `631f905` | `lib/permits/decisions.ts`, `lib/casework/engine.ts`, `lib/records/decisions.ts` |
| G: emergency suspension | `e600482` | `lib/permits/authority.ts`, `/api/permit-authorities`, Permit authorities page |
| H, I: dual-control minimum, natural-person check, proposals that lapse | `9a44561` | `lib/casework/dual-control-policy.ts`, `lib/data/dual-control.ts`, `/api/dual-control` |
| Public professional register | `a30e95a` | `lib/professions/`, `/api/registers/professionals`, `/registers` |
| Event delivery across a restore | `a344958` | `lib/events/outbox.ts`, `lib/data/backups.ts`, `services/civic-api` follower |
| Build memory, loading-screen contrast, key-parsing flake | `5bd24eb`, `c4f3f03`, `d5f2c60` | `next.config.mjs`, `app/loading.tsx`, `lib/crypto/envelope.ts` |

## Controls: verified, needing country approval, needing independent review

### Verified by automated tests

**E: no decision without a named authority, server side.**

- In production, the following refuse a decision (`permits/decisions.test.ts`):
  - a missing, draft, withdrawn or other-institution mapping;
  - an expired or not-yet-effective mapping;
  - a suspended mapping (`permits/suspension.test.ts`);
  - an unclassified procedure.
- The check runs inside the case engine, so neither the console nor a direct API call can avoid it.
- Civil registration, immigration, courts, police and referrals are classified explicitly as deployment-profile domains.

**F: provenance.**

- Each sealed decision records the exact authority mapping version and the rule versions it was calculated with.
- An earlier decision keeps version 1 after version 2 is approved, and still verifies.

**G: emergency suspension.**

- A suspension blocks new decisions at once, in every installation mode.
- Earlier decisions stand.
- A different official must confirm, review and lift it.
- An overdue suspension stays in force and is flagged exactly once.
- Every step is kept on the mapping and audited.

**H: dual control.**

- The platform minimum applies even when a nation's procedure version drops two-official approval (`casework/dual-control.test.ts`).
- Two accounts of one person (by identity-provider subject) are refused.
- In production, two-official decisions need signed-in officials.
- The decision records whether the officials were identity-checked or only different accounts.
- A country can require identity linking and can add further steps.

**I: expiry.**

- A proposal lapses after its waiting period. Lapsed proposals are kept and audited.
- A late confirmation is refused.
- A repeat of a lapsed proposal's request is refused.
- Duplicate requests while a proposal waits are idempotent.
- An explicit new proposal starts the process again.
- The daily job lapses overdue proposals.

**Public professional register.**

- A registration number on its own returns nothing.
- Each profession has a disclosure profile; conditions are hidden by default.
- Each caller is rate-limited.
- Harvesting is flagged once a day under a salted hash, never the caller's address.
- The person reference and qualifications are never shown.

**Recovery.**

- Six delivery scenarios are covered (`events/restore-delivery.test.ts`):
  - an event not yet delivered when the backup was taken;
  - an event delivered whose acknowledgement was lost;
  - delivery starting again after the restore;
  - the same event retried;
  - events arriving out of order across a restore;
  - a consumer that processed an event about a record the restore removed.
- civic-api's mirror re-reads all registers on a restore and resets its cursor (`follower.spec.ts`).
- Record counters never go back after a restore (`data/backups.test.ts`).

**Earlier fixes kept.**

- A: repeated case requests don't leak cases across institutions.
- B: a stand-in payment never settles a tax or customs liability.
- C: the customs inspection channel can't be lowered after a discrepancy.
- D: record numbers are never issued twice.

### Depends on country approval (the platform enforces; it does not decide)

Officials work through these decisions with the [country decision pack](COUNTRY_DECISION_PACK.md).

- **Authority mappings for each permit type.** The country decides:
  - the designated authority, legal basis and effective dates for every mapping (16 proposed drafts plus tax-assessment, customs-clearance and qualification-record);
  - procedures a nation adds must name their permit type.
- **Emergency powers.** The country decides who may suspend (administrators until a country rule says otherwise) and the confirmation and review periods (platform defaults of 72 hours and 30 days, marked not adopted).
- **Dual control:**
  - statutory thresholds beyond the platform minimum;
  - whether customs release needs two officials;
  - the waiting period (24 hours by default);
  - whether linking to the identity provider is mandatory.
- **Public disclosure.** What the public professional check shows, profession by profession.
- **Data sharing.** Permitted purposes and approved callers for the exchange services, including the authorised bulk path `professional.standing`.
- **Procedures.** Every reference procedure is still a draft until the responsible institution approves it.

### Requires independent security review

- **Identity independence.** Two-person independence is only as strong as the identity provider. An unlinked account proves only that two accounts differ, and that is recorded as such on the decision. The identity-provider integration (register 1.5) and its account-linking process need review.
- **Rate limits and harvesting detection.** Both run in memory per server. A deployment behind several instances, or facing a distributed harvest, needs limits at the edge (WAF, reverse proxy) and review.
- **Restore under Postgres with live consumers.** Not exercised. The mirror does not yet delete rows the platform no longer holds after a restore (documented in `DISASTER_RECOVERY.md`).
- **Decision guard coverage.** The classification is explicit and fails closed. A reviewer should confirm that no route changes a register outside the case engine, which is what CLAUDE.md requires; this was not re-audited route by route in this pass.
- **The stand-in payment rail.** It is refused in production, but a production deployment needs the real payment-provider or bank-feed integration (register 1.8) before any tax or customs liability can be settled.

## Test reliability

**The intermittent failure, reproduced and fixed.**

- **Failing test:** `src/lib/auth/totp-at-rest.test.ts › accepts hex keys and refuses keys of the wrong length`. It failed once in an earlier full run and passed on rerun.
- **Root cause:** the test passes a random 16-byte key in base64 to `parseKek` and expects the "must be 32 bytes" error. One such key in 64 starts with `/`. `parseKek` treats a value starting with `/` as the path of a key file, so it failed with `ENOENT` instead. That is a failure rate of about 1.6% per run.
- **Reproduction:** forcing a key that starts with `/` fails every time:

  ```
  × a 16-byte base64 key that starts with "/"
  AssertionError: expected [Function] to throw error matching /32 bytes/ but got 'ENOENT: no such file or directory, op…'
  ```

- **Fix (`d5f2c60`):** a key value that cannot be read as a file now gets an error saying what a key must be: 32 bytes in base64 or hex, or the path of a file holding one. Operators got the same misleading `ENOENT` for a short key. The test now covers the `/` case deterministically instead of by chance.

**A second intermittent failure, found by CI after the report.**

- **Failing test:** `src/lib/auth/totp-at-rest.test.ts › seals and opens, bound to what it belongs to`. It failed in CI on `0fb4430` and passed on the next run of the same commit:

  ```
  AssertionError: expected { plain: 'JBSWY3DPEHPK3PXP', …(1) } to have property "error"
   ❯ src/lib/auth/totp-at-rest.test.ts:31:38
  ```

- **Root cause:** the test "tampered" with a sealed value by editing its last two base64url characters. The ciphertext is 16 bytes (22 characters), and the last character carries only 2 data bits; the other 4 are padding. When the value ends in `BA` (1 in 256), the edit gives `BB`: the second-to-last character is unchanged, and `A`→`B` alters only padding. The "tampered" value therefore decodes to the same bytes and opens correctly. The encryption was right; the test changed nothing.
- **Reproduction:** sealing until a value ends in `BA` (482 tries) and applying the old edit fails with the same assertion every time.
- **Fix:** the test now flips a bit of an actual ciphertext byte. 3000 seals, 9 of them ending in `BA`, were all refused. The one similar test (`integration-keys.test.ts`) is not affected, because keys are compared by a SHA-256 of the whole string.

**Repeated full runs.**

- The full suite ran 8 times in a row in a separate worktree, at the hardening head before the three final fixes.
- Every run: 3374 passed, 39 skipped, 0 failed.
- No other intermittent failure appeared.

**Two failures that were not the code.**

- Two earlier runs failed only because files were being edited during the run. That is why the repeated runs moved to a separate worktree.
- The first accessibility audit failed on four pages. The server was slow under the concurrent test load and served the root loading screen, whose caption was 3.7:1 contrast. That was a real WCAG AA defect, which any visitor on a slow connection would also see. It is fixed in `c4f3f03` (now 9.2:1).

## Release evidence

Code tested: commit `d5f2c60` on `claude/festive-meitner-ivhxsn`. The report commit after it changes only this document.

| Check | Result |
|---|---|
| Typecheck (`tsc --noEmit`) | 0 errors |
| Lint (`next lint`) | 0 errors (204 warnings) |
| Full unit and integration suite (vitest) | 558 files, 3374 passed, 39 skipped, 0 failed |
| Repeated full runs (flake hunt) | 8 of 8 green |
| Postgres backend (`postgres.integration.test.ts` against a throwaway Postgres 16) | 9 passed |
| Repository layer (`src/lib/data/repo`, `src/lib/db`) | 259 passed; the live-Supabase substrate suite is skipped, because it needs a Supabase project |
| Substrate SQL (`supabase/tests/migrate.sh`, then `run.sh`) | 101 migrations applied; all suites passed |
| civic-api (typecheck, `node --test`) | 0 errors; 20 of 20 passed |
| Production build (`next build`) | Succeeds. Peak memory about 5.3 GB above idle, after `5bd24eb` |
| Public sites audit (WCAG 2.2 A/AA via axe-core, links, budgets, no outside requests) | 101 pages × 2 viewports, 130 linked pages: no failures |
| OpenAPI document up to date (`openapi.test.ts`) | Passes (in the full suite) |

**Deployment.** The Vercel production build of `48bcb88` was killed for running out of memory on its 8 GB machine.

- **Cause:** the custom `webpack()` hook made Next.js 15.5 turn off its separate build worker. The compiler's memory then stayed alive beside the type checker, peaking at 7.9 GB.
- **Fix (`5bd24eb`):** `experimental.webpackBuildWorker: true` brings the peak to about 5.9 GB, with identical output.
- **What remains:** Vercel builds production from the default branch, so production gets the fix only when this work is merged. Not verified on Vercel itself.

**Diff scope.** 60 files against `48bcb88`, all in the areas listed in *What changed*, plus three fixes:

- the build setting;
- the loading-screen contrast;
- the key-parsing error.

No agency features were added.

## Release rule

Green CI is not enough to merge or activate this in production. Merging needs the reviewers' examination of the final diff. Production activation needs the country decisions above and the independent reviews.
