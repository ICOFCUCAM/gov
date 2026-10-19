import { describe, it, expect, beforeEach } from 'vitest';
import { resetUpdates, getChamber, nationRecord, publisherOverview, HOME_NATION } from './updates';
import { resetSecurity } from './security-store';
import { resetAdvisories, exposure, statusFor, getAdvisory, setVex, commitments, csaf, PATCH_COMMITMENTS } from './advisories';
import { listAudit } from './store';
import { GET as advGET } from '@/app/api/releases/advisories/route';
import { GET as csafGET } from '@/app/api/releases/advisories/[id]/csaf/route';
import { POST as vexPOST } from '@/app/api/releases/publisher/advisories/[id]/vex/route';

const home = () => nationRecord(HOME_NATION)!;
const sandbox = () => nationRecord('sandbox')!;
const chamberReleases = (id: string) => { const c = getChamber(id); if ('error' in c) throw new Error(c.error); return c.releases; };

beforeEach(() => { resetUpdates(); resetSecurity(); resetAdvisories(); });

describe('status per nation', () => {
  it('is computed from the installed version', () => {
    // The installed nation runs 1.4.0; the sandbox runs 1.4.1.
    expect(statusFor(home(), getAdvisory('CSA-2026-03')!).status).toBe('fixed');            // fixed in 1.4.0
    expect(statusFor(home(), getAdvisory('CSA-2026-07')!).status).toBe('affected');         // fixed in 1.4.1
    expect(statusFor(sandbox(), getAdvisory('CSA-2026-07')!).status).toBe('fixed');
    expect(statusFor(home(), getAdvisory('CSA-2026-09')!).status).toBe('under-investigation');
    expect(statusFor(home(), getAdvisory('CSA-2026-10')!).status).toBe('fixed');            // range ended before 1.3.0
  });

  it('nation builds on top of a fixed version count as fixed', () => {
    const n = { ...home(), installedVersion: '1.4.1+sov.1' };
    expect(statusFor(n, getAdvisory('CSA-2026-07')!).status).toBe('fixed');
  });

  it('exposure lists affected first, with the release that fixes it', () => {
    const e = exposure(home(), chamberReleases(HOME_NATION));
    expect(e[0]!.status).toBe('affected');
    const s07 = e.find(x => x.advisory.id === 'CSA-2026-07')!;
    expect(s07.fixReleaseId).toBe('DR-141');
  });
});

describe('VEX statements', () => {
  it('a not-affected statement needs a justification, applies to one nation only, and is audited', () => {
    expect(setVex('CSA-2026-09', HOME_NATION, { status: 'not-affected', justification: 'trust me' })).toMatchObject({ status: 422 });
    expect(setVex('CSA-2026-09', HOME_NATION, { status: 'not-affected', justification: 'vulnerable_code_not_in_execute_path', by: 'PSIRT' })).toEqual({ ok: true });
    expect(statusFor(home(), getAdvisory('CSA-2026-09')!)).toEqual({ status: 'not-affected', justification: 'vulnerable_code_not_in_execute_path' });
    expect(statusFor(sandbox(), getAdvisory('CSA-2026-09')!).status).toBe('under-investigation');
    expect(listAudit()[0]).toMatchObject({ action: 'update.advisory.vex', actor: 'PSIRT' });
  });
});

describe('patch-time commitments', () => {
  it('are met, open or breached against the published policy', () => {
    const c = Object.fromEntries(commitments(publisherOverview().releases).map(x => [x.advisoryId, x]));
    expect(PATCH_COMMITMENTS.critical).toBe(72);
    expect(c['CSA-2026-03']!.state).toBe('met');      // critical: fixed within 72 h
    expect(c['CSA-2026-07']!.state).toBe('met');      // high: 7 days ≤ 14
    expect(c['CSA-2026-05']!.state).toBe('breached'); // high: 25 days > 14
    expect(c['CSA-2026-09']!.state).toBe('open');     // medium, no fix yet, within 30 days
    expect(c['CSA-2026-09']!.hoursLeft).toBeGreaterThan(0);
  });
});

describe('CSAF export', () => {
  it('produces a CSAF 2.0-style document with this nation’s VEX status', () => {
    const doc = csaf(getAdvisory('CSA-2026-07')!, home()) as { document: { category: string; tracking: { id: string } }; vulnerabilities: { product_status: Record<string, string[]>; scores: { cvss_v3: { baseScore: number } }[] }[] };
    expect(doc.document.category).toBe('csaf_security_advisory');
    expect(doc.document.tracking.id).toBe('CSA-2026-07');
    expect(doc.vulnerabilities[0]!.scores[0]!.cvss_v3.baseScore).toBe(8.1);
    expect(doc.vulnerabilities[0]!.product_status.known_affected).toContain('CivicOS-nation-home');
  });

  it('routes: exposure for this nation, CSAF download, VEX gated to the publisher', async () => {
    const r = await (await advGET(new Request('http://x/api/releases/advisories') as never)).json();
    expect(r.exposure.length).toBe(5);
    const c = getChamber('sandbox'); if ('error' in c) throw new Error(c.error);
    const sb = await (await advGET(new Request(`http://x/api/releases/advisories?link=${c.nation.channelKey}`) as never)).json();
    expect(sb.exposure.find((x: { advisory: { id: string } }) => x.advisory.id === 'CSA-2026-07').status).toBe('fixed');
    const dl = await csafGET(new Request('http://x') as never, { params: Promise.resolve({ id: 'CSA-2026-03' }) });
    expect(dl.headers.get('content-disposition')).toMatch(/csa-2026-03\.csaf\.json/);
    expect((await csafGET(new Request('http://x') as never, { params: Promise.resolve({ id: 'NOPE' }) })).status).toBe(404);
    const v = await vexPOST(new Request('http://x', { method: 'POST', body: JSON.stringify({ nationId: 'sandbox', status: 'not-affected', justification: 'component_not_present' }), headers: { 'content-type': 'application/json' } }) as never, { params: Promise.resolve({ id: 'CSA-2026-09' }) });
    expect(v.status).toBe(200);
  });
});
