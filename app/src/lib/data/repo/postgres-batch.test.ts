// Go-live review L-6: the write-through sends one multi-row statement per run
// of same-topic records (and per WRITE_BATCH_ROWS), not one per record. The
// rows themselves are checked against a real database in
// postgres.integration.test.ts.
import { describe, it, expect } from 'vitest';
import { writeOps, WRITE_BATCH_ROWS, type Op, type Sql } from './postgres';

function recorder() {
  const calls: { text: string; params: unknown[] }[] = [];
  const sql = {
    unsafe: (text: string, params: unknown[] = []) => { calls.push({ text, params }); return Promise.resolve([]); },
    begin: async () => { throw new Error('not used'); },
  } as unknown as Sql;
  return { sql, calls };
}

const audit = (seq: number): Op => ({ topic: 'audit', data: { id: `AU-${seq}`, seq, at: '2026-10-19T00:00:00.000Z', actor: 'A', action: 'x', resource: 'r', outcome: 'ok', hash: `h${seq}`, prevHash: seq > 1 ? `h${seq - 1}` : null } as never });
const parcel = (n: number, state = 'proposed'): Op => ({ topic: 'parcel', data: { id: `PCL-${n}`, parcelId: `P/${n}`, state, landUse: 'residential', place: {}, areaM2: 100, bbox: [1, 2, 3, 4], geometry: { type: 'Polygon', coordinates: [] } } as never });

describe('batched write-through', () => {
  it('writes 50 parcels and their 50 audit entries in two statements', async () => {
    const { sql, calls } = recorder();
    const ops = [...Array.from({ length: 50 }, (_, i) => parcel(i + 1)), ...Array.from({ length: 50 }, (_, i) => audit(i + 1))];
    await writeOps(sql, ops, 'inst-1');
    expect(calls).toHaveLength(2);
    expect(calls[0]!.text).toMatch(/insert into civicos\.parcel/);
    expect(JSON.parse(calls[0]!.params[0] as string)).toHaveLength(50);
    expect(calls[1]!.text).toMatch(/insert into civicos\.audit_entry[\s\S]*order by x\.seq/);
    expect(calls[1]!.params[1]).toBe('inst-1');
    expect((JSON.parse(calls[1]!.params[0] as string) as { seq: number }[]).map(r => r.seq)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it('keeps the order between topics and splits long runs', async () => {
    const { sql, calls } = recorder();
    const n = WRITE_BATCH_ROWS + 5;
    await writeOps(sql, [audit(1), ...Array.from({ length: n }, (_, i) => parcel(i + 1)), audit(2)], 'i');
    expect(calls.map(c => /civicos\.(\w+)/.exec(c.text)![1])).toEqual(['audit_entry', 'parcel', 'parcel', 'audit_entry']);
    expect(JSON.parse(calls[2]!.params[0] as string)).toHaveLength(5);
  });

  it('a record changed twice in one flush is written once, as it stands last', async () => {
    const { sql, calls } = recorder();
    await writeOps(sql, [parcel(1), parcel(2), parcel(1, 'published')], 'i');
    const rows = JSON.parse(calls[0]!.params[0] as string) as { id: string; state: string; i: number }[];
    expect(rows.map(r => [r.id, r.state, r.i])).toEqual([['PCL-1', 'published', 0], ['PCL-2', 'proposed', 1]]);
  });
});
