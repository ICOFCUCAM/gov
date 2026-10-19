// The MQTT subscriber against an in-process broker (aedes): TLS is replaced by
// a plain socket to the vetted address (deps.connect), everything else is the
// production path: address vetting, QoS 1 subscription, the one ingestion
// path, the audit summary.
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import net from 'node:net';
import type { AddressInfo } from 'node:net';
import { Aedes } from 'aedes';
import mqtt from 'mqtt';
import { resetTwin, syncRegister, registerSource, runSource, stateAsOf, setStreamIngest, listSources, type TwinSource, type TwinRun } from './register';
import { registerMetric } from './metrics';
import { resetReadings, readingsStatus, brokerPassword } from './readings';
import { syncStreamSubscribers, stopStreamSubscribers, flushStreamAudit, subscriberStatus, readMessage, startStreamSubscribersFromEnv, type MqttDeps } from './mqtt';
import { setTwinPolicy, resetTwinPolicy } from './policy';
import { applyNation } from '@/lib/nation/registry';
import { listAudit } from '@/lib/data/store';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };

let broker: Aedes;
let server: net.Server;
let port: number;
const seen: { username?: string; password?: string }[] = [];
const connectedTo: string[] = [];

beforeAll(async () => {
  broker = await Aedes.createBroker();
  broker.authenticate = (client, username, password, done) => { seen.push({ username, password: password?.toString() }); done(null, username === 'twin' && password?.toString() === 's3cret'); };
  server = net.createServer(broker.handle as never);
  await new Promise<void>(res => server.listen(0, '127.0.0.1', res));
  port = (server.address() as AddressInfo).port;
});
afterAll(async () => {
  await new Promise<void>(res => server.close(() => res()));
  await new Promise<void>(res => broker.close(() => res()));
});

/** The broker's name resolves to the in-process one; the connection is a plain socket to the vetted address. */
const deps: MqttDeps = {
  resolve: async () => ['127.0.0.1'],
  connect: to => { connectedTo.push(`${to.address}|${to.servername}`); return net.connect(port, to.address); },
  auditEveryMs: 60_000,
};
const until = async (cond: () => boolean, ms = 5_000) => { const t = Date.now(); while (!cond()) { if (Date.now() - t > ms) throw new Error('timed out'); await new Promise(r => setTimeout(r, 20)); } };

async function publish(topic: string, payload: string): Promise<void> {
  const c = await mqtt.connectAsync(`mqtt://127.0.0.1:${port}`, { username: 'twin', password: 's3cret', clientId: `pub-${Math.random().toString(36).slice(2)}` });
  await c.publishAsync(topic, payload, { qos: 1 });
  await c.endAsync();
}

let source: TwinSource;
beforeEach(async () => {
  resetTwin(); resetReadings(); resetTwinPolicy();
  applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
  await syncRegister();
  registerMetric({ by: 'A', id: 'river.level_max', label: 'Highest river level', unit: 'm', aggregation: 'none', period: 'day' });
  source = ok(registerSource({
    by: 'Water Officer', name: 'Tana gauge', publisher: 'Water authority', kind: 'stream',
    stream: { streamId: 'river.tana.garissa', entity: 'place:KE-30', unit: 'm', metrics: [{ metric: 'river.level_max', statistic: 'max' }],
      ingest: { mqtt: { url: 'mqtts://broker.water.example:8883', topic: 'gauges/tana/garissa', username: 'twin', password: 's3cret' } } },
  } as Partial<TwinSource> & { by: string })) as TwinSource;
});
afterEach(async () => { await stopStreamSubscribers(); });

describe('MQTT stream sources', () => {
  it('keeps the broker password sealed outside the source, and checks the broker spec', () => {
    expect(source.stream!.ingest!.mqtt).toEqual({ url: 'mqtts://broker.water.example:8883', topic: 'gauges/tana/garissa', username: 'twin', hasPassword: true });
    expect(JSON.stringify(listSources())).not.toContain('s3cret');
    expect(brokerPassword(source.id)).toBe('s3cret');
    const bad = (mqttSpec: unknown) => setStreamIngest(source.id, { ingest: { mqtt: mqttSpec }, by: 'W' });
    expect(bad({ url: 'mqtt://broker.water.example', topic: 'a' })).toEqual({ error: expect.stringMatching(/over TLS/) });
    expect(bad({ url: 'mqtts://u:p@broker.water.example', topic: 'a' })).toEqual({ error: expect.stringMatching(/credentials/) });
    expect(bad({ url: 'mqtts://broker.water.example', topic: 'gauges/#' })).toEqual({ error: expect.stringMatching(/wildcards/) });
    expect(bad({ url: 'mqtts://broker.water.example', topic: '$SYS/x' })).toEqual({ error: expect.stringMatching(/system topic/) });
    // A new broker never inherits the old one's password.
    ok(bad({ url: 'mqtts://other.water.example', topic: 'gauges/tana/garissa', username: 'twin' }));
    expect(() => brokerPassword(source.id)).not.toThrow();
    expect(brokerPassword(source.id)).toBeUndefined();
  });

  it('refuses a broker on a private address unless the twin\'s rules allow the nation\'s own network', async () => {
    const [s] = await syncStreamSubscribers(deps);
    expect(s).toMatchObject({ sourceId: source.id, state: 'refused', error: expect.stringMatching(/private network/) });
    expect(connectedTo).toHaveLength(0);
    ok(setTwinPolicy({ privateBrokers: true }, 'Admin'));
    expect(listAudit().some(e => e.action === 'twin.policy.change' && /nation's own private network/.test(e.detail ?? ''))).toBe(true);
    const [again] = await syncStreamSubscribers(deps);
    expect(again!.state).toBe('connecting');
  });

  it('subscribes with QoS 1 to the registered host only and feeds readings through the one ingestion path', async () => {
    ok(setTwinPolicy({ privateBrokers: true }, 'Admin'));
    await syncStreamSubscribers(deps);
    await until(() => subscriberStatus()[0]?.state === 'subscribed');
    expect(connectedTo.at(-1)).toBe('127.0.0.1|broker.water.example');
    expect(seen.at(-1)).toEqual({ username: 'twin', password: 's3cret' });
    const now = Date.now();
    const at = (h: number) => new Date(now - h * 3_600_000).toISOString();
    await publish('gauges/tana/garissa', JSON.stringify({ phenomenonTime: at(30), result: 3.2 }));
    await publish('gauges/tana/garissa', JSON.stringify([{ time: at(29), value: 3.4, unit: 'm' }, { ts: at(28), value: 3.1 }]));
    await publish('gauges/tana/garissa', 'not json');
    await publish('gauges/tana/garissa', JSON.stringify({ phenomenonTime: at(27), result: 3.3, unit: 'cm' }));
    await until(() => subscriberStatus()[0]!.messages === 4);
    expect(subscriberStatus()[0]).toMatchObject({ accepted: 3, refused: 2 });
    expect(readingsStatus('river.tana.garissa').readings).toBe(3);
    flushStreamAudit();
    const audit = listAudit().filter(e => e.action === 'twin.stream.readings' && e.resource === `Twin:${source.id}`);
    expect(audit).toHaveLength(1);
    expect(audit[0]!.actor).toBe('MQTT broker.water.example gauges/tana/garissa');
    expect(audit[0]!.detail).toMatch(/^3 of 5 readings in 4 MQTT messages from mqtts:\/\/broker\.water\.example:8883 topic gauges\/tana\/garissa · sha256 [0-9a-f]{64} · 2 refused, first: The message is not JSON/);
    // A redelivery is a duplicate.
    await publish('gauges/tana/garissa', JSON.stringify({ phenomenonTime: at(30), result: 3.2 }));
    await until(() => subscriberStatus()[0]!.messages === 5);
    expect(readingsStatus('river.tana.garissa').readings).toBe(3);
    // The daily run turns them into observations.
    const run = ok(await runSource(source.id, { by: 'scheduler' })) as TwinRun;
    expect(run.status).toBe('ok');
    expect(run.accepted).toBeGreaterThan(0);
    expect(stateAsOf({ metric: 'river.level_max', asOf: at(28), knownAt: new Date().toISOString() })[0]).toMatchObject({ entityId: 'place:KE-30', unit: 'm', runId: run.id });
  });

  it('stops the subscriber when the source stops receiving readings, and starts none when no source names a broker', async () => {
    ok(setTwinPolicy({ privateBrokers: true }, 'Admin'));
    await syncStreamSubscribers(deps);
    await until(() => subscriberStatus()[0]?.state === 'subscribed');
    ok(setStreamIngest(source.id, { ingest: null, by: 'Water Officer' }));
    expect(await syncStreamSubscribers(deps)).toEqual([]);
    expect(await startStreamSubscribersFromEnv(deps)).toEqual({ configured: 0, subscribers: [] });
  });

  it('reads messages strictly', () => {
    expect(readMessage(Buffer.from('{"phenomenonTime":"2026-10-18T00:00:00Z","result":1}'))).toEqual([{ phenomenonTime: '2026-10-18T00:00:00Z', result: 1, unit: undefined }]);
    expect(readMessage(Buffer.from('[]'))).toEqual([{ problem: expect.stringMatching(/no reading/) }]);
    expect(readMessage(Buffer.from('[1]'))).toEqual([{ problem: expect.stringMatching(/object/) }]);
    expect(readMessage(Buffer.alloc(300_000, 32))).toEqual([{ problem: expect.stringMatching(/larger than/) }]);
  });
});
