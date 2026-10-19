// The SensorThings MQTT extension (receive updates) with in-process clients
// over TCP and WebSocket: integration key or access token of scope ogc:read as
// the password, only the service's topics and only Datastreams a key reader
// may read, nothing published by clients, every accepted reading delivered,
// limits applied, a replaced key disconnected.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import mqtt from 'mqtt';
import { resetTwin, syncRegister, registerSource, type TwinSource } from './register';
import { registerMetric } from './metrics';
import { resetReadings } from './readings';
import { staCreate } from './sta-write';
import { staRequest } from './sta';
import { STA_WRITE_SCOPE } from './stream';
import { startStaMqtt, topicDatastream, STA_MQTT_LIMITS, type StaMqttServer } from './sta-mqtt';
import { applyNation } from '@/lib/nation/registry';
import { registerIntegration, setIntegrationStatus, rotateIntegrationKey } from '@/lib/data/store';
import { resetRateLimits } from '@/lib/exchange/rate-limit';
import { POST as tokenEndpoint } from '@/app/api/oauth/token/route';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
const B = 'https://gov.example/api/twin/sta/v1.1';
const DS = 'telemetry:grid.load.mombasa';
const TOPIC = `v1.1/Datastreams('${DS}')/Observations`;
let n = 0;
function integration(scopes: string[]): { id: string; key: string } {
  const r = ok(registerIntegration({ kind: 'integration', name: `Client ${++n}`, ownerOrg: 'Energy regulator', contact: 'ops@grid.example', scopes }));
  ok(setIntegrationStatus(r.id, 'approved', 'Admin'));
  return { id: r.id, key: r.apiKey };
}
const until = async (cond: () => boolean, ms = 5_000) => { const t = Date.now(); while (!cond()) { if (Date.now() - t > ms) throw new Error('timed out'); await new Promise(r => setTimeout(r, 20)); } };

let server: StaMqttServer;
let gw: { id: string; key: string };
let reader: { id: string; key: string };
const clients: mqtt.MqttClient[] = [];
const connect = async (password: string | undefined, ws = false) => {
  const c = await mqtt.connectAsync(ws ? `ws://127.0.0.1:${server.ports.ws}` : `mqtt://127.0.0.1:${server.ports.mqtt}`, { username: 'reader', password, reconnectPeriod: 0, connectTimeout: 3_000 });
  clients.push(c);
  return c;
};
const received = (c: mqtt.MqttClient) => { const got: { topic: string; body: Record<string, unknown> }[] = []; c.on('message', (topic, p) => got.push({ topic, body: JSON.parse(p.toString()) })); return got; };
/** The QoS granted for one topic, or 128 when the broker refuses it. */
const grant = (c: mqtt.MqttClient, topic: string, qos: 0 | 1 = 0): Promise<number> => c.subscribeAsync(topic, { qos }).then(g => g[0]!.qos, (e: Error) => { if (/Subscribe error/.test(e.message)) return 128; throw e; });
const post = (t: string, v: number) => staCreate(B, ['Observations'], { Datastream: { '@iot.id': DS }, phenomenonTime: t, result: v }, `Bearer ${gw.key}`);

beforeAll(async () => {
  resetTwin(); resetReadings();
  applyNation({ configured: true, stateName: 'Republic of Kenya', iso3: 'KEN', regions: ['Mombasa', 'Nairobi City', 'Kisumu'] });
  await syncRegister();
  registerMetric({ by: 'A', id: 'grid.load_mean', label: 'Mean load', unit: 'MW', aggregation: 'sum', period: 'day' });
  gw = integration([STA_WRITE_SCOPE]);
  reader = integration(['ogc:read']);
  ok(registerSource({
    by: 'Grid Officer', name: 'Mombasa load', publisher: 'Energy regulator', kind: 'stream',
    stream: { streamId: 'grid.load.mombasa', entity: 'place:KE-28', unit: 'MW', metrics: [{ metric: 'grid.load_mean', statistic: 'mean' }], ingest: { integrationId: gw.id } },
  } as Partial<TwinSource> & { by: string }));
  server = await startStaMqtt({ host: '127.0.0.1', port: 0, wsPort: 0, base: B, recheckMs: 150 });
});
afterAll(async () => {
  for (const c of clients) c.end(true);
  await server.close();
});
beforeEach(() => { resetRateLimits(); });

describe('SensorThings MQTT: receive updates', () => {
  it('reads only the service\'s topic forms', () => {
    expect(topicDatastream('v1.1/Observations')).toBe('*');
    expect(topicDatastream(TOPIC)).toBe(DS);
    expect(topicDatastream("v1.1/Datastreams('a''b')/Observations")).toBe("a'b");
    for (const t of ['#', 'v1.1/#', 'v1.1/Datastreams(+)/Observations', 'v1.1/Things', "v1.1/Datastreams('x')"]) expect(topicDatastream(t), t).toBeNull();
  });

  it('is declared in the service root, with its endpoints, while it runs', async () => {
    const root = (await staRequest(B, [], new URLSearchParams(), { signedIn: false })).body as { serverSettings: Record<string, unknown> & { conformance: string[] } };
    const cls = 'http://www.opengis.net/spec/iot_sensing/1.1/req/receive-updates-via-mqtt/receive-updates';
    expect(root.serverSettings.conformance).toContain(cls);
    expect(root.serverSettings[cls]).toEqual({ endpoints: [`mqtt://127.0.0.1:${server.ports.mqtt}`, `ws://127.0.0.1:${server.ports.ws}`] });
  });

  it('refuses connections without a key of scope ogc:read', async () => {
    await expect(connect(undefined)).rejects.toThrow();
    await expect(connect(gw.key)).rejects.toThrow(/Not authorized|not authorized/i);
    await expect(connect('civ_00000000_' + 'a'.repeat(43))).rejects.toThrow();
  });

  it('delivers each accepted reading over TCP and WebSocket, on its Datastream and on the Observations set', async () => {
    const tcp = await connect(reader.key);
    const ws = await connect(reader.key, true);
    const one = received(tcp), all = received(ws);
    const granted: number[] = [];
    for (const t of [TOPIC, "v1.1/Datastreams('telemetry:nowhere')/Observations", '#', 'v1.1/Things']) granted.push(await grant(tcp, t));
    expect(granted).toEqual([0, 128, 128, 128]);
    expect(await grant(ws, 'v1.1/Observations', 1)).toBe(1);
    expect(post('2026-10-18T06:00:00Z', 140.5).status).toBe(201);
    // Refused readings are not published.
    expect(post('2026-10-18T06:00:00Z', 1).status).toBe(409);
    await until(() => one.length >= 1 && all.length >= 1);
    await new Promise(r => setTimeout(r, 100));
    expect(one).toHaveLength(1);
    expect(all).toHaveLength(1);
    expect(one[0]).toMatchObject({ topic: TOPIC, body: { '@iot.id': expect.stringMatching(/^telemetry:grid\.load\.mombasa~/), '@iot.selfLink': expect.stringMatching(/^https:\/\/gov\.example\/api\/twin\/sta\/v1\.1\/Observations\('/), phenomenonTime: '2026-10-18T06:00:00.000Z', result: 140.5 } });
    expect(all[0]!.topic).toBe('v1.1/Observations');
    // The message is the Observation as the HTTP service serves it.
    const http = await staRequest(B, [`Observations('${one[0]!.body['@iot.id']}')`], new URLSearchParams(), { signedIn: false });
    expect(http.body).toEqual(one[0]!.body);
  });

  it('accepts an OAuth access token of scope ogc:read as the password', async () => {
    const form = new NextRequest('https://gov.example/api/oauth/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'ogc:read', client_id: reader.id, client_secret: reader.key }).toString(), headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    const t = await (await tokenEndpoint(form)).json();
    const c = await connect(t.access_token);
    const got = received(c);
    await c.subscribeAsync(TOPIC);
    expect(post('2026-10-18T07:00:00Z', 150).status).toBe(201);
    await until(() => got.length === 1);
    expect(got[0]!.body.result).toBe(150);
  });

  it('never takes a publish from a client: the connection is closed and nothing is created', async () => {
    const c = await connect(reader.key);
    const closed = new Promise<void>(res => c.once('close', () => res()));
    c.publish('v1.1/Observations', JSON.stringify({ Datastream: { '@iot.id': DS }, phenomenonTime: '2026-10-18T08:00:00Z', result: 1 }), { qos: 1 });
    await closed;
    const obs = await staRequest(B, [`Datastreams('${DS}')`, 'Observations'], new URLSearchParams(), { signedIn: false });
    expect((obs.body as { value: { phenomenonTime: string }[] }).value.some(o => o.phenomenonTime === '2026-10-18T08:00:00Z')).toBe(false);
  });

  it('drops messages over a connection\'s rate and limits subscriptions and connections', async () => {
    const was = { ...STA_MQTT_LIMITS };
    try {
      STA_MQTT_LIMITS.messagesPerMinute = 2;
      STA_MQTT_LIMITS.subscriptionsPerConnection = 1;
      const c = await connect(reader.key);
      const got = received(c);
      expect(await grant(c, TOPIC)).toBe(0);
      expect(await grant(c, 'v1.1/Observations')).toBe(128);
      const before = server.stats().dropped;
      for (const h of ['09', '10', '11', '12']) expect(post(`2026-10-18T${h}:00:00Z`, 1).status).toBe(201);
      await until(() => got.length >= 2);
      await new Promise(r => setTimeout(r, 150));
      expect(got).toHaveLength(2);
      expect(server.stats().dropped - before).toBeGreaterThanOrEqual(2);
      STA_MQTT_LIMITS.connectionsPerIntegration = server.stats().connections;
      const other = integration(['ogc:read']);
      await connect(other.key);
      STA_MQTT_LIMITS.connectionsPerIntegration = 1;
      await expect(connect(other.key)).rejects.toThrow();
    } finally { Object.assign(STA_MQTT_LIMITS, was); }
  });

  it('disconnects a client whose key is replaced', async () => {
    const r = integration(['ogc:read']);
    const c = await connect(r.key);
    const closed = new Promise<void>(res => c.once('close', () => res()));
    ok(rotateIntegrationKey(r.id, 'Admin'));
    await closed;
    expect(c.connected).toBe(false);
  });
});
