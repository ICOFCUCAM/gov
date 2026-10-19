import { describe, it, expect, beforeEach } from 'vitest';
import { resetTwin, syncRegister, registerSource, runSource, stateAsOf, dueSources, getRun, withdrawRun, type TwinRun, type TwinSource } from './register';
import { registerMetric } from './metrics';
import { checkStreamSpec, streamRows, STREAM_SAMPLE_LIMIT, type TelemetryReader } from './stream';
import { runProv } from './prov';
import { applyNation } from '@/lib/nation/registry';
import { listAudit } from '@/lib/data/store';
import type { TelemetrySampleRow, TelemetryStreamRow } from '@/lib/db/types';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

const stream: TelemetryStreamRow = {
  id: 'u1', stream_id: 'grid.load.nairobi', charter_id: 'energy', facility_id: null, label: 'Nairobi grid load', unit: 'MW', aggregation: 'instantaneous',
  retention_days: 365, warn_threshold: null, alert_threshold: null, active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};
/** A mocked substrate telemetry repo: samples every 6 hours, value = day number × 10 + hour / 6. */
function mockTelemetry(days: string[], extra: TelemetrySampleRow[] = []): TelemetryReader & { calls: { from: string; to: string }[] } {
  const samples: TelemetrySampleRow[] = [...days.flatMap(d => [0, 6, 12, 18].map(h => ({
    id: `${d}-${h}`, stream_id: stream.stream_id, ts: `${d}T${String(h).padStart(2, '0')}:00:00Z`, value: Number(d.slice(8)) * 10 + h / 6, facility_id: null, meta: {},
  }))), ...extra];
  const calls: { from: string; to: string }[] = [];
  return {
    calls,
    stream: async id => (id === stream.stream_id ? stream : null),
    samples: async (id, from, to, limit) => { calls.push({ from, to }); return samples.filter(s => s.stream_id === id && s.ts >= from && s.ts < to).sort((a, b) => (a.ts < b.ts ? -1 : 1)).slice(0, limit); },
  };
}

describe('telemetry stream specifications', () => {
  beforeEach(() => { resetTwin(); registerMetric({ by: 'A', id: 'grid.load_mean', label: 'Mean load', unit: 'MW', aggregation: 'sum', period: 'day' }); });

  it('accepts a stream id or its SensorThings Datastream, with registered metrics and statistics', () => {
    expect(checkStreamSpec({ datastream: "Datastreams('telemetry:grid.load.nairobi')", metrics: [{ metric: 'grid.load_mean', statistic: 'mean' }] }))
      .toEqual({ streamId: 'grid.load.nairobi', metrics: [{ metric: 'grid.load_mean', statistic: 'mean' }] });
    expect(checkStreamSpec({ streamId: 'x', metrics: [] })).toEqual({ error: expect.stringMatching(/at least one metric/) });
    expect(checkStreamSpec({ streamId: 'x', metrics: [{ metric: 'nope.metric', statistic: 'mean' }] })).toEqual({ error: expect.stringMatching(/not a registered metric/) });
    expect(checkStreamSpec({ streamId: 'x', metrics: [{ metric: 'grid.load_mean', statistic: 'median' }] })).toEqual({ error: expect.stringMatching(/mean, min, max, count or sum/) });
    expect(checkStreamSpec({ streamId: 'bad id!', metrics: [{ metric: 'grid.load_mean', statistic: 'mean' }] })).toEqual({ error: expect.stringMatching(/stream's id/) });
    expect(checkStreamSpec({ streamId: 'x', entity: 'KE-30', metrics: [{ metric: 'grid.load_mean', statistic: 'mean' }] })).toEqual({ error: expect.stringMatching(/twin id/) });
  });

  it('aggregates complete UTC days only, and stops at the last complete day when the sample limit is reached', async () => {
    const t = mockTelemetry(['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19']);
    const r = await streamRows({ streamId: stream.stream_id, entity: 'place:KE-30', metrics: [{ metric: 'grid.load_mean', statistic: 'mean' }] }, undefined, new Date('2026-10-19T08:00:00Z'), t);
    // Today (19th) is not complete; the default backfill is 7 days.
    expect(r.rows.map(x => [x.__date, x.__to, x.__value])).toEqual([['2026-10-15', '2026-10-16', '151.5'], ['2026-10-16', '2026-10-17', '161.5'], ['2026-10-17', '2026-10-18', '171.5'], ['2026-10-18', '2026-10-19', '181.5']]);
    expect(r.lineage).toMatchObject({ from: '2026-10-12T00:00:00.000Z', to: '2026-10-19T00:00:00.000Z', samples: 16, days: 4 });
    expect(r.sha256).toMatch(/^[0-9a-f]{64}$/);
    const many: TelemetrySampleRow[] = Array.from({ length: STREAM_SAMPLE_LIMIT }, (_, i) => ({ id: `m${i}`, stream_id: stream.stream_id, ts: new Date(Date.parse('2026-10-17T00:00:00Z') + i * 1000).toISOString(), value: 1, facility_id: null, meta: {} }));
    const big = mockTelemetry(['2026-10-16'], many);
    const cut = await streamRows({ streamId: stream.stream_id, entity: 'place:KE-30', metrics: [{ metric: 'grid.load_mean', statistic: 'count' }] }, undefined, new Date('2026-10-19T08:00:00Z'), big);
    expect(cut.lineage.truncated).toBe(true);
    expect(cut.rows.map(x => x.__date)).toEqual(['2026-10-16']);
    expect(cut.lineage.to).toBe('2026-10-17T00:00:00.000Z');
  });
});

describe('telemetry streams as a twin source', () => {
  beforeEach(async () => {
    resetTwin();
    applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
    await syncRegister();
    registerMetric({ by: 'A', id: 'grid.load_mean', label: 'Mean load', unit: 'MW', aggregation: 'sum', period: 'day' });
    registerMetric({ by: 'A', id: 'grid.load_peak', label: 'Peak load', unit: 'MW', aggregation: 'none', period: 'day' });
    registerMetric({ by: 'A', id: 'grid.readings', label: 'Readings', unit: '{readings}', aggregation: 'sum', period: 'day' });
  });

  const register = (extra: Partial<TwinSource> = {}) => ok(registerSource({
    by: 'Grid Officer', name: 'Nairobi load', publisher: 'Energy regulator', kind: 'stream',
    stream: { streamId: 'grid.load.nairobi', entity: 'place:KE-30', metrics: [{ metric: 'grid.load_mean', statistic: 'mean' }, { metric: 'grid.load_peak', statistic: 'max' }, { metric: 'grid.readings', statistic: 'count' }] },
    ...extra,
  } as Partial<TwinSource> & { by: string })) as TwinSource;

  it('records daily aggregates as observed observations through the run machinery, with lineage', async () => {
    const s = register();
    expect(s).toMatchObject({ kind: 'stream', schedule: 'daily', stream: { streamId: 'grid.load.nairobi' } });
    const t = mockTelemetry(['2026-10-17', '2026-10-18']);
    const run = ok(await runSource(s.id, { by: 'scheduler', deps: { telemetry: t, now: new Date('2026-10-19T08:00:00Z') } }));
    expect(run).toMatchObject({ status: 'ok', rows: 6, accepted: 6, stream: { streamId: 'grid.load.nairobi', days: 2, samples: 8 } });
    const mean = stateAsOf({ metric: 'grid.load_mean', entityId: 'place:KE-30', asOf: '2026-10-18T12:00:00Z', knownAt: '2026-10-19T09:00:00Z' })[0]!;
    expect(mean).toMatchObject({ value: 181.5, unit: 'MW', validFrom: '2026-10-18', validTo: '2026-10-19', sourceId: s.id, runId: run.id });
    expect(stateAsOf({ metric: 'grid.load_peak', entityId: 'place:KE-30', asOf: '2026-10-18T12:00:00Z', knownAt: '2026-10-19T09:00:00Z' })[0]!.value).toBe(183);
    expect(stateAsOf({ metric: 'grid.readings', entityId: 'place:KE-30', asOf: '2026-10-18T12:00:00Z', knownAt: '2026-10-19T09:00:00Z' })[0]).toMatchObject({ value: 4, unit: '{readings}' });
    expect(listAudit().some(a => a.action === 'twin.source.run' && a.resource === `Twin:${s.id}/${run.id}`)).toBe(true);
    // PROV names the samples read and the Datastream they come from.
    const prov = JSON.stringify(runProv(run.id, 'https://gov.example'));
    expect(prov).toContain("Datastreams('telemetry:grid.load.nairobi')");
    expect(prov).toContain(run.sha256!);

    // The next run continues where this one stopped; nothing new is not a failure.
    const again = ok(await runSource(s.id, { by: 'scheduler', deps: { telemetry: t, now: new Date('2026-10-19T20:00:00Z') } }));
    expect(again).toMatchObject({ status: 'ok', rows: 0, accepted: 0 });
    const next = ok(await runSource(s.id, { by: 'scheduler', deps: { telemetry: mockTelemetry(['2026-10-17', '2026-10-18', '2026-10-19']), now: new Date('2026-10-20T01:00:00Z') } }));
    expect(next.stream).toMatchObject({ from: '2026-10-19T00:00:00.000Z', to: '2026-10-20T00:00:00.000Z', days: 1 });
    expect(next.accepted).toBe(3);
  });

  it('re-aggregates the days of a withdrawn run', async () => {
    const s = register();
    const t = mockTelemetry(['2026-10-17', '2026-10-18']);
    const first = ok(await runSource(s.id, { by: 'scheduler', deps: { telemetry: t, now: new Date('2026-10-19T08:00:00Z') } }));
    ok(withdrawRun(first.id, 'Grid Officer', 'meter was miscalibrated'));
    const redo = ok(await runSource(s.id, { by: 'scheduler', deps: { telemetry: t, now: new Date('2026-10-19T09:00:00Z') } }));
    expect(redo.stream?.from).toBe(first.stream?.from);
    expect(redo.accepted).toBe(6);
  });

  it('refuses units that are not the metric\'s, and reports an unreachable stream', async () => {
    const watts = register({ name: 'In watts', stream: { streamId: 'grid.load.nairobi', entity: 'place:KE-30', unit: 'W', metrics: [{ metric: 'grid.load_mean', statistic: 'mean' }] } });
    const r = (await runSource(watts.id, { by: 'scheduler', deps: { telemetry: mockTelemetry(['2026-10-18']), now: new Date('2026-10-19T08:00:00Z') } })) as TwinRun;
    expect(r.status).toBe('failed');
    expect(r.rejected[0]!.reason).toMatch(/"W" is not the unit of grid.load_mean/);
    const missing = register({ name: 'Elsewhere', stream: { streamId: 'grid.load.none', entity: 'place:KE-30', metrics: [{ metric: 'grid.load_mean', statistic: 'mean' }] } });
    const m = (await runSource(missing.id, { by: 'scheduler', deps: { telemetry: mockTelemetry([]), now: new Date('2026-10-19T08:00:00Z') } })) as TwinRun;
    expect(m).toMatchObject({ status: 'failed', error: expect.stringMatching(/not reachable/) });
    expect(getRun(m.id)?.status).toBe('failed');
    expect(registerSource({ by: 'G', name: 'X', publisher: 'Y', kind: 'stream', stream: { streamId: 'a', entity: 'place:XX-99', metrics: [{ metric: 'grid.load_mean', statistic: 'mean' }] } } as Partial<TwinSource> & { by: string }))
      .toEqual({ error: expect.stringMatching(/not an entity/) });
  });

  it('is scheduled by the due-sources cron (daily by default)', () => {
    const s = register();
    expect(dueSources(new Date('2026-10-19T08:00:00Z')).map(x => x.id)).toContain(s.id);
    const manual = register({ name: 'By hand', schedule: 'manual' });
    expect(dueSources(new Date('2026-10-19T08:00:00Z')).map(x => x.id)).not.toContain(manual.id);
  });
});
