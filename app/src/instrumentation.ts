// Runs once when the server starts, before it handles any request: starts
// tracing when the nation names its own collector (lib/ops/otel.ts; off by
// default), then restores the platform's saved state and starts saving it
// (lib/data/persist.ts), then readies the key provider (lib/keys/custody.ts),
// then, only when a twin stream source names an MQTT broker of the nation's
// own, starts its subscriber (lib/twin/mqtt.ts; the broker password opens with
// the keys readied before), and, only with CIVICOS_STA_MQTT=on, the
// SensorThings MQTT broker that machine readers subscribe to (lib/twin/sta-mqtt.ts).
// The check is written this way so Next.js leaves the Node-only modules out
// of its edge build.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // The connection's own address as the last X-Forwarded-For hop, before any request is read (review L-1).
    const { startPeerAddress } = await import('./lib/ops/peer-address');
    await startPeerAddress();
    const { log } = await import('./lib/ops/log');
    // Sign-in (lib/auth/mode.ts, review L-2): a production server left open on purpose says so loudly at
    // every start; one enforced without a session key says why nobody can sign in.
    const { openInProduction, authEnforced, OPEN_WARNING } = await import('./lib/auth/mode');
    if (openInProduction()) {
      console.error(`\n${'!'.repeat(78)}\n${OPEN_WARNING}\n${'!'.repeat(78)}\n`);
      log('error', 'auth.open_in_production', { message: OPEN_WARNING });
    } else if (authEnforced()) {
      const { sessionSecretProblem } = await import('./lib/auth/officials');
      const problem = sessionSecretProblem();
      if (problem) { console.error(`\nCIVICOS SIGN-IN: ${problem}\n`); log('error', 'auth.session_key', { message: problem }); }
    }
    // What this installation is (lib/ops/mode.ts): a production build without CIVICOS_MODE runs as production and says so.
    const { modeUnset, modeDecision, MODE_UNSET_WARNING } = await import('./lib/ops/mode');
    if (modeUnset()) { console.error(`\n${MODE_UNSET_WARNING}\n`); log('error', 'installation.mode_unset', { message: MODE_UNSET_WARNING }); }
    else log('info', 'installation.mode', { mode: modeDecision().mode, why: modeDecision().why });
    const { startTracingFromEnv }= await import('./lib/ops/otel');
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
    // No official account yet (state restored above): the first administrator needs the one-time
    // setup code, written once to this server's output unless CIVICOS_SETUP_TOKEN is set (review C-1).
    const { hasAccounts } = await import('./lib/auth/officials');
    const { ensureSetupCode, localAccountsAllowed } = await import('./lib/auth/setup-token');
    if (!hasAccounts() && localAccountsAllowed()) ensureSetupCode();
    // MQTT subscribers for twin stream sources (none unless a source names a broker; CIVICOS_MQTT=off starts none).
    const { startStreamSubscribersFromEnv } = await import('./lib/twin/mqtt');
    const mqtt = await startStreamSubscribersFromEnv().catch((e: Error) => ({ configured: -1, subscribers: [], error: e.message }));
    if (mqtt.configured) log('error' in mqtt ? 'error' : 'info', 'twin.mqtt.start', { configured: mqtt.configured, subscribers: mqtt.subscribers.length, ...('error' in mqtt ? { message: mqtt.error } : {}) });
    // The SensorThings MQTT extension's broker (subscriptions for machine readers), only with CIVICOS_STA_MQTT=on.
    if ((process.env.CIVICOS_STA_MQTT ?? '').toLowerCase() === 'on') {
      const { startStaMqttFromEnv } = await import('./lib/twin/sta-mqtt');
      await startStaMqttFromEnv().catch((e: Error) => log('error', 'twin.sta_mqtt.start', { message: e.message }));
    }
  }
}
