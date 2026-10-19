# CivicOS — Infrastructure

Sovereign-portable deployment. No vendor lock-in (Companion 139).

## Layout

```
infra/
├── docker/docker-compose.yml   # local full stack (pg, nats, redis, api, app; one state writer)
├── docker/prometheus.yml       # optional metrics collection (--profile observability)
├── k8s/namespace.yaml          # raw namespace (Helm is the primary path)
├── helm/civicos/               # the chart: api + app + ingress + netpol + hpa + pdb + cron (values: helm/civicos/README.md)
├── helm/check.sh               # helm lint + template + kubeconform for every values set (CI job "helm chart")
├── helm/profiles/              # small-municipality | mid-city | ministry | national
└── terraform/                  # vendor-neutral env contract + platform module
```

## Local (one command)

```bash
docker compose -f infra/docker/docker-compose.yml up --build
# with metrics: docker compose -f infra/docker/docker-compose.yml --profile observability up --build
# app  → http://localhost:3000
# api  → http://localhost:4000/api  (docs at /api/docs; under Helm it is served at /svc/api)
```

## Kubernetes (sovereign cluster)

```bash
kubectl apply -f infra/k8s/namespace.yaml
kubectl -n civicos create secret generic civicos-db \
  --from-literal=DATABASE_URL='postgresql://...'   # sovereign managed Postgres
kubectl -n civicos create secret generic civicos-app \
  --from-literal=CIVICOS_SESSION_SECRET="$(openssl rand -hex 32)" \
  --from-literal=CIVICOS_CRON_SECRET="$(openssl rand -hex 32)" \
  --from-literal=CIVICOS_EXPORT_SECRET="$(openssl rand -hex 32)" \
  --from-literal=CIVICOS_PUBLISHER_SECRET="$(openssl rand -hex 32)" \
  --from-literal=CIVICOS_PROVISIONING_SECRET="$(openssl rand -hex 32)" \
  --from-literal=CIVICOS_SETUP_TOKEN="$(openssl rand -hex 24)" \
  --from-literal=NEXT_PUBLIC_SUPABASE_URL='https://…' \
  --from-literal=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='…' \
  --from-literal=SUPABASE_SERVICE_ROLE_KEY='…'          # the nation's substrate
openssl genpkey -algorithm ed25519 -out audit.pem      # likewise exchange.pem, token.pem
kubectl -n civicos create secret generic civicos-app-keys \
  --from-literal=CIVICOS_DATA_KEK="$(openssl rand -base64 32)" \
  --from-file=CIVICOS_AUDIT_KEY=audit.pem \
  --from-file=CIVICOS_EXCHANGE_KEY=exchange.pem \
  --from-file=CIVICOS_TOKEN_KEY=token.pem              # or app.keys.provider vault / kms-http
helm -n civicos upgrade --install civicos infra/helm/civicos \
  -f infra/helm/profiles/mid-city.yaml
```

What the chart sets up for the Next.js app (`templates/app.yaml`):

- The ingress sends every page **and every `/api` route** to the app. The
  NestJS civic-api keeps its own `/api/*` paths under `/svc/api/*`
  (`ingress.civicApiPath`, rewritten to `/api/*`).
- `CIVICOS_AUTH=enforce` (`app.auth`; the production image enforces sign-in
  anyway unless `CIVICOS_AUTH=open`, go-live review L-2),
  `CIVICOS_TRUSTED_PROXIES=1` (`app.trustedProxies`: the ingress is the one
  proxy whose `X-Forwarded-For` hop counts for per-address limits; add one for
  an appending cloud load balancer in front, review L-1), the session and machine secrets and the
  substrate keys from the `civicos-app` secret, and `CIVICOS_STATE=supabase`
  (`app.state.mode`; `file` puts the state on a persistent volume).
  Apply the app's Supabase migrations first (`app/supabase/migrations`,
  including `civicos_platform_state_fencing`).
- **One replica, `Recreate` strategy**, unless `app.state.mode: postgres`.
  With file or supabase state the platform has a single writer
  (`app/src/lib/data/persist.ts`: a writer lease and versioned saves) and the
  chart refuses more replicas. With `postgres` every store is kept per record
  in the nation's Postgres (typed tables, and `civicos.record_doc` for the
  rest; architecture review R6), every replica takes every change and follows
  the others, and the chart allows `app.replicas > 1` with rolling updates.
  Every profile runs one app replica by default; the civic-api still scales.
- Probes: readiness `/api/health?ready` (503 while the server does not hold
  the writer's lease), liveness and start-up `/api/health?live`.
- The ingress drops the `x-middleware-subrequest` header (needs snippet
  annotations allowed; `ingress.stripInternalHeaders=false` otherwise — the
  app refuses the header itself).
- Read-only root filesystem (`/tmp` and `/app/.next/cache` are `emptyDir`
  volumes), no service-account token, uid/gid 10001; in file mode the audit
  anchor file gets its own volume (`app.anchors`).
- Scheduled jobs: pg_cron in the substrate by default
  (`app/supabase/cron/schedule.sql`); `cron.enabled: true` runs the same 15
  jobs as Kubernetes CronJobs (Bearer `CIVICOS_CRON_SECRET`) where pg_cron is
  not used. Run one scheduler, not both.
- Network policy egress is set per destination (`security.egress`: DNS to the
  cluster DNS only, Postgres, NATS, HTTPS); narrow each to the nation's own
  addresses.

Every value is listed in `infra/helm/civicos/README.md`. Check the chart with
`infra/helm/check.sh` (needs `helm` and `kubeconform`).

## Secrets by purpose and the first administrator

Each machine credential opens one thing (go-live review M-7), and is accepted
only as `Authorization: Bearer …`, never as `?token=`:

| Variable | Opens | Sent by |
|---|---|---|
| `CIVICOS_CRON_SECRET` | `/api/cron/*` only | pg_cron (`app/supabase/cron/schedule.sql`), Vercel Cron |
| `CIVICOS_EXPORT_SECRET` | `/api/substrate/export`, `/api/substrate/digest` | the archive or auditor's export job |
| `CIVICOS_PUBLISHER_SECRET` | `/api/releases/publisher/*` (with `CIVICOS_AUTH=enforce`) | CI (`CIVICOS_PUBLISHER_TOKEN` in `scripts/audit-deps.mjs`) |
| `CIVICOS_PROVISIONING_SECRET` | `/api/admin/officers/bulk`, `/api/federation/webhooks/test` | officer onboarding scripts |

A purpose without its variable accepts no machine caller (a platform-tier
substrate session still works where the route allows one). **Upgrading an
installation that used the cron secret for export, publishing or
provisioning:** set the new variable and move the job to it. Until then
`CIVICOS_LEGACY_SHARED_SECRET=1` lets the cron secret keep working for a
purpose that has no secret of its own; every such use is logged as
`auth.shared_secret_deprecated`. Remove the flag once the log is quiet, then
rotate the cron secret (it was stored in pg_cron's Vault and sent on every
job). Schedulers that put the secret in the query string must move it into
the `Authorization` header (`auth.secret_in_query_refused` in the log).

**First administrator (go-live review C-1).** While the installation has no
administrator, creating the first official account needs a one-time setup
code: `CIVICOS_SETUP_TOKEN` (at least 24 characters, the same on every
replica), or, when it is not set, a code the server writes once to its log at
start (`SETUP CODE`, valid 24 hours; a restart or expiry writes a new one).
It is compared in constant time and works once. Enter it on `/sign-in` (the
first-account form `/setup` sends you to), then remove `CIVICOS_SETUP_TOKEN`.
When the substrate (Supabase) is the sign-in method, platform accounts are
not created at all (`CIVICOS_LOCAL_ACCOUNTS=allow` permits them as a
break-glass fallback, still behind the setup code for the first one).

## Terraform (per environment)

```bash
cd infra/terraform
terraform init -backend-config=env/<name>.backend
terraform apply -var environment=ministry -var region=<sovereign-region> \
  -var kubeconfig=<path> -var postgres_connection_secret=<from-vault>
```

The database, object store, and message bus are **sovereign-managed inputs** —
this code does not provision a sovereign's data substrate; the sovereign owns it.

## Deployment profiles

| Profile | Scale | Postgres | Operator | Go-live |
|---|---|---|---|---|
| small-municipality | <50k | shared regional | 1 part-time admin | ~14 days |
| mid-city | 50k–1M | dedicated HA | small digital team | ~30 days |
| ministry | cross-muni parent | HA + read replicas | ministry IT + Foundation | ~60 days |
| national | multi-region A/A | regional + async repl | sovereign cloud team | phased |

See Companion 160 for the operational architecture and Companion 159 for the
phased rollout.
