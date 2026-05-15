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
# api  → http://localhost:4000/api  (docs at /api/docs)
```

## Kubernetes (sovereign cluster)

```bash
kubectl apply -f infra/k8s/namespace.yaml
kubectl -n civicos create secret generic civicos-db \
  --from-literal=DATABASE_URL='postgresql://...'   # sovereign managed Postgres
helm -n civicos upgrade --install civicos infra/helm/civicos \
  -f infra/helm/profiles/mid-city.yaml
```

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
