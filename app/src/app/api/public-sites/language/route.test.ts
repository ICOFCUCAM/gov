import { describe, it, expect, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { applyNation } from '@/lib/nation/registry';

const call = (q: string) => GET(new NextRequest(`https://gov.example/api/public-sites/language?${q}`));

describe('a visitor\'s language on the public sites', () => {
  afterEach(() => applyNation({ configured: false }));

  it('keeps an official language and goes back to the page', () => {
    applyNation({ configured: true, stateName: 'Meridia', locale: 'en', languages: ['fr', 'ar'] });
    const r = call('lang=ar&next=%2Fpolice');
    expect(r.status).toBe(303);
    expect(r.headers.get('location')).toBe('https://gov.example/police');
    expect(r.headers.get('set-cookie')).toMatch(/civicos_site_lang=ar;.*HttpOnly/i);
  });

  it('ignores other languages and never sends visitors off the platform', () => {
    applyNation({ configured: true, stateName: 'Meridia', locale: 'en', languages: ['fr'] });
    expect(call('lang=yo&next=%2Fpolice').headers.get('set-cookie')).toBeNull();
    for (const next of ['https://evil.example', '//evil.example', '/\\evil.example']) {
      expect(call(`lang=fr&next=${encodeURIComponent(next)}`).headers.get('location')).toBe('https://gov.example/');
    }
  });
});
