import { describe, it, expect, beforeEach } from 'vitest';
import { callService, serviceDirectory } from './services';
import { verifyReceipt, listExchanges, resetExchangeLog } from './log';
import { registerEvent, resetCivil } from '@/lib/civil/register';

const caller = { kind: 'integration' as const, id: 'IC-1', name: 'Identity authority' };

describe('exchange services', () => {
  beforeEach(() => { resetCivil(); resetExchangeLog(); });

  it('answers whether facts match a birth registration, never the record, with a signed receipt', async () => {
    registerEvent({ kind: 'birth', date: '2026-09-01', place: { region: 'North' }, case: 'c1', child: { given: 'Amara', family: 'Okafor', sex: 'female' } }, 'R');
    const yes = await callService(caller, 'person.verify', { registration: 'BR-2026-000001', family: 'OKAFOR', birthDate: '2026-09-01' }, 'Issuing a national identity card');
    expect(yes).toMatchObject({ status: 200, data: { match: 'yes', status: 'alive' } });
    expect(JSON.stringify(yes.data)).not.toContain('Amara');
    expect(verifyReceipt(yes.receipt)).toBe(true);
    expect((await callService(caller, 'person.verify', { registration: 'BR-2026-000001', family: 'Bello' }, 'x')).data).toEqual({ match: 'no', status: 'unknown' });
    expect((await callService(caller, 'person.verify', { registration: 'BR-2026-000001' }, 'x')).data).toEqual({ match: 'unknown', status: 'unknown' });
    expect(await callService(caller, 'person.verify', { registration: 'BR-2026-000001', family: 'Okafor' }, ' ')).toMatchObject({ status: 400 });
    expect(listExchanges({ channel: 'service' })).toHaveLength(4);
  });

  it('lists every service with its owner, scope and the fields it returns', () => {
    expect(serviceDirectory().map(s => [s.id, s.kind, s.scope])).toEqual([['person.verify', 'query', 'service:person.verify'], ['civil.birth.registered', 'event', 'events:civil']]);
  });
});
