// SensorThings API v1.1 MQTT extension, receive updates (review I3; OGC
// 18-088 §14.2, conformance class receive-updates-via-mqtt): clients
// subscribe to
//
//   v1.1/Observations                              every reading accepted for a
//                                                  Datastream the client may read
//   v1.1/Datastreams('telemetry:<stream>')/Observations   one Datastream's readings
//
// and receive each reading, as the HTTP service serves the Observation (with
// its self and navigation links), the moment the one ingestion path accepts it
// (lib/twin/stream-ingest.ts, through lib/twin/sta-mqtt-bus.ts), whether it
// came over SensorThings create or from the nation's own broker.
//
// An embedded broker (aedes), started from src/instrumentation.ts only when
// CIVICOS_STA_MQTT=on:
//   - MQTT over TCP on CIVICOS_STA_MQTT_PORT (default 1883) and MQTT over
//     WebSocket on CIVICOS_STA_MQTT_WS_PORT (default 8083; "off" for none),
//     bound to CIVICOS_STA_MQTT_HOST (default 127.0.0.1).
//   - TLS: with CIVICOS_STA_MQTT_TLS_CERT and CIVICOS_STA_MQTT_TLS_KEY (PEM
//     file paths) both listeners speak TLS (mqtts, wss). Without them they are
//     plain and must stay behind the platform's TLS terminator (the default
//     loopback binding; expose them only through it, e.g. a TCP/TLS stream on
//     8883 and a wss location /mqtt). CIVICOS_STA_MQTT_PUBLIC (comma-separated
//     URLs) is what the service root lists as the endpoints clients use.
//   - Authentication: the MQTT password is the integration key (civ_…) or an
//     OAuth access token (POST /api/oauth/token) of scope ogc:read, checked by
//     the same rules as every machine read (machineReadAccess(), lib/twin/
//     machine-read.ts: approved, in scope, within the integration's rate
//     limit); the username is free. Re-checked every minute while connected,
//     so a rotated key, a suspended integration or an expired token
//     disconnects. Persistent sessions are refused (clean sessions only).
//   - Topic rules: only the two topic forms above, no wildcards, and a
//     Datastream only when the HTTP reads would serve it to a key reader
//     (visibleDatastreams(), the same model, viewer not signed in), checked on
//     subscribe and again for every message forwarded; refused subscriptions
//     get the MQTT failure code (0x80).
//   - Clients never publish: create stays over HTTP (POST Observations), so a
//     PUBLISH from a client is refused and the connection closed.
//   - Limits: STA_MQTT_LIMITS (connections in all and per integration,
//     subscriptions per connection, messages forwarded per connection a
//     minute; over it messages are dropped and counted).

import type { Server as NetServer } from 'node:net';
import type { Server as HttpServer } from 'node:http';
import type { Aedes, Client, AuthenticateError } from 'aedes';
import { setStaMqttHub, type StaMqttReading } from './sta-mqtt-bus';
import { machineReadAccess } from './machine-read';
import { readingAsObservation, visibleDatastreams } from './sta';
import { syncRegister } from './register';
import { log } from '@/lib/ops/log';

export const STA_MQTT_LIMITS = {
  connections: 500,
  connectionsPerIntegration: 5,
  subscriptionsPerConnection: 20,
  messagesPerMinute: 600,
  /** How often a connected client's credential and the visible Datastreams are checked again. */
  recheckMs: 60_000,
};

export interface StaMqttOptions {
  host?: string;
  /** TCP port (0 picks one); null for none. */
  port?: number | null;
  /** WebSocket port (0 picks one); null for none. */
  wsPort?: number | null;
  tls?: { cert: string | Buffer; key: string | Buffer };
  /** The SensorThings base URL in messages' links, e.g. https://gov.example/api/twin/sta/v1.1. */
  base: string;
  /** The endpoints the service root lists (default: the listeners as bound). */
  publicEndpoints?: string[];
  recheckMs?: number;
}

export interface StaMqttServer {
  ports: { mqtt?: number; ws?: number };
  endpoints: string[];
  stats(): { connections: number; dropped: number; published: number };
  close(): Promise<void>;
}

interface Conn { integrationId: string; name: string; password: string; token: boolean; subs: Set<string>; bucket: { tokens: number; at: number } }

const SET_OBS = 'v1.1/Observations';
const DS_OBS = /^v1\.1\/Datastreams\('((?:[^'/+#]|'')+)'\)\/Observations$/;
const topicFor = (datastream: string) => `v1.1/Datastreams('${datastream.replace(/'/g, "''")}')/Observations`;
const authError = (message: string, code: number): AuthenticateError => Object.assign(new Error(message), { returnCode: code }) as AuthenticateError;

/** Which Datastream a topic names: the id, '*' for the Observations set, or null when the topic is not served. */
export function topicDatastream(topic: string): string | null {
  if (topic === SET_OBS) return '*';
  const m = DS_OBS.exec(topic);
  return m ? m[1]!.replace(/''/g, "'") : null;
}

/** The Datastream of an Observation message, from its id (telemetry:<stream>~<reading id>). */
function payloadDatastream(payload: Buffer | string): string | null {
  try {
    const id = (JSON.parse(payload.toString()) as { '@iot.id'?: unknown })['@iot.id'];
    return typeof id === 'string' && id.includes('~') ? id.slice(0, id.lastIndexOf('~')) : null;
  } catch { return null; }
}

/** Start the broker. Its hub is registered for the readings path (and the service root) until close(). */
export async function startStaMqtt(opts: StaMqttOptions): Promise<StaMqttServer> {
  const [{ Aedes: AedesClass }, net, tls, http, https, { WebSocketServer, createWebSocketStream }] = await Promise.all([
    import('aedes'), import('node:net'), import('node:tls'), import('node:http'), import('node:https'), import('ws'),
  ]);
  const broker: Aedes = await AedesClass.createBroker({ queueLimit: 200, maxClientsIdLength: 64 });
  const conns = new Map<Client, Conn>();
  let dropped = 0, published = 0;
  // The Datastreams a key reader may read, shared by every client (all are machine readers).
  let visible = { ids: new Set<string>(), at: 0 };
  let refreshing: Promise<void> | null = null;
  const refresh = (): Promise<void> => (refreshing ??= (async () => {
    try { await syncRegister(); visible = { ids: await visibleDatastreams({ signedIn: false }), at: Date.now() }; }
    catch (e) { log('error', 'twin.sta_mqtt.visible', { message: (e as Error).message }); }
    finally { refreshing = null; }
  })());
  await refresh();

  const check = async (password: string) => {
    const r = await machineReadAccess(`Bearer ${password}`);
    return r;
  };

  broker.preConnect = (client, packet, done) => {
    if (packet.clean === false) return done(authError('Only clean sessions are kept (no persistent sessions)', 2), false);
    if (conns.size >= STA_MQTT_LIMITS.connections) return done(authError('The broker is full', 3), false);
    done(null, true);
  };
  broker.authenticate = (client, _username, password, done) => {
    const pw = password?.toString('utf8').trim() ?? '';
    if (!pw) return done(authError('Send the integration key or access token (scope ogc:read) as the password', 4), false);
    void check(pw).then(({ access, token }) => {
      if (!access.ok) return done(authError(access.error, access.status === 429 ? 3 : access.status === 403 ? 5 : 4), false);
      const mine = [...conns.values()].filter(c => c.integrationId === access.client.id).length;
      if (mine >= STA_MQTT_LIMITS.connectionsPerIntegration) return done(authError(`At most ${STA_MQTT_LIMITS.connectionsPerIntegration} connections per integration`, 3), false);
      conns.set(client, { integrationId: access.client.id, name: access.client.name, password: pw, token, subs: new Set(), bucket: { tokens: STA_MQTT_LIMITS.messagesPerMinute, at: Date.now() } });
      log('info', 'twin.sta_mqtt.connect', { integration: access.client.id, client: client.id, credential: token ? 'token' : 'key' });
      done(null, true);
    }, (e: Error) => done(authError(e.message, 3), false));
  };
  broker.authorizePublish = (client, _packet, done) => {
    // Only the platform publishes (client === null); create stays over HTTP.
    if (!client) return done(null);
    done(new Error('Publishing is not accepted here: send readings with SensorThings create over HTTP (POST Observations)'));
  };
  broker.authorizeSubscribe = (client, sub, done) => {
    const c = conns.get(client);
    const ds = topicDatastream(sub.topic);
    const refuse = (why: string) => { log('info', 'twin.sta_mqtt.subscribe_refused', { client: client.id, topic: sub.topic.slice(0, 200), why }); done(null, null); };
    if (!c) return refuse('not authenticated');
    if (!ds) return refuse('not a topic of this service');
    if (!c.subs.has(sub.topic) && c.subs.size >= STA_MQTT_LIMITS.subscriptionsPerConnection) return refuse('too many subscriptions');
    const grant = () => { c.subs.add(sub.topic); done(null, { ...sub, qos: Math.min(sub.qos, 1) as 0 | 1 }); };
    if (ds === '*' || visible.ids.has(ds)) return grant();
    // Not known a moment ago: look again before refusing (a stream just declared).
    if (Date.now() - visible.at < 2_000) return refuse('no such Datastream for this reader');
    void refresh().then(() => (visible.ids.has(ds) ? grant() : refuse('no such Datastream for this reader')));
  };
  broker.authorizeForward = (client, packet) => {
    const c = conns.get(client);
    if (!c) return null;
    let ds = topicDatastream(packet.topic);
    if (ds === '*') ds = datastreamOfPayload.get(packet.payload as object) ?? payloadDatastream(packet.payload);
    if (!ds || ds === '*' || !visible.ids.has(ds)) return null;
    const now = Date.now();
    const b = c.bucket;
    b.tokens = Math.min(STA_MQTT_LIMITS.messagesPerMinute, b.tokens + ((now - b.at) / 60_000) * STA_MQTT_LIMITS.messagesPerMinute);
    b.at = now;
    if (b.tokens < 1) { dropped++; return null; }
    b.tokens -= 1;
    return packet;
  };
  broker.on('clientDisconnect', client => { if (conns.delete(client)) log('info', 'twin.sta_mqtt.disconnect', { client: client.id }); });
  broker.on('clientError', client => { conns.delete(client); });

  // Each reading goes out on its Datastream's topic and on the Observations set's topic;
  // the forward rule reads the Datastream from the topic, or for the set from the payload.
  const datastreamOfPayload = new WeakMap<object, string>();
  const publishOne = (datastream: string, body: unknown) => {
    const payload = Buffer.from(JSON.stringify(body));
    datastreamOfPayload.set(payload, datastream);
    for (const topic of [topicFor(datastream), SET_OBS]) broker.publish({ cmd: 'publish', topic, payload, qos: 0, retain: false, dup: false }, () => {});
    published++;
  };

  const hub = {
    endpoints: [] as string[],
    publishReadings(streamId: string, readings: StaMqttReading[]) {
      const datastream = `telemetry:${streamId}`;
      const send = () => { for (const r of readings) publishOne(datastream, readingAsObservation(opts.base, streamId, r)); };
      if (visible.ids.has(datastream) || Date.now() - visible.at < 2_000) send();
      else void refresh().then(send);
    },
  };

  // Listeners.
  const servers: (NetServer | HttpServer)[] = [];
  const host = opts.host ?? '127.0.0.1';
  const ports: { mqtt?: number; ws?: number } = {};
  const listen = (srv: NetServer | HttpServer, port: number) => new Promise<number>((res, rej) => {
    srv.once('error', rej);
    srv.listen(port, host, () => { srv.off('error', rej); const a = srv.address(); res(typeof a === 'object' && a ? a.port : port); });
  });
  if (opts.port !== null && opts.port !== undefined) {
    const srv = opts.tls ? tls.createServer({ cert: opts.tls.cert, key: opts.tls.key, minVersion: 'TLSv1.2' }, broker.handle as never) : net.createServer(broker.handle as never);
    ports.mqtt = await listen(srv, opts.port);
    servers.push(srv);
  }
  if (opts.wsPort !== null && opts.wsPort !== undefined) {
    const srv = opts.tls ? https.createServer({ cert: opts.tls.cert, key: opts.tls.key, minVersion: 'TLSv1.2' }) : http.createServer();
    srv.on('request', (_req, res) => { res.writeHead(426, { 'content-type': 'text/plain' }).end('MQTT over WebSocket only (subprotocol mqtt)'); });
    const wss = new WebSocketServer({ server: srv, maxPayload: 65_536, handleProtocols: protocols => (protocols.has('mqtt') ? 'mqtt' : protocols.has('mqttv3.1') ? 'mqttv3.1' : false) });
    wss.on('connection', (ws, req) => { broker.handle(createWebSocketStream(ws) as never, req); });
    ports.ws = await listen(srv, opts.wsPort);
    servers.push(srv);
  }
  const shown = host === '0.0.0.0' || host === '::' ? 'localhost' : host;
  hub.endpoints = opts.publicEndpoints?.length ? opts.publicEndpoints : [
    ...(ports.mqtt !== undefined ? [`${opts.tls ? 'mqtts' : 'mqtt'}://${shown}:${ports.mqtt}`] : []),
    ...(ports.ws !== undefined ? [`${opts.tls ? 'wss' : 'ws'}://${shown}:${ports.ws}`] : []),
  ];

  // Every minute: the visible Datastreams, and each connection's credential as it stands now.
  const timer = setInterval(() => {
    void refresh();
    for (const [client, c] of conns) {
      void check(c.password).then(({ access }) => {
        if (access.ok || access.status === 429) return;
        log('info', 'twin.sta_mqtt.revoked', { client: client.id, integration: c.integrationId, why: access.error });
        conns.delete(client);
        client.close();
      });
    }
  }, opts.recheckMs ?? STA_MQTT_LIMITS.recheckMs);
  timer.unref?.();

  setStaMqttHub(hub);
  log('info', 'twin.sta_mqtt.start', { endpoints: hub.endpoints, tls: !!opts.tls });
  return {
    ports,
    endpoints: hub.endpoints,
    stats: () => ({ connections: conns.size, dropped, published }),
    close: async () => {
      clearInterval(timer);
      setStaMqttHub(undefined);
      for (const client of conns.keys()) client.close();
      await Promise.all(servers.map(s => new Promise<void>(res => s.close(() => res()))));
      await new Promise<void>(res => broker.close(() => res()));
    },
  };
}

/** Start the broker from the environment (CIVICOS_STA_MQTT=on), or do nothing. */
export async function startStaMqttFromEnv(env: NodeJS.ProcessEnv = process.env): Promise<StaMqttServer | null> {
  if ((env.CIVICOS_STA_MQTT ?? '').toLowerCase() !== 'on') return null;
  const port = (v: string | undefined, d: number): number | null => (v === 'off' ? null : v && /^\d+$/.test(v) ? Number(v) : d);
  const { readFileSync } = await import('node:fs');
  const cert = env.CIVICOS_STA_MQTT_TLS_CERT, key = env.CIVICOS_STA_MQTT_TLS_KEY;
  if (!!cert !== !!key) throw new Error('Set both CIVICOS_STA_MQTT_TLS_CERT and CIVICOS_STA_MQTT_TLS_KEY, or neither');
  const tlsFiles = cert && key ? { cert: readFileSync(cert), key: readFileSync(key) } : undefined;
  const origin = (env.CIVICOS_PUBLIC_URL ?? `http://localhost:${env.PORT ?? 3000}`).replace(/\/+$/, '');
  return startStaMqtt({
    host: env.CIVICOS_STA_MQTT_HOST || '127.0.0.1',
    port: port(env.CIVICOS_STA_MQTT_PORT, tlsFiles ? 8883 : 1883),
    wsPort: port(env.CIVICOS_STA_MQTT_WS_PORT, 8083),
    tls: tlsFiles,
    base: `${origin}/api/twin/sta/v1.1`,
    publicEndpoints: (env.CIVICOS_STA_MQTT_PUBLIC ?? '').split(',').map(s => s.trim()).filter(Boolean),
  });
}
