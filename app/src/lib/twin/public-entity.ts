// Public resolution of the twin's persistent identifiers (architecture
// review D6). An entity URI (https://<nation domain>/id/<kind>/<code>) is
// published in the catalogue, in NGSI-LD and PROV documents and on other
// installations' records, so it must resolve for anyone, not only for
// officials. Without a session, /id/<kind>/<code> answers 303 to its public
// description, /id/<kind>/<code>/about: the entity's name, kind, code, the
// place it lies in and, for a published site of the facility register whose
// category is public, its position and category. Nothing else: no
// observations, no cross-system ids, no version history.
//
// Restricted things stay refused: a site whose category is restricted or
// confidential (lib/data/facilities.ts sensitivity, set by the nation's
// policy) answers 403 to the public, and a site that is not published 404.
// Officials keep the full answer (/api/twin/entities/<id>, /gov/twin).

import { getEntity, entityIdFor, syncRegister, type EntityKind, type TwinEntity } from './register';
import { getFacility, categoryOf } from '@/lib/data/facilities';

export const ENTITY_KINDS: readonly EntityKind[] = ['nation', 'place', 'institution', 'facility'];

const SCHEMA_TYPE: Record<EntityKind, string> = {
  nation: 'schema:Country',
  place: 'schema:AdministrativeArea',
  institution: 'schema:GovernmentOrganization',
  facility: 'schema:Place',
};

export interface PublicEntityDoc {
  '@context': Record<string, string>;
  '@id': string;
  '@type': string;
  'schema:name': string;
  'schema:identifier'?: string;
  kind: EntityKind;
  'schema:containedInPlace'?: { '@id': string; 'schema:name': string };
  'schema:geo'?: { '@type': 'schema:GeoCoordinates'; 'schema:latitude': number; 'schema:longitude': number };
  'schema:additionalType'?: string;
}

export type PublicEntity = { ok: true; entity: TwinEntity; doc: PublicEntityDoc } | { ok: false; status: 403 | 404; error: string };

/** A facility entity's site as the public may know it: published and of a public category, else the refusal. */
function facilityRefusal(code: string): { status: 403 | 404; error: string } | null {
  const f = getFacility(code);
  if (!f || f.state !== 'published') return { status: 404, error: 'No such entity' };
  if (f.sensitivity !== 'public') return { status: 403, error: 'This identifier names a restricted site: sign in as an official to resolve it (/sign-in)' };
  return null;
}

/** Whether the entity an identifier names may be resolved for the public, and its public description when it may. */
export async function publicEntity(kind: string, code: string): Promise<PublicEntity> {
  if (!(ENTITY_KINDS as readonly string[]).includes(kind)) return { ok: false, status: 404, error: 'No such kind of entity' };
  await syncRegister();
  const e = getEntity(entityIdFor(kind, code));
  if (!e) return { ok: false, status: 404, error: 'No such entity' };
  if (e.kind === 'facility') { const r = facilityRefusal(e.code ?? code); if (r) return { ok: false, ...r }; }
  const parent = e.parent ? getEntity(e.parent) : undefined;
  const f = e.kind === 'facility' ? getFacility(e.code ?? code) : undefined;
  const doc: PublicEntityDoc = {
    '@context': { schema: 'https://schema.org/' },
    '@id': e.uri ?? '',
    '@type': SCHEMA_TYPE[e.kind],
    'schema:name': e.name,
    ...(e.code ? { 'schema:identifier': e.code } : {}),
    kind: e.kind,
    ...(parent ? { 'schema:containedInPlace': { '@id': parent.uri ?? '', 'schema:name': parent.name } } : {}),
    ...(f ? { 'schema:geo': { '@type': 'schema:GeoCoordinates', 'schema:latitude': f.location.lat, 'schema:longitude': f.location.lng }, 'schema:additionalType': categoryOf(f.category)?.label ?? f.category } : {}),
  };
  return { ok: true, entity: e, doc };
}

const esc = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** The public description as a plain HTML page for browsers (no scripts, no outside resources). */
export function publicEntityHtml(doc: PublicEntityDoc, lang = 'en'): string {
  const rows: [string, string][] = [
    ['Kind', doc.kind],
    ...(doc['schema:identifier'] ? [['Code', esc(doc['schema:identifier'])] as [string, string]] : []),
    ...(doc['schema:containedInPlace'] ? [['Within', `<a href="${esc(doc['schema:containedInPlace']['@id'])}">${esc(doc['schema:containedInPlace']['schema:name'])}</a>`] as [string, string]] : []),
    ...(doc['schema:additionalType'] ? [['Category', esc(doc['schema:additionalType'])] as [string, string]] : []),
    ...(doc['schema:geo'] ? [['Position', `${doc['schema:geo']['schema:latitude']}, ${doc['schema:geo']['schema:longitude']}`] as [string, string]] : []),
    ['Identifier', esc(doc['@id'])],
  ];
  return `<!doctype html><html lang="${esc(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(doc['schema:name'])}</title></head><body><main id="main"><h1>${esc(doc['schema:name'])}</h1><dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl><p><a href="?format=jsonld">JSON-LD</a></p></main></body></html>`;
}
