// Machine read keys for GIS clients (architecture review I2). QGIS, ArcGIS
// and GDAL cannot hold the official's session cookie; they send a header. An
// integration registered in Integrations (/integrations) with the scope
// `ogc:read`, approved by an administrator, gets a key (civ_…) that is kept
// only as its SHA-256 hash (lib/data/store.ts verifyIntegrationKey). With
// `Authorization: Bearer civ_…` the twin's read services open to it:
// OGC API – Features (/api/twin/ogc/*), SensorThings (/api/twin/sta/*) and
// the vector tiles (/api/twin/tiles/*). These paths are in BEARER_READS
// (lib/auth/roles.ts), so the middleware lets a request with the header
// through to the route, and the route checks the key here: a missing,
// unknown, unapproved or out-of-scope key is refused (401/403), and the
// integration's rate limit applies (429). A key reader is not an official:
// restricted sites reach it generalised, as they reach the public.
//
// How clients send the key:
//  - QGIS: Settings › Options › Authentication › add an "API Header"
//    configuration with header `Authorization` and value `Bearer civ_…`,
//    then pick it in the OGC API – Features (WFS / OGC API) connection.
//  - GDAL / ogr2ogr: GDAL_HTTP_HEADERS="Authorization: Bearer civ_…"
//    ogrinfo OAPIF:https://<host>/api/twin/ogc
//  - ArcGIS Pro: add the OGC API server connection with a custom request
//    header `Authorization: Bearer civ_…`; ArcGIS Enterprise: register the
//    service with the header in its stored credentials.
// Keys never travel in the address (no ?api_key=), so they stay out of logs.
//
// OAuth2 client credentials (RFC 6749 §4.4): clients that expect OAuth (ArcGIS
// Enterprise, FME, most OAuth libraries) exchange the key at POST
// /api/oauth/token (client_id = the integration's id, client_secret = the
// key, grant_type=client_credentials, scope=ogc:read) for an access token
// signed by the key custody provider (lib/auth/client-credentials.ts), and
// send `Authorization: Bearer <token>` instead. A token carries at most the
// key's scopes, lives ten minutes and stops working when the key is rotated
// or the integration suspended.

import { NextResponse } from 'next/server';
import { verifyIntegrationKey } from '@/lib/data/store';
import { looksLikeToken, verifyAccessToken } from '@/lib/auth/client-credentials';

/** The scope an integration needs to read the twin's OGC, SensorThings and tile services. */
export const OGC_READ_SCOPE = 'ogc:read';

/**
 * The refusal for a request that carries a key or access token the twin does
 * not accept, or null to answer it. A request without an Authorization header
 * is the official's own (the middleware has already applied the session gate).
 */
export async function machineReadRefusal(req: { headers: Headers }): Promise<NextResponse | null> {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const bearer = auth.replace(/^Bearer\s+/i, '').trim();
  const token = /^Bearer\s/i.test(auth) && looksLikeToken(bearer);
  const r = token ? await verifyAccessToken(auth, OGC_READ_SCOPE) : verifyIntegrationKey(auth, OGC_READ_SCOPE);
  if (r.ok) return null;
  const res = NextResponse.json({ code: r.status === 429 ? 'TooManyRequests' : 'Unauthorized', description: r.error, error: r.error }, { status: r.status });
  if (r.status === 401) res.headers.set('WWW-Authenticate', `Bearer realm="civicos-twin", scope="${OGC_READ_SCOPE}"${token ? ', error="invalid_token"' : ''}`);
  if (r.retryAfterSeconds) res.headers.set('Retry-After', String(r.retryAfterSeconds));
  return res;
}
