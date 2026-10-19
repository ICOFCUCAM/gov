// Runs once when the server starts, before it handles any request: starts
// tracing when the nation names its own collector (lib/ops/otel.ts; off by
// default), then restores the platform's saved state and starts saving it
// (lib/data/persist.ts), then readies the key provider (lib/keys/custody.ts),
// then, only when a twin stream source names an MQTT broker of the nation's
// own, starts its subscriber (lib/twin/mqtt.ts; the broker password opens with
// the keys readied before).
// The check is written this way so Next.js leaves the Node-only modules out
// of its edge build.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { log } = await import('./lib/ops/log');
    const { startTracingFromEnv } = await import('./lib/ops/otel');
    const tracing = startTracingFromEnv();
    if (tracing.enabled || tracing.error) log(tracing.error ? 'error' : 'info', 'tracing.start', { ...tracing });
    const { startFromEnv } = await import('./lib/data/persist');
    const status = await startFromEnv();
    // The facility tile archive listens for publication changes from the start (lib/twin/tiles-archive.ts).
    await import('./lib/twin/tiles-archive');
    if (status.adapter !== 'memory' || status.error) {
      log(status.error ? 'error' : 'info', 'state.restore', { adapter: status.adapter, restored: status.restored.length, ...(status.error ? { message: status.error } : {}) });
    }
    // Key custody (lib/keys/custody.ts): with a remote provider, unwrap the
    // stored data keys (restored above) and load the signing keys' public halves.
    const { initKeyCustody } = await import('./lib/keys/custody');
    await initKeyCustody();
    // MQTT subscribers for twin stream sources (none unless a source names a broker; CIVICOS_MQTT=off starts none).
    const { startStreamSubscribersFromEnv } = await import('./lib/twin/mqtt');
    const mqtt = await startStreamSubscribersFromEnv().catch((e: Error) => ({ configured: -1, subscribers: [], error: e.message }));
    if (mqtt.configured) log('error' in mqtt ? 'error' : 'info', 'twin.mqtt.start', { configured: mqtt.configured, subscribers: mqtt.subscribers.length, ...('error' in mqtt ? { message: mqtt.error } : {}) });
  }
}
