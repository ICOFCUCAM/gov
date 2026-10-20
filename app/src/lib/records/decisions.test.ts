import { describe, it, expect, beforeEach } from 'vitest';
import { recordDecision, verifyDecision, getDecision, decisionsFor, resetDecisions, type DecisionContent } from './decisions';

const content = (x: Partial<DecisionContent> = {}): DecisionContent => ({
  subject: { kind: 'case', id: 'c1', ref: 'CIV-2026-000001', procedure: { key: 'civil.birth', version: 1 } },
  institution: { id: 'civil', name: 'Civil Registry' },
  decision: 'register', reasons: 'All required evidence is present and verified.',
  citations: [{ instrument: '/eli/x/act/2020/7', eId: 'art_1', version: 'v1', digest: 'a'.repeat(64), on: '2026-10-20' }],
  officials: [{ role: 'decided', name: 'B. Registrar', id: 'local:b' }, { role: 'confirmed', name: 'C. Registrar', id: 'local:c' }],
  facts: { registrationNumber: 'BR-2026-000001' }, at: '2026-10-20T10:00:00.000Z', ...x,
});

describe('decision records', () => {
  beforeEach(() => resetDecisions());

  it('seals the canonical record and detects any change', async () => {
    const d = await recordDecision(content());
    if ('error' in d) throw new Error(d.error);
    expect(d.sha256).toHaveLength(64);
    expect(d.seal.framework).toBe('platform');
    expect(verifyDecision(d)).toEqual({ ok: true });
    expect(verifyDecision({ ...d, content: { ...d.content, reasons: 'changed' } })).toMatchObject({ ok: false });
    expect(verifyDecision({ ...d, sha256: d.sha256, seal: { ...d.seal, signature: Buffer.alloc(64).toString('base64') } })).toMatchObject({ ok: false, problem: expect.stringMatching(/seal/) });
  });

  it('needs reasons and the deciding official; a correction supersedes', async () => {
    expect(await recordDecision(content({ reasons: ' ' }))).toHaveProperty('error');
    expect(await recordDecision(content({ officials: [] }))).toHaveProperty('error');
    const a = await recordDecision(content()) as { id: string };
    const b = await recordDecision(content({ supersedes: a.id, reasons: 'Corrected the date of birth.' })) as { id: string };
    expect(getDecision(a.id)?.supersededBy).toBe(b.id);
    expect(await recordDecision(content({ supersedes: a.id }))).toHaveProperty('error');
    expect(decisionsFor('case', 'c1')).toHaveLength(2);
  });
});

describe('decision key', () => {
  it('refuses to seal with a passing development key in a production installation', async () => {
    const { vi } = await import('vitest');
    vi.stubEnv('CIVICOS_MODE', 'production');
    vi.stubEnv('CIVICOS_DECISION_KEY', '');
    expect(await recordDecision(content())).toMatchObject({ error: expect.stringMatching(/CIVICOS_DECISION_KEY/) });
    vi.unstubAllEnvs();
  });
});
