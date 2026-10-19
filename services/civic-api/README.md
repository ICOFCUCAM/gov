# civic-api (mirror of the CivicOS platform)

The NestJS + Prisma service from the first build of CivicOS. **It is a mirror
of the CivicOS platform** (architecture review R19, finding D8 "several
sources of truth", `docs/ARCHITECTURE_REVIEW_DIGITAL_TWIN.md`): it accepts
changes by passing each one to the platform that owns the record, and keeps
its own tables current from the platform. There is still exactly one true
copy of every record, the platform's.

Every register this service holds has one owner, the CivicOS platform (the
Next.js app in `app/`). The ownership map is
`app/src/lib/data/register-owners.ts`, served at `GET /api/platform/owners`.
No app route calls this service.

## Reads

`GET`, `HEAD` and `OPTIONS` reach the controllers unchanged (including
`/api/health/*`, `/api/metrics` and the OpenAPI document at `/api/docs`) and
read civic-api's own tables, which are the mirror. Mirrored records live in
the platform's tenants (`platform:<name>`, e.g. `platform:home`); rows from
before the mirror stay in their own tenants, untouched.

## Writes: `CIVIC_API_MODE`

| Mode | A write (`POST`, `PUT`, `PATCH`, `DELETE`) |
|---|---|
| `forward` (default, also when unset) | passed to the platform route that owns the record; the platform's answer comes back |
| `frozen` | refused with `410 Gone` and the owning platform route |

Any other value stops the service at start, and so does `forward` without
`CIVICOS_PLATFORM_URL`. A mode that writes civic-api's own tables does not
exist: that would be a second true copy.

The rule is one global guard (`src/common/read-only-mirror.guard.ts`,
registered first in `app.module.ts`); it answers before authentication, any
controller, interceptor or audit write runs, so a write never touches
civic-api's tables.

### Forward mode

`src/common/forward.ts` holds one table, `FORWARD_ROUTES`: each civic-api
write endpoint → the platform route, a request mapper (civic-api's body →
the platform's) and an answer mapper (the platform's body → civic-api's
shape, `src/common/platform-shapes.ts`, the same converters the follower
uses, so a record reads the same either way).

- **The caller's own credentials, unchanged.** Its `Authorization` and
  `Cookie` headers go through as they came, and nothing else that identifies
  anyone. civic-api adds no identity of its own; its development principal
  (`x-civic-principal`) is never sent; an actor named in a body (`by`) is not
  passed on. The platform decides who acted and whether they may (its
  middleware, `lib/auth/roles.ts`, `withOfficial()`). In practice the
  platform accepts a signed-in official's `civicos_official` session cookie;
  a civic-api bearer token counts for nothing there.
- **Answers.** 2xx: the platform's record in civic-api's shape (status as
  the platform gave it, e.g. 201). 4xx: the platform's status and reason, in
  civic-api's error envelope `{ error, status, at, forwardedTo }`. Headers
  `X-CivicOS-Mode: forward`, `X-CivicOS-Owner` and `X-CivicOS-Forwarded-To`.
- **Upstream failures.** No answer within `CIVICOS_PLATFORM_TIMEOUT_MS`
  (default 10 000) → `504`; unreachable, a 5xx, a redirect or an answer that
  is not JSON → `502`; each with the reason. One attempt only: writes are not
  idempotent and are **never retried** (a 504 says the change may or may not
  have been made; check the platform before trying again).

| civic-api write | Platform route |
|---|---|
| `POST /api/org/ministries` | `POST /api/org/ministries` |
| `POST /api/org/ministries/:id/rename` | `POST /api/org/ministries/{id}/rename` |
| `POST /api/org/ministries/:id/deactivate` | `POST /api/org/ministries/{id}/deactivate` |
| `POST /api/org/ministries/:id/merge` | `POST /api/org/ministries/{id}/merge` |
| `POST /api/org/ministries/:id/departments` | `POST /api/org/ministries/{id}/departments` (answer: the department) |
| `DELETE /api/org/ministries/:id/departments/:deptId` | `DELETE /api/org/ministries/{id}/departments/{deptId}` (mirror id `ministry:dept` → platform id) |
| `POST /api/org/ministries/:id/modules` | `POST /api/org/ministries/{id}/modules` (answer: the activation) |
| `POST /api/permits` | `POST /api/permits` (type `MARKET_STALL` → `market-stall`; applicant name and municipality from the body, else from the mirrored citizen `citizenId`, else 422) |
| `POST /api/permits/:id/decide` | `POST /api/permits/{id}/decide` (`APPROVED`/`DECLINED`/`NEEDS_INFO` → `approve`/`decline`/`request-info`) |
| `POST /api/payments` | `POST /api/payments` |
| `POST /api/ops/incidents` | `POST /api/ops/incidents` (`SEV2` → `sev2`) |
| `POST /api/integrations` | `POST /api/integrations` (the key is shown once, kept only by the platform) |
| `POST /api/integrations/:id/approve`, `…/revoke` | `POST /api/integrations/{id}/approve`, `…/revoke` |
| `POST /api/federation/propose` | `POST /api/federation/propose` (`toTenantId` → `toTenant`; the platform requires a usage `policy`) |
| `POST /api/federation/grants/:id/approve`, `…/revoke` | `POST /api/federation/grants/{id}/approve`, `…/revoke` |
| `POST /api/webhooks`, `POST /api/webhooks/:id/pause` | `POST /api/webhooks`, `POST /api/webhooks/{id}/pause` |
| `POST /api/platform/releases`, `…/:id/promote` | `POST /api/platform/releases`, `…/{id}/promote` |
| `POST /api/platform/deployments`, `…/:id/advance`, `…/:id/rollback` | `POST /api/platform/deployments`, `…/{id}/advance`, `…/{id}/rollback` |
| `POST /api/platform/tenants/:id/transition` | `POST /api/platform/lifecycle/transition`, only for the platform's own tenant (`platform:home`); another tenant → 410 |
| `POST /api/platform/backups`, `…/:id/restore` | `POST /api/platform/backups`, `…/{id}/restore` |
| `POST /api/platform/config`, `…/:id/sign`, `…/:id/apply` | `POST /api/platform/config`, `…/{id}/sign`, `…/{id}/apply`; scope `TENANT` → 410 (the platform publishes global bundles only) |

**No owner route yet** (answer `410`, the platform is not asked, nothing is
written):

| civic-api write | Why |
|---|---|
| `POST /api/identity/citizens` | Citizen identity is owned by the substrate (citizen sign-in); the platform has no route that records a citizen. |
| `POST /api/tenancy/provision` | The platform holds one nation (`/api/setup`, `/api/sovereign`) and keeps no other tenant; `/api/municipalities` only checks a municipality's readiness and records nothing. |

`test/forward.spec.ts` fails when a controller gains a write endpoint that is
in neither table, and `app/src/lib/data/register-owners.test.ts` fails when a
forwarded platform route does not exist with that method.

## The mirror follower: civic-api's only writer

`src/mirror/follower.ts` keeps civic-api's tables current from the platform;
`src/mirror/prisma-store.ts` is the only code that writes them.

- **Events.** civic-api is a webhook subscriber of the platform's event
  outbox (CloudEvents 1.0, `app/src/lib/events/outbox.ts`, catalogue
  `docs/ASYNCAPI.yaml`), topic `*`, delivered to `POST /api/mirror/events`.
  Each delivery's `X-CivicOS-Signature` (HMAC-SHA256 of
  `${X-CivicOS-Timestamp}.${body}` with the subscription's secret) and a
  timestamp within 5 minutes are checked over the raw bytes before anything
  is read; a bad one is 401. Events say what changed, not the record, so an
  event of a mirrored register makes the follower read that register.
- **The feed.** `GET <platform>/api/platform/mirror?registers=…` with the
  follower's own integration key (scope `mirror:read`; never a caller's
  credentials): the registers in the platform's shapes, the audit sequence
  they are current to and the platform's own tenant. Integration keys and
  webhook secrets are never in it; civic-api's key and secret columns hold
  the placeholder `held-by-platform`, which matches no key.
- **Idempotent.** An event already applied (by its id), or at or below the
  cursor (the platform audit sequence the mirror is current to), is
  acknowledged without writing. Rows, the event id and the cursor are written
  in one transaction; the cursor never goes back. One read-and-write at a
  time. A failed read answers 503, so the platform keeps the event and
  delivers it again.
- **Full re-sync** at start and every `CIVICOS_MIRROR_RESYNC_MS` (default
  15 minutes): every register is read and written and the cursor moves to the
  feed's audit sequence. It also covers what happened before the subscription
  (a new subscriber receives events from then on).
- **Status**: `GET /api/mirror/status` (mode, whether the follower runs, the
  cursor, the last event and re-sync, the last error).

Mirrored: institutions (ministries, departments, module activations),
permits (with their timelines), bills and receipts, incidents, releases,
deployments, backups, configuration bundles, the platform tenant and its
lifecycle, integrations, federation grants (a row per partner tenant they
name) and webhook subscriptions. Not fed: identity (the substrate's) and the
audit module (the platform audit chain is not in the feed; verify it at the
platform's `/api/audit/verify`).

### Setting it up

1. On the platform (an administrator, Integrations): register an
   integration with scope `mirror:read`, approve it, and give its key to
   civic-api as `CIVICOS_MIRROR_KEY`.
2. On the platform: subscribe a webhook, topic `*`, address
   `http://<civic-api>:4000/api/mirror/events`; give its signing secret to
   civic-api as `CIVICOS_MIRROR_WEBHOOK_SECRET`. A private address needs
   `CIVICOS_WEBHOOKS_PRIVATE=1` on the platform; deliveries go out on the
   platform's `/api/cron/deliver-cloudevents` run.
3. civic-api: `CIVICOS_PLATFORM_URL` (the platform's address, e.g.
   `http://app:3000`), `npm run prisma:migrate` (migration
   `0008_platform_mirror`).

Without the key and the secret the follower is off (the status says which is
missing) and civic-api holds what it last mirrored; forwarding works without
them.

| Variable | Default | |
|---|---|---|
| `CIVIC_API_MODE` | `forward` | `forward` or `frozen` |
| `CIVICOS_PLATFORM_URL` | (required in forward mode) | the platform's base address |
| `CIVICOS_PLATFORM_TIMEOUT_MS` | `10000` | how long a forwarded write may take |
| `CIVICOS_MIRROR_KEY` | | integration key, scope `mirror:read` |
| `CIVICOS_MIRROR_WEBHOOK_SECRET` | | the webhook subscription's signing secret |
| `CIVICOS_MIRROR_RESYNC_MS` | `900000` | full re-sync interval |
| `CIVICOS_MIRROR_TIMEOUT_MS` | `15000` | how long a feed read may take |

| Module | Register | Change it through (platform) |
|---|---|---|
| `tenancy` | nation | `/api/sovereign`, `/api/setup` |
| `org` | institutions | `/api/org/ministries` |
| `audit` | audit-platform | the platform audit chain (`recordAudit()`) |
| `permits` | permits | `/api/permits` |
| `payments` | payments | `/api/payments` |
| `ops`, `platform-ops`, `health`, `metrics` | ops | `/api/ops`, `/api/platform` |
| `interop` | federation | `/api/federation`, `/api/integrations`, `/api/webhooks` |
| `identity` | identity | `/sign-in` (substrate auth) |

## Commands

```bash
pnpm install --frozen-lockfile
npx prisma generate     # the Prisma client the code compiles against
npm run typecheck
npm test                # modes, forwarding against a stub platform, the follower against an in-memory store
npm run build && npm start
```

`npm test` compiles `src/common`, `src/mirror/follower.ts` and `test/` with
`tsconfig.test.json` into `dist-test/` and runs them with Node's test
runner; it needs no database. Running the service itself needs
`DATABASE_URL` and the Prisma migrations (`npm run prisma:migrate`).
