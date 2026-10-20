import { describe, it, expect, beforeEach } from 'vitest';
import { registerEvent, findMatches, amendPerson, adjudicate, getPerson, getEvent, searchPersons, eventCounts, resetCivil, current } from './register';

const birth = (x: Record<string, unknown> = {}) => ({ kind: 'birth' as const, date: '2026-09-01', place: { region: 'North', text: 'District hospital' }, case: `case-${Math.random()}`, child: { given: 'Amara', family: 'Okafor', sex: 'female' as const, mother: { given: 'Ngozi', family: 'Okafor' } }, ...x });

describe('civil register', () => {
  beforeEach(() => resetCivil());

  it('registers a birth with its own number and person record, never twice for one case', () => {
    const e = registerEvent(birth({ case: 'c1' }), 'Registrar');
    if ('error' in e) throw new Error(e.error);
    expect(e.registrationNumber).toBe('BR-2026-000001');
    expect(registerEvent(birth({ case: 'c1' }), 'Registrar')).toHaveProperty('error');
    const p = getPerson(e.persons[0]!.person)!;
    expect(p.identifiers).toEqual({ birthRegistration: 'BR-2026-000001' });
    expect(current(p)).toMatchObject({ names: { given: 'Amara', family: 'Okafor' }, status: 'alive', birth: { date: '2026-09-01' } });
    expect(getEvent('BR-2026-000001')?.case).toBe('c1');
    expect(registerEvent(birth({ date: '2999-01-01' }), 'R')).toHaveProperty('error');
  });

  it('finds possible duplicates, folding accents and case, and never merges them', () => {
    registerEvent(birth(), 'R');
    expect(findMatches({ given: 'AMARA', family: 'Okáfor', birthDate: '2026-09-01' })[0]).toMatchObject({ score: 1, registration: 'BR-2026-000001' });
    expect(findMatches({ given: 'Bola', family: 'Okafor', birthDate: '2026-09-01', motherFamily: 'okafor' })[0]?.score).toBe(0.7);
    expect(findMatches({ given: 'Bola', family: 'Adeyemi', birthDate: '2026-09-01' })).toEqual([]);
    const b = registerEvent(birth(), 'R') as { persons: { person: string }[] };
    const a = searchPersons({ family: 'okafor' });
    expect(a).toHaveLength(2);
    expect(adjudicate(a[0]!.id, b.persons[0]!.person, 'different', 'adj-1', 'Senior registrar')).toEqual({ ok: true });
    expect(getPerson(a[0]!.id)?.matching[0]).toMatchObject({ decided: 'different' });
  });

  it('registers deaths and marriages of persons in the register, and corrects by new versions', () => {
    const a = registerEvent(birth({ date: '1990-01-01' }), 'R') as { persons: { person: string }[] };
    const b = registerEvent(birth({ date: '1991-01-01', child: { given: 'Tunde', family: 'Bello', sex: 'male' } }), 'R') as { persons: { person: string }[] };
    const pa = a.persons[0]!.person, pb = b.persons[0]!.person;
    expect(registerEvent({ kind: 'marriage', date: '2020-05-05', place: {}, case: 'm1', spouses: [pa, pa] }, 'R')).toHaveProperty('error');
    expect(registerEvent({ kind: 'marriage', date: '2020-05-05', place: {}, case: 'm1', spouses: [pa, pb], form: 'civil' }, 'R')).toMatchObject({ registrationNumber: 'MR-2020-000001' });
    expect(amendPerson(pa, { names: { given: 'Amarachi', family: 'Okafor' } }, 'Spelling corrected from the hospital record', 'corr-1', 'R')).toMatchObject({ versions: [{ n: 1 }, { n: 2, names: { given: 'Amarachi' } }] });
    expect(registerEvent({ kind: 'death', date: '2025-01-01', place: { region: 'North' }, case: 'd1', deceased: pb }, 'R')).toMatchObject({ registrationNumber: 'DR-2025-000001' });
    expect(current(getPerson(pb)!).status).toBe('deceased');
    expect(registerEvent({ kind: 'death', date: '2025-01-02', place: {}, case: 'd2', deceased: pb }, 'R')).toHaveProperty('error');
    expect(eventCounts('birth').map(x => [x.month, x.region, x.count])).toEqual([['1990-01', 'North', 1], ['1991-01', 'North', 1]]);
  });
});
