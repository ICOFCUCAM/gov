import { describe, it, expect, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { resetUpdates, getChamber, decide, HOME_NATION } from './updates';
import { resetReadiness } from './readiness';
import { stagingOff, cosign } from './testkit';
import { resetSecurity } from './security-store';
import { resetSupport } from './support';
import { resetSupplyChain } from './supply-chain';
import { resetAdvisories } from './advisories';
import { evidencePack } from './evidence';
import { GET as evGET } from '@/app/api/releases/[id]/evidence/route';

const key = (id: string) => { const c = getChamber(id); if ('error' in c) throw new Error(c.error); return c.nation.channelKey; };
type Pack = { digest: string; install: { decisions: { action: string; by: string }[]; incidents: { id: string }[]; supportTickets: { id: string }[] }; auditChain: { entries: { action: string; resource: string; hash: string }[]; chainIntact: boolean }; advisories: { id: string; status: string }[]; sbom: unknown[]; provenance: unknown[]; escrow: { state: string } | null; certifications: { placeholder: boolean }[]; dpia: { sections: unknown[] } };

beforeEach(() => { resetUpdates(); resetReadiness(); stagingOff(); resetSecurity(); resetSupport(); resetSupplyChain(); resetAdvisories(); });

describe('evidence packs', () => {
  it('are generated from existing records, with the nation’s own decisions and audit entries', () => {
    cosign(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' });
    decide(HOME_NATION, 'DR-141', { action: 'prepare', by: 'Ops' });
    const p = evidencePack(HOME_NATION, 'DR-141') as unknown as Pack;
    expect(p.install.decisions.map(d => d.action)).toEqual(expect.arrayContaining(['approve', 'prepare']));
    expect(p.auditChain.entries.some(e => e.action === 'update.approve' || e.action.startsWith('update.'))).toBe(true);
    expect(p.auditChain.entries.every(e => e.resource.includes(HOME_NATION) || e.resource.startsWith('Escrow:'))).toBe(true);
    expect(p.auditChain.chainIntact).toBe(true);
    expect(p.sbom.length).toBe(2);
    expect(p.provenance.length).toBeGreaterThan(0);
    expect(p.escrow!.state).toBe('deposited');
    expect(p.certifications.every(c => c.placeholder)).toBe(true);
    expect(p.dpia.sections.length).toBeGreaterThan(4);
    // Advisory status is for this version: 1.4.1 fixes CSA-2026-07.
    expect(p.advisories.find(a => a.id === 'CSA-2026-07')!.status).toBe('fixed');
  });

  it('carry a digest over their contents', () => {
    const p = evidencePack(HOME_NATION, 'DR-140') as unknown as Pack & Record<string, unknown>;
    const { digest, ...body } = p;
    expect(digest).toBe(createHash('sha256').update(JSON.stringify(body)).digest('hex'));
  });

  it('include a fallback’s incident and its automatic ticket', () => {
    const p = evidencePack('sandbox', 'DR-141-S1') as unknown as Pack;
    expect(p.install.incidents.map(i => i.id)).toContain('INC-U-2001');
    expect(p.install.supportTickets.map(t => t.id)).toContain('SUP-3101');
    expect(p.install.decisions.some(d => d.action === 'fallback')).toBe(true);
  });

  it('never cross nations', async () => {
    expect(evidencePack('sandbox', 'DR-141-H1')).toBeUndefined();
    const sb = evidencePack('sandbox', 'DR-141') as unknown as Pack;
    expect(sb.auditChain.entries.every(e => !e.resource.includes(`:${HOME_NATION}/`))).toBe(true);
    expect((await evGET(new Request(`http://x?link=${key('sandbox')}`) as never, { params: { id: 'DR-141-H1' } })).status).toBe(404);
    const dl = await evGET(new Request('http://x?download=1') as never, { params: { id: 'DR-140' } });
    expect(dl.headers.get('content-disposition')).toMatch(/evidence-1\.4\.0\.json/);
  });
});
