import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ENGINE_METRICS, ENGINE_METRIC_IDS } from './engine-metrics';
import { primeTwin, resetTwinRead } from './read';
import { registerMetric, STANDARD_METRICS, isUcum } from './metrics';
import { resetTwin } from './register';
import { applyNation } from '@/lib/nation/registry';
import { communicationsBoard } from '@/lib/gov/communications-continuity';
import { justiceOps } from '@/lib/gov/justice-systems';
import { prisonCoordination } from '@/lib/gov/judicial-operations';
import { budgetOps, revenueOps, fiscalCommand } from '@/lib/gov/treasury-systems';
import { patientServices } from '@/lib/gov/health-systems';

const nation = (value: number, unit: string) => ({ observations: [{ entityId: 'nation:KEN', value, unit, validFrom: '2025-01-01', sourceId: 'SRC-1' }], national: { value, unit, source: 'Statistics office', asOf: '2025-01-01', kind: 'observed' } });

function fakeTwin(state: Record<string, unknown>) {
  return async (url: string) => {
    const body = url.startsWith('/api/twin/entities') ? { entities: [{ id: 'place:KE-28', name: 'Mombasa', region: true }, { id: 'place:KE-30', name: 'Nairobi City', region: true }] }
      : url.startsWith('/api/twin/sources') ? { sources: [{ id: 'SRC-1', name: 'Statistics office' }] }
      : state[new URL(url, 'http://x').searchParams.get('metric') ?? ''] ?? { observations: [], national: null };
    return { ok: true, json: async () => body };
  };
}

describe('engine figures read from the twin', () => {
  beforeEach(() => { resetTwinRead(); resetTwin(); applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City'] }); });
  afterEach(() => resetTwinRead());

  it('each has a definition the nation can register (UCUM unit, aggregation, period)', () => {
    expect(new Set(ENGINE_METRIC_IDS).size).toBe(ENGINE_METRIC_IDS.length);
    for (const e of ENGINE_METRICS) {
      expect(isUcum(e.unit), e.id).toBe(true);
      if (e.standard) { expect(STANDARD_METRICS.find(m => m.id === e.id)?.unit, e.id).toBe(e.unit); continue; }
      const r = registerMetric({ by: 'Statistician', id: e.id, label: e.label, unit: e.unit, aggregation: e.aggregation, weightMetric: e.weightMetric, period: e.period });
      expect(r, e.id).not.toHaveProperty('error');
    }
  });

  it('every listed engine reads its metric through the twin read API', () => {
    for (const e of ENGINE_METRICS) for (const where of e.engines) {
      const file = path.join(__dirname, '..', 'gov', where.split(' · ')[0]!);
      expect(readFileSync(file, 'utf8'), `${where} reads ${e.id}`).toContain(`readTwinValue('${e.id}'`);
    }
  });

  it('engines keep their shapes and samples until the twin answers, then show the observed figures', async () => {
    const t = 1000, now = 4000 * t;
    const before = { comms: communicationsBoard(now), justice: justiceOps('min-justice', t), prison: prisonCoordination('judiciary', t), budget: budgetOps('treasury', t), revenue: revenueOps('treasury', t), fiscal: fiscalCommand('treasury', t), health: patientServices('min-health', t) };
    // Deterministic without the twin.
    expect(budgetOps('treasury', t)).toEqual(before.budget);
    await primeTwin([...ENGINE_METRIC_IDS], fakeTwin({
      households: { observations: [{ entityId: 'place:KE-30', value: 1_506_888, unit: '{households}', validFrom: '2019-01-01', sourceId: 'SRC-1' }], national: null },
      'corrections.population': nation(54_000, '{persons}'),
      'corrections.capacity': nation(60_000, '{places}'),
      'budget.execution_rate': nation(71.4, '%'),
      'revenue.collection_rate': nation(88, '%'),
      'revenue.taxpayers': nation(7_340_000, '{taxpayers}'),
      'fiscal.debt_to_gdp': nation(68, '%'),
      'health.insurance_coverage': nation(27, '%'),
    }));
    const comms = communicationsBoard(now);
    expect(Object.keys(comms.command.regions[0]!)).toEqual(Object.keys(before.comms.command.regions[0]!));
    expect(comms.command.regions.find(r => r.region === 'Nairobi City')!.households).toBe(1_506_888);
    expect(comms.command.regions.find(r => r.region === 'Mombasa')!.households).toBe(before.comms.command.regions.find(r => r.region === 'Mombasa')!.households);
    expect(justiceOps('min-justice', t).corrections).toMatchObject({ population: 54_000, capacity: 60_000, occupancyPct: 90 });
    expect(prisonCoordination('judiciary', t)).toMatchObject({ population: 54_000, capacity: 60_000, occupancyPct: 90 });
    expect(budgetOps('treasury', t).executionPct).toBe(71);
    expect(revenueOps('treasury', t)).toMatchObject({ collectionRatePct: 88, taxpayersM: 7.3 });
    expect(fiscalCommand('treasury', t).debtToGdp).toBe(68);
    expect(patientServices('min-health', t).insuranceCoverage).toBe(27);
    expect(Object.keys(budgetOps('treasury', t))).toEqual(Object.keys(before.budget));
  });
});
