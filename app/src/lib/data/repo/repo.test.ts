import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { AuditEntry } from '@/lib/api/types';
import type { TwinDb } from '@/lib/twin/db';
import type { Observation } from '@/lib/twin/register';
import { resetTwin, syncRegister, registerSource, runSource, withdrawRun, linkKey, stateAsOf } from '@/lib/twin/register';
import { applyNation } from '@/lib/nation/registry';
import { recordAudit, listAudit, verifyAuditChain } from '@/lib/data/store';
import { memoryAudit, memoryBackend, memoryBoundaries, memoryFacilities, memoryTwin } from './memory';
import { backend, useBackend, type Backend } from '.';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
const twin = (): TwinDb => ({ entities: {}, keys: [], sources: [], runs: [], observations: [], seq: 1, metrics: {} });
const obs = (o: Partial<Observation>): Observation => ({ entityId: 'place:A', metric: 'population', value: 1, unit: '{persons}', validFrom: '2020-01-01', recordedAt: '2021-01-01T00:00:00.000Z', sourceId: 'SRC-1', runId: 'RUN-1', ...o });

describe('the persistence port, memory implementation', () => {
  it('appends audit entries and tells the caller once each is durable', () => {
    const chain: AuditEntry[] = [];
    const repo = memoryAudit(() => chain);
    const seen: number[] = [];
    repo.append({ id: 'AU-1', at: 't', actor: 'a', action: 'x', resource: 'r', outcome: 'ok', seq: 1, prevHash: null, hash: 'h1' }, e => seen.push(e.seq));
    expect(repo.head()?.hash).toBe('h1');
    expect(repo.entries()).toBe(chain);
    expect(seen).toEqual([1]);
  });

  it('keeps the twin read model exactly as the register did', () => {
    const d = twin();
    const repo = memoryTwin(() => d);
    expect([repo.nextSeq(), repo.nextSeq()]).toEqual([1, 2]);
    repo.putEntity({ id: 'place:A', kind: 'place', name: 'A' });
    repo.addKey({ entityId: 'place:A', system: 'knbs', key: '01' });
    repo.addKey({ entityId: 'place:A', system: 'knbs', key: '01' });
    expect(d.keys).toHaveLength(1);
    repo.addRun({ id: 'RUN-1', sourceId: 'SRC-1', at: 't1', by: 'x', status: 'ok', rows: 1, accepted: 1, rejected: [] });
    repo.addRun({ id: 'RUN-2', sourceId: 'SRC-1', at: 't2', by: 'x', status: 'ok', rows: 1, accepted: 1, rejected: [] });
    expect(d.runs.map(r => r.id)).toEqual(['RUN-2', 'RUN-1']);
    repo.addObservations([obs({}), obs({ runId: 'RUN-2', value: 2 })]);
    expect(repo.supersedeRun('RUN-1', '2022-01-01T00:00:00.000Z')).toBe(1);
    expect(repo.supersedeRun('RUN-1', '2023-01-01T00:00:00.000Z')).toBe(0);
    expect(d.observations[0]!.supersededAt).toBe('2022-01-01T00:00:00.000Z');
  });

  it('numbers and adds facility and boundary records', () => {
    const fs = { facilities: [] as never[], seq: 7 };
    const f = memoryFacilities(() => fs);
    expect(f.nextSeq()).toBe(7);
    f.add({ id: 'FAC-00007' } as never);
    expect(f.list()).toHaveLength(1);
    const bs = { versions: [] as never[], seq: 1 };
    const b = memoryBoundaries(() => bs);
    b.add({ id: 'bnd-0001' } as never);
    expect(b.versions()).toHaveLength(1);
    expect(b.nextSeq()).toBe(1);
  });

  it('is the default backend', () => {
    expect(backend().name).toBe('memory');
  });
});

describe('domain functions change state only through the port', () => {
  const calls: string[] = [];
  let prev: Backend;
  // A backend that records every change and then does what memory does.
  const recording: Backend = {
    name: 'memory',
    audit: chain => { const m = memoryAudit(chain); return { ...m, append: (e, c) => { calls.push(`audit:${e.action}`); m.append(e, c); } }; },
    twin: state => {
      const m = memoryTwin(state);
      const rec = <K extends keyof typeof m>(k: K) => ((...a: unknown[]) => { calls.push(`twin:${String(k)}`); return (m[k] as (...x: unknown[]) => unknown)(...a); }) as (typeof m)[K];
      return { ...m, nextSeq: rec('nextSeq'), putEntity: rec('putEntity'), putEntities: rec('putEntities'), addKey: rec('addKey'), addSource: rec('addSource'), saveSource: rec('saveSource'), addRun: rec('addRun'), saveRun: rec('saveRun'), addObservations: rec('addObservations'), supersedeRun: rec('supersedeRun') };
    },
    facilities: memoryBackend.facilities,
    boundaries: memoryBackend.boundaries,
    parcels: memoryBackend.parcels,
  };
  beforeEach(async () => {
    prev = useBackend(recording);
    calls.length = 0;
    resetTwin();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
  });
  afterEach(() => { useBackend(prev === memoryBackend ? null : prev); });

  it('registers, imports, links and withdraws through the twin and audit repositories', async () => {
    expect(calls).toContain('twin:putEntities');
    calls.length = 0;
    const s = ok(registerSource({ by: 'Director', name: 'Census', publisher: 'KNBS', kind: 'csv-upload', mapping: { entity: 'region', value: 'value', metric: { fixed: 'population' }, unit: { fixed: 'persons' }, date: { column: 'year' } } }));
    expect(calls).toEqual(['twin:nextSeq', 'twin:addSource', 'audit:twin.source.register']);
    calls.length = 0;
    const run = ok(await runSource(s.id, { by: 'Director', csv: 'region,value,year\nMombasa,1208333,2019\nKisumu,1155574,2019\n' }));
    expect(calls).toEqual(['twin:nextSeq', 'twin:addObservations', 'twin:saveSource', 'twin:addRun', 'audit:twin.source.run']);
    expect(stateAsOf({ metric: 'population' })).toHaveLength(2);
    calls.length = 0;
    ok(linkKey('place:KE-28', 'knbs', '001', 'Director'));
    expect(calls).toEqual(['twin:addKey', 'audit:twin.key.link']);
    calls.length = 0;
    expect(ok(withdrawRun(run.id, 'Director', 'wrong file'))).toMatchObject({ superseded: 2 });
    expect(calls).toEqual(['twin:supersedeRun', 'twin:saveRun', 'audit:twin.run.withdraw']);
    expect(stateAsOf({ metric: 'population' })).toHaveLength(0);
  });

  it('keeps the audit chain intact through the port', () => {
    recordAudit('Registrar', 'test.port', 'Port:1', 'ok');
    expect(calls).toContain('audit:test.port');
    expect(listAudit()[0]).toMatchObject({ action: 'test.port' });
    expect(verifyAuditChain().ok).toBe(true);
  });
});
