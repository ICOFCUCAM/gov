// Cycle 3 audit evidence (owner's directive, non-negotiable 9): every
// decision in the new domains is a sealed decision record that verifies, the
// audit chain holds after them, and neither the audit chain nor the events
// derived from it carry personal or commercially confidential data.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openCase, act, attach, resetCases, registeredEffects, getCase, type Actor } from './engine';
import { draftPackage, approvePackage, resetPackages } from './packages';
import { EDUCATION_PROCEDURES, PROFESSION_PROCEDURES, ORGANISATION_PROCEDURES } from './modules';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions, getDecision, verifyDecision } from '@/lib/records/decisions';
import { resetCertificates } from '@/lib/records/certificates';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { listAudit, verifyAuditChain } from '@/lib/data/store/audit';
import { noteAudit, resetOutbox } from '@/lib/events/outbox';
import { resetOrganisations, createOrganisation, setStanding } from '@/lib/organisations/register';
import { resetEducation } from '@/lib/education/register';
import { resetProfessions } from '@/lib/professions/register';
import { resetCustoms, lodgeDeclaration } from '@/lib/customs/register';

let EDU = '', PRO = '';
const at = (inst: () => string) => (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } });
const edu = at(() => EDU), pro = at(() => PRO);
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, inst: string, cls: string, who: Actor) => { const d = addDocument({ class: cls, title: cls, institution: inst, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, who); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
const PERSONAL = /Chinedu Eze|BR-2007-000999|Confidential Importers|ORG-SECRET|Mobile phones/;

describe('cycle 3 audit evidence', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetCertificates, resetOrganisations, resetEducation, resetProfessions, resetCustoms, resetOutbox]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    [EDU, PRO] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { education: EDU, professionalRegulation: PRO } } }, 'Administrator');
    for (const p of [...ORGANISATION_PROCEDURES, ...EDUCATION_PROCEDURES, ...PROFESSION_PROCEDURES]) {
      draftPackage(p, 'Author', 'author', registeredEffects());
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
      if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
  });

  it('seals and verifies each decision, keeps the chain whole, and keeps names and trade data out of audit entries and events', async () => {
    const before = listAudit().length;
    const school = createOrganisation({ name: 'Riverbank College', kind: 'college' }, 'c', 'Registrar') as { id: string; number: string };
    setStanding(school.id, { register: 'schools', state: 'granted', reason: 'ok' }, 'Registrar');
    const q = openCase({ procedure: 'edu.qualification', fields: { holderRef: 'BR-2007-000999', holderName: 'Chinedu Eze', title: 'Diploma in Nursing', awardingBody: school.number, awardedOn: '2026-06-30' } }, edu('clerk')) as { id: string };
    doc(q.id, EDU, 'award-evidence', edu('clerk'));
    await step(q.id, 'check', edu('clerk')); await step(q.id, 'verify', edu('clerk'));
    await step(q.id, 'record', edu('s1', 'signatory'), { reason: 'Results confirmed' });
    await step(q.id, 'record', edu('s2', 'signatory'));
    await step(q.id, 'issue', edu('clerk'));
    const r = openCase({ procedure: 'prof.registration', fields: { profession: 'nurse', personRef: 'BR-2007-000999', name: 'Chinedu Eze' } }, pro('clerk')) as { id: string };
    doc(r.id, PRO, 'qualification-evidence', pro('clerk')); doc(r.id, PRO, 'identity-evidence', pro('clerk'));
    await step(r.id, 'check', pro('clerk')); await step(r.id, 'verify', pro('clerk'));
    await step(r.id, 'register', pro('s1', 'signatory'), { reason: 'Qualified' });
    await step(r.id, 'register', pro('s2', 'signatory'));
    lodgeDeclaration({ direction: 'import', declarant: { kind: 'organisation', ref: 'ORG-SECRET', name: 'Confidential Importers' }, shipment: { mode: 'air', transportRef: 'AWB-42', from: 'AE', to: 'KE' }, currency: 'KES', goods: '8517130000 | Mobile phones | CN | 100 u | 2500000' }, 'case-x', 'Officer');

    // Each decision is a sealed record that verifies, and names who decided (both, for four eyes).
    for (const id of [q.id, r.id]) {
      const c = getCase(id)!;
      expect(c.decisions.length).toBeGreaterThan(0);
      for (const d of c.decisions) { const rec = getDecision(d)!; expect(verifyDecision(rec)).toEqual({ ok: true }); }
    }
    const four = getCase(r.id)!.history.find(h => h.action === 'register')!;
    expect(four.by.name).toBe('Official s1'); expect(four.confirmedBy?.name).toBe('Official s2');

    // The chain verifies; new entries and the events derived from them carry no names, references or goods.
    expect(verifyAuditChain().ok).toBe(true);
    const fresh = listAudit().slice(0, listAudit().length - before);
    expect(fresh.some(e => e.action === 'education.award.record')).toBe(true);
    expect(fresh.some(e => e.action === 'profession.register')).toBe(true);
    expect(fresh.some(e => e.action === 'customs.declaration.lodge')).toBe(true);
    expect(JSON.stringify(fresh)).not.toMatch(PERSONAL);
    const events = fresh.map(noteAudit).filter(Boolean);
    expect(events.length).toBeGreaterThan(0);
    expect(JSON.stringify(events)).not.toMatch(PERSONAL);
  });
});
