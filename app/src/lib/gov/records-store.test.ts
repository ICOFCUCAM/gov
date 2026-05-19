import { describe, it, expect } from 'vitest';
import { records, fileRecord, advanceRecord, version, STAGE_ORDER } from './records-store';

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
});
