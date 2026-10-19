import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { resetTwin, syncRegister, getEntity, listEntities, uriBase, PLACEHOLDER_URI_BASE } from './register';
import { twinDb } from './db';
import { applyNation } from '@/lib/nation/registry';
import { getSovereign } from '@/lib/data/store';
import { GET as resolve } from '@/app/id/[kind]/[code]/route';

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

  it('resolves /id/<kind>/<code> with 303 to the page, or to the JSON for machines', async () => {
    const ctx = { params: Promise.resolve({ kind: 'place', code: 'KE-30' }) };
    const page = await resolve(new NextRequest('https://p.example/id/place/KE-30', { headers: { accept: 'text/html,*/*' } }), ctx);
    expect(page.status).toBe(303);
    expect(page.headers.get('location')).toBe('https://p.example/gov/twin?entity=place%3AKE-30');
    const json = await resolve(new NextRequest('https://p.example/id/place/KE-30', { headers: { accept: 'application/ld+json' } }), ctx);
    expect(json.headers.get('location')).toBe('https://p.example/api/twin/entities/place%3AKE-30');
    expect((await resolve(new NextRequest('https://p.example/id/place/XX-1'), { params: Promise.resolve({ kind: 'place', code: 'XX-1' }) })).status).toBe(404);
    expect((await resolve(new NextRequest('https://p.example/id/planet/earth'), { params: Promise.resolve({ kind: 'planet', code: 'earth' }) })).status).toBe(404);
  });
});
