import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { resetProfessions, registerProfessional, defineProfession } from '@/lib/professions/register';
import { resetRateLimits } from '@/lib/ops/rate-limit';
import { resetRegisterWatch, HARVEST } from '@/lib/professions/watch';
import { listAudit } from '@/lib/data/store/audit';

const get = (qs: string, ip = '203.0.113.7') => GET(new NextRequest(`http://x/api/registers/professionals${qs}`, { headers: { 'x-forwarded-for': ip } }));

describe('public check of regulated professionals', () => {
  beforeEach(() => { resetProfessions(); resetRateLimits(); resetRegisterWatch(); });

  it('answers one person by full name, narrowed by the number, never by the number alone, without the person reference, qualifications or (by default) conditions', async () => {
    const e = registerProfessional({ profession: 'midwife', personRef: 'BR-1990-000321', name: 'Fatima Bello', qualifications: ['Diploma in Midwifery (stated)'], conditions: ['Supervised practice'] }, 'c', 'Registrar') as { number: string };
    const byName = await (await get('?name=fatima%20bello')).json();
    expect(byName.results).toEqual([expect.objectContaining({ number: e.number, name: 'Fatima Bello', professionTitle: 'Midwives', state: 'registered' })]);
    expect(byName.professions.map((p: { key: string }) => p.key)).toContain('midwife');
    expect(JSON.stringify(byName)).not.toMatch(/BR-1990|Diploma|Supervised/);
    expect((await (await get(`?name=Fatima%20Bello&number=${e.number}`)).json()).results).toHaveLength(1);
    expect((await (await get('?name=Fatima%20Bello&number=PRN-2026-999999')).json()).results).toEqual([]);
    expect(await (await get(`?number=${e.number}`)).json()).toMatchObject({ results: [], note: expect.stringMatching(/full name/) });
    expect((await (await get('?q=Fat')).json()).results).toEqual([]);
  });

  it('shows conditions only where the profession\'s disclosure profile makes them public', async () => {
    defineProfession({ key: 'physiotherapist', title: 'Physiotherapists', authority: 'professionalRegulation', publicFields: ['name', 'state', 'profession', 'conditions'] }, 'Administrator');
    expect(defineProfession({ key: 'optician', title: 'Opticians', authority: 'professionalRegulation', publicFields: ['number'] }, 'Administrator')).toMatchObject({ error: /name and the standing/ });
    registerProfessional({ profession: 'physiotherapist', personRef: 'BR-2', name: 'Kwame Asante', conditions: ['No spinal manipulation'] }, 'c', 'Registrar');
    const r = (await (await get('?name=Kwame%20Asante')).json()).results[0];
    expect(r).toMatchObject({ conditions: ['No spinal manipulation'] });
    expect(r).not.toHaveProperty('number');
  });

  it('limits each caller and flags harvesting once', async () => {
    let refused = 0;
    for (let i = 0; i < 40; i++) if ((await get(`?name=Nobody%20Number${i}`, '198.51.100.9')).status === 429) refused++;
    expect(refused).toBeGreaterThan(0);
    // Another caller is not affected.
    expect((await get('?name=Someone%20Else', '198.51.100.10')).status).toBe(200);
    expect(HARVEST.misses).toBeLessThanOrEqual(40);
    const flags = listAudit().filter(e => e.action === 'register.harvest.suspected');
    expect(flags.length).toBeLessThanOrEqual(1);
    expect(JSON.stringify(flags)).not.toContain('198.51.100.9');
  });
});
