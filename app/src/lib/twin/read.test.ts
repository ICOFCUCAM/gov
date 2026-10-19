import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readTwin, readTwinValue, primeTwin, resetTwinRead, figureFrom } from './read';
import { twinFigure } from './read-server';
import { resetTwin, syncRegister, registerSource, runSource } from './register';
import { applyNation } from '@/lib/nation/registry';
import { nationalRegions } from '@/lib/gov/regions';
import { agricultureRuralBoard } from '@/lib/gov/agriculture-rural';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

/** A stand-in for the platform's twin endpoints. */
function fakeTwin(state: Record<string, unknown>) {
  const calls: string[] = [];
  const fetcher = async (url: string) => {
    calls.push(url);
    const body = url.startsWith('/api/twin/entities') ? { entities: [{ id: 'place:KE-28', name: 'Mombasa', region: true }, { id: 'place:KE-30', name: 'Nairobi City', region: true }, { id: 'place:KE-17', name: 'Kisumu', region: true }] }
      : url.startsWith('/api/twin/sources') ? { sources: [{ id: 'SRC-1', name: 'Census 2019' }] }
      : state[new URL(url, 'http://x').searchParams.get('metric') ?? ''];
    return { ok: !!body, json: async () => body };
  };
  return { fetcher, calls };
}

describe('the twin read API for client engines', () => {
  beforeEach(() => {
    resetTwinRead();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
  });
  afterEach(() => resetTwinRead());

  it('falls back to the engine\'s value, marked sample, until the twin is read', () => {
    expect(readTwin('population', 4_200_000, { region: 'Mombasa' })).toEqual({ value: 4_200_000, kind: 'sample', source: expect.stringMatching(/Reference model/) });
    expect(figureFrom({ value: null, source: 'Not combined', kind: 'unavailable' }, 7).kind).toBe('sample');
  });

  it('serves observed values by region and nationally once primed, with their source', async () => {
    const { fetcher, calls } = fakeTwin({
      population: {
        observations: [{ entityId: 'place:KE-28', value: 1_208_333, unit: '{persons}', validFrom: '2019-01-01', sourceId: 'SRC-1' }],
        national: { value: 47_564_296, unit: '{persons}', source: 'Census 2019', asOf: '2019-01-01', kind: 'observed' },
      },
    });
    await primeTwin(['population'], fetcher);
    expect(readTwin('population', 1, { region: 'mombasa' })).toEqual({ value: 1_208_333, unit: '{persons}', kind: 'observed', source: 'Census 2019', asOf: '2019-01-01' });
    expect(readTwin('population', 1, { region: 'Kisumu' }).kind).toBe('sample');
    expect(readTwin('population', 1)).toMatchObject({ value: 47_564_296, kind: 'observed' });
    expect(readTwin('population', 1, { region: 'Mombasa', scale: 1e6, unit: 'M' })).toMatchObject({ value: 1.208333, unit: 'M' });
    await primeTwin(['population'], fetcher);
    expect(calls.filter(c => c.startsWith('/api/twin/state'))).toHaveLength(1);
  });

  it('keeps the engines\' exported shapes and uses observed population where the twin has it', async () => {
    const t = 1000;
    const before = nationalRegions(t);
    const zonesBefore = agricultureRuralBoard(4000 * t).rural.zones;
    const { fetcher } = fakeTwin({ population: { observations: [{ entityId: 'place:KE-30', value: 4_397_073, unit: '{persons}', validFrom: '2019-01-01', sourceId: 'SRC-1' }], national: null } });
    await primeTwin(['population'], fetcher);
    const after = nationalRegions(t);
    expect(Object.keys(after[0]!)).toEqual(Object.keys(before[0]!));
    expect(after.find(r => r.name === 'Nairobi City')!.populationM).toBe(4.4);
    expect(after.find(r => r.name === 'Mombasa')!.populationM).toBe(before.find(r => r.name === 'Mombasa')!.populationM);
    const zones = agricultureRuralBoard(4000 * t).rural.zones;
    expect(zones.find(z => z.region === 'Nairobi City')!.population).toBe(4_397_073);
    expect(zones.find(z => z.region === 'Kisumu')!.population).toBe(zonesBefore.find(z => z.region === 'Kisumu')!.population);
  });
});

describe('the server read', () => {
  it('reads the register with the same rule', async () => {
    resetTwin();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
    expect(await twinFigure('population', 123)).toMatchObject({ value: 123, kind: 'sample' });
    const s = ok(registerSource({ by: 'D', name: 'Census 2019', publisher: 'KNBS', kind: 'csv-upload', mapping: { entity: 'region', value: 'value', metric: { fixed: 'population' }, date: { column: 'year' } } }));
    await runSource(s.id, { by: 'D', csv: 'region,value,year\nMombasa,1,2019\n' });
    expect(await twinFigure('population', 123)).toMatchObject({ value: 123, kind: 'sample' });
    expect(await twinFigure('population', 123, { entityId: 'place:KE-28' })).toMatchObject({ value: 1, kind: 'observed', source: 'Census 2019' });
    await runSource(s.id, { by: 'D', csv: 'region,value,year\nNairobi City,2,2019\nKisumu,3,2019\n' });
    expect(await twinFigure('population', 123)).toMatchObject({ value: 6, kind: 'observed' });
    expect(readTwinValue('population', 9)).toBe(9);
  });
});
