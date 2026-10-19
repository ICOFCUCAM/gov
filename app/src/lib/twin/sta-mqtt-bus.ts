// The meeting point between the readings path and the SensorThings MQTT
// broker (lib/twin/sta-mqtt.ts). Next.js bundles route handlers and the
// server's start-up (src/instrumentation.ts) into separate module instances,
// so the running broker registers itself here on a process-wide symbol (never
// a `__civicos…` store key: it holds functions, not state to save), and
// lib/twin/stream-ingest.ts hands it every reading it accepts. With no broker
// running, publishing is a no-op. No imports, so nothing heavy loads with it.

export interface StaMqttReading { id: string; ts: string; value: number; receivedAt: string; via: string }

export interface StaMqttHub {
  /** Publish accepted readings of a stream to its SensorThings topics. */
  publishReadings(streamId: string, readings: StaMqttReading[]): void;
  /** Where clients connect (mqtt://…, mqtts://…, ws://…, wss://…), for the service root. */
  endpoints: string[];
}

const KEY = Symbol.for('civicos.twin.sta-mqtt');
const g = globalThis as unknown as { [KEY]?: StaMqttHub };

export function setStaMqttHub(hub: StaMqttHub | undefined): void { g[KEY] = hub; }
export function staMqttHub(): StaMqttHub | undefined { return g[KEY]; }

/** Hand accepted readings to the broker, when one runs; never fails the caller. */
export function publishAcceptedReadings(streamId: string, readings: StaMqttReading[]): void {
  if (!readings.length) return;
  try { g[KEY]?.publishReadings(streamId, readings); } catch { /* the readings are kept; subscribers miss this delivery */ }
}
