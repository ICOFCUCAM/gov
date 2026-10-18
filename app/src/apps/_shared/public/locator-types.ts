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
  /** The nation's outline (and its regions, when the detailed shapes are at hand). */
  land: string;
  regions?: string;
  capital?: { x: number; y: number; name: string };
  country: string;
  credit: string;
}

export interface SiteLocations {
  /** Whether the site belongs to an institution in the registry (its sites can be registered). */
  institution: boolean;
  sites: LocatorSite[];
  /** Published sites in all (the list carries at most a few hundred). */
  total: number;
  /** Per locator tab, the register categories it stands for (null: the tab does not map to one). */
  tabCategories: (string[] | null)[];
  map: LocatorMap | null;
}
