import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { resetPermitAuthorities } from '@/lib/permits/authority';

const post = (body: unknown) => POST(new NextRequest('http://x/api/permit-authorities', { method: 'POST', body: JSON.stringify(body) }));

describe('/api/permit-authorities', () => {
  beforeEach(() => resetPermitAuthorities());
  it('drafts the proposals, which nothing governs by until approved', async () => {
    const r = await (await post({ op: 'install-proposals', by: 'Administrator' })).json();
    expect(r.drafted.length).toBeGreaterThan(10);
    const g = await (await GET(new NextRequest('http://x/api/permit-authorities'))).json();
    expect(Object.values(g.inForce).every(v => v === null)).toBe(true);
    expect((await post({ op: 'approve', permitType: 'tax-registration', version: 1, by: 'Second admin' })).status).toBe(422);
    expect((await post({ op: 'nope' })).status).toBe(422);
  });
});
