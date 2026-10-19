import { describe, it, expect, afterEach } from 'vitest';
import { normaliseDomain, identifierExample } from './domain';
import { PUT, GET } from '@/app/api/sovereign/route';
import { getSovereign } from '@/lib/data/store';
import { resetTwin, syncRegister, getEntity, uriBase, PLACEHOLDER_URI_BASE } from '@/lib/twin/register';
import { applyNation } from '@/lib/nation/registry';

const put = (b: unknown) => PUT(new Request('http://x', { method: 'PUT', body: JSON.stringify(b) }) as never);

describe('the nation\'s web domain', () => {
  afterEach(() => { delete getSovereign().domain; });

  it('normalises what officials paste and refuses what cannot be a public domain', () => {
    expect(normaliseDomain('https://Data.Gov.KE/')).toEqual({ domain: 'data.gov.ke' });
    expect(normaliseDomain(' data.gov.ke. ')).toEqual({ domain: 'data.gov.ke' });
    expect(normaliseDomain('')).toEqual({ domain: '' });
    expect(normaliseDomain(undefined)).toEqual({ domain: '' });
    expect(normaliseDomain('münchen.de')).toEqual({ domain: 'xn--mnchen-3ya.de' });
    expect(normaliseDomain('data.gov.ke/id')).toEqual({ error: expect.stringMatching(/without a path/) });
    expect(normaliseDomain('data.gov.ke:8443')).toEqual({ error: expect.stringMatching(/port/) });
    expect(normaliseDomain('10.0.0.1')).toEqual({ error: expect.stringMatching(/IP address/) });
    expect(normaliseDomain('intranet')).toEqual({ error: expect.stringMatching(/top-level/) });
    expect(normaliseDomain('twin.invalid')).toEqual({ error: expect.stringMatching(/never resolves/) });
    expect(normaliseDomain('-bad.gov.ke')).toEqual({ error: expect.stringMatching(/hyphens/) });
    expect(normaliseDomain(42)).toEqual({ error: expect.any(String) });
    expect(identifierExample('data.gov.ke', 'KEN')).toBe('https://data.gov.ke/id/nation/KEN');
  });

  it('is saved through /api/sovereign (normalised, or refused with the reason) and feeds the twin\'s identifiers', async () => {
    expect((await put({ domain: 'not a domain' })).status).toBe(422);
    const res = await put({ domain: 'https://Data.Gov.KE/' });
    expect(res.status).toBe(200);
    expect((await GET().json()).sovereign.domain).toBe('data.gov.ke');
    expect(uriBase()).toBe('https://data.gov.ke');
    resetTwin();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa'] });
    await syncRegister();
    expect(getEntity('place:KE-28')?.uri).toBe('https://data.gov.ke/id/place/KE-28');
    // Clearing it goes back to the placeholder (CIVICOS_PUBLIC_URL unset).
    const env = process.env.CIVICOS_PUBLIC_URL;
    delete process.env.CIVICOS_PUBLIC_URL;
    expect((await put({ domain: '' })).status).toBe(200);
    expect(getSovereign().domain).toBeUndefined();
    expect(uriBase()).toBe(PLACEHOLDER_URI_BASE);
    if (env !== undefined) process.env.CIVICOS_PUBLIC_URL = env;
  });
});
