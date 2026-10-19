// MQTT subscribers for the twin's stream sources (review I3; register 16.3).
// A stream source may name an MQTT broker of the nation's own
// (`stream.ingest.mqtt`: mqtts://host:port, one topic, a user name and a
// password held sealed in lib/twin/readings.ts under the key custody of
// lib/keys). Started from src/instrumentation.ts only when a source names one,
// and brought in line whenever an official changes a stream's ingest
// (syncStreamSubscribers). Each message goes through the same ingestion path
// as SensorThings create (lib/twin/stream-ingest.ts): checked, refused with
// reasons, kept as readings the stream's daily run turns into observations.
//
// Connections go only to the registered broker host, in the spirit of
// safeFetchText (lib/net/safe-fetch.ts): the name is resolved once, every
// address vetted, private and internal addresses refused unless the twin's
// rules allow brokers on the nation's own network (privateBrokers,
// lib/twin/policy.ts), and the connection pinned to the vetted address with
// the host name kept for TLS (SNI and certificate check), so a DNS answer that
// changes later cannot move it elsewhere. TLS only (TLS 1.2 or later; the
// nation's own CA from CIVICOS_MQTT_CA_FILE when set), QoS 1 with a
// persistent session (clean: false), so the broker keeps what arrives while
// the platform is away; a reading is stored before its PUBACK is sent, and a
// redelivery is a duplicate, not a second reading.
//
// Payload: JSON, one reading { "phenomenonTime": "…Z", "result": 12.5,
// "unit"?: "MW" } or an array of them (also accepted: time / ts for the time
// and value for the result). Anything else is refused with its reason.
// Deliveries are audited as one summary entry per stream every few seconds
// (counts and the SHA-256 of the readings kept), not one entry per message.
// Set CIVICOS_MQTT=off to start no subscriber at all.

import { readFileSync } from 'node:fs';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import tls from 'node:tls';
import { createHash } from 'node:crypto';
import type { Duplex } from 'node:stream';
import { MqttClient, type IClientOptions } from 'mqtt';
import { isPrivateAddress } from '@/lib/public-sites/url-safety';
import { recordAudit } from '@/lib/data/store';
import { logger } from '@/lib/ops/log';
import { listSources, type TwinSource } from './register';
import { twinPolicy } from './policy';
import { brokerPassword } from './readings';
import { ingestReadings, type IncomingReading } from './stream-ingest';

export interface MqttDeps {
  resolve?: (host: string) => Promise<string[]>;
  /** Opens the connection to the vetted address (default: TLS to it, verified for the host name). Tests pass a plain socket to an in-process broker. */
  connect?: (to: { address: string; port: number; servername: string }) => Duplex;
  /** How often deliveries are summarised in the audit chain (default 5 s). */
  auditEveryMs?: number;
  now?: () => Date;
}

export interface SubscriberStatus {
  sourceId: string;
  broker: string;
  topic: string;
  state: 'connecting' | 'subscribed' | 'refused' | 'error' | 'stopped';
  /** Why it is not running, or the last connection error. */
  error?: string;
  messages: number;
  accepted: number;
  refused: number;
  lastMessageAt?: string;
}

/** The largest message taken (larger ones are refused, not read). */
export const MQTT_MAX_MESSAGE = 256_000;
/** Readings in one message at most. */
export const MQTT_MAX_READINGS = 1_000;

interface Sub {
  key: string;
  status: SubscriberStatus;
  client?: MqttClient;
  timer?: ReturnType<typeof setInterval>;
  /** Deliveries since the last audit summary. */
  pending: { messages: number; accepted: number; total: number; refused: number; firstReason?: string; hash: ReturnType<typeof createHash> };
  by: string;
}

// Running subscribers live in module memory only: connections are not state
// to persist (the source records are), so this is not a __civicos store.
const subs = new Map<string, Sub>();

const fresh = (): Sub['pending'] => ({ messages: 0, accepted: 0, total: 0, refused: 0, hash: createHash('sha256') });
const dnsResolve = async (host: string) => (await lookup(host, { all: true })).map(a => a.address);
/** What makes a subscriber different: a change to any of it reconnects. */
const keyOf = (s: TwinSource) => { const m = s.stream!.ingest!.mqtt!; return [m.url, m.topic, m.username ?? '', m.hasPassword ? 'p' : '', twinPolicy().privateBrokers ? 'private' : 'public'].join('|'); };

/** The stream sources that name a broker. */
const brokered = (): TwinSource[] => listSources().filter(s => s.kind === 'stream' && s.stream?.ingest?.mqtt);

/** Read one MQTT message as readings: JSON, one reading or an array; anything else is one refused item with its reason. */
export function readMessage(payload: Buffer): IncomingReading[] {
  if (payload.length > MQTT_MAX_MESSAGE) return [{ problem: `The message is larger than ${MQTT_MAX_MESSAGE / 1000} kB` }];
  let v: unknown;
  try { v = JSON.parse(payload.toString('utf8')); } catch { return [{ problem: 'The message is not JSON ({ "phenomenonTime": "…Z", "result": 12.5 })' }]; }
  const list = Array.isArray(v) ? v : [v];
  if (!list.length) return [{ problem: 'The message holds no reading' }];
  if (list.length > MQTT_MAX_READINGS) return [{ problem: `At most ${MQTT_MAX_READINGS} readings in one message` }];
  return list.map(x => {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return { problem: 'A reading is an object with phenomenonTime and result' };
    const o = x as Record<string, unknown>;
    return { phenomenonTime: o.phenomenonTime ?? o.time ?? o.ts, result: o.result ?? o.value, unit: o.unit };
  });
}

function tlsConnect(to: { address: string; port: number; servername: string }): Duplex {
  const caFile = process.env.CIVICOS_MQTT_CA_FILE?.trim();
  return tls.connect({
    host: to.address, port: to.port,
    // Verified against the registered host name, not the pinned address.
    ...(isIP(to.servername) ? {} : { servername: to.servername }),
    checkServerIdentity: (_host, cert) => tls.checkServerIdentity(to.servername, cert),
    ...(caFile ? { ca: readFileSync(caFile) } : {}),
    minVersion: 'TLSv1.2', rejectUnauthorized: true,
  });
}

/** Write the summary of deliveries since the last one into the audit chain. */
function auditPending(sourceId: string, sub: Sub): void {
  const p = sub.pending;
  if (!p.messages) return;
  sub.pending = fresh();
  const sha = p.hash.digest('hex');
  recordAudit(sub.by, 'twin.stream.readings', `Twin:${sourceId}`, p.accepted ? 'ok' : 'error',
    `${p.accepted} of ${p.total} readings in ${p.messages} MQTT messages from ${sub.status.broker} topic ${sub.status.topic}${p.accepted ? ` · sha256 ${sha}` : ''}${p.refused ? ` · ${p.refused} refused, first: ${p.firstReason}` : ''}`);
}

async function start(s: TwinSource, deps: MqttDeps): Promise<Sub> {
  const m = s.stream!.ingest!.mqtt!;
  const u = new URL(m.url);
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const port = Number(u.port || 8883);
  const sub: Sub = { key: keyOf(s), by: `MQTT ${host} ${m.topic}`.slice(0, 120), pending: fresh(), status: { sourceId: s.id, broker: m.url, topic: m.topic, state: 'connecting', messages: 0, accepted: 0, refused: 0 } };
  const refuse = (why: string) => { sub.status.state = 'refused'; sub.status.error = why; logger.warn('twin.mqtt.refused', { source: s.id, broker: m.url, message: why }); return sub; };
  // Vet the broker's addresses once, then connect only to the vetted one.
  let addrs: string[];
  try { addrs = await (deps.resolve ?? dnsResolve)(host); } catch (e) { return refuse(`The broker's name does not resolve: ${(e as Error).message}`); }
  if (!addrs.length) return refuse('The broker\'s name does not resolve');
  if (!twinPolicy().privateBrokers && addrs.some(isPrivateAddress)) return refuse('The broker\'s address points to a private network; an administrator allows brokers on the nation\'s own network in the twin\'s rules first');
  const pinned = addrs[0]!;
  let password: string | undefined;
  try { password = m.hasPassword ? brokerPassword(s.id) : undefined; } catch (e) { return refuse((e as Error).message); }
  const connect = deps.connect ?? tlsConnect;
  const opts: IClientOptions = {
    clientId: `civicos-${s.id}-${createHash('sha256').update(`${m.url}|${m.topic}`).digest('hex').slice(0, 8)}`,
    clean: false, protocolVersion: 4, keepalive: 60, reconnectPeriod: 5_000, connectTimeout: 15_000, resubscribe: true,
    ...(m.username ? { username: m.username } : {}), ...(password ? { password } : {}),
  };
  const client = new MqttClient(() => connect({ address: pinned, port, servername: host }) as never, opts);
  sub.client = client;
  client.on('connect', () => {
    client.subscribe(m.topic, { qos: 1 }, (err, granted) => {
      const g = granted?.[0];
      if (err || !g || g.qos === 128) { sub.status.state = 'error'; sub.status.error = err?.message ?? 'The broker refused the subscription'; return; }
      sub.status.state = 'subscribed';
      delete sub.status.error;
    });
  });
  client.on('error', e => { sub.status.state = 'error'; sub.status.error = e.message; logger.warn('twin.mqtt.error', { source: s.id, broker: m.url, message: e.message }); });
  client.on('offline', () => { if (sub.status.state === 'subscribed') sub.status.state = 'connecting'; });
  // Handled synchronously: the readings are stored before the client sends the PUBACK.
  client.on('message', (topic, payload) => {
    if (topic !== m.topic) return;
    const now = (deps.now ?? (() => new Date()))();
    const source = listSources().find(x => x.id === s.id);
    if (!source) return;
    const items = readMessage(payload);
    const r = ingestReadings(source, items, { via: 'mqtt', by: sub.by, now, audit: false });
    const p = sub.pending;
    p.messages++; p.total += items.length;
    sub.status.messages++; sub.status.lastMessageAt = now.toISOString();
    if ('error' in r) { p.refused += items.length; p.firstReason ??= r.error; sub.status.refused += items.length; return; }
    p.accepted += r.accepted.length; p.refused += r.refused.length;
    if (r.refused[0]) p.firstReason ??= r.refused[0].reason;
    for (const x of r.accepted) p.hash.update(`${x.id}|${x.ts}|${x.value}\n`);
    sub.status.accepted += r.accepted.length; sub.status.refused += r.refused.length;
  });
  sub.timer = setInterval(() => auditPending(s.id, sub), deps.auditEveryMs ?? 5_000);
  sub.timer.unref?.();
  return sub;
}

async function stop(sourceId: string): Promise<void> {
  const sub = subs.get(sourceId);
  if (!sub) return;
  subs.delete(sourceId);
  if (sub.timer) clearInterval(sub.timer);
  auditPending(sourceId, sub);
  if (sub.client) await new Promise<void>(res => sub.client!.end(true, {}, () => res()));
}

/**
 * Bring the running subscribers in line with the stream sources that name a
 * broker: start new ones, reconnect changed ones, stop those no longer named.
 */
export async function syncStreamSubscribers(deps: MqttDeps = {}): Promise<SubscriberStatus[]> {
  if (process.env.CIVICOS_MQTT === 'off') return [];
  const wanted = new Map(brokered().map(s => [s.id, s]));
  for (const [id, sub] of subs) {
    const s = wanted.get(id);
    if (!s || keyOf(s) !== sub.key) await stop(id);
  }
  for (const [id, s] of wanted) if (!subs.has(id)) subs.set(id, await start(s, deps));
  return subscriberStatus();
}

/** Started from src/instrumentation.ts: nothing runs unless a stream source names a broker. */
export async function startStreamSubscribersFromEnv(deps: MqttDeps = {}): Promise<{ configured: number; subscribers: SubscriberStatus[] }> {
  if (process.env.CIVICOS_MQTT === 'off') return { configured: 0, subscribers: [] };
  const configured = brokered().length;
  if (!configured) return { configured, subscribers: [] };
  return { configured, subscribers: await syncStreamSubscribers(deps) };
}

export function subscriberStatus(): SubscriberStatus[] { return [...subs.values()].map(s => ({ ...s.status })); }

/** Stop every subscriber (shutdown, tests), writing what is pending to the audit chain. */
export async function stopStreamSubscribers(): Promise<void> {
  for (const id of [...subs.keys()]) await stop(id);
}

/** Write pending delivery summaries now (tests; shutdown). */
export function flushStreamAudit(): void { for (const [id, sub] of subs) auditPending(id, sub); }
