# CivicOS — working rules

## Preservation doctrine (locked)

What has been built is locked. Work only upgrades it toward the vision in
`CIVICOS_MASTER_BLUEPRINT.md` and `CIVICOS_VOL_II_CIVILIZATION_INFRASTRUCTURE.md`.

- Never delete a page, route, feature, component, or capability. Extend or
  upgrade it in place.
- Moving a route is allowed only when the old path keeps working (redirect)
  and `app/src/app/route-lock.json` is updated in the same change.
- New pages are added to `app/src/app/route-lock.json`.
  `app/src/app/route-lock.test.ts` fails if a locked route loses its page or
  a new page is not recorded.
- Redesigns keep every link, data source, and action the previous version had.

## Entry flow

- `/` is the cover page (`app/src/components/features/CoverGate.tsx`):
  everyone meets it first and chooses an entry path.
- `/cover` compares cover designs under evaluation (Stack, Boot, Atlas, Doors);
  all share `app/src/components/features/cover/entry.ts` for routing.
- `/command` is the Sovereign Command Center (formerly `/`), unchanged.
- Sign-in surfaces: `/sign-in` (substrate email + password) and `/login`
  (citizen verification). The cover hands off to them; it does not replace them.

## Checks

From `app/`: `npm run typecheck`, `npm test`.
