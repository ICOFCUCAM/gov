import { describe, it, expect } from 'vitest';
import { nationOffices, REFERENCE_OFFICES } from './offices';
import type { SovereignProfile } from '@/lib/api/types';

const uganda: SovereignProfile = {
  stateName: 'The Republic of Uganda', stateForm: 'republic', executiveTitle: 'President',
  legislatureName: 'Parliament', currency: 'UGX', regionNoun: 'region', locale: 'en',
  constitution: { executiveSeat: 'State House', chambers: [{ name: 'Parliament of Uganda', seats: 529 }] },
};

describe('nation offices', () => {
  it('keeps the reference wording until setup is complete', () => {
    expect(nationOffices(uganda, false)).toEqual(REFERENCE_OFFICES);
  });

  it('names a republic\'s offices from its profile and constitution', () => {
    const o = nationOffices(uganda, true);
    expect(o.government).toBe('Government of the Republic of Uganda');
    expect(o.executiveOffice).toBe('Office of the President');
    expect(o.executiveSeat).toBe('State House');
    expect(o.primaryChamber).toBe('Parliament of Uganda');
    expect(o.upperChamber).toBeUndefined();
  });

  it('separates head of state and government in a monarchy', () => {
    const o = nationOffices({ ...uganda, stateName: 'Kingdom of Kivara', stateForm: 'monarchy', executiveTitle: 'Prime Minister', constitution: { headOfStateTitle: 'His Majesty the King' } }, true);
    expect(o.headOfState).toBe('His Majesty the King');
    expect(o.executiveOffice).toBe('Office of the Prime Minister');
    expect(o.upperChamber).toBe('Crown Council');
  });
});
