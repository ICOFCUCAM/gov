import { describe, it, expect } from 'vitest';
import { relationRows, relationsOf, RELATION_LABEL } from './relations';
import { RELATION_KINDS } from './register';

describe('how laws relate', () => {
  const list = [
    { id: '/eli/a', title: 'Act A', relations: [] },
    { id: '/eli/b', title: 'Amending Act B', relations: [{ kind: 'amends' as const, target: '/eli/a', at: '2026-01-01', by: 'Clerk' }] },
    { id: '/eli/r', title: 'Regulation R', relations: [{ kind: 'implements' as const, target: '/eli/a', by: 'Clerk' }] },
  ];

  it('labels every relation kind both ways', () => {
    expect(Object.keys(RELATION_LABEL).sort()).toEqual([...RELATION_KINDS].sort());
  });

  it('lists each relation from the law that states it, with the other law\'s title', () => {
    expect(relationRows(list)).toEqual([
      { from: '/eli/b', fromTitle: 'Amending Act B', kind: 'amends', to: '/eli/a', toTitle: 'Act A', at: '2026-01-01', by: 'Clerk' },
      { from: '/eli/r', fromTitle: 'Regulation R', kind: 'implements', to: '/eli/a', toTitle: 'Act A', by: 'Clerk' },
    ]);
  });

  it('reads one law\'s relations both ways', () => {
    const rows = relationRows(list);
    expect(relationsOf('/eli/a', rows).map(r => `${r.phrase} ${r.otherTitle}`)).toEqual(['is amended by Amending Act B', 'is implemented by Regulation R']);
    expect(relationsOf('/eli/b', rows).map(r => `${r.phrase} ${r.otherTitle}`)).toEqual(['amends Act A']);
  });
});
