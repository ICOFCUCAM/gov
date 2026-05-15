# CivicOS — Institutional Framework (Companion 164)

Operational engineering reference. Concise. Pairs with running code:
`services/civic-api` (`OrgModule`: archetype registry, ministry/department/
module services, migration 0006, RBAC) and `app` (`/ministries` console,
config-driven `/control`, mirrored `/api/org/*`). No doctrine — Companion 158
binds: governments compose institutions; the platform records and gates.

---

## 1. The correction

The ministry layer is **not** a hardcoded single-ministry app. Ministries are
**data, not code**: provisioned from archetype blueprints, then renamed,
merged, deactivated, and recomposed without a platform rewrite. The old
hardcoded "Ministry of Social Protection" control page is replaced by a
config-driven view that renders whatever institutions exist.

## 2. Shared sovereign core (inherited by every institution)

Identity, audit (hash chain), RBAC, observability, workflow engine,
notifications, interoperability/federation, documents, payments, deployment,
operational governance. A ministry never re-implements these — it inherits
them from the platform.

## 3. Archetypes (reusable institutional blueprints)

12 code-defined blueprints — HEALTH, EDUCATION, FINANCE, AGRICULTURE, ENERGY,
TRANSPORT, JUSTICE, ENVIRONMENT, INTERIOR, LABOR, TRADE, GENERIC. Each
declares `defaultDepartments`, `defaultModules`, `domainEntities`.
Instantiating an archetype seeds that structure; it is a **configurable
foundation, not a rigid app**.

```
archetype blueprint ──instantiate──▶ Ministry (+ default Departments
                                       + default ModuleActivations)
                       └─ then: rename / merge / deactivate
                                add / remove Department
                                toggle ModuleActivation
```

## 4. Data model (migration 0006)

- `Ministry(tenantId, slug, name, archetype, status, mergedIntoId)` — RLS-isolated, unique slug per tenant.
- `Department(ministryId, name)` — cascade-deleted with its ministry.
- `ModuleActivation(ministryId, moduleKey, enabled, config)` — policy-driven composition, not code branches.
- Status machine: `ACTIVE → MERGED` (departments/modules move to target) or `ACTIVE → DEACTIVATED`. Merge-into-self rejected.

## 5. RBAC

- `org:read` — view archetypes and institutions.
- `org:admin` — create / rename / merge / deactivate ministries.
- `org:configure` — add/remove departments, toggle modules.

Verified: 403 without permission; bad slug / unknown archetype → 422; merge-into-self → 409. Every change is hash-chained into the audit trail.

## 6. Operational UX

`/ministries` (OperatorShell, admin) — create from a blueprint, then a
selected-institution panel: rename, merge (pick target), deactivate, add/
remove departments, toggle modules. `/control` (ministry role) is now
**config-driven**: an institution switcher rendering the chosen ministry's
name, departments, and enabled modules from the framework — zero hardcoded
ministry copy. Both surfaces never expose citizen or officer individual data
(Companions 156/158).

## 7. Specialised sectors without separate apps

Health gets facilities/licensing/outbreak/pharma/vaccination/ambulance
modules; Education gets schools/enrolment/exams/curriculum/scholarships;
Finance gets treasury/taxation/budget/procurement/grants — all as module
keys on one platform, switched on by activation, customised per government.
No disconnected ministry applications; one sovereign institutional OS.

---

Verified: backend `nest build` green, 48 OpenAPI paths, RBAC 403, archetype
seeding, validation; app build green; full lifecycle smoke-tested — create
(HEALTH: 4 depts/6 modules) → rename → add dept → disable module → merge
(finance→health, source MERGED) → deactivate; `/control` config-driven with
no hardcoded ministry; audit chain intact. Phase gates (Companion 159)
unchanged — institutional composition for what already ships.
