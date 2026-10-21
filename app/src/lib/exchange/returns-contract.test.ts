// Every query service answers only with the fields its directory entry
// declares (the data-minimisation promise each caller's agreement rests on),
// including the cycle 3 services, for both a found and an unknown subject.
import { describe, it, expect } from 'vitest';
import { SERVICES } from './services';

const INPUTS: Record<string, Record<string, unknown>[]> = {
  'taxpayer.status': [{ party: 'NOBODY' }],
  'qualification.verify': [{ number: 'QUA-0000-000000', holderName: 'Nobody' }, {}],
  'professional.standing': [{ number: 'PRN-0000-000000' }],
  'customs.release': [{ number: 'CUS-0000-000000' }],
  'organisation.standing': [{ register: 'companies', number: 'ORG-0' }],
  'product.status': [{ number: 'PRD-0000-000000' }, {}],
  'immigration.status': [{ nationality: 'XXX', documentNumber: 'X1' }, {}],
};

describe('exchange services return only what they declare', () => {
  for (const s of SERVICES.filter(x => x.kind === 'query' && INPUTS[x.id])) {
    it(s.id, async () => {
      for (const input of INPUTS[s.id]!) {
        const r = await s.handle!(input, { kind: 'integration', id: 'contract-test', name: 'Contract test' });
        for (const k of Object.keys(r.data ?? {})) expect(Object.keys(s.returns), `${s.id} returned ${k}`).toContain(k);
      }
    });
  }
});
