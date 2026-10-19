import { describe, it, expect, afterEach } from 'vitest';
import { foreignAffairsBoard } from './foreign-affairs';
import { applyNation } from '@/lib/nation/registry';

afterEach(() => applyNation({}));

describe('foreign affairs follows the nation', () => {
  it('uses the reference partners until the nation declares its own', () => {
    expect(JSON.stringify(foreignAffairsBoard(0))).toContain('Pacific Realm');
  });

  it('uses the nation\'s declared partners and memberships', () => {
    applyNation({ foreignAffairs: { partners: [{ name: 'Kenya', capital: 'Nairobi' }, { name: 'Tanzania', capital: 'Dodoma' }], memberships: ['United Nations', 'African Union'] } });
    const json = JSON.stringify(foreignAffairsBoard(0));
    expect(json).toContain('Kenya');
    expect(json).toContain('African Union');
    expect(json).not.toContain('Pacific Realm');
  });
});
