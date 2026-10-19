import { describe, it, expect } from 'vitest';
import { setSovereign, getSession, listBills, listReceipts, listIncidents, listPermits } from './store';

describe('demo data follows the installed nation', () => {
  it('starts nation-neutral: reference places, USD, a neutral rail', () => {
    expect(getSession().citizen?.municipality).toBe('Capital District');
    expect(listBills().every(b => b.currency === 'USD')).toBe(true);
    expect(listReceipts()[0]!.rail).toBe('Mobile Money');
  });

  it('rewrites places, currency and payment rail when the nation is set', () => {
    setSovereign({ regions: ['Central', 'Eastern', 'Northern', 'Western'], currency: 'UGX', paymentRail: 'MTN MoMo' }, 'test');
    expect(getSession().citizen?.municipality).toBe('Central');
    expect(listPermits().find(p => p.id === 'PM-4F21')?.municipality).toBe('Central');
    expect(listBills().filter(b => b.id.startsWith('BL-900')).every(b => b.currency === 'UGX')).toBe(true);
    expect(listReceipts().find(r => r.id === 'PR-3001')).toMatchObject({ currency: 'UGX', rail: 'MTN MoMo' });
    expect(JSON.stringify(listIncidents())).not.toMatch(/Garissa|Kiambu|Nairobi/);

    // A second change maps from the current names, not the original ones.
    setSovereign({ regions: ['Kampala', 'Jinja', 'Gulu'] }, 'test');
    expect(getSession().citizen?.municipality).toBe('Kampala');
  });
});
