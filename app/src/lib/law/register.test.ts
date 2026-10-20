import { describe, it, expect, beforeEach } from 'vitest';
import { recordVersion, confirmVersion, withdrawVersion, versionOn, provisionOn, cite, relate, listInstruments, resetLaw, canonicalDigest, checkProvisions } from './register';

const act = { title: 'Civil Registration Act', type: 'act', jurisdiction: 'MDA', year: 2020, number: '7', issuingAuthority: 'National Assembly' };
const provs = (text: string) => [
  { eId: 'art_1', num: '1', heading: 'Duty to register', text: 'Every birth shall be registered.' },
  { eId: 'art_1__para_1', num: '1(1)', text, parent: 'art_1' },
];

describe('laws register', () => {
  beforeEach(() => resetLaw());

  it('records a version that cannot be cited until a different official confirms it', () => {
    const r = recordVersion({ instrument: act, dates: { adopted: '2020-03-01', published: '2020-03-10', inForce: '2020-06-01' }, provisions: provs('within 60 days') }, 'A. Clerk', 'local:a');
    if ('error' in r) throw new Error(r.error);
    expect(r.instrument.id).toBe('/eli/mda/act/2020/7');
    expect(cite(r.instrument.id, 'art_1__para_1', '2021-01-01')).toHaveProperty('error');
    expect(confirmVersion(r.instrument.id, r.version.id, 'A. Clerk', 'local:a')).toHaveProperty('error');
    expect(confirmVersion(r.instrument.id, r.version.id, 'B. Counsel', 'local:b')).toMatchObject({ state: 'confirmed', confirmedBy: 'B. Counsel' });
    expect(cite(r.instrument.id, 'art_1__para_1', '2021-01-01')).toMatchObject({ version: r.version.id, digest: r.version.digest, num: '1(1)', title: 'Civil Registration Act' });
  });

  it('answers what was in force on a date, never the current version by default', () => {
    const a = recordVersion({ instrument: act, dates: { inForce: '2020-06-01' }, provisions: provs('within 60 days') }, 'A', 'a');
    if ('error' in a) throw new Error(a.error);
    confirmVersion(a.instrument.id, a.version.id, 'B', 'b');
    const b = recordVersion({ instrument: { id: a.instrument.id }, dates: { inForce: '2024-01-01' }, provisions: provs('within 30 days') }, 'A', 'a');
    if ('error' in b) throw new Error(b.error);
    confirmVersion(a.instrument.id, b.version.id, 'B', 'b');
    expect((provisionOn(a.instrument.id, 'art_1__para_1', '2023-12-31') as { provision: { text: string } }).provision.text).toBe('within 60 days');
    expect((provisionOn(a.instrument.id, 'art_1__para_1', '2024-01-01') as { provision: { text: string } }).provision.text).toBe('within 30 days');
    expect(versionOn(a.instrument.id, '2019-01-01')).toHaveProperty('error');
    expect(provisionOn(a.instrument.id, 'art_9', '2024-01-01')).toHaveProperty('error');
  });

  it('withdraws a mistaken version and keeps it', () => {
    const a = recordVersion({ instrument: act, dates: { inForce: '2020-06-01' }, provisions: provs('x') }, 'A', 'a');
    if ('error' in a) throw new Error(a.error);
    confirmVersion(a.instrument.id, a.version.id, 'B', 'b');
    expect(withdrawVersion(a.instrument.id, a.version.id, '', 'B')).toHaveProperty('error');
    expect(withdrawVersion(a.instrument.id, a.version.id, 'Wrong gazette text', 'B')).toMatchObject({ state: 'withdrawn' });
    expect(versionOn(a.instrument.id, '2021-01-01')).toHaveProperty('error');
    expect(listInstruments()[0]!.versions).toHaveLength(1);
    expect(listInstruments({ state: 'confirmed' })).toHaveLength(0);
  });

  it('checks structure, dates and relations', () => {
    expect(checkProvisions([{ eId: 'Art 1', num: '1', text: 'x' }])).toHaveProperty('error');
    expect(checkProvisions([{ eId: 'art_2', num: '2', text: 'x', parent: 'art_1' }])).toHaveProperty('error');
    expect(recordVersion({ instrument: act, dates: { inForce: '2020-06-01', ceased: '2020-01-01' }, provisions: provs('x') }, 'A')).toHaveProperty('error');
    expect(recordVersion({ instrument: { ...act, type: 'law' }, dates: { inForce: '2020-06-01' }, provisions: provs('x') }, 'A')).toHaveProperty('error');
    const a = recordVersion({ instrument: act, dates: { inForce: '2020-06-01' }, provisions: provs('x') }, 'A');
    const r = recordVersion({ instrument: { ...act, title: 'Regulations', type: 'regulation', number: '12' }, dates: { inForce: '2021-01-01' }, provisions: provs('y') }, 'A');
    if ('error' in a || 'error' in r) throw new Error('setup');
    expect(relate(r.instrument.id, 'implements', a.instrument.id, 'A')).not.toHaveProperty('error');
    expect(relate(r.instrument.id, 'implements', '/eli/x/act/1/1', 'A')).toHaveProperty('error');
    // The digest does not depend on spacing.
    expect(canonicalDigest([{ eId: 'art_1', num: '1', text: 'a  b' }])).toBe(canonicalDigest([{ eId: 'art_1', num: '1', text: 'a b' }]));
  });
});
