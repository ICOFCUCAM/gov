// Cycle 3 event idempotency (owner's directive, non-negotiable 9): a repeated
// request, a replayed decision, a bank transfer reported twice and a
// reconciliation run twice each change the records once.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openCase, act, attach, resetCases, registeredEffects, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions } from '@/lib/records/decisions';
import { setSovereign, listMinistries, listReceipts } from '@/lib/data/store';
import { listBills, recordTransfer } from '@/lib/data/store/payments';
import { listAudit } from '@/lib/data/store/audit';
import { resetLaw } from '@/lib/law/register';
import { resetRules } from '@/lib/law/rules';
import { CUSTOMS_PROCEDURES } from './procedures';
import { resetCustoms, declarationOfCase, reconcileCustomsPayments } from './register';

let CUS = '';
const off = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Customs ${id}`, scope: { id, role, institution: CUS } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string) => { const d = addDocument({ class: cls, title: cls, institution: CUS, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, off('s0', 'signatory')); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
const FIELDS = { direction: 'import', declarantKind: 'organisation', declarantRef: 'ORG-7', declarantName: 'Lake Imports', transportRef: 'BL-777', dispatchCountry: 'TZ', destinationCountry: 'KE', currency: 'KES', goods: '1006300000 | Rice | TZ | 1000 kg | 300000' };

describe('cycle 3 idempotency', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetCustoms, resetLaw, resetRules]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    CUS = listMinistries()[0]!.id;
    setSovereign({ deployment: { authorities: { customs: CUS } } }, 'Administrator');
    for (const p of CUSTOMS_PROCEDURES) { draftPackage(asNationSets(p), 'Author', 'a', registeredEffects()); approvePackage(p.key, 1, 'Approver', 'b', '2026-01-01', registeredEffects(), new Date('2026-01-01')); }
  });

  it('a repeated open, decision, notice, transfer and reconciliation each count once', async () => {
    const a = openCase({ procedure: 'customs.declaration', fields: FIELDS, idempotencyKey: 'open-1' }, off('o1')) as { id: string };
    const b = openCase({ procedure: 'customs.declaration', fields: FIELDS, idempotencyKey: 'open-1' }, off('o1')) as { id: string };
    expect(b.id).toBe(a.id);
    doc(a.id, 'commercial-invoice'); doc(a.id, 'transport-document');
    await step(a.id, 'check', off('o1'), { idempotencyKey: 'check-1' });
    await step(a.id, 'check', off('o1'), { idempotencyKey: 'check-1' });
    expect(listAudit().filter(e => e.action === 'customs.declaration.lodge')).toHaveLength(1);
    // A second case for the same consignment and declarant is refused.
    const dup = openCase({ procedure: 'customs.declaration', fields: FIELDS }, off('o1')) as { id: string };
    doc(dup.id, 'commercial-invoice'); doc(dup.id, 'transport-document');
    expect(await act(dup.id, { action: 'check' }, off('o1'))).toMatchObject({ error: expect.stringMatching(/already lodged/) });

    await step(a.id, 'choose', off('o1'), { fields: { channel: 'release-on-documents', channelReasons: 'Regular consignment' } });
    await step(a.id, 'propose', off('o1'), { reason: 'r', fields: { enteredDuty: '1 | 45000', dutyReasons: 'Entered pending the approved tariff' } });
    await step(a.id, 'assess', off('s1', 'signatory'), { reason: 'ok', idempotencyKey: 'assess-1' });
    expect(await step(a.id, 'assess', off('s1', 'signatory'), { reason: 'ok', idempotencyKey: 'assess-1' })).toMatchObject({ pending: true });
    await step(a.id, 'assess', off('s2', 'signatory'), { idempotencyKey: 'assess-2' });
    await step(a.id, 'assess', off('s2', 'signatory'), { idempotencyKey: 'assess-2' });
    expect(listAudit().filter(e => e.action === 'customs.assess')).toHaveLength(1);
    await step(a.id, 'notify', off('o1'), { fields: { dueDate: '2026-12-01' }, idempotencyKey: 'notify-1' });
    await step(a.id, 'notify', off('o1'), { idempotencyKey: 'notify-1' });
    const ref = declarationOfCase(a.id)!.assessment!.reference;
    expect(listBills().filter(x => x.reference === ref)).toHaveLength(1);

    // The bank reports the same transfer twice; reconciliation runs twice.
    const t = { reference: ref, amountMinor: 45000, currency: 'KES', rail: 'rtgs', railReference: 'RTGS-2026-555', paidAt: '2026-11-20T10:00:00Z' };
    recordTransfer(t, 'Bank feed'); recordTransfer(t, 'Bank feed');
    expect(listReceipts().filter(r => r.reference === ref)).toHaveLength(1);
    reconcileCustomsPayments(listReceipts()); reconcileCustomsPayments(listReceipts());
    expect(declarationOfCase(a.id)!.assessment!.paidMinor).toBe(45000);
    await step(a.id, 'release', off('s1', 'signatory'), { reason: 'Paid', idempotencyKey: 'release-1' });
    await step(a.id, 'release', off('s1', 'signatory'), { reason: 'Paid', idempotencyKey: 'release-1' });
    expect(listAudit().filter(e => e.action === 'customs.release')).toHaveLength(1);
  });
});
