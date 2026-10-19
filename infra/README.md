# CivicOS — Infrastructure

Sovereign-portable deployment. No vendor lock-in (Companion 139).

## Layout

```
infra/
├── docker/docker-compose.yml   # local full stack (pg, nats, redis, api, app)
├── k8s/namespace.yaml          # raw namespace (Helm is the primary path)
├── helm/civicos/               # the chart: api + app + ingress + netpol + hpa + pdb
├── helm/profiles/              # small-municipality | mid-city | ministry | national
└── terraform/                  # vendor-neutral env contract + platform module
```

## Local (one command)

```bash
docker compose -f infra/docker/docker-compose.yml up --build
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
  --from-literal=NEXT_PUBLIC_SUPABASE_URL='https://…' \
  --from-literal=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='…' \
  --from-literal=SUPABASE_SERVICE_ROLE_KEY='…'          # the nation's substrate
helm -n civicos upgrade --install civicos infra/helm/civicos \
  -f infra/helm/profiles/mid-city.yaml
```

What the chart sets up for the Next.js app (`templates/app.yaml`):

- The ingress sends every page **and every `/api` route** to the app. The
  NestJS civic-api keeps its own `/api/*` paths under `/svc/api/*`
  (`ingress.civicApiPath`, rewritten to `/api/*`).
- `CIVICOS_AUTH=enforce` (`app.auth`), the session and cron secrets and the
  substrate keys from the `civicos-app` secret, and `CIVICOS_STATE=supabase`
  (`app.state.mode`; `file` puts the state on a persistent volume).
  Apply the app's Supabase migrations first (`app/supabase/migrations`,
  including `civicos_platform_state_fencing`).
- **One replica, `Recreate` strategy.** The platform state has a single
  writer (`app/src/lib/data/persist.ts`: a writer lease and versioned saves);
  the chart refuses more replicas until the state moves to a multi-writer
  store (architecture review R6). Every profile runs one app replica; the
  civic-api still scales.
- Probes: readiness `/api/health?ready` (503 while the server does not hold
  the writer's lease), liveness and start-up `/api/health?live`.
- The ingress drops the `x-middleware-subrequest` header (needs snippet
  annotations allowed; `ingress.stripInternalHeaders=false` otherwise — the
  app refuses the header itself).

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
