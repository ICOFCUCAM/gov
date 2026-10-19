import { describe, it, expect } from 'vitest';
import { estimate, sizing, adjust, defaultQuestionnaire, validateQuestionnaire, HOSTING_MODEL } from './hosting-model';

const q = defaultQuestionnaire({ population: 5_000_000, activeUsers: 250_000, services: 40, availability: 99.9, existingFacility: 'partial' });
const total = (lines: { amount: number }[]) => lines.reduce((s, l) => s + l.amount, 0);

describe('sizing', () => {
  it('follows the documented formula', () => {
    const S = HOSTING_MODEL.sizing;
    const s = sizing(q);
    // (64 + 250 × 0.8 + 40 × 2) × 1.2 (99.9%) × 1.5 headroom = 619.2 → 620
    expect(s.vcpu).toBe(Math.ceil((S.baseVcpu + 250 * S.vcpuPer1000ActiveUsers + 40 * S.vcpuPerService) * 1.2 * S.headroom));
    expect(s.vcpu).toBe(620);
    expect(s.ramGb).toBe(620 * S.ramGbPerVcpu);
    // (5M × 2 MB + 250k × 50 MB) / 1e6 = 22.5 TB × 3 copies × 1.5 = 101.25 → 102
    expect(s.storageTb).toBe(102);
    expect(s.nodes).toBe(10);
    expect(s.racks).toBe(2);
    expect(s.tier).toBe('Tier III-class');
  });

  it('scales with availability and users', () => {
    expect(sizing({ ...q, availability: 99.99 }).vcpu).toBeGreaterThan(sizing(q).vcpu);
    expect(sizing({ ...q, availability: 99.99 }).tier).toBe('Tier IV-class');
    expect(sizing({ ...q, activeUsers: 2_000_000 }).vcpu).toBeGreaterThan(sizing(q).vcpu);
  });
});

describe('estimates', () => {
  it('totals equal the sum of their lines, and five years = capex + 5 × annual', () => {
    for (const path of ['sovereign-dc', 'other-cloud', 'hosted', 'perpetual'] as const) {
      const e = estimate(path, q);
      expect(e.capexTotal).toBe(total(e.capex));
      expect(e.annualTotal).toBe(total(e.annual));
      expect(e.fiveYearTotal).toBe(e.capexTotal + 5 * e.annualTotal);
      expect(e.totalWeeks.min).toBe(e.timeline.reduce((s, p) => s + p.minWeeks, 0));
      expect(e.timeline.every(p => p.minWeeks <= p.maxWeeks)).toBe(true);
      expect(e.assumptions.join(' ')).toMatch(/estimate/i);
      expect(e.capex.every(l => l.basis.length > 0) && e.annual.every(l => l.basis.length > 0)).toBe(true);
    }
  });

  it('sovereign data centre: six phases, primary + DR, staffing, Tier III target', () => {
    const e = estimate('sovereign-dc', q);
    expect(e.timeline.map(p => p.phase)).toEqual(['Site readiness', 'Procurement', 'Build and install', 'Platform deployment', 'Data migration', 'Acceptance and handover']);
    expect(e.sizing!.sites).toHaveLength(2);
    expect(e.sizing!.tier).toBe('Tier III-class');
    expect(e.capex.map(l => l.label)).toEqual(expect.arrayContaining(['Facility (primary and DR site)', 'Hardware (compute and storage)', 'Network', 'Security', 'Deployment services']));
    expect(e.annual.map(l => l.label)).toEqual(expect.arrayContaining(['Power and cooling', 'Staff', 'Hardware maintenance', 'Connectivity', 'Platform licences and support']));
    expect(e.staffing!.length).toBeGreaterThan(2);
    // Hardware: 10 nodes × 38,000 + 102 TB × 450 = 425,900; plus DR at 70% = 724,030
    expect(e.capex.find(l => l.label.startsWith('Hardware'))!.amount).toBe(724_030);
  });

  it('a new facility and unstable power cost more and take longer', () => {
    const base = estimate('sovereign-dc', q);
    const harder = estimate('sovereign-dc', { ...q, existingFacility: 'none', power: 'unstable' });
    expect(harder.capexTotal).toBeGreaterThan(base.capexTotal);
    expect(harder.annualTotal).toBeGreaterThan(base.annualTotal);
    expect(harder.totalWeeks.max).toBeGreaterThan(base.totalWeeks.max);
  });

  it('another cloud: compatibility, residency fit and landing zone', () => {
    const ok = estimate('other-cloud', q);
    expect(ok.compatibility!.every(c => c.status === 'ready')).toBe(true);
    expect(ok.residencyFit!.fits).toBe(true);
    expect(ok.landingZone!.length).toBeGreaterThan(3);
    const bad = estimate('other-cloud', { ...q, cloudRegionInCountry: false, capabilities: { kubernetes: false, managedPostgres: false, objectStorage: true, kms: false } });
    expect(bad.residencyFit!.fits).toBe(false);
    expect(bad.compatibility!.find(c => c.item === 'Kubernetes')!.status).toBe('missing');
    expect(bad.risks.join(' ')).toMatch(/Residency does not fit/);
    expect(bad.capex.some(l => /HSM/.test(l.label))).toBe(true);
  });

  it('hosted: per-year pricing, 5-year prepaid at the published discount', () => {
    const P = HOSTING_MODEL.hosted.plans.enterprise;
    const yearly = estimate('hosted', { ...q, plan: 'enterprise', term: 1 });
    expect(yearly.subscription!.annual).toBe(Math.round(P.base + 5_000_000 * P.perCitizen));
    const five = estimate('hosted', { ...q, plan: 'enterprise', term: 5 });
    expect(five.subscription!.discountPct).toBe(HOSTING_MODEL.hosted.fiveYearDiscountPct);
    expect(five.subscription!.annual).toBe(Math.round((P.base + 5_000_000 * P.perCitizen) * 0.85));
    expect(five.subscription!.termTotal).toBe(five.subscription!.annual * 5);
  });

  it('perpetual: licence once, optional support and updates, and independence stated', () => {
    const L = HOSTING_MODEL.perpetual;
    const e = estimate('perpetual', q);
    const lic = Math.round(L.base + 5_000_000 * L.perCitizen);
    expect(e.licence!.perpetual).toBe(lic);
    expect(e.licence!.supportAnnual).toBe(Math.round(lic * L.supportPct));
    expect(e.licence!.independent).toMatch(/entirely on your own/);
    const bare = estimate('perpetual', { ...q, support: false, updates: false });
    expect(bare.annualTotal).toBe(0);
  });

  it('converts at the contract rate', () => {
    const usd = estimate('hosted', q);
    const local = estimate('hosted', q, 3700, 'UGX');
    expect(local.currency).toBe('UGX');
    expect(local.annualTotal).toBe(Math.round(usd.annualTotal * 3700));
  });

  it('switching paths adds a migration plan with export and no-lock-in guarantees', () => {
    const e = estimate('sovereign-dc', q, 1, 'USD', 'hosted');
    expect(e.migration!.from).toBe('hosted');
    expect(e.migration!.guarantees.join(' ')).toMatch(/data export/i);
    expect(e.migration!.guarantees.join(' ')).toMatch(/No lock-in/);
    expect(estimate('hosted', q, 1, 'USD', 'hosted').migration).toBeUndefined();
  });

  it('engineering adjustments rescale consistently', () => {
    const e = estimate('sovereign-dc', q);
    const a = adjust(e, { capexFactor: 1.1, annualFactor: 0.9, timelineFactor: 1.2 });
    expect(a.capexTotal).toBe(total(a.capex));
    expect(Math.abs(a.capexTotal - e.capexTotal * 1.1)).toBeLessThan(a.capex.length);
    expect(a.fiveYearTotal).toBe(a.capexTotal + 5 * a.annualTotal);
    expect(a.adjustments).toEqual({ capexFactor: 1.1, annualFactor: 0.9, timelineFactor: 1.2 });
  });

  it('validates the questionnaire', () => {
    expect(validateQuestionnaire(q)).toEqual([]);
    expect(validateQuestionnaire({ ...q, population: 10 })).not.toEqual([]);
    expect(validateQuestionnaire({ ...q, activeUsers: 9_000_000 })).not.toEqual([]);
    expect(validateQuestionnaire({ ...q, availability: 120 })).not.toEqual([]);
  });
});
