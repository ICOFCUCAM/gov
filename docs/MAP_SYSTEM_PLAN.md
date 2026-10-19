# Map system: evaluation and plan

Status: phases 0–2 done, phase 3 done (TopoJSON packs, districts at install, worldview), phases 4 and 5 done (October 2026); small items open: Kiribati names, France's overseas collectivities. Register: §16.4, §17.1.

## Answers to the owner's questions

**Foreign relations (`/gov/geopolitical`).** The world outline is real (Natural Earth), but the six large
circles are fixed drawing positions, the same in every installation; the page never centres on the installed
nation and colours real foreign countries with random "risk" numbers. A detailed world cut down in the
browser is not the right method: the nation gets a light world map for context plus its own regions (and
districts where available) at full detail, prepared at install time, with its mapping agency able to replace
the defaults.

**Situation now (`/gov/situation-room`).** Yes, a USA installation would show six sections: six hard-coded
slots take the first six regions of the list (Alabama starred as capital, Alaska … Colorado) on fixed
circles; 45 states and DC are missing; infrastructure icons are placed at random; the background country is
found by name ("Republic of …") and usually falls back to the whole world. It must show the nation's own
structure (all 50 states and DC, Kenya's 47 counties, Uganda's districts); the data already exists.

**Security (`/gov/security`).** The "National threat map" is a 30×13 grid of dots with seven random blobs;
no geography, zoom buttons that do nothing. To be replaced by the nation's real map with incidents by region.

**Already right:** the territory map on National data (`/gov/twin`, `TwinTerritory.tsx`): real official
subdivisions, coloured only from observed data, as-of history. About 30 other map panels are invented
layouts. The fix is one shared map engine grown from it.

## Inventory

| Surface | Component | Verdict |
|---|---|---|
| Territory map, `/gov/twin` | `twin/TwinTerritory.tsx` | Fit; becomes the engine core (needs per-nation projection: USA uses ~18% of its frame, Fiji is a speck) |
| Activity map, `/gov/situation-room`, Cabinet brief | `SituationRoom.tsx` `NationalMap` | Replace |
| Territory heat panels (12 callers: geopolitical, treasury, regional, situation room, cabinet, coordination, command, ministry workspace, ops, control, wall) | `SituationRoom.tsx` `TerritoryHeat` | Replace (random colours on real foreign states) |
| World basemap | `ui/WorldMap.tsx`, `lib/geo/world.ts` | Upgrade (1:50m, match by ISO code; 1:110m misses Singapore, Malta, Bahrain, Mauritius …) |
| National threat map, `/gov/security` | `NationalOverview.tsx` `ThreatMap` | Replace |
| Health maps (`/health-ecosystem`, `/app/health/*`) | `apps/_shared/GeoMap.tsx` | Upgrade (real shapes, but values cycled from six slots; fixed Uganda fallback; no sample marker) |
| ~15 ministry app schematic maps | interior, police, emergency, immigration, justice, transport, treasury, foreign affairs, senate, environment | Replace with engine presets |
| Cover globes, `/` and `/cover/*` | `CoverPlaza.tsx`, `CoverAtlas.tsx` | Fit (decorative) |
| System map, `/gov/map` | `SystemMap.tsx` | Fit (architecture diagram, not geography) |
| Setup country step | `SetupWizard.tsx` | Fit; the engine hooks in here |
| OGC API Features `/api/twin/ogc` | `lib/twin/ogc.ts` | Fit; extend with more levels and facilities |

## What exists to build on

- Official subdivisions: 200 countries, 5,046 units in official order (`lib/geo/divisions.ts`); second level for 29.
- Admin-1 shapes: Natural Earth 1:10m per country, lazily loaded (`lib/geo/admin1/`, 251 files); 36 countries
  upgraded from geoBoundaries / OCHA HDX with credits (`lib/geo/boundaries/`); 171 of 197 countries cover ≥95%
  of their official list.
- World data: `world-atlas` 1:50m (241 features, ISO numeric ids).
- Twin: `place` entities for every unit; a `facility` kind with `location` (unused so far); bitemporal
  observations; CSV sources with named runs; source markers (`lib/twin/signal.ts`).
- Libraries: d3-geo, topojson-client. Nothing loads external tiles (suits air-gapped nations).

## The map system

1. **World for context, the nation at full detail.** World 1:50m admin-0 (TopoJSON, ≈250 KB gz) matched by
   ISO code; the nation's admin-0/1/2 as TopoJSON built per nation at install, two detail levels. Shapes from
   the nation's mapping agency first, then geoBoundaries / OCHA COD-AB, then Natural Earth (never GADM); the
   source is always credited.
2. **Projection per nation** (`projectionFor()`): rotated to the nation's longitude; equal-area for shaded
   maps (Albers for wide mid-latitude, Lambert azimuthal for compact/island, transverse Mercator for tall);
   a national grid (EPSG) may override; insets for distant territories; Equal Earth for the world view.
3. **One engine, declarative pages:** `lib/map/{geography,projection,classify,layers}.ts` and
   `components/map/NationMap.tsx` with legend, scale bar, north arrow, attribution, as-of stamp and a table
   view added automatically. Layers: boundaries(level), choropleth(metric), places(kind), incidents,
   corridors, world(highlight, partners); every layer carries its Signal kind and source.
4. **Colour rules:** shaded only from observed or reported values (blank = "no observed value"); modelled
   values hatched and tagged; samples only in a hatched sample style; foreign states never coloured from
   samples; colours from tokens, colour-blind-safe ramps.
5. **Accessibility and phones:** a table of every map in official order; `role="img"` with a generated
   summary; units reachable by keyboard; details on focus; no decorative radar; on phones the map keeps the
   country's aspect ratio, legend and lists below, admin-2 after drilling in.
6. **Time:** as-of and known-at from the twin; boundary versions are bitemporal too.
7. **Budgets:** world ≤250 KB gz; admin-1 ≤300 KB gz (overview ≤150 KB); admin-2 on drill-down ≤1 MB gz (overview ≤512 KB); first render ≤200 ms
   on a mid-range phone; canvas above ~2,000 features.
8. **Authoritative boundaries:** a `boundary` twin source (GeoJSON/TopoJSON, GeoPackage or Shapefile
   converted on the server), validated (rings, CRS, codes, coverage, gaps/overlaps, never fewer units without
   confirmation), published four-eyes with `validFrom`, every version kept, credited. Facilities as
   `facility` entities with coordinates; incidents with a unit code or point.
9. **Disputed boundaries:** a Nation Pack worldview setting; disputed lines dashed with a neutral note; the
   publisher never chooses a side for the nation.
10. **OGC:** collections per level, facilities and boundary versions, so a GIS analyst and the minister see
    the same thing.

## The three screens

- **Foreign relations:** world map centred on the nation, the nation highlighted; declared partners coloured by
  relationship (reported, from the profile), lines capital to capital; membership highlights; neighbours and
  frontiers computed from shared borders (replacing the fixed "Northern frontier" list); table view.
- **Situation now:** the nation's own regions in their real shapes, drill-down to districts; indicator only
  where observed, otherwise neutral with "No regional readings connected yet"; ranked list of all units;
  real facilities only; capital from the Nation Pack; ministries move to the status matrix.
- **Security & public order:** incidents per region (or as points) with severity by shape and colour; border
  crossings; police areas when uploaded; working zoom and time window; table view; samples hatched and tagged.

## Phases

| Phase | Content | Size |
|---|---|---|
| 0 Truth fixes | focus by ISO code; rotate projections; GeoMap: no six-slot cycling, no fixed Uganda, sample marker, label; stop random colours on foreign states; tests | 2–3 days |
| 1 Engine core | `lib/map/*`, `components/map/*`; TwinTerritory rebuilt on it; tests (every official unit drawn and in the table, minimum size, keyboard order, colour rules, tokens) | 1–2 weeks |
| 2 Three screens + 12 TerritoryHeat callers | NationalMap and TerritoryHeat become wrappers (same exports, nothing lost); ThreatMap and geopolitical panel on presets; `map-no-hardcode.test.ts`; phone checks | 1–2 weeks |
| 3 Data pipeline | `build-map-pack.mjs` (TopoJSON per nation per level, world 1:50m, worldview); admin-2 from geoBoundaries/OCHA; Nation Pack capital, projection, insets; size budgets | 2–3 weeks |
| 4 Authoritative data in the twin | boundary sources with versions and four-eyes publish; the national facility register (4a core with ministry form and map pin, 4b upload and connected systems, 4c open-data candidates, 4d interoperability layer: `docs/FACILITY_REGISTER_REVIEW.md`); incident locations; OGC collections | 6–8 weeks |
| 5 Ministry maps and polish (done) | ~15 ministry maps and GeoMap on presets; maps in the accessibility audit; glossary | 2 weeks |

### Progress

- **Phase 0, done.** `WorldMap` focuses the nation by ISO code (`findCountryByIso3`);
  `GeoMap` has no fixed Uganda fallback, matches markers to provinces by name
  (no six-slot cycling) and carries the Sample marker; the Command Center mini
  map lost its invented dots and "LIVE" label.
- **Phase 1, done.** `lib/map/` (names, projection, geography, classify,
  model, world) and `components/map/` (`NationMap`, `WorldContext`,
  `useNeighbours`). Projection chosen per nation and rotated to it; the frame
  fits only the nation's own units; grouping units without shapes are merged
  from their official children (Uganda's regions, the UK's nations, France's
  regions); quantile classes on the `MAP_SEQUENTIAL` token ramp; non-observed
  figures hatched; map/table toggle; keyboard order; scale bar and north arrow.
  `TwinTerritory` is rebuilt on it.
- **Phase 2, done.** Situation Room `NationalMap` and `TerritoryHeat` keep
  their exports and controls (layers, full screen, activity banner, regional
  pressure list, operating strip) and draw every official region;
  `ThreatMap` on the engine with incidents by region; the geopolitical panel
  is `WorldContext` (the nation in the world, declared partners, neighbours by
  shared border) and frontier rows name the real neighbours. Checked in the
  browser for the USA (51), Kenya (47) and Uganda (4) at desktop and phone
  width; the twin map with recorded observations.
- **Phase 3, in part.** Drill-down: a map opens a region to the units beneath
  it ("Open a region" list or double-click; "Back to" the nation), from its
  official sub-units where the boundary data holds them (Uganda's districts,
  France's departments) or from district shapes (`lib/geo/admin2`, built by
  `scripts/build-map-pack.mjs` from geoBoundaries; shipped for KEN, UGA, NGA,
  GHA and USA, each ≤1 MB gzipped). The opened view shows the region's own
  figure and shades districts only from figures recorded for them (twin
  observations of district places). Capital: the nation's choice from setup,
  else the map data's default marked as such (Natural Earth, roles recorded,
  never choosing between several); partners joined capital to capital by great
  circles, dashed where the capital is the map data's default. Projection:
  the nation may choose it in setup. Budgets tested: first-level files
  ≤300 KB, district files ≤1 MB gzipped. TopoJSON packs and two detail
  levels, done: `scripts/build-topo.mjs` (`npm run build:topo`) turns the
  source files (`lib/geo/admin1`, `boundaries`, `outline`, `admin2`, still
  written by the other build scripts) into packs under `lib/geo/topo/` —
  shared arcs on the source's own coordinate grid, deterministic, with each
  source's SHA-256 so a test fails while a pack is stale. `full` keeps every
  vertex (lossless, tested); `overview` is simplified on the shared arcs
  (Visvalingam, a threshold relative to the country's land area, a coarser
  grid) so neighbours keep one border: no unit dropped, the same neighbours,
  no shape inside out (the build retries finer, ending at full detail, when a
  check fails); only detached specks (islets, lakes) go. Loaders decode with
  topojson-client into the same `Admin1Country` / `Admin2Country`, so callers
  are unchanged; `loadCountry(iso3, detail?)` and `loadNationGeography(…, detail?)`
  default to the overview, `loadUnitGeography`, `loadDistricts` and
  `loadAdmin2` to full. Position checks ask for full: `placePoint()`,
  incident places, boundary comparisons, the OGC collection and the police
  frontier (Mombasa, an island, lies in its county only at full detail).
  Budgets tested for both levels: first level full ≤300 KB, overview
  ≤150 KB; districts full ≤1 MB, overview ≤512 KB gzipped; overview in total
  ≤75% (regions) and ≤60% (districts) of full. Shipped today: first level
  1.93 MB gzipped at full and 1.23 MB overview, all countries together
  (source files 3.09 MB); districts 0.89 MB full and 0.37 MB overview
  (source 1.85 MB). A
  mapping authority's uploaded version is drawn as loaded (not simplified).
  District shapes for every other
  nation at install: an administrator installs them on the Boundaries page
  (`lib/data/map-pack.ts`, `/api/map-pack`) from geoBoundaries gbOpen (the
  server asks www.geoboundaries.org for the release and downloads its
  simplified GeoJSON from media.githubusercontent.com, nothing else) or, for
  offline and air-gapped installations, from the uploaded geoBoundaries file.
  The rules are the bundled files' own (`lib/geo/admin2-convert.mjs`, shared
  with `build-map-pack.mjs`): open licences only, never GADM; each district's
  region from the map; ISO 3166-2 codes kept, else `region:slug`. Source,
  licence, SHA-256, who and when are recorded and audited; removing them
  returns the maps to the bundled districts. Maps read them through
  `lib/map/districts-installed.ts`, one region at a time in the browser; a
  boundary version the mapping authority publishes still comes first.
  Large files are simplified on the server on shared borders before the districts are placed (register 16.17).
- **Phase 3, worldview, done.** Disputed territory is drawn neutral by
  default (hatched, dashed edge, named with who administers and who claims
  it; Natural Earth's 28 breakaway and disputed areas). The nation may choose
  a recorded point of view in setup (`SovereignProfile.map.worldview`; 31
  countries, the UN and the World Bank); the platform never chooses a side.
  World map, national maps, command theatre and police world map draw it
  (`lib/map/disputed.ts`, `components/map/DisputedLayer.tsx`).
- **Situation Room theatre.** The Situation Room map is a command theatre on
  the nation's real map (`components/features/situation/Theatre.tsx`, NationMap
  `variant="theatre"`): everything the earlier schematic theatre had is kept
  (tactical framing, radar sweep over the capital, scanline, grid, control
  stack, pressure diffusion and shock rings, readiness rings and status
  callouts, institutions as linked command nodes with knock-on links,
  cascades and incident chips, corridors with moving traffic, infrastructure,
  evacuation routes, population, pressure ladder, operating strip, layers,
  full screen) and the neighbouring countries are drawn and named around the
  nation. Regional pressure follows the earlier doctrine (institution strain,
  contention, regional rhythm, crisis memory). Corridors, infrastructure,
  evacuation routes and population are samples, marked in the legend, until
  phase 4 registers facilities and networks.
- **Phase 4a, done: the national facility register.** Sites recorded by
  their institutions with longitude/latitude by every capture method the
  nation accepts, checked against the map, published four-eyes, certified as
  the nation chose (institution, mapping agency, or both), sensitivity set by
  the body the nation names under a cited law; shown on the maps by their
  coordinates, in the Situation Room in place of samples of their kind, and as
  the OGC collection `facilities` (`docs/FACILITY_REGISTER_REVIEW.md`).
- **Phases 4b–4d, done.** Connected ministry systems send their sites with
  their own key (published and moved only by officials; read-back of what
  officials did); open datasets suggest sites that officials record, link or
  reject (licence recorded, share-alike flagged); interoperability on the
  map from records only — agreed exchanges (approved grants and
  integrations), live exchanges with their health, regions shaded by the
  share of sites reporting — in Sites ("Who is connected") and in the
  Situation Room between registered offices, with each command node tethered
  to its institution's office once registered.
- **Phase 4, incident locations, done.** An institution places its incident
  in a region, at a point (map pin, device location, typed coordinates;
  region and district from the map, the same check as registered sites) or
  at a published registered site (restricted sites generalised). Named
  official, audited, history kept (`lib/data/incident-places.ts`). The
  Situation Room draws placed incidents where they are, severity by shape
  (diamond, triangle, square, circle) and colour, a pulse for the gravest, a
  tether to the reporting institution, linked to its Incidents tab.
- **Phase 4, boundary versions, done.** The mapping authority loads its own
  regions or districts (GeoJSON, TopoJSON, a zipped Shapefile or a
  GeoPackage) at `/gov/sites/boundaries`; Shapefiles and GeoPackages are
  read on the server in plain JavaScript and reprojected to WGS 84 from
  their .prj or spatial reference (UTM, national grids; unreadable systems
  refused by name), names in the .cpg encoding; files over 200,000 points
  or 5 MB are simplified on a shared topology (borders stay shared, no unit
  dropped; points before/after and tolerance recorded,
  `lib/geo/boundary-files.ts`, `lib/geo/boundary-simplify.ts`); the server
  checks CRS, rings and winding, codes against ISO 3166-2,
  districts' regions from the map, coverage, overlaps and fewer units; a
  different official publishes; versions kept with SHA-256 and a date in
  force (bitemporal: in force on a date, as known now or as known then).
  The version in force replaces the bundled shapes on every map and in the
  position checks, credited, and is the OGC collection `boundaries`
  (`lib/data/boundaries.ts`, `lib/map/boundary-active.ts`). Open: the
  full-detail shapes beside a simplified version (two detail levels).
- **Phase 5, done: the ministry maps.** All 30 map panels of the ministry
  apps draw the installed nation's real regions (19 had invented
  geography: dot grids, hex grids, seeded positions, a schematic city; 11
  health maps had real shapes but six-slot figures). Shared pieces:
  `components/map/MinistryMap.tsx` (the preset), `apps/police-command/
  CommandMap.tsx` (command theatre on the preset) and `WorldThreatMap.tsx`
  (world view centred on the nation; foreign states never shaded),
  `apps/ministry-interior/domains/RegionMaps.tsx`, `apps/_shared/
  CityDistrictMap.tsx` (the capital's real districts), `apps/_shared/GeoMap.tsx`
  (health, real corridors and layers). Controls that did nothing now work
  (zoom, pan, fit, full screen, layers, region and border selects, the 3D
  view, the disease map's layers and time windows). Registered sites from
  the facility register replace the samples of their kind. The public
  sites' "find us" maps show each ministry's published sites. The engine
  gained zoom, header placement, a slot under the map and small notes.
- **Known data gaps** (phase 3): Kiribati's boundary data has unreadable unit
  names; France's overseas collectivities have no shapes (listed as
  "no shape" under the map, never invented). Infrastructure and corridor
  layers wait for registered facilities (phase 4).
