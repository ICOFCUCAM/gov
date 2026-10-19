import { describe, it, expect, afterEach } from 'vitest';
import { constitutionFor } from './constitution';
import { senateBoard } from './senate-engine';
import { assemblyBoard } from './assembly-engine';
import { applyNation } from '@/lib/nation/registry';

afterEach(() => applyNation({}));

describe('national constitution over the form-of-state template', () => {
  it('returns the template unchanged when the nation supplies nothing', () => {
    expect(constitutionFor('republic', null)).toEqual(constitutionFor('republic'));
  });

  it('applies a unicameral legislature, courts and head of state', () => {
    const m = constitutionFor('republic', {
      headOfStateTitle: 'President of the Republic',
      chambers: [{ name: 'Parliament', seats: 529 }],
      judicialApex: 'Supreme Court',
      emergencyDoctrine: 'State of emergency declared by the President, approved by Parliament within 14 days',
    });
    expect(m.legislature.structure).toBe('unicameral');
    expect(m.legislature.chambers).toEqual([expect.objectContaining({ name: 'Parliament', seats: 529 })]);
    expect(m.authorityChain[0]!.office).toBe('President of the Republic');
    expect(m.judicialApex).toBe('Supreme Court');
    expect(m.branches.find(b => b.key === 'judiciary')!.bodies[0]!.name).toBe('Supreme Court');
    const leg = m.branches.find(b => b.key === 'legislature')!;
    expect(leg.bodies[0]!.name).toBe('Parliament');
    expect(leg.bodies.some(b => b.name === 'Senate')).toBe(false);
    expect(m.emergencyDoctrine).toContain('14 days');
  });

  it('ignores incomplete chambers', () => {
    const m = constitutionFor('republic', { chambers: [{ name: '', seats: 10 }] });
    expect(m.legislature).toEqual(constitutionFor('republic').legislature);
  });
});

describe('chamber engines follow the national constitution', () => {
  it('sizes both chambers from the nation, with blocs summing exactly', () => {
    applyNation({ constitution: { chambers: [{ name: 'National Assembly', seats: 349 }, { name: 'Senate', seats: 67 }] } });
    const a = assemblyBoard(0), s = senateBoard(0);
    expect(a.totalMembers).toBe(349);
    expect(a.blocs.reduce((n, b) => n + b.seats, 0)).toBe(349);
    expect(s.totalSenators).toBe(67);
    expect(s.blocs.reduce((n, b) => n + b.seats, 0)).toBe(67);
  });

  it('keeps reference sizes before a nation declares its chambers', () => {
    expect(assemblyBoard(0).totalMembers).toBe(420);
    expect(senateBoard(0).totalSenators).toBe(84);
    expect(senateBoard(0).blocs.reduce((n, b) => n + b.seats, 0)).toBe(84);
  });
});
