import { describe, it, expect, beforeEach } from 'vitest';
import { openCase, act, assign, resetCases, registeredEffects, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { POLICE_PROCEDURES } from './procedures';

let POLICE = '';
const off = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Officer ${id}`, scope: { id, role, institution: POLICE } });

describe('police incident intake', () => {
  beforeEach(() => {
    resetCases(); resetPackages(); resetLaw();
    POLICE = listMinistries()[0]!.id;
    setSovereign({ deployment: { authorities: { police: POLICE } } }, 'Administrator');
    for (const p of POLICE_PROCEDURES) {
      draftPackage(p, 'Author', 'author', registeredEffects());
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
      if ('error' in a) throw new Error(a.error);
    }
  });

  it('takes a report from a person, classifies it only with a cited provision, and closes and reopens it', async () => {
    const law = recordVersion({ instrument: { title: 'Penal Code', type: 'act', jurisdiction: 'X', year: 1990, number: '1', issuingAuthority: 'Parliament' }, dates: { inForce: '1990-01-01' }, provisions: [{ eId: 'sec_300', num: '300', text: 'Burglary.' }] }, 'L1', 'l1');
    if ('error' in law) throw new Error(law.error);
    confirmVersion(law.instrument.id, law.version.id, 'L2', 'l2');
    const c = openCase({ procedure: 'police.incident', source: 'citizen', applicant: { kind: 'person', id: 'sub-1', name: 'Reporter' }, fields: { occurredOn: '2026-10-19', place: 'Market Street', account: 'My shop was broken into overnight.' } }, { name: 'Citizen', scope: null }) as { id: string };
    expect(c).toMatchObject({ stage: 'received', sensitivity: 'restricted' });
    // Restricted: an officer works it once a supervisor assigns it.
    expect(await act(c.id, { action: 'triage' }, off('o1'))).toMatchObject({ error: expect.stringMatching(/restricted/) });
    assign(c.id, { id: 'o1', name: 'Officer o1' }, off('sup', 'signatory'));
    expect(await act(c.id, { action: 'triage' }, off('o1'))).toMatchObject({ case: { stage: 'triage' } });
    expect(await act(c.id, { action: 'classify', reason: 'Entry by force', fields: { category: 'burglary' } }, off('o1'))).toMatchObject({ error: expect.stringMatching(/Cite the provisions/) });
    const cl = await act(c.id, { action: 'classify', reason: 'Entry by force', fields: { category: 'burglary' }, citations: [{ instrument: law.instrument.id, eId: 'sec_300' }] }, off('o1'));
    expect(cl).toMatchObject({ case: { stage: 'classified' } });
    expect(await act(c.id, { action: 'close', reason: 'Insurance report only; no line of enquiry' }, off('sup', 'signatory'))).toMatchObject({ case: { stage: 'closed' } });
    expect(await act(c.id, { action: 'reopen', reason: 'Footage handed in' }, off('sup', 'signatory'))).toMatchObject({ case: { stage: 'triage' } });
  });
});
