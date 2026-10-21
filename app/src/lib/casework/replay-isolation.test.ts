// A repeated request never shows a case to someone who may not work it: the
// engine decides who may act before it answers a repeated key, and a key only
// finds a case of the same procedure and institution.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openCase, act, attach, resetCases, registeredEffects, type Actor } from './engine';
import { draftPackage, approvePackage, resetPackages } from './packages';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { TAX_PROCEDURES } from './modules';
import { setSovereign, listMinistries } from '@/lib/data/store';

let TAX = '', OTHER = '';
const own = (): Actor => ({ id: 'o1', name: 'Tax official', scope: { id: 'o1', role: 'signatory', institution: TAX } });
const intruder = (): Actor => ({ id: 'x1', name: 'Other ministry', scope: { id: 'x1', role: 'signatory', institution: OTHER } });
const FIELDS = { partyKind: 'person', partyRef: 'BR-SECRET', partyName: 'Secret Person', taxTypes: 'income' };

describe('repeated requests and case isolation', () => {
  beforeEach(() => {
    resetCases(); resetPackages(); resetDocuments();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    [TAX, OTHER] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { tax: TAX } } }, 'Administrator');
    for (const p of TAX_PROCEDURES) { draftPackage(asNationSets(p), 'A', 'a', registeredEffects()); approvePackage(p.key, 1, 'B', 'b', '2026-01-01', registeredEffects(), new Date('2026-01-01')); }
  });

  it('refuses a repeated open from another institution and does not return the case', () => {
    const c = openCase({ procedure: 'tax.registration', fields: FIELDS, idempotencyKey: 'k-open' }, own()) as { id: string };
    const r = openCase({ procedure: 'tax.registration', fields: {}, idempotencyKey: 'k-open' }, intruder());
    expect(r).toHaveProperty('error');
    expect(JSON.stringify(r)).not.toContain('Secret Person');
    expect((openCase({ procedure: 'tax.registration', fields: FIELDS, idempotencyKey: 'k-open' }, own()) as { id: string }).id).toBe(c.id);
  });

  it('refuses a repeated action from another institution, and a key answers only for its own action', async () => {
    const c = openCase({ procedure: 'tax.registration', fields: FIELDS }, own()) as { id: string };
    const d = addDocument({ class: 'identity-evidence', title: 'x', institution: TAX, belongsTo: { kind: 'case', id: c.id }, bytes: new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF')) }, 'Clerk') as { id: string };
    attach(c.id, d.id, own());
    expect(await act(c.id, { action: 'verify', idempotencyKey: 'k-act' }, own())).not.toHaveProperty('error');
    const r = await act(c.id, { action: 'verify', idempotencyKey: 'k-act' }, intruder());
    expect(r).toHaveProperty('error');
    expect(JSON.stringify(r)).not.toContain('Secret Person');
    // The owner's repeat returns the case; the same key on another action is not a repeat.
    expect(await act(c.id, { action: 'verify', idempotencyKey: 'k-act' }, own())).not.toHaveProperty('error');
    expect(await act(c.id, { action: 'propose', idempotencyKey: 'k-act' }, own())).toMatchObject({ case: { stage: 'pending-approval' } });
  });
});
