// What a public site's "find us" locator shows (locator-data.ts builds it on
// the server, LocatorPanel draws it): the institution's own published sites
// from the national facility register, as the public may see them, on the
// nation's real outline. Nothing here is typed into a site's content record.

export interface LocatorSite {
  id: string;
  name: string;
  /** Region and district as the register worked them out from the map. */
  region?: string;
  district?: string;
  /** Register category key and its label (e.g. 'health', "Health facility"). */
  category: string;
  categoryLabel: string;
  status: string;
  /** Restricted sites reach the public generalised (approximate position). */
  approx: boolean;
  lat: number;
  lng: number;
  /** Position on the locator map's frame. */
  x: number;
  y: number;
}

export interface LocatorMap {
  w: number;
  h: number;
  /** The nation's outline, drawn region by region when `regions` is set (the detailed shapes were at hand). */
  land: string;
  regions?: boolean;
  capital?: { x: number; y: number; name: string };
  country: string;
  credit: string;
  /** The map's Mercator fit (scale and translate of d3's geoMercator), so the browser can place more sites on it. */
  mercator?: { k: number; tx: number; ty: number };
}

export interface SiteLocations {
  /** Whether the site belongs to an institution in the registry (its sites can be registered). */
  institution: boolean;
  sites: LocatorSite[];
  /** Published sites in all (the list carries at most a few hundred; the rest are read from the public tile archive on request). */
  total: number;
  /** The institution's registry id, to pick its sites out of the public tile archive. */
  institutionId?: string;
  /** Per locator tab, the register categories it stands for (null: the tab does not map to one). */
  tabCategories: (string[] | null)[];
  map: LocatorMap | null;
}
