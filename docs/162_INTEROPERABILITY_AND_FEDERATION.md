# CivicOS — Interoperability & Federation (Companion 162)

Operational engineering reference. Concise. Pairs with running code:
`services/civic-api` (ApiKeyGuard, RateLimitGuard, versioning, InteropModule,
FederationService.assertAccess) and `app` (`/integrations` console,
`/developers` guide, mirrored `/api/*`). No doctrine — Companion 158 binds
(humans approve every integration and grant; nothing connects implicitly).

---

## 1. The one rule

> **Default deny.** Cross-tenant access, external API calls, and event
> delivery are denied unless an explicit, scoped, approved, unexpired
> authorisation exists. If the policy store is unreachable, checks **fail
> closed**. Verified end-to-end.

## 2. API governance

| Control | Implementation |
|---|---|
| Versioning | `/api/v1`; every response carries `X-API-Version` |
| Deprecation | `@Deprecated('<sunset>')` emits `Deprecation` + RFC 8594 `Sunset` |
| Contract | OpenAPI generated from code (`/api/docs[-json]`) — single source of truth, 26 paths |
| Rate limiting | Global `RateLimitGuard` (token bucket, per-principal/IP), `X-RateLimit-*` headers, `429` on exceed; health/metrics never throttled; Redis swap seam |
| Validation | Zod at every controller boundary |
| Audit | Every mutation hash-chained (Companion 161); machine callers logged as `actorType: agent` |
| Tenant-aware | Every call resolves a tenant scope; metrics labelled by tenant, never citizen |

## 3. Identity federation

- Citizens/officers → OIDC bearer from the **sovereign IdP** (the only trust root). SAML / OAuth2 / FAPI are adapters behind the single `AuthGuard.verifyToken()` seam — no vendor IdP, no social login.
- External systems → scoped **API keys** (`ApiKeyGuard`): key hashed, matched to an `APPROVED` `IntegrationClient`, client scopes become the principal's permissions, tenant-scoped, `actorType: agent`. Unknown/pending/suspended/revoked → denied.

## 4. Integration onboarding (human-governed)

```
register → PENDING ──(ministry operator approves)──▶ APPROVED ──▶ usable
                  └──────────── SUSPENDED / REVOKED ◀────────────┘
```

Raw API key returned **once** (only the hash stored). Scopes are minimum-necessary. `EXTENSION` kind = a ministry/municipality module; same approval discipline, no arbitrary code execution — extensions are permission-scoped registrations, not a plugin sandbox.

## 5. Federation architecture

`FederationGrant(from → to, scopes, status, expiry)`. `assertAccess(from,to,scope)` returns allow **only** for an `APPROVED`, unexpired grant whose scopes include `scope`; same-tenant short-circuits allow; DB error → fail closed. Approval is by the **receiving** tenant (you authorise who reaches into your data). Other modules call `assertAccess` before any cross-tenant read/action. Verified: propose→deny, approve→allow, wrong-scope→deny, expired→deny, store-down→deny.

## 6. Event & webhook governance

- Transactional outbox (Companion 160) gives at-least-once; consumers idempotent on event id.
- `WebhookSubscription(topic, url, secretHash, status)`; topic `*` matches all.
- Signature: `HMAC-SHA256(secret, `${timestamp}.${body}`)`. Consumers MUST verify signature **and** reject timestamps outside ±300s (replay protection). Secret shown once.
- Delivery failures increment `failures`; backoff/disable via the relay seam; tenant-isolated.

## 7. Developer ecosystem

`/developers`: registration → auth → contract/versioning → events → federation → sandbox. Every sovereign runs a **sandbox tenant** (synthetic data, same contract); production approval is a separate human step. No production citizen data in integration testing, ever.

## 8. Operational interoperability

- Onboarding, approval, revocation, federation grant lifecycle, and webhook subscription are all operator surfaces (`/integrations`, OperatorShell) with RBAC (`integration:approve`, `federation:approve`, `webhook:manage`).
- Every interop action is audited and appears in the tamper-evident trail and (production) Prometheus metrics.
- Federation health and integration status roll up into the Operations Centre (Companion 161).

## 9. What this is not

Not an open platform, not unrestricted data exchange, not surveillance. It is a disciplined sovereign interoperability framework: explicit, scoped, approved, revocable, audited, fail-closed.

---

Verified: backend `nest build` green, `X-API-Version`/rate-limit headers present, federation fail-closed under DB-down, RBAC 403 enforced, OpenAPI 26 paths; app build green, `/integrations` + `/developers` 200, full propose→approve→allow + onboarding + webhook + audit-chain smoke-tested. Phase gates (Companion 159) unchanged — interoperability for what already ships, not new scope.
