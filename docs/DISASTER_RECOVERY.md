# Disaster recovery

Runbook for recovering a CivicOS installation after the loss of its server,
its database, its site or its data (register 9.1, 3.7). Update fallback is
not disaster recovery: it only switches the *software* back to the last
known good release and never touches data. This document covers the data.

What the platform provides (`app/src/lib/data/backups.ts`,
`app/src/lib/backup/`):

- **Backups** of the whole platform state, encrypted, with a manifest and the
  audit chain head, written to a directory or S3-compatible object storage,
  on a schedule and on demand.
- **Verification** of every backup: read back from the target, archive
  SHA-256 compared, decrypted, every part's SHA-256 checked against the
  manifest, and a dry-run restore into a scratch store (postgres: a scratch
  schema, rolled back).
- **Restore**, never automatic: an administrator proposes, a second official
  confirms, the current state is backed up first, and the audit chain records
  who restored what and the hash of the state it replaced.
- **A drill** (`app/scripts/dr-drill.mjs`) that proves the above end to end.

What the nation provides: the servers, the second site, the object storage
(with immutability), the key custody, the people on call, and the schedule
of drills.

---

## 1. Targets (configuration)

Recovery targets are part of the backup policy, set by an administrator in
Platform Operations › Backups (`PUT /api/platform/backups/policy`, audited):

| Setting | Default | Meaning |
|---|---|---|
| `rpoMinutes` | 1440 | Recovery point objective: at most this much recorded work may be lost. The status shows whether the newest *verified* backup is younger than this. |
| `rtoMinutes` | 240 | Recovery time objective: service back within this. The drill measures it. |
| `intervalMinutes` | 1440 | The schedule takes a backup when the newest is older than this. Set it at or below the RPO. |
| `daily` / `weekly` / `monthly` | 7 / 4 / 12 | Retention: the newest backup of each of the last N days, ISO weeks and months. |
| `preRestoreDays` | 90 | How long the copy taken before each restore is kept. |

Backups named by an installed release's restore point and the newest
verified backup are never removed by retention.

Per-service targets are the nation's (docs/05_SLO_AND_DR_CATALOG.md); the
platform state is one unit — it is backed up and restored as a whole.

## 2. Roles

| Role | Who | Does |
|---|---|---|
| Incident lead | Head of the platform operations team | Declares the disaster, decides between standby recovery and in-place restore, keeps the timeline. |
| Administrator (proposer) | A platform account with the Administrator role | Proposes the restore after reading the loss warning. |
| Second official (confirmer) | A different official; through Platform Operations also an administrator | Confirms the restore. Cannot be the proposer. |
| Key custodians | Two named holders of the key escrow (§5) | Bring the key to the standby. |
| Database team | The nation's DBAs (postgres mode) | Database host, WAL archiving, point-in-time recovery outside the platform. |
| Communications | The nation's comms office | Tells institutions and the public what was lost and when service returns. |

Every step the platform takes is in the audit chain under the official's
verified name (`backup.create`, `backup.verify`, `backup.restore.propose`,
`backup.restore`, `backup.prune`, `backup.policy`).

## 3. Configuration

Backups (all modes):

```
CIVICOS_DATA_KEK=<32 bytes, base64 or hex, or a file path>   # or CIVICOS_KEY_PROVIDER=vault|kms-http
CIVICOS_BACKUP_TARGET=dir|s3                                 # default dir
CIVICOS_BACKUP_DIR=/var/lib/civicos/backups                  # dir target
CIVICOS_BACKUP_S3_ENDPOINT=https://objects.gov.example       # s3 target
CIVICOS_BACKUP_S3_BUCKET=civicos-backups
CIVICOS_BACKUP_S3_REGION=us-east-1
CIVICOS_BACKUP_S3_PREFIX=civicos-backups/
CIVICOS_BACKUP_S3_ACCESS_KEY_ID=… / CIVICOS_BACKUP_S3_SECRET_ACCESS_KEY_FILE=/run/secrets/s3
CIVICOS_BACKUP_S3_ALLOW_PRIVATE=on                           # storage on the nation's own network
CIVICOS_BACKUP_PG_DUMP=/usr/bin/pg_dump                      # postgres mode, optional extra part
CIVICOS_CRON_SECRET=…                                        # /api/cron/backup
```

Without a key a backup is refused: there is no plaintext mode. The archive
holds the per-backup data key only wrapped (by `CIVICOS_DATA_KEK`, or issued
and unwrapped by the Vault/KMS provider, which never hands out its key).

The bucket should have object lock (compliance mode) or a retention rule at
least as long as the monthly retention, so a compromised server cannot
delete or overwrite its own backups. Copy at least the monthly backups
offline (the Update Center's media workflow, `/updates/mirror`, carries
sealed media with named custody).

## 4. What a backup holds

| Mode | Parts |
|---|---|
| memory, file, supabase | Every `__civicos*` store, encoded as the state snapshots are (Maps, Sets, Dates kept), captured in one synchronous pass. |
| postgres | Every table of the `civicos` schema except the outbox and lease, exported in one repeatable-read, read-only transaction after the instance's write queue drained, one JSON line per row (generated columns recomputed on load), ordered by primary key; optionally a `pg_dump -Fc` of the schema taken in the same snapshot. |

Not in a backup: the backup system's own records, vector tile archives
(derived; rebuilt after a restore), container images and release artifacts
(the Update Center registry and mirror, the restore kit), and the keys.

A restore leaves two stores as they are: the backup records and the Update
Center's install records (they describe the software actually running).
Record counters never go back. Everything else returns to the backup's time.

## 5. Key custody and its recovery

Backups are useless without the key that wrapped their data key.

- **env provider**: `CIVICOS_DATA_KEK` is split or sealed into escrow at
  installation (e.g. two sealed envelopes in two safes, or Shamir shares held
  by the key custodians). A rotation keeps the previous key as
  `CIVICOS_DATA_KEK_PREVIOUS` until every backup sealed under it has expired
  from retention; escrow the new key the day it is introduced.
- **vault / kms-http**: the standby must reach the same Vault Transit key or
  KMS key (`CIVICOS_VAULT_DATA_KEY` / `CIVICOS_KMS_DATA_KEY`, default
  `civicos-data`). Replicate Vault (performance or DR replication) or the KMS
  key to the second site; keep the Vault unseal keys / recovery keys in the
  same escrow. Back up Vault itself by its own procedure.
- Check quarterly: on the standby, `POST /api/platform/backups/<id>/verify`
  for the newest backup. A verification that fails with "does not open"
  means the standby does not hold the key — fix that before you need it.

## 6. Procedures

### 6.1 Daily (automatic)

The schedule (`/api/cron/backup`, hourly via `supabase/cron/schedule.sql` or
the nation's scheduler) takes, verifies and prunes. Watch the status in
Platform Operations › Backups: "Recovery point target … met". Alert when it
is not met (the cron answers 503 when a backup could not be taken, or was
taken but did not verify). Every run of every scheduled job is recorded at
Scheduled jobs (`/gov/crons`); a backup run that fails is retried and, after
its last attempt, the officials subscribed to incidents in the Update Center
are alerted (see "Scheduled jobs on Vercel with Supabase" below).

### 6.1a Scheduled jobs on Vercel with Supabase

Vercel's Hobby plan runs only daily cron jobs, and the platform's jobs run
every minute to every hour (`app/scripts/cron-jobs.json`). On Vercel the
database drives them: migration `20261027010000_civicos_cron_schedule.sql`
schedules every job in Supabase `pg_cron`, and each run calls
`<deployment>/api/cron/<job>` through `pg_net` with the cron secret
(`civicos.cron_call()`), sending `X-CivicOS-Scheduler: pg_cron` and the
scheduled minute as `X-CivicOS-Run-Key`. Do not also add Vercel crons for the
same jobs. The address and the secret are read from Supabase Vault at run
time and never stored in a job, a migration or this repository.

Operator steps, once per deployment:

1. In Vercel (Project › Settings › Environment Variables, Production):
   `CIVICOS_CRON_SECRET` (a long random value), `CIVICOS_STATE=postgres` with
   `DATABASE_URL` (the Supabase pooler URL), `CIVICOS_DATA_KEK`, and the S3
   target: `CIVICOS_BACKUP_TARGET=s3`, `CIVICOS_BACKUP_S3_ENDPOINT`,
   `CIVICOS_BACKUP_S3_BUCKET`, `CIVICOS_BACKUP_S3_REGION`,
   `CIVICOS_BACKUP_S3_ACCESS_KEY_ID`, `CIVICOS_BACKUP_S3_SECRET_ACCESS_KEY`.
   Leave `CIVICOS_BACKUP_PG_DUMP` unset (there is no `pg_dump` binary on
   Vercel; the record tables are exported over the connection). A serverless
   server refuses the `dir` target: its disk is read-only or wiped between
   invocations, so a backup there would be lost with the instance. Nothing
   in a backup run touches the local disk (`serverless-backup.test.ts`).
2. Apply the migrations (`supabase db push`); the pg_cron and pg_net
   extensions are enabled by the migration where Supabase offers them.
3. In the Supabase SQL editor, privately (never in a shared transcript):

   ```sql
   select vault.create_secret('https://<your deployment host>', 'civicos_base_url');
   select vault.create_secret('<the same value as CIVICOS_CRON_SECRET>', 'civicos_cron_secret');
   ```

   The base URL is the deployment's origin only (no path, user or query).
   Rotate: `select vault.update_secret((select id from vault.secrets where name = 'civicos_cron_secret'), '<new>')`
   together with the Vercel variable.
4. Check: `select jobname, schedule, active from cron.job order by jobid;`,
   `select * from cron.job_run_details order by start_time desc limit 20;`
   (pg_cron's side), `select job, reason, skipped from civicos.cron_skips;`
   (jobs that sent nothing, with the reason) and `/gov/crons` (the platform's
   side: last run, outcome, next expected, failures, retry state, history).
   The onboarding hub shows "Scheduled jobs recorded running" once every job
   this installation runs has a successful run within twice its interval.
5. Take one backup at once (`/gov/crons` shows it) by calling
   `/api/cron/backup?now` with the cron secret, then run the drill (§7)
   against the bucket from a second machine.

What each run guarantees (`app/src/lib/ops/cron-runs.ts`): one run record
per call (start, end, outcome, items, error text scrubbed of addresses and
numbers); a call with a run key that already succeeded, or is running, is
recorded as skipped-duplicate and changes nothing; a second run of a job
while one holds it is refused (the hold is a row every instance shares,
`civicos.cron_lease`); a failed job is retried by its next invocation after
its backoff (`RETRY_POLICY` in `app/src/lib/ops/cron-jobs.ts`), never sooner;
after its last attempt the officials subscribed to incidents are alerted once
through the nation's own email and SMS providers. Other schedulers do the
same: the self-host script and the Helm chart send `X-CivicOS-Scheduler`.

### 6.2 Data damaged, server fine (in-place restore)

1. Stop the damage (revoke the integration key, disable the account, halt the import).
2. Platform Operations › Backups: choose the newest backup *before* the damage. **Restore** shows what will be lost: the audit entries and stores recorded since.
3. The administrator ticks the acknowledgement and proposes. A second official, signed in separately, confirms within 30 minutes.
4. The platform backs up the current state (kept as a `pre-restore` backup; its hash is in the audit entry), replaces the state and appends one audit entry naming both officials.
5. Postgres mode: every other instance stops taking changes ("restart this server"); restart them (rolling). Their read models then load the restored tables.
6. Re-enter or re-import what was lost from the pre-restore backup's period, by the normal routes, so each change is audited again.

If the damage was a bad release: switch the software back first (fallback or
rollback), then restore from the release's page (Update Center), which uses
the same four-eyes restore of the restore point's backup.

### 6.3 Server or site lost (standby recovery from object storage)

1. Declare the disaster; note the time. The RTO clock runs from here.
2. Start a fresh instance at the second site with the **same release** as the
   backup (the manifest's `app.release`; the Update Center mirror or restore
   kit has the images), the same state mode, the same key (§5) and the same
   backup target. Postgres mode: an empty database; the platform applies its
   schema at start.
3. Platform Operations › Backups lists the backups from the target. Verify
   the newest (it must pass on *this* server: proves the key and the target).
4. Restore it four-eyes (§6.2 steps 2–4). The standby now holds the state as
   of the backup; everything after it is lost (that is your RPO).
5. Check `/api/health?ready`, `/api/platform/backups/state` (chain verified),
   and the sample in the drill output (§7) if time allows.
6. Move traffic (DNS or load balancer) to the standby. Restart any other
   instances you start next to it from the same database.
7. When the old site returns, do **not** start it against the same database
   or target with its old state: wipe it and add it as a fresh instance.

### 6.4 Backups themselves damaged

A verification that fails says why ("does not match the SHA-256 recorded",
"Part … does not open"). Use the previous verified backup; the schedule's
next run takes a fresh one. Investigate the target (object lock, access logs).

### 6.5 Outside the platform

With `CIVICOS_BACKUP_PG_DUMP` the archive also holds a `pg_dump -Fc` of the
`civicos` schema taken in the same snapshot. The database team can restore it
with `pg_restore` into an empty database when the platform itself cannot be
started; decrypting the archive outside the platform needs the same key and
the archive format in `app/src/lib/backup/archive.ts`.

## 7. Drill

Run at least quarterly, and after every change of key, target or mode:

```
cd app
npm run build
# the source: the running installation (or a copy of it)
CIVICOS_DATA_KEK=… CIVICOS_BACKUP_DIR=… npx next start -p 3711 &
# the drill starts a fresh standby on 3712 with the same key and target
CIVICOS_DATA_KEK=… CIVICOS_BACKUP_DIR=… node scripts/dr-drill.mjs --source http://localhost:3711 --standby-port 3712
```

It backs up the source (verified there), starts a fresh standby, checks the
standby sees the backup at the shared target and can verify it, restores it
four-eyes (and checks the same official cannot confirm), then compares:
every restored part against the backup, the audit chain (verified; the
backup's head plus the restore entry), every store's hash against the source
at backup time (only the audit store and what follows an audit entry — the
event outbox, signed heads — the record counters and the stores a restore
keeps may differ), and a sample read through the API (nation profile,
institutions, releases, facilities). It reports the measured recovery time
against the RTO target and exits non-zero on any failed check. Under
`CIVICOS_AUTH=enforce` pass an administrator's session with `--cookie` and a
second official's with `--cookie2`.

Record each drill (date, output, RTO measured, problems) with the platform
operations team; a drill that fails is an incident.

## Events and consumers across a restore (acceptance hardening)

A restore puts the platform's records back to the backup's moment, but systems that already received events (the civic-api mirror, subscribed webhooks, partner systems) do not go back with it. What the platform guarantees:

- **Delivery state is kept.** The event outbox and each consumer's cursor are kept through a restore (`KEPT_ON_RESTORE`), like the access log: they record what the outside world was already told.
- **Events about removed state are never delivered.** Events written after the restored point are marked `voided` (with the backup id) and skipped by delivery. An event committed before the backup but not yet delivered is still delivered, because the backup holds the state it describes.
- **Cursors go back to the restored point.** Audit sequences start again there, so a consumer whose cursor was past it is moved back, and later events reach it.
- **A restore epoch on every event.** CloudEvents carry `restoreepoch`, the number of restores so far. The restore's own event (`backup.restore`) carries the new epoch. Consumers de-duplicate by event `id` and order by (`restoreepoch`, `auditseq`); when the epoch grows they re-read the registers they hold.
- **The mirror re-reads on a restore.** civic-api's follower, on `backup.restore`, reads every register again and resets its cursor and read sequences (`restore: true`), so later events with restarted sequences apply (`services/civic-api/test/follower.spec.ts`).
- **Numbers are never given twice.** Record counters keep their highest value through a restore. Numbers given after the backup point (taxpayer, qualification, declaration, …) are not given again.
- **Tested scenarios** (`app/src/lib/events/restore-delivery.test.ts`): an event undelivered at backup time; an event delivered with its acknowledgement lost; restart of delivery after the restore; the same event retried; out-of-order arrival across epochs; a consumer that processed an event about a record the restore removed.
- **The same drill against Postgres** (`app/src/lib/data/repo/restore-events-postgres.integration.test.ts`, CI job *postgres backend*): a live consumer with acknowledged, unacknowledged and undelivered events across a four-eyes restore in postgres mode, checked in `civicos.record_doc` as a restarted server loads it: events after the restored point void, cursors back at it, the epoch raised, the removed records absent from the restored register, no number given twice. The audit entries of backups taken after the restored point (the restored backup's own, the pre-restore copy) leave the chain with the rest, so their events are void too; the backups themselves are kept, and the restore's entry names the pre-restore copy. In postgres mode an event is written once its audit entry is committed, so delivery follows the commit.

Limitations still open:

- **The mirror removes what the restore took back.** In the same transaction as the re-read, civic-api's mirror store removes the rows of the platform's own tenant that the restored read no longer holds (records created after the backup point), register by register: institutions (with their departments and modules), permits (with their transitions), incidents, deployments, backups, lifecycle events, integrations, grants and webhooks. Rows civic-api held before the mirror, in its own tenants, are never touched, and an ordinary full re-read removes nothing (`services/civic-api/test/follower.spec.ts`; against Postgres with civic-api's migrations, `test/prisma-store.integration.spec.ts`, run in CI).
- **Payment records are kept for reconciliation.** Receipts are append-only in civic-api, and a bill cannot be removed under one, so bills and receipts the restored platform no longer holds stay in the mirror and are named in its state (`lastError`) for the payments team to reconcile with the bank or provider: money that arrived after the backup point is a fact a restore cannot undo.
- **Catalogue rows are not removed.** Releases and configuration bundles carry no tenant and share their tables with rows from before the mirror; a release the restored platform no longer lists stays until removed by hand.
- **Partner systems must follow the contract themselves.** They must honour `restoreepoch` and de-duplicate by `id`; the platform cannot reach into them.
- **Lost work has to be repeated.** A decision, payment posting or certificate made after the backup point is gone from the platform. Its case must be worked again, and a bank transfer re-reported by the bank feed is recorded again (`recordTransfer` is idempotent per rail reference only within the surviving state).
- **Postgres mode is not covered by these tests.** It records `state.restore` in `civicos.outbox`. Its runtime outbox table is not restored, and the in-memory delivery state follows the rules above; it has not been exercised against a real Postgres restore with live consumers.
