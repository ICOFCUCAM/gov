import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { resetProfessions, registerProfessional } from '@/lib/professions/register';

describe('public check of regulated professionals', () => {
  beforeEach(() => resetProfessions());
  it('answers by number or full name without the person reference or qualifications', async () => {
    const e = registerProfessional({ profession: 'midwife', personRef: 'BR-1990-000321', name: 'Fatima Bello', qualifications: ['Diploma in Midwifery (stated)'] }, 'c', 'Registrar') as { number: string };
    const r = await (await GET(new NextRequest(`http://x/api/registers/professionals?q=${e.number}`))).json();
    expect(r.results).toEqual([expect.objectContaining({ number: e.number, name: 'Fatima Bello', professionTitle: 'Midwives', state: 'registered' })]);
    expect(r.professions.map((p: { key: string }) => p.key)).toContain('midwife');
    expect(JSON.stringify(r)).not.toMatch(/BR-1990|Diploma/);
    expect((await (await GET(new NextRequest('http://x/api/registers/professionals?q=Fat'))).json()).results).toEqual([]);
  });
});
