# CivicOS Helm chart

Runs the Next.js platform (`civicos-app`), the NestJS `civic-api`, their
ingress, network policies, disruption budgets, autoscalers, optional trace
collector and optional scheduled jobs. The database, the substrate and NATS
are the nation's own: the chart consumes them through existing Secrets and
addresses and never runs them.

```bash
helm -n civicos upgrade --install civicos infra/helm/civicos \
  -f infra/helm/profiles/mid-city.yaml
```

Secrets are created beforehand (see `infra/README.md`) and only referenced by
name; the chart never takes a secret value inline.

## Checking the chart

`infra/helm/check.sh` (CI job *helm chart*) runs `helm lint --strict`,
`helm template` and `kubeconform -strict` for the defaults, every profile in
`infra/helm/profiles/` and the production-like values in `ci/`
(`production-values.yaml`: postgres state, app autoscaling, scheduled jobs,
trace collector, federation, keys in Vault, narrowed egress;
`airgapped-values.yaml`: file state with the anchor volume; `kms-values.yaml`:
keys behind the KMS shim). The values in `ci/refuse/` must be refused.
CI pins helm (built from its tagged Go module, checked against the Go
checksum database) and kubeconform (release binary, SHA-256 checked).

## What runs

| Object | Notes |
|---|---|
| `Deployment/civicos-app` | `next start` on 3000. Probes: start-up and liveness `/api/health?live`, readiness `/api/health?ready` (503 while the server does not hold the writer's lease or has not restored its state). One replica with `Recreate` unless `app.state.mode: postgres`. Non-root (uid/gid 10001), no privilege escalation, all capabilities dropped, seccomp `RuntimeDefault`, read-only root filesystem with `emptyDir` volumes for `/tmp` and `/app/.next/cache`, no service-account token. |
| `Deployment/civicos-api` | NestJS on 4000. Probes `/api/health/ready` and `/api/health/live`. Same hardening, read-only root with `/tmp` as `emptyDir`. Replica count left to the HPA while `api.autoscaling.enabled`. |
| `Service/civicos-app`, `Service/civicos-api` | Cluster-internal. |
| `HorizontalPodAutoscaler/civicos-api` | `api.autoscaling` (on by default). |
| `HorizontalPodAutoscaler/civicos-app` | `app.autoscaling` (off; only with `app.state.mode: postgres`, refused otherwise). |
| `PodDisruptionBudget/civicos-api`, `/civicos-app` | `pdb.enabled`; api `minAvailable: pdb.minAvailable`, app `maxUnavailable: 1`. |
| `PersistentVolumeClaim/civicos-app-state` | `app.state.mode: file` only; kept on uninstall. |
| `PersistentVolumeClaim/civicos-app-anchors` | `file` mode with `app.anchors.enabled`: the append-only audit anchor file (`CIVICOS_AUDIT_ANCHOR_FILE`) on its own volume outside the state; kept on uninstall. |
| `NetworkPolicy/*` | `security.networkPolicy`: default deny, then explicit allows (below). |
| `Ingress/civicos`, `civicos-civic-api`, `civicos-limits-*`, `civicos-federation` | ingress-nginx; see `ingress.*`. |
| `CronJob/civicos-cron-*` | `cron.enabled` (off): the app's scheduled jobs (below). |
| `Deployment/civicos-otel-collector` + ConfigMap, Service | `otel.enabled` and `otel.collector.enabled`. |

## Values

### Images

| Value | Default | |
|---|---|---|
| `global.imageRegistry` | `registry.sovereign.local` | the nation's registry |
| `global.imagePullPolicy` | `IfNotPresent` | |
| `global.imagePullSecrets` | `[]` | names of existing docker-registry secrets |
| `api.image` / `api.tag` | `civicos/civic-api` / `0.1.0` | |
| `app.image` / `app.tag` | `civicos/civic-app` / `0.1.0` | |

### App (`civicos-app`)

| Value | Default | |
|---|---|---|
| `app.replicas` | `1` | more than 1 only with `app.state.mode: postgres` (or `app.allowMultipleWriters`, standbys only) |
| `app.allowMultipleWriters` | `false` | |
| `app.auth` | `enforce` | `CIVICOS_AUTH`; the production image stays enforced for any other value except `open` (demonstrations only: a warning at start and a banner on every console page; go-live review L-2) |
| `app.trustedProxies` | `1` | `CIVICOS_TRUSTED_PROXIES`: proxies in front that append to `X-Forwarded-For` (the ingress-nginx controller is one; add one for an appending cloud load balancer). Per-address rate limits count this many hops from the right (review L-1) |
| `app.existingSecret` | `civicos-app` | keys `CIVICOS_SESSION_SECRET`, `CIVICOS_CRON_SECRET` (required); `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (optional, the substrate) |
| `app.state.mode` | `supabase` | `supabase`, `file` (persistent volume) or `postgres` (`postgres.existingSecret`; per-record tables, several replicas) |
| `app.state.size` / `storageClassName` | `5Gi` / `""` | file mode volume |
| `app.anchors.enabled` | `true` | file mode: anchor file on its own volume |
| `app.anchors.size` / `storageClassName` / `existingClaim` | `1Gi` / `""` / `""` | |
| `app.federationClientSecret` | `""` | `kubernetes.io/tls` secret (`tls.crt`, `tls.key`, `ca.crt`) for calling partners under mutual TLS |
| `app.env` | `{}` | extra plain variables (e.g. `CIVICOS_EGRESS_PROXY`, `CIVICOS_STATE_LEASE_TTL_MS`, `CIVICOS_WEBHOOKS_PRIVATE` for the civic-api mirror's webhook) |
| `app.resources` | 250m/768Mi request, 1 CPU/1Gi limit | |
| `app.autoscaling.enabled` | `false` | postgres mode only |
| `app.autoscaling.minReplicas` / `maxReplicas` / `targetCPUUtilizationPercentage` | `2` / `6` / `70` | |
| `app.readOnlyRootFilesystem` | `true` | `false` only to diagnose a write the volumes do not cover |
| `app.cacheSize` / `app.tmpSize` | `1Gi` / `512Mi` | `emptyDir` limits for `/app/.next/cache` and `/tmp` |

### Keys (`app.keys`)

The platform's four keys (`app/src/lib/keys/custody.ts`): the audit key
(signs audit chain heads), the exchange key (signs exchange receipts), the
token key (signs integrations' access tokens) and the data key encryption key
(seals second-step and webhook secrets in the state). They come only from
existing Secrets (`secretKeyRef`); the chart never takes a key value. Without
them the app generates a development signing key per process and leaves
secrets unsealed, so while `app.auth` is `enforce` the chart refuses to render
without a key source, and with `provider: env` the four references are not
optional: the pod does not start until the Secret holds them.

| Value | Default | |
|---|---|---|
| `app.keys.provider` | `env` | `env`, `vault` (Vault / OpenBao Transit) or `kms-http` (KMS shim); sets `CIVICOS_KEY_PROVIDER` |
| `app.keys.existingSecret` | `civicos-app-keys` | `env`: required, keys `CIVICOS_DATA_KEK` (32 bytes, base64 or hex), `CIVICOS_AUDIT_KEY`, `CIVICOS_EXCHANGE_KEY`, `CIVICOS_TOKEN_KEY` (Ed25519 PEM), optional `CIVICOS_DATA_KEK_PREVIOUS` during a rotation. Remote providers: optional, only `CIVICOS_DATA_KEK` / `_PREVIOUS` so values sealed before the move still open |
| `app.keys.allowDevelopmentKeys` | `false` | with an empty `existingSecret`; refused under `enforce` |
| `app.keys.vault.addr` | `""` | required for `vault` (`CIVICOS_VAULT_ADDR`, https) |
| `app.keys.vault.auth` | `token` | `token` (`CIVICOS_VAULT_TOKEN`) or `approle` (`CIVICOS_VAULT_ROLE_ID`, `CIVICOS_VAULT_SECRET_ID`) |
| `app.keys.vault.existingSecret` | `""` | required for `vault`: the Secret with those keys |
| `app.keys.vault.namespace` / `transitMount` / `approleMount` | `""` / `transit` / `approle` | |
| `app.keys.vault.caSecret` | `""` | Secret with `ca.crt`, mounted for `CIVICOS_VAULT_CA` |
| `app.keys.vault.keyNames` | `{}` | Transit key names (`audit`, `exchange`, `token`, `data`) when not `civicos-<purpose>` |
| `app.keys.kms.url` / `existingSecret` | `""` / `""` | required for `kms-http` (`CIVICOS_KMS_URL`; Secret with `CIVICOS_KMS_TOKEN`) |
| `app.keys.kms.caSecret` / `keyNames` | `""` / `{}` | as for Vault (`CIVICOS_KMS_CA`, `CIVICOS_KMS_<PURPOSE>_KEY`) |

Other secrets, all from `app.existingSecret`: `CIVICOS_SESSION_SECRET` and
`CIVICOS_CRON_SECRET` (required), the substrate's keys, and optionally
`CIVICOS_METRICS_TOKEN`, `CIVICOS_OTEL_HEADERS`, `CIVICOS_TSA_AUTH` and
`CIVICOS_AI_API_KEY`. The key provider is reached directly (not through
`CIVICOS_EGRESS_PROXY`): allow its address and port with
`security.egress.extra` when egress is narrowed.

```bash
openssl genpkey -algorithm ed25519 -out audit.pem   # likewise exchange.pem, token.pem
kubectl -n civicos create secret generic civicos-app-keys \
  --from-literal=CIVICOS_DATA_KEK="$(openssl rand -base64 32)" \
  --from-file=CIVICOS_AUDIT_KEY=audit.pem \
  --from-file=CIVICOS_EXCHANGE_KEY=exchange.pem \
  --from-file=CIVICOS_TOKEN_KEY=token.pem
```

### civic-api

| Value | Default | |
|---|---|---|
| `api.replicas` | `3` | used while autoscaling is off |
| `api.resources` | 250m/256Mi request, 1 CPU/512Mi limit | |
| `api.env` | `CIVIC_DEV_AUTH: "0"`, `OUTBOX_POLL_MS: "2000"`, `CIVIC_API_MODE: forward`, `CIVICOS_PLATFORM_URL: http://civicos-app:3000` | plain variables; also `CIVICOS_PLATFORM_TIMEOUT_MS`, `CIVICOS_MIRROR_RESYNC_MS`, `CIVICOS_MIRROR_TIMEOUT_MS`, `CIVIC_CORS_ORIGINS`, `CIVIC_RATE_RPM` (services/civic-api/README.md) |
| `api.mirrorSecret` | `""` | secret with `CIVICOS_MIRROR_KEY` and `CIVICOS_MIRROR_WEBHOOK_SECRET`; empty: the mirror follower is off |
| `api.autoscaling.*` | on, 3–20, 70 % CPU | |
| `postgres.existingSecret` / `secretKey` | `civicos-db` / `DATABASE_URL` | civic-api always; the app in postgres mode |
| `nats.url` | `nats://nats.civicos.svc:4222` | |

The civic-api's database migrations (`prisma migrate deploy`) are run by the
operator before an upgrade; the chart does not run them.

### Network policy

Default deny for every pod in the namespace, then:

- **app** ← the ingress (`security.ingressFrom`), the civic-api, the scheduled
  jobs. **app** → civic-api 4000; Postgres (postgres mode); the trace collector
  (when the chart runs it); HTTPS (`security.egress.https` on
  `security.egress.httpsPorts`); DNS.
- **civic-api** ← the ingress, the app. **civic-api** → Postgres, NATS 4222,
  the app 3000, DNS.
- **scheduled jobs** → the app 3000, DNS; nothing reaches them.
- **trace collector** ← the app. → its exporters (443, 4317, 4318), DNS.

| Value | Default | |
|---|---|---|
| `security.networkPolicy` | `true` | |
| `security.ingressFrom` | namespaces labelled `role: ingress` | NetworkPolicy peers allowed to reach the app and the api |
| `security.egress.dns` | pods `k8s-app: kube-dns` in `kube-system` | TCP and UDP 53 |
| `security.egress.postgres` / `postgresPort` | pods `app.kubernetes.io/name: postgres` / `5432` | set to the managed database's address (`ipBlock`) |
| `security.egress.nats` | pods `app.kubernetes.io/name: nats` | |
| `security.egress.https` / `httpsPorts` | `[]` (any address) / `[443]` | narrow to the substrate and registered hosts, or to the egress proxy alone with `CIVICOS_EGRESS_PROXY` |
| `security.egress.extra` | `[]` | further app egress rules (e.g. the key provider or TSA on another port) |
| `security.podSecurityContext` | uid/gid 10001, `fsGroup` 10001, non-root, `RuntimeDefault` seccomp | every pod |

An empty peer list means any destination on that port.

### Scheduled jobs (`cron`)

The app's jobs under `app/src/app/api/cron/*` are scheduled today by pg_cron
in the substrate (`app/supabase/cron/schedule.sql`, pg_net calls with the
`civicos_cron_secret` from Vault). Where pg_cron is not available (postgres or
file state, air-gapped) set `cron.enabled: true` and the chart makes one
`CronJob` per job, with the same schedules and methods. Run one scheduler,
not both.

Each run calls `http://civicos-app:3000/api/cron/<job>` once, with
`CIVICOS_CRON_SECRET` (from `app.existingSecret`) as `Authorization: Bearer`,
and fails on any answer other than 2xx. Runs never overlap
(`concurrencyPolicy: Forbid`) and are not retried (`backoffLimit: 0`; the next
run picks the work up). The call is made with `node` in the app's own image,
so nothing else is pulled.

| Job | Schedule | Method |
|---|---|---|
| `update-watchdog`, `deliver-messages` | every minute | GET |
| `deliver-cloudevents` | every 2 minutes | GET |
| `deliver-events` | every 5 minutes | GET |
| `substrate-metrics`, `audit-anchor` | every 10 minutes | GET |
| `witness-sweep`, `witness-divergence` | every 15 minutes | GET |
| `posture-digest`, `site-feeds` | every 30 minutes | GET |
| `expire-consents`, `audit-self` | hourly | GET |
| `twin-ingest` | hourly at :07 | GET |
| `backup` | hourly at :41 (takes a backup when the newest is older than the policy's interval) | GET |
| `retention` | hourly at :23 | GET |
| `sla`, `telemetry-stale`, `promote-directives` | hourly | POST |

| Value | Default | |
|---|---|---|
| `cron.enabled` | `false` | |
| `cron.image` / `cron.tag` | `""` (the app's) | any image with node 18+ |
| `cron.timeZone` | `""` | IANA zone (Kubernetes 1.27+) |
| `cron.timeoutSeconds` | `300` | per call; the Job's deadline is 30 s more |
| `cron.startingDeadlineSeconds` | `120` | |
| `cron.successfulJobsHistoryLimit` / `failedJobsHistoryLimit` | `1` / `3` | |
| `cron.resources` | 10m/64Mi request, 200m/128Mi limit | |
| `cron.withoutSubstrate` | `false` | `true` where there is no Supabase substrate: the jobs that need it (`deliver-events`, `substrate-metrics`, `witness-sweep`, `witness-divergence`, `posture-digest`, `expire-consents`, `audit-self`, `sla`, `telemetry-stale`) answer 503 there and are not created |
| `cron.jobs.<name>` | as above | `schedule`, `method` (GET or POST), `enabled: false` to skip one, `substrate: true` for the jobs above |

### Ingress, traces, disruption budgets

`ingress.*` (host, TLS secret, the civic-api path, global and per-group
limits, the mutual-TLS federation host) and `otel.*` are described in
`values.yaml`. `pdb.enabled` / `pdb.minAvailable` set the disruption budgets.

## Profiles

`infra/helm/profiles/` sizes the civic-api for a small municipality, a
mid-sized city, a ministry and a nation; every profile keeps one app replica
(single writer) unless the nation moves to postgres state.
