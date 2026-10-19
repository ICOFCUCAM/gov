import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { resetTwin, syncRegister, getEntity, listEntities, uriBase, PLACEHOLDER_URI_BASE } from './register';
import { twinDb } from './db';
import { applyNation } from '@/lib/nation/registry';
import { getSovereign } from '@/lib/data/store';
import { GET as resolve } from '@/app/id/[kind]/[code]/route';
import { GET as about } from '@/app/id/[kind]/[code]/about/route';
import { resetFacilities, proposeFacility, actOnFacility } from '@/lib/data/facilities';
import { listMinistries } from '@/lib/data/store';

describe('persistent entity URIs', () => {
  const env = process.env.CIVICOS_PUBLIC_URL;
  beforeEach(async () => {
    delete process.env.CIVICOS_PUBLIC_URL;
    delete getSovereign().domain;
    resetTwin();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
  });
  afterEach(() => { if (env === undefined) delete process.env.CIVICOS_PUBLIC_URL; else process.env.CIVICOS_PUBLIC_URL = env; delete getSovereign().domain; });

  it('mints every entity a URI, under a placeholder until the nation\'s domain is known', () => {
    expect(uriBase()).toBe(PLACEHOLDER_URI_BASE);
    expect(getEntity('place:KE-30')?.uri).toBe('https://twin.invalid/id/place/KE-30');
    expect(listEntities().every(e => e.uri?.startsWith('https://twin.invalid/id/'))).toBe(true);
  });

  it('uses the nation\'s domain from the profile, then CIVICOS_PUBLIC_URL, and keeps a real URI once given', async () => {
    process.env.CIVICOS_PUBLIC_URL = 'https://civicos.example.go.ke/';
    await syncRegister();
    expect(getEntity('nation:KEN')?.uri).toBe('https://civicos.example.go.ke/id/nation/KEN');
    getSovereign().domain = 'data.go.ke';
    expect(uriBase()).toBe('https://data.go.ke');
    await syncRegister();
    // Minted under a real address: it never changes.
    expect(getEntity('nation:KEN')?.uri).toBe('https://civicos.example.go.ke/id/nation/KEN');
  });

  it('gives entities from snapshots saved before URIs their URI on read', () => {
    delete twinDb().entities['place:KE-28']!.uri;
    expect(getEntity('place:KE-28')?.uri).toBe('https://twin.invalid/id/place/KE-28');
  });

  it('resolves /id/<kind>/<code> for an official with 303 to the page, or to the JSON for machines', async () => {
    const ctx = { params: Promise.resolve({ kind: 'place', code: 'KE-30' }) };
    // The console's session (sign-in not enforced) counts as an official's, as the gate lets it through.
    const cookie = 'civicos_session=demo';
    const page = await resolve(new NextRequest('https://p.example/id/place/KE-30', { headers: { accept: 'text/html,*/*', cookie } }), ctx);
    expect(page.status).toBe(303);
    expect(page.headers.get('location')).toBe('https://p.example/gov/twin?entity=place%3AKE-30');
    const json = await resolve(new NextRequest('https://p.example/id/place/KE-30', { headers: { accept: 'application/ld+json', cookie } }), ctx);
    expect(json.headers.get('location')).toBe('https://p.example/api/twin/entities/place%3AKE-30');
    expect((await resolve(new NextRequest('https://p.example/id/place/XX-1'), { params: Promise.resolve({ kind: 'place', code: 'XX-1' }) })).status).toBe(404);
    expect((await resolve(new NextRequest('https://p.example/id/planet/earth'), { params: Promise.resolve({ kind: 'planet', code: 'earth' }) })).status).toBe(404);
  });
});

describe('public resolution of entity URIs (D6)', () => {
  const auth = process.env.CIVICOS_AUTH;
  beforeEach(async () => {
    process.env.CIVICOS_AUTH = 'enforce';
    resetTwin();
    resetFacilities();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
  });
  afterEach(() => { if (auth === undefined) delete process.env.CIVICOS_AUTH; else process.env.CIVICOS_AUTH = auth; });
  const ctx = (kind: string, code: string) => ({ params: Promise.resolve({ kind, code }) });
  const anon = (path: string, accept = 'text/html') => new NextRequest(`https://p.example${path}`, { headers: { accept, cookie: 'civicos_session=demo' } });

  it('sends the public to the entity\'s public description, as JSON-LD or a plain page', async () => {
    const r = await resolve(anon('/id/place/KE-30'), ctx('place', 'KE-30'));
    expect(r.status).toBe(303);
    expect(r.headers.get('location')).toBe('https://p.example/id/place/KE-30/about');
    const doc = await (await about(anon('/id/place/KE-30/about', 'application/ld+json'), ctx('place', 'KE-30'))).json();
    expect(doc).toMatchObject({ '@id': 'https://twin.invalid/id/place/KE-30', '@type': 'schema:AdministrativeArea', 'schema:name': 'Nairobi City', 'schema:identifier': 'KE-30', 'schema:containedInPlace': { '@id': 'https://twin.invalid/id/nation/KEN' } });
    // No observations, no cross-system ids.
    expect(Object.keys(doc)).not.toContain('observations');
    const page = await about(anon('/id/place/KE-30/about'), ctx('place', 'KE-30'));
    expect(page.headers.get('content-type')).toMatch(/text\/html/);
    const html = await page.text();
    expect(html).toContain('<h1>Nairobi City</h1>');
    expect(html).not.toMatch(/<script|https?:\/\/(?!twin\.invalid)/);
    expect((await resolve(anon('/id/place/XX-1'), ctx('place', 'XX-1'))).status).toBe(404);
  });

  it('resolves a published site of a public category, and refuses restricted and unpublished ones', async () => {
    const [health, energy] = listMinistries();
    const site = async (ministry: string, name: string, category: string, lng: number, lat: number) => {
      const r = await proposeFacility(ministry, { name, category, lng, lat }, 'Officer A');
      if ('error' in r) throw new Error(r.error);
      return r.facility.id;
    };
    const clinic = await site(health!.id, 'Clinic', 'health', 36.81724, -1.28638);
    const power = await site(energy!.id, 'Substation', 'power', 39.66, -4.05);
    const draft = await site(health!.id, 'Draft clinic', 'health', 34.76, -0.09);
    for (const id of [clinic, power]) await actOnFacility(id, { action: 'publish' }, 'Signer B');
    await syncRegister();
    const ok = await resolve(anon(`/id/facility/${clinic}`), ctx('facility', clinic));
    expect(ok.status).toBe(303);
    const doc = await (await about(anon(`/id/facility/${clinic}/about`, 'application/json'), ctx('facility', clinic))).json();
    expect(doc).toMatchObject({ '@type': 'schema:Place', 'schema:name': 'Clinic', 'schema:geo': { 'schema:latitude': -1.28638, 'schema:longitude': 36.81724 } });
    // Restricted (power is restricted by default): refused for the public, at the URI and at its description.
    const refused = await resolve(anon(`/id/facility/${power}`), ctx('facility', power));
    expect(refused.status).toBe(403);
    expect((await about(anon(`/id/facility/${power}/about`), ctx('facility', power))).status).toBe(403);
    expect((await resolve(anon(`/id/facility/${draft}`), ctx('facility', draft))).status).toBe(404);
  }, 120_000);
});
