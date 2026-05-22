# Substrate regression tests

Automated coverage for the **SQL layer** — the RPCs and triggers whose logic
lives in Postgres, not in the TypeScript app. The app/repo layer is unit-
tested with vitest (mocking the Supabase client); these tests pin the
substrate behavior those mocks assume.

Each file is **dependency-free**: plain SQL with `DO`-block assertions that
`RAISE EXCEPTION` on failure, wrapped in `begin … rollback` so a run never
persists data. No pgTAP / extension required.

## Running

Against any database with the `civicos` schema migrated (a local Supabase
stack, a CI throwaway, or a scratch branch), point `DATABASE_URL` at it:

```sh
DATABASE_URL=postgres://… npm run test:substrate     # from app/
# or directly:
DATABASE_URL=postgres://… bash supabase/tests/run.sh
```

`run.sh` runs every `*_test.sql` with `ON_ERROR_STOP=1`, so any failed
assertion aborts with a non-zero exit (CI-friendly). A clean run prints the
`PASS:` notices and commits nothing.

Some suites exercise `is_service_context()`-gated RPCs (webhook delivery);
run those with the service-role / migration connection.

## Coverage

| File | What it pins |
|------|--------------|
| `incident_loop_test.sql` | The two auto-resolve triggers: a dispatch / work-item close resolves (and acknowledges) its linked escalation, and leaves unlinked escalations untouched. |
| `webhook_delivery_test.sql` | Circuit breaker trips at 10 consecutive failures and clears on a successful delivery; the delivery log is trimmed to the last 50 per webhook; secret rotation rejects `< 8` chars and preserves the cursor. |
| `accountability_stats_test.sql` | The published aggregate arithmetic — `service_sla_stats` (counts, median turnaround, rated count, avg satisfaction) and `appeals_stats` (counts, median days-to-decision) — over a fixed fabricated dataset. |
| `cron_and_audit_test.sql` | `promote_due_directives` promotes only past-due signed directives (not future-dated); `escalate_stale_telemetry_streams` flags a silent active stream; `set_telemetry_stream_active(false)` drops a stream from fleet status; `append_audit` + `verify_audit_chain` report a fresh chain intact. |
| `operational_stats_test.sql` | The operational aggregates — `escalation_response_stats` (MTTA/MTTR), `dispatch_response_stats` (ack/on-scene/close medians), `posture_stats` (latest + averages), `work_item_flow_stats` (cycle time + backlog) — over fixed datasets. |

These intentionally focus on the **auth-independent** substrate logic
(triggers, service-role RPCs, aggregates, validation). The `auth.uid()`-
scoped citizen/officer RPCs are covered at the repo layer in
`app/src/lib/db/repos/*.test.ts`.
