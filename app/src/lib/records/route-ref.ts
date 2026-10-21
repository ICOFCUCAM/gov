// The request a route handler is answering, as the middleware forwards it
// (`x-civicos-route: METHOD /path`, set on every request, replacing anything
// a caller sent). Used only to name what a refused request asked for in the
// access log (lib/records/refusal-log.ts). Edge-safe: no imports.

export const ROUTE_HEADER = 'x-civicos-route';

/**
 * The method of the change the middleware asks GET /api/auth/official about
 * (beside lib/data/persist.ts CHANGE_PATH_HEADER), so the platform writes the
 * middleware's own refusal of it to the access log: the edge cannot.
 */
export const CHANGE_METHOD_HEADER = 'x-civicos-change-method';

/** The header's value for a request: its method and path, never the query string. */
export const routeRef = (method: string, pathname: string): string => `${method.toUpperCase()} ${pathname}`.slice(0, 200);
