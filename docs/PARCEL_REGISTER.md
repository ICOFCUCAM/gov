# Land parcel register (cadastre)

Status: built (October 2026): `lib/data/parcels.ts`, `/api/parcels`,
`/gov/sites/parcels`, OGC collection `parcels`, parcel vector tiles
`/api/twin/tiles/parcels/{z}/{x}/{y}.mvt`. Closes the last open item of
review G4 (`docs/ARCHITECTURE_REVIEW_DIGITAL_TWIN.md` §6, "parcel tile
layers"). Register: `docs/INTEGRATION_REGISTER.md` 16.25.

## Design

### What it is modelled on

The register is a sibling of the national facility register
(`lib/data/facilities.ts`, `docs/FACILITY_REGISTER_REVIEW.md`) and of the
boundary versions (`lib/data/boundaries.ts`): one institution records, a
different official publishes, every version is kept, withdrawal needs a
reason, and every step is on the audit chain. Positions are checked against
the map the way every other register checks them (`placePoint()`, which
reads the boundary version in force through `loadNationGeography()` /
`loadDistricts()`), and region and district are derived, never typed.

The words follow three bodies of practice:

- **LADM, ISO 19152 (Land Administration Domain Model).** A parcel record is
  an `LA_SpatialUnit` (the polygon, its area and how it was surveyed:
  `LA_SpatialSource`), held as one `LA_BAUnit` (basic administrative unit: the
  national parcel id) with its `LA_RRR` — rights, restrictions and
  responsibilities — each with a party (`LA_Party`: the holder and the kind
  of holder), a share and the administrative source it rests on
  (`LA_AdministrativeSource`: title, survey plan, lease, court order,
  adjudication or customary record). The platform keeps LADM's split: the
  spatial unit is public, the parties and their rights are personal data.
- **Fit-for-purpose land administration (FIG / World Bank 2014, UN-Habitat /
  GLTN 2016).** Coverage first, accuracy improved over time: general
  boundaries digitised from imagery or walked with the community are
  accepted beside surveyed fixed boundaries, each with its method and
  stated accuracy, so a nation can start with what it has. Customary and
  occupancy rights are first-class rights, not exceptions. Gaps between
  parcels are therefore **not** checked (an incomplete cadastre is the
  normal state of a fit-for-purpose one); overlaps are, because two
  published claims on the same ground are a dispute.
- **INSPIRE Cadastral Parcels (Annex I theme CP).** The public view is what
  INSPIRE publishes for a parcel: its national cadastral reference
  (`nationalCadastralReference`), its geometry, its area (`areaValue`,
  computed) and the administrative unit it lies in; no owners. The
  OGC collection and the tiles carry exactly that, plus land use (HILUCS-
  style top level) and survey method and accuracy.

### Who acts

- The nation's **parcel policy** names the **cadastre authority** (an
  institution from the registry), the national parcel id format (an
  anchored regular expression with an example), the overlap rule (refuse or
  flag) and its tolerance in square metres, and the survey methods it
  accepts. An administrator proposes a change, a different administrator
  confirms it (four-eyes, never over a newer policy), audited
  (`/api/parcels/policy`, `ADMIN_ONLY` in `lib/auth/roles.ts`).
- **Record:** an official of the cadastre authority (any role but auditor),
  or a whole-government administrator (`canRecordParcel()`).
- **Publish, amend-confirm, withdraw:** an official who can sign at the
  cadastre authority, or a whole-government administrator
  (`canCertifyParcel()`); publishing and confirming an amendment must be a
  different official from the one who recorded or proposed it.
- **See rights and holders:** the cadastre authority's own officials (every
  role, auditors included), and whole-government administrators and
  auditors (`canSeeParcelRights()`). Nobody else, and nobody without a
  verified session: in the demo mode without sign-in, rights are never
  shown.

### A parcel

- `parcelId`: the national parcel id, checked against the policy's format,
  unique among parcels not withdrawn. `PCL-000001` is the platform's own
  record number.
- `geometry`: GeoJSON Polygon or MultiPolygon in longitude/latitude, stored
  as a MultiPolygon wound as RFC 7946 asks (exterior anticlockwise). Each
  ring closed (first point repeated last), at least four points, finite and
  in range, not crossing itself (`kinksOf()`), holes inside their exterior,
  parts not overlapping each other; at most 5,000 points and 100 km².
- `areaM2`: computed on the ellipsoid's sphere (spherical excess, as GIS
  tools do), never typed; a typed area is refused.
- `survey`: method (field survey, survey-grade GNSS, digitised from imagery,
  general boundary walked with the community, handheld GPS, digitised from a
  scanned map, existing cadastral data), stated accuracy in metres (the
  method's typical one by default), when, by whom, the survey plan
  reference, and for a file in a national grid the system and the exact
  transformation (`lib/geo/crs.ts`).
- `place`: region and district of an interior point of the parcel (not the
  centroid, which can fall outside a crescent-shaped parcel), from the
  boundary version in force. A parcel whose interior point is outside the
  nation is refused. A parcel whose corners lie in another district is
  flagged.
- `landUse`: residential, agricultural, commercial, industrial, public
  service, transport, conservation, water, mixed, vacant, other.
- `rights` (LADM RRR): kind (right, restriction, responsibility), type
  (ownership, customary, leasehold, occupancy, usufruct, easement, mortgage,
  caveat, use restriction, maintenance), holder kind (person, group,
  organisation, state, community, unknown), holder name and optional holder
  reference, share as a fraction (`1/2`; shares of ownership-type rights may
  not add up to more than one), and the source document (kind, reference,
  date).

### Checks

- Format, geometry and area as above; outside the nation refused.
- **Overlap with published parcels** (spatial index on bounding boxes, then
  the overlap area estimated on a raster of at most 250,000 cells over the
  two parcels' common box, `rasterise()` from `lib/geo/topology.ts`; cell
  size reported). Above the policy's tolerance the record is refused
  (`overlap: refuse`, the default) or kept with the overlap flagged
  (`flag`). Checked again at publication, since another parcel may have
  been published meanwhile. Adjacent parcels sharing an edge overlap by
  zero.
- Gaps are not checked (see fit-for-purpose above).

### Lifecycle

`proposed` → `published` → (`withdrawn`). An amendment (new geometry, land
use, survey or rights) to a published parcel waits as a pending version
until a different official confirms it; the checks run again on it. Every
change is a new version; versions keep geometry and rights (rights shown
only to viewers with need). Withdrawal needs a reason. The audit chain
carries the parcel id, record number, area, land use and the action; never
a holder's name or reference.

### Bulk loads

`POST /api/parcels/import`: GeoJSON, a zipped Shapefile or a GeoPackage,
read by the boundary file reader (`lib/geo/boundary-files.ts`: `.prj` and
GeoPackage spatial references reprojected; encodings from `.cpg`); GeoJSON
in a national grid declares it by EPSG code (or its `crs` member) and is
converted with `lib/geo/crs.ts`; coordinates in metres without a declared
system are refused. Columns: the parcel id (`parcel_id`, `parcelid`,
`upi`, `pin`, `lr_no`, `id`, or the one named), land use, accuracy,
survey plan reference, and optional rights columns (`holder`,
`holder_kind`, `right`, `share`, `document`). Every row is checked like a
form; refusals come with reasons; a dry run records nothing; the load is
audited with the file's SHA-256 and the counts (never row contents), and is
withdrawable as a whole (every parcel it recorded and not yet withdrawn,
with the reason).

### Storage

A `__civicos` store (`__civicosParcels`) through the persistence port
(`parcelRepo` in `lib/data/repo`): in memory by default; under
`CIVICOS_STATE=postgres` every parcel is written through to
`civicos.parcel` (migration `20261023000000_civicos_parcels.sql`) with its
bounding box columns (btree), and where PostGIS is present a generated
`geometry(MultiPolygon, 4326)` column (made valid, the validity as loaded
kept) with a GiST index. Policy, its changes and loads are per-record
documents. Owner in `lib/data/register-owners.ts`.

### Publication

Only published parcels, only public fields (`publicParcel()`):

- `GET /api/parcels` (paged, search by parcel id, record number, region or
  district; never rights);
- OGC API – Features collection `parcels` beside `subdivisions`,
  `facilities` and `boundaries` (bbox through the spatial index,
  queryables `parcelId`, `landUse`, `regionCode`, `districtCode`,
  `surveyMethod`);
- vector tiles `/api/twin/tiles/parcels/{z}/{x}/{y}.mvt` and TileJSON
  `/api/twin/tiles/parcels`: layer `parcels` from zoom 13 (below it a parcel
  is under a pixel), at most 20,000 parcels a tile (`x-truncated`),
  simplified per zoom on one topology (`lib/geo/tile-topology.ts`) per block
  of zoom-13 tiles so neighbours share their simplified edges; the same
  reading rules as the other twin tiles (session, or an `ogc:read`
  integration key or token).

A test scans every one of these outputs for holder fields and names
(`parcels-privacy.test.ts`).

### Not done here, and why

- **Parcels are not twin entities.** The twin's entity kinds are nation,
  place, institution and facility, and observations are figures over time;
  a parcel has no observations of its own and 10⁶–10⁷ entities would swamp
  the twin's entity table and crosswalk. Parcels reach the twin's readers
  through the OGC collection and the tiles instead.
- Mutation of rights was an amendment of the parcel until plan step I7.
  Since then rights on a published parcel change only through the land
  registry's decided cases (`lib/land/procedures.ts`: transfer, encumbrance,
  discharge, correction, dispute) by `applyRightsChange()`: each right has a
  reference and, for a mortgage, a rank; each change is a new version with
  its case, decision and effective date (LADM's `LA_RRR` history is still the
  version list, now with the transaction beside it in `lib/land/register.ts`).
  A dispute holds the interest or the boundary until a decision, a recorded
  court order or a withdrawal (`freezeInterest()`); an amendment of a
  published parcel cannot change rights. Title extracts, valuation and a
  `land.title` exchange service are not built (integration register 21.63,
  21.64).
- No public (signed-out) view: the register is behind the session like the
  rest of the twin; a nation that wants a public parcel map can serve the
  tiles through an `ogc:read` key.
