# civic-api (frozen read-only mirror)

The NestJS + Prisma service from the first build of CivicOS. **It is frozen as
a read-only mirror** (architecture review R19, finding D8 "several sources of
truth", `docs/ARCHITECTURE_REVIEW_DIGITAL_TWIN.md`).

Every register this service holds has one owner, the CivicOS platform (the
Next.js app in `app/`). The ownership map is
`app/src/lib/data/register-owners.ts`, served at `GET /api/platform/owners`.
No app route calls this service.

## What frozen means

- **Reads answer as before.** `GET`, `HEAD` and `OPTIONS` reach the
  controllers unchanged (including `/api/health/*`, `/api/metrics` and the
  OpenAPI document at `/api/docs`).
- **Every write is refused** (`POST`, `PUT`, `PATCH`, `DELETE`) with
  `410 Gone`, before authentication or any controller runs, so nothing is
  written. The answer names the platform route that owns the record, in the
  message and in the `X-CivicOS-Owner` header:

  ```json
  { "error": "civic-api is a frozen read-only mirror; the permits register is owned by the CivicOS platform. Make this change through /api/permits.", "status": 410 }
  ```

- **It is not fed.** It holds what it held when it was frozen; the platform's
  records are the current ones.
- **It cannot be unfrozen by configuration.** `CIVIC_API_MODE` accepts only
  `frozen` (or unset); any other value stops the service at start. Lifting the
  freeze is a code change that must change the ownership map too
  (`app/src/lib/data/register-owners.test.ts` checks that every module is
  listed here with its register's owner).

The rule is one global guard, not an edit to each controller:
`src/common/read-only-mirror.ts` (the module → owner table and the rule) and
`src/common/read-only-mirror.guard.ts` (registered first in `app.module.ts`).
All controllers, services and the Prisma schema and migrations are kept.

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
npm test                # the freeze: rules, mode, and a Nest app answering GET and refusing writes
npm run build && npm start
```

`npm test` compiles `src/common` and `test/` with `tsconfig.test.json` into
`dist-test/` and runs them with Node's test runner; it needs no database.
Running the service itself needs `DATABASE_URL` and the Prisma migrations
(`npm run prisma:migrate`).
