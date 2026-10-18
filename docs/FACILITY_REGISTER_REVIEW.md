# National facility register on the map: expert review

Status: reviewed (October 2026); to be built as map plan phase 4 (`docs/MAP_SYSTEM_PLAN.md`).
Register: §4.4, §16.6, §16.9, §17.1.

## The owner's proposal

When institutions and national infrastructure (schools, power, airports,
hospitals, police and others) are added, there should be a manual and an
automatic way, and both must record longitude and latitude so every site
stands on the national map. Digital interoperability must be visible on the
map. Ministries add their own sites through a form.

## Verdict

Useful, and the most valuable next step for the map and the twin: the regions
are now real, but nearly every facility a console shows is still generated.
Three refinements:

- **Automatic never means published automatically.** Uploads, connected
  systems and open data produce checked loads or candidates that a named
  official reviews and a different official publishes.
- **Institutions are not points; their sites are.** A ministry has a
  headquarters, regional offices, hospitals; only the sites are placed.
- **Some sites must not be shown exactly to everyone** (military,
  substations, telecom, water treatment, many police posts).

## What it builds on

- Twin register (`lib/twin/register.ts`): the `facility` entity kind with
  `location`, the identifier crosswalk (`keys`, `resolveEntity`), sources,
  runs with refused rows, bitemporal observations (beds, enrolment, megawatts).
- OGC API Features (`lib/twin/ogc.ts`): a `facilities` collection beside
  `subdivisions`.
- Intake pattern (`lib/data/case-import.ts`): column template, dry run,
  refused rows with reasons, file SHA-256, withdrawable loads, one typed-in
  record, a connected-system feed with its own key stored as a hash.
- Map engine: `NationMap` places points by region today; the model already
  projects longitude/latitude (`model.project`, the capital), and
  `lib/map/world.ts` has the point-in-polygon test.
- Roles: `/api/org/ministries/[id]/…` changes are scoped to the ministry
  (`lib/auth/roles.ts`); four-eyes patterns in `lib/data/site-editorial.ts`
  and `lib/data/change-control.ts`.
- Real interoperability records: integration clients and federation grants
  (`/admin/integrations`), case feeds, twin sources and runs.

Generated today (to be replaced, exports kept): `lib/gov/infrastructure.ts`
(`nationalAssets`, `nationalNetworks`), the police heat map, immigration
ports of entry, school and hospital aggregates.

## Design

**Categories and identifiers** (kept in the crosswalk): health facilities (the
national Master Facility List code; DHIS2 uid), schools (EMIS code), airports
(ICAO, IATA), ports and border posts (UN/LOCODE), power plants and substations
(regulator code), water (utility asset code), police, courts, prisons
(national codes), government offices (organisation id, exchange member code),
telecom (restricted by default), and others a nation adds. The category list
is structure of government: administrators only.

**Fields:** name and official local name; category; owning institution and
operator; location (longitude, latitude, accuracy in metres, how captured:
survey, device GPS, map pin, gazetteer match, imported); region and district
derived by point-in-polygon, never typed; status (planned … decommissioned);
sensitivity; source with run and file SHA-256; valid-from and recorded-at.

**Manual way:** a Sites tab in each ministry workspace and a whole-government
tab under National data (tabs, not new menu entries). Map pin, typed
coordinates (decimal, degrees-minutes-seconds, national grid), or an address
matched only against the nation's own gazetteer (never an outside geocoder;
marked low accuracy). Checks: ranges, (0,0), swapped latitude/longitude;
inside the territory (a warning with a coastal tolerance for ports); inside
the stated region; duplicates by distance and name or identifier; precision.

**Automatic ways, by trust:** CSV/GeoJSON upload on the case-import pattern;
a connected ministry system (its own key, updates only what it sent); open
data (OpenStreetMap/HDX, healthsites.io, OurAirports, power plant databases)
as candidates only, to confirm, merge or reject.

**Review:** an officer of the owning institution proposes, a different
official publishes; bulk loads four-eyes per load; restricted categories need
an administrator or a named custodian; every step audited.

**Provenance:** declared by the ministry = reported; verified by survey or the
system of record = observed; open-data candidates not shown until confirmed;
generated assets stay hatched samples until the register has entries.

**History:** every change is a version (opened, moved, renamed, closed);
nothing deleted; the map answers "which clinics existed on 1 March".

**Sensitivity:** public (exact everywhere); restricted (exact for officials
with a need, each read audited; blurred to a 1–5 km grid or the district on
public maps and open OGC); confidential (outside the civilian register,
counts only). Combining open datasets creates new risk (the mosaic effect).

## Interoperability on the map

Not decorative lines but three answers: which sites are connected to their
national system (share of facilities reporting this month, shaded by region,
observed); which institutions exchange data with which under what agreement
(lines between registered headquarters from grants, integrations and feeds);
and whether those connections are healthy (last call, refusal rate, run
status). Three line styles: designed dependency (dashed, modelled: today's
fabric, kept), agreed exchange (solid, reported), live exchange (solid with
its last-call time, observed). The Situation Room's institutions move from
the ring around the capital to their registered seats.

## Order of work (phase 4)

0. Optional longitude/latitude on map points (region keys keep working);
   `withOfficial()` on `POST /api/twin/sources` (done with this review).
1. 4a register core (1.5–2 weeks): facility fields and versions, categories,
   validation, manual form with map pin, points by coordinates, `facilities`
   OGC collection with blurring, API under `/api/org/ministries/[id]/facilities`.
2. 4b bulk and feed (1–1.5 weeks): upload, connected-system key, four-eyes.
3. 4c open-data candidates (about 1 week).
4. 4d interoperability layer (about 1 week).
5. Phase 5 then reads the register: `nationalAssets()` keeps its export but
   returns registered facilities, falling back to hatched samples.

About 4–6 weeks on its own: phase 4 is split into 4a–4d.

Never: store an address match or a region centre as the site's location; show
sample or open-data sites as the nation's; publish from a feed or open source
without review; put military sites in the civilian register; fetch tiles or
geocoders from outside services.

## Questions for the owner

1. Custodians: the ministry owns its records and the mapping agency certifies
   location quality?
2. Legal basis and default sensitivity per category: who decides?
3. Licences: OpenStreetMap and healthsites.io are ODbL (share-alike).
4. Volume: national school and health loads need real tables (register 1.1).
5. Lines and areas (power lines, roads, airport perimeters) come after points;
   vehicles are not facilities.
6. Districts: point-in-polygon below region level only where district shapes
   exist (5 nations today).
7. Field capture: a mobile, offline capture app, or existing survey data?
8. Coastal and border cases: a confirmed override with a reason.
9. Private and foreign operators: does the regulator own their records?
10. Expectations: the interoperability map will look sparse at first; that is
    the honest result.
