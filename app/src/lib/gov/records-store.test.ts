import { describe, it, expect } from 'vitest';
import { records, fileRecord, advanceRecord, nationalRecords, version, STAGE_ORDER } from './records-store';

describe('records-store', () => {
  it('seeds a deterministic non-empty register with valid stages', () => {
    const a = records('HEALTH', 'HSP-1', 'clinical record', 1_000_000);
    expect(a.length).toBeGreaterThanOrEqual(2);
    expect(a.every(r => STAGE_ORDER.includes(r.stage))).toBe(true);
    expect(a.every(r => r.ref.startsWith('HSP-1-'))).toBe(true);
  });

  it('files a record at CAPTURED and walks it up the chain', () => {
    const v0 = version();
    fileRecord('INTERIOR', 'STN-2', 'Field report', 'Officer K', 'case file', 2_000_000);
    expect(version()).toBeGreaterThan(v0);
    let list = records('INTERIOR', 'STN-2', 'case file', 2_000_000);
    const mine = list.find(r => r.byActor === 'Officer K')!;
    expect(mine.stage).toBe('captured');
    advanceRecord('INTERIOR', 'STN-2', mine.id, 2_000_000);
    list = records('INTERIOR', 'STN-2', 'case file', 2_000_000);
    expect(list.find(r => r.id === mine.id)!.stage).toBe('held');
  });

  it('does not advance past synced', () => {
    fileRecord('TRADE', 'TRD-9', 'Licence', 'Trade officer', 'licence record', 3_000_000);
    const list = records('TRADE', 'TRD-9', 'licence record', 3_000_000);
    const r = list.find(x => x.byActor === 'Trade officer')!;
    for (let i = 0; i < 8; i++) advanceRecord('TRADE', 'TRD-9', r.id, 3_000_000);
    expect(records('TRADE', 'TRD-9', 'licence record', 3_000_000).find(x => x.id === r.id)!.stage).toBe('synced');
  });

  it('nationalRecords only surfaces rolled or synced records, newest last', () => {
    fileRecord('ENERGY', 'GRD-3', 'Grid sync', 'Engineer', 'grid log', 4_000_000);
    const list = records('ENERGY', 'GRD-3', 'grid log', 4_000_000);
    const r = list.find(x => x.byActor === 'Engineer')!;
    advanceRecord('ENERGY', 'GRD-3', r.id, 4_000_000); // held
    advanceRecord('ENERGY', 'GRD-3', r.id, 4_000_000); // committed
    advanceRecord('ENERGY', 'GRD-3', r.id, 4_000_000); // rolled
    const nat = nationalRecords(50);
    expect(nat.every(n => n.rec.stage === 'rolled' || n.rec.stage === 'synced')).toBe(true);
    expect(nat.some(n => n.rec.id === r.id)).toBe(true);
    for (let i = 1; i < nat.length; i++) expect(nat[i]!.rec.at).toBeGreaterThanOrEqual(nat[i - 1]!.rec.at);
  });
});
