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
| `federation_cascade_test.sql` | The escalation cascade trigger (Phase C): a major/national escalation against a registered institution emits `escalation.cascade` federation events to dependents along provides/mutual edges only (never consumes); minor severity and escalations against non-institution charters do not cascade. |
| `incident_loop_test.sql` | The two auto-resolve triggers: a dispatch / work-item close resolves (and acknowledges) its linked escalation, and leaves unlinked escalations untouched. |
| `webhook_delivery_test.sql` | Circuit breaker trips at 10 consecutive failures and clears on a successful delivery; the delivery log is trimmed to the last 50 per webhook; secret rotation rejects `< 8` chars and preserves the cursor. |
| `accountability_stats_test.sql` | The published aggregate arithmetic — `service_sla_stats` (counts incl. cancelled, open excludes cancelled, median turnaround, rated count, avg satisfaction), `appeals_stats` (counts incl. withdrawn, pending excludes withdrawn, median days-to-decision), `appeals_trend` (weekly decided buckets + median decision days, fixed same-week dataset), `consent_footprint_stats` (per-scope active / expiring-30d / revoked, distinct-citizen dataset), `directive_stats` (signed / effective / in-force / rescinded + median signed→effective lag), and `directive_trend` (weekly signed buckets + since-effective + median lag) — over a fixed fabricated dataset. |
| `cron_and_audit_test.sql` | `promote_due_directives` promotes only past-due signed directives (not future-dated); `escalate_stale_telemetry_streams` flags a silent active stream; `set_telemetry_stream_active(false)` drops a stream from fleet status; `append_audit` + `verify_audit_chain` report a fresh chain intact. |
| `operational_stats_test.sql` | The operational aggregates — `escalation_response_stats` (MTTA/MTTR), `dispatch_response_stats` (ack/on-scene/close medians), `posture_stats` (latest + averages), `work_item_flow_stats` (cycle time + backlog), `escalation_response_trend` (weekly MTTA/MTTR), `dispatch_response_trend` (weekly ack/on-scene/close medians), and `posture_trend` (weekly avg readiness + avg/peak stress), all over fixed same-week datasets — over fixed datasets. |

These intentionally focus on the **auth-independent** substrate logic
(triggers, service-role RPCs, aggregates, validation). The `auth.uid()`-
scoped citizen/officer RPCs are covered at the repo layer in
`app/src/lib/db/repos/*.test.ts`.
