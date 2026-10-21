// The oversight confirmation of shortening the access log compares persons,
// not names (audit L; directions 15.3): the same account, or two accounts of
// one person at the identity provider, cannot be both an administrator and
// the oversight side, whatever names they carry.
import { describe, it, expect, beforeEach } from 'vitest';
import { resetRetention, proposeRetention, decideRetention, confirmByOversight } from './retention';
import { registerPersonResolver } from './dual-control';

const bound: Record<string, string> = { 'local:a': 'person-1', 'local:b': 'person-2', 'local:a-dpa': 'person-1', 'local:dpa': 'person-3' };

beforeEach(() => {
  resetRetention();
  registerPersonResolver(sub => (bound[sub] ? { key: bound[sub]!, bound: true } : undefined));
});

const proposal = () => {
  const p = proposeRetention({ category: 'access-log', action: 'delete', days: 3650, basis: 'Records schedule 4', reason: 'Schedule adopted' }, 'Admin A', Date.now(), 'local:a');
  if ('error' in p) throw new Error(p.error);
  return p.id;
};

describe('the oversight confirmation of the access log\'s retention', () => {
  it('refuses the proposer\'s second account under another name, and a confirmer who is not signed in', () => {
    const id = proposal();
    expect(decideRetention(id, 'confirm', 'Someone else', Date.now(), 'local:a-dpa')).toHaveProperty('error');
    expect(decideRetention(id, 'confirm', 'Admin B', Date.now(), 'local:b')).toMatchObject({ state: 'awaiting-oversight', decidedById: 'local:b' });
    expect(confirmByOversight(id, 'Data protection officer')).toMatchObject({ error: expect.stringMatching(/signed in/) });
    expect(confirmByOversight(id, 'Data protection officer', Date.now(), 'local:a-dpa')).toMatchObject({ error: expect.stringMatching(/someone other than/) });
    expect(confirmByOversight(id, 'Data protection officer', Date.now(), 'local:b')).toMatchObject({ error: expect.stringMatching(/someone other than/) });
    expect(confirmByOversight(id, 'Data protection officer', Date.now(), 'local:dpa')).toMatchObject({ state: 'confirmed' });
  });

  it('still compares names when nobody was signed in (sign-in not enforced)', () => {
    const p = proposeRetention({ category: 'access-log', action: 'delete', days: 3650, basis: 'Records schedule 4', reason: 'r' }, 'Admin A');
    if ('error' in p) throw new Error(p.error);
    decideRetention(p.id, 'confirm', 'Admin B');
    expect(confirmByOversight(p.id, 'Admin B')).toHaveProperty('error');
    expect(confirmByOversight(p.id, 'Data protection officer')).toMatchObject({ state: 'confirmed' });
  });
});
