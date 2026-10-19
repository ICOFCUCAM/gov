// Runs once when the server starts, before it handles any request: restores
// the platform's saved state and starts saving it (lib/data/persist.ts).
// The check is written this way so Next.js leaves the Node-only module out of
// its edge build.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startFromEnv } = await import('./lib/data/persist');
    const status = await startFromEnv();
    // The facility tile archive listens for publication changes from the start (lib/twin/tiles-archive.ts).
    await import('./lib/twin/tiles-archive');
    if (status.adapter !== 'memory' || status.error) {
      const { log } = await import('./lib/ops/log');
      log(status.error ? 'error' : 'info', 'state.restore', { adapter: status.adapter, restored: status.restored.length, ...(status.error ? { message: status.error } : {}) });
    }
  }
}
